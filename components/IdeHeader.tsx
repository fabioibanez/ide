'use client';

import { Btn } from './Btn';

export type IdeHeaderProps = {
  isRunning: boolean;
  isPaused: boolean;
  onRun: () => void;
  onStop: () => void;
  onContinue: () => void;
  onStepOver: () => void;
  onStepIn: () => void;
  onStepOut: () => void;
};

export function IdeHeader(props: IdeHeaderProps) {
  const {
    isRunning,
    isPaused,
    onRun,
    onStop,
    onContinue,
    onStepOver,
    onStepIn,
    onStepOut,
  } = props;

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>ide</h1>
      <div style={{ flex: 1 }} />
      <Btn
        label={isRunning ? 'running…' : 'run'}
        onClick={onRun}
        disabled={isRunning}
        color="#2563eb"
      />
      <Btn label="stop" onClick={onStop} disabled={!isRunning} color="#7f1d1d" />
      {isPaused && (
        <>
          <Btn label="continue" onClick={onContinue} color="#16a34a" />
          <Btn label="step over" onClick={onStepOver} color="#334155" />
          <Btn label="step in" onClick={onStepIn} color="#334155" />
          <Btn label="step out" onClick={onStepOut} color="#334155" />
        </>
      )}
    </header>
  );
}
