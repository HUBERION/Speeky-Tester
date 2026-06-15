import { useEffect, useState } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  integer?: boolean;
}

function isPartialNumber(text: string, integer: boolean): boolean {
  if (text === '') return true;
  return integer ? /^\d+$/.test(text) : /^\d*\.?\d*$/.test(text);
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  integer = false,
}: NumericInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    let next = Number(raw);
    if (raw.trim() === '' || Number.isNaN(next)) {
      next = min ?? value;
    }
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    if (integer) next = Math.round(next);
    onChange(next);
    setText(String(next));
  }

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        if (isPartialNumber(next, integer)) {
          setText(next);
        }
      }}
      onBlur={() => commit(text)}
    />
  );
}
