import {
  useState
} from "react";

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

import { router } from "expo-router";

import BottomNav from "../../components/BottomNav";

import {
  createNativeReadingGroup
} from "../../services/groupCreate";

import {
  groupAvatarUrl
} from "../../../shared/groupAvatars";

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
  const [name, setName] =
    useState("");
  const [description, setDescription] =
    useState("");
  const [avatar, setAvatar] =
    useState("round-table");
  const [visibility, setVisibility] =
    useState("discoverable");
  const [joinPolicy, setJoinPolicy] =
    useState("request_to_join");
  const [status, setStatus] =
    useState("");

  async function create() {
    try {
      setStatus("");

      const group =
        await createNativeReadingGroup({
          name,
          description,
          avatar,
          visibility,
          joinPolicy
        });

      router.replace({
        pathname: "/group/[groupId]",
        params: {
          groupId: group.id,
          name: group.name,
          role: "owner"
        }
      });
    } catch (error) {
      setStatus(
        error?.message ||
          "Could not create group."
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Create Reading Group
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          style={styles.input}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          style={[
            styles.input,
            styles.description
          ]}
        />

        <Text style={styles.label}>
          Avatar
        </Text>

        <View style={styles.avatarGrid}>
          {AVATARS.map((id) => (
            <Pressable
              key={id}
              onPress={() =>
                setAvatar(id)
              }
              style={[
                styles.avatarWrap,
                avatar === id &&
                  styles.avatarActive
              ]}
            >
              <Image
                source={{
                  uri:
                    groupAvatarUrl(id)
                }}
                style={styles.avatar}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>
          Visibility
        </Text>

        <View style={styles.chips}>
          {[
            ["discoverable", "Discoverable"],
            ["public", "Public"],
            ["private", "Private"]
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() =>
                setVisibility(id)
              }
              style={[
                styles.chip,
                visibility === id &&
                  styles.chipActive
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  visibility === id &&
                    styles.chipTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>
          Join Policy
        </Text>

        <View style={styles.chips}>
          {[
            ["open", "Open"],
            [
              "request_to_join",
              "Request"
            ],
            [
              "invite_only",
              "Invite"
            ]
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() =>
                setJoinPolicy(id)
              }
              style={[
                styles.chip,
                joinPolicy === id &&
                  styles.chipActive
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  joinPolicy === id &&
                    styles.chipTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={create}
          style={styles.create}
        >
          <Text style={styles.createText}>
            Create Group
          </Text>
        </Pressable>

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}
      </ScrollView>

      <BottomNav active="groups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  header: {
    padding: 18,
    backgroundColor: BRAND.surface,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8
  },
  content: {
    padding: 18,
    paddingBottom: 80
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    backgroundColor: BRAND.surface,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  description: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  label: {
    color: BRAND.ink,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 8
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden"
  },
  avatarActive: {
    borderColor: BRAND.teal
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    alignItems: "center",
    justifyContent: "center"
  },
  chipActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal
  },
  chipText: {
    color: BRAND.ink,
    fontWeight: "800"
  },
  chipTextActive: {
    color: "#FFF"
  },
  create: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20
  },
  createText: {
    color: "#FFF",
    fontWeight: "900"
  },
  status: {
    color: BRAND.danger,
    textAlign: "center",
    marginTop: 12
  }
});
