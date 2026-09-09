export function clampIndex(value, totalParagraphs = 0) {
  const total = Math.max(Number(totalParagraphs) || 0, 0);
  const raw = Math.max(Number(value) || 0, 0);

  if (!total) return raw;

  return Math.min(raw, total - 1);
}

export function progressPercent(index, totalParagraphs) {
  const total = Math.max(Number(totalParagraphs) || 0, 0);
  const safe = clampIndex(index, total);

  if (total <= 1) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round((safe / (total - 1)) * 100)
    )
  );
}

/*
 * Verified reading can move forward only one paragraph beyond the
 * currently verified frontier. Jumping ahead updates active position,
 * but does not manufacture reading credit.
 */
export function nextVerifiedReadingIndex({
  currentVerified = 0,
  viewedParagraphIndex = 0,
  totalParagraphs = 0
}) {
  const verified = clampIndex(currentVerified, totalParagraphs);
  const viewed = clampIndex(viewedParagraphIndex, totalParagraphs);

  if (viewed <= verified + 1) {
    return Math.max(verified, viewed);
  }

  return verified;
}

export function mergeReadingProgress({
  oldProgress = {},
  viewedParagraphIndex = 0,
  totalParagraphs = 0
}) {
  const total = Math.max(Number(totalParagraphs) || 0, 0);
  const activeParagraphIndex = clampIndex(viewedParagraphIndex, total);

  const oldVerified = Number(
    oldProgress.verifiedParagraphIndex ??
    oldProgress.paragraphIndex ??
    0
  ) || 0;

  const verifiedParagraphIndex = nextVerifiedReadingIndex({
    currentVerified: oldVerified,
    viewedParagraphIndex: activeParagraphIndex,
    totalParagraphs: total
  });

  return {
    activeParagraphIndex,
    verifiedParagraphIndex,
    activePercent: progressPercent(activeParagraphIndex, total),
    percentComplete: progressPercent(verifiedParagraphIndex, total)
  };
}
