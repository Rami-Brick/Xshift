-- ============================================================
-- 0002_seed.sql — Initial office settings row
-- Run this after 0001_init.sql.
-- Update the latitude/longitude from the admin settings page
-- once the app is running.
-- ============================================================

insert into public.office_settings (
  office_name,
  company_name,
  office_latitude,
  office_longitude,
  allowed_radius_meters,
  gps_accuracy_limit_meters,
  grace_period_minutes,
  forgot_checkout_cutoff_time,
  default_work_start_time,
  default_work_end_time,
  timezone
) values (
  'Bureau principal',
  'Xshift',
  36.8190,   -- Tunis placeholder — update via admin settings
  10.1658,   -- Tunis placeholder — update via admin settings
  200,
  100,
  10,
  '23:00',
  '08:30',
  '17:30',
  'Africa/Tunis'
);
