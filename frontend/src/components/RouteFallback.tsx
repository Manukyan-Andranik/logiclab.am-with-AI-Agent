import Loader from "@/components/ui/Loader";
import { cn } from "@/lib/utils";

type Props = {
  /** Full-viewport centered loader (login, exam, admin shell). */
  fullScreen?: boolean;
  className?: string;
};

/** Suspense fallback for lazy-loaded routes and heavy widgets. */
export default function RouteFallback({ fullScreen, className }: Props) {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size={36} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <Loader size={28} />
    </div>
  );
}
