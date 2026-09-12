import {
  useCallback,
  useEffect,
  useState
} from "react";

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
  const [open, setOpen] =
    useState(false);
  const [busyId, setBusyId] =
    useState("");
  const [status, setStatus] =
    useState("");

  const load = useCallback(async () => {
    if (!canManage || !groupId) {
      setRequests([]);
      return;
    }

    try {
      const rows =
        await getGroupJoinRequests(groupId);

      setRequests(
        (rows || []).filter(
          (request) =>
            !request.status ||
            request.status === "pending"
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

    function handleFocus() {
      void load();
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [load]);

  useEffect(() => {
    if (requests.length > 0) {
      setOpen(true);
    }
  }, [requests.length]);

  async function respond(
    request,
    accept
  ) {
    const userId =
      String(request?.userId || "");

    if (!userId) return;

    try {
      setBusyId(userId);
      setStatus("");

      await respondToGroupJoinRequest(
        groupId,
        userId,
        accept
      );

      setRequests((current) =>
        current.filter(
          (item) =>
            String(item.userId) !==
            userId
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

  const styles = {
    trigger: {
      position: "fixed",
      left: "18px",
      bottom: "92px",
      zIndex: 5000,
      border: "1px solid #D9DDD9",
      borderRadius: "999px",
      background: requests.length
        ? "#0B2D45"
        : "#FFFDF8",
      color: requests.length
        ? "#FFFFFF"
        : "#0B2D45",
      padding: "0.65rem 0.9rem",
      fontWeight: 800,
      boxShadow:
        "0 8px 24px rgba(11,45,69,0.14)"
    },
    panel: {
      position: "fixed",
      left: "18px",
      bottom: "148px",
      zIndex: 5001,
      width: "min(360px, calc(100vw - 36px))",
      maxHeight: "60vh",
      overflowY: "auto",
      background: "#FFFDF8",
      border: "1px solid #D9DDD9",
      borderRadius: "18px",
      padding: "1rem",
      boxShadow:
        "0 16px 42px rgba(11,45,69,0.22)"
    },
    row: {
      borderTop: "1px solid #D9DDD9",
      paddingTop: "0.8rem",
      marginTop: "0.8rem"
    },
    actions: {
      display: "flex",
      gap: "0.55rem",
      marginTop: "0.65rem"
    },
    accept: {
      flex: 1,
      border: 0,
      borderRadius: "10px",
      background: "#0B2D45",
      color: "#FFFFFF",
      padding: "0.6rem 0.75rem",
      fontWeight: 800
    },
    decline: {
      flex: 1,
      border: "1px solid #D9DDD9",
      borderRadius: "10px",
      background: "#FFFDF8",
      color: "#B13B3B",
      padding: "0.6rem 0.75rem",
      fontWeight: 800
    }
  };

  return (
    <>
      <button
        type="button"
        style={styles.trigger}
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
      >
        Join Requests
        {requests.length
          ? ` (${requests.length})`
          : ""}
      </button>

      {open && (
        <aside style={styles.panel}>
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "1rem",
              alignItems: "center"
            }}
          >
            <div>
              <strong>
                Class Join Requests
              </strong>
              <div
                style={{
                  color: "#61717C",
                  fontSize: "0.85rem",
                  marginTop: "0.2rem"
                }}
              >
                Accept or decline pending
                students.
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Close join requests"
              style={{
                border: 0,
                background: "transparent",
                fontSize: "1.3rem",
                cursor: "pointer"
              }}
            >
              ×
            </button>
          </div>

          {status && (
            <p className="status">
              {status}
            </p>
          )}

          {!requests.length ? (
            <p
              style={{
                color: "#61717C",
                marginBottom: 0
              }}
            >
              No pending requests.
            </p>
          ) : (
            requests.map((request) => {
              const userId =
                String(
                  request.userId || ""
                );

              return (
                <div
                  key={userId}
                  style={styles.row}
                >
                  <strong>
                    {requestName(request)}
                  </strong>

                  {!!request.profile?.username && (
                    <div
                      style={{
                        color: "#61717C",
                        fontSize: "0.85rem"
                      }}
                    >
                      @{request.profile.username}
                    </div>
                  )}

                  <div style={styles.actions}>
                    <button
                      type="button"
                      disabled={
                        busyId === userId
                      }
                      onClick={() =>
                        respond(
                          request,
                          true
                        )
                      }
                      style={styles.accept}
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      disabled={
                        busyId === userId
                      }
                      onClick={() =>
                        respond(
                          request,
                          false
                        )
                      }
                      style={styles.decline}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </aside>
      )}
    </>
  );
}
