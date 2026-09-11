import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  return user;
}

async function requireClassMembership(classId) {
  const user = requireUser();
  const snapshot = await getDoc(
    doc(db, "groups", String(classId), "members", user.uid)
  );

  if (
    !snapshot.exists() ||
    ["removed", "suspended"].includes(snapshot.data()?.status)
  ) {
    throw new Error("You are not an active member of this class.");
  }

  return {
    user,
    membership: snapshot.data()
  };
}

async function requireClassTeacher(classId) {
  const { user, membership } =
    await requireClassMembership(classId);

  if (
    !["owner", "admin", "moderator"].includes(
      String(membership?.role || "")
    )
  ) {
    throw new Error(
      "Only teachers and aides can start class discussions."
    );
  }

  return user;
}

export async function getNativeAssignmentDiscussions(classId, assignmentId) {
  await requireClassMembership(classId);

  const ref = collection(db, "groups", String(classId), "forumPosts");
  let snapshot;

  try {
    snapshot = await getDocs(query(ref, orderBy("createdAtISO", "asc")));
  } catch {
    snapshot = await getDocs(ref);
  }

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter(
      (item) =>
        String(item.assignmentId || "") === String(assignmentId) &&
        item.isGeneralClassDiscussion !== true
    )
    .sort(
      (a, b) =>
        Number(b.forumScore || 0) - Number(a.forumScore || 0) ||
        String(a.createdAtISO || "").localeCompare(String(b.createdAtISO || ""))
    );
}

export async function createNativeAssignmentDiscussion({
  classId,
  assignmentId,
  assignmentTitle,
  title,
  body
}) {
  const user = await requireClassTeacher(classId);
  const cleanTitle = String(title || "").trim();
  const cleanBody = String(body || "").trim();

  if (cleanTitle.length < 2) throw new Error("Enter a discussion title.");
  if (!cleanBody) throw new Error("Enter a discussion message.");

  const ref = doc(collection(db, "groups", String(classId), "forumPosts"));
  const now = new Date().toISOString();

  const post = {
    id: ref.id,
    groupId: String(classId),
    assignmentId: String(assignmentId),
    assignmentTitle: String(assignmentTitle || ""),
    discussionScope: "assignment",
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
