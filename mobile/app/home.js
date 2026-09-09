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
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
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

function authorName(book) {
  return book?.author || book?.authors?.[0]?.name || "Unknown author";
}

function coverUrl(book) {
  return book?.image || book?.cover || book?.formats?.["image/jpeg"] || gutenbergCoverUrl(book);
}

export default function HomeScreen() {
  const [filter, setFilter] = useState("all");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [randomBook, setRandomBook] = useState(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const touchStart = useRef(null);

  useEffect(() => onAuthStateChanged(auth, user => { if (!user) router.replace("/login"); }), []);

  async function load({ refresh = false } = {}) {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      setEntries(await getChainFeedByFilter(filter));
    } catch (e) {
      console.error(e);
      setError("The Chain could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  const books = useMemo(() => buildSourceBooks(entries), [entries]);

  function openBookChain(item) {
    router.push({
      pathname: "/chain/[bookId]",
      params: {
        bookId: String(item.bookId || item.id),
        title: item.title || "Book",
        author: authorName(item),
        filter
      }
    });
  }

  function openReader(item) {
    router.push({
      pathname: "/reader/[bookId]",
      params: {
        bookId: String(item.bookId || item.id),
        title: item.title || "Book",
        author: authorName(item),
        image: coverUrl(item) || ""
      }
    });
  }

  async function searchBooks() {
    const term = queryText.trim();
    if (!term) { setSearchResults([]); return; }
    try {
      setSearching(true);
      const response = await fetch(`https://gutendex.com/books/?languages=en&search=${encodeURIComponent(term)}`);
      const data = await response.json();
      setSearchResults(Array.isArray(data.results) ? data.results.slice(0, 20) : []);
    } finally {
      setSearching(false);
    }
  }

  async function loadRandomBook() {
    try {
      setRandomLoading(true);
      const page = 1 + Math.floor(Math.random() * 20);
      const response = await fetch(`https://gutendex.com/books/?languages=en&page=${page}`);
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setRandomBook(results.length ? results[Math.floor(Math.random() * results.length)] : null);
    } finally {
      setRandomLoading(false);
    }
  }

  function handleTouchStart(event) {
    const point = event.nativeEvent;
    touchStart.current = { x: point.pageX, y: point.pageY };
  }

  function handleTouchEnd(event, item) {
    if (!touchStart.current) return;
    const point = event.nativeEvent;
    const dx = point.pageX - touchStart.current.x;
    const dy = point.pageY - touchStart.current.y;
    touchStart.current = null;
    if (dx < -65 && Math.abs(dx) > Math.abs(dy) * 1.3) openBookChain(item);
  }

  function SearchBookRow({ book }) {
    return (
      <View style={styles.searchBookRow}>
        {!!coverUrl(book) && (
          <Pressable onPress={() => openReader(book)}>
            <Image source={{ uri: coverUrl(book) }} style={styles.searchCover} resizeMode="contain" />
          </Pressable>
        )}
        <View style={styles.searchBookInfo}>
          <Text style={styles.searchBookTitle}>{book.title || "Untitled"}</Text>
          <Text style={styles.searchBookAuthor}>{authorName(book)}</Text>
          <View style={styles.searchActions}>
            <Pressable onPress={() => openReader(book)} style={styles.searchActionButton}><Text style={styles.searchActionText}>Read</Text></Pressable>
            <Pressable onPress={() => openBookChain(book)} style={styles.searchActionButton}><Text style={styles.searchActionText}>Chain</Text></Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="The Chain" subtitle={`${books.length} linked ${books.length === 1 ? "book" : "books"}`} />

      <View style={styles.actionRow}>
        <Pressable onPress={() => setShowSearch(true)} style={styles.actionButton}><Text style={styles.actionButtonText}>🔎 Search</Text></Pressable>
        <Pressable onPress={loadRandomBook} style={styles.actionButton}><Text style={styles.actionButtonText}>🎲 Random</Text></Pressable>
      </View>

      <View style={styles.filters}>
        {CHAIN_FILTERS.map(item => (
          <Pressable key={item.id} onPress={() => setFilter(item.id)} style={[styles.filter, filter === item.id && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {randomLoading && <View style={styles.randomBanner}><ActivityIndicator /><Text style={styles.randomBannerText}>Choosing a random book…</Text></View>}
      {!!randomBook && !randomLoading && (
        <View style={styles.randomBanner}>
          <Text numberOfLines={1} style={styles.randomBannerTitle}>{randomBook.title}</Text>
          <View style={styles.randomBannerActions}>
            <Pressable onPress={() => openReader(randomBook)}><Text style={styles.randomLink}>Read</Text></Pressable>
            <Pressable onPress={() => openBookChain(randomBook)}><Text style={styles.randomLink}>Chain</Text></Pressable>
            <Pressable onPress={loadRandomBook}><Text style={styles.randomLink}>Again</Text></Pressable>
          </View>
        </View>
      )}

      {loading ? <View style={styles.center}><ActivityIndicator size="large" /></View> : (
        <View style={styles.feedViewport} onLayout={event => {
          const height = Math.floor(event.nativeEvent.layout.height);
          if (height > 0 && height !== viewportHeight) setViewportHeight(height);
        }}>
          {!!viewportHeight && (
            <FlatList
              data={books}
              key={`chain-books-${viewportHeight}`}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              snapToInterval={viewportHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              getItemLayout={(_, index) => ({ length: viewportHeight, offset: viewportHeight * index, index })}
              onMomentumScrollEnd={event => setActiveBookIndex(Math.round(event.nativeEvent.contentOffset.y / Math.max(viewportHeight, 1)))}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />}
              ListEmptyComponent={<View style={[styles.center, { height: viewportHeight }]}><Text style={styles.emptyTitle}>No Chain entries</Text><Text style={styles.emptyBody}>Nothing is available for this filter yet.</Text></View>}
              renderItem={({ item }) => (
                <View style={[styles.bookPage, { height: viewportHeight }]} onTouchStart={handleTouchStart} onTouchEnd={event => handleTouchEnd(event, item)}>
                  <Pressable onPress={() => openReader(item)} style={styles.coverWrap}>
                    <Image source={{ uri: gutenbergCoverUrl(item) }} resizeMode="contain" style={styles.cover} />
                  </Pressable>
                  <View style={styles.bookCard}>
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    {!!item.author && <Text style={styles.author}>{item.author}</Text>}
                    <Text style={styles.linkCount}>{item.linkCount} direct {item.linkCount === 1 ? "link" : "links"}</Text>
                    <View style={styles.bookActions}>
                      <Pressable onPress={() => openReader(item)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Read Book</Text></Pressable>
                      <Pressable onPress={() => openBookChain(item)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Explore Chain</Text></Pressable>
                    </View>
                    <Text style={styles.swipeHint}>Tap cover to read · swipe left to enter Chain</Text>
                  </View>
                </View>
              )}
            />
          )}

          {books.length > 1 && (
            <View pointerEvents="none" style={styles.verticalDots}>
              {books.slice(0, 9).map((item, index) => <View key={item.id} style={[styles.dot, index === activeBookIndex && styles.dotActive]} />)}
            </View>
          )}
        </View>
      )}

      <BottomNav active="chain" />

      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Search Books</Text><Pressable onPress={() => setShowSearch(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
          <View style={styles.searchRow}>
            <TextInput value={queryText} onChangeText={setQueryText} onSubmitEditing={searchBooks} placeholder="Search title or author" placeholderTextColor="#8B999B" style={styles.searchInput} />
            <Pressable onPress={searchBooks} style={styles.searchButton}><Text style={styles.searchButtonText}>Search</Text></Pressable>
          </View>
          {searching ? <View style={styles.center}><ActivityIndicator size="large" /></View> : (
            <FlatList data={searchResults} keyExtractor={book => String(book.id)} contentContainerStyle={styles.searchList} ListEmptyComponent={<Text style={styles.searchEmpty}>Search by title or author.</Text>} renderItem={({ item }) => <SearchBookRow book={item} />} />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  actionRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingTop: 10, backgroundColor: BRAND.surface },
  actionButton: { flex: 1, minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: BRAND.line, alignItems: "center", justifyContent: "center" },
  actionButtonText: { color: BRAND.tealDark, fontWeight: "900" },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: BRAND.surface },
  filter: { flex: 1, minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: BRAND.line, alignItems: "center", justifyContent: "center" },
  filterActive: { backgroundColor: BRAND.teal, borderColor: BRAND.teal },
  filterText: { color: BRAND.muted, fontWeight: "800" },
  filterTextActive: { color: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  error: { color: BRAND.danger, textAlign: "center", padding: 8 },
  randomBanner: { minHeight: 48, paddingHorizontal: 16, backgroundColor: "#FFF8DF", borderBottomWidth: 1, borderBottomColor: BRAND.line, flexDirection: "row", alignItems: "center", gap: 10 },
  randomBannerText: { color: BRAND.muted },
  randomBannerTitle: { flex: 1, color: BRAND.ink, fontWeight: "900" },
  randomBannerActions: { flexDirection: "row", gap: 12 },
  randomLink: { color: BRAND.tealDark, fontWeight: "900" },
  feedViewport: { flex: 1, position: "relative" },
  emptyTitle: { color: BRAND.ink, fontSize: 22, fontWeight: "900" },
  emptyBody: { color: BRAND.muted, marginTop: 8, textAlign: "center" },
  bookPage: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, justifyContent: "flex-start" },
  coverWrap: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center" },
  cover: { width: "78%", height: "100%" },
  bookCard: { flexShrink: 0, backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.line, borderRadius: 22, padding: 16, marginTop: 8 },
  bookTitle: { color: BRAND.ink, fontSize: 22, fontWeight: "900" },
  author: { color: BRAND.muted, marginTop: 5, fontSize: 14 },
  linkCount: { color: BRAND.tealDark, marginTop: 10, fontWeight: "900" },
  bookActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: BRAND.teal, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: BRAND.teal, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: BRAND.tealDark, fontWeight: "900" },
  swipeHint: { color: BRAND.muted, textAlign: "center", fontSize: 10, marginTop: 9 },
  verticalDots: { position: "absolute", right: 5, top: "35%", gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 999, backgroundColor: "#C3CDCE" },
  dotActive: { width: 7, height: 7, backgroundColor: BRAND.tealDark },
  modalSafe: { flex: 1, backgroundColor: BRAND.background },
  modalHeader: { minHeight: 68, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: BRAND.surface, borderBottomWidth: 1, borderBottomColor: BRAND.line },
  modalTitle: { color: BRAND.ink, fontSize: 22, fontWeight: "900" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeText: { color: BRAND.ink, fontSize: 30 },
  searchRow: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: BRAND.surface },
  searchInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: BRAND.line, borderRadius: 13, paddingHorizontal: 12, color: BRAND.ink },
  searchButton: { minWidth: 84, borderRadius: 13, backgroundColor: BRAND.teal, alignItems: "center", justifyContent: "center" },
  searchButtonText: { color: "#FFFFFF", fontWeight: "900" },
  searchList: { padding: 14 },
  searchEmpty: { color: BRAND.muted, textAlign: "center", paddingTop: 40 },
  searchBookRow: { backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.line, borderRadius: 18, padding: 12, marginBottom: 10, flexDirection: "row", alignItems: "center" },
  searchCover: { width: 72, height: 104 },
  searchBookInfo: { flex: 1, marginLeft: 14 },
  searchBookTitle: { color: BRAND.ink, fontWeight: "900", fontSize: 16 },
  searchBookAuthor: { color: BRAND.muted, marginTop: 4 },
  searchActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  searchActionButton: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: BRAND.line, alignItems: "center", justifyContent: "center" },
  searchActionText: { color: BRAND.tealDark, fontWeight: "900" }
});
