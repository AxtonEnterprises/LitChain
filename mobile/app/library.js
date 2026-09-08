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

import {
  profileAvatarUrl
} from "../../shared/profileAvatars";

import {
  groupAvatarUrl
} from "../../shared/groupAvatars";

import { BRAND } from "../../shared/brand";

export default function LibraryScreen() {
  const [tab, setTab] =
    useState("timeline");

  const [bundle, setBundle] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  async function load() {
    try {
      setLoading(true);

      setBundle(
        await getNativeLibraryBundle()
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const items = useMemo(() => {
    if (!bundle) return [];

    if (tab === "timeline") {
      return bundle.timeline;
    }

    if (tab === "journal") {
      return bundle.journal;
    }

    if (tab === "friends") {
      return bundle.friends;
    }

    if (tab === "groups") {
      return bundle.groups;
    }

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
  }, [bundle, tab]);

  function openItem(item) {
    if (tab === "groups") {
      router.push({
        pathname:
          "/group/[groupId]",
        params: {
          groupId: item.id,
          name:
            item.name || "Group",
          role:
            item.membership?.role ||
            ""
        }
      });

      return;
    }

    const bookLike =
      tab === "timeline" ||
      (
        tab === "saved" &&
        item.savedType === "book"
      );

    if (bookLike) {
      router.push({
        pathname:
          "/reader/[bookId]",
        params: {
          bookId:
            String(
              item.bookId ||
              item.id
            ),
          title:
            item.title || "Book",
          author:
            item.author || ""
        }
      });
    }
  }

  const profileImage =
    profileAvatarUrl(
      bundle?.profile?.avatar
    ) ||
    bundle?.profile?.photoURL ||
    "";

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
              {profileImage ? (
                <Image
                  source={{
                    uri: profileImage
                  }}
                  style={styles.avatar}
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
                  style={styles.editHint}
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
          const friendImage =
            tab === "friends"
              ? (
                  profileAvatarUrl(
                    item.avatar
                  ) ||
                  item.photoURL ||
                  ""
                )
              : "";

          const groupImage =
            tab === "groups"
              ? groupAvatarUrl(
                  item.avatar
                )
              : "";

          return (
            <Pressable
              onPress={() =>
                openItem(item)
              }
              style={styles.card}
            >
              {!!friendImage && (
                <Image
                  source={{
                    uri: friendImage
                  }}
                  style={
                    styles.smallAvatar
                  }
                />
              )}

              {!!groupImage && (
                <Image
                  source={{
                    uri: groupImage
                  }}
                  style={
                    styles.groupAvatar
                  }
                />
              )}

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

              {tab === "groups" && (
                <Text
                  style={styles.detail}
                >
                  {item.membership
                    ?.role ||
                    (
                      item.type ===
                      "class"
                        ? "Class"
                        : "Reading Group"
                    )}
                  {" · Tap to open"}
                </Text>
              )}
            </Pressable>
          );
        }}
      />

      <BottomNav active="library" />
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
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  tabScroll: {
    maxHeight: 58,
    backgroundColor:
      BRAND.surface
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
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor:
      BRAND.teal
  },
  tabText: {
    color: BRAND.muted,
    fontWeight: "800"
  },
  tabTextActive: {
    color: "#FFFFFF"
  },
  list: {
    padding: 16
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      BRAND.surface,
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
    backgroundColor:
      BRAND.teal,
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
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12
  },
  smallAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 10
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginBottom: 10
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900"
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
  },
  empty: {
    color: BRAND.muted
  }
});
