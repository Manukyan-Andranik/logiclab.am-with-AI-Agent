import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import { NavigationProvider } from "./components/layout/NavigationProvider";
import { I18nProvider } from "./i18n";
import Index from "./pages/Index";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import AboutPage from "./pages/AboutPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentProjects from "./pages/StudentProjects";
import StudentSettingsPage from "./pages/StudentSettingsPage";
import NotFound from "./pages/NotFound";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import "@/styles/variables.css";

// Admin imports
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRegistrations from "./pages/admin/AdminRegistrations";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminDailyLife from "./pages/admin/AdminDailyLife";
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminVisits from "./pages/admin/AdminVisits";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminExams from "./pages/admin/AdminExams";
import StudentExams from "./pages/StudentExams";
import StudentExamPage from "./pages/StudentExamPage";

// Conservative defaults: avoid refetch-on-focus storms (which on a tabby user
// can hammer the dashboard endpoint multiple times per minute) and treat data
// as fresh for 60 s by default. Individual queries can still opt into shorter
// staleTime where realtime is required.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
   <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NavigationProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public Routes with AI-driven Navigation Layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:slug" element={<CourseDetailPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/materials" element={<StudentDashboard />} />
              <Route path="/student/projects" element={<StudentProjects />} />
              <Route path="/student/settings" element={<StudentSettingsPage />} />
              <Route path="/student/exams" element={<StudentExams />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />
            <Route path="/student/exam/:examId" element={<StudentExamPage />} />
            <Route path="/student/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="visits" element={<AdminVisits />} />
              <Route path="registrations" element={<AdminRegistrations />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="daily-life" element={<AdminDailyLife />} />
              <Route path="instructors" element={<AdminInstructors />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NavigationProvider>
    </TooltipProvider>
   </I18nProvider>
  </QueryClientProvider>
);

export default App;
