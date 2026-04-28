import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "./api";

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

  // Track previous user so we only clear the cache on actual user changes
  // (sign-out or different account), not on the initial auth state settling.
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // Skip the very first run (initial mount / auth loading).
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = userId ?? null;
      return;
    }
    // Only clear when the user truly changed.
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId ?? null;
    if (prev !== (userId ?? null)) {
      qc.clear();
    }
  }, [userId, isSignedIn, qc]);

  return <>{children}</>;
}
