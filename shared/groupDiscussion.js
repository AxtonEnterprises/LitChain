import {
  collection,
  doc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export async function createNativeGroupDiscussion({
  groupId,
  title,
  body
}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const cleanTitle =
    String(title || "").trim();
  const cleanBody =
    String(body || "").trim();

  if (cleanTitle.length < 2) {
    throw new Error(
      "Enter a discussion title."
    );
  }

  if (!cleanBody) {
    throw new Error(
      "Enter a discussion message."
    );
  }

  const ref = doc(
    collection(
      db,
      "groups",
      String(groupId),
      "forumPosts"
    )
  );

  const now =
    new Date().toISOString();

  const post = {
    id: ref.id,
    groupId: String(groupId),
    userId: user.uid,
    title: cleanTitle,
    body: cleanBody,
    pinned: false,
    locked: false,
    forumUpCount: 0,
    forumDownCount: 0,
    forumScore: 0,
    createdAtISO: now,
    updatedAtISO: now
  };

  await setDoc(ref, {
    ...post,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return post;
}
