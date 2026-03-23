"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface LatexRendererProps {
  content: string;
}

/**
 * A custom LaTeX document renderer that:
 * 1. Strips preamble (\documentclass through \begin{document}) and \end{document}
 * 2. Renders math blocks via KaTeX
 * 3. Converts structural LaTeX into styled HTML
 */
export default function LatexRenderer({ content }: LatexRendererProps) {
  const rendered = useMemo(() => {
    try {
      return parseLatexDocument(content);
    } catch {
      return null;
    }
  }, [content]);

  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <span className="text-2xl">∑</span>
        </div>
        <p className="text-sm">Your LaTeX preview will appear here</p>
        <p className="text-xs text-muted-foreground/60">
          Type LaTeX in the editor or use AI to generate it
        </p>
      </div>
    );
  }

  if (!rendered) {
    return (
      <div className="text-destructive text-sm p-4">
        Error rendering LaTeX. Please check your syntax.
      </div>
    );
  }

  return (
    <div
      className="latex-preview prose prose-invert max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

function parseLatexDocument(raw: string): string {
  let content = raw;

  // Strip preamble: everything from \documentclass to \begin{document}
  const beginDocMatch = content.match(/\\begin\{document\}/);
  if (beginDocMatch && beginDocMatch.index !== undefined) {
    content = content.substring(
      beginDocMatch.index + beginDocMatch[0].length
    );
  }

  // Strip \end{document}
  content = content.replace(/\\end\{document\}/, "");

  // Extract \title, \author, \date for \maketitle
  const titleMatch = raw.match(/\\title\{([^}]*)\}/);
  const authorMatch = raw.match(/\\author\{([^}]*)\}/);
  const dateMatch = raw.match(/\\date\{([^}]*)\}/);

  // Use a unique sentinel marker for \maketitle (won't be escaped by processLatexContent)
  const MAKETITLE_SENTINEL = "%%__MAKETITLE_SENTINEL__%%";
  let titleBlockHtml = "";

  if (content.includes("\\maketitle")) {
    titleBlockHtml = '<div class="latex-title-block">';
    if (titleMatch) {
      titleBlockHtml += `<h1 class="latex-doc-title">${escapeHtml(titleMatch[1])}</h1>`;
    }
    if (authorMatch) {
      titleBlockHtml += `<p class="latex-doc-author">${escapeHtml(authorMatch[1])}</p>`;
    }
    if (dateMatch) {
      titleBlockHtml += `<p class="latex-doc-date">${escapeHtml(dateMatch[1])}</p>`;
    }
    titleBlockHtml += "</div>";
    content = content.replace(/\\maketitle/, MAKETITLE_SENTINEL);
  }

  // Process the content
  let html = processLatexContent(content);

  // Replace sentinel with actual HTML after processing
  if (titleBlockHtml) {
    html = html.replace(MAKETITLE_SENTINEL, titleBlockHtml);
  }

  return html;
}

function processLatexContent(content: string): string {
  let result = "";
  let i = 0;

  while (i < content.length) {
    // Check for display math: $$ ... $$
    if (content[i] === "$" && content[i + 1] === "$") {
      const end = content.indexOf("$$", i + 2);
      if (end !== -1) {
        const math = content.substring(i + 2, end);
        result += renderMathBlock(math);
        i = end + 2;
        continue;
      }
    }

    // Check for \[ ... \]
    if (content[i] === "\\" && content[i + 1] === "[") {
      const end = content.indexOf("\\]", i + 2);
      if (end !== -1) {
        const math = content.substring(i + 2, end);
        result += renderMathBlock(math);
        i = end + 2;
        continue;
      }
    }

    // Check for \begin{...}
    if (content.substring(i).startsWith("\\begin{")) {
      const envResult = processEnvironment(content, i);
      if (envResult) {
        result += envResult.html;
        i = envResult.endIndex;
        continue;
      }
    }

    // Check for \section*{} or \section{}
    const sectionMatch = content
      .substring(i)
      .match(/^\\(section|subsection|subsubsection)\*?\{([^}]*)\}/);
    if (sectionMatch) {
      const level = sectionMatch[1];
      const title = sectionMatch[2];
      const tag =
        level === "section" ? "h2" : level === "subsection" ? "h3" : "h4";
      result += `<${tag} class="latex-${level}">${processInlineLatex(title)}</${tag}>`;
      i += sectionMatch[0].length;
      continue;
    }

    // Check for \vspace, \medskip, \bigskip, \smallskip
    const skipMatch = content
      .substring(i)
      .match(/^\\(vspace\{[^}]*\}|medskip|bigskip|smallskip|noindent)/);
    if (skipMatch) {
      if (skipMatch[1].startsWith("vspace") || skipMatch[1] === "bigskip") {
        result += '<div class="latex-vspace-lg"></div>';
      } else if (skipMatch[1] === "medskip") {
        result += '<div class="latex-vspace-md"></div>';
      } else if (skipMatch[1] === "smallskip") {
        result += '<div class="latex-vspace-sm"></div>';
      }
      // noindent — no-op for rendering
      i += skipMatch[0].length;
      continue;
    }

    // \newline or \\
    if (
      content.substring(i).startsWith("\\newline") ||
      (content[i] === "\\" &&
        content[i + 1] === "\\" &&
        !content.substring(i - 5, i).includes("\\"))
    ) {
      if (content.substring(i).startsWith("\\newline")) {
        result += "<br/>";
        i += 8;
      } else {
        result += "<br/>";
        i += 2;
      }
      continue;
    }

    // Inline math: $...$
    if (content[i] === "$" && content[i + 1] !== "$") {
      const end = findClosingDollar(content, i + 1);
      if (end !== -1) {
        const math = content.substring(i + 1, end);
        result += renderMathInline(math);
        i = end + 1;
        continue;
      }
    }

    // \( ... \) inline math
    if (content[i] === "\\" && content[i + 1] === "(") {
      const end = content.indexOf("\\)", i + 2);
      if (end !== -1) {
        const math = content.substring(i + 2, end);
        result += renderMathInline(math);
        i = end + 2;
        continue;
      }
    }

    // Check for inline commands
    const inlineCmdMatch = content.substring(i).match(
      /^\\(textbf|textit|emph|texttt|underline|text)\{/
    );
    if (inlineCmdMatch) {
      const cmd = inlineCmdMatch[1];
      const braceContent = extractBraceContent(
        content,
        i + inlineCmdMatch[0].length - 1
      );
      if (braceContent !== null) {
        const tag =
          cmd === "textbf"
            ? "strong"
            : cmd === "textit" || cmd === "emph"
            ? "em"
            : cmd === "texttt"
            ? "code"
            : cmd === "underline"
            ? "u"
            : "span";
        result += `<${tag}>${processInlineLatex(braceContent.content)}</${tag}>`;
        i = braceContent.endIndex;
        continue;
      }
    }

    // \quad, \qquad
    if (content.substring(i).startsWith("\\qquad")) {
      result += "&emsp;&emsp;";
      i += 6;
      continue;
    }
    if (content.substring(i).startsWith("\\quad")) {
      result += "&emsp;";
      i += 5;
      continue;
    }

    // \hspace{...}
    const hspaceMatch = content.substring(i).match(/^\\hspace\{[^}]*\}/);
    if (hspaceMatch) {
      result += "&emsp;";
      i += hspaceMatch[0].length;
      continue;
    }

    // Skip unknown commands gracefully
    if (
      content[i] === "\\" &&
      /[a-zA-Z]/.test(content[i + 1] || "")
    ) {
      const cmdMatch = content.substring(i).match(/^\\([a-zA-Z]+)(\{[^}]*\})?/);
      if (cmdMatch) {
        // Skip the command but keep any braced content
        if (cmdMatch[2]) {
          result += processInlineLatex(cmdMatch[2].slice(1, -1));
        }
        i += cmdMatch[0].length;
        continue;
      }
    }

    // Double newline → paragraph break
    if (content[i] === "\n" && content[i + 1] === "\n") {
      result += "</p><p>";
      i += 2;
      while (i < content.length && content[i] === "\n") i++;
      continue;
    }

    // Single newline → space
    if (content[i] === "\n") {
      result += " ";
      i++;
      continue;
    }

    result += escapeHtml(content[i]);
    i++;
  }

  // Wrap in paragraph tags
  result = "<p>" + result + "</p>";
  // Clean up empty paragraphs
  result = result.replace(/<p>\s*<\/p>/g, "");
  // Don't wrap block elements in p
  result = result.replace(/<p>\s*(<h[1-6])/g, "$1");
  result = result.replace(/(<\/h[1-6]>)\s*<\/p>/g, "$1");
  result = result.replace(/<p>\s*(<div)/g, "$1");
  result = result.replace(/(<\/div>)\s*<\/p>/g, "$1");
  result = result.replace(/<p>\s*(<ul)/g, "$1");
  result = result.replace(/(<\/ul>)\s*<\/p>/g, "$1");
  result = result.replace(/<p>\s*(<ol)/g, "$1");
  result = result.replace(/(<\/ol>)\s*<\/p>/g, "$1");

  return result;
}

function processEnvironment(
  content: string,
  startIndex: number
): { html: string; endIndex: number } | null {
  const envMatch = content.substring(startIndex).match(/^\\begin\{(\w+\*?)\}/);
  if (!envMatch) return null;

  const envName = envMatch[1];
  const afterBegin = startIndex + envMatch[0].length;
  const endTag = `\\end{${envName}}`;
  const endIndex = content.indexOf(endTag, afterBegin);
  if (endIndex === -1) return null;

  const inner = content.substring(afterBegin, endIndex);
  const nextIndex = endIndex + endTag.length;

  // Math environments
  const mathEnvs = [
    "equation",
    "equation*",
    "align",
    "align*",
    "gather",
    "gather*",
    "multline",
    "multline*",
    "eqnarray",
    "eqnarray*",
    "math",
    "displaymath",
    "flalign",
    "flalign*",
  ];

  if (mathEnvs.includes(envName)) {
    return {
      html: renderMathBlock(`\\begin{${envName}}${inner}\\end{${envName}}`),
      endIndex: nextIndex,
    };
  }

  // Matrix environments — wrap in display math
  const matrixEnvs = [
    "matrix",
    "pmatrix",
    "bmatrix",
    "Bmatrix",
    "vmatrix",
    "Vmatrix",
    "cases",
  ];
  if (matrixEnvs.includes(envName)) {
    return {
      html: renderMathBlock(`\\begin{${envName}}${inner}\\end{${envName}}`),
      endIndex: nextIndex,
    };
  }

  // Array environment — wrap in display math
  if (envName === "array") {
    return {
      html: renderMathBlock(`\\begin{array}${inner}\\end{array}`),
      endIndex: nextIndex,
    };
  }

  // Itemize
  if (envName === "itemize") {
    return {
      html: processItemize(inner),
      endIndex: nextIndex,
    };
  }

  // Enumerate
  if (envName === "enumerate") {
    return {
      html: processEnumerate(inner),
      endIndex: nextIndex,
    };
  }

  // Center
  if (envName === "center") {
    return {
      html: `<div class="latex-center">${processLatexContent(inner)}</div>`,
      endIndex: nextIndex,
    };
  }

  // Tikzpicture — show placeholder
  if (envName === "tikzpicture") {
    return {
      html: `<div class="latex-tikz-placeholder">
        <div class="latex-tikz-icon">📊</div>
        <p>TikZ diagram</p>
        <p class="latex-tikz-note">TikZ rendering requires a full TeX compiler</p>
      </div>`,
      endIndex: nextIndex,
    };
  }

  // Table / tabular
  if (envName === "tabular") {
    return {
      html: processTabular(inner),
      endIndex: nextIndex,
    };
  }

  if (envName === "table") {
    return {
      html: `<div class="latex-table">${processLatexContent(inner)}</div>`,
      endIndex: nextIndex,
    };
  }

  // Figure
  if (envName === "figure") {
    return {
      html: `<div class="latex-figure">${processLatexContent(inner)}</div>`,
      endIndex: nextIndex,
    };
  }

  // Unknown environment — try to process content
  return {
    html: processLatexContent(inner),
    endIndex: nextIndex,
  };
}

function processItemize(content: string): string {
  const items = splitItems(content);
  let html = '<ul class="latex-itemize">';
  for (const item of items) {
    html += `<li>${processLatexContent(item.trim())}</li>`;
  }
  html += "</ul>";
  return html;
}

function processEnumerate(content: string): string {
  const items = splitItems(content);
  let html = '<ol class="latex-enumerate">';
  for (const item of items) {
    html += `<li>${processLatexContent(item.trim())}</li>`;
  }
  html += "</ol>";
  return html;
}

function splitItems(content: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("\\begin{")) depth++;
    if (trimmed.startsWith("\\end{")) depth--;

    if (trimmed.startsWith("\\item") && depth <= 0) {
      if (current.trim()) {
        items.push(current.trim());
      }
      // Remove \item and optional [...] label
      current = trimmed.replace(/^\\item\s*(\[[^\]]*\])?\s*/, "");
    } else {
      current += "\n" + line;
    }
  }
  if (current.trim()) {
    items.push(current.trim());
  }
  return items;
}

function processTabular(content: string): string {
  // Strip column spec if present
  let inner = content;
  const colSpecMatch = inner.match(/^\s*\{[^}]*\}\s*/);
  if (colSpecMatch) {
    inner = inner.substring(colSpecMatch[0].length);
  }

  const rows = inner
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter((r) => r && !r.startsWith("\\hline"));

  let html = '<table class="latex-tabular"><tbody>';
  for (const row of rows) {
    html += "<tr>";
    const cells = row.split("&");
    for (const cell of cells) {
      html += `<td>${processInlineLatex(cell.trim())}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

function processInlineLatex(text: string): string {
  let result = "";
  let i = 0;

  while (i < text.length) {
    // Inline math $...$
    if (text[i] === "$" && text[i + 1] !== "$") {
      const end = findClosingDollar(text, i + 1);
      if (end !== -1) {
        result += renderMathInline(text.substring(i + 1, end));
        i = end + 1;
        continue;
      }
    }

    // Display math $$...$$
    if (text[i] === "$" && text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2);
      if (end !== -1) {
        result += renderMathBlock(text.substring(i + 2, end));
        i = end + 2;
        continue;
      }
    }

    // Inline commands
    const cmdMatch = text
      .substring(i)
      .match(/^\\(textbf|textit|emph|texttt|underline|text)\{/);
    if (cmdMatch) {
      const cmd = cmdMatch[1];
      const braceContent = extractBraceContent(
        text,
        i + cmdMatch[0].length - 1
      );
      if (braceContent !== null) {
        const tag =
          cmd === "textbf"
            ? "strong"
            : cmd === "textit" || cmd === "emph"
            ? "em"
            : cmd === "texttt"
            ? "code"
            : cmd === "underline"
            ? "u"
            : "span";
        result += `<${tag}>${processInlineLatex(braceContent.content)}</${tag}>`;
        i = braceContent.endIndex;
        continue;
      }
    }

    // \quad, \qquad
    if (text.substring(i).startsWith("\\qquad")) {
      result += "&emsp;&emsp;";
      i += 6;
      continue;
    }
    if (text.substring(i).startsWith("\\quad")) {
      result += "&emsp;";
      i += 5;
      continue;
    }

    // \ldots, \cdots, \dots
    if (text.substring(i).match(/^\\(ldots|cdots|dots)/)) {
      result += "…";
      i += text.substring(i).match(/^\\(ldots|cdots|dots)/)![0].length;
      continue;
    }

    // \% \& \# \_ \{ \}
    if (text[i] === "\\" && "&#%_{}~^".includes(text[i + 1] || "")) {
      result += escapeHtml(text[i + 1]);
      i += 2;
      continue;
    }

    // Skip other commands
    if (text[i] === "\\" && /[a-zA-Z]/.test(text[i + 1] || "")) {
      const match = text.substring(i).match(/^\\([a-zA-Z]+)(\{[^}]*\})?/);
      if (match) {
        // For \lceil, \rceil, etc., render as math
        const mathCmds = [
          "lceil",
          "rceil",
          "lfloor",
          "rfloor",
          "infty",
          "epsilon",
          "neq",
          "leq",
          "geq",
          "in",
          "notin",
          "forall",
          "exists",
          "Rightarrow",
          "Leftarrow",
          "rightarrow",
          "leftarrow",
          "xrightarrow",
          "xleftarrow",
          "equiv",
          "to",
          "cap",
          "cup",
          "subset",
          "supset",
          "times",
          "cdot",
        ];
        if (mathCmds.includes(match[1])) {
          result += renderMathInline(`\\${match[0].substring(1)}`);
          i += match[0].length;
          continue;
        }
        // Keep braced content if present
        if (match[2]) {
          result += processInlineLatex(match[2].slice(1, -1));
        }
        i += match[0].length;
        continue;
      }
    }

    result += escapeHtml(text[i]);
    i++;
  }

  return result;
}

function findClosingDollar(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    if (text[i] === "$" && text[i - 1] !== "\\") {
      return i;
    }
  }
  return -1;
}

function extractBraceContent(
  text: string,
  openBraceIndex: number
): { content: string; endIndex: number } | null {
  if (text[openBraceIndex] !== "{") return null;
  let depth = 1;
  let i = openBraceIndex + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === "{" && text[i - 1] !== "\\") depth++;
    if (text[i] === "}" && text[i - 1] !== "\\") depth--;
    i++;
  }
  if (depth !== 0) return null;
  return {
    content: text.substring(openBraceIndex + 1, i - 1),
    endIndex: i,
  };
}

function renderMathBlock(math: string): string {
  try {
    const html = katex.renderToString(math, {
      displayMode: true,
      throwOnError: false,
      trust: true,
      strict: false,
    });
    return `<div class="latex-math-block">${html}</div>`;
  } catch {
    return `<div class="latex-math-error">Math error: <code>${escapeHtml(math)}</code></div>`;
  }
}

function renderMathInline(math: string): string {
  try {
    return katex.renderToString(math, {
      displayMode: false,
      throwOnError: false,
      trust: true,
      strict: false,
    });
  } catch {
    return `<code class="latex-math-error-inline">${escapeHtml(math)}</code>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
