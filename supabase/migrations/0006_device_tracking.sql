alter table public.attendance
  add column if not exists device_id text,
  add column if not exists device_label text;
