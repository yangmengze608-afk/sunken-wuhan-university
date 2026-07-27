import * as THREE from 'three';

const materials = {
  greyBrick: new THREE.MeshStandardMaterial({ color: 0x625f57, roughness: 0.96, metalness: 0.01 }),
  paleStone: new THREE.MeshStandardMaterial({ color: 0x8d897d, roughness: 0.92, metalness: 0.01 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x454b49, roughness: 0.94, metalness: 0.01 }),
  greenTile: new THREE.MeshStandardMaterial({ color: 0x2f5750, roughness: 0.82, metalness: 0.04 }),
  redFrame: new THREE.MeshStandardMaterial({ color: 0x6d2f2b, roughness: 0.78, metalness: 0.02 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x173b43, roughness: 0.28, metalness: 0.08 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x4d4037, roughness: 0.88, metalness: 0.01 }),
  stair: new THREE.MeshStandardMaterial({ color: 0x77766f, roughness: 0.98, metalness: 0 }),
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

function addCylinder(
  group: THREE.Group,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    material,
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addHipRoof(
  group: THREE.Group,
  width: number,
  depth: number,
  height: number,
  position: [number, number, number],
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.08, 1, 1, 4, 1, false);
  geometry.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(geometry, materials.greenTile);
  roof.scale.set(width * 0.72, height, depth * 0.72);
  roof.position.set(...position);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  return roof;
}

function addDome(
  group: THREE.Group,
  radius: number,
  position: [number, number, number],
): THREE.Mesh {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.greenTile,
  );
  dome.position.set(...position);
  dome.castShadow = true;
  dome.receiveShadow = true;
  group.add(dome);
  return dome;
}

function addColumns(
  group: THREE.Group,
  count: number,
  span: number,
  height: number,
  z: number,
  y: number,
  radius = 0.58,
): void {
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.08, height, 12);
  const instances = new THREE.InstancedMesh(geometry, materials.paleStone, count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const x = count === 1 ? 0 : -span / 2 + (span * index) / (count - 1);
    matrix.makeTranslation(x, y + height / 2, z);
    instances.setMatrixAt(index, matrix);
  }
  instances.instanceMatrix.needsUpdate = true;
  instances.castShadow = true;
  instances.receiveShadow = true;
  group.add(instances);
}

function addFrontWindowGrid(
  group: THREE.Group,
  columns: number,
  rows: number,
  span: number,
  baseY: number,
  z: number,
  spacingY: number,
  windowSize: [number, number],
): void {
  const count = columns * rows;
  const frameGeometry = new THREE.BoxGeometry(windowSize[0] + 0.7, windowSize[1] + 0.7, 0.2);
  const glassGeometry = new THREE.BoxGeometry(windowSize[0], windowSize[1], 0.24);
  const frames = new THREE.InstancedMesh(frameGeometry, materials.redFrame, count);
  const panes = new THREE.InstancedMesh(glassGeometry, materials.glass, count);
  const matrix = new THREE.Matrix4();
  let cursor = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = columns === 1 ? 0 : -span / 2 + (span * column) / (columns - 1);
      const y = baseY + row * spacingY;
      matrix.makeTranslation(x, y, z);
      frames.setMatrixAt(cursor, matrix);
      matrix.makeTranslation(x, y, z + 0.12);
      panes.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
  }

  frames.instanceMatrix.needsUpdate = true;
  panes.instanceMatrix.needsUpdate = true;
  group.add(frames, panes);
}

function addSideWindowGrid(
  group: THREE.Group,
  sideX: number,
  columns: number,
  rows: number,
  span: number,
  baseY: number,
  centerZ: number,
  spacingY: number,
): void {
  const count = columns * rows;
  const frameGeometry = new THREE.BoxGeometry(0.2, 3.2, 2.6);
  const glassGeometry = new THREE.BoxGeometry(0.24, 2.5, 1.9);
  const frames = new THREE.InstancedMesh(frameGeometry, materials.redFrame, count);
  const panes = new THREE.InstancedMesh(glassGeometry, materials.glass, count);
  const matrix = new THREE.Matrix4();
  let cursor = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const z = columns === 1 ? centerZ : centerZ - span / 2 + (span * column) / (columns - 1);
      const y = baseY + row * spacingY;
      matrix.makeTranslation(sideX, y, z);
      frames.setMatrixAt(cursor, matrix);
      matrix.makeTranslation(sideX + Math.sign(sideX) * 0.12, y, z);
      panes.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
  }

  frames.instanceMatrix.needsUpdate = true;
  panes.instanceMatrix.needsUpdate = true;
  group.add(frames, panes);
}

function addStoneBalustrade(
  group: THREE.Group,
  width: number,
  y: number,
  z: number,
): void {
  addBox(group, [width, 0.55, 0.7], [0, y + 2.2, z], materials.paleStone);
  const count = Math.max(4, Math.round(width / 4));
  const geometry = new THREE.BoxGeometry(0.55, 2.2, 0.55);
  const posts = new THREE.InstancedMesh(geometry, materials.paleStone, count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const x = -width / 2 + (width * index) / Math.max(count - 1, 1);
    matrix.makeTranslation(x, y + 1.1, z);
    posts.setMatrixAt(index, matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = true;
  posts.receiveShadow = true;
  group.add(posts);
}

function createDormWing(
  x: number,
  z: number,
  baseY: number,
  height: number,
  depth: number,
  innerSide: -1 | 1,
): THREE.Group {
  const wing = new THREE.Group();
  wing.position.set(x, 0, z);
  addBox(wing, [23, height, depth], [0, baseY + height / 2, 0], materials.greyBrick);
  addHipRoof(wing, 28, depth + 6, 5.5, [0, baseY + height + 3, 0]);
  addSideWindowGrid(
    wing,
    innerSide * 11.65,
    7,
    3,
    depth - 10,
    baseY + 4,
    0,
    4.3,
  );
  addBox(
    wing,
    [0.45, height - 3, 3.8],
    [innerSide * 11.9, baseY + height / 2, depth / 2 - 6],
    materials.redFrame,
  );
  addBox(
    wing,
    [0.45, height - 3, 3.8],
    [innerSide * 11.9, baseY + height / 2, -depth / 2 + 6],
    materials.redFrame,
  );
  return wing;
}

export function createOldDormitoriesDetailed(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Dormitories Heritage Reference Blockout';
  group.userData.sourceIds = [
    'source-whu-old-dorm-restoration-2016',
    'source-wikimedia-old-dorm-howchou-2012',
  ];

  addBox(group, [124, 3.8, 82], [0, 1.9, -2], materials.darkStone);
  addBox(group, [110, 3.2, 66], [0, 5.4, -8], materials.paleStone);
  addBox(group, [94, 2.8, 50], [0, 8.4, -15], materials.darkStone);

  const lowerLeft = createDormWing(-33, 10, 7.4, 16, 48, 1);
  const lowerRight = createDormWing(33, 10, 7.4, 16, 48, -1);
  const upperLeft = createDormWing(-33, -28, 12, 18, 40, 1);
  const upperRight = createDormWing(33, -28, 12, 18, 40, -1);
  group.add(lowerLeft, lowerRight, upperLeft, upperRight);

  addBox(group, [58, 14, 18], [0, 18.5, -31], materials.greyBrick);
  addFrontWindowGrid(group, 9, 2, 48, 16, -21.9, 4.6, [2.3, 2.8]);
  addHipRoof(group, 66, 26, 5.8, [0, 28.4, -31]);

  addBox(group, [42, 4.2, 7.2], [0, 15.5, 8], materials.greyBrick);
  addHipRoof(group, 48, 12, 3.8, [0, 19.6, 8]);
  addFrontWindowGrid(group, 6, 1, 31, 15.8, 11.75, 4, [2.4, 2.3]);

  addBox(group, [42, 4.2, 7.2], [0, 23.2, -22], materials.greyBrick);
  addHipRoof(group, 48, 12, 3.8, [0, 27.3, -22]);
  addFrontWindowGrid(group, 6, 1, 31, 23.4, -18.25, 4, [2.4, 2.3]);

  for (const x of [-32, 0, 32]) {
    addBox(group, [15, 6.5, 12], [x, 34, -30], materials.greyBrick);
    addHipRoof(group, 20, 18, 5.8, [x, 40, -30]);
  }

  addBox(group, [82, 1.2, 7], [0, 10.4, 24], materials.stair);
  addStoneBalustrade(group, 92, 10.8, 28);
  addStoneBalustrade(group, 74, 29.6, -43);

  group.userData.accuracy = 'reference-informed-blockout-not-surveyed';
  return group;
}

export function createHundredStepsDetailed(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Hundred-Step Stairway 108-Step Reference Blockout';
  group.userData.sourceIds = [
    'source-whu-encounter-campus-2015',
    'source-whu-early-architecture-beauty-2016',
  ];

  const count = 108;
  const tread = 0.59;
  const rise = 0.17;
  const width = 12.4;
  const geometry = new THREE.BoxGeometry(width, rise + 0.04, tread + 0.04);
  const stairs = new THREE.InstancedMesh(geometry, materials.stair, count);
  const matrix = new THREE.Matrix4();

  for (let index = 0; index < count; index += 1) {
    const y = index * rise + rise / 2;
    const z = 31.6 - index * tread;
    matrix.makeTranslation(0, y, z);
    stairs.setMatrixAt(index, matrix);
  }
  stairs.instanceMatrix.needsUpdate = true;
  stairs.castShadow = true;
  stairs.receiveShadow = true;
  group.add(stairs);

  const wallGeometry = new THREE.BoxGeometry(1.1, 2.3, tread * 12.2);
  const walls = new THREE.InstancedMesh(wallGeometry, materials.darkStone, 18);
  let cursor = 0;
  for (const side of [-1, 1]) {
    for (let segment = 0; segment < 9; segment += 1) {
      const centerIndex = segment * 12 + 5.5;
      const y = centerIndex * rise + 1.15;
      const z = 31.6 - centerIndex * tread;
      matrix.makeTranslation(side * (width / 2 + 0.85), y, z);
      walls.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
  }
  walls.instanceMatrix.needsUpdate = true;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  for (const index of [36, 72]) {
    const y = index * rise + 0.2;
    const z = 31.6 - index * tread;
    addBox(group, [17, 0.45, 4.8], [0, y, z], materials.paleStone);
  }

  addBox(group, [18, 0.7, 7], [0, 0.35, 35.2], materials.paleStone);
  addBox(group, [18, 0.7, 7], [0, count * rise + 0.1, -34.5], materials.paleStone);
  addStoneBalustrade(group, 17, count * rise + 0.4, -37.6);

  group.userData.accuracy = 'reference-informed-step-count-not-surveyed';
  return group;
}

export function createOldLibraryDetailed(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Library Heritage Reference Blockout';
  group.userData.sourceIds = [
    'source-hubei-archives-early-drawings-2021',
    'source-whu-early-architecture-beauty-2016',
    'source-wikimedia-old-library-front-howchou-2012',
    'source-wikimedia-old-library-side-tigerlihao-2012',
  ];

  addBox(group, [70, 3.2, 54], [0, 1.6, 0], materials.darkStone);
  addBox(group, [62, 3.4, 48], [0, 4.9, 0], materials.paleStone);
  addBox(group, [42, 18, 34], [0, 15.5, -1], materials.greyBrick);

  addBox(group, [23, 14, 42], [-31.5, 13, -1], materials.greyBrick);
  addBox(group, [23, 14, 42], [31.5, 13, -1], materials.greyBrick);
  addHipRoof(group, 29, 50, 6.2, [-31.5, 23.1, -1]);
  addHipRoof(group, 29, 50, 6.2, [31.5, 23.1, -1]);

  addBox(group, [22, 20, 9], [0, 17.5, 18.2], materials.paleStone);
  addColumns(group, 7, 31, 10.5, 22.9, 7.2, 0.7);
  addBox(group, [36, 1.2, 3.1], [0, 13, 22.9], materials.timber);
  addFrontWindowGrid(group, 5, 3, 15, 12.2, 22.82, 4.1, [2.5, 3.1]);

  addFrontWindowGrid(group, 7, 3, 34, 10.4, 16.15, 4.4, [2.7, 3.2]);
  addFrontWindowGrid(group, 4, 3, 15, 9.5, 20.2, 4.1, [2.6, 3.1]);
  addSideWindowGrid(group, -43.1, 6, 3, 30, 9.5, -1, 4.2);
  addSideWindowGrid(group, 43.1, 6, 3, 30, 9.5, -1, 4.2);

  const leftCorner = addCylinder(group, 6.2, 6.8, 10.5, 20, [-22.5, 13.7, 17.4], materials.paleStone);
  const rightCorner = addCylinder(group, 6.2, 6.8, 10.5, 20, [22.5, 13.7, 17.4], materials.paleStone);
  leftCorner.scale.z = 0.92;
  rightCorner.scale.z = 0.92;
  addDome(group, 6.6, [-22.5, 19, 17.4]);
  addDome(group, 6.6, [22.5, 19, 17.4]);

  const tower = addCylinder(group, 10.5, 11.8, 15.5, 8, [0, 33, -1], materials.paleStone);
  tower.rotation.y = Math.PI / 8;
  addFrontWindowGrid(group, 5, 2, 20, 29.5, 10.1, 4.6, [2.7, 3.1]);

  addHipRoof(group, 50, 42, 7.5, [0, 27.4, -1]);
  addHipRoof(group, 29, 29, 8.2, [0, 45.4, -1]);

  addCylinder(group, 2.2, 2.8, 5.2, 8, [0, 51.7, -1], materials.darkStone);
  addCylinder(group, 1.2, 1.8, 3.2, 8, [0, 55.8, -1], materials.greenTile);

  addBox(group, [30, 0.8, 7], [0, 4.2, 28], materials.stair);
  addBox(group, [24, 0.8, 5], [0, 3.4, 33], materials.stair);
  addStoneBalustrade(group, 58, 6, 26.5);

  group.userData.accuracy = 'reference-informed-blockout-not-surveyed';
  return group;
}
