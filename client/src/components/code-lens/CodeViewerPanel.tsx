import Editor, { useMonaco } from '@monaco-editor/react';
import { useRef, useEffect } from 'react';
import type { ViolationRecord } from './codeLensTypes';
import './code-lens.css';

interface CodeViewerPanelProps {
  fileContent: string;
  fileName: string;
  violations: ViolationRecord[];
  scrollToLine: number | null;
}

export function CodeViewerPanel({
  fileContent,
  fileName,
  violations,
  scrollToLine,
}: CodeViewerPanelProps) {
  const editorRef      = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const monaco         = useMonaco();

  // Apply violation decorations whenever violations or monaco change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !monaco) return;

    const decorations = violations.map(v => ({
      range: new monaco.Range(v.line_start, 1, v.line_end, 999),
      options: {
        isWholeLine: true,
        className: v.severity === 'Critical'
          ? 'violation-line-critical'
          : 'violation-line-warning',
        glyphMarginClassName: v.severity === 'Critical'
          ? 'glyph-critical'
          : 'glyph-warning',
        hoverMessage: {
          value: `**${v.rule_id} — ${v.rule_name}**: ${v.recommended_fix}`,
        },
      },
    }));

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      decorations,
    );
  }, [violations, monaco]);

  // Scroll to line on demand
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || scrollToLine === null) return;
    editor.revealLineInCenter(scrollToLine);
    editor.setPosition({ lineNumber: scrollToLine, column: 1 });
  }, [scrollToLine]);

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#1E1E1E' }}>
      {/* File name bar */}
      <div className="px-4 py-2 border-b flex items-center gap-2 flex-shrink-0"
           style={{ background: '#252526', borderColor: '#3C3C3C' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: '#2563eb' }} />
        <span className="text-xs font-mono" style={{ color: '#D4D4D4' }}>
          {fileName || 'Select a file from the tree'}
        </span>
      </div>

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        {fileContent ? (
          <Editor
            height="100%"
            language="csharp"
            theme="vs"
            value={fileContent}
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              fontSize: 13,
              lineNumbers: 'on',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'line',
              glyphMargin: true,
              folding: true,
              wordWrap: 'off',
              scrollbar: { vertical: 'auto', horizontal: 'auto' },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm"
               style={{ color: '#555' }}>
            {fileName
              ? 'Loading file content…'
              : 'Select a file from the tree to view its code'}
          </div>
        )}
      </div>
    </div>
  );
}
