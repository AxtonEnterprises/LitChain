import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import { chainEntryKey } from "../../shared/chainCore";

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  return user;
}

export async function saveNativeChainEntry(entry) {
  const user = requireUser();

  if (!entry?.id || !entry?.userId) {
    throw new Error(
      "Missing Chain entry information."
    );
  }

  const savedId =
    chainEntryKey(entry);

  const now =
    new Date().toISOString();

  const data = {
    sourceEntryId:
      String(entry.id),
    sourceUserId:
      String(entry.userId),
    bookId:
      entry.bookId
        ? String(entry.bookId)
        : null,
    title:
      entry.title ||
      "Untitled",
    author:
      entry.author || "",
    note:
      entry.note || "",
    paragraphNumber:
      entry.paragraphNumber ??
      null,
    paragraphIndex:
      entry.paragraphIndex ??
      null,
    paragraphPreview:
      entry.paragraphPreview ||
      "",
    visibility:
      entry.visibility ||
      "public",
    groupId:
      entry.groupId || null,
    savedAtISO: now
  };

  await setDoc(
    doc(
      db,
      "users",
      user.uid,
      "savedChainEntries",
      savedId
    ),
    {
      ...data,
      savedAt:
        serverTimestamp()
    },
    { merge: true }
  );

  return {
    id: savedId,
    ...data
  };
}

export async function unsaveNativeChainEntry(entry) {
  const user = requireUser();

  if (!entry?.id || !entry?.userId) {
    return;
  }

  await deleteDoc(
    doc(
      db,
      "users",
      user.uid,
      "savedChainEntries",
      chainEntryKey(entry)
    )
  );
}

export async function getNativeSavedChainEntries() {
  const user = auth.currentUser;

  if (!user) return [];

  const snapshot =
    await getDocs(
      collection(
        db,
        "users",
        user.uid,
        "savedChainEntries"
      )
    );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      String(
        b.savedAtISO || ""
      ).localeCompare(
        String(
          a.savedAtISO || ""
        )
      )
    );
}

export async function reportNativeChainEntry(
  entry,
  {
    reason = "other",
    details = ""
  } = {}
) {
  const user = requireUser();

  if (!entry?.id || !entry?.userId) {
    throw new Error(
      "Missing Chain entry."
    );
  }

  const reportRef =
    doc(
      collection(
        db,
        "moderationReports"
      )
    );

  const now =
    new Date().toISOString();

  const report = {
    id:
      reportRef.id,
    reporterUserId:
      user.uid,
    targetType:
      "chain_entry",
    targetId:
      String(entry.id),
    targetUserId:
      String(entry.userId),
    reason:
      String(
        reason || "other"
      ).trim(),
    details:
      String(
        details || ""
      ).trim(),
    status:
      "open",
    createdAtISO:
      now
  };

  if (entry.groupId) {
    report.groupId =
      String(entry.groupId);
  }

  if (entry.title) {
    report.title =
      String(entry.title);
  }

  if (entry.note) {
    report.body =
      String(entry.note);
  }

  if (entry.bookId) {
    report.bookId =
      String(entry.bookId);
  }

  await setDoc(
    reportRef,
    {
      ...report,
      createdAt:
        serverTimestamp()
    }
  );

  return report;
}
