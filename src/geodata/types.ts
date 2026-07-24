import type { AccuracyLevel, SourceStatus } from '../data/types';

export type GeoRenderRole =
  | 'building'
  | 'sports-field'
  | 'road'
  | 'stair'
  | 'open-space'
  | 'shoreline-guide';

export interface CampusGeoProperties {
  id: string;
  nameZh: string;
  nameEn: string;
  renderRole: GeoRenderRole;
  placeId: string | null;
  height: number | null;
  width: number | null;
  elevationOffset: number;
  accuracy: AccuracyLevel;
  sourceStatus: SourceStatus;
  sourceIds: string[];
  licenseStatus: string;
  replacementStatus: 'placeholder' | 'estimated' | 'verified';
  notesZh: string;
  notesEn: string;
}

export interface GeoPointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoLineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoPolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export type CampusGeometry = GeoPointGeometry | GeoLineStringGeometry | GeoPolygonGeometry;

export interface CampusGeoFeature {
  type: 'Feature';
  id?: string;
  properties: CampusGeoProperties;
  geometry: CampusGeometry;
}

export interface CampusGeoFeatureCollection {
  type: 'FeatureCollection';
  name: string;
  metadata: {
    schemaVersion: string;
    coordinateSpace: 'local-cartesian-meters';
    originDescriptionZh: string;
    originDescriptionEn: string;
    generatedAt: string;
    accuracy: AccuracyLevel;
    licenseSummary: string;
  };
  features: CampusGeoFeature[];
}
