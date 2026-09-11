import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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

async function publicProfile(userId) {
  if (!userId) return null;

  for (const collectionName of ["publicProfiles", "users"]) {
    try {
      const snapshot = await getDoc(
        doc(db, collectionName, String(userId))
      );

      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
    } catch {}
  }

  return null;
}

async function hydratePerson(row) {
  const userId = String(row?.userId || row?.id || "");
  const profile = await publicProfile(userId);

  if (!profile) return row;

  return {
    ...row,
    displayName:
      row.displayName ||
      profile.displayName ||
      profile.username ||
      profile.name ||
      "Reader",
    username: row.username || profile.username || "",
    photoURL:
      row.photoURL ||
      profile.photoURL ||
      profile.avatar ||
      ""
  };
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
    if (activeMembership(group.membership)) return false;

    const discoverable =
      group.discoverable === true ||
      group.visibility === "discoverable" ||
      group.visibility === "public";

    const joinable =
      group.joinPolicy === "open" ||
      group.joinPolicy === "request_to_join";

    return discoverable && joinable;
  });
}

export async function joinNativeGroup(group) {
  const user = requireUser();
  const groupId = String(group?.id || "");

  if (!groupId) {
    throw new Error("Missing group ID.");
  }

  /*
   * Never authorize from a potentially stale discovery card. Reload the
   * current group/class metadata immediately before the membership write.
   */
  const groupSnapshot = await getDoc(
    doc(db, "groups", groupId)
  );

  if (!groupSnapshot.exists()) {
    throw new Error("This group or class is no longer available.");
  }

  const currentGroup = {
    id: groupSnapshot.id,
    ...groupSnapshot.data()
  };

  const isDiscoverable =
    currentGroup.visibility === "discoverable" ||
    currentGroup.visibility === "public" ||
    currentGroup.discoverable === true;

  if (currentGroup.joinPolicy === "request_to_join") {
    if (!isDiscoverable) {
      throw new Error(
        currentGroup.type === "class"
          ? "This class must be Discoverable or Public before students can request to join."
          : "This group must be Discoverable or Public before readers can request to join."
      );
    }

    const now = new Date().toISOString();

    const requestRef = doc(
      db,
      "groups",
      groupId,
      "joinRequests",
      user.uid
    );

    const existing = await getDoc(requestRef);

    if (existing.exists()) {
      if (existing.data()?.status === "pending") {
        return { status: "pending" };
      }

      await deleteDoc(requestRef);
    }

    await setDoc(requestRef, {
      userId: user.uid,
      groupId,
      status: "pending",
      requestedAtISO: now,
      requestedAt: serverTimestamp()
    });

    return { status: "pending" };
  }

  if (
    currentGroup.joinPolicy !== "open" ||
    !isDiscoverable
  ) {
    throw new Error(
      currentGroup.type === "class"
        ? "This class is invite only."
        : "This group is invite only."
    );
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

  return { status: "joined" };
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

  return Promise.all(
    snapshot.docs.map((item) =>
      hydratePerson({
        id: item.id,
        ...item.data()
      })
    )
  );
}

export async function getNativeIncomingGroupInvites() {
  const user = requireUser();

  const snapshot = await getDocs(
    query(
      collectionGroup(db, "invites"),
      where("userId", "==", user.uid)
    )
  );

  const pending = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((item) => item.status === "pending");

  const hydrated = await Promise.all(
    pending.map(async (invite) => {
      const groupId = String(invite.groupId || "");

      if (!groupId) return null;

      try {
        const groupSnapshot = await getDoc(
          doc(db, "groups", groupId)
        );

        if (!groupSnapshot.exists()) {
          return null;
        }

        const group = {
          id: groupSnapshot.id,
          ...groupSnapshot.data()
        };

        return {
          ...invite,
          group,
          isClass: group.type === "class"
        };
      } catch {
        return null;
      }
    })
  );

  return hydrated.filter(Boolean);
}

export async function respondNativeGroupInvite(
  groupId,
  accept
) {
  const user = requireUser();
  const cleanGroupId = String(groupId || "");

  if (!cleanGroupId) {
    throw new Error("Missing group or class ID.");
  }

  const inviteRef = doc(
    db,
    "groups",
    cleanGroupId,
    "invites",
    user.uid
  );

  const inviteSnapshot =
    await getDoc(inviteRef);

  if (
    !inviteSnapshot.exists() ||
    inviteSnapshot.data()?.status !== "pending"
  ) {
    throw new Error(
      "This invitation is no longer available."
    );
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.update(inviteRef, {
    status: accept ? "accepted" : "declined",
    updatedAtISO: now,
    updatedAt: serverTimestamp()
  });

  if (accept) {
    batch.set(
      doc(
        db,
        "groups",
        cleanGroupId,
        "members",
        user.uid
      ),
      {
        userId: user.uid,
        groupId: cleanGroupId,
        role: "member",
        status: "active",
        joinedAtISO: now,
        joinedAt: serverTimestamp()
      }
    );
  }

  await batch.commit();

  return {
    status: accept ? "accepted" : "declined"
  };
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

  const pending = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((item) => item.status === "pending");

  return Promise.all(pending.map(hydratePerson));
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

    return { status: "declined" };
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

  return { status: "accepted" };
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
