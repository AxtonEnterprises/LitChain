export function chainVoteDocumentId(targetUserId, targetEntryId, voterUserId) {
  return [String(targetUserId || ""), String(targetEntryId || ""), String(voterUserId || "")].join("_");
}

export function createChainVotingService({ db, auth, doc, runTransaction, serverTimestamp }) {
  async function voteOnEntry(entry, requestedDirection) {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be logged in.");
    if (!entry?.id || !entry?.userId) throw new Error("Missing Chain entry information.");

    const direction = Number(requestedDirection);
    if (direction !== 1 && direction !== -1) throw new Error("Invalid Chain vote.");

    const targetUserId = String(entry.userId);
    const targetEntryId = String(entry.id);
    const voterUserId = user.uid;
    const entryRef = doc(db, "users", targetUserId, "journal", targetEntryId);
    const voteId = chainVoteDocumentId(targetUserId, targetEntryId, voterUserId);
    const voteRef = doc(db, "chainVotes", voteId);

    return runTransaction(db, async (transaction) => {
      // Keep reads explicit and sequential so rule evaluation sees the same
      // before/after state model as the web implementation.
      const entrySnapshot = await transaction.get(entryRef);
      const voteSnapshot = await transaction.get(voteRef);

      if (!entrySnapshot.exists()) throw new Error("This Chain entry no longer exists.");

      const currentEntry = entrySnapshot.data();
      const previousDirection = voteSnapshot.exists() ? Number(voteSnapshot.data()?.direction) || 0 : 0;
      const nextDirection = previousDirection === direction ? 0 : direction;

      let upCount = Number(currentEntry.chainUpCount) || 0;
      let downCount = Number(currentEntry.chainDownCount) || 0;
      let score = Number(currentEntry.chainScore) || 0;

      if (previousDirection === 1) { upCount = Math.max(0, upCount - 1); score -= 1; }
      else if (previousDirection === -1) { downCount = Math.max(0, downCount - 1); score += 1; }

      if (nextDirection === 1) { upCount += 1; score += 1; }
      else if (nextDirection === -1) { downCount += 1; score -= 1; }

      // The rules only allow these aggregate fields to change during a vote.
      transaction.update(entryRef, {
        chainUpCount: upCount,
        chainDownCount: downCount,
        chainScore: score
      });

      if (nextDirection === 0) {
        if (voteSnapshot.exists()) transaction.delete(voteRef);
      } else {
        const now = new Date().toISOString();
        const oldVote = voteSnapshot.exists() ? voteSnapshot.data() : null;
        transaction.set(voteRef, {
          id: voteId,
          voterUserId,
          targetUserId,
          targetEntryId,
          direction: nextDirection,
          createdAtISO: oldVote?.createdAtISO || now,
          createdAt: oldVote?.createdAt || serverTimestamp(),
          updatedAtISO: now,
          updatedAt: serverTimestamp()
        });
      }

      return { direction: nextDirection, chainUpCount: upCount, chainDownCount: downCount, chainScore: score };
    });
  }

  return { voteOnEntry };
}
