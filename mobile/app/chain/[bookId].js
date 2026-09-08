import {
  useEffect,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  FlatList,
  PanResponder,
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

import AppHeader from "../../components/AppHeader";

import {
  chainDownCount,
  chainEntryKey,
  chainUpCount,
  chainVoteScore,
  getDirectBookEntries,
  getMyChainVotes,
  getPublicBranches,
  getChainFeedByFilter,
  voteOnChainEntry
} from "../../services/chain";

import { BRAND } from "../../../shared/brand";

export default function BookChainScreen() {
  const params =
    useLocalSearchParams();

  const bookId =
    String(params.bookId || "");

  const title =
    String(params.title || "Book");

  const author =
    String(params.author || "");

  const filter =
    String(params.filter || "all");

  const [allEntries, setAllEntries] =
    useState([]);

  const [levels, setLevels] =
    useState([]);

  const [votes, setVotes] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [status, setStatus] =
    useState("");

  const selectedEntryRef =
    useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const feed =
          await getChainFeedByFilter(
            filter
          );

        if (!active) return;

        setAllEntries(feed);

        const firstLevel =
          getDirectBookEntries(
            feed,
            bookId
          );

        setLevels([firstLevel]);

        setVotes(
          await getMyChainVotes(
            feed
          )
        );

        selectedEntryRef.current =
          firstLevel[0] || null;
      } catch (error) {
        console.error(error);

        if (active) {
          setStatus(
            "This chain could not be loaded."
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
  }, [bookId, filter]);

  const depth = levels.length;
  const currentLevel =
    levels[depth - 1] || [];

  function goBackDepth() {
    if (levels.length <= 1) {
      router.replace("/home");
      return;
    }

    setLevels((current) =>
      current.slice(0, -1)
    );

    setStatus("");
  }

  function goDeeper(entry) {
    const branches =
      getPublicBranches(
        allEntries,
        entry
      );

    if (!branches.length) {
      setStatus(
        "End of this branch."
      );
      return;
    }

    setLevels((current) => [
      ...current,
      branches
    ]);

    selectedEntryRef.current =
      branches[0];

    setStatus("");
  }

  const panResponder =
    useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder:
          (_, gesture) =>
            Math.abs(gesture.dx) >
              18 &&
            Math.abs(gesture.dx) >
              Math.abs(gesture.dy) *
                1.2,

        onPanResponderRelease:
          (_, gesture) => {
            if (gesture.dx > 60) {
              goBackDepth();
              return;
            }

            if (
              gesture.dx < -60 &&
              selectedEntryRef.current
            ) {
              goDeeper(
                selectedEntryRef.current
              );
            }
          }
      })
    ).current;

  async function handleVote(
    entry,
    direction
  ) {
    const key =
      chainEntryKey(entry);

    try {
      const result =
        await voteOnChainEntry(
          entry,
          direction
        );

      setVotes((current) => ({
        ...current,
        [key]: result.direction
      }));

      const patch = (candidate) =>
        chainEntryKey(candidate) ===
        key
          ? {
              ...candidate,
              chainUpCount:
                result.chainUpCount,
              chainDownCount:
                result.chainDownCount,
              chainScore:
                result.chainScore
            }
          : candidate;

      setAllEntries((current) =>
        current.map(patch)
      );

      setLevels((current) =>
        current.map((level) =>
          level.map(patch)
        )
      );
    } catch (error) {
      setStatus(
        error?.message ||
        "Vote could not be updated."
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
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
      style={styles.safe}
      {...panResponder.panHandlers}
    >
      <View style={styles.backRow}>
        <Pressable
          onPress={goBackDepth}
        >
          <Text style={styles.back}>
            ‹{" "}
            {depth <= 1
              ? "Books"
              : `Level ${depth - 1}`}
          </Text>
        </Pressable>

        <Text style={styles.level}>
          LEVEL {depth}
        </Text>
      </View>

      <AppHeader
        title={title}
        subtitle={
          author
            ? `${author} · Level ${depth}`
            : `Level ${depth}`
        }
      />

      {!!status && (
        <Text style={styles.status}>
          {status}
        </Text>
      )}

      <FlatList
        data={currentLevel}
        key={`depth-${depth}`}
        keyExtractor={(item) =>
          chainEntryKey(item)
        }
        pagingEnabled
        showsVerticalScrollIndicator={
          false
        }
        onViewableItemsChanged={
          useRef(
            ({ viewableItems }) => {
              selectedEntryRef.current =
                viewableItems[0]?.item ||
                null;
            }
          ).current
        }
        viewabilityConfig={
          useRef({
            itemVisiblePercentThreshold:
              55
          }).current
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>
              No links at this level.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const key =
            chainEntryKey(item);

          const myVote =
            votes[key] || 0;

          const branches =
            getPublicBranches(
              allEntries,
              item
            );

          return (
            <View style={styles.page}>
              <View style={styles.card}>
                {!!item.paragraphPreview && (
                  <Text style={styles.quote}>
                    “{item.paragraphPreview}”
                  </Text>
                )}

                <Text style={styles.note}>
                  {item.note ||
                    "Linked note"}
                </Text>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() =>
                      handleVote(item, 1)
                    }
                    style={[
                      styles.vote,
                      myVote === 1 &&
                        styles.voteActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteText,
                        myVote === 1 &&
                          styles.voteTextActive
                      ]}
                    >
                      🔗 Link{" "}
                      {chainUpCount(item)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      handleVote(item, -1)
                    }
                    style={[
                      styles.vote,
                      myVote === -1 &&
                        styles.voteActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteText,
                        myVote === -1 &&
                          styles.voteTextActive
                      ]}
                    >
                      ⛓ Unlink{" "}
                      {chainDownCount(item)}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.score}>
                  Chain score:{" "}
                  {chainVoteScore(item)}
                </Text>

                <Pressable
                  onPress={() =>
                    goDeeper(item)
                  }
                  disabled={
                    !branches.length
                  }
                  style={[
                    styles.deeper,
                    !branches.length &&
                      styles.disabled
                  ]}
                >
                  <Text
                    style={styles.deeperText}
                  >
                    {branches.length
                      ? `Explore ${branches.length} deeper`
                      : "End of branch"}
                  </Text>
                </Pressable>

                <Text style={styles.hint}>
                  Swipe right to go back ·
                  swipe left deeper ·
                  swipe vertically between links
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      BRAND.background
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  backRow: {
    minHeight: 46,
    paddingHorizontal: 16,
    backgroundColor:
      BRAND.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between"
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  level: {
    color: BRAND.muted,
    fontWeight: "900",
    fontSize: 11
  },
  status: {
    textAlign: "center",
    padding: 8,
    color: "#6D5A16",
    backgroundColor: "#FFF8DF"
  },
  empty: {
    color: BRAND.muted
  },
  page: {
    minHeight: 620,
    padding: 18,
    justifyContent: "center"
  },
  card: {
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 24,
    padding: 24
  },
  quote: {
    color: BRAND.muted,
    fontStyle: "italic",
    lineHeight: 23
  },
  note: {
    color: BRAND.ink,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: "700",
    marginTop: 18
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24
  },
  vote: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  voteActive: {
    backgroundColor:
      BRAND.teal,
    borderColor: BRAND.teal
  },
  voteText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  voteTextActive: {
    color: "#FFFFFF"
  },
  score: {
    textAlign: "center",
    color: BRAND.muted,
    marginTop: 10
  },
  deeper: {
    backgroundColor:
      BRAND.yellow,
    minHeight: 48,
    borderRadius: 14,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  disabled: {
    opacity: 0.4
  },
  deeperText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  hint: {
    color: BRAND.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 14
  }
});
