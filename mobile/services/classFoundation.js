import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import {
  getNativeGroupMembers,
  updateNativeGroupMemberRole
} from "./groupMembership";
import { getNativeFriends } from "./social";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  return user;
}

export function classRoleLabel(role) {
  if (role === "owner") return "Primary Teacher";
  if (role === "admin") return "Teacher";
  if (role === "moderator") return "Aide";
  return "Student";
}

export function canTeachClass(role) {
  return ["owner", "admin", "moderator"].includes(role);
}

export function canManageClass(role) {
  return ["owner", "admin"].includes(role);
}

export async function getNativeClass(classId) {
  const user = requireUser();
  const id = String(classId || "");
  if (!id) throw new Error("Missing class ID.");

  const [groupSnapshot, memberSnapshot] = await Promise.all([
    getDoc(doc(db, "groups", id)),
    getDoc(doc(db, "groups", id, "members", user.uid))
  ]);

  if (!groupSnapshot.exists()) throw new Error("Class not found.");

  const group = { id: groupSnapshot.id, ...groupSnapshot.data() };
  if (group.type !== "class") throw new Error("This item is not a class.");
  if (!memberSnapshot.exists()) throw new Error("You are not a member of this class.");

  const membership = { id: memberSnapshot.id, ...memberSnapshot.data() };
  if (["removed", "suspended"].includes(membership.status)) {
    throw new Error("Your class membership is inactive.");
  }

  return { ...group, membership };
}

export async function getNativeClassMembers(classId) {
  return getNativeGroupMembers(classId);
}

export async function getNativeClassFriends(classId) {
  const [members, friends] = await Promise.all([
    getNativeClassMembers(classId),
    getNativeFriends()
  ]);

  const memberIds = new Set(
    members.map((member) => String(member.userId || member.id))
  );

  return friends.filter(
    (friend) => !memberIds.has(String(friend.otherUserId || friend.id))
  );
}

export async function getGeneralClassDiscussion(classId) {
  requireUser();

  const fixed = await getDoc(
    doc(db, "groups", String(classId), "forumPosts", "general-class-discussion")
  );

  if (fixed.exists()) return { id: fixed.id, ...fixed.data() };

  const snapshot = await getDocs(
    collection(db, "groups", String(classId), "forumPosts")
  );

  const match = snapshot.docs.find((item) => {
    const data = item.data();
    return (
      data.isGeneralClassDiscussion === true ||
      String(data.title || "").trim().toLowerCase() === "general class discussion"
    );
  });

  return match ? { id: match.id, ...match.data() } : null;
}

export async function ensureNativeGeneralClassDiscussion(classId) {
  const user = requireUser();
  const classData = await getNativeClass(classId);

  if (!canTeachClass(classData.membership?.role)) {
    throw new Error("Only classroom staff can initialize the discussion.");
  }

  const existing = await getGeneralClassDiscussion(classId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const ref = doc(db, "groups", String(classId), "forumPosts", "general-class-discussion");

  const payload = {
    id: "general-class-discussion",
    groupId: String(classId),
    userId: user.uid,
    title: "General Class Discussion",
    body: "General discussion for this class.",
    pinned: false,
    locked: false,
    isGeneralClassDiscussion: true,
    forumUpCount: 0,
    forumDownCount: 0,
    forumScore: 0,
    createdAtISO: now,
    updatedAtISO: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, payload);
  return payload;
}

export async function inviteNativeClassFriend(classId, userId) {
  const user = requireUser();
  const cleanClassId = String(classId || "");
  const cleanUserId = String(userId || "");

  if (!cleanClassId || !cleanUserId) throw new Error("Missing class or student.");

  const now = new Date().toISOString();

  await setDoc(
    doc(db, "groups", cleanClassId, "invites", cleanUserId),
    {
      userId: cleanUserId,
      groupId: cleanClassId,
      status: "pending",
      invitedBy: user.uid,
      invitedAtISO: now,
      invitedAt: serverTimestamp()
    }
  );

  return true;
}

export async function setNativeClassRole(classId, userId, classRole) {
  const map = {
    teacher: "admin",
    aide: "moderator",
    student: "member"
  };

  const role = map[classRole] || classRole;

  if (!["admin", "moderator", "member"].includes(role)) {
    throw new Error("Unsupported classroom role.");
  }

  return updateNativeGroupMemberRole(classId, userId, role);
}

export async function removeNativeClassMember(classId, userId) {
  requireUser();
  await deleteDoc(doc(db, "groups", String(classId), "members", String(userId)));
  return true;
}

export async function saveNativeClassSettings(
  classId,
  {
    name,
    description = "",
    avatar = "",
    visibility = "private",
    joinPolicy = "invite_only"
  }
) {
  requireUser();

  const cleanName = String(name || "").trim();
  if (cleanName.length < 2) throw new Error("Enter a class name.");

  const safeVisibility = ["private", "discoverable", "public"].includes(visibility)
    ? visibility
    : "private";

  const safeJoinPolicy = ["invite_only", "request_to_join", "open"].includes(joinPolicy)
    ? joinPolicy
    : "invite_only";

  await updateDoc(
    doc(db, "groups", String(classId)),
    {
      name: cleanName,
      description: String(description || "").trim(),
      avatar,
      visibility: safeVisibility,
      discoverable: safeVisibility === "discoverable",
      joinPolicy: safeJoinPolicy,
      updatedAtISO: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }
  );

  return true;
}
