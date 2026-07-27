import * as THREE from 'three';

export interface LocalCollisionBox {
  center: [number, number, number];
  size: [number, number, number];
  label: string;
}

export function attachCollisionBoxes(
  group: THREE.Group,
  boxes: readonly LocalCollisionBox[],
): void {
  group.userData.collisionBoxes = boxes;
}

export function collectWorldCollisionBoxes(group: THREE.Group): THREE.Box3[] {
  const definitions = group.userData.collisionBoxes as LocalCollisionBox[] | undefined;
  if (!definitions) return [];

  group.updateWorldMatrix(true, true);
  return definitions.map((definition) => {
    const center = new THREE.Vector3(...definition.center);
    const size = new THREE.Vector3(...definition.size);
    return new THREE.Box3()
      .setFromCenterAndSize(center, size)
      .applyMatrix4(group.matrixWorld);
  });
}

export function pointHitsExpandedBox(
  point: THREE.Vector3,
  boxes: readonly THREE.Box3[],
  radius: number,
): boolean {
  for (const box of boxes) {
    const expanded = box.clone().expandByScalar(radius);
    if (expanded.containsPoint(point)) return true;
  }
  return false;
}
