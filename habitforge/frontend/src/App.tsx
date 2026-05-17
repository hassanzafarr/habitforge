import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Show, ClerkLoading, ClerkLoaded } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Modal } from "@/components/ui/Modal";
import { DashboardPage } from "@/pages/DashboardPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HabitDetailPage } from "@/pages/HabitDetailPage";
import { TodosPage } from "@/pages/TodosPage";
import { NotesPage } from "@/pages/NotesPage";
import { LandingPage } from "@/pages/LandingPage";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { usePushActionBridge } from "@/lib/usePushActionBridge";
import { HabitForm } from "@/features/habits/HabitForm";
import { TodoForm } from "@/features/todos/TodoForm";
import { NoteEditor } from "@/features/notes/NoteEditor";
import { ListTodo } from "lucide-react";

export default function App() {
  useKeyboardShortcuts();
  usePushActionBridge();
  const [showCreateHabit, setShowCreateHabit] = useState(false);
  const [showCreateTodo, setShowCreateTodo] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);

  return (
    <div className="min-h-full flex flex-col bg-bg dark:bg-neutral-950">
      <Navbar />
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 flex flex-col">
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
        <BottomNav
          onNewHabit={() => setShowCreateHabit(true)}
          onNewTodo={() => setShowCreateTodo(true)}
          onNewNote={() => setShowCreateNote(true)}
        />
        <HabitForm open={showCreateHabit} onClose={() => setShowCreateHabit(false)} />
        <Modal
          open={showCreateTodo}
          onClose={() => setShowCreateTodo(false)}
          title={
            <span className="flex items-center gap-2">
              <ListTodo size={16} className="text-emerald-500" />
              New To-Do
            </span>
          }
        >
          <TodoForm onClose={() => setShowCreateTodo(false)} />
        </Modal>
        {showCreateNote && (
          <NoteEditor note={null} onClose={() => setShowCreateNote(false)} />
        )}
      </Show>
    </div>
  );
}
