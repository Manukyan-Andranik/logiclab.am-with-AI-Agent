import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import VideoHero from "@/components/VideoHero";
import coursesVideo from "@/assets/courses-hero-video.mp4";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCourses } from "@/api/courses";
import { registerStudent } from "@/api/auth";
import { getLocalizedContent } from "@/lib/localization";
import { useToast } from "@/hooks/use-toast";

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedCourse = searchParams.get("course") || "";
  const { toast } = useToast();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    course: preselectedCourse,
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses(),
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => registerStudent(data),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Սխալ",
        description: error.message || "Տեղի է ունեցել սխալ գրանցման ընթացքում։",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      phone: form.phone,
      course_id: parseInt(form.course),
      message: form.message,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--black)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="w-20 h-20 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--success)]" />
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--white)] mb-4">
            Շնորհակալություն!
          </h2>
          <p className="text-[var(--gray-light)] opacity-70 mb-8">
            Ձեր հայտը հաջողությամբ ուղարկվեց։ Մենք կկապվենք ձեզ հետ շուտով։
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[var(--primary)] text-[var(--black)] px-8 py-3 rounded-lg font-semibold hover:brightness-110 transition"
          >
            Գլխավոր
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--black)]">
      <VideoHero
        videoSrc={coursesVideo}
        titleHighlight={"Գրանցվել"}
        title={"դասընթացին"}
        subtitle={"Լրացրեք ձևը և մենք կկապվենք ձեզ հետ"}
      />

      <section className="py-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 sm:p-10 space-y-6 bg-[var(--black)] border border-[var(--gray-dark)]"
          >
            <h2 className="font-display text-2xl font-bold text-[var(--white)] mb-2">
              Գրանցման ձև
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-light)] opacity-80 mb-1.5">Անուն</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full bg-[var(--gray-dark)] border border-[var(--gray-dark)] rounded-lg px-4 py-3 text-[var(--white)] placeholder:text-[var(--gray-light)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-light)] opacity-80 mb-1.5">Ազգանուն</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full bg-[var(--gray-dark)] border border-[var(--gray-dark)] rounded-lg px-4 py-3 text-[var(--white)] placeholder:text-[var(--gray-light)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-light)] opacity-80 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[var(--gray-dark)] border border-[var(--gray-dark)] rounded-lg px-4 py-3 text-[var(--white)] placeholder:text-[var(--gray-light)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-light)] opacity-80 mb-1.5">Հեռախոսահամար</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[var(--gray-dark)] border border-[var(--gray-dark)] rounded-lg px-4 py-3 text-[var(--white)] placeholder:text-[var(--gray-light)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-light)] opacity-80 mb-1.5">Դասընթաց</label>
              <select
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                className="w-full bg-[var(--gray-dark)] border border-[var(--gray-dark)] rounded-lg px-4 py-3 text-[var(--white)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                required
                disabled={isCoursesLoading}
              >
                <option value="">{isCoursesLoading ? "Բեռնվում է..." : "Ընտրեք դասընթացը"}</option>
                {coursesData?.map((c) => (
                  <option key={c.id} value={c.id}>{getLocalizedContent(c.title)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-light)] opacity-80 mb-1.5">Հաղորդագրություն (կամավոր)</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                className="w-full bg-[var(--gray-dark)] border border-[var(--gray-dark)] rounded-lg px-4 py-3 text-[var(--white)] placeholder:text-[var(--gray-light)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:brightness-110 transition flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--black)]"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              {mutation.isPending ? "Ուղարկվում է..." : "Ուղարկել"}
            </button>
          </motion.form>
        </div>
      </section>
    </div>
  );
};

export default RegisterPage;
