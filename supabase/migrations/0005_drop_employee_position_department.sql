-- ============================================================
-- 0005_drop_employee_position_department.sql
-- Remove unused employee profile attributes.
-- ============================================================

alter table public.profiles
  drop column if exists position,
  drop column if exists department;
