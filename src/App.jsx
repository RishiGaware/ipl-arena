import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

import AppLayout from "./components/layout/AppLayout";
import TeamLogo from "./components/ui/TeamLogo";
import { getTeamLogo, TEAM_SHORT_NAMES } from "./constants/teamLogos";
import Bet from "./pages/Bet";
import Leaderboard from "./pages/Leaderboard";
import Live from "./pages/Live";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Schedule from "./pages/Schedule";
import AdminDashboard from "./pages/AdminDashboard";
import useAuthStore from "./store/useAuthStore";
import { setTheme, themes } from "./utils/themeUtils";

import "./App.css"

function LoadingScreen() {
  const savedTheme = JSON.parse(localStorage.getItem("app-theme-colors") || "{}");

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md bg-background-light dark:bg-background-dark min-h-screen relative shadow-2xl flex items-center justify-center">
        <div className="relative">
          <div className="animate-bounce">
            <TeamLogo 
                teamCode={savedTheme.teamId} 
                className="w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center border-4 border-primary/20" 
                imgClassName="w-24 h-24 object-contain drop-shadow-lg"
                tbdClassName="text-2xl font-black text-primary"
            />
          </div>
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-primary/20 blur-3xl -z-10 rounded-full scale-150 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/leaderboard" replace /> : children;
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    return initializeAuth();
  }, [initializeAuth]);

  // Set theme based on last match winner
  useEffect(() => {
    const q = query(
      collection(db, "matches"),
      orderBy("settledAt", "desc"),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Find the most recent match that is finished AND has a valid winner (not a refund)
        const lastPayedMatch = matches.find(m =>
          m.status === "finished" &&
          m.winner &&
          m.winner !== "refunded" &&
          m.winner !== "0"
        );

        if (lastPayedMatch) {
          const winner = lastPayedMatch.winner;
          const teamKey = TEAM_SHORT_NAMES[winner]?.toLowerCase() || winner?.toString().toLowerCase();

          if (teamKey && themes[teamKey]) {
            setTheme({ ...themes[teamKey], teamId: winner });
          }
        } else {
          // Fallback to default if no valid winning match found yet
          setTheme(themes.green);
        }
      }
    }, (error) => {
      console.error("Error fetching last match for theme:", error);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Navigate to="/login" replace />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/bet" element={<Bet />} />
          <Route path="/live" element={<Live />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin-stats" element={<AdminDashboard />} />
        </Route>

        {/* Catch-all route to fallback to leaderboard */}
        <Route path="*" element={<Navigate to="/leaderboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
