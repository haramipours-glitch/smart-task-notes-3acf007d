import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { installUndoShortcuts } from "@/lib/undoStack";

// Keep entry-critical routes eager so first paint isn't gated on a chunk
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy-load everything else — each page becomes its own chunk, slashing initial JS
const AppLayout = lazy(() => import("@/layouts/AppLayout"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const TasksView = lazy(() => import("./pages/TasksView"));
const NotesView = lazy(() => import("./pages/NotesView"));
const HabitsView = lazy(() => import("./pages/HabitsView"));
const PomodoroView = lazy(() => import("./pages/PomodoroView"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const SettingsView = lazy(() => import("./pages/SettingsView"));
const KanbanView = lazy(() => import("./pages/KanbanView"));
const GoalsView = lazy(() => import("./pages/GoalsView"));
const ReviewView = lazy(() => import("./pages/ReviewView"));
const InsightsView = lazy(() => import("./pages/InsightsView"));
const SelfKnowledgeView = lazy(() => import("./pages/SelfKnowledgeView"));
const AssessmentRunner = lazy(() => import("./pages/AssessmentRunner"));
const AssessmentResult = lazy(() => import("./pages/AssessmentResult"));
const CheckinView = lazy(() => import("./pages/CheckinView"));
const ThoughtRecordsView = lazy(() => import("./pages/ThoughtRecordsView"));
const ABCView = lazy(() => import("./pages/ABCView"));
const SocraticView = lazy(() => import("./pages/SocraticView"));
const DecisionJournalView = lazy(() => import("./pages/DecisionJournalView"));
const AboutMeView = lazy(() => import("./pages/AboutMeView"));
const HomeView = lazy(() => import("./pages/HomeView"));
const WeeklyReviewView = lazy(() => import("./pages/WeeklyReviewView"));
const NewTaskView = lazy(() => import("./pages/NewTaskView"));
const NewNoteView = lazy(() => import("./pages/NewNoteView"));
const TaskDetailView = lazy(() => import("./pages/TaskDetailView"));
const AdminView = lazy(() => import("./pages/AdminView"));
const SharedWithMeView = lazy(() => import("./pages/SharedWithMeView"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1m: avoid refetch storms
      gcTime: 5 * 60_000,       // 5m cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background" />
);

const App = () => {
  useEffect(() => installUndoShortcuts(), []);
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/app" element={<ProtectedRoute><ErrorBoundary><AppLayout /></ErrorBoundary></ProtectedRoute>}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<HomeView />} />
                <Route path="weekly-review" element={<WeeklyReviewView />} />
                <Route path="inbox" element={<TasksView scope="inbox" />} />
                <Route path="today" element={<TasksView scope="today" />} />
                <Route path="tomorrow" element={<TasksView scope="tomorrow" />} />
                <Route path="next7" element={<TasksView scope="next7" />} />
                <Route path="smart" element={<TasksView scope="smart" />} />
                <Route path="folder/:id" element={<TasksView scope="folder" />} />
                <Route path="tag/:id" element={<TasksView scope="tag" />} />
                <Route path="notes" element={<NotesView />} />
                <Route path="habits" element={<HabitsView />} />
                <Route path="pomodoro" element={<PomodoroView />} />
                <Route path="calendar" element={<CalendarView />} />
                <Route path="kanban" element={<KanbanView />} />
                <Route path="goals" element={<GoalsView />} />
                <Route path="review" element={<ReviewView />} />
                <Route path="insights" element={<InsightsView />} />
                <Route path="self" element={<SelfKnowledgeView />} />
                <Route path="self/test/:type" element={<AssessmentRunner />} />
                <Route path="self/result/:type" element={<AssessmentResult />} />
                <Route path="checkin" element={<CheckinView />} />
                <Route path="thoughts" element={<ThoughtRecordsView />} />
                <Route path="abc" element={<ABCView />} />
                <Route path="socratic" element={<SocraticView />} />
                <Route path="decisions" element={<DecisionJournalView />} />
                <Route path="about-me" element={<AboutMeView />} />
                <Route path="settings" element={<SettingsView />} />
                <Route path="admin" element={<AdminView />} />
                <Route path="new/task" element={<NewTaskView />} />
                <Route path="new/note" element={<NewNoteView />} />
                <Route path="tasks/:id" element={<TaskDetailView />} />
                <Route path="widgets" element={<Navigate to="/app/home" replace />} />
                <Route path="widget/:id" element={<Navigate to="/app/home" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
