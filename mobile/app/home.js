import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../lib/firebase";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

import {
  buildSourceBooks,
  getChainFeedByFilter,
  gutenbergCoverUrl
} from "../services/chain";

import { CHAIN_FILTERS } from "../../shared/chainFilters";
import { BRAND } from "../../shared/brand";

export default function HomeScreen() {
  const [filter, setFilter] =
    useState("all");

  const [entries, setEntries] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const touchStart = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          router.replace("/login");
        }
      }
    );
  }, []);

  async function load({
    refresh = false
  } = {}) {
    try {
      refresh
        ? setRefreshing(true)
        : setLoading(true);

      setError("");

      setEntries(
        await getChainFeedByFilter(
          filter
        )
      );
    } catch (error) {
      console.error(error);
      setError(
        "The Chain could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  const books = useMemo(
    () => buildSourceBooks(entries),
    [entries]
  );

  function openBookChain(item) {
    router.push({
      pathname: "/chain/[bookId]",
      params: {
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        filter
      }
    });
  }

  function handleTouchStart(event) {
    const point =
      event.nativeEvent;

    touchStart.current = {
      x: point.pageX,
      y: point.pageY
    };
  }

  function handleTouchEnd(
    event,
    item
  ) {
    if (!touchStart.current) {
      return;
    }

    const point =
      event.nativeEvent;

    const dx =
      point.pageX -
      touchStart.current.x;

    const dy =
      point.pageY -
      touchStart.current.y;

    touchStart.current = null;

    if (
      dx < -65 &&
      Math.abs(dx) >
        Math.abs(dy) * 1.3
    ) {
      openBookChain(item);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="The Chain"
        subtitle={`${books.length} linked ${
          books.length === 1
            ? "book"
            : "books"
        }`}
      />

      <View style={styles.filters}>
        {CHAIN_FILTERS.map(
          (item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                setFilter(item.id)
              }
              style={[
                styles.filter,
                filter === item.id &&
                  styles.filterActive
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter ===
                    item.id &&
                    styles.filterTextActive
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        )}
      </View>

      {!!error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) =>
            item.id
          }
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                load({
                  refresh: true
                })
              }
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text
                style={styles.emptyTitle}
              >
                No Chain entries
              </Text>

              <Text
                style={styles.emptyBody}
              >
                Nothing is available
                for this filter yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={styles.bookPage}
              onTouchStart={
                handleTouchStart
              }
              onTouchEnd={(event) =>
                handleTouchEnd(
                  event,
                  item
                )
              }
            >
              <View
                style={styles.coverWrap}
              >
                <Image
                  source={{
                    uri:
                      gutenbergCoverUrl(
                        item
                      )
                  }}
                  resizeMode="contain"
                  style={styles.cover}
                />
              </View>

              <View
                style={styles.bookCard}
              >
                <Text
                  style={styles.bookTitle}
                >
                  {item.title}
                </Text>

                {!!item.author && (
                  <Text
                    style={styles.author}
                  >
                    {item.author}
                  </Text>
                )}

                <Text
                  style={
                    styles.linkCount
                  }
                >
                  {item.linkCount} direct{" "}
                  {item.linkCount === 1
                    ? "link"
                    : "links"}
                </Text>

                <Pressable
                  onPress={() =>
                    openBookChain(item)
                  }
                  style={
                    styles.primaryButton
                  }
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Explore this chain
                  </Text>
                </Pressable>

                <Text
                  style={styles.swipeHint}
                >
                  Swipe left to enter ·
                  swipe vertically between
                  books
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <BottomNav active="chain" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      BRAND.background
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor:
      BRAND.surface
  },
  filter: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  filterActive: {
    backgroundColor:
      BRAND.teal,
    borderColor: BRAND.teal
  },
  filterText: {
    color: BRAND.muted,
    fontWeight: "800"
  },
  filterTextActive: {
    color: "#FFFFFF"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  error: {
    color: BRAND.danger,
    textAlign: "center",
    padding: 8
  },
  emptyTitle: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  emptyBody: {
    color: BRAND.muted,
    marginTop: 8,
    textAlign: "center"
  },
  bookPage: {
    minHeight: 650,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: "center"
  },
  coverWrap: {
    flex: 1,
    minHeight: 310,
    alignItems: "center",
    justifyContent: "center"
  },
  cover: {
    width: "82%",
    height: "100%",
    maxHeight: 430
  },
  bookCard: {
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 24,
    padding: 20,
    marginTop: 14
  },
  bookTitle: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  author: {
    color: BRAND.muted,
    marginTop: 6,
    fontSize: 15
  },
  linkCount: {
    color: BRAND.tealDark,
    marginTop: 14,
    fontWeight: "900"
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor:
      BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16
  },
  swipeHint: {
    color: BRAND.muted,
    textAlign: "center",
    fontSize: 11,
    marginTop: 12
  }
});
