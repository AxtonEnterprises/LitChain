import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function uid() {
  return auth.currentUser?.uid || null;
}

async function actorSnapshot(userId) {
  if (!userId) return {};

  try {
    const snapshot = await getDoc(
      doc(db, "publicProfiles", String(userId))
    );

    if (!snapshot.exists()) return {};

    const profile = snapshot.data();

    return {
      actorName:
        profile.displayName ||
        profile.username ||
        "A reader",
      actorUsername:
        profile.username || "",
      actorAvatar:
        profile.avatar || ""
    };
  } catch {
    return {};
  }
}

export async function createNativeNotification({
  recipientUserId,
  type,
  actorUserId = uid(),
  groupId = null,
  groupName = "",
  chainId = null,
  postId = null,
  targetPath = "",
  message = ""
}) {
  if (!recipientUserId || !type) return null;

  if (
    actorUserId &&
    String(recipientUserId) === String(actorUserId)
  ) {
    return null;
  }

  const ref = doc(collection(db, "notifications"));
  const now = new Date().toISOString();
  const actor = await actorSnapshot(actorUserId);

  const data = {
    id: ref.id,
    recipientUserId: String(recipientUserId),
    type: String(type),
    actorUserId:
      actorUserId ? String(actorUserId) : null,
    ...actor,
    groupId:
      groupId ? String(groupId) : null,
    groupName: String(groupName || ""),
    chainId:
      chainId ? String(chainId) : null,
    postId:
      postId ? String(postId) : null,
    targetPath: String(targetPath || ""),
    message: String(message || ""),
    read: false,
    createdAtISO: now
  };

  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp()
  });

  return data;
}

export async function getNativeNotifications(maxResults = 100) {
  const userId = uid();
  if (!userId) return [];

  const ref = collection(db, "notifications");
  let snapshot;

  try {
    snapshot = await getDocs(
      query(
        ref,
        where("recipientUserId", "==", userId),
        orderBy("createdAtISO", "desc"),
        limit(maxResults)
      )
    );
  } catch {
    snapshot = await getDocs(
      query(
        ref,
        where("recipientUserId", "==", userId)
      )
    );
  }

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      String(b.createdAtISO || "").localeCompare(
        String(a.createdAtISO || "")
      )
    )
    .slice(0, maxResults);
}

export function subscribeToNativeUnreadNotifications(callback) {
  const userId = uid();

  if (!userId) {
    callback(0);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("recipientUserId", "==", userId),
      where("read", "==", false)
    ),
    (snapshot) => callback(snapshot.size),
    () => callback(0)
  );
}

export async function markNativeNotificationRead(notificationId) {
  if (!notificationId) return;

  await updateDoc(
    doc(db, "notifications", String(notificationId)),
    {
      read: true,
      readAtISO: new Date().toISOString(),
      readAt: serverTimestamp()
    }
  );
}

export async function markAllNativeNotificationsRead() {
  const userId = uid();
  if (!userId) return;

  const snapshot = await getDocs(
    query(
      collection(db, "notifications"),
      where("recipientUserId", "==", userId),
      where("read", "==", false)
    )
  );

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  snapshot.docs.forEach((item) => {
    batch.update(item.ref, {
      read: true,
      readAtISO: now,
      readAt: serverTimestamp()
    });
  });

  await batch.commit();
}
