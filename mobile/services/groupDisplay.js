import {
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { getNativeGroupForum } from "./social";

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

function normalizeTimestamp(value) {
  if (!value) return "";

  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return "";
    }
  }

  if (
    typeof value === "object" &&
    Number.isFinite(value.seconds)
  ) {
    try {
      return new Date(
        value.seconds * 1000
      ).toISOString();
    } catch {
      return "";
    }
  }

  return String(value);
}

async function loadProfile(userId) {
  if (!userId) return null;

  for (const path of [
    ["publicProfiles", String(userId)],
    ["users", String(userId)]
  ]) {
    try {
      const snapshot =
        await getDoc(doc(db, ...path));

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        };
      }
    } catch {
      // Try the alternate profile location.
    }
  }

  return null;
}

function normalizePost(post) {
  const sourceParagraphIndex =
    Number(
      firstValue(
        post.sourceParagraphIndex,
        post.paragraphIndex,
        post.referencedParagraphIndex,
        post.quoteParagraphIndex,
        post.contextParagraphIndex
      ) ?? 0
    ) || 0;

  const paragraphPreview =
    firstValue(
      post.paragraphPreview,
      post.sourceParagraph,
      post.sourceText,
      post.sourceExcerpt,
      post.referencedParagraph,
      post.referencedText,
      post.quoteText,
      post.quote,
      post.excerpt,
      post.passage,
      post.contextText
    ) || "";

  return {
    ...post,

    userId:
      firstValue(
        post.userId,
        post.authorId,
        post.createdBy,
        post.createdByUid,
        post.ownerId
      ) || "",

    authorName:
      firstValue(
        post.authorName,
        post.displayName,
        post.username,
        post.createdByName,
        post.userName
      ) || "",

    sourceBookId:
      firstValue(
        post.sourceBookId,
        post.bookId,
        post.referencedBookId,
        post.contextBookId
      ) || "",

    sourceTitle:
      firstValue(
        post.sourceTitle,
        post.bookTitle,
        post.referencedBookTitle,
        post.contextBookTitle
      ) || "",

    sourceAuthor:
      firstValue(
        post.sourceAuthor,
        post.bookAuthor,
        post.referencedBookAuthor,
        post.contextBookAuthor
      ) || "",

    sourceParagraphIndex,
    paragraphPreview,

    createdAtISO:
      normalizeTimestamp(
        firstValue(
          post.createdAtISO,
          post.createdAt,
          post.createdAtServer
        )
      )
  };
}

export async function getNativeGroupForumDisplay(
  groupId
) {
  const posts =
    await getNativeGroupForum(groupId);

  const normalized =
    posts.map(normalizePost);

  const profileCache = new Map();

  await Promise.all(
    normalized.map(async (post) => {
      if (
        post.authorName ||
        !post.userId
      ) {
        return;
      }

      const key = String(post.userId);

      if (!profileCache.has(key)) {
        profileCache.set(
          key,
          loadProfile(key)
        );
      }

      const profile =
        await profileCache.get(key);

      if (!profile) return;

      post.authorName =
        firstValue(
          profile.displayName,
          profile.username,
          profile.name
        ) || "Reader";

      post.authorAvatar =
        firstValue(
          profile.avatar,
          profile.photoURL
        ) || "";
    })
  );

  return normalized.sort((a, b) => {
    const pinDelta = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDelta) return pinDelta;

    const aTime = Date.parse(a.createdAtISO || "") || 0;
    const bTime = Date.parse(b.createdAtISO || "") || 0;
    return bTime - aTime;
  });
}
