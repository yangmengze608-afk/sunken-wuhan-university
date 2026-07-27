import type { AccuracyLevel, LocalPosition } from '../data/types';

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface TerrainHill {
  id: string;
  center: Pick<LocalPosition, 'x' | 'z'>;
  radiusX: number;
  radiusZ: number;
  height: number;
}

export interface WorldRoad {
  id: string;
  nameZh: string;
  nameEn: string;
  width: number;
  accuracy: AccuracyLevel;
  points: Array<Pick<LocalPosition, 'x' | 'z'>>;
}

export interface WholeCampusLayout {
  schemaVersion: string;
  worldId: string;
  nameZh: string;
  nameEn: string;
  accuracy: AccuracyLevel;
  bounds: WorldBounds;
  terrain: {
    baseElevation: number;
    segmentsX: number;
    segmentsZ: number;
    hills: TerrainHill[];
  };
  shoreline: {
    waterLevel: number;
    eastBoundaryX: number;
    transitionWidth: number;
  };
  roads: WorldRoad[];
  streaming: {
    cellSize: number;
    highDetailRadius: number;
    preloadRadius: number;
    policyZh: string;
    policyEn: string;
  };
}
