import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  SafeAreaView
} from "react-native-safe-area-context";

import AppErrorBoundary from "../components/AppErrorBoundary";

export default function RootLayout() {
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
