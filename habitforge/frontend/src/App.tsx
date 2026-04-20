import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { DashboardPage } from "@/pages/DashboardPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HabitDetailPage } from "@/pages/HabitDetailPage";
import { TodosPage } from "@/pages/TodosPage";
import { NotesPage } from "@/pages/NotesPage";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { HabitForm } from "@/features/habits/HabitForm";

export default function App() {
  useKeyboardShortcuts();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-full flex flex-col bg-bg dark:bg-neutral-950">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/:id" element={<HabitDetailPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/notes" element={<NotesPage />} />
        </Routes>
      </main>
      <BottomNav onNewHabit={() => setShowCreate(true)} />
      <HabitForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

