import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { formatDateFull, parseInputDateToISO, todayISO } from '@/lib/utils';

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
  const pickerRef = useRef<HTMLInputElement | null>(null);

  // Maintain local text representation so user can manually type freely (e.g. "12/09/2026", "12-09-2026", "2026-09-12")
  const [inputText, setInputText] = useState(() => formatDateFull(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync with incoming value when not actively typing or if value changed from outside
  useEffect(() => {
    const formatted = formatDateFull(value);
    setInputText(formatted);
  }, [value]);

  const handleOpenPicker = () => {
    if (disabled) return;
    try {
      if (pickerRef.current && 'showPicker' in pickerRef.current) {
        (pickerRef.current as any).showPicker();
      } else {
        pickerRef.current?.focus();
      }
    } catch {
      pickerRef.current?.focus();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setInputText(newText);

    // If typed value is a valid complete date, emit onChange immediately
    const parsedIso = parseInputDateToISO(newText);
    if (parsedIso) {
      onChange(parsedIso);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsedIso = parseInputDateToISO(inputText);
    if (parsedIso) {
      onChange(parsedIso);
      setInputText(formatDateFull(parsedIso));
    } else if (!inputText.trim()) {
      onChange('');
      setInputText('');
    } else {
      // Revert to last valid value if entered text couldn't be parsed
      setInputText(formatDateFull(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const today = todayISO();
    onChange(today);
    setInputText(formatDateFull(today));
  };

  return (
    <div className={`relative flex flex-col ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
            {label}
          </label>
          <button
            type="button"
            onClick={handleTodayClick}
            disabled={disabled}
            className="text-[10px] font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 transition"
            title="Set to today's date"
          >
            Today
          </button>
        </div>
      )}
      <div
        className={`group relative flex items-center justify-between gap-1.5 rounded-xl border bg-white px-2.5 py-1.5 text-xs transition dark:bg-slate-800 ${
          isFocused ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-300 dark:border-slate-700'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        {prefix && <span className="font-semibold text-slate-400 text-[11px] shrink-0 pl-0.5">{prefix}</span>}

        {/* Editable manual text input */}
        <input
          type="text"
          value={inputText}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="DD/MM/YYYY"
          className="w-full bg-transparent font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
        />

        {/* Calendar Picker Trigger Button */}
        <div className="relative flex items-center shrink-0">
          <button
            type="button"
            onClick={handleOpenPicker}
            disabled={disabled}
            tabIndex={-1}
            title="Open calendar picker"
            className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition cursor-pointer"
          >
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
          </button>

          {/* Hidden native date input for browser calendar picker popup */}
          <input
            ref={pickerRef}
            type="date"
            value={value || ''}
            min={min}
            max={max}
            disabled={disabled}
            onChange={(e) => {
              const selectedVal = e.target.value;
              onChange(selectedVal);
              setInputText(formatDateFull(selectedVal));
            }}
            tabIndex={-1}
            className="absolute bottom-0 right-0 w-0 h-0 opacity-0 pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
