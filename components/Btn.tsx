'use client';

import { FONT } from './constants';

export function Btn(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
}) {
  const { label, onClick, disabled, color } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        background: disabled ? '#222' : color,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: FONT,
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}
