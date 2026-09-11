import { useCallback, useMemo, useState } from "react";
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
import useRefreshOnAppActive from "../../hooks/useRefreshOnAppActive";
import {
  canTeachClass,
  classRoleLabel,
  getNativeClass,
  getNativeClassMembers
} from "../../services/classFoundation";
import {
  getMyNativeClassGrades,
  getNativeClassGradebook
} from "../../services/classGrades";

function personName(member) {
  return (
    member?.displayName ||
    member?.username ||
    member?.name ||
    member?.userId ||
    member?.id ||
    "Student"
  );
}

function shortDue(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function GradeSummary({ summary }) {
  return (
    <View style={styles.summaryCard}>
      <View>
        <Text style={styles.summaryLabel}>OVERALL GRADE</Text>
        <Text style={styles.summaryPercent}>{summary.percent}%</Text>
      </View>
      <View style={styles.summaryRight}>
        <Text style={styles.summaryPoints}>
          {summary.earned}/{summary.possible} pts
        </Text>
        <Text style={styles.summaryMeta}>
          {summary.countedAssignments} graded
          {summary.pendingAssignments
            ? ` · ${summary.pendingAssignments} pending`
            : ""}
        </Text>
      </View>
    </View>
  );
}

function GradeList({ rows }) {
  if (!rows?.length) {
    return <Text style={styles.emptyText}>No assignments yet.</Text>;
  }

  return rows.map((row) => {
    const value = row.pending
      ? "Submitted · awaiting grade"
      : !row.graded
        ? row.type === "test" ? "Not submitted" : "Not graded"
        : `${row.score}/${row.maxPoints} · ${row.percent}%`;

    return (
      <View key={row.assignmentId} style={styles.gradeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.gradeTitle}>{row.title}</Text>
          <Text style={styles.gradeMeta}>
            {row.type === "test" ? "TEST" : "READING"}
            {row.dueAt ? ` · Due ${shortDue(row.dueAt)}` : ""}
          </Text>

          {row.type === "reading" && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(Math.max(Number(row.progressPercent) || 0, 0), 100)}%` }
                ]}
              />
            </View>
          )}

          {!!row.feedback && (
            <Text style={styles.feedback}>Feedback: {row.feedback}</Text>
          )}
        </View>

        <Text style={[styles.gradeValue, row.pending && styles.pendingValue]}>
          {value}
        </Text>
      </View>
    );
  });
}

export default function ClassGrades() {
  const params = useLocalSearchParams();
  const classId = String(params.classId || "");

  const [classData, setClassData] = useState(null);
  const [myGrades, setMyGrades] = useState(null);
  const [gradebook, setGradebook] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setStatus("");

      const [loadedClass, members] = await Promise.all([
        getNativeClass(classId),
        getNativeClassMembers(classId)
      ]);

      setClassData(loadedClass);

      if (canTeachClass(loadedClass.membership?.role)) {
        const rows = await getNativeClassGradebook(classId, members);
        setGradebook(rows);
        setMyGrades(null);
        setSelectedId((current) =>
          current && rows.some((student) => String(student.userId || student.id) === current)
            ? current
            : String(rows[0]?.userId || rows[0]?.id || "")
        );
      } else {
        setMyGrades(await getMyNativeClassGrades(classId));
        setGradebook([]);
      }
    } catch (error) {
      setStatus(error?.message || "Could not load grades.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useRefreshOnAppActive(load);

  const role = classData?.membership?.role || "member";
  const canTeach = canTeachClass(role);
  const selected = useMemo(
    () => gradebook.find((student) => String(student.userId || student.id) === selectedId) || null,
    [gradebook, selectedId]
  );

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

        <Text style={styles.eyebrow}>CLASSROOM</Text>
        <Text style={styles.title}>Grades</Text>
        <Text style={styles.subtitle}>
          {classData?.name || "Class"} · {classRoleLabel(role)}
        </Text>

        {!!status && <Text style={styles.status}>{status}</Text>}

        {!canTeach && myGrades && (
          <>
            <GradeSummary summary={myGrades.summary} />
            <Text style={styles.sectionTitle}>Assignments</Text>
            <GradeList rows={myGrades.rows} />
          </>
        )}

        {canTeach && (
          !gradebook.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No students yet</Text>
              <Text style={styles.emptyText}>Grades will appear after students join the class.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Students</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentChips}
              >
                {gradebook.map((student) => {
                  const id = String(student.userId || student.id);
                  const active = id === selectedId;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setSelectedId(id)}
                      style={[styles.studentChip, active && styles.studentChipActive]}
                    >
                      <Text style={[styles.studentChipText, active && styles.studentChipTextActive]}>
                        {personName(student)}
                      </Text>
                      <Text style={[styles.studentChipGrade, active && styles.studentChipTextActive]}>
                        {student.gradeSummary.percent}%
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {!!selected && (
                <>
                  <Text style={styles.studentName}>{personName(selected)}</Text>
                  {!!selected.username && (
                    <Text style={styles.username}>@{selected.username}</Text>
                  )}
                  <GradeSummary summary={selected.gradeSummary} />
                  <Text style={styles.sectionTitle}>Assignment Grades</Text>
                  <GradeList rows={selected.grades} />
                </>
              )}
            </>
          )
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Reading grades use verified assignment completion. Submitted but ungraded tests stay pending and are excluded from the overall percentage until graded.
          </Text>
        </View>
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 18, paddingBottom: 110 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { color: BRAND.tealDark, fontWeight: "900", marginBottom: 16 },
  eyebrow: { color: BRAND.tealDark, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  title: { color: BRAND.ink, fontSize: 28, fontWeight: "900", marginTop: 3 },
  subtitle: { color: BRAND.muted, marginTop: 4, marginBottom: 16 },
  status: { color: BRAND.tealDark, backgroundColor: "#FFF8DF", borderRadius: 12, padding: 10, marginBottom: 12 },
  summaryCard: { backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.line, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 },
  summaryLabel: { color: BRAND.tealDark, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  summaryPercent: { color: BRAND.ink, fontSize: 34, fontWeight: "900", marginTop: 2 },
  summaryRight: { alignItems: "flex-end", flex: 1 },
  summaryPoints: { color: BRAND.ink, fontWeight: "900" },
  summaryMeta: { color: BRAND.muted, fontSize: 11, marginTop: 4, textAlign: "right" },
  sectionTitle: { color: BRAND.ink, fontSize: 18, fontWeight: "900", marginTop: 8, marginBottom: 10 },
  gradeRow: { backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.line, borderRadius: 15, padding: 13, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 12 },
  gradeTitle: { color: BRAND.ink, fontWeight: "900", fontSize: 15 },
  gradeMeta: { color: BRAND.muted, fontSize: 10, marginTop: 3 },
  gradeValue: { maxWidth: "42%", color: BRAND.tealDark, fontWeight: "900", fontSize: 12, textAlign: "right" },
  pendingValue: { color: BRAND.muted },
  progressTrack: { height: 6, backgroundColor: BRAND.background, borderRadius: 999, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", backgroundColor: BRAND.teal, borderRadius: 999 },
  feedback: { color: BRAND.ink, fontSize: 11, lineHeight: 17, marginTop: 7 },
  studentChips: { gap: 8, paddingBottom: 14 },
  studentChip: { minWidth: 110, borderWidth: 1, borderColor: BRAND.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: BRAND.surface },
  studentChipActive: { backgroundColor: BRAND.teal, borderColor: BRAND.teal },
  studentChipText: { color: BRAND.ink, fontWeight: "900", fontSize: 11 },
  studentChipTextActive: { color: "#FFF" },
  studentChipGrade: { color: BRAND.tealDark, fontSize: 13, fontWeight: "900", marginTop: 3 },
  studentName: { color: BRAND.ink, fontSize: 22, fontWeight: "900", marginTop: 4 },
  username: { color: BRAND.muted, fontSize: 11, marginTop: 2, marginBottom: 10 },
  emptyCard: { backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.line, borderRadius: 18, padding: 24 },
  emptyTitle: { color: BRAND.ink, fontSize: 20, fontWeight: "900" },
  emptyText: { color: BRAND.muted, lineHeight: 19, marginTop: 6 },
  noteCard: { backgroundColor: "#FFF8DF", borderRadius: 14, padding: 13, marginTop: 16 },
  noteText: { color: BRAND.muted, fontSize: 11, lineHeight: 17 }
});
