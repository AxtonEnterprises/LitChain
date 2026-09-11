import { auth } from "../lib/firebase";

import { getNativeClassAssignments } from "./classAssignments";
import {
  getNativeClassTests,
  getMyNativeTestSubmission,
  getNativeTestSubmissions
} from "./classTests";
import {
  assignmentReadingPercent,
  getNativeClassStudentProgress,
  progressMapForUser,
  syncNativeClassReadingProgress
} from "./classProgress";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  return user;
}

function typeOf(assignment) {
  return assignment?.type === "test" ? "test" : "reading";
}

function pointsOf(assignment) {
  return Math.max(Number(assignment?.totalPoints) || 0, 0);
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

export async function getNativeClassGradeAssignments(classId) {
  const [reading, tests] = await Promise.all([
    getNativeClassAssignments(classId),
    getNativeClassTests(classId)
  ]);

  return [...reading, ...tests]
    .map((item) => ({ ...item, type: typeOf(item) }))
    .sort((a, b) =>
      String(b.updatedAtISO || b.createdAtISO || "").localeCompare(
        String(a.updatedAtISO || a.createdAtISO || "")
      )
    );
}

export function buildNativeReadingGradeRow(assignment, progress) {
  const percent = assignmentReadingPercent(assignment, progress);
  const maxPoints = pointsOf(assignment);
  const score = round1((maxPoints * percent) / 100);

  return {
    assignmentId: assignment.id,
    title: assignment.title || "Reading assignment",
    type: "reading",
    dueAt: assignment.dueAt || null,
    graded: true,
    pending: false,
    complete: percent >= 100,
    progressPercent: percent,
    score,
    maxPoints,
    percent
  };
}

export function buildNativeTestGradeRow(assignment, submission) {
  const maxPoints = pointsOf(assignment);
  const graded = Boolean(submission?.graded);
  const pending = Boolean(submission) && !graded;
  const score = graded ? Math.max(Number(submission?.score) || 0, 0) : null;
  const percent = graded && maxPoints > 0
    ? round1((score / maxPoints) * 100)
    : null;

  return {
    assignmentId: assignment.id,
    title: assignment.title || "Test",
    type: "test",
    dueAt: assignment.dueAt || null,
    graded,
    pending,
    complete: Boolean(submission),
    progressPercent: submission ? 100 : 0,
    score,
    maxPoints,
    percent,
    feedback: submission?.feedback || "",
    submission: submission || null
  };
}

export function summarizeNativeGrades(rows) {
  const counted = (rows || []).filter((row) => row.graded);
  const earned = round1(
    counted.reduce((sum, row) => sum + (Number(row.score) || 0), 0)
  );
  const possible = round1(
    counted.reduce((sum, row) => sum + (Number(row.maxPoints) || 0), 0)
  );
  const percent = possible > 0 ? round1((earned / possible) * 100) : 0;

  return {
    earned,
    possible,
    percent,
    countedAssignments: counted.length,
    pendingAssignments: (rows || []).filter((row) => row.pending).length,
    totalAssignments: (rows || []).length
  };
}

export async function getMyNativeClassGrades(classId) {
  const user = requireUser();

  try {
    await syncNativeClassReadingProgress(classId);
  } catch {}

  const [assignments, progressRows] = await Promise.all([
    getNativeClassGradeAssignments(classId),
    getNativeClassStudentProgress(classId)
  ]);

  const byBook = progressMapForUser(progressRows, user.uid);

  const rows = await Promise.all(
    assignments.map(async (assignment) => {
      if (typeOf(assignment) === "test") {
        const submission = await getMyNativeTestSubmission(classId, assignment.id);
        return buildNativeTestGradeRow(assignment, submission);
      }

      return buildNativeReadingGradeRow(
        assignment,
        byBook[String(assignment.bookId)] || null
      );
    })
  );

  return { assignments, rows, summary: summarizeNativeGrades(rows) };
}

function activeStudents(members) {
  return (members || []).filter(
    (member) =>
      !["owner", "admin", "moderator"].includes(member.role) &&
      !["removed", "suspended"].includes(member.status)
  );
}

export async function getNativeClassGradebook(classId, members) {
  requireUser();

  const students = activeStudents(members);
  const [assignments, progressRows] = await Promise.all([
    getNativeClassGradeAssignments(classId),
    getNativeClassStudentProgress(classId)
  ]);

  const tests = assignments.filter((assignment) => typeOf(assignment) === "test");
  const submissions = await Promise.all(
    tests.map(async (assignment) => [
      assignment.id,
      await getNativeTestSubmissions(classId, assignment.id)
    ])
  );

  const submissionsByTest = Object.fromEntries(
    submissions.map(([assignmentId, rows]) => [
      assignmentId,
      new Map(
        rows.map((submission) => [
          String(submission.userId || submission.id),
          submission
        ])
      )
    ])
  );

  return students.map((student) => {
    const userId = String(student.userId || student.id);
    const byBook = progressMapForUser(progressRows, userId);

    const rows = assignments.map((assignment) => {
      if (typeOf(assignment) === "test") {
        return buildNativeTestGradeRow(
          assignment,
          submissionsByTest[assignment.id]?.get(userId) || null
        );
      }

      return buildNativeReadingGradeRow(
        assignment,
        byBook[String(assignment.bookId)] || null
      );
    });

    return {
      ...student,
      grades: rows,
      gradeSummary: summarizeNativeGrades(rows)
    };
  });
}
