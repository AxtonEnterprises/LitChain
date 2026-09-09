import {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  router,
  useLocalSearchParams
} from "expo-router";

import BottomNav from "../../components/BottomNav";

import {
  deleteNativeJournalEntryById,
  getNativeJournalEntry,
  updateNativeJournalEntry
} from "../../services/journal";

import { BRAND } from "../../../shared/brand";

export default function JournalEntryScreen() {
  const params = useLocalSearchParams();

  const entryId =
    String(params.entryId || "");

  const [entry, setEntry] =
    useState(null);
  const [note, setNote] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [status, setStatus] =
    useState("");

  useEffect(() => {
    getNativeJournalEntry(entryId)
      .then((item) => {
        setEntry(item);
        setNote(item?.note || "");
      })
      .finally(() => setLoading(false));
  }, [entryId]);

  async function save() {
    try {
      await updateNativeJournalEntry(
        entryId,
        note
      );

      setStatus("Saved.");
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not save note."
      );
    }
  }

  async function remove() {
    try {
      await deleteNativeJournalEntryById(
        entryId
      );

      router.replace("/library");
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not delete note."
      );
    }
  }

  function readContext() {
    if (!entry?.bookId) return;

    router.push({
      pathname: "/reader/[bookId]",
      params: {
        bookId: String(entry.bookId),
        title:
          entry.title || "Book",
        author:
          entry.author || "",
        startParagraph:
          String(
            entry.paragraphIndex || 0
          )
      }
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹ Library
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Journal Note
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.bookTitle}>
          {entry?.title || "Book"}
        </Text>

        {!!entry?.author && (
          <Text style={styles.author}>
            {entry.author}
          </Text>
        )}

        <Text style={styles.paragraphLabel}>
          Paragraph ¶
          {Number(
            entry?.paragraphIndex || 0
          ) + 1}
        </Text>

        {!!entry?.paragraphPreview && (
          <View style={styles.context}>
            <Text style={styles.contextText}>
              “{entry.paragraphPreview}”
            </Text>
          </View>
        )}

        <Pressable
          onPress={readContext}
          style={styles.contextButton}
        >
          <Text
            style={styles.contextButtonText}
          >
            Read Context
          </Text>
        </Pressable>

        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          style={styles.input}
        />

        <View style={styles.actions}>
          <Pressable
            onPress={save}
            style={styles.save}
          >
            <Text style={styles.saveText}>
              Save Note
            </Text>
          </Pressable>

          <Pressable
            onPress={remove}
            style={styles.delete}
          >
            <Text style={styles.deleteText}>
              Delete
            </Text>
          </Pressable>
        </View>

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}
      </View>

      <BottomNav active="library" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  header: {
    padding: 18,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8
  },
  content: {
    flex: 1,
    padding: 18
  },
  bookTitle: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  author: {
    color: BRAND.muted,
    marginTop: 4
  },
  paragraphLabel: {
    color: BRAND.tealDark,
    fontWeight: "900",
    marginTop: 16
  },
  context: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND.teal,
    paddingLeft: 12,
    marginTop: 10
  },
  contextText: {
    color: BRAND.ink,
    fontStyle: "italic",
    lineHeight: 20
  },
  contextButton: {
    minHeight: 38,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 8
  },
  contextButtonText: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    backgroundColor: BRAND.surface,
    padding: 12,
    marginTop: 14,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  save: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  saveText: {
    color: "#FFF",
    fontWeight: "900"
  },
  delete: {
    minWidth: 100,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.danger,
    alignItems: "center",
    justifyContent: "center"
  },
  deleteText: {
    color: BRAND.danger,
    fontWeight: "900"
  },
  status: {
    color: BRAND.tealDark,
    textAlign: "center",
    marginTop: 12
  }
});
