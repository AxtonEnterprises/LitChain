import {
  collectionGroup,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../lib/firebase";

function normalize(entryDoc) {
  const data = entryDoc.data();
  return {
    id: entryDoc.id,
    ...data,
    visibility:
      ["private", "public", "group"].includes(data?.visibility)
        ? data.visibility
        : "private"
  };
}

export async function getPublicChainFeed() {
  const snapshot = await getDocs(
    query(
      collectionGroup(db, "journal"),
      where("visibility", "==", "public")
    )
  );

  return snapshot.docs
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) =>
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
}

export function buildSourceBooks(entries) {
  const byBook = new Map();

  for (const entry of entries || []) {
    if (!entry?.bookId) continue;
    if (entry.sourceChainEntryId) continue;

    const bookId = String(entry.bookId);

    if (!byBook.has(bookId)) {
      byBook.set(bookId, {
        id: bookId,
        bookId,
        title: entry.title || "Untitled",
        author: entry.author || "",
        coverUrl:
          entry.coverUrl ||
          entry.cover ||
          entry.image ||
          entry.thumbnail ||
          "",
        linkCount: 0
      });
    }

    byBook.get(bookId).linkCount += 1;
  }

  return [...byBook.values()]
    .sort((a, b) => b.linkCount - a.linkCount);
}

export function getBookLevelOne(entries, bookId) {
  return (entries || [])
    .filter((entry) =>
      String(entry?.bookId || "") === String(bookId) &&
      !entry?.sourceChainEntryId
    )
    .sort((a, b) =>
      Number(b.voteScore || 0) - Number(a.voteScore || 0)
    );
}

export function gutenbergCoverUrl(book) {
  const explicit =
    book?.coverUrl ||
    book?.cover ||
    book?.image ||
    book?.thumbnail ||
    "";

  if (explicit) return explicit;

  const numericId =
    String(book?.bookId || book?.id || "")
      .match(/\d+/)?.[0];

  if (!numericId) return "";

  return `https://www.gutenberg.org/cache/epub/${numericId}/pg${numericId}.cover.medium.jpg`;
}
