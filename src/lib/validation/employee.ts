import { z } from 'zod';

export const createEmployeeSchema = z.object({
  full_name: z.string().min(2, 'Nom requis (min. 2 caractères)'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe requis (min. 6 caractères)'),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  work_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis')
    .optional(),
  work_end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis')
    .optional(),
  leave_balance: z.coerce.number().min(0).max(365).optional(),
  role: z.enum(['employee', 'admin']).optional(),
});

export const updateEmployeeSchema = z.object({
  full_name: z.string().min(2, 'Nom requis (min. 2 caractères)').optional(),
  phone: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  work_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis')
    .optional(),
  work_end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis')
    .optional(),
  leave_balance: z.coerce.number().min(0).max(365).optional(),
  role: z.enum(['employee', 'admin']).optional(),
  is_active: z.boolean().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
