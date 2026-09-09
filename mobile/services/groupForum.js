import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

async function requireMembership(groupId) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const snapshot =
    await getDoc(
      doc(
        db,
        "groups",
        String(groupId),
        "members",
        user.uid
      )
    );

  if (
    !snapshot.exists() ||
    ["removed", "suspended"].includes(
      snapshot.data()?.status
    )
  ) {
    throw new Error(
      "You are not an active member of this group."
    );
  }

  return user;
}

export async function getNativeGroupForumReplies(
  groupId,
  postId
) {
  await requireMembership(groupId);

  const ref =
    collection(
      db,
      "groups",
      String(groupId),
      "forumPosts",
      String(postId),
      "replies"
    );

  let snapshot;

  try {
    snapshot =
      await getDocs(
        query(
          ref,
          orderBy(
            "createdAtISO",
            "asc"
          )
        )
      );
  } catch {
    snapshot =
      await getDocs(ref);
  }

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      Number(
        b.forumScore || 0
      ) -
        Number(
          a.forumScore || 0
        )
    );
}

export async function replyNativeGroupForumPost(
  groupId,
  postId,
  body
) {
  const user =
    await requireMembership(
      groupId
    );

  const postRef =
    doc(
      db,
      "groups",
      String(groupId),
      "forumPosts",
      String(postId)
    );

  const postSnapshot =
    await getDoc(postRef);

  if (!postSnapshot.exists()) {
    throw new Error(
      "Forum topic not found."
    );
  }

  if (
    postSnapshot.data()
      ?.locked
  ) {
    throw new Error(
      "This topic is locked."
    );
  }

  const cleanBody =
    String(body || "").trim();

  if (!cleanBody) {
    throw new Error(
      "Write a reply first."
    );
  }

  const replyRef =
    doc(
      collection(
        db,
        "groups",
        String(groupId),
        "forumPosts",
        String(postId),
        "replies"
      )
    );

  const now =
    new Date().toISOString();

  const reply = {
    id:
      replyRef.id,
    groupId:
      String(groupId),
    postId:
      String(postId),
    userId:
      user.uid,
    body:
      cleanBody,
    parentReplyId:
      null,
    forumUpCount: 0,
    forumDownCount: 0,
    forumScore: 0,
    createdAtISO:
      now,
    updatedAtISO:
      now
  };

  await setDoc(
    replyRef,
    {
      ...reply,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp()
    }
  );

  return reply;
}

function voteId(
  targetType,
  targetId,
  voterUserId
) {
  return `${targetType}_${targetId}_${voterUserId}`;
}

export async function getNativeGroupForumVote(
  groupId,
  {
    targetType,
    targetId
  }
) {
  const user =
    await requireMembership(
      groupId
    );

  const cleanType =
    targetType === "reply"
      ? "reply"
      : "post";

  const id =
    voteId(
      cleanType,
      String(targetId),
      user.uid
    );

  const snapshot =
    await getDoc(
      doc(
        db,
        "groups",
        String(groupId),
        "forumVotes",
        id
      )
    );

  return snapshot.exists()
    ? Number(
        snapshot.data()
          ?.direction || 0
      )
    : 0;
}

export async function voteNativeGroupForumNode(
  groupId,
  postId,
  {
    replyId = null,
    direction
  }
) {
  const user =
    await requireMembership(
      groupId
    );

  const requestedDirection =
    direction === -1
      ? -1
      : 1;

  const targetType =
    replyId
      ? "reply"
      : "post";

  const targetId =
    String(
      replyId || postId
    );

  const id =
    voteId(
      targetType,
      targetId,
      user.uid
    );

  const targetRef =
    replyId
      ? doc(
          db,
          "groups",
          String(groupId),
          "forumPosts",
          String(postId),
          "replies",
          String(replyId)
        )
      : doc(
          db,
          "groups",
          String(groupId),
          "forumPosts",
          String(postId)
        );

  const voteRef =
    doc(
      db,
      "groups",
      String(groupId),
      "forumVotes",
      id
    );

  return runTransaction(
    db,
    async (transaction) => {
      const targetSnapshot =
        await transaction.get(
          targetRef
        );

      const voteSnapshot =
        await transaction.get(
          voteRef
        );

      if (
        !targetSnapshot.exists()
      ) {
        throw new Error(
          "That discussion item is no longer available."
        );
      }

      const target =
        targetSnapshot.data();

      const oldDirection =
        voteSnapshot.exists()
          ? Number(
              voteSnapshot.data()
                ?.direction || 0
            )
          : 0;

      const newDirection =
        oldDirection ===
        requestedDirection
          ? 0
          : requestedDirection;

      let up =
        Number(
          target.forumUpCount ||
          0
        );

      let down =
        Number(
          target.forumDownCount ||
          0
        );

      if (
        oldDirection === 1
      ) {
        up -= 1;
      }

      if (
        oldDirection === -1
      ) {
        down -= 1;
      }

      if (
        newDirection === 1
      ) {
        up += 1;
      }

      if (
        newDirection === -1
      ) {
        down += 1;
      }

      up =
        Math.max(0, up);

      down =
        Math.max(0, down);

      const score =
        up - down;

      transaction.update(
        targetRef,
        {
          forumUpCount:
            up,
          forumDownCount:
            down,
          forumScore:
            score
        }
      );

      if (
        newDirection === 0
      ) {
        if (
          voteSnapshot.exists()
        ) {
          transaction.delete(
            voteRef
          );
        }
      } else if (
        voteSnapshot.exists()
      ) {
        transaction.update(
          voteRef,
          {
            direction:
              newDirection,
            updatedAtISO:
              new Date()
                .toISOString(),
            updatedAt:
              serverTimestamp()
          }
        );
      } else {
        const now =
          new Date()
            .toISOString();

        transaction.set(
          voteRef,
          {
            id,
            groupId:
              String(groupId),
            postId:
              String(postId),
            replyId:
              replyId
                ? String(
                    replyId
                  )
                : null,
            targetType,
            targetId,
            voterUserId:
              user.uid,
            direction:
              newDirection,
            createdAtISO:
              now,
            createdAt:
              serverTimestamp(),
            updatedAtISO:
              now,
            updatedAt:
              serverTimestamp()
          }
        );
      }

      return {
        direction:
          newDirection,
        forumUpCount:
          up,
        forumDownCount:
          down,
        forumScore:
          score
      };
    }
  );
}

export async function reportNativeGroupForumNode({
  groupId,
  postId,
  replyId = null,
  targetUserId,
  title = "",
  body = "",
  reason = "other",
  details = ""
}) {
  const user =
    await requireMembership(
      groupId
    );

  if (!targetUserId) {
    throw new Error(
      "Missing report target."
    );
  }

  const reportRef =
    doc(
      collection(
        db,
        "moderationReports"
      )
    );

  const targetType =
    replyId
      ? "group_forum_reply"
      : "group_forum_post";

  const targetId =
    String(
      replyId || postId
    );

  const now =
    new Date().toISOString();

  const report = {
    id:
      reportRef.id,
    reporterUserId:
      user.uid,
    targetType,
    targetId,
    targetUserId:
      String(
        targetUserId
      ),
    groupId:
      String(groupId),
    reason:
      String(
        reason || "other"
      ).trim(),
    details:
      String(
        details || ""
      ).trim(),
    status:
      "open",
    createdAtISO:
      now
  };

  if (title) {
    report.title =
      String(title);
  }

  if (body) {
    report.body =
      String(body);
  }

  await setDoc(
    reportRef,
    {
      ...report,
      createdAt:
        serverTimestamp()
    }
  );

  return report;
}
