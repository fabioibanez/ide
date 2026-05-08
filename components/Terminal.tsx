'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';

export type TerminalHandle = {
  write: (data: string | Uint8Array) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
  /** Register a stdin handler. Returns a dispose fn. Replaces any prior handler. */
  onData: (handler: (data: string) => void) => () => void;
};

const xtermTheme = {
  background: '#000',
  foreground: '#d4d4d4',
  cursor: '#a5b4fc',
  black: '#000',
  brightBlack: '#666',
  red: '#cd3131',
  brightRed: '#f14c4c',
  green: '#0dbc79',
  brightGreen: '#23d18b',
  yellow: '#e5e510',
  brightYellow: '#f5f543',
  blue: '#2472c8',
  brightBlue: '#3b8eea',
  magenta: '#bc3fbc',
  brightMagenta: '#d670d6',
  cyan: '#11a8cd',
  brightCyan: '#29b8db',
  white: '#e5e5e5',
  brightWhite: '#fff',
};

const Terminal = forwardRef<TerminalHandle>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const dataDisposerRef = useRef<{ dispose: () => void } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      write: (d) => termRef.current?.write(d),
      writeln: (d) => termRef.current?.writeln(d),
      clear: () => termRef.current?.clear(),
      focus: () => termRef.current?.focus(),
      onData: (handler) => {
        dataDisposerRef.current?.dispose();
        const d = termRef.current?.onData(handler) ?? null;
        dataDisposerRef.current = d;
        return () => {
          d?.dispose();
          if (dataDisposerRef.current === d) dataDisposerRef.current = null;
        };
      },
    }),
    [],
  );

  // Dynamic import — xterm touches `self`, which breaks SSR.
  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);
      if (disposed || !containerRef.current) return;

      const term = new XTerm({
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.3,
        cursorBlink: true,
        cursorStyle: 'bar',
        theme: xtermTheme,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      termRef.current = term;
      fitRef.current = fit;

      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => fitRef.current?.fit());
      });
      resizeObserver.observe(containerRef.current);
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      dataDisposerRef.current?.dispose();
      dataDisposerRef.current = null;
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        padding: 8,
        boxSizing: 'border-box',
        background: '#000',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    />
  );
});

Terminal.displayName = 'Terminal';
export default Terminal;
