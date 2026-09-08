import {
  useEffect,
  useState
} from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { getNativeLibrary } from "../services/library";

export default function LibraryScreen() {
  const [library, setLibrary] = useState({
    reading: [],
    savedChain: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLibrary(
          await getNativeLibrary()
        );
      } catch (e) {
        console.error(e);
        setError(
          "Your Library could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = [
    ...library.reading.map((item) => ({
      ...item,
      nativeType: "reading"
    })),
    ...library.savedChain.map((item) => ({
      ...item,
      nativeType: "savedChain"
    }))
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Library"
        subtitle={`${library.reading.length} reading · ${library.savedChain.length} saved Chain`}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            `${item.nativeType}_${item.id}_${index}`
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                Your Library is empty
              </Text>
              <Text style={styles.muted}>
                Reading progress and saved Chain entries will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eyebrow}>
                {item.nativeType === "reading"
                  ? "READING"
                  : "SAVED CHAIN"}
              </Text>

              <Text style={styles.title}>
                {item.title || "Untitled"}
              </Text>

              {!!item.author && (
                <Text style={styles.author}>
                  {item.author}
                </Text>
              )}

              {item.nativeType === "reading" && (
                <Text style={styles.detail}>
                  {Math.round(
                    Number(item.percentComplete) || 0
                  )}% complete
                </Text>
              )}

              {item.nativeType === "savedChain" &&
                !!item.note && (
                <Text
                  numberOfLines={3}
                  style={styles.note}
                >
                  {item.note}
                </Text>
              )}
            </View>
          )}
        />
      )}

      <BottomNav active="library" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6fafa"
  },
  list: {
    padding: 18
  },
  center: {
    flex: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  error: {
    color: "#8f3232"
  },
  emptyTitle: {
    color: "#162224",
    fontSize: 22,
    fontWeight: "900"
  },
  muted: {
    color: "#6c7e81",
    marginTop: 8,
    textAlign: "center"
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dce7e7",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12
  },
  eyebrow: {
    color: "#287c79",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  title: {
    color: "#162224",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6
  },
  author: {
    color: "#6c7e81",
    marginTop: 4
  },
  detail: {
    color: "#287c79",
    fontWeight: "800",
    marginTop: 12
  },
  note: {
    color: "#465d60",
    lineHeight: 20,
    marginTop: 12
  }
});
