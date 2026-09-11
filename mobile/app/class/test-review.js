import {
  useCallback,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
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
  useFocusEffect,
  useLocalSearchParams
} from "expo-router";

import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";

import {
  getNativeClassTest,
  getNativeTestAnswerKey,
  getNativeTestSubmissions,
  gradeNativeTestSubmission
} from "../../services/classTests";

function studentName(submission) {
  return (
    submission.profile?.displayName ||
    submission.profile?.username ||
    submission.userId ||
    submission.id ||
    "Student"
  );
}

export default function TestReview() {
  const params =
    useLocalSearchParams();

  const classId =
    String(
      params.classId || ""
    );

  const assignmentId =
    String(
      params.assignmentId || ""
    );

  const [test, setTest] =
    useState(null);

  const [key, setKey] =
    useState(null);

  const [submissions, setSubmissions] =
    useState([]);

  const [selectedId, setSelectedId] =
    useState("");

  const [manualScores, setManualScores] =
    useState({});

  const [feedback, setFeedback] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const load =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setStatus("");

          const [
            loadedTest,
            loadedKey,
            loadedSubmissions
          ] = await Promise.all([
            getNativeClassTest(
              classId,
              assignmentId
            ),
            getNativeTestAnswerKey(
              classId,
              assignmentId
            ),
            getNativeTestSubmissions(
              classId,
              assignmentId
            )
          ]);

          setTest(loadedTest);
          setKey(loadedKey);
          setSubmissions(
            loadedSubmissions
          );

          setSelectedId(
            (current) =>
              current &&
              loadedSubmissions.some(
                (item) =>
                  String(
                    item.userId ||
                    item.id
                  ) ===
                  String(current)
              )
                ? current
                : String(
                    loadedSubmissions[
                      0
                    ]?.userId ||
                    loadedSubmissions[
                      0
                    ]?.id ||
                    ""
                  )
          );
        } catch (error) {
          setStatus(
            error?.message ||
              "Could not load submissions."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        classId,
        assignmentId
      ]
    );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const selected =
    useMemo(
      () =>
        submissions.find(
          (item) =>
            String(
              item.userId ||
              item.id
            ) ===
            String(selectedId)
        ) || null,
      [
        submissions,
        selectedId
      ]
    );

  function choose(submission) {
    const id =
      String(
        submission.userId ||
        submission.id
      );

    setSelectedId(id);
    setManualScores(
      submission.manualScores ||
        {}
    );
    setFeedback(
      submission.feedback ||
        ""
    );
  }

  async function grade() {
    if (!selected) return;

    try {
      setSaving(true);
      setStatus("");

      await gradeNativeTestSubmission(
        classId,
        assignmentId,
        selected.userId ||
          selected.id,
        {
          manualScores,
          feedback
        }
      );

      setStatus(
        "Grade saved."
      );

      await load();
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not save grade."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={styles.center}
        >
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
      >
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Tests
          </Text>
        </Pressable>

        <Text
          style={styles.eyebrow}
        >
          TEACHER REVIEW
        </Text>

        <Text style={styles.title}>
          {test?.title ||
            "Test"}
        </Text>

        <Text
          style={styles.subtitle}
        >
          {
            submissions.length
          }{" "}
          submission
          {submissions.length ===
          1
            ? ""
            : "s"}
        </Text>

        {!!status && (
          <Text
            style={styles.status}
          >
            {status}
          </Text>
        )}

        {!submissions.length ? (
          <View style={styles.empty}>
            <Text
              style={
                styles.emptyTitle
              }
            >
              No submissions yet
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Students
            </Text>

            <View
              style={
                styles.studentChips
              }
            >
              {submissions.map(
                (submission) => {
                  const id =
                    String(
                      submission.userId ||
                      submission.id
                    );

                  return (
                    <Pressable
                      key={id}
                      onPress={() =>
                        choose(
                          submission
                        )
                      }
                      style={[
                        styles.studentChip,
                        selectedId ===
                          id &&
                          styles.studentChipActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.studentChipText,
                          selectedId ===
                            id &&
                            styles.studentChipTextActive
                        ]}
                      >
                        {studentName(
                          submission
                        )}
                        {submission.graded
                          ? " ✓"
                          : ""}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            {!!selected && (
              <>
                <View
                  style={
                    styles.summary
                  }
                >
                  <Text
                    style={
                      styles.summaryName
                    }
                  >
                    {studentName(
                      selected
                    )}
                  </Text>

                  <Text
                    style={
                      styles.summaryScore
                    }
                  >
                    {selected.graded
                      ? `${selected.score}/${selected.maxPoints}`
                      : "Needs grading"}
                  </Text>
                </View>

                {(test?.questions ||
                  []).map(
                  (
                    question,
                    index
                  ) => {
                    const response =
                      selected.answers?.[
                        question.id
                      ];

                    const correctIndex =
                      key?.answers?.[
                        question.id
                      ]
                        ?.correctOptionIndex;

                    const autoCorrect =
                      question.type ===
                        "multiple_choice" &&
                      Number(
                        response
                      ) ===
                        Number(
                          correctIndex
                        );

                    return (
                      <View
                        key={
                          question.id
                        }
                        style={
                          styles.questionCard
                        }
                      >
                        <Text
                          style={
                            styles.questionTitle
                          }
                        >
                          {index + 1}.{" "}
                          {
                            question.prompt
                          }
                        </Text>

                        <Text
                          style={
                            styles.points
                          }
                        >
                          {
                            question.points
                          }{" "}
                          points
                        </Text>

                        {question.type ===
                        "multiple_choice" ? (
                          <>
                            <Text
                              style={
                                styles.answerLabel
                              }
                            >
                              Student answer
                            </Text>

                            <Text
                              style={[
                                styles.answerText,
                                autoCorrect
                                  ? styles.correct
                                  : styles.incorrect
                              ]}
                            >
                              {
                                question.options?.[
                                  Number(
                                    response
                                  )
                                ] ||
                                "No answer"
                              }
                            </Text>

                            {!autoCorrect && (
                              <>
                                <Text
                                  style={
                                    styles.answerLabel
                                  }
                                >
                                  Correct answer
                                </Text>

                                <Text
                                  style={
                                    styles.answerText
                                  }
                                >
                                  {
                                    question.options?.[
                                      Number(
                                        correctIndex
                                      )
                                    ] ||
                                    ""
                                  }
                                </Text>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <Text
                              style={
                                styles.answerLabel
                              }
                            >
                              Student answer
                            </Text>

                            <Text
                              style={
                                styles.answerText
                              }
                            >
                              {String(
                                response ||
                                  ""
                              )}
                            </Text>

                            {!!key
                              ?.answers?.[
                                question.id
                              ]
                              ?.gradingNotes && (
                              <Text
                                style={
                                  styles.rubric
                                }
                              >
                                Rubric:{" "}
                                {
                                  key
                                    .answers[
                                    question.id
                                  ]
                                    .gradingNotes
                                }
                              </Text>
                            )}

                            <Text
                              style={
                                styles.answerLabel
                              }
                            >
                              Points awarded
                            </Text>

                            <TextInput
                              value={String(
                                manualScores?.[
                                  question.id
                                ] ??
                                  selected.manualScores?.[
                                    question.id
                                  ] ??
                                  ""
                              )}
                              onChangeText={(
                                value
                              ) =>
                                setManualScores(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    [question.id]:
                                      value
                                  })
                                )
                              }
                              keyboardType="decimal-pad"
                              placeholder={`0–${question.points}`}
                              style={
                                styles.scoreInput
                              }
                            />
                          </>
                        )}
                      </View>
                    );
                  }
                )}

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Feedback
                </Text>

                <TextInput
                  value={feedback}
                  onChangeText={
                    setFeedback
                  }
                  placeholder="Optional teacher feedback"
                  multiline
                  style={
                    styles.feedbackInput
                  }
                />

                <Pressable
                  disabled={saving}
                  onPress={grade}
                  style={[
                    styles.gradeButton,
                    saving &&
                      styles.disabled
                  ]}
                >
                  <Text
                    style={
                      styles.gradeText
                    }
                  >
                    {saving
                      ? "Saving…"
                      : selected.graded
                        ? "Update Grade"
                        : "Grade Test"}
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>

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
    content: {
      padding: 18,
      paddingBottom: 110
    },
    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center"
    },
    back: {
      color:
        BRAND.tealDark,
      fontWeight: "900",
      marginBottom: 16
    },
    eyebrow: {
      color:
        BRAND.tealDark,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1
    },
    title: {
      color:
        BRAND.ink,
      fontSize: 28,
      fontWeight: "900",
      marginTop: 4
    },
    subtitle: {
      color:
        BRAND.muted,
      marginTop: 4,
      marginBottom: 10
    },
    status: {
      color:
        BRAND.tealDark,
      backgroundColor:
        "#FFF8DF",
      borderRadius: 12,
      padding: 10,
      marginBottom: 12
    },
    empty: {
      padding: 28,
      alignItems:
        "center"
    },
    emptyTitle: {
      color:
        BRAND.ink,
      fontSize: 20,
      fontWeight: "900"
    },
    sectionTitle: {
      color:
        BRAND.ink,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 14,
      marginBottom: 8
    },
    studentChips: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      gap: 7
    },
    studentChip: {
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7
    },
    studentChipActive: {
      backgroundColor:
        BRAND.teal,
      borderColor:
        BRAND.teal
    },
    studentChipText: {
      color:
        BRAND.ink,
      fontWeight: "800",
      fontSize: 11
    },
    studentChipTextActive: {
      color: "#FFF"
    },
    summary: {
      marginTop: 16,
      padding: 14,
      backgroundColor:
        "#E8F7F6",
      borderRadius: 14,
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center"
    },
    summaryName: {
      color:
        BRAND.ink,
      fontWeight: "900"
    },
    summaryScore: {
      color:
        BRAND.tealDark,
      fontWeight: "900"
    },
    questionCard: {
      backgroundColor:
        BRAND.surface,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 16,
      padding: 14,
      marginTop: 12
    },
    questionTitle: {
      color:
        BRAND.ink,
      fontWeight: "900",
      lineHeight: 21
    },
    points: {
      color:
        BRAND.muted,
      fontSize: 10,
      marginTop: 4
    },
    answerLabel: {
      color:
        BRAND.muted,
      fontSize: 10,
      fontWeight: "900",
      marginTop: 10
    },
    answerText: {
      color:
        BRAND.ink,
      lineHeight: 19,
      marginTop: 3
    },
    correct: {
      color:
        BRAND.tealDark,
      fontWeight: "900"
    },
    incorrect: {
      color:
        BRAND.danger,
      fontWeight: "900"
    },
    rubric: {
      color:
        BRAND.tealDark,
      backgroundColor:
        "#FFF8DF",
      borderRadius: 9,
      padding: 9,
      marginTop: 9,
      fontSize: 11
    },
    scoreInput: {
      width: 110,
      minHeight: 44,
      marginTop: 5,
      backgroundColor:
        BRAND.background,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 10,
      paddingHorizontal: 10,
      color:
        BRAND.ink
    },
    feedbackInput: {
      minHeight: 110,
      backgroundColor:
        BRAND.surface,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 12,
      padding: 12,
      color:
        BRAND.ink,
      textAlignVertical:
        "top"
    },
    gradeButton: {
      minHeight: 52,
      borderRadius: 13,
      backgroundColor:
        BRAND.teal,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 14
    },
    gradeText: {
      color: "#FFF",
      fontWeight: "900"
    },
    disabled: {
      opacity: 0.5
    }
  });
