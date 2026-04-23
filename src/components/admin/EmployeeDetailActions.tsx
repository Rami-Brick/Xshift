'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, UserX, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import type { Profile } from '@/types';

interface Props {
  employee: Profile;
}

export function EmployeeDetailActions({ employee }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDeactivate() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const res = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur lors de la désactivation');
      setConfirming(false);
      return;
    }
    toast.success('Employé désactivé');
    router.push('/admin/employees');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleUpdated(_profile: Profile) {
    setShowEdit(false);
    router.refresh();
    toast.success('Employé mis à jour');
  }

  return (
    <>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface shadow-softer text-sm font-medium text-ink hover:bg-soft transition"
        >
          <Pencil size={14} />
          Modifier
        </button>
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface shadow-softer text-sm font-medium text-ink hover:bg-soft transition"
        >
          <KeyRound size={14} />
          Mot de passe
        </button>
        {employee.is_active && (
          <button
            type="button"
            onClick={handleDeactivate}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
              confirming
                ? 'bg-trend-down text-white'
                : 'bg-surface shadow-softer text-trend-down hover:bg-trend-down/10'
            }`}
          >
            <UserX size={14} />
            {confirming ? 'Confirmer ?' : 'Désactiver'}
          </button>
        )}
      </div>

      {showEdit && (
        <EmployeeFormDialog
          employee={employee}
          onClose={() => setShowEdit(false)}
          onSuccess={handleUpdated}
        />
      )}

      {showPassword && (
        <ChangePasswordDialog
          employeeId={employee.id}
          employeeName={employee.full_name}
          onClose={() => setShowPassword(false)}
        />
      )}
    </>
  );
}
