import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "../lib/firebase";

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
