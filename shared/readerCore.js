export const DEFAULT_READER_PAGE_CHAR_TARGET = 1500;

export function normalizeBookText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.text || value.content || value.bookText || value.body || "";
}

export function splitBookParagraphs(text) {
  return String(text || "").split(/\n\s*\n+/).map(v => v.trim()).filter(Boolean);
}

export function paginateParagraphs(paragraphs, target = DEFAULT_READER_PAGE_CHAR_TARGET) {
  const pages = [];
  let current = [];
  let size = 0;

  paragraphs.forEach((paragraph, index) => {
    const text = String(paragraph || "");
    if (current.length && size + text.length > target) {
      pages.push(current);
      current = [];
      size = 0;
    }
    current.push({ text, index });
    size += text.length;
  });

  if (current.length) pages.push(current);
  return pages;
}

/*
 * Geometry-aware pagination for React Native.
 *
 * The old native reader used a fixed character target. That meant page
 * contents could be taller than the actual viewport and React Native simply
 * clipped the bottom. This version estimates wrapped lines from the real
 * screen width, font size, and available reader height. Very long paragraphs
 * are split into continuation fragments that retain the original paragraph
 * index so progress/notes still refer to the correct paragraph.
 */
export function paginateParagraphsByGeometry({
  paragraphs = [],
  containerWidth = 0,
  containerHeight = 0,
  fontSize = 18,
  horizontalPadding = 40,
  paragraphNumberWidth = 34,
  paragraphGap = 18,
  lineHeightMultiplier = 1.55
} = {}) {
  if (!paragraphs.length || !containerWidth || !containerHeight) return [];

  const lineHeight = Math.max(fontSize * lineHeightMultiplier, 1);
  const textWidth = Math.max(
    containerWidth - horizontalPadding - paragraphNumberWidth,
    fontSize * 8
  );

  // Conservative average glyph width. Slight under-filling is preferable to
  // clipping text below the viewport.
  const charsPerLine = Math.max(
    12,
    Math.floor(textWidth / Math.max(fontSize * 0.52, 1))
  );

  const maxLines = Math.max(
    1,
    Math.floor(containerHeight / lineHeight)
  );

  const paragraphGapLines = Math.max(
    1,
    Math.ceil(paragraphGap / lineHeight)
  );

  function estimateLines(text) {
    const value = String(text || "").trim();
    if (!value) return 1;

    return value.split(/\n/).reduce(
      (sum, part) =>
        sum + Math.max(1, Math.ceil(part.length / charsPerLine)),
      0
    );
  }

  function splitToFit(text, availableLines) {
    const words = String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return ["", ""];

    const targetChars = Math.max(
      charsPerLine * availableLines,
      charsPerLine
    );

    let used = 0;
    let cut = 0;

    for (let i = 0; i < words.length; i += 1) {
      const next = words[i].length + (i ? 1 : 0);

      if (i > 0 && used + next > targetChars) break;

      used += next;
      cut = i + 1;
    }

    if (!cut) cut = 1;

    return [
      words.slice(0, cut).join(" "),
      words.slice(cut).join(" ")
    ];
  }

  const pages = [];
  let current = [];
  let usedLines = 0;

  function flush() {
    if (current.length) pages.push(current);
    current = [];
    usedLines = 0;
  }

  paragraphs.forEach((paragraph, index) => {
    let remaining = String(paragraph || "").trim();
    let continuation = false;

    while (remaining) {
      const gapLines = current.length ? paragraphGapLines : 0;
      let available = maxLines - usedLines - gapLines;

      if (available <= 0) {
        flush();
        available = maxLines;
      }

      const required = estimateLines(remaining);

      // Whole paragraph fits.
      if (required <= available) {
        current.push({
          text: remaining,
          index,
          continuation
        });

        usedLines += required + gapLines;
        remaining = "";
        continue;
      }

      // It fits intact on a fresh page, so do not split it unnecessarily.
      if (current.length && required <= maxLines) {
        flush();
        continue;
      }

      // Too tall for the remaining page or for an entire page. Carry the
      // remainder onto the next page instead of allowing native clipping.
      const [head, tail] = splitToFit(
        remaining,
        Math.max(available, 1)
      );

      current.push({
        text: head,
        index,
        continuation
      });

      remaining = tail;
      continuation = true;
      flush();
    }
  });

  flush();
  return pages;
}

export function findResumePage(pages, paragraphIndex) {
  if (!pages?.length) return 0;

  const target = Math.max(Number(paragraphIndex) || 0, 0);

  const pageIndex = pages.findIndex(
    page => page.some(p => p.index >= target)
  );

  return pageIndex >= 0 ? pageIndex : 0;
}

export function pageStartParagraph(pages, pageIndex) {
  return pages?.[pageIndex]?.[0]?.index ?? 0;
}

export function calculateProgressPercent(paragraphIndex, totalParagraphs) {
  const total = Math.max(Number(totalParagraphs) || 0, 0);
  const index = Math.max(Number(paragraphIndex) || 0, 0);

  if (total <= 1) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(index / (total - 1) * 100)
    )
  );
}

export function nextVerifiedParagraph({
  verifiedParagraphIndex = 0,
  viewedParagraphIndex = 0
}) {
  const verified = Math.max(Number(verifiedParagraphIndex) || 0, 0);
  const viewed = Math.max(Number(viewedParagraphIndex) || 0, 0);

  return viewed <= verified + 1
    ? Math.max(verified, viewed)
    : verified;
}
