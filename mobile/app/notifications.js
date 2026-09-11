import {
  useCallback,
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
  useFocusEffect
} from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { BRAND } from "../../shared/brand";
import useRefreshOnAppActive from "../hooks/useRefreshOnAppActive";

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
    case "class_assignment":
      return `Class activity in ${item.groupName || "your class"}.`;
    case "grade":
    case "class_grade":
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
    case "class_assignment":
      return "▤";
    case "grade":
    case "class_grade":
      return "A";
    default:
      return "◇";
  }
}

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      setStatus("");
      setItems(await getNativeNotifications());
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  useRefreshOnAppActive(load);

  async function openItem(item) {
    try {
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
    } catch {
      // Navigation is still useful even if the read receipt fails.
    }

    const groupId = item.groupId
      ? String(item.groupId)
      : "";

    if (
      groupId &&
      ["class_assignment", "class_grade", "assignment", "grade"].includes(
        item.type
      )
    ) {
      router.push({
        pathname: "/class/[classId]",
        params: { classId: groupId }
      });
      return;
    }

    if (groupId) {
      router.push({
        pathname: "/group/[groupId]",
        params: { groupId }
      });
      return;
    }

    if (item.chainId) {
      router.push({
        pathname: "/chain/[chainId]",
        params: { chainId: String(item.chainId) }
      });
      return;
    }

    router.back();
  }

  async function markAll() {
    try {
      await markAllNativeNotificationsRead();

      setItems((current) =>
        current.map((item) => ({
          ...item,
          read: true
        }))
      );
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not mark notifications read."
      );
    }
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

        <Pressable
          disabled={!items.some((item) => !item.read)}
          onPress={markAll}
        >
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>

      {!!status && (
        <Text style={styles.status}>{status}</Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
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
  status: {
    color: BRAND.tealDark,
    backgroundColor: "#FFF8DF",
    padding: 10,
    textAlign: "center"
  },
  list: {
    padding: 14,
    paddingBottom: 100,
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
