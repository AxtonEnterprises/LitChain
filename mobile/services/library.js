import {
  collection,
  getDocs
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export async function getNativeLibrary() {
  const user = auth.currentUser;

  if (!user) {
    return {
      reading: [],
      savedChain: []
    };
  }

  const [readingSnapshot, savedSnapshot] = await Promise.all([
    getDocs(
      collection(
        db,
        "users",
        user.uid,
        "readingProgress"
      )
    ),
    getDocs(
      collection(
        db,
        "users",
        user.uid,
        "savedChainEntries"
      )
    )
  ]);

  const reading = readingSnapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      String(b.updatedAtISO || "")
        .localeCompare(String(a.updatedAtISO || ""))
    );

  const savedChain = savedSnapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      String(b.savedAtISO || "")
        .localeCompare(String(a.savedAtISO || ""))
    );

  return {
    reading,
    savedChain
  };
}
