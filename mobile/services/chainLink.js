import {
  collection,
  doc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function sourceParagraphIndex(source) {
  if (
    source?.paragraphIndex !== undefined &&
    source?.paragraphIndex !== null
  ) {
    return Math.max(
      Number(source.paragraphIndex) || 0,
      0
    );
  }

  if (Number(source?.paragraphNumber) > 0) {
    return Math.max(
      Number(source.paragraphNumber) - 1,
      0
    );
  }

  return 0;
}

export async function addNativeChainLink(
  source,
  note
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const clean =
    String(note || "").trim();

  if (!clean) {
    throw new Error(
      "Enter a note for your link."
    );
  }

  if (
    !source?.id ||
    !source?.userId
  ) {
    throw new Error(
      "Missing source Chain entry."
    );
  }

  const paragraphIndex =
    sourceParagraphIndex(source);

  const ref = doc(
    collection(
      db,
      "users",
      user.uid,
      "journal"
    )
  );

  const now =
    new Date().toISOString();

  const payload = {
    id: ref.id,
    userId: user.uid,
    bookId:
      String(source.bookId || ""),
    title:
      source.title || "Untitled",
    author:
      source.author || "",
    note: clean,

    // Store canonical zero-based position and the
    // human-facing number together.
    paragraphIndex,
    paragraphNumber:
      paragraphIndex + 1,

    paragraphPreview:
      source.paragraphPreview || "",
    visibility: "public",
    groupId: null,

    sourceChainEntryId:
      String(source.id),
    sourceUserId:
      String(source.userId),

    createdAt: now,
    updatedAtISO: null,

    chainUpCount: 0,
    chainDownCount: 0,
    chainScore: 0,

    createdAtServer:
      serverTimestamp()
  };

  await setDoc(ref, payload);

  // Return exactly the persisted relationship fields so
  // the caller can verify the saved link after reloading.
  return payload;
}
