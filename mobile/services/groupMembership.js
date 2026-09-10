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

  /*
   * Classes are intentionally allowed here.
   * A discoverable/public class configured for open or request
   * enrollment should be joinable exactly like the PWA rules allow.
   */
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

  if (group.joinPolicy === "request_to_join") {
    /*
     * Firestore requires request-to-join groups/classes to be
     * discoverable or public. Surface a useful client error rather
     * than an opaque permissions failure for an invalid combination.
     */
    const isDiscoverable =
      group.discoverable === true ||
      group.visibility === "discoverable" ||
      group.visibility === "public";

    if (!isDiscoverable) {
      throw new Error(
        group.type === "class"
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
    group.joinPolicy !== "open" &&
    group.visibility !== "public" &&
    group.visibility !== "discoverable"
  ) {
    throw new Error(
      group.type === "class"
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
