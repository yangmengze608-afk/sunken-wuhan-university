export type CalibrationStatus = 'estimated' | 'reference-aligned' | 'verified';

export interface CalibrationDimension {
  id: string;
  labelZh: string;
  labelEn: string;
  valueMeters: number;
  status: CalibrationStatus;
  toleranceMeters: number | null;
  sourceIds: string[];
  methodZh: string;
  methodEn: string;
}

export interface CalibrationRecord {
  placeId: string;
  coordinateSpace: string;
  calibrationModeUrlQuery: string;
  engineeringEnvelope: {
    widthMeters: number;
    depthMeters: number;
    heightMeters: number;
    status: CalibrationStatus;
    method: string;
  };
  dimensions: CalibrationDimension[];
  verifiedMeasurementSourceIds: string[];
  errorRecord: Array<{
    id: string;
    measuredValue: number;
    modelValue: number;
    absoluteError: number;
    relativeErrorPercent: number;
  }>;
  requiredEvidenceForL2: string[];
}

export interface CalibrationRegistry {
  schemaVersion: string;
  policyZh: string;
  policyEn: string;
  records: CalibrationRecord[];
}

export async function loadCalibrationRegistry(): Promise<CalibrationRegistry> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/calibration.registry.json`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`尺寸校准登记表加载失败：HTTP ${response.status}`);
  }

  const registry = (await response.json()) as CalibrationRegistry;
  if (!registry.schemaVersion || !Array.isArray(registry.records)) {
    throw new Error('尺寸校准登记表格式不完整');
  }
  return registry;
}
