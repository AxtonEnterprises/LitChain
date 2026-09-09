import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  AppState,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";

import {
  router,
  useLocalSearchParams
} from "expo-router";

import { BRAND } from "../../../shared/brand";

import {
  findResumePage,
  normalizeBookText,
  paginateParagraphsByGeometry,
  pageStartParagraph,
  splitBookParagraphs
} from "../../../shared/readerCore";

import {
  getNativeReadingProgress,
  saveNativeReadingPosition,
  saveNativeReadingProgress
} from "../../services/reading";

import {
  addNativeJournalEntry,
  deleteNativeJournalEntry,
  getNativeBookSaved,
  getNativeJournalForBook,
  getNativeReaderGroups,
  removeNativeSavedBook,
  saveNativeBook
} from "../../services/readerLibrary";

function makeToc(paragraphs) {
  const headings = [];
  const seen = new Set();

  const patterns = [
    /^(chapter|chap\.?)\s+([ivxlcdm\d]+)\b/i,
    /^(book|part)\s+([ivxlcdm\d]+)\b/i,
    /^(act)\s+([ivxlcdm\d]+)\b/i,
    /^(canto)\s+([ivxlcdm\d]+)\b/i,
    /^(scene)\s+([ivxlcdm\d]+)\b/i,
    /^(prologue|epilogue|preface|introduction)\b/i
  ];

  paragraphs.forEach((paragraph, index) => {
    const text = String(paragraph || "").replace(/\s+/g, " ").trim();

    if (!text || text.length > 110 || text.split(" ").length > 14) return;
    if (!patterns.some((pattern) => pattern.test(text))) return;

    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    headings.push({ title: text, paragraphIndex: index });
  });

  if (!headings.length) {
    for (let index = 0; index < paragraphs.length; index += 50) {
      headings.push({
        title: index === 0 ? "Beginning" : `Paragraph ${index + 1}`,
        paragraphIndex: index
      });
    }
  }

  return headings;
}

function formatNoteDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export default function Reader() {
  const params = useLocalSearchParams();

  const bookId = String(params.bookId || "");
  const title = String(params.title || "Book");
  const author = String(params.author || "");
  const image = String(params.image || "");

  const requestedStart =
    params.startParagraph !== undefined
      ? Math.max(Number(params.startParagraph) || 0, 0)
      : null;

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [font, setFont] = useState(18);
  const [dark, setDark] = useState(false);
  const [resume, setResume] = useState(0);
  const [verified, setVerified] = useState(0);
  const [activePercent, setActivePercent] = useState(0);
  const [verifiedPercent, setVerifiedPercent] = useState(0);
  const [readerHeight, setReaderHeight] = useState(0);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  const [saved, setSaved] = useState(false);
  const [savingBook, setSavingBook] = useState(false);

  const [showToc, setShowToc] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteVisibility, setNoteVisibility] = useState("private");
  const [noteGroupId, setNoteGroupId] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState(null);
  const [savingNote, setSavingNote] = useState(false);

  const ref = useRef(null);
  const readingTimeBankRef = useRef(0);
  const registeringRef = useRef(false);
  const { width } = useWindowDimensions();

  const paragraphs = useMemo(
    () => splitBookParagraphs(text),
    [text]
  );

  const toc = useMemo(
    () => makeToc(paragraphs),
    [paragraphs]
  );

  const pages = useMemo(
    () =>
      paginateParagraphsByGeometry({
        paragraphs,
        containerWidth: width,
        containerHeight: readerHeight,
        fontSize: font
      }),
    [paragraphs, width, readerHeight, font]
  );

  const currentParagraphIndexes = useMemo(
    () => [...new Set((pages[page] || []).map((item) => item.index))],
    [pages, page]
  );

  const currentNotes = useMemo(() => {
    const visible = new Set(currentParagraphIndexes);
    return notes.filter((note) => visible.has(Number(note.paragraphIndex)));
  }, [notes, currentParagraphIndexes]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState) => setAppActive(nextState === "active")
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      getNativeBookSaved(bookId),
      getNativeReaderGroups()
    ]).then(([isSaved, groupList]) => {
      if (!active) return;
      setSaved(Boolean(isSaved));
      setGroups(groupList || []);
    });

    return () => { active = false; };
  }, [bookId]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const progress = await getNativeReadingProgress(bookId);

        if (active) {
          setVerified(
            Number(
              progress?.verifiedParagraphIndex ??
              progress?.paragraphIndex ??
              0
            ) || 0
          );

          setActivePercent(Number(progress?.activePercent || 0));
          setVerifiedPercent(Number(progress?.percentComplete || 0));

          setResume(
            requestedStart !== null
              ? requestedStart
              : Number(
                  progress?.activeParagraphIndex ??
                  progress?.paragraphIndex ??
                  0
                ) || 0
          );
        }

        const urls = [
          `https://litchain.org/api/book-text?id=${encodeURIComponent(bookId)}`,
          `https://litchain.org/api/book?id=${encodeURIComponent(bookId)}`
        ];

        let loaded = "";

        for (const url of urls) {
          const response = await fetch(url);
          if (!response.ok) continue;

          const contentType = response.headers.get("content-type") || "";

          const value =
            contentType.includes("application/json")
              ? await response.json()
              : await response.text();

          loaded = normalizeBookText(value);
          if (loaded) break;
        }

        if (active) setText(loaded);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [bookId, requestedStart]);

  useEffect(() => {
    if (!pages.length) return;

    const index = findResumePage(pages, resume);
    setPage(index);

    requestAnimationFrame(() =>
      ref.current?.scrollToIndex({
        index,
        animated: false
      })
    );
  }, [pages.length, resume]);

  async function loadNotes() {
    try {
      setNotesLoading(true);
      setNotes(await getNativeJournalForBook(bookId));
    } finally {
      setNotesLoading(false);
    }
  }

  async function openNotes() {
    await loadNotes();

    if (selectedParagraphIndex === null && currentParagraphIndexes.length) {
      setSelectedParagraphIndex(currentParagraphIndexes[0]);
    }

    setShowNotes(true);
  }

  async function toggleSaved() {
    if (savingBook) return;

    try {
      setSavingBook(true);

      if (saved) {
        await removeNativeSavedBook(bookId);
        setSaved(false);
      } else {
        await saveNativeBook({ bookId, title, author, image });
        setSaved(true);
      }
    } finally {
      setSavingBook(false);
    }
  }

  async function saveNote() {
    if (
      savingNote ||
      selectedParagraphIndex === null ||
      !noteText.trim()
    ) {
      return;
    }

    try {
      setSavingNote(true);

      const created = await addNativeJournalEntry({
        bookId,
        title,
        author,
        paragraphIndex: selectedParagraphIndex,
        paragraphPreview: paragraphs[selectedParagraphIndex] || "",
        note: noteText,
        visibility: noteVisibility,
        groupId: noteVisibility === "group" ? noteGroupId : null
      });

      setNotes((current) => [created, ...current]);

      setNoteText("");
      setNoteVisibility("private");
      setNoteGroupId("");
      setShowAddNote(false);
    } finally {
      setSavingNote(false);
    }
  }

  async function removeNote(entryId) {
    await deleteNativeJournalEntry(entryId);
    setNotes((current) =>
      current.filter((item) => String(item.id) !== String(entryId))
    );
  }

  async function persistPosition(index) {
    const paragraphIndex = pageStartParagraph(pages, index);

    const result = await saveNativeReadingPosition({
      bookId,
      title,
      author,
      paragraphIndex,
      totalParagraphs: paragraphs.length,
      image
    });

    if (result) setActivePercent(result.activePercent);
  }

  useEffect(() => {
    readingTimeBankRef.current = 0;
  }, [page, bookId]);

  useEffect(() => {
    if (
      !bookId ||
      !pages.length ||
      !paragraphs.length ||
      !appActive ||
      showToc ||
      showNotes ||
      showAddNote
    ) {
      return;
    }

    const visibleParagraphs = [
      ...new Set((pages[page] || []).map((item) => item.index))
    ];

    const candidate = Math.min(
      Math.max(Number(verified) || 0, 0) + 1,
      paragraphs.length - 1
    );

    if (!visibleParagraphs.includes(candidate)) return;

    let lastTick = Date.now();

    const interval = setInterval(async () => {
      const now = Date.now();
      const delta = Math.max(0, now - lastTick);
      lastTick = now;

      if (!appActive) return;

      readingTimeBankRef.current += delta;

      if (
        registeringRef.current ||
        readingTimeBankRef.current < 1000
      ) {
        return;
      }

      registeringRef.current = true;

      try {
        const result = await saveNativeReadingProgress({
          bookId,
          title,
          author,
          paragraphIndex: candidate,
          totalParagraphs: paragraphs.length,
          image
        });

        if (result) {
          const nextVerified =
            Number(result.verifiedParagraphIndex ?? candidate) || 0;

          if (nextVerified > verified) {
            readingTimeBankRef.current =
              Math.max(0, readingTimeBankRef.current - 1000);
          }

          setVerified(nextVerified);
          setVerifiedPercent(Number(result.percentComplete || 0));
        }
      } finally {
        registeringRef.current = false;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    appActive,
    author,
    bookId,
    image,
    page,
    pages,
    paragraphs.length,
    showAddNote,
    showNotes,
    showToc,
    title,
    verified
  ]);

  function go(index) {
    const safe = Math.max(
      0,
      Math.min(index, Math.max(pages.length - 1, 0))
    );

    setPage(safe);
    persistPosition(safe);

    ref.current?.scrollToIndex({
      index: safe,
      animated: true
    });
  }

  function goToParagraph(paragraphIndex) {
    const target = findResumePage(pages, paragraphIndex);
    setResume(paragraphIndex);
    setSelectedParagraphIndex(paragraphIndex);
    setShowToc(false);
    go(target);
  }

  const palette = dark
    ? {
        bg: "#111516",
        surface: "#171D1E",
        text: "#EEF3F3",
        muted: "#9BA9AA",
        line: "#263234"
      }
    : {
        bg: "#FFFDF8",
        surface: "#FFF",
        text: "#242A2B",
        muted: "#79888A",
        line: BRAND.line
      };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.line
          }
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>

        <View style={styles.titleWrap}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: palette.text }]}
          >
            {title}
          </Text>

          {!!author && (
            <Text
              numberOfLines={1}
              style={{ color: palette.muted, fontSize: 11 }}
            >
              {author}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => setDark((value) => !value)}
          style={styles.headerIcon}
        >
          <Text
            style={[
              styles.modeGlyph,
              { color: dark ? "#EEF3F3" : BRAND.ink }
            ]}
          >
            {dark ? "☀" : "☾"}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.readerToolbar,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.line
          }
        ]}
      >
        <Pressable onPress={() => setShowToc(true)} style={styles.readerTool}>
          <Text style={styles.readerToolText}>☰ TOC</Text>
        </Pressable>

        <Pressable onPress={openNotes} style={styles.readerTool}>
          <Text style={styles.readerToolText}>✎ Notes</Text>
        </Pressable>

        <Pressable
          onPress={toggleSaved}
          disabled={savingBook}
          style={styles.readerTool}
        >
          <Text style={styles.readerToolText}>
            {saved ? "★ Saved" : "☆ Save"}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.progressWrap,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.line
          }
        ]}
      >
        <View style={styles.progressCopy}>
          <Text style={[styles.progressLabel, { color: palette.muted }]}>
            Active
          </Text>
          <Text style={[styles.progressValue, { color: palette.text }]}>
            {activePercent}%
          </Text>
        </View>

        <View style={styles.progressCopy}>
          <Text style={[styles.progressLabel, { color: palette.muted }]}>
            Verified
          </Text>
          <Text style={[styles.progressValue, { color: BRAND.tealDark }]}>
            {verifiedPercent}%
          </Text>
        </View>

        <Text style={[styles.verifiedParagraph, { color: palette.muted }]}>
          verified through ¶{verified + 1}
        </Text>
      </View>

      <View
        style={styles.readerViewport}
        onLayout={(event) => {
          const nextHeight = Math.floor(event.nativeEvent.layout.height);

          if (nextHeight > 0 && nextHeight !== readerHeight) {
            setReaderHeight(nextHeight);
          }
        }}
      >
        {!!readerHeight && (
          <FlatList
            ref={ref}
            horizontal
            pagingEnabled
            data={pages}
            key={`${width}:${readerHeight}:${font}`}
            keyExtractor={(_, index) => String(index)}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index
            })}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(
                event.nativeEvent.contentOffset.x / Math.max(width, 1)
              );

              setPage(next);
              persistPosition(next);
            }}
            renderItem={({ item }) => (
              <View style={[styles.page, { width }]}>
                {item.map((paragraph, fragmentIndex) => {
                  const selected =
                    selectedParagraphIndex === paragraph.index;

                  const hasNote = notes.some(
                    (note) =>
                      Number(note.paragraphIndex) === paragraph.index
                  );

                  return (
                    <Pressable
                      key={`${paragraph.index}:${fragmentIndex}`}
                      onLongPress={() => {
                        setSelectedParagraphIndex(paragraph.index);
                        setShowNotes(true);
                        setShowAddNote(true);
                        void loadNotes();
                      }}
                      style={[
                        styles.row,
                        selected && styles.selectedRow
                      ]}
                    >
                      <Text
                        style={[
                          styles.num,
                          {
                            color: hasNote
                              ? BRAND.tealDark
                              : palette.muted
                          }
                        ]}
                      >
                        {paragraph.continuation
                          ? ""
                          : hasNote
                            ? `${paragraph.index + 1} •`
                            : paragraph.index + 1}
                      </Text>

                      <Text
                        style={{
                          flex: 1,
                          color: palette.text,
                          fontSize: font,
                          lineHeight: font * 1.55
                        }}
                      >
                        {paragraph.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        )}
      </View>

      <View
        style={[
          styles.controls,
          {
            backgroundColor: palette.surface,
            borderTopColor: palette.line
          }
        ]}
      >
        <Pressable onPress={() => go(page - 1)} style={styles.controlButton}>
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>

        <Pressable
          onPress={() => setFont((value) => Math.max(14, value - 1))}
          style={styles.controlButton}
        >
          <Text style={styles.controlText}>A−</Text>
        </Pressable>

        <Text style={{ color: palette.muted, fontWeight: "700" }}>
          {page + 1}/{Math.max(pages.length, 1)}
        </Text>

        <Pressable
          onPress={() => setFont((value) => Math.min(28, value + 1))}
          style={styles.controlButton}
        >
          <Text style={styles.controlText}>A+</Text>
        </Pressable>

        <Pressable onPress={() => go(page + 1)} style={styles.controlButton}>
          <Text style={styles.navGlyph}>›</Text>
        </Pressable>
      </View>

      <Modal
        visible={showToc}
        animationType="slide"
        onRequestClose={() => setShowToc(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Table of Contents</Text>
            <Pressable
              onPress={() => setShowToc(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <FlatList
            data={toc}
            keyExtractor={(item, index) =>
              `${item.paragraphIndex}:${index}`
            }
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => goToParagraph(item.paragraphIndex)}
                style={styles.tocRow}
              >
                <Text style={styles.tocTitle}>{item.title}</Text>
                <Text style={styles.tocParagraph}>
                  ¶{item.paragraphIndex + 1}
                </Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showNotes}
        animationType="slide"
        onRequestClose={() => {
          setShowNotes(false);
          setShowAddNote(false);
        }}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Notes</Text>
              <Text style={styles.modalSubtitle}>
                Page {page + 1}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setShowNotes(false);
                setShowAddNote(false);
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalList}>
            <View style={styles.noteParagraphPicker}>
              <Text style={styles.sectionLabel}>Paragraph</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {currentParagraphIndexes.map((index) => (
                  <Pressable
                    key={index}
                    onPress={() => setSelectedParagraphIndex(index)}
                    style={[
                      styles.paragraphChip,
                      selectedParagraphIndex === index &&
                        styles.paragraphChipActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.paragraphChipText,
                        selectedParagraphIndex === index &&
                          styles.paragraphChipTextActive
                      ]}
                    >
                      ¶{index + 1}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Pressable
              onPress={() => setShowAddNote(true)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>+ Add note</Text>
            </Pressable>

            {showAddNote && (
              <View style={styles.noteEditor}>
                <Text style={styles.sectionLabel}>
                  Note on ¶{(selectedParagraphIndex ?? 0) + 1}
                </Text>

                <Text numberOfLines={4} style={styles.paragraphPreview}>
                  {paragraphs[selectedParagraphIndex ?? 0]}
                </Text>

                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  placeholder="Write your note…"
                  style={styles.noteInput}
                />

                <Text style={styles.sectionLabel}>Visibility</Text>

                <View style={styles.visibilityRow}>
                  {[
                    ["private", "Private"],
                    ["public", "Public"],
                    ["group", "Group"]
                  ].map(([value, label]) => (
                    <Pressable
                      key={value}
                      onPress={() => {
                        setNoteVisibility(value);
                        if (value !== "group") setNoteGroupId("");
                      }}
                      style={[
                        styles.visibilityChip,
                        noteVisibility === value &&
                          styles.visibilityChipActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.visibilityText,
                          noteVisibility === value &&
                            styles.visibilityTextActive
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {noteVisibility === "group" && (
                  <View style={styles.groupPicker}>
                    <Text style={styles.sectionLabel}>Share with</Text>

                    {groups.length ? (
                      groups.map((group) => (
                        <Pressable
                          key={group.id}
                          onPress={() => setNoteGroupId(String(group.id))}
                          style={[
                            styles.groupRow,
                            noteGroupId === String(group.id) &&
                              styles.groupRowActive
                          ]}
                        >
                          <Text style={styles.groupName}>
                            {group.name || group.title || "Group"}
                          </Text>
                        </Pressable>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>
                        No groups available.
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.editorActions}>
                  <Pressable
                    onPress={() => setShowAddNote(false)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={saveNote}
                    disabled={
                      savingNote ||
                      !noteText.trim() ||
                      (noteVisibility === "group" && !noteGroupId)
                    }
                    style={styles.primaryButtonSmall}
                  >
                    <Text style={styles.primaryButtonText}>Save note</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {notesLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} />
            ) : currentNotes.length ? (
              currentNotes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteCardHeader}>
                    <Text style={styles.noteMeta}>
                      ¶{Number(note.paragraphIndex) + 1}
                      {" · "}
                      {note.visibility || "private"}
                      {formatNoteDate(
                        note.updatedAtISO || note.createdAt
                      )
                        ? ` · ${formatNoteDate(
                            note.updatedAtISO || note.createdAt
                          )}`
                        : ""}
                    </Text>

                    <Pressable onPress={() => removeNote(note.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.noteText}>{note.note}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                No notes on this page yet.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  navGlyph: {
    color: BRAND.tealDark,
    fontSize: 30,
    fontWeight: "700"
  },
  modeGlyph: {
    fontSize: 21,
    fontWeight: "900"
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: 6
  },
  title: {
    fontWeight: "900",
    fontSize: 17
  },
  readerToolbar: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  readerTool: {
    minHeight: 36,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  readerToolText: {
    color: BRAND.tealDark,
    fontSize: 12,
    fontWeight: "900"
  },
  progressWrap: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 18,
    alignItems: "center"
  },
  progressCopy: {
    flexDirection: "row",
    gap: 4,
    alignItems: "baseline"
  },
  progressLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    fontWeight: "800"
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "900"
  },
  verifiedParagraph: {
    flex: 1,
    textAlign: "right",
    fontSize: 9
  },
  readerViewport: {
    flex: 1,
    overflow: "hidden"
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 0
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
    borderRadius: 8
  },
  selectedRow: {
    backgroundColor: "rgba(59,182,177,0.10)"
  },
  num: {
    width: 34,
    fontSize: 10,
    paddingTop: 4
  },
  controls: {
    minHeight: 62,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  controlButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  controlText: {
    color: BRAND.tealDark,
    fontSize: 16,
    fontWeight: "900"
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#F7FAFA"
  },
  modalHeader: {
    minHeight: 72,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalTitle: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  modalSubtitle: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 3
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  closeText: {
    color: BRAND.ink,
    fontSize: 30
  },
  modalList: {
    padding: 18,
    paddingBottom: 60
  },
  tocRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  tocTitle: {
    flex: 1,
    color: BRAND.ink,
    fontWeight: "800"
  },
  tocParagraph: {
    color: BRAND.muted,
    marginLeft: 12
  },
  noteParagraphPicker: {
    marginBottom: 14
  },
  sectionLabel: {
    color: BRAND.ink,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8
  },
  paragraphChip: {
    minWidth: 52,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  paragraphChipActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  paragraphChipText: {
    color: BRAND.ink,
    fontWeight: "800"
  },
  paragraphChipTextActive: {
    color: "#FFFFFF"
  },
  primaryButton: {
    minHeight: 46,
    backgroundColor: BRAND.teal,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  primaryButtonSmall: {
    minHeight: 44,
    paddingHorizontal: 18,
    backgroundColor: BRAND.teal,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: BRAND.ink,
    fontWeight: "800"
  },
  noteEditor: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18
  },
  paragraphPreview: {
    color: BRAND.muted,
    lineHeight: 19,
    marginBottom: 12
  },
  noteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    padding: 12,
    color: BRAND.ink,
    textAlignVertical: "top",
    marginBottom: 16,
    backgroundColor: "#FAFCFC"
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  visibilityChip: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  visibilityChipActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  visibilityText: {
    color: BRAND.ink,
    fontWeight: "800",
    fontSize: 12
  },
  visibilityTextActive: {
    color: "#FFFFFF"
  },
  groupPicker: {
    marginBottom: 14
  },
  groupRow: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    marginBottom: 7
  },
  groupRowActive: {
    borderColor: BRAND.teal,
    backgroundColor: "rgba(59,182,177,0.08)"
  },
  groupName: {
    color: BRAND.ink,
    fontWeight: "800"
  },
  editorActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10
  },
  noteCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  noteMeta: {
    flex: 1,
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  noteText: {
    color: BRAND.ink,
    lineHeight: 20
  },
  deleteText: {
    color: "#A34242",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 10
  },
  emptyText: {
    color: BRAND.muted,
    textAlign: "center",
    paddingVertical: 24
  }
});
