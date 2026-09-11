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
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

export const PLATFORM_ROLES = {
  MODERATOR: "platform_moderator",
  ADMIN: "platform_admin",
  FOUNDATION_ADMIN: "foundation_admin"
};

const RANK = {
  user: 0,
  platform_moderator: 1,
  platform_admin: 2,
  foundation_admin: 3
};

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  return user;
}

function roleFlags(role = "user") {
  const rank = RANK[role] || 0;

  return {
    role,
    isPlatformModerator: rank >= 1,
    isPlatformAdmin: rank >= 2,
    isFoundationAdmin: role === PLATFORM_ROLES.FOUNDATION_ADMIN
  };
}

async function profile(userId) {
  if (!userId) return null;

  try {
    const snap = await getDoc(
      doc(db, "publicProfiles", String(userId))
    );

    return snap.exists()
      ? { id: snap.id, ...snap.data() }
      : null;
  } catch {
    return null;
  }
}

export async function getMyNativePlatformRole() {
  const user = requireUser();
  const snap = await getDoc(
    doc(db, "platformRoles", user.uid)
  );

  if (!snap.exists()) {
    return {
      userId: user.uid,
      ...roleFlags("user")
    };
  }

  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    userId: data.userId || user.uid,
    ...roleFlags(data.role || "user")
  };
}

async function requireModerator() {
  const role = await getMyNativePlatformRole();

  if (!role.isPlatformModerator) {
    throw new Error(
      "You do not have platform moderation access."
    );
  }

  return role;
}

async function requireAdmin() {
  const role = await requireModerator();

  if (!role.isPlatformAdmin) {
    throw new Error(
      "Platform administrator access is required."
    );
  }

  return role;
}

async function requireFoundationAdmin() {
  const role = await requireModerator();

  if (!role.isFoundationAdmin) {
    throw new Error(
      "Foundation administrator access is required."
    );
  }

  return role;
}

export async function getNativePlatformReports() {
  await requireModerator();

  const ref = collection(db, "moderationReports");
  let snapshot;

  try {
    snapshot = await getDocs(
      query(
        ref,
        where("status", "==", "open"),
        orderBy("createdAtISO", "desc")
      )
    );
  } catch {
    snapshot = await getDocs(ref);
  }

  const rows = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((item) => item.status === "open")
    .sort((a, b) =>
      String(b.createdAtISO || "").localeCompare(
        String(a.createdAtISO || "")
      )
    );

  return Promise.all(
    rows.map(async (item) => ({
      ...item,
      reporterProfile: await profile(item.reporterUserId),
      targetProfile: await profile(item.targetUserId)
    }))
  );
}

export async function resolveNativePlatformReport(
  reportId,
  resolution = "resolved"
) {
  const user = requireUser();
  await requireModerator();

  const ref = doc(
    db,
    "moderationReports",
    String(reportId)
  );
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("This report is no longer available.");
  }

  const report = snap.data();

  if (report.status !== "open") {
    throw new Error("This report has already been reviewed.");
  }

  const nextStatus =
    resolution === "dismissed"
      ? "dismissed"
      : "resolved";

  const actionRef = doc(
    collection(db, "moderationActions")
  );
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.update(ref, {
    status: nextStatus,
    resolvedBy: user.uid,
    resolvedAtISO: now,
    resolvedAt: serverTimestamp()
  });

  batch.set(actionRef, {
    id: actionRef.id,
    moderatorUserId: user.uid,
    action:
      nextStatus === "dismissed"
        ? "report_dismissed"
        : "report_resolved",
    targetUserId: String(report.targetUserId || ""),
    targetType: String(report.targetType || ""),
    targetId: String(report.targetId || ""),
    reportId: String(reportId),
    reason: String(report.reason || ""),
    details: String(report.details || ""),
    createdAtISO: now,
    createdAt: serverTimestamp()
  });

  await batch.commit();
}

export async function getNativePlatformEnforcements() {
  await requireAdmin();

  const snapshot = await getDocs(
    collection(db, "platformEnforcement")
  );

  const rows = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((item) =>
      ["warning", "suspended", "banned"].includes(item.status)
    )
    .filter((item) => {
      if (item.status !== "suspended" || !item.endsAtISO) {
        return true;
      }

      const end = new Date(item.endsAtISO).getTime();
      return !Number.isFinite(end) || end > Date.now();
    });

  return Promise.all(
    rows.map(async (item) => ({
      ...item,
      targetProfile: await profile(item.userId || item.id)
    }))
  );
}

export async function applyNativePlatformEnforcement({
  targetUserId,
  status,
  reason,
  durationHours = 24
}) {
  const user = requireUser();
  await requireAdmin();

  const uid = String(targetUserId || "").trim();
  const cleanReason = String(reason || "").trim();

  if (!uid) throw new Error("Missing enforcement target.");
  if (!cleanReason) throw new Error("A reason is required.");
  if (!["warning", "suspended", "banned"].includes(status)) {
    throw new Error("Unsupported enforcement action.");
  }

  const now = new Date();
  const nowISO = now.toISOString();
  const payload = {
    userId: uid,
    status,
    reason: cleanReason,
    enforcedBy: user.uid,
    updatedAtISO: nowISO,
    updatedAt: serverTimestamp()
  };

  if (status === "suspended") {
    const hours = [24, 168, 720].includes(Number(durationHours))
      ? Number(durationHours)
      : 24;
    const ends = new Date(
      now.getTime() + hours * 60 * 60 * 1000
    );

    payload.durationHours = hours;
    payload.endsAtISO = ends.toISOString();
    payload.endsAt = Timestamp.fromDate(ends);
  } else {
    payload.durationHours = null;
    payload.endsAtISO = null;
    payload.endsAt = null;
  }

  const enforcementRef = doc(
    db,
    "platformEnforcement",
    uid
  );
  const existing = await getDoc(enforcementRef);

  if (existing.exists()) {
    await updateDoc(enforcementRef, payload);
  } else {
    await setDoc(enforcementRef, {
      ...payload,
      createdAtISO: nowISO,
      createdAt: serverTimestamp()
    });
  }

  const actionRef = doc(
    collection(db, "moderationActions")
  );

  await setDoc(actionRef, {
    id: actionRef.id,
    moderatorUserId: user.uid,
    action:
      status === "warning"
        ? "warning"
        : status === "suspended"
          ? "account_suspended"
          : "account_banned",
    targetUserId: uid,
    targetType: "profile",
    targetId: uid,
    reason: cleanReason,
    createdAtISO: nowISO,
    createdAt: serverTimestamp()
  });
}

export async function clearNativePlatformEnforcement(targetUserId) {
  const user = requireUser();
  await requireAdmin();

  const uid = String(targetUserId || "").trim();
  if (!uid) throw new Error("Missing enforcement target.");

  const ref = doc(
    db,
    "platformEnforcement",
    uid
  );
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("No active enforcement record was found.");
  }

  const existing = snap.data();
  const now = new Date().toISOString();

  await updateDoc(ref, {
    status: "cleared",
    enforcedBy: user.uid,
    clearedBy: user.uid,
    clearedAtISO: now,
    durationHours: null,
    endsAtISO: null,
    endsAt: null,
    updatedAtISO: now,
    updatedAt: serverTimestamp()
  });

  const actionRef = doc(
    collection(db, "moderationActions")
  );

  await setDoc(actionRef, {
    id: actionRef.id,
    moderatorUserId: user.uid,
    action: "platform_enforcement_cleared",
    targetUserId: uid,
    targetType: "profile",
    targetId: uid,
    previousEnforcementStatus: existing.status || "",
    reason: existing.reason || "Platform enforcement cleared.",
    createdAtISO: now,
    createdAt: serverTimestamp()
  });
}

export async function getNativePlatformRoleRecords() {
  await requireFoundationAdmin();

  const snapshot = await getDocs(
    collection(db, "platformRoles")
  );

  return Promise.all(
    snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data()
      }))
      .sort(
        (a, b) =>
          (RANK[b.role] || 0) -
          (RANK[a.role] || 0)
      )
      .map(async (item) => ({
        ...item,
        targetProfile: await profile(item.userId || item.id)
      }))
  );
}

export async function searchNativePlatformRoleCandidates(searchText) {
  await requireFoundationAdmin();

  const term = String(searchText || "")
    .trim()
    .toLowerCase();

  if (term.length < 2) return [];

  const snapshot = await getDocs(
    collection(db, "publicProfiles")
  );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      userId: item.data().userId || item.id,
      ...item.data()
    }))
    .filter((item) => {
      const username = String(item.username || "").toLowerCase();
      const display = String(
        item.displayName || item.name || ""
      ).toLowerCase();

      return (
        username.includes(term) ||
        display.includes(term)
      );
    })
    .slice(0, 12);
}

export async function setNativePlatformRole({
  targetUserId,
  role,
  reason
}) {
  const user = requireUser();
  await requireFoundationAdmin();

  const uid = String(targetUserId || "").trim();
  const nextRole = String(role || "").trim();
  const cleanReason = String(reason || "").trim();

  if (!uid) throw new Error("Missing account.");
  if (!cleanReason) throw new Error("A reason is required.");
  if (
    ![
      "user",
      PLATFORM_ROLES.MODERATOR,
      PLATFORM_ROLES.ADMIN
    ].includes(nextRole)
  ) {
    throw new Error("Unsupported platform role.");
  }

  const roleRef = doc(db, "platformRoles", uid);
  const existing = await getDoc(roleRef);
  const oldRole = existing.exists()
    ? String(existing.data()?.role || "user")
    : "user";

  if (oldRole === PLATFORM_ROLES.FOUNDATION_ADMIN) {
    throw new Error(
      "Foundation administrator authority cannot be changed from the app."
    );
  }

  if (nextRole === "user") {
    if (!existing.exists()) {
      throw new Error("This account has no platform role.");
    }

    await deleteDoc(roleRef);
  } else if (existing.exists()) {
    await updateDoc(roleRef, {
      userId: uid,
      role: nextRole,
      assignedBy: user.uid,
      updatedAtISO: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(roleRef, {
      userId: uid,
      role: nextRole,
      assignedBy: user.uid,
      createdAtISO: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  }

  const actionRef = doc(
    collection(db, "moderationActions")
  );
  const now = new Date().toISOString();

  await setDoc(actionRef, {
    id: actionRef.id,
    moderatorUserId: user.uid,
    action:
      nextRole === "user"
        ? "platform_role_removed"
        : oldRole === "user"
          ? "platform_role_assigned"
          : "platform_role_changed",
    targetUserId: uid,
    targetType: "profile",
    targetId: uid,
    previousRole: oldRole,
    newRole: nextRole,
    reason: cleanReason,
    createdAtISO: now,
    createdAt: serverTimestamp()
  });
}
