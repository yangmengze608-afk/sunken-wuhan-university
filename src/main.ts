import './styles.css';
import { loadCampusDataset } from './data/loadCampus';
import type { AccuracyLevel, CampusPlace, ReconstructionStatus, SourceStatus } from './data/types';
import { CampusViewer } from './viewer/CampusViewer';

const viewport = document.querySelector<HTMLElement>('#viewport');
const status = document.querySelector<HTMLElement>('#dataset-status');
const placeList = document.querySelector<HTMLElement>('#place-list');
const detail = document.querySelector<HTMLElement>('#place-detail');

if (!viewport || !status || !placeList || !detail) {
  throw new Error('V2 页面缺少必要的界面节点');
}

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
    const dataset = await loadCampusDataset();
    const viewer = new CampusViewer(viewport, dataset, (place) => {
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

    status.textContent = `${dataset.zones.length} 个分区 · ${dataset.places.length} 个重点地点 · 坐标体系：${accuracyLabels[dataset.coordinateSystem.verificationStatus]}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    status.textContent = `加载失败：${message}`;
    status.classList.add('error');
    detail.innerHTML = `<p class="detail-kicker error">DATA ERROR</p><h2>校园数据未能载入</h2><p>${message}</p>`;
  }
}

void start();
