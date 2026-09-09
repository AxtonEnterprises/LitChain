import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user;
}

function pairId(a, b) {
  return [String(a), String(b)]
    .sort()
    .join("__");
}

async function getPublicProfile(userId) {
  if (!userId) return null;

  try {
    const snapshot = await getDoc(
      doc(
        db,
        "publicProfiles",
        String(userId)
      )
    );

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      };
    }
  } catch {}

  try {
    const snapshot = await getDoc(
      doc(db, "users", String(userId))
    );

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      };
    }
  } catch {}

  return null;
}

async function relationshipRows() {
  const user = requireUser();

  const ref = collection(db, "friendships");

  const [byMe, toMe] = await Promise.all([
    getDocs(
      query(
        ref,
        where(
          "requestedBy",
          "==",
          user.uid
        )
      )
    ),
    getDocs(
      query(
        ref,
        where(
          "requestedTo",
          "==",
          user.uid
        )
      )
    )
  ]);

  const rows = new Map();

  [...byMe.docs, ...toMe.docs].forEach(
    (item) =>
      rows.set(item.id, {
        id: item.id,
        ...item.data()
      })
  );

  return [...rows.values()];
}

async function hydrateRelationship(
  relationship,
  currentUserId
) {
  const otherUserId =
    relationship.requestedBy ===
    currentUserId
      ? relationship.requestedTo
      : relationship.requestedBy;

  return {
    ...relationship,
    otherUserId,
    profile:
      await getPublicProfile(otherUserId)
  };
}

export async function getNativeFriendBundle() {
  const user = requireUser();
  const rows = await relationshipRows();

  const hydrated = await Promise.all(
    rows.map((item) =>
      hydrateRelationship(item, user.uid)
    )
  );

  return {
    friends: hydrated.filter(
      (item) =>
        item.status === "accepted"
    ),
    incoming: hydrated.filter(
      (item) =>
        item.status === "pending" &&
        item.requestedTo === user.uid
    ),
    outgoing: hydrated.filter(
      (item) =>
        item.status === "pending" &&
        item.requestedBy === user.uid
    )
  };
}

export async function findNativeReaderByUsername(
  username
) {
  const clean = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  if (!clean) return null;

  const reservation = await getDoc(
    doc(db, "usernames", clean)
  );

  if (!reservation.exists()) {
    return null;
  }

  const userId =
    reservation.data()?.userId;

  if (!userId) return null;

  const profile =
    await getPublicProfile(userId);

  return {
    id: userId,
    userId,
    username: clean,
    ...(profile || {})
  };
}

export async function sendNativeFriendRequest(
  otherUserId
) {
  const user = requireUser();
  const other = String(otherUserId || "");

  if (!other || other === user.uid) {
    throw new Error(
      "Choose another reader."
    );
  }

  const id = pairId(user.uid, other);
  const ref = doc(
    db,
    "friendships",
    id
  );
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data();

    if (data.status === "accepted") {
      return {
        id,
        ...data
      };
    }

    if (
      data.status === "pending" &&
      data.requestedTo === user.uid
    ) {
      await updateDoc(ref, {
        status: "accepted",
        acceptedAtISO:
          new Date().toISOString(),
        updatedAtISO:
          new Date().toISOString(),
        updatedAt: serverTimestamp()
      });

      return {
        id,
        ...data,
        status: "accepted"
      };
    }

    return {
      id,
      ...data
    };
  }

  const now = new Date().toISOString();

  const payload = {
    users: [user.uid, other].sort(),
    requestedBy: user.uid,
    requestedTo: other,
    status: "pending",
    createdAtISO: now,
    updatedAtISO: now
  };

  await setDoc(ref, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    id,
    ...payload
  };
}

export async function respondNativeFriendRequest(
  otherUserId,
  accept
) {
  const user = requireUser();
  const id = pairId(
    user.uid,
    otherUserId
  );
  const ref = doc(
    db,
    "friendships",
    id
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error(
      "Friend request is no longer available."
    );
  }

  if (!accept) {
    await deleteDoc(ref);
    return {
      status: "declined"
    };
  }

  await updateDoc(ref, {
    status: "accepted",
    acceptedAtISO:
      new Date().toISOString(),
    updatedAtISO:
      new Date().toISOString(),
    updatedAt: serverTimestamp()
  });

  return {
    status: "accepted"
  };
}

export async function cancelNativeFriendRequest(
  otherUserId
) {
  const user = requireUser();

  await deleteDoc(
    doc(
      db,
      "friendships",
      pairId(
        user.uid,
        otherUserId
      )
    )
  );
}

export async function removeNativeFriend(
  otherUserId
) {
  return cancelNativeFriendRequest(
    otherUserId
  );
}
