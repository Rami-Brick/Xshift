import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TEST_PASSWORD = process.env.XSHIFT_TEST_PASSWORD ?? 'Test1234!';
const OFFICE_TZ_OFFSET = '+01:00';

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  fail('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [
  {
    key: 'admin',
    email: 'admin.seed@xshift.test',
    full_name: 'Admin Test',
    phone: '+216 20 000 001',
    role: 'admin',
    work_start_time: '08:30',
    work_end_time: '17:30',
    leave_balance: 30,
    default_day_off: 'saturday',
  },
  {
    key: 'leila',
    email: 'leila.benali@xshift.test',
    full_name: 'Leila Ben Ali',
    phone: '+216 20 000 101',
    role: 'employee',
    work_start_time: '08:30',
    work_end_time: '17:30',
    leave_balance: 18,
    default_day_off: 'saturday',
  },
  {
    key: 'sami',
    email: 'sami.trabelsi@xshift.test',
    full_name: 'Sami Trabelsi',
    phone: '+216 20 000 102',
    role: 'employee',
    work_start_time: '09:00',
    work_end_time: '18:00',
    leave_balance: 11,
    default_day_off: 'sunday',
  },
  {
    key: 'nour',
    email: 'nour.mansour@xshift.test',
    full_name: 'Nour Mansour',
    phone: '+216 20 000 103',
    role: 'employee',
    work_start_time: '08:00',
    work_end_time: '16:30',
    leave_balance: 7,
    default_day_off: 'friday',
  },
  {
    key: 'yassine',
    email: 'yassine.amari@xshift.test',
    full_name: 'Yassine Amari',
    phone: '+216 20 000 104',
    role: 'employee',
    work_start_time: '10:00',
    work_end_time: '19:00',
    leave_balance: 22,
    default_day_off: 'saturday',
  },
];

const today = startOfUtcDay(new Date());
const dates = {
  minus9: ymd(addDays(today, -9)),
  minus8: ymd(addDays(today, -8)),
  minus7: ymd(addDays(today, -7)),
  minus6: ymd(addDays(today, -6)),
  minus5: ymd(addDays(today, -5)),
  minus4: ymd(addDays(today, -4)),
  minus3: ymd(addDays(today, -3)),
  minus2: ymd(addDays(today, -2)),
  yesterday: ymd(addDays(today, -1)),
  today: ymd(today),
  tomorrow: ymd(addDays(today, 1)),
  plus3: ymd(addDays(today, 3)),
  plus4: ymd(addDays(today, 4)),
  plus7: ymd(addDays(today, 7)),
  plus8: ymd(addDays(today, 8)),
};

main().catch((error) => {
  fail(error.message ?? String(error));
});

async function main() {
  console.log('Seeding Xshift test data...');

  const userByKey = {};
  for (const user of users) {
    userByKey[user.key] = await ensureAuthUser(user);
  }

  await upsertProfiles(userByKey);
  await upsertOfficeSettings(userByKey.admin.id);
  await clearSeededRows(Object.values(userByKey).map((user) => user.id));
  await seedAttendance(userByKey);
  await seedLeaveRequests(userByKey);
  await seedDayOffChanges(userByKey);
  await seedActivityLogs(userByKey);

  console.log('');
  console.log('Seed complete.');
  console.log(`Password for all seeded accounts: ${TEST_PASSWORD}`);
  for (const user of users) {
    console.log(`- ${user.role.padEnd(8)} ${user.email}`);
  }
}

async function ensureAuthUser(seedUser) {
  const existing = await findUserByEmail(seedUser.email);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: TEST_PASSWORD,
      user_metadata: { full_name: seedUser.full_name },
      app_metadata: { role: seedUser.role },
    });
    if (error) throw new Error(`Could not update auth user ${seedUser.email}: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: seedUser.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: seedUser.full_name },
    app_metadata: { role: seedUser.role },
  });

  if (error || !data.user) {
    throw new Error(`Could not create auth user ${seedUser.email}: ${error?.message ?? 'unknown error'}`);
  }

  return data.user;
}

async function findUserByEmail(email) {
  let page = 1;

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Could not list auth users: ${error.message}`);

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 100) return null;
    page += 1;
  }

  throw new Error('User lookup stopped after 1900 users. Narrow the seed script before running again.');
}

async function upsertProfiles(userByKey) {
  const rows = users.map((seedUser) => ({
    id: userByKey[seedUser.key].id,
    full_name: seedUser.full_name,
    email: seedUser.email,
    phone: seedUser.phone,
    role: seedUser.role,
    work_start_time: seedUser.work_start_time,
    work_end_time: seedUser.work_end_time,
    leave_balance: seedUser.leave_balance,
    default_day_off: seedUser.default_day_off,
    is_active: true,
  }));

  const { error } = await supabase.from('profiles').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`Could not upsert profiles: ${error.message}`);
}

async function upsertOfficeSettings(adminId) {
  const { data, error: selectError } = await supabase
    .from('office_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (selectError) throw new Error(`Could not read office settings: ${selectError.message}`);

  const settings = {
    office_name: 'Bureau principal',
    company_name: 'Xshift',
    office_latitude: 35.638218,
    office_longitude: 10.909022,
    allowed_radius_meters: 250,
    gps_accuracy_limit_meters: 300,
    grace_period_minutes: 10,
    forgot_checkout_cutoff_time: '23:00',
    default_work_start_time: '08:30',
    default_work_end_time: '17:30',
    timezone: 'Africa/Tunis',
    updated_by: adminId,
  };

  const query = data?.id
    ? supabase.from('office_settings').update(settings).eq('id', data.id)
    : supabase.from('office_settings').insert(settings);

  const { error } = await query;
  if (error) throw new Error(`Could not seed office settings: ${error.message}`);
}

async function clearSeededRows(userIds) {
  await checked(supabase.from('day_off_changes').delete().in('user_id', userIds), 'clear day-off changes');
  await checked(supabase.from('leave_requests').delete().in('user_id', userIds), 'clear leave requests');
  await checked(supabase.from('attendance').delete().in('user_id', userIds), 'clear attendance');
  await checked(supabase.from('activity_logs').delete().in('target_user_id', userIds), 'clear target activity logs');
  await checked(supabase.from('activity_logs').delete().in('actor_id', userIds), 'clear actor activity logs');
}

async function seedAttendance(userByKey) {
  const sharedDeviceId = 'seed-shared-device-001';
  const rows = [
    attendanceRow(userByKey.leila.id, dates.minus8, 'present', '08:28', '17:32', 0, 'seed-phone-leila', 'iPhone · Safari — #L101'),
    attendanceRow(userByKey.leila.id, dates.minus7, 'late', '08:58', '17:35', 28, 'seed-phone-leila', 'iPhone · Safari — #L101'),
    attendanceRow(userByKey.leila.id, dates.minus6, 'present', '08:31', '17:29', 1, 'seed-phone-leila', 'iPhone · Safari — #L101'),
    attendanceRow(userByKey.leila.id, dates.yesterday, 'present', '08:25', '17:30', 0, sharedDeviceId, 'Android · Chrome — #A3F7'),
    attendanceRow(userByKey.leila.id, dates.today, 'present', '08:29', null, 0, 'seed-laptop-leila', 'Desktop · Chrome — #D451'),

    attendanceRow(userByKey.sami.id, dates.minus8, 'present', '08:59', '18:02', 0, 'seed-phone-sami', 'Android · Chrome — #S202'),
    attendanceRow(userByKey.sami.id, dates.minus7, 'late', '09:47', '18:10', 47, 'seed-phone-sami', 'Android · Chrome — #S202'),
    attendanceRow(userByKey.sami.id, dates.yesterday, 'late', '09:31', '18:05', 31, sharedDeviceId, 'Android · Chrome — #A3F7'),
    attendanceRow(userByKey.sami.id, dates.today, 'present', '08:56', null, 0, 'seed-phone-sami', 'Android · Chrome — #S202'),

    attendanceRow(userByKey.nour.id, dates.minus8, 'present', '07:55', '16:35', 0, 'seed-phone-nour', 'iPhone · Safari — #N303'),
    attendanceRow(userByKey.nour.id, dates.minus7, 'forgot', '08:06', null, 6, 'seed-phone-nour', 'iPhone · Safari — #N303'),
    attendanceRow(userByKey.nour.id, dates.minus6, 'absent', null, null, 0, null, null),
    attendanceRow(userByKey.nour.id, dates.today, 'leave', null, null, 0, null, null),

    attendanceRow(userByKey.yassine.id, dates.minus8, 'present', '09:58', '19:01', 0, 'seed-phone-yassine', 'Android · Firefox — #Y404'),
    attendanceRow(userByKey.yassine.id, dates.minus7, 'holiday', null, null, 0, null, null),
    attendanceRow(userByKey.yassine.id, dates.minus6, 'day_off', null, null, 0, null, null),
    attendanceRow(userByKey.yassine.id, dates.today, 'absent', null, null, 0, null, null),
  ];

  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'user_id,date' });
  if (error) throw new Error(`Could not seed attendance: ${error.message}`);
}

function attendanceRow(userId, date, status, checkIn, checkOut, lateMinutes, deviceId, deviceLabel) {
  const normalizedStatus = status === 'forgot' ? 'late' : status;
  return {
    user_id: userId,
    date,
    check_in_at: checkIn ? at(date, checkIn) : null,
    check_out_at: checkOut ? at(date, checkOut) : null,
    status: normalizedStatus,
    late_minutes: lateMinutes,
    forgot_checkout: status === 'forgot',
    check_in_latitude: checkIn ? 35.638218 : null,
    check_in_longitude: checkIn ? 10.909022 : null,
    check_in_accuracy_meters: checkIn ? 42 : null,
    check_out_latitude: checkOut ? 35.6382 : null,
    check_out_longitude: checkOut ? 10.909 : null,
    check_out_accuracy_meters: checkOut ? 38 : null,
    check_in_distance_meters: checkIn ? 12 : null,
    check_out_distance_meters: checkOut ? 10 : null,
    device_id: deviceId,
    device_label: deviceLabel,
    note: status === 'forgot' ? 'Seed: checkout oublié' : null,
  };
}

async function seedLeaveRequests(userByKey) {
  const rows = [
    {
      user_id: userByKey.leila.id,
      start_date: dates.plus7,
      end_date: dates.plus8,
      type: 'annual',
      status: 'pending',
      reason: 'Voyage familial',
      deduct_balance: true,
      requested_by: null,
    },
    {
      user_id: userByKey.sami.id,
      start_date: dates.minus5,
      end_date: dates.minus4,
      type: 'sick',
      status: 'approved',
      reason: 'Certificat médical',
      admin_note: 'Validé pour test',
      deduct_balance: false,
      requested_by: userByKey.sami.id,
      reviewed_by: userByKey.admin.id,
      reviewed_at: at(dates.minus6, '14:00'),
    },
    {
      user_id: userByKey.nour.id,
      start_date: dates.today,
      end_date: dates.today,
      type: 'annual',
      status: 'approved',
      reason: 'Demi-journée personnelle',
      admin_note: 'Seed: congé approuvé',
      deduct_balance: true,
      requested_by: userByKey.nour.id,
      reviewed_by: userByKey.admin.id,
      reviewed_at: at(dates.yesterday, '15:20'),
    },
    {
      user_id: userByKey.yassine.id,
      start_date: dates.plus3,
      end_date: dates.plus4,
      type: 'unpaid',
      status: 'rejected',
      reason: 'Rendez-vous personnel',
      admin_note: 'Effectif insuffisant',
      deduct_balance: false,
      requested_by: userByKey.yassine.id,
      reviewed_by: userByKey.admin.id,
      reviewed_at: at(dates.yesterday, '16:10'),
    },
  ];

  const { error } = await supabase.from('leave_requests').insert(rows);
  if (error) throw new Error(`Could not seed leave requests: ${error.message}`);
}

async function seedDayOffChanges(userByKey) {
  const thisWeek = isoWeek(today);
  const nextWeek = isoWeek(addDays(today, 7));

  const rows = [
    {
      user_id: userByKey.leila.id,
      iso_year: nextWeek.year,
      iso_week: nextWeek.week,
      old_day: 'saturday',
      new_day: 'friday',
      status: 'pending',
      reason: 'Besoin de vendredi libre',
      requested_by: userByKey.leila.id,
    },
    {
      user_id: userByKey.sami.id,
      iso_year: thisWeek.year,
      iso_week: thisWeek.week,
      old_day: 'sunday',
      new_day: 'tuesday',
      status: 'approved',
      reason: 'Permutation validée',
      admin_note: 'Seed: approuvé',
      requested_by: userByKey.sami.id,
      reviewed_by: userByKey.admin.id,
      reviewed_at: at(dates.minus2, '11:30'),
    },
    {
      user_id: userByKey.yassine.id,
      iso_year: nextWeek.year,
      iso_week: nextWeek.week,
      old_day: 'saturday',
      new_day: 'monday',
      status: 'rejected',
      reason: 'Demande test',
      admin_note: 'Non validé pour test',
      requested_by: userByKey.yassine.id,
      reviewed_by: userByKey.admin.id,
      reviewed_at: at(dates.yesterday, '10:30'),
    },
  ];

  const { error } = await supabase.from('day_off_changes').insert(rows);
  if (error) throw new Error(`Could not seed day-off changes: ${error.message}`);
}

async function seedActivityLogs(userByKey) {
  const rows = [
    {
      actor_id: userByKey.admin.id,
      action: 'create_employee',
      target_user_id: userByKey.leila.id,
      details: { seed: true, email: 'leila.benali@xshift.test' },
    },
    {
      actor_id: userByKey.admin.id,
      action: 'create_employee',
      target_user_id: userByKey.sami.id,
      details: { seed: true, email: 'sami.trabelsi@xshift.test' },
    },
    {
      actor_id: userByKey.leila.id,
      action: 'checkin',
      target_user_id: userByKey.leila.id,
      details: { seed: true, date: dates.today, device: 'Desktop · Chrome — #D451' },
    },
    {
      actor_id: userByKey.sami.id,
      action: 'request_leave',
      target_user_id: userByKey.sami.id,
      details: { seed: true, type: 'sick' },
    },
    {
      actor_id: userByKey.admin.id,
      action: 'approve_leave',
      target_user_id: userByKey.nour.id,
      details: { seed: true, date: dates.today },
    },
  ];

  const { error } = await supabase.from('activity_logs').insert(rows);
  if (error) throw new Error(`Could not seed activity logs: ${error.message}`);
}

async function checked(query, label) {
  const { error } = await query;
  if (error) throw new Error(`Could not ${label}: ${error.message}`);
}

function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function at(date, time) {
  return `${date}T${time}:00${OFFICE_TZ_OFFSET}`;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function fail(message) {
  console.error(`Seed failed: ${message}`);
  process.exit(1);
}
