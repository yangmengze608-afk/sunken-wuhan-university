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

export async function loadSourceRegistry(): Promise<SourceRegistry> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/sources.registry.json`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`资料来源登记加载失败：HTTP ${response.status}`);
  }

  const registry = (await response.json()) as SourceRegistry;
  if (!registry.schemaVersion || !Array.isArray(registry.records)) {
    throw new Error('资料来源登记格式不完整');
  }

  return registry;
}
