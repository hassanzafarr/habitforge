import type { ReactNode } from "react";

type ShowWhen = "signed-in" | "signed-out";

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ClerkLoading() {
  return null;
}

export function ClerkLoaded({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Show({ when, children }: { when: ShowWhen; children: ReactNode }) {
  return when === "signed-in" ? <>{children}</> : null;
}

export function SignInButton({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SignUpButton({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function UserButton() {
  return <button aria-label="User menu">Test User</button>;
}

export function useAuth() {
  return {
    isSignedIn: true,
    userId: "habitforge-e2e-user",
    getToken: async () => "habitforge-e2e-token",
  };
}
