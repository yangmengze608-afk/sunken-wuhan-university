import type { CampusDataset } from './types';

export async function loadCampusDataset(): Promise<CampusDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/campus.masterplan.json`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`校园数据加载失败：HTTP ${response.status}`);
  }

  const dataset = (await response.json()) as CampusDataset;

  if (!dataset.schemaVersion || !Array.isArray(dataset.zones) || !Array.isArray(dataset.places)) {
    throw new Error('校园数据格式不完整');
  }

  return dataset;
}
