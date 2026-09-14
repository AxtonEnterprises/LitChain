import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  isSuccessResponse
} from "@react-native-google-signin/google-signin";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword
} from "firebase/auth";

import BrandMark from "../components/BrandMark";
import { auth } from "../lib/firebase";

export default function LoginScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    });

    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

  async function finishAuth(promise) {
    try {
      setBusy(true);
      await promise();
      router.replace("/home");
    } catch (error) {
      if (
        error?.code === "ERR_REQUEST_CANCELED" ||
        error?.code === "SIGN_IN_CANCELLED"
      ) {
        return;
      }

      Alert.alert(
        "Authentication error",
        error?.message || "Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert(
        "Missing information",
        "Enter your email and password."
      );
      return;
    }

    await finishAuth(async () => {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }
    });
  }

  async function signInGoogle() {
    await finishAuth(async () => {
      const webClientId =
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      if (!webClientId) {
        throw new Error(
          "Google Sign-In is not configured yet."
        );
      }

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true
      });

      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return;
      }

      const idToken =
        response.data?.idToken ||
        response.idToken ||
        null;

      if (!idToken) {
        throw new Error(
          "Google did not return an ID token."
        );
      }

      const credential =
        GoogleAuthProvider.credential(idToken);

      await signInWithCredential(
        auth,
        credential
      );
    });
  }

  async function signInApple() {
    await finishAuth(async () => {
      const result =
        await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication
              .AppleAuthenticationScope
              .FULL_NAME,
            AppleAuthentication
              .AppleAuthenticationScope
              .EMAIL
          ]
        });

      if (!result.identityToken) {
        throw new Error(
          "Apple did not return an identity token."
        );
      }

      const provider =
        new OAuthProvider("apple.com");

      const credential =
        provider.credential({
          idToken: result.identityToken
        });

      await signInWithCredential(
        auth,
        credential
      );
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <BrandMark />

        <View style={styles.card}>
          <Text style={styles.heading}>
            {mode === "signup"
              ? "Create your account"
              : "Welcome back"}
          </Text>

          <Pressable
            style={styles.googleButton}
            onPress={signInGoogle}
            disabled={busy}
          >
            <Text style={styles.googleText}>
              Continue with Google
            </Text>
          </Pressable>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication
                  .AppleAuthenticationButtonType
                  .CONTINUE
              }
              buttonStyle={
                AppleAuthentication
                  .AppleAuthenticationButtonStyle
                  .BLACK
              }
              cornerRadius={14}
              style={styles.appleButton}
              onPress={signInApple}
            />
          )}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>
              or
            </Text>
            <View style={styles.divider} />
          </View>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />

          <Pressable
            style={styles.primaryButton}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.primaryButtonText}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() =>
              setMode(
                mode === "login"
                  ? "signup"
                  : "login"
              )
            }
          >
            <Text style={styles.switchText}>
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New to Lit Chain? Create an account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#FBF7EF"
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 32
  },
  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: "#FFFDF8",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#D9DDD9"
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B2D45",
    marginBottom: 20
  },
  googleButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9DDD9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  googleText: {
    color: "#0B2D45",
    fontSize: 16,
    fontWeight: "800"
  },
  appleButton: {
    height: 52,
    width: "100%",
    marginTop: 12
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#D9DDD9"
  },
  dividerText: {
    color: "#61717C"
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#D9DDD9",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 16
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#0B2D45",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  switchButton: {
    paddingVertical: 16,
    alignItems: "center"
  },
  switchText: {
    color: "#2F8E9C",
    fontWeight: "700"
  }
});
