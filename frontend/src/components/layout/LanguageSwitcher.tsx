/**
 * Modern LanguageSwitcher
 * - Glassmorphism + soft gradients
 * - Animated active indicator
 * - Cleaner typography
 * - Better spacing + hover motion
 * - Mobile friendly
 */

import { Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useI18n } from "@/i18n";
import type { Lang } from "@/i18n/types";

// Flag SVGs live in /public/flags/<lang>.svg — referenced by absolute URL so
// they're served directly by Vite/Static without bundling them through the
// JS pipeline. Vite hashes /public assets at build time too, so cache busting
// still works.
const LABELS: Record<
  Lang,
  { native: string; english: string; short: string; flag: string }
> = {
  hy: { native: "Հայերեն", english: "Armenian", short: "HY", flag: "/flags/hy.svg" },
  en: { native: "English",  english: "English",  short: "EN", flag: "/flags/en.svg" },
  ru: { native: "Русский",  english: "Russian",  short: "RU", flag: "/flags/ru.svg" },
};

// Reusable circular flag chip — gives every flag a consistent crop, ring,
// and aspect ratio regardless of the source SVG's viewBox proportions.
const FlagChip = ({ lang, size = "md" }: { lang: Lang; size?: "sm" | "md" }) => {
  const px = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return (
    <span
      className={`${px} inline-block overflow-hidden rounded-full ring-1 ring-white/15 shadow-sm shrink-0`}
      aria-hidden
    >
      <img
        src={LABELS[lang].flag}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
};

interface Props {
  variant?: "compact" | "full";
}

const LanguageSwitcher: React.FC<Props> = ({ variant = "full" }) => {
  const { lang, setLang, langs, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("nav.language")}
          className="
            group relative inline-flex shrink-0 items-center gap-2
            overflow-hidden rounded-2xl
            border border-white/10
            bg-white/[0.06]
            px-3 py-2
            text-sm font-medium text-white
            backdrop-blur-xl
            transition-all duration-300
            hover:border-white/20
            hover:bg-white/[0.09]
            hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-primary/50
            data-[state=open]:bg-white/[0.1]
          "
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">
            <FlagChip lang={lang} size="sm" />
          </span>

          {variant === "full" && (
            <>
              <ChevronDown
                className="
                  relative z-10 h-3.5 w-3.5 opacity-60
                  transition-transform duration-300
                  group-data-[state=open]:rotate-180
                "
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="
          z-[200] w-64 overflow-hidden rounded-2xl
          border border-white/10
          bg-[#0f1117]/90
          p-2
          text-white
          shadow-2xl
          backdrop-blur-2xl
        "
        asChild
      >
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div className="space-y-1">
            {langs.map((l) => {
              const isActive = l === lang;

              return (
                <DropdownMenuItem
                  key={l}
                  onSelect={() => setLang(l)}
                  aria-current={isActive ? "true" : undefined}
                  className="
                    relative flex cursor-pointer items-center gap-3
                    rounded-xl px-3 py-3
                    outline-none
                    transition-all duration-200
                    hover:bg-white/[0.06]
                    focus:bg-white/[0.06]
                  "
                >
                  {/* Active background */}
                  {isActive && (
                    <motion.div
                      layoutId="active-language"
                      className="
                        absolute inset-0 rounded-xl
                        border border-primary/20
                        bg-primary/10
                      "
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}

                  {/* Flag + code badge */}
                  <div
                    className={`
                      relative z-10 flex h-9 w-9 items-center justify-center
                      rounded-lg border
                      transition-colors
                      ${
                        isActive
                          ? "border-primary/30 bg-primary/10"
                          : "border-white/10 bg-white/[0.04]"
                      }
                    `}
                  >
                    <FlagChip lang={l} size="md" />
                  </div>

                  {/* Labels */}
                  <div className="relative z-10 flex flex-1 flex-col">
                    <span
                      className={`text-sm font-medium ${
                        isActive ? "text-white" : "text-white/85"
                      }`}
                    >
                      {LABELS[l].native}
                    </span>

                    <span className="text-xs text-white/40">
                      {LABELS[l].english}
                    </span>
                  </div>

                  {/* Check */}
                  <div className="relative z-10">
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check
                          className="h-4 w-4 text-primary"
                          strokeWidth={3}
                        />
                      </motion.div>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;