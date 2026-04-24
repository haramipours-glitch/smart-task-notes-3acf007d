import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound.tsx";
import TasksView from "./pages/TasksView";
import NotesView from "./pages/NotesView";
import HabitsView from "./pages/HabitsView";
import PomodoroView from "./pages/PomodoroView";
import CalendarView from "./pages/CalendarView";
import SettingsView from "./pages/SettingsView";
import KanbanView from "./pages/KanbanView";
import GoalsView from "./pages/GoalsView";
import ReviewView from "./pages/ReviewView";
import InsightsView from "./pages/InsightsView";
import SelfKnowledgeView from "./pages/SelfKnowledgeView";
import AssessmentRunner from "./pages/AssessmentRunner";
import AssessmentResult from "./pages/AssessmentResult";
import CheckinView from "./pages/CheckinView";
import ThoughtRecordsView from "./pages/ThoughtRecordsView";
import ABCView from "./pages/ABCView";
import SocraticView from "./pages/SocraticView";
import DecisionJournalView from "./pages/DecisionJournalView";
import AboutMeView from "./pages/AboutMeView";
import WidgetView from "./pages/WidgetView";
import Index from "./pages/Index";
import HomeView from "./pages/HomeView";
import WeeklyReviewView from "./pages/WeeklyReviewView";
import NewTaskView from "./pages/NewTaskView";
import NewNoteView from "./pages/NewNoteView";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<ProtectedRoute><ErrorBoundary><AppLayout /></ErrorBoundary></ProtectedRoute>}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<HomeView />} />
              <Route path="weekly-review" element={<WeeklyReviewView />} />
              <Route path="inbox" element={<TasksView scope="inbox" />} />
              <Route path="today" element={<TasksView scope="today" />} />
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
              <Route path="widgets" element={<WidgetView />} />
              <Route path="widget/:id" element={<WidgetView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="new/task" element={<NewTaskView />} />
              <Route path="new/note" element={<NewNoteView />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
