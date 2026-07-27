export type FidelityLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface FidelityRecord {
  placeId: string;
  currentLevel: FidelityLevel;
  targetLevel: FidelityLevel;
  status: string;
  verifiedElements: string[];
  estimatedElements: string[];
  requiredForNextLevel: string[];
  currentImplementation: string;
  errorRecord?: string[];
  measurementSourceIds?: string[];
}

export interface FidelityRegistry {
  schemaVersion: string;
  levelPolicyZh: Record<FidelityLevel, string>;
  levelPolicyEn: Record<FidelityLevel, string>;
  records: FidelityRecord[];
}

export async function loadFidelityRegistry(): Promise<FidelityRegistry> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/fidelity.registry.json`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`精度登记表加载失败：HTTP ${response.status}`);
  }
  const registry = (await response.json()) as FidelityRegistry;
  if (!registry.schemaVersion || !Array.isArray(registry.records)) {
    throw new Error('精度登记表格式不完整');
  }
  return registry;
}
