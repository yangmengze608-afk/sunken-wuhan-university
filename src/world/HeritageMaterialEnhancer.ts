import * as THREE from 'three';

type TextureKind = 'brick' | 'stone' | 'tile' | 'wood';
type TextureChannel = 'albedo' | 'roughness' | 'normal';

const textureCache = new Map<string, THREE.DataTexture>();

function hash(x: number, y: number): number {
  let value = Math.imul(x + 17, 374761393) ^ Math.imul(y + 29, 668265263);
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function surfaceSignal(kind: TextureKind, x: number, y: number): number {
  const noise = hash(x, y) - 0.5;
  if (kind === 'brick') {
    const row = Math.floor(y / 12);
    const offset = row % 2 === 0 ? 0 : 9;
    const mortar = y % 12 < 1.6 || (x + offset) % 18 < 1.3;
    return mortar ? -0.65 + noise * 0.12 : noise * 0.45;
  }
  if (kind === 'stone') {
    const vein = Math.sin((x + y * 0.42) * 0.18) * 0.22;
    return noise * 0.52 + vein;
  }
  if (kind === 'tile') {
    const ridge = x % 12 < 2 || y % 18 < 1.5;
    return ridge ? -0.42 + noise * 0.12 : noise * 0.34;
  }
  const grain = Math.sin(y * 0.7 + Math.sin(x * 0.16) * 2.2) * 0.32;
  return grain + noise * 0.3;
}

function writePixel(
  data: Uint8Array,
  index: number,
  r: number,
  g: number,
  b: number,
): void {
  data[index] = Math.round(THREE.MathUtils.clamp(r, 0, 255));
  data[index + 1] = Math.round(THREE.MathUtils.clamp(g, 0, 255));
  data[index + 2] = Math.round(THREE.MathUtils.clamp(b, 0, 255));
  data[index + 3] = 255;
}

function createTexture(kind: TextureKind, channel: TextureChannel): THREE.DataTexture {
  const key = `${kind}:${channel}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const signal = surfaceSignal(kind, x, y);

      if (channel === 'albedo') {
        const base = kind === 'brick' ? 150 : kind === 'stone' ? 164 : kind === 'tile' ? 134 : 142;
        const contrast = kind === 'brick' ? 58 : kind === 'stone' ? 44 : 38;
        const tone = base + signal * contrast;
        writePixel(data, index, tone, tone, tone);
      } else if (channel === 'roughness') {
        const base = kind === 'tile' ? 188 : kind === 'wood' ? 208 : 232;
        const value = base - signal * (kind === 'tile' ? 24 : 16);
        writePixel(data, index, value, value, value);
      } else {
        const left = surfaceSignal(kind, Math.max(0, x - 1), y);
        const right = surfaceSignal(kind, Math.min(size - 1, x + 1), y);
        const down = surfaceSignal(kind, x, Math.max(0, y - 1));
        const up = surfaceSignal(kind, x, Math.min(size - 1, y + 1));
        const strength = kind === 'brick' ? 32 : kind === 'tile' ? 24 : 18;
        writePixel(
          data,
          index,
          128 + (left - right) * strength,
          128 + (down - up) * strength,
          246,
        );
      }
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'brick' ? 6 : 4, kind === 'tile' ? 6 : 4);
  texture.colorSpace = channel === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

function textureKindFor(color: THREE.Color): TextureKind | null {
  const hex = color.getHex();
  if ([0x625f57, 0x7c7669].includes(hex)) return 'brick';
  if ([0x8d897d, 0x454b49, 0x77756b, 0x4e5754, 0x989286, 0x424846, 0x77766f].includes(hex)) {
    return 'stone';
  }
  if ([0x2f5750, 0x344c48, 0x294d48].includes(hex)) return 'tile';
  if ([0x6d2f2b, 0x4d4037, 0x5a5147, 0x6d302c].includes(hex)) return 'wood';
  return null;
}

function enhanceMaterial(material: THREE.Material): THREE.Material {
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;
  const kind = textureKindFor(material.color);
  if (!kind) return material;

  const enhanced = material.clone();
  enhanced.name = `${kind}-procedural-pbr`;
  enhanced.map = createTexture(kind, 'albedo');
  enhanced.roughnessMap = createTexture(kind, 'roughness');
  enhanced.normalMap = createTexture(kind, 'normal');
  enhanced.normalScale.setScalar(kind === 'brick' ? 0.72 : kind === 'tile' ? 0.55 : 0.38);
  enhanced.roughness = kind === 'tile' ? 0.76 : kind === 'wood' ? 0.84 : 0.94;
  enhanced.metalness = kind === 'tile' ? 0.035 : 0.01;
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
