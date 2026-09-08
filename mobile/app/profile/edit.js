import {
  useEffect,
  useState
} from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";

import {
  getNativeProfile,
  saveNativeProfile
} from "../../services/profile";

import { BRAND } from "../../../shared/brand";

export default function EditProfileScreen() {
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [displayName, setDisplayName] =
    useState("");

  const [about, setAbout] =
    useState("");

  const [photoURL, setPhotoURL] =
    useState("");

  const [status, setStatus] =
    useState("");

  useEffect(() => {
    (async () => {
      const profile =
        await getNativeProfile();

      setDisplayName(
        profile?.displayName || ""
      );

      setAbout(
        profile?.about || ""
      );

      setPhotoURL(
        profile?.photoURL ||
        profile?.avatar ||
        ""
      );

      setLoading(false);
    })();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setStatus("");

      await saveNativeProfile({
        displayName,
        about,
        photoURL
      });

      router.replace("/library");
    } catch (error) {
      setStatus(
        error?.message ||
        "Profile could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Edit profile
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>
            Display name
          </Text>

          <TextInput
            value={displayName}
            onChangeText={
              setDisplayName
            }
            style={styles.input}
          />

          <Text style={styles.label}>
            About
          </Text>

          <TextInput
            value={about}
            onChangeText={setAbout}
            multiline
            style={[
              styles.input,
              styles.multiline
            ]}
          />

          <Text style={styles.label}>
            Profile image URL
          </Text>

          <TextInput
            value={photoURL}
            onChangeText={setPhotoURL}
            autoCapitalize="none"
            style={styles.input}
          />

          {!!status && (
            <Text style={styles.status}>
              {status}
            </Text>
          )}

          <Pressable
            disabled={saving}
            onPress={save}
            style={styles.button}
          >
            <Text
              style={styles.buttonText}
            >
              {saving
                ? "Saving..."
                : "Save profile"}
            </Text>
          </Pressable>
        </View>
      )}
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
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  form: {
    padding: 18
  },
  label: {
    color: BRAND.ink,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 14
  },
  input: {
    minHeight: 46,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: BRAND.ink
  },
  multiline: {
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  status: {
    color: BRAND.danger,
    marginTop: 12
  },
  button: {
    minHeight: 50,
    backgroundColor: BRAND.teal,
    borderRadius: 14,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900"
  }
});
