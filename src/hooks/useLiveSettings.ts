import { useLiveQuery } from 'dexie-react-hooks';
import { settingsRepo } from '@/db/repositories';
import type { Settings } from '@/db/schemas/settings';

export function useLiveSettings(): Settings | undefined {
  return useLiveQuery(() => settingsRepo.get(), []);
}
