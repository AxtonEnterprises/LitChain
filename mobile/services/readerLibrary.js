import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import { getNativeGroups } from "./social";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to use Reader saves or notes.");
  return user;
}

function normalizeVisibility(value) {
  return ["private", "public", "group"].includes(value) ? value : "private";
}

export async function getNativeBookSaved(bookId) {
  const user = auth.currentUser;
  if (!user || !bookId) return false;
  try {
    const snapshot = await getDoc(
      doc(db, "users", user.uid, "savedBooks", String(bookId))
    );
    return snapshot.exists();
  } catch {
    return false;
  }
}

export async function saveNativeBook({ bookId, title, author, image = "" }) {
  const user = requireUser();
  if (!bookId) throw new Error("Cannot save a book without an ID.");

  const now = new Date().toISOString();

  await setDoc(
    doc(db, "users", user.uid, "savedBooks", String(bookId)),
    {
      id: String(bookId),
      bookId: String(bookId),
      title: title || "Untitled",
      author: author || "",
      image: image || null,
      savedAt: now,
      savedAtISO: now,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return true;
}

export async function removeNativeSavedBook(bookId) {
  const user = requireUser();
  await deleteDoc(
    doc(db, "users", user.uid, "savedBooks", String(bookId))
  );
  return false;
}

export async function getNativeJournalForBook(bookId) {
  const user = auth.currentUser;
  if (!user || !bookId) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "users", user.uid, "journal"),
      where("bookId", "==", String(bookId))
    )
  );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
      visibility: normalizeVisibility(item.data()?.visibility)
    }))
    .sort((a, b) =>
      String(b.updatedAtISO || b.createdAt || "").localeCompare(
        String(a.updatedAtISO || a.createdAt || "")
      )
    );
}

export async function addNativeJournalEntry({
  bookId,
  title,
  author,
  paragraphIndex,
  paragraphPreview,
  note,
  visibility = "private",
  groupId = null
}) {
  const user = requireUser();
  const cleanNote = String(note || "").trim();

  if (!cleanNote) throw new Error("A note cannot be empty.");

  const safeVisibility = normalizeVisibility(visibility);

  if (safeVisibility === "group" && !groupId) {
    throw new Error("Choose a group before saving a group note.");
  }

  const ref = doc(collection(db, "users", user.uid, "journal"));
  const now = new Date().toISOString();

  const payload = {
    id: ref.id,
    userId: user.uid,
    bookId: String(bookId),
    title: title || "Untitled",
    author: author || "",
    paragraphIndex: Math.max(0, Number(paragraphIndex) || 0),
    paragraphPreview: String(paragraphPreview || ""),
    note: cleanNote,
    visibility: safeVisibility,
    groupId: safeVisibility === "group" ? String(groupId) : null,
    createdAt: now,
    updatedAtISO: null,
    createdAtServer: serverTimestamp()
  };

  await setDoc(ref, payload);

  return {
    ...payload,
    createdAtServer: undefined
  };
}

export async function deleteNativeJournalEntry(entryId) {
  const user = requireUser();
  if (!entryId) return false;

  await deleteDoc(
    doc(db, "users", user.uid, "journal", String(entryId))
  );

  return true;
}

export async function getNativeReaderGroups() {
  try {
    const bundle = await getNativeGroups();
    return [
      ...(bundle?.mine || []),
      ...(bundle?.classes || [])
    ];
  } catch {
    return [];
  }
}
