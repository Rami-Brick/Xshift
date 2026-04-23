'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { UserPlus, ChevronRight } from 'lucide-react';
import { SearchInput } from '@/design-kit/primitives/SearchInput';
import { InitialAvatar } from '@/design-kit/primitives/InitialAvatar';
import { Chip } from '@/design-kit/primitives/Chip';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import type { Profile } from '@/types';

interface EmployeeListProps {
  initialEmployees: Profile[];
}

export function EmployeeList({ initialEmployees }: EmployeeListProps) {
  const [employees, setEmployees] = useState<Profile[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    );
  }, [employees, search]);

  function handleCreated(profile: Profile) {
    setEmployees((prev) => [profile, ...prev].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setShowForm(false);
  }

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <SearchInput
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition shrink-0"
        >
          <UserPlus size={16} />
          Nouvel employé
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">Aucun employé trouvé</p>
        ) : (
          filtered.map((emp) => (
            <Link
              key={emp.id}
              href={`/admin/employees/${emp.id}`}
              className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 shadow-softer hover:shadow-soft transition group"
            >
              <InitialAvatar name={emp.full_name} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{emp.full_name}</p>
                <p className="text-caption text-muted truncate">{emp.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!emp.is_active && <Chip variant="dark">Inactif</Chip>}
                {emp.role === 'admin' && <Chip variant="brand">Admin</Chip>}
                <ChevronRight size={16} className="text-muted group-hover:text-ink transition" />
              </div>
            </Link>
          ))
        )}
      </div>

      {showForm && (
        <EmployeeFormDialog
          onClose={() => setShowForm(false)}
          onSuccess={handleCreated}
        />
      )}
    </>
  );
}
