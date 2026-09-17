import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import ReadingTimelineCard from "../components/ReadingTimelineCard";
import { getNativeLibraryBundle, getNativeReadingTimelineVisibility, hydrateNativeReadingCovers, nativeReadingCoverUrl, setNativeReadingTimelineVisibility, syncNativePublicProfileReadingData } from "../services/library";
import { removeNativeFriend, searchNativeReadersByUsername, sendNativeFriendRequest } from "../services/librarySocial";
import { getMyNativePlatformRole } from "../services/platformModeration";
import { LIBRARY_TABS } from "../../shared/libraryTabs";
import { profileAvatarUrl } from "../../shared/profileAvatars";
import { BRAND } from "../../shared/brand";
import { auth } from "../lib/firebase";

const TIMELINE_FILTERS = [
  { id: "all", label: "All" },
  { id: "reading", label: "Reading" },
  { id: "completed", label: "Completed" },
  { id: "saved", label: "Saved" }
];

function progressPercent(item) {
  const value = Number(item?.percentComplete ?? item?.activePercent ?? 0);
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
function isCompleted(item) { return item?.cycleComplete === true || progressPercent(item) >= 100; }
function isReading(item) { const p = progressPercent(item); return p > 0 && p < 100 && item?.cycleComplete !== true; }

export default function Library() {
  const [tab, setTab] = useState("timeline");
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [timelineVisibility, setTimelineVisibility] = useState("private");
  const [privacySaving, setPrivacySaving] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [platformRole, setPlatformRole] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const [library, role, visibility] = await Promise.all([
        getNativeLibraryBundle(),
        getMyNativePlatformRole().catch(() => null),
        getNativeReadingTimelineVisibility()
      ]);
      setBundle(library);
      setPlatformRole(role);
      setTimelineVisibility(visibility);
      setLoading(false);
      syncNativePublicProfileReadingData(library, visibility).catch(() => {});
      if (library?.timeline?.length) {
        hydrateNativeReadingCovers(library.timeline).then((timeline) => {
          setBundle((current) => current ? { ...current, timeline } : current);
          syncNativePublicProfileReadingData({ ...library, timeline }, visibility).catch(() => {});
        });
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const timelineCounts = useMemo(() => {
    const timeline = bundle?.timeline || [];
    return {
      all: timeline.length,
      reading: timeline.filter(isReading).length,
      completed: timeline.filter(isCompleted).length,
      saved: (bundle?.savedBooks || []).length
    };
  }, [bundle]);

  const items = useMemo(() => {
    if (!bundle) return [];
    if (tab === "timeline") {
      if (timelineFilter === "reading") return (bundle.timeline || []).filter(isReading);
      if (timelineFilter === "completed") return (bundle.timeline || []).filter(isCompleted);
      if (timelineFilter === "saved") return (bundle.savedBooks || []).map((x) => ({ ...x, savedType: "book" }));
      return bundle.timeline || [];
    }
    if (tab === "journal") return bundle.journal || [];
    if (tab === "friends") return bundle.friends || [];
    return [
      ...(bundle.savedBooks || []).map((x) => ({ ...x, savedType: "book" })),
      ...(bundle.savedChain || []).map((x) => ({ ...x, savedType: "chain" }))
    ];
  }, [bundle, tab, timelineFilter]);

  function open(item) {
    if (tab === "friends") { router.push({ pathname: "/profile/[userId]", params: { userId: String(item.otherUserId || item.userId || item.id) } }); return; }
    if (tab === "journal") { router.push({ pathname: "/journal/[entryId]", params: { entryId: item.id } }); return; }
    if (tab === "timeline" || (tab === "saved" && item.savedType === "book")) router.push({ pathname: "/reader/[bookId]", params: { bookId: String(item.bookId || item.id), title: item.title || "Book", author: item.author || "", image: nativeReadingCoverUrl(item) } });
  }

  async function toggleTimelineVisibility() {
    try {
      setPrivacySaving(true);
      const next = timelineVisibility === "public" ? "private" : "public";
      const saved = await setNativeReadingTimelineVisibility(next);
      setTimelineVisibility(saved);
      await syncNativePublicProfileReadingData(bundle, saved).catch(() => {});
    } finally { setPrivacySaving(false); }
  }

  async function search() {
    const t = q.trim(); if (t.length < 2) { setStatus("Enter at least 2 characters."); return; }
    try { setSearching(true); setStatus(""); const r = await searchNativeReadersByUsername(t, 15); const mine = new Set((bundle?.friends || []).map((x) => String(x.otherUserId || x.id))); const self = String(bundle?.profile?.id || ""); setResults(r.filter((x) => String(x.userId || x.id) !== self && !mine.has(String(x.userId || x.id)))); }
    catch (e) { setStatus(e?.message || "Could not search."); } finally { setSearching(false); }
  }
  async function add(x) { await sendNativeFriendRequest(x.userId || x.id); setResults((r) => r.filter((y) => String(y.userId || y.id) !== String(x.userId || x.id))); setStatus("Friend request sent."); await load(); }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 80 }} size="large" /></SafeAreaView>;

  const profile = bundle?.profile || {};
  const profileImage = profileAvatarUrl(profile.avatar) || profile.photoURL || "";
  const displayName = profile.displayName || profile.username || "Reader";

  const timelineHeader = <>
    <View style={s.profileCard}>
      {profileImage ? <Image source={{ uri: profileImage }} style={s.profileImage} /> : <View style={s.profileFallback}><Text style={s.profileFallbackText}>{displayName[0]?.toUpperCase() || "R"}</Text></View>}
      <View style={s.profileBody}>
        <Text style={s.profileEyebrow}>READER PROFILE</Text>
        <Text style={s.profileName}>{displayName}</Text>
        {!!profile.username && <Text style={s.profileUsername}>@{profile.username}</Text>}
        <View style={s.profileStats}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${timelineCounts.all} books in reading history`} onPress={() => Alert.alert("Reading History", `${timelineCounts.all} ${timelineCounts.all === 1 ? "book" : "books"} in your reading timeline.`)} style={s.statPill}><Text style={s.statIcon}>📖</Text><Text style={s.statValue}>{timelineCounts.all}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${timelineCounts.completed} completed books`} onPress={() => Alert.alert("Completed Books", `${timelineCounts.completed} ${timelineCounts.completed === 1 ? "book" : "books"} completed.`)} style={s.statPill}><Text style={s.statIcon}>📕</Text><Text style={s.statValue}>{timelineCounts.completed}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${(bundle?.journal || []).length} journal entries`} onPress={() => { const count = (bundle?.journal || []).length; Alert.alert("Journal Entries", `${count} ${count === 1 ? "entry" : "entries"} in your reading journal.`); }} style={s.statPill}><Text style={s.statIcon}>📓</Text><Text style={s.statValue}>{(bundle?.journal || []).length}</Text></Pressable>
        </View>
        <View style={s.profileActions}>
          <Pressable style={s.profileAction} onPress={() => router.push("/profile/edit")}><Text style={s.profileActionText}>✎ Edit Profile</Text></Pressable>
          {platformRole?.isPlatformModerator ? <Pressable style={s.profileAction} onPress={() => router.push("/moderation")}><Text style={s.profileActionText}>♢ Moderation</Text></Pressable> : null}
          <Pressable style={s.profileAction} onPress={async () => { await signOut(auth); router.replace("/login"); }}><Text style={s.profileActionText}>Sign Out</Text></Pressable>
        </View>
        {!!profile.about && <Text style={s.about}>{profile.about}</Text>}
      </View>
    </View>

    <View style={s.timelinePanel}>
      <Text style={s.sectionEyebrow}>READING HISTORY</Text>
      <Text style={s.sectionTitle}>Reading Timeline</Text>
      <Pressable disabled={privacySaving} onPress={toggleTimelineVisibility} style={s.visibilityButton}>
        <Text style={s.visibilityText}>{timelineVisibility === "public" ? "◎ Timeline Public" : "▣ Timeline Private"}</Text>
      </Pressable>
      <Text style={s.privacyHelp}>The timeline setting controls the entire reading history. Individual books can still be kept private.</Text>
      <View style={s.filters}>{TIMELINE_FILTERS.map((filter) => <Pressable key={filter.id} onPress={() => setTimelineFilter(filter.id)} style={[s.filter, timelineFilter === filter.id && s.filterOn]}><Text style={[s.filterText, timelineFilter === filter.id && s.filterTextOn]}>{filter.label} ({timelineCounts[filter.id]})</Text></Pressable>)}</View>
    </View>
  </>;

  return <SafeAreaView style={s.safe}>
    <AppHeader title="Library" subtitle={displayName} />
    <View style={s.tabs}>{LIBRARY_TABS.map((x) => <Pressable key={x.id} onPress={() => setTab(x.id)} style={[s.tab, tab === x.id && s.tabOn]}><Text style={[s.tabText, tab === x.id && s.tabTextOn]}>{x.label}</Text></Pressable>)}</View>
    <FlatList data={items} key={`${tab}-${timelineFilter}`} keyExtractor={(x, i) => `${tab}_${x.id || x.bookId || i}`} contentContainerStyle={s.list}
      ListHeaderComponent={<>{tab === "timeline" ? timelineHeader : null}{tab === "friends" && <Pressable style={s.button} onPress={() => { setModal(true); setStatus(""); setResults([]); }}><Text style={s.buttonText}>+ Find Reader</Text></Pressable>}</>}
      ListEmptyComponent={tab === "timeline" ? <Text style={s.empty}>{timelineFilter === "saved" ? "Books you save will appear here." : timelineFilter === "completed" ? "Completed books will appear here." : "Your reading activity will appear here."}</Text> : null}
      renderItem={({ item }) => {
        if (tab === "timeline") return <ReadingTimelineCard item={item} onPress={() => open(item)} showPrivacy />;
        const fimg = tab === "friends" ? (profileAvatarUrl(item.avatar) || item.photoURL || "") : "";
        return <Pressable onPress={() => open(item)} style={s.card}>{fimg ? <Image source={{ uri: fimg }} style={s.avatar} /> : null}<Text style={s.eyebrow}>{tab.toUpperCase()}</Text><Text style={s.title}>{item.title || item.name || item.displayName || item.username || "Lit Chain item"}</Text>{item.username ? <Text style={s.muted}>@{item.username}</Text> : item.author ? <Text style={s.muted}>{item.author}</Text> : null}{tab === "friends" ? <View style={s.friendRow}><Text style={s.detail}>Tap to view profile</Text><Pressable onPress={async (e) => { e.stopPropagation?.(); await removeNativeFriend(item.otherUserId || item.id); await load(); }}><Text style={s.remove}>Remove</Text></Pressable></View> : null}</Pressable>;
      }} />
    <BottomNav active="library" />
    <Modal visible={modal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setModal(false)}>
      <KeyboardAvoidingView style={s.sheetRoot} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={s.sheetBackdrop} onPress={() => setModal(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <View><Text style={s.sheetEyebrow}>FRIENDS</Text><Text style={s.sheetTitle}>Find Reader</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close Find Reader" hitSlop={14} onPress={() => setModal(false)} style={s.sheetCloseButton}><Text style={s.sheetClose}>×</Text></Pressable>
            </View>
            <View style={s.searchRow}>
              <TextInput value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} placeholder="Search username" placeholderTextColor={BRAND.muted} style={s.input} onSubmitEditing={search} returnKeyType="search" />
              <Pressable style={s.button} onPress={search}><Text style={s.buttonText}>{searching ? "…" : "Search"}</Text></Pressable>
            </View>
            {status ? <Text style={s.status}>{status}</Text> : null}
            <FlatList data={results} keyboardShouldPersistTaps="handled" keyExtractor={(x) => String(x.userId || x.id)} contentContainerStyle={s.sheetResults} renderItem={({ item }) => { const img = profileAvatarUrl(item.avatar) || item.photoURL || ""; return <View style={s.result}>{img ? <Image source={{ uri: img }} style={s.resultAvatar} /> : <View style={s.resultFallback}><Text style={s.fallbackText}>{String(item.displayName || item.username || "R")[0].toUpperCase()}</Text></View>}<Pressable style={{ flex: 1 }} onPress={() => { setModal(false); router.push({ pathname: "/profile/[userId]", params: { userId: String(item.userId || item.id) } }); }}><Text style={s.resultName}>{item.displayName || item.username || "Reader"}</Text>{item.username ? <Text style={s.muted}>@{item.username}</Text> : null}</Pressable><Pressable style={s.add} onPress={() => add(item)}><Text style={s.buttonText}>Add</Text></Pressable></View>; }} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:BRAND.background},tabs:{flexDirection:"row",padding:6,gap:4,backgroundColor:BRAND.surface},tab:{flex:1,minHeight:36,alignItems:"center",justifyContent:"center",borderRadius:999},tabOn:{backgroundColor:BRAND.primary},tabText:{fontSize:10,fontWeight:"800",color:BRAND.muted},tabTextOn:{color:"#fff"},list:{padding:14,paddingBottom:90},
  profileCard:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:22,padding:18,marginBottom:14,flexDirection:"row",alignItems:"flex-start"},profileImage:{width:92,height:92,borderRadius:46,borderWidth:2,borderColor:BRAND.teal},profileFallback:{width:92,height:92,borderRadius:46,backgroundColor:BRAND.teal,alignItems:"center",justifyContent:"center"},profileFallbackText:{color:"#fff",fontSize:34,fontWeight:"900"},profileBody:{flex:1,marginLeft:16},profileEyebrow:{color:BRAND.tealDark,fontWeight:"900",fontSize:11,letterSpacing:1.5},profileName:{color:BRAND.ink,fontWeight:"900",fontSize:28,marginTop:4},profileUsername:{color:BRAND.muted,fontSize:16,marginTop:2},profileStats:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10},statPill:{minWidth:56,height:36,paddingHorizontal:10,borderRadius:999,borderWidth:1,borderColor:BRAND.line,backgroundColor:"#fff",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},statIcon:{fontSize:17,lineHeight:20},statValue:{color:BRAND.ink,fontWeight:"900"},profileActions:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10},profileAction:{backgroundColor:"#EDF3F2",paddingHorizontal:12,paddingVertical:9,borderRadius:999},profileActionText:{color:BRAND.ink,fontWeight:"900"},about:{color:BRAND.muted,fontSize:15,lineHeight:21,marginTop:12},
  timelinePanel:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:22,padding:18,marginBottom:4},sectionEyebrow:{color:BRAND.tealDark,fontSize:11,fontWeight:"900",letterSpacing:1.5},sectionTitle:{color:BRAND.ink,fontSize:27,fontWeight:"900",marginTop:6},visibilityButton:{alignSelf:"flex-start",backgroundColor:BRAND.primary,borderRadius:999,paddingHorizontal:16,paddingVertical:12,marginTop:16},visibilityText:{color:"#fff",fontWeight:"900",fontSize:15},privacyHelp:{color:BRAND.muted,fontSize:15,lineHeight:22,marginTop:15},filters:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:16},filter:{paddingHorizontal:11,paddingVertical:9,borderRadius:999},filterOn:{backgroundColor:BRAND.primary},filterText:{color:BRAND.muted,fontWeight:"900",fontSize:12},filterTextOn:{color:"#fff"},empty:{color:BRAND.muted,paddingVertical:20,textAlign:"center"},
  button:{minHeight:44,paddingHorizontal:14,borderRadius:12,backgroundColor:BRAND.primary,alignItems:"center",justifyContent:"center"},buttonText:{color:"#fff",fontWeight:"900"},card:{backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:18,padding:18,marginBottom:12},avatar:{width:52,height:52,borderRadius:26,marginBottom:10},groupAvatar:{width:60,height:60,borderRadius:14,marginBottom:10},eyebrow:{color:BRAND.tealDark,fontSize:10,fontWeight:"900"},title:{color:BRAND.ink,fontSize:18,fontWeight:"900",marginTop:6},muted:{color:BRAND.muted,marginTop:3},detail:{color:BRAND.tealDark,marginTop:12,fontWeight:"800"},friendRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},remove:{color:BRAND.danger,fontWeight:"900",marginTop:12},modalHead:{padding:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:BRAND.surface},close:{fontSize:30,color:BRAND.ink},searchRow:{flexDirection:"row",gap:8,padding:14},input:{flex:1,minHeight:48,borderWidth:1,borderColor:BRAND.line,borderRadius:12,paddingHorizontal:12,backgroundColor:BRAND.surface},result:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:BRAND.surface,borderWidth:1,borderColor:BRAND.line,borderRadius:14,padding:12,marginBottom:8},resultAvatar:{width:48,height:48,borderRadius:24},resultFallback:{width:48,height:48,borderRadius:24,backgroundColor:BRAND.teal,alignItems:"center",justifyContent:"center"},fallbackText:{color:"#fff",fontWeight:"900"},resultName:{fontWeight:"900",color:BRAND.ink},add:{backgroundColor:BRAND.primary,borderRadius:10,paddingHorizontal:14,paddingVertical:9},status:{paddingHorizontal:18,paddingVertical:8,color:BRAND.tealDark,textAlign:"center"},sheetRoot:{flex:1},sheetBackdrop:{flex:1,backgroundColor:"rgba(11,45,69,0.38)",justifyContent:"flex-end"},sheet:{height:"68%",minHeight:430,backgroundColor:BRAND.background,borderTopLeftRadius:26,borderTopRightRadius:26,overflow:"hidden",paddingTop:8},sheetHandle:{alignSelf:"center",width:46,height:5,borderRadius:999,backgroundColor:BRAND.line,marginBottom:8},sheetHead:{minHeight:68,paddingHorizontal:18,paddingBottom:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},sheetEyebrow:{color:BRAND.tealDark,fontSize:10,fontWeight:"900",letterSpacing:1.4},sheetTitle:{color:BRAND.ink,fontSize:24,fontWeight:"900",marginTop:2},sheetCloseButton:{width:44,height:44,borderRadius:22,backgroundColor:BRAND.surface,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:BRAND.line},sheetClose:{fontSize:30,lineHeight:32,color:BRAND.ink,fontWeight:"500",marginTop:-2},sheetResults:{paddingHorizontal:14,paddingTop:4,paddingBottom:28}
});
