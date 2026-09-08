import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

import {
  getNativeLibraryBundle
} from "../services/library";

import {
  LIBRARY_TABS
} from "../../shared/libraryTabs";

import { BRAND } from "../../shared/brand";

export default function LibraryScreen() {
  const [tab, setTab] =
    useState("timeline");

  const [bundle, setBundle] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      try {
        setBundle(
          await getNativeLibraryBundle()
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = useMemo(() => {
    if (!bundle) return [];

    if (tab === "timeline") {
      return bundle.timeline;
    }

    if (tab === "journal") {
      return bundle.journal;
    }

    if (tab === "saved") {
      return [
        ...bundle.savedBooks.map(
          (item) => ({
            ...item,
            savedType: "book"
          })
        ),
        ...bundle.savedChain.map(
          (item) => ({
            ...item,
            savedType: "chain"
          })
        )
      ];
    }

    if (tab === "friends") {
      return bundle.friends;
    }

    return bundle.groups;
  }, [bundle, tab]);

  function openBook(item) {
    const bookId =
      item.bookId ||
      item.id;

    if (!bookId) return;

    router.push({
      pathname:
        "/reader/[bookId]",
      params: {
        bookId:
          String(bookId),
        title:
          item.title ||
          "Book",
        author:
          item.author ||
          ""
      }
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Library"
        subtitle={
          bundle?.profile
            ?.displayName ||
          bundle?.profile
            ?.username ||
          "Your Lit Chain"
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        style={styles.tabScroll}
        contentContainerStyle={
          styles.tabs
        }
      >
        {LIBRARY_TABS.map(
          (item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                setTab(item.id)
              }
              style={[
                styles.tab,
                tab === item.id &&
                  styles.tabActive
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === item.id &&
                    styles.tabTextActive
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        )}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      ) : (
        <FlatList
          data={items}
          key={tab}
          keyExtractor={(
            item,
            index
          ) =>
            `${tab}_${
              item.id || index
            }`
          }
          contentContainerStyle={
            styles.list
          }
          ListHeaderComponent={
            tab === "timeline" &&
            bundle?.profile ? (
              <Pressable
                onPress={() =>
                  router.push(
                    "/profile/edit"
                  )
                }
                style={
                  styles.profileCard
                }
              >
                {Boolean(
                  bundle.profile
                    .photoURL ||
                  bundle.profile.avatar
                ) ? (
                  <Image
                    source={{
                      uri:
                        bundle.profile
                          .photoURL ||
                        bundle.profile
                          .avatar
                    }}
                    style={
                      styles.avatar
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.avatarFallback
                    }
                  >
                    <Text
                      style={
                        styles.avatarInitial
                      }
                    >
                      {String(
                        bundle.profile
                          .displayName ||
                          bundle.profile
                            .username ||
                          "L"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}

                <View
                  style={
                    styles.profileCopy
                  }
                >
                  <Text
                    style={
                      styles.profileName
                    }
                  >
                    {bundle.profile
                      .displayName ||
                      bundle.profile
                        .username ||
                      "Lit Chain Reader"}
                  </Text>

                  {!!bundle.profile
                    .about && (
                    <Text
                      numberOfLines={2}
                      style={
                        styles.profileAbout
                      }
                    >
                      {
                        bundle.profile
                          .about
                      }
                    </Text>
                  )}

                  <Text
                    style={
                      styles.editHint
                    }
                  >
                    Tap to edit profile
                  </Text>
                </View>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>
                Nothing here yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const bookLike =
              tab === "timeline" ||
              (
                tab === "saved" &&
                item.savedType === "book"
              );

            return (
              <Pressable
                disabled={!bookLike}
                onPress={() =>
                  openBook(item)
                }
                style={styles.card}
              >
                <Text
                  style={styles.eyebrow}
                >
                  {tab.toUpperCase()}
                </Text>

                <Text style={styles.title}>
                  {item.title ||
                    item.name ||
                    item.displayName ||
                    item.username ||
                    "Lit Chain item"}
                </Text>

                {!!item.author && (
                  <Text
                    style={
                      styles.secondary
                    }
                  >
                    {item.author}
                  </Text>
                )}

                {tab === "timeline" && (
                  <Text
                    style={styles.detail}
                  >
                    {Math.round(
                      Number(
                        item.percentComplete
                      ) || 0
                    )}
                    % complete · Tap to read
                  </Text>
                )}

                {tab === "friends" && (
                  <Text
                    style={styles.detail}
                  >
                    Friend
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}

      <BottomNav active="library" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  tabScroll: {
    maxHeight: 58,
    backgroundColor: BRAND.surface
  },
  tabs: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8
  },
  tab: {
    minWidth: 92,
    minHeight: 38,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  tabActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  tabText: {
    color: BRAND.muted,
    fontWeight: "800"
  },
  tabTextActive: {
    color: "#FFFFFF"
  },
  center: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  empty: {
    color: BRAND.muted
  },
  list: {
    padding: 16
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 16,
    marginBottom: 14
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900"
  },
  profileCopy: {
    flex: 1,
    marginLeft: 14
  },
  profileName: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 21
  },
  profileAbout: {
    color: BRAND.muted,
    marginTop: 4
  },
  editHint: {
    color: BRAND.tealDark,
    marginTop: 7,
    fontWeight: "800",
    fontSize: 11
  },
  card: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  title: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6
  },
  secondary: {
    color: BRAND.muted,
    marginTop: 4
  },
  detail: {
    color: BRAND.tealDark,
    marginTop: 12,
    fontWeight: "800"
  }
});
