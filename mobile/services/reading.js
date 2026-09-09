import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

import {
  mergeReadingProgress
} from "../../shared/readingProgressCore";

export async function getNativeReadingProgress(bookId) {
  const user = auth.currentUser;

  if (!user || !bookId) return null;

  try {
    const snapshot = await getDoc(
      doc(
        db,
        "users",
        user.uid,
        "readingProgress",
        String(bookId)
      )
    );

    return snapshot.exists()
      ? { id: snapshot.id, ...snapshot.data() }
      : null;
  } catch {
    return null;
  }
}

export async function getNativeReadingTimeline() {
  const user = auth.currentUser;

  if (!user) return [];

  try {
    const snapshot = await getDocs(
      collection(
        db,
        "users",
        user.uid,
        "readingProgress"
      )
    );

    return snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data()
      }))
      .sort((a, b) =>
        String(
          b.positionUpdatedAtISO ||
          b.updatedAtISO ||
          ""
        ).localeCompare(
          String(
            a.positionUpdatedAtISO ||
            a.updatedAtISO ||
            ""
          )
        )
      );
  } catch {
    return [];
  }
}

export async function saveNativeReadingProgress({
  bookId,
  title,
  author,
  paragraphIndex,
  totalParagraphs,
  image = ""
}) {
  const user = auth.currentUser;

  if (!user || !bookId) return null;

  const ref = doc(
    db,
    "users",
    user.uid,
    "readingProgress",
    String(bookId)
  );

  let oldProgress = {};

  try {
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      oldProgress = snapshot.data();
    }
  } catch {
    // Continue with a new progress document.
  }

  const total = Math.max(
    Number(totalParagraphs) || 0,
    0
  );

  const merged = mergeReadingProgress({
    oldProgress,
    viewedParagraphIndex: paragraphIndex,
    totalParagraphs: total
  });

  const now = new Date().toISOString();

  await setDoc(
    ref,
    {
      bookId: String(bookId),
      title:
        title ||
        oldProgress.title ||
        "Untitled",
      author:
        author ||
        oldProgress.author ||
        "",
      image:
        image ||
        oldProgress.image ||
        null,

      /*
       * paragraphIndex remains for compatibility with existing PWA/class
       * code. It now reflects VERIFIED sequential reading.
       */
      paragraphIndex:
        merged.verifiedParagraphIndex,

      activeParagraphIndex:
        merged.activeParagraphIndex,

      verifiedParagraphIndex:
        merged.verifiedParagraphIndex,

      totalParagraphs: total,

      percentComplete:
        merged.percentComplete,

      activePercent:
        merged.activePercent,

      readingVersion: 3,
      positionUpdatedAtISO: now,
      verifiedUpdatedAtISO:
        merged.verifiedParagraphIndex !==
        Number(
          oldProgress.verifiedParagraphIndex ??
          oldProgress.paragraphIndex ??
          0
        )
          ? now
          : oldProgress.verifiedUpdatedAtISO || null,

      updatedAtISO: now,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return merged;
}
