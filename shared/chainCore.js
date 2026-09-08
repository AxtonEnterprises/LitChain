export function chainEntryKey(entry) {
  return [entry?.userId || "", entry?.id || ""]
    .filter(Boolean)
    .join("_");
}

export function chainVoteScore(entry) {
  const score = Number(entry?.chainScore);
  return Number.isFinite(score) ? score : 0;
}

export function chainUpCount(entry) {
  const count = Number(entry?.chainUpCount);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export function chainDownCount(entry) {
  const count = Number(entry?.chainDownCount);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export function sortChainEntriesByVote(entries = []) {
  return [...entries].sort((a, b) => {
    const scoreDifference = chainVoteScore(b) - chainVoteScore(a);
    if (scoreDifference !== 0) return scoreDifference;

    const upDifference = chainUpCount(b) - chainUpCount(a);
    if (upDifference !== 0) return upDifference;

    const aDate = String(a?.updatedAtISO || a?.createdAt || "");
    const bDate = String(b?.updatedAtISO || b?.createdAt || "");
    return bDate.localeCompare(aDate);
  });
}

export function buildSourceBooks(entries = []) {
  const byBook = new Map();

  for (const entry of entries) {
    if (!entry?.bookId || entry?.sourceChainEntryId) continue;

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
        linkCount: 0,
        latestAt: entry.updatedAtISO || entry.createdAt || ""
      });
    }

    const book = byBook.get(bookId);
    book.linkCount += 1;

    const candidateDate = entry.updatedAtISO || entry.createdAt || "";
    if (String(candidateDate) > String(book.latestAt || "")) {
      book.latestAt = candidateDate;
    }
  }

  return [...byBook.values()].sort((a, b) => {
    const linkDifference = Number(b.linkCount) - Number(a.linkCount);
    if (linkDifference !== 0) return linkDifference;
    return String(b.latestAt || "").localeCompare(String(a.latestAt || ""));
  });
}

export function getDirectBookEntries(entries = [], bookId) {
  return sortChainEntriesByVote(
    entries.filter(
      (entry) =>
        String(entry?.bookId || "") === String(bookId || "") &&
        !entry?.sourceChainEntryId
    )
  );
}

export function getPublicBranches(entries = [], sourceEntry) {
  if (!sourceEntry?.id) return [];

  return sortChainEntriesByVote(
    entries.filter((entry) => {
      if (!entry?.id || !entry?.userId) return false;
      if (entry.visibility !== "public") return false;

      const same =
        String(entry.id) === String(sourceEntry.id) &&
        String(entry.userId) === String(sourceEntry.userId || "");

      if (same) return false;

      return (
        String(entry.sourceChainEntryId || "") === String(sourceEntry.id) &&
        (
          !entry.sourceUserId ||
          !sourceEntry.userId ||
          String(entry.sourceUserId) === String(sourceEntry.userId)
        )
      );
    })
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

  const numericId = String(book?.bookId || book?.id || "")
    .match(/\d+/)?.[0];

  if (!numericId) return "";

  return `https://www.gutenberg.org/cache/epub/${numericId}/pg${numericId}.cover.medium.jpg`;
}
