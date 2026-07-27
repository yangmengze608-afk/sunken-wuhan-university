import * as THREE from 'three';
import { createOldLibraryIPlanLod0 } from './OldLibraryIPlanAsset';

const VERIFIED_MAIN_ROOF_SPAN_METERS = 18;
const VERIFIED_CENTRAL_HALL_CLEAR_HEIGHT_METERS = 9.6;
const ROOF_SPAN_TOLERANCE_METERS = 0.05;

const materials = {
  brick: new THREE.MeshStandardMaterial({ color: 0x625f57, roughness: 0.96, metalness: 0 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8d897d, roughness: 0.92, metalness: 0.01 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x454b49, roughness: 0.94, metalness: 0.01 }),
  tile: new THREE.MeshStandardMaterial({ color: 0x2f5750, roughness: 0.82, metalness: 0.03 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x6d2f2b, roughness: 0.8, metalness: 0.01 }),
};

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  name?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (name) mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addHipRoof(
  group: THREE.Group,
  width: number,
  depth: number,
  height: number,
  position: [number, number, number],
  name?: string,
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.08, 1, 1, 4, 1, false);
  geometry.rotateY(Math.PI / 4);
  const mesh = new THREE.Mesh(geometry, materials.tile);
  mesh.scale.set(width * 0.72, height, depth * 0.72);
  mesh.position.set(...position);
  if (name) mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addIPlanAuxiliaryMasses(
  group: THREE.Group,
  detail: 'lod1' | 'lod2',
): void {
  for (const z of [13, -17]) {
    for (const x of [-27, 27]) {
      addBox(
        group,
        [22, detail === 'lod1' ? 14 : 13, 18],
        [x, detail === 'lod1' ? 13 : 12.5, z],
        materials.brick,
        `OldLibrary-${detail}-aux-${x}-${z}`,
      );
      if (detail === 'lod1') {
        addHipRoof(
          group,
          27,
          23,
          5.5,
          [x, 23, z],
          `OldLibrary-${detail}-aux-roof-${x}-${z}`,
        );
      }
    }
  }
}

function calibratePlanSpan(
  roof: THREE.Mesh,
  targetSpanMeters: number,
): { spanX: number; spanZ: number; maximumResidual: number } {
  roof.updateMatrixWorld(true);
  const initialSize = new THREE.Box3().setFromObject(roof).getSize(new THREE.Vector3());
  if (initialSize.x <= 0 || initialSize.z <= 0) {
    throw new Error(`无法校准屋顶跨度：${roof.name || 'unnamed roof'}`);
  }

  roof.scale.x *= targetSpanMeters / initialSize.x;
  roof.scale.z *= targetSpanMeters / initialSize.z;
  roof.updateMatrixWorld(true);

  const calibratedSize = new THREE.Box3().setFromObject(roof).getSize(new THREE.Vector3());
  const residualX = Math.abs(calibratedSize.x - targetSpanMeters);
  const residualZ = Math.abs(calibratedSize.z - targetSpanMeters);
  const maximumResidual = Math.max(residualX, residualZ);

  roof.userData.calibration = {
    dimensionIds: ['main-roof-structural-span-x', 'main-roof-structural-span-z'],
    targetSpanMeters,
    calibratedSpanX: calibratedSize.x,
    calibratedSpanZ: calibratedSize.z,
    maximumResidualMeters: maximumResidual,
    toleranceMeters: ROOF_SPAN_TOLERANCE_METERS,
    sourceIds: ['source-jaabe-old-library-roof-2022'],
  };

  if (maximumResidual > ROOF_SPAN_TOLERANCE_METERS) {
    throw new Error(`老图书馆主屋顶跨度校准残差超限：${maximumResidual.toFixed(3)}m`);
  }

  return {
    spanX: calibratedSize.x,
    spanZ: calibratedSize.z,
    maximumResidual,
  };
}

function findDetailedMainRoof(group: THREE.Group): THREE.Mesh {
  const selected = group.getObjectByName('OldLibraryMainOctagonalRoofLOD0');
  if (!(selected instanceof THREE.Mesh)) {
    throw new Error('老图书馆 LOD0 未找到中央八角屋顶');
  }
  return selected;
}

function createOldLibraryLod0(): THREE.Group {
  const group = createOldLibraryIPlanLod0();
  const roof = findDetailedMainRoof(group);
  group.userData.roofCalibration = calibratePlanSpan(roof, VERIFIED_MAIN_ROOF_SPAN_METERS);
  group.userData.fidelityLevel = 'LOD0-L3-I-plan-detail-calibrated-roof';
  return group;
}

function createOldLibraryLod1(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Library LOD1 I-Plan Architectural Silhouette';

  addBox(group, [78, 3.2, 58], [0, 1.6, 0], materials.darkStone);
  addBox(group, [70, 3.4, 52], [0, 4.9, 0], materials.stone);
  addBox(group, [34, 18, 30], [0, 15.5, -1], materials.brick);
  addBox(group, [20, 14, 54], [0, 13, -2], materials.brick);
  addIPlanAuxiliaryMasses(group, 'lod1');
  addBox(group, [22, 20, 9], [0, 17.5, 18.2], materials.stone);

  addHipRoof(group, 42, 38, 7.2, [0, 27.2, -1]);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(10.5, 11.8, 15.5, 8),
    materials.stone,
  );
  tower.position.set(0, 33, -1);
  tower.rotation.y = Math.PI / 8;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);
  const mainRoof = addHipRoof(
    group,
    29,
    29,
    8.2,
    [0, 45.4, -1],
    'OldLibraryMainOctagonalRoofLOD1',
  );

  for (const x of [-13.5, -9, -4.5, 0, 4.5, 9, 13.5]) {
    addBox(group, [2.4, 3.1, 0.28], [x, 15, 14.2], materials.timber);
  }

  group.userData.roofCalibration = calibratePlanSpan(mainRoof, VERIFIED_MAIN_ROOF_SPAN_METERS);
  group.userData.planComposition = 'I-shaped central main building with four auxiliary buildings';
  group.userData.fidelityLevel = 'LOD1-I-plan-structure-calibrated-roof';
  return group;
}

function createOldLibraryLod2(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Library LOD2 I-Plan Distant Massing';

  addBox(group, [78, 5.5, 58], [0, 2.75, 0], materials.darkStone);
  addBox(group, [34, 18, 30], [0, 15.5, -1], materials.brick);
  addBox(group, [20, 13, 54], [0, 12.5, -2], materials.brick);
  addIPlanAuxiliaryMasses(group, 'lod2');
  addHipRoof(group, 70, 58, 8.2, [0, 26.5, -2]);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(10.8, 12, 18, 8),
    materials.stone,
  );
  tower.position.set(0, 35, -1);
  tower.rotation.y = Math.PI / 8;
  tower.castShadow = true;
  group.add(tower);
  const mainRoof = addHipRoof(
    group,
    31,
    31,
    9.2,
    [0, 49, -1],
    'OldLibraryMainOctagonalRoofLOD2',
  );

  group.userData.roofCalibration = calibratePlanSpan(mainRoof, VERIFIED_MAIN_ROOF_SPAN_METERS);
  group.userData.planComposition = 'I-shaped central main building with four auxiliary buildings';
  group.userData.fidelityLevel = 'LOD2-I-plan-silhouette-calibrated-roof';
  return group;
}

function addAxisLine(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number,
): void {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  group.add(line);

  for (const point of [start, end]) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 10, 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    marker.position.copy(point);
    group.add(marker);
  }
}

function createCalibrationOverlay(): THREE.Group {
  const overlay = new THREE.Group();
  overlay.name = 'Old Library Calibration Overlay';
  overlay.userData.engineeringEnvelope = {
    widthMeters: 78,
    depthMeters: 65,
    heightMeters: 62.5,
    status: 'estimated-from-current-procedural-model',
  };
  overlay.userData.verifiedRoofSpan = {
    x: VERIFIED_MAIN_ROOF_SPAN_METERS,
    z: VERIFIED_MAIN_ROOF_SPAN_METERS,
    sourceIds: ['source-jaabe-old-library-roof-2022'],
  };
  overlay.userData.verifiedCentralHallClearHeight = {
    heightMeters: VERIFIED_CENTRAL_HALL_CLEAR_HEIGHT_METERS,
    sourceIds: [
      'source-jaabe-old-library-roof-2022',
      'source-whu-old-library-hall-height-2023',
    ],
    note: 'Interior control height only; does not establish total building height.',
  };

  const box = new THREE.Box3(
    new THREE.Vector3(-39, 0, -28),
    new THREE.Vector3(39, 62.5, 37),
  );
  overlay.add(new THREE.Box3Helper(box, new THREE.Color(0xf0c875)));
  addAxisLine(
    overlay,
    new THREE.Vector3(-39, 0.6, 38.5),
    new THREE.Vector3(39, 0.6, 38.5),
    0xf0c875,
  );
  addAxisLine(
    overlay,
    new THREE.Vector3(40.5, 0.6, -28),
    new THREE.Vector3(40.5, 0.6, 37),
    0x70c7d6,
  );
  addAxisLine(
    overlay,
    new THREE.Vector3(42, 0, 37),
    new THREE.Vector3(42, 62.5, 37),
    0xd98278,
  );

  const halfSpan = VERIFIED_MAIN_ROOF_SPAN_METERS / 2;
  addAxisLine(
    overlay,
    new THREE.Vector3(-halfSpan, 46.2, -1),
    new THREE.Vector3(halfSpan, 46.2, -1),
    0x63e6ff,
  );
  addAxisLine(
    overlay,
    new THREE.Vector3(0, 46.8, -1 - halfSpan),
    new THREE.Vector3(0, 46.8, -1 + halfSpan),
    0x63e6ff,
  );

  const hallControlX = -13.5;
  const hallBaseY = 5.4;
  addAxisLine(
    overlay,
    new THREE.Vector3(hallControlX, hallBaseY, 7.5),
    new THREE.Vector3(
      hallControlX,
      hallBaseY + VERIFIED_CENTRAL_HALL_CLEAR_HEIGHT_METERS,
      7.5,
    ),
    0xe48bd2,
  );
  return overlay;
}

export function createOldLibraryProductionAsset(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Old Library Production LOD Asset';
  root.userData.fidelityLevel = 'L3';
  root.userData.targetFidelityLevel = 'L5';
  root.userData.lodDistancesMeters = [0, 180, 420];
  root.userData.planComposition = 'I-shaped central main building with four auxiliary buildings';
  root.userData.verifiedDimensions = {
    mainRoofStructuralSpanMeters: [18, 18],
    centralHallClearHeightMeters: VERIFIED_CENTRAL_HALL_CLEAR_HEIGHT_METERS,
    sourceIds: [
      'source-jaabe-old-library-roof-2022',
      'source-whu-old-library-hall-height-2023',
    ],
  };

  const lod = new THREE.LOD();
  lod.name = 'Old Library LOD Controller';
  lod.addLevel(createOldLibraryLod0(), 0);
  lod.addLevel(createOldLibraryLod1(), 180);
  lod.addLevel(createOldLibraryLod2(), 420);
  root.add(lod);

  const parameters = new URLSearchParams(window.location.search);
  const calibrationEnabled = parameters.get('calibrate') === 'old-library'
    || parameters.get('debug') === '1';
  if (calibrationEnabled) root.add(createCalibrationOverlay());

  return root;
}
