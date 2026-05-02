'use client';

import { Runtime } from '@jtrb/runtime';
import { useRef, useState } from 'react';

const defaultCode = `#include <stdio.h>

int main(void) {
  printf("Hello from @jtrb/runtime!\\n");
  return 0;
}
`;

export default function Page() {
  const [code, setCode] = useState<string>(defaultCode);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const runtimeRef = useRef<Runtime | null>(null);

  const appendOutput = (chunk: string) => {
    setOutput((prev) => prev + chunk);
  };

  const handleRun = async () => {
    if (isRunning) return;
    setOutput('');
    setIsRunning(true);

    let rt: Runtime | null = null;
    try {
      rt = await Runtime.create('c');
      runtimeRef.current = rt;

      const decoder = new TextDecoder();
      const sink = (label: string) =>
        new WritableStream<Uint8Array>({
          write: (chunk) => {
            void label;
            appendOutput(decoder.decode(chunk));
          },
        });
      void rt.stdout.pipeTo(sink('stdout')).catch(() => {});
      void rt.stderr.pipeTo(sink('stderr')).catch(() => {});

      rt.fs = { 'main.c': code };

      // DAP handshake — the worker blocks until configurationDone is sent
      // after the `initialized` event arrives. Skipping this hangs rt.run().
      let dapSeq = 1;
      const dapSend = (command: string, args: Record<string, unknown>) => {
        if (!rt) return;
        rt.debugger.send({ type: 'request', seq: dapSeq++, command, arguments: args });
      };

      rt.debugger.on('event', (msg: unknown) => {
        const m = msg as { type?: string; event?: string };
        if (m?.type === 'event' && m?.event === 'initialized') {
          dapSend('setBreakpoints', { source: { path: '/main.c' }, breakpoints: [] });
          dapSend('setExceptionBreakpoints', { filters: [] });
          dapSend('configurationDone', {});
        }
      });

      dapSend('initialize', {});
      await rt.run();
    } catch (err) {
      appendOutput(`\n[ide error] ${err instanceof Error ? err.message : String(err)}\n`);
    } finally {
      runtimeRef.current = null;
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    runtimeRef.current?.stop();
  };

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
        <span style={{ fontSize: 12, color: '#888' }}>@jtrb/runtime playground</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleRun}
          disabled={isRunning}
          style={{
            padding: '6px 14px',
            background: isRunning ? '#333' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
          }}
        >
          {isRunning ? 'running…' : 'run'}
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          style={{
            padding: '6px 14px',
            background: !isRunning ? '#222' : '#7f1d1d',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: !isRunning ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
          }}
        >
          stop
        </button>
      </header>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1,
          minHeight: 200,
          padding: 12,
          background: '#111',
          color: '#e5e5e5',
          border: '1px solid #222',
          borderRadius: 4,
          fontFamily: 'inherit',
          fontSize: 13,
          lineHeight: 1.5,
          resize: 'none',
          outline: 'none',
        }}
      />

      <pre
        style={{
          margin: 0,
          padding: 12,
          height: 220,
          overflow: 'auto',
          background: '#000',
          color: '#d4d4d4',
          border: '1px solid #222',
          borderRadius: 4,
          fontFamily: 'inherit',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
        }}
      >
        {output || <span style={{ color: '#555' }}>output will appear here</span>}
      </pre>
    </main>
  );
}
