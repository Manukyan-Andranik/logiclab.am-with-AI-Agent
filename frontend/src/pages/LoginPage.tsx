import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login, studentLogin } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

type LoginRole = "student" | "admin";

function roleFromParam(value: string | null): LoginRole {
  return value === "admin" ? "admin" : "student";
}

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole]       = useState<LoginRole>(() => roleFromParam(searchParams.get("role")));
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const next = roleFromParam(searchParams.get("role"));
    setRole((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const setRoleTab = useCallback(
    (next: LoginRole) => {
      setRole(next);
      setSearchParams({ role: next }, { replace: true });
    },
    [setSearchParams]
  );

  const adminMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (data.role !== "admin") {
        toast({
          title: "Մուտքը չհաջողվեց",
          description: "Միայն ադմինը կառող է մուտք գործել:",
          variant: "destructive",
        });
        return;
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      toast({ title: "Բարի վերադարձ", description: "" });
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Մուտքը ձախողվեց",
        description: error.message || "Սխալ էլ. փոստ կամ գաղտնաբառ:",
        variant: "destructive",
      });
    },
  });

  const studentMutation = useMutation({
    mutationFn: studentLogin,
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      toast({ title: "Բarigh Galust", description: "Բարի գալուստ:" });
      navigate("/student/dashboard");
    },
    onError: (error: { message?: string }) => {
      toast({
        title: "Մուտքը ձախողվեց",
        description: error.message || "Սխալ էլ. փոստ կամ գաղտնաբառ:",
        variant: "destructive",
      });
    },
  });

  const isPending = adminMutation.isPending || studentMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "admin") adminMutation.mutate({ email, password });
    else                  studentMutation.mutate({ email, password });
  };

  const inputBase =
    "w-full bg-[#222222] border border-[#3d3d3d] rounded-xl px-5 py-4 text-white " +
    "placeholder:text-white/25 focus:outline-none focus:border-[#FFD700] " +
    "focus:ring-1 focus:ring-[#FFD700]/20 transition-all duration-300 text-sm font-medium";
  const labelBase =
    "block text-[10px] font-black uppercase tracking-widest text-white/45 mb-2 ml-1";

  return (
    <div className="min-h-screen bg-[#222222] text-white overflow-x-hidden">

      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Gold ambient blobs */}
      <div className="pointer-events-none fixed -top-60 -right-60 w-[700px] h-[700px] rounded-full bg-[#FFD700] opacity-[0.04] blur-3xl" />
      <div className="pointer-events-none fixed -bottom-60 -left-60 w-[500px] h-[500px] rounded-full bg-[#FFD700] opacity-[0.03] blur-3xl" />

      {/* Page */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          <FadeIn delay={0.1}>
            <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-[32px] p-8 sm:p-10 shadow-2xl w-full">

              {/* Logo */}
              <div className="mb-8 flex justify-center">
                <Link to="/">
                  <img src="/logo.png" alt="Logic Lab" className="h-12 w-auto" />
                </Link>
              </div>

              {/* ── Role tabs ── */}
              <div className="flex bg-[#222222] rounded-2xl p-1 mb-8 gap-1">
                {(["student", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleTab(r)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                      role === r
                        ? "bg-[#FFD700] text-[#222222] shadow-lg"
                        : "text-white/35 hover:text-white/65"
                    }`}
                  >
                    {r === "student" ? <GraduationCap size={14} /> : <Lock size={14} />}
                    {r === "student" ? "Ուսանող" : "Ադմին"}
                  </button>
                ))}
              </div>

              {/* ── Title block ── */}
              <div className="mb-8 min-h-[64px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.22 }}
                  >
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                      {role === "student" ? "Ուսանողի մուտք" : "Ադմինի մուտք"}
                    </h2>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="group">
                  <label className={labelBase}>Էl. փոստ</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === "admin" ? "admin@logiclab.am" : "your@email.com"}
                    autoComplete="username"
                    className={inputBase}
                  />
                </div>

                {/* Password */}
                <div className="group">
                  <label className={labelBase}>Գաղտնաբառ</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={inputBase + " pr-14"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#FFD700] text-[#222222] py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#FFC000] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isPending ? (
                    "Մուտք..."
                  ) : (
                    <>
                      {role === "student" ? "Մուտք գործել" : "Ադմինի մուտք"}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer note */}
              {role === "student" && (
                <p className="mt-8 text-center text-xs text-white/25 font-medium">
                  Հաշիվ չունե՞ք կամ մոռացել եք գաղտնաբառը։ Խնդրում ենք կապ հաստատել մեր հետ
                </p>
              )}

              {/* Back link */}
              <div className="mt-6 flex justify-center">
                <Link
                  to="/"
                  className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-[#FFD700] transition-colors"
                >
                  ← Գլխավոր էջ
                </Link>
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
