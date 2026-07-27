import * as THREE from 'three';
import type { CampusDataset } from '../data/types';
import { sampleTerrainHeight } from './terrain';
import type { WholeCampusLayout, WorldRoad } from './types';

interface AvenueSample {
  position: THREE.Vector2;
  tangent: THREE.Vector2;
}

const materials = {
  road: new THREE.MeshStandardMaterial({ color: 0x4e5553, roughness: 0.96, metalness: 0 }),
  paving: new THREE.MeshStandardMaterial({ color: 0x858179, roughness: 0.93, metalness: 0 }),
  curb: new THREE.MeshStandardMaterial({ color: 0xa09b8f, roughness: 0.9, metalness: 0 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x4b4036, roughness: 0.97, metalness: 0 }),
  canopy: new THREE.MeshStandardMaterial({ color: 0x8b777a, roughness: 0.92, metalness: 0 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0x394542, roughness: 0.72, metalness: 0.18 }),
  lampGlow: new THREE.MeshStandardMaterial({
    color: 0xc6e2d7,
    emissive: 0x8fbdb1,
    emissiveIntensity: 1.3,
    roughness: 0.35,
    metalness: 0.02,
  }),
  bench: new THREE.MeshStandardMaterial({ color: 0x5d4b3d, roughness: 0.9, metalness: 0.02 }),
};

function addSegment(
  group: THREE.Group,
  layout: WholeCampusLayout,
  start: THREE.Vector2,
  end: THREE.Vector2,
  width: number,
  thickness: number,
  material: THREE.Material,
  offset = 0,
): THREE.Mesh {
  const delta = end.clone().sub(start);
  const length = delta.length();
  const tangent = delta.normalize();
  const normal = new THREE.Vector2(-tangent.y, tangent.x);
  const center = start.clone().add(end).multiplyScalar(0.5).addScaledVector(normal, offset);
  const y = (
    sampleTerrainHeight(layout, start.x + normal.x * offset, start.y + normal.y * offset)
    + sampleTerrainHeight(layout, end.x + normal.x * offset, end.y + normal.y * offset)
  ) / 2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), material);
  mesh.position.set(center.x, y + thickness / 2 + 0.22, center.y);
  mesh.rotation.y = Math.atan2(delta.x, delta.y);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function sampleRoad(road: WorldRoad, spacing: number): AvenueSample[] {
  const samples: AvenueSample[] = [];
  for (let segmentIndex = 0; segmentIndex < road.points.length - 1; segmentIndex += 1) {
    const startPoint = road.points[segmentIndex];
    const endPoint = road.points[segmentIndex + 1];
    if (!startPoint || !endPoint) continue;

    const start = new THREE.Vector2(startPoint.x, startPoint.z);
    const end = new THREE.Vector2(endPoint.x, endPoint.z);
    const delta = end.clone().sub(start);
    const length = delta.length();
    if (length < 0.01) continue;
    const tangent = delta.clone().normalize();
    const count = Math.max(1, Math.floor(length / spacing));

    for (let step = 0; step < count; step += 1) {
      const progress = (step + 0.5) / count;
      samples.push({ position: start.clone().lerp(end, progress), tangent: tangent.clone() });
    }
  }
  return samples;
}

function addTreeInstances(
  group: THREE.Group,
  layout: WholeCampusLayout,
  samples: readonly AvenueSample[],
): void {
  const instanceCount = samples.length * 2;
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.42, 0.58, 1, 8),
    materials.trunk,
    instanceCount,
  );
  const canopies = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 7),
    materials.canopy,
    instanceCount,
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  let cursor = 0;

  samples.forEach((sample, index) => {
    const normal = new THREE.Vector2(-sample.tangent.y, sample.tangent.x);
    for (const side of [-1, 1]) {
      const lateral = side * (11.2 + ((index % 3) - 1) * 0.45);
      const x = sample.position.x + normal.x * lateral;
      const z = sample.position.y + normal.y * lateral;
      const terrainY = sampleTerrainHeight(layout, x, z);
      const trunkHeight = 5.8 + (index % 5) * 0.22;
      const canopyScale = 3.1 + (index % 4) * 0.2;

      position.set(x, terrainY + trunkHeight / 2, z);
      scale.set(1, trunkHeight, 1);
      matrix.compose(position, rotation, scale);
      trunks.setMatrixAt(cursor, matrix);

      position.set(x, terrainY + trunkHeight + 1.8, z);
      scale.set(canopyScale, 2.45 + (index % 3) * 0.12, canopyScale * 0.92);
      matrix.compose(position, rotation, scale);
      canopies.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
  });

  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  canopies.castShadow = true;
  group.add(trunks, canopies);
}

function addStreetFurniture(
  group: THREE.Group,
  layout: WholeCampusLayout,
  samples: readonly AvenueSample[],
): void {
  const lampSamples = samples.filter((_, index) => index % 3 === 0);
  const lampCount = lampSamples.length * 2;
  const poles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.18, 1, 8),
    materials.lamp,
    lampCount,
  );
  const caps = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.42, 8, 6),
    materials.lampGlow,
    lampCount,
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  let cursor = 0;

  lampSamples.forEach((sample) => {
    const normal = new THREE.Vector2(-sample.tangent.y, sample.tangent.x);
    for (const side of [-1, 1]) {
      const x = sample.position.x + normal.x * side * 8.2;
      const z = sample.position.y + normal.y * side * 8.2;
      const terrainY = sampleTerrainHeight(layout, x, z);
      position.set(x, terrainY + 2.9, z);
      scale.set(1, 5.8, 1);
      matrix.compose(position, rotation, scale);
      poles.setMatrixAt(cursor, matrix);
      position.set(x, terrainY + 5.95, z);
      scale.set(1, 1, 1);
      matrix.compose(position, rotation, scale);
      caps.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
  });

  poles.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;
  poles.castShadow = true;
  group.add(poles, caps);

  samples.forEach((sample, index) => {
    if (index % 5 !== 1) return;
    const normal = new THREE.Vector2(-sample.tangent.y, sample.tangent.x);
    const side = index % 2 === 0 ? 1 : -1;
    const x = sample.position.x + normal.x * side * 8.5;
    const z = sample.position.y + normal.y * side * 8.5;
    const y = sampleTerrainHeight(layout, x, z);
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.85), materials.bench);
    seat.position.y = 1.05;
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.25, 0.22), materials.bench);
    back.position.set(0, 1.65, -0.38);
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1, 0.65), materials.lamp);
    leftLeg.position.set(-1.15, 0.5, 0);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 1.15;
    bench.add(seat, back, leftLeg, rightLeg);
    bench.position.set(x, y + 0.15, z);
    bench.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.y);
    bench.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    group.add(bench);
  });
}

function addNodePlaza(
  group: THREE.Group,
  layout: WholeCampusLayout,
  x: number,
  z: number,
  width: number,
  depth: number,
): void {
  const y = sampleTerrainHeight(layout, x, z);
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(width, 0.55, depth), materials.paving);
  plaza.position.set(x, y + 0.28, z);
  plaza.castShadow = true;
  plaza.receiveShadow = true;
  group.add(plaza);

  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, depth), materials.curb);
    curb.position.set(x + side * (width / 2 - 0.55), y + 0.38, z);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  }
}

export class CherryAvenueContextLayer {
  readonly placeObject: THREE.Group | null;
  readonly clickableObjects: THREE.Object3D[] = [];
  readonly collisionBoxes: THREE.Box3[] = [];

  constructor(scene: THREE.Scene, layout: WholeCampusLayout, dataset: CampusDataset) {
    const place = dataset.places.find((item) => item.id === 'cherry-blossom-avenue');
    const road = layout.roads.find((item) => item.id === 'cherry-avenue-spine');
    const administration = dataset.places.find((item) => item.id === 'administration-building');
    const science = dataset.places.find((item) => item.id === 'science-hall');
    if (!place || !road || !administration || !science) {
      this.placeObject = null;
      return;
    }

    const root = new THREE.Group();
    root.name = 'Cherry Avenue Continuous Campus Axis';
    root.userData.placeId = place.id;
    root.userData.accuracy = 'reference-informed-layout-placeholder';
    root.userData.sourceIds = ['source-internal-placeholder-v2', 'source-whu-official-profile-2026'];

    for (let index = 0; index < road.points.length - 1; index += 1) {
      const startPoint = road.points[index];
      const endPoint = road.points[index + 1];
      if (!startPoint || !endPoint) continue;
      const start = new THREE.Vector2(startPoint.x, startPoint.z);
      const end = new THREE.Vector2(endPoint.x, endPoint.z);
      addSegment(root, layout, start, end, road.width, 0.46, materials.road);
      addSegment(root, layout, start, end, 3.2, 0.5, materials.paving, -8.2);
      addSegment(root, layout, start, end, 3.2, 0.5, materials.paving, 8.2);
      addSegment(root, layout, start, end, 0.45, 0.72, materials.curb, -6.35);
      addSegment(root, layout, start, end, 0.45, 0.72, materials.curb, 6.35);
    }

    const samples = sampleRoad(road, 17);
    addTreeInstances(root, layout, samples);
    addStreetFurniture(root, layout, samples);

    addNodePlaza(root, layout, administration.position.x, administration.position.z + 33, 74, 22);
    addNodePlaza(root, layout, science.position.x, science.position.z + 29, 54, 22);
    addSegment(
      root,
      layout,
      new THREE.Vector2(130, 10),
      new THREE.Vector2(administration.position.x, administration.position.z + 24),
      9,
      0.5,
      materials.paving,
    );
    addSegment(
      root,
      layout,
      new THREE.Vector2(40, -5),
      new THREE.Vector2(science.position.x, science.position.z + 18),
      9,
      0.5,
      materials.paving,
    );

    root.traverse((object) => {
      object.userData.placeId = place.id;
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        this.clickableObjects.push(object);
      }
    });

    scene.add(root);
    this.placeObject = root;
  }
}
