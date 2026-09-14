const {
  onDocumentCreated
} = require(
  "firebase-functions/v2/firestore"
);
const {
  initializeApp
} = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();

const PUSHABLE_TYPES = new Set([
  "friend_request",
  "friend_accepted",
  "group_invite",
  "group_invite_accepted",
  "group_join_approved",
  "group_role_changed",
  "forum_reply",
  "chain_reply",
  "group_chain_reply",
  "assignment",
  "class_assignment",
  "grade",
  "class_grade"
]);

function titleFor(data) {
  const actor =
    data.actorName ||
    data.actorUsername ||
    "A reader";

  switch (data.type) {
    case "friend_request":
      return `${actor} sent you a friend request`;
    case "group_invite":
      return `${actor} invited you to ${data.groupName || "a group"}`;
    case "friend_accepted":
      return `${actor} accepted your friend request`;
    case "group_invite_accepted":
      return `${actor} accepted your group invitation`;
    case "group_join_approved":
      return `You joined ${data.groupName || "a group"}`;
    case "forum_reply":
      return `${actor} replied in ${data.groupName || "a group"}`;
    case "chain_reply":
      return `${actor} replied to your Chain entry`;
    case "group_chain_reply":
      return `${actor} replied in ${data.groupName || "your group"}`;
    case "assignment":
    case "class_assignment":
      return `New class activity in ${data.groupName || "your class"}`;
    case "grade":
    case "class_grade":
      return `Grade updated in ${data.groupName || "your class"}`;
    default:
      return "Lit Chain";
  }
}

exports.sendNativePushForNotification =
  onDocumentCreated(
    "notifications/{notificationId}",
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) return;

      const data = snapshot.data();

      if (
        !data?.recipientUserId ||
        !PUSHABLE_TYPES.has(data.type)
      ) {
        return;
      }

      const userRef = db.doc(
        `users/${data.recipientUserId}`
      );
      const userSnapshot =
        await userRef.get();

      if (!userSnapshot.exists) return;

      const tokens = [
        ...new Set(
          userSnapshot.data()
            .expoPushTokens || []
        )
      ].filter(
        (token) =>
          typeof token === "string" &&
          (
            token.startsWith("ExpoPushToken[") ||
            token.startsWith("ExponentPushToken[")
          )
      );

      if (!tokens.length) return;

      const messages = tokens.map((token) => ({
        to: token,
        sound: "default",
        title: titleFor(data),
        body:
          data.message ||
          "You have a new Lit Chain notification.",
        data: {
          notificationId:
            snapshot.id,
          type: data.type,
          groupId:
            data.groupId || null,
          chainId:
            data.chainId || null,
          postId:
            data.postId || null
        }
      }));

      for (
        let index = 0;
        index < messages.length;
        index += 100
      ) {
        const chunk =
          messages.slice(
            index,
            index + 100
          );

        const response = await fetch(
          "https://exp.host/--/api/v2/push/send",
          {
            method: "POST",
            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(chunk)
          }
        );

        if (!response.ok) {
          console.error(
            "Expo push request failed",
            response.status,
            await response.text()
          );
        }
      }

      await userRef.set(
        {
          lastPushAttemptAt:
            FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
  );
