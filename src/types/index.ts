export type Role = 'employee' | 'admin';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday';

export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ActivityAction =
  | 'checkin'
  | 'checkout'
  | 'create_employee'
  | 'update_employee'
  | 'deactivate_employee'
  | 'update_attendance'
  | 'manual_attendance'
  | 'delete_attendance'
  | 'request_leave'
  | 'approve_leave'
  | 'reject_leave'
  | 'cancel_leave'
  | 'assign_leave'
  | 'update_leave'
  | 'delete_leave'
  | 'update_settings'
  | 'login';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: Role;
  work_start_time: string;
  work_end_time: string;
  leave_balance: number;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: AttendanceStatus;
  late_minutes: number;
  forgot_checkout: boolean;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_accuracy_meters: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy_meters: number | null;
  check_in_distance_meters: number | null;
  check_out_distance_meters: number | null;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: LeaveType;
  status: LeaveStatus;
  reason: string | null;
  admin_note: string | null;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  deduct_balance: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface OfficeSettings {
  id: string;
  office_name: string;
  company_name: string;
  logo_url: string | null;
  office_latitude: number;
  office_longitude: number;
  allowed_radius_meters: number;
  gps_accuracy_limit_meters: number;
  grace_period_minutes: number;
  forgot_checkout_cutoff_time: string;
  default_work_start_time: string;
  default_work_end_time: string;
  timezone: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: ActivityAction;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
  target?: Profile;
}
