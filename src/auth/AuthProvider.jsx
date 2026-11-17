import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase, unwrap } from "@/lib/supabase";
import { MEMBER_PROFILE_COLS } from "@/api/profiles";

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
      // Re-check two-step status only when it can change (not on the hourly token refresh,
      // which used to reload the page and throw away whatever the user was typing).
      if (["SIGNED_IN", "MFA_CHALLENGE_VERIFIED", "USER_UPDATED"].includes(event)) {
        queryClient.invalidateQueries({ queryKey: ["mfa-level"] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, queryClient]);

  const user = session?.user ?? null;

  // Two-step verification: has the user turned it on but not entered the code yet?
  const mfaQuery = useQuery({
    queryKey: ["mfa-level", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) return false;
      return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
    },
    staleTime: Infinity,
  });
  const mfaRequired = Boolean(user) && mfaQuery.data === true;

  const profileQuery = useQuery({
    queryKey: ["profile", "me", user?.id],
    enabled: Boolean(user) && mfaQuery.data === false,
    queryFn: async () => {
      const [profile, account] = await Promise.all([
        supabase.from("profiles").select(MEMBER_PROFILE_COLS).eq("id", user.id).single().then(unwrap),
        supabase.rpc("my_account").then(unwrap),
      ]);
      return { ...profile, is_admin: Boolean(account?.is_admin), is_suspended: Boolean(account?.is_suspended) };
    },
    staleTime: 60_000,
  });

  // A device that was signed in before two-step verification was turned on elsewhere has a stale
  // session: the database returns nothing. Refresh the session once so the code prompt appears.
  const recovered = useRef(false);
  useEffect(() => {
    if (!user || !profileQuery.isError || recovered.current) return;
    recovered.current = true;
    supabase.auth.refreshSession().finally(() => {
      queryClient.invalidateQueries({ queryKey: ["mfa-level"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
    });
  }, [user, profileQuery.isError, queryClient]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile: profileQuery.data ?? null,
      mfaRequired,
      profileError: Boolean(user) && !mfaRequired && profileQuery.isError && !profileQuery.isFetching,
      retryProfile: () => profileQuery.refetch(),
      loading: session === undefined || (Boolean(user) && (mfaQuery.isLoading || (!mfaRequired && profileQuery.isLoading))),
      refreshProfile: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
      signOut: async () => {
        await supabase.auth.signOut();
        navigate("/");
      },
    }),
    [session, user, mfaRequired, mfaQuery.isLoading, profileQuery, queryClient, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
