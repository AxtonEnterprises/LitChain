import {
  useCallback,
  useEffect,
  useMemo,
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
  TextInput,
  View
} from "react-native";
import {
  router,
  useLocalSearchParams
} from "expo-router";

import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";

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

import {
  addNativeChainLink
} from "../../services/chainLink";

import { BRAND } from "../../../shared/brand";

export default function ChainBookScreen() {
  const params = useLocalSearchParams();

  const bookId = String(params.bookId || "");
  const title = String(params.title || "Book");
  const filter = String(params.filter || "all");

  const [allEntries, setAllEntries] = useState([]);
  const [levels, setLevels] = useState([]);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [linkText, setLinkText] = useState("");
  const [adding, setAdding] = useState(false);

  const selectedEntryRef = useRef(null);

  // IMPORTANT: these hooks must exist on EVERY render.
  // Keeping them above the loading return fixes the native crash.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }) => {
      selectedEntryRef.current =
        viewableItems[0]?.item || null;
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55
  }).current;

  const depth = levels.length;
  const currentLevel =
    levels[depth - 1] || [];

  const goBackDepth = useCallback(() => {
    setStatus("");

    setLevels((current) => {
      if (current.length <= 1) {
        router.replace("/home");
        return current;
      }

      const next =
        current.slice(0, -1);

      selectedEntryRef.current =
        next[next.length - 1]?.[0] ||
        null;

      return next;
    });
  }, []);

  const goDeeper = useCallback(
    (entry) => {
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

      selectedEntryRef.current =
        branches[0] || null;

      setLevels((current) => [
        ...current,
        branches
      ]);

      setStatus("");
    },
    [allEntries]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder:
          (_, gesture) =>
            Math.abs(gesture.dx) > 18 &&
            Math.abs(gesture.dx) >
              Math.abs(gesture.dy) * 1.2,

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
      }),
    [goBackDepth, goDeeper]
  );

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const feed =
          await getChainFeedByFilter(
            filter
          );

        if (!active) return;

        const firstLevel =
          getDirectBookEntries(
            feed,
            bookId
          );

        setAllEntries(feed);
        setLevels([firstLevel]);

        selectedEntryRef.current =
          firstLevel[0] || null;

        setVotes(
          await getMyChainVotes(feed)
        );
      } catch (error) {
        console.error(error);

        if (active) {
          setStatus(
            "This Chain could not be loaded."
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

  async function handleVote(
    entry,
    direction
  ) {
    try {
      const key =
        chainEntryKey(entry);

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
        chainEntryKey(candidate) === key
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

  async function addLink(entry) {
    try {
      setAdding(true);
      setStatus("");

      const created =
        await addNativeChainLink(
          entry,
          linkText
        );

      setAllEntries((current) => [
        ...current,
        created
      ]);

      setLinkText("");
      setStatus(
        "Your link was added to the Chain."
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not add your link."
      );
    } finally {
      setAdding(false);
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
      <AppHeader
        title={title}
        subtitle={`Level ${Math.max(
          depth,
          1
        )}`}
      />

      <View style={styles.backRow}>
        <Pressable onPress={goBackDepth}>
          <Text style={styles.backText}>
            ‹{" "}
            {depth <= 1
              ? "Books"
              : `Level ${depth - 1}`}
          </Text>
        </Pressable>
      </View>

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
          onViewableItemsChanged
        }
        viewabilityConfig={
          viewabilityConfig
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
                      style={styles.voteText}
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
                      style={styles.voteText}
                    >
                      ⛓ Unlink{" "}
                      {chainDownCount(item)}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.score}>
                  Score{" "}
                  {chainVoteScore(item)}
                </Text>

                <TextInput
                  value={linkText}
                  onChangeText={setLinkText}
                  placeholder="Add your link to this Chain..."
                  placeholderTextColor="#8B999B"
                  multiline
                  style={styles.input}
                />

                <Pressable
                  disabled={adding}
                  onPress={() =>
                    addLink(item)
                  }
                  style={styles.addButton}
                >
                  <Text
                    style={
                      styles.addButtonText
                    }
                  >
                    {adding
                      ? "Adding..."
                      : "Add link"}
                  </Text>
                </Pressable>

                <Text style={styles.hint}>
                  Swipe left deeper ·
                  swipe right back ·
                  swipe vertically between links
                </Text>
              </View>
            </View>
          );
        }}
      />

      <BottomNav active="chain" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  backRow: {
    minHeight: 44,
    paddingHorizontal: 16,
    backgroundColor: BRAND.surface,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  backText: {
    color: BRAND.tealDark,
    fontWeight: "900"
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
    minHeight: 560,
    padding: 18,
    justifyContent: "center"
  },
  card: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 24,
    padding: 22
  },
  quote: {
    color: BRAND.muted,
    fontStyle: "italic"
  },
  note: {
    color: BRAND.ink,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "700",
    marginTop: 16
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },
  vote: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center"
  },
  voteActive: {
    backgroundColor: "#E8F7F6"
  },
  voteText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  score: {
    textAlign: "center",
    color: BRAND.muted,
    marginTop: 10
  },
  input: {
    marginTop: 18,
    minHeight: 90,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 12,
    textAlignVertical: "top",
    color: BRAND.ink
  },
  addButton: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: BRAND.yellow,
    alignItems: "center",
    justifyContent: "center"
  },
  addButtonText: {
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
