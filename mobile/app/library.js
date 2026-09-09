import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { router } from "expo-router";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import LitIcon from "../components/LitIcon";

import {
  getNativeLibraryBundle
} from "../services/library";

import {
  cancelNativeFriendRequest,
  findNativeReaderByUsername,
  removeNativeFriend,
  respondNativeFriendRequest,
  sendNativeFriendRequest
} from "../services/librarySocial";

import {
  getNativeProfileBadges
} from "../services/profileBadges";

import {
  LIBRARY_TABS
} from "../../shared/libraryTabs";

import {
  profileAvatarUrl
} from "../../shared/profileAvatars";

import {
  groupAvatarUrl
} from "../../shared/groupAvatars";

import { BRAND } from "../../shared/brand";

export default function LibraryScreen() {
  const [tab, setTab] =
    useState("timeline");
  const [bundle, setBundle] =
    useState(null);
  const [loading, setLoading] =
    useState(true);

  const [friendModal, setFriendModal] =
    useState(false);
  const [friendQuery, setFriendQuery] =
    useState("");
  const [friendResult, setFriendResult] =
    useState(null);
  const [friendStatus, setFriendStatus] =
    useState("");
  const [friendSearching, setFriendSearching] =
    useState(false);

  async function load() {
    try {
      setLoading(true);
      setBundle(
        await getNativeLibraryBundle()
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const items = useMemo(() => {
    if (!bundle) return [];

    if (tab === "timeline") {
      return bundle.timeline;
    }

    if (tab === "journal") {
      return bundle.journal;
    }

    if (tab === "friends") {
      return bundle.friends;
    }

    if (tab === "groups") {
      return bundle.groups;
    }

    return [
      ...bundle.savedBooks.map(
        (item) => ({
          ...item,
          savedType: "book"
        })
      ),
      ...bundle.savedChain.map(
        (item) => ({
          ...item,
          savedType: "chain"
        })
      )
    ];
  }, [bundle, tab]);

  const badges =
    getNativeProfileBadges(bundle);

  function openItem(item) {
    if (tab === "journal") {
      router.push({
        pathname:
          "/journal/[entryId]",
        params: {
          entryId: item.id
        }
      });

      return;
    }

    if (tab === "groups") {
      router.push({
        pathname:
          "/group/[groupId]",
        params: {
          groupId: item.id,
          name:
            item.name || "Group",
          role:
            item.membership?.role ||
            ""
        }
      });

      return;
    }

    const bookLike =
      tab === "timeline" ||
      (
        tab === "saved" &&
        item.savedType === "book"
      );

    if (bookLike) {
      router.push({
        pathname:
          "/reader/[bookId]",
        params: {
          bookId:
            String(
              item.bookId ||
              item.id
            ),
          title:
            item.title || "Book",
          author:
            item.author || ""
        }
      });
    }
  }

  async function searchFriend() {
    try {
      setFriendSearching(true);
      setFriendStatus("");
      setFriendResult(null);

      const result =
        await findNativeReaderByUsername(
          friendQuery
        );

      setFriendResult(result);

      if (!result) {
        setFriendStatus(
          "No reader found."
        );
      }
    } catch (error) {
      setFriendStatus(
        error?.message ||
          "Could not search."
      );
    } finally {
      setFriendSearching(false);
    }
  }

  async function addFriend() {
    if (!friendResult?.id) return;

    try {
      await sendNativeFriendRequest(
        friendResult.id
      );

      setFriendStatus(
        "Friend request sent."
      );
      await load();
    } catch (error) {
      setFriendStatus(
        error?.message ||
          "Could not send request."
      );
    }
  }

  async function respond(
    request,
    accept
  ) {
    try {
      await respondNativeFriendRequest(
        request.otherUserId,
        accept
      );

      await load();
    } catch (error) {
      setFriendStatus(
        error?.message ||
          "Could not update request."
      );
    }
  }

  const profileImage =
    profileAvatarUrl(
      bundle?.profile?.avatar
    ) ||
    bundle?.profile?.photoURL ||
    "";

  const profileStats = [
    {
      id: "books",
      icon: "read-context",
      value: bundle?.timeline?.length || 0,
      label: "Books"
    },
    {
      id: "notes",
      icon: "save",
      value: bundle?.journal?.length || 0,
      label: "Notes"
    },
    {
      id: "friends",
      icon: "reply",
      value: bundle?.friends?.length || 0,
      label: "Friends"
    },
    {
      id: "groups",
      icon: "groups",
      value: bundle?.groups?.length || 0,
      label: "Groups"
    }
  ];

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
      <AppHeader
        title="Library"
        subtitle={
          bundle?.profile?.displayName ||
          bundle?.profile?.username ||
          "Your Lit Chain"
        }
      />

      <View style={styles.tabs}>
        {LIBRARY_TABS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              setTab(item.id)
            }
            style={[
              styles.tab,
              tab === item.id &&
                styles.tabActive
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                tab === item.id &&
                  styles.tabTextActive
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={items}
        key={tab}
        keyExtractor={(item, index) =>
          `${tab}_${item.id || index}`
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {tab === "timeline" &&
              bundle?.profile && (
                <>
                  <Pressable
                    onPress={() =>
                      router.push(
                        "/profile/edit"
                      )
                    }
                    style={
                      styles.profileCard
                    }
                  >
                    {profileImage ? (
                      <Image
                        source={{
                          uri:
                            profileImage
                        }}
                        style={
                          styles.avatar
                        }
                      />
                    ) : (
                      <View
                        style={
                          styles.avatarFallback
                        }
                      >
                        <Text
                          style={
                            styles.avatarInitial
                          }
                        >
                          {String(
                            bundle.profile
                              .displayName ||
                              bundle.profile
                                .username ||
                              "L"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View
                      style={
                        styles.profileCopy
                      }
                    >
                      <Text
                        style={
                          styles.profileName
                        }
                      >
                        {bundle.profile
                          .displayName ||
                          bundle.profile
                            .username ||
                          "Lit Chain Reader"}
                      </Text>

                      {!!bundle.profile
                        .about && (
                        <Text
                          numberOfLines={2}
                          style={
                            styles.profileAbout
                          }
                        >
                          {
                            bundle.profile
                              .about
                          }
                        </Text>
                      )}

                      <Text
                        style={
                          styles.editHint
                        }
                      >
                        Tap to edit profile
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.profileStats}>
                    {profileStats.map(
                      (stat) => (
                        <View
                          key={stat.id}
                          style={styles.stat}
                        >
                          <LitIcon
                            name={stat.icon}
                            size={19}
                          />
                          <Text style={styles.statNumber}>
                            {stat.value}
                          </Text>
                          <Text style={styles.statLabel}>
                            {stat.label}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                </>
              )}

            {tab === "friends" && (
              <View
                style={
                  styles.sectionActions
                }
              >
                <Pressable
                  onPress={() =>
                    setFriendModal(true)
                  }
                  style={
                    styles.primaryAction
                  }
                >
                  <Text
                    style={
                      styles.primaryActionText
                    }
                  >
                    + Find Reader
                  </Text>
                </Pressable>

                {bundle?.friendBundle
                  ?.incoming?.map(
                    (request) => (
                      <View
                        key={
                          request.id
                        }
                        style={
                          styles.requestCard
                        }
                      >
                        <Text
                          style={
                            styles.requestName
                          }
                        >
                          {request
                            .profile
                            ?.displayName ||
                            request
                              .profile
                              ?.username ||
                            "Reader"}
                        </Text>

                        <View
                          style={
                            styles.requestActions
                          }
                        >
                          <Pressable
                            onPress={() =>
                              respond(
                                request,
                                true
                              )
                            }
                          >
                            <Text
                              style={
                                styles.accept
                              }
                            >
                              Accept
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              respond(
                                request,
                                false
                              )
                            }
                          >
                            <Text
                              style={
                                styles.decline
                              }
                            >
                              Decline
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    )
                  )}

                {bundle?.friendBundle
                  ?.outgoing?.map(
                    (request) => (
                      <View
                        key={
                          request.id
                        }
                        style={
                          styles.requestCard
                        }
                      >
                        <Text
                          style={
                            styles.requestName
                          }
                        >
                          Request sent to{" "}
                          {request
                            .profile
                            ?.displayName ||
                            request
                              .profile
                              ?.username ||
                            "Reader"}
                        </Text>

                        <Pressable
                          onPress={async () => {
                            await cancelNativeFriendRequest(
                              request.otherUserId
                            );
                            await load();
                          }}
                        >
                          <Text
                            style={
                              styles.decline
                            }
                          >
                            Cancel
                          </Text>
                        </Pressable>
                      </View>
                    )
                  )}
              </View>
            )}

            {tab === "groups" && (
              <View
                style={
                  styles.groupActions
                }
              >
                <Pressable
                  onPress={() =>
                    router.push(
                      "/groups"
                    )
                  }
                  style={
                    styles.secondaryAction
                  }
                >
                  <Text
                    style={
                      styles.secondaryActionText
                    }
                  >
                    Discover Groups
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    router.push(
                      "/group/create"
                    )
                  }
                  style={
                    styles.primaryAction
                  }
                >
                  <Text
                    style={
                      styles.primaryActionText
                    }
                  >
                    + Create Group
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>
              Nothing here yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const friendImage =
            tab === "friends"
              ? (
                  profileAvatarUrl(
                    item.avatar
                  ) ||
                  item.photoURL ||
                  ""
                )
              : "";

          const groupImage =
            tab === "groups"
              ? groupAvatarUrl(
                  item.avatar
                )
              : "";

          return (
            <Pressable
              onPress={() =>
                openItem(item)
              }
              style={styles.card}
            >
              {!!friendImage && (
                <Image
                  source={{
                    uri: friendImage
                  }}
                  style={
                    styles.smallAvatar
                  }
                />
              )}

              {!!groupImage && (
                <Image
                  source={{
                    uri: groupImage
                  }}
                  style={
                    styles.groupAvatar
                  }
                />
              )}

              <Text style={styles.eyebrow}>
                {tab.toUpperCase()}
              </Text>

              <Text style={styles.title}>
                {item.title ||
                  item.name ||
                  item.displayName ||
                  item.username ||
                  "Lit Chain item"}
              </Text>

              {!!item.author && (
                <Text
                  style={
                    styles.secondary
                  }
                >
                  {item.author}
                </Text>
              )}

              {tab === "timeline" && (
                <Text
                  style={styles.detail}
                >
                  {Math.round(
                    Number(
                      item.percentComplete
                    ) || 0
                  )}
                  % complete · Tap to read
                </Text>
              )}

              {tab === "journal" && (
                <Text
                  numberOfLines={3}
                  style={styles.detail}
                >
                  ¶
                  {Number(
                    item.paragraphIndex ||
                    0
                  ) + 1}
                  {" · "}
                  {item.note ||
                    "Tap to open note"}
                </Text>
              )}

              {tab === "friends" && (
                <View
                  style={
                    styles.friendRow
                  }
                >
                  <Text
                    style={styles.detail}
                  >
                    Friend
                  </Text>

                  <Pressable
                    onPress={async () => {
                      await removeNativeFriend(
                        item.otherUserId ||
                        item.id
                      );
                      await load();
                    }}
                  >
                    <Text
                      style={
                        styles.removeFriend
                      }
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              )}

              {tab === "groups" && (
                <Text
                  style={styles.detail}
                >
                  {item.membership?.role ||
                    (
                      item.type ===
                      "class"
                        ? "Class"
                        : "Reading Group"
                    )}
                  {" · Tap to open"}
                </Text>
              )}
            </Pressable>
          );
        }}
      />

      <BottomNav active="library" />

      <Modal
        visible={friendModal}
        animationType="slide"
        onRequestClose={() =>
          setFriendModal(false)
        }
      >
        <SafeAreaView style={styles.friendModalPage}>
          <View style={styles.friendModalHeader}>
            <Text style={styles.popupTitle}>
              Find Reader
            </Text>
            <Pressable
              onPress={() =>
                setFriendModal(false)
              }
            >
              <Text style={styles.closeText}>
                ×
              </Text>
            </Pressable>
          </View>

          <View style={styles.friendPopup}>
            <TextInput
              value={friendQuery}
              onChangeText={setFriendQuery}
              placeholder="Exact username"
              autoCapitalize="none"
              style={styles.searchInput}
              onSubmitEditing={
                searchFriend
              }
            />

            <Pressable
              onPress={searchFriend}
              style={
                styles.primaryAction
              }
            >
              <Text
                style={
                  styles.primaryActionText
                }
              >
                Search
              </Text>
            </Pressable>

            {friendSearching && (
              <ActivityIndicator
                size="large"
                style={{ marginTop: 24 }}
              />
            )}

            {!!friendResult && (
              <View
                style={
                  styles.friendResult
                }
              >
                <Text
                  style={
                    styles.requestName
                  }
                >
                  {friendResult
                    .displayName ||
                    friendResult
                      .username ||
                    "Reader"}
                </Text>

                <Pressable
                  onPress={addFriend}
                >
                  <Text
                    style={styles.accept}
                  >
                    Add Friend
                  </Text>
                </Pressable>
              </View>
            )}

            {!!friendStatus && (
              <Text
                style={
                  styles.friendStatus
                }
              >
                {friendStatus}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  center: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  tabs: {
    minHeight: 50,
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 7,
    gap: 4,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 35,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: BRAND.teal
  },
  tabText: {
    color: BRAND.muted,
    fontWeight: "800",
    fontSize: 10
  },
  tabTextActive: {
    color: "#FFF"
  },
  list: {
    padding: 14,
    paddingBottom: 80
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 16,
    marginBottom: 10
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900"
  },
  profileCopy: {
    flex: 1,
    marginLeft: 14
  },
  profileName: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 21
  },
  profileAbout: {
    color: BRAND.muted,
    marginTop: 4
  },
  editHint: {
    color: BRAND.tealDark,
    marginTop: 7,
    fontWeight: "800",
    fontSize: 11
  },
  profileStats: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12
  },
  stat: {
    flex: 1,
    minHeight: 72,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8
  },
  statNumber: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  statLabel: {
    color: BRAND.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2
  },
  badges: {
    gap: 8,
    paddingBottom: 12
  },
  badge: {
    minWidth: 118,
    backgroundColor: "#FFF8DF",
    borderRadius: 14,
    padding: 11
  },
  badgeTitle: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  badgeDetail: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 3
  },
  sectionActions: {
    marginBottom: 12
  },
  groupActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  primaryAction: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryActionText: {
    color: "#FFF",
    fontWeight: "900"
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryActionText: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  requestCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 12,
    marginTop: 8
  },
  requestName: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  requestActions: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8
  },
  accept: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  decline: {
    color: BRAND.danger,
    fontWeight: "900"
  },
  card: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12
  },
  smallAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 10
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginBottom: 10
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6
  },
  secondary: {
    color: BRAND.muted,
    marginTop: 4
  },
  detail: {
    color: BRAND.tealDark,
    marginTop: 12,
    fontWeight: "800"
  },
  friendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  removeFriend: {
    color: BRAND.danger,
    fontWeight: "900",
    marginTop: 12
  },
  empty: {
    color: BRAND.muted
  },
  friendModalPage: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  friendModalHeader: {
    minHeight: 64,
    paddingHorizontal: 18,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  closeText: {
    color: BRAND.ink,
    fontSize: 30
  },
  friendPopup: {
    flex: 1,
    backgroundColor: BRAND.background,
    padding: 18
  },
  popupTitle: {
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12
  },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10
  },
  friendResult: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  friendStatus: {
    color: BRAND.muted,
    textAlign: "center",
    marginTop: 12
  }
});
