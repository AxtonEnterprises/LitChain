import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export async function requestNativeAccountDeletion() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");

  await setDoc(doc(db, "users", user.uid), {
    accountDeletionRequested: true,
    accountDeletionRequestedAt: serverTimestamp(),
    accountDeletionRequestedAtISO: new Date().toISOString(),
    accountDeletionRequestEmail: user.email || "",
    accountDeletionRequestStatus: "pending"
  }, { merge: true });

  return { requested: true };
}
