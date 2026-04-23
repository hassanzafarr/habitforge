import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Show, ClerkLoading, ClerkLoaded } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { DashboardPage } from "@/pages/DashboardPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HabitDetailPage } from "@/pages/HabitDetailPage";
import { TodosPage } from "@/pages/TodosPage";
import { NotesPage } from "@/pages/NotesPage";
import { LandingPage } from "@/pages/LandingPage";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { HabitForm } from "@/features/habits/HabitForm";

export default function App() {
  useKeyboardShortcuts();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-full flex flex-col bg-bg dark:bg-neutral-950">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0 flex flex-col">
        <ClerkLoading>
          <div className="flex flex-1 items-center justify-center text-sm text-muted">
            Loading…
          </div>
        </ClerkLoading>
        <ClerkLoaded>
          <Show when="signed-out">
            <LandingPage />
          </Show>
          <Show when="signed-in">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/habits/:id" element={<HabitDetailPage />} />
              <Route path="/todos" element={<TodosPage />} />
              <Route path="/notes" element={<NotesPage />} />
            </Routes>
          </Show>
        </ClerkLoaded>
      </main>
      <Show when="signed-in">
        <BottomNav onNewHabit={() => setShowCreate(true)} />
        <HabitForm open={showCreate} onClose={() => setShowCreate(false)} />
      </Show>
    </div>
  );
}
