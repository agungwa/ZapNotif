import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";

interface AuthState {
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ username: string }>("/api/auth/me")
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const me = await api.post<{ username: string }>("/api/auth/login", { username: user, password });
    setUsername(me.username);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
