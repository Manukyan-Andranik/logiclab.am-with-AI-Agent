import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getStudentDashboard } from "@/api/students";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  BookOpen,
  CheckCircle,
  Clock,
  LogOut,
  User,
  FileText,
  ExternalLink,
  ChevronRight,
  Layers,
  PlayCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  const toggleChapter = (id: number) => {
    setOpenChapter(openChapter === id ? null : id);
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ["studentDashboard"],
    queryFn: getStudentDashboard,
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/student/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-bold text-destructive mb-4">
          Error loading dashboard
        </h1>
        <p className="text-muted-foreground mb-6">
          Could not load dashboard data.
        </p>
        <Button onClick={() => navigate("/student/login")}>
          Back to Login
        </Button>
      </div>
    );
  }

  const { student, course, progress, materials } = data;

  const lessonsCount = materials.reduce(
    (sum, chapter) => sum + chapter.lessons.length,
    0
  );

  return (
    <>
      {/* HEADER */}
      <Section className="pt-28 pb-14 via-background to-primary/5">
        <Container>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow">
                <User size={32} />
              </div>

              <div>
                <h1 className="text-3xl font-bold">
                  Welcome, {student.user.first_name}
                </h1>
                <p className="text-muted-foreground">
                  {student.user.email}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </Container>
      </Section>

      <Container className="py-12">

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <Card className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Layers size={22} />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Chapters
              </p>
              <p className="text-2xl font-bold">
                {materials.length}
              </p>
            </div>
          </Card>

          <Card className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <PlayCircle size={22} />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Lessons
              </p>
              <p className="text-2xl font-bold">
                {lessonsCount}
              </p>
            </div>
          </Card>

          <Card className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <CheckCircle size={22} />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Progress
              </p>
              <p className="text-2xl font-bold">
                {progress?.percentage || 0}%
              </p>
            </div>
          </Card>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* MAIN */}
          <div className="lg:col-span-2 space-y-8">

            {/* COURSE CARD */}
            <Card className="p-8 relative overflow-hidden">

              <div className="absolute right-0 top-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

              <div className="relative space-y-4">

                <span className="text-xs uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full">
                  Enrolled Course
                </span>

                <h2 className="text-3xl font-bold">
                  {course?.title?.en || "LogicLab Course"}
                </h2>

                <div className="flex gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    {course?.duration_months || 0} Months
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen size={16} />
                    {materials.length} Chapters
                  </div>
                </div>

                {progress && (
                  <div className="pt-3 space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Course Progress</span>
                      <span>{progress.percentage}%</span>
                    </div>

                    <Progress value={progress.percentage} />

                    <p className="text-xs text-muted-foreground">
                      {progress.accessed_lessons || 0} of {progress.total_lessons || 0} lessons completed
                    </p>
                  </div>
                )}
              </div>

            </Card>

            {/* MATERIALS */}
            <div>

              <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                <FileText size={20} className="text-primary" />
                Նյութեր
              </h3>

              <div className="space-y-5">

                {materials.length > 0 ? (
                  materials.map((chapter) => (
                    <Card
                      key={chapter.chapter_id}
                      className="overflow-hidden hover:shadow-lg transition"
                    >
                      {/* CHAPTER HEADER */}
                      <div
                        onClick={() => toggleChapter(chapter.chapter_id)}
                        className="flex items-center justify-between bg-secondary rounded-[30px] p-6 cursor-pointer hover:bg-secondary/70 transition"
                      >
                        <div className="flex items-center gap-3">

                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${chapter.is_accessed
                              ? "bg-green-500/10 text-green-600"
                              : "bg-primary/10 text-primary"
                              }`}
                          >
                            {chapter.is_accessed ? (
                              <CheckCircle size={16} />
                            ) : (
                              chapter.chapter_order
                            )}
                          </div>

                          <h4 className="font-semibold">
                            {chapter.chapter_title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3">

                          <span
                            className={`text-xs px-3 py-1 rounded-full ${chapter.is_accessed
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                              }`}
                          >
                            {chapter.is_accessed ? "Completed" : "Available"}
                          </span>

                          {/* ARROW */}
                          <ChevronRight
                            size={18}
                            className={`transition-transform ${openChapter === chapter.chapter_id
                              ? "rotate-90"
                              : ""
                              }`}
                          />

                        </div>
                      </div>

                      {/* LESSONS */}
                      {openChapter === chapter.chapter_id && (
                        <div className="p-5 space-y-3 border-t">

                          {chapter.lessons.map((lesson) => (
                            <div
                              key={lesson.lesson_id}
                              className="flex items-center justify-between py-2 border-b last:border-none"
                            >
                              <span className="text-sm">
                                {lesson.lesson_title}
                              </span>

                              <div className="flex gap-2 flex-wrap">

                                {lesson.resource_links.map((link, idx) => {

                                  const getLabel = (url, name) => {
                                    if (name && name !== "link") return name;
                                    if (url.includes("youtube")) return "Video";
                                    if (url.includes("colab")) return "Colab";
                                    if (url.includes("pdf")) return "PDF";
                                    return "Open";
                                  };

                                  return (
                                    <a
                                      key={idx}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition"
                                    >
                                      {getLabel(link.url, link.name)}
                                      <ExternalLink size={12} />
                                    </a>
                                  );
                                })}

                              </div>
                            </div>
                          ))}

                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 border border-dashed rounded-xl">
                    <p className="text-muted-foreground">
                      No materials available yet.
                    </p>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-8">

            <Card className="p-6">
              <h3 className="font-bold mb-4">Student Profile</h3>

              <div className="space-y-4 text-sm">

                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    Full Name
                  </p>
                  <p className="font-medium">
                    {student.user.first_name} {student.user.last_name}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    Member Since
                  </p>
                  <p className="font-medium">
                    {student.created_at
                      ? new Date(student.created_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    Status
                  </p>
                  <p className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Active
                  </p>
                </div>

              </div>
            </Card>

            <Card className="p-6 bg-primary text-primary-foreground">

              <h3 className="font-bold mb-3">
                Need Help?
              </h3>

              <p className="text-sm opacity-80 mb-5">
                If you have questions about your course or materials,
                contact our support team.
              </p>

              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-1"
                onClick={() => navigate("/contact")}
              >
                Contact Support
                <ChevronRight size={16} />
              </Button>

            </Card>

          </div>
        </div>
      </Container>
    </>
  );
};

export default StudentDashboard;