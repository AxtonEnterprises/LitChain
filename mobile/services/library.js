import {
  collection,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import {
  getNativeFriends,
  getNativeGroups
} from "./social";

async function readCollection(path) {
  try {
    const snapshot = await getDocs(
      collection(db, ...path)
    );

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));
  } catch (error) {
    console.warn(
      `Could not read ${path.join("/")}:`,
      error?.code || error
    );
    return [];
  }
}

export async function getNativeLibraryBundle() {
  const user = auth.currentUser;

  if (!user) {
    return {
      profile: null,
      timeline: [],
      journal: [],
      savedBooks: [],
      savedChain: [],
      friends: [],
      groups: []
    };
  }

  let profile = null;

  try {
    const snapshot = await getDoc(
      doc(db, "users", user.uid)
    );

    if (snapshot.exists()) {
      profile = {
        id: snapshot.id,
        ...snapshot.data()
      };
    }
  } catch {
    profile = null;
  }

  const [
    timeline,
    journal,
    savedBooks,
    savedChain,
    friends,
    groupBundle
  ] = await Promise.all([
    readCollection([
      "users",
      user.uid,
      "readingProgress"
    ]),
    readCollection([
      "users",
      user.uid,
      "journal"
    ]),
    readCollection([
      "users",
      user.uid,
      "savedBooks"
    ]),
    readCollection([
      "users",
      user.uid,
      "savedChainEntries"
    ]),
    getNativeFriends(),
    getNativeGroups()
  ]);

  timeline.sort((a, b) =>
    String(b.updatedAtISO || "")
      .localeCompare(
        String(a.updatedAtISO || "")
      )
  );

  journal.sort((a, b) =>
    String(
      b.updatedAtISO ||
      b.createdAt ||
      ""
    ).localeCompare(
      String(
        a.updatedAtISO ||
        a.createdAt ||
        ""
      )
    )
  );

  savedChain.sort((a, b) =>
    String(b.savedAtISO || "")
      .localeCompare(
        String(a.savedAtISO || "")
      )
  );

  return {
    profile,
    timeline,
    journal,
    savedBooks,
    savedChain,
    friends,
    groups: [
      ...groupBundle.mine,
      ...groupBundle.classes
    ]
  };
}
