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

import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import LitIcon from "../../components/LitIcon";

import {
  getNativeGroupForumReplies,
  getNativeGroupForumVote,
  replyNativeGroupForumPost,
  reportNativeGroupForumNode,
  voteNativeGroupForumNode
} from "../../services/groupForum";

import {
  deleteNativeGroupPost,
  setNativeGroupPostLocked,
  setNativeGroupPostPinned
} from "../../services/groupAdmin";

import { BRAND } from "../../../shared/brand";

export default function GroupPostScreen() {
  const params = useLocalSearchParams();

  const groupId = String(params.groupId || "");
  const postId = String(params.postId || "");
  const title = String(
    params.title || "Discussion"
  );
  const body = String(params.body || "");

  const sourceBookId = String(
    params.sourceBookId || ""
  );
  const sourceTitle = String(
    params.sourceTitle || ""
  );
  const sourceAuthor = String(
    params.sourceAuthor || ""
  );
  const sourceParagraphIndex = String(
    params.sourceParagraphIndex || "0"
  );
  const paragraphPreview = String(
    params.paragraphPreview || ""
  );

  const postUserId = String(
    params.userId || ""
  );
  const authorName = String(
    params.authorName || ""
  );
  const role = String(
    params.role || ""
  ).toLowerCase();

  const canModerate = [
    "owner",
    "admin",
    "moderator"
  ].includes(role);

  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] =
    useState("");
  const [status, setStatus] = useState("");
  const [postVote, setPostVote] =
    useState(0);
  const [postCounts, setPostCounts] =
    useState({
      up: Number(params.forumUpCount) || 0,
      down:
        Number(params.forumDownCount) || 0,
      score:
        Number(params.forumScore) || 0
    });

  const [replyVotes, setReplyVotes] =
    useState({});
  const [viewportHeight, setViewportHeight] =
    useState(0);
  const [activeReplyIndex, setActiveReplyIndex] =
    useState(0);
  const [pinned, setPinned] = useState(
    String(params.pinned || "") === "1"
  );
  const [locked, setLocked] = useState(
    String(params.locked || "") === "1"
  );

  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loadedReplies =
          await getNativeGroupForumReplies(
            groupId,
            postId
          );

        if (!active) return;

        setReplies(loadedReplies);

        try {
          setPostVote(
            await getNativeGroupForumVote(
              groupId,
              {
                targetType: "post",
                targetId: postId
              }
            )
          );
        } catch {}
      } catch (error) {
        setStatus(
          error?.message ||
            "Could not load replies."
        );
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

      setReplies((current) => [
        ...current,
        created
      ]);

      setReplyText("");
      setStatus("Reply added.");
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not add reply."
      );
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
      setStatus(
        error?.message ||
          "Could not update vote."
      );
    }
  }

  async function voteReply(
    reply,
    direction
  ) {
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
                forumUpCount:
                  result.forumUpCount,
                forumDownCount:
                  result.forumDownCount,
                forumScore:
                  result.forumScore
              }
            : candidate
        )
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update vote."
      );
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
        startParagraph:
          sourceParagraphIndex
      }
    });
  }

  async function sharePost() {
    try {
      await Share.share({
        message: [title, body]
          .filter(Boolean)
          .join("\n\n")
      });
    } catch {}
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
      setStatus(
        error?.message ||
          "Could not submit report."
      );
    }
  }

  async function togglePin() {
    try {
      await setNativeGroupPostPinned(
        groupId,
        postId,
        !pinned
      );
      setPinned(!pinned);
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update pin."
      );
    }
  }

  async function toggleLock() {
    try {
      await setNativeGroupPostLocked(
        groupId,
        postId,
        !locked
      );
      setLocked(!locked);
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update lock."
      );
    }
  }

  async function removePost() {
    try {
      await deleteNativeGroupPost(
        groupId,
        postId
      );
      router.back();
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not delete discussion."
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Group Chain"
        subtitle={title}
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>
              ‹ Back
            </Text>
          </Pressable>

          <Pressable
            onPress={sharePost}
            style={styles.iconButton}
          >
            <LitIcon
              name="share"
              size={21}
            />
          </Pressable>
        </View>

        <Text style={styles.kicker}>
          GROUP DISCUSSION
        </Text>

        <Text style={styles.title}>
          {title}
        </Text>

        {!!authorName && (
          <Text style={styles.byline}>
            Posted by {authorName}
          </Text>
        )}

        {!!paragraphPreview && (
          <View style={styles.context}>
            <Text style={styles.contextLabel}>
              REFERENCED PARAGRAPH ¶
              {Number(
                sourceParagraphIndex
              ) + 1}
            </Text>

            <Text
              numberOfLines={5}
              style={styles.contextText}
            >
              “{paragraphPreview}”
            </Text>
          </View>
        )}

        {!!body && (
          <Text style={styles.body}>
            {body}
          </Text>
        )}

        {!!sourceBookId && (
          <Pressable
            onPress={openSourceBook}
            style={styles.sourceButton}
          >
            <LitIcon
              name="read-context"
              size={21}
            />
            <Text style={styles.sourceText}>
              Read Context
            </Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() => votePost(1)}
            style={[
              styles.vote,
              postVote === 1 &&
                styles.voteActive
            ]}
          >
            <LitIcon
              name="link"
              active={postVote === 1}
              size={20}
            />
            <Text style={styles.voteText}>
              {postCounts.up}
            </Text>
          </Pressable>

          <Text style={styles.score}>
            {postCounts.score}
          </Text>

          <Pressable
            onPress={() => votePost(-1)}
            style={[
              styles.vote,
              postVote === -1 &&
                styles.voteActive
            ]}
          >
            <LitIcon
              name="unlink"
              active={postVote === -1}
              size={20}
            />
            <Text style={styles.voteText}>
              {postCounts.down}
            </Text>
          </Pressable>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={() =>
              inputRef.current?.focus()
            }
            style={styles.quickAction}
          >
            <LitIcon
              name="reply"
              size={20}
            />
            <Text
              style={styles.quickActionText}
            >
              Reply
            </Text>
          </Pressable>

          {!!postUserId && (
            <Pressable
              onPress={reportPost}
              style={styles.quickAction}
            >
              <LitIcon
                name="report"
                size={20}
              />
              <Text
                style={styles.quickActionText}
              >
                Report
              </Text>
            </Pressable>
          )}

          {canModerate && (
            <>
              <Pressable
                onPress={togglePin}
                style={styles.quickAction}
              >
                <Text
                  style={styles.quickActionText}
                >
                  {pinned
                    ? "Unpin"
                    : "Pin"}
                </Text>
              </Pressable>

              <Pressable
                onPress={toggleLock}
                style={styles.quickAction}
              >
                <Text
                  style={styles.quickActionText}
                >
                  {locked
                    ? "Unlock"
                    : "Lock"}
                </Text>
              </Pressable>

              <Pressable
                onPress={removePost}
                style={styles.quickAction}
              >
                <Text style={styles.deleteText}>
                  Delete
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {!locked && (
          <>
            <TextInput
              ref={inputRef}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Reply to this discussion..."
              multiline
              style={styles.input}
            />

            <Pressable
              disabled={!replyText.trim()}
              onPress={addReply}
              style={[
                styles.replyButton,
                !replyText.trim() &&
                  styles.disabled
              ]}
            >
              <LitIcon
                name="reply"
                size={20}
              />
              <Text
                style={
                  styles.replyButtonText
                }
              >
                Reply
              </Text>
            </Pressable>
          </>
        )}

        {locked && (
          <Text style={styles.lockedText}>
            This discussion is locked.
          </Text>
        )}

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <View
          style={styles.replyViewport}
          onLayout={(event) => {
            const height = Math.floor(
              event.nativeEvent.layout.height
            );

            if (
              height > 0 &&
              height !== viewportHeight
            ) {
              setViewportHeight(height);
            }
          }}
        >
          {!!viewportHeight && (
            <FlatList
              data={replies}
              key={`replies-${viewportHeight}`}
              keyExtractor={(item) =>
                String(item.id)
              }
              showsVerticalScrollIndicator={false}
              snapToInterval={viewportHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              getItemLayout={(_, index) => ({
                length: viewportHeight,
                offset:
                  viewportHeight * index,
                index
              })}
              onMomentumScrollEnd={(event) => {
                const next = Math.round(
                  event.nativeEvent
                    .contentOffset.y /
                    Math.max(
                      viewportHeight,
                      1
                    )
                );

                setActiveReplyIndex(next);
              }}
              ListEmptyComponent={
                <View
                  style={[
                    styles.center,
                    {
                      height:
                        viewportHeight
                    }
                  ]}
                >
                  <Text style={styles.muted}>
                    No replies yet.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const vote =
                  replyVotes[item.id] || 0;

                return (
                  <View
                    style={[
                      styles.replyPage,
                      {
                        height:
                          viewportHeight
                      }
                    ]}
                  >
                    <View
                      style={styles.replyCard}
                    >
                      <Text
                        style={
                          styles.replyKicker
                        }
                      >
                        REPLY
                      </Text>

                      <Text
                        style={
                          styles.replyText
                        }
                      >
                        {item.body || "Reply"}
                      </Text>

                      <View
                        style={
                          styles.replyActions
                        }
                      >
                        <Pressable
                          onPress={() =>
                            voteReply(
                              item,
                              1
                            )
                          }
                          style={[
                            styles.smallVote,
                            vote === 1 &&
                              styles.voteActive
                          ]}
                        >
                          <LitIcon
                            name="link"
                            active={
                              vote === 1
                            }
                            size={20}
                          />
                          <Text
                            style={
                              styles.smallVoteText
                            }
                          >
                            {Number(
                              item.forumUpCount ||
                                0
                            )}
                          </Text>
                        </Pressable>

                        <Text
                          style={
                            styles.replyScore
                          }
                        >
                          {Number(
                            item.forumScore ||
                              0
                          )}
                        </Text>

                        <Pressable
                          onPress={() =>
                            voteReply(
                              item,
                              -1
                            )
                          }
                          style={[
                            styles.smallVote,
                            vote === -1 &&
                              styles.voteActive
                          ]}
                        >
                          <LitIcon
                            name="unlink"
                            active={
                              vote === -1
                            }
                            size={20}
                          />
                          <Text
                            style={
                              styles.smallVoteText
                            }
                          >
                            {Number(
                              item.forumDownCount ||
                                0
                            )}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {replies.length > 1 && (
            <View
              pointerEvents="none"
              style={styles.verticalDots}
            >
              {replies
                .slice(0, 12)
                .map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.dot,
                      index ===
                        activeReplyIndex &&
                        styles.dotActive
                    ]}
                  />
                ))}
            </View>
          )}
        </View>
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
    padding: 14,
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
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  kicker: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 8
  },
  title: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5
  },
  byline: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 5
  },
  context: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND.teal,
    paddingLeft: 10,
    marginTop: 10
  },
  contextLabel: {
    color: BRAND.tealDark,
    fontSize: 9,
    fontWeight: "900"
  },
  contextText: {
    color: BRAND.ink,
    fontStyle: "italic",
    marginTop: 5
  },
  body: {
    color: BRAND.muted,
    lineHeight: 20,
    marginTop: 8
  },
  sourceButton: {
    minHeight: 36,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8
  },
  sourceText: {
    color: BRAND.tealDark,
    fontSize: 11,
    fontWeight: "900"
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 8
  },
  vote: {
    flex: 1,
    minHeight: 38,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line
  },
  voteActive: {
    borderColor: BRAND.teal,
    backgroundColor: "#E8F7F6"
  },
  voteText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  score: {
    minWidth: 32,
    textAlign: "center",
    color: BRAND.ink,
    fontWeight: "900"
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8
  },
  quickAction: {
    minHeight: 32,
    flexDirection: "row",
    gap: 5,
    alignItems: "center"
  },
  quickActionText: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 10
  },
  deleteText: {
    color: BRAND.danger,
    fontWeight: "900",
    fontSize: 10
  },
  input: {
    minHeight: 58,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    textAlignVertical: "top"
  },
  replyButton: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: BRAND.teal,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7
  },
  replyButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.45
  },
  lockedText: {
    color: BRAND.muted,
    fontWeight: "800",
    marginTop: 10
  },
  status: {
    color: BRAND.tealDark,
    fontSize: 11,
    marginTop: 7,
    textAlign: "center"
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  replyViewport: {
    flex: 1,
    position: "relative"
  },
  replyPage: {
    padding: 14
  },
  replyCard: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 22,
    padding: 22
  },
  replyKicker: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  replyText: {
    color: BRAND.ink,
    fontSize: 19,
    lineHeight: 27,
    marginTop: 12
  },
  replyActions: {
    marginTop: "auto",
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  smallVote: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  smallVoteText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  replyScore: {
    minWidth: 34,
    color: BRAND.ink,
    fontWeight: "900",
    textAlign: "center"
  },
  muted: {
    color: BRAND.muted
  },
  verticalDots: {
    position: "absolute",
    right: 5,
    top: "40%",
    gap: 5
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#C5CECF"
  },
  dotActive: {
    width: 8,
    height: 8,
    backgroundColor: BRAND.tealDark
  }
});
