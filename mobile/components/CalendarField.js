import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useMemo, useState } from "react";
import { BRAND } from "../../shared/brand";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function isoDate(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export default function CalendarField({
  value,
  onChange,
  placeholder = "Select due date"
}) {
  const initial = parseValue(value) || new Date();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );
  const selected = parseValue(value);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const result = [];

    for (let i = 0; i < firstWeekday; i += 1) result.push(null);
    for (let day = 1; day <= days; day += 1) result.push(day);
    while (result.length % 7 !== 0) result.push(null);

    return result;
  }, [cursor]);

  function moveMonth(delta) {
    setCursor(
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() + delta,
        1
      )
    );
  }

  function select(day) {
    onChange?.(
      isoDate(cursor.getFullYear(), cursor.getMonth(), day)
    );
    setOpen(false);
  }

  const display = selected
    ? selected.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "";

  return (
    <>
      <Pressable
        onPress={() => {
          const next = parseValue(value) || new Date();
          setCursor(
            new Date(next.getFullYear(), next.getMonth(), 1)
          );
          setOpen(true);
        }}
        style={styles.field}
      >
        <Text
          style={[
            styles.fieldText,
            !display && styles.placeholder
          ]}
        >
          {display || placeholder}
        </Text>
        <Text style={styles.icon}>▣</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.shade} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.card}>
            <View style={styles.monthRow}>
              <Pressable onPress={() => moveMonth(-1)} style={styles.navButton}>
                <Text style={styles.navText}>‹</Text>
              </Pressable>

              <Text style={styles.monthTitle}>
                {cursor.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric"
                })}
              </Text>

              <Pressable onPress={() => moveMonth(1)} style={styles.navButton}>
                <Text style={styles.navText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((label, index) => (
                <Text key={`${label}_${index}`} style={styles.weekday}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (!day) {
                  return <View key={`blank_${index}`} style={styles.day} />;
                }

                const isSelected =
                  selected &&
                  selected.getFullYear() === cursor.getFullYear() &&
                  selected.getMonth() === cursor.getMonth() &&
                  selected.getDate() === day;

                return (
                  <Pressable
                    key={`${day}_${index}`}
                    onPress={() => select(day)}
                    style={[
                      styles.day,
                      isSelected && styles.daySelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              {!!value && (
                <Pressable
                  onPress={() => {
                    onChange?.("");
                    setOpen(false);
                  }}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  const today = new Date();
                  onChange?.(
                    isoDate(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate()
                    )
                  );
                  setOpen(false);
                }}
                style={styles.todayButton}
              >
                <Text style={styles.todayText}>Today</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  fieldText: { color: BRAND.ink, fontWeight: "700" },
  placeholder: { color: BRAND.muted, fontWeight: "500" },
  icon: { color: BRAND.tealDark, fontWeight: "900", fontSize: 18 },
  shade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    padding: 20
  },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.line
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  navButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  navText: { color: BRAND.tealDark, fontSize: 30, fontWeight: "900" },
  monthTitle: { color: BRAND.ink, fontSize: 18, fontWeight: "900" },
  weekRow: { flexDirection: "row", marginTop: 10 },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: "900",
    paddingVertical: 7
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999
  },
  daySelected: { backgroundColor: BRAND.teal },
  dayText: { color: BRAND.ink, fontWeight: "700" },
  dayTextSelected: { color: "#FFF", fontWeight: "900" },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10
  },
  clearButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: "center"
  },
  clearText: { color: BRAND.danger, fontWeight: "900" },
  todayButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: BRAND.teal,
    justifyContent: "center"
  },
  todayText: { color: "#FFF", fontWeight: "900" }
});
