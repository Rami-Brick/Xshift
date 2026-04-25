import { z } from 'zod';

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url('Endpoint invalide')
    .max(2000, 'Endpoint trop long'),
  keys: z.object({
    p256dh: z
      .string()
      .min(80, 'Clé p256dh invalide')
      .max(120, 'Clé p256dh invalide'),
    auth: z
      .string()
      .min(16, 'Clé auth invalide')
      .max(40, 'Clé auth invalide'),
  }),
  device_label: z.string().max(120).nullable().optional(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint invalide').max(2000),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
