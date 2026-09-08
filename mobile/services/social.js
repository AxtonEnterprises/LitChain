import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

async function safeGetDocs(refOrQuery) {
  try {
    return await getDocs(refOrQuery);
  } catch (error) {
    console.warn("Optional social query failed:", error?.code || error);
    return null;
  }
}

export async function getNativeFriends() {
  const user = auth.currentUser;
  if (!user) return [];

  const direct = await safeGetDocs(
    collection(db, "users", user.uid, "friends")
  );

  if (direct && !direct.empty) {
    return direct.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));
  }

  const friendshipQuery = await safeGetDocs(
    query(
      collection(db, "friendships"),
      where("userIds", "array-contains", user.uid)
    )
  );

  if (!friendshipQuery) return [];

  return friendshipQuery.docs
    .map((item) => {
      const data = item.data();
      const ids = Array.isArray(data.userIds)
        ? data.userIds
        : [];

      const otherUserId =
        data.otherUserId ||
        ids.find((id) => String(id) !== user.uid) ||
        "";

      return {
        id: item.id,
        ...data,
        otherUserId
      };
    })
    .filter((item) => item.otherUserId);
}

export async function getNativeGroups() {
  const user = auth.currentUser;
  if (!user) {
    return {
      mine: [],
      classes: [],
      discoverable: []
    };
  }

  const snapshot = await safeGetDocs(
    collection(db, "groups")
  );

  if (!snapshot) {
    return {
      mine: [],
      classes: [],
      discoverable: []
    };
  }

  const rows = await Promise.all(
    snapshot.docs.map(async (groupDoc) => {
      const group = {
        id: groupDoc.id,
        ...groupDoc.data()
      };

      let membership = null;

      try {
        const memberSnapshot = await getDoc(
          doc(
            db,
            "groups",
            groupDoc.id,
            "members",
            user.uid
          )
        );

        if (memberSnapshot.exists()) {
          membership = {
            id: memberSnapshot.id,
            ...memberSnapshot.data()
          };
        }
      } catch {
        membership = null;
      }

      return {
        ...group,
        membership
      };
    })
  );

  const activeMember = (group) =>
    Boolean(group.membership) &&
    !["removed", "suspended"].includes(
      group.membership?.status
    );

  const mine = rows.filter(
    (group) =>
      activeMember(group) &&
      group.type !== "class"
  );

  const classes = rows.filter(
    (group) =>
      activeMember(group) &&
      group.type === "class"
  );

  const discoverable = rows.filter((group) => {
    if (activeMember(group)) return false;
    if (group.type === "class") return false;

    return (
      group.discoverable === true ||
      group.visibility === "public" ||
      group.joinPolicy === "open" ||
      group.joinPolicy === "request_to_join"
    );
  });

  return {
    mine,
    classes,
    discoverable
  };
}

export async function getNativeGroupForum(groupId) {
  if (!groupId) return [];

  const snapshot = await safeGetDocs(
    collection(
      db,
      "groups",
      String(groupId),
      "forumPosts"
    )
  );

  if (!snapshot) return [];

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .sort((a, b) =>
      String(
        b.updatedAtISO ||
        b.createdAtISO ||
        b.createdAt ||
        ""
      ).localeCompare(
        String(
          a.updatedAtISO ||
          a.createdAtISO ||
          a.createdAt ||
          ""
        )
      )
    );
}
