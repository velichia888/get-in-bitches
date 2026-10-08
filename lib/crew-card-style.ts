import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CrewCardStyle } from '../components/GibCardAssets';

const STORAGE_KEY = 'gib.crew-card-styles.v1';

type CrewCardStyleMap = Record<string, CrewCardStyle>;

async function readMap(): Promise<CrewCardStyleMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as CrewCardStyleMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function loadCrewCardStyles(): Promise<CrewCardStyleMap> {
  return readMap();
}

export async function saveCrewCardStyle(
  crewId: string,
  style: CrewCardStyle
): Promise<void> {
  const current = await readMap();
  current[crewId] = style;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
