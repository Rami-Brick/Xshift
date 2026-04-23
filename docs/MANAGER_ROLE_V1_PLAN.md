# Plan: Add `manager` Role (Simple V1)

## Summary

Introduce a third role, `manager`, positioned between `employee` and `admin`.

`manager` is an operational supervisor role:
- can manage attendance
- can approve and assign leave/day-off
- can view employee records and edit limited work data
- can export attendance reports
- cannot manage accounts, roles, passwords, settings, or audit logs

This v1 scopes managers to all employees in the single-office system.

## Permissions

Managers can:
- access staff dashboard and team attendance views
- create and edit attendance records
- fix missed checkout / status / notes / manual attendance
- view employee detail pages
- edit employee `work_start_time`, `work_end_time`, and `leave_balance`
- approve/reject leave requests
- assign leave directly
- approve/reject day-off changes
- assign day-off changes directly
- export attendance reports

Managers cannot:
- create employees
- deactivate employees
- reset passwords
- change roles
- edit `email`, `full_name`, `is_active`, or auth data
- edit office settings / geofence / company settings
- access activity logs
- delete users

## Implementation Notes

- Extend the role enum and app types to `employee | manager | admin`.
- Add a capability-based staff guard:
  - `requireStaff()` for manager/admin
  - `requireAdmin()` for admin-only surfaces
- Route managers into the staff shell.
- Reuse the current admin shell but trim manager-only navigation/actions.
- Allow manager access to attendance, leave, day-off, employee read/detail, and reports APIs.
- Keep employee creation, password reset, account deactivation, settings, and logs admin-only.
- Add a migration extending `public.user_role` with `manager`.
