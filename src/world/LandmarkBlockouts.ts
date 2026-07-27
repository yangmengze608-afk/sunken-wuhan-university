import * as THREE from 'three';
import type { CampusDataset, CampusPlace } from '../data/types';
import { attachCollisionBoxes, collectWorldCollisionBoxes } from './collision';
import { HeritageCoreContextLayer } from './HeritageCoreContext';
import {
  createHundredStepsDetailed,
  createOldDormitoriesDetailed,
  createOldLibraryDetailed,
} from './HeritageCoreBlockouts';
import { enhanceHeritageMaterials } from './HeritageMaterialEnhancer';
import { collisionDefinitionsFor } from './landmarkCollisionDefinitions';
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
  track: new THREE.MeshStandardMaterial({ color: 0x695b4c, roughness: 0.96, metalness: 0 }),
  field: new THREE.MeshStandardMaterial({ color: 0x355d49, roughness: 0.98, metalness: 0 }),
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
  group.userData.accuracy = 'placeholder-structured-blockout';
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
  group.userData.accuracy = 'placeholder-structured-blockout';
  return group;
}

export class LandmarkBlockoutLayer {
  readonly representedPlaceIds = new Set<string>();
  readonly placeObjects = new Map<string, THREE.Object3D>();
  readonly clickableObjects: THREE.Object3D[] = [];
  readonly collisionBoxes: THREE.Box3[] = [];

  constructor(
    scene: THREE.Scene,
    layout: WholeCampusLayout,
    dataset: CampusDataset,
  ) {
    const root = new THREE.Group();
    root.name = 'StructuredLandmarkBlockouts';

    const factories: Record<(typeof CORE_LANDMARK_IDS)[number], () => THREE.Group> = {
      '912-sports-field': createSportsField,
      'old-dormitories': createOldDormitoriesDetailed,
      'hundred-step-stairway': createHundredStepsDetailed,
      'old-library': createOldLibraryDetailed,
      'wuhan-university-archway': createArchway,
    };

    for (const placeId of CORE_LANDMARK_IDS) {
      const place = dataset.places.find((item) => item.id === placeId);
      if (!place) continue;
      const group = factories[placeId]();
      this.placeGroup(root, layout, place, group);
    }

    scene.add(root);
    const contextLayer = new HeritageCoreContextLayer(scene, layout, dataset);
    this.collisionBoxes.push(...contextLayer.collisionBoxes);
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
    attachCollisionBoxes(group, collisionDefinitionsFor(place.id));
    enhanceHeritageMaterials(group);
    root.add(group);
    this.collisionBoxes.push(...collectWorldCollisionBoxes(group));

    this.representedPlaceIds.add(place.id);
    this.placeObjects.set(place.id, group);
    this.clickableObjects.push(...tagInteractive(group, place.id));
  }
}
