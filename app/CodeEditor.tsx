'use client';

import { useEffect, useMemo, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { EditorView, Decoration, gutter, GutterMarker } from '@codemirror/view';
import { StateField, StateEffect, type Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// React owns the canonical Set<number> of breakpoint lines. We mirror it into
// this CM field via a dispatched effect (Set<number>, not RangeSet — we don't
// auto-track edits, matching the original textarea behavior).

const setBreakpointsEffect = StateEffect.define<number[]>();

const breakpointsLineSet = StateField.define<ReadonlySet<number>>({
  create: () => new Set(),
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setBreakpointsEffect)) value = new Set(e.value);
    }
    return value;
  },
});

// Single combined gutter: hole/dot on the left, line number on the right.
// Matches the original layout. Clicking anywhere on the row toggles the
// breakpoint.
class LineGutterMarker extends GutterMarker {
  constructor(public lineNumber: number, public hasBreakpoint: boolean) {
    super();
  }

  eq(other: GutterMarker): boolean {
    return (
      other instanceof LineGutterMarker &&
      other.lineNumber === this.lineNumber &&
      other.hasBreakpoint === this.hasBreakpoint
    );
  }

  toDOM(): HTMLElement {
    // Mirror the original textarea-era Gutter component exactly: 56px wide,
    // dot at the left with 6px gap, line number at the right with 8px padding,
    // pushed apart by justify-content:space-between. min-width (rather than
    // fixed width) lets it grow if line numbers exceed 4 digits.
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;min-width:40px;padding-right:8px;color:#666;';

    const dot = document.createElement('span');
    dot.style.cssText =
      'flex:none;display:inline-block;margin-left:6px;width:10px;height:10px;border-radius:50%;' +
      (this.hasBreakpoint
        ? 'background:#ef4444;'
        : 'background:transparent;border:1px solid #2a2a2a;');

    const num = document.createElement('span');
    num.textContent = String(this.lineNumber);
    num.style.cssText = 'font-variant-numeric:tabular-nums;';

    wrap.appendChild(dot);
    wrap.appendChild(num);
    return wrap;
  }
}

// Stopped-line highlight via state field + line decoration.

const setStoppedLineEffect = StateEffect.define<number | null>();

const stoppedLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setStoppedLineEffect)) value = e.value;
    }
    return value;
  },
});

const stoppedLineDecoration = Decoration.line({
  attributes: { class: 'cm-stopped-line' },
});

const stoppedLineHighlight = EditorView.decorations.compute([stoppedLineField], (state) => {
  const ln = state.field(stoppedLineField);
  if (ln == null || ln < 1 || ln > state.doc.lines) return Decoration.none;
  const line = state.doc.line(ln);
  return Decoration.set([stoppedLineDecoration.range(line.from)]);
});

// Minimal syntax palette — stays in the same dark/almost-black world as the
// rest of the UI rather than pulling in a busy third-party theme.
const cHighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.modifier, t.operatorKeyword], color: '#7dd3fc' },
  { tag: [t.string, t.character, t.special(t.string)], color: '#86efac' },
  { tag: [t.number, t.bool], color: '#fbbf24' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#6b7280', fontStyle: 'italic' },
  { tag: t.function(t.variableName), color: '#a5b4fc' },
  { tag: [t.processingInstruction, t.meta], color: '#7dd3fc' },
  { tag: [t.typeName, t.standard(t.typeName)], color: '#f0abfc' },
  { tag: [t.operator, t.punctuation, t.bracket, t.brace, t.paren, t.squareBracket], color: '#94a3b8' },
]);

const editorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px',
      backgroundColor: '#111',
      color: '#e5e5e5',
    },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      // Match the original textarea's line-height (20px on 13px font ≈ 1.54).
      lineHeight: '1.54',
    },
    // Strip CM's default 4px top/bottom padding on .cm-content; match the
    // original textarea's `padding: 0 12px` on each line.
    '.cm-content': { caretColor: '#e5e5e5', padding: '0' },
    '.cm-line': { padding: '0 12px' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#e5e5e5' },
    '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#1e3a8a' },
    '.cm-gutters': {
      backgroundColor: '#0a0a0a',
      borderRight: '1px solid #222',
      color: '#666',
      cursor: 'pointer',
      userSelect: 'none',
    },
    '.cm-gutterElement:hover': { backgroundColor: '#141414' },
    '.cm-stopped-line': { backgroundColor: 'rgba(251, 191, 36, 0.18)' },
  },
  { dark: true },
);

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  breakpoints: Set<number>;
  onToggleBreakpoint: (line: number) => void;
  stoppedLine: number | null;
};

export default function CodeEditor(props: CodeEditorProps) {
  const { value, onChange, breakpoints, onToggleBreakpoint, stoppedLine } = props;

  const cmRef = useRef<ReactCodeMirrorRef>(null);

  // Ref so the gutter click handler always sees the latest toggle without
  // requiring us to rebuild extensions.
  const toggleRef = useRef(onToggleBreakpoint);
  toggleRef.current = onToggleBreakpoint;

  const extensions = useMemo<Extension[]>(
    () => [
      cpp(),
      breakpointsLineSet,
      stoppedLineField,
      stoppedLineHighlight,
      gutter({
        class: 'cm-line-gutter',
        lineMarker: (view, line) => {
          const lineNumber = view.state.doc.lineAt(line.from).number;
          const set = view.state.field(breakpointsLineSet);
          return new LineGutterMarker(lineNumber, set.has(lineNumber));
        },
        lineMarkerChange: (update) =>
          update.docChanged ||
          update.startState.field(breakpointsLineSet) !== update.state.field(breakpointsLineSet),
        // Wide enough that line numbers up to 9999 fit without resizing.
        initialSpacer: () => new LineGutterMarker(9999, false),
        domEventHandlers: {
          mousedown(view, line) {
            const ln = view.state.doc.lineAt(line.from).number;
            toggleRef.current(ln);
            return true;
          },
        },
      }),
      syntaxHighlighting(cHighlightStyle),
      editorTheme,
    ],
    [],
  );

  useEffect(() => {
    const view = cmRef.current?.view;
    if (!view) return;
    view.dispatch({ effects: setBreakpointsEffect.of(Array.from(breakpoints)) });
  }, [breakpoints]);

  useEffect(() => {
    const view = cmRef.current?.view;
    if (!view) return;
    view.dispatch({ effects: setStoppedLineEffect.of(stoppedLine) });
  }, [stoppedLine]);

  return (
    <CodeMirror
      ref={cmRef}
      value={value}
      onChange={onChange}
      extensions={extensions}
      // theme="none" — we provide all chrome + syntax styling above so the
      // background stays #111 instead of @uiw's default dark grey.
      theme="dark"
      basicSetup={{
        // Render our own combined line-number + breakpoint gutter.
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      style={{ height: '100%', flex: 1, minWidth: 0, overflow: 'hidden' }}
    />
  );
}
