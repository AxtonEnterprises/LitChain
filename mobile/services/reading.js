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

function progressPercent(index, totalParagraphs) {
  const total = Math.max(Number(totalParagraphs) || 0, 0);
  const safe = Math.max(
    0,
    Math.min(Number(index) || 0, Math.max(total - 1, 0))
  );

  if (total <= 1) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round((safe / (total - 1)) * 100)
    )
  );
}

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

/*
 * Saves WHERE the user is without awarding verified reading credit.
 *
 * This separation is critical: swiping/jumping to a page must never count as
 * reading its first paragraph.
 */
export async function saveNativeReadingPosition({
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
    // Continue with the known position.
  }

  const total = Math.max(
    Number(totalParagraphs) || 0,
    0
  );

  const activeParagraphIndex = Math.max(
    0,
    Math.min(
      Number(paragraphIndex) || 0,
      Math.max(total - 1, 0)
    )
  );

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

      activeParagraphIndex,
      activePercent:
        progressPercent(
          activeParagraphIndex,
          total
        ),

      totalParagraphs: total,
      readingVersion: 4,
      positionUpdatedAtISO: now,
      updatedAtISO: now,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return {
    activeParagraphIndex,
    activePercent:
      progressPercent(
        activeParagraphIndex,
        total
      ),
    verifiedParagraphIndex:
      Number(
        oldProgress.verifiedParagraphIndex ??
        oldProgress.paragraphIndex ??
        0
      ) || 0,
    percentComplete:
      Number(oldProgress.percentComplete || 0)
  };
}

/*
 * Awards verified reading credit.
 *
 * Call this only after the reader has spent the required active-reading time
 * on the next sequential paragraph. mergeReadingProgress prevents jumping
 * ahead from manufacturing credit.
 */
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
       * code. It reflects VERIFIED sequential reading.
       */
      paragraphIndex:
        merged.verifiedParagraphIndex,

      /*
       * Do not overwrite a newer navigation position with the paragraph
       * currently being verified.
       */
      activeParagraphIndex:
        Number(
          oldProgress.activeParagraphIndex ??
          merged.activeParagraphIndex
        ) || 0,

      verifiedParagraphIndex:
        merged.verifiedParagraphIndex,

      totalParagraphs: total,

      percentComplete:
        merged.percentComplete,

      activePercent:
        Number(
          oldProgress.activePercent ??
          merged.activePercent
        ) || 0,

      readingVersion: 4,
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

  return {
    ...merged,
    activeParagraphIndex:
      Number(
        oldProgress.activeParagraphIndex ??
        merged.activeParagraphIndex
      ) || 0,
    activePercent:
      Number(
        oldProgress.activePercent ??
        merged.activePercent
      ) || 0
  };
}
