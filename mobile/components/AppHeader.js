import {
  Image,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BRAND } from "../../shared/brand";

export default function AppHeader({
  title = "The Chain",
  subtitle = ""
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image
          source={{ uri: BRAND.logoHorizontal }}
          resizeMode="contain"
          style={styles.logo}
        />
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {title}
        </Text>

        {!!subtitle && (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12
  },
  brandRow: {
    minHeight: 52,
    justifyContent: "center"
  },
  logo: {
    width: 220,
    height: 48,
    alignSelf: "flex-start"
  },
  titleRow: {
    marginTop: 8
  },
  title: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 28
  },
  subtitle: {
    marginTop: 4,
    color: BRAND.muted,
    fontSize: 13
  }
});
