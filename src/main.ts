import './styles.css';
import { loadAssetRegistry } from './assets/loadAssetRegistry';
import { loadCampusDataset } from './data/loadCampus';
import type { AccuracyLevel, CampusPlace, ReconstructionStatus, SourceStatus } from './data/types';
import { CampusViewer } from './viewer/CampusViewer';
import { loadWorldLayout } from './world/loadWorldLayout';

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`V2 页面缺少必要节点：${selector}`);
  }
  return element;
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
    const [dataset, assetRegistry, worldLayout] = await Promise.all([
      loadCampusDataset(),
      loadAssetRegistry(),
      loadWorldLayout(),
    ]);

    const assetIds = new Set(assetRegistry.assets.map((asset) => asset.id));
    const missingAssetBindings = dataset.places.filter(
      (place) => place.assetId !== null && !assetIds.has(place.assetId),
    );
    if (missingAssetBindings.length > 0) {
      throw new Error(`存在 ${missingAssetBindings.length} 个无效资产绑定`);
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

    const viewer = new CampusViewer(viewport, dataset, worldLayout, (place) => {
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
    status.textContent = `一张连续校园 · ${worldWidth}×${worldDepth}m 工程范围 · ${dataset.places.length} 个重点地点 · 总图：${accuracyLabels[worldLayout.accuracy]}`;
    detail.innerHTML = `
      <p class="detail-kicker">WHOLE CAMPUS WORLD</p>
      <h2>${worldLayout.nameZh}</h2>
      <h3>${worldLayout.nameEn}</h3>
      <p>所有地点现在位于同一个连续世界坐标系中。分区仅用于后台资料管理和未来的无感流式加载，不是独立空间。</p>
      <p>${worldLayout.streaming.policyEn}</p>
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    status.textContent = `加载失败：${message}`;
    status.classList.add('error');
    detail.innerHTML = `<p class="detail-kicker error">DATA ERROR</p><h2>校园数据未能载入</h2><p>${message}</p>`;
  }
}

void start();
