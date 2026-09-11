import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/*
 * Refreshes server-backed screens after the app returns from
 * background/inactive state. Android can report the active transition
 * before network/socket state has fully resumed, so the refresh is
 * intentionally delayed a fraction of a second.
 */
export default function useRefreshOnAppActive(callback, delayMs = 350) {
  const callbackRef = useRef(callback);
  const previousStateRef = useRef(AppState.currentState);
  const timerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const run = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        Promise.resolve(callbackRef.current?.()).catch(() => {});
      }, Math.max(Number(delayMs) || 0, 0));
    };

    const subscription = AppState.addEventListener(
      "change",
      (nextState) => {
        const previous = previousStateRef.current;
        previousStateRef.current = nextState;

        const wasAway =
          previous === "background" ||
          previous === "inactive" ||
          previous === "unknown";

        if (wasAway && nextState === "active") {
          run();
        }
      }
    );

    return () => {
      subscription.remove();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delayMs]);
}
