import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user;
}

export async function getNativeJournalEntry(
  entryId
) {
  const user = requireUser();

  const snapshot = await getDoc(
    doc(
      db,
      "users",
      user.uid,
      "journal",
      String(entryId)
    )
  );

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data()
      }
    : null;
}

export async function updateNativeJournalEntry(
  entryId,
  note
) {
  const user = requireUser();

  await updateDoc(
    doc(
      db,
      "users",
      user.uid,
      "journal",
      String(entryId)
    ),
    {
      note: String(note || "").trim(),
      updatedAtISO:
        new Date().toISOString()
    }
  );
}

export async function deleteNativeJournalEntryById(
  entryId
) {
  const user = requireUser();

  await deleteDoc(
    doc(
      db,
      "users",
      user.uid,
      "journal",
      String(entryId)
    )
  );
}
