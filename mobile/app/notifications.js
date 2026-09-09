import {
  useCallback,
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

import { router } from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { BRAND } from "../../shared/brand";

import {
  getNativeNotifications,
  markAllNativeNotificationsRead,
  markNativeNotificationRead
} from "../services/notifications";

function notificationTitle(item) {
  if (item.message) return item.message;

  const actor =
    item.actorName ||
    item.actorUsername ||
    "A reader";

  switch (item.type) {
    case "friend_request":
      return `${actor} sent you a friend request.`;
    case "group_invite":
      return `${actor} invited you to a group.`;
    case "forum_reply":
      return `${actor} replied in ${item.groupName || "a group"}.`;
    case "chain_reply":
      return `${actor} replied to your Chain entry.`;
    case "assignment":
      return `New assignment in ${item.groupName || "your class"}.`;
    case "grade":
      return `A grade was updated in ${item.groupName || "your class"}.`;
    default:
      return "You have a new Lit Chain notification.";
  }
}

function glyph(type) {
  switch (type) {
    case "friend_request":
      return "+";
    case "group_invite":
      return "◎";
    case "forum_reply":
    case "chain_reply":
      return "↩";
    case "assignment":
      return "▤";
    case "grade":
      return "A";
    default:
      return "◇";
  }
}

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await getNativeNotifications());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openItem(item) {
    if (!item.read) {
      await markNativeNotificationRead(item.id);

      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, read: true }
            : candidate
        )
      );
    }

    if (item.groupId) {
      router.push({
        pathname: "/group/[groupId]",
        params: {
          groupId: String(item.groupId)
        }
      });
      return;
    }

    router.back();
  }

  async function markAll() {
    await markAllNativeNotificationsRead();

    setItems((current) =>
      current.map((item) => ({
        ...item,
        read: true
      }))
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Notifications"
        showNotifications={false}
      />

      <View style={styles.toolbar}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Pressable onPress={markAll}>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyGlyph}>✓</Text>
              <Text style={styles.empty}>
                You're all caught up.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openItem(item)}
              style={[
                styles.card,
                !item.read && styles.unread
              ]}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.iconGlyph}>
                  {glyph(item.type)}
                </Text>
              </View>

              <View style={styles.copy}>
                <Text
                  style={[
                    styles.message,
                    !item.read && styles.messageUnread
                  ]}
                >
                  {notificationTitle(item)}
                </Text>

                {!!item.createdAtISO && (
                  <Text style={styles.time}>
                    {new Date(item.createdAtISO).toLocaleString()}
                  </Text>
                )}
              </View>

              {!item.read && <View style={styles.dot} />}
            </Pressable>
          )}
        />
      )}

      <BottomNav active="" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  toolbar: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    backgroundColor: BRAND.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  markAll: {
    color: BRAND.tealDark,
    fontWeight: "800",
    fontSize: 12
  },
  list: {
    padding: 14,
    flexGrow: 1
  },
  center: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  emptyGlyph: {
    fontSize: 38,
    color: BRAND.muted,
    fontWeight: "900"
  },
  empty: {
    color: BRAND.muted,
    marginTop: 10
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 13,
    marginBottom: 10
  },
  unread: {
    borderColor: BRAND.teal,
    backgroundColor: "#F0FAF9"
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F7F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  iconGlyph: {
    color: BRAND.tealDark,
    fontSize: 20,
    fontWeight: "900"
  },
  copy: {
    flex: 1
  },
  message: {
    color: BRAND.ink,
    lineHeight: 19
  },
  messageUnread: {
    fontWeight: "900"
  },
  time: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 4
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BRAND.yellow,
    marginLeft: 8
  }
});
