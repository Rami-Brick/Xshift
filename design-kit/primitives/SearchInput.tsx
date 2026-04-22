import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'pill' | 'icon';
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { variant = 'pill', className, placeholder = 'Search', ...rest },
  ref
) {
  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-label={placeholder}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-iconBtn text-ink',
          className
        )}
        onClick={() => ref && typeof ref !== 'function' && ref.current?.focus()}
      >
        <Search size={18} strokeWidth={2} />
      </button>
    );
  }
  return (
    <label
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-pill bg-surface px-3 shadow-iconBtn',
        className
      )}
    >
      <Search size={16} strokeWidth={2} className="text-muted" />
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        className="flex-1 bg-transparent text-body text-ink placeholder:text-muted outline-none"
        {...rest}
      />
    </label>
  );
});
