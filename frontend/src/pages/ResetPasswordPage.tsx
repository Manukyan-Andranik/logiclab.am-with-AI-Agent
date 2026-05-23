import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { confirmPasswordReset } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n";
import Button from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useT();

  const mutation = useMutation({
    mutationFn: () => confirmPasswordReset(token, password),
    onSuccess: () => {
      toast({ title: "Password updated", description: "You can sign in with your new password." });
      navigate("/login", { replace: true });
    },
    onError: (e: Error) =>
      toast({ title: t("login.failed_title"), description: e.message, variant: "destructive" }),
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-destructive">Invalid reset link.</p>
        <Link to="/forgot-password" className="ml-2 text-primary underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-md">
        <h1 className="text-2xl font-bold text-foreground mb-6">Set new password</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password !== confirm) {
              toast({ title: "Passwords do not match", variant: "destructive" });
              return;
            }
            if (password.length < 6) {
              toast({ title: "Password must be at least 6 characters", variant: "destructive" });
              return;
            }
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border border-border bg-background px-4 py-3"
          />
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-xl border border-border bg-background px-4 py-3"
          />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "…" : "Update password"}
          </Button>
        </form>
        <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
