import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function uid() {
  return auth.currentUser?.uid || null;
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
    doc(
      db,
      "notifications",
      String(notificationId)
    ),
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
