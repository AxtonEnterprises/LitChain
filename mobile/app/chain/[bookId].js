import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
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

import AppHeader from "../../components/AppHeader";

import {
  chainDownCount,
  chainEntryKey,
  chainUpCount,
  chainVoteScore,
  getDirectBookEntries,
  getMyChainVotes,
  getPublicBranches,
  getPublicChainFeed,
  voteOnChainEntry
} from "../../services/chain";

export default function BookChainScreen() {
  const params = useLocalSearchParams();

  const bookId = String(
    params.bookId || ""
  );

  const title = String(
    params.title || "Book"
  );

  const author = String(
    params.author || ""
  );

  const [allEntries, setAllEntries] = useState([]);
  const [levels, setLevels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votes, setVotes] = useState({});
  const [voteLoading, setVoteLoading] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const touchStart = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const feed = await getPublicChainFeed();

        if (!active) return;

        setAllEntries(feed);

        const firstLevel =
          getDirectBookEntries(
            feed,
            bookId
          );

        setLevels([firstLevel]);

        setVotes(
          await getMyChainVotes(feed)
        );
      } catch (error) {
        console.error(error);

        if (active) {
          setStatus(
            "This chain could not be loaded."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [bookId]);

  const depth = levels.length;

  const currentLevel =
    levels[depth - 1] || [];

  const currentEntry =
    currentLevel[currentIndex] || null;

  const branchCount = useMemo(
    () =>
      currentEntry
        ? getPublicBranches(
            allEntries,
            currentEntry
          ).length
        : 0,
    [allEntries, currentEntry]
  );

  function goDeeper(entry) {
    const branches =
      getPublicBranches(
        allEntries,
        entry
      );

    if (!branches.length) {
      setStatus(
        "No further public links from this note yet."
      );
      return;
    }

    setLevels((current) => [
      ...current,
      branches
    ]);

    setCurrentIndex(0);
    setStatus("");
  }

  function goBackDepth() {
    if (levels.length <= 1) {
      router.back();
      return;
    }

    setLevels((current) =>
      current.slice(0, -1)
    );

    setCurrentIndex(0);
    setStatus("");
  }

  function handleTouchStart(event) {
    const point = event.nativeEvent;

    touchStart.current = {
      x: point.pageX,
      y: point.pageY
    };
  }

  function handleTouchEnd(event, entry) {
    if (!touchStart.current) return;

    const point = event.nativeEvent;

    const dx =
      point.pageX -
      touchStart.current.x;

    const dy =
      point.pageY -
      touchStart.current.y;

    touchStart.current = null;

    if (
      Math.abs(dx) <
      Math.abs(dy) * 1.3
    ) {
      return;
    }

    if (dx < -60) {
      goDeeper(entry);
    } else if (dx > 60) {
      goBackDepth();
    }
  }

  async function handleVote(entry, direction) {
    const key = chainEntryKey(entry);

    try {
      setVoteLoading(key);
      setStatus("");

      const result =
        await voteOnChainEntry(
          entry,
          direction
        );

      setVotes((current) => ({
        ...current,
        [key]: result.direction
      }));

      setAllEntries((current) =>
        current.map((candidate) =>
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
            : candidate
        )
      );

      setLevels((currentLevels) =>
        currentLevels.map((level) =>
          level.map((candidate) =>
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
              : candidate
          )
        )
      );
    } catch (error) {
      setStatus(
        error?.message ||
        "The Chain vote could not be updated."
      );
    } finally {
      setVoteLoading("");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>
            Loading links…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backRow}>
        <Pressable onPress={goBackDepth}>
          <Text style={styles.backText}>
            ‹ {depth > 1
              ? `Level ${depth - 1}`
              : "Books"}
          </Text>
        </Pressable>

        <Text style={styles.depthText}>
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
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {status}
          </Text>
        </View>
      )}

      <FlatList
        key={`level-${depth}`}
        data={currentLevel}
        keyExtractor={(item) =>
          chainEntryKey(item)
        }
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const height =
            event.nativeEvent.layoutMeasurement
              .height || 1;

          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.y /
            height
          );

          setCurrentIndex(
            Math.max(
              0,
              Math.min(
                nextIndex,
                currentLevel.length - 1
              )
            )
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>
              No links yet
            </Text>
            <Text style={styles.muted}>
              This level has no public links.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const key = chainEntryKey(item);
          const myVote = votes[key] || 0;
          const branches =
            getPublicBranches(
              allEntries,
              item
            );

          return (
            <View
              style={styles.notePage}
              onTouchStart={handleTouchStart}
              onTouchEnd={(event) =>
                handleTouchEnd(
                  event,
                  item
                )
              }
            >
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  LEVEL {depth} · {index + 1} /{" "}
                  {currentLevel.length}
                </Text>
              </View>

              <View style={styles.noteCard}>
                {!!item.paragraphPreview && (
                  <Text style={styles.quote}>
                    “{item.paragraphPreview}”
                  </Text>
                )}

                <Text style={styles.note}>
                  {item.note ||
                    "Linked note"}
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
                      Paragraph{" "}
                      {item.paragraphNumber}
                    </Text>
                  )}
                </View>

                <View style={styles.actions}>
                  <Pressable
                    disabled={
                      voteLoading === key
                    }
                    onPress={() =>
                      handleVote(item, 1)
                    }
                    style={[
                      styles.voteButton,
                      myVote === 1 &&
                        styles.voteSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteText,
                        myVote === 1 &&
                          styles.voteSelectedText
                      ]}
                    >
                      🔗 Link{" "}
                      {chainUpCount(item)}
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={
                      voteLoading === key
                    }
                    onPress={() =>
                      handleVote(item, -1)
                    }
                    style={[
                      styles.voteButton,
                      myVote === -1 &&
                        styles.voteSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteText,
                        myVote === -1 &&
                          styles.voteSelectedText
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
                  disabled={!branches.length}
                  onPress={() =>
                    goDeeper(item)
                  }
                  style={[
                    styles.branchButton,
                    !branches.length &&
                      styles.branchButtonDisabled
                  ]}
                >
                  <Text style={styles.branchButtonText}>
                    {branches.length
                      ? `Explore ${branches.length} deeper ${
                          branches.length === 1
                            ? "link"
                            : "links"
                        } →`
                      : "End of this branch"}
                  </Text>
                </Pressable>

                <Text style={styles.swipeHint}>
                  Swipe left deeper · Swipe right back ·
                  Swipe up/down between links
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
  backRow: {
    minHeight: 46,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backText: {
    color: "#287c79",
    fontWeight: "900"
  },
  depthText: {
    color: "#829194",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },
  statusBar: {
    backgroundColor: "#fff8df",
    padding: 9
  },
  statusText: {
    textAlign: "center",
    color: "#6d5a16",
    fontSize: 12
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
    gap: 10
  },
  voteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cddddd",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center"
  },
  voteSelected: {
    backgroundColor: "#3bb6b1",
    borderColor: "#3bb6b1"
  },
  voteText: {
    color: "#365154",
    fontWeight: "900"
  },
  voteSelectedText: {
    color: "#ffffff"
  },
  score: {
    textAlign: "center",
    color: "#718285",
    marginTop: 10,
    fontSize: 12
  },
  branchButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#FFC00E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  branchButtonDisabled: {
    opacity: 0.45
  },
  branchButtonText: {
    color: "#162224",
    fontWeight: "900"
  },
  swipeHint: {
    marginTop: 14,
    textAlign: "center",
    color: "#8b9a9c",
    fontSize: 11
  }
});
