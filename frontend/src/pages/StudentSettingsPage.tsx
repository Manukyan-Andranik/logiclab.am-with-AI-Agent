// StudentsSettings.tsx

import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentMe, updateStudentProfile } from "@/api/students";
import { changePassword } from "@/api/auth";
import { uploadFile, getMediaUrl } from "@/api/client";
import Loader from "@/components/ui/Loader";
import { Input } from "@/components/ui/input";
import Button from "@/components/ui/Button";
import Container from "@/components/layout/Container";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useT, useLocalized } from "@/i18n";
import {
  ArrowLeft,
  Camera,
  Lock,
  User,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

const C = {
  bg: "#222222",
  surface: "#2a2a2a",
  surfaceHover: "#2f2f2f",
  border: "#333333",
  borderSubtle: "#2e2e2e",
  white: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#555555",
  gold: "#FFD700",
  goldBg: "rgba(255,215,0,0.08)",
  goldBorder: "rgba(255,215,0,0.20)",
};

const StudentSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const tx = useLocalized();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Auth gate, but DON'T early-return before the hooks below — that would
  // change the hook call count between renders and crash React with
  // "Rendered fewer hooks than expected" the moment localStorage flips
  // (e.g. on logout while this page is mounted).
  const _token = localStorage.getItem("token");
  const _role = localStorage.getItem("role");
  const isAuthed = !!_token && _role === "student";

  const { data: student, isLoading, error } = useQuery({
    queryKey: ["studentMe"],
    queryFn: getStudentMe,
    retry: 1,
    enabled: isAuthed,
  });

  const profileMutation = useMutation({
    mutationFn: updateStudentProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentMe"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });

      toast({
        title: t("student_settings.saved"),
        description: t("student_settings.saved_image_desc"),
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: t("student_settings.saved"),
        description: t("student_settings.saved_password_desc"),
      });
    },
  });

  if (!isAuthed) {
    return <Navigate to="/login?role=student" replace />;
  }

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: t("common.error_generic"),
        description: t("student_settings.err_pick_image"),
      });
      return;
    }

    try {
      const res = await uploadFile(file);
      profileMutation.mutate({ profile_image: res.url });
    } catch {
      toast({
        variant: "destructive",
        title: t("common.error_generic"),
        description: t("student_settings.err_upload"),
      });
    }
  };

  const handleRemoveImage = () => {
    profileMutation.mutate({ profile_image: null });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: t("common.error_generic"),
        description: t("student_settings.err_password_short"),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t("common.error_generic"),
        description: t("student_settings.err_password_mismatch"),
      });
      return;
    }

    passwordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader size={36} />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: "1.25rem",
            padding: "2rem",
            width: "100%",
            maxWidth: 360,
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: C.textSecondary,
              marginBottom: "1rem",
            }}
          >
            {t("student_settings.load_failed")}
          </p>

          <Button onClick={() => navigate("/student/dashboard")}>
            {t("student_settings.go_back")}
          </Button>
        </div>
      </div>
    );
  }

  const avatarSrc = student.user.profile_image
    ? getMediaUrl(student.user.profile_image)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* HEADER */}
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
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => navigate("/student/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.textSecondary,
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            <ArrowLeft size={14} />
            {t("student_settings.go_back")}
          </button>
        </div>
      </header>

      <Container className="py-8">
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
          }}
        >
          {/* HERO */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "1.5rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `2px solid ${C.gold}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: C.goldBg,
                    border: `2px solid ${C.gold}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={30} color={C.gold} />
                </div>
              )}

              <div>
                <h1
                  style={{
                    margin: 0,
                    color: C.textPrimary,
                    fontSize: "1.8rem",
                    fontWeight: 800,
                  }}
                >
                  {t("student_settings.page_title")}
                </h1>

                <p
                  style={{
                    margin: "0.25rem 0 0",
                    color: C.textSecondary,
                    fontSize: "0.9rem",
                  }}
                >
                  {tx(student.user.first_name)} {tx(student.user.last_name)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1.25rem",
            }}
          >
            {/* PROFILE IMAGE */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: "1.25rem",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Camera size={18} color={C.gold} />
                <h3
                  style={{
                    margin: 0,
                    color: C.textPrimary,
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  {t("student_settings.profile_image")}
                </h3>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: "1rem",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: "1rem",
                      background: C.goldBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={34} color={C.gold} />
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleImageChange}
                  />

                  <button
                    onClick={handlePickImage}
                    style={{
                      width: "100%",
                      height: 44,
                      background: C.gold,
                      color: C.bg,
                      border: "none",
                      borderRadius: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginBottom: 8,
                    }}
                  >
                    {t("student_settings.upload_image")}
                  </button>

                  {avatarSrc && (
                    <button
                      onClick={handleRemoveImage}
                      style={{
                        width: "100%",
                        height: 44,
                        background: "transparent",
                        color: C.textPrimary,
                        border: `1px solid ${C.border}`,
                        borderRadius: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {t("student_settings.remove_image")}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* PASSWORD */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: "1.25rem",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Lock size={18} color={C.gold} />
                <h3
                  style={{
                    margin: 0,
                    color: C.textPrimary,
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  {t("student_settings.password_section")}
                </h3>
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <Input
                  type="password"
                  placeholder={t("student_settings.placeholder_current_password")}
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(e.target.value)
                  }
                />

                <Input
                  type="password"
                  placeholder={t("student_settings.placeholder_new_password")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <Input
                  type="password"
                  placeholder={t("student_settings.placeholder_confirm_password")}
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                />

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    height: 46,
                    background: C.gold,
                    color: C.bg,
                    border: "none",
                    borderRadius: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t("student_settings.save")}
                </button>
              </form>
            </motion.div>


            {/* SECURITY */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: "1.25rem",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <ShieldCheck size={18} color={C.gold} />
                <span
                  style={{
                    color: C.textPrimary,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                  }}
                >
                  {t("student_settings.security_title")}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  color: C.textSecondary,
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                }}
              >
                {t("student_settings.security_body")}
              </p>
            </motion.div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default StudentSettingsPage;