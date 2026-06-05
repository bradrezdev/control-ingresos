import { z } from 'zod';

export const SETTINGS_SINGLETON_ID = 'singleton' as const;

export const SettingsSchema = z.object({
  id: z.literal(SETTINGS_SINGLETON_ID),
  monthlyLimit: z.number().nonnegative(),
  currency: z.string().length(3).default('MXN'),
  updatedAt: z.iso.datetime(),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsInput = Omit<Settings, 'id' | 'updatedAt'>;
