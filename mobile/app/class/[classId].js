import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";
import {
  canManageClass,
  canTeachClass,
  classRoleLabel,
  ensureNativeGeneralClassDiscussion,
  getGeneralClassDiscussion,
  getNativeClass,
  getNativeClassMembers
} from "../../services/classFoundation";

export default function ClassHome() {
  const params = useLocalSearchParams();
  const classId = String(params.classId || "");

  const [classData, setClassData] = useState(null);
  const [members, setMembers] = useState([]);
  const [generalDiscussion, setGeneralDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  async function load() {
    try {
      setLoading(true);
      setStatus("");
      const [loadedClass, loadedMembers] = await Promise.all([
        getNativeClass(classId),
        getNativeClassMembers(classId)
      ]);

      let discussion = await getGeneralClassDiscussion(classId);

      if (!discussion && canTeachClass(loadedClass.membership?.role)) {
        discussion = await ensureNativeGeneralClassDiscussion(classId);
      }

      setClassData(loadedClass);
      setMembers(loadedMembers);
      setGeneralDiscussion(discussion);
    } catch (error) {
      setStatus(error?.message || "Could not load this class.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [classId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      </SafeAreaView>
    );
  }

  const role = classData?.membership?.role || "member";
  const students = members.filter(
    (m) => !["owner", "admin", "moderator"].includes(m.role)
  ).length;
  const teachers = members.filter((m) => ["owner", "admin"].includes(m.role)).length;
  const aides = members.filter((m) => m.role === "moderator").length;

  function openDiscussion() {
    if (!generalDiscussion) return;

    router.push({
      pathname: "/group/post",
      params: {
        groupId: classId,
        postId: generalDiscussion.id,
        title: generalDiscussion.title || "General Class Discussion",
        body: generalDiscussion.body || "",
        role,
        postUserId: generalDiscussion.userId || "",
        authorName: generalDiscussion.authorName || "",
        locked: String(Boolean(generalDiscussion.locked)),
        pinned: String(Boolean(generalDiscussion.pinned))
      }
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ My Classes</Text>
        </Pressable>

        <Text style={styles.eyebrow}>CLASSROOM</Text>
        <Text style={styles.title}>{classData?.name || "Class"}</Text>
        {!!classData?.description && (
          <Text style={styles.description}>{classData.description}</Text>
        )}

        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{classRoleLabel(role)}</Text>
        </View>

        <View style={styles.stats}>
          <Stat label="Students" value={students} />
          <Stat label="Teachers" value={teachers} />
          <Stat label="Aides" value={aides} />
        </View>

        <View style={styles.actionGrid}>
          <Action
            label="Students"
            sublabel="Members, roles & invites"
            onPress={() =>
              router.push({ pathname: "/class/students", params: { classId } })
            }
          />

          {canManageClass(role) && (
            <Action
              label="Settings"
              sublabel="Class details & access"
              onPress={() =>
                router.push({ pathname: "/class/settings", params: { classId } })
              }
            />
          )}
        </View>

        <Text style={styles.sectionTitle}>General Class Discussion</Text>
        <Pressable
          onPress={openDiscussion}
          disabled={!generalDiscussion}
          style={styles.discussionCard}
        >
          <Text style={styles.discussionTitle}>
            {generalDiscussion?.title || "Preparing discussion…"}
          </Text>
          <Text style={styles.discussionBody}>
            {generalDiscussion?.body ||
              "Classroom staff can initialize the general discussion."}
          </Text>
          {!!generalDiscussion && (
            <Text style={styles.openHint}>Open discussion ›</Text>
          )}
        </Pressable>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>Next: Assignments</Text>
          <Text style={styles.nextText}>
            Reading assignments, tests, progress and grades are added in the next
            classroom parity batches.
          </Text>
        </View>

        {!!status && <Text style={styles.status}>{status}</Text>}
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Action({ label, sublabel, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <Text style={styles.actionTitle}>{label}</Text>
      <Text style={styles.actionSub}>{sublabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 18, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { color: BRAND.tealDark, fontWeight: "900", marginBottom: 20 },
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "900"
  },
  title: { color: BRAND.ink, fontSize: 30, fontWeight: "900", marginTop: 5 },
  description: { color: BRAND.muted, lineHeight: 22, marginTop: 10 },
  rolePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    marginTop: 14
  },
  roleText: { color: BRAND.tealDark, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 10, marginTop: 20 },
  stat: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 15,
    padding: 13,
    alignItems: "center"
  },
  statValue: { color: BRAND.ink, fontSize: 22, fontWeight: "900" },
  statLabel: { color: BRAND.muted, fontSize: 11, marginTop: 3 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  action: {
    flexGrow: 1,
    minWidth: "47%",
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 16
  },
  actionTitle: { color: BRAND.ink, fontSize: 17, fontWeight: "900" },
  actionSub: { color: BRAND.muted, fontSize: 12, marginTop: 4 },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 26,
    marginBottom: 10
  },
  discussionCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 18
  },
  discussionTitle: { color: BRAND.ink, fontSize: 18, fontWeight: "900" },
  discussionBody: { color: BRAND.muted, lineHeight: 20, marginTop: 8 },
  openHint: {
    color: BRAND.tealDark,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 14
  },
  nextCard: {
    marginTop: 18,
    backgroundColor: "#FFF8DF",
    borderRadius: 16,
    padding: 16
  },
  nextTitle: { color: BRAND.ink, fontWeight: "900" },
  nextText: { color: BRAND.muted, marginTop: 5, lineHeight: 20 },
  status: { color: BRAND.danger, textAlign: "center", marginTop: 14 }
});
