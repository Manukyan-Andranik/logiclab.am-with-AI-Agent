import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getStudentDashboard, markChapterAccessed } from "@/api/students";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
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
  PlayCircle,
  Sparkles,
  Award,
  BookMarked
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import { getLocalizedContent } from "@/lib/localization";
import { motion, AnimatePresence } from "framer-motion";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openChapter, setOpenChapter] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["studentDashboard"],
    queryFn: getStudentDashboard,
    retry: 1,
  });

  const markAccessedMutation = useMutation({
    mutationFn: markChapterAccessed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
    },
  });

  const handleToggleChapter = (chapterId: number, isAccessed: boolean) => {
    if (openChapter === chapterId) {
      setOpenChapter(null);
    } else {
      setOpenChapter(chapterId);
      if (!isAccessed) {
        markAccessedMutation.mutate(chapterId);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login?role=student");
  };

  const lessonsCount = useMemo(() => {
    if (!data?.materials) return 0;
    return data.materials.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  }, [data?.materials]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader size={48} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 rounded-[2rem] max-w-md border-danger/20"
        >
          <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-6 text-danger">
            <User size={40} />
          </div>
          <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter italic">
            Մուտքի սխալ
          </h1>
          <p className="text-gray-light opacity-70 mb-8 font-medium italic">
            Չհաջողվեց բեռնել ձեր տվյալները: Խնդրում ենք նորից մուտք գործել:
          </p>
          <Button 
            className="w-full h-14 rounded-xl font-black uppercase tracking-widest bg-primary text-black hover:bg-primary-alt"
            onClick={() => navigate("/login?role=student")}
          >
            Վերադառնալ
          </Button>
        </motion.div>
      </div>
    );
  }

  const { student, course, progress, materials } = data;

  return (
    <div className="min-h-screen bg-black selection:bg-primary selection:text-black">
      {/* HEADER */}
      <Section className="pt-32 pb-16 bg-gradient-to-b from-gray-dark/50 to-transparent">
        <Container>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-black shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                  <User size={40} strokeWidth={2.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary-alt flex items-center justify-center text-black border-4 border-black">
                  <Sparkles size={14} />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">
                  Ուսանողի անձնական էջ
                </p>
                <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">
                  Բարի գալուստ, <br />
                  <span className="text-white/80">{student.user.first_name}</span>
                </h1>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="h-12 px-6 rounded-xl border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 gap-2 font-black uppercase tracking-widest text-xs italic"
            >
              <LogOut size={14} />
              Դուրս գալ
            </Button>
          </div>
        </Container>
      </Section>

      <Container className="pb-24">
        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 rounded-[2rem] border-white/5 flex items-center gap-6 group hover:border-primary/20 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-light opacity-50 font-black uppercase tracking-[0.2em]">
                Բաժիններ
              </p>
              <p className="text-3xl font-black text-white tracking-tighter italic">
                {materials.length}
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 rounded-[2rem] border-white/5 flex items-center gap-6 group hover:border-primary/20 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500">
              <PlayCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-light opacity-50 font-black uppercase tracking-[0.2em]">
                Դասեր
              </p>
              <p className="text-3xl font-black text-white tracking-tighter italic">
                {lessonsCount}
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8 rounded-[2rem] border-white/5 flex items-center gap-6 group hover:border-primary/20 transition-all sm:col-span-2 lg:col-span-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500">
              <CheckCircle size={24} />
            </div>
            <div className="flex-grow">
              <p className="text-[10px] text-gray-light opacity-50 font-black uppercase tracking-[0.2em]">
                Առաջընթաց
              </p>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-black text-white tracking-tighter italic">
                  {progress?.percentage || 0}%
                </p>
                <p className="text-[10px] font-bold text-primary italic">
                  {progress?.accessed_lessons || 0} / {progress?.total_lessons || 0}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-12">
            {/* COURSE INFO CARD */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative overflow-hidden rounded-[2.5rem] bg-gray-dark border border-white/5 p-10 shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
              
              <div className="relative space-y-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest px-3 py-1">
                    Ընթացիկ դասընթաց
                  </Badge>
                  <div className="h-1 w-12 bg-white/10 rounded-full" />
                </div>

                <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">
                  {course ? getLocalizedContent(course.title) : "Logic Lab Դասընթաց"}
                </h2>

                <div className="flex flex-wrap gap-6 text-sm font-bold italic text-gray-light opacity-60 uppercase tracking-tight">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    {course?.duration_months || 0} Ամիս
                  </div>
                  <div className="flex items-center gap-2">
                    <BookMarked size={16} className="text-primary" />
                    {materials.length} Բաժին
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-primary" />
                    Սերտիֆիկացում
                  </div>
                </div>

                {progress && (
                  <div className="pt-6 space-y-4 max-w-md">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-white/40">Ընդհանուր առաջընթացը</span>
                      <span className="text-xl font-black text-primary italic">{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-2 bg-white/5" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* MATERIALS SECTION */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-1 bg-primary rounded-full" />
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                  Ուսումնական <span className="text-primary">նյութեր</span>
                </h3>
              </div>

              <div className="space-y-6">
                {materials.length > 0 ? (
                  materials.map((chapter, idx) => (
                    <div
                      key={chapter.chapter_id}
                      className="group"
                    >
                      {/* CHAPTER HEADER */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleToggleChapter(chapter.chapter_id, chapter.is_accessed)}
                        className={`flex items-center justify-between p-6 rounded-3xl border-2 cursor-pointer transition-all duration-500 ${
                          openChapter === chapter.chapter_id
                            ? "bg-primary border-primary text-black"
                            : "bg-gray-dark border-white/5 text-white hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black italic shadow-lg transition-colors ${
                              openChapter === chapter.chapter_id
                                ? "bg-black text-primary"
                                : "bg-white/5 text-primary"
                            }`}
                          >
                            {chapter.is_accessed ? (
                              <CheckCircle size={18} strokeWidth={3} />
                            ) : (
                              (idx + 1).toString().padStart(2, '0')
                            )}
                          </div>

                          <h4 className="font-black text-xl uppercase tracking-tight italic">
                            {chapter.chapter_title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 ${
                              openChapter === chapter.chapter_id
                                ? "bg-black/20 text-black"
                                : "bg-black text-primary"
                            }`}
                          >
                            {chapter.lessons.length} Դաս
                          </Badge>
                          <ChevronRight
                            size={20}
                            className={`transition-transform duration-500 ${
                              openChapter === chapter.chapter_id ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </motion.div>

                      {/* LESSONS LIST */}
                      <AnimatePresence>
                        {openChapter === chapter.chapter_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 pb-2 px-4 space-y-3">
                              {chapter.lessons.map((lesson, lIdx) => (
                                <motion.div
                                  key={lesson.lesson_id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: lIdx * 0.05 }}
                                  className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 group/item hover:bg-white/10 hover:border-primary/20 transition-all italic"
                                >
                                  <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-white/20 group-hover/item:text-primary/40 transition-colors">
                                      {(lIdx + 1).toString().padStart(2, '0')}
                                    </span>
                                    <span className="text-sm font-bold text-white/80 group-hover/item:text-white transition-colors">
                                      {lesson.lesson_title}
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    {lesson.resource_links.map((link, linkIdx) => {
                                      const getLabel = (url: string, name: string) => {
                                        if (name && name !== "link" && name !== "") return name;
                                        const lowerUrl = url.toLowerCase();
                                        if (lowerUrl.includes("youtube") || lowerUrl.includes("vimeo") || lowerUrl.includes(".mp4")) return "Video";
                                        if (lowerUrl.includes("colab")) return "Colab";
                                        if (lowerUrl.includes("github")) return "GitHub";
                                        if (lowerUrl.includes("pdf")) return "PDF";
                                        return "Resource";
                                      };

                                      return (
                                        <a
                                          key={linkIdx}
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 h-8 px-4 rounded-lg bg-black text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all border border-primary/20"
                                        >
                                          {getLabel(link.url, link.name)}
                                          <ExternalLink size={10} />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                ) : (
                  <div className="p-20 rounded-[3rem] border-2 border-dashed border-white/5 text-center bg-gray-dark/30">
                    <FileText size={48} className="mx-auto mb-6 text-white/10" />
                    <p className="text-gray-light opacity-40 font-black uppercase tracking-widest text-sm italic">
                      Ուսումնական նյութեր դեռևս չկան
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-8 rounded-[2.5rem] border-white/5 space-y-8 bg-gray-dark shadow-2xl"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">
                  Ուսանողի <span className="text-primary">տվյալներ</span>
                </h3>
                <div className="h-1 w-12 bg-primary rounded-full" />
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-light opacity-40 font-black uppercase tracking-widest">Անուն Ազգանուն</p>
                  <p className="text-lg font-black text-white italic">{student.user.first_name} {student.user.last_name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-light opacity-40 font-black uppercase tracking-widest">Էլ. փոստ</p>
                  <p className="text-sm font-bold text-white/80">{student.user.email}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-light opacity-40 font-black uppercase tracking-widest">Գրանցման ամսաթիվ</p>
                  <p className="text-sm font-bold text-white/80">
                    {student.created_at ? new Date(student.created_at).toLocaleDateString('hy-AM', { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-gray-light opacity-40 font-black uppercase tracking-widest">Կարգավիճակ</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-black text-green-500 uppercase tracking-widest italic">Ակտիվ</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-hidden rounded-[2.5rem] bg-primary p-8 text-black group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none italic">
                  Օգնության <br /> կարիք ունե՞ք
                </h3>
                <p className="text-sm font-bold italic opacity-80 leading-relaxed">
                  Եթե ունեք հարցեր դասընթացի կամ նյութերի վերաբերյալ, դիմեք մեր աջակցման թիմին:
                </p>
                <Button
                  onClick={() => navigate("/#contact")}
                  className="w-full h-12 bg-black text-white hover:bg-white hover:text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Կապ մեզ հետ
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default StudentDashboard;
