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

import { BRAND } from "../../../shared/brand";

export default function GroupPostScreen() {
  const params =
    useLocalSearchParams();

  const groupId =
    String(params.groupId || "");

  const postId =
    String(params.postId || "");

  const title =
    String(
      params.title ||
      "Discussion"
    );

  const body =
    String(params.body || "");

  const sourceBookId =
    String(
      params.sourceBookId ||
      ""
    );

  const sourceTitle =
    String(
      params.sourceTitle ||
      ""
    );

  const sourceAuthor =
    String(
      params.sourceAuthor ||
      ""
    );

  const sourceParagraphIndex =
    String(
      params.sourceParagraphIndex ||
      "0"
    );

  const postUserId =
    String(
      params.userId || ""
    );

  const [replies, setReplies] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [replyText, setReplyText] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [postVote, setPostVote] =
    useState(0);

  const [postCounts, setPostCounts] =
    useState({
      up:
        Number(
          params.forumUpCount
        ) || 0,
      down:
        Number(
          params.forumDownCount
        ) || 0,
      score:
        Number(
          params.forumScore
        ) || 0
    });

  const [replyVotes, setReplyVotes] =
    useState({});

  const viewRef =
    useRef(null);

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

        setReplies(
          loadedReplies
        );

        try {
          setPostVote(
            await getNativeGroupForumVote(
              groupId,
              {
                targetType:
                  "post",
                targetId:
                  postId
              }
            )
          );
        } catch {
          // Optional vote state.
        }
      } catch (error) {
        setStatus(
          error?.message ||
          "Could not load replies."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
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

      setReplies(
        (current) => [
          ...current,
          created
        ]
      );

      setReplyText("");
      setStatus(
        "Reply added."
      );
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not add reply."
      );
    }
  }

  async function votePost(
    direction
  ) {
    try {
      const result =
        await voteNativeGroupForumNode(
          groupId,
          postId,
          { direction }
        );

      setPostVote(
        result.direction
      );

      setPostCounts({
        up:
          result.forumUpCount,
        down:
          result.forumDownCount,
        score:
          result.forumScore
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
            replyId:
              reply.id,
            direction
          }
        );

      setReplyVotes(
        (current) => ({
          ...current,
          [reply.id]:
            result.direction
        })
      );

      setReplies(
        (current) =>
          current.map(
            (candidate) =>
              candidate.id ===
              reply.id
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
      pathname:
        "/reader/[bookId]",
      params: {
        bookId:
          sourceBookId,
        title:
          sourceTitle ||
          title,
        author:
          sourceAuthor,
        startParagraph:
          sourceParagraphIndex
      }
    });
  }

  async function sharePost() {
    try {
      await Share.share({
        message:
          [
            title,
            body
          ]
            .filter(Boolean)
            .join("\n\n")
      });
    } catch {
      // Dismissed.
    }
  }

  async function reportPost() {
    try {
      await reportNativeGroupForumNode({
        groupId,
        postId,
        targetUserId:
          postUserId,
        title,
        body,
        reason:
          "other"
      });

      setStatus(
        "Report submitted."
      );
    } catch (error) {
      setStatus(
        error?.message ||
        "Could not submit report."
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
          <Pressable
            onPress={() =>
              router.back()
            }
          >
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
            <Text
              style={styles.sourceText}
            >
              Read Context
            </Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              votePost(1)
            }
            style={[
              styles.vote,
              postVote === 1 &&
                styles.voteActive
            ]}
          >
            <LitIcon
              name="link"
              active={
                postVote === 1
              }
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
            onPress={() =>
              votePost(-1)
            }
            style={[
              styles.vote,
              postVote === -1 &&
                styles.voteActive
            ]}
          >
            <LitIcon
              name="unlink"
              active={
                postVote === -1
              }
              size={20}
            />
            <Text style={styles.voteText}>
              {postCounts.down}
            </Text>
          </Pressable>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={() => {}}
            style={styles.quickAction}
          >
            <LitIcon
              name="reply"
              size={21}
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
                size={21}
              />
              <Text
                style={styles.quickActionText}
              >
                Report
              </Text>
            </Pressable>
          )}
        </View>

        <TextInput
          value={replyText}
          onChangeText={
            setReplyText
          }
          placeholder="Reply to this discussion..."
          placeholderTextColor="#8B999B"
          multiline
          style={styles.input}
        />

        <Pressable
          disabled={
            !replyText.trim()
          }
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
            style={styles.replyButtonText}
          >
            Reply
          </Text>
        </Pressable>

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      ) : (
        <FlatList
          ref={viewRef}
          data={replies}
          keyExtractor={(item) =>
            item.id
          }
          contentContainerStyle={
            styles.list
          }
          ListHeaderComponent={
            <Text
              style={styles.section}
            >
              Replies
            </Text>
          }
          ListEmptyComponent={
            <Text
              style={styles.muted}
            >
              No replies yet.
            </Text>
          }
          renderItem={({ item }) => {
            const vote =
              replyVotes[
                item.id
              ] || 0;

            return (
              <View
                style={styles.reply}
              >
                <Text
                  style={styles.replyText}
                >
                  {item.body ||
                    "Reply"}
                </Text>

                <View
                  style={styles.replyActions}
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
                      size={17}
                    />
                    <Text
                      style={styles.smallVoteText}
                    >
                      {Number(
                        item.forumUpCount ||
                        0
                      )}
                    </Text>
                  </Pressable>

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
                      size={17}
                    />
                    <Text
                      style={styles.smallVoteText}
                    >
                      {Number(
                        item.forumDownCount ||
                        0
                      )}
                    </Text>
                  </Pressable>

                  <Text
                    style={styles.replyScore}
                  >
                    Score{" "}
                    {Number(
                      item.forumScore ||
                      0
                    )}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <BottomNav
        active="groups"
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        BRAND.background
    },
    header: {
      backgroundColor:
        BRAND.surface,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        BRAND.line
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between"
    },
    back: {
      color:
        BRAND.tealDark,
      fontWeight: "900"
    },
    iconButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center"
    },
    kicker: {
      color:
        BRAND.tealDark,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.1,
      marginTop: 12
    },
    title: {
      color:
        BRAND.ink,
      fontSize: 24,
      fontWeight: "900",
      marginTop: 6
    },
    body: {
      color:
        BRAND.muted,
      lineHeight: 21,
      marginTop: 8
    },
    sourceButton: {
      minHeight: 42,
      flexDirection: "row",
      gap: 7,
      alignItems: "center",
      alignSelf:
        "flex-start",
      marginTop: 12
    },
    sourceText: {
      color:
        BRAND.tealDark,
      fontSize: 12,
      fontWeight: "900"
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      marginTop: 14
    },
    vote: {
      flex: 1,
      minHeight: 44,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        BRAND.line
    },
    voteActive: {
      borderColor:
        BRAND.teal,
      backgroundColor:
        "#E8F7F6"
    },
    voteText: {
      color:
        BRAND.ink,
      fontSize: 12,
      fontWeight: "900"
    },
    score: {
      minWidth: 36,
      textAlign: "center",
      color:
        BRAND.ink,
      fontWeight: "900",
      fontSize: 15
    },
    quickActions: {
      flexDirection: "row",
      justifyContent:
        "center",
      gap: 24,
      borderTopWidth: 1,
      borderTopColor:
        BRAND.line,
      marginTop: 14,
      paddingTop: 12
    },
    quickAction: {
      minWidth: 76,
      alignItems: "center",
      justifyContent: "center",
      gap: 3
    },
    quickActionText: {
      color:
        BRAND.muted,
      fontSize: 10,
      fontWeight: "800"
    },
    input: {
      minHeight: 72,
      marginTop: 12,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 13,
      padding: 10,
      textAlignVertical:
        "top",
      color:
        BRAND.ink
    },
    replyButton: {
      minHeight: 44,
      marginTop: 8,
      backgroundColor:
        BRAND.yellow,
      borderRadius: 13,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      justifyContent: "center"
    },
    disabled: {
      opacity: 0.45
    },
    replyButtonText: {
      color:
        BRAND.ink,
      fontWeight: "900"
    },
    status: {
      color:
        "#6D5A16",
      backgroundColor:
        "#FFF8DF",
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
      color:
        BRAND.ink,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 10
    },
    muted: {
      color:
        BRAND.muted
    },
    reply: {
      backgroundColor:
        BRAND.surface,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10
    },
    replyText: {
      color:
        BRAND.ink,
      lineHeight: 20
    },
    replyActions: {
      flexDirection: "row",
      gap: 7,
      alignItems: "center",
      marginTop: 10
    },
    smallVote: {
      minWidth: 52,
      height: 34,
      paddingHorizontal: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
      justifyContent: "center"
    },
    smallVoteText: {
      color:
        BRAND.ink,
      fontSize: 10,
      fontWeight: "900"
    },
    replyScore: {
      color:
        BRAND.muted,
      fontSize: 10
    }
  });
