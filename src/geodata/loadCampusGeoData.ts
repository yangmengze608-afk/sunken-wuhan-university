import type { CampusGeoFeatureCollection } from './types';

export async function loadCampusGeoData(): Promise<CampusGeoFeatureCollection> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/campus.geodata.geojson`, {
    headers: { Accept: 'application/geo+json, application/json' },
  });

  if (!response.ok) {
    throw new Error(`校园矢量数据加载失败：HTTP ${response.status}`);
  }

  const data = (await response.json()) as CampusGeoFeatureCollection;
  if (
    data.type !== 'FeatureCollection'
    || !data.metadata?.schemaVersion
    || data.metadata.coordinateSpace !== 'local-cartesian-meters'
    || !Array.isArray(data.features)
  ) {
    throw new Error('校园矢量数据格式不完整或坐标空间不受支持');
  }

  const featureIds = new Set<string>();
  for (const feature of data.features) {
    const featureId = feature.properties?.id;
    if (!featureId || featureIds.has(featureId)) {
      throw new Error(`校园矢量数据存在缺失或重复 ID：${featureId ?? 'unknown'}`);
    }
    featureIds.add(featureId);

    if (!feature.properties.sourceIds?.length) {
      throw new Error(`矢量要素 ${featureId} 未登记来源 ID`);
    }
  }

  return data;
}
