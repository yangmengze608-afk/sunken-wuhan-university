import type { WholeCampusLayout } from './types';

export async function loadWorldLayout(): Promise<WholeCampusLayout> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/world.layout.json`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`完整校园总图加载失败：HTTP ${response.status}`);
  }

  const layout = (await response.json()) as WholeCampusLayout;
  if (!layout.schemaVersion || !layout.worldId || !layout.bounds || !Array.isArray(layout.roads)) {
    throw new Error('完整校园总图格式不完整');
  }

  if (layout.bounds.minX >= layout.bounds.maxX || layout.bounds.minZ >= layout.bounds.maxZ) {
    throw new Error('完整校园总图边界无效');
  }

  return layout;
}
