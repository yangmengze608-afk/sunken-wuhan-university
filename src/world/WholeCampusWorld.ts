import * as THREE from 'three';
import type { CampusDataset } from '../data/types';
import type { WholeCampusLayout, WorldRoad } from './types';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function sampleTerrainHeight(layout: WholeCampusLayout, x: number, z: number): number {
  let height = layout.terrain.baseElevation;

  for (const hill of layout.terrain.hills) {
    const nx = (x - hill.center.x) / hill.radiusX;
    const nz = (z - hill.center.z) / hill.radiusZ;
    height += hill.height * Math.exp(-2.35 * (nx * nx + nz * nz));
  }

  const shorelineStart = layout.shoreline.eastBoundaryX - layout.shoreline.transitionWidth;
  const shorelineProgress = smoothstep(
    (x - shorelineStart) / Math.max(layout.shoreline.transitionWidth, 1),
  );
  height -= shorelineProgress * 28;

  return height;
}

export class WholeCampusWorld {
  constructor(
    scene: THREE.Scene,
    layout: WholeCampusLayout,
    dataset: CampusDataset,
    debugZones: boolean,
  ) {
    this.addLighting(scene);
    this.addTerrain(scene, layout);
    this.addRoadNetwork(scene, layout);
    this.addEastLake(scene, layout);

    if (debugZones) {
      this.addDebugZones(scene, dataset);
      this.addWorldBoundary(scene, layout);
    }
  }

  private addLighting(scene: THREE.Scene): void {
    const hemisphere = new THREE.HemisphereLight(0x9ad8cf, 0x061319, 1.65);
    scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xd7efe8, 3.2);
    sun.position.set(260, 640, 220);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -900;
    sun.shadow.camera.right = 900;
    sun.shadow.camera.top = 750;
    sun.shadow.camera.bottom = -750;
    sun.shadow.camera.far = 1800;
    scene.add(sun);
  }

  private addTerrain(scene: THREE.Scene, layout: WholeCampusLayout): void {
    const width = layout.bounds.maxX - layout.bounds.minX;
    const depth = layout.bounds.maxZ - layout.bounds.minZ;
    const centerX = (layout.bounds.minX + layout.bounds.maxX) / 2;
    const centerZ = (layout.bounds.minZ + layout.bounds.maxZ) / 2;
    const geometry = new THREE.PlaneGeometry(
      width,
      depth,
      layout.terrain.segmentsX,
      layout.terrain.segmentsZ,
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      const localX = positions.getX(index);
      const localZ = positions.getZ(index);
      positions.setY(index, sampleTerrainHeight(layout, localX + centerX, localZ + centerZ));
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const terrain = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x173b35,
        roughness: 0.97,
        metalness: 0.01,
      }),
    );
    terrain.name = 'GlobalTerrain';
    terrain.position.set(centerX, 0, centerZ);
    terrain.receiveShadow = true;
    scene.add(terrain);
  }

  private addRoadNetwork(scene: THREE.Scene, layout: WholeCampusLayout): void {
    const group = new THREE.Group();
    group.name = 'CampusRoadNetwork';

    for (const road of layout.roads) {
      this.addRoad(group, layout, road);
    }

    scene.add(group);
  }

  private addRoad(group: THREE.Group, layout: WholeCampusLayout, road: WorldRoad): void {
    const material = new THREE.MeshStandardMaterial({
      color: road.accuracy === 'verified' ? 0x53625e : 0x4a5a58,
      roughness: 0.92,
      metalness: 0.01,
      transparent: road.accuracy === 'placeholder',
      opacity: road.accuracy === 'placeholder' ? 0.72 : 1,
    });

    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];
      if (!start || !end) continue;

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      if (length <= 0.01) continue;

      const middleX = (start.x + end.x) / 2;
      const middleZ = (start.z + end.z) / 2;
      const elevation = (
        sampleTerrainHeight(layout, start.x, start.z)
        + sampleTerrainHeight(layout, end.x, end.z)
      ) / 2;
      const segment = new THREE.Mesh(
        new THREE.BoxGeometry(road.width, 0.45, length),
        material,
      );
      segment.position.set(middleX, elevation + 0.3, middleZ);
      segment.rotation.y = Math.atan2(dx, dz);
      segment.receiveShadow = true;
      segment.userData.roadId = road.id;
      group.add(segment);
    }
  }

  private addEastLake(scene: THREE.Scene, layout: WholeCampusLayout): void {
    const width = layout.bounds.maxX - layout.shoreline.eastBoundaryX + 280;
    const depth = layout.bounds.maxZ - layout.bounds.minZ + 240;
    const centerX = layout.shoreline.eastBoundaryX + width / 2 - 80;
    const centerZ = (layout.bounds.minZ + layout.bounds.maxZ) / 2;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshPhysicalMaterial({
        color: 0x0b5962,
        roughness: 0.28,
        metalness: 0.04,
        transmission: 0.12,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      }),
    );
    water.name = 'EastLakeShoreline';
    water.rotation.x = -Math.PI / 2;
    water.position.set(centerX, layout.shoreline.waterLevel, centerZ);
    scene.add(water);
  }

  private addDebugZones(scene: THREE.Scene, dataset: CampusDataset): void {
    const group = new THREE.Group();
    group.name = 'StreamingRegionsDebug';

    for (const zone of dataset.zones) {
      const geometry = new THREE.BoxGeometry(zone.size.width, 2, zone.size.depth);
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x65c8b3, transparent: true, opacity: 0.32 }),
      );
      line.position.set(zone.center.x, zone.center.y + 1, zone.center.z);
      group.add(line);
    }

    scene.add(group);
  }

  private addWorldBoundary(scene: THREE.Scene, layout: WholeCampusLayout): void {
    const width = layout.bounds.maxX - layout.bounds.minX;
    const depth = layout.bounds.maxZ - layout.bounds.minZ;
    const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 2, depth));
    const boundary = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xd5ba75, transparent: true, opacity: 0.42 }),
    );
    boundary.position.set(
      (layout.bounds.minX + layout.bounds.maxX) / 2,
      1,
      (layout.bounds.minZ + layout.bounds.maxZ) / 2,
    );
    scene.add(boundary);
  }
}
