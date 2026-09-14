import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { onAuthStateChanged } from "firebase/auth";
import {
  SafeAreaProvider,
  SafeAreaView
} from "react-native-safe-area-context";

import AppErrorBoundary from "../components/AppErrorBoundary";
import { auth } from "../lib/firebase";
import {
  registerNativePushToken
} from "../services/pushNotifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true
  })
});

export default function RootLayout() {
  useEffect(() => {
    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            void registerNativePushToken()
              .catch((error) => {
                console.warn(
                  "Push registration failed:",
                  error?.message || error
                );
              });
          }
        }
      );

    const responseSubscription =
      Notifications
        .addNotificationResponseReceivedListener(
          () => {
            router.push("/notifications");
          }
        );

    void Notifications
      .getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          router.push("/notifications");
        }
      })
      .catch(() => {});

    return () => {
      unsubscribeAuth();
      responseSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        style="dark"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <AppErrorBoundary>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF"
          }}
          edges={["top"]}
        >
          <Stack
            screenOptions={{
              headerShown: false
            }}
          />
        </SafeAreaView>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
