import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  MaterialCommunityIcons
} from "@expo/vector-icons";

import {
  router
} from "expo-router";

import {
  useEffect,
  useState
} from "react";

import { BRAND } from "../../shared/brand";

import {
  subscribeToNativeUnreadNotifications
} from "../services/notifications";

export default function AppHeader({
  title = "Lit Chain",
  subtitle = "",
  showNotifications = true
}) {
  const [unread, setUnread] =
    useState(0);

  useEffect(() => {
    if (!showNotifications) {
      return () => {};
    }

    return subscribeToNativeUnreadNotifications(
      setUnread
    );
  }, [showNotifications]);

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </Text>

        {!!subtitle && (
          <Text
            numberOfLines={1}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {showNotifications && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            unread
              ? `${unread} unread notifications`
              : "Notifications"
          }
          onPress={() =>
            router.push("/notifications")
          }
          style={styles.bell}
        >
          <MaterialCommunityIcons
            name={
              unread
                ? "bell"
                : "bell-outline"
            }
            size={24}
            color={BRAND.ink}
          />

          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      <Image
        source={{
          uri: BRAND.logoHorizontal
        }}
        resizeMode="contain"
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center"
  },
  copy: {
    flex: 1,
    paddingRight: 8
  },
  title: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  subtitle: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 2
  },
  bell: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4
  },
  badge: {
    position: "absolute",
    right: 1,
    top: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: BRAND.yellow,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color: BRAND.ink,
    fontSize: 9,
    fontWeight: "900"
  },
  logo: {
    width: 116,
    height: 42
  }
});
