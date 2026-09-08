import {
  useEffect,
  useState
} from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

import { BRAND } from "../../shared/brand";

import {
  FEATURED_PUBLIC_DOMAIN_BOOKS
} from "../../shared/discoveryCatalog";

import {
  getNativeReadingTimeline
} from "../services/reading";

function authorName(book) {
  return (
    book?.authors?.[0]?.name ||
    book?.author ||
    "Unknown author"
  );
}

function coverUrl(book) {
  return (
    book?.image ||
    book?.cover ||
    book?.formats?.[
      "image/jpeg"
    ] ||
    ""
  );
}

export default function DiscoverScreen() {
  const [queryText, setQueryText] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [randomBook, setRandomBook] =
    useState(null);

  const [timeline, setTimeline] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    getNativeReadingTimeline()
      .then(setTimeline);

    loadRandom();
  }, []);

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
        Array.isArray(
          data.results
        )
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

  async function search() {
    const term =
      queryText.trim();

    if (!term) {
      setSearchResults([]);
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

      setSearchResults(
        Array.isArray(
          data.results
        )
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
          String(
            book.bookId ||
            book.id
          ),
        title:
          book.title || "Book",
        author:
          authorName(book)
      }
    });
  }

  function BookRow({ book }) {
    const image =
      coverUrl(book);

    return (
      <Pressable
        onPress={() =>
          openBook(book)
        }
        style={styles.bookRow}
      >
        {!!image && (
          <Image
            source={{ uri: image }}
            style={styles.cover}
            resizeMode="contain"
          />
        )}

        <View style={styles.bookInfo}>
          <Text
            style={styles.bookTitle}
          >
            {book.title}
          </Text>

          <Text
            style={styles.bookAuthor}
          >
            {authorName(book)}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Discover"
        subtitle="Random, featured, search, and your reading"
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
          style={
            styles.searchButton
          }
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

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        {!!searchResults.length && (
          <View style={styles.section}>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Search Results
            </Text>

            {searchResults.map(
              (book) => (
                <BookRow
                  key={`search-${book.id}`}
                  book={book}
                />
              )
            )}
          </View>
        )}

        {!!randomBook && (
          <View style={styles.section}>
            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Random Read
              </Text>

              <Pressable
                onPress={loadRandom}
                style={
                  styles.randomButton
                }
              >
                <Text
                  style={
                    styles.randomButtonText
                  }
                >
                  🎲 Random
                </Text>
              </Pressable>
            </View>

            <BookRow
              book={randomBook}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            Featured
          </Text>

          {FEATURED_PUBLIC_DOMAIN_BOOKS.map(
            (book) => (
              <BookRow
                key={`featured-${book.id}`}
                book={book}
              />
            )
          )}
        </View>

        {!!timeline.length && (
          <View style={styles.section}>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Your Reading
            </Text>

            {timeline
              .slice(0, 5)
              .map((book) => (
                <BookRow
                  key={`reading-${book.id}`}
                  book={book}
                />
              ))}
          </View>
        )}
      </ScrollView>

      <BottomNav active="discover" />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        BRAND.background
    },
    searchRow: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      backgroundColor:
        BRAND.surface
    },
    search: {
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor: BRAND.line,
      borderRadius: 13,
      paddingHorizontal: 12
    },
    searchButton: {
      minWidth: 82,
      borderRadius: 13,
      backgroundColor:
        BRAND.teal,
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
    content: {
      padding: 14
    },
    section: {
      marginBottom: 20
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between"
    },
    sectionTitle: {
      color: BRAND.ink,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 10
    },
    randomButton: {
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor:
        BRAND.yellow,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8
    },
    randomButtonText: {
      color: BRAND.ink,
      fontWeight: "900"
    },
    bookRow: {
      backgroundColor:
        BRAND.surface,
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
    bookInfo: {
      flex: 1,
      marginLeft: 14
    },
    bookTitle: {
      color: BRAND.ink,
      fontWeight: "900",
      fontSize: 17
    },
    bookAuthor: {
      color: BRAND.muted,
      marginTop: 5
    }
  });
