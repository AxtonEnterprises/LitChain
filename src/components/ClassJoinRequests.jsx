import {
  useCallback,
  useEffect,
  useState
} from "react";

import { createPortal } from "react-dom";

import {
  getGroupJoinRequests,
  respondToGroupJoinRequest
} from "../services/storage.js";

function requestName(request) {
  return (
    request?.profile?.displayName ||
    request?.profile?.username ||
    request?.displayName ||
    request?.username ||
    request?.userId ||
    "Reader"
  );
}

export default function ClassJoinRequests({
  groupId,
  role,
  onResolved
}) {
  const canManage =
    ["owner", "admin"].includes(role);

  const [requests, setRequests] =
    useState([]);
  const [busyId, setBusyId] =
    useState("");
  const [status, setStatus] =
    useState("");
  const [
    studentsButton,
    setStudentsButton
  ] = useState(null);
  const [
    studentsSheet,
    setStudentsSheet
  ] = useState(null);

  const load = useCallback(async () => {
    if (!canManage || !groupId) {
      setRequests([]);
      return;
    }

    try {
      const rows =
        await getGroupJoinRequests(
          groupId
        );

      setRequests(
        (rows || []).filter(
          (request) =>
            !request.status ||
            request.status ===
              "pending"
        )
      );
    } catch (error) {
      console.error(
        "Could not load class join requests:",
        error
      );
      setStatus(
        error?.message ||
          "Could not load join requests."
      );
    }
  }, [canManage, groupId]);

  useEffect(() => {
    void load();

    function syncTargets() {
      const nextButton =
        document.querySelector(
          'button[aria-label="Students"]'
        );

      const nextSheet =
        document.querySelector(
          ".class-roster-sheet"
        );

      if (nextButton) {
        nextButton.style.position =
          "relative";
      }

      setStudentsButton(
        nextButton || null
      );
      setStudentsSheet(
        nextSheet || null
      );
    }

    syncTargets();

    const observer =
      new MutationObserver(
        syncTargets
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    window.addEventListener(
      "focus",
      load
    );

    return () => {
      observer.disconnect();
      window.removeEventListener(
        "focus",
        load
      );
    };
  }, [load]);

  async function respond(
    request,
    accept
  ) {
    const userId =
      String(
        request?.userId ||
        ""
      );

    if (!userId) return;

    try {
      setBusyId(userId);
      setStatus("");

      await respondToGroupJoinRequest(
        groupId,
        userId,
        accept
      );

      setRequests(
        (current) =>
          current.filter(
            (item) =>
              String(
                item.userId
              ) !== userId
          )
      );

      setStatus(
        accept
          ? "Student added to class."
          : "Join request declined."
      );

      onResolved?.();
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not update this request."
      );
    } finally {
      setBusyId("");
    }
  }

  if (!canManage) {
    return null;
  }

  const badge =
    studentsButton &&
    requests.length > 0
      ? createPortal(
          <span
            aria-label={`${requests.length} pending join request${
              requests.length === 1
                ? ""
                : "s"
            }`}
            title={`${requests.length} pending join request${
              requests.length === 1
                ? ""
                : "s"
            }`}
            style={{
              position: "absolute",
              top: "-9px",
              right: "-9px",
              minWidth: "24px",
              height: "24px",
              padding: "0 5px",
              borderRadius: "999px",
              background:
                "#C9962A",
              color: "#0B2D45",
              border:
                "2px solid #FFFDF8",
              display:
                "inline-flex",
              alignItems: "center",
              justifyContent:
                "center",
              gap: "2px",
              fontSize: "11px",
              fontWeight: 900,
              lineHeight: 1,
              zIndex: 5,
              pointerEvents: "none"
            }}
          >
            🔔
            {requests.length}
          </span>,
          studentsButton
        )
      : null;

  const requestPanel =
    studentsSheet
      ? createPortal(
          <section
            className="panel"
            style={{
              padding: "1rem",
              marginTop: "1rem",
              borderColor:
                requests.length
                  ? "#C9962A"
                  : undefined
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "1rem",
                alignItems: "center",
                flexWrap: "wrap"
              }}
            >
              <div>
                <p
                  className="eyebrow"
                  style={{
                    marginBottom:
                      "0.2rem"
                  }}
                >
                  Students
                </p>
                <h3
                  style={{
                    margin: 0
                  }}
                >
                  Join Requests
                  {requests.length
                    ? ` (${requests.length})`
                    : ""}
                </h3>
              </div>
            </div>

            {status && (
              <p className="status">
                {status}
              </p>
            )}

            {!requests.length ? (
              <p
                className="muted"
                style={{
                  marginBottom: 0
                }}
              >
                No pending requests.
              </p>
            ) : (
              <div
                className="public-profile-entry-list"
                style={{
                  marginTop: "0.75rem"
                }}
              >
                {requests.map(
                  (request) => {
                    const userId =
                      String(
                        request.userId ||
                        ""
                      );

                    return (
                      <article
                        key={userId}
                        className="public-profile-entry"
                      >
                        <strong
                          className="public-entry-book-title"
                        >
                          {requestName(
                            request
                          )}
                        </strong>

                        {!!request.profile
                          ?.username && (
                          <p className="muted">
                            @
                            {
                              request
                                .profile
                                .username
                            }
                          </p>
                        )}

                        <div className="button-row">
                          <button
                            type="button"
                            className="button primary"
                            disabled={
                              busyId ===
                              userId
                            }
                            onClick={() =>
                              respond(
                                request,
                                true
                              )
                            }
                          >
                            Accept
                          </button>

                          <button
                            type="button"
                            className="button secondary"
                            disabled={
                              busyId ===
                              userId
                            }
                            onClick={() =>
                              respond(
                                request,
                                false
                              )
                            }
                          >
                            Decline
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>,
          studentsSheet
        )
      : null;

  return (
    <>
      {badge}
      {requestPanel}
    </>
  );
}
