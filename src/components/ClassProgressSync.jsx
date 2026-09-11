import { useEffect, useRef } from "react";
import {
  collection,
  onSnapshot
} from "firebase/firestore";
import {
  onAuthStateChanged
} from "firebase/auth";

import {
  auth,
  db
} from "../firebase";
import {
  syncClassReadingProgress
} from "../services/classStorage.js";

/*
 * Reliability bridge for PWA/web class progress.
 *
 * Verified reading progress is canonical in:
 *   users/{uid}/readingProgress/{bookId}
 *
 * Reader already mirrors progress into each assigned class. This component
 * adds a second event-driven path so a transient Reader membership/auth race
 * cannot silently drop the class mirror. Writes remain monotonic in
 * classStorage and therefore duplicate syncs are harmless.
 */
export default function ClassProgressSync() {
  const unsubscribeProgressRef = useRef(null);

  useEffect(() => {
    function clearProgressSubscription() {
      if (unsubscribeProgressRef.current) {
        unsubscribeProgressRef.current();
        unsubscribeProgressRef.current = null;
      }
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        clearProgressSubscription();

        if (!user) return;

        const progressRef = collection(
          db,
          "users",
          user.uid,
          "readingProgress"
        );

        unsubscribeProgressRef.current = onSnapshot(
          progressRef,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (
                change.type !== "added" &&
                change.type !== "modified"
              ) {
                return;
              }

              const progress = change.doc.data();

              const verifiedValue = Number(
                progress.verifiedParagraphIndex
              );
              const furthestValue = Number(
                progress.furthestParagraphIndex
              );
              const positionValue = Number(
                progress.paragraphIndex
              );

              const paragraphIndex =
                Number.isFinite(verifiedValue)
                  ? verifiedValue
                  : Number.isFinite(furthestValue)
                    ? furthestValue
                    : Number.isFinite(positionValue)
                      ? positionValue
                      : 0;

              const totalParagraphs = Math.max(
                Number(progress.totalParagraphs) || 0,
                paragraphIndex + 1,
                1
              );

              const percentComplete = Math.min(
                Math.max(
                  Number(progress.percentComplete) || 0,
                  0
                ),
                100
              );

              void syncClassReadingProgress({
                groups: [],
                book: {
                  id:
                    progress.bookId ||
                    change.doc.id,
                  title:
                    progress.title ||
                    "Untitled",
                  author:
                    progress.author ||
                    ""
                },
                paragraphIndex,
                totalParagraphs,
                percentComplete
              }).catch((error) => {
                console.warn(
                  "Could not mirror class reading progress:",
                  error
                );
              });
            });
          },
          (error) => {
            console.warn(
              "Class progress subscription failed:",
              error
            );
          }
        );
      }
    );

    return () => {
      clearProgressSubscription();
      unsubscribeAuth();
    };
  }, []);

  return null;
}
