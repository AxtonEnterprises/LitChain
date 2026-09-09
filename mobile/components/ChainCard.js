import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useState } from "react";
import { router } from "expo-router";
import { BRAND } from "../../shared/brand";
import LitIcon from "./LitIcon";

function entryParagraphIndex(entry) {
  if (
    entry?.paragraphIndex !==
      undefined &&
    entry?.paragraphIndex !==
      null
  ) {
    return Math.max(
      Number(
        entry.paragraphIndex
      ) || 0,
      0
    );
  }

  return Math.max(
    Number(
      entry?.paragraphNumber
    ) > 0
      ? Number(
          entry.paragraphNumber
        ) - 1
      : 0,
    0
  );
}

export default function ChainCard({
  entry,
  myVote = 0,
  upCount = 0,
  downCount = 0,
  score = 0,
  onVote,
  onSave,
  onReport,
  onReply = null,
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
          String(
            entry.bookId
          ),
        title:
          entry.title ||
          "Book",
        author:
          entry.author || "",
        startParagraph:
          String(
            entryParagraphIndex(
              entry
            )
          )
      }
    });
  }

  async function shareEntry() {
    const paragraph =
      entry?.paragraphNumber
        ? `Paragraph ${entry.paragraphNumber}`
        : "";

    const note =
      String(
        entry?.note || ""
      ).trim();

    const source =
      [
        entry?.title,
        entry?.author,
        paragraph
      ]
        .filter(Boolean)
        .join(" · ");

    const message =
      [
        source,
        note
      ]
        .filter(Boolean)
        .join("\n\n");

    try {
      await Share.share({
        message:
          message ||
          "Lit Chain"
      });
    } catch {
      // Native share was dismissed or unavailable.
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.levelRow}>
        <Text style={styles.level}>
          LINKED TO LITERATURE
        </Text>

        <Pressable
          onPress={shareEntry}
          style={styles.shareButton}
          accessibilityLabel="Share Chain entry"
        >
          <LitIcon
            name="share"
            size={22}
          />
        </Pressable>
      </View>

      <Text
        style={styles.sourceTitle}
      >
        {entry.title ||
          "Lit Chain"}
      </Text>

      {!!entry.author && (
        <Text style={styles.author}>
          {entry.author}
        </Text>
      )}

      {(
        entry.paragraphNumber ||
        entry.paragraphIndex !==
          undefined
      ) && (
        <Text style={styles.paragraphMeta}>
          Paragraph{" "}
          {entry.paragraphNumber ||
            entryParagraphIndex(
              entry
            ) + 1}
        </Text>
      )}

      {!!entry.paragraphPreview && (
        <View style={styles.quoteWrap}>
          <Text
            numberOfLines={6}
            style={styles.quote}
          >
            “{entry.paragraphPreview}”
          </Text>
        </View>
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
          <LitIcon
            name="link"
            active={
              myVote === 1
            }
            size={20}
          />

          <Text
            style={styles.voteText}
          >
            {upCount}
          </Text>
        </Pressable>

        <Text
          style={styles.score}
        >
          {score}
        </Text>

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
          <LitIcon
            name="unlink"
            active={
              myVote === -1
            }
            size={20}
          />

          <Text
            style={styles.voteText}
          >
            {downCount}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!entry?.bookId}
          onPress={openBook}
          style={styles.action}
        >
          <LitIcon
            name="read-context"
            size={22}
          />
          <Text style={styles.actionText}>
            Read
          </Text>
        </Pressable>

        {!!onReply && (
          <Pressable
            onPress={() =>
              onReply(entry)
            }
            style={styles.action}
          >
            <LitIcon
              name="reply"
              size={22}
            />
            <Text style={styles.actionText}>
              Reply
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={save}
          style={styles.action}
        >
          <LitIcon
            name="save"
            active={saved}
            size={22}
          />
          <Text style={styles.actionText}>
            {saved
              ? "Saved"
              : "Save"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setReportOpen(true)
          }
          style={styles.action}
        >
          <LitIcon
            name="report"
            size={22}
          />
          <Text style={styles.actionText}>
            Report
          </Text>
        </Pressable>
      </View>

      {showComposer && (
        <View style={styles.composer}>
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
            <LitIcon
              name="link"
              size={20}
            />

            <Text
              style={styles.addButtonText}
            >
              {adding
                ? "Adding..."
                : "Add link"}
            </Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={reportOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setReportOpen(false)
        }
      >
        <View
          style={styles.modalShade}
        >
          <View
            style={styles.modalCard}
          >
            <View
              style={styles.modalTitleRow}
            >
              <Text
                style={styles.modalTitle}
              >
                Report Chain entry
              </Text>

              <Pressable
                onPress={() =>
                  setReportOpen(false)
                }
              >
                <Text
                  style={styles.close}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <Text
              style={styles.reasonLabel}
            >
              Reason
            </Text>

            <View
              style={styles.reasonRow}
            >
              {[
                "spam",
                "harassment",
                "copyright",
                "other"
              ].map(
                (value) => (
                  <Pressable
                    key={value}
                    onPress={() =>
                      setReason(
                        value
                      )
                    }
                    style={[
                      styles.reasonChip,
                      reason ===
                        value &&
                        styles.reasonChipActive
                    ]}
                  >
                    <Text
                      style={styles.reasonText}
                    >
                      {value}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <TextInput
              value={details}
              onChangeText={
                setDetails
              }
              placeholder="Optional details"
              placeholderTextColor="#8B999B"
              multiline
              style={styles.reportInput}
            />

            <Pressable
              onPress={report}
              style={styles.reportSubmit}
            >
              <LitIcon
                name="report"
                size={20}
              />
              <Text
                style={styles.reportSubmitText}
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

const styles =
  StyleSheet.create({
    card: {
      backgroundColor:
        BRAND.surface,
      borderWidth: 1,
      borderColor:
        "#A7B4B8",
      borderRadius: 24,
      padding: 18
    },
    levelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between"
    },
    level: {
      color:
        BRAND.tealDark,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2
    },
    shareButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center"
    },
    sourceTitle: {
      color:
        BRAND.ink,
      fontSize: 25,
      lineHeight: 30,
      fontWeight: "900",
      marginTop: 6
    },
    author: {
      color:
        BRAND.muted,
      fontSize: 15,
      marginTop: 8
    },
    paragraphMeta: {
      color:
        BRAND.muted,
      fontSize: 12,
      marginTop: 16
    },
    quoteWrap: {
      borderLeftWidth: 4,
      borderLeftColor:
        BRAND.teal,
      marginTop: 12,
      paddingVertical: 10,
      paddingLeft: 10,
      paddingRight: 4
    },
    quote: {
      color:
        BRAND.muted,
      fontStyle: "italic",
      fontSize: 15,
      lineHeight: 22
    },
    note: {
      color:
        BRAND.ink,
      fontSize: 18,
      lineHeight: 25,
      marginTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        BRAND.line
    },
    voteRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      marginTop: 14
    },
    vote: {
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 999,
      flexDirection: "row",
      gap: 7,
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
      fontSize: 14
    },
    score: {
      minWidth: 34,
      textAlign: "center",
      color:
        BRAND.ink,
      fontWeight: "900",
      fontSize: 16
    },
    actionRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      borderTopWidth: 1,
      borderTopColor:
        BRAND.line,
      marginTop: 16,
      paddingTop: 14
    },
    action: {
      flex: 1,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      gap: 4
    },
    actionText: {
      color:
        BRAND.muted,
      fontSize: 10,
      fontWeight: "800"
    },
    composer: {
      borderTopWidth: 1,
      borderTopColor:
        BRAND.line,
      marginTop: 8,
      paddingTop: 14
    },
    input: {
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
    close: {
      color:
        BRAND.ink,
      fontSize: 28,
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
      textTransform:
        "capitalize"
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
