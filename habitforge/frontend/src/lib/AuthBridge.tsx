import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "./api";
import { Sentry } from "./sentry";

/**
 * Wires Clerk's session token into the api fetch wrapper and clears the
 * React Query cache on sign-out so one user's data never leaks into another's.
 */
export function AuthBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, userId } = useAuth();
  const qc = useQueryClient();

  // Register the token getter synchronously during render so child queries
  // that fire on first mount (effects run child→parent) already see it.
  // A ref keeps the registered function stable while always pointing at the
  // latest getToken from Clerk.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const registered = useRef(false);
  if (!registered.current) {
    setAuthTokenGetter(async () => {
      try {
        return await getTokenRef.current();
      } catch {
        return null;
      }
    });
    registered.current = true;
  }

  // Clear the React-Query cache ONLY when switching away from an
  // authenticated user (sign-out or different account).  Never clear on the
  // initial auth settling (undefined/null → real userId) because that would
  // wipe queries that child components just started (effects run child→parent).
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const current = userId ?? null;
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = current;

    Sentry.setUser(current ? { id: current } : null);

    // Only clear when a *real* previous user existed and the identity changed.
    if (prev && prev !== current) {
      qc.clear();
    }
  }, [userId, isSignedIn, qc]);

  return <>{children}</>;
}
