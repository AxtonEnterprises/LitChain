import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";

import { auth } from "../firebase";
import "./Login.css";
import SEO from "../components/SEO.jsx";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

export default function Login({ rootMode = false }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function getAuthErrorMessage(error) {
    console.error("Firebase authentication error:", error);

    switch (error?.code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/missing-password":
        return "Please enter your password.";

      case "auth/weak-password":
        return "Your password must be at least 6 characters.";

      case "auth/email-already-in-use":
        return "An account already exists with this email address.";

      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Incorrect email or password.";

      case "auth/popup-closed-by-user":
        return "Google sign-in was closed before it finished.";

      case "auth/popup-blocked":
        return "Your browser blocked the Google sign-in window. Allow popups and try again.";

      case "auth/cancelled-popup-request":
        return "The Google sign-in request was cancelled. Please try again.";

      case "auth/unauthorized-domain":
  return `Firebase error: ${error.code} — ${error.message}`;
        
      case "auth/operation-not-allowed":
        return "This sign-in method is not enabled in Firebase.";

      case "auth/network-request-failed":
        return "A network error occurred. Check your connection and try again.";

      case "auth/too-many-requests":
        return "Too many sign-in attempts. Please wait and try again.";

      default:
        return error?.message || "Authentication failed. Please try again.";
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();

    if (loading) return;

    const cleanedEmail = email.trim();

    if (!cleanedEmail) {
      setStatus("Please enter your email address.");
      return;
    }

    if (!password) {
      setStatus("Please enter your password.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (mode === "register") {
        await createUserWithEmailAndPassword(
          auth,
          cleanedEmail,
          password
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          cleanedEmail,
          password
        );
      }

      navigate("/read", { replace: true });
    } catch (error) {
      setStatus(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (loading) return;

    setLoading(true);
    setStatus("");

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      navigate("/read", { replace: true });
    } catch (error) {
      setStatus(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleModeSwitch() {
    setMode((currentMode) =>
      currentMode === "login" ? "register" : "login"
    );

    setPassword("");
    setStatus("");
  }

  const seoPath = rootMode ? "/" : "/read/login";

  return (
    <main className="login-page">
      <SEO
        title={
          rootMode
            ? "Lit Chain | Read. Connect. Continue the Chain."
            : mode === "login"
              ? "Log In | Lit Chain"
              : "Create Account | Lit Chain"
        }
        description={
          rootMode
            ? "Lit Chain is a free social reading platform from The Literature Foundation. Read great literature, capture ideas, and follow connections between readers, books, and discussions."
            : "Log in or create a Lit Chain account to read, save progress, take notes, join discussions, and connect through literature."
        }
        path={seoPath}
        noindex={!rootMode}
      />

      <div className={rootMode ? "login-shell login-shell-root" : "login-shell"}>
        {rootMode && (
          <section className="login-intro" aria-labelledby="lit-chain-intro-title">
            <p className="login-eyebrow">A project of The Literature Foundation</p>
            <h1 id="lit-chain-intro-title">Read. Connect. Continue the chain.</h1>
            <p className="login-intro-lead">
              Lit Chain is a free social reading platform built around the idea that
              great literature becomes more meaningful when readers can connect what
              they read with what others discover.
            </p>

            <div className="login-feature-grid">
              <article>
                <strong>Read great literature</strong>
                <p>Read public-domain books, save your progress, and keep notes connected to the passages that inspired them.</p>
              </article>
              <article>
                <strong>Follow ideas</strong>
                <p>Explore chains of reader notes and discussions that grow outward from the literature itself.</p>
              </article>
              <article>
                <strong>Read together</strong>
                <p>Join groups and classes, discuss books, reply to other readers, and build connections between ideas.</p>
              </article>
            </div>

            <div className="login-foundation">
              <div>
                <p className="login-eyebrow">The Literature Foundation</p>
                <h2>Keeping literature accessible, engaging, and alive.</h2>
                <p>
                  The Literature Foundation develops free tools that help readers,
                  students, and educators read important works, think about them,
                  discuss them, and preserve those connections for future readers.
                </p>
              </div>
              <a
                className="login-support-button"
                href="https://theliteraturefoundation.org"
                target="_blank"
                rel="noreferrer"
              >
                Support the Foundation
              </a>
            </div>
          </section>
        )}

        <section className="login-card" aria-label={mode === "login" ? "Log in" : "Create account"}>
        <img
          className="login-logo"
          src="/branding/lit-chain-logo-horizontal.png"
          alt="Lit Chain"
        />

        <p className="login-tagline">
          Read. Connect. Continue the chain.
        </p>

        <h1>
          {mode === "login"
            ? "Welcome Back"
            : "Create an Account"}
        </h1>

        <p className="login-description">
          {mode === "login"
            ? "Log in to continue where you left off."
            : "Create an account to save books, reading progress, notes, classes, groups, and your place in the chain."}
        </p>

        <form
          className="login-form"
          onSubmit={handleEmailSubmit}
        >
          <label htmlFor="email">Email</label>

          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder={
              mode === "register"
                ? "At least 6 characters"
                : "Enter your password"
            }
            autoComplete={
              mode === "register"
                ? "new-password"
                : "current-password"
            }
            minLength={
              mode === "register" ? 6 : undefined
            }
            disabled={loading}
            required
          />

          <button
            type="submit"
            className="login-primary-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log In"
                : "Create Account"}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="login-google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          Continue with Google
        </button>

        {status && (
          <div
            className="login-status"
            role="alert"
          >
            {status}
          </div>
        )}

        <div className="login-switch">
          <span>
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={handleModeSwitch}
            disabled={loading}
          >
            {mode === "login"
              ? "Create Account"
              : "Log In"}
          </button>
        </div>

        <div className="login-legal">
          By continuing, you agree to the{" "}
          <a href="/terms">Terms</a> and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </div>
      </section>
      </div>
    </main>
  );
}
