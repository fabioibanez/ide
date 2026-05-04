'use client';

import { FONT, FONT_SIZE } from './constants';

export function OutputTerminal(props: { output: string }) {
  const { output } = props;
  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'auto',
        background: '#000',
        color: '#d4d4d4',
        fontFamily: FONT,
        fontSize: FONT_SIZE,
        whiteSpace: 'pre-wrap',
        flex: 1,
        minHeight: 0,
      }}
    >
      {output || <span style={{ color: '#555' }}>output will appear here</span>}
    </pre>
  );
}
