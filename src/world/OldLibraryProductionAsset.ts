import * as THREE from 'three';
import { createOldLibraryDetailed } from './HeritageCoreBlockouts';

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
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
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
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.08, 1, 1, 4, 1, false);
  geometry.rotateY(Math.PI / 4);
  const mesh = new THREE.Mesh(geometry, materials.tile);
  mesh.scale.set(width * 0.72, height, depth * 0.72);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createOldLibraryLod1(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Library LOD1 Architectural Silhouette';

  addBox(group, [70, 3.2, 54], [0, 1.6, 0], materials.darkStone);
  addBox(group, [62, 3.4, 48], [0, 4.9, 0], materials.stone);
  addBox(group, [42, 18, 34], [0, 15.5, -1], materials.brick);
  addBox(group, [23, 14, 42], [-31.5, 13, -1], materials.brick);
  addBox(group, [23, 14, 42], [31.5, 13, -1], materials.brick);
  addBox(group, [22, 20, 9], [0, 17.5, 18.2], materials.stone);

  addHipRoof(group, 29, 50, 6.2, [-31.5, 23.1, -1]);
  addHipRoof(group, 29, 50, 6.2, [31.5, 23.1, -1]);
  addHipRoof(group, 50, 42, 7.5, [0, 27.4, -1]);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(10.5, 11.8, 15.5, 8),
    materials.stone,
  );
  tower.position.set(0, 33, -1);
  tower.rotation.y = Math.PI / 8;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);
  addHipRoof(group, 29, 29, 8.2, [0, 45.4, -1]);

  for (const x of [-22.5, 22.5]) {
    const corner = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.8, 10.5, 12),
      materials.stone,
    );
    corner.position.set(x, 13.7, 17.4);
    corner.castShadow = true;
    group.add(corner);
  }

  for (const x of [-15, -9, -3, 3, 9, 15]) {
    addBox(group, [2.5, 3.2, 0.28], [x, 15, 16.25], materials.timber);
  }

  group.userData.fidelityLevel = 'LOD1-structure';
  return group;
}

function createOldLibraryLod2(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Library LOD2 Distant Massing';

  addBox(group, [70, 5.5, 54], [0, 2.75, 0], materials.darkStone);
  addBox(group, [42, 18, 34], [0, 15.5, -1], materials.brick);
  addBox(group, [23, 14, 42], [-31.5, 13, -1], materials.brick);
  addBox(group, [23, 14, 42], [31.5, 13, -1], materials.brick);
  addHipRoof(group, 82, 56, 8.5, [0, 26.5, -1]);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(10.8, 12, 18, 8),
    materials.stone,
  );
  tower.position.set(0, 35, -1);
  tower.rotation.y = Math.PI / 8;
  tower.castShadow = true;
  group.add(tower);
  addHipRoof(group, 31, 31, 9.2, [0, 49, -1]);

  group.userData.fidelityLevel = 'LOD2-silhouette';
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
    widthMeters: 86.5,
    depthMeters: 62,
    heightMeters: 62.5,
    status: 'estimated-from-current-procedural-model',
  };

  const box = new THREE.Box3(
    new THREE.Vector3(-43.25, 0, -26),
    new THREE.Vector3(43.25, 62.5, 36),
  );
  overlay.add(new THREE.Box3Helper(box, new THREE.Color(0xf0c875)));
  addAxisLine(
    overlay,
    new THREE.Vector3(-43.25, 0.6, 37.5),
    new THREE.Vector3(43.25, 0.6, 37.5),
    0xf0c875,
  );
  addAxisLine(
    overlay,
    new THREE.Vector3(44.8, 0.6, -26),
    new THREE.Vector3(44.8, 0.6, 36),
    0x70c7d6,
  );
  addAxisLine(
    overlay,
    new THREE.Vector3(46.5, 0, 36),
    new THREE.Vector3(46.5, 62.5, 36),
    0xd98278,
  );
  return overlay;
}

export function createOldLibraryProductionAsset(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Old Library Production LOD Asset';
  root.userData.fidelityLevel = 'L3';
  root.userData.targetFidelityLevel = 'L5';
  root.userData.lodDistancesMeters = [0, 180, 420];

  const lod = new THREE.LOD();
  lod.name = 'Old Library LOD Controller';
  lod.addLevel(createOldLibraryDetailed(), 0);
  lod.addLevel(createOldLibraryLod1(), 180);
  lod.addLevel(createOldLibraryLod2(), 420);
  root.add(lod);

  const parameters = new URLSearchParams(window.location.search);
  const calibrationEnabled = parameters.get('calibrate') === 'old-library'
    || parameters.get('debug') === '1';
  if (calibrationEnabled) root.add(createCalibrationOverlay());

  return root;
}
