import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import VaultPage from "./pages/VaultPage";
import LearningPage from "./pages/LearningPage";
import MindtracePage from "./pages/MindtracePage";
import CommunityPage from "./pages/CommunityPage";
import { useAuth } from "./auth/AuthContext";

const GraphPage = lazy(() => import("./pages/GraphPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));

const pageContent = {
  settings: {
    title: "Settings & Privacy",
    eyebrow: "Your data, your choices",
    description: "Manage account preferences, privacy, data access, and optional integrations.",
    next: "Security, privacy controls, and data management will be implemented in later phases."
  }
};

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-500">Loading MINDOS…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage mode="register" />} />
      {user && (
        <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        {Object.entries(pageContent).map(([path, props]) => (
          <Route key={path} path={path} element={<PlaceholderPage {...props} />} />
        ))}
        <Route path="vault" element={<VaultPage />} />
        <Route path="import" element={<Suspense fallback={<p className="text-sm text-slate-500">Preparing your import tools…</p>}><ImportPage /></Suspense>} />
        <Route path="graph" element={<Suspense fallback={<p className="text-sm text-slate-500">Arranging your knowledge graph…</p>}><GraphPage /></Suspense>} />
        <Route path="learning" element={<LearningPage />} />
        <Route path="mindtrace" element={<MindtracePage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
      {!user && <Route path="*" element={<Navigate to="/login" replace />} />}
    </Routes>
  );
}
