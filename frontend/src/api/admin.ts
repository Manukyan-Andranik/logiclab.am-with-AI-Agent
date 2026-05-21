import { apiClient } from './client';

// Shared admin API types
export type MaterialLink = { name: string; url: string };

export type LessonMaterial = {
  id: number;
  chapter_id: number;
  lesson_id: number;
  links: MaterialLink[];
  created_at: string;
  updated_at: string;
};

export type MaterialAccess = {
  id: number;
  granted_at: string;
  accessed_at: string | null;
  student_id: number;
  chapter_id: number | null;
  lesson_id: number | null;
};

export type MaterialAccessListResponse = {
  data: MaterialAccess[];
  total: number;
};

export const getDashboardStats = async (): Promise<Record<string, any>> => {
  return apiClient('/admin/dashboard');
};

export const getRegistrations = async (params: Record<string, string | number | boolean> = {}): Promise<any> => {
  return apiClient('/admin/registrations', { params });
};

export const updateRegistrationStatus = async (id: number, status: string): Promise<void> => {
  return apiClient(`/admin/registrations/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
};

export const getAdminStudents = async (): Promise<any[]> => {
  return apiClient('/admin/students');
};

export interface AdminEnrollmentSummary {
  enrollment_id: number | null;
  course_id: number;
  course_title: any | null;
  course: {
    id: number;
    title: any;
    slug?: string | null;
    icon_url?: string | null;
    duration_months?: number | null;
  } | null;
  enrollment_status: string | null;
  progress: {
    percentage: number;
    accessed_lessons: number;
    available_lessons: number;
    total_lessons: number;
    accessed_chapters: number;
    total_chapters: number;
  };
}

export interface AdminStudentWithProgress {
  id: number;
  user_id: number;
  course_id: number | null;
  status: string | null;
  created_at: string | null;
  user: any | null;
  course: any | null;
  enrollments_summary: AdminEnrollmentSummary[];
  [key: string]: any;
}

export const getAdminStudentsWithProgress = async (): Promise<AdminStudentWithProgress[]> => {
  return apiClient('/admin/students/with-progress');
};

export const getVisitStatsSummary = async (params: Record<string, string | number | boolean> = {}): Promise<Record<string, any>> => {
  return apiClient('/visits/stats/summary', { params });
};

export type VisitRecord = {
  id: number;
  timestamp: string;
  ip_address: string;
  page_url: string;
  user_agent?: string | null;
  country?: string | null;
  city?: string | null;
  referrer?: string | null;
  is_bot?: boolean | null;
};

export type VisitListResponse = {
  data: VisitRecord[];
  total: number;
};

export const getVisits = async (params: {
  skip?: number;
  limit?: number;
  is_bot?: boolean;
  search?: string;
  start_date?: string;
  end_date?: string;
} = {}): Promise<VisitListResponse> => {
  return apiClient<VisitListResponse>('/visits', { params: params as Record<string, any> });
};

// ---------------------------------------------------------------------------
// New analytics endpoints (POST /api/admin/analytics/*)
// ---------------------------------------------------------------------------
export type AnalyticsLabelCount = { label: string; count: number };
export type AnalyticsTimeseriesPoint = { label: string; count: number };
export type AnalyticsClassBreakdown = {
  human: number;
  verified_bot: number;
  suspicious_bot: number;
};
export type AnalyticsOverview = {
  range_start?: string | null;
  range_end?: string | null;
  today_visits: number;
  week_visits: number;
  month_visits: number;
  total_visits: number;
  unique_visitors: number;
  human_visits: number;
  bot_visits: number;
  human_pct: number;
  bot_pct: number;
  avg_visits_per_unique: number;
  classification: AnalyticsClassBreakdown;
  visits_over_time: AnalyticsTimeseriesPoint[];
  unique_over_time: AnalyticsTimeseriesPoint[];
  top_pages: AnalyticsLabelCount[];
  top_referrers: AnalyticsLabelCount[];
  top_countries: AnalyticsLabelCount[];
  browsers: AnalyticsLabelCount[];
  devices: AnalyticsLabelCount[];
  operating_systems: AnalyticsLabelCount[];
};

export const getAnalyticsOverview = async (
  params: { start_date?: string; end_date?: string } = {}
): Promise<AnalyticsOverview> => {
  return apiClient<AnalyticsOverview>('/admin/analytics/overview', {
    params: params as Record<string, any>,
  });
};

export type AnalyticsBotItem = {
  user_agent: string | null;
  visitor_class: string;
  count: number;
  last_seen: string;
  unique_ips: number;
};
export const getAnalyticsBots = async (
  params: { start_date?: string; end_date?: string; limit?: number } = {}
): Promise<{ data: AnalyticsBotItem[]; total: number }> => {
  return apiClient('/admin/analytics/bots', { params: params as Record<string, any> });
};

export type AnalyticsTopIP = {
  ip_address: string;
  count: number;
  first_seen: string;
  last_seen: string;
  visitor_class?: string | null;
  user_agent?: string | null;
};
export const getAnalyticsTopIPs = async (
  params: { start_date?: string; end_date?: string; limit?: number; visitor_class?: string } = {}
): Promise<{ data: AnalyticsTopIP[]; total: number }> => {
  return apiClient('/admin/analytics/unique', { params: params as Record<string, any> });
};

export const analyticsExportUrl = (
  format: 'csv' | 'json',
  params: { start_date?: string; end_date?: string; visitor_class?: string } = {},
): string => {
  const qs = new URLSearchParams({ format });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) qs.append(k, String(v));
  });
  return `/api/admin/analytics/export?${qs.toString()}`;
};

export const trackPageView = async (pageUrl: string, referrer: string | null): Promise<void> => {
  await apiClient('/visits/track', {
    method: 'POST',
    body: JSON.stringify({ page_url: pageUrl, referrer: referrer || null }),
  });
};

export const getDailyLifeStats = async (): Promise<{ total: number; published: number; draft: number }> => {
  const stories = await apiClient<any[]>('/daily-life/admin/list', { params: { limit: 1000 } });
  const published = (stories as any[]).filter((s: any) => s.is_published).length;
  return {
    total: (stories as any[]).length,
    published,
    draft: (stories as any[]).length - published
  };
};

// Lesson Materials management
export const getLessonMaterials = async (lessonId: number): Promise<LessonMaterial> => {
  return apiClient<LessonMaterial>(`/materials/lesson/${lessonId}`);
};

export const createOrUpdateLessonMaterials = async (
  lessonId: number,
  links: MaterialLink[],
): Promise<LessonMaterial> => {
  // First check if exists
  const existing = await getLessonMaterials(lessonId);
  
  if (existing && existing.id !== 0) {
    return apiClient<LessonMaterial>(`/materials/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify({ links }),
    });
  } else {
    // Create new
    return apiClient<LessonMaterial>('/materials', {
      method: 'POST',
      body: JSON.stringify({ lesson_id: lessonId, links, chapter_id: 0 }), // chapter_id handled by backend
    });
  }
};

export const grantLessonAccess = async (studentId: number, lessonId: number, resourceLinkIndex?: number) => {
  return apiClient('/materials/grant-access', {
    method: 'POST',
    body: JSON.stringify({
      student_id: studentId,
      lesson_id: lessonId,
      resource_link_index: resourceLinkIndex
    })
  });
};

export const revokeLessonAccess = async (accessId: number) => {
  return apiClient(`/admin/students/access/${accessId}`, {
    method: 'DELETE'
  });
};

export const getStudentLessonAccess = async (studentId: number): Promise<MaterialAccessListResponse> => {
  return apiClient<MaterialAccessListResponse>('/materials/access', {
    params: { student_id: studentId }
  });
};

// Student Progress management
export const updateStudentProgress = async (studentId: number, data: { chapter_id?: number, lesson_id?: number }): Promise<void> => {
  const params: Record<string, any> = {};
  if (data.chapter_id) params.chapter_id = data.chapter_id;
  if (data.lesson_id) params.lesson_id = data.lesson_id;
  
  return apiClient(`/admin/students/${studentId}/progress`, {
    method: 'PATCH',
    params
  });
};

export const assignChapterToStudent = async (studentId: number, chapterId: number): Promise<void> => {
  return apiClient(`/admin/students/${studentId}/materials/chapters/${chapterId}/mark-accessed`, {
    method: 'POST'
  });
};

export const updateAdminStudent = async (
  studentId: number,
  data: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    city?: string;
    country?: string;
    profile_image?: string;
    course_id?: number;
    is_active?: boolean;
  }
): Promise<any> => {
  return apiClient(`/admin/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const toggleStudentActive = async (studentId: number): Promise<any> => {
  return apiClient(`/admin/students/${studentId}/toggle-active`, {
    method: 'PATCH',
  });
};

export const adminResetStudentPassword = async (studentId: number, newPassword: string): Promise<{ message: string }> => {
  return apiClient(`/admin/students/${studentId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  });
};

export const getStudentTimeline = async (studentId: number): Promise<any> => {
  return apiClient(`/admin/students/${studentId}/timeline`);
};

// Admin: same payload shape as /student/dashboard, but for any student.
export const getAdminStudentDashboard = async (studentId: number): Promise<import('./students').StudentDashboardData> => {
  return apiClient(`/admin/students/${studentId}/dashboard`);
};

// Student and Registration deletion
export const getStudentEnrollments = async (studentId: number): Promise<any> => {
  return apiClient(`/admin/students/${studentId}/enrollments`);
};

export const addStudentEnrollment = async (studentId: number, courseId: number): Promise<any> => {
  return apiClient(`/admin/students/${studentId}/enrollments`, {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId })
  });
};

export const removeStudentEnrollment = async (studentId: number, enrollmentId: number): Promise<void> => {
  return apiClient(`/admin/students/${studentId}/enrollments/${enrollmentId}`, {
    method: 'DELETE'
  });
};

export const deleteStudent = async (studentId: number): Promise<void> => {
  return apiClient(`/admin/students/${studentId}`, {
    method: 'DELETE'
  });
};

export const deleteRegistration = async (registrationId: number): Promise<void> => {
  return apiClient(`/admin/registrations/${registrationId}`, {
    method: 'DELETE'
  });
};
