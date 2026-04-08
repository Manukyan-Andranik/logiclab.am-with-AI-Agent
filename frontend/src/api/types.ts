export type LocalizedText = {
  en: string;
  ru?: string;
  hy?: string;
};

export type Lesson = {
  id: number;
  chapter_id: number;
  title: string;
  description?: string;
  order_index: number;
  resource_links: { name: string; url: string }[];
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  order_index: number;
  lessons?: Lesson[];
  created_at: string;
};

export type Course = {
  id: number;
  slug?: string;
  title: LocalizedText;
  description: LocalizedText;
  curriculum_url?: string;
  curriculum?: Record<string, string[]>;
  icon_url?: string;
  hero_video_url?: string;
  order_index: number;
  duration_months: number;
  start_date?: string;
  schedule?: Record<string, string>;
  monthly_payment: number;
  total_payment?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  instructors?: Instructor[];
  chapters?: Chapter[];
  
  // Legacy/UI fields - may need to be handled if still used in UI
  category?: "profession" | "course";
  level?: string;
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string;
};

export type Instructor = {
  id: number;
  user: User;
  bio?: string;
  skills?: string[];
  proficiency?: string[];
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: number;
  title: LocalizedText;
  subtitle?: LocalizedText;
  description: LocalizedText;
  image_urls: string[];
  course_id: number;
  student_id: number;
  is_published: boolean;
  is_featured: boolean;
  student?: Student;
  course?: Course;
  links?: Record<string, string>;
};

export type DailyLife = {
  id: number;
  title: LocalizedText;
  subtitle?: LocalizedText;
  description: LocalizedText;
  image_urls: string[];
  video_url?: string;
  published_date: string;
  is_published: boolean;
  created_at: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  role: string;
};

export type Student = {
  id: number;
  user: User;
  course_id?: number;
  status: string;
  is_active: boolean;
  courses?: Course[];
  created_at: string;
};