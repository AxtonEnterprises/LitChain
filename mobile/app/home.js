import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
  getPublicChainFeed,
  gutenbergCoverUrl
} from "../services/chain";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function HomeScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
    });
  }, []);

  async function load({ refresh = false } = {}) {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      setEntries(await getPublicChainFeed());
    } catch (e) {
      console.error(e);
      setError("The Chain could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const books = useMemo(
    () => buildSourceBooks(entries),
    [entries]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="The Chain" subtitle="Public literature chains" />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Loading The Chain…</Text>
        </View>
        <BottomNav active="chain" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="The Chain"
        subtitle={`${books.length} linked ${books.length === 1 ? "book" : "books"}`}
      />

      {!!error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No public chains yet</Text>
            <Text style={styles.muted}>
              Public notes linked directly to literature will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.bookPage}>
            <View style={styles.coverWrap}>
              {gutenbergCoverUrl(item) ? (
                <Image
                  source={{ uri: gutenbergCoverUrl(item) }}
                  resizeMode="contain"
                  style={styles.cover}
                />
              ) : (
                <View style={[styles.cover, styles.coverFallback]}>
                  <Text style={styles.coverFallbackText}>Lit Chain</Text>
                </View>
              )}
            </View>

            <View style={styles.bookCard}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              {!!item.author && (
                <Text style={styles.author}>{item.author}</Text>
              )}

              <Text style={styles.linkCount}>
                {item.linkCount} direct {item.linkCount === 1 ? "link" : "links"}
              </Text>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/chain/[bookId]",
                    params: {
                      bookId: item.bookId,
                      title: item.title,
                      author: item.author
                    }
                  })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.82 }
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Explore this chain
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <BottomNav active="chain" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6fafa"
  },
  center: {
    flex: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  muted: {
    marginTop: 10,
    color: "#6c7e81",
    textAlign: "center"
  },
  errorBar: {
    backgroundColor: "#fff5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#efd7d7",
    padding: 10
  },
  errorText: {
    color: "#8f3232",
    textAlign: "center"
  },
  bookPage: {
    minHeight: Math.max(SCREEN_HEIGHT - 220, 520),
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: "center"
  },
  coverWrap: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center"
  },
  cover: {
    width: "82%",
    height: "100%",
    maxHeight: 430
  },
  coverFallback: {
    borderRadius: 18,
    backgroundColor: "#eaf4f4",
    alignItems: "center",
    justifyContent: "center"
  },
  coverFallbackText: {
    color: "#3bb6b1",
    fontWeight: "900",
    fontSize: 28
  },
  bookCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dce7e7",
    borderRadius: 22,
    padding: 20,
    marginTop: 16
  },
  bookTitle: {
    color: "#162224",
    fontSize: 24,
    fontWeight: "900"
  },
  author: {
    color: "#607074",
    marginTop: 5,
    fontSize: 15
  },
  linkCount: {
    marginTop: 14,
    color: "#287c79",
    fontWeight: "800"
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#3bb6b1",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  emptyTitle: {
    color: "#162224",
    fontSize: 22,
    fontWeight: "900"
  }
});
