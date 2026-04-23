import { z } from 'zod';

export const manualAttendanceSchema = z.object({
  user_id: z.string().uuid('ID employé invalide'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)'),
  status: z.enum(['present', 'late', 'absent', 'leave', 'holiday', 'day_off']),
  check_in_at: z.string().nullable().optional(),
  check_out_at: z.string().nullable().optional(),
  late_minutes: z.coerce.number().optional(),
  note: z.string().nullable().optional(),
});

export const updateAttendanceSchema = manualAttendanceSchema.partial().omit({ user_id: true, date: true });

export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
