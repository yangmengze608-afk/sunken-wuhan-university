import './styles.css';
import { loadAssetRegistry } from './assets/loadAssetRegistry';
import { loadCampusDataset } from './data/loadCampus';
import { loadSourceRegistry } from './data/sourceRegistry';
import type { AccuracyLevel, CampusPlace, ReconstructionStatus, SourceStatus } from './data/types';
import { loadCampusGeoData } from './geodata/loadCampusGeoData';
import type { CampusGeoFeatureCollection } from './geodata/types';
import { CampusViewer } from './viewer/CampusViewer';
import { loadCampusCoverage } from './world/loadCampusCoverage';
import { loadWorldLayout } from './world/loadWorldLayout';
import type { WholeCampusLayout } from './world/types';

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`V2 页面缺少必要节点：${selector}`);
  }
  return element;
}

function geoCoordinates(data: CampusGeoFeatureCollection): [number, number][] {
  const coordinates: [number, number][] = [];
  for (const feature of data.features) {
    if (feature.geometry.type === 'Point') {
      coordinates.push(feature.geometry.coordinates);
    } else if (feature.geometry.type === 'LineString') {
      coordinates.push(...feature.geometry.coordinates);
    } else {
      for (const ring of feature.geometry.coordinates) {
        coordinates.push(...ring);
      }
    }
  }
  return coordinates;
}

function validateGeoBounds(data: CampusGeoFeatureCollection, layout: WholeCampusLayout): void {
  const outside = geoCoordinates(data).filter(([x, z]) => (
    x < layout.bounds.minX
    || x > layout.bounds.maxX
    || z < layout.bounds.minZ
    || z > layout.bounds.maxZ
  ));
  if (outside.length > 0) {
    throw new Error(`校园矢量数据有 ${outside.length} 个坐标点超出完整世界边界`);
  }
}

const viewport = requireElement<HTMLElement>('#viewport');
const status = requireElement<HTMLElement>('#dataset-status');
const placeList = requireElement<HTMLElement>('#place-list');
const detail = requireElement<HTMLElement>('#place-detail');

const accuracyLabels: Record<AccuracyLevel, string> = {
  placeholder: '工程占位',
  estimated: '资料推算',
  verified: '已核验',
};

const reconstructionLabels: Record<ReconstructionStatus, string> = {
  planned: '待建',
  placeholder: '占位体',
  blockout: '体块阶段',
  detailed: '精细建模',
  final: '最终资产',
};

const sourceLabels: Record<SourceStatus, string> = {
  missing: '缺少资料',
  collecting: '资料收集中',
  'partially-verified': '部分核验',
  verified: '资料已核验',
};

function renderDetail(place: CampusPlace): void {
  detail.innerHTML = `
    <p class="detail-kicker">PRIORITY ${place.priority} · ${place.category}</p>
    <h2>${place.nameZh}</h2>
    <h3>${place.nameEn}</h3>
    <p>${place.notesZh}</p>
    <p>${place.notesEn}</p>
    <div class="detail-grid">
      <div><span>坐标可信度</span><b>${accuracyLabels[place.coordinateAccuracy]}</b></div>
      <div><span>模型状态</span><b>${reconstructionLabels[place.reconstructionStatus]}</b></div>
      <div><span>资料状态</span><b>${sourceLabels[place.sourceStatus]}</b></div>
      <div><span>资产绑定</span><b>${place.assetId ?? '尚未绑定'}</b></div>
    </div>
  `;
}

async function start(): Promise<void> {
  try {
    const [dataset, assetRegistry, sourceRegistry, worldLayout, coverage, geoData] = await Promise.all([
      loadCampusDataset(),
      loadAssetRegistry(),
      loadSourceRegistry(),
      loadWorldLayout(),
      loadCampusCoverage(),
      loadCampusGeoData(),
    ]);

    const assetIds = new Set(assetRegistry.assets.map((asset) => asset.id));
    const missingAssetBindings = dataset.places.filter(
      (place) => place.assetId !== null && !assetIds.has(place.assetId),
    );
    if (missingAssetBindings.length > 0) {
      throw new Error(`存在 ${missingAssetBindings.length} 个无效资产绑定`);
    }

    const sourceIds = new Set(sourceRegistry.records.map((source) => source.id));
    const missingGeoSources = geoData.features.flatMap((feature) => (
      feature.properties.sourceIds.filter((sourceId) => !sourceIds.has(sourceId))
    ));
    if (missingGeoSources.length > 0) {
      throw new Error(`校园矢量数据引用了 ${missingGeoSources.length} 个未登记来源`);
    }

    const placesOutsideWorld = dataset.places.filter(
      (place) => place.position.x < worldLayout.bounds.minX
        || place.position.x > worldLayout.bounds.maxX
        || place.position.z < worldLayout.bounds.minZ
        || place.position.z > worldLayout.bounds.maxZ,
    );
    if (placesOutsideWorld.length > 0) {
      throw new Error(`存在 ${placesOutsideWorld.length} 个地点超出完整校园边界`);
    }

    const coverageOutsideWorld = coverage.areas.filter((area) => {
      const halfWidth = area.size.width / 2;
      const halfDepth = area.size.depth / 2;
      return area.center.x - halfWidth < worldLayout.bounds.minX
        || area.center.x + halfWidth > worldLayout.bounds.maxX
        || area.center.z - halfDepth < worldLayout.bounds.minZ
        || area.center.z + halfDepth > worldLayout.bounds.maxZ;
    });
    if (coverageOutsideWorld.length > 0) {
      throw new Error(`存在 ${coverageOutsideWorld.length} 个校园覆盖区超出完整世界边界`);
    }
    validateGeoBounds(geoData, worldLayout);

    const viewer = new CampusViewer(viewport, dataset, worldLayout, coverage, geoData, (place) => {
      renderDetail(place);
      for (const button of placeList.querySelectorAll<HTMLButtonElement>('.place-button')) {
        button.setAttribute('aria-current', String(button.dataset.placeId === place.id));
      }
    });

    const orderedPlaces = [...dataset.places].sort((a, b) => a.priority - b.priority);
    for (const place of orderedPlaces) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'place-button';
      button.dataset.placeId = place.id;
      button.setAttribute('aria-current', 'false');
      button.innerHTML = `
        <strong>${place.nameZh}</strong>
        <small>${place.nameEn} · ${reconstructionLabels[place.reconstructionStatus]}</small>
        <span class="priority">P${place.priority}</span>
      `;
      button.addEventListener('click', () => viewer.focusPlace(place.id));
      placeList.appendChild(button);
    }

    const worldWidth = worldLayout.bounds.maxX - worldLayout.bounds.minX;
    const worldDepth = worldLayout.bounds.maxZ - worldLayout.bounds.minZ;
    const blockoutCount = coverage.areas.reduce((total, area) => total + area.blockCount, 0);
    const polygonCount = geoData.features.filter((feature) => feature.geometry.type === 'Polygon').length;
    const routeCount = geoData.features.filter((feature) => feature.geometry.type === 'LineString').length;
    status.textContent = `连续校园 ${worldWidth}×${worldDepth}m · ${blockoutCount} 个背景粗模 · ${polygonCount} 个矢量场地/建筑轮廓 · ${routeCount} 条矢量路线`;
    detail.innerHTML = `
      <p class="detail-kicker">GEODATA PIPELINE ACTIVE</p>
      <h2>${worldLayout.nameZh}</h2>
      <h3>${worldLayout.nameEn}</h3>
      <p>重点建筑、操场、道路、台阶和岸线引导已经进入统一 GeoJSON 图层。页面会按多边形和折线渲染，而不是只能依赖中心点方盒。</p>
      <p>当前矢量要素仍为项目自制工程占位，未嵌入武汉大学官方地图或 OSM 几何。每个要素都必须绑定来源 ID，未来可逐项替换为核验后的真实轮廓。</p>
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    status.textContent = `加载失败：${message}`;
    status.classList.add('error');
    detail.innerHTML = `<p class="detail-kicker error">DATA ERROR</p><h2>校园数据未能载入</h2><p>${message}</p>`;
  }
}

void start();
