import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CampusDataset, CampusPlace } from '../data/types';
import type { CampusCoverageDataset } from '../world/coverageTypes';
import { sampleTerrainHeight } from '../world/terrain';
import { WholeCampusWorld } from '../world/WholeCampusWorld';
import type { WholeCampusLayout } from '../world/types';

const CATEGORY_COLORS: Record<CampusPlace['category'], number> = {
  'historic-building': 0xb8a276,
  'teaching-building': 0x7f9f9a,
  sports: 0x7f7659,
  road: 0x54696b,
  gate: 0xa79679,
  landscape: 0x547b69,
  residential: 0x728b8c,
  facility: 0x8a8275,
};

export class CampusViewer {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly resizeObserver: ResizeObserver;
  private animationFrame = 0;
  private selectedId: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly dataset: CampusDataset,
    private readonly layout: WholeCampusLayout,
    coverage: CampusCoverageDataset,
    private readonly onSelect: (place: CampusPlace) => void,
  ) {
    this.scene.background = new THREE.Color(0x041820);
    this.scene.fog = new THREE.FogExp2(0x09242c, 0.00135);

    const worldWidth = layout.bounds.maxX - layout.bounds.minX;
    const worldDepth = layout.bounds.maxZ - layout.bounds.minZ;
    const overviewDistance = Math.max(worldWidth, worldDepth) * 0.78;

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 6000);
    this.camera.position.set(overviewDistance * 0.7, overviewDistance * 0.52, overviewDistance);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 35;
    this.controls.maxDistance = Math.max(worldWidth, worldDepth) * 1.8;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.set(0, 20, 0);

    const debugZones = new URLSearchParams(window.location.search).get('debug') === '1';
    new WholeCampusWorld(this.scene, layout, dataset, coverage, debugZones);
    this.addPlaces();

    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate();
  }

  focusPlace(placeId: string): void {
    const place = this.dataset.places.find((item) => item.id === placeId);
    const mesh = this.meshes.get(placeId);
    if (!place || !mesh) return;

    if (this.selectedId) {
      const previous = this.meshes.get(this.selectedId);
      const material = previous?.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.setHex(0x000000);
      }
    }

    const material = mesh.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.emissive.setHex(0x173c36);
      material.emissiveIntensity = 0.9;
    }

    this.selectedId = placeId;
    const target = mesh.position.clone();
    const extent = Math.max(place.dimensions.width, place.dimensions.depth, place.dimensions.height, 20);
    this.controls.target.copy(target);
    this.camera.position.set(target.x + extent * 1.8, target.y + extent * 1.35, target.z + extent * 1.8);
    this.controls.update();
    this.onSelect(place);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.controls.dispose();
    this.renderer.dispose();
    this.container.replaceChildren();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersections = this.raycaster.intersectObjects([...this.meshes.values()], false);
    const placeId = intersections[0]?.object.userData.placeId as string | undefined;
    if (placeId) this.focusPlace(placeId);
  };

  private addPlaces(): void {
    for (const place of this.dataset.places) {
      const height = Math.max(place.dimensions.height, 0.4);
      const geometry = new THREE.BoxGeometry(place.dimensions.width, height, place.dimensions.depth);
      const material = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLORS[place.category],
        roughness: 0.78,
        metalness: 0.04,
        transparent: place.reconstructionStatus === 'placeholder',
        opacity: place.reconstructionStatus === 'placeholder' ? 0.74 : 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const terrainY = sampleTerrainHeight(this.layout, place.position.x, place.position.z);
      mesh.position.set(
        place.position.x,
        terrainY + place.position.y + height / 2,
        place.position.z,
      );
      mesh.rotation.y = place.rotationY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.placeId = place.id;
      mesh.name = place.nameZh;
      this.meshes.set(place.id, mesh);
      this.scene.add(mesh);
    }
  }

  private resize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private readonly animate = (): void => {
    this.animationFrame = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
