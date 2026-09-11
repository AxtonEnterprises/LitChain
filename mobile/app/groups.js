import { useCallback, useEffect, useMemo, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { getNativeGroups } from "../services/social";
import {
  cancelNativeGroupJoinRequest,
  getNativeDiscoverableGroups,
  getNativeIncomingGroupInvites,
  joinNativeGroup,
  respondNativeGroupInvite
} from "../services/groupMembership";
import { classRoleLabel } from "../services/classFoundation";
import { groupAvatarUrl } from "../../shared/groupAvatars";
import { BRAND } from "../../shared/brand";

const VIEWS = [
  ["mine", "My Groups"],
  ["classes", "My Classes"],
  ["discoverable", "Discover"]
];

export default function Groups() {
  const [bundle, setBundle] = useState({
    mine: [],
    classes: [],
    discoverable: []
  });
  const [invites, setInvites] = useState([]);
  const [view, setView] = useState("mine");
  const [queryText, setQueryText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [status, setStatus] = useState("");
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setStatus("");

      const [
        nativeBundle,
        discoverable,
        incomingInvites
      ] = await Promise.all([
        getNativeGroups(),
        getNativeDiscoverableGroups(),
        getNativeIncomingGroupInvites()
      ]);

      setBundle({
        ...nativeBundle,
        discoverable
      });

      setInvites(incomingInvites);
    } catch (error) {
      setStatus(
        error?.message ||
          "Groups could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  /*
   * Critical for cross-device/PWA sync:
   * returning to the app or this screen reloads current memberships.
   */
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [])
  );

  const groups = useMemo(() => {
    const source = bundle[view] || [];
    const term = queryText.trim().toLowerCase();

    if (!term) return source;

    return source.filter((group) =>
      [
        group.name,
        group.description,
        group.type
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term)
        )
    );
  }, [bundle, view, queryText]);

  useEffect(() => {
    setActiveIndex(0);
  }, [view, queryText]);

  function open(item) {
    if (!item.membership) return;

    if (item.type === "class") {
      router.push({
        pathname: "/class/[classId]",
        params: {
          classId: item.id,
          name: item.name || "Class",
          role: item.membership?.role || "",
          avatar: item.avatar || "",
          description: item.description || ""
        }
      });
      return;
    }

    router.push({
      pathname: "/group/[groupId]",
      params: {
        groupId: item.id,
        name: item.name || "Group",
        role: item.membership?.role || "",
        avatar: item.avatar || "",
        description: item.description || ""
      }
    });
  }

  function create() {
    router.push({
      pathname: "/group/create",
      params: {
        type:
          view === "classes"
            ? "class"
            : "group"
      }
    });
  }

  async function join(item) {
    try {
      setBusyId(String(item.id));

      const result =
        await joinNativeGroup(item);

      setStatus(
        result.status === "joined"
          ? `Joined ${item.name}.`
          : `Join request sent to ${item.name}.`
      );

      await load();

      if (result.status === "joined") {
        setView(
          item.type === "class"
            ? "classes"
            : "mine"
        );
      }
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not join this item."
      );
    } finally {
      setBusyId("");
    }
  }

  async function cancel(item) {
    try {
      setBusyId(String(item.id));
      await cancelNativeGroupJoinRequest(item.id);
      setStatus("Join request canceled.");
      await load();
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not cancel the request."
      );
    } finally {
      setBusyId("");
    }
  }

  async function respondInvite(invite, accept) {
    const groupId = String(
      invite.groupId ||
      invite.group?.id ||
      ""
    );

    try {
      setBusyId(`invite_${groupId}`);

      await respondNativeGroupInvite(
        groupId,
        accept
      );

      setStatus(
        accept
          ? `Joined ${invite.group?.name || "invited classroom/group"}.`
          : "Invitation declined."
      );

      const targetView =
        invite.group?.type === "class"
          ? "classes"
          : "mine";

      await load();

      if (accept) {
        setView(targetView);
      }
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not respond to the invitation."
      );
    } finally {
      setBusyId("");
    }
  }

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
        title="Groups"
        subtitle="Swipe vertically to browse"
      />

      {!!invites.length && (
        <View style={styles.inviteTray}>
          <Text style={styles.inviteTrayTitle}>
            Invitations
          </Text>

          {invites.map((invite) => {
            const groupId = String(
              invite.groupId ||
              invite.group?.id ||
              ""
            );
            const isClass =
              invite.group?.type === "class";
            const busy =
              busyId === `invite_${groupId}`;

            return (
              <View
                key={`${groupId}_${invite.id}`}
                style={styles.inviteCard}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteKicker}>
                    {isClass
                      ? "CLASSROOM INVITATION"
                      : "GROUP INVITATION"}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={styles.inviteName}
                  >
                    {invite.group?.name ||
                      (isClass ? "Class" : "Group")}
                  </Text>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    respondInvite(invite, true)
                  }
                  style={styles.acceptInvite}
                >
                  <Text style={styles.acceptInviteText}>
                    Accept
                  </Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    respondInvite(invite, false)
                  }
                  style={styles.declineInvite}
                >
                  <Text style={styles.declineInviteText}>
                    Decline
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.toolbar}>
        <View style={styles.tabs}>
          {VIEWS.map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setView(id)}
              style={[
                styles.tab,
                view === id &&
                  styles.tabActive
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  view === id &&
                    styles.tabTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {view !== "discoverable" && (
          <Pressable
            onPress={create}
            style={styles.roundButton}
          >
            <Text style={styles.roundButtonText}>
              +
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() =>
            setSearchOpen(true)
          }
          style={styles.roundButton}
        >
          <Text style={styles.searchToggleText}>
            ⌕
          </Text>
        </Pressable>
      </View>

      {!!status && (
        <Text style={styles.status}>
          {status}
        </Text>
      )}

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
            data={groups}
            key={`${view}-${viewportHeight}`}
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
                  { height: viewportHeight }
                ]}
              >
                <Text style={styles.emptyTitle}>
                  {view === "discoverable"
                    ? "Nothing discoverable yet"
                    : view === "classes"
                      ? "No classes yet"
                      : "No groups yet"}
                </Text>

                {view !== "discoverable" && (
                  <Pressable
                    onPress={create}
                    style={styles.emptyCreate}
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      {view === "classes"
                        ? "Create Class"
                        : "Create Group"}
                    </Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const avatar =
                groupAvatarUrl(item.avatar);
              const pending =
                item.joinRequest?.status ===
                "pending";
              const busy =
                busyId === String(item.id);
              const isClass =
                item.type === "class";

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
                    disabled={
                      view === "discoverable"
                    }
                    style={styles.card}
                  >
                    {!!avatar && (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.avatar}
                      />
                    )}

                    <Text style={styles.eyebrow}>
                      {isClass
                        ? "CLASSROOM"
                        : "READING GROUP"}
                    </Text>

                    <Text style={styles.title}>
                      {item.name ||
                        (isClass
                          ? "Class"
                          : "Group")}
                    </Text>

                    {!!item.description && (
                      <Text
                        numberOfLines={7}
                        style={styles.description}
                      >
                        {item.description}
                      </Text>
                    )}

                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>
                        {item.joinPolicy ===
                        "open"
                          ? "Open"
                          : item.joinPolicy ===
                            "request_to_join"
                            ? "Request to join"
                            : "Invite only"}
                      </Text>

                      {!!item.membership && (
                        <Text style={styles.meta}>
                          {isClass
                            ? classRoleLabel(
                                item.membership
                                  .role
                              )
                            : item.membership
                                .role ||
                              "Member"}
                        </Text>
                      )}
                    </View>

                    <View style={styles.cardFooter}>
                      {view ===
                      "discoverable" ? (
                        pending ? (
                          <Pressable
                            disabled={busy}
                            onPress={() =>
                              cancel(item)
                            }
                            style={
                              styles.secondaryButton
                            }
                          >
                            <Text
                              style={
                                styles.secondaryButtonText
                              }
                            >
                              Cancel Request
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            disabled={busy}
                            onPress={() =>
                              join(item)
                            }
                            style={
                              styles.primaryButton
                            }
                          >
                            <Text
                              style={
                                styles.primaryButtonText
                              }
                            >
                              {item.joinPolicy ===
                              "open"
                                ? isClass
                                  ? "Join Class"
                                  : "Join Group"
                                : isClass
                                  ? "Request to Join Class"
                                  : "Request to Join"}
                            </Text>
                          </Pressable>
                        )
                      ) : (
                        <Text
                          style={
                            styles.openHint
                          }
                        >
                          Tap to open ›
                        </Text>
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            }}
          />
        )}

        {groups.length > 1 && (
          <View
            pointerEvents="none"
            style={styles.verticalDots}
          >
            {groups
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

      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSearchOpen(false)
        }
      >
        <Pressable
          style={styles.overlay}
          onPress={() =>
            setSearchOpen(false)
          }
        >
          <Pressable
            onPress={() => {}}
            style={styles.searchPopup}
          >
            <Text style={styles.searchTitle}>
              Search{" "}
              {view === "classes"
                ? "Classes"
                : "Groups & Classes"}
            </Text>

            <TextInput
              autoFocus
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Name or description"
              style={styles.searchInput}
            />

            <Pressable
              onPress={() =>
                setSearchOpen(false)
              }
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>
                Done
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  inviteTray: {
    backgroundColor: "#FFF8DF",
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4
  },
  inviteTrayTitle: {
    color: BRAND.ink,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    padding: 9,
    marginBottom: 6
  },
  inviteKicker: {
    color: BRAND.tealDark,
    fontSize: 8,
    fontWeight: "900"
  },
  inviteName: {
    color: BRAND.ink,
    fontWeight: "900",
    marginTop: 2
  },
  acceptInvite: {
    backgroundColor: BRAND.teal,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  acceptInviteText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 11
  },
  declineInvite: {
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  declineInviteText: {
    color: BRAND.danger,
    fontWeight: "900",
    fontSize: 11
  },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    gap: 6
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  tabText: {
    color: BRAND.muted,
    fontWeight: "800",
    fontSize: 11
  },
  tabTextActive: { color: "#FFF" },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  roundButtonText: {
    color: BRAND.tealDark,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26
  },
  searchToggleText: {
    color: BRAND.tealDark,
    fontSize: 22,
    fontWeight: "900"
  },
  status: {
    padding: 8,
    textAlign: "center",
    backgroundColor: "#FFF8DF",
    color: "#6D5A16"
  },
  viewport: {
    flex: 1,
    position: "relative"
  },
  page: { padding: 16 },
  card: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 24,
    padding: 24
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 20,
    marginBottom: 18
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1
  },
  title: {
    color: BRAND.ink,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8
  },
  description: {
    color: BRAND.muted,
    lineHeight: 22,
    marginTop: 12,
    fontSize: 15
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  meta: {
    color: BRAND.tealDark,
    fontWeight: "800",
    fontSize: 11
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: 18
  },
  openHint: {
    color: BRAND.muted,
    textAlign: "right",
    fontWeight: "800"
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  emptyCreate: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18
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
  },
  emptyTitle: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingTop: 120,
    paddingHorizontal: 20
  },
  searchPopup: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 18
  },
  searchTitle: {
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 13,
    paddingHorizontal: 12
  },
  doneButton: {
    minHeight: 44,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  doneButtonText: {
    color: "#FFF",
    fontWeight: "900"
  }
});
