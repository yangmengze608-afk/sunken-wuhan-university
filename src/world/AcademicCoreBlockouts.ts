import * as THREE from 'three';

const materials = {
  greyBrick: new THREE.MeshStandardMaterial({ color: 0x625f57, roughness: 0.95, metalness: 0.01 }),
  paleStone: new THREE.MeshStandardMaterial({ color: 0x8d897d, roughness: 0.92, metalness: 0.01 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x454b49, roughness: 0.94, metalness: 0.01 }),
  greenTile: new THREE.MeshStandardMaterial({ color: 0x2f5750, roughness: 0.82, metalness: 0.04 }),
  redFrame: new THREE.MeshStandardMaterial({ color: 0x6d2f2b, roughness: 0.78, metalness: 0.02 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x173b43, roughness: 0.28, metalness: 0.08 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x4d4037, roughness: 0.88, metalness: 0.01 }),
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
    new THREE.SphereGeometry(radius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
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
  radius = 0.62,
): void {
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.08, height, 12);
  const columns = new THREE.InstancedMesh(geometry, materials.paleStone, count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const x = count === 1 ? 0 : -span / 2 + (span * index) / (count - 1);
    matrix.makeTranslation(x, y + height / 2, z);
    columns.setMatrixAt(index, matrix);
  }
  columns.instanceMatrix.needsUpdate = true;
  columns.castShadow = true;
  columns.receiveShadow = true;
  group.add(columns);
}

function addFrontWindows(
  group: THREE.Group,
  columns: number,
  rows: number,
  span: number,
  baseY: number,
  z: number,
  spacingY: number,
  width = 2.4,
  height = 3,
): void {
  const count = columns * rows;
  const frameGeometry = new THREE.BoxGeometry(width + 0.55, height + 0.55, 0.2);
  const glassGeometry = new THREE.BoxGeometry(width, height, 0.24);
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

function addSideWindows(
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
  const frameGeometry = new THREE.BoxGeometry(0.2, 3.4, 2.8);
  const glassGeometry = new THREE.BoxGeometry(0.24, 2.8, 2.2);
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

export function createAdministrationBuildingDetailed(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Administration Building Reference Blockout';
  group.userData.sourceIds = ['source-whu-luojia-architecture-2022'];

  addBox(group, [92, 3, 38], [0, 1.5, 0], materials.darkStone);
  addBox(group, [84, 2.4, 32], [0, 4.2, 0], materials.paleStone);

  addBox(group, [34, 24, 29], [0, 17.4, -1], materials.greyBrick);
  addBox(group, [27, 18, 25], [-32, 14.4, -1], materials.greyBrick);
  addBox(group, [27, 18, 25], [32, 14.4, -1], materials.greyBrick);
  addBox(group, [13, 15, 19], [-19.5, 13, -1], materials.greyBrick);
  addBox(group, [13, 15, 19], [19.5, 13, -1], materials.greyBrick);

  addColumns(group, 7, 25, 10.5, 16.3, 6.1, 0.68);
  addBox(group, [30, 1.2, 3.2], [0, 11.8, 16.3], materials.timber);
  addBox(group, [25, 5.5, 7], [0, 8.2, 13], materials.paleStone);

  addFrontWindows(group, 5, 3, 22, 13.2, 13.62, 4.5, 2.5, 3.2);

  for (const wingX of [-32, 32]) {
    const wing = new THREE.Group();
    wing.position.x = wingX;
    addFrontWindows(wing, 5, 3, 20, 10.5, 11.62, 4.2, 2.3, 3);
    group.add(wing);
  }

  addSideWindows(group, -45.62, 5, 3, 17, 10.5, -1, 4.2);
  addSideWindows(group, 45.62, 5, 3, 17, 10.5, -1, 4.2);

  addHipRoof(group, 42, 37, 7, [0, 33.1, -1]);
  addHipRoof(group, 33, 32, 5.8, [-32, 26.3, -1]);
  addHipRoof(group, 33, 32, 5.8, [32, 26.3, -1]);
  addBox(group, [15, 6.5, 13], [0, 33.5, -1], materials.greyBrick);
  addHipRoof(group, 21, 19, 5.2, [0, 39.2, -1]);

  addBox(group, [31, 0.8, 8], [0, 4.2, 22], materials.paleStone);
  addBox(group, [24, 0.8, 6], [0, 3.4, 27], materials.paleStone);
  addBox(group, [17, 0.8, 4], [0, 2.6, 31], materials.paleStone);

  group.userData.accuracy = 'reference-informed-blockout-not-surveyed';
  return group;
}

export function createScienceHallDetailed(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Science Hall Reference Blockout';
  group.userData.sourceIds = ['source-whu-luojia-architecture-2022'];

  addBox(group, [60, 3, 52], [0, 1.5, 0], materials.darkStone);
  addBox(group, [54, 2.6, 46], [0, 4.3, 0], materials.paleStone);
  addBox(group, [48, 21, 42], [0, 16.1, -1], materials.greyBrick);
  addBox(group, [13, 18, 28], [-30, 14.6, -1], materials.greyBrick);
  addBox(group, [13, 18, 28], [30, 14.6, -1], materials.greyBrick);

  addColumns(group, 7, 31, 11.5, 22.2, 5.8, 0.7);
  addBox(group, [36, 1.2, 3.2], [0, 12.3, 22.2], materials.timber);
  addBox(group, [30, 5.4, 8], [0, 8.1, 18], materials.paleStone);

  addFrontWindows(group, 7, 3, 34, 10.7, 20.12, 4.4, 2.6, 3.2);
  addSideWindows(group, -24.12, 6, 3, 30, 10.7, -1, 4.4);
  addSideWindows(group, 24.12, 6, 3, 30, 10.7, -1, 4.4);

  addHipRoof(group, 56, 50, 6.5, [0, 29.7, -1]);

  const drum = addCylinder(group, 11.5, 12.8, 9, 24, [0, 34.5, -1], materials.paleStone);
  drum.rotation.y = Math.PI / 24;
  const upperDrum = addCylinder(group, 8.8, 10.2, 5.5, 24, [0, 41.4, -1], materials.greyBrick);
  upperDrum.rotation.y = Math.PI / 24;
  addDome(group, 10.6, [0, 44.1, -1]);
  addCylinder(group, 1.4, 1.8, 4.2, 16, [0, 52.7, -1], materials.greenTile);

  addBox(group, [32, 0.8, 8], [0, 4.3, 27], materials.paleStone);
  addBox(group, [25, 0.8, 6], [0, 3.5, 32], materials.paleStone);

  group.userData.accuracy = 'reference-informed-blockout-not-surveyed';
  return group;
}
