'use client';

import { useState } from 'react';
import type { DapSendFn, DapVariable } from './dap-types';

export function VariableRow(props: {
  variable: DapVariable;
  dapSend: DapSendFn;
  depth: number;
}) {
  const { variable, dapSend, depth } = props;
  const [expanded, setExpanded] = useState(false);
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
