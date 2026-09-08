import {
  useEffect,
  useState
} from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";

import BottomNav from "../../components/BottomNav";

import {
  getNativeProfile,
  saveNativeProfile
} from "../../services/profile";

import {
  PROFILE_AVATARS,
  profileAvatarUrl
} from "../../../shared/profileAvatars";

import { BRAND } from "../../../shared/brand";

export default function EditProfileScreen() {
  const [displayName, setDisplayName] =
    useState("");

  const [about, setAbout] =
    useState("");

  const [avatar, setAvatar] =
    useState("");

  const [status, setStatus] =
    useState("");

  useEffect(() => {
    getNativeProfile().then((profile) => {
      setDisplayName(
        profile?.displayName || ""
      );

      setAbout(
        profile?.about || ""
      );

      setAvatar(
        profile?.avatar || ""
      );
    });
  }, []);

  async function save() {
    try {
      setStatus("");

      await saveNativeProfile({
        displayName,
        about,
        avatar,
        photoURL:
          profileAvatarUrl(avatar)
      });

      router.replace("/library");
    } catch (error) {
      setStatus(
        error?.message ||
          "Profile could not be saved."
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
          Edit profile
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          style={styles.input}
        />

        <TextInput
          value={about}
          onChangeText={setAbout}
          placeholder="About"
          multiline
          style={[
            styles.input,
            styles.multiline
          ]}
        />

        <Text style={styles.label}>
          Avatar
        </Text>

        <FlatList
          horizontal
          data={PROFILE_AVATARS}
          keyExtractor={(item) =>
            item.id
          }
          showsHorizontalScrollIndicator={
            false
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                setAvatar(item.id)
              }
              style={[
                styles.avatarWrap,
                avatar === item.id &&
                  styles.avatarSelected
              ]}
            >
              <Image
                source={{
                  uri: item.image
                }}
                style={styles.avatar}
              />
            </Pressable>
          )}
        />

        {!!status && (
          <Text style={styles.status}>
            {status}
          </Text>
        )}

        <Pressable
          onPress={save}
          style={styles.save}
        >
          <Text style={styles.saveText}>
            Save profile
          </Text>
        </Pressable>
      </View>

      <BottomNav active="library" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.background
  },
  header: {
    backgroundColor: BRAND.surface,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line
  },
  back: {
    color: BRAND.tealDark,
    fontWeight: "900"
  },
  title: {
    color: BRAND.ink,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 10
  },
  form: {
    flex: 1,
    padding: 18
  },
  input: {
    minHeight: 46,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12
  },
  label: {
    color: BRAND.ink,
    fontWeight: "900",
    marginBottom: 8
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 10,
    padding: 3
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: BRAND.teal
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 12
  },
  status: {
    color: BRAND.danger,
    marginTop: 10
  },
  save: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: BRAND.teal,
    alignItems: "center",
    justifyContent: "center"
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "900"
  }
});
