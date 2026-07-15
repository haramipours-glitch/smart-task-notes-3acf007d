import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

async function hydrateOAuthSessionFromUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
    return data.session;
  }

  if (query.has("code")) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
    if (!error) {
      query.delete("code");
      const nextSearch = query.toString();
      window.history.replaceState({}, document.title, window.location.pathname + (nextSearch ? `?${nextSearch}` : ""));
    }
    return data.session;
  }

  return null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    // THEN fetch existing session
    (async () => {
      const oauthSession = await hydrateOAuthSessionFromUrl();
      if (oauthSession) {
        setSession(oauthSession);
        setUser(oauthSession.user);
        setLoading(false);
        return;
      }

      const { data: { session: sess } } = await supabase.auth.getSession();
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
