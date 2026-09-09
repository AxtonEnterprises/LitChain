import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import {
  getNativeFriends,
  getNativeGroups
} from "./social";

import {
  voteOnChainEntry
} from "./chainVoting";

export { voteOnChainEntry };

export {
  buildSourceBooks,
  chainDownCount,
  chainEntryKey,
  chainUpCount,
  chainVoteScore,
  getDirectBookEntries,
  getPublicBranches,
  gutenbergCoverUrl,
  sortChainEntriesByVote
} from "../../shared/chainCore";

import {
  chainEntryKey
} from "../../shared/chainCore";

function normalize(entryDoc) {
  const data = entryDoc.data();

  const paragraphIndex =
    data?.paragraphIndex !== undefined &&
    data?.paragraphIndex !== null
      ? Math.max(
          Number(data.paragraphIndex) || 0,
          0
        )
      : (
          Number(data?.paragraphNumber) > 0
            ? Number(data.paragraphNumber) - 1
            : null
        );

  return {
    id: entryDoc.id,
    ...data,
    paragraphIndex,
    paragraphNumber:
      paragraphIndex !== null
        ? paragraphIndex + 1
        : (
            Number(data?.paragraphNumber) > 0
              ? Number(data.paragraphNumber)
              : null
          ),
    visibility:
      ["private", "public", "group"].includes(
        data?.visibility
      )
        ? data.visibility
        : "private",
    groupId: data?.groupId || null,
    updatedAtISO:
      data?.updatedAtISO || null
  };
}

async function publicFeed() {
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

export async function getChainFeedByFilter(
  filter = "all"
) {
  if (filter === "groups") {
    const bundle =
      await getNativeGroups();

    const groups = [
      ...bundle.mine,
      ...bundle.classes
    ];

    if (!groups.length) return [];

    const result = [];

    await Promise.all(
      groups.map(async group => {
        try {
          const snapshot =
            await getDocs(
              query(
                collectionGroup(
                  db,
                  "journal"
                ),
                where(
                  "groupId",
                  "==",
                  String(group.id)
                ),
                where(
                  "visibility",
                  "==",
                  "group"
                )
              )
            );

          for (const item of snapshot.docs) {
            result.push({
              ...normalize(item),
              group: {
                id: group.id,
                name:
                  group.name ||
                  "Reading Group"
              }
            });
          }
        } catch (error) {
          console.warn(
            `Could not load Chain group ${group.id}:`,
            error?.code || error
          );
        }
      })
    );

    return result.sort((a, b) =>
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

  const feed = await publicFeed();

  if (filter !== "friends") {
    return feed;
  }

  const friends =
    await getNativeFriends();

  const ids = new Set(
    friends
      .map(
        friend =>
          friend.otherUserId ||
          friend.userId ||
          friend.uid
      )
      .filter(Boolean)
      .map(String)
  );

  return feed.filter(entry =>
    ids.has(
      String(entry.userId || "")
    )
  );
}

export async function getPublicChainFeed() {
  return publicFeed();
}

function voteDocumentId(
  entry,
  voterUserId
) {
  return [
    entry?.userId || "",
    entry?.id || "",
    voterUserId || ""
  ].join("_");
}

export async function getMyChainVotes(
  entries = []
) {
  const user = auth.currentUser;

  if (!user || !entries.length) {
    return {};
  }

  const result = {};

  await Promise.all(
    entries.map(async entry => {
      if (
        !entry?.id ||
        !entry?.userId
      ) {
        return;
      }

      try {
        const snapshot =
          await getDoc(
            doc(
              db,
              "chainVotes",
              voteDocumentId(
                entry,
                user.uid
              )
            )
          );

        if (snapshot.exists()) {
          const direction =
            Number(
              snapshot.data()?.direction
            );

          if (
            direction === 1 ||
            direction === -1
          ) {
            result[
              chainEntryKey(entry)
            ] = direction;
          }
        }
      } catch (error) {
        console.warn(
          "Could not load Chain vote:",
          error?.code || error
        );
      }
    })
  );

  return result;
}
