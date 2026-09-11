import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import { createNativeNotification } from "./notifications";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  return user;
}

function cleanString(value) {
  return String(value || "").trim();
}

function totalPoints(questions) {
  return (questions || []).reduce(
    (sum, question) =>
      sum + Math.max(Number(question.points) || 0, 0),
    0
  );
}

function normalizeQuestion(question, index) {
  const type =
    question?.type === "short_answer"
      ? "short_answer"
      : "multiple_choice";

  const prompt = cleanString(question?.prompt);
  const points = Math.max(
    Math.round(Number(question?.points) || 1),
    1
  );

  const id =
    cleanString(question?.id) ||
    `q${index + 1}`;

  if (!prompt) return null;

  if (type === "multiple_choice") {
    const options = Array.isArray(question?.options)
      ? question.options
          .map(cleanString)
          .filter(Boolean)
          .slice(0, 8)
      : [];

    if (options.length < 2) return null;

    return {
      id,
      type,
      prompt,
      points,
      options
    };
  }

  return {
    id,
    type,
    prompt,
    points
  };
}

function cleanQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map(normalizeQuestion)
    .filter(Boolean)
    .slice(0, 100);
}

function cleanAnswerKey(questions, answerKey = {}) {
  const result = {};

  for (const question of questions) {
    const source =
      answerKey?.[question.id] || {};

    if (question.type === "multiple_choice") {
      const max =
        Math.max(
          (question.options || []).length - 1,
          0
        );

      result[question.id] = {
        correctOptionIndex:
          Math.max(
            0,
            Math.min(
              max,
              Math.round(
                Number(
                  source.correctOptionIndex
                ) || 0
              )
            )
          )
      };
    } else {
      result[question.id] = {
        gradingNotes:
          cleanString(
            source.gradingNotes
          ).slice(0, 3000)
      };
    }
  }

  return result;
}

function normalizeTest(data, id = "") {
  return {
    id: id || data?.id || "",
    type: "test",
    title:
      cleanString(data?.title) ||
      "Test",
    instructions:
      cleanString(
        data?.instructions
      ),
    dueAt:
      data?.dueAt || null,
    questions:
      Array.isArray(data?.questions)
        ? data.questions
        : [],
    questionCount:
      Number(data?.questionCount) ||
      (data?.questions || []).length,
    totalPoints:
      Math.max(
        Number(data?.totalPoints) ||
          totalPoints(data?.questions),
        0
      ),
    assignedBy:
      data?.assignedBy || "",
    createdAtISO:
      data?.createdAtISO || "",
    updatedAtISO:
      data?.updatedAtISO || ""
  };
}

async function getClassName(classId) {
  const snapshot = await getDoc(
    doc(
      db,
      "groups",
      String(classId)
    )
  );

  return snapshot.exists()
    ? snapshot.data()?.name ||
        "Your class"
    : "Your class";
}

async function activeStudentIds(classId) {
  const snapshot = await getDocs(
    collection(
      db,
      "groups",
      String(classId),
      "members"
    )
  );

  return snapshot.docs
    .map((item) => ({
      userId: item.id,
      ...item.data()
    }))
    .filter(
      (member) =>
        ![
          "owner",
          "admin",
          "moderator"
        ].includes(member.role) &&
        ![
          "removed",
          "suspended"
        ].includes(member.status)
    )
    .map((member) =>
      String(
        member.userId ||
        member.id
      )
    );
}

async function notifyStudents(
  classId,
  assignmentId,
  assignment,
  action = "assigned"
) {
  const actor = auth.currentUser;
  if (!actor) return;

  const [
    groupName,
    recipients
  ] = await Promise.all([
    getClassName(classId),
    activeStudentIds(classId)
  ]);

  const due =
    assignment.dueAt
      ? ` Due ${assignment.dueAt}.`
      : "";

  const message =
    action === "updated"
      ? `${groupName} updated test “${assignment.title}”.${due}`
      : `${groupName} assigned test “${assignment.title}”.${due}`;

  await Promise.allSettled(
    recipients
      .filter(
        (userId) =>
          userId !== actor.uid
      )
      .map((recipientUserId) =>
        createNativeNotification({
          recipientUserId,
          type:
            "class_assignment",
          actorUserId:
            actor.uid,
          groupId:
            String(classId),
          groupName,
          postId:
            String(assignmentId),
          targetPath:
            `/read/groups/${classId}`,
          message
        })
      )
  );
}

async function notifyGrade(
  classId,
  assignmentId,
  assignment,
  recipientUserId,
  score,
  maxPoints
) {
  const actor = auth.currentUser;
  if (
    !actor ||
    !recipientUserId ||
    actor.uid === recipientUserId
  ) {
    return;
  }

  const groupName =
    await getClassName(classId);

  const percent =
    maxPoints > 0
      ? Math.round(
          (score / maxPoints) *
            100
        )
      : 0;

  await createNativeNotification({
    recipientUserId:
      String(recipientUserId),
    type:
      "class_assignment",
    actorUserId:
      actor.uid,
    groupId:
      String(classId),
    groupName,
    postId:
      String(assignmentId),
    targetPath:
      `/read/groups/${classId}`,
    message:
      `${groupName} graded “${assignment.title}”: ${score}/${maxPoints} (${percent}%).`
  });
}

export async function getNativeClassTests(classId) {
  requireUser();

  const ref = collection(
    db,
    "groups",
    String(classId),
    "assignments"
  );

  let snapshot;

  try {
    snapshot = await getDocs(
      query(
        ref,
        orderBy(
          "createdAtISO",
          "desc"
        )
      )
    );
  } catch {
    snapshot =
      await getDocs(ref);
  }

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter(
      (item) =>
        item.type === "test"
    )
    .map((item) =>
      normalizeTest(
        item,
        item.id
      )
    )
    .sort((a, b) =>
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
}

export async function getNativeClassTest(
  classId,
  assignmentId
) {
  requireUser();

  const snapshot = await getDoc(
    doc(
      db,
      "groups",
      String(classId),
      "assignments",
      String(assignmentId)
    )
  );

  if (
    !snapshot.exists() ||
    snapshot.data()?.type !==
      "test"
  ) {
    throw new Error(
      "Test not found."
    );
  }

  return normalizeTest(
    snapshot.data(),
    snapshot.id
  );
}

export async function getNativeTestAnswerKey(
  classId,
  assignmentId
) {
  requireUser();

  const snapshot = await getDoc(
    doc(
      db,
      "groups",
      String(classId),
      "assignments",
      String(assignmentId),
      "answerKey",
      "current"
    )
  );

  return snapshot.exists()
    ? snapshot.data()
    : null;
}

export async function createNativeClassTest(
  classId,
  payload
) {
  const user = requireUser();

  const title =
    cleanString(payload?.title);

  if (!title) {
    throw new Error(
      "Add a test title."
    );
  }

  const questions =
    cleanQuestions(
      payload?.questions
    );

  if (!questions.length) {
    throw new Error(
      "Add at least one complete test question."
    );
  }

  const answers =
    cleanAnswerKey(
      questions,
      payload?.answerKey
    );

  const now =
    new Date().toISOString();

  const assignmentRef = doc(
    collection(
      db,
      "groups",
      String(classId),
      "assignments"
    )
  );

  const assignment = {
    type:
      "test",
    title,
    author:
      "",
    bookId:
      "",
    instructions:
      cleanString(
        payload?.instructions
      ),
    dueAt:
      cleanString(
        payload?.dueAt
      ) || null,
    startParagraphIndex:
      0,
    endParagraphIndex:
      null,
    questions,
    questionCount:
      questions.length,
    totalPoints:
      totalPoints(questions),
    assignedBy:
      user.uid,
    createdAtISO:
      now,
    createdAt:
      serverTimestamp()
  };

  const batch =
    writeBatch(db);

  batch.set(
    assignmentRef,
    assignment
  );

  batch.set(
    doc(
      assignmentRef,
      "answerKey",
      "current"
    ),
    {
      assignmentId:
        assignmentRef.id,
      answers,
      updatedBy:
        user.uid,
      updatedAtISO:
        now,
      updatedAt:
        serverTimestamp()
    }
  );

  await batch.commit();

  await notifyStudents(
    classId,
    assignmentRef.id,
    assignment
  );

  return assignmentRef.id;
}

export async function updateNativeClassTest(
  classId,
  assignmentId,
  payload
) {
  const user = requireUser();

  const assignmentRef = doc(
    db,
    "groups",
    String(classId),
    "assignments",
    String(assignmentId)
  );

  const existing =
    await getDoc(
      assignmentRef
    );

  if (
    !existing.exists() ||
    existing.data()?.type !==
      "test"
  ) {
    throw new Error(
      "Test not found."
    );
  }

  const title =
    cleanString(payload?.title);

  const questions =
    cleanQuestions(
      payload?.questions
    );

  if (!title) {
    throw new Error(
      "Add a test title."
    );
  }

  if (!questions.length) {
    throw new Error(
      "Add at least one complete test question."
    );
  }

  const answers =
    cleanAnswerKey(
      questions,
      payload?.answerKey
    );

  const now =
    new Date().toISOString();

  const update = {
    title,
    instructions:
      cleanString(
        payload?.instructions
      ),
    dueAt:
      cleanString(
        payload?.dueAt
      ) || null,
    questions,
    questionCount:
      questions.length,
    totalPoints:
      totalPoints(questions),
    updatedAtISO:
      now,
    updatedAt:
      serverTimestamp()
  };

  const batch =
    writeBatch(db);

  batch.update(
    assignmentRef,
    update
  );

  batch.set(
    doc(
      assignmentRef,
      "answerKey",
      "current"
    ),
    {
      assignmentId:
        String(assignmentId),
      answers,
      updatedBy:
        user.uid,
      updatedAtISO:
        now,
      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  await batch.commit();

  await notifyStudents(
    classId,
    assignmentId,
    {
      ...existing.data(),
      ...update,
      type: "test"
    },
    "updated"
  );

  return String(
    assignmentId
  );
}

export async function deleteNativeClassTest(
  classId,
  assignmentId
) {
  requireUser();

  const assignmentRef = doc(
    db,
    "groups",
    String(classId),
    "assignments",
    String(assignmentId)
  );

  const submissions =
    await getDocs(
      collection(
        assignmentRef,
        "submissions"
      )
    );

  const batch =
    writeBatch(db);

  submissions.docs.forEach(
    (item) =>
      batch.delete(item.ref)
  );

  batch.delete(
    doc(
      assignmentRef,
      "answerKey",
      "current"
    )
  );

  batch.delete(
    assignmentRef
  );

  await batch.commit();

  return true;
}

export async function getMyNativeTestSubmission(
  classId,
  assignmentId
) {
  const user = requireUser();

  const snapshot = await getDoc(
    doc(
      db,
      "groups",
      String(classId),
      "assignments",
      String(assignmentId),
      "submissions",
      user.uid
    )
  );

  return snapshot.exists()
    ? {
        id:
          snapshot.id,
        ...snapshot.data()
      }
    : null;
}

export async function submitNativeClassTest(
  classId,
  assignmentId,
  answers
) {
  const user = requireUser();

  const assignment =
    await getNativeClassTest(
      classId,
      assignmentId
    );

  const cleanAnswers = {};

  for (
    const question
    of assignment.questions
  ) {
    const value =
      answers?.[question.id];

    if (
      question.type ===
      "multiple_choice"
    ) {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        continue;
      }

      const optionIndex =
        Number(value);

      if (
        Number.isInteger(
          optionIndex
        ) &&
        optionIndex >= 0 &&
        optionIndex <
          (
            question.options ||
            []
          ).length
      ) {
        cleanAnswers[
          question.id
        ] = optionIndex;
      }
    } else {
      const text =
        cleanString(
          value
        ).slice(0, 10000);

      if (text) {
        cleanAnswers[
          question.id
        ] = text;
      }
    }
  }

  if (
    Object.keys(
      cleanAnswers
    ).length !==
    assignment.questions.length
  ) {
    throw new Error(
      "Answer every question before submitting the test."
    );
  }

  const submissionRef = doc(
    db,
    "groups",
    String(classId),
    "assignments",
    String(assignmentId),
    "submissions",
    user.uid
  );

  const existing =
    await getDoc(
      submissionRef
    );

  if (existing.exists()) {
    throw new Error(
      "This test has already been submitted."
    );
  }

  const submittedAtISO =
    new Date().toISOString();

  const batch =
    writeBatch(db);

  batch.set(
    submissionRef,
    {
      assignmentId:
        String(assignmentId),
      userId:
        user.uid,
      answers:
        cleanAnswers,
      status:
        "submitted",
      graded:
        false,
      score:
        null,
      maxPoints:
        assignment.totalPoints,
      submittedAtISO,
      submittedAt:
        serverTimestamp()
    }
  );

  await batch.commit();

  return getMyNativeTestSubmission(
    classId,
    assignmentId
  );
}

export async function getNativeTestSubmissions(
  classId,
  assignmentId
) {
  requireUser();

  const snapshot =
    await getDocs(
      collection(
        db,
        "groups",
        String(classId),
        "assignments",
        String(assignmentId),
        "submissions"
      )
    );

  const rows =
    snapshot.docs.map(
      (item) => ({
        id: item.id,
        ...item.data()
      })
    );

  return Promise.all(
    rows.map(
      async (row) => {
        let profile = null;

        try {
          const profileSnapshot =
            await getDoc(
              doc(
                db,
                "publicProfiles",
                String(
                  row.userId ||
                  row.id
                )
              )
            );

          if (
            profileSnapshot.exists()
          ) {
            profile = {
              id:
                profileSnapshot.id,
              ...profileSnapshot.data()
            };
          }
        } catch {}

        return {
          ...row,
          profile
        };
      }
    )
  );
}

export async function gradeNativeTestSubmission(
  classId,
  assignmentId,
  userId,
  {
    manualScores = {},
    feedback = ""
  } = {}
) {
  const grader = requireUser();

  const assignment =
    await getNativeClassTest(
      classId,
      assignmentId
    );

  const key =
    await getNativeTestAnswerKey(
      classId,
      assignmentId
    );

  if (!key) {
    throw new Error(
      "This test does not have an answer key."
    );
  }

  const submissionRef = doc(
    db,
    "groups",
    String(classId),
    "assignments",
    String(assignmentId),
    "submissions",
    String(userId)
  );

  const snapshot =
    await getDoc(
      submissionRef
    );

  if (!snapshot.exists()) {
    throw new Error(
      "Test submission not found."
    );
  }

  const submission =
    snapshot.data();

  let autoScore = 0;
  let manualScore = 0;
  const normalized = {};

  for (
    const question
    of assignment.questions
  ) {
    const points =
      Math.max(
        Number(
          question.points
        ) || 0,
        0
      );

    if (
      question.type ===
      "multiple_choice"
    ) {
      if (
        Number(
          submission.answers?.[
            question.id
          ]
        ) ===
        Number(
          key.answers?.[
            question.id
          ]
            ?.correctOptionIndex
        )
      ) {
        autoScore +=
          points;
      }

      continue;
    }

    const awarded =
      Math.min(
        Math.max(
          Number(
            manualScores?.[
              question.id
            ]
          ) || 0,
          0
        ),
        points
      );

    normalized[
      question.id
    ] = awarded;

    manualScore +=
      awarded;
  }

  const maxPoints =
    Math.max(
      Number(
        assignment.totalPoints
      ) || 0,
      0
    );

  const score =
    Math.min(
      autoScore +
        manualScore,
      maxPoints
    );

  const now =
    new Date().toISOString();

  const cleanFeedback =
    cleanString(
      feedback
    ).slice(0, 5000);

  await updateDoc(
    submissionRef,
    {
      graded:
        true,
      status:
        "graded",
      autoScore,
      manualScore,
      manualScores:
        normalized,
      score,
      maxPoints,
      feedback:
        cleanFeedback,
      gradedBy:
        grader.uid,
      gradedAtISO:
        now,
      gradedAt:
        serverTimestamp()
    }
  );

  await notifyGrade(
    classId,
    assignmentId,
    assignment,
    String(userId),
    score,
    maxPoints
  );

  return {
    id:
      String(userId),
    ...submission,
    graded:
      true,
    status:
      "graded",
    autoScore,
    manualScore,
    manualScores:
      normalized,
    score,
    maxPoints,
    feedback:
      cleanFeedback,
    gradedBy:
      grader.uid,
    gradedAtISO:
      now
  };
}
