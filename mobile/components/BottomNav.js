import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { router } from "expo-router";
import { PRIMARY_NAV } from "../../shared/navigation";
import { BRAND } from "../../shared/brand";
import LitIcon from "./LitIcon";

export default function BottomNav({
  active = "chain"
}) {
  return (
    <View style={styles.wrap}>
      {PRIMARY_NAV.map((item) => {
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
            style={[
              styles.item,
              selected &&
                styles.itemActive
            ]}
          >
            <LitIcon
              name={item.key}
              active={selected}
              size={24}
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

const styles =
  StyleSheet.create({
    wrap: {
      minHeight: 72,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: BRAND.line,
      backgroundColor:
        BRAND.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-around"
    },
    item: {
      flex: 1,
      maxWidth: 96,
      minHeight: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center"
    },
    itemActive: {
      backgroundColor:
        "#EEF7F7"
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
