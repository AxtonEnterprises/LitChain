import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

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

  return {
    id: entryDoc.id,
    ...data,
    visibility:
      ["private", "public", "group"].includes(data?.visibility)
        ? data.visibility
        : "private",
    groupId: data?.groupId || null,
    updatedAtISO: data?.updatedAtISO || null
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
      String(b.updatedAtISO || b.createdAt || "")
        .localeCompare(String(a.updatedAtISO || a.createdAt || ""))
    );
}

function voteDocumentId(entry, voterUserId) {
  return [
    entry?.userId || "",
    entry?.id || "",
    voterUserId || ""
  ].join("_");
}

export async function getMyChainVotes(entries = []) {
  const user = auth.currentUser;
  if (!user || !entries.length) return {};

  const result = {};

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry?.id || !entry?.userId) return;

      try {
        const snapshot = await getDoc(
          doc(
            db,
            "chainVotes",
            voteDocumentId(entry, user.uid)
          )
        );

        if (snapshot.exists()) {
          const direction = Number(snapshot.data()?.direction);

          if (direction === 1 || direction === -1) {
            result[chainEntryKey(entry)] = direction;
          }
        }
      } catch (error) {
        console.warn("Could not load Chain vote:", error);
      }
    })
  );

  return result;
}

export async function voteOnChainEntry(entry, requestedDirection) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const direction = Number(requestedDirection);

  if (direction !== 1 && direction !== -1) {
    throw new Error("Invalid Chain vote.");
  }

  if (!entry?.id || !entry?.userId) {
    throw new Error("This Chain entry cannot be voted on.");
  }

  const entryRef = doc(
    db,
    "users",
    String(entry.userId),
    "journal",
    String(entry.id)
  );

  const voteId = voteDocumentId(entry, user.uid);
  const voteRef = doc(db, "chainVotes", voteId);

  return runTransaction(db, async (transaction) => {
    const [entrySnapshot, voteSnapshot] = await Promise.all([
      transaction.get(entryRef),
      transaction.get(voteRef)
    ]);

    if (!entrySnapshot.exists()) {
      throw new Error("This Chain entry no longer exists.");
    }

    const currentEntry = entrySnapshot.data();

    const previousDirection = voteSnapshot.exists()
      ? Number(voteSnapshot.data()?.direction) || 0
      : 0;

    const nextDirection =
      previousDirection === direction
        ? 0
        : direction;

    let upCount = Number(currentEntry.chainUpCount) || 0;
    let downCount = Number(currentEntry.chainDownCount) || 0;
    let score = Number(currentEntry.chainScore) || 0;

    if (previousDirection === 1) {
      upCount = Math.max(0, upCount - 1);
      score -= 1;
    } else if (previousDirection === -1) {
      downCount = Math.max(0, downCount - 1);
      score += 1;
    }

    if (nextDirection === 1) {
      upCount += 1;
      score += 1;
    } else if (nextDirection === -1) {
      downCount += 1;
      score -= 1;
    }

    transaction.update(entryRef, {
      chainUpCount: upCount,
      chainDownCount: downCount,
      chainScore: score
    });

    if (nextDirection === 0) {
      if (voteSnapshot.exists()) {
        transaction.delete(voteRef);
      }
    } else {
      transaction.set(voteRef, {
        id: voteId,
        voterUserId: user.uid,
        targetUserId: String(entry.userId),
        targetEntryId: String(entry.id),
        direction: nextDirection,
        createdAtISO:
          voteSnapshot.exists()
            ? voteSnapshot.data()?.createdAtISO ||
              new Date().toISOString()
            : new Date().toISOString(),
        createdAt:
          voteSnapshot.exists()
            ? voteSnapshot.data()?.createdAt ||
              serverTimestamp()
            : serverTimestamp(),
        updatedAtISO: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    }

    return {
      direction: nextDirection,
      chainUpCount: upCount,
      chainDownCount: downCount,
      chainScore: score
    };
  });
}
