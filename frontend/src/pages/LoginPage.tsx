import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login, studentLogin } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import type { LoginResponse } from "@/api/types";

// Only honor in-app relative paths. Reject anything that could redirect to
// an external host (open-redirect guard).
const sanitizeNext = (raw: string | null): string | null => {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
};

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Route-aware login:
  //   /login?role=admin   → admin login only (no silent fallback)
  //   /login?role=student → student login only
  //   /login              → try admin then fall back to student (legacy)
  const roleParam = searchParams.get("role");
  const explicitRole = roleParam === "admin" || roleParam === "student" ? roleParam : null;
  const nextPath = sanitizeNext(searchParams.get("next"));

  const loginMutation = useMutation({ mutationFn: login });
  const studentMutation = useMutation({ mutationFn: studentLogin });

  const finishLogin = (data: LoginResponse) => {
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);
    toast({ title: "Բարի գալուստ", description: "" });
    const fallback = data.role === "admin" ? "/admin" : "/student/dashboard";
    navigate(nextPath || fallback, { replace: true });
  };

  const showFailure = (err: Error | null) => {
    toast({
      title: "Մուտքը ձախողվեց",
      description: err?.message || "Սխալ էլ. փոստ կամ գաղտնաբառ:",
      variant: "destructive",
    });
  };

  const isPending = loginMutation.isPending || studentMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = { email, password };

    if (explicitRole === "admin") {
      loginMutation.mutate(creds, { onSuccess: finishLogin, onError: showFailure });
      return;
    }
    if (explicitRole === "student") {
      studentMutation.mutate(creds, { onSuccess: finishLogin, onError: showFailure });
      return;
    }
    // Ambiguous: admin first, then student fallback. If both fail, surface
    // the admin error (the user will retry; we don't try to fingerprint
    // which backend "should" have accepted them).
    loginMutation.mutate(creds, {
      onSuccess: finishLogin,
      onError: (adminError: Error) => {
        studentMutation.mutate(creds, {
          onSuccess: finishLogin,
          onError: () => showFailure(adminError),
        });
      },
    });
  };

  // All color values flow from the design tokens in src/index.css so the
  // login page automatically inherits future palette changes.
  const inputBase =
    "w-full bg-background border border-border rounded-xl px-5 py-4 text-foreground " +
    "placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary " +
    "focus:ring-1 focus:ring-primary/20 transition-all duration-300 text-sm font-medium";
  const labelBase =
    "block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--text-primary)) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--text-primary)) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="pointer-events-none fixed -top-60 -right-60 w-[700px] h-[700px] rounded-full bg-primary opacity-[0.04] blur-3xl" />
      <div className="pointer-events-none fixed -bottom-60 -left-60 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-3xl" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          <FadeIn delay={0.1}>
            <div className="bg-card border border-border rounded-[32px] p-8 sm:p-10 shadow-2xl w-full">

              <div className="mb-8 flex justify-center">
                <Link to="/">
                  <img src="/logo.png" alt="Logic Lab" className="h-12 w-auto" />
                </Link>
              </div>

              <div className="mb-8">
                <h2 className="text-h2 font-black uppercase text-foreground">
                  Մուտք
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="group">
                  <label className={labelBase}>Էլ. փոստ</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="username"
                    className={inputBase}
                  />
                </div>

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
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[hsl(var(--accent-strong))] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isPending ? "Մուտք..." : <><span>Մուտք</span><ArrowRight size={16} /></>}
                </button>
              </form>
              <p className="mt-8 text-center text-xs text-muted-foreground font-medium">
                Հաշիվ չունե՞ք կամ մոռացել եք գաղտնաբառը։{" "}
                <a href="/#contact" className="text-foreground underline hover:text-foreground/80">
                  Կապվեք մեզ հետ
                </a>
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
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
