'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface MonthFilterProps {
  options: Array<{ label: string; value: string }>;
  selected: string;
}

export function MonthFilter({ options, selected }: MonthFilterProps) {
  const router = useRouter();

  function handleChange(value: string) {
    router.push(`/history?month=${value}`);
  }

  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-pill bg-surface px-4 shadow-iconBtn text-body text-ink">
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-transparent pr-1 outline-none text-ink capitalize"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="text-ink shrink-0" />
    </label>
  );
}
