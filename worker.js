function cleanGutenbergText(rawText) {
  if (!rawText) return "";

  let text = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const startPatterns = [
    /\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i,
    /\*\*\*\s*START OF THE PROJECT GUTENBERG EBOOK.*?\*\*\*/i
  ];

  const endPatterns = [
    /\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*/i,
    /\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK[\s\S]*/i
  ];

  for (const pattern of startPatterns) text = text.replace(pattern, "");
  for (const pattern of endPatterns) text = text.replace(pattern, "");

  return text
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function splitIntoParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);
}

function detectChapters(paragraphs) {
  const chapterPattern =
    /^(chapter|book|part)\s+([ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)/i;

  const chapters = [];

  paragraphs.forEach((paragraph, index) => {
    if (paragraph.length <= 80 && chapterPattern.test(paragraph)) {
      chapters.push({
        title: paragraph,
        paragraphIndex: index
      });
    }
  });

  return chapters;
}

async function tryBookUrl(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Lit Chain Reader"
    }
  });

  if (!response.ok) {
    throw new Error(`Book source returned ${response.status}`);
  }

  const text = await response.text();

  if (!text || text.trim().length <= 100) {
    throw new Error("Book source was empty");
  }

  return { sourceUrl: url, rawText: text };
}

async function fetchBookText(id) {
  const possibleUrls = [
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`
  ];

  try {
    return await Promise.any(possibleUrls.map(tryBookUrl));
  } catch {
    throw new Error(`Could not find readable text for book ID ${id}`);
  }
}

function jsonResponse(payload, status = 200, cache = false) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8"
  };

  if (cache) {
    headers["Cache-Control"] =
      "public, max-age=2592000, stale-while-revalidate=604800";
  }

  return new Response(JSON.stringify(payload), { status, headers });
}

function validateBookId(url) {
  const id = url.searchParams.get("id");

  if (!id || !/^\d+$/.test(id)) {
    return null;
  }

  return id;
}

async function handleStructuredBook(request) {
  const url = new URL(request.url);
  const id = validateBookId(url);

  if (!id) {
    return jsonResponse({ error: "Missing or invalid book ID" }, 400);
  }

  try {
    const { sourceUrl, rawText } = await fetchBookText(id);
    const cleanedText = cleanGutenbergText(rawText);
    const paragraphs = splitIntoParagraphs(cleanedText);
    const chapters = detectChapters(paragraphs);

    return jsonResponse(
      {
        id,
        sourceUrl,
        paragraphCount: paragraphs.length,
        characterCount: cleanedText.length,
        chapters,
        paragraphs
      },
      200,
      true
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error?.message ||
          `Could not find readable text for book ID ${id}`
      },
      404
    );
  }
}

async function handlePlainBookText(request) {
  const url = new URL(request.url);
  const id = validateBookId(url);

  if (!id) {
    return new Response("Missing or invalid book ID", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }

  try {
    const { rawText } = await fetchBookText(id);

    return new Response(rawText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control":
          "public, max-age=2592000, stale-while-revalidate=604800"
      }
    });
  } catch {
    return new Response(
      `Could not find readable text for book ID ${id}`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/book") {
      return handleStructuredBook(request);
    }

    if (request.method === "GET" && url.pathname === "/api/book-text") {
      return handlePlainBookText(request);
    }

    return env.ASSETS.fetch(request);
  }
};
