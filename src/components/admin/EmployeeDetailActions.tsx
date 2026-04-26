'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Pencil, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { canEditEmployeeWorkData, canManageEmployeeAccounts } from '@/lib/auth/roles';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import type { Profile, Role } from '@/types';

interface Props {
  employee: Profile;
  viewerRole: Role;
  viewerId: string;
}

export function EmployeeDetailActions({ employee, viewerRole, viewerId }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();
  const canEdit = canEditEmployeeWorkData(viewerRole);
  const canManageAccounts = canManageEmployeeAccounts(viewerRole);
  const canManageThisAccount = canManageAccounts && employee.id !== viewerId;

  async function handleDeactivateConfirm() {
    setDeactivateLoading(true);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
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

  async function handleDeleteConfirm(confirmationValue?: string) {
    setDeleteLoading(true);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: confirmationValue }),
    });
    const json = await res.json();
    setDeleteLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur lors de la suppression');
      return;
    }
    toast.success('Employé supprimé');
    setConfirmDelete(false);
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
        {canManageThisAccount && employee.is_active && (
          <button
            type="button"
            onClick={() => setConfirmDeactivate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition bg-surface shadow-softer text-trend-down hover:bg-trend-down/10"
          >
            <UserX size={14} />
            Désactiver
          </button>
        )}
        {canManageThisAccount && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition bg-trend-down text-white shadow-softer hover:opacity-90"
          >
            <Trash2 size={14} />
            Supprimer
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

      {confirmDelete && (
        <ConfirmActionDialog
          title="Supprimer définitivement cet employé ?"
          detail={employee.full_name}
          description="Cette suppression est définitive : le compte Auth, le profil, les présences, les congés, les jours de repos et les abonnements push de cet employé seront supprimés. Les journaux d'activité existants seront conservés sans lien vers ce profil."
          confirmLabel="Supprimer"
          loadingLabel="Suppression..."
          loading={deleteLoading}
          confirmationPhrase={employee.full_name}
          confirmationLabel={`Tapez "${employee.full_name}" pour confirmer`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
