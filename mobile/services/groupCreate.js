import {
  collection,
  doc,
  serverTimestamp,
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

export async function createNativeReadingGroup({
  name,
  description = "",
  avatar = "round-table",
  visibility = "discoverable",
  joinPolicy = "request_to_join"
}) {
  const user = requireUser();

  const cleanName =
    String(name || "").trim();

  if (cleanName.length < 2) {
    throw new Error(
      "Enter a group name."
    );
  }

  const groupRef =
    doc(collection(db, "groups"));

  const now = new Date().toISOString();

  const safeVisibility =
    ["discoverable", "public", "private"]
      .includes(visibility)
      ? visibility
      : "discoverable";

  const safeJoinPolicy =
    [
      "open",
      "request_to_join",
      "invite_only"
    ].includes(joinPolicy)
      ? joinPolicy
      : "request_to_join";

  const batch = writeBatch(db);

  batch.set(groupRef, {
    id: groupRef.id,
    ownerId: user.uid,
    type: "group",
    name: cleanName,
    description:
      String(description || "").trim(),
    avatar,
    visibility: safeVisibility,
    discoverable:
      safeVisibility ===
      "discoverable",
    joinPolicy: safeJoinPolicy,
    createdAtISO: now,
    updatedAtISO: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  batch.set(
    doc(
      db,
      "groups",
      groupRef.id,
      "members",
      user.uid
    ),
    {
      userId: user.uid,
      groupId: groupRef.id,
      role: "owner",
      status: "active",
      joinedAtISO: now,
      joinedAt: serverTimestamp()
    }
  );

  await batch.commit();

  return {
    id: groupRef.id,
    name: cleanName,
    description,
    avatar,
    visibility: safeVisibility,
    joinPolicy: safeJoinPolicy,
    type: "group",
    membership: {
      userId: user.uid,
      groupId: groupRef.id,
      role: "owner",
      status: "active"
    }
  };
}
