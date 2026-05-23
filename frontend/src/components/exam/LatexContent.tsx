import { useEffect, useMemo, useState } from "react";
import { ensureLatexDelimiters, parseLatexSegments } from "./latexUtils";

type Props = {
  text: string;
  className?: string;
};

type KatexApi = typeof import("katex")["default"];

let katexLoad: Promise<KatexApi> | null = null;

function loadKatex(): Promise<KatexApi> {
  if (!katexLoad) {
    katexLoad = (async () => {
      await import("katex/dist/katex.min.css");
      const mod = await import("katex");
      return mod.default;
    })();
  }
  return katexLoad;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

function renderMath(katex: KatexApi, latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return `<span class="exam-latex-error" title="LaTeX error">${escapeHtml(latex)}</span>`;
  }
}

function buildHtml(katex: KatexApi, text: string): string {
  if (!text?.trim()) return "";

  const normalized = ensureLatexDelimiters(text);
  const parts: string[] = [];

  for (const seg of parseLatexSegments(normalized)) {
    if (seg.kind === "text") {
      parts.push(escapeHtml(seg.value));
      continue;
    }
    parts.push(renderMath(katex, seg.value, seg.display));
  }

  return parts.join("");
}

/** Renders text with $...$ / $$...$$ / \\(...\\) / \\[...\\] and raw LaTeX fields. KaTeX loads on demand. */
export default function LatexContent({ text, className = "" }: Props) {
  const [katex, setKatex] = useState<KatexApi | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadKatex().then((api) => {
      if (!cancelled) setKatex(api);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const html = useMemo(() => (katex ? buildHtml(katex, text) : ""), [katex, text]);

  if (!katex) {
    return (
      <div
        className={`exam-latex max-w-none text-sm leading-relaxed text-muted-foreground animate-pulse ${className}`}
        aria-busy="true"
      >
        {text?.trim() || "\u00a0"}
      </div>
    );
  }

  return (
    <div
      className={`exam-latex max-w-none text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
