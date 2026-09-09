import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, PanResponder, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import ChainCard from "../../components/ChainCard";
import { chainDownCount, chainEntryKey, chainUpCount, chainVoteScore, getDirectBookEntries, getMyChainVotes, getPublicBranches, getChainFeedByFilter, voteOnChainEntry } from "../../services/chain";
import { addNativeChainLink } from "../../services/chainLink";
import { reportNativeChainEntry, saveNativeChainEntry } from "../../services/chainActions";
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
  const [drafts, setDrafts] = useState({});
  const [addingKey, setAddingKey] = useState("");
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedEntryRef = useRef(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems[0];
    selectedEntryRef.current = first?.item || null;
    if (first?.index !== undefined && first?.index !== null) setActiveIndex(first.index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;
  const depth = levels.length;
  const currentLevel = levels[depth - 1] || [];

  useEffect(() => { setActiveIndex(0); }, [depth]);

  const goBackDepth = useCallback(() => {
    setStatus("");
    setLevels(current => {
      if (current.length <= 1) {
        router.replace("/home");
        return current;
      }
      const next = current.slice(0, -1);
      selectedEntryRef.current = next[next.length - 1]?.[0] || null;
      return next;
    });
  }, []);

  const goDeeper = useCallback(entry => {
    const branches = getPublicBranches(allEntries, entry);
    if (!branches.length) { setStatus("End of this branch."); return; }
    selectedEntryRef.current = branches[0] || null;
    setLevels(current => [...current, branches]);
    setStatus("");
  }, [allEntries]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 60) { goBackDepth(); return; }
      if (gesture.dx < -60 && selectedEntryRef.current) goDeeper(selectedEntryRef.current);
    }
  }), [goBackDepth, goDeeper]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const feed = await getChainFeedByFilter(filter);
        if (!active) return;
        const firstLevel = getDirectBookEntries(feed, bookId);
        setAllEntries(feed);
        setLevels([firstLevel]);
        selectedEntryRef.current = firstLevel[0] || null;
        setVotes(await getMyChainVotes(feed));
      } catch (e) {
        console.error(e);
        if (active) setStatus("This Chain could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookId, filter]);

  async function handleVote(entry, direction) {
    try {
      const key = chainEntryKey(entry);
      const result = await voteOnChainEntry(entry, direction);
      setVotes(current => ({ ...current, [key]: result.direction }));
      const patch = candidate => chainEntryKey(candidate) === key ? { ...candidate, chainUpCount: result.chainUpCount, chainDownCount: result.chainDownCount, chainScore: result.chainScore } : candidate;
      setAllEntries(current => current.map(patch));
      setLevels(current => current.map(level => level.map(patch)));
    } catch (e) {
      setStatus(e?.message || "Vote could not be updated.");
    }
  }

  async function addLink(entry) {
    const key = chainEntryKey(entry);
    try {
      setAddingKey(key);
      setStatus("");
      const created = await addNativeChainLink(entry, drafts[key] || "");
      setAllEntries(current => [...current, created]);
      setDrafts(current => ({ ...current, [key]: "" }));
      setStatus("Your link was added to the Chain.");
    } catch (e) {
      setStatus(e?.message || "Could not add your link.");
    } finally {
      setAddingKey("");
    }
  }

  async function save(entry) {
    try { await saveNativeChainEntry(entry); setStatus("Saved to Library."); }
    catch (e) { setStatus(e?.message || "Could not save this entry."); }
  }

  async function report(entry, options) {
    try { await reportNativeChainEntry(entry, options); setStatus("Report submitted."); }
    catch (e) { setStatus(e?.message || "Could not submit report."); throw e; }
  }

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} {...panResponder.panHandlers}>
      <AppHeader title={title} subtitle={`Level ${Math.max(depth, 1)}`} />
      <View style={styles.backRow}>
        <Pressable onPress={goBackDepth}><Text style={styles.backText}>‹ {depth <= 1 ? "Books" : `Level ${depth - 1}`}</Text></Pressable>
        <View pointerEvents="none" style={styles.depthDots}>
          {Array.from({ length: Math.max(depth, 1) }).map((_, index) => <View key={index} style={[styles.depthDot, index === depth - 1 && styles.depthDotActive]} />)}
        </View>
      </View>
      {!!status && <Text style={styles.status}>{status}</Text>}

      <View style={styles.feedViewport} onLayout={event => {
        const height = Math.floor(event.nativeEvent.layout.height);
        if (height > 0 && height !== viewportHeight) setViewportHeight(height);
      }}>
        {!!viewportHeight && (
          <FlatList
            data={currentLevel}
            key={`depth-${depth}-${viewportHeight}`}
            keyExtractor={item => chainEntryKey(item)}
            showsVerticalScrollIndicator={false}
            snapToInterval={viewportHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, index) => ({ length: viewportHeight, offset: viewportHeight * index, index })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            ListEmptyComponent={<View style={[styles.center, { height: viewportHeight }]}><Text style={styles.empty}>No links at this level.</Text></View>}
            renderItem={({ item }) => {
              const key = chainEntryKey(item);
              return (
                <View style={[styles.page, { height: viewportHeight }]}>
                  <ChainCard
                    entry={item}
                    myVote={votes[key] || 0}
                    upCount={chainUpCount(item)}
                    downCount={chainDownCount(item)}
                    score={chainVoteScore(item)}
                    onVote={handleVote}
                    onSave={save}
                    onReport={report}
                    linkText={drafts[key] || ""}
                    onLinkTextChange={value => setDrafts(current => ({ ...current, [key]: value }))}
                    onAddLink={addLink}
                    adding={addingKey === key}
                  />
                  <Text style={styles.hint}>Swipe left deeper · swipe right back</Text>
                </View>
              );
            }}
          />
        )}

        {currentLevel.length > 1 && (
          <View pointerEvents="none" style={styles.verticalDots}>
            {currentLevel.map((item, index) => <View key={chainEntryKey(item)} style={[styles.verticalDot, index === activeIndex && styles.verticalDotActive]} />)}
          </View>
        )}
      </View>

      <BottomNav active="chain" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  backRow: { minHeight: 42, paddingHorizontal: 16, backgroundColor: BRAND.surface, justifyContent: "space-between", alignItems: "center", flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BRAND.line },
  backText: { color: BRAND.tealDark, fontWeight: "900" },
  depthDots: { flexDirection: "row", gap: 6, alignItems: "center" },
  depthDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: "#C5CECF" },
  depthDotActive: { width: 9, height: 9, backgroundColor: BRAND.tealDark },
  status: { textAlign: "center", padding: 8, color: "#6D5A16", backgroundColor: "#FFF8DF" },
  empty: { color: BRAND.muted },
  feedViewport: { flex: 1, position: "relative" },
  page: { padding: 14, justifyContent: "flex-start" },
  hint: { color: BRAND.muted, fontSize: 10, textAlign: "center", marginTop: 8 },
  verticalDots: { position: "absolute", right: 5, top: "40%", gap: 5 },
  verticalDot: { width: 5, height: 5, borderRadius: 999, backgroundColor: "#C5CECF" },
  verticalDotActive: { width: 8, height: 8, backgroundColor: BRAND.tealDark }
});
