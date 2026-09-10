import {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Image,
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
  canTeachClass,
  getNativeClass
} from "../../services/classFoundation";

import {
  createNativeClassAssignment,
  getNativeClassAssignment,
  updateNativeClassAssignment
} from "../../services/classAssignments";

import {
  searchNativeBooks
} from "../../services/bookSearch";

function cleanNumberInput(value) {
  return String(value || "")
    .replace(/[^\d]/g, "")
    .slice(0, 8);
}

export default function AssignmentEdit() {
  const params = useLocalSearchParams();
  const classId = String(
    params.classId || ""
  );
  const assignmentId = String(
    params.assignmentId || ""
  );
  const editing = Boolean(assignmentId);

  const [classData, setClassData] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [status, setStatus] =
    useState("");

  const [title, setTitle] =
    useState("");
  const [instructions, setInstructions] =
    useState("");
  const [dueAt, setDueAt] =
    useState("");
  const [startParagraph, setStartParagraph] =
    useState("1");
  const [endParagraph, setEndParagraph] =
    useState("");
  const [points, setPoints] =
    useState("100");

  const [book, setBook] =
    useState(null);
  const [searchText, setSearchText] =
    useState("");
  const [searchResults, setSearchResults] =
    useState([]);
  const [searching, setSearching] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const loadedClass =
          await getNativeClass(classId);

        if (
          !canTeachClass(
            loadedClass.membership?.role
          )
        ) {
          throw new Error(
            "Only the Primary Teacher, Teacher, or Aide can manage assignments."
          );
        }

        if (!active) return;

        setClassData(loadedClass);

        if (editing) {
          const assignment =
            await getNativeClassAssignment(
              classId,
              assignmentId
            );

          if (!active) return;

          setTitle(assignment.title);
          setInstructions(
            assignment.instructions || ""
          );
          setDueAt(
            assignment.dueAt || ""
          );
          setStartParagraph(
            String(
              Number(
                assignment.startParagraphIndex
              ) + 1
            )
          );
          setEndParagraph(
            assignment.endParagraphIndex ===
              null
              ? ""
              : String(
                  Number(
                    assignment.endParagraphIndex
                  ) + 1
                )
          );
          setPoints(
            String(
              assignment.totalPoints || 100
            )
          );
          setBook({
            id: assignment.bookId,
            title: assignment.title,
            author: assignment.author,
            image: assignment.image || ""
          });
        }
      } catch (error) {
        setStatus(
          error?.message ||
            "Could not load assignment."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [classId, assignmentId, editing]);

  async function runSearch() {
    const term = searchText.trim();

    if (term.length < 2) {
      setStatus(
        "Enter at least 2 characters."
      );
      return;
    }

    try {
      setSearching(true);
      setStatus("");

      const results =
        await searchNativeBooks(term);

      setSearchResults(results);

      if (!results.length) {
        setStatus(
          "No matching books found."
        );
      }
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not search books."
      );
    } finally {
      setSearching(false);
    }
  }

  function chooseBook(result) {
    setBook(result);

    if (!title.trim()) {
      setTitle(result.title);
    }

    setSearchResults([]);
    setSearchText("");
  }

  async function save() {
    if (!book?.id) {
      setStatus(
        "Choose a book before saving."
      );
      return;
    }

    try {
      setSaving(true);
      setStatus("");

      const startIndex = Math.max(
        Number(startParagraph || 1) - 1,
        0
      );

      const endIndex =
        endParagraph.trim() === ""
          ? null
          : Math.max(
              Number(endParagraph) - 1,
              startIndex
            );

      const payload = {
        bookId: book.id,
        title,
        author: book.author || "",
        image: book.image || "",
        instructions,
        dueAt,
        startParagraphIndex:
          startIndex,
        endParagraphIndex:
          endIndex,
        totalPoints:
          Math.max(
            Number(points) || 100,
            1
          )
      };

      if (editing) {
        await updateNativeClassAssignment(
          classId,
          assignmentId,
          payload
        );
      } else {
        await createNativeClassAssignment(
          classId,
          payload
        );
      }

      router.replace({
        pathname: "/class/[classId]",
        params: {
          classId,
          refresh: Date.now()
        }
      });
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not save assignment."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (
    !classData ||
    !canTeachClass(
      classData.membership?.role
    )
  ) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.denied}>
            {status ||
              "You do not have permission to manage assignments."}
          </Text>
        </View>
        <BottomNav active="groups" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
      >
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹ Class
          </Text>
        </Pressable>

        <Text style={styles.title}>
          {editing
            ? "Edit Reading Assignment"
            : "New Reading Assignment"}
        </Text>

        <Text style={styles.label}>
          Book
        </Text>

        {book ? (
          <View style={styles.bookSelected}>
            {!!book.image && (
              <Image
                source={{ uri: book.image }}
                style={styles.cover}
              />
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={styles.bookTitle}
              >
                {book.title}
              </Text>
              <Text
                style={styles.bookAuthor}
              >
                {book.author}
              </Text>
            </View>

            <Pressable
              onPress={() => setBook(null)}
            >
              <Text style={styles.change}>
                Change
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.searchRow}>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={runSearch}
                placeholder="Search title or author"
                style={styles.searchInput}
              />

              <Pressable
                disabled={searching}
                onPress={runSearch}
                style={styles.searchButton}
              >
                <Text
                  style={styles.searchButtonText}
                >
                  {searching
                    ? "…"
                    : "Search"}
                </Text>
              </Pressable>
            </View>

            {searchResults.map(
              (result) => (
                <Pressable
                  key={result.id}
                  onPress={() =>
                    chooseBook(result)
                  }
                  style={styles.result}
                >
                  {!!result.image && (
                    <Image
                      source={{
                        uri: result.image
                      }}
                      style={
                        styles.resultCover
                      }
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={2}
                      style={
                        styles.resultTitle
                      }
                    >
                      {result.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={
                        styles.resultAuthor
                      }
                    >
                      {result.author}
                    </Text>
                  </View>
                </Pressable>
              )
            )}
          </>
        )}

        <Text style={styles.label}>
          Assignment title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Assignment title"
          style={styles.input}
        />

        <Text style={styles.label}>
          Instructions
        </Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          placeholder="What should students read or focus on?"
          multiline
          style={[
            styles.input,
            styles.instructions
          ]}
        />

        <Text style={styles.label}>
          Due date
        </Text>
        <TextInput
          value={dueAt}
          onChangeText={setDueAt}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          style={styles.input}
        />

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.label}>
              Start paragraph
            </Text>
            <TextInput
              value={startParagraph}
              onChangeText={(value) =>
                setStartParagraph(
                  cleanNumberInput(value)
                )
              }
              keyboardType="number-pad"
              placeholder="1"
              style={styles.input}
            />
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>
              End paragraph
            </Text>
            <TextInput
              value={endParagraph}
              onChangeText={(value) =>
                setEndParagraph(
                  cleanNumberInput(value)
                )
              }
              keyboardType="number-pad"
              placeholder="End of book"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.help}>
          Paragraph numbers shown to teachers
          are 1-based. Lit Chain stores the
          assignment internally as the
          Reader's 0-based paragraph index.
        </Text>

        <Text style={styles.label}>
          Grade points
        </Text>
        <TextInput
          value={points}
          onChangeText={(value) =>
            setPoints(
              cleanNumberInput(value)
            )
          }
          keyboardType="number-pad"
          placeholder="100"
          style={styles.input}
        />

        <Pressable
          disabled={saving}
          onPress={save}
          style={styles.saveButton}
        >
          <Text
            style={styles.saveButtonText}
          >
            {saving
              ? "Saving…"
              : editing
                ? "Save Changes"
                : "Create Assignment"}
          </Text>
        </Pressable>

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  content: {
    padding: 18,
    paddingBottom: 110
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  denied: {
    color: BRAND.muted,
    textAlign: "center",
    lineHeight: 21
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900",
    marginBottom: 18
  },
  title: {
    color: BRAND.ink,
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 8
  },
  label: {
    color: BRAND.ink,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 7
  },
  input: {
    minHeight: 48,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12
  },
  instructions: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  searchRow: {
    flexDirection: "row",
    gap: 8
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12
  },
  searchButton: {
    minWidth: 82,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  searchButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  result: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 13,
    padding: 10,
    marginTop: 8
  },
  resultCover: {
    width: 42,
    height: 60,
    borderRadius: 5,
    backgroundColor: "#E8EEEE"
  },
  resultTitle: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  resultAuthor: {
    color: BRAND.muted,
    fontSize: 12,
    marginTop: 3
  },
  bookSelected: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 12
  },
  cover: {
    width: 48,
    height: 68,
    borderRadius: 6,
    backgroundColor: "#E8EEEE"
  },
  bookTitle: {
    color: BRAND.ink,
    fontWeight: "900"
  },
  bookAuthor: {
    color: BRAND.muted,
    fontSize: 12,
    marginTop: 3
  },
  change: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  twoColumns: {
    flexDirection: "row",
    gap: 10
  },
  column: {
    flex: 1
  },
  help: {
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "900"
  },
  status: {
    color: BRAND.tealDark,
    backgroundColor: "#FFF8DF",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    textAlign: "center"
  }
});
