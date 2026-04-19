import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { DashboardPage } from "@/pages/DashboardPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HabitDetailPage } from "@/pages/HabitDetailPage";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";

export default function App() {
  useKeyboardShortcuts();

  return (
    <div className="min-h-full flex flex-col bg-bg dark:bg-neutral-950">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/:id" element={<HabitDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
