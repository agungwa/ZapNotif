import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { ComposerPage } from "./pages/ComposerPage";
import { SessionPage } from "./pages/SessionPage";
import { MessagesPage } from "./pages/MessagesPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { username, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <p className="pulse-dot font-display text-xs uppercase tracking-[0.3em] text-signal">
          zapnotif · authenticating
        </p>
      </div>
    );
  }
  if (!username) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<OverviewPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/composer" element={<ComposerPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/messages" element={<MessagesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
