import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import Header from "./components/Header";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Reader from "./pages/Reader";
import Journal from "./pages/Journal";
import About from "./pages/About";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";
import Profile from "./pages/Profile";
import Chain from "./pages/Chain";
import NotFound from "./pages/NotFound.jsx";
import PublicProfile from "./pages/PublicProfile";
import GroupRouter from "./pages/GroupRouter";
import Notifications from "./pages/Notifications";
import DiscoverGroups from "./pages/DiscoverGroups";
import Moderation from "./pages/Moderation";
import JoinInvite from "./pages/JoinInvite.jsx";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const isAppRoute =
    location.pathname === "/read" ||
    location.pathname.startsWith("/read/");

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const pendingPath = sessionStorage.getItem(
        "litChain.pendingInvitePath"
      );

      if (!pendingPath) return;

      sessionStorage.removeItem(
        "litChain.pendingInvitePath"
      );

      if (location.pathname !== pendingPath) {
        navigate(pendingPath, { replace: true });
      }
    });
  }, [location.pathname, navigate]);

  return (
    <>
      {isAppRoute && <Header />}

      <main className={isAppRoute ? "app-main lit-chain-app" : "auth-app"}>
        <Routes>
          <Route path="/" element={<RootGate />} />

          <Route path="/read" element={<Chain />} />
          <Route path="/read/discover" element={<Home />} />
          <Route path="/read/search" element={<Search />} />
          <Route path="/read/reader/:id" element={<Reader />} />
          <Route path="/read/journal" element={<Journal />} />
          <Route path="/read/profile" element={<Profile />} />
          <Route path="/read/moderation" element={<Moderation />} />
          <Route path="/read/notifications" element={<Notifications />} />
          <Route path="/read/public/:userId" element={<PublicProfile />} />
          <Route path="/read/about" element={<About />} />
          <Route path="/read/login" element={<Login />} />
          <Route path="/read/join/:token" element={<JoinInvite />} />

          <Route
            path="/read/chain"
            element={<Navigate to="/read" replace />}
          />

          <Route path="/read/groups" element={<DiscoverGroups />} />
          <Route
            path="/read/groups/:groupId"
            element={<GroupRouter />}
          />

          <Route
            path="/search"
            element={<Navigate to="/read/search" replace />}
          />
          <Route path="/reader/:id" element={<LegacyReaderRedirect />} />
          <Route
            path="/journal"
            element={<Navigate to="/read/journal" replace />}
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route
            path="/about"
            element={<Navigate to="/read/about" replace />}
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

function RootGate() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="root-auth-loading" role="status" aria-live="polite">
        Loading Lit Chain…
      </div>
    );
  }

  if (user) {
    return <Navigate to="/read" replace />;
  }

  return <Login rootMode />;
}

function LegacyReaderRedirect() {
  const id = window.location.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  return <Navigate to={`/read/reader/${id}`} replace />;
}
