import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Props = {
  text: string;
  className?: string;
};

/** Renders text with $...$ inline and $$...$$ block LaTeX. */
export default function LatexContent({ text, className = "" }: Props) {
  const html = useMemo(() => {
    if (!text) return "";
    const parts: string[] = [];
    const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    const src = text;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) {
        parts.push(escapeHtml(src.slice(last, m.index)));
      }
      const block = m[0].startsWith("$$");
      const latex = block ? m[0].slice(2, -2) : m[0].slice(1, -1);
      try {
        parts.push(
          katex.renderToString(latex.trim(), {
            displayMode: block,
            throwOnError: false,
          })
        );
      } catch {
        parts.push(escapeHtml(m[0]));
      }
      last = m.index + m[0].length;
    }
    if (last < src.length) parts.push(escapeHtml(src.slice(last)));
    return parts.join("");
  }, [text]);

  return (
    <div
      className={`exam-latex prose prose-invert max-w-none text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}
