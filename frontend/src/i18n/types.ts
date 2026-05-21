/**
 * Translation key surface for the entire site.
 *
 * Schema:
 *   - Top-level keys group related strings ("nav", "hero", "courses", …).
 *   - Each leaf is a string. Use {var} placeholders for interpolation:
 *       t("courses.duration", { months: 6 })
 *   - Never inline raw Armenian into a component again. Add a key here.
 *
 * Adding a language: add an entry under `i18n/locales/<lang>.ts` with the
 * same shape; TypeScript will surface every missing key.
 */
export type Lang = "hy" | "en" | "ru";

export interface Dict {
  common: {
    loading: string;
    save: string;
    cancel: string;
    submit: string;
    back: string;
    delete: string;
    edit: string;
    close: string;
    open: string;
    search: string;
    yes: string;
    no: string;
    ok: string;
    learn_more: string;
    view_all: string;
    error_generic: string;
    page_not_found: string;
    not_authorized: string;
  };

  nav: {
    home: string;
    courses: string;
    about: string;
    projects: string;
    instructors: string;
    contact: string;
    login: string;
    register: string;
    open_menu: string;
    close_menu: string;
    language: string;
  };

  account: {
    title: string;
    dashboard: string;
    materials: string;
    settings: string;
    logout: string;
  };

  hero: {
    eyebrow: string;
    tagline: string;
    cta_primary: string;
    cta_secondary: string;
    cta_register_now: string;
    scroll_hint: string;
    role_photographer_1: string;
    role_photographer_2: string;
    role_3d_1: string;
    role_3d_2: string;
  };

  home: {
    courses_heading_a: string;
    courses_heading_b: string;
    courses_see_card: string;
    courses_duration_months: string;
    projects_heading_a: string;
    projects_heading_b: string;
    projects_see_more: string;
    projects_read_more: string;
    about_eyebrow: string;
    about_heading_a: string;
    about_heading_b: string;
    about_location: string;
    about_body: string;
    feature_ai_title: string;
    feature_ai_desc: string;
    feature_3d_title: string;
    feature_3d_desc: string;
    feature_photo_title: string;
    feature_photo_desc: string;
    feature_future_title: string;
    feature_future_desc: string;
    instructors_eyebrow: string;
    instructors_heading_a: string;
    instructors_heading_b: string;
    instructor_default_role: string;
    instructor_default_bio: string;
    daily_life_heading: string;
    daily_life_empty: string;
    daily_life_read_more: string;
    daily_life_close: string;
    daily_life_section_label: string;
    daily_life_all_stories: string;
    daily_life_prev: string;
    daily_life_next: string;
    contact_heading: string;
    contact_subtitle: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    contact_message: string;
    contact_submit: string;
    contact_sending: string;
    contact_success: string;
    contact_error: string;
    contact_location: string;
    contact_phone_optional: string;
    contact_form_title: string;
  };

  footer_extra: {
    brand: string;
    tagline: string;
    useful_links_heading: string;
    nav_mode_heading: string;
    mode_agent: string;
    mode_traditional: string;
    coming_soon_title: string;
    coming_soon_body: string;
    coming_soon_ack: string;
    copyright: string;
  };

  courses: {
    page_title: string;
    page_subtitle: string;
    duration_months: string;
    enroll: string;
    no_courses: string;
    chapters_count: string;
    students_count: string;
    level_label: string;
    hero_title_highlight: string;
    hero_title_main: string;
    hero_subtitle: string;
    all_heading_a: string;
    all_heading_b: string;
    all_subtitle: string;
    duration_short: string;
    explore: string;
  };

  register: {
    title: string;
    subtitle: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    course: string;
    message: string;
    submit: string;
    success_title: string;
    success_body: string;
    error_generic: string;
    required: string;
    headline_a: string;
    headline_b: string;
    intro: string;
    location_label: string;
    online_label: string;
    pick_course_title: string;
    pick_course_required: string;
    loading_courses: string;
    submitting: string;
    submit_application: string;
    back_home: string;
    attention_title: string;
  };

  login: {
    title: string;
    subtitle_student: string;
    subtitle_admin: string;
    email: string;
    password: string;
    email_placeholder: string;
    password_placeholder: string;
    show_password: string;
    hide_password: string;
    submit: string;
    submitting: string;
    welcome_toast: string;
    failed_title: string;
    forgot_password: string;
    invalid_credentials: string;
    no_account: string;
    register_link: string;
    as_student: string;
    as_admin: string;
    contact_us: string;
    back_home: string;
  };

  student_dashboard: {
    welcome: string;
    role_student: string;
    stat_lessons: string;
    stat_chapters: string;
    stat_completed: string;
    stat_courses: string;
    current_course_tag: string;
    duration: string;
    chapter_count: string;
    certificate: string;
    progress: string;
    no_course: string;
    materials_empty: string;
    materials_section: string;
    materials_section_for_course: string;
    chapter_lessons_count: string;
    help_title: string;
    help_body: string;
    help_cta: string;
    projects_card_title: string;
    projects_card_body: string;
    projects_card_cta: string;
    error_title: string;
    error_body: string;
    error_cta: string;
  };

  student_projects: {
    page_title: string;
    page_title_accent: string;
    page_subtitle: string;
    new_project: string;
    close: string;
    back: string;
    pick_course: string;
    pick_course_placeholder: string;
    no_courses_hint: string;
    title_label: string;
    subtitle_label: string;
    description_label: string;
    title_placeholder: string;
    subtitle_placeholder: string;
    description_placeholder: string;
    link_github: string;
    link_web: string;
    link_colab: string;
    images_label: string;
    add_image: string;
    submit: string;
    cancel: string;
    err_pick_course: string;
    err_title: string;
    err_description: string;
    err_image_limit: string;
    err_upload: string;
    err_create: string;
    empty_title: string;
    empty_cta: string;
    status_published: string;
    status_pending: string;
  };

  student_settings: {
    page_title: string;
    profile_section: string;
    profile_image: string;
    upload_image: string;
    remove_image: string;
    saved: string;
    save_failed: string;
    saved_image_desc: string;
    saved_password_desc: string;
    err_pick_image: string;
    err_upload: string;
    err_password_short: string;
    err_password_mismatch: string;
    load_failed: string;
    go_back: string;
    password_section: string;
    placeholder_current_password: string;
    placeholder_new_password: string;
    placeholder_confirm_password: string;
    save: string;
    security_title: string;
    security_body: string;
  };

  footer: {
    tagline: string;
    nav_heading: string;
    contact_heading: string;
    follow_heading: string;
    privacy: string;
    terms: string;
    rights: string;
  };

  about: {
    page_title: string;
    intro: string;
    mission_title: string;
    mission_body: string;
    instructors_title: string;
    instructors_subtitle: string;
  };

  about_page: {
    hero_eyebrow: string;
    hero_title_a: string;
    hero_title_b: string;
    hero_intro: string;
    stat_practice_label: string;
    stat_industries_label: string;
    stat_school_value: string;
    stat_school_label: string;
    stat_top_label: string;
    course_ai_title: string;
    course_ai_desc: string;
    course_ai_tag: string;
    course_3d_title: string;
    course_3d_desc: string;
    course_3d_tag: string;
    course_photo_title: string;
    course_photo_desc: string;
    course_photo_tag: string;
    course_practice_title: string;
    course_practice_desc: string;
    course_practice_tag: string;
    audience_school_title: string;
    audience_school_desc: string;
    audience_beginner_title: string;
    audience_beginner_desc: string;
    audience_all_title: string;
    audience_all_desc: string;
    format_in_person: string;
    format_in_person_sub: string;
    format_online: string;
    format_online_sub: string;
    format_hybrid: string;
    format_hybrid_sub: string;
    mission_eyebrow: string;
    mission_title_a: string;
    mission_title_b: string;
    mission_body: string;
    mission_locations: string;
    audiences_eyebrow: string;
    audiences_title_a: string;
    audiences_title_b: string;
    cta_eyebrow: string;
    cta_title_a: string;
    cta_title_b: string;
    cta_body: string;
    cta_register: string;
    cta_courses: string;
  };

  course_detail: {
    duration: string;
    instructor: string;
    chapters: string;
    enroll_cta: string;
    description: string;
    syllabus: string;
    not_found: string;
    back_to_courses: string;
    about_a: string;
    about_b: string;
    syllabus_title: string;
    instructors_title: string;
    default_proficiency: string;
    details_title: string;
    duration_label: string;
    duration_value: string;
    level_label: string;
    level_default: string;
    format_label: string;
    format_value: string;
    monthly_label: string;
    currency: string;
    enroll: string;
    other_courses_a: string;
    other_courses_b: string;
  };

  project_detail: {
    by_student: string;
    in_course: string;
    not_found: string;
    open_github: string;
    open_web: string;
    open_colab: string;
    gallery_open: string;
    gallery_close: string;
    back_home: string;
  };

  not_found: {
    heading: string;
    body: string;
    cta_home: string;
  };

  guide: {
    step1_title: string;
    step1_desc: string;
    step2_title: string;
    step2_desc: string;
    step3_title: string;
    step3_desc: string;
    back: string;
    next: string;
    finish: string;
  };

  welcome: {
    pick_a: string;
    pick_b: string;
    intro: string;
    ai_title: string;
    ai_desc: string;
    ai_cta: string;
    classic_title: string;
    classic_desc: string;
    classic_cta: string;
    help_label: string;
  };

  logic_agent: {
    chip_courses: string;
    chip_instructors: string;
    chip_projects: string;
    chip_contact: string;
    q_courses: string;
    q_instructors: string;
    q_projects: string;
    q_contact: string;
    quick_price: string;
    quick_schedule: string;
    quick_certificate: string;
    quick_free: string;
    help_title: string;
    help_body: string;
    faq_heading: string;
    input_placeholder: string;
    connection_error: string;
  };

  privacy: {
    title: string;
    title_a: string;
    title_b: string;
    updated: string;
    s1_title: string;
    s1_body: string;
    s2_title: string;
    s2_intro: string;
    s2_item1: string;
    s2_item2: string;
    s2_item3: string;
    s2_item4: string;
    s3_title: string;
    s3_intro: string;
    s3_item1: string;
    s3_item2: string;
    s3_item3: string;
    s3_item4: string;
    s4_title: string;
    s4_body: string;
    s5_title: string;
    s5_body: string;
    s6_title: string;
    s6_intro: string;
    s6_item1: string;
    s6_item2: string;
    s6_item3: string;
    s6_item4: string;
    s7_title: string;
    s7_body_prefix: string;
    s7_body_suffix: string;
  };

  terms: {
    title: string;
    title_a: string;
    title_b: string;
    updated: string;
    s1_title: string;
    s1_body: string;
    s2_title: string;
    s2_body: string;
    s3_title: string;
    s3_intro: string;
    s3_item1: string;
    s3_item2: string;
    s3_item3: string;
    s3_item4: string;
    s4_title: string;
    s4_intro: string;
    s4_item1: string;
    s4_item2: string;
    s4_item3: string;
    s5_title: string;
    s5_body: string;
    s6_title: string;
    s6_body: string;
    s7_title: string;
    s7_body: string;
    s8_title: string;
    s8_body_prefix: string;
    s8_body_suffix: string;
  };
}
