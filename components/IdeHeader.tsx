'use client';

import { Btn } from './Btn';

export function IdeHeader(props: {
  isRunning: boolean;
  isStopped: boolean;
  onRun: () => void;
  onContinue: () => void;
  onStop: () => void;
}) {
  const { isRunning, isStopped, onRun, onContinue, onStop } = props;

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>ide</h1>
      <div style={{ flex: 1 }} />
      <Btn label={isRunning ? 'running…' : 'run'} onClick={onRun} disabled={isRunning} color="#2563eb" />
      <Btn label="continue" onClick={onContinue} disabled={!isStopped} color="#16a34a" />
      <Btn label="stop" onClick={onStop} disabled={!isRunning} color="#7f1d1d" />
    </header>
  );
}
