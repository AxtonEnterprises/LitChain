import {
  useState
} from "react";

import {
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
  createNativeGroupDiscussion
} from "../../services/groupDiscussion";

import { BRAND } from "../../../shared/brand";

export default function NewDiscussion() {
  const params =
    useLocalSearchParams();

  const groupId =
    String(params.groupId || "");
  const groupName =
    String(params.name || "Group");
  const role =
    String(params.role || "");
  const sourceBookId = String(params.sourceBookId || "");
  const sourceTitle = String(params.sourceTitle || "");
  const sourceAuthor = String(params.sourceAuthor || "");
  const sourceParagraphIndex = Math.max(
    Number(params.sourceParagraphIndex) || 0,
    0
  );
  const paragraphPreview = String(params.paragraphPreview || "");

  const [title, setTitle] =
    useState("");
  const [body, setBody] =
    useState("");
  const [status, setStatus] =
    useState("");
  const [saving, setSaving] =
    useState(false);

  async function create() {
    try {
      setSaving(true);
      setStatus("");

      const post =
        await createNativeGroupDiscussion({
          groupId,
          title,
          body,
          sourceBookId,
          sourceTitle,
          sourceAuthor,
          sourceParagraphIndex,
          paragraphPreview
        });

      router.replace({
        pathname: "/group/post",
        params: {
          groupId,
          postId: post.id,
          title: post.title,
          body: post.body,
          name: groupName,
          role,
          userId: post.userId,
          forumUpCount: "0",
          forumDownCount: "0",
          forumScore: "0",
          pinned: "0",
          locked: "0",
          sourceBookId: post.sourceBookId || "",
          sourceTitle: post.sourceTitle || "",
          sourceAuthor: post.sourceAuthor || "",
          sourceParagraphIndex: String(post.sourceParagraphIndex ?? 0),
          paragraphPreview: post.paragraphPreview || ""
        }
      });
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not create discussion."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹ {groupName}
          </Text>
        </Pressable>

        <Text style={styles.title}>
          New Discussion
        </Text>
      </View>

      <View style={styles.content}>
        {!!sourceBookId && (
          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>
              REFERENCED PARAGRAPH ¶{sourceParagraphIndex + 1}
            </Text>
            <Text style={styles.contextTitle}>
              {sourceTitle || "Referenced book"}
              {sourceAuthor ? ` · ${sourceAuthor}` : ""}
            </Text>
            {!!paragraphPreview && (
              <Text numberOfLines={5} style={styles.contextText}>
                “{paragraphPreview}”
              </Text>
            )}
          </View>
        )}

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Discussion title"
          style={styles.input}
        />

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Start the discussion..."
          multiline
          style={[
            styles.input,
            styles.bodyInput
          ]}
        />

        <Pressable
          disabled={
            saving ||
            !title.trim() ||
            !body.trim()
          }
          onPress={create}
          style={[
            styles.create,
            (
              saving ||
              !title.trim() ||
              !body.trim()
            ) && styles.disabled
          ]}
        >
          <Text style={styles.createText}>
            Start Discussion
          </Text>
        </Pressable>

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}
      </View>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      BRAND.background
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
    marginTop: 10
  },
  content: {
    flex: 1,
    padding: 18
  },
  contextCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12
  },
  contextLabel: {
    color: BRAND.tealDark,
    fontSize: 11,
    fontWeight: "900"
  },
  contextTitle: {
    color: BRAND.ink,
    fontWeight: "800",
    marginTop: 5
  },
  contextText: {
    color: BRAND.muted,
    marginTop: 8,
    lineHeight: 20
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    backgroundColor:
      BRAND.surface,
    paddingHorizontal: 12,
    color: BRAND.ink,
    marginBottom: 12
  },
  bodyInput: {
    minHeight: 180,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  create: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor:
      BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  disabled: {
    opacity: 0.45
  },
  createText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  status: {
    color: BRAND.danger,
    marginTop: 12,
    textAlign: "center"
  }
});
