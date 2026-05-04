'use client';

import type { DapSendFn, ScopeView } from './dap-types';
import { VariableRow } from './VariableRow';

export function VariablesPanel(props: {
  isStopped: boolean;
  isRunning: boolean;
  stoppedLine: number | null;
  scopes: ScopeView[];
  dapSend: DapSendFn;
}) {
  const { isStopped, isRunning, stoppedLine, scopes, dapSend } = props;

  return (
    <aside
      style={{
        height: '100%',
        padding: 12,
        overflow: 'auto',
        fontSize: 12,
        boxSizing: 'border-box',
      }}
    >
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
            scope.variables.map((v) => <VariableRow key={v.name} variable={v} dapSend={dapSend} depth={0} />)
          )}
        </div>
      ))}
    </aside>
  );
}
