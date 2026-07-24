import * as THREE from 'three';
import { sampleTerrainHeight } from '../world/terrain';
import type { WholeCampusLayout } from '../world/types';
import type { CampusGeoFeature, CampusGeoFeatureCollection } from './types';

const ROLE_COLORS: Record<CampusGeoFeature['properties']['renderRole'], number> = {
  building: 0x8b8574,
  'sports-field': 0x566f58,
  road: 0x53615e,
  stair: 0x8a826e,
  'open-space': 0x4d6958,
  'shoreline-guide': 0x2c737b,
};

function polygonCentroid(ring: [number, number][]): [number, number] {
  if (ring.length === 0) return [0, 0];
  const sum = ring.reduce(
    (current, coordinate) => [current[0] + coordinate[0], current[1] + coordinate[1]] as [number, number],
    [0, 0] as [number, number],
  );
  return [sum[0] / ring.length, sum[1] / ring.length];
}

export class CampusGeoDataLayer {
  readonly representedPlaceIds = new Set<string>();
  readonly featureCount: number;
  readonly buildingFootprintCount: number;
  readonly routeCount: number;

  constructor(
    scene: THREE.Scene,
    layout: WholeCampusLayout,
    data: CampusGeoFeatureCollection,
  ) {
    const root = new THREE.Group();
    root.name = 'CampusGeoDataLayer';

    let buildingFootprintCount = 0;
    let routeCount = 0;

    for (const feature of data.features) {
      if (feature.properties.placeId) {
        this.representedPlaceIds.add(feature.properties.placeId);
      }

      if (feature.geometry.type === 'Polygon') {
        this.addPolygon(root, layout, feature);
        buildingFootprintCount += feature.properties.renderRole === 'building' ? 1 : 0;
      } else if (feature.geometry.type === 'LineString') {
        this.addLineString(root, layout, feature);
        routeCount += 1;
      }
    }

    this.featureCount = data.features.length;
    this.buildingFootprintCount = buildingFootprintCount;
    this.routeCount = routeCount;
    scene.add(root);
  }

  private addPolygon(
    root: THREE.Group,
    layout: WholeCampusLayout,
    feature: CampusGeoFeature,
  ): void {
    if (feature.geometry.type !== 'Polygon') return;
    const outerRing = feature.geometry.coordinates[0];
    if (!outerRing || outerRing.length < 4) return;

    const shape = new THREE.Shape();
    outerRing.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });

    for (const holeRing of feature.geometry.coordinates.slice(1)) {
      if (holeRing.length < 4) continue;
      const path = new THREE.Path();
      holeRing.forEach(([x, z], index) => {
        if (index === 0) path.moveTo(x, -z);
        else path.lineTo(x, -z);
      });
      shape.holes.push(path);
    }

    const height = feature.properties.renderRole === 'building'
      ? Math.max(feature.properties.height ?? 8, 0.5)
      : 0.35;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();

    const [centerX, centerZ] = polygonCentroid(outerRing);
    const terrainY = sampleTerrainHeight(layout, centerX, centerZ);
    const material = new THREE.MeshStandardMaterial({
      color: ROLE_COLORS[feature.properties.renderRole],
      roughness: 0.84,
      metalness: 0.02,
      transparent: feature.properties.accuracy === 'placeholder',
      opacity: feature.properties.accuracy === 'placeholder' ? 0.72 : 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = feature.properties.nameZh;
    mesh.position.y = terrainY + feature.properties.elevationOffset;
    mesh.castShadow = feature.properties.renderRole === 'building';
    mesh.receiveShadow = true;
    mesh.userData.geoFeatureId = feature.properties.id;
    mesh.userData.placeId = feature.properties.placeId;
    root.add(mesh);
  }

  private addLineString(
    root: THREE.Group,
    layout: WholeCampusLayout,
    feature: CampusGeoFeature,
  ): void {
    if (feature.geometry.type !== 'LineString') return;
    const width = Math.max(feature.properties.width ?? 4, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: ROLE_COLORS[feature.properties.renderRole],
      roughness: 0.9,
      metalness: 0.01,
      transparent: feature.properties.accuracy === 'placeholder',
      opacity: feature.properties.accuracy === 'placeholder' ? 0.78 : 1,
    });

    for (let index = 0; index < feature.geometry.coordinates.length - 1; index += 1) {
      const start = feature.geometry.coordinates[index];
      const end = feature.geometry.coordinates[index + 1];
      if (!start || !end) continue;

      const dx = end[0] - start[0];
      const dz = end[1] - start[1];
      const length = Math.hypot(dx, dz);
      if (length <= 0.01) continue;

      const middleX = (start[0] + end[0]) / 2;
      const middleZ = (start[1] + end[1]) / 2;
      const elevation = (
        sampleTerrainHeight(layout, start[0], start[1])
        + sampleTerrainHeight(layout, end[0], end[1])
      ) / 2;
      const segment = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.4, length),
        material,
      );
      segment.position.set(
        middleX,
        elevation + feature.properties.elevationOffset + 0.25,
        middleZ,
      );
      segment.rotation.y = Math.atan2(dx, dz);
      segment.receiveShadow = true;
      segment.userData.geoFeatureId = feature.properties.id;
      segment.userData.placeId = feature.properties.placeId;
      root.add(segment);
    }
  }
}
