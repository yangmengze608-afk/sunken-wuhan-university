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

const [world, campus, assets, coverage, geoData, sources] = await Promise.all([
  readJson('public/data/whole-campus.layout.json'),
  readJson('public/data/campus.masterplan.json'),
  readJson('public/data/assets.registry.json'),
  readJson('public/data/campus.coverage.json'),
  readJson('public/data/campus.geodata.geojson'),
  readJson('public/data/sources.registry.json'),
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

console.log(
  `Data validation passed: ${campus.places.length} places, ${coverage.areas.length} coverage areas, `
  + `${geoData.features.length} GeoJSON features (${polygonCount} polygons, ${lineCount} lines), `
  + `${coordinateCount} coordinate positions, ${sources.records.length} registered sources.`,
);
