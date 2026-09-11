import {
  useEffect,
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
  useLocalSearchParams
} from "expo-router";

import BottomNav from "../../components/BottomNav";
import CalendarField from "../../components/CalendarField";
import { BRAND } from "../../../shared/brand";

import {
  canTeachClass,
  getNativeClass
} from "../../services/classFoundation";

import {
  createNativeClassTest,
  getNativeClassTest,
  getNativeTestAnswerKey,
  updateNativeClassTest
} from "../../services/classTests";

function blankQuestion(index) {
  return {
    id: `q${index + 1}`,
    type: "multiple_choice",
    prompt: "",
    points: "1",
    options: [
      "",
      "",
      "",
      ""
    ],
    correctOptionIndex: 0,
    gradingNotes: ""
  };
}

function fromStored(
  questions,
  answerKey
) {
  return (questions || []).map(
    (question, index) => ({
      id:
        question.id ||
        `q${index + 1}`,
      type:
        question.type ===
        "short_answer"
          ? "short_answer"
          : "multiple_choice",
      prompt:
        question.prompt || "",
      points:
        String(
          question.points || 1
        ),
      options:
        question.type ===
        "multiple_choice"
          ? [
              ...(question.options || [])
            ]
          : [
              "",
              "",
              "",
              ""
            ],
      correctOptionIndex:
        Number(
          answerKey?.[
            question.id
          ]?.correctOptionIndex
        ) || 0,
      gradingNotes:
        answerKey?.[
          question.id
        ]?.gradingNotes || ""
    })
  );
}

export default function TestEdit() {
  const params =
    useLocalSearchParams();

  const classId =
    String(
      params.classId || ""
    );

  const assignmentId =
    String(
      params.assignmentId ||
      ""
    );

  const editing =
    Boolean(assignmentId);

  const [title, setTitle] =
    useState("");

  const [
    instructions,
    setInstructions
  ] = useState("");

  const [dueAt, setDueAt] =
    useState("");

  const [questions, setQuestions] =
    useState([
      blankQuestion(0)
    ]);

  const [loading, setLoading] =
    useState(editing);

  const [saving, setSaving] =
    useState(false);

  const [status, setStatus] =
    useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const classData =
          await getNativeClass(
            classId
          );

        if (
          !canTeachClass(
            classData.membership?.role
          )
        ) {
          throw new Error(
            "Only classroom staff can manage tests."
          );
        }

        if (!editing) {
          return;
        }

        const [
          test,
          key
        ] = await Promise.all([
          getNativeClassTest(
            classId,
            assignmentId
          ),
          getNativeTestAnswerKey(
            classId,
            assignmentId
          )
        ]);

        if (!active) return;

        setTitle(test.title || "");
        setInstructions(
          test.instructions || ""
        );
        setDueAt(
          test.dueAt || ""
        );
        setQuestions(
          fromStored(
            test.questions,
            key?.answers || {}
          )
        );
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
    assignmentId,
    editing
  ]);

  const totalPoints =
    useMemo(
      () =>
        questions.reduce(
          (sum, question) =>
            sum +
            Math.max(
              Number(
                question.points
              ) || 0,
              0
            ),
          0
        ),
      [questions]
    );

  function updateQuestion(
    index,
    updates
  ) {
    setQuestions(
      (current) =>
        current.map(
          (question, i) =>
            i === index
              ? {
                  ...question,
                  ...updates
                }
              : question
        )
    );
  }

  function addQuestion() {
    setQuestions(
      (current) => [
        ...current,
        blankQuestion(
          current.length
        )
      ]
    );
  }

  function removeQuestion(
    index
  ) {
    setQuestions(
      (current) => {
        const next =
          current.filter(
            (_, i) =>
              i !== index
          );

        return next.length
          ? next
          : [
              blankQuestion(0)
            ];
      }
    );
  }

  function setOption(
    questionIndex,
    optionIndex,
    value
  ) {
    const next = [
      ...questions[
        questionIndex
      ].options
    ];

    next[optionIndex] =
      value;

    updateQuestion(
      questionIndex,
      {
        options: next
      }
    );
  }

  async function save() {
    try {
      setSaving(true);
      setStatus("");

      const payloadQuestions =
        questions.map(
          (question, index) => ({
            id:
              question.id ||
              `q${index + 1}`,
            type:
              question.type,
            prompt:
              question.prompt,
            points:
              Number(
                question.points
              ) || 1,
            options:
              question.type ===
              "multiple_choice"
                ? question.options
                : undefined
          })
        );

      const answerKey =
        Object.fromEntries(
          questions.map(
            (question, index) => [
              question.id ||
                `q${index + 1}`,
              question.type ===
              "multiple_choice"
                ? {
                    correctOptionIndex:
                      Number(
                        question.correctOptionIndex
                      ) || 0
                  }
                : {
                    gradingNotes:
                      question.gradingNotes
                  }
            ]
          )
        );

      const payload = {
        title,
        instructions,
        dueAt,
        questions:
          payloadQuestions,
        answerKey
      };

      if (editing) {
        await updateNativeClassTest(
          classId,
          assignmentId,
          payload
        );
      } else {
        await createNativeClassTest(
          classId,
          payload
        );
      }

      router.replace({
        pathname:
          "/class/tests",
        params: {
          classId
        }
      });
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not save test."
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
          CLASSROOM TEST
        </Text>
        <Text style={styles.title}>
          {editing
            ? "Edit Test"
            : "Create Test"}
        </Text>

        {!!status && (
          <Text
            style={styles.status}
          >
            {status}
          </Text>
        )}

        <Text style={styles.label}>
          Test title
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Quiz 1"
          style={styles.input}
        />

        <Text style={styles.label}>
          Instructions
        </Text>

        <TextInput
          value={instructions}
          onChangeText={
            setInstructions
          }
          placeholder="Optional instructions"
          multiline
          style={[
            styles.input,
            styles.multiline
          ]}
        />

        <Text style={styles.label}>
          Due date
        </Text>

        <CalendarField
          value={dueAt}
          onChange={setDueAt}
          placeholder="Select due date"
        />

        <View
          style={
            styles.questionsHeading
          }
        >
          <Text
            style={
              styles.questionsTitle
            }
          >
            Questions
          </Text>

          <Text
            style={styles.points}
          >
            {totalPoints} points
          </Text>
        </View>

        {questions.map(
          (question, index) => (
            <View
              key={`${question.id}_${index}`}
              style={
                styles.questionCard
              }
            >
              <View
                style={
                  styles.questionHeader
                }
              >
                <Text
                  style={
                    styles.questionNumber
                  }
                >
                  Question{" "}
                  {index + 1}
                </Text>

                <Pressable
                  onPress={() =>
                    removeQuestion(
                      index
                    )
                  }
                >
                  <Text
                    style={
                      styles.remove
                    }
                  >
                    Remove
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={
                  question.prompt
                }
                onChangeText={(
                  value
                ) =>
                  updateQuestion(
                    index,
                    {
                      prompt: value
                    }
                  )
                }
                placeholder="Question"
                multiline
                style={[
                  styles.input,
                  styles.prompt
                ]}
              />

              <Text
                style={
                  styles.smallLabel
                }
              >
                Question type
              </Text>

              <View
                style={
                  styles.typeRow
                }
              >
                {[
                  [
                    "multiple_choice",
                    "Multiple Choice"
                  ],
                  [
                    "short_answer",
                    "Short Answer"
                  ]
                ].map(
                  ([
                    value,
                    label
                  ]) => (
                    <Pressable
                      key={value}
                      onPress={() =>
                        updateQuestion(
                          index,
                          {
                            type:
                              value
                          }
                        )
                      }
                      style={[
                        styles.typeButton,
                        question.type ===
                          value &&
                          styles.typeButtonActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          question.type ===
                            value &&
                            styles.typeTextActive
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Text
                style={
                  styles.smallLabel
                }
              >
                Points
              </Text>

              <TextInput
                value={
                  String(
                    question.points
                  )
                }
                onChangeText={(
                  value
                ) =>
                  updateQuestion(
                    index,
                    {
                      points:
                        value
                    }
                  )
                }
                keyboardType="number-pad"
                style={[
                  styles.input,
                  styles.pointsInput
                ]}
              />

              {question.type ===
              "multiple_choice" ? (
                <>
                  <Text
                    style={
                      styles.smallLabel
                    }
                  >
                    Answers
                  </Text>

                  {question.options.map(
                    (
                      option,
                      optionIndex
                    ) => (
                      <View
                        key={
                          optionIndex
                        }
                        style={
                          styles.optionRow
                        }
                      >
                        <Pressable
                          onPress={() =>
                            updateQuestion(
                              index,
                              {
                                correctOptionIndex:
                                  optionIndex
                              }
                            )
                          }
                          style={[
                            styles.radio,
                            Number(
                              question.correctOptionIndex
                            ) ===
                              optionIndex &&
                              styles.radioActive
                          ]}
                        >
                          {Number(
                            question.correctOptionIndex
                          ) ===
                            optionIndex && (
                            <View
                              style={
                                styles.radioDot
                              }
                            />
                          )}
                        </Pressable>

                        <TextInput
                          value={
                            option
                          }
                          onChangeText={(
                            value
                          ) =>
                            setOption(
                              index,
                              optionIndex,
                              value
                            )
                          }
                          placeholder={`Answer ${optionIndex + 1}`}
                          style={[
                            styles.input,
                            styles.optionInput
                          ]}
                        />
                      </View>
                    )
                  )}
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.smallLabel
                    }
                  >
                    Teacher grading notes
                  </Text>

                  <TextInput
                    value={
                      question.gradingNotes
                    }
                    onChangeText={(
                      value
                    ) =>
                      updateQuestion(
                        index,
                        {
                          gradingNotes:
                            value
                        }
                      )
                    }
                    placeholder="Optional answer key / rubric notes"
                    multiline
                    style={[
                      styles.input,
                      styles.multiline
                    ]}
                  />
                </>
              )}
            </View>
          )
        )}

        <Pressable
          onPress={addQuestion}
          style={
            styles.addQuestion
          }
        >
          <Text
            style={
              styles.addQuestionText
            }
          >
            + Add Question
          </Text>
        </Pressable>

        <Pressable
          disabled={saving}
          onPress={save}
          style={[
            styles.saveButton,
            saving &&
              styles.disabled
          ]}
        >
          <Text
            style={
              styles.saveButtonText
            }
          >
            {saving
              ? "Saving…"
              : editing
                ? "Save Test"
                : "Create Test"}
          </Text>
        </Pressable>
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
      marginTop: 3,
      marginBottom: 16
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
    label: {
      color:
        BRAND.ink,
      fontWeight: "900",
      marginTop: 12,
      marginBottom: 6
    },
    smallLabel: {
      color:
        BRAND.muted,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 12,
      marginBottom: 6
    },
    input: {
      minHeight: 48,
      backgroundColor:
        BRAND.surface,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color:
        BRAND.ink
    },
    multiline: {
      minHeight: 88,
      textAlignVertical:
        "top"
    },
    prompt: {
      minHeight: 72,
      textAlignVertical:
        "top"
    },
    pointsInput: {
      width: 110
    },
    questionsHeading: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 24,
      marginBottom: 8
    },
    questionsTitle: {
      color:
        BRAND.ink,
      fontSize: 21,
      fontWeight: "900"
    },
    points: {
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
      borderRadius: 18,
      padding: 14,
      marginBottom: 12
    },
    questionHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 10
    },
    questionNumber: {
      color:
        BRAND.ink,
      fontWeight: "900"
    },
    remove: {
      color:
        BRAND.danger,
      fontWeight: "800",
      fontSize: 12
    },
    typeRow: {
      flexDirection:
        "row",
      gap: 8
    },
    typeButton: {
      flex: 1,
      minHeight: 40,
      borderWidth: 1,
      borderColor:
        BRAND.line,
      borderRadius: 10,
      alignItems:
        "center",
      justifyContent:
        "center"
    },
    typeButtonActive: {
      backgroundColor:
        BRAND.teal,
      borderColor:
        BRAND.teal
    },
    typeText: {
      color:
        BRAND.ink,
      fontWeight: "800",
      fontSize: 11
    },
    typeTextActive: {
      color: "#FFF"
    },
    optionRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      marginBottom: 8
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
        "center",
      flexShrink: 0
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
    optionInput: {
      flex: 1
    },
    addQuestion: {
      minHeight: 46,
      borderWidth: 1,
      borderColor:
        BRAND.teal,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center"
    },
    addQuestionText: {
      color:
        BRAND.tealDark,
      fontWeight: "900"
    },
    saveButton: {
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
    saveButtonText: {
      color: "#FFF",
      fontWeight: "900"
    },
    disabled: {
      opacity: 0.5
    }
  });
