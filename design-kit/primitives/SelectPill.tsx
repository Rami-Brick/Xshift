import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SelectPillProps {
  value: string;
  options?: string[];
  onChange?: (value: string) => void;
  className?: string;
  leftAdornment?: React.ReactNode;
}

export function SelectPill({ value, options, onChange, className, leftAdornment }: SelectPillProps) {
  if (options && options.length > 0) {
    return (
      <label
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-pill bg-surface px-4 shadow-iconBtn text-body text-ink',
          className
        )}
      >
        {leftAdornment}
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="appearance-none bg-transparent pr-1 outline-none text-ink"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="text-ink" />
      </label>
    );
  }
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-pill bg-surface px-4 shadow-iconBtn text-body text-ink',
        className
      )}
    >
      {leftAdornment}
      <span className="flex-1 text-left">{value}</span>
      <ChevronDown size={16} className="text-ink" />
    </button>
  );
}
