import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import BottomNav from "../../components/BottomNav";
import { BRAND } from "../../../shared/brand";
import {
  canManageClass,
  getNativeClass,
  saveNativeClassSettings
} from "../../services/classFoundation";

export default function ClassSettings() {
  const params = useLocalSearchParams();
  const classId = String(params.classId || "");

  const [classData, setClassData] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [joinPolicy, setJoinPolicy] = useState("invite_only");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getNativeClass(classId)
      .then((loaded) => {
        setClassData(loaded);
        setName(loaded.name || "");
        setDescription(loaded.description || "");
        setVisibility(loaded.visibility || "private");
        setJoinPolicy(loaded.joinPolicy || "invite_only");
      })
      .catch((error) => {
        setStatus(error?.message || "Could not load class settings.");
      })
      .finally(() => setLoading(false));
  }, [classId]);

  function chooseVisibility(next) {
    setVisibility(next);

    /*
     * Firestore only permits open/request enrollment on
     * discoverable or public classes.
     */
    if (
      next === "private" &&
      ["open", "request_to_join"].includes(joinPolicy)
    ) {
      setJoinPolicy("invite_only");
    }
  }

  function chooseJoinPolicy(next) {
    setJoinPolicy(next);

    if (
      ["open", "request_to_join"].includes(next) &&
      visibility === "private"
    ) {
      setVisibility("discoverable");
    }
  }

  async function save() {
    try {
      setSaving(true);
      setStatus("");

      await saveNativeClassSettings(classId, {
        name,
        description,
        avatar: classData?.avatar || "",
        visibility,
        joinPolicy
      });

      setStatus("Class settings saved.");
    } catch (error) {
      setStatus(error?.message || "Could not save class settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!canManageClass(classData?.membership?.role)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.denied}>
            Only the Primary Teacher or a Teacher can manage class settings.
          </Text>
        </View>
        <BottomNav active="groups" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Class</Text>
        </Pressable>

        <Text style={styles.title}>Class Settings</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.description]}
        />

        <Text style={styles.label}>Visibility</Text>
        <View style={styles.chips}>
          {[
            ["private", "Private"],
            ["discoverable", "Discoverable"],
            ["public", "Public"]
          ].map(([id, label]) => (
            <Chip
              key={id}
              active={visibility === id}
              label={label}
              onPress={() => chooseVisibility(id)}
            />
          ))}
        </View>

        <Text style={styles.label}>Join Policy</Text>
        <View style={styles.chips}>
          {[
            ["invite_only", "Invite"],
            ["request_to_join", "Request"],
            ["open", "Open"]
          ].map(([id, label]) => (
            <Chip
              key={id}
              active={joinPolicy === id}
              label={label}
              onPress={() => chooseJoinPolicy(id)}
            />
          ))}
        </View>

        <Text style={styles.help}>
          Request/Open enrollment requires a Discoverable or Public class.
          Selecting either option will automatically make a Private class Discoverable.
        </Text>

        <Pressable disabled={saving} onPress={save} style={styles.save}>
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save Settings"}</Text>
        </Pressable>

        {!!status && <Text style={styles.status}>{status}</Text>}
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 18, paddingBottom: 100 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  denied: { color: BRAND.muted, textAlign: "center", lineHeight: 21 },
  back: { color: BRAND.tealDark, fontWeight: "900", marginBottom: 18 },
  title: { color: BRAND.ink, fontSize: 28, fontWeight: "900", marginBottom: 14 },
  label: { color: BRAND.ink, fontWeight: "900", marginTop: 12, marginBottom: 7 },
  input: {
    minHeight: 46,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12
  },
  description: { minHeight: 100, paddingTop: 12, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipActive: { backgroundColor: BRAND.teal, borderColor: BRAND.teal },
  chipText: { color: BRAND.ink, fontWeight: "800" },
  chipTextActive: { color: "#FFF" },
  help: {
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10
  },
  save: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22
  },
  saveText: { color: "#FFF", fontWeight: "900" },
  status: { color: BRAND.tealDark, textAlign: "center", marginTop: 12 }
});
