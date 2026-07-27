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
  'administration-building': [
    { label: '行政楼中央主体', center: [0, 18, -1], size: [34, 34, 29] },
    { label: '行政楼左翼', center: [-32, 14.5, -1], size: [27, 24, 25] },
    { label: '行政楼右翼', center: [32, 14.5, -1], size: [27, 24, 25] },
    { label: '行政楼入口体量', center: [0, 8.5, 14], size: [27, 9, 9] },
  ],
  'science-hall': [
    { label: '理学楼主体', center: [0, 17, -1], size: [48, 29, 42] },
    { label: '理学楼左翼', center: [-30, 15, -1], size: [13, 24, 28] },
    { label: '理学楼右翼', center: [30, 15, -1], size: [13, 24, 28] },
    { label: '理学楼入口体量', center: [0, 8.5, 18], size: [31, 9, 10] },
    { label: '理学楼穹顶鼓座', center: [0, 39, -1], size: [26, 27, 26] },
  ],
};

export function collisionDefinitionsFor(placeId: string): readonly LocalCollisionBox[] {
  return DEFINITIONS[placeId] ?? [];
}
