import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export async function getNativeGroupSettings(groupId) {
  const snapshot = await getDoc(
    doc(db, "groups", String(groupId))
  );

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data()
      }
    : null;
}

export async function saveNativeGroupSettings(
  groupId,
  updates
) {
  const payload = {
    name: String(updates.name || "").trim(),
    description: String(
      updates.description || ""
    ).trim(),
    avatar: String(updates.avatar || ""),
    visibility:
      updates.visibility === "private"
        ? "private"
        : updates.visibility === "public"
          ? "public"
          : "discoverable",
    joinPolicy:
      updates.joinPolicy === "open"
        ? "open"
        : updates.joinPolicy === "invite_only"
          ? "invite_only"
          : "request_to_join",
    updatedAtISO: new Date().toISOString(),
    updatedAt: serverTimestamp()
  };

  await updateDoc(
    doc(db, "groups", String(groupId)),
    payload
  );

  return payload;
}

export async function setNativeGroupPostPinned(
  groupId,
  postId,
  pinned
) {
  await updateDoc(
    doc(
      db,
      "groups",
      String(groupId),
      "forumPosts",
      String(postId)
    ),
    {
      pinned: Boolean(pinned),
      updatedAtISO: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }
  );
}

export async function setNativeGroupPostLocked(
  groupId,
  postId,
  locked
) {
  await updateDoc(
    doc(
      db,
      "groups",
      String(groupId),
      "forumPosts",
      String(postId)
    ),
    {
      locked: Boolean(locked),
      updatedAtISO: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }
  );
}

export async function deleteNativeGroupPost(
  groupId,
  postId
) {
  await deleteDoc(
    doc(
      db,
      "groups",
      String(groupId),
      "forumPosts",
      String(postId)
    )
  );
}


export async function deleteNativeGroup(groupId) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");

  const id = String(groupId || "");
  const groupRef = doc(db, "groups", id);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  if (groupSnap.data()?.ownerId !== user.uid) {
    throw new Error("Only the owner can delete this group or class.");
  }

  // Remove all direct membership/governance/content records in the same
  // atomic write as the parent. This is important for the protected
  // General Class Discussion and prevents stale memberships after deletion.
  const directCollections = [
    "members",
    "invites",
    "joinRequests",
    "forumPosts",
    "forumVotes",
    "moderationReports",
    "moderationActions",
    "bans",
    "assignments",
    "studentProgress",
    "shareInvite"
  ];

  const snapshots = await Promise.all(
    directCollections.map((name) =>
      getDocs(collection(db, "groups", id, name))
    )
  );

  const count = snapshots.reduce((total, snap) => total + snap.size, 0);
  if (count + 1 > 450) {
    throw new Error(
      "This group is too large for safe in-app deletion. Please contact Lit Chain support."
    );
  }

  const batch = writeBatch(db);
  snapshots.forEach((snap) => {
    snap.docs.forEach((child) => batch.delete(child.ref));
  });
  batch.delete(groupRef);
  await batch.commit();
}
