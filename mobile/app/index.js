import { useEffect } from "react";
import {
  StyleSheet,
  View
} from "react-native";
import { router } from "expo-router";
import {
  onAuthStateChanged
} from "firebase/auth";

import BrandMark from "../components/BrandMark";
import { auth } from "../lib/firebase";
import { BRAND } from "../../shared/brand";

export default function Index() {
  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        router.replace(
          user ? "/home" : "/login"
        );
      }
    );
  }, []);

  return (
    <View style={styles.container}>
      <BrandMark />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor:
      BRAND.background
  }
});
