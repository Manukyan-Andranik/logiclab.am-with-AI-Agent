import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useT } from "@/i18n";

type Props = {
  count: number;
  className?: string;
};

const formatEnrollment = (n: number): { headline: string; live: boolean } => {
  const safe = Math.max(0, n | 0);
  const isRounded = safe >= 10;
  const value = isRounded ? Math.floor(safe / 10) * 10 : safe;
  return {
    headline: `${value}${isRounded ? "+" : ""}`,
    live: safe > 0,
  };
};

// Solid colors only — no gradients. First avatar uses the accent for
// emphasis; subsequent avatars use a neutral surface so the stack reads as
// "and others" without competing visually with the count.
const AVATAR_VARIANTS = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-foreground",
  "bg-secondary text-foreground",
];

const CourseEnrollmentBadge = ({ count, className = "" }: Props) => {
  const { headline, live } = formatEnrollment(count);
  const t = useT();
  const sublabel = t("student_dashboard.role_student").toLowerCase();
  const stackSize = Math.min(3, Math.max(1, count > 0 ? Math.min(3, count) : 1));

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      aria-label={live ? `${count} ${sublabel}` : t("courses.no_courses")}
    >
      <div className="flex -space-x-2">
        {Array.from({ length: stackSize }).map((_, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full ${AVATAR_VARIANTS[i % AVATAR_VARIANTS.length]} ring-2 ring-background flex items-center justify-center`}
          >
            <Users className="w-3 h-3" />
          </div>
        ))}
      </div>

      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black text-foreground tabular-nums tracking-tight">
            {headline}
          </span>
          {live && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0.5 }}
              animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block w-1.5 h-1.5 rounded-full bg-primary"
              aria-hidden
            />
          )}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
          {sublabel}
        </span>
      </div>
    </div>
  );
};

export default CourseEnrollmentBadge;
