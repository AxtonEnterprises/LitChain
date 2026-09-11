import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Group from "./Group.jsx";
import Classroom from "./Classroom.jsx";
import {
  ensureGeneralClassDiscussion,
  getGroup
} from "../services/storage.js";

export default function GroupRouter() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const result = await getGroup(groupId);

        /*
         * The native app and PWA share the same reserved General Class
         * Discussion document. Ensure it exists before Classroom renders.
         * Non-teachers may receive a permission error here; that is safe and
         * simply means the existing reserved discussion will be read normally.
         */
        if (result?.type === "class") {
          try {
            await ensureGeneralClassDiscussion(groupId);
          } catch (discussionError) {
            const role = result?.membership?.role;

            if (
              ["owner", "admin", "moderator"].includes(role)
            ) {
              console.warn(
                "Could not ensure General Class Discussion:",
                discussionError
              );
            }
          }
        }

        if (active) {
          setGroup(result);
        }
      } catch (err) {
        console.error("Could not determine group type:", err);

        if (active) {
          setError(
            err?.message ||
            "We couldn't load this group."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [groupId]);

  if (loading) {
    return (
      <main className="page-wrap">
        <section className="panel">
          <p className="muted">Loading...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-wrap">
        <section className="panel">
          <p className="status">{error}</p>
        </section>
      </main>
    );
  }

  if (group?.type === "class") {
    return <Classroom initialGroup={group} />;
  }

  return <Group />;
}
