import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FolderPlus,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  createMyProject,
  CreateMyProjectInput,
  getMyProjects,
  getStudentDashboard,
  MyProject,
  uploadMyProjectImage,
} from "@/api/students";
import { useT, useLocalized } from "@/i18n";
import { getMediaUrl } from "@/api/client";
import Loader from "@/components/ui/Loader";

const C = {
  bg: "#222222",
  surface: "#2a2a2a",
  surfaceAlt: "#252525",
  border: "#333333",
  borderSubtle: "#2e2e2e",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#555555",
  gold: "#FFD700",
  goldBg: "rgba(255,215,0,0.08)",
  goldBorder: "rgba(255,215,0,0.20)",
  danger: "#ef4444",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: C.surfaceAlt,
  color: C.textPrimary,
  border: `1px solid ${C.border}`,
  borderRadius: "0.625rem",
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  color: C.textSecondary,
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.375rem",
  display: "block",
};

const sectionStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: "1.25rem",
  padding: "1.5rem",
};

const LANG_TABS: Array<{ key: "en" | "hy" | "ru"; label: string }> = [
  { key: "hy", label: "Հայերեն" },
  { key: "en", label: "English" },
  { key: "ru", label: "Русский" },
];

interface FormState {
  course_id: number | "";
  title: { en: string; hy: string; ru: string };
  subtitle: { en: string; hy: string; ru: string };
  description: { en: string; hy: string; ru: string };
  github: string;
  web: string;
  colab: string;
  image_urls: string[];
}

const emptyForm = (): FormState => ({
  course_id: "",
  title: { en: "", hy: "", ru: "" },
  subtitle: { en: "", hy: "", ru: "" },
  description: { en: "", hy: "", ru: "" },
  github: "",
  web: "",
  colab: "",
  image_urls: [],
});

const StudentProjects = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const localized = useLocalized();

  // Sync auth check — must happen before hooks would conditionally fire.
  const isAuthed = useMemo(() => {
    const t = localStorage.getItem("token");
    const r = localStorage.getItem("role");
    return !!t && r === "student";
  }, []);

  const dashQ = useQuery({
    queryKey: ["studentDashboard"],
    queryFn: getStudentDashboard,
    enabled: isAuthed,
    staleTime: 60_000,
  });
  const projectsQ = useQuery({
    queryKey: ["myProjects"],
    queryFn: getMyProjects,
    enabled: isAuthed,
    staleTime: 30_000,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [activeLang, setActiveLang] = useState<"en" | "hy" | "ru">("hy");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadMyProjectImage,
    onMutate: () => setUploadingImage(true),
    onSettled: () => setUploadingImage(false),
    onSuccess: ({ url }) => {
      setForm((f) => ({ ...f, image_urls: [...f.image_urls, url] }));
    },
    onError: (e: any) => setFormError(e?.message || t('student_projects.err_upload')),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateMyProjectInput) => createMyProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      setForm(emptyForm);
      setShowForm(false);
      setFormError(null);
    },
    onError: (e: any) => setFormError(e?.message || t('student_projects.err_create')),
  });

  if (!isAuthed) return <Navigate to="/login?role=student" replace />;

  const enrolledCourses = dashQ.data?.courses || [];
  const projects = projectsQ.data || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (form.image_urls.length >= 6) {
      setFormError(t('student_projects.err_image_limit'));
      return;
    }
    uploadMutation.mutate(file);
  };

  const removeImage = (url: string) =>
    setForm((f) => ({ ...f, image_urls: f.image_urls.filter((u) => u !== url) }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.course_id) return setFormError(t('student_projects.err_pick_course'));
    if (!form.title.hy.trim() && !form.title.en.trim() && !form.title.ru.trim())
      return setFormError(t('student_projects.err_title'));
    if (
      !form.description.hy.trim() &&
      !form.description.en.trim() &&
      !form.description.ru.trim()
    )
      return setFormError(t('student_projects.err_description'));

    const links: Record<string, string> = {};
    if (form.github.trim()) links.github = form.github.trim();
    if (form.web.trim()) links.web = form.web.trim();
    if (form.colab.trim()) links.colab = form.colab.trim();

    const subtitleAny =
      form.subtitle.hy.trim() || form.subtitle.en.trim() || form.subtitle.ru.trim();

    createMutation.mutate({
      course_id: Number(form.course_id),
      title: { en: form.title.en, hy: form.title.hy, ru: form.title.ru },
      description: {
        en: form.description.en,
        hy: form.description.hy,
        ru: form.description.ru,
      },
      ...(subtitleAny
        ? { subtitle: { en: form.subtitle.en, hy: form.subtitle.hy, ru: form.subtitle.ru } }
        : {}),
      image_urls: form.image_urls,
      links,
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(34,34,34,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "0 1.5rem",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <button
            onClick={() => navigate("/student/dashboard")}
            style={{
              background: "transparent",
              border: "none",
              color: C.textSecondary,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> {t('student_projects.back')}
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: showForm ? C.surface : C.gold,
              color: showForm ? C.textPrimary : C.bg,
              border: showForm ? `1px solid ${C.border}` : "none",
              padding: "0.625rem 1rem",
              borderRadius: "0.75rem",
              fontWeight: 700,
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            {showForm ? (
              <>
                <X size={14} /> {t('student_projects.close')}
              </>
            ) : (
              <>
                <Plus size={14} /> {t('student_projects.new_project')}
              </>
            )}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: "2rem" }}
        >
          <h1
            style={{
              color: C.textPrimary,
              fontSize: "1.875rem",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.025em",
            }}
          >
            {t('student_projects.page_title')} <span style={{ color: C.gold }}>{t('student_projects.page_title_accent')}</span>
          </h1>
          <p style={{ color: C.textSecondary, margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
            {t('student_projects.page_subtitle')}
          </p>
        </motion.div>

        {showForm && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ ...sectionStyle, marginBottom: "2rem" }}
          >
            {/* Course picker */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>{t('student_projects.pick_course')}</label>
              <select
                value={form.course_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    course_id: e.target.value ? Number(e.target.value) : "",
                  })
                }
                style={inputStyle}
                required
              >
                <option value="">{t('student_projects.pick_course_placeholder')}</option>
                {enrolledCourses.map((ec) => (
                  <option key={ec.course_id} value={ec.course_id}>
                    {localized(ec.course.title) || `Course #${ec.course_id}`}
                  </option>
                ))}
              </select>
              {enrolledCourses.length === 0 && (
                <p style={{ color: C.textMuted, fontSize: "0.75rem", marginTop: "0.5rem" }}>
                  {t('student_projects.no_courses_hint')}
                </p>
              )}
            </div>

            {/* Language tabs */}
            <div
              style={{
                display: "flex",
                gap: "0.375rem",
                background: C.surfaceAlt,
                padding: "0.25rem",
                borderRadius: "0.625rem",
                marginBottom: "1rem",
                width: "fit-content",
              }}
            >
              {LANG_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveLang(t.key)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: activeLang === t.key ? C.gold : "transparent",
                    color: activeLang === t.key ? C.bg : C.textSecondary,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={labelStyle}>{t('student_projects.title_label')} ({activeLang})</label>
                <input
                  type="text"
                  value={form.title[activeLang]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: { ...form.title, [activeLang]: e.target.value },
                    })
                  }
                  style={inputStyle}
                  placeholder={t('student_projects.title_placeholder')}
                  maxLength={200}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('student_projects.subtitle_label')} ({activeLang})</label>
                <input
                  type="text"
                  value={form.subtitle[activeLang]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      subtitle: { ...form.subtitle, [activeLang]: e.target.value },
                    })
                  }
                  style={inputStyle}
                  placeholder={t('student_projects.subtitle_placeholder')}
                  maxLength={255}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('student_projects.description_label')} ({activeLang})</label>
                <textarea
                  value={form.description[activeLang]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: { ...form.description, [activeLang]: e.target.value },
                    })
                  }
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  placeholder={t('student_projects.description_placeholder')}
                />
              </div>
            </div>

            {/* Links */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              {([
                ["github", t('student_projects.link_github')],
                ["web",    t('student_projects.link_web')],
                ["colab",  t('student_projects.link_colab')],
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <label style={labelStyle}>
                    <LinkIcon size={10} style={{ display: "inline", marginRight: 4 }} />
                    {label}
                  </label>
                  <input
                    type="url"
                    value={(form as any)[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value } as FormState)}
                    style={inputStyle}
                    placeholder="https://…"
                  />
                </div>
              ))}
            </div>

            {/* Images */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>
                <ImageIcon size={10} style={{ display: "inline", marginRight: 4 }} />
                {t('student_projects.images_label')} ({form.image_urls.length}/6)
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "0.5rem",
                }}
              >
                {form.image_urls.map((url) => (
                  <div
                    key={url}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "0.625rem",
                      overflow: "hidden",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <img
                      src={getMediaUrl(url)}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.7)",
                        border: "none",
                        color: "#fff",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
                {form.image_urls.length < 6 && (
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                      aspectRatio: "1",
                      border: `1px dashed ${C.border}`,
                      borderRadius: "0.625rem",
                      color: C.textMuted,
                      cursor: uploadingImage ? "wait" : "pointer",
                      background: C.surfaceAlt,
                    }}
                  >
                    {uploadingImage ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={18} />
                        <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>{t('student_projects.add_image')}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={uploadingImage}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>
            </div>

            {formError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: C.danger,
                  border: "1px solid rgba(239,68,68,0.3)",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.625rem",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm());
                  setFormError(null);
                  setShowForm(false);
                }}
                style={{
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.textSecondary,
                  padding: "0.625rem 1.125rem",
                  borderRadius: "0.625rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                }}
              >
                {t('student_projects.cancel')}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || uploadingImage}
                style={{
                  background: C.gold,
                  color: C.bg,
                  border: "none",
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.625rem",
                  fontWeight: 800,
                  cursor: createMutation.isPending ? "wait" : "pointer",
                  fontSize: "0.8125rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  opacity: createMutation.isPending ? 0.7 : 1,
                }}
              >
                {createMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FolderPlus size={14} />
                )}
                {t('student_projects.submit')}
              </button>
            </div>
          </motion.form>
        )}

        {/* Existing projects */}
        {projectsQ.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <Loader size={32} />
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              ...sectionStyle,
              textAlign: "center",
              color: C.textSecondary,
              padding: "3rem 1.5rem",
            }}
          >
            <FolderPlus size={32} color={C.gold} style={{ marginBottom: "0.75rem" }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{t('student_projects.empty_title')}</p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  marginTop: "1rem",
                  background: C.gold,
                  color: C.bg,
                  border: "none",
                  padding: "0.625rem 1.125rem",
                  borderRadius: "0.625rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                }}
              >
                {t('student_projects.empty_cta')}
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {projects.map((p: MyProject) => {
              const cover = p.image_urls?.[0];
              return (
                <div
                  key={p.id}
                  style={{
                    ...sectionStyle,
                    padding: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {cover ? (
                    <div
                      style={{
                        height: 160,
                        background: `${C.surfaceAlt} center/cover no-repeat`,
                        backgroundImage: `url(${getMediaUrl(cover)})`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 160,
                        background: C.goldBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ImageIcon size={28} color={C.gold} />
                    </div>
                  )}
                  <div style={{ padding: "1.125rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {p.is_published ? (
                        <span
                          style={{
                            fontSize: "0.625rem",
                            fontWeight: 800,
                            color: "#4ade80",
                            background: "rgba(74,222,128,0.1)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.375rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <CheckCircle size={9} /> {t('student_projects.status_published')}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.625rem",
                            fontWeight: 800,
                            color: C.gold,
                            background: C.goldBg,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.375rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Clock size={9} /> {t('student_projects.status_pending')}
                        </span>
                      )}
                    </div>
                    <h3
                      style={{
                        color: C.textPrimary,
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {localized(p.title)}
                    </h3>
                    {p.subtitle && (
                      <p style={{ color: C.textSecondary, margin: 0, fontSize: "0.8rem" }}>
                        {localized(p.subtitle)}
                      </p>
                    )}
                    <p
                      style={{
                        color: C.textMuted,
                        fontSize: "0.75rem",
                        margin: "0.25rem 0 0",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {localized(p.description)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProjects;
