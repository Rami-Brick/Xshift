import { z } from 'zod';

export const dayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const dayOffChangeStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled']);

export const dayOffChangeRequestSchema = z.object({
  target: z.enum(['this_week', 'next_week']),
  new_day: dayOfWeekSchema,
  reason: z.string().max(500, 'Raison trop longue (max 500 caractères)').nullable().optional(),
});

export const employeeDayOffUpdateSchema = z.object({
  status: z.literal('cancelled').optional(),
  new_day: dayOfWeekSchema.optional(),
  reason: z.string().max(500).nullable().optional(),
});

export const adminDayOffSchema = z.object({
  user_id: z.string().uuid(),
  target: z.union([
    z.enum(['this_week', 'next_week']),
    z.object({
      iso_year: z.number().int(),
      iso_week: z.number().int().min(1).max(53),
    }),
  ]),
  new_day: dayOfWeekSchema,
  status: dayOffChangeStatusSchema.optional(),
  reason: z.string().nullable().optional(),
  admin_note: z.string().nullable().optional(),
});

export const adminDayOffUpdateSchema = z.object({
  user_id: z.string().uuid().optional(),
  iso_year: z.number().int().optional(),
  iso_week: z.number().int().min(1).max(53).optional(),
  new_day: dayOfWeekSchema.optional(),
  status: dayOffChangeStatusSchema.optional(),
  reason: z.string().nullable().optional(),
  admin_note: z.string().nullable().optional(),
});

export type DayOffChangeRequestInput = z.infer<typeof dayOffChangeRequestSchema>;
export type EmployeeDayOffUpdateInput = z.infer<typeof employeeDayOffUpdateSchema>;
export type AdminDayOffInput = z.infer<typeof adminDayOffSchema>;
export type AdminDayOffUpdateInput = z.infer<typeof adminDayOffUpdateSchema>;
