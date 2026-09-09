import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  MaterialCommunityIcons
} from "@expo/vector-icons";

import {
  useState
} from "react";

import {
  router
} from "expo-router";

import { BRAND } from "../../shared/brand";

export default function ChainCard({
  entry,
  myVote = 0,
  upCount = 0,
  downCount = 0,
  score = 0,
  onVote,
  onSave,
  onReport,
  onAddLink,
  adding = false,
  linkText = "",
  onLinkTextChange,
  showComposer = true
}) {
  const [reportOpen, setReportOpen] =
    useState(false);

  const [reason, setReason] =
    useState("other");

  const [details, setDetails] =
    useState("");

  const [saved, setSaved] =
    useState(false);

  async function save() {
    await onSave?.(entry);
    setSaved(true);
  }

  async function report() {
    await onReport?.(
      entry,
      {
        reason,
        details
      }
    );

    setReportOpen(false);
    setDetails("");
  }

  function openBook() {
    if (!entry?.bookId) return;

    router.push({
      pathname:
        "/reader/[bookId]",
      params: {
        bookId:
          String(entry.bookId),
        title:
          entry.title ||
          "Book",
        author:
          entry.author || "",
        startParagraph:
          String(
            entry.paragraphIndex ??
            (
              Number(
                entry.paragraphNumber
              ) > 0
                ? Number(
                    entry.paragraphNumber
                  ) - 1
                : 0
            )
          )
      }
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.sourceCopy}>
          <Text
            numberOfLines={1}
            style={styles.sourceTitle}
          >
            {entry.title ||
              "Lit Chain"}
          </Text>

          {!!entry.author && (
            <Text
              numberOfLines={1}
              style={styles.author}
            >
              {entry.author}
            </Text>
          )}
        </View>

        {!!entry.bookId && (
          <Pressable
            onPress={openBook}
            style={styles.bookButton}
          >
            <MaterialCommunityIcons
              name="book-open-page-variant-outline"
              size={20}
              color={BRAND.tealDark}
            />
            <Text style={styles.bookText}>
              Open
            </Text>
          </Pressable>
        )}
      </View>

      {!!entry.paragraphPreview && (
        <Text style={styles.quote}>
          “{entry.paragraphPreview}”
        </Text>
      )}

      <Text style={styles.note}>
        {entry.note ||
          "Linked note"}
      </Text>

      <View style={styles.voteRow}>
        <Pressable
          onPress={() =>
            onVote?.(entry, 1)
          }
          style={[
            styles.vote,
            myVote === 1 &&
              styles.voteActive
          ]}
        >
          <MaterialCommunityIcons
            name="link-variant"
            size={19}
            color={BRAND.ink}
          />
          <Text style={styles.voteText}>
            Link {upCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            onVote?.(entry, -1)
          }
          style={[
            styles.vote,
            myVote === -1 &&
              styles.voteActive
          ]}
        >
          <MaterialCommunityIcons
            name="link-variant-off"
            size={19}
            color={BRAND.ink}
          />
          <Text style={styles.voteText}>
            Unlink {downCount}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.score}>
        Score {score}
      </Text>

      <View style={styles.secondary}>
        <Pressable
          onPress={save}
          style={styles.secondaryButton}
        >
          <MaterialCommunityIcons
            name={
              saved
                ? "bookmark"
                : "bookmark-outline"
            }
            size={20}
            color={
              saved
                ? BRAND.tealDark
                : BRAND.ink
            }
          />
          <Text style={styles.secondaryText}>
            {saved ? "Saved" : "Save"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setReportOpen(true)
          }
          style={styles.secondaryButton}
        >
          <MaterialCommunityIcons
            name="flag-outline"
            size={20}
            color={BRAND.ink}
          />
          <Text style={styles.secondaryText}>
            Report
          </Text>
        </Pressable>
      </View>

      {showComposer && (
        <>
          <TextInput
            value={linkText}
            onChangeText={
              onLinkTextChange
            }
            placeholder="Add your link to this Chain..."
            placeholderTextColor="#8B999B"
            multiline
            style={styles.input}
          />

          <Pressable
            disabled={
              adding ||
              !String(
                linkText || ""
              ).trim()
            }
            onPress={() =>
              onAddLink?.(entry)
            }
            style={[
              styles.addButton,
              (
                adding ||
                !String(
                  linkText || ""
                ).trim()
              ) &&
                styles.addButtonDisabled
            ]}
          >
            <MaterialCommunityIcons
              name="plus-link"
              size={20}
              color={BRAND.ink}
            />
            <Text
              style={styles.addButtonText}
            >
              {adding
                ? "Adding..."
                : "Add link"}
            </Text>
          </Pressable>
        </>
      )}

      <Modal
        visible={reportOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setReportOpen(false)
        }
      >
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>
                Report Chain entry
              </Text>

              <Pressable
                onPress={() =>
                  setReportOpen(false)
                }
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={BRAND.ink}
                />
              </Pressable>
            </View>

            <Text style={styles.reasonLabel}>
              Reason
            </Text>

            <View style={styles.reasonRow}>
              {[
                "spam",
                "harassment",
                "copyright",
                "other"
              ].map((value) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setReason(value)
                  }
                  style={[
                    styles.reasonChip,
                    reason === value &&
                      styles.reasonChipActive
                  ]}
                >
                  <Text
                    style={
                      styles.reasonText
                    }
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Optional details"
              placeholderTextColor="#8B999B"
              multiline
              style={styles.reportInput}
            />

            <Pressable
              onPress={report}
              style={styles.reportSubmit}
            >
              <MaterialCommunityIcons
                name="flag"
                size={19}
                color={BRAND.ink}
              />
              <Text
                style={
                  styles.reportSubmitText
                }
              >
                Submit report
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor:
      BRAND.line,
    borderRadius: 22,
    padding: 18
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  sourceCopy: {
    flex: 1,
    paddingRight: 10
  },
  sourceTitle: {
    color:
      BRAND.ink,
    fontWeight: "900",
    fontSize: 16
  },
  author: {
    color:
      BRAND.muted,
    fontSize: 11,
    marginTop: 2
  },
  bookButton: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor:
      "#E8F7F6"
  },
  bookText: {
    color:
      BRAND.tealDark,
    fontSize: 11,
    fontWeight: "900"
  },
  quote: {
    color:
      BRAND.muted,
    fontStyle: "italic",
    marginTop: 16
  },
  note: {
    color:
      BRAND.ink,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: "700",
    marginTop: 14
  },
  voteRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18
  },
  vote: {
    flex: 1,
    borderWidth: 1,
    borderColor:
      BRAND.line,
    borderRadius: 13,
    minHeight: 44,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  voteActive: {
    backgroundColor:
      "#E8F7F6",
    borderColor:
      BRAND.teal
  },
  voteText: {
    color:
      BRAND.ink,
    fontWeight: "900",
    fontSize: 12
  },
  score: {
    textAlign: "center",
    color:
      BRAND.muted,
    marginTop: 8,
    fontSize: 11
  },
  secondary: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginTop: 12
  },
  secondaryButton: {
    minHeight: 38,
    minWidth: 90,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: {
    color:
      BRAND.ink,
    fontWeight: "800",
    fontSize: 12
  },
  input: {
    marginTop: 14,
    minHeight: 76,
    borderWidth: 1,
    borderColor:
      BRAND.line,
    borderRadius: 13,
    padding: 11,
    textAlignVertical: "top",
    color:
      BRAND.ink
  },
  addButton: {
    minHeight: 46,
    marginTop: 9,
    borderRadius: 13,
    backgroundColor:
      BRAND.yellow,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center"
  },
  addButtonDisabled: {
    opacity: 0.45
  },
  addButtonText: {
    color:
      BRAND.ink,
    fontWeight: "900"
  },
  modalShade: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.42)",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    backgroundColor:
      BRAND.surface,
    borderRadius: 20,
    padding: 18
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between"
  },
  modalTitle: {
    color:
      BRAND.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  reasonLabel: {
    color:
      BRAND.muted,
    fontSize: 11,
    marginTop: 16,
    marginBottom: 7
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  reasonChip: {
    borderWidth: 1,
    borderColor:
      BRAND.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  reasonChipActive: {
    borderColor:
      BRAND.teal,
    backgroundColor:
      "#E8F7F6"
  },
  reasonText: {
    color:
      BRAND.ink,
    fontSize: 11,
    textTransform: "capitalize"
  },
  reportInput: {
    minHeight: 90,
    marginTop: 12,
    borderWidth: 1,
    borderColor:
      BRAND.line,
    borderRadius: 13,
    padding: 11,
    textAlignVertical: "top",
    color:
      BRAND.ink
  },
  reportSubmit: {
    minHeight: 46,
    borderRadius: 13,
    marginTop: 10,
    backgroundColor:
      BRAND.yellow,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center"
  },
  reportSubmitText: {
    color:
      BRAND.ink,
    fontWeight: "900"
  }
});
