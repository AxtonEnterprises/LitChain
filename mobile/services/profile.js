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
    doc(db, "users", user.uid)
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
          user.photoURL || "",
        avatar: ""
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
        updates.displayName || ""
      ).trim(),

    about:
      String(
        updates.about || ""
      ).trim(),

    // Keep the PWA's canonical avatar ID.
    avatar:
      String(
        updates.avatar || ""
      ).trim(),

    // Also keep a resolved URL for native rendering.
    photoURL:
      String(
        updates.photoURL || ""
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
