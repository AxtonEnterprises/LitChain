import { useEffect, useState } from "react";
import {
  Image,
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
import { createNativeReadingGroup } from "../../services/groupCreate";
import { groupAvatarUrl } from "../../../shared/groupAvatars";
import { BRAND } from "../../../shared/brand";

const AVATARS = [
  "musketeers",
  "lost-boys",
  "wonderland",
  "oz",
  "bennet-sisters",
  "argonauts",
  "round-table",
  "gothic-horror",
  "time-travelers"
];

export default function CreateGroup() {
  const params = useLocalSearchParams();
  const requestedType = String(params.type || "") === "class" ? "class" : "group";

  const [type, setType] = useState(requestedType);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("round-table");
  const [visibility, setVisibility] = useState(
    requestedType === "class" ? "private" : "discoverable"
  );
  const [joinPolicy, setJoinPolicy] = useState(
    requestedType === "class" ? "invite_only" : "request_to_join"
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (type === "class") {
      setVisibility("private");
      setJoinPolicy("invite_only");
    } else {
      setVisibility("discoverable");
      setJoinPolicy("request_to_join");
    }
  }, [type]);

  async function create() {
    try {
      setStatus("");
      const created = await createNativeReadingGroup({
        name,
        description,
        avatar,
        visibility,
        joinPolicy,
        type
      });

      router.replace({
        pathname: created.type === "class" ? "/class/[classId]" : "/group/[groupId]",
        params: created.type === "class"
          ? { classId: created.id, name: created.name, role: "owner" }
          : { groupId: created.id, name: created.name, role: "owner" }
      });
    } catch (error) {
      setStatus(error?.message || `Could not create ${type}.`);
    }
  }

  const noun = type === "class" ? "Class" : "Group";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Create {noun}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {[
            ["group", "Reading Group"],
            ["class", "Class"]
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setType(id)}
              style={[styles.chip, type === id && styles.chipActive]}
            >
              <Text style={[styles.chipText, type === id && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {type === "class" && (
          <View style={styles.classNote}>
            <Text style={styles.classNoteTitle}>Classroom roles</Text>
            <Text style={styles.classNoteText}>
              Primary Teacher · Teacher · Aide · Student
            </Text>
          </View>
        )}

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={`${noun} name`}
          style={styles.input}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          style={[styles.input, styles.description]}
        />

        <Text style={styles.label}>Avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((id) => (
            <Pressable
              key={id}
              onPress={() => setAvatar(id)}
              style={[styles.avatarWrap, avatar === id && styles.avatarActive]}
            >
              <Image source={{ uri: groupAvatarUrl(id) }} style={styles.avatar} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Visibility</Text>
        <View style={styles.chips}>
          {[
            ["discoverable", "Discoverable"],
            ["public", "Public"],
            ["private", "Private"]
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setVisibility(id)}
              style={[styles.chip, visibility === id && styles.chipActive]}
            >
              <Text style={[styles.chipText, visibility === id && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Join Policy</Text>
        <View style={styles.chips}>
          {[
            ["open", "Open"],
            ["request_to_join", "Request"],
            ["invite_only", "Invite"]
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setJoinPolicy(id)}
              style={[styles.chip, joinPolicy === id && styles.chipActive]}
            >
              <Text style={[styles.chipText, joinPolicy === id && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={create} style={styles.create}>
          <Text style={styles.createText}>Create {noun}</Text>
        </Pressable>

        {!!status && <Text style={styles.status}>{status}</Text>}
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.background },
  header: {
    padding: 18,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  back: { color: BRAND.tealDark, fontWeight: "900" },
  title: { color: BRAND.ink, fontSize: 24, fontWeight: "900", marginTop: 8 },
  content: { padding: 18, paddingBottom: 90 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    backgroundColor: BRAND.surface,
    paddingHorizontal: 12,
    marginTop: 12
  },
  description: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  label: { color: BRAND.ink, fontWeight: "900", marginTop: 14, marginBottom: 8 },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden"
  },
  avatarActive: { borderColor: BRAND.teal },
  avatar: { width: "100%", height: "100%" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  chipActive: { backgroundColor: BRAND.teal, borderColor: BRAND.teal },
  chipText: { color: BRAND.ink, fontWeight: "800" },
  chipTextActive: { color: "#FFF" },
  classNote: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.surface,
    padding: 12
  },
  classNoteTitle: { color: BRAND.ink, fontWeight: "900" },
  classNoteText: { color: BRAND.muted, marginTop: 3 },
  create: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20
  },
  createText: { color: "#FFF", fontWeight: "900" },
  status: { color: BRAND.danger, textAlign: "center", marginTop: 12 }
});
