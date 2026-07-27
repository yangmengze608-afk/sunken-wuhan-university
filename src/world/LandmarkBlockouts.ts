import * as THREE from 'three';
import type { CampusDataset, CampusPlace } from '../data/types';
import { sampleTerrainHeight } from './terrain';
import type { WholeCampusLayout } from './types';

const CORE_LANDMARK_IDS = [
  '912-sports-field',
  'old-dormitories',
  'hundred-step-stairway',
  'old-library',
  'wuhan-university-archway',
] as const;

const materials = {
  stone: new THREE.MeshStandardMaterial({ color: 0x77756b, roughness: 0.94, metalness: 0.01 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x4e5754, roughness: 0.9, metalness: 0.02 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x7c7669, roughness: 0.92, metalness: 0.01 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x344c48, roughness: 0.86, metalness: 0.03 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x5a5147, roughness: 0.88, metalness: 0.01 }),
  window: new THREE.MeshStandardMaterial({ color: 0x183b43, roughness: 0.42, metalness: 0.08 }),
  track: new THREE.MeshStandardMaterial({ color: 0x695b4c, roughness: 0.96, metalness: 0 }),
  field: new THREE.MeshStandardMaterial({ color: 0x355d49, roughness: 0.98, metalness: 0 }),
  step: new THREE.MeshStandardMaterial({ color: 0x858176, roughness: 0.97, metalness: 0 }),
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
  const roof = new THREE.Mesh(geometry, materials.roof);
  roof.scale.set(width * 0.72, height, depth * 0.72);
  roof.position.set(...position);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  return roof;
}

function addColumns(
  group: THREE.Group,
  count: number,
  span: number,
  height: number,
  z: number,
  y: number,
  radius = 0.55,
): void {
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.08, height, 10);
  const instances = new THREE.InstancedMesh(geometry, materials.stone, count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const x = count === 1 ? 0 : -span / 2 + (span * index) / (count - 1);
    matrix.makeTranslation(x, y + height / 2, z);
    instances.setMatrixAt(index, matrix);
  }
  instances.instanceMatrix.needsUpdate = true;
  instances.castShadow = true;
  instances.receiveShadow = true;
  group.add(instances);
}

function addWindowRows(
  group: THREE.Group,
  columns: number,
  rows: number,
  span: number,
  baseY: number,
  z: number,
): void {
  const geometry = new THREE.BoxGeometry(2.2, 2.7, 0.22);
  const instances = new THREE.InstancedMesh(geometry, materials.window, columns * rows);
  const matrix = new THREE.Matrix4();
  let cursor = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = columns === 1 ? 0 : -span / 2 + (span * column) / (columns - 1);
      matrix.makeTranslation(x, baseY + row * 4.7, z);
      instances.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
  }
  instances.instanceMatrix.needsUpdate = true;
  group.add(instances);
}

function tagInteractive(group: THREE.Group, placeId: string): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  group.userData.placeId = placeId;
  group.traverse((object) => {
    object.userData.placeId = placeId;
    if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) objects.push(object);
  });
  return objects;
}

function createSportsField(): THREE.Group {
  const group = new THREE.Group();
  group.name = '912 Sports Field Structured Blockout';

  const outer = new THREE.Mesh(new THREE.RingGeometry(48, 60, 96), materials.track);
  outer.rotation.x = -Math.PI / 2;
  outer.scale.set(1.52, 1, 0.92);
  outer.position.y = 0.48;
  outer.receiveShadow = true;
  group.add(outer);

  const field = new THREE.Mesh(new THREE.CircleGeometry(47, 96), materials.field);
  field.rotation.x = -Math.PI / 2;
  field.scale.set(1.52, 1, 0.92);
  field.position.y = 0.5;
  field.receiveShadow = true;
  group.add(field);

  for (const side of [-1, 1]) {
    for (let step = 0; step < 7; step += 1) {
      addBox(
        group,
        [112 - step * 5, 0.8, 3.2],
        [0, 0.55 + step * 0.65, side * (58 + step * 2.4)],
        materials.darkStone,
      );
    }
  }

  addBox(group, [8, 5, 12], [-73, 2.8, 0], materials.wall);
  addBox(group, [8, 5, 12], [73, 2.8, 0], materials.wall);
  return group;
}

function createOldDormitories(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Dormitories Structured Blockout';

  addBox(group, [108, 4, 54], [0, 2, 0], materials.darkStone);
  addBox(group, [88, 15, 25], [0, 11.5, -4], materials.wall);
  addBox(group, [24, 19, 38], [-38, 13.5, 1], materials.wall);
  addBox(group, [24, 19, 38], [38, 13.5, 1], materials.wall);

  addColumns(group, 13, 78, 7.5, 9.2, 4.2, 0.48);
  addBox(group, [84, 1.2, 3], [0, 8.3, 9.2], materials.timber);
  addWindowRows(group, 12, 2, 76, 11, 8.7);

  addHipRoof(group, 96, 33, 6, [0, 22.1, -4]);
  for (const x of [-34, 0, 34]) {
    addBox(group, [17, 7, 14], [x, 25.4, -3], materials.wall);
    addHipRoof(group, 22, 19, 6.5, [x, 32.1, -3]);
  }

  addBox(group, [96, 1.1, 5], [0, 4.65, 15.4], materials.step);
  return group;
}

function createHundredSteps(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Hundred-Step Stairway Structured Blockout';

  const count = 46;
  const geometry = new THREE.BoxGeometry(12, 0.42, 1.45);
  const stairs = new THREE.InstancedMesh(geometry, materials.step, count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    matrix.makeTranslation(0, index * 0.39, index * 1.18 - 27);
    stairs.setMatrixAt(index, matrix);
  }
  stairs.instanceMatrix.needsUpdate = true;
  stairs.castShadow = true;
  stairs.receiveShadow = true;
  group.add(stairs);

  addBox(group, [1.1, 19, 58], [-6.7, 9.5, 0], materials.darkStone);
  addBox(group, [1.1, 19, 58], [6.7, 9.5, 0], materials.darkStone);
  addBox(group, [16, 0.7, 8], [0, 9.1, 0], materials.step);
  return group;
}

function createOldLibrary(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Library Structured Blockout';

  addBox(group, [55, 3, 45], [0, 1.5, 0], materials.darkStone);
  addBox(group, [48, 4, 38], [0, 5, 0], materials.stone);
  addBox(group, [39, 16, 31], [0, 15, 0], materials.wall);
  addColumns(group, 7, 30, 10, 16.2, 7.5, 0.62);
  addBox(group, [35, 1.2, 3], [0, 13.1, 16.2], materials.timber);
  addWindowRows(group, 6, 2, 29, 13, 15.75);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(10, 11, 14, 8), materials.wall);
  tower.position.y = 30;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  addHipRoof(group, 49, 41, 8, [0, 25, 0]);
  addHipRoof(group, 26, 26, 8, [0, 41, 0]);
  addBox(group, [24, 0.8, 7], [0, 3.8, 22], materials.step);
  addBox(group, [18, 0.8, 5], [0, 3, 25], materials.step);
  return group;
}

function createArchway(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Wuhan University Archway Structured Blockout';

  const columnX = [-16, -6, 6, 16];
  for (const x of columnX) {
    addBox(group, [2.8, 14, 2.8], [x, 7, 0], materials.stone);
    addBox(group, [4.3, 1.1, 4.3], [x, 0.55, 0], materials.darkStone);
  }
  addBox(group, [38, 2.1, 3.2], [0, 12.2, 0], materials.timber);
  addBox(group, [28, 2.4, 3.4], [0, 15.6, 0], materials.wall);
  addBox(group, [12, 3.1, 3.7], [0, 18.3, 0], materials.wall);

  addHipRoof(group, 15, 8, 3.6, [0, 21.8, 0]);
  addHipRoof(group, 12, 7, 2.8, [-11.2, 15.3, 0]);
  addHipRoof(group, 12, 7, 2.8, [11.2, 15.3, 0]);

  addBox(group, [10.5, 2.5, 0.45], [0, 17.9, 2], materials.darkStone);
  return group;
}

export class LandmarkBlockoutLayer {
  readonly representedPlaceIds = new Set<string>();
  readonly placeObjects = new Map<string, THREE.Object3D>();
  readonly clickableObjects: THREE.Object3D[] = [];

  constructor(
    scene: THREE.Scene,
    layout: WholeCampusLayout,
    dataset: CampusDataset,
  ) {
    const root = new THREE.Group();
    root.name = 'StructuredLandmarkBlockouts';

    const factories: Record<(typeof CORE_LANDMARK_IDS)[number], () => THREE.Group> = {
      '912-sports-field': createSportsField,
      'old-dormitories': createOldDormitories,
      'hundred-step-stairway': createHundredSteps,
      'old-library': createOldLibrary,
      'wuhan-university-archway': createArchway,
    };

    for (const placeId of CORE_LANDMARK_IDS) {
      const place = dataset.places.find((item) => item.id === placeId);
      if (!place) continue;
      const group = factories[placeId]();
      this.placeGroup(root, layout, place, group);
    }

    scene.add(root);
  }

  private placeGroup(
    root: THREE.Group,
    layout: WholeCampusLayout,
    place: CampusPlace,
    group: THREE.Group,
  ): void {
    const terrainY = sampleTerrainHeight(layout, place.position.x, place.position.z);
    group.position.set(
      place.position.x,
      terrainY + place.position.y,
      place.position.z,
    );
    group.rotation.y = place.rotationY;
    group.userData.accuracy = 'placeholder-structured-blockout';
    root.add(group);

    this.representedPlaceIds.add(place.id);
    this.placeObjects.set(place.id, group);
    this.clickableObjects.push(...tagInteractive(group, place.id));
  }
}
