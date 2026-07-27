import type { WholeCampusLayout } from './types';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function sampleTerrainHeight(layout: WholeCampusLayout, x: number, z: number): number {
  let height = layout.terrain.baseElevation;

  for (const hill of layout.terrain.hills) {
    const nx = (x - hill.center.x) / hill.radiusX;
    const nz = (z - hill.center.z) / hill.radiusZ;
    height += hill.height * Math.exp(-2.35 * (nx * nx + nz * nz));
  }

  const shorelineStart = layout.shoreline.eastBoundaryX - layout.shoreline.transitionWidth;
  const shorelineProgress = smoothstep(
    (x - shorelineStart) / Math.max(layout.shoreline.transitionWidth, 1),
  );
  height -= shorelineProgress * 28;

  return height;
}
