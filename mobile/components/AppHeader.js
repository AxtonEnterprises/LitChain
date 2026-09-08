import {
  Image,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BRAND } from "../../shared/brand";

export default function AppHeader({
  title = "Lit Chain",
  subtitle = ""
}) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {title}
          </Text>

          {!!subtitle && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        <Image
          source={{
            uri: BRAND.logoHorizontal
          }}
          resizeMode="contain"
          style={styles.logo}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 86,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center"
  },
  row: {
    flexDirection: "row",
    alignItems: "center"
  },
  copy: {
    flex: 1,
    paddingRight: 12
  },
  title: {
    color: BRAND.ink,
    fontSize: 27,
    fontWeight: "900"
  },
  subtitle: {
    color: BRAND.muted,
    marginTop: 4,
    fontSize: 12
  },
  logo: {
    width: 132,
    height: 50
  }
});
