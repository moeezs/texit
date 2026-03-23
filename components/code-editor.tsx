"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches, openSearchPanel } from "@codemirror/search";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Dark theme matching our app
const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "oklch(0.92 0 0)",
      fontSize: "13.5px",
      height: "100%",
    },
    ".cm-content": {
      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      padding: "16px 0",
      caretColor: "oklch(0.92 0 0)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "oklch(0.92 0 0)",
      borderLeftWidth: "2px",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "oklch(0.45 0 0)",
      border: "none",
      paddingLeft: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 4px",
      minWidth: "32px",
    },
    ".cm-activeLine": {
      backgroundColor: "oklch(1 0 0 / 3%)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "oklch(0.7 0 0)",
    },
    ".cm-selectionBackground": {
      backgroundColor: "oklch(0.488 0.243 264.376 / 25%) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "oklch(0.488 0.243 264.376 / 30%) !important",
    },
    ".cm-matchingBracket": {
      backgroundColor: "oklch(1 0 0 / 10%)",
      outline: "1px solid oklch(1 0 0 / 20%)",
    },
    ".cm-searchMatch": {
      backgroundColor: "oklch(0.8 0.15 80 / 30%)",
      outline: "1px solid oklch(0.8 0.15 80 / 50%)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "oklch(0.8 0.15 80 / 50%)",
    },
    ".cm-panels": {
      backgroundColor: "oklch(0.2 0 0)",
      color: "oklch(0.85 0 0)",
      borderBottom: "1px solid oklch(1 0 0 / 10%)",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid oklch(1 0 0 / 10%)",
    },
    ".cm-panel input, .cm-panel button": {
      color: "oklch(0.92 0 0)",
    },
    ".cm-panel input": {
      background: "oklch(0.16 0 0)",
      border: "1px solid oklch(1 0 0 / 15%)",
      borderRadius: "6px",
      padding: "4px 8px",
      fontSize: "13px",
    },
    ".cm-panel input:focus": {
      outline: "none",
      borderColor: "oklch(1 0 0 / 30%)",
    },
    ".cm-panel button": {
      background: "oklch(0.275 0 0)",
      border: "1px solid oklch(1 0 0 / 10%)",
      borderRadius: "6px",
      padding: "4px 10px",
      fontSize: "13px",
      cursor: "pointer",
    },
    ".cm-panel button:hover": {
      background: "oklch(0.32 0 0)",
    },
    ".cm-panel label": {
      fontSize: "13px",
    },
    ".cm-tooltip": {
      backgroundColor: "oklch(0.2 0 0)",
      border: "1px solid oklch(1 0 0 / 15%)",
      borderRadius: "8px",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    },
    // LaTeX syntax highlighting
    ".cm-keyword": { color: "oklch(0.7 0.15 250)" },     // commands \begin etc
    ".cm-atom": { color: "oklch(0.75 0.12 150)" },         // special chars
    ".cm-number": { color: "oklch(0.75 0.15 50)" },        // numbers
    ".cm-tag": { color: "oklch(0.7 0.15 250)" },           // tags
    ".cm-comment": { color: "oklch(0.5 0 0)", fontStyle: "italic" },
    ".cm-string": { color: "oklch(0.75 0.12 150)" },
    ".cm-bracket": { color: "oklch(0.65 0.12 50)" },
    ".cm-variableName": { color: "oklch(0.85 0.08 200)" },
    ".cm-propertyName": { color: "oklch(0.8 0.1 180)" },
    ".cm-operator": { color: "oklch(0.7 0.1 30)" },
    ".cm-meta": { color: "oklch(0.65 0.15 280)" },
    ".cm-builtin": { color: "oklch(0.75 0.15 250)" },
  },
  { dark: true }
);

export default function CodeEditor({ value, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep ref updated
  onChangeRef.current = onChange;

  const openFind = useCallback(() => {
    if (viewRef.current) {
      openSearchPanel(viewRef.current);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        rectangularSelection(),
        highlightSelectionMatches(),
        history(),
        StreamLanguage.define(stex),
        darkTheme,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (value !== currentValue) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Expose openFind to parent
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      (el as HTMLDivElement & { openFind?: () => void }).openFind = openFind;
    }
  }, [openFind]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
    />
  );
}
