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
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import { BRAND } from "../../../shared/brand";

export default function GroupPostScreen() {
  const params =
    useLocalSearchParams();

  const groupId =
    String(params.groupId || "");

  const postId =
    String(params.postId || "");

  const title =
    String(
      params.title || "Discussion"
    );

  const body =
    String(params.body || "");

  const [replies, setReplies] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      try {
        const candidates = [
          [
            "groups",
            groupId,
            "forumPosts",
            postId,
            "replies"
          ],
          [
            "groups",
            groupId,
            "forumPosts",
            postId,
            "comments"
          ]
        ];

        for (const path of candidates) {
          try {
            const snapshot =
              await getDocs(
                collection(
                  db,
                  ...path
                )
              );

            if (!snapshot.empty) {
              setReplies(
                snapshot.docs.map(
                  (item) => ({
                    id: item.id,
                    ...item.data()
                  })
                )
              );
              break;
            }
          } catch {
            // Try the next known reply collection shape.
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, postId]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <Text style={styles.title}>
          {title}
        </Text>

        {!!body && (
          <Text style={styles.body}>
            {body}
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
          data={replies}
          keyExtractor={(item) =>
            item.id
          }
          contentContainerStyle={
            styles.list
          }
          ListHeaderComponent={
            <Text
              style={styles.section}
            >
              Replies
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.muted}>
              No replies yet.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.reply}>
              <Text style={styles.replyText}>
                {item.body ||
                  item.text ||
                  item.reply ||
                  "Reply"}
              </Text>
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
    backgroundColor: BRAND.background
  },
  header: {
    backgroundColor: BRAND.surface,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12
  },
  body: {
    color: BRAND.muted,
    lineHeight: 21,
    marginTop: 10
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    padding: 18
  },
  section: {
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12
  },
  muted: {
    color: BRAND.muted
  },
  reply: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10
  },
  replyText: {
    color: BRAND.ink,
    lineHeight: 20
  }
});
