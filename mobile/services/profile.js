import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export async function getNativeProfile() {
  const user = auth.currentUser;
  if (!user) return null;

  const snapshot = await getDoc(
    doc(
      db,
      "users",
      user.uid
    )
  );

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data()
      }
    : {
        id: user.uid,
        displayName:
          user.displayName || "",
        photoURL:
          user.photoURL || ""
      };
}

export async function saveNativeProfile(
  updates
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const clean = {
    displayName:
      String(
        updates.displayName ||
        ""
      ).trim(),
    about:
      String(
        updates.about ||
        ""
      ).trim(),
    photoURL:
      String(
        updates.photoURL ||
        updates.avatar ||
        ""
      ).trim()
  };

  await setDoc(
    doc(
      db,
      "users",
      user.uid
    ),
    clean,
    { merge: true }
  );

  return {
    id: user.uid,
    ...clean
  };
}
