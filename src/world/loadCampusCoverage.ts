import type { CampusCoverageDataset } from './coverageTypes';

export async function loadCampusCoverage(): Promise<CampusCoverageDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/campus.coverage.json`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`全校园覆盖数据加载失败：HTTP ${response.status}`);
  }

  const coverage = (await response.json()) as CampusCoverageDataset;
  if (!coverage.schemaVersion || !Array.isArray(coverage.areas)) {
    throw new Error('全校园覆盖数据格式不完整');
  }

  return coverage;
}
