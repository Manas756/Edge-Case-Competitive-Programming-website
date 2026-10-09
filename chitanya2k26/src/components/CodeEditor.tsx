"use client";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { memo, useMemo } from "react";

const theme = EditorView.theme({
  "&": { backgroundColor: "#fff", color: "#111" },
  ".cm-gutters": { backgroundColor: "#fafaf9", color: "#a3a3a3", borderRight: "1px solid #ececea" },
  ".cm-activeLine": { backgroundColor: "#f6f6f4" },
  ".cm-activeLineGutter": { backgroundColor: "#f0f0ee", color: "#111" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "#e2e2df !important" },
  ".cm-cursor": { borderLeftColor: "#000" },
});

export { LANG_LABEL } from "@/lib/languages";

function CodeEditor({ value, onChange, language, readOnly, height = "100%" }: { value: string; onChange?: (v: string) => void; language: string; readOnly?: boolean; height?: string }) {
  const ext = useMemo(() => {
    const l = language === "python" ? python() : language === "java" ? java() : language === "javascript" ? javascript() : cpp();
    return [l, theme, EditorView.lineWrapping];
  }, [language]);
  return (
    <CodeMirror
      value={value}
      height={height}
      theme="light"
      extensions={ext}
      editable={!readOnly}
      readOnly={readOnly}
      onChange={onChange}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, autocompletion: !readOnly, tabSize: 4 }}
      style={{ height }}
    />
  );
}

export default memo(CodeEditor);
