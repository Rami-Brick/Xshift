import { z } from 'zod';

export const leaveRequestSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  type: z.enum(['annual', 'sick', 'unpaid', 'other']),
  reason: z.string().nullable().optional(),
});

export const adminLeaveSchema = z.object({
  user_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  type: z.enum(['annual', 'sick', 'unpaid', 'other']),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  reason: z.string().nullable().optional(),
  admin_note: z.string().nullable().optional(),
  deduct_balance: z.boolean().optional(),
});

export const reviewLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected', 'cancelled']),
  admin_note: z.string().nullable().optional(),
  deduct_balance: z.boolean().optional(),
});

export const adminLeaveUpdateSchema = adminLeaveSchema.partial();
export const employeeLeaveUpdateSchema = leaveRequestSchema;

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type AdminLeaveInput = z.infer<typeof adminLeaveSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
export type AdminLeaveUpdateInput = z.infer<typeof adminLeaveUpdateSchema>;
export type EmployeeLeaveUpdateInput = z.infer<typeof employeeLeaveUpdateSchema>;
