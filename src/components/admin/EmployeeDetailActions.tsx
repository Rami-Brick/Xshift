'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, UserX, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { canEditEmployeeWorkData, canManageEmployeeAccounts } from '@/lib/auth/roles';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import type { Profile, Role } from '@/types';

interface Props {
  employee: Profile;
  viewerRole: Role;
}

export function EmployeeDetailActions({ employee, viewerRole }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const router = useRouter();
  const canEdit = canEditEmployeeWorkData(viewerRole);
  const canManageAccounts = canManageEmployeeAccounts(viewerRole);

  async function handleDeactivateConfirm() {
    setDeactivateLoading(true);
    const res = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
    const json = await res.json();
    setDeactivateLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur lors de la désactivation');
      return;
    }
    toast.success('Employé désactivé');
    setConfirmDeactivate(false);
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
      <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto">
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface shadow-softer text-sm font-medium text-ink hover:bg-soft transition"
          >
            <Pencil size={14} />
            Modifier
          </button>
        )}
        {canManageAccounts && (
          <button
            type="button"
            onClick={() => setShowPassword(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface shadow-softer text-sm font-medium text-ink hover:bg-soft transition"
          >
            <KeyRound size={14} />
            Mot de passe
          </button>
        )}
        {canManageAccounts && employee.is_active && (
          <button
            type="button"
            onClick={() => setConfirmDeactivate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition bg-surface shadow-softer text-trend-down hover:bg-trend-down/10"
          >
            <UserX size={14} />
            Désactiver
          </button>
        )}
      </div>

      {showEdit && (
        <EmployeeFormDialog
          employee={employee}
          viewerRole={viewerRole}
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

      {confirmDeactivate && (
        <ConfirmActionDialog
          title="Désactiver cet employé ?"
          detail={employee.full_name}
          description="Le compte ne pourra plus se connecter. Les données existantes seront conservées."
          confirmLabel="Désactiver"
          loadingLabel="Désactivation..."
          loading={deactivateLoading}
          onCancel={() => setConfirmDeactivate(false)}
          onConfirm={handleDeactivateConfirm}
        />
      )}
    </>
  );
}
