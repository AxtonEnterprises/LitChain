import {
  collection,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

import {
  getNativeGroups
} from "./social";

import {
  getNativeFriendBundle
} from "./librarySocial";

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
      friendBundle: {
        friends: [],
        incoming: [],
        outgoing: []
      },
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
  } catch {}

  const [
    timeline,
    journal,
    savedBooks,
    savedChain,
    friendBundle,
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
    getNativeFriendBundle(),
    getNativeGroups()
  ]);

  timeline.sort((a, b) =>
    String(
      b.updatedAtISO || ""
    ).localeCompare(
      String(
        a.updatedAtISO || ""
      )
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

  return {
    profile,
    timeline,
    journal,
    savedBooks,
    savedChain,
    friends: friendBundle.friends.map(
      (item) => ({
        id: item.otherUserId,
        otherUserId:
          item.otherUserId,
        relationshipId: item.id,
        ...(item.profile || {})
      })
    ),
    friendBundle,
    groups: [
      ...groupBundle.mine,
      ...groupBundle.classes
    ]
  };
}
