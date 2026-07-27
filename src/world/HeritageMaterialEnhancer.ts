import * as THREE from 'three';

type TextureKind = 'brick' | 'stone' | 'tile' | 'wood';

const textureCache = new Map<TextureKind, THREE.DataTexture>();

function hash(x: number, y: number): number {
  let value = Math.imul(x + 17, 374761393) ^ Math.imul(y + 29, 668265263);
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function createTexture(kind: TextureKind): THREE.DataTexture {
  const cached = textureCache.get(kind);
  if (cached) return cached;

  const size = 96;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const noise = hash(x, y) - 0.5;
      let tone = 150 + noise * 34;

      if (kind === 'brick') {
        const row = Math.floor(y / 12);
        const offset = row % 2 === 0 ? 0 : 9;
        const mortar = y % 12 < 1.6 || (x + offset) % 18 < 1.3;
        tone = mortar ? 82 + noise * 12 : 145 + noise * 30;
      } else if (kind === 'stone') {
        const vein = Math.sin((x + y * 0.42) * 0.18) * 9;
        tone = 154 + noise * 38 + vein;
      } else if (kind === 'tile') {
        const ridge = x % 12 < 2 || y % 18 < 1.5;
        tone = ridge ? 86 + noise * 10 : 132 + noise * 22;
      } else {
        const grain = Math.sin(y * 0.7 + Math.sin(x * 0.16) * 2.2) * 13;
        tone = 136 + grain + noise * 18;
      }

      const value = Math.round(THREE.MathUtils.clamp(tone, 35, 220));
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'brick' ? 5 : 4, kind === 'tile' ? 5 : 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(kind, texture);
  return texture;
}

function textureKindFor(color: THREE.Color): TextureKind | null {
  const hex = color.getHex();
  if ([0x625f57, 0x7c7669].includes(hex)) return 'brick';
  if ([0x8d897d, 0x454b49, 0x77756b, 0x4e5754].includes(hex)) return 'stone';
  if ([0x2f5750, 0x344c48].includes(hex)) return 'tile';
  if ([0x6d2f2b, 0x4d4037, 0x5a5147].includes(hex)) return 'wood';
  return null;
}

function enhanceMaterial(material: THREE.Material): THREE.Material {
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;
  const kind = textureKindFor(material.color);
  if (!kind) return material;

  const enhanced = material.clone();
  const texture = createTexture(kind);
  enhanced.map = texture;
  enhanced.bumpMap = texture;
  enhanced.bumpScale = kind === 'brick' ? 0.22 : kind === 'tile' ? 0.16 : 0.1;
  enhanced.roughness = kind === 'tile' ? 0.78 : 0.94;
  enhanced.needsUpdate = true;
  return enhanced;
}

export function enhanceHeritageMaterials(group: THREE.Group): void {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (Array.isArray(object.material)) {
      object.material = object.material.map(enhanceMaterial);
    } else {
      object.material = enhanceMaterial(object.material);
    }
  });
}
