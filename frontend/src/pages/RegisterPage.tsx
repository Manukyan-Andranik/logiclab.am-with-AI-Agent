import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2, MapPin, Monitor, Check } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import Container from "../components/layout/Container";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCourses } from "@/api/courses";
import { registerStudent } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { useT, useLocalized } from "@/i18n";

const FadeIn = ({ children, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedCourseParam = searchParams.get("course") || "";
  const { toast } = useToast();
  const t = useT();
  const tx = useLocalized();

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["courses", true],
    queryFn: () => getCourses(true),
  });

  const preselectedCourseId =
    coursesData?.find((c) => c.slug === preselectedCourseParam)?.id?.toString() || "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    course: preselectedCourseId,
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (preselectedCourseId && !form.course) {
      setForm((prev) => ({ ...prev, course: preselectedCourseId }));
    }
  }, [preselectedCourseId]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => registerStudent(data),
    onSuccess: () => setSubmitted(true),
    onError: (error: any) => {
      toast({
        title: t("common.error_generic"),
        description: error?.message || t("register.error_generic"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course) {
      toast({ title: t("register.attention_title"), description: t("register.pick_course_required") });
      return;
    }
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
      <div className="min-h-screen bg-black-solid text-foreground flex items-center justify-center px-6">
        <FadeIn>
          <div className="glass-card text-center max-w-md mx-auto rounded-3xl p-12">
            <div className="w-20 h-20 rounded-2xl bg-gold flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-gold mb-4">
              {t("register.success_title")}
            </h2>
            <p className="text-muted-foreground mb-10 font-medium text-lg">
              {t("register.success_body")}
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-gold text-primary-foreground px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all w-full"
            >
              {t("register.back_home")}
            </Link>
          </div>
        </FadeIn>
      </div>
    );
  }

  // text-gray-800 on a dark surface was invisible. Use semantic tokens that
  // resolve to high-contrast white-on-dark.
  const inputBase =
    "w-full bg-background border border-border rounded-xl px-5 py-4 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";
  const labelBase =
    "block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1 group-focus-within:text-gold transition-colors";

  return (
    <div className="min-h-screen bg-black-solid text-foreground overflow-x-hidden">
      <section className="relative min-h-screen lg:py-24 flex items-center bg-black overflow-hidden">
        <div className="absolute inset-0 bg-black/80 z-0" />
        <Container>
          <div className="relative z-10 py-20 grid lg:grid-cols-2 gap-20 items-start">

            <div className="space-y-8 lg:pt-10">
              <FadeIn delay={0.1}>
                <h1 className="text-gold text-5xl sm:text-7xl lg:text-[80px] font-black uppercase leading-[0.85] tracking-tighter">
                  {t("register.headline_a")}<br />{t("register.headline_b")}
                </h1>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="text-foreground text-xl sm:text-2xl font-bold leading-tight max-w-md">
                  {t("register.intro")}
                </p>
                <div className="flex gap-6 text-muted-foreground text-xs font-black uppercase tracking-widest mt-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gold" /> {t("register.location_label")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gold" /> {t("register.online_label")}
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.3}>
              <div className="bg-black-solid/95 backdrop-blur-xl border border-border rounded-[32px] p-8 sm:p-10 shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="group">
                      <label className={labelBase}>{t("register.first_name")}</label>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className={inputBase}
                      />
                    </div>
                    <div className="group">
                      <label className={labelBase}>{t("register.last_name")}</label>
                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className={inputBase}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="group">
                      <label className={labelBase}>{t("register.email")}</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={inputBase}
                      />
                    </div>
                    <div className="group">
                      <label className={labelBase}>{t("register.phone")}</label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={inputBase}
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className={labelBase}>{t("register.pick_course_title")}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {isCoursesLoading ? (
                        <div className="col-span-2 py-4 text-center text-muted-foreground font-black text-xs uppercase tracking-widest animate-pulse">
                          {t("register.loading_courses")}
                        </div>
                      ) : (
                        coursesData?.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setForm({ ...form, course: c.id.toString() })}
                            className={`relative text-left px-5 py-4 rounded-xl border transition-all duration-300 ${
                              form.course === c.id.toString()
                                ? "bg-gold border-gold text-primary-foreground shadow-lg shadow-gold/10"
                                : "bg-gray-dark/40 border-border text-muted-foreground hover:border-gold/50"
                            }`}
                          >
                            {tx(c.title)}
                            {form.course === c.id.toString() && (
                              <motion.div layoutId="check" className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Check className="w-4 h-4 stroke-[4px]" />
                              </motion.div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    disabled={mutation.isPending}
                    type="submit"
                    className="w-full bg-gold text-primary-foreground py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    {mutation.isPending ? t("register.submitting") : <>{t("register.submit_application")} <Send className="w-5 h-5" /></>}
                  </button>
                </form>
              </div>
            </FadeIn>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default RegisterPage;