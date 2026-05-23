import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { requestPasswordReset } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const t = useT();

  const mutation = useMutation({
    mutationFn: () => requestPasswordReset(email.trim()),
    onSuccess: () => setSent(true),
    onError: (e: Error) =>
      toast({ title: t("login.failed_title"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-md">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("login.forgot_password")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your account email. If it exists, we will send a reset link.
        </p>
        {sent ? (
          <p className="text-sm text-foreground mb-6">
            If an account exists for that email, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.email_placeholder")}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
          ← {t("login.back_home")}
        </Link>
      </div>
    </div>
  );
}
