export function getNativeProfileBadges(
  bundle
) {
  if (!bundle) return [];

  const timeline =
    Array.isArray(bundle.timeline)
      ? bundle.timeline
      : [];

  const journal =
    Array.isArray(bundle.journal)
      ? bundle.journal
      : [];

  const friends =
    Array.isArray(bundle.friends)
      ? bundle.friends
      : [];

  const groups =
    Array.isArray(bundle.groups)
      ? bundle.groups
      : [];

  const completed =
    timeline.filter(
      (item) =>
        Number(
          item.percentComplete || 0
        ) >= 100
    ).length;

  const badges = [];

  if (timeline.length >= 1) {
    badges.push({
      id: "reader",
      label: "Reader",
      detail: "Started a book"
    });
  }

  if (completed >= 1) {
    badges.push({
      id: "finisher",
      label: "Finisher",
      detail: "Completed a book"
    });
  }

  if (journal.length >= 1) {
    badges.push({
      id: "annotator",
      label: "Annotator",
      detail: "Created a note"
    });
  }

  if (journal.length >= 10) {
    badges.push({
      id: "scholar",
      label: "Scholar",
      detail: "Created 10 notes"
    });
  }

  if (friends.length >= 1) {
    badges.push({
      id: "connected",
      label: "Connected",
      detail: "Made a friend"
    });
  }

  if (groups.length >= 1) {
    badges.push({
      id: "member",
      label: "Group Member",
      detail: "Joined a reading group"
    });
  }

  if (
    groups.some(
      (group) =>
        group.membership?.role ===
        "owner"
    )
  ) {
    badges.push({
      id: "founder",
      label: "Group Founder",
      detail: "Created a reading group"
    });
  }

  return badges;
}
