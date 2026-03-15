import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  is_admin?: number;
  isAdmin?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/me");
      const data = await r.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, setUser, loading, refresh };
}