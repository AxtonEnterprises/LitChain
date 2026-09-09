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
  View
} from "react-native";

import {
  router,
  useLocalSearchParams
} from "expo-router";

import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import ChainCard from "../../components/ChainCard";

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

import {
  reportNativeChainEntry,
  saveNativeChainEntry
} from "../../services/chainActions";

import { BRAND } from "../../../shared/brand";

export default function ChainBookScreen() {
  const params =
    useLocalSearchParams();

  const bookId =
    String(params.bookId || "");

  const title =
    String(params.title || "Book");

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

  const [drafts, setDrafts] =
    useState({});

  const [addingKey, setAddingKey] =
    useState("");

  const selectedEntryRef =
    useRef(null);

  const onViewableItemsChanged =
    useRef(
      ({ viewableItems }) => {
        selectedEntryRef.current =
          viewableItems[0]?.item ||
          null;
      }
    ).current;

  const viewabilityConfig =
    useRef({
      itemVisiblePercentThreshold: 55
    }).current;

  const depth =
    levels.length;

  const currentLevel =
    levels[depth - 1] || [];

  const goBackDepth =
    useCallback(() => {
      setStatus("");

      setLevels((current) => {
        if (current.length <= 1) {
          router.replace("/home");
          return current;
        }

        const next =
          current.slice(0, -1);

        selectedEntryRef.current =
          next[
            next.length - 1
          ]?.[0] || null;

        return next;
      });
    }, []);

  const goDeeper =
    useCallback(
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

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder:
            (_, gesture) =>
              Math.abs(
                gesture.dx
              ) > 18 &&
              Math.abs(
                gesture.dx
              ) >
                Math.abs(
                  gesture.dy
                ) *
                  1.2,

          onPanResponderRelease:
            (_, gesture) => {
              if (
                gesture.dx > 60
              ) {
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
      [
        goBackDepth,
        goDeeper
      ]
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
        setLevels([
          firstLevel
        ]);

        selectedEntryRef.current =
          firstLevel[0] ||
          null;

        setVotes(
          await getMyChainVotes(
            feed
          )
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

      setVotes(
        (current) => ({
          ...current,
          [key]:
            result.direction
        })
      );

      const patch =
        (candidate) =>
          chainEntryKey(
            candidate
          ) === key
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

      setAllEntries(
        (current) =>
          current.map(patch)
      );

      setLevels(
        (current) =>
          current.map(
            (level) =>
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
    const key =
      chainEntryKey(entry);

    const text =
      drafts[key] || "";

    try {
      setAddingKey(key);
      setStatus("");

      const created =
        await addNativeChainLink(
          entry,
          text
        );

      setAllEntries(
        (current) => [
          ...current,
          created
        ]
      );

      setDrafts(
        (current) => ({
          ...current,
          [key]: ""
        })
      );

      setStatus(
        "Your link was added to the Chain."
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not add your link."
      );
    } finally {
      setAddingKey("");
    }
  }

  async function save(entry) {
    try {
      await saveNativeChainEntry(
        entry
      );

      setStatus(
        "Saved to Library."
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not save this entry."
      );
    }
  }

  async function report(
    entry,
    options
  ) {
    try {
      await reportNativeChainEntry(
        entry,
        options
      );

      setStatus(
        "Report submitted."
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not submit report."
      );

      throw error;
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
        <Pressable
          onPress={goBackDepth}
        >
          <Text style={styles.backText}>
            ‹{" "}
            {depth <= 1
              ? "Books"
              : `Level ${
                  depth - 1
                }`}
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

          return (
            <View style={styles.page}>
              <ChainCard
                entry={item}
                myVote={
                  votes[key] || 0
                }
                upCount={
                  chainUpCount(item)
                }
                downCount={
                  chainDownCount(item)
                }
                score={
                  chainVoteScore(item)
                }
                onVote={handleVote}
                onSave={save}
                onReport={report}
                linkText={
                  drafts[key] || ""
                }
                onLinkTextChange={(
                  value
                ) =>
                  setDrafts(
                    (current) => ({
                      ...current,
                      [key]: value
                    })
                  )
                }
                onAddLink={
                  addLink
                }
                adding={
                  addingKey === key
                }
              />

              <Text style={styles.hint}>
                Swipe left deeper ·
                swipe right back ·
                swipe vertically between links
              </Text>
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
    minHeight: 42,
    paddingHorizontal: 16,
    backgroundColor:
      BRAND.surface,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor:
      BRAND.line
  },
  backText: {
    color:
      BRAND.tealDark,
    fontWeight: "900"
  },
  status: {
    textAlign: "center",
    padding: 8,
    color: "#6D5A16",
    backgroundColor:
      "#FFF8DF"
  },
  empty: {
    color:
      BRAND.muted
  },
  page: {
    minHeight: 560,
    padding: 14,
    justifyContent: "center"
  },
  hint: {
    color:
      BRAND.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 10
  }
});
