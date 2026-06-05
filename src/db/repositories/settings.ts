import { db } from '../database';
import {
  SettingsSchema,
  SETTINGS_SINGLETON_ID,
  type Settings,
  type SettingsInput,
} from '../schemas/settings';

const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_SINGLETON_ID,
  monthlyLimit: 0,
  currency: 'MXN',
  updatedAt: new Date(0).toISOString(),
};

export const settingsRepo = {
  async getOrCreate(): Promise<Settings> {
    const existing = await db.settings.get(SETTINGS_SINGLETON_ID);
    if (existing) return existing;
    const now = new Date().toISOString();
    const fresh: Settings = {
      ...DEFAULT_SETTINGS,
      updatedAt: now,
    };
    SettingsSchema.parse(fresh);
    await db.settings.put(fresh);
    return fresh;
  },

  async get(): Promise<Settings | undefined> {
    return db.settings.get(SETTINGS_SINGLETON_ID);
  },

  async update(patch: SettingsInput): Promise<Settings> {
    const existing = await this.getOrCreate();
    const updated: Settings = {
      ...existing,
      ...patch,
      id: SETTINGS_SINGLETON_ID,
      updatedAt: new Date().toISOString(),
    };
    SettingsSchema.parse(updated);
    await db.settings.put(updated);
    return updated;
  },
};
