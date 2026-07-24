import * as THREE from 'three';
import type { CampusDataset } from '../data/types';
import { addCampusCoverageBlockout } from './CampusCoverageBlockout';
import type { CampusCoverageDataset } from './coverageTypes';
import { sampleTerrainHeight } from './terrain';
import type { WholeCampusLayout } from './types';

export class WholeCampusWorld {
  constructor(
    scene: THREE.Scene,
    layout: WholeCampusLayout,
    dataset: CampusDataset,
    coverage: CampusCoverageDataset,
    debugZones: boolean,
  ) {
    this.addLighting(scene);
    this.addTerrain(scene, layout);
    addCampusCoverageBlockout(scene, layout, coverage);
    this.addEastLake(scene, layout);

    if (debugZones) {
      this.addDebugZones(scene, dataset);
      this.addCoverageBoundaries(scene, layout, coverage);
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

  private addCoverageBoundaries(
    scene: THREE.Scene,
    layout: WholeCampusLayout,
    coverage: CampusCoverageDataset,
  ): void {
    const group = new THREE.Group();
    group.name = 'CoverageAreasDebug';

    for (const area of coverage.areas) {
      const geometry = new THREE.BoxGeometry(area.size.width, 1, area.size.depth);
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xc9aa68, transparent: true, opacity: 0.24 }),
      );
      line.position.set(
        area.center.x,
        sampleTerrainHeight(layout, area.center.x, area.center.z) + 0.8,
        area.center.z,
      );
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
