import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { router } from "expo-router";

import {
  PRIMARY_NAV
} from "../../shared/navigation";

import {
  BRAND
} from "../../shared/brand";

/*
 * Startup-safe bottom navigation.
 *
 * Keep the navigation icon dependency out of the critical launch path until
 * the Phase 9 crash is isolated. The rest of Phase 9 can continue to use
 * @expo/vector-icons on screens that are opened later.
 */
const symbols = {
  discover: "◇",
  chain: "∞",
  groups: "◎",
  library: "▤"
};

export default function BottomNav({
  active = "chain"
}) {
  return (
    <View style={styles.wrap}>
      {PRIMARY_NAV.map(
        (item) => {
          const selected =
            item.key === active;

          return (
            <Pressable
              key={item.key}
              onPress={() => {
                if (!selected) {
                  router.replace(
                    item.mobilePath
                  );
                }
              }}
              style={styles.item}
            >
              <Text
                style={[
                  styles.icon,
                  selected &&
                    styles.iconActive
                ]}
              >
                {symbols[
                  item.key
                ] || "○"}
              </Text>

              <Text
                style={[
                  styles.label,
                  selected &&
                    styles.labelActive
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 70,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor:
      BRAND.line,
    backgroundColor:
      BRAND.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-around"
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    fontSize: 21,
    color: "#87999c"
  },
  iconActive: {
    color:
      BRAND.teal
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    color: "#6c7e81"
  },
  labelActive: {
    color:
      BRAND.ink,
    fontWeight: "900"
  }
});
