import * as THREE from 'three';

const materials = {
  brick: new THREE.MeshStandardMaterial({ color: 0x625f57, roughness: 0.97, metalness: 0 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x989286, roughness: 0.9, metalness: 0.01 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x424846, roughness: 0.94, metalness: 0.01 }),
  redTimber: new THREE.MeshStandardMaterial({ color: 0x6d302c, roughness: 0.8, metalness: 0.01 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x173c45, roughness: 0.22, metalness: 0.08 }),
  tile: new THREE.MeshStandardMaterial({ color: 0x294d48, roughness: 0.82, metalness: 0.03 }),
};

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  name?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (name) mesh.name = name;
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
  name?: string,
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.08, 1, 1, 4, 1, false);
  geometry.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(geometry, materials.tile);
  roof.scale.set(width * 0.72, height, depth * 0.72);
  roof.position.set(...position);
  if (name) roof.name = name;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  return roof;
}

function addWindow(
  group: THREE.Group,
  position: [number, number, number],
  size: [number, number],
  facing: 'front' | 'back' | 'left' | 'right',
): void {
  const [width, height] = size;
  const window = new THREE.Group();
  window.name = `OldLibraryWindow-${facing}`;

  if (facing === 'front' || facing === 'back') {
    const direction = facing === 'front' ? 1 : -1;
    addBox(window, [width + 0.7, height + 0.7, 0.2], [0, 0, 0], materials.redTimber);
    addBox(window, [width, height, 0.24], [0, 0, direction * 0.13], materials.glass);
    addBox(window, [0.16, height, 0.3], [0, 0, direction * 0.3], materials.redTimber);
    addBox(window, [width, 0.16, 0.3], [0, 0, direction * 0.3], materials.redTimber);
  } else {
    const direction = facing === 'right' ? 1 : -1;
    addBox(window, [0.2, height + 0.7, width + 0.7], [0, 0, 0], materials.redTimber);
    addBox(window, [0.24, height, width], [direction * 0.13, 0, 0], materials.glass);
    addBox(window, [0.3, height, 0.16], [direction * 0.3, 0, 0], materials.redTimber);
    addBox(window, [0.3, 0.16, width], [direction * 0.3, 0, 0], materials.redTimber);
  }

  window.position.set(...position);
  group.add(window);
}

function addFacadeWindowRows(
  group: THREE.Group,
  centerX: number,
  centerZ: number,
  width: number,
  facadeZ: number,
  facing: 'front' | 'back',
): void {
  const columns = 4;
  for (const y of [10.2, 14.5, 18.8]) {
    for (let index = 0; index < columns; index += 1) {
      const x = centerX - width * 0.32 + (width * 0.64 * index) / (columns - 1);
      addWindow(group, [x, y, facadeZ], [2.5, 3], facing);
    }
  }
  void centerZ;
}

function addAuxiliaryBuilding(
  group: THREE.Group,
  x: number,
  z: number,
  side: 'front' | 'rear',
): void {
  const facadeDirection = side === 'front' ? 1 : -1;
  const namePrefix = `OldLibrary-${side}-${x < 0 ? 'left' : 'right'}-auxiliary`;
  addBox(group, [22, 14, 18], [x, 13, z], materials.brick, `${namePrefix}-body`);
  addHipRoof(group, 27, 23, 5.5, [x, 23, z], `${namePrefix}-roof`);
  addFacadeWindowRows(
    group,
    x,
    z,
    22,
    z + facadeDirection * 9.1,
    side === 'front' ? 'front' : 'back',
  );

  const connectorZ = side === 'front' ? 7 : -9;
  addBox(
    group,
    [9, 11, 10],
    [x > 0 ? 15.5 : -15.5, 11.5, connectorZ],
    materials.brick,
    `${namePrefix}-connector`,
  );
}

function addEntranceColonnade(group: THREE.Group): void {
  const columnGeometry = new THREE.CylinderGeometry(0.72, 0.82, 10.5, 14);
  const columns = new THREE.InstancedMesh(columnGeometry, materials.stone, 8);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < 8; index += 1) {
    const x = -13.5 + (27 * index) / 7;
    matrix.makeTranslation(x, 12.45, 22.9);
    columns.setMatrixAt(index, matrix);
  }
  columns.instanceMatrix.needsUpdate = true;
  columns.castShadow = true;
  columns.receiveShadow = true;
  columns.name = 'OldLibraryEntranceColonnade';
  group.add(columns);
  addBox(group, [32, 1.2, 3.1], [0, 18.2, 22.9], materials.redTimber, 'OldLibraryEntranceEntablature');
}

function addArchedPortal(
  group: THREE.Group,
  x: number,
  baseY: number,
  z: number,
): void {
  const width = 5.3;
  const height = 8.4;
  const jambWidth = 0.72;
  const straightHeight = height - width / 2;
  addBox(
    group,
    [jambWidth, straightHeight, 0.85],
    [x - width / 2 + jambWidth / 2, baseY + straightHeight / 2, z],
    materials.stone,
  );
  addBox(
    group,
    [jambWidth, straightHeight, 0.85],
    [x + width / 2 - jambWidth / 2, baseY + straightHeight / 2, z],
    materials.stone,
  );
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(width / 2 - jambWidth / 2, jambWidth / 2, 8, 24, Math.PI),
    materials.stone,
  );
  arc.position.set(x, baseY + straightHeight, z);
  arc.rotation.z = Math.PI;
  arc.castShadow = true;
  group.add(arc);
  addBox(
    group,
    [width - jambWidth * 2, straightHeight - 0.3, 0.3],
    [x, baseY + straightHeight / 2, z + 0.5],
    materials.glass,
  );
}

function addDetailedEntranceStair(group: THREE.Group): void {
  for (let index = 0; index < 12; index += 1) {
    const width = 30 - index * 0.55;
    addBox(
      group,
      [width, 0.42, 1.05],
      [0, 0.35 + index * 0.4, 35.2 - index * 0.95],
      materials.stone,
    );
  }
}

function addTowerWindows(group: THREE.Group): void {
  const radius = 11.95;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4 + Math.PI / 8;
    const window = new THREE.Group();
    addBox(window, [3.2, 4.2, 0.24], [0, 0, 0], materials.redTimber);
    addBox(window, [2.5, 3.5, 0.3], [0, 0, 0.16], materials.glass);
    addBox(window, [0.16, 3.5, 0.34], [0, 0, 0.34], materials.redTimber);
    addBox(window, [2.5, 0.16, 0.34], [0, 0, 0.34], materials.redTimber);
    window.position.set(Math.sin(angle) * radius, 33, -1 + Math.cos(angle) * radius);
    window.rotation.y = angle;
    group.add(window);
  }
}

export function createOldLibraryIPlanLod0(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Old Library I-Plan LOD0 Detailed Asset';
  group.userData.sourceIds = [
    'source-jaabe-old-library-roof-2022',
    'source-hubei-archives-early-drawings-2021',
    'source-whu-early-architecture-beauty-2016',
    'source-wikimedia-old-library-front-howchou-2012',
    'source-wikimedia-old-library-side-tigerlihao-2012',
  ];
  group.userData.planComposition = 'I-shaped central main building with four auxiliary buildings';

  addBox(group, [78, 3.2, 58], [0, 1.6, 0], materials.darkStone, 'OldLibraryPlinthLower');
  addBox(group, [70, 3.4, 52], [0, 4.9, 0], materials.stone, 'OldLibraryPlinthUpper');

  addBox(group, [34, 18, 30], [0, 15.5, -1], materials.brick, 'OldLibraryCentralMainHall');
  addBox(group, [20, 14, 54], [0, 13, -2], materials.brick, 'OldLibraryCentralLongitudinalSpine');

  addAuxiliaryBuilding(group, -27, 13, 'front');
  addAuxiliaryBuilding(group, 27, 13, 'front');
  addAuxiliaryBuilding(group, -27, -17, 'rear');
  addAuxiliaryBuilding(group, 27, -17, 'rear');

  addBox(group, [22, 20, 9], [0, 17.5, 18.2], materials.stone, 'OldLibrarySouthEntranceHall');
  addEntranceColonnade(group);
  for (const x of [-8.2, 0, 8.2]) addArchedPortal(group, x, 5.2, 23.35);

  for (const y of [11, 15.4, 19.8]) {
    for (const x of [-13.5, -9, -4.5, 0, 4.5, 9, 13.5]) {
      addWindow(group, [x, y, 14.15], [2.4, 3], 'front');
    }
  }

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(10.5, 11.8, 15.5, 8),
    materials.stone,
  );
  tower.name = 'OldLibraryOctagonalTowerBody';
  tower.position.set(0, 33, -1);
  tower.rotation.y = Math.PI / 8;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);
  addTowerWindows(group);

  addHipRoof(group, 42, 38, 7.2, [0, 27.2, -1], 'OldLibraryCentralLowerRoof');
  addHipRoof(group, 29, 29, 8.2, [0, 45.4, -1], 'OldLibraryMainOctagonalRoofLOD0');

  addBox(group, [33, 0.7, 0.9], [0, 31.1, -1], materials.tile, 'OldLibraryCentralRoofRidge');
  addBox(group, [18, 0.7, 0.8], [0, 50.2, -1], materials.tile, 'OldLibraryOctagonalRoofRidge');

  const finialBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.25, 2.4, 8),
    materials.darkStone,
  );
  finialBase.position.set(0, 57.6, -1);
  finialBase.castShadow = true;
  group.add(finialBase);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.2, 8), materials.tile);
  finial.position.set(0, 60.4, -1);
  finial.castShadow = true;
  group.add(finial);

  addDetailedEntranceStair(group);
  group.userData.fidelityLevel = 'L3-I-plan-facade-detail';
  group.userData.accuracy = 'mixed-verified-constraints-and-estimated-proportions';
  return group;
}
