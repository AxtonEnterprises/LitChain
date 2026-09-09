import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { router } from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

import {
  getNativeGroups
} from "../services/social";

import {
  groupAvatarUrl
} from "../../shared/groupAvatars";

import { BRAND } from "../../shared/brand";

const VIEWS = [
  ["mine", "My Groups"],
  ["classes", "My Classes"],
  ["discoverable", "Discover"]
];

export default function Groups() {
  const [bundle, setBundle] = useState({
    mine: [],
    classes: [],
    discoverable: []
  });

  const [view, setView] = useState("mine");
  const [queryText, setQueryText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setBundle(await getNativeGroups());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const source = bundle[view] || [];
    const term = queryText.trim().toLowerCase();

    if (!term) return source;

    return source.filter((group) =>
      [
        group.name,
        group.description,
        group.type
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term)
        )
    );
  }, [bundle, view, queryText]);

  useEffect(() => {
    setActiveIndex(0);
  }, [view, queryText]);

  function open(group) {
    router.push({
      pathname: "/group/[groupId]",
      params: {
        groupId: group.id,
        name: group.name || "Group",
        role: group.membership?.role || "",
        avatar: group.avatar || "",
        description: group.description || ""
      }
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Groups"
        subtitle="Swipe vertically to browse · tap to open"
      />

      <View style={styles.toolbar}>
        <View style={styles.tabs}>
          {VIEWS.map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setView(id)}
              style={[
                styles.tab,
                view === id && styles.tabActive
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  view === id &&
                    styles.tabTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setSearchOpen(true)}
          style={styles.searchToggle}
        >
          <Text style={styles.searchToggleText}>
            🔎
          </Text>
        </Pressable>
      </View>

      <View
        style={styles.viewport}
        onLayout={(event) => {
          const height = Math.floor(
            event.nativeEvent.layout.height
          );

          if (
            height > 0 &&
            height !== viewportHeight
          ) {
            setViewportHeight(height);
          }
        }}
      >
        {!!viewportHeight && (
          <FlatList
            data={groups}
            key={`${view}-${viewportHeight}`}
            keyExtractor={(item) =>
              String(item.id)
            }
            showsVerticalScrollIndicator={false}
            snapToInterval={viewportHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, index) => ({
              length: viewportHeight,
              offset: viewportHeight * index,
              index
            })}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(
                event.nativeEvent.contentOffset.y /
                  Math.max(viewportHeight, 1)
              );

              setActiveIndex(next);
            }}
            ListEmptyComponent={
              <View
                style={[
                  styles.center,
                  { height: viewportHeight }
                ]}
              >
                <Text style={styles.emptyTitle}>
                  {view === "discoverable"
                    ? "No discoverable groups"
                    : view === "classes"
                      ? "No classes yet"
                      : "No groups yet"}
                </Text>

                <Text style={styles.emptyBody}>
                  {view === "discoverable"
                    ? "Discovery data is being completed in Batch 3B."
                    : "Your memberships will appear here."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const avatar =
                groupAvatarUrl(item.avatar);

              return (
                <View
                  style={[
                    styles.page,
                    { height: viewportHeight }
                  ]}
                >
                  <Pressable
                    onPress={() => open(item)}
                    style={styles.card}
                  >
                    {!!avatar && (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.avatar}
                      />
                    )}

                    <Text style={styles.eyebrow}>
                      {item.type === "class"
                        ? "CLASS"
                        : "READING GROUP"}
                    </Text>

                    <Text style={styles.title}>
                      {item.name || "Group"}
                    </Text>

                    {!!item.description && (
                      <Text
                        numberOfLines={6}
                        style={styles.description}
                      >
                        {item.description}
                      </Text>
                    )}

                    <View style={styles.cardFooter}>
                      <Text style={styles.role}>
                        {item.membership?.role ||
                          (
                            view === "discoverable"
                              ? "Discover"
                              : "Member"
                          )}
                      </Text>

                      <Text style={styles.openHint}>
                        Tap to open ›
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            }}
          />
        )}

        {groups.length > 1 && (
          <View
            pointerEvents="none"
            style={styles.verticalDots}
          >
            {groups.slice(0, 12).map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.dot,
                  index === activeIndex &&
                    styles.dotActive
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <BottomNav active="groups" />

      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSearchOpen(false)
        }
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setSearchOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={styles.searchPopup}
          >
            <Text style={styles.searchTitle}>
              Search {
                view === "mine"
                  ? "My Groups"
                  : view === "classes"
                    ? "My Classes"
                    : "Groups"
              }
            </Text>

            <TextInput
              autoFocus
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Name or description"
              style={styles.searchInput}
            />

            <Pressable
              onPress={() =>
                setSearchOpen(false)
              }
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>
                Done
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    gap: 6
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  tabText: {
    color: BRAND.muted,
    fontWeight: "800",
    fontSize: 11
  },
  tabTextActive: {
    color: "#FFFFFF"
  },
  searchToggle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  searchToggleText: {
    fontSize: 16
  },
  viewport: {
    flex: 1,
    position: "relative"
  },
  page: {
    padding: 16,
    justifyContent: "flex-start"
  },
  card: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 24,
    padding: 24
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 20,
    marginBottom: 18
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1
  },
  title: {
    color: BRAND.ink,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8
  },
  description: {
    color: BRAND.muted,
    lineHeight: 22,
    marginTop: 12,
    fontSize: 15
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  role: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  openHint: {
    color: BRAND.muted,
    fontWeight: "800"
  },
  verticalDots: {
    position: "absolute",
    right: 5,
    top: "40%",
    gap: 5
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#C5CECF"
  },
  dotActive: {
    width: 8,
    height: 8,
    backgroundColor: BRAND.tealDark
  },
  emptyTitle: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  emptyBody: {
    color: BRAND.muted,
    textAlign: "center",
    marginTop: 8
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    paddingTop: 120,
    paddingHorizontal: 20
  },
  searchPopup: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 18
  },
  searchTitle: {
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 13,
    paddingHorizontal: 12,
    color: BRAND.ink
  },
  doneButton: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "900"
  }
});
