import {
  useCallback,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams
} from "expo-router";

import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";

import {
  canTeachClass,
  getNativeClass
} from "../../services/classFoundation";

import {
  deleteNativeClassTest,
  getMyNativeTestSubmission,
  getNativeClassTests
} from "../../services/classTests";

function dueLabel(value) {
  if (!value) return "No due date";

  const parsed =
    new Date(
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

export default function ClassTests() {
  const params =
    useLocalSearchParams();

  const classId =
    String(
      params.classId || ""
    );

  const [classData, setClassData] =
    useState(null);

  const [tests, setTests] =
    useState([]);

  const [submissions, setSubmissions] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [status, setStatus] =
    useState("");

  const load = useCallback(
    async () => {
      try {
        setLoading(true);
        setStatus("");

        const loadedClass =
          await getNativeClass(
            classId
          );

        const loadedTests =
          await getNativeClassTests(
            classId
          );

        setClassData(
          loadedClass
        );

        setTests(
          loadedTests
        );

        if (
          !canTeachClass(
            loadedClass.membership?.role
          )
        ) {
          const entries =
            await Promise.all(
              loadedTests.map(
                async (test) => [
                  test.id,
                  await getMyNativeTestSubmission(
                    classId,
                    test.id
                  )
                ]
              )
            );

          setSubmissions(
            Object.fromEntries(
              entries
            )
          );
        } else {
          setSubmissions({});
        }
      } catch (error) {
        setStatus(
          error?.message ||
            "Could not load tests."
        );
      } finally {
        setLoading(false);
      }
    },
    [classId]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const role =
    classData?.membership?.role ||
    "member";

  const canTeach =
    canTeachClass(role);

  function create() {
    router.push({
      pathname:
        "/class/test-edit",
      params: {
        classId
      }
    });
  }

  function edit(test) {
    router.push({
      pathname:
        "/class/test-edit",
      params: {
        classId,
        assignmentId:
          test.id
      }
    });
  }

  function open(test) {
    router.push({
      pathname:
        canTeach
          ? "/class/test-review"
          : "/class/test",
      params: {
        classId,
        assignmentId:
          test.id
      }
    });
  }

  function remove(test) {
    Alert.alert(
      "Delete Test",
      `Delete “${test.title}” and its submissions?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress:
            async () => {
              try {
                await deleteNativeClassTest(
                  classId,
                  test.id
                );

                await load();
              } catch (error) {
                setStatus(
                  error?.message ||
                    "Could not delete test."
                );
              }
            }
        }
      ]
    );
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

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Class
          </Text>
        </Pressable>

        <View
          style={{
            flex: 1
          }}
        >
          <Text
            style={styles.eyebrow}
          >
            CLASSROOM
          </Text>
          <Text style={styles.title}>
            Tests & Quizzes
          </Text>
        </View>

        {canTeach && (
          <Pressable
            onPress={create}
            style={
              styles.primaryButton
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              + Test
            </Text>
          </Pressable>
        )}
      </View>

      {!!status && (
        <Text style={styles.status}>
          {status}
        </Text>
      )}

      <FlatList
        data={tests}
        keyExtractor={(item) =>
          String(item.id)
        }
        contentContainerStyle={
          styles.list
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text
              style={
                styles.emptyTitle
              }
            >
              No tests yet
            </Text>
            <Text
              style={
                styles.emptyText
              }
            >
              {canTeach
                ? "Create the first test or quiz for this class."
                : "Your teacher has not posted a test yet."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const submission =
            submissions[item.id];

          return (
            <View
              style={styles.card}
            >
              <Text
                style={
                  styles.testKicker
                }
              >
                TEST ·{" "}
                {item.questionCount}{" "}
                QUESTIONS
              </Text>

              <Text
                style={
                  styles.testTitle
                }
              >
                {item.title}
              </Text>

              {!!item.instructions && (
                <Text
                  numberOfLines={3}
                  style={
                    styles.instructions
                  }
                >
                  {item.instructions}
                </Text>
              )}

              <View
                style={styles.metaRow}
              >
                <Text
                  style={styles.meta}
                >
                  Due{" "}
                  {dueLabel(
                    item.dueAt
                  )}
                </Text>

                <Text
                  style={styles.meta}
                >
                  {item.totalPoints}{" "}
                  points
                </Text>
              </View>

              {!canTeach &&
                submission && (
                  <View
                    style={
                      styles.submissionPill
                    }
                  >
                    <Text
                      style={
                        styles.submissionText
                      }
                    >
                      {submission.graded
                        ? `Graded · ${submission.score}/${submission.maxPoints}`
                        : "Submitted · awaiting grade"}
                    </Text>
                  </View>
                )}

              <View
                style={
                  styles.actions
                }
              >
                <Pressable
                  onPress={() =>
                    open(item)
                  }
                  style={
                    styles.openButton
                  }
                >
                  <Text
                    style={
                      styles.openButtonText
                    }
                  >
                    {canTeach
                      ? "Review Submissions"
                      : submission
                        ? "View Test"
                        : "Start Test"}
                  </Text>
                </Pressable>

                {canTeach && (
                  <>
                    <Pressable
                      onPress={() =>
                        edit(item)
                      }
                      style={
                        styles.secondaryButton
                      }
                    >
                      <Text
                        style={
                          styles.secondaryText
                        }
                      >
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        remove(item)
                      }
                      style={
                        styles.deleteButton
                      }
                    >
                      <Text
                        style={
                          styles.deleteText
                        }
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />

      <BottomNav
        active="groups"
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        BRAND.background
    },
    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center"
    },
    header: {
      minHeight: 92,
      padding: 16,
      backgroundColor:
        BRAND.surface,
      borderBottomWidth: 1,
      borderBottomColor:
        BRAND.line,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    back: {
      color:
        BRAND.tealDark,
      fontWeight: "900"
    },
    eyebrow: {
      color:
        BRAND.tealDark,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1
    },
    title: {
      color: BRAND.ink,
      fontSize: 23,
      fontWeight: "900",
      marginTop: 2
    },
    primaryButton: {
      minHeight: 40,
      borderRadius: 11,
      backgroundColor:
        BRAND.teal,
      paddingHorizontal: 13,
      alignItems:
        "center",
      justifyContent:
        "center"
    },
    primaryButtonText: {
      color: "#FFF",
      fontWeight: "900"
    },
    status: {
      padding: 10,
      textAlign:
        "center",
      color:
        BRAND.tealDark,
      backgroundColor:
        "#FFF8DF"
    },
    list: {
      padding: 14,
      paddingBottom: 100
    },
    card: {
      backgroundColor:
        BRAND.surface,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12
    },
    testKicker: {
      color:
        BRAND.tealDark,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8
    },
    testTitle: {
      color:
        BRAND.ink,
      fontSize: 21,
      fontWeight: "900",
      marginTop: 6
    },
    instructions: {
      color:
        BRAND.muted,
      lineHeight: 20,
      marginTop: 8
    },
    metaRow: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 12
    },
    meta: {
      color:
        BRAND.tealDark,
      fontSize: 11,
      fontWeight: "800"
    },
    submissionPill: {
      alignSelf:
        "flex-start",
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor:
        "#E8F7F6"
    },
    submissionText: {
      color:
        BRAND.tealDark,
      fontSize: 11,
      fontWeight: "900"
    },
    actions: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 16
    },
    openButton: {
      flexGrow: 1,
      minHeight: 42,
      borderRadius: 11,
      backgroundColor:
        BRAND.teal,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 12
    },
    openButtonText: {
      color: "#FFF",
      fontWeight: "900"
    },
    secondaryButton: {
      minHeight: 42,
      borderRadius: 11,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 14
    },
    secondaryText: {
      color:
        BRAND.ink,
      fontWeight: "900"
    },
    deleteButton: {
      minHeight: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 8
    },
    deleteText: {
      color:
        BRAND.danger,
      fontWeight: "900"
    },
    empty: {
      padding: 28,
      alignItems:
        "center"
    },
    emptyTitle: {
      color:
        BRAND.ink,
      fontSize: 22,
      fontWeight: "900"
    },
    emptyText: {
      color:
        BRAND.muted,
      textAlign:
        "center",
      lineHeight: 20,
      marginTop: 8
    }
  });
