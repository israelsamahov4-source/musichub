import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase, unwrap } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);
      if (event === "PASSWORD_RECOVERY") navigate("/reset-password");
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, queryClient]);

  const user = session?.user ?? null;

  const profileQuery = useQuery({
    queryKey: ["profile", "me", user?.id],
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.from("profiles").select("*").eq("id", user.id).single()),
    staleTime: 60_000,
  });

  const value = useMemo(
    () => ({
      session,
      user,
      profile: profileQuery.data ?? null,
      loading: session === undefined || (Boolean(user) && profileQuery.isLoading),
      refreshProfile: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
      signOut: async () => {
        await supabase.auth.signOut();
        navigate("/");
      },
    }),
    [session, user, profileQuery.data, profileQuery.isLoading, queryClient, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
