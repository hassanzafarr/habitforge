import { SignInButton, SignUpButton } from "@clerk/react";

export function LandingPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <img
          src="/logos/mainlogo.png"
          alt="HabitForge"
          className="mx-auto mb-6 h-16 w-16 rounded-xl object-cover"
        />
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-ink dark:text-white">
          Welcome to HabitForge
        </h1>
        <p className="mb-8 text-muted dark:text-neutral-400">
          Track your habits, build streaks, and stay accountable. Sign in to get
          started with your own private space.
        </p>
        <div className="flex items-center justify-center gap-3">
          <SignInButton mode="modal">
            <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 transition-colors">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-ink transition-opacity">
              Get started
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}
