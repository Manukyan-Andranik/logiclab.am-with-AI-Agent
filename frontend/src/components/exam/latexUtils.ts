/** True when the string already contains $...$ or $$...$$ math delimiters. */
export function hasLatexDelimiters(content: string): boolean {
  return /\$\$[\s\S]+?\$\$/.test(content) || /\$[^$\n]+?\$/.test(content);
}

/** True when content looks like raw LaTeX (not plain prose). */
export function looksLikeRawLatex(content: string): boolean {
  const t = content.trim();
  if (!t) return false;
  if (hasLatexDelimiters(t)) return false;
  return /\\[a-zA-Z]+|[\^_{}]|\\frac|\\sqrt|\\vec|\\mathbb|\\cdot|\\times|\\left|\\right/.test(t);
}

/**
 * Wrap undelimited LaTeX in $...$ so KaTeX can render question_latex / option.latex fields.
 */
export function ensureLatexDelimiters(content: string): string {
  const t = content.trim();
  if (!t) return "";
  if (hasLatexDelimiters(t)) return t;
  if (looksLikeRawLatex(t)) return `$${t}$`;
  return t;
}

export type LatexSegment =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string; display: boolean };

/**
 * Split mixed text into plain text and math segments ($$, $, \\[ \\], \\( \\)).
 */
export function parseLatexSegments(input: string): LatexSegment[] {
  if (!input) return [];
  const segments: LatexSegment[] = [];
  let i = 0;

  const pushText = (end: number) => {
    if (end > i) segments.push({ kind: "text", value: input.slice(i, end) });
    i = end;
  };

  while (i < input.length) {
    if (input.startsWith("$$", i)) {
      const close = input.indexOf("$$", i + 2);
      if (close !== -1) {
        pushText(i);
        segments.push({
          kind: "math",
          value: input.slice(i + 2, close),
          display: true,
        });
        i = close + 2;
        continue;
      }
    }

    if (input.startsWith("\\[", i)) {
      const close = input.indexOf("\\]", i + 2);
      if (close !== -1) {
        pushText(i);
        segments.push({
          kind: "math",
          value: input.slice(i + 2, close),
          display: true,
        });
        i = close + 2;
        continue;
      }
    }

    if (input.startsWith("\\(", i)) {
      const close = input.indexOf("\\)", i + 2);
      if (close !== -1) {
        pushText(i);
        segments.push({
          kind: "math",
          value: input.slice(i + 2, close),
          display: false,
        });
        i = close + 2;
        continue;
      }
    }

    if (input[i] === "$" && input[i + 1] !== "$") {
      let j = i + 1;
      while (j < input.length && input[j] !== "$") j += 1;
      if (j < input.length) {
        pushText(i);
        segments.push({
          kind: "math",
          value: input.slice(i + 1, j),
          display: false,
        });
        i = j + 1;
        continue;
      }
    }

    let j = i + 1;
    while (j < input.length) {
      if (
        input.startsWith("$$", j) ||
        input.startsWith("\\[", j) ||
        input.startsWith("\\(", j) ||
        (input[j] === "$" && input[j + 1] !== "$")
      ) {
        break;
      }
      j += 1;
    }
    pushText(j);
  }

  return segments;
}
