import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Search" subtitle="Native screen coming next" />
      <View style={styles.center}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.body}>
          The native navigation route is connected. We will migrate this feature from the web app in a later pass.
        </Text>
      </View>
      <BottomNav active="search" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6fafa" },
  center: {
    flex: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: "#162224",
    fontSize: 26,
    fontWeight: "900"
  },
  body: {
    marginTop: 12,
    color: "#6c7e81",
    textAlign: "center",
    lineHeight: 21
  }
});
