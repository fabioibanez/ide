'use client';

import { Runtime } from '@jtrb/runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import CodeEditor from './CodeEditor';

const defaultCode = `#include <stdio.h>

int main(void) {
  int x = 1;
  int y = 2;
  int z = x + y;
  printf("z=%d\\n", z);
  return 0;
}
`;

// ---------- DAP types (just what we use) ----------

type DapResponse<T = unknown> = {
  type: 'response';
  seq: number;
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: T;
};

type StackFrame = {
  id: number;
  name: string;
  line: number;
  column: number;
  source?: { path?: string };
};

type Scope = {
  name: string;
  variablesReference: number;
  expensive: boolean;
};

type DapVariable = {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
};

type ScopeView = {
  name: string;
  variables: DapVariable[];
};

const FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const FONT_SIZE = 13;
const SOURCE_PATH = '/main.c';

export default function Page() {
  const [code, setCode] = useState<string>(defaultCode);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set([4]));
  const [stoppedLine, setStoppedLine] = useState<number | null>(null);
  const [scopes, setScopes] = useState<ScopeView[]>([]);

  const runtimeRef = useRef<Runtime | null>(null);
  const breakpointsRef = useRef<Set<number>>(breakpoints);
  const dapSeqRef = useRef<number>(1);

  // Keep the live ref in sync so the `initialized` event handler can read the
  // latest breakpoints without going through React's stale-closure dance.
  useEffect(() => {
    breakpointsRef.current = breakpoints;
  }, [breakpoints]);

  // ---------- DAP helpers ----------

  const dapSend = useCallback(<T,>(command: string, args: Record<string, unknown>): DapResponse<T> | null => {
    const rt = runtimeRef.current;
    if (!rt) return null;
    const res = rt.debugger.send({
      type: 'request',
      seq: dapSeqRef.current++,
      command,
      arguments: args,
    });
    return res as DapResponse<T> | null;
  }, []);

  const sendBreakpoints = useCallback(() => {
    const lines = Array.from(breakpointsRef.current).sort((a, b) => a - b);
    dapSend('setBreakpoints', {
      source: { path: SOURCE_PATH },
      breakpoints: lines.map((line) => ({ line })),
    });
  }, [dapSend]);

  // Fetch the top frame, then its scopes, then the variables in each scope.
  // Kept simple: we only inspect the topmost frame (that's where we stopped).
  const fetchScopesForTopFrame = useCallback(async () => {
    const stackRes = dapSend<{ stackFrames: StackFrame[] }>('stackTrace', { threadId: 1 });
    const frames = stackRes?.body?.stackFrames ?? [];
    if (frames.length === 0) {
      setStoppedLine(null);
      setScopes([]);
      return;
    }
    const top = frames[0];
    setStoppedLine(top.line);

    const scopesRes = dapSend<{ scopes: Scope[] }>('scopes', { frameId: top.id });
    const scopeList = scopesRes?.body?.scopes ?? [];

    const views: ScopeView[] = [];
    for (const sc of scopeList) {
      const varsRes = dapSend<{ variables: DapVariable[] }>('variables', {
        variablesReference: sc.variablesReference,
      });
      views.push({ name: sc.name, variables: varsRes?.body?.variables ?? [] });
    }
    setScopes(views);
  }, [dapSend]);

  // ---------- Run / stop / continue ----------

  const handleRun = async () => {
    if (isRunning) return;
    setOutput('');
    setStoppedLine(null);
    setScopes([]);
    setIsStopped(false);
    setIsRunning(true);

    let rt: Runtime | null = null;
    try {
      rt = await Runtime.create('c');
      runtimeRef.current = rt;
      dapSeqRef.current = 1;

      const decoder = new TextDecoder();
      const sink = () =>
        new WritableStream<Uint8Array>({
          write: (chunk) => setOutput((prev) => prev + decoder.decode(chunk)),
        });
      void rt.stdout.pipeTo(sink()).catch(() => {});
      void rt.stderr.pipeTo(sink()).catch(() => {});

      rt.fs = { 'main.c': code };

      rt.debugger.on('event', (msg: unknown) => {
        const m = msg as { type?: string; event?: string };
        if (m?.type !== 'event') return;
        if (m.event === 'initialized') {
          sendBreakpoints();
          dapSend('setExceptionBreakpoints', { filters: [] });
          dapSend('configurationDone', {});
        } else if (m.event === 'stopped') {
          setIsStopped(true);
          void fetchScopesForTopFrame();
        } else if (m.event === 'terminated') {
          setIsStopped(false);
          setStoppedLine(null);
          setScopes([]);
        }
      });

      dapSend('initialize', {});
      await rt.run();
    } catch (err) {
      setOutput((prev) => prev + `\n[ide error] ${err instanceof Error ? err.message : String(err)}\n`);
    } finally {
      runtimeRef.current = null;
      setIsRunning(false);
      setIsStopped(false);
      setStoppedLine(null);
      setScopes([]);
    }
  };

  const handleStop = () => {
    runtimeRef.current?.stop();
  };

  const handleContinue = () => {
    if (!isStopped) return;
    dapSend('continue', { threadId: 1 });
    setIsStopped(false);
    setStoppedLine(null);
    setScopes([]);
  };

  // ---------- Breakpoints ----------

  const toggleBreakpoint = useCallback((line: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
    // If we're already running, push the new set to the runtime immediately.
    if (runtimeRef.current) {
      // Defer to next tick so breakpointsRef has been updated by the effect above.
      queueMicrotask(() => sendBreakpoints());
    }
  }, [sendBreakpoints]);

  // ---------- UI ----------

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: 16,
        gap: 12,
        boxSizing: 'border-box',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>ide</h1>

        <div style={{ flex: 1 }} />
        <Btn label={isRunning ? 'running…' : 'run'} onClick={handleRun} disabled={isRunning} color="#2563eb" />
        <Btn label="continue" onClick={handleContinue} disabled={!isStopped} color="#16a34a" />
        <Btn label="stop" onClick={handleStop} disabled={!isRunning} color="#7f1d1d" />
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>
        {/* Editor */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            minWidth: 0,
            border: '1px solid #1a1a1a',
            borderRadius: 4,
            background: '#0d0d0d',
            overflow: 'hidden',
          }}
        >
          <CodeEditor
            value={code}
            onChange={setCode}
            breakpoints={breakpoints}
            onToggleBreakpoint={toggleBreakpoint}
            stoppedLine={stoppedLine}
          />
        </div>

        {/* Variables panel */}
        <aside
          style={{
            width: 320,
            flexShrink: 0,
            background: '#0d0d0d',
            border: '1px solid #222',
            borderRadius: 4,
            padding: 12,
            overflow: 'auto',
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              color: '#888',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            variables
          </div>
          {!isStopped && (
            <div style={{ color: '#555', fontStyle: 'italic' }}>
              {isRunning ? 'running — set a breakpoint and run again to inspect' : 'not running'}
            </div>
          )}
          {isStopped && stoppedLine !== null && (
            <div style={{ color: '#fbbf24', marginBottom: 8 }}>stopped at line {stoppedLine}</div>
          )}
          {isStopped && scopes.length === 0 && (
            <div style={{ color: '#555', fontStyle: 'italic' }}>no scopes available</div>
          )}
          {scopes.map((scope) => (
            <div key={scope.name} style={{ marginBottom: 12 }}>
              <div
                style={{
                  color: '#a5b4fc',
                  fontWeight: 600,
                  marginBottom: 4,
                  fontSize: 11,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {scope.name}
              </div>
              {scope.variables.length === 0 ? (
                <div style={{ color: '#555', paddingLeft: 8 }}>(empty)</div>
              ) : (
                scope.variables.map((v) => (
                  <VariableRow key={v.name} variable={v} dapSend={dapSend} depth={0} />
                ))
              )}
            </div>
          ))}
        </aside>
      </div>

      <pre
        style={{
          margin: 0,
          padding: 12,
          height: 180,
          overflow: 'auto',
          background: '#000',
          color: '#d4d4d4',
          border: '1px solid #222',
          borderRadius: 4,
          fontFamily: FONT,
          fontSize: FONT_SIZE,
          whiteSpace: 'pre-wrap',
        }}
      >
        {output || <span style={{ color: '#555' }}>output will appear here</span>}
      </pre>
    </main>
  );
}

// ---------- Components ----------

function Btn(props: { label: string; onClick: () => void; disabled?: boolean; color: string }) {
  const { label, onClick, disabled, color } = props;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        background: disabled ? '#222' : color,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: FONT,
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}

function VariableRow(props: {
  variable: DapVariable;
  dapSend: <T,>(command: string, args: Record<string, unknown>) => DapResponse<T> | null;
  depth: number;
}) {
  const { variable, dapSend, depth } = props;
  const [expanded, setExpanded] = useState<boolean>(false);
  const [children, setChildren] = useState<DapVariable[] | null>(null);
  const expandable = variable.variablesReference > 0;

  const handleToggle = () => {
    if (!expandable) return;
    if (!expanded && children === null) {
      const res = dapSend<{ variables: DapVariable[] }>('variables', {
        variablesReference: variable.variablesReference,
      });
      setChildren(res?.body?.variables ?? []);
    }
    setExpanded((e) => !e);
  };

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          padding: '2px 4px',
          borderRadius: 2,
          cursor: expandable ? 'pointer' : 'default',
        }}
      >
        <span style={{ width: 10, color: '#666' }}>{expandable ? (expanded ? '▾' : '▸') : ''}</span>
        <span style={{ color: '#e5e5e5' }}>{variable.name}</span>
        {variable.type && <span style={{ color: '#64748b', fontSize: 10 }}>{variable.type}</span>}
        <span style={{ color: '#94a3b8', marginLeft: 'auto', textAlign: 'right' }}>{variable.value}</span>
      </div>
      {expanded && children?.map((child) => (
        <VariableRow key={child.name} variable={child} dapSend={dapSend} depth={depth + 1} />
      ))}
    </div>
  );
}
