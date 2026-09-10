import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  return user;
}

function safeInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.floor(parsed))
    : fallback;
}

export function assignmentReadingPercent(assignment, progress) {
  if (!assignment || !progress) return 0;

  const start = safeInt(assignment.startParagraphIndex, 0);
  const totalParagraphs = Math.max(
    safeInt(progress.totalParagraphs, 0),
    1
  );

  const end =
    assignment.endParagraphIndex === null ||
    assignment.endParagraphIndex === undefined ||
    assignment.endParagraphIndex === ""
      ? Math.max(totalParagraphs - 1, start)
      : Math.max(
          safeInt(assignment.endParagraphIndex, start),
          start
        );

  const verified = safeInt(
    progress.furthestParagraphIndex ??
      progress.paragraphIndex,
    0
  );

  if (verified < start) return 0;

  const completedThrough = Math.min(verified, end);
  const completed = completedThrough - start + 1;
  const required = Math.max(end - start + 1, 1);

  return Math.max(
    0,
    Math.min(100, Math.round((completed / required) * 100))
  );
}

export function assignmentReadingPoints(assignment, progress) {
  const percent = assignmentReadingPercent(assignment, progress);
  const totalPoints = Math.max(
    Number(assignment?.totalPoints) || 0,
    0
  );

  return Math.round((percent / 100) * totalPoints * 100) / 100;
}

export function classReadingPercent(assignments, progressByBook) {
  const reading = (assignments || []).filter(
    (assignment) => assignment?.type !== "test"
  );

  if (!reading.length) return 0;

  const total = reading.reduce((sum, assignment) => {
    const progress = progressByBook?.[String(assignment.bookId)] || null;
    return sum + assignmentReadingPercent(assignment, progress);
  }, 0);

  return Math.round(total / reading.length);
}

/*
 * Mirrors the user's VERIFIED global Reader progress into the class-local
 * studentProgress collection. The Firestore rules intentionally allow a
 * class member to write only their own {uid}_{bookId} document.
 *
 * This means swiping/jumping in Reader never manufactures class credit:
 * only readingProgress.paragraphIndex / verifiedParagraphIndex is copied.
 */
export async function syncNativeClassReadingProgress(classId) {
  const user = requireUser();
  const cleanClassId = String(classId || "");

  if (!cleanClassId) {
    throw new Error("Missing class ID.");
  }

  const membership = await getDoc(
    doc(
      db,
      "groups",
      cleanClassId,
      "members",
      user.uid
    )
  );

  if (!membership.exists()) {
    throw new Error("You are not a member of this class.");
  }

  const readingSnapshot = await getDocs(
    collection(
      db,
      "users",
      user.uid,
      "readingProgress"
    )
  );

  const writes = [];

  for (const item of readingSnapshot.docs) {
    const data = item.data();
    const bookId = String(data.bookId || item.id || "").trim();
    const totalParagraphs = safeInt(data.totalParagraphs, 0);

    if (!bookId || totalParagraphs <= 0) continue;

    const verified = Math.min(
      safeInt(
        data.verifiedParagraphIndex ??
          data.paragraphIndex,
        0
      ),
      totalParagraphs - 1
    );

    const now = new Date().toISOString();
    const progressId = `${user.uid}_${bookId}`;
    const ref = doc(
      db,
      "groups",
      cleanClassId,
      "studentProgress",
      progressId
    );

    let existing = null;

    try {
      const old = await getDoc(ref);
      existing = old.exists() ? old.data() : null;
    } catch {
      existing = null;
    }

    /*
     * Classroom rules require monotonic verified progress.
     * Preserve the larger value if an older class-local record is ahead.
     */
    const furthest = Math.max(
      verified,
      safeInt(existing?.furthestParagraphIndex, 0)
    );

    const safeTotal = Math.max(
      totalParagraphs,
      safeInt(existing?.totalParagraphs, 0),
      furthest + 1
    );

    const percentComplete =
      safeTotal <= 1
        ? 0
        : Math.max(
            safeInt(existing?.percentComplete, 0),
            Math.min(
              100,
              Math.round((furthest / (safeTotal - 1)) * 100)
            )
          );

    writes.push(
      setDoc(
        ref,
        {
          userId: user.uid,
          bookId,
          title: String(data.title || "Untitled").slice(0, 500),
          author: String(data.author || "").slice(0, 300),
          paragraphIndex: furthest,
          furthestParagraphIndex: furthest,
          totalParagraphs: safeTotal,
          percentComplete,
          updatedAtISO: now,
          updatedAt: serverTimestamp()
        },
        { merge: Boolean(existing) }
      )
    );
  }

  await Promise.all(writes);
  return writes.length;
}

export async function getNativeClassStudentProgress(classId) {
  const user = requireUser();
  const snapshot = await getDocs(
    collection(
      db,
      "groups",
      String(classId),
      "studentProgress"
    )
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
    isCurrentUser: item.data()?.userId === user.uid
  }));
}

export function progressMapForUser(rows, userId) {
  const result = {};

  (rows || [])
    .filter((row) => String(row.userId) === String(userId))
    .forEach((row) => {
      result[String(row.bookId)] = row;
    });

  return result;
}
