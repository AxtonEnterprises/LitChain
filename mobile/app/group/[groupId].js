import {
  useEffect,
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

import {
  getNativeGroupForum
} from "../../services/social";

import { BRAND } from "../../../shared/brand";

export default function NativeGroupScreen() {
  const params =
    useLocalSearchParams();

  const groupId =
    String(params.groupId || "");

  const name =
    String(params.name || "Group");

  const description =
    String(
      params.description || ""
    );

  const [posts, setPosts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      try {
        setPosts(
          await getNativeGroupForum(
            groupId
          )
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.replace("/groups")
          }
        >
          <Text style={styles.back}>
            ‹ Groups
          </Text>
        </Pressable>

        <Text style={styles.title}>
          {name}
        </Text>

        {!!description && (
          <Text
            style={styles.description}
          >
            {description}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) =>
            item.id
          }
          contentContainerStyle={
            styles.list
          }
          ListHeaderComponent={
            <Text
              style={styles.sectionTitle}
            >
              Discussions
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.muted}>
              No discussions are visible
              here yet.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text
                style={styles.postTitle}
              >
                {item.title ||
                  "Discussion"}
              </Text>

              {!!item.body && (
                <Text
                  numberOfLines={6}
                  style={styles.body}
                >
                  {item.body}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      BRAND.background
  },
  header: {
    backgroundColor:
      BRAND.surface,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor:
      BRAND.line
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10
  },
  description: {
    color: BRAND.muted,
    marginTop: 6,
    lineHeight: 20
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    padding: 18
  },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 12
  },
  muted: {
    color: BRAND.muted
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
  postTitle: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  body: {
    color: BRAND.muted,
    marginTop: 8,
    lineHeight: 20
  }
});
