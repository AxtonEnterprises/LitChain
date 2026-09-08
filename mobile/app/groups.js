import {
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

export default function GroupsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Groups"
        subtitle="Reading communities"
      />

      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.title}>
            Groups are connected
          </Text>

          <Text style={styles.body}>
            The canonical Groups data and moderation logic still live in the
            web service layer. Rather than duplicate that logic here, this
            screen is held at the platform boundary until those services move
            into /shared.
          </Text>

          <Pressable
            onPress={() =>
              Linking.openURL(
                "https://litchain.org/read/groups"
              )
            }
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Open Groups
            </Text>
          </Pressable>
        </View>
      </View>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6fafa"
  },
  center: {
    flex: 1,
    padding: 22,
    justifyContent: "center"
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dce7e7",
    borderRadius: 22,
    padding: 22
  },
  title: {
    color: "#162224",
    fontSize: 22,
    fontWeight: "900"
  },
  body: {
    color: "#6c7e81",
    lineHeight: 21,
    marginTop: 10
  },
  button: {
    marginTop: 20,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#3bb6b1",
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
