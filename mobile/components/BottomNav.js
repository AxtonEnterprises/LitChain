import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  MaterialCommunityIcons
} from "@expo/vector-icons";

import { router } from "expo-router";
import { PRIMARY_NAV } from "../../shared/navigation";
import { BRAND } from "../../shared/brand";

const icons = {
  discover: {
    active: "compass",
    inactive: "compass-outline"
  },
  chain: {
    active: "link-variant",
    inactive: "link-variant"
  },
  groups: {
    active: "account-group",
    inactive: "account-group-outline"
  },
  library: {
    active: "bookshelf",
    inactive: "bookshelf"
  }
};

export default function BottomNav({
  active = "chain"
}) {
  return (
    <View style={styles.wrap}>
      {PRIMARY_NAV.map((item) => {
        const selected =
          item.key === active;

        const icon =
          icons[item.key] ||
          {
            active: "circle",
            inactive: "circle-outline"
          };

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
            <MaterialCommunityIcons
              name={
                selected
                  ? icon.active
                  : icon.inactive
              }
              size={23}
              color={
                selected
                  ? BRAND.teal
                  : "#87999c"
              }
            />

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
      })}
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
    borderTopColor: BRAND.line,
    backgroundColor: BRAND.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    color: "#6c7e81"
  },
  labelActive: {
    color: BRAND.ink,
    fontWeight: "900"
  }
});
