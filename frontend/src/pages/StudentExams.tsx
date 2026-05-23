import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { listStudentExams } from "@/api/exams";
import Loader from "@/components/ui/Loader";
import StudentExamsList from "@/components/exam/StudentExamsList";
import { useT } from "@/i18n";

const StudentExams = () => {
  const t = useT();
  const isAuthed =
    Boolean(localStorage.getItem("token")) && localStorage.getItem("role") === "student";

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-exams"],
    queryFn: () => listStudentExams(),
    enabled: isAuthed,
  });

  if (!isAuthed) {
    return <Navigate to="/login?role=student" replace />;
  }

  return (
    <div className="min-h-[70vh] bg-[hsl(var(--surface-1))] text-[hsl(var(--text-primary))] px-4 py-8">
      <div className="max-w-[900px] mx-auto">
        <h1 className="text-[1.75rem] font-bold mb-2">{t("student_exams.page_title")}</h1>
        <p className="text-[hsl(var(--text-secondary))] mb-6">
          {t("student_exams.page_intro")}{" "}
          <strong className="text-[hsl(var(--text-primary))]">{t("student_exams.page_intro_open")}</strong>
        </p>

        {isLoading && <Loader />}
        {error && (
          <p className="text-[hsl(var(--destructive))]">{(error as Error).message}</p>
        )}

        {!isLoading && data && data.length === 0 && (
          <div className="py-8 px-8 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-center text-[hsl(var(--text-secondary))]">
            {t("student_exams.empty")}
          </div>
        )}

        {!isLoading && data && data.length > 0 && <StudentExamsList exams={data} showSections />}
      </div>
    </div>
  );
};

export default StudentExams;
