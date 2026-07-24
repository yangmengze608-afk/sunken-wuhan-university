import * as THREE from 'three';
import type { CampusCoverageDataset, CoverageCategory } from './coverageTypes';
import { sampleTerrainHeight } from './WholeCampusWorld';
import type { WholeCampusLayout } from './types';

const CATEGORY_COLORS: Record<CoverageCategory, number> = {
  heritage: 0x766b51,
  'humanities-social': 0x566d6a,
  science: 0x55746f,
  engineering: 0x526466,
  'information-science': 0x4f6972,
  medicine: 0x665f68,
  'residential-life': 0x5d6862,
  'sports-open-space': 0x586b55,
  'campus-support': 0x65645c,
};

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function addCampusCoverageBlockout(
  scene: THREE.Scene,
  layout: WholeCampusLayout,
  coverage: CampusCoverageDataset,
): void {
  const root = new THREE.Group();
  root.name = 'WholeCampusCoverageBlockout';

  for (const area of coverage.areas) {
    const random = createRandom(area.seed);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: CATEGORY_COLORS[area.category],
      roughness: 0.9,
      metalness: 0.01,
      transparent: true,
      opacity: area.accuracy === 'placeholder' ? 0.34 : 0.58,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, area.blockCount);
    mesh.name = area.nameZh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.coverageAreaId = area.id;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();

    for (let index = 0; index < area.blockCount; index += 1) {
      const x = area.center.x + (random() - 0.5) * area.size.width * 0.86;
      const z = area.center.z + (random() - 0.5) * area.size.depth * 0.86;
      const width = 18 + random() * 38;
      const depth = 14 + random() * 30;
      const height = area.heightRange.min
        + random() * (area.heightRange.max - area.heightRange.min);
      const terrainY = sampleTerrainHeight(layout, x, z);

      position.set(x, terrainY + height / 2, z);
      scale.set(width, height, depth);
      euler.set(0, (random() - 0.5) * Math.PI * 0.35, 0);
      rotation.setFromEuler(euler);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }

  scene.add(root);
}
