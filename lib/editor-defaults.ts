export const SAMPLE_DOCUMENT = `\\documentclass{article}
\\usepackage{amsmath}

\\title{Sample Document}
\\author{TeXit User}
\\date{March 2026}

\\begin{document}

\\maketitle

\\section*{Introduction}
This is a sample LaTeX document to get you started. You can edit this directly or use the AI assistant above to generate LaTeX.

\\section*{Example Math}
The quadratic formula is given by:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

And here is an identity matrix:
$$\\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{bmatrix}$$

\\section*{Lists}
\\begin{itemize}
    \\item First item with inline math $E = mc^2$
    \\item Second item with \\textbf{bold text}
    \\item Third item with \\textit{italic text}
\\end{itemize}

\\end{document}`;

export const WELCOME_MESSAGE =
  "Hi! I'm your LaTeX assistant. Describe what you need, paste an image, or upload a reference file, and I'll generate the LaTeX code for you.";

export function buildMockAssistantResponse(prompt: string) {
  const trimmedPrompt = prompt.trim();

  return `I saved your request and drafted a LaTeX snippet for it:\n\`\`\`latex\n% Prompt: ${trimmedPrompt}\n${trimmedPrompt ? `% TODO: replace this placeholder with generated LaTeX for "${trimmedPrompt}"` : "% TODO: replace this placeholder with generated LaTeX"}\n\`\`\`\nYou can refine this prompt further or edit the source directly.`;
}
