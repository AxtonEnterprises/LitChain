import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

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

  const [error, setError] =
    useState("");

  useEffect(() => {
    (async () => {
      try {
        setBundle(
          await getNativeLibraryBundle()
        );
      } catch (error) {
        console.error(error);
        setError(
          "Your Library could not be loaded."
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

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Library"
        subtitle={
          bundle?.profile
            ?.displayName ||
          bundle?.profile?.username ||
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
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error}
          </Text>
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
              <View
                style={styles.profileCard}
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
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text
                style={styles.empty}
              >
                Nothing here yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
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
                  style={styles.secondary}
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
                  % complete
                </Text>
              )}

              {tab === "journal" &&
                !!item.note && (
                <Text
                  numberOfLines={5}
                  style={styles.body}
                >
                  {item.note}
                </Text>
              )}

              {tab === "saved" &&
                !!item.note && (
                <Text
                  numberOfLines={4}
                  style={styles.body}
                >
                  {item.note}
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
                  {item.type === "class"
                    ? "Class"
                    : "Reading Group"}
                </Text>
              )}
            </View>
          )}
        />
      )}

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
    justifyContent: "center",
    paddingHorizontal: 14
  },
  tabActive: {
    backgroundColor:
      BRAND.teal,
    borderColor:
      BRAND.teal
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
  error: {
    color: BRAND.danger
  },
  empty: {
    color: BRAND.muted
  },
  list: {
    padding: 16
  },
  profileCard: {
    backgroundColor:
      BRAND.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 18,
    marginBottom: 14
  },
  profileName: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 22
  },
  profileAbout: {
    color: BRAND.muted,
    marginTop: 7,
    lineHeight: 20
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
  },
  body: {
    color: "#425759",
    marginTop: 10,
    lineHeight: 20
  }
});
