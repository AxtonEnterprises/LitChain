function normalizeAuthorName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }

  return raw;
}

export function nativeBookAuthor(book) {
  if (
    typeof book?.author === "string" &&
    book.author.trim()
  ) {
    return normalizeAuthorName(book.author);
  }

  const names = Array.isArray(book?.authors)
    ? book.authors
        .map((author) =>
          normalizeAuthorName(author?.name)
        )
        .filter(Boolean)
    : [];

  return names.join(", ") || "Unknown author";
}

export function nativeBookCover(book) {
  return (
    book?.image ||
    book?.cover ||
    book?.formats?.["image/jpeg"] ||
    ""
  );
}

export function normalizeNativeBook(book) {
  if (!book?.id) return null;

  return {
    id: String(book.id),
    title:
      String(book.title || "").trim() ||
      "Untitled",
    author: nativeBookAuthor(book),
    image: nativeBookCover(book),
    subjects: Array.isArray(book.subjects)
      ? book.subjects
      : []
  };
}

export async function searchNativeBooks(term) {
  const query = String(term || "").trim();

  if (query.length < 2) {
    return [];
  }

  const response = await fetch(
    `https://gutendex.com/books?search=${encodeURIComponent(
      query
    )}`
  );

  if (!response.ok) {
    throw new Error(
      "Book search is temporarily unavailable."
    );
  }

  const payload = await response.json();

  return (payload?.results || [])
    .filter((book) => {
      const languages = Array.isArray(
        book?.languages
      )
        ? book.languages
        : [];

      return (
        !languages.length ||
        languages.includes("en")
      );
    })
    .map(normalizeNativeBook)
    .filter(Boolean)
    .slice(0, 30);
}
