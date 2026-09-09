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
  if (!user) throw new Error("You must be logged in.");
  return user;
}

async function profile(userId) {
  if (!userId) return null;
  for (const collectionName of ["publicProfiles", "users"]) {
    try {
      const snapshot = await getDoc(doc(db, collectionName, String(userId)));
      if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() };
    } catch {}
  }
  return null;
}

export async function reportNativeGroupForumContent({
  groupId,
  postId,
  replyId = null,
  reportedUserId,
  title = "",
  body = "",
  reason = "other",
  details = ""
}) {
  const user = requireUser();
  if (!reportedUserId) throw new Error("Missing report target.");

  const member = await getDoc(
    doc(db, "groups", String(groupId), "members", user.uid)
  );
  if (!member.exists()) throw new Error("Only group members can report content.");

  const reportRef = doc(
    collection(db, "groups", String(groupId), "moderationReports")
  );
  const contentType = replyId ? "forum_reply" : "forum_post";
  const now = new Date().toISOString();

  const report = {
    id: reportRef.id,
    groupId: String(groupId),
    reporterUserId: user.uid,
    reportedUserId: String(reportedUserId),
    contentType,
    postId: String(postId),
    replyId: replyId ? String(replyId) : null,
    contentId: String(replyId || postId),
    title: String(title || ""),
    body: String(body || ""),
    reason: String(reason || "other"),
    details: String(details || "").trim(),
    status: "open",
    createdAtISO: now
  };

  await setDoc(reportRef, { ...report, createdAt: serverTimestamp() });
  return report;
}

export async function getNativeGroupModerationReports(groupId) {
  const ref = collection(
    db,
    "groups",
    String(groupId),
    "moderationReports"
  );

  let snapshot;
  try {
    snapshot = await getDocs(query(ref, orderBy("createdAtISO", "desc")));
  } catch {
    snapshot = await getDocs(ref);
  }

  const open = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.status === "open");

  return Promise.all(
    open.map(async (report) => ({
      ...report,
      reporterProfile: await profile(report.reporterUserId),
      reportedProfile: await profile(report.reportedUserId)
    }))
  );
}

export async function resolveNativeGroupModerationReport(
  groupId,
  reportId,
  resolution = "resolved"
) {
  const user = requireUser();
  await updateDoc(
    doc(db, "groups", String(groupId), "moderationReports", String(reportId)),
    {
      status: resolution === "dismissed" ? "dismissed" : "resolved",
      resolvedBy: user.uid,
      resolvedAtISO: new Date().toISOString(),
      resolvedAt: serverTimestamp()
    }
  );
}

export async function removeReportedNativeGroupContent(groupId, report) {
  if (!report?.postId) throw new Error("Invalid moderation report.");

  if (report.contentType === "forum_reply") {
    if (!report.replyId) throw new Error("Missing reply ID.");
    await deleteDoc(
      doc(
        db,
        "groups",
        String(groupId),
        "forumPosts",
        String(report.postId),
        "replies",
        String(report.replyId)
      )
    );
  } else {
    await deleteDoc(
      doc(db, "groups", String(groupId), "forumPosts", String(report.postId))
    );
  }

  await resolveNativeGroupModerationReport(groupId, report.id, "resolved");
}
