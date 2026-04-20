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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/app/today" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="today" replace />} />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
