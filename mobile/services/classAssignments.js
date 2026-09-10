import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user;
}

function cleanString(value) {
  return String(value || "").trim();
}

export function normalizeReadingAssignment(data, id = "") {
  if (!data) return null;

  return {
    id: id || data.id || "",
    type: "reading",
    bookId: cleanString(data.bookId),
    title: cleanString(data.title) || "Reading Assignment",
    author: cleanString(data.author),
    image: cleanString(data.image),
    instructions: cleanString(data.instructions),
    dueAt: data.dueAt || null,
    startParagraphIndex: Math.max(
      Number(data.startParagraphIndex) || 0,
      0
    ),
    endParagraphIndex:
      data.endParagraphIndex === null ||
      data.endParagraphIndex === undefined ||
      data.endParagraphIndex === ""
        ? null
        : Math.max(
            Number(data.endParagraphIndex) || 0,
            0
          ),
    totalPoints: Math.max(
      Math.round(Number(data.totalPoints) || 100),
      1
    ),
    assignedBy: data.assignedBy || "",
    createdAtISO: data.createdAtISO || "",
    updatedAtISO: data.updatedAtISO || ""
  };
}

export async function getNativeClassAssignments(classId) {
  requireUser();

  const assignmentsRef = collection(
    db,
    "groups",
    String(classId),
    "assignments"
  );

  let snapshot;

  try {
    snapshot = await getDocs(
      query(
        assignmentsRef,
        orderBy("createdAtISO", "desc")
      )
    );
  } catch {
    /*
     * Keep compatibility with legacy assignments that may not
     * have createdAtISO yet.
     */
    snapshot = await getDocs(assignmentsRef);
  }

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((item) => item.type !== "test")
    .map((item) =>
      normalizeReadingAssignment(item, item.id)
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

export async function getNativeClassAssignment(
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

  if (!snapshot.exists()) {
    throw new Error("Assignment not found.");
  }

  const data = {
    id: snapshot.id,
    ...snapshot.data()
  };

  if (data.type === "test") {
    throw new Error(
      "Tests are handled separately from reading assignments."
    );
  }

  return normalizeReadingAssignment(
    data,
    snapshot.id
  );
}

function validateAssignment(assignment) {
  const title = cleanString(assignment?.title);
  const bookId = cleanString(assignment?.bookId);

  if (!title) {
    throw new Error(
      "Add an assignment title."
    );
  }

  if (!bookId) {
    throw new Error(
      "Choose a book for this assignment."
    );
  }

  const startParagraphIndex = Math.max(
    Number(assignment.startParagraphIndex) || 0,
    0
  );

  const endParagraphIndex =
    assignment.endParagraphIndex === "" ||
    assignment.endParagraphIndex === null ||
    assignment.endParagraphIndex === undefined
      ? null
      : Math.max(
          Number(assignment.endParagraphIndex) || 0,
          startParagraphIndex
        );

  return {
    type: "reading",
    bookId,
    title,
    author: cleanString(assignment.author),
    image: cleanString(assignment.image),
    instructions: cleanString(
      assignment.instructions
    ),
    dueAt: cleanString(assignment.dueAt) || null,
    startParagraphIndex,
    endParagraphIndex,
    totalPoints: Math.max(
      Math.round(
        Number(assignment.totalPoints) || 100
      ),
      1
    )
  };
}

export async function createNativeClassAssignment(
  classId,
  assignment
) {
  const user = requireUser();
  const payload = validateAssignment(assignment);
  const now = new Date().toISOString();

  const assignmentRef = doc(
    collection(
      db,
      "groups",
      String(classId),
      "assignments"
    )
  );

  await setDoc(assignmentRef, {
    ...payload,
    assignedBy: user.uid,
    createdAtISO: now,
    updatedAtISO: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return assignmentRef.id;
}

export async function updateNativeClassAssignment(
  classId,
  assignmentId,
  assignment
) {
  requireUser();
  const payload = validateAssignment(assignment);

  await updateDoc(
    doc(
      db,
      "groups",
      String(classId),
      "assignments",
      String(assignmentId)
    ),
    {
      ...payload,
      updatedAtISO:
        new Date().toISOString(),
      updatedAt: serverTimestamp()
    }
  );

  return String(assignmentId);
}

export async function deleteNativeClassAssignment(
  classId,
  assignmentId
) {
  requireUser();

  await deleteDoc(
    doc(
      db,
      "groups",
      String(classId),
      "assignments",
      String(assignmentId)
    )
  );

  return true;
}
