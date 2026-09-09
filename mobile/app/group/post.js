import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  FlatList,
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

import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";

import {
  getNativeGroupForumReplies,
  getNativeGroupForumVote,
  replyNativeGroupForumPost,
  reportNativeGroupForumNode,
  voteNativeGroupForumNode
} from "../../services/groupForum";

import { BRAND } from "../../../shared/brand";

export default function GroupPostScreen() {
  const params = useLocalSearchParams();

  const groupId = String(params.groupId || "");
  const postId = String(params.postId || "");
  const title = String(params.title || "Discussion");
  const body = String(params.body || "");
  const sourceBookId = String(params.sourceBookId || "");
  const sourceTitle = String(params.sourceTitle || "");
  const sourceAuthor = String(params.sourceAuthor || "");
  const sourceParagraphIndex = String(params.sourceParagraphIndex || "0");
  const postUserId = String(params.userId || "");

  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState("");
  const [postVote, setPostVote] = useState(0);
  const [postCounts, setPostCounts] = useState({
    up: Number(params.forumUpCount) || 0,
    down: Number(params.forumDownCount) || 0,
    score: Number(params.forumScore) || 0
  });
  const [replyVotes, setReplyVotes] = useState({});
  const viewRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loadedReplies =
          await getNativeGroupForumReplies(groupId, postId);

        if (!active) return;

        setReplies(loadedReplies);

        try {
          setPostVote(
            await getNativeGroupForumVote(groupId, {
              targetType: "post",
              targetId: postId
            })
          );
        } catch {
          // Vote state is optional.
        }
      } catch (error) {
        setStatus(error?.message || "Could not load replies.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [groupId, postId]);

  async function addReply() {
    try {
      const created =
        await replyNativeGroupForumPost(
          groupId,
          postId,
          replyText
        );

      setReplies((current) => [...current, created]);
      setReplyText("");
      setStatus("Reply added.");
    } catch (error) {
      setStatus(error?.message || "Could not add reply.");
    }
  }

  async function votePost(direction) {
    try {
      const result =
        await voteNativeGroupForumNode(
          groupId,
          postId,
          { direction }
        );

      setPostVote(result.direction);
      setPostCounts({
        up: result.forumUpCount,
        down: result.forumDownCount,
        score: result.forumScore
      });
    } catch (error) {
      setStatus(error?.message || "Could not update vote.");
    }
  }

  async function voteReply(reply, direction) {
    try {
      const result =
        await voteNativeGroupForumNode(
          groupId,
          postId,
          {
            replyId: reply.id,
            direction
          }
        );

      setReplyVotes((current) => ({
        ...current,
        [reply.id]: result.direction
      }));

      setReplies((current) =>
        current.map((candidate) =>
          candidate.id === reply.id
            ? {
                ...candidate,
                forumUpCount: result.forumUpCount,
                forumDownCount: result.forumDownCount,
                forumScore: result.forumScore
              }
            : candidate
        )
      );
    } catch (error) {
      setStatus(error?.message || "Could not update vote.");
    }
  }

  function openSourceBook() {
    if (!sourceBookId) return;

    router.push({
      pathname: "/reader/[bookId]",
      params: {
        bookId: sourceBookId,
        title: sourceTitle || title,
        author: sourceAuthor,
        startParagraph: sourceParagraphIndex
      }
    });
  }

  async function reportPost() {
    try {
      await reportNativeGroupForumNode({
        groupId,
        postId,
        targetUserId: postUserId,
        title,
        body,
        reason: "other"
      });

      setStatus("Report submitted.");
    } catch (error) {
      setStatus(error?.message || "Could not submit report.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Group Chain" subtitle={title} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>

          {!!sourceBookId && (
            <Pressable onPress={openSourceBook} style={styles.openBook}>
              <Text style={styles.openBookGlyph}>▤</Text>
              <Text style={styles.openBookText}>Open book</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.title}>{title}</Text>

        {!!body && (
          <Text style={styles.body}>{body}</Text>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() => votePost(1)}
            style={[
              styles.vote,
              postVote === 1 && styles.voteActive
            ]}
          >
            <Text style={styles.voteGlyph}>∞</Text>
            <Text style={styles.voteText}>Link {postCounts.up}</Text>
          </Pressable>

          <Pressable
            onPress={() => votePost(-1)}
            style={[
              styles.vote,
              postVote === -1 && styles.voteActive
            ]}
          >
            <Text style={styles.voteGlyph}>×</Text>
            <Text style={styles.voteText}>Unlink {postCounts.down}</Text>
          </Pressable>

          {!!postUserId && (
            <Pressable onPress={reportPost} style={styles.iconButton}>
              <Text style={styles.reportGlyph}>!</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.score}>Score {postCounts.score}</Text>

        <TextInput
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Reply to this discussion..."
          placeholderTextColor="#8B999B"
          multiline
          style={styles.input}
        />

        <Pressable
          disabled={!replyText.trim()}
          onPress={addReply}
          style={[
            styles.replyButton,
            !replyText.trim() && styles.disabled
          ]}
        >
          <Text style={styles.replyGlyph}>↩</Text>
          <Text style={styles.replyButtonText}>Reply</Text>
        </Pressable>

        {!!status && (
          <Text style={styles.status}>{status}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          ref={viewRef}
          data={replies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.section}>Replies</Text>
          }
          ListEmptyComponent={
            <Text style={styles.muted}>No replies yet.</Text>
          }
          renderItem={({ item }) => {
            const vote = replyVotes[item.id] || 0;

            return (
              <View style={styles.reply}>
                <Text style={styles.replyText}>
                  {item.body || "Reply"}
                </Text>

                <View style={styles.replyActions}>
                  <Pressable
                    onPress={() => voteReply(item, 1)}
                    style={[
                      styles.smallVote,
                      vote === 1 && styles.voteActive
                    ]}
                  >
                    <Text style={styles.smallGlyph}>∞</Text>
                    <Text style={styles.smallVoteText}>
                      {Number(item.forumUpCount || 0)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => voteReply(item, -1)}
                    style={[
                      styles.smallVote,
                      vote === -1 && styles.voteActive
                    ]}
                  >
                    <Text style={styles.smallGlyph}>×</Text>
                    <Text style={styles.smallVoteText}>
                      {Number(item.forumDownCount || 0)}
                    </Text>
                  </Pressable>

                  <Text style={styles.replyScore}>
                    Score {Number(item.forumScore || 0)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  header: {
    backgroundColor: BRAND.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  openBook: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    backgroundColor: "#E8F7F6"
  },
  openBookGlyph: {
    color: BRAND.tealDark,
    fontSize: 17,
    fontWeight: "900"
  },
  openBookText: {
    color: BRAND.tealDark,
    fontSize: 11,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12
  },
  body: {
    color: BRAND.muted,
    lineHeight: 21,
    marginTop: 8
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  vote: {
    minHeight: 40,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line
  },
  voteActive: {
    borderColor: BRAND.teal,
    backgroundColor: "#E8F7F6"
  },
  voteGlyph: {
    color: BRAND.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  voteText: {
    color: BRAND.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  reportGlyph: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  score: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 6
  },
  input: {
    minHeight: 72,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 13,
    padding: 10,
    textAlignVertical: "top",
    color: BRAND.ink
  },
  replyButton: {
    minHeight: 44,
    marginTop: 8,
    backgroundColor: BRAND.yellow,
    borderRadius: 13,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  disabled: {
    opacity: 0.45
  },
  replyGlyph: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  replyButtonText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  status: {
    color: "#6D5A16",
    backgroundColor: "#FFF8DF",
    padding: 8,
    borderRadius: 10,
    marginTop: 10,
    fontSize: 11
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    padding: 14
  },
  section: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10
  },
  muted: {
    color: BRAND.muted
  },
  reply: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  replyText: {
    color: BRAND.ink,
    lineHeight: 20
  },
  replyActions: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    marginTop: 10
  },
  smallVote: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.line,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center"
  },
  smallGlyph: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  smallVoteText: {
    color: BRAND.ink,
    fontSize: 10,
    fontWeight: "900"
  },
  replyScore: {
    color: BRAND.muted,
    fontSize: 10
  }
});
