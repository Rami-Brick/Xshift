import { z } from 'zod';

export const settingsSchema = z.object({
  office_name: z.string().min(1, 'Nom requis'),
  company_name: z.string().min(1, 'Nom de la société requis'),
  logo_url: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().url('URL invalide').nullable().optional(),
  ),
  office_latitude: z.coerce.number().min(-90).max(90),
  office_longitude: z.coerce.number().min(-180).max(180),
  allowed_radius_meters: z.coerce.number().min(10).max(2000),
  gps_accuracy_limit_meters: z.coerce.number().min(10).max(2000),
  grace_period_minutes: z.coerce.number().min(0).max(60),
  forgot_checkout_cutoff_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format HH:mm requis'),
  default_work_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format HH:mm requis'),
  default_work_end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format HH:mm requis'),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
