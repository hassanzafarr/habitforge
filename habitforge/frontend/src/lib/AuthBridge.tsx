import { useEffect } from "react";
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

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  useEffect(() => {
    qc.clear();
  }, [userId, isSignedIn, qc]);

  return <>{children}</>;
}
