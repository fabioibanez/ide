'use client';

import { useState } from 'react';

import type { DapVariable } from './dap-types';

export type VariableRowProps = {
  variable: DapVariable;
  expand: (variablesReference: number) => DapVariable[];
  depth: number;
};

export function VariableRow({ variable, expand, depth }: VariableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DapVariable[] | null>(null);
  const expandable = variable.variablesReference > 0;

  const toggle = () => {
    if (!expandable) return;
    if (!expanded && children === null) {
      setChildren(expand(variable.variablesReference));
    }
    setExpanded((e) => !e);
  };

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          padding: '2px 4px',
          borderRadius: 2,
          cursor: expandable ? 'pointer' : 'default',
        }}
      >
        <span style={{ width: 10, color: '#666' }}>
          {expandable ? (expanded ? '▾' : '▸') : ''}
        </span>
        <span style={{ color: '#e5e5e5' }}>{variable.name}</span>
        {variable.type && (
          <span style={{ color: '#64748b', fontSize: 10 }}>{variable.type}</span>
        )}
        <span style={{ color: '#94a3b8', marginLeft: 'auto', textAlign: 'right' }}>
          {variable.value}
        </span>
      </div>
      {expanded &&
        children?.map((child) => (
          <VariableRow key={child.name} variable={child} expand={expand} depth={depth + 1} />
        ))}
    </div>
  );
}
