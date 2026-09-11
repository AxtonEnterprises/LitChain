import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
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
  getNativeGroupSettings,
  saveNativeGroupSettings,
  deleteNativeGroup,
  deleteNativeGroupPost,
  setNativeGroupPostLocked,
  setNativeGroupPostPinned
} from "../../services/groupAdmin";

import {
  getNativeGroupForumDisplay
} from "../../services/groupDisplay";

import {
  getNativeGroupModerationReports,
  removeReportedNativeGroupContent,
  resolveNativeGroupModerationReport
} from "../../services/groupModeration";

import {
  getNativeGroupJoinRequests,
  getNativeGroupMembers,
  respondNativeGroupJoinRequest,
  updateNativeGroupMemberRole
} from "../../services/groupMembership";

import {
  groupAvatarUrl
} from "../../../shared/groupAvatars";

import { BRAND } from "../../../shared/brand";

const AVATARS = [
  "musketeers",
  "lost-boys",
  "wonderland",
  "oz",
  "bennet-sisters",
  "argonauts",
  "round-table",
  "gothic-horror",
  "time-travelers"
];

export default function Settings() {
  const params = useLocalSearchParams();

  const groupId = String(params.groupId || "");
  const role = String(params.role || "").toLowerCase();

  const [group, setGroup] = useState(null);
  const [name, setName] = useState(
    String(params.name || "")
  );
  const [description, setDescription] =
    useState("");
  const [avatar, setAvatar] = useState("");
  const [visibility, setVisibility] =
    useState("discoverable");
  const [joinPolicy, setJoinPolicy] =
    useState("request_to_join");

  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("");

  const canAdmin =
    role === "owner" || role === "admin";
  const canModerate =
    canAdmin || role === "moderator";
  const isOwner = role === "owner";

  async function load() {
    try {
      const [
        loadedGroup,
        loadedPosts,
        loadedMembers,
        loadedRequests,
        loadedReports
      ] = await Promise.all([
        getNativeGroupSettings(groupId),
        getNativeGroupForumDisplay(groupId),
        getNativeGroupMembers(groupId),
        canAdmin
          ? getNativeGroupJoinRequests(groupId)
          : Promise.resolve([]),
        canModerate
          ? getNativeGroupModerationReports(groupId)
          : Promise.resolve([])
      ]);

      setGroup(loadedGroup);
      setPosts(loadedPosts);
      setMembers(loadedMembers);
      setRequests(loadedRequests);
      setReports(loadedReports);

      if (loadedGroup) {
        setName(loadedGroup.name || "");
        setDescription(
          loadedGroup.description || ""
        );
        setAvatar(loadedGroup.avatar || "");
        setVisibility(
          loadedGroup.visibility === "private"
            ? "private"
            : loadedGroup.visibility === "public"
              ? "public"
              : "discoverable"
        );
        setJoinPolicy(
          loadedGroup.joinPolicy === "open"
            ? "open"
            : loadedGroup.joinPolicy ===
                "invite_only"
              ? "invite_only"
              : "request_to_join"
        );
      }
    } catch (error) {
      setStatus(
        error?.message ||
          "Settings could not be loaded."
      );
    }
  }

  useEffect(() => {
    load();
  }, [groupId]);

  async function save() {
    try {
      await saveNativeGroupSettings(
        groupId,
        {
          name,
          description,
          avatar,
          visibility,
          joinPolicy
        }
      );

      setStatus("Group settings saved.");
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not save settings."
      );
    }
  }


  function confirmDeleteGroup() {
    const label = group?.type === "class" ? "Class" : "Group";
    Alert.alert(
      `Delete ${label}`,
      `Permanently delete “${group?.name || name || label}”? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNativeGroup(groupId);
              router.replace("/groups");
            } catch (error) {
              setStatus(error?.message || `Could not delete ${label.toLowerCase()}.`);
            }
          }
        }
      ]
    );
  }

  async function pin(post) {
    try {
      await setNativeGroupPostPinned(
        groupId,
        post.id,
        !post.pinned
      );

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                pinned: !post.pinned
              }
            : item
        )
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update pin."
      );
    }
  }

  async function lock(post) {
    try {
      await setNativeGroupPostLocked(
        groupId,
        post.id,
        !post.locked
      );

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                locked: !post.locked
              }
            : item
        )
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update lock."
      );
    }
  }

  async function remove(post) {
    try {
      await deleteNativeGroupPost(
        groupId,
        post.id
      );

      setPosts((current) =>
        current.filter(
          (item) => item.id !== post.id
        )
      );

      setStatus("Discussion deleted.");
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not delete discussion."
      );
    }
  }

  async function respond(request, accept) {
    try {
      await respondNativeGroupJoinRequest(
        groupId,
        request.userId || request.id,
        accept
      );

      setRequests((current) =>
        current.filter(
          (item) => item.id !== request.id
        )
      );

      setStatus(
        accept
          ? "Member approved."
          : "Request declined."
      );

      if (accept) {
        setMembers(
          await getNativeGroupMembers(groupId)
        );
      }
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update request."
      );
    }
  }

  async function dismissReport(report) {
    try {
      await resolveNativeGroupModerationReport(
        groupId,
        report.id,
        "dismissed"
      );
      setReports((current) => current.filter((item) => item.id !== report.id));
      setStatus("Report dismissed.");
    } catch (error) {
      setStatus(error?.message || "Could not dismiss report.");
    }
  }

  async function removeReported(report) {
    try {
      await removeReportedNativeGroupContent(groupId, report);
      setReports((current) => current.filter((item) => item.id !== report.id));
      setPosts((current) =>
        report.contentType === "forum_post"
          ? current.filter((item) => item.id !== report.postId)
          : current
      );
      setStatus("Reported content removed.");
    } catch (error) {
      setStatus(error?.message || "Could not remove reported content.");
    }
  }

  async function changeRole(member, nextRole) {
    try {
      await updateNativeGroupMemberRole(
        groupId,
        member.userId || member.id,
        nextRole
      );

      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? {
                ...item,
                role: nextRole
              }
            : item
        )
      );

      setStatus("Role updated.");
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update role."
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>
          Settings & Moderation
        </Text>

        <Text style={styles.role}>
          {role || "member"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
      >
        {canAdmin && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Group Settings
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              style={styles.input}
            />

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              multiline
              style={[
                styles.input,
                styles.descriptionInput
              ]}
            />

            <Text style={styles.label}>
              Avatar
            </Text>

            <View style={styles.avatarGrid}>
              {AVATARS.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => setAvatar(id)}
                  style={[
                    styles.avatarChoice,
                    avatar === id &&
                      styles.avatarChoiceActive
                  ]}
                >
                  <Image
                    source={{
                      uri: groupAvatarUrl(id)
                    }}
                    style={styles.avatar}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>
              Visibility
            </Text>

            <View style={styles.chips}>
              {[
                ["discoverable", "Discoverable"],
                ["public", "Public"],
                ["private", "Private"]
              ].map(([id, label]) => (
                <Pressable
                  key={id}
                  onPress={() =>
                    setVisibility(id)
                  }
                  style={[
                    styles.chip,
                    visibility === id &&
                      styles.chipActive
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      visibility === id &&
                        styles.chipTextActive
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>
              Join Policy
            </Text>

            <View style={styles.chips}>
              {[
                ["open", "Open"],
                [
                  "request_to_join",
                  "Request"
                ],
                ["invite_only", "Invite"]
              ].map(([id, label]) => (
                <Pressable
                  key={id}
                  onPress={() =>
                    setJoinPolicy(id)
                  }
                  style={[
                    styles.chip,
                    joinPolicy === id &&
                      styles.chipActive
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      joinPolicy === id &&
                        styles.chipTextActive
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={save}
              style={styles.primaryButton}
            >
              <Text
                style={styles.primaryButtonText}
              >
                Save Group
              </Text>
            </Pressable>

            {isOwner && (
              <Pressable
                onPress={confirmDeleteGroup}
                style={styles.deleteGroupButton}
              >
                <Text style={styles.deleteGroupButtonText}>
                  Delete {group?.type === "class" ? "Class" : "Group"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {canAdmin && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Join Requests
            </Text>

            {requests.length ? (
              requests.map((request) => (
                <View
                  key={request.id}
                  style={styles.rowCard}
                >
                  <Text style={styles.rowTitle}>
                    {request.displayName ||
                      request.username ||
                      request.userId ||
                      request.id}
                  </Text>

                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() =>
                        respond(request, true)
                      }
                      style={styles.smallPrimary}
                    >
                      <Text
                        style={
                          styles.smallPrimaryText
                        }
                      >
                        Approve
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        respond(request, false)
                      }
                      style={
                        styles.smallSecondary
                      }
                    >
                      <Text
                        style={
                          styles.smallSecondaryText
                        }
                      >
                        Decline
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                No pending requests.
              </Text>
            )}
          </View>
        )}

        {isOwner && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Member Roles
            </Text>

            {members.map((member) => (
              <View
                key={member.id}
                style={styles.memberCard}
              >
                <Text style={styles.rowTitle}>
                  {member.displayName ||
                    member.username ||
                    member.userId ||
                    member.id}
                </Text>

                <View style={styles.chips}>
                  {[
                    "admin",
                    "moderator",
                    "member"
                  ].map((nextRole) => (
                    <Pressable
                      key={nextRole}
                      disabled={
                        member.role === "owner"
                      }
                      onPress={() =>
                        changeRole(
                          member,
                          nextRole
                        )
                      }
                      style={[
                        styles.roleChip,
                        member.role ===
                          nextRole &&
                          styles.chipActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          member.role ===
                            nextRole &&
                            styles.chipTextActive
                        ]}
                      >
                        {nextRole}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {canModerate && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Reports for Review
            </Text>

            {reports.length ? (
              reports.map((report) => {
                const reportedName =
                  report.reportedProfile?.displayName ||
                  report.reportedProfile?.username ||
                  report.reportedUserId ||
                  "Reader";

                return (
                  <View key={report.id} style={styles.postCard}>
                    <Text style={styles.rowTitle}>
                      {report.title ||
                        (report.contentType === "forum_reply"
                          ? "Reported reply"
                          : "Reported discussion")}
                    </Text>
                    <Text style={styles.postMeta}>
                      Reported user: {reportedName}
                    </Text>
                    <Text style={styles.postMeta}>
                      Reason: {report.reason || "other"}
                    </Text>
                    {!!report.details && (
                      <Text style={styles.reportDetails}>
                        {report.details}
                      </Text>
                    )}
                    {!!report.body && (
                      <Text numberOfLines={4} style={styles.reportBody}>
                        “{report.body}”
                      </Text>
                    )}

                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={() => dismissReport(report)}
                        style={styles.smallSecondary}
                      >
                        <Text style={styles.smallSecondaryText}>Dismiss</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => removeReported(report)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteText}>Remove Content</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.empty}>No open reports.</Text>
            )}
          </View>
        )}

        {canModerate && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Discussion Moderation
            </Text>

            {posts.map((post) => (
              <View
                key={post.id}
                style={styles.postCard}
              >
                <Text style={styles.rowTitle}>
                  {post.title || "Discussion"}
                </Text>

                <Text style={styles.postMeta}>
                  {post.authorName ||
                    post.userId ||
                    "Reader"}
                </Text>

                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => pin(post)}
                    style={
                      styles.smallSecondary
                    }
                  >
                    <Text
                      style={
                        styles.smallSecondaryText
                      }
                    >
                      {post.pinned
                        ? "Unpin"
                        : "Pin"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => lock(post)}
                    style={
                      styles.smallSecondary
                    }
                  >
                    <Text
                      style={
                        styles.smallSecondaryText
                      }
                    >
                      {post.locked
                        ? "Unlock"
                        : "Lock"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => remove(post)}
                    style={styles.deleteButton}
                  >
                    <Text
                      style={styles.deleteText}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}
      </ScrollView>

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
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
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
  role: {
    color: BRAND.muted,
    marginTop: 4,
    textTransform: "capitalize"
  },
  content: {
    padding: 14,
    paddingBottom: 80
  },
  sectionCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14
  },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 12
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    color: BRAND.ink
  },
  descriptionInput: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  label: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 12,
    marginTop: 10,
    marginBottom: 8
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  avatarChoice: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden"
  },
  avatarChoiceActive: {
    borderColor: BRAND.teal
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  chipActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  chipText: {
    color: BRAND.ink,
    fontWeight: "800",
    fontSize: 11
  },
  chipTextActive: {
    color: "#FFF"
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  },
  primaryButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  rowCard: {
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    paddingVertical: 12
  },
  memberCard: {
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    paddingVertical: 12
  },
  postCard: {
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    paddingVertical: 12
  },
  rowTitle: {
    color: BRAND.ink,
    fontWeight: "900",
    flex: 1
  },
  postMeta: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 4
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10
  },
  smallPrimary: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  smallPrimaryText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 11
  },
  smallSecondary: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  smallSecondaryText: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 11
  },
  deleteButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.danger,
    alignItems: "center",
    justifyContent: "center"
  },
  deleteText: {
    color: BRAND.danger,
    fontWeight: "900",
    fontSize: 11
  },
  roleChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  roleChipText: {
    color: BRAND.ink,
    fontWeight: "800",
    fontSize: 10,
    textTransform: "capitalize"
  },
  empty: {
    color: BRAND.muted
  },
  reportDetails: {
    color: BRAND.ink,
    marginTop: 8,
    lineHeight: 20
  },
  reportBody: {
    color: BRAND.muted,
    marginTop: 8,
    fontStyle: "italic",
    lineHeight: 20
  },
  deleteGroupButton: {
    marginTop: 12,
    minHeight: 46,
    borderWidth: 1,
    borderColor: BRAND.danger,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  deleteGroupButtonText: {
    color: BRAND.danger,
    fontWeight: "900"
  },
  status: {
    color: BRAND.tealDark,
    textAlign: "center",
    paddingVertical: 12,
    fontWeight: "800"
  }
});
