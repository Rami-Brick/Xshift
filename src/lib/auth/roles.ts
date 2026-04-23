import type { Role } from '@/types';

export function isStaffRole(role: Role): role is 'manager' | 'admin' {
  return role === 'manager' || role === 'admin';
}

export function homePathForRole(role: Role): '/dashboard' | '/admin/dashboard' {
  return isStaffRole(role) ? '/admin/dashboard' : '/dashboard';
}

export function canCreateEmployees(role: Role): boolean {
  return role === 'admin';
}

export function canManageEmployeeAccounts(role: Role): boolean {
  return role === 'admin';
}

export function canEditEmployeeWorkData(role: Role): boolean {
  return isStaffRole(role);
}

export function canManageAttendance(role: Role): boolean {
  return isStaffRole(role);
}

export function canDeleteAttendance(role: Role): boolean {
  return role === 'admin';
}

export function canManageLeave(role: Role): boolean {
  return isStaffRole(role);
}

export function canDeleteLeave(role: Role): boolean {
  return role === 'admin';
}

export function canManageDayOff(role: Role): boolean {
  return isStaffRole(role);
}

export function canDeleteDayOff(role: Role): boolean {
  return role === 'admin';
}

export function canAccessReports(role: Role): boolean {
  return isStaffRole(role);
}

export function canAccessSettings(role: Role): boolean {
  return role === 'admin';
}

export function canAccessLogs(role: Role): boolean {
  return role === 'admin';
}

export function staffRoleLabel(role: Role): string {
  return role === 'manager' ? 'Manager' : 'Administrateur';
}
