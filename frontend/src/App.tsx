import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteFallback from "@/components/RouteFallback";
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
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentProjects from "./pages/StudentProjects";
import StudentSettingsPage from "./pages/StudentSettingsPage";
import NotFound from "./pages/NotFound";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import "@/styles/variables.css";

// Admin — lazy-loaded (separate chunks per page)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminRegistrations = lazy(() => import("./pages/admin/AdminRegistrations"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminDailyLife = lazy(() => import("./pages/admin/AdminDailyLife"));
const AdminInstructors = lazy(() => import("./pages/admin/AdminInstructors"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminVisits = lazy(() => import("./pages/admin/AdminVisits"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminExams = lazy(() => import("./pages/admin/AdminExams"));

// Student exams — KaTeX loads on demand via LatexContent
const StudentExams = lazy(() => import("./pages/StudentExams"));
const StudentExamPage = lazy(() => import("./pages/StudentExamPage"));

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
        <ErrorBoundary>
          <NavigationProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
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
                  <Route
                    path="/student/exams"
                    element={
                      <Suspense fallback={<RouteFallback fullScreen />}>
                        <StudentExams />
                      </Suspense>
                    }
                  />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                </Route>

                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  path="/student/exam/:examId"
                  element={
                    <Suspense fallback={<RouteFallback fullScreen />}>
                      <StudentExamPage />
                    </Suspense>
                  }
                />
                <Route path="/student/login" element={<Navigate to="/login" replace />} />
                <Route path="/admin/login" element={<Navigate to="/login" replace />} />

                <Route
                  path="/admin"
                  element={
                    <ErrorBoundary>
                      <Suspense fallback={<RouteFallback fullScreen />}>
                        <AdminLayout />
                      </Suspense>
                    </ErrorBoundary>
                  }
                >
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
        </ErrorBoundary>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
