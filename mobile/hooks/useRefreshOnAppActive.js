import { useEffect, useRef } from "react";
import { AppState } from "react-native";

export default function useRefreshOnAppActive(callback) {
  const callbackRef = useRef(callback);
  const previousState = useRef(AppState.currentState);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState) => {
        const wasInactive =
          previousState.current === "background" ||
          previousState.current === "inactive";

        previousState.current = nextState;

        if (wasInactive && nextState === "active") {
          Promise.resolve(callbackRef.current?.()).catch(() => {});
        }
      }
    );

    return () => subscription.remove();
  }, []);
}
