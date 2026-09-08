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

import { BRAND } from "../../shared/brand";

const VIEWS = [
  ["mine", "My Groups"],
  ["classes", "My Classes"],
  ["discoverable", "Discover"]
];

export default function GroupsScreen() {
  const [bundle, setBundle] =
    useState({
      mine: [],
      classes: [],
      discoverable: []
    });

  const [view, setView] =
    useState("mine");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      setBundle(
        await getNativeGroups()
      );
    } catch (error) {
      console.error(error);
      setError(
        "Groups could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const source =
      bundle[view] || [];

    const term =
      search.trim().toLowerCase();

    if (!term) return source;

    return source.filter(
      (group) =>
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
  }, [bundle, view, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Groups"
        subtitle="Reading communities"
      />

      <View style={styles.tabs}>
        {VIEWS.map(
          ([id, label]) => (
            <Pressable
              key={id}
              onPress={() =>
                setView(id)
              }
              style={[
                styles.tab,
                view === id &&
                  styles.tabActive
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
          )
        )}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search groups..."
          placeholderTextColor="#8B999B"
          style={styles.search}
        />
      </View>

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
          data={groups}
          keyExtractor={(item) =>
            item.id
          }
          pagingEnabled
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            groups.length
              ? undefined
              : styles.emptyList
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text
                style={styles.emptyTitle}
              >
                No groups here yet
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      "/group/[groupId]",
                    params: {
                      groupId:
                        item.id,
                      name:
                        item.name ||
                        "Group",
                      description:
                        item.description ||
                        "",
                      type:
                        item.type ||
                        "group"
                    }
                  })
                }
                style={styles.card}
              >
                <Text
                  style={styles.eyebrow}
                >
                  {item.type === "class"
                    ? "CLASS"
                    : "READING GROUP"}
                </Text>

                <Text style={styles.title}>
                  {item.name ||
                    "Reading Group"}
                </Text>

                {!!item.description && (
                  <Text
                    style={
                      styles.description
                    }
                  >
                    {item.description}
                  </Text>
                )}

                <Text style={styles.meta}>
                  {item.membership
                    ? item.membership
                        ?.role ||
                      "Member"
                    : item.joinPolicy ===
                        "open"
                      ? "Open"
                      : item.joinPolicy ===
                          "request_to_join"
                        ? "Request to join"
                        : "Discoverable"}
                </Text>

                <View
                  style={styles.button}
                >
                  <Text
                    style={
                      styles.buttonText
                    }
                  >
                    Open natively
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        />
      )}

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      BRAND.background
  },
  tabs: {
    flexDirection: "row",
    gap: 6,
    padding: 10,
    backgroundColor:
      BRAND.surface
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center"
  },
  tabActive: {
    backgroundColor:
      BRAND.teal,
    borderColor:
      BRAND.teal
  },
  tabText: {
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  tabTextActive: {
    color: "#FFFFFF"
  },
  searchWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor:
      BRAND.surface
  },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor:
      BRAND.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: BRAND.ink
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 26
  },
  error: {
    color: BRAND.danger
  },
  emptyList: {
    flexGrow: 1
  },
  emptyTitle: {
    color: BRAND.ink,
    fontSize: 21,
    fontWeight: "900"
  },
  page: {
    minHeight: 620,
    justifyContent: "center",
    padding: 20
  },
  card: {
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 24,
    padding: 24
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },
  title: {
    color: BRAND.ink,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8
  },
  description: {
    color: BRAND.muted,
    lineHeight: 22,
    marginTop: 12
  },
  meta: {
    color: BRAND.tealDark,
    fontWeight: "800",
    marginTop: 18
  },
  button: {
    backgroundColor:
      BRAND.teal,
    borderRadius: 14,
    minHeight: 50,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900"
  }
});
