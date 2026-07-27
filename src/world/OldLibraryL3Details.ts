import * as THREE from 'three';

const detailMaterials = {
  stone: new THREE.MeshStandardMaterial({ color: 0x989286, roughness: 0.9, metalness: 0.01 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x424846, roughness: 0.94, metalness: 0.01 }),
  brick: new THREE.MeshStandardMaterial({ color: 0x625f57, roughness: 0.97, metalness: 0 }),
  redTimber: new THREE.MeshStandardMaterial({ color: 0x6d302c, roughness: 0.8, metalness: 0.01 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x173c45, roughness: 0.22, metalness: 0.08 }),
  tile: new THREE.MeshStandardMaterial({ color: 0x294d48, roughness: 0.82, metalness: 0.03 }),
};

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addFrontWindowWithMullions(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): void {
  addBox(group, [width + 0.72, height + 0.72, 0.2], [x, y, z], detailMaterials.redTimber);
  addBox(group, [width, height, 0.24], [x, y, z + 0.13], detailMaterials.glass);
  addBox(group, [0.16, height, 0.28], [x, y, z + 0.28], detailMaterials.redTimber);
  addBox(group, [width, 0.16, 0.28], [x, y, z + 0.28], detailMaterials.redTimber);
  addBox(group, [width + 1.2, 0.34, 0.55], [x, y - height / 2 - 0.35, z + 0.08], detailMaterials.stone);
}

function addSideWindowWithMullions(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  side: -1 | 1,
): void {
  addBox(group, [0.2, height + 0.72, width + 0.72], [x, y, z], detailMaterials.redTimber);
  addBox(group, [0.24, height, width], [x + side * 0.13, y, z], detailMaterials.glass);
  addBox(group, [0.28, height, 0.16], [x + side * 0.28, y, z], detailMaterials.redTimber);
  addBox(group, [0.28, 0.16, width], [x + side * 0.28, y, z], detailMaterials.redTimber);
}

function addArchedPortal(
  group: THREE.Group,
  x: number,
  baseY: number,
  z: number,
  width: number,
  height: number,
): void {
  const jambWidth = 0.72;
  const straightHeight = height - width / 2;
  addBox(
    group,
    [jambWidth, straightHeight, 0.85],
    [x - width / 2 + jambWidth / 2, baseY + straightHeight / 2, z],
    detailMaterials.stone,
  );
  addBox(
    group,
    [jambWidth, straightHeight, 0.85],
    [x + width / 2 - jambWidth / 2, baseY + straightHeight / 2, z],
    detailMaterials.stone,
  );

  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(width / 2 - jambWidth / 2, jambWidth / 2, 8, 24, Math.PI),
    detailMaterials.stone,
  );
  arc.position.set(x, baseY + straightHeight, z);
  arc.rotation.z = Math.PI;
  arc.castShadow = true;
  group.add(arc);

  addBox(
    group,
    [width - jambWidth * 2, straightHeight - 0.3, 0.3],
    [x, baseY + straightHeight / 2, z + 0.5],
    detailMaterials.glass,
  );
  addBox(group, [0.18, straightHeight - 0.3, 0.36], [x, baseY + straightHeight / 2, z + 0.68], detailMaterials.redTimber);
}

function addCorniceBand(
  group: THREE.Group,
  width: number,
  depth: number,
  y: number,
  centerX = 0,
  centerZ = -1,
): void {
  addBox(group, [width + 1.2, 0.52, 0.72], [centerX, y, centerZ + depth / 2 + 0.18], detailMaterials.stone);
  addBox(group, [width + 1.2, 0.52, 0.72], [centerX, y, centerZ - depth / 2 - 0.18], detailMaterials.stone);
  addBox(group, [0.72, 0.52, depth], [centerX - width / 2 - 0.18, y, centerZ], detailMaterials.stone);
  addBox(group, [0.72, 0.52, depth], [centerX + width / 2 + 0.18, y, centerZ], detailMaterials.stone);
}

function addEaveBrackets(
  group: THREE.Group,
  width: number,
  z: number,
  y: number,
  count: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const x = count === 1 ? 0 : -width / 2 + (width * index) / (count - 1);
    addBox(group, [0.55, 0.72, 1.15], [x, y, z], detailMaterials.redTimber);
    addBox(group, [1.15, 0.34, 1.3], [x, y + 0.5, z], detailMaterials.redTimber);
  }
}

function addTowerWindows(group: THREE.Group): void {
  const radius = 11.95;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4 + Math.PI / 8;
    const windowGroup = new THREE.Group();
    addBox(windowGroup, [3.2, 4.2, 0.24], [0, 0, 0], detailMaterials.redTimber);
    addBox(windowGroup, [2.5, 3.5, 0.3], [0, 0, 0.16], detailMaterials.glass);
    addBox(windowGroup, [0.16, 3.5, 0.34], [0, 0, 0.34], detailMaterials.redTimber);
    addBox(windowGroup, [2.5, 0.16, 0.34], [0, 0, 0.34], detailMaterials.redTimber);
    windowGroup.position.set(Math.sin(angle) * radius, 33, -1 + Math.cos(angle) * radius);
    windowGroup.rotation.y = angle;
    group.add(windowGroup);
  }
}

function addRoofRidges(group: THREE.Group): void {
  addBox(group, [35, 0.75, 0.9], [0, 31.3, -1], detailMaterials.tile);
  addBox(group, [18.5, 0.7, 0.8], [-31.5, 26.8, -1], detailMaterials.tile);
  addBox(group, [18.5, 0.7, 0.8], [31.5, 26.8, -1], detailMaterials.tile);

  for (const side of [-1, 1]) {
    const ridge = addBox(group, [0.72, 0.72, 24], [side * 18.5, 29.5, -1], detailMaterials.tile);
    ridge.rotation.z = side * -0.2;
  }

  const finialBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.25, 2.4, 8),
    detailMaterials.darkStone,
  );
  finialBase.position.set(0, 57.6, -1);
  finialBase.castShadow = true;
  group.add(finialBase);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.2, 8), detailMaterials.tile);
  finial.position.set(0, 60.4, -1);
  finial.castShadow = true;
  group.add(finial);
}

function addDetailedStair(group: THREE.Group): void {
  const count = 12;
  for (let index = 0; index < count; index += 1) {
    const width = 30 - index * 0.55;
    addBox(
      group,
      [width, 0.42, 1.05],
      [0, 0.35 + index * 0.4, 35.2 - index * 0.95],
      detailMaterials.stone,
    );
  }
}

export function addOldLibraryL3Details(group: THREE.Group): void {
  group.userData.fidelityLevel = 'L3-facade-detail';

  addCorniceBand(group, 42, 34, 23.5);
  addCorniceBand(group, 23, 42, 19.8, -31.5);
  addCorniceBand(group, 23, 42, 19.8, 31.5);
  addCorniceBand(group, 22, 9, 27.2, 0, 18.2);

  for (const rowY of [11, 15.4, 19.8]) {
    for (const x of [-16.5, -11, -5.5, 0, 5.5, 11, 16.5]) {
      addFrontWindowWithMullions(group, x, rowY, 16.34, 2.5, 3.1);
    }
  }

  for (const side of [-1, 1] as const) {
    for (const rowY of [10.2, 14.4, 18.6]) {
      for (const z of [-13, -7, -1, 5, 11]) {
        addSideWindowWithMullions(group, side * 43.22, rowY, z, 2.3, 3, side);
      }
    }
  }

  for (const x of [-8.2, 0, 8.2]) {
    addArchedPortal(group, x, 5.2, 23.35, 5.3, 8.4);
  }

  addEaveBrackets(group, 45, 20.7, 25.4, 13);
  addEaveBrackets(group, 27, 23.4, 47.2, 9);
  addTowerWindows(group);
  addRoofRidges(group);
  addDetailedStair(group);

  for (const x of [-22.5, 22.5]) {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(6.75, 0.45, 8, 28),
      detailMaterials.stone,
    );
    collar.position.set(x, 18.8, 17.4);
    collar.rotation.x = Math.PI / 2;
    collar.castShadow = true;
    group.add(collar);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.8, 12), detailMaterials.tile);
    finial.position.set(x, 25.2, 17.4);
    finial.castShadow = true;
    group.add(finial);
  }
}
