-- Drop phone column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS phone;

-- Update default values for work times and leave balance
ALTER TABLE profiles ALTER COLUMN work_start_time SET DEFAULT '09:00';
ALTER TABLE profiles ALTER COLUMN work_end_time SET DEFAULT '18:00';
ALTER TABLE profiles ALTER COLUMN leave_balance SET DEFAULT 30;
