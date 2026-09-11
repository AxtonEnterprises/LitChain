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
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { router } from "expo-router";
import { signOut } from "firebase/auth";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import LitIcon from "../components/LitIcon";

import {
  getNativeLibraryBundle
} from "../services/library";

import {
  cancelNativeFriendRequest,
  removeNativeFriend,
  respondNativeFriendRequest,
  searchNativeReadersByUsername,
  sendNativeFriendRequest
} from "../services/librarySocial";

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
import { auth } from "../lib/firebase";
import {
  getMyNativePlatformRole
} from "../services/platformModeration";

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
  const [friendResults, setFriendResults] =
    useState([]);
  const [friendStatus, setFriendStatus] =
    useState("");
  const [friendSearching, setFriendSearching] =
    useState(false);
  const [friendBusyId, setFriendBusyId] =
    useState("");

  const [platformRole, setPlatformRole] =
    useState(null);

  async function load() {
    try {
      setLoading(true);

      const [nextBundle, nextRole] =
        await Promise.all([
          getNativeLibraryBundle(),
          getMyNativePlatformRole().catch(() => null)
        ]);

      setBundle(nextBundle);
      setPlatformRole(nextRole);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await signOut(auth);
    router.replace("/login");
  }

  useEffect(() => {
    void load();
  }, []);

  const items = useMemo(() => {
    if (!bundle) return [];

    if (tab === "timeline") {
      return bundle.timeline || [];
    }

    if (tab === "journal") {
      return bundle.journal || [];
    }

    if (tab === "friends") {
      return bundle.friends || [];
    }

    if (tab === "groups") {
      return bundle.groups || [];
    }

    return [
      ...(bundle.savedBooks || []).map(
        (item) => ({
          ...item,
          savedType: "book"
        })
      ),
      ...(bundle.savedChain || []).map(
        (item) => ({
          ...item,
          savedType: "chain"
        })
      )
    ];
  }, [bundle, tab]);

  function openItem(item) {
    if (tab === "journal") {
      router.push({
        pathname: "/journal/[entryId]",
        params: {
          entryId: item.id
        }
      });
      return;
    }

    if (tab === "groups") {
      if (item.type === "class") {
        router.push({
          pathname: "/class/[classId]",
          params: {
            classId: item.id,
            name: item.name || "Class",
            role:
              item.membership?.role || ""
          }
        });
      } else {
        router.push({
          pathname: "/group/[groupId]",
          params: {
            groupId: item.id,
            name: item.name || "Group",
            role:
              item.membership?.role || ""
          }
        });
      }

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
        pathname: "/reader/[bookId]",
        params: {
          bookId: String(
            item.bookId || item.id
          ),
          title: item.title || "Book",
          author: item.author || ""
        }
      });
    }
  }

  async function searchFriend() {
    const term = friendQuery.trim();

    if (term.length < 2) {
      setFriendStatus(
        "Enter at least 2 characters."
      );
      setFriendResults([]);
      return;
    }

    try {
      setFriendSearching(true);
      setFriendStatus("");

      const results =
        await searchNativeReadersByUsername(
          term,
          15
        );

      const selfId =
        bundle?.profile?.uid ||
        bundle?.profile?.id ||
        "";

      const currentFriendIds = new Set(
        (bundle?.friends || []).map(
          (friend) =>
            String(
              friend.otherUserId ||
              friend.id
            )
        )
      );

      const filtered = results.filter(
        (reader) =>
          String(
            reader.userId || reader.id
          ) !== String(selfId) &&
          !currentFriendIds.has(
            String(
              reader.userId || reader.id
            )
          )
      );

      setFriendResults(filtered);

      if (!filtered.length) {
        setFriendStatus(
          "No matching readers found."
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

  async function addFriend(reader) {
    const userId = String(
      reader.userId || reader.id || ""
    );

    if (!userId) return;

    try {
      setFriendBusyId(userId);

      await sendNativeFriendRequest(
        userId
      );

      setFriendStatus(
        `Friend request sent to ${
          reader.displayName ||
          reader.username ||
          "Reader"
        }.`
      );

      setFriendResults((current) =>
        current.filter(
          (item) =>
            String(
              item.userId || item.id
            ) !== userId
        )
      );

      await load();
    } catch (error) {
      setFriendStatus(
        error?.message ||
          "Could not send request."
      );
    } finally {
      setFriendBusyId("");
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
                          uri: profileImage
                        }}
                        style={styles.avatar}
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

                  <View
                    style={
                      styles.profileStats
                    }
                  >
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
                          <Text
                            style={
                              styles.statNumber
                            }
                          >
                            {stat.value}
                          </Text>
                          <Text
                            style={
                              styles.statLabel
                            }
                          >
                            {stat.label}
                          </Text>
                        </View>
                      )
                    )}
                  </View>

                  <View style={styles.accountActions}>
                    {platformRole?.isPlatformModerator && (
                      <Pressable
                        onPress={() =>
                          router.push("/moderation")
                        }
                        style={styles.accountButton}
                      >
                        <Text style={styles.accountButtonText}>
                          Platform Moderation
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={logout}
                      style={[
                        styles.accountButton,
                        styles.signOutButton
                      ]}
                    >
                      <Text style={styles.signOutText}>
                        Sign Out
                      </Text>
                    </Pressable>
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
                  onPress={() => {
                    setFriendModal(true);
                    setFriendStatus("");
                    setFriendResults([]);
                  }}
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
                        key={request.id}
                        style={
                          styles.requestCard
                        }
                      >
                        <Text
                          style={
                            styles.requestName
                          }
                        >
                          {request.profile
                            ?.displayName ||
                            request.profile
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
                        key={request.id}
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
                          {request.profile
                            ?.displayName ||
                            request.profile
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
                  {item.type === "class"
                    ? "Class"
                    : item.membership?.role ||
                      "Reading Group"}
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
        <SafeAreaView
          style={
            styles.friendModalPage
          }
        >
          <View
            style={
              styles.friendModalHeader
            }
          >
            <Text
              style={styles.popupTitle}
            >
              Find Reader
            </Text>

            <Pressable
              onPress={() =>
                setFriendModal(false)
              }
              style={styles.closeButton}
            >
              <Text
                style={styles.closeText}
              >
                ×
              </Text>
            </Pressable>
          </View>

          <View style={styles.friendPopup}>
            <Text style={styles.searchHelp}>
              Search by partial or full username.
            </Text>

            <View style={styles.friendSearchRow}>
              <TextInput
                autoFocus
                value={friendQuery}
                onChangeText={setFriendQuery}
                placeholder="Username"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
                onSubmitEditing={
                  searchFriend
                }
              />

              <Pressable
                disabled={
                  friendSearching ||
                  friendQuery.trim().length < 2
                }
                onPress={searchFriend}
                style={[
                  styles.friendSearchButton,
                  (
                    friendSearching ||
                    friendQuery.trim().length < 2
                  ) &&
                    styles.friendSearchButtonDisabled
                ]}
              >
                <Text
                  style={
                    styles.primaryActionText
                  }
                >
                  {friendSearching
                    ? "…"
                    : "Search"}
                </Text>
              </Pressable>
            </View>

            {friendSearching && (
              <ActivityIndicator
                size="small"
                style={{ marginTop: 14 }}
              />
            )}

            <FlatList
              data={friendResults}
              keyExtractor={(item) =>
                String(
                  item.userId || item.id
                )
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.friendResultsList
              }
              renderItem={({ item }) => {
                const userId = String(
                  item.userId || item.id
                );

                return (
                  <View
                    style={
                      styles.friendResult
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={
                          styles.requestName
                        }
                      >
                        {item.displayName ||
                          item.username ||
                          "Reader"}
                      </Text>

                      {!!item.username && (
                        <Text
                          style={
                            styles.resultUsername
                          }
                        >
                          @{item.username}
                        </Text>
                      )}
                    </View>

                    <Pressable
                      disabled={
                        friendBusyId === userId
                      }
                      onPress={() =>
                        addFriend(item)
                      }
                      style={
                        styles.addFriendButton
                      }
                    >
                      <Text
                        style={
                          styles.addFriendButtonText
                        }
                      >
                        Add
                      </Text>
                    </Pressable>
                  </View>
                );
              }}
            />

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
  sectionActions: {
    marginBottom: 12
  },
  groupActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  primaryAction: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
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
  popupTitle: {
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  closeText: {
    color: BRAND.ink,
    fontSize: 30
  },
  friendPopup: {
    flex: 1,
    padding: 18
  },
  searchHelp: {
    color: BRAND.muted,
    fontSize: 12,
    marginBottom: 10
  },
  friendSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: BRAND.ink
  },
  friendSearchButton: {
    width: 96,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  friendSearchButtonDisabled: {
    opacity: 0.45
  },
  friendResultsList: {
    paddingTop: 12,
    paddingBottom: 30
  },
  friendResult: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  resultUsername: {
    color: BRAND.muted,
    fontSize: 12,
    marginTop: 2
  },
  addFriendButton: {
    backgroundColor: BRAND.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  addFriendButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  friendStatus: {
    color: BRAND.muted,
    textAlign: "center",
    marginTop: 12
  }
  accountActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 8
  },
  accountButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: BRAND.teal,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  accountButtonText: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 12
  },
  signOutButton: {
    borderColor: BRAND.line
  },
  signOutText: {
    color: BRAND.danger,
    fontWeight: "900",
    fontSize: 12
  },
});
