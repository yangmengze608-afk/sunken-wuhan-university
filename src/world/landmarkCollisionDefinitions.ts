import type { LocalCollisionBox } from './collision';

const DEFINITIONS: Record<string, readonly LocalCollisionBox[]> = {
  'old-dormitories': [
    { label: '老斋舍下层左翼', center: [-33, 19.4, 10], size: [23, 24, 48] },
    { label: '老斋舍下层右翼', center: [33, 19.4, 10], size: [23, 24, 48] },
    { label: '老斋舍上层左翼', center: [-33, 21, -28], size: [23, 30, 40] },
    { label: '老斋舍上层右翼', center: [33, 21, -28], size: [23, 30, 40] },
    { label: '老斋舍上层中央体量', center: [0, 18.5, -31], size: [58, 14, 18] },
  ],
  'old-library': [
    { label: '老图书馆中央主体', center: [0, 18, -1], size: [42, 31, 34] },
    { label: '老图书馆左翼', center: [-31.5, 14, -1], size: [23, 25, 42] },
    { label: '老图书馆右翼', center: [31.5, 14, -1], size: [23, 25, 42] },
    { label: '老图书馆前入口体量', center: [0, 17.5, 18.2], size: [22, 20, 9] },
    { label: '老图书馆中央塔', center: [0, 36, -1], size: [23, 32, 23] },
  ],
  'wuhan-university-archway': [
    { label: '牌坊左外柱', center: [-16, 7, 0], size: [3.8, 14, 3.8] },
    { label: '牌坊左内柱', center: [-6, 7, 0], size: [3.8, 14, 3.8] },
    { label: '牌坊右内柱', center: [6, 7, 0], size: [3.8, 14, 3.8] },
    { label: '牌坊右外柱', center: [16, 7, 0], size: [3.8, 14, 3.8] },
  ],
};

export function collisionDefinitionsFor(placeId: string): readonly LocalCollisionBox[] {
  return DEFINITIONS[placeId] ?? [];
}
