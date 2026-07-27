import * as THREE from 'three';
import type { CampusDataset } from '../data/types';
import { enhanceHeritageMaterials } from './HeritageMaterialEnhancer';
import { sampleTerrainHeight } from './terrain';
import type { WholeCampusLayout } from './types';

const pathMaterial = new THREE.MeshStandardMaterial({
  color: 0x77756b,
  roughness: 0.96,
  metalness: 0,
});
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x4e5754,
  roughness: 0.95,
  metalness: 0.01,
});
const terraceMaterial = new THREE.MeshStandardMaterial({
  color: 0x8d897d,
  roughness: 0.94,
  metalness: 0,
});

function addWorldSegment(
  group: THREE.Group,
  layout: WholeCampusLayout,
  start: THREE.Vector2,
  end: THREE.Vector2,
  width: number,
  thickness: number,
  material: THREE.Material,
  yOffset = 0.25,
): THREE.Mesh {
  const deltaX = end.x - start.x;
  const deltaZ = end.y - start.y;
  const length = Math.hypot(deltaX, deltaZ);
  const middleX = (start.x + end.x) / 2;
  const middleZ = (start.y + end.y) / 2;
  const terrainY = (
    sampleTerrainHeight(layout, start.x, start.y)
    + sampleTerrainHeight(layout, end.x, end.y)
  ) / 2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), material);
  mesh.position.set(middleX, terrainY + yOffset, middleZ);
  mesh.rotation.y = Math.atan2(deltaX, deltaZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addRetainingWall(
  group: THREE.Group,
  collisionBoxes: THREE.Box3[],
  layout: WholeCampusLayout,
  start: THREE.Vector2,
  end: THREE.Vector2,
  height: number,
): void {
  const wall = addWorldSegment(group, layout, start, end, 1.25, height, wallMaterial, height / 2);
  wall.updateMatrixWorld(true);
  collisionBoxes.push(new THREE.Box3().setFromObject(wall));
}

function addTerrace(
  group: THREE.Group,
  layout: WholeCampusLayout,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
): void {
  const y = sampleTerrainHeight(layout, centerX, centerZ);
  const terrace = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.7, depth),
    terraceMaterial,
  );
  terrace.position.set(centerX, y + 0.15, centerZ);
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  group.add(terrace);
}

export class HeritageCoreContextLayer {
  readonly collisionBoxes: THREE.Box3[] = [];

  constructor(
    scene: THREE.Scene,
    layout: WholeCampusLayout,
    dataset: CampusDataset,
  ) {
    const dorm = dataset.places.find((place) => place.id === 'old-dormitories');
    const stairs = dataset.places.find((place) => place.id === 'hundred-step-stairway');
    const library = dataset.places.find((place) => place.id === 'old-library');
    if (!dorm || !stairs || !library) return;

    const root = new THREE.Group();
    root.name = 'HeritageCoreConnectedTerrainContext';
    root.userData.accuracy = 'reference-informed-context-not-surveyed';

    addTerrace(root, layout, dorm.position.x, dorm.position.z + 28, 122, 18);
    addTerrace(root, layout, dorm.position.x, dorm.position.z - 10, 110, 14);
    addTerrace(root, layout, library.position.x, library.position.z + 27, 82, 18);

    const lowerPath = [
      new THREE.Vector2(dorm.position.x, dorm.position.z + 43),
      new THREE.Vector2(dorm.position.x, dorm.position.z + 28),
      new THREE.Vector2(stairs.position.x, stairs.position.z + 35),
    ];
    const upperPath = [
      new THREE.Vector2(stairs.position.x, stairs.position.z - 35),
      new THREE.Vector2(library.position.x, library.position.z + 28),
      new THREE.Vector2(library.position.x, library.position.z + 20),
    ];

    for (const points of [lowerPath, upperPath]) {
      for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        if (start && end) addWorldSegment(root, layout, start, end, 9.5, 0.5, pathMaterial);
      }
    }

    addRetainingWall(
      root,
      this.collisionBoxes,
      layout,
      new THREE.Vector2(stairs.position.x - 9, stairs.position.z + 37),
      new THREE.Vector2(stairs.position.x - 9, stairs.position.z - 38),
      3.5,
    );
    addRetainingWall(
      root,
      this.collisionBoxes,
      layout,
      new THREE.Vector2(stairs.position.x + 9, stairs.position.z + 37),
      new THREE.Vector2(stairs.position.x + 9, stairs.position.z - 38),
      3.5,
    );
    addRetainingWall(
      root,
      this.collisionBoxes,
      layout,
      new THREE.Vector2(dorm.position.x - 61, dorm.position.z + 33),
      new THREE.Vector2(dorm.position.x + 61, dorm.position.z + 33),
      4.2,
    );
    addRetainingWall(
      root,
      this.collisionBoxes,
      layout,
      new THREE.Vector2(library.position.x - 41, library.position.z + 36),
      new THREE.Vector2(library.position.x + 41, library.position.z + 36),
      3.8,
    );

    enhanceHeritageMaterials(root);
    scene.add(root);
  }
}
