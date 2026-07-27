import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();

async function readJson(relativePath) {
  const text = await readFile(resolve(root, relativePath), 'utf8');
  return JSON.parse(text);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function withinBounds(x, z, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

function allCoordinates(geometry) {
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'LineString') return geometry.coordinates;
  if (geometry.type === 'Polygon') return geometry.coordinates.flat();
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

function isClosed(ring) {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return Array.isArray(first)
    && Array.isArray(last)
    && first[0] === last[0]
    && first[1] === last[1];
}

const [world, campus, assets, coverage, geoData, sources, fidelity, calibration] = await Promise.all([
  readJson('public/data/world.layout.json'),
  readJson('public/data/campus.masterplan.json'),
  readJson('public/data/assets.registry.json'),
  readJson('public/data/campus.coverage.json'),
  readJson('public/data/campus.geodata.geojson'),
  readJson('public/data/sources.registry.json'),
  readJson('public/data/fidelity.registry.json'),
  readJson('public/data/calibration.registry.json'),
]);

assert(world.worldId === 'whole-wuhan-university', 'Unexpected or missing world ID');
assert(geoData.type === 'FeatureCollection', 'Campus geodata must be a FeatureCollection');
assert(geoData.metadata?.coordinateSpace === 'local-cartesian-meters', 'Unsupported geodata coordinate space');

const assetIds = new Set(assets.assets.map((asset) => asset.id));
const sourceIds = new Set(sources.records.map((source) => source.id));
const placeIds = new Set();
for (const place of campus.places) {
  assert(!placeIds.has(place.id), `Duplicate campus place ID: ${place.id}`);
  placeIds.add(place.id);
  assert(
    withinBounds(place.position.x, place.position.z, world.bounds),
    `Campus place outside world bounds: ${place.id}`,
  );
  if (place.assetId !== null) {
    assert(assetIds.has(place.assetId), `Unknown asset binding on ${place.id}: ${place.assetId}`);
  }
}

for (const area of coverage.areas) {
  const halfWidth = area.size.width / 2;
  const halfDepth = area.size.depth / 2;
  assert(
    withinBounds(area.center.x - halfWidth, area.center.z - halfDepth, world.bounds)
      && withinBounds(area.center.x + halfWidth, area.center.z + halfDepth, world.bounds),
    `Coverage area outside world bounds: ${area.id}`,
  );
  assert(area.accuracy !== 'verified', `Coarse coverage area cannot be marked verified: ${area.id}`);
}

const featureIds = new Set();
const polygonRoles = new Set(['building', 'sports-field', 'open-space']);
const lineRoles = new Set(['road', 'stair', 'shoreline-guide']);
let polygonCount = 0;
let lineCount = 0;
let coordinateCount = 0;

for (const feature of geoData.features) {
  const properties = feature.properties;
  assert(properties?.id, 'GeoJSON feature missing properties.id');
  assert(!featureIds.has(properties.id), `Duplicate GeoJSON feature ID: ${properties.id}`);
  featureIds.add(properties.id);
  assert(Array.isArray(properties.sourceIds) && properties.sourceIds.length > 0, `Missing source IDs: ${properties.id}`);

  for (const sourceId of properties.sourceIds) {
    assert(sourceIds.has(sourceId), `Unknown source ID ${sourceId} on ${properties.id}`);
  }

  if (properties.placeId !== null) {
    assert(placeIds.has(properties.placeId), `Unknown placeId ${properties.placeId} on ${properties.id}`);
  }

  if (feature.geometry.type === 'Polygon') {
    polygonCount += 1;
    assert(polygonRoles.has(properties.renderRole), `Polygon has invalid render role: ${properties.id}`);
    assert(feature.geometry.coordinates.length > 0, `Polygon has no rings: ${properties.id}`);
    for (const ring of feature.geometry.coordinates) {
      assert(ring.length >= 4, `Polygon ring has fewer than four positions: ${properties.id}`);
      assert(isClosed(ring), `Polygon ring is not closed: ${properties.id}`);
    }
  } else if (feature.geometry.type === 'LineString') {
    lineCount += 1;
    assert(lineRoles.has(properties.renderRole), `LineString has invalid render role: ${properties.id}`);
    assert(feature.geometry.coordinates.length >= 2, `LineString has fewer than two positions: ${properties.id}`);
  } else {
    assert(properties.renderRole === 'open-space', `Point feature role is not supported: ${properties.id}`);
  }

  const coordinates = allCoordinates(feature.geometry);
  coordinateCount += coordinates.length;
  for (const coordinate of coordinates) {
    assert(
      Array.isArray(coordinate)
        && coordinate.length >= 2
        && Number.isFinite(coordinate[0])
        && Number.isFinite(coordinate[1]),
      `Invalid coordinate on ${properties.id}`,
    );
    assert(
      withinBounds(coordinate[0], coordinate[1], world.bounds),
      `Coordinate outside world bounds on ${properties.id}: ${coordinate[0]}, ${coordinate[1]}`,
    );
  }

  if (properties.accuracy === 'verified' || properties.replacementStatus === 'verified') {
    assert(
      !properties.sourceIds.includes('source-internal-placeholder-v2'),
      `Verified feature still uses internal placeholder geometry: ${properties.id}`,
    );
    assert(
      properties.sourceStatus === 'verified',
      `Verified geometry must have verified source status: ${properties.id}`,
    );
  }
}

const fidelityLevels = new Set(['L0', 'L1', 'L2', 'L3', 'L4', 'L5']);
const fidelityPlaceIds = new Set();
for (const record of fidelity.records) {
  assert(placeIds.has(record.placeId), `Unknown fidelity placeId: ${record.placeId}`);
  assert(!fidelityPlaceIds.has(record.placeId), `Duplicate fidelity record: ${record.placeId}`);
  fidelityPlaceIds.add(record.placeId);
  assert(fidelityLevels.has(record.currentLevel), `Invalid current fidelity level on ${record.placeId}`);
  assert(fidelityLevels.has(record.targetLevel), `Invalid target fidelity level on ${record.placeId}`);
  assert(
    Number(record.currentLevel.slice(1)) <= Number(record.targetLevel.slice(1)),
    `Current fidelity exceeds target on ${record.placeId}`,
  );
  assert(Array.isArray(record.verifiedElements), `Missing verified elements on ${record.placeId}`);
  assert(Array.isArray(record.estimatedElements), `Missing estimated elements on ${record.placeId}`);
  assert(Array.isArray(record.requiredForNextLevel), `Missing next-level requirements on ${record.placeId}`);

  if (record.currentLevel === 'L5') {
    assert(record.verifiedElements.length > 0, `L5 record lacks verified elements: ${record.placeId}`);
    assert(record.estimatedElements.length === 0, `L5 record still contains estimated elements: ${record.placeId}`);
    assert(
      Array.isArray(record.errorRecord) && record.errorRecord.length > 0,
      `L5 record lacks an error record: ${record.placeId}`,
    );
    assert(
      Array.isArray(record.measurementSourceIds) && record.measurementSourceIds.length > 0,
      `L5 record lacks measurement sources: ${record.placeId}`,
    );
    for (const sourceId of record.measurementSourceIds) {
      assert(sourceIds.has(sourceId), `Unknown L5 measurement source ${sourceId} on ${record.placeId}`);
    }
  }
}

const calibrationStatuses = new Set(['estimated', 'reference-aligned', 'verified']);
const calibrationPlaceIds = new Set();
let calibrationDimensionCount = 0;
for (const record of calibration.records) {
  assert(placeIds.has(record.placeId), `Unknown calibration placeId: ${record.placeId}`);
  assert(!calibrationPlaceIds.has(record.placeId), `Duplicate calibration record: ${record.placeId}`);
  calibrationPlaceIds.add(record.placeId);
  assert(record.coordinateSpace, `Missing calibration coordinate space: ${record.placeId}`);
  assert(record.calibrationModeUrlQuery, `Missing calibration mode query: ${record.placeId}`);

  const envelope = record.engineeringEnvelope;
  assert(Number.isFinite(envelope.widthMeters) && envelope.widthMeters > 0, `Invalid envelope width: ${record.placeId}`);
  assert(Number.isFinite(envelope.depthMeters) && envelope.depthMeters > 0, `Invalid envelope depth: ${record.placeId}`);
  assert(Number.isFinite(envelope.heightMeters) && envelope.heightMeters > 0, `Invalid envelope height: ${record.placeId}`);
  assert(calibrationStatuses.has(envelope.status), `Invalid envelope status: ${record.placeId}`);

  const dimensionIds = new Set();
  let verifiedDimensionCount = 0;
  for (const dimension of record.dimensions) {
    calibrationDimensionCount += 1;
    assert(dimension.id, `Calibration dimension missing ID: ${record.placeId}`);
    assert(!dimensionIds.has(dimension.id), `Duplicate calibration dimension ${dimension.id} on ${record.placeId}`);
    dimensionIds.add(dimension.id);
    assert(Number.isFinite(dimension.valueMeters), `Invalid dimension value ${dimension.id} on ${record.placeId}`);
    assert(calibrationStatuses.has(dimension.status), `Invalid dimension status ${dimension.id} on ${record.placeId}`);
    assert(Array.isArray(dimension.sourceIds) && dimension.sourceIds.length > 0, `Missing dimension sources ${dimension.id} on ${record.placeId}`);
    for (const sourceId of dimension.sourceIds) {
      assert(sourceIds.has(sourceId), `Unknown dimension source ${sourceId} on ${record.placeId}`);
    }

    if (dimension.status === 'reference-aligned') {
      assert(
        dimension.sourceIds.some((sourceId) => sourceId !== 'source-internal-placeholder-v2'),
        `Reference-aligned dimension only uses placeholder evidence: ${dimension.id}`,
      );
    }

    if (dimension.status === 'verified') {
      verifiedDimensionCount += 1;
      assert(
        Number.isFinite(dimension.toleranceMeters) && dimension.toleranceMeters >= 0,
        `Verified dimension lacks tolerance: ${dimension.id}`,
      );
      assert(
        !dimension.sourceIds.includes('source-internal-placeholder-v2'),
        `Verified dimension still uses placeholder evidence: ${dimension.id}`,
      );
    }
  }

  if (verifiedDimensionCount > 0) {
    assert(
      Array.isArray(record.verifiedMeasurementSourceIds)
        && record.verifiedMeasurementSourceIds.length > 0,
      `Verified calibration lacks measurement sources: ${record.placeId}`,
    );
    assert(
      Array.isArray(record.errorRecord) && record.errorRecord.length > 0,
      `Verified calibration lacks error records: ${record.placeId}`,
    );
    for (const sourceId of record.verifiedMeasurementSourceIds) {
      assert(sourceIds.has(sourceId), `Unknown calibration measurement source ${sourceId} on ${record.placeId}`);
      assert(sourceId !== 'source-internal-placeholder-v2', `Calibration measurement source is still placeholder: ${record.placeId}`);
    }
  }
}

console.log(
  `Data validation passed: ${campus.places.length} places, ${coverage.areas.length} coverage areas, `
  + `${geoData.features.length} GeoJSON features (${polygonCount} polygons, ${lineCount} lines), `
  + `${coordinateCount} coordinate positions, ${sources.records.length} registered sources, `
  + `${fidelity.records.length} fidelity records, ${calibration.records.length} calibration records `
  + `with ${calibrationDimensionCount} dimensions.`,
);
