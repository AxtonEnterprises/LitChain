import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  router,
  useLocalSearchParams
} from "expo-router";

import { BRAND } from "../../../shared/brand";

async function readResponse(response) {
  const type =
    response.headers.get(
      "content-type"
    ) || "";

  if (type.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function extractText(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return (
    value.text ||
    value.content ||
    value.bookText ||
    value.body ||
    ""
  );
}

export default function NativeReader() {
  const params =
    useLocalSearchParams();

  const bookId =
    String(params.bookId || "");

  const title =
    String(params.title || "Book");

  const author =
    String(params.author || "");

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);

        const urls = [
          `https://litchain.org/api/book-text?id=${encodeURIComponent(
            bookId
          )}`,
          `https://litchain.org/api/book?id=${encodeURIComponent(
            bookId
          )}`
        ];

        let loaded = "";

        for (const url of urls) {
          const response =
            await fetch(url);

          if (!response.ok) {
            continue;
          }

          const value =
            await readResponse(
              response
            );

          loaded =
            extractText(value);

          if (loaded) break;
        }

        if (!loaded) {
          throw new Error(
            "No readable text was returned."
          );
        }

        if (active) {
          setText(loaded);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setError(
            "This book could not be loaded in the native reader."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [bookId]);

  const paragraphs =
    useMemo(
      () =>
        String(text)
          .split(/\n\s*\n+/)
          .map((value) =>
            value.trim()
          )
          .filter(Boolean),
      [text]
    );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <Text
          numberOfLines={2}
          style={styles.title}
        >
          {title}
        </Text>

        {!!author && (
          <Text style={styles.author}>
            {author}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={paragraphs}
          keyExtractor={(_, index) =>
            String(index)
          }
          contentContainerStyle={
            styles.content
          }
          renderItem={({
            item,
            index
          }) => (
            <View style={styles.row}>
              <Text
                style={
                  styles.paragraphNumber
                }
              >
                {index + 1}
              </Text>

              <Text style={styles.text}>
                {item}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF8"
  },
  header: {
    backgroundColor:
      BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor:
      BRAND.line,
    padding: 16
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 9
  },
  author: {
    color: BRAND.muted,
    marginTop: 3
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 26
  },
  error: {
    color: BRAND.danger,
    textAlign: "center"
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20
  },
  paragraphNumber: {
    width: 36,
    color: "#A3AEAE",
    fontSize: 11,
    paddingTop: 4
  },
  text: {
    flex: 1,
    color: "#242A2B",
    fontSize: 18,
    lineHeight: 30
  }
});
