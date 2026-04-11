import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login, studentLogin } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Card from "@/components/ui/Card";
import { GraduationCap, Lock } from "lucide-react";

type LoginRole = "student" | "admin";

function roleFromParam(value: string | null): LoginRole {
  return value === "admin" ? "admin" : "student";
}

const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole] = useState<LoginRole>(() => roleFromParam(searchParams.get("role")));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const next = roleFromParam(searchParams.get("role"));
    setRole((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const setRoleTab = useCallback(
    (next: LoginRole) => {
      setRole(next);
      setSearchParams(next === "student" ? { role: "student" } : { role: "admin" }, { replace: true });
    },
    [setSearchParams]
  );

  const adminMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (data.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "Only administrators can sign in here.",
          variant: "destructive",
        });
        return;
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      toast({ title: "Welcome", description: "Successfully logged in to admin panel." });
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
        variant: "destructive",
      });
    },
  });

  const studentMutation = useMutation({
    mutationFn: studentLogin,
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      toast({ title: "Welcome back!", description: "Successfully logged in to your dashboard." });
      navigate("/student/dashboard");
    },
    onError: (error: { message?: string }) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    },
  });

  const isPending = adminMutation.isPending || studentMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "admin") {
      adminMutation.mutate({ email, password });
    } else {
      studentMutation.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-6 py-12">
      <Card className="w-full max-w-md shadow-xl border-none p-8">
        <div className="flex rounded-xl border border-border/60 bg-muted/30 p-1 mb-8">
          <button
            type="button"
            onClick={() => setRoleTab("student")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
              role === "student"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-4 w-4" aria-hidden />
            Student
          </button>
          <button
            type="button"
            onClick={() => setRoleTab("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
              role === "admin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="h-4 w-4" aria-hidden />
            Admin
          </button>
        </div>

        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          {role === "admin" ? <Lock size={28} /> : <GraduationCap size={28} />}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{role === "admin" ? "Admin sign in" : "Student sign in"}</h1>
          <p className="text-muted-foreground mt-2">
            {role === "admin"
              ? "Administrator access to the Logic Lab panel."
              : "Access your course materials and progress."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder={role === "admin" ? "admin@logiclab.am" : "your.email@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full h-11 text-base font-medium mt-2" disabled={isPending}>
            {isPending ? "Signing in…" : role === "admin" ? "Sign in to admin" : "Sign in to dashboard"}
          </Button>
        </form>

        {role === "student" && (
          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>Don&apos;t have an account? Contact your administrator.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
