export type AssetStatus =
  | 'planned'
  | 'blocked-by-identification'
  | 'blockout'
  | 'available'
  | 'detailed'
  | 'final';

export interface AssetRecord {
  id: string;
  targetPlaceId: string;
  modelPath: string;
  status: AssetStatus;
  accuracy: 'placeholder' | 'estimated' | 'verified';
  lodStatus: string;
  materialStatus: string;
  sourceStatus: string;
  licenseStatus: string;
}

export interface AssetRegistry {
  schemaVersion: string;
  policyZh: string;
  policyEn: string;
  assets: AssetRecord[];
}
