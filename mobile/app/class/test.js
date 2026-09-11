import {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
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
import { BRAND } from "../../../shared/brand";

import {
  getMyNativeTestSubmission,
  getNativeClassTest,
  submitNativeClassTest
} from "../../services/classTests";

export default function TakeTest() {
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

  const [submission, setSubmission] =
    useState(null);

  const [answers, setAnswers] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [status, setStatus] =
    useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [
          loadedTest,
          loadedSubmission
        ] = await Promise.all([
          getNativeClassTest(
            classId,
            assignmentId
          ),
          getMyNativeTestSubmission(
            classId,
            assignmentId
          )
        ]);

        if (!active) return;

        setTest(loadedTest);
        setSubmission(
          loadedSubmission
        );

        if (
          loadedSubmission?.answers
        ) {
          setAnswers(
            loadedSubmission.answers
          );
        }
      } catch (error) {
        if (active) {
          setStatus(
            error?.message ||
              "Could not load test."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    classId,
    assignmentId
  ]);

  async function submit() {
    const complete =
      (test?.questions || []).every(
        (question) => {
          const value =
            answers[
              question.id
            ];

          return question.type ===
            "multiple_choice"
            ? value !==
                undefined &&
                value !==
                null &&
                value !== ""
            : String(
                value || ""
              ).trim().length >
                0;
        }
      );

    if (!complete) {
      setStatus(
        "Answer every question before submitting."
      );
      return;
    }

    Alert.alert(
      "Submit Test",
      "You cannot change your answers after submitting.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Submit",
          onPress:
            async () => {
              try {
                setSubmitting(true);
                setStatus("");

                const saved =
                  await submitNativeClassTest(
                    classId,
                    assignmentId,
                    answers
                  );

                setSubmission(
                  saved
                );
              } catch (error) {
                setStatus(
                  error?.message ||
                    "Could not submit test."
                );
              } finally {
                setSubmitting(false);
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

  if (!test) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <Text
          style={styles.status}
        >
          {status ||
            "Test not found."}
        </Text>
      </SafeAreaView>
    );
  }

  const locked =
    Boolean(submission);

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
          CLASSROOM TEST
        </Text>

        <Text style={styles.title}>
          {test.title}
        </Text>

        {!!test.instructions && (
          <Text
            style={
              styles.instructions
            }
          >
            {test.instructions}
          </Text>
        )}

        <View
          style={styles.metaRow}
        >
          <Text style={styles.meta}>
            {test.questionCount}{" "}
            questions
          </Text>
          <Text style={styles.meta}>
            {test.totalPoints}{" "}
            points
          </Text>
        </View>

        {!!submission && (
          <View
            style={
              styles.submissionCard
            }
          >
            <Text
              style={
                styles.submissionTitle
              }
            >
              {submission.graded
                ? "Graded"
                : "Submitted"}
            </Text>

            <Text
              style={
                styles.submissionDetail
              }
            >
              {submission.graded
                ? `${submission.score}/${submission.maxPoints}`
                : "Your teacher has not graded this test yet."}
            </Text>

            {!!submission.feedback && (
              <Text
                style={
                  styles.feedback
                }
              >
                Teacher feedback:{" "}
                {submission.feedback}
              </Text>
            )}
          </View>
        )}

        {!!status && (
          <Text
            style={styles.status}
          >
            {status}
          </Text>
        )}

        {test.questions.map(
          (question, index) => (
            <View
              key={question.id}
              style={
                styles.questionCard
              }
            >
              <Text
                style={
                  styles.questionNumber
                }
              >
                {index + 1}.{" "}
                {question.prompt}
              </Text>

              <Text
                style={
                  styles.points
                }
              >
                {question.points}{" "}
                {question.points ===
                1
                  ? "point"
                  : "points"}
              </Text>

              {question.type ===
              "multiple_choice" ? (
                <View
                  style={
                    styles.options
                  }
                >
                  {(
                    question.options ||
                    []
                  ).map(
                    (
                      option,
                      optionIndex
                    ) => {
                      const selected =
                        Number(
                          answers[
                            question.id
                          ]
                        ) ===
                        optionIndex;

                      return (
                        <Pressable
                          key={
                            optionIndex
                          }
                          disabled={
                            locked
                          }
                          onPress={() =>
                            setAnswers(
                              (current) => ({
                                ...current,
                                [question.id]:
                                  optionIndex
                              })
                            )
                          }
                          style={
                            styles.option
                          }
                        >
                          <View
                            style={[
                              styles.radio,
                              selected &&
                                styles.radioActive
                            ]}
                          >
                            {selected && (
                              <View
                                style={
                                  styles.radioDot
                                }
                              />
                            )}
                          </View>

                          <Text
                            style={
                              styles.optionText
                            }
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>
              ) : (
                <TextInput
                  editable={!locked}
                  value={
                    String(
                      answers[
                        question.id
                      ] || ""
                    )
                  }
                  onChangeText={(
                    value
                  ) =>
                    setAnswers(
                      (current) => ({
                        ...current,
                        [question.id]:
                          value
                      })
                    )
                  }
                  placeholder="Your answer"
                  multiline
                  style={
                    styles.answerInput
                  }
                />
              )}
            </View>
          )
        )}

        {!locked && (
          <Pressable
            disabled={submitting}
            onPress={submit}
            style={[
              styles.submitButton,
              submitting &&
                styles.disabled
            ]}
          >
            <Text
              style={
                styles.submitText
              }
            >
              {submitting
                ? "Submitting…"
                : "Submit Test"}
            </Text>
          </Pressable>
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
    instructions: {
      color:
        BRAND.muted,
      lineHeight: 20,
      marginTop: 8
    },
    metaRow: {
      flexDirection:
        "row",
      gap: 12,
      marginTop: 12,
      marginBottom: 8
    },
    meta: {
      color:
        BRAND.tealDark,
      fontWeight: "800",
      fontSize: 11
    },
    submissionCard: {
      backgroundColor:
        "#E8F7F6",
      borderRadius: 14,
      padding: 14,
      marginTop: 12
    },
    submissionTitle: {
      color:
        BRAND.tealDark,
      fontWeight: "900"
    },
    submissionDetail: {
      color:
        BRAND.ink,
      marginTop: 4
    },
    feedback: {
      color:
        BRAND.ink,
      lineHeight: 19,
      marginTop: 8
    },
    status: {
      color:
        BRAND.tealDark,
      backgroundColor:
        "#FFF8DF",
      borderRadius: 12,
      padding: 10,
      marginTop: 10
    },
    questionCard: {
      backgroundColor:
        BRAND.surface,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 18,
      padding: 15,
      marginTop: 12
    },
    questionNumber: {
      color:
        BRAND.ink,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 22
    },
    points: {
      color:
        BRAND.muted,
      fontSize: 10,
      fontWeight: "800",
      marginTop: 4
    },
    options: {
      marginTop: 10,
      gap: 7
    },
    option: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      minHeight: 44
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor:
        BRAND.teal,
      alignItems:
        "center",
      justifyContent:
        "center"
    },
    radioActive: {
      borderColor:
        BRAND.tealDark
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor:
        BRAND.teal
    },
    optionText: {
      flex: 1,
      color:
        BRAND.ink,
      lineHeight: 19
    },
    answerInput: {
      minHeight: 100,
      marginTop: 10,
      backgroundColor:
        BRAND.background,
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
    submitButton: {
      minHeight: 52,
      borderRadius: 13,
      backgroundColor:
        BRAND.teal,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 16
    },
    submitText: {
      color: "#FFF",
      fontWeight: "900"
    },
    disabled: {
      opacity: 0.5
    }
  });
