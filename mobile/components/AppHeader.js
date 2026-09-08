import { StyleSheet, Text, View } from "react-native";

export default function AppHeader({ title = "The Chain", subtitle = "" }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Text style={styles.markText}>LC</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Lit Chain</Text>
          <Text style={styles.tagline}>Read. Connect. Continue the chain.</Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#dce7e7",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#3bb6b1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  markText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  brand: {
    color: "#162224",
    fontWeight: "900",
    fontSize: 18
  },
  tagline: {
    color: "#728487",
    fontSize: 10,
    marginTop: 1
  },
  titleRow: {
    marginTop: 12
  },
  title: {
    color: "#162224",
    fontWeight: "900",
    fontSize: 26
  },
  subtitle: {
    marginTop: 3,
    color: "#6c7e81",
    fontSize: 12
  }
});
