import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams
} from "expo-router";

import {
  deleteDoc,
  doc
} from "firebase/firestore";

import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";
import useRefreshOnAppActive from "../../hooks/useRefreshOnAppActive";

import {
  canManageClass,
  canTeachClass,
  classRoleLabel,
  ensureNativeGeneralClassDiscussion,
  getGeneralClassDiscussion,
  getNativeClass,
  getNativeClassMembers
} from "../../services/classFoundation";

import {
  deleteNativeClassAssignment,
  getNativeClassAssignments
} from "../../services/classAssignments";

import {
  assignmentReadingPercent,
  getNativeClassStudentProgress,
  progressMapForUser,
  syncNativeClassReadingProgress
} from "../../services/classProgress";

import { auth, db } from "../../lib/firebase";

function formatDue(value) {
  if (!value) return "No due date";

  const parsed = new Date(
    `${value}T12:00:00`
  );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

export default function ClassHome() {
  const params = useLocalSearchParams();
  const classId = String(
    params.classId || ""
  );

  const { height: windowHeight } =
    useWindowDimensions();

  const assignmentPageHeight =
    Math.max(
      560,
      Math.floor(windowHeight - 92)
    );

  const [classData, setClassData] =
    useState(null);
  const [members, setMembers] =
    useState([]);
  const [assignments, setAssignments] =
    useState([]);
  const [progressRows, setProgressRows] =
    useState([]);
  const [
    generalDiscussion,
    setGeneralDiscussion
  ] = useState(null);
  const [loading, setLoading] =
    useState(true);
  const [status, setStatus] =
    useState("");
  const [assignmentIndex, setAssignmentIndex] =
    useState(0);
  const [showCreateMenu, setShowCreateMenu] =
    useState(false);
  const [
    assignmentSectionY,
    setAssignmentSectionY
  ] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setStatus("");

      const [
        loadedClass,
        loadedMembers,
        loadedAssignments
      ] = await Promise.all([
        getNativeClass(classId),
        getNativeClassMembers(classId),
        getNativeClassAssignments(classId)
      ]);

      try {
        await syncNativeClassReadingProgress(classId);
      } catch (error) {
        console.warn(
          "Class progress sync:",
          error?.code || error
        );
      }

      let loadedProgress = [];
      try {
        loadedProgress =
          await getNativeClassStudentProgress(classId);
      } catch {
        loadedProgress = [];
      }

      let discussion =
        await getGeneralClassDiscussion(
          classId
        );

      if (
        !discussion &&
        canTeachClass(
          loadedClass.membership?.role
        )
      ) {
        discussion =
          await ensureNativeGeneralClassDiscussion(
            classId
          );
      }

      setClassData(loadedClass);
      setMembers(loadedMembers);
      setAssignments(
        loadedAssignments
      );
      setProgressRows(
        loadedProgress
      );
      setGeneralDiscussion(
        discussion
      );
      setAssignmentIndex(
        (current) =>
          Math.max(
            0,
            Math.min(
              loadedAssignments.length - 1,
              current
            )
          )
      );
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not load this class."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [
    classId,
    params.refresh
  ]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [classId])
  );

  useRefreshOnAppActive(load);

  const role =
    classData?.membership?.role ||
    "member";

  const currentProgressByBook =
    progressMapForUser(
      progressRows,
      auth.currentUser?.uid || ""
    );

  const students = useMemo(
    () =>
      members.filter(
        (member) =>
          ![
            "owner",
            "admin",
            "moderator"
          ].includes(
            member.role
          )
      ).length,
    [members]
  );

  const teachers = useMemo(
    () =>
      members.filter(
        (member) =>
          [
            "owner",
            "admin"
          ].includes(
            member.role
          )
      ).length,
    [members]
  );

  const aides = useMemo(
    () =>
      members.filter(
        (member) =>
          member.role === "moderator"
      ).length,
    [members]
  );

  async function shareClassroom() {
    const className =
      classData?.name || "Lit Chain Classroom";

    const classUrl =
      `https://litchain.org/read/groups/${classId}`;

    try {
      await Share.share({
        title: className,
        message:
          `${className}\n\nJoin or open this classroom on Lit Chain:\n${classUrl}`
      });
    } catch {
      setStatus(
        "The classroom could not be shared."
      );
    }
  }

  function createAssignment() {
    router.push({
      pathname:
        "/class/assignment-edit",
      params: { classId }
    });
  }

  function createTest() {
    setShowCreateMenu(false);
    router.push({
      pathname:
        "/class/test-edit",
      params: { classId }
    });
  }

  function createDiscussion() {
    const assignment =
      assignments[assignmentIndex] ||
      assignments[0] ||
      null;

    if (!assignment) {
      setShowCreateMenu(false);
      setStatus(
        "Create an assignment before starting an assignment discussion."
      );
      return;
    }

    setShowCreateMenu(false);
    router.push({
      pathname:
        "/class/assignment-discussions",
      params: {
        classId,
        assignmentId:
          assignment.id,
        assignmentTitle:
          assignment.title,
        compose: "1"
      }
    });
  }

  function editAssignment(
    assignment
  ) {
    router.push({
      pathname:
        "/class/assignment-edit",
      params: {
        classId,
        assignmentId:
          assignment.id
      }
    });
  }

  function openAssignment(
    assignment
  ) {
    router.push({
      pathname: "/reader/[bookId]",
      params: {
        bookId:
          assignment.bookId,
        title:
          assignment.title,
        author:
          assignment.author || "",
        image:
          assignment.image || "",
        startParagraph:
          String(
            assignment
              .startParagraphIndex ||
              0
          ),
        classId,
        assignmentId:
          assignment.id,
        assignmentEndParagraph:
          assignment.endParagraphIndex ===
          null
            ? ""
            : String(
                assignment
                  .endParagraphIndex
              )
      }
    });
  }

  function confirmDelete(
    assignment
  ) {
    Alert.alert(
      "Delete Assignment",
      `Delete “${assignment.title}”?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNativeClassAssignment(
                classId,
                assignment.id
              );
              await load();
            } catch (error) {
              setStatus(
                error?.message ||
                  "Could not delete assignment."
              );
            }
          }
        }
      ]
    );
  }

  function leaveClass() {
    Alert.alert(
      "Leave Class",
      "Leave this class? You will lose access to its assignments, discussions, grades, and class progress until you join again.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Leave Class",
          style: "destructive",
          onPress: async () => {
            try {
              const userId =
                auth.currentUser?.uid || "";

              if (!userId) {
                throw new Error(
                  "You must be logged in."
                );
              }

              await deleteDoc(
                doc(
                  db,
                  "groups",
                  classId,
                  "members",
                  userId
                )
              );

              router.replace("/groups");
            } catch (error) {
              setStatus(
                error?.message ||
                  "Could not leave this class."
              );
            }
          }
        }
      ]
    );
  }

  function openDiscussion() {
    if (!generalDiscussion) return;

    router.push({
      pathname: "/group/post",
      params: {
        groupId: classId,
        postId:
          generalDiscussion.id,
        title:
          generalDiscussion.title ||
          "General Class Discussion",
        body:
          generalDiscussion.body ||
          "",
        role,
        postUserId:
          generalDiscussion.userId ||
          "",
        authorName:
          generalDiscussion.authorName ||
          "",
        locked: String(
          Boolean(
            generalDiscussion.locked
          )
        ),
        pinned: String(
          Boolean(
            generalDiscussion.pinned
          )
        )
      }
    });
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  const canTeach =
    canTeachClass(role);

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToOffsets={
          assignmentSectionY > 0 &&
          assignments.length
            ? [
                0,
                ...assignments.map(
                  (_, index) =>
                    assignmentSectionY +
                    index *
                      assignmentPageHeight
                )
              ]
            : undefined
        }
      >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹ My Classes
          </Text>
        </Pressable>

        <Text style={styles.eyebrow}>
          CLASSROOM
        </Text>
        <Text
          numberOfLines={1}
          style={styles.title}
        >
          {classData?.name ||
            "Class"}
        </Text>

        <View style={styles.headerMeta}>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>
              {classRoleLabel(role)}
            </Text>
          </View>

          <Text style={styles.metaText}>
            {students} students ·{" "}
            {teachers} teachers ·{" "}
            {aides} aides
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              router.push({
                pathname:
                  "/class/students",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Students
            </Text>
          </Pressable>

          <Pressable
            onPress={shareClassroom}
            style={styles.smallButton}
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Share
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname:
                  "/class/progress",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Progress
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname:
                  "/class/tests",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Tests
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname:
                  "/class/grades",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text
              style={
                styles.smallButtonText
              }
            >
              Grades
            </Text>
          </Pressable>

          {role === "member" && (
            <Pressable
              onPress={leaveClass}
              style={[
                styles.smallButton,
                styles.leaveClassButton
              ]}
            >
              <Text
                style={styles.leaveClassText}
              >
                Leave Class
              </Text>
            </Pressable>
          )}

          {canManageClass(role) && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname:
                    "/class/settings",
                  params: {
                    classId
                  }
                })
              }
              style={
                styles.smallButton
              }
            >
              <Text
                style={
                  styles.smallButtonText
                }
              >
                Settings
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {!!status && (
        <Text style={styles.status}>
          {status}
        </Text>
      )}

      <View style={styles.assignmentToolbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            Assignments
          </Text>
          <Text style={styles.sectionSub}>
            {assignments.length
              ? `${assignments.length} class ${assignments.length === 1 ? "item" : "items"} · swipe vertically`
              : "No class work yet"}
          </Text>
        </View>

        {canTeach && (
          <View style={styles.createMenuWrap}>
            <Pressable
              onPress={() =>
                setShowCreateMenu(
                  (current) => !current
                )
              }
              style={styles.addButton}
              accessibilityLabel="Add class work"
            >
              <Text
                style={styles.addButtonText}
              >
                +
              </Text>
            </Pressable>

            {showCreateMenu && (
              <View style={styles.createMenu}>
                <Pressable
                  onPress={() => {
                    setShowCreateMenu(false);
                    createAssignment();
                  }}
                  style={styles.createMenuItem}
                >
                  <Text style={styles.createMenuText}>
                    Reading Assignment
                  </Text>
                </Pressable>

                <Pressable
                  onPress={createTest}
                  style={styles.createMenuItem}
                >
                  <Text style={styles.createMenuText}>
                    Test
                  </Text>
                </Pressable>

                <Pressable
                  onPress={createDiscussion}
                  style={styles.createMenuItem}
                >
                  <Text style={styles.createMenuText}>
                    Discussion
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      <View
        style={styles.assignmentList}
        onLayout={(event) => {
          const y = Math.floor(
            event.nativeEvent.layout.y
          );

          if (
            y > 0 &&
            y !== assignmentSectionY
          ) {
            setAssignmentSectionY(y);
          }
        }}
      >
        {!assignments.length ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              No assignments yet
            </Text>
            <Text style={styles.emptyText}>
              {canTeach
                ? "Use + to add a reading assignment, test, or discussion."
                : "Your teacher has not posted a reading assignment yet."}
            </Text>

            {canTeach && (
              <Pressable
                onPress={() =>
                  setShowCreateMenu(true)
                }
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>
                  Add Class Work
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          assignments.map((item, index) => (
            <View
              key={String(item.id)}
              onTouchStart={() =>
                setAssignmentIndex(index)
              }
              style={[
                styles.assignmentPage,
                {
                  minHeight:
                    assignmentPageHeight
                }
              ]}
            >
              <View style={styles.assignmentCard}>
                <View style={styles.bookRow}>
                  {!!item.image && (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.cover}
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.assignmentEyebrow}>
                      READING ASSIGNMENT
                    </Text>
                    <Text style={styles.assignmentTitle}>
                      {item.title}
                    </Text>
                    {!!item.author && (
                      <Text style={styles.author}>
                        {item.author}
                      </Text>
                    )}
                  </View>
                </View>

                {!!item.instructions && (
                  <Text style={styles.instructions}>
                    {item.instructions}
                  </Text>
                )}

                <View style={styles.assignmentMeta}>
                  <Meta
                    label="Due"
                    value={formatDue(item.dueAt)}
                  />
                  <Meta
                    label="Paragraphs"
                    value={
                      item.endParagraphIndex === null
                        ? `${item.startParagraphIndex + 1} → end`
                        : `${item.startParagraphIndex + 1}–${item.endParagraphIndex + 1}`
                    }
                  />
                  <Meta
                    label="Points"
                    value={String(item.totalPoints)}
                  />
                  <Meta
                    label="Progress"
                    value={`${assignmentReadingPercent(
                      item,
                      currentProgressByBook[
                        String(item.bookId)
                      ] || null
                    )}%`}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Pressable
                    onPress={() =>
                      openAssignment(item)
                    }
                    style={styles.readButton}
                  >
                    <Text style={styles.readButtonText}>
                      {canTeach
                        ? "Open Reading"
                        : "Start Assignment"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname:
                          "/class/assignment-discussions",
                        params: {
                          classId,
                          assignmentId:
                            item.id,
                          assignmentTitle:
                            item.title
                        }
                      })
                    }
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Discussions
                    </Text>
                  </Pressable>

                  {canTeach && (
                    <View style={styles.teacherActions}>
                      <Pressable
                        onPress={() =>
                          editAssignment(item)
                        }
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>
                          Edit
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          confirmDelete(item)
                        }
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              {index < assignments.length - 1 && (
                <Text style={styles.verticalSwipeHint}>
                  Swipe up for next class item
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      <Pressable
        onPress={openDiscussion}
        disabled={!generalDiscussion}
        style={styles.discussionBar}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={
              styles.discussionLabel
            }
          >
            General Class Discussion
          </Text>
          <Text
            numberOfLines={1}
            style={
              styles.discussionSub
            }
          >
            {generalDiscussion
              ? "Open class-wide discussion"
              : "Discussion unavailable"}
          </Text>
        </View>
        <Text
          style={
            styles.discussionArrow
          }
        >
          ›
        </Text>
      </Pressable>

      </ScrollView>
      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaBox}>
      <Text style={styles.metaLabel}>
        {label}
      </Text>
      <Text style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900",
    marginBottom: 8
  },
  eyebrow: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  title: {
    color: BRAND.ink,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  rolePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line
  },
  roleText: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 11
  },
  metaText: {
    color: BRAND.muted,
    fontSize: 11
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  smallButton: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  smallButtonText: {
    color: BRAND.tealDark,
    fontWeight: "900",
    fontSize: 12
  },
  leaveClassButton: {
    borderColor: "#E4CACA"
  },
  leaveClassText: {
    color: BRAND.danger,
    fontWeight: "900",
    fontSize: 12
  },
  status: {
    color: BRAND.tealDark,
    backgroundColor: "#FFF8DF",
    padding: 8,
    textAlign: "center"
  },
  assignmentToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 9
  },
  sectionTitle: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  sectionSub: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 2
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: BRAND.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 22,
    lineHeight: 24
  },
  createMenuWrap: {
    position: "relative",
    zIndex: 40
  },
  createMenu: {
    position: "absolute",
    right: 0,
    top: 48,
    minWidth: 190,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5
    },
    elevation: 8
  },
  createMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  createMenuText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 18
  },
  assignmentList: {
    paddingBottom: 8
  },
  emptyWrap: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    padding: 30
  },
  emptyTitle: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  emptyText: {
    color: BRAND.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8
  },
  emptyButton: {
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 16
  },
  emptyButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  assignmentPage: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: "center"
  },
  verticalSwipeHint: {
    color: BRAND.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8
  },
  assignmentCard: {
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 22,
    padding: 18
  },
  bookRow: {
    flexDirection: "row",
    gap: 13
  },
  cover: {
    width: 68,
    height: 98,
    borderRadius: 8,
    backgroundColor: "#E8EEEE"
  },
  assignmentEyebrow: {
    color: BRAND.tealDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  assignmentTitle: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4
  },
  author: {
    color: BRAND.muted,
    marginTop: 5
  },
  instructions: {
    color: BRAND.ink,
    lineHeight: 21,
    marginTop: 16
  },
  assignmentMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18
  },
  metaBox: {
    flex: 1,
    backgroundColor: BRAND.background,
    borderRadius: 11,
    padding: 9
  },
  metaLabel: {
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  metaValue: {
    color: BRAND.ink,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3
  },
  cardFooter: {
    paddingTop: 16
  },
  readButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  readButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  teacherActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 9
  },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: BRAND.teal,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  deleteButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  deleteButtonText: {
    color: BRAND.danger,
    fontWeight: "900"
  },
  discussionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 13,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    backgroundColor: BRAND.surface
  },
  discussionLabel: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  discussionSub: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 2
  },
  discussionArrow: {
    color: BRAND.tealDark,
    fontSize: 24,
    fontWeight: "900"
  }
});
