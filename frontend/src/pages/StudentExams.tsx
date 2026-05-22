import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { listStudentExams } from "@/api/exams";
import Loader from "@/components/ui/Loader";
import { Clock, FileText, Play, Lock } from "lucide-react";

const C = {
  bg: "#222222",
  surface: "#333333",
  border: "#444444",
  text: "#ffffff",
  muted: "#888888",
  gold: "#FFD700",
};

const StudentExams = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (!token || role !== "student") {
    return <Navigate to="/login?role=student" replace />;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-exams"],
    queryFn: () => listStudentExams(),
  });

  return (
    <div style={{ minHeight: "70vh", background: C.bg, color: C.text, padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 8 }}>Exams & tests</h1>
        <p style={{ color: C.muted, marginBottom: 24 }}>
          Available assessments for your courses. Exams open when your instructor starts them and stay open for the listed duration.
        </p>

        {isLoading && <Loader />}
        {error && <p style={{ color: "#f87171" }}>{(error as Error).message}</p>}

        {!isLoading && data && data.length === 0 && (
          <div
            style={{
              padding: 32,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.surface,
              textAlign: "center",
              color: C.muted,
            }}
          >
            No exams are available right now.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data?.map((exam) => (
            <div
              key={exam.id}
              style={{
                padding: 20,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: C.surface,
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <FileText size={18} color={C.gold} />
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{exam.title}</h2>
                </div>
                {exam.description && (
                  <p style={{ color: C.muted, fontSize: 14, marginBottom: 8 }}>{exam.description}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: C.muted }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={14} /> {exam.duration_minutes} min
                  </span>
                  <span>{exam.total_points} pts</span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background:
                        exam.availability === "available"
                          ? "rgba(34,197,94,0.15)"
                          : exam.availability === "waiting"
                            ? "rgba(255,215,0,0.12)"
                            : "rgba(148,163,184,0.12)",
                      color:
                        exam.availability === "available"
                          ? "#4ade80"
                          : exam.availability === "waiting"
                            ? C.gold
                            : "#94a3b8",
                    }}
                  >
                    {exam.availability}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{exam.message}</p>
              </div>

              <div>
                {exam.active_attempt_id ? (
                  <Link
                    to={`/student/exam/${exam.id}?attempt=${exam.active_attempt_id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 18px",
                      borderRadius: 8,
                      background: C.gold,
                      color: "#222",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <Play size={16} /> Resume
                  </Link>
                ) : exam.can_attempt && exam.availability === "available" ? (
                  <Link
                    to={`/student/exam/${exam.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 18px",
                      borderRadius: 8,
                      background: C.gold,
                      color: "#222",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <Play size={16} /> Start
                  </Link>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: C.muted,
                      fontSize: 14,
                    }}
                  >
                    <Lock size={14} />{" "}
                    {exam.attempts_remaining === 0 && !exam.active_attempt_id
                      ? "No attempts left"
                      : exam.availability === "waiting"
                        ? "Not started yet"
                        : exam.availability === "unavailable"
                          ? "Window closed"
                          : exam.requires_token
                            ? "Code required"
                            : "Unavailable"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentExams;
