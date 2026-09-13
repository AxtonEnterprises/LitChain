import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams
} from "expo-router";

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
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
  getNativeClassTests
} from "../../services/classTests";

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
    classViewportHeight,
    setClassViewportHeight
  ] = useState(0);
  const [
    activeClassItemIndex,
    setActiveClassItemIndex
  ] = useState(0);
  const [
    joinRequestCount,
    setJoinRequestCount
  ] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setStatus("");

      const [
        loadedClass,
        loadedMembers,
        loadedAssignments,
        loadedTests
      ] = await Promise.all([
        getNativeClass(classId),
        getNativeClassMembers(classId),
        getNativeClassAssignments(classId),
        getNativeClassTests(classId)
      ]);

      const loadedClassItems = [
        ...loadedAssignments,
        ...loadedTests
      ].sort((a, b) =>
        String(
          b.updatedAtISO ||
          b.createdAtISO ||
          ""
        ).localeCompare(
          String(
            a.updatedAtISO ||
            a.createdAtISO ||
            ""
          )
        )
      );

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

      if (
        canTeachClass(
          loadedClass.membership?.role
        )
      ) {
        try {
          const postsSnapshot =
            await getDocs(
              collection(
                db,
                "groups",
                classId,
                "forumPosts"
              )
            );

          await Promise.allSettled(
            postsSnapshot.docs
              .map((postDoc) => ({
                id: postDoc.id,
                ...postDoc.data()
              }))
              .filter(
                (post) =>
                  post.assignmentId &&
                  !post.sourceAssignmentId &&
                  post.isGeneralClassDiscussion !== true
              )
              .map((post) =>
                updateDoc(
                  doc(
                    db,
                    "groups",
                    classId,
                    "forumPosts",
                    String(post.id)
                  ),
                  {
                    sourceAssignmentId:
                      String(post.assignmentId),
                    sourceAssignmentTitle:
                      String(
                        post.assignmentTitle ||
                        ""
                      ),
                    updatedAtISO:
                      new Date().toISOString(),
                    updatedAt:
                      serverTimestamp()
                  }
                )
              )
          );
        } catch (error) {
          console.warn(
            "Class discussion parity migration:",
            error?.code || error
          );
        }
      }

      let pendingJoinRequests = 0;

      if (
        canManageClass(
          loadedClass.membership?.role
        )
      ) {
        try {
          const requestSnapshot =
            await getDocs(
              collection(
                db,
                "groups",
                classId,
                "joinRequests"
              )
            );

          pendingJoinRequests =
            requestSnapshot.docs.filter(
              (requestDoc) => {
                const data =
                  requestDoc.data();

                return (
                  !data.status ||
                  data.status ===
                    "pending"
                );
              }
            ).length;
        } catch {
          pendingJoinRequests = 0;
        }
      }

      setJoinRequestCount(
        pendingJoinRequests
      );
      setClassData(loadedClass);
      setMembers(loadedMembers);
      setAssignments(
        loadedClassItems
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
              loadedClassItems.length - 1,
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
    if (assignment?.type === "test") {
      router.push({
        pathname: "/class/test-edit",
        params: {
          classId,
          assignmentId: assignment.id
        }
      });
      return;
    }

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
    if (assignment?.type === "test") {
      router.push({
        pathname: canTeach
          ? "/class/test-edit"
          : "/class/test",
        params: {
          classId,
          assignmentId: assignment.id
        }
      });
      return;
    }

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

  const classItems = [
    ...assignments,
    ...(generalDiscussion
      ? [{
          id: `general_${generalDiscussion.id}`,
          type: "general_discussion",
          discussion: generalDiscussion
        }]
      : [])
  ];

  function handleClassItemMomentum(event) {
    if (!classViewportHeight) return;

    const next = Math.max(
      0,
      Math.min(
        classItems.length - 1,
        Math.round(
          event.nativeEvent.contentOffset.y /
            classViewportHeight
        )
      )
    );

    setActiveClassItemIndex(next);

    if (next < assignments.length) {
      setAssignmentIndex(next);
    }
  }

  function renderClassItem({ item, index }) {
    if (item.type === "general_discussion") {
      return (
        <View
          style={[
            styles.classItemPage,
            { height: classViewportHeight }
          ]}
        >
          <View style={styles.assignmentCard}>
            <View>
              <Text style={styles.assignmentEyebrow}>
                CLASS DISCUSSION
              </Text>
              <Text style={styles.assignmentTitle}>
                General Class Discussion
              </Text>
              <Text style={styles.author}>
                Class-wide conversation
              </Text>
            </View>

            <View style={styles.discussionBody}>
              <Text style={styles.instructions}>
                {item.discussion?.body ||
                  "A shared discussion space for the entire class."}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Pressable
                onPress={openDiscussion}
                style={styles.readButton}
              >
                <Text style={styles.readButtonText}>
                  Open Discussion
                </Text>
              </Pressable>
            </View>

            <Text style={styles.pageSwipeHint}>
              Swipe up or down for another class item
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.classItemPage,
          { height: classViewportHeight }
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
                {item.type === "test"
                  ? "TEST"
                  : "READING ASSIGNMENT"}
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
            <Text
              numberOfLines={5}
              style={styles.instructions}
            >
              {item.instructions}
            </Text>
          )}

          <View style={styles.assignmentMeta}>
            <Meta
              label="Due"
              value={formatDue(item.dueAt)}
            />

            {item.type === "test" ? (
              <>
                <Meta
                  label="Questions"
                  value={String(
                    item.questionCount ||
                    item.questions?.length ||
                    0
                  )}
                />
                <Meta
                  label="Points"
                  value={String(item.totalPoints)}
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </View>

          <View style={styles.cardFooter}>
            <Pressable
              onPress={() => openAssignment(item)}
              style={styles.readButton}
            >
              <Text style={styles.readButtonText}>
                {item.type === "test"
                  ? canTeach
                    ? "Manage Test"
                    : "Take Test"
                  : canTeach
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
                    assignmentId: item.id,
                    assignmentTitle: item.title
                  }
                })
              }
              style={styles.discussionButton}
            >
              <Text style={styles.secondaryButtonText}>
                Discussions
              </Text>
            </Pressable>

            {canTeach && (
              <View style={styles.teacherActions}>
                <Pressable
                  onPress={() => editAssignment(item)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => confirmDelete(item)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <Text style={styles.pageSwipeHint}>
            Swipe up or down for another class item
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
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
          {classData?.name || "Class"}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actions}
        >
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/class/students",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              Students
            </Text>

            {joinRequestCount > 0 && (
              <View style={styles.studentRequestBadge}>
                <Text style={styles.studentRequestBadgeText}>
                  🔔{joinRequestCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={shareClassroom}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              Share
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/class/progress",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              Progress
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/class/tests",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              Tests
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/class/grades",
                params: { classId }
              })
            }
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              Grades
            </Text>
          </Pressable>

          {canManageClass(role) && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/class/settings",
                  params: { classId }
                })
              }
              style={styles.smallButton}
            >
              <Text style={styles.smallButtonText}>
                Settings
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {!!status && (
        <Text style={styles.status}>
          {status}
        </Text>
      )}

      <View style={styles.assignmentToolbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            Class Items
          </Text>
          <Text style={styles.sectionSub}>
            {classItems.length
              ? `${classItems.length} ${classItems.length === 1 ? "item" : "items"} · Swipe up or down`
              : "No class work yet"}
          </Text>
        </View>

        {canTeach && (
          <View style={styles.createMenuWrap}>
            <Pressable
              onPress={() => setShowCreateMenu(true)}
              style={styles.addButton}
              accessibilityLabel="Add class work"
            >
              <Text style={styles.addButtonText}>
                + Add
              </Text>
            </Pressable>

            <Modal
              visible={showCreateMenu}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() =>
                setShowCreateMenu(false)
              }
            >
              <View style={styles.createMenuOverlay}>
                <Pressable
                  style={styles.createMenuBackdrop}
                  onPress={() =>
                    setShowCreateMenu(false)
                  }
                />

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
              </View>
            </Modal>
          </View>
        )}
      </View>

      <View
        style={styles.classViewport}
        onLayout={(event) => {
          const height = Math.floor(
            event.nativeEvent.layout.height
          );

          if (
            height > 0 &&
            height !== classViewportHeight
          ) {
            setClassViewportHeight(height);
          }
        }}
      >
        {!classItems.length ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              No class items yet
            </Text>
            <Text style={styles.emptyText}>
              {canTeach
                ? "Use + Add to create a reading assignment, test, or discussion."
                : "Your teacher has not posted class work yet."}
            </Text>
          </View>
        ) : (
          !!classViewportHeight && (
            <FlatList
              data={classItems}
              key={`class-items-${classViewportHeight}-${classItems.length}`}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderClassItem}
              showsVerticalScrollIndicator={false}
              snapToInterval={classViewportHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              getItemLayout={(_, index) => ({
                length: classViewportHeight,
                offset:
                  classViewportHeight * index,
                index
              })}
              onMomentumScrollEnd={handleClassItemMomentum}
            />
          )
        )}

        {classItems.length > 1 && (
          <View
            pointerEvents="none"
            style={styles.verticalDots}
          >
            {classItems
              .slice(0, 12)
              .map((item, index) => (
                <View
                  key={String(item.id)}
                  style={[
                    styles.dot,
                    index === activeClassItemIndex &&
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
    paddingBottom: 10,
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
    gap: 8,
    paddingTop: 10,
    paddingRight: 8
  },
  smallButton: {
    position: "relative",
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
  studentRequestBadge: {
    position: "absolute",
    top: -9,
    right: -8,
    minWidth: 28,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: BRAND.yellow,
    alignItems: "center",
    justifyContent: "center"
  },
  studentRequestBadgeText: {
    color: BRAND.ink,
    fontWeight: "900",
    fontSize: 10
  },
  status: {
    color: BRAND.tealDark,
    backgroundColor: "#FFF8DF",
    padding: 7,
    textAlign: "center"
  },
  assignmentToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: BRAND.background,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
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
    minWidth: 74,
    height: 40,
    paddingHorizontal: 14,
    backgroundColor: BRAND.primary,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 13
  },
  createMenuWrap: {
    position: "relative"
  },
  createMenuOverlay: {
    flex: 1
  },
  createMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)"
  },
  createMenu: {
    position: "absolute",
    right: 18,
    top: 168,
    minWidth: 210,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 7
    },
    elevation: 24
  },
  createMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  createMenuText: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  classViewport: {
    flex: 1,
    position: "relative"
  },
  classItemPage: {
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  assignmentCard: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 24,
    padding: 20
  },
  bookRow: {
    flexDirection: "row",
    gap: 13
  },
  cover: {
    width: 76,
    height: 110,
    borderRadius: 9,
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
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4
  },
  author: {
    color: BRAND.muted,
    marginTop: 5,
    fontSize: 14
  },
  instructions: {
    color: BRAND.ink,
    lineHeight: 21,
    marginTop: 16
  },
  discussionBody: {
    flex: 1,
    justifyContent: "center"
  },
  assignmentMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18
  },
  metaBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: BRAND.background,
    borderRadius: 11,
    padding: 9
  },
  metaLabel: {
    color: BRAND.muted,
    fontSize: 9,
    fontWeight: "800"
  },
  metaValue: {
    color: BRAND.ink,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: 14
  },
  readButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  readButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  discussionButton: {
    minHeight: 42,
    marginTop: 8,
    borderWidth: 1,
    borderColor: BRAND.teal,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  teacherActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  secondaryButton: {
    flex: 1,
    minHeight: 40,
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
    minHeight: 40,
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
  pageSwipeHint: {
    color: BRAND.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 9
  },
  verticalDots: {
    position: "absolute",
    right: 5,
    top: "42%",
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
  emptyWrap: {
    flex: 1,
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
  }
});
