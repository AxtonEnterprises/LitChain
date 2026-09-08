import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import { PRIMARY_NAV } from "../../shared/navigation";

const symbols = {
  discover: "◇",
  chain: "◉",
  groups: "◎",
  library: "▤"
};

export default function BottomNav({ active = "chain" }) {
  return (
    <View style={styles.wrap}>
      {PRIMARY_NAV.map((item) => {
        const selected = item.key === active;

        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (!selected) {
                router.replace(item.mobilePath);
              }
            }}
            style={styles.item}
          >
            <Text
              style={[
                styles.icon,
                selected && styles.iconActive
              ]}
            >
              {symbols[item.key] || "○"}
            </Text>

            <Text
              style={[
                styles.label,
                selected && styles.labelActive
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 9,
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
  icon: {
    fontSize: 20,
    color: "#87999c"
  },
  iconActive: {
    color: "#3bb6b1"
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    color: "#6c7e81"
  },
  labelActive: {
    color: "#162224",
    fontWeight: "900"
  }
});
