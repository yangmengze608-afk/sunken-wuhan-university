import type { AssetRegistry } from './types';

export async function loadAssetRegistry(): Promise<AssetRegistry> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/assets.registry.json`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`资产登记加载失败：HTTP ${response.status}`);
  }

  const registry = (await response.json()) as AssetRegistry;
  if (!registry.schemaVersion || !Array.isArray(registry.assets)) {
    throw new Error('资产登记格式不完整');
  }

  return registry;
}
