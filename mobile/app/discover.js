import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

import { BRAND } from "../../shared/brand";

function authorName(book) {
  const raw =
    book?.authors?.[0]?.name ||
    "Unknown author";

  const parts =
    raw.split(",").map(
      (part) => part.trim()
    );

  return parts.length === 2
    ? `${parts[1]} ${parts[0]}`
    : raw;
}

function cover(book) {
  return (
    book?.formats?.[
      "image/jpeg"
    ] || ""
  );
}

export default function DiscoverScreen() {
  const [queryText, setQueryText] =
    useState("");

  const [books, setBooks] =
    useState([]);

  const [randomBook, setRandomBook] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  async function loadRandom() {
    try {
      setLoading(true);

      const page =
        1 +
        Math.floor(
          Math.random() * 20
        );

      const response =
        await fetch(
          `https://gutendex.com/books/?languages=en&page=${page}`
        );

      const data =
        await response.json();

      const results =
        Array.isArray(data.results)
          ? data.results
          : [];

      if (results.length) {
        setRandomBook(
          results[
            Math.floor(
              Math.random() *
                results.length
            )
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRandom();
  }, []);

  async function search() {
    const term =
      queryText.trim();

    if (!term) {
      setBooks([]);
      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          `https://gutendex.com/books/?languages=en&search=${encodeURIComponent(
            term
          )}`
        );

      const data =
        await response.json();

      setBooks(
        Array.isArray(data.results)
          ? data.results
          : []
      );
    } finally {
      setLoading(false);
    }
  }

  function openBook(book) {
    router.push({
      pathname:
        "/reader/[bookId]",
      params: {
        bookId:
          String(book.id),
        title:
          book.title ||
          "Book",
        author:
          authorName(book)
      }
    });
  }

  const list =
    useMemo(
      () =>
        books.map((book) => ({
          ...book,
          normalizedAuthor:
            authorName(book),
          normalizedCover:
            cover(book)
        })),
      [books]
    );

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Discover"
        subtitle="Random and search"
      />

      <View style={styles.searchRow}>
        <TextInput
          value={queryText}
          onChangeText={
            setQueryText
          }
          onSubmitEditing={search}
          placeholder="Search title or author"
          placeholderTextColor="#8B999B"
          style={styles.search}
        />

        <Pressable
          onPress={search}
          style={styles.searchButton}
        >
          <Text
            style={
              styles.searchButtonText
            }
          >
            Search
          </Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator />
        </View>
      )}

      {!queryText.trim() &&
        randomBook && (
          <View style={styles.randomWrap}>
            <Text
              style={styles.sectionTitle}
            >
              Random Read
            </Text>

            <Pressable
              onPress={() =>
                openBook(randomBook)
              }
              style={styles.randomCard}
            >
              {!!cover(randomBook) && (
                <Image
                  source={{
                    uri:
                      cover(randomBook)
                  }}
                  style={
                    styles.randomCover
                  }
                  resizeMode="contain"
                />
              )}

              <View style={styles.randomInfo}>
                <Text
                  style={
                    styles.randomTitle
                  }
                >
                  {randomBook.title}
                </Text>

                <Text
                  style={
                    styles.randomAuthor
                  }
                >
                  {authorName(
                    randomBook
                  )}
                </Text>

                <Text
                  style={styles.open}
                >
                  Read natively →
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={loadRandom}
              style={styles.another}
            >
              <Text
                style={
                  styles.anotherText
                }
              >
                Another random book
              </Text>
            </Pressable>
          </View>
        )}

      {!!queryText.trim() && (
        <FlatList
          data={list}
          keyExtractor={(item) =>
            String(item.id)
          }
          contentContainerStyle={
            styles.list
          }
          ListEmptyComponent={
            !loading ? (
              <Text
                style={styles.empty}
              >
                Search for a title or author.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                openBook(item)
              }
              style={styles.card}
            >
              {!!item.normalizedCover && (
                <Image
                  source={{
                    uri:
                      item.normalizedCover
                  }}
                  style={styles.cover}
                  resizeMode="contain"
                />
              )}

              <View style={styles.info}>
                <Text style={styles.title}>
                  {item.title}
                </Text>

                <Text
                  style={styles.author}
                >
                  {
                    item.normalizedAuthor
                  }
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <BottomNav active="discover" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: BRAND.surface
  },
  search: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 13,
    paddingHorizontal: 12,
    color: BRAND.ink,
    backgroundColor: BRAND.background
  },
  searchButton: {
    minWidth: 82,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  loader: {
    padding: 8
  },
  randomWrap: {
    flex: 1,
    padding: 18
  },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 12
  },
  randomCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  randomCover: {
    width: 100,
    height: 150
  },
  randomInfo: {
    flex: 1,
    marginLeft: 16
  },
  randomTitle: {
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  randomAuthor: {
    color: BRAND.muted,
    marginTop: 6
  },
  open: {
    color: BRAND.tealDark,
    fontWeight: "900",
    marginTop: 18
  },
  another: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  anotherText: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  list: {
    padding: 14
  },
  empty: {
    color: BRAND.muted,
    textAlign: "center",
    marginTop: 30
  },
  card: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  cover: {
    width: 72,
    height: 105
  },
  info: {
    flex: 1,
    marginLeft: 14
  },
  title: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 17
  },
  author: {
    color: BRAND.muted,
    marginTop: 5
  }
});
