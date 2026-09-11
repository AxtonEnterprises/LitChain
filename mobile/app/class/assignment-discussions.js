import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams
} from "expo-router";

import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";
import useRefreshOnAppActive from "../../hooks/useRefreshOnAppActive";

import {
  createNativeAssignmentDiscussion,
  getNativeAssignmentDiscussions
} from "../../services/classDiscussions";

import {
  canTeachClass,
  getNativeClass
} from "../../services/classFoundation";

export default function AssignmentDiscussions() {
  const params = useLocalSearchParams();
  const classId = String(params.classId || "");
  const assignmentId = String(params.assignmentId || "");
  const assignmentTitle = String(params.assignmentTitle || "Assignment");

  const [role, setRole] = useState("member");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const canStartDiscussion =
    canTeachClass(role);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setStatus("");

      const [classData, discussions] = await Promise.all([
        getNativeClass(classId),
        getNativeAssignmentDiscussions(classId, assignmentId)
      ]);

      setRole(classData.membership?.role || "member");
      setPosts(discussions);
    } catch (error) {
      setStatus(error?.message || "Could not load assignment discussions.");
    } finally {
      setLoading(false);
    }
  }, [classId, assignmentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useRefreshOnAppActive(load);

  async function create() {
    try {
      setSaving(true);
      setStatus("");

      await createNativeAssignmentDiscussion({
        classId,
        assignmentId,
        assignmentTitle,
        title,
        body
      });

      setTitle("");
      setBody("");
      setComposerOpen(false);
      await load();
    } catch (error) {
      setStatus(error?.message || "Could not start discussion.");
    } finally {
      setSaving(false);
    }
  }

  function openPost(post) {
    router.push({
      pathname: "/group/post",
      params: {
        groupId: classId,
        postId: post.id,
        title: post.title || "Discussion",
        body: post.body || "",
        role,
        postUserId: post.userId || "",
        authorName: post.authorName || "",
        forumUpCount: String(post.forumUpCount || 0),
        forumDownCount: String(post.forumDownCount || 0),
        forumScore: String(post.forumScore || 0),
        locked: post.locked ? "1" : "0",
        pinned: post.pinned ? "1" : "0"
      }
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Assignment</Text>
        </Pressable>
        <Text style={styles.eyebrow}>ASSIGNMENT DISCUSSIONS</Text>
        <Text numberOfLines={2} style={styles.title}>{assignmentTitle}</Text>
        {canStartDiscussion && (
          <Pressable
            onPress={() => setComposerOpen(true)}
            style={styles.newButton}
          >
            <Text style={styles.newButtonText}>
              + Discussion
            </Text>
          </Pressable>
        )}
      </View>

      {!!status && <Text style={styles.status}>{status}</Text>}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No discussions yet</Text>
              <Text style={styles.emptyText}>
                {canStartDiscussion
                  ? "Start a discussion about this assignment."
                  : "Your teacher has not started a discussion for this assignment yet."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => openPost(item)} style={styles.card}>
              <Text style={styles.kicker}>DISCUSSION</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {!!item.body && <Text numberOfLines={4} style={styles.body}>{item.body}</Text>}
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{Number(item.forumUpCount || 0)} linked</Text>
                <Text style={styles.meta}>{Number(item.forumDownCount || 0)} broken</Text>
                <Text style={styles.meta}>Score {Number(item.forumScore || 0)}</Text>
              </View>
              <Text style={styles.open}>Open discussion ›</Text>
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={composerOpen && canStartDiscussion}
        animationType="slide"
        transparent
        onRequestClose={() => setComposerOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Discussion</Text>
              <Text style={styles.modalSub}>{assignmentTitle}</Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Discussion title"
                style={styles.input}
              />
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="What would you like to discuss?"
                multiline
                style={[styles.input, styles.bodyInput]}
              />

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setComposerOpen(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>

                <Pressable
                  disabled={saving || !title.trim() || !body.trim()}
                  onPress={create}
                  style={[
                    styles.createButton,
                    (saving || !title.trim() || !body.trim()) && styles.disabled
                  ]}
                >
                  <Text style={styles.createText}>
                    {saving ? "Posting…" : "Start Discussion"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  header: {
    padding: 16,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  back: { color: BRAND.tealDark, fontWeight: "900", marginBottom: 12 },
  eyebrow: { color: BRAND.tealDark, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { color: BRAND.ink, fontSize: 24, fontWeight: "900", marginTop: 3 },
  newButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    marginTop: 12,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  newButtonText: { color: "#FFF", fontWeight: "900" },
  status: { color: BRAND.tealDark, backgroundColor: "#FFF8DF", padding: 10, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 14, paddingBottom: 100 },
  card: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12
  },
  kicker: { color: BRAND.tealDark, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  cardTitle: { color: BRAND.ink, fontSize: 20, fontWeight: "900", marginTop: 5 },
  body: { color: BRAND.muted, lineHeight: 20, marginTop: 8 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  meta: { color: BRAND.muted, fontSize: 10, fontWeight: "800" },
  open: { color: BRAND.tealDark, fontWeight: "900", marginTop: 13 },
  empty: { padding: 28, alignItems: "center" },
  emptyTitle: { color: BRAND.ink, fontSize: 21, fontWeight: "900" },
  emptyText: { color: BRAND.muted, marginTop: 6 },
  modalKeyboard: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 30
  },
  modalTitle: { color: BRAND.ink, fontSize: 23, fontWeight: "900" },
  modalSub: { color: BRAND.muted, marginTop: 3, marginBottom: 14 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: BRAND.ink,
    marginBottom: 10
  },
  bodyInput: { minHeight: 120, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 9 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelText: { color: BRAND.ink, fontWeight: "900" },
  createButton: {
    flex: 2,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  createText: { color: "#FFF", fontWeight: "900" },
  disabled: { opacity: 0.45 }
});
