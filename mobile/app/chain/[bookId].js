import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import AppHeader from "../../components/AppHeader";
import {
  getBookLevelOne,
  getPublicChainFeed
} from "../../services/chain";

export default function BookChainScreen() {
  const params = useLocalSearchParams();
  const bookId = String(params.bookId || "");
  const title = String(params.title || "Book");
  const author = String(params.author || "");

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const feed = await getPublicChainFeed();
        if (active) setEntries(feed);
      } catch (e) {
        console.error(e);
        if (active) setError("This chain could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const levelOne = useMemo(
    () => getBookLevelOne(entries, bookId),
    [entries, bookId]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      </View>

      <AppHeader
        title={title}
        subtitle={author ? `${author} · Level 1` : "Level 1"}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Loading links…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={levelOne}
          keyExtractor={(item) => `${item.userId || "user"}_${item.id}`}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            levelOne.length ? undefined : styles.emptyContainer
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No direct links yet</Text>
              <Text style={styles.muted}>
                This book does not currently have public Level 1 links.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.notePage}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>LEVEL 1 · {index + 1}</Text>
              </View>

              <View style={styles.noteCard}>
                {!!item.paragraphPreview && (
                  <Text style={styles.quote}>
                    “{item.paragraphPreview}”
                  </Text>
                )}

                <Text style={styles.note}>
                  {item.note || "Linked note"}
                </Text>

                <View style={styles.meta}>
                  <Text style={styles.metaText}>
                    {item.reader?.displayName ||
                      item.reader?.username ||
                      item.userName ||
                      "Lit Chain reader"}
                  </Text>

                  {!!item.paragraphNumber && (
                    <Text style={styles.metaText}>
                      Paragraph {item.paragraphNumber}
                    </Text>
                  )}
                </View>

                <View style={styles.actions}>
                  <View style={styles.votePill}>
                    <Text style={styles.voteText}>
                      ▲ {Number(item.upVotes || item.upvotes || 0)}
                    </Text>
                  </View>
                  <View style={styles.votePill}>
                    <Text style={styles.voteText}>
                      ▼ {Number(item.downVotes || item.downvotes || 0)}
                    </Text>
                  </View>
                  <View style={styles.votePill}>
                    <Text style={styles.voteText}>
                      Score {Number(item.voteScore || 0)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.hint}>
                  Voting, replies, branching, sharing and save actions are the next native pass.
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6fafa"
  },
  topRow: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: "#ffffff"
  },
  back: {
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 4
  },
  backText: {
    color: "#287c79",
    fontWeight: "800",
    fontSize: 16
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
  error: {
    color: "#963939",
    fontWeight: "700"
  },
  emptyContainer: {
    flexGrow: 1
  },
  emptyTitle: {
    color: "#162224",
    fontWeight: "900",
    fontSize: 22
  },
  notePage: {
    minHeight: 620,
    padding: 18,
    justifyContent: "center"
  },
  levelBadge: {
    alignSelf: "center",
    backgroundColor: "#e4f5f4",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 14
  },
  levelBadgeText: {
    color: "#287c79",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1
  },
  noteCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dce7e7",
    borderRadius: 24,
    padding: 24
  },
  quote: {
    color: "#5f7275",
    fontStyle: "italic",
    lineHeight: 23,
    fontSize: 15
  },
  note: {
    marginTop: 18,
    color: "#162224",
    fontSize: 22,
    lineHeight: 31,
    fontWeight: "700"
  },
  meta: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5eded",
    gap: 5
  },
  metaText: {
    color: "#6c7e81",
    fontSize: 13
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  votePill: {
    borderWidth: 1,
    borderColor: "#d8e5e5",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  voteText: {
    color: "#365154",
    fontWeight: "800",
    fontSize: 12
  },
  hint: {
    marginTop: 22,
    color: "#8a999b",
    fontSize: 11,
    lineHeight: 16
  }
});
