import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

async function safeGetDocs(refOrQuery) {
  try {
    return await getDocs(
      refOrQuery
    );
  } catch (error) {
    console.warn(
      "Optional social query failed:",
      error?.code || error
    );
    return null;
  }
}

async function publicProfile(userId) {
  if (!userId) return null;

  const candidates = [
    ["publicProfiles", String(userId)],
    ["users", String(userId)]
  ];

  for (const path of candidates) {
    try {
      const snapshot =
        await getDoc(
          doc(db, ...path)
        );

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        };
      }
    } catch {
      // Try alternate profile location.
    }
  }

  return null;
}

export async function getNativeFriends() {
  const user = auth.currentUser;
  if (!user) return [];

  const ids = new Set();

  const direct =
    await safeGetDocs(
      collection(
        db,
        "users",
        user.uid,
        "friends"
      )
    );

  if (direct) {
    direct.docs.forEach((item) => {
      const data = item.data();

      ids.add(
        String(
          data.otherUserId ||
          data.userId ||
          data.uid ||
          item.id
        )
      );
    });
  }

  const friendshipQuery =
    await safeGetDocs(
      query(
        collection(
          db,
          "friendships"
        ),
        where(
          "userIds",
          "array-contains",
          user.uid
        )
      )
    );

  if (friendshipQuery) {
    friendshipQuery.docs.forEach(
      (item) => {
        const data = item.data();
        const members =
          Array.isArray(
            data.userIds
          )
            ? data.userIds
            : [];

        const other =
          data.otherUserId ||
          members.find(
            (id) =>
              String(id) !==
              user.uid
          );

        if (
          other &&
          data.status !==
            "declined"
        ) {
          ids.add(String(other));
        }
      }
    );
  }

  ids.delete(user.uid);

  const profiles =
    await Promise.all(
      [...ids].map(
        async (userId) => ({
          otherUserId: userId,
          profile:
            await publicProfile(
              userId
            )
        })
      )
    );

  return profiles.map(
    ({ otherUserId, profile }) => ({
      id: otherUserId,
      otherUserId,
      ...(profile || {})
    })
  );
}

export async function getNativeGroups() {
  const user = auth.currentUser;

  if (!user) {
    return {
      mine: [],
      classes: [],
      discoverable: []
    };
  }

  const snapshot =
    await safeGetDocs(
      collection(db, "groups")
    );

  if (!snapshot) {
    return {
      mine: [],
      classes: [],
      discoverable: []
    };
  }

  const rows =
    await Promise.all(
      snapshot.docs.map(
        async (groupDoc) => {
          const group = {
            id: groupDoc.id,
            ...groupDoc.data()
          };

          let membership = null;

          try {
            const memberSnapshot =
              await getDoc(
                doc(
                  db,
                  "groups",
                  groupDoc.id,
                  "members",
                  user.uid
                )
              );

            if (
              memberSnapshot.exists()
            ) {
              membership = {
                id:
                  memberSnapshot.id,
                ...memberSnapshot.data()
              };
            }
          } catch {
            membership = null;
          }

          return {
            ...group,
            membership
          };
        }
      )
    );

  const activeMember = (group) =>
    Boolean(group.membership) &&
    !["removed", "suspended"].includes(
      group.membership?.status
    );

  return {
    mine: rows.filter(
      (group) =>
        activeMember(group) &&
        group.type !== "class"
    ),
    classes: rows.filter(
      (group) =>
        activeMember(group) &&
        group.type === "class"
    ),
    discoverable: rows.filter(
      (group) =>
        !activeMember(group) &&
        group.type !== "class" &&
        (
          group.discoverable === true ||
          group.visibility ===
            "public" ||
          group.joinPolicy ===
            "open" ||
          group.joinPolicy ===
            "request_to_join"
        )
    )
  };
}

export async function getNativeGroupForum(
  groupId
) {
  if (!groupId) return [];

  const snapshot =
    await safeGetDocs(
      collection(
        db,
        "groups",
        String(groupId),
        "forumPosts"
      )
    );

  if (!snapshot) return [];

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      String(
        b.updatedAtISO ||
        b.createdAtISO ||
        b.createdAt ||
        ""
      ).localeCompare(
        String(
          a.updatedAtISO ||
          a.createdAtISO ||
          a.createdAt ||
          ""
        )
      )
    );
}
