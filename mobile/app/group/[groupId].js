import {
  useEffect,
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

import BottomNav from "../../components/BottomNav";
import LitIcon from "../../components/LitIcon";

import {
  getNativeGroupForumDisplay
} from "../../services/groupDisplay";

import { BRAND } from "../../../shared/brand";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString();
}

export default function Group() {
  const params = useLocalSearchParams();

  const id = String(params.groupId || "");
  const name = String(params.name || "Group");
  const role = String(params.role || "");

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [viewportHeight, setViewportHeight] =
    useState(0);
  const [activeIndex, setActiveIndex] =
    useState(0);

  async function load() {
    try {
      setLoading(true);
      setPosts(
        await getNativeGroupForumDisplay(id)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const manage = [
    "owner",
    "admin",
    "moderator",
    "teacher",
    "aid",
    "aide"
  ].includes(role.toLowerCase());

  const canDiscuss =
    Boolean(role);

  function open(post) {
    router.push({
      pathname: "/group/post",
      params: {
        groupId: id,
        postId: post.id,
        title:
          post.title || "Discussion",
        body:
          post.body ||
          post.note ||
          "",
        name,
        role,
        userId:
          post.userId ||
          post.authorId ||
          "",
        authorName:
          post.authorName ||
          post.displayName ||
          post.username ||
          "",
        createdAt:
          post.createdAtISO ||
          post.createdAt ||
          "",
        sourceBookId:
          post.sourceBookId ||
          post.bookId ||
          "",
        sourceTitle:
          post.sourceTitle ||
          post.bookTitle ||
          "",
        sourceAuthor:
          post.sourceAuthor ||
          post.bookAuthor ||
          "",
        sourceParagraphIndex:
          String(
            post.sourceParagraphIndex ??
            post.paragraphIndex ??
            0
          ),
        paragraphPreview:
          post.paragraphPreview ||
          post.sourceText ||
          "",
        forumUpCount:
          String(
            Number(
              post.forumUpCount || 0
            )
          ),
        forumDownCount:
          String(
            Number(
              post.forumDownCount || 0
            )
          ),
        forumScore:
          String(
            Number(
              post.forumScore || 0
            )
          ),
        locked:
          post.locked ? "1" : "0",
        pinned:
          post.pinned ? "1" : "0"
      }
    });
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
        <View style={styles.headerTop}>
          <Pressable
            onPress={() =>
              router.replace("/groups")
            }
          >
            <Text style={styles.back}>
              ‹ Groups
            </Text>
          </Pressable>

          <View style={styles.headerActions}>
            {canDiscuss && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      "/group/new-discussion",
                    params: {
                      groupId: id,
                      name,
                      role
                    }
                  })
                }
              >
                <Text
                  style={
                    styles.newDiscussion
                  }
                >
                  + Discussion
                </Text>
              </Pressable>
            )}

            {manage && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      "/group/settings",
                    params: {
                      groupId: id,
                      name,
                      role
                    }
                  })
                }
              >
                <Text
                  style={styles.settings}
                >
                  Settings
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.title}>
          {name}
        </Text>

        <Text style={styles.subtitle}>
          Swipe vertically between discussions
        </Text>
      </View>

      <View
        style={styles.viewport}
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
            data={posts}
            key={`posts-${viewportHeight}`}
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

              setActiveIndex(next);
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
                <Text style={styles.empty}>
                  No discussions yet.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const author =
                item.authorName ||
                item.displayName ||
                item.username ||
                "";

              const date = formatDate(
                item.createdAtISO ||
                item.createdAt
              );

              const preview =
                item.paragraphPreview ||
                item.sourceText ||
                "";

              return (
                <View
                  style={[
                    styles.page,
                    {
                      height:
                        viewportHeight
                    }
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      open(item)
                    }
                    style={styles.card}
                  >
                    <View
                      style={
                        styles.metaRow
                      }
                    >
                      <Text
                        style={
                          styles.kicker
                        }
                      >
                        GROUP DISCUSSION
                      </Text>

                      <Text
                        style={
                          styles.flags
                        }
                      >
                        {item.pinned
                          ? "PINNED "
                          : ""}
                        {item.locked
                          ? "LOCKED"
                          : ""}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.postTitle
                      }
                    >
                      {item.title ||
                        "Discussion"}
                    </Text>

                    <Text
                      style={styles.byline}
                    >
                      {author
                        ? `Posted by ${author}`
                        : "Posted by Reader"}
                      {date
                        ? ` · ${date}`
                        : ""}
                    </Text>

                    {!!preview && (
                      <View
                        style={
                          styles.context
                        }
                      >
                        <Text
                          style={
                            styles.contextLabel
                          }
                        >
                          REFERENCED PARAGRAPH ¶
                          {Number(
                            item.sourceParagraphIndex ||
                              0
                          ) + 1}
                        </Text>

                        <Text
                          numberOfLines={7}
                          style={
                            styles.contextText
                          }
                        >
                          “{preview}”
                        </Text>
                      </View>
                    )}

                    {!!item.body && (
                      <Text
                        numberOfLines={10}
                        style={styles.body}
                      >
                        {item.body}
                      </Text>
                    )}

                    <View
                      style={
                        styles.voteSummary
                      }
                    >
                      <View
                        style={
                          styles.voteSide
                        }
                      >
                        <LitIcon
                          name="link"
                          size={20}
                        />
                        <Text
                          style={
                            styles.voteText
                          }
                        >
                          {Number(
                            item.forumUpCount ||
                              0
                          )}
                        </Text>
                      </View>

                      <Text
                        style={styles.score}
                      >
                        {Number(
                          item.forumScore ||
                            0
                        )}
                      </Text>

                      <View
                        style={
                          styles.voteSide
                        }
                      >
                        <LitIcon
                          name="unlink"
                          size={20}
                        />
                        <Text
                          style={
                            styles.voteText
                          }
                        >
                          {Number(
                            item.forumDownCount ||
                              0
                          )}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hint}>
                      Tap to open discussion ›
                    </Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}

        {posts.length > 1 && (
          <View
            pointerEvents="none"
            style={styles.verticalDots}
          >
            {posts
              .slice(0, 12)
              .map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.dot,
                    index ===
                      activeIndex &&
                      styles.dotActive
                  ]}
                />
              ))}
          </View>
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
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24
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
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between"
  },
  headerActions: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  newDiscussion: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  settings: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 5
  },
  subtitle: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 3
  },
  viewport: {
    flex: 1,
    position: "relative"
  },
  page: {
    padding: 16,
    justifyContent: "flex-start"
  },
  card: {
    flex: 1,
    backgroundColor:
      BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 22,
    padding: 22
  },
  metaRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center"
  },
  kicker: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  flags: {
    color: BRAND.muted,
    fontSize: 9,
    fontWeight: "900"
  },
  postTitle: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 10
  },
  byline: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 6
  },
  context: {
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor:
      BRAND.teal,
    paddingLeft: 12
  },
  contextLabel: {
    color: BRAND.tealDark,
    fontSize: 9,
    fontWeight: "900",
    marginBottom: 7
  },
  contextText: {
    color: BRAND.ink,
    fontStyle: "italic",
    lineHeight: 20
  },
  body: {
    color: BRAND.muted,
    lineHeight: 21,
    marginTop: 16
  },
  voteSummary: {
    marginTop: "auto",
    paddingTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between"
  },
  voteSide: {
    minWidth: 70,
    flexDirection: "row",
    gap: 7,
    alignItems: "center"
  },
  voteText: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 12
  },
  score: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 16
  },
  hint: {
    color: BRAND.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 14
  },
  empty: {
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
    backgroundColor:
      "#C8C4BC"
  },
  dotActive: {
    width: 8,
    height: 8,
    backgroundColor:
      BRAND.tealDark
  }
});
