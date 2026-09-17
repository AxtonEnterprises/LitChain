import {
  collection,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import { getNativeGroups } from "./social";
import { getNativeFriendBundle } from "./librarySocial";

async function readCollection(path) {
  try {
    const snapshot = await getDocs(collection(db, ...path));
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));
  } catch (error) {
    console.warn(`Could not read ${path.join("/")}:`, error?.code || error);
    return [];
  }
}

function coverUrl(book) {
  return book?.image || book?.cover || book?.formats?.["image/jpeg"] || "";
}

async function hydrateTimelineCovers(items) {
  const books = Array.isArray(items) ? items : [];
  const missingIds = [
    ...new Set(
      books
        .filter((book) => !coverUrl(book))
        .map((book) => String(book.bookId || book.id || "").trim())
        .filter(Boolean)
    )
  ];

  if (!missingIds.length) return books;

  try {
    const response = await fetch(
      `https://gutendex.com/books/?ids=${encodeURIComponent(missingIds.join(","))}`
    );
    if (!response.ok) return books;

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    const byId = new Map(results.map((book) => [String(book.id), book]));

    return books.map((book) => {
      if (coverUrl(book)) return book;
      const metadata = byId.get(String(book.bookId || book.id || ""));
      const image = coverUrl(metadata);
      return image ? { ...book, image } : book;
    });
  } catch {
    return books;
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
      friendBundle: { friends: [], incoming: [], outgoing: [] },
      groups: []
    };
  }

  let profile = null;

  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    if (snapshot.exists()) {
      profile = { id: snapshot.id, ...snapshot.data() };
    }
  } catch {}

  const [
    rawTimeline,
    journal,
    savedBooks,
    savedChain,
    friendBundle,
    groupBundle
  ] = await Promise.all([
    readCollection(["users", user.uid, "readingProgress"]),
    readCollection(["users", user.uid, "journal"]),
    readCollection(["users", user.uid, "savedBooks"]),
    readCollection(["users", user.uid, "savedChainEntries"]),
    getNativeFriendBundle(),
    getNativeGroups()
  ]);

  rawTimeline.sort((a, b) =>
    String(
      b.positionUpdatedAtISO ||
      b.updatedAtISO ||
      b.lastReadAtISO ||
      ""
    ).localeCompare(
      String(
        a.positionUpdatedAtISO ||
        a.updatedAtISO ||
        a.lastReadAtISO ||
        ""
      )
    )
  );

  const timeline = await hydrateTimelineCovers(rawTimeline);

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
    friends: friendBundle.friends.map((item) => ({
      id: item.otherUserId,
      otherUserId: item.otherUserId,
      relationshipId: item.id,
      ...(item.profile || {})
    })),
    friendBundle,
    groups: [
      ...groupBundle.mine,
      ...groupBundle.classes
    ]
  };
}
