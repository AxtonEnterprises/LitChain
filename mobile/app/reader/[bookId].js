import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  router,
  useLocalSearchParams
} from "expo-router";

import { BRAND } from "../../../shared/brand";

const PAGE_CHAR_TARGET = 1500;

async function readResponse(response) {
  const type =
    response.headers.get("content-type") ||
    "";

  if (
    type.includes(
      "application/json"
    )
  ) {
    return response.json();
  }

  return response.text();
}

function extractText(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return (
    value.text ||
    value.content ||
    value.bookText ||
    value.body ||
    ""
  );
}

function paginate(paragraphs) {
  const pages = [];
  let current = [];
  let size = 0;

  paragraphs.forEach(
    (paragraph, index) => {
      const nextSize =
        size + paragraph.length;

      if (
        current.length &&
        nextSize >
          PAGE_CHAR_TARGET
      ) {
        pages.push(current);
        current = [];
        size = 0;
      }

      current.push({
        text: paragraph,
        index
      });

      size += paragraph.length;
    }
  );

  if (current.length) {
    pages.push(current);
  }

  return pages;
}

export default function NativeReader() {
  const params =
    useLocalSearchParams();

  const bookId =
    String(params.bookId || "");

  const title =
    String(params.title || "Book");

  const author =
    String(params.author || "");

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [pageIndex, setPageIndex] =
    useState(0);

  const [fontSize, setFontSize] =
    useState(18);

  const [dark, setDark] =
    useState(false);

  const pagerRef =
    useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const urls = [
          `https://litchain.org/api/book-text?id=${encodeURIComponent(
            bookId
          )}`,
          `https://litchain.org/api/book?id=${encodeURIComponent(
            bookId
          )}`
        ];

        let loaded = "";

        for (const url of urls) {
          const response =
            await fetch(url);

          if (!response.ok) {
            continue;
          }

          loaded =
            extractText(
              await readResponse(
                response
              )
            );

          if (loaded) break;
        }

        if (!loaded) {
          throw new Error(
            "No readable text."
          );
        }

        if (active) {
          setText(loaded);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setError(
            "This book could not be loaded."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [bookId]);

  const paragraphs =
    useMemo(
      () =>
        String(text)
          .split(/\n\s*\n+/)
          .map((value) =>
            value.trim()
          )
          .filter(Boolean),
      [text]
    );

  const pages =
    useMemo(
      () => paginate(paragraphs),
      [paragraphs]
    );

  function goToPage(next) {
    const safe = Math.max(
      0,
      Math.min(
        Number(next) || 0,
        Math.max(
          pages.length - 1,
          0
        )
      )
    );

    setPageIndex(safe);

    pagerRef.current
      ?.scrollToIndex({
        index: safe,
        animated: true
      });
  }

  const palette = dark
    ? {
        background: "#111516",
        surface: "#171D1E",
        text: "#EEF3F3",
        muted: "#9BA9AA",
        line: "#263234"
      }
    : {
        background: "#FFFDF8",
        surface: "#FFFFFF",
        text: "#242A2B",
        muted: "#79888A",
        line: BRAND.line
      };

  const width =
    Dimensions.get("window").width;

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          {
            backgroundColor:
              palette.background
          }
        ]}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor:
            palette.background
        }
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor:
              palette.surface,
            borderBottomColor:
              palette.line
          }
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <View style={styles.titleWrap}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color:
                  palette.text
              }
            ]}
          >
            {title}
          </Text>

          {!!author && (
            <Text
              numberOfLines={1}
              style={[
                styles.author,
                {
                  color:
                    palette.muted
                }
              ]}
            >
              {author}
            </Text>
          )}
        </View>
      </View>

      {!!error ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={pagerRef}
            horizontal
            pagingEnabled
            data={pages}
            keyExtractor={(_, index) =>
              String(index)
            }
            showsHorizontalScrollIndicator={
              false
            }
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index
            })}
            onMomentumScrollEnd={(
              event
            ) => {
              const next =
                Math.round(
                  event.nativeEvent
                    .contentOffset.x /
                    Math.max(width, 1)
                );

              setPageIndex(next);
            }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.page,
                  { width }
                ]}
              >
                {item.map(
                  (paragraph) => (
                    <View
                      key={
                        paragraph.index
                      }
                      style={
                        styles.paragraphRow
                      }
                    >
                      <Text
                        style={[
                          styles.number,
                          {
                            color:
                              palette.muted
                          }
                        ]}
                      >
                        {paragraph.index +
                          1}
                      </Text>

                      <Text
                        style={{
                          flex: 1,
                          color:
                            palette.text,
                          fontSize,
                          lineHeight:
                            fontSize * 1.55
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

          <View
            style={[
              styles.controls,
              {
                backgroundColor:
                  palette.surface,
                borderTopColor:
                  palette.line
              }
            ]}
          >
            <Pressable
              onPress={() =>
                goToPage(
                  pageIndex - 1
                )
              }
              style={styles.control}
            >
              <Text
                style={styles.controlText}
              >
                ‹
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setFontSize((size) =>
                  Math.max(
                    14,
                    size - 1
                  )
                )
              }
              style={styles.control}
            >
              <Text
                style={styles.controlText}
              >
                A−
              </Text>
            </Pressable>

            <Text
              style={[
                styles.pageCount,
                {
                  color:
                    palette.muted
                }
              ]}
            >
              {pageIndex + 1} /{" "}
              {Math.max(
                pages.length,
                1
              )}
            </Text>

            <Pressable
              onPress={() =>
                setFontSize((size) =>
                  Math.min(
                    28,
                    size + 1
                  )
                )
              }
              style={styles.control}
            >
              <Text
                style={styles.controlText}
              >
                A+
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setDark(
                  (value) => !value
                )
              }
              style={styles.control}
            >
              <Text
                style={styles.controlText}
              >
                {dark ? "☀" : "☾"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                goToPage(
                  pageIndex + 1
                )
              }
              style={styles.control}
            >
              <Text
                style={styles.controlText}
              >
                ›
              </Text>
            </Pressable>
          </View>
        </>
      )}
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
    justifyContent: "center",
    padding: 28
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  titleWrap: {
    flex: 1,
    marginLeft: 14
  },
  title: {
    fontWeight: "900",
    fontSize: 17
  },
  author: {
    marginTop: 2,
    fontSize: 11
  },
  error: {
    color: BRAND.danger,
    textAlign: "center"
  },
  page: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 24
  },
  paragraphRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18
  },
  number: {
    width: 34,
    fontSize: 10,
    paddingTop: 4
  },
  controls: {
    minHeight: 64,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8
  },
  control: {
    minWidth: 42,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  controlText: {
    color: BRAND.tealDark,
    fontSize: 18,
    fontWeight: "900"
  },
  pageCount: {
    minWidth: 58,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700"
  }
});
