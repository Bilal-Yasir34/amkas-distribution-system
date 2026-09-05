import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DateInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  prefix?: string;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export function DateInput({
  value,
  onChange,
  label,
  prefix,
  className = '',
  containerClassName = '',
  disabled = false,
  min,
  max,
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const formattedDisplay = formatDate(value);

  const handleOpenPicker = () => {
    if (disabled) return;
    try {
      if (inputRef.current && 'showPicker' in inputRef.current) {
        (inputRef.current as any).showPicker();
      } else {
        inputRef.current?.focus();
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`relative flex flex-col ${containerClassName}`}>
      {label && (
        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono mb-1">
          {label}
        </label>
      )}
      <div
        onClick={handleOpenPicker}
        className={`group relative flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs transition cursor-pointer dark:border-slate-700 dark:bg-slate-800 hover:border-amber-500 ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {prefix && <span className="font-semibold text-slate-400 text-[11px] shrink-0">{prefix}</span>}
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tracking-tight">
            {formattedDisplay !== '—' ? formattedDisplay : 'DD/MM/YY'}
          </span>
        </div>
        <Calendar className="h-3.5 w-3.5 text-amber-500 group-hover:scale-110 transition shrink-0 ml-1" />

        {/* Hidden/overlay native date input for maximum browser compatibility */}
        <input
          ref={inputRef}
          type="date"
          value={value || ''}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}
