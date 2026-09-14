import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import {
  arrayUnion,
  doc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export async function registerNativePushToken() {
  const userId = auth.currentUser?.uid;
  if (!userId) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      "default",
      {
        name: "Lit Chain",
        importance:
          Notifications.AndroidImportance.DEFAULT
      }
    );
  }

  const existing =
    await Notifications.getPermissionsAsync();

  let status = existing.status;

  if (status !== "granted") {
    const requested =
      await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      "Missing EAS project ID for push notifications."
    );
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId
    })
  ).data;

  await setDoc(
    doc(db, "users", userId),
    {
      expoPushTokens: arrayUnion(token),
      pushPlatform: Platform.OS,
      pushUpdatedAtISO:
        new Date().toISOString(),
      pushUpdatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return token;
}
