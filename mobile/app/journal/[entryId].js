import {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
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
import LitIcon from "../../components/LitIcon";

import {
  deleteNativeJournalEntryById,
  getNativeJournalEntry,
  setNativeJournalVisibility,
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
  const [visibility, setVisibility] =
    useState("private");
  const [loading, setLoading] =
    useState(true);
  const [status, setStatus] =
    useState("");

  useEffect(() => {
    getNativeJournalEntry(entryId)
      .then((item) => {
        setEntry(item);
        setNote(item?.note || "");
        setVisibility(
          item?.visibility === "public"
            ? "public"
            : "private"
        );
      })
      .finally(() => setLoading(false));
  }, [entryId]);

  async function save() {
    try {
      await updateNativeJournalEntry(
        entryId,
        note
      );

      await setNativeJournalVisibility(
        entryId,
        visibility
      );

      setEntry((current) => ({
        ...current,
        note,
        visibility
      }));

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
        bookId:
          String(entry.bookId),
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

  function addLink() {
    if (!entry?.bookId) return;

    router.push({
      pathname: "/chain/[bookId]",
      params: {
        bookId:
          String(entry.bookId),
        title:
          entry.title || "Book",
        author:
          entry.author || "",
        filter: "all"
      }
    });
  }

  async function shareNote() {
    try {
      await Share.share({
        message: [
          entry?.title,
          entry?.author,
          `Paragraph ${
            Number(
              entry?.paragraphIndex || 0
            ) + 1
          }`,
          note
        ]
          .filter(Boolean)
          .join("\n\n")
      });
    } catch {}
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.bookTitle}>
          {entry?.title || "Book"}
        </Text>

        {!!entry?.author && (
          <Text style={styles.author}>
            {entry.author}
          </Text>
        )}

        <Text
          style={styles.paragraphLabel}
        >
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

        <View style={styles.actionRow}>
          <Pressable
            onPress={readContext}
            style={styles.iconAction}
          >
            <LitIcon
              name="read-context"
              size={20}
            />
            <Text
              style={styles.iconActionText}
            >
              Context
            </Text>
          </Pressable>

          <Pressable
            onPress={addLink}
            style={styles.iconAction}
          >
            <LitIcon
              name="link"
              size={20}
            />
            <Text
              style={styles.iconActionText}
            >
              Add Link
            </Text>
          </Pressable>

          <Pressable
            onPress={shareNote}
            style={styles.iconAction}
          >
            <LitIcon
              name="share"
              size={20}
            />
            <Text
              style={styles.iconActionText}
            >
              Share
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>
          Visibility
        </Text>

        <View style={styles.visibilityRow}>
          {[
            ["private", "Private"],
            ["public", "Public"]
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() =>
                setVisibility(id)
              }
              style={[
                styles.visibilityChip,
                visibility === id &&
                  styles.visibilityActive
              ]}
            >
              <Text
                style={[
                  styles.visibilityText,
                  visibility === id &&
                    styles.visibilityTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

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
      </ScrollView>

      <BottomNav active="library" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      BRAND.background
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  header: {
    padding: 18,
    backgroundColor:
      BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor:
      BRAND.line
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
    flex: 1
  },
  contentInner: {
    padding: 18,
    paddingBottom: 110
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
    borderLeftColor:
      BRAND.teal,
    paddingLeft: 12,
    marginTop: 10
  },
  contextText: {
    color: BRAND.ink,
    fontStyle: "italic",
    lineHeight: 20
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  iconAction: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      BRAND.surface
  },
  iconActionText: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 10
  },
  label: {
    color: BRAND.ink,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 8
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 8
  },
  visibilityChip: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      BRAND.surface
  },
  visibilityActive: {
    backgroundColor:
      BRAND.teal,
    borderColor:
      BRAND.teal
  },
  visibilityText: {
    color: BRAND.ink,
    fontWeight: "800"
  },
  visibilityTextActive: {
    color: "#FFFFFF"
  },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    backgroundColor:
      BRAND.surface,
    padding: 12,
    marginTop: 14,
    textAlignVertical: "top",
    color: BRAND.ink
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
    backgroundColor:
      BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  delete: {
    minWidth: 100,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      BRAND.danger,
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
