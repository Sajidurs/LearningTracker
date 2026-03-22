import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignupPage from "./pages/auth/SignupPage";
import LoginPage from "./pages/auth/LoginPage";
import AboutPage from "./pages/AboutPage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import PerformancePage from "./pages/dashboard/PerformancePage";
import LearningPage from "./pages/dashboard/LearningPage";
import TopicsPage from "./pages/dashboard/TopicsPage";
import RewardsPage from "./pages/dashboard/RewardsPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import LearningDetailPage from "./pages/dashboard/LearningDetailPage";
import CreateJourneyPage from "./pages/dashboard/CreateJourneyPage";
import CalendarPage from "./pages/dashboard/CalendarPage";
import TopicDetailPage from "./pages/dashboard/TopicDetailPage";
import SupportPage from "./pages/dashboard/SupportPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import PaymentSuccessPage from "./pages/dashboard/PaymentSuccessPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<PerformancePage />} />
              <Route path="learning" element={<LearningPage />} />
              <Route path="learning/create" element={<CreateJourneyPage />} />
              <Route path="learning/:slug" element={<LearningDetailPage />} />
              <Route path="learning/:slug/topic/:topicId" element={<TopicDetailPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="rewards" element={<RewardsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="payment-success" element={<PaymentSuccessPage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>
            <Route path="/super-admin-login" element={<AdminLoginPage />} />
            <Route path="/super-admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="plans" element={<AdminPlansPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="feedback" element={<AdminFeedbackPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
