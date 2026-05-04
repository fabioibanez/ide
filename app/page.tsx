'use client';

import { Runtime } from '@jtrb/runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ResizableWorkspace from '@/components/ResizableWorkspace';
import { defaultCode, SOURCE_PATH } from '@/components/constants';
import type { DapResponse, DapVariable, Scope, ScopeView, StackFrame } from '@/components/dap-types';
import { IdeHeader } from '@/components/IdeHeader';
import { OutputTerminal } from '@/components/OutputTerminal';
import { VariablesPanel } from '@/components/VariablesPanel';

export default function Page() {
  const [code, setCode] = useState<string>(defaultCode);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(() => new Set());
  const [stoppedLine, setStoppedLine] = useState<number | null>(null);
  const [scopes, setScopes] = useState<ScopeView[]>([]);

  const runtimeRef = useRef<Runtime | null>(null);
  const breakpointsRef = useRef<Set<number>>(breakpoints);
  const dapSeqRef = useRef<number>(1);

  useEffect(() => {
    breakpointsRef.current = breakpoints;
  }, [breakpoints]);

  const dapSend = useCallback(<T,>(command: string, args: Record<string, unknown>) => {
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

  const toggleBreakpoint = useCallback(
    (line: number) => {
      setBreakpoints((prev) => {
        const next = new Set(prev);
        if (next.has(line)) next.delete(line);
        else next.add(line);
        return next;
      });
      if (runtimeRef.current) {
        queueMicrotask(() => sendBreakpoints());
      }
    },
    [sendBreakpoints],
  );

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
      <IdeHeader
        isRunning={isRunning}
        isStopped={isStopped}
        onRun={handleRun}
        onContinue={handleContinue}
        onStop={handleStop}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ResizableWorkspace
          panes={{
            editor: (
              <CodeEditor
                value={code}
                onChange={setCode}
                breakpoints={breakpoints}
                onToggleBreakpoint={toggleBreakpoint}
                stoppedLine={stoppedLine}
              />
            ),
            variables: (
              <VariablesPanel
                isStopped={isStopped}
                isRunning={isRunning}
                stoppedLine={stoppedLine}
                scopes={scopes}
                dapSend={dapSend}
              />
            ),
            output: <OutputTerminal output={output} />,
          }}
        />
      </div>
    </main>
  );
}
