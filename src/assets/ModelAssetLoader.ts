import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AssetRecord } from './types';

const LOADABLE_STATUSES = new Set<AssetRecord['status']>(['blockout', 'available', 'detailed', 'final']);

export class ModelAssetLoader {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<THREE.Group>>();

  canLoad(asset: AssetRecord): boolean {
    return LOADABLE_STATUSES.has(asset.status);
  }

  load(asset: AssetRecord): Promise<THREE.Group> {
    if (!this.canLoad(asset)) {
      return Promise.reject(new Error(`资产 ${asset.id} 当前状态为 ${asset.status}，不能加载`));
    }

    const cached = this.cache.get(asset.id);
    if (cached) return cached;

    const url = `${import.meta.env.BASE_URL}${asset.modelPath}`;
    const promise = this.loader.loadAsync(url).then((gltf) => {
      const root = gltf.scene;
      root.name = asset.id;
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      return root;
    });

    this.cache.set(asset.id, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
  }
}
