import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function requireUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in.");
  }
  return user;
}

function activeMembership(data) {
  return Boolean(data) &&
    !["removed", "suspended"].includes(data.status);
}

export async function getNativeDiscoverableGroups() {
  const user = requireUser();

  const snapshot = await getDocs(collection(db, "groups"));

  const rows = await Promise.all(
    snapshot.docs.map(async (groupDoc) => {
      const group = {
        id: groupDoc.id,
        ...groupDoc.data()
      };

      let membership = null;
      let joinRequest = null;

      try {
        const memberSnapshot = await getDoc(
          doc(
            db,
            "groups",
            groupDoc.id,
            "members",
            user.uid
          )
        );

        if (memberSnapshot.exists()) {
          membership = {
            id: memberSnapshot.id,
            ...memberSnapshot.data()
          };
        }
      } catch {}

      if (!activeMembership(membership)) {
        try {
          const requestSnapshot = await getDoc(
            doc(
              db,
              "groups",
              groupDoc.id,
              "joinRequests",
              user.uid
            )
          );

          if (requestSnapshot.exists()) {
            joinRequest = {
              id: requestSnapshot.id,
              ...requestSnapshot.data()
            };
          }
        } catch {}
      }

      return {
        ...group,
        membership,
        joinRequest
      };
    })
  );

  return rows.filter((group) => {
    if (group.type === "class") return false;
    if (activeMembership(group.membership)) return false;

    return (
      group.discoverable === true ||
      group.visibility === "discoverable" ||
      group.visibility === "public" ||
      group.joinPolicy === "open" ||
      group.joinPolicy === "request_to_join"
    );
  });
}

export async function joinNativeGroup(group) {
  const user = requireUser();
  const groupId = String(group?.id || "");

  if (!groupId) {
    throw new Error("Missing group ID.");
  }

  if (group.joinPolicy === "request_to_join") {
    const now = new Date().toISOString();

    await setDoc(
      doc(
        db,
        "groups",
        groupId,
        "joinRequests",
        user.uid
      ),
      {
        userId: user.uid,
        groupId,
        status: "pending",
        requestedAtISO: now,
        requestedAt: serverTimestamp()
      },
      { merge: true }
    );

    return {
      status: "pending"
    };
  }

  if (
    group.joinPolicy !== "open" &&
    group.visibility !== "public" &&
    group.visibility !== "discoverable"
  ) {
    throw new Error("This group is invite only.");
  }

  const now = new Date().toISOString();

  await setDoc(
    doc(
      db,
      "groups",
      groupId,
      "members",
      user.uid
    ),
    {
      userId: user.uid,
      groupId,
      role: "member",
      status: "active",
      joinedAtISO: now,
      joinedAt: serverTimestamp()
    }
  );

  return {
    status: "joined"
  };
}

export async function cancelNativeGroupJoinRequest(groupId) {
  const user = requireUser();

  await deleteDoc(
    doc(
      db,
      "groups",
      String(groupId),
      "joinRequests",
      user.uid
    )
  );

  return true;
}

export async function getNativeGroupMembers(groupId) {
  requireUser();

  const snapshot = await getDocs(
    collection(
      db,
      "groups",
      String(groupId),
      "members"
    )
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

export async function getNativeGroupJoinRequests(groupId) {
  requireUser();

  const snapshot = await getDocs(
    collection(
      db,
      "groups",
      String(groupId),
      "joinRequests"
    )
  );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((item) => item.status === "pending");
}

export async function respondNativeGroupJoinRequest(
  groupId,
  requestUserId,
  accept
) {
  requireUser();

  const cleanGroupId = String(groupId);
  const cleanUserId = String(requestUserId);

  const requestRef = doc(
    db,
    "groups",
    cleanGroupId,
    "joinRequests",
    cleanUserId
  );

  if (!accept) {
    await updateDoc(requestRef, {
      status: "declined",
      decidedAtISO: new Date().toISOString(),
      decidedAt: serverTimestamp()
    });

    return {
      status: "declined"
    };
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.set(
    doc(
      db,
      "groups",
      cleanGroupId,
      "members",
      cleanUserId
    ),
    {
      userId: cleanUserId,
      groupId: cleanGroupId,
      role: "member",
      status: "active",
      joinedAtISO: now,
      joinedAt: serverTimestamp()
    }
  );

  batch.update(requestRef, {
    status: "accepted",
    decidedAtISO: now,
    decidedAt: serverTimestamp()
  });

  await batch.commit();

  return {
    status: "accepted"
  };
}

export async function updateNativeGroupMemberRole(
  groupId,
  userId,
  role
) {
  requireUser();

  if (!["admin", "moderator", "member"].includes(role)) {
    throw new Error("Unsupported role.");
  }

  await updateDoc(
    doc(
      db,
      "groups",
      String(groupId),
      "members",
      String(userId)
    ),
    { role }
  );

  return role;
}
