import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";
import {
  canManageClass,
  classRoleLabel,
  getNativeClass,
  getNativeClassFriends,
  getNativeClassMembers,
  inviteNativeClassFriend,
  removeNativeClassMember,
  setNativeClassRole
} from "../../services/classFoundation";

export default function ClassStudents() {
  const params = useLocalSearchParams();
  const classId = String(params.classId || "");

  const [classData, setClassData] = useState(null);
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    try {
      setLoading(true);
      const loadedClass = await getNativeClass(classId);
      const loadedMembers = await getNativeClassMembers(classId);

      setClassData(loadedClass);
      setMembers(loadedMembers);

      if (canManageClass(loadedClass.membership?.role)) {
        setFriends(await getNativeClassFriends(classId));
      } else {
        setFriends([]);
      }
    } catch (error) {
      setStatus(error?.message || "Could not load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [classId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [classId])
  );

  const role = classData?.membership?.role || "member";
  const isOwner = role === "owner";
  const canManage = canManageClass(role);

  const orderedMembers = useMemo(() => {
    const rank = { owner: 0, admin: 1, moderator: 2, member: 3 };

    return [...members].sort((a, b) => {
      const roleDiff = (rank[a.role] ?? 9) - (rank[b.role] ?? 9);
      if (roleDiff) return roleDiff;
      return memberName(a).localeCompare(memberName(b));
    });
  }, [members]);

  async function changeRole(member, next) {
    try {
      setBusyId(String(member.userId));
      setStatus("");
      await setNativeClassRole(classId, member.userId, next);
      await load();
    } catch (error) {
      setStatus(error?.message || "Could not update classroom role.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(member) {
    try {
      setBusyId(String(member.userId));
      setStatus("");
      await removeNativeClassMember(classId, member.userId);
      await load();
    } catch (error) {
      setStatus(error?.message || "Could not remove this member.");
    } finally {
      setBusyId("");
    }
  }

  async function invite(friend) {
    const userId = String(friend.otherUserId || friend.id || "");

    try {
      setBusyId(userId);
      setStatus("");
      await inviteNativeClassFriend(classId, userId);
      setStatus(`Invitation sent to ${memberName(friend)}.`);
    } catch (error) {
      setStatus(error?.message || "Could not send the invitation.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Class</Text>
        </Pressable>

        <Text style={styles.title}>Students & Staff</Text>
        <Text style={styles.subtitle}>
          Primary Teacher · Teacher · Aide · Student
        </Text>

        {!!status && <Text style={styles.status}>{status}</Text>}

        {orderedMembers.map((member) => {
          const userId = String(member.userId || member.id);
          const busy = busyId === userId;
          const canEditRole = isOwner && member.role !== "owner";
          const canRemove = canManage && member.role !== "owner";

          return (
            <View key={userId} style={styles.memberCard}>
              <View style={styles.memberTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{memberName(member)}</Text>
                  {!!member.username && (
                    <Text style={styles.username}>@{member.username}</Text>
                  )}
                </View>
                <Text style={styles.role}>{classRoleLabel(member.role)}</Text>
              </View>

              {canEditRole && (
                <View style={styles.roleButtons}>
                  {[
                    ["admin", "Teacher"],
                    ["moderator", "Aide"],
                    ["member", "Student"]
                  ].map(([value, label]) => (
                    <Pressable
                      key={value}
                      disabled={busy}
                      onPress={() => changeRole(member, value)}
                      style={[
                        styles.roleButton,
                        member.role === value && styles.roleButtonActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          member.role === value && styles.roleButtonTextActive
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {canRemove && (
                <Pressable
                  disabled={busy}
                  onPress={() => remove(member)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>Remove from class</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {canManage && (
          <>
            <Text style={styles.sectionTitle}>Invite Friends</Text>
            {!friends.length ? (
              <Text style={styles.empty}>No uninvited friends available.</Text>
            ) : (
              friends.map((friend) => {
                const userId = String(friend.otherUserId || friend.id || "");
                return (
                  <View key={userId} style={styles.inviteRow}>
                    <Text style={styles.inviteName}>{memberName(friend)}</Text>
                    <Pressable
                      disabled={busyId === userId}
                      onPress={() => invite(friend)}
                      style={styles.inviteButton}
                    >
                      <Text style={styles.inviteText}>Invite</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

function memberName(member) {
  return (
    member?.displayName ||
    member?.username ||
    member?.name ||
    member?.profile?.displayName ||
    member?.profile?.username ||
    member?.userId ||
    "Reader"
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 18, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { color: BRAND.tealDark, fontWeight: "900", marginBottom: 18 },
  title: { color: BRAND.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: BRAND.muted, marginTop: 4, marginBottom: 18 },
  status: {
    color: BRAND.tealDark,
    backgroundColor: "#FFF8DF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  memberCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  memberTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberName: { color: BRAND.ink, fontWeight: "900", fontSize: 16 },
  username: { color: BRAND.muted, marginTop: 2 },
  role: { color: BRAND.tealDark, fontWeight: "900", fontSize: 12 },
  roleButtons: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  roleButton: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  roleButtonActive: { backgroundColor: BRAND.teal, borderColor: BRAND.teal },
  roleButtonText: { color: BRAND.ink, fontWeight: "800", fontSize: 12 },
  roleButtonTextActive: { color: "#FFF" },
  removeButton: { marginTop: 12 },
  removeText: { color: BRAND.danger, fontWeight: "800" },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 10
  },
  empty: { color: BRAND.muted },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8
  },
  inviteName: { flex: 1, color: BRAND.ink, fontWeight: "800" },
  inviteButton: {
    backgroundColor: BRAND.teal,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  inviteText: { color: "#FFF", fontWeight: "900" }
});
