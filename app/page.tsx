'use client';

import { useCallback, useRef, useState } from 'react';

import CodeEditor from '@/components/CodeEditor';
import { defaultCode } from '@/components/constants';
import { IdeHeader } from '@/components/IdeHeader';
import ResizableWorkspace from '@/components/ResizableWorkspace';
import Terminal, { type TerminalHandle } from '@/components/Terminal';
import { VariablesPanel } from '@/components/VariablesPanel';
import { useExecution } from '@/hooks/useExecution';

export default function Page() {
  const [code, setCode] = useState<string>(defaultCode);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(() => new Set());
  const terminalRef = useRef<TerminalHandle | null>(null);
  const exec = useExecution({ terminalRef });

  const toggleBreakpoint = useCallback(
    (line: number) => {
      setBreakpoints((prev) => {
        const next = new Set(prev);
        if (next.has(line)) next.delete(line);
        else next.add(line);
        exec.applyBreakpoints(next);
        return next;
      });
    },
    [exec],
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
        isRunning={exec.isRunning}
        isPaused={exec.isPaused}
        onRun={() => void exec.run(code, breakpoints)}
        onStop={exec.stop}
        onContinue={exec.resume}
        onStepOver={exec.stepOver}
        onStepIn={exec.stepIn}
        onStepOut={exec.stepOut}
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
                stoppedLine={exec.stoppedLine}
              />
            ),
            variables: (
              <VariablesPanel
                isRunning={exec.isRunning}
                isPaused={exec.isPaused}
                debugLoading={exec.debugLoading}
                frames={exec.frames}
                selectedFrameId={exec.selectedFrameId}
                onSelectFrame={exec.selectFrame}
                scopes={exec.scopes}
                expandVariable={exec.expandVariable}
              />
            ),
            output: <Terminal ref={terminalRef} />,
          }}
        />
      </div>
    </main>
  );
}
