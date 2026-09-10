import { useEffect, useMemo, useState } from "react";
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
import { auth } from "../../lib/firebase";
import {
  canTeachClass,
  classRoleLabel,
  getNativeClass,
  getNativeClassMembers
} from "../../services/classFoundation";
import { getNativeClassAssignments } from "../../services/classAssignments";
import {
  assignmentReadingPercent,
  assignmentReadingPoints,
  classReadingPercent,
  getNativeClassStudentProgress,
  progressMapForUser,
  syncNativeClassReadingProgress
} from "../../services/classProgress";

function personName(member) {
  return (
    member?.displayName ||
    member?.username ||
    member?.name ||
    "Student"
  );
}

export default function ClassProgress() {
  const params = useLocalSearchParams();
  const classId = String(params.classId || "");

  const [classData, setClassData] = useState(null);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  async function load() {
    try {
      setLoading(true);
      setStatus("");

      const loadedClass = await getNativeClass(classId);

      /*
       * Current user's verified Reader state is synchronized before the
       * progress view is read. Returning from an assignment to the class
       * therefore immediately updates classroom progress.
       */
      try {
        await syncNativeClassReadingProgress(classId);
      } catch (error) {
        console.warn("Class progress sync:", error?.code || error);
      }

      const [loadedMembers, loadedAssignments, loadedRows] =
        await Promise.all([
          getNativeClassMembers(classId),
          getNativeClassAssignments(classId),
          getNativeClassStudentProgress(classId)
        ]);

      setClassData(loadedClass);
      setMembers(loadedMembers);
      setAssignments(loadedAssignments);
      setRows(loadedRows);
    } catch (error) {
      setStatus(error?.message || "Could not load class progress.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [classId]);

  const role = classData?.membership?.role || "member";
  const canTeach = canTeachClass(role);
  const currentUserId = auth.currentUser?.uid || "";

  const visibleMembers = useMemo(() => {
    if (canTeach) {
      return members.filter(
        (member) =>
          !["owner", "admin", "moderator"].includes(member.role)
      );
    }

    return members.filter(
      (member) =>
        String(member.userId || member.id) === String(currentUserId)
    );
  }, [canTeach, currentUserId, members]);

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
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Class</Text>
        </Pressable>

        <Text style={styles.eyebrow}>CLASSROOM</Text>
        <Text style={styles.title}>Reading Progress</Text>
        <Text style={styles.subtitle}>
          {classData?.name || "Class"} · {classRoleLabel(role)}
        </Text>

        {!!status && <Text style={styles.status}>{status}</Text>}

        {!visibleMembers.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {canTeach ? "No students yet" : "No progress yet"}
            </Text>
            <Text style={styles.emptyText}>
              {canTeach
                ? "Student progress will appear here after students join and begin reading."
                : "Open a reading assignment and begin reading to record progress."}
            </Text>
          </View>
        ) : (
          visibleMembers.map((member) => {
            const userId = String(member.userId || member.id);
            const byBook = progressMapForUser(rows, userId);
            const overall = classReadingPercent(assignments, byBook);

            return (
              <View key={userId} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>
                      {personName(member)}
                    </Text>
                    {!!member.username && (
                      <Text style={styles.username}>@{member.username}</Text>
                    )}
                  </View>
                  <View style={styles.overallPill}>
                    <Text style={styles.overallValue}>{overall}%</Text>
                    <Text style={styles.overallLabel}>CLASS</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${overall}%` }
                    ]}
                  />
                </View>

                {assignments.map((assignment) => {
                  const progress = byBook[String(assignment.bookId)] || null;
                  const percent = assignmentReadingPercent(
                    assignment,
                    progress
                  );
                  const earned = assignmentReadingPoints(
                    assignment,
                    progress
                  );

                  return (
                    <View key={assignment.id} style={styles.assignmentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignmentTitle}>
                          {assignment.title}
                        </Text>
                        <Text style={styles.assignmentMeta}>
                          Paragraphs {assignment.startParagraphIndex + 1}
                          {assignment.endParagraphIndex === null
                            ? " → end"
                            : `–${assignment.endParagraphIndex + 1}`}
                          {" · "}
                          {earned}/{assignment.totalPoints} pts
                        </Text>
                        <View style={styles.smallTrack}>
                          <View
                            style={[
                              styles.smallFill,
                              { width: `${percent}%` }
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.percent}>{percent}%</Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        <Text style={styles.note}>
          Progress is based only on verified sequential Reader progress.
          Jumping or swiping ahead does not award classroom reading credit.
        </Text>
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
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  title: { color: BRAND.ink, fontSize: 28, fontWeight: "900", marginTop: 3 },
  subtitle: { color: BRAND.muted, marginTop: 4, marginBottom: 16 },
  status: {
    color: BRAND.tealDark,
    backgroundColor: "#FFF8DF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  empty: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 18,
    padding: 24
  },
  emptyTitle: { color: BRAND.ink, fontSize: 20, fontWeight: "900" },
  emptyText: { color: BRAND.muted, lineHeight: 20, marginTop: 7 },
  studentCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14
  },
  studentHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  studentName: { color: BRAND.ink, fontSize: 19, fontWeight: "900" },
  username: { color: BRAND.muted, fontSize: 12, marginTop: 2 },
  overallPill: {
    minWidth: 62,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 13,
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 9
  },
  overallValue: { color: BRAND.tealDark, fontSize: 17, fontWeight: "900" },
  overallLabel: { color: BRAND.muted, fontSize: 8, fontWeight: "900" },
  progressTrack: {
    height: 9,
    backgroundColor: BRAND.background,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 6
  },
  progressFill: {
    height: "100%",
    backgroundColor: BRAND.teal,
    borderRadius: 999
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    paddingTop: 12,
    marginTop: 12
  },
  assignmentTitle: { color: BRAND.ink, fontWeight: "900" },
  assignmentMeta: { color: BRAND.muted, fontSize: 11, marginTop: 3 },
  smallTrack: {
    height: 6,
    backgroundColor: BRAND.background,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 7
  },
  smallFill: {
    height: "100%",
    backgroundColor: BRAND.teal,
    borderRadius: 999
  },
  percent: { color: BRAND.tealDark, fontWeight: "900", minWidth: 42, textAlign: "right" },
  note: { color: BRAND.muted, fontSize: 11, lineHeight: 17, marginTop: 6 }
});
