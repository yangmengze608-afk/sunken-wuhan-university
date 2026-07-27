export interface SourceRecord {
  id: string;
  title: string;
  sourceType: string;
  publisherOrAuthor: string;
  urlOrArchiveReference: string;
  accessedAt: string;
  targetPlaceIds: string[];
  usagePurpose: string;
  licenseOrPermission: string;
  verificationNotes: string;
}

export interface SourceRegistry {
  schemaVersion: string;
  noticeZh: string;
  noticeEn: string;
  records: SourceRecord[];
}

interface MeasurementClaim {
  claimId: string;
  value: unknown;
  unit: string;
  status: string;
  descriptionZh: string;
  descriptionEn: string;
}

interface MeasurementSourceRecord {
  id: string;
  title: string;
  sourceType: string;
  publisherOrAuthor: string;
  urlOrArchiveReference: string;
  accessedAt: string;
  targetPlaceIds: string[];
  licenseOrPermission: string;
  measurementClaims: MeasurementClaim[];
  verificationNotes: string;
}

interface MeasurementSourceRegistry {
  schemaVersion: string;
  policyZh: string;
  policyEn: string;
  records: MeasurementSourceRecord[];
}

async function fetchRegistry<T>(path: string, failureLabel: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`${failureLabel}加载失败：HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeMeasurementSource(source: MeasurementSourceRecord): SourceRecord {
  return {
    id: source.id,
    title: source.title,
    sourceType: source.sourceType,
    publisherOrAuthor: source.publisherOrAuthor,
    urlOrArchiveReference: source.urlOrArchiveReference,
    accessedAt: source.accessedAt,
    targetPlaceIds: source.targetPlaceIds,
    usagePurpose: source.measurementClaims.map((claim) => claim.descriptionZh).join('；'),
    licenseOrPermission: source.licenseOrPermission,
    verificationNotes: source.verificationNotes,
  };
}

export async function loadSourceRegistry(): Promise<SourceRegistry> {
  const [sourceRegistry, measurementRegistry] = await Promise.all([
    fetchRegistry<SourceRegistry>('sources.registry.json', '资料来源登记'),
    fetchRegistry<MeasurementSourceRegistry>(
      'measurement.sources.registry.json',
      '测量来源登记',
    ),
  ]);

  if (!sourceRegistry.schemaVersion || !Array.isArray(sourceRegistry.records)) {
    throw new Error('资料来源登记格式不完整');
  }
  if (!measurementRegistry.schemaVersion || !Array.isArray(measurementRegistry.records)) {
    throw new Error('测量来源登记格式不完整');
  }

  const combinedRecords = [
    ...sourceRegistry.records,
    ...measurementRegistry.records.map(normalizeMeasurementSource),
  ];
  const ids = new Set<string>();
  for (const record of combinedRecords) {
    if (!record.id || ids.has(record.id)) {
      throw new Error(`来源登记存在缺失或重复 ID：${record.id || 'unknown'}`);
    }
    ids.add(record.id);
  }

  return {
    schemaVersion: `${sourceRegistry.schemaVersion}+measurement-${measurementRegistry.schemaVersion}`,
    noticeZh: `${sourceRegistry.noticeZh} ${measurementRegistry.policyZh}`,
    noticeEn: `${sourceRegistry.noticeEn} ${measurementRegistry.policyEn}`,
    records: combinedRecords,
  };
}
