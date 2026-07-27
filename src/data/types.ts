export type AccuracyLevel = 'placeholder' | 'estimated' | 'verified';
export type ReconstructionStatus = 'planned' | 'placeholder' | 'blockout' | 'detailed' | 'final';
export type SourceStatus = 'missing' | 'collecting' | 'partially-verified' | 'verified';

export interface LocalPosition {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  width: number;
  depth: number;
  height: number;
}

export interface CampusZone {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  center: LocalPosition;
  size: {
    width: number;
    depth: number;
  };
  accuracy: AccuracyLevel;
}

export interface CampusPlace {
  id: string;
  zoneId: string;
  nameZh: string;
  nameEn: string;
  category: 'historic-building' | 'teaching-building' | 'sports' | 'road' | 'gate' | 'landscape' | 'residential' | 'facility';
  priority: 1 | 2 | 3 | 4 | 5;
  position: LocalPosition;
  rotationY: number;
  dimensions: Dimensions;
  coordinateAccuracy: AccuracyLevel;
  reconstructionStatus: ReconstructionStatus;
  sourceStatus: SourceStatus;
  assetId: string | null;
  notesZh: string;
  notesEn: string;
}

export interface CampusDataset {
  schemaVersion: string;
  generatedAt: string;
  project: {
    nameZh: string;
    nameEn: string;
    positioningZh: string;
    positioningEn: string;
  };
  coordinateSystem: {
    type: 'local-cartesian';
    unit: 'meter';
    originDescriptionZh: string;
    originDescriptionEn: string;
    verificationStatus: AccuracyLevel;
  };
  zones: CampusZone[];
  places: CampusPlace[];
}
