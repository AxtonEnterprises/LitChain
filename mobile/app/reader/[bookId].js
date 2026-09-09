import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";

import {
  router,
  useLocalSearchParams
} from "expo-router";

import { BRAND } from "../../../shared/brand";

import {
  findResumePage,
  normalizeBookText,
  paginateParagraphsByGeometry,
  pageStartParagraph,
  splitBookParagraphs
} from "../../../shared/readerCore";

import {
  getNativeReadingProgress,
  saveNativeReadingPosition,
  saveNativeReadingProgress
} from "../../services/reading";

export default function Reader() {
  const params = useLocalSearchParams();

  const bookId = String(params.bookId || "");
  const title = String(params.title || "Book");
  const author = String(params.author || "");

  const requestedStart =
    params.startParagraph !== undefined
      ? Math.max(Number(params.startParagraph) || 0, 0)
      : null;

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [font, setFont] = useState(18);
  const [dark, setDark] = useState(false);
  const [resume, setResume] = useState(0);
  const [verified, setVerified] = useState(0);
  const [activePercent, setActivePercent] = useState(0);
  const [verifiedPercent, setVerifiedPercent] = useState(0);
  const [readerHeight, setReaderHeight] = useState(0);
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active"
  );

  const ref = useRef(null);
  const readingTimeBankRef = useRef(0);
  const registeringRef = useRef(false);
  const { width } = useWindowDimensions();

  const paragraphs = useMemo(
    () => splitBookParagraphs(text),
    [text]
  );

  const pages = useMemo(
    () =>
      paginateParagraphsByGeometry({
        paragraphs,
        containerWidth: width,
        containerHeight: readerHeight,
        fontSize: font
      }),
    [paragraphs, width, readerHeight, font]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState) => {
        setAppActive(nextState === "active");
      }
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const progress =
          await getNativeReadingProgress(bookId);

        if (active) {
          setVerified(
            Number(
              progress?.verifiedParagraphIndex ??
              progress?.paragraphIndex ??
              0
            ) || 0
          );

          setActivePercent(
            Number(progress?.activePercent || 0)
          );

          setVerifiedPercent(
            Number(progress?.percentComplete || 0)
          );

          setResume(
            requestedStart !== null
              ? requestedStart
              : Number(
                  progress?.activeParagraphIndex ??
                  progress?.paragraphIndex ??
                  0
                ) || 0
          );
        }

        const urls = [
          `https://litchain.org/api/book-text?id=${encodeURIComponent(bookId)}`,
          `https://litchain.org/api/book?id=${encodeURIComponent(bookId)}`
        ];

        let loaded = "";

        for (const url of urls) {
          const response = await fetch(url);
          if (!response.ok) continue;

          const contentType =
            response.headers.get("content-type") || "";

          const value =
            contentType.includes("application/json")
              ? await response.json()
              : await response.text();

          loaded = normalizeBookText(value);

          if (loaded) break;
        }

        if (active) setText(loaded);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [bookId, requestedStart]);

  useEffect(() => {
    if (!pages.length) return;

    const index = findResumePage(pages, resume);
    setPage(index);

    requestAnimationFrame(() =>
      ref.current?.scrollToIndex({
        index,
        animated: false
      })
    );
  }, [pages.length, resume]);

  /*
   * Navigation position is intentionally separate from verified reading.
   * Merely opening/swiping to a page must not award reading credit.
   */
  async function persistPosition(index) {
    const paragraphIndex =
      pageStartParagraph(pages, index);

    const result =
      await saveNativeReadingPosition({
        bookId,
        title,
        author,
        paragraphIndex,
        totalParagraphs: paragraphs.length
      });

    if (result) {
      setActivePercent(result.activePercent);
    }
  }

  /*
   * Reset accumulated reading time when the page changes. The timer below
   * then advances only the next sequential paragraph that is actually visible
   * on the current page.
   */
  useEffect(() => {
    readingTimeBankRef.current = 0;
  }, [page, bookId]);

  useEffect(() => {
    if (
      !bookId ||
      !pages.length ||
      !paragraphs.length ||
      !appActive
    ) {
      return;
    }

    const visibleParagraphs = [
      ...new Set(
        (pages[page] || []).map((item) => item.index)
      )
    ];

    const candidate = Math.min(
      Math.max(Number(verified) || 0, 0) + 1,
      paragraphs.length - 1
    );

    if (!visibleParagraphs.includes(candidate)) {
      return;
    }

    let lastTick = Date.now();

    const interval = setInterval(async () => {
      const now = Date.now();
      const delta = Math.max(0, now - lastTick);
      lastTick = now;

      if (!appActive) return;

      readingTimeBankRef.current += delta;

      if (
        registeringRef.current ||
        readingTimeBankRef.current < 1000
      ) {
        return;
      }

      registeringRef.current = true;

      try {
        const result =
          await saveNativeReadingProgress({
            bookId,
            title,
            author,
            paragraphIndex: candidate,
            totalParagraphs: paragraphs.length
          });

        if (result) {
          const nextVerified =
            Number(
              result.verifiedParagraphIndex ??
              candidate
            ) || 0;

          if (nextVerified > verified) {
            readingTimeBankRef.current =
              Math.max(
                0,
                readingTimeBankRef.current - 1000
              );
          }

          setVerified(nextVerified);
          setVerifiedPercent(
            Number(result.percentComplete || 0)
          );
        }
      } finally {
        registeringRef.current = false;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    appActive,
    author,
    bookId,
    page,
    pages,
    paragraphs.length,
    title,
    verified
  ]);

  function go(index) {
    const safe = Math.max(
      0,
      Math.min(
        index,
        Math.max(pages.length - 1, 0)
      )
    );

    setPage(safe);
    persistPosition(safe);

    ref.current?.scrollToIndex({
      index: safe,
      animated: true
    });
  }

  const palette = dark
    ? {
        bg: "#111516",
        surface: "#171D1E",
        text: "#EEF3F3",
        muted: "#9BA9AA",
        line: "#263234"
      }
    : {
        bg: "#FFFDF8",
        surface: "#FFF",
        text: "#242A2B",
        muted: "#79888A",
        line: BRAND.line
      };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { backgroundColor: palette.bg }
        ]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: palette.bg }
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.line
          }
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.headerIcon}
        >
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>

        <View style={styles.titleWrap}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: palette.text }
            ]}
          >
            {title}
          </Text>

          {!!author && (
            <Text
              numberOfLines={1}
              style={{
                color: palette.muted,
                fontSize: 11
              }}
            >
              {author}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() =>
            setDark((value) => !value)
          }
          style={styles.headerIcon}
        >
          <Text
            style={[
              styles.modeGlyph,
              {
                color: dark
                  ? "#EEF3F3"
                  : BRAND.ink
              }
            ]}
          >
            {dark ? "☀" : "☾"}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.progressWrap,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.line
          }
        ]}
      >
        <View style={styles.progressCopy}>
          <Text
            style={[
              styles.progressLabel,
              { color: palette.muted }
            ]}
          >
            Active
          </Text>

          <Text
            style={[
              styles.progressValue,
              { color: palette.text }
            ]}
          >
            {activePercent}%
          </Text>
        </View>

        <View style={styles.progressCopy}>
          <Text
            style={[
              styles.progressLabel,
              { color: palette.muted }
            ]}
          >
            Verified
          </Text>

          <Text
            style={[
              styles.progressValue,
              { color: BRAND.tealDark }
            ]}
          >
            {verifiedPercent}%
          </Text>
        </View>

        <Text
          style={[
            styles.verifiedParagraph,
            { color: palette.muted }
          ]}
        >
          verified through ¶{verified + 1}
        </Text>
      </View>

      <View
        style={styles.readerViewport}
        onLayout={(event) => {
          const nextHeight = Math.floor(
            event.nativeEvent.layout.height
          );

          if (
            nextHeight > 0 &&
            nextHeight !== readerHeight
          ) {
            setReaderHeight(nextHeight);
          }
        }}
      >
        {!!readerHeight && (
          <FlatList
            ref={ref}
            horizontal
            pagingEnabled
            data={pages}
            key={`${width}:${readerHeight}:${font}`}
            keyExtractor={(_, index) =>
              String(index)
            }
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index
            })}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(
                event.nativeEvent.contentOffset.x /
                  Math.max(width, 1)
              );

              setPage(next);
              persistPosition(next);
            }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.page,
                  { width }
                ]}
              >
                {item.map(
                  (paragraph, fragmentIndex) => (
                    <View
                      key={`${paragraph.index}:${fragmentIndex}`}
                      style={styles.row}
                    >
                      <Text
                        style={[
                          styles.num,
                          {
                            color:
                              palette.muted
                          }
                        ]}
                      >
                        {paragraph.continuation
                          ? ""
                          : paragraph.index + 1}
                      </Text>

                      <Text
                        style={{
                          flex: 1,
                          color: palette.text,
                          fontSize: font,
                          lineHeight:
                            font * 1.55
                        }}
                      >
                        {paragraph.text}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
          />
        )}
      </View>

      <View
        style={[
          styles.controls,
          {
            backgroundColor: palette.surface,
            borderTopColor: palette.line
          }
        ]}
      >
        <Pressable
          onPress={() => go(page - 1)}
          style={styles.controlButton}
        >
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setFont((value) =>
              Math.max(14, value - 1)
            )
          }
          style={styles.controlButton}
        >
          <Text style={styles.controlText}>
            A−
          </Text>
        </Pressable>

        <Text
          style={{
            color: palette.muted,
            fontWeight: "700"
          }}
        >
          {page + 1}/
          {Math.max(pages.length, 1)}
        </Text>

        <Pressable
          onPress={() =>
            setFont((value) =>
              Math.min(28, value + 1)
            )
          }
          style={styles.controlButton}
        >
          <Text style={styles.controlText}>
            A+
          </Text>
        </Pressable>

        <Pressable
          onPress={() => go(page + 1)}
          style={styles.controlButton}
        >
          <Text style={styles.navGlyph}>›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center"
  },

  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center"
  },

  navGlyph: {
    color: BRAND.tealDark,
    fontSize: 30,
    fontWeight: "700"
  },

  modeGlyph: {
    fontSize: 21,
    fontWeight: "900"
  },

  titleWrap: {
    flex: 1,
    paddingHorizontal: 6
  },

  title: {
    fontWeight: "900",
    fontSize: 17
  },

  progressWrap: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 18,
    alignItems: "center"
  },

  progressCopy: {
    flexDirection: "row",
    gap: 4,
    alignItems: "baseline"
  },

  progressLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    fontWeight: "800"
  },

  progressValue: {
    fontSize: 12,
    fontWeight: "900"
  },

  verifiedParagraph: {
    flex: 1,
    textAlign: "right",
    fontSize: 9
  },

  readerViewport: {
    flex: 1,
    overflow: "hidden"
  },

  page: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 0
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18
  },

  num: {
    width: 34,
    fontSize: 10,
    paddingTop: 4
  },

  controls: {
    minHeight: 62,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },

  controlButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },

  controlText: {
    color: BRAND.tealDark,
    fontSize: 16,
    fontWeight: "900"
  }
});
