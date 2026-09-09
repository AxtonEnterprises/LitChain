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

export function findResumePage(pages, paragraphIndex) {
  if (!pages?.length) return 0;
  const target = Math.max(Number(paragraphIndex) || 0, 0);
  const pageIndex = pages.findIndex(page => page.some(p => p.index >= target));
  return pageIndex >= 0 ? pageIndex : 0;
}

export function pageStartParagraph(pages, pageIndex) {
  return pages?.[pageIndex]?.[0]?.index ?? 0;
}

export function calculateProgressPercent(paragraphIndex, totalParagraphs) {
  const total = Math.max(Number(totalParagraphs) || 0, 0);
  const index = Math.max(Number(paragraphIndex) || 0, 0);
  if (total <= 1) return 0;
  return Math.max(0, Math.min(100, Math.round(index / (total - 1) * 100)));
}

export function nextVerifiedParagraph({ verifiedParagraphIndex = 0, viewedParagraphIndex = 0 }) {
  const verified = Math.max(Number(verifiedParagraphIndex) || 0, 0);
  const viewed = Math.max(Number(viewedParagraphIndex) || 0, 0);
  return viewed <= verified + 1 ? Math.max(verified, viewed) : verified;
}
