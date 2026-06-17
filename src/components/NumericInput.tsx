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

function clamp(
  value: number,
  min?: number,
  max?: number,
  integer?: boolean,
): number {
  let next = value;
  if (integer) next = Math.round(next);
  if (min != null) next = Math.max(min, next);
  if (max != null) next = Math.min(max, next);
  return next;
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  integer = false,
}: NumericInputProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(String(value));
    }
  }, [value, focused]);

  function commit(raw: string) {
    let next = Number(raw);
    if (raw.trim() === '' || Number.isNaN(next)) {
      next = min ?? value;
    }
    next = clamp(next, min, max, integer);
    onChange(next);
    setText(String(next));
  }

  function handleChange(raw: string) {
    if (raw === '') {
      setText('');
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    setText(raw);
    onChange(clamp(num, min, max, integer));
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit(text);
      }}
    />
  );
}
