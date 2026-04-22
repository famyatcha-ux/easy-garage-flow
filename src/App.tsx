import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import BookingsPage from "./pages/BookingsPage";
import JobsPage from "./pages/JobsPage";
import PaymentsPage from "./pages/PaymentsPage";
import ExpensesPage from "./pages/ExpensesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useRole();
  if (!isAdmin) return <Navigate to="/bookings" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <AppLayout>
    <Routes>
      <Route path="/" element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/bookings" element={<BookingsPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/payments" element={<PaymentsPage />} />
      <Route path="/expenses" element={<AdminRoute><ExpensesPage /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RoleProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </RoleProvider>
  </QueryClientProvider>
);

export default App;
