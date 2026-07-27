import type { AccuracyLevel, SourceStatus } from '../data/types';

export type CoverageCategory =
  | 'heritage'
  | 'humanities-social'
  | 'science'
  | 'engineering'
  | 'information-science'
  | 'medicine'
  | 'residential-life'
  | 'sports-open-space'
  | 'campus-support';

export interface CoverageArea {
  id: string;
  nameZh: string;
  nameEn: string;
  category: CoverageCategory;
  center: {
    x: number;
    z: number;
  };
  size: {
    width: number;
    depth: number;
  };
  blockCount: number;
  seed: number;
  heightRange: {
    min: number;
    max: number;
  };
  accuracy: AccuracyLevel;
  sourceStatus: SourceStatus;
  notesZh: string;
  notesEn: string;
}

export interface CampusCoverageDataset {
  schemaVersion: string;
  positioningZh: string;
  positioningEn: string;
  areas: CoverageArea[];
}
