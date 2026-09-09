import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  useEffect,
  useState
} from "react";

import { BRAND } from "../../shared/brand";

import {
  getNativeNotifications
} from "../services/notifications";

/*
 * Startup-safe header.
 *
 * Phase 9 originally mounted a live Firestore onSnapshot listener in every
 * AppHeader. Because AppHeader is mounted immediately on /home, that made
 * notifications part of the critical launch path.
 *
 * This version intentionally uses a one-shot unread count instead. It keeps
 * the bell/count without allowing a realtime listener failure to take down
 * app startup. We can re-introduce live updates after the build is stable.
 */
export default function AppHeader({
  title = "Lit Chain",
  subtitle = "",
  showNotifications = true
}) {
  const [unread, setUnread] =
    useState(0);

  useEffect(() => {
    let active = true;

    if (!showNotifications) {
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const items =
          await getNativeNotifications(
            100
          );

        if (active) {
          setUnread(
            items.filter(
              (item) =>
                !item.read
            ).length
          );
        }
      } catch {
        if (active) {
          setUnread(0);
        }
      }
    })();

    return () => {
      active = false;
    };
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
            router.push(
              "/notifications"
            )
          }
          style={styles.bell}
        >
          <Text style={styles.bellIcon}>
            ♢
          </Text>

          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unread > 99
                  ? "99+"
                  : unread}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      <Image
        source={{
          uri:
            BRAND.logoHorizontal
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
    backgroundColor:
      BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor:
      BRAND.line,
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
    color:
      BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  subtitle: {
    color:
      BRAND.muted,
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
  bellIcon: {
    color:
      BRAND.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  badge: {
    position: "absolute",
    right: 1,
    top: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor:
      BRAND.yellow,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color:
      BRAND.ink,
    fontSize: 9,
    fontWeight: "900"
  },
  logo: {
    width: 116,
    height: 42
  }
});
