import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

const items = [
  ["chain", "Chain", "/home"],
  ["discover", "Discover", "/discover"],
  ["search", "Search", "/search"],
  ["notes", "Notes", "/notes"],
  ["profile", "Profile", "/profile"]
];

export default function BottomNav({ active = "chain" }) {
  return (
    <View style={styles.wrap}>
      {items.map(([key, label, href]) => {
        const selected = key === active;

        return (
          <Pressable
            key={key}
            onPress={() => {
              if (!selected) router.replace(href);
            }}
            style={styles.item}
          >
            <Text style={[
              styles.dot,
              selected && styles.dotActive
            ]}>
              {selected ? "●" : "○"}
            </Text>
            <Text style={[
              styles.label,
              selected && styles.labelActive
            ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 74,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#dce7e7",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  dot: {
    fontSize: 18,
    color: "#8aa0a2"
  },
  dotActive: {
    color: "#3bb6b1"
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    color: "#6c7e81"
  },
  labelActive: {
    color: "#162224",
    fontWeight: "800"
  }
});
