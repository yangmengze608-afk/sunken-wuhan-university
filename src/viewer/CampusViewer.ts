import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CampusDataset, CampusPlace } from '../data/types';
import { CampusGeoDataLayer } from '../geodata/CampusGeoDataLayer';
import type { CampusGeoFeatureCollection } from '../geodata/types';
import type { CampusCoverageDataset } from '../world/coverageTypes';
import { LandmarkBlockoutLayer } from '../world/LandmarkBlockouts';
import { sampleTerrainHeight } from '../world/terrain';
import { WholeCampusWorld } from '../world/WholeCampusWorld';
import type { WholeCampusLayout } from '../world/types';
import { SwimFirstPersonControls, type SwimTelemetry } from './SwimFirstPersonControls';

export type ViewMode = 'first-person' | 'overview';

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

function setObjectHighlighted(object: THREE.Object3D | undefined, highlighted: boolean): void {
  object?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.emissive.setHex(highlighted ? 0x173c36 : 0x000000);
      material.emissiveIntensity = highlighted ? 0.9 : 0;
    }
  });
}

export class CampusViewer {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly overviewControls: OrbitControls;
  private readonly swimControls: SwimFirstPersonControls;
  private readonly overviewPosition: THREE.Vector3;
  private readonly overviewTarget = new THREE.Vector3(0, 20, 0);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly placeObjects = new Map<string, THREE.Object3D>();
  private readonly interactiveObjects: THREE.Object3D[] = [];
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private animationFrame = 0;
  private telemetryTick = 0;
  private selectedId: string | null = null;
  private mode: ViewMode | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly dataset: CampusDataset,
    private readonly layout: WholeCampusLayout,
    coverage: CampusCoverageDataset,
    geoData: CampusGeoFeatureCollection,
    private readonly onSelect: (place: CampusPlace) => void,
    private readonly onModeChange: (mode: ViewMode) => void,
    private readonly onTelemetry: (telemetry: SwimTelemetry) => void,
  ) {
    this.scene.background = new THREE.Color(0x041820);
    this.scene.fog = new THREE.FogExp2(0x09242c, 0.00135);

    const worldWidth = layout.bounds.maxX - layout.bounds.minX;
    const worldDepth = layout.bounds.maxZ - layout.bounds.minZ;
    const overviewDistance = Math.max(worldWidth, worldDepth) * 0.78;
    this.overviewPosition = new THREE.Vector3(
      overviewDistance * 0.7,
      overviewDistance * 0.52,
      overviewDistance,
    );

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 6000);
    this.camera.position.copy(this.overviewPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.overviewControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.overviewControls.enableDamping = true;
    this.overviewControls.dampingFactor = 0.06;
    this.overviewControls.minDistance = 35;
    this.overviewControls.maxDistance = Math.max(worldWidth, worldDepth) * 1.8;
    this.overviewControls.maxPolarAngle = Math.PI * 0.49;
    this.overviewControls.target.copy(this.overviewTarget);
    this.overviewControls.enabled = false;

    const debugZones = new URLSearchParams(window.location.search).get('debug') === '1';
    new WholeCampusWorld(this.scene, layout, dataset, coverage, debugZones);
    const geoLayer = new CampusGeoDataLayer(this.scene, layout, geoData);
    const landmarkLayer = new LandmarkBlockoutLayer(this.scene, layout, dataset);
    this.swimControls = new SwimFirstPersonControls(
      this.camera,
      this.renderer.domElement,
      layout,
      landmarkLayer.collisionBoxes,
    );

    for (const placeId of landmarkLayer.representedPlaceIds) {
      const oldGeoObject = geoLayer.placeObjects.get(placeId);
      if (oldGeoObject) oldGeoObject.visible = false;
    }

    for (const [placeId, object] of geoLayer.placeObjects) {
      if (!landmarkLayer.representedPlaceIds.has(placeId)) {
        this.placeObjects.set(placeId, object);
      }
    }
    for (const [placeId, object] of landmarkLayer.placeObjects) {
      this.placeObjects.set(placeId, object);
    }

    this.interactiveObjects.push(
      ...geoLayer.clickableObjects.filter((object) => {
        const placeId = object.userData.placeId as string | null | undefined;
        return !placeId || !landmarkLayer.representedPlaceIds.has(placeId);
      }),
      ...landmarkLayer.clickableObjects,
    );

    const representedPlaceIds = new Set([
      ...geoLayer.representedPlaceIds,
      ...landmarkLayer.representedPlaceIds,
    ]);
    this.addFallbackPlaces(representedPlaceIds);

    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.setMode('first-person');
    this.animate();
  }

  setMode(mode: ViewMode): void {
    if (this.mode === mode) return;

    if (mode === 'first-person') {
      this.overviewControls.enabled = false;
      this.swimControls.setActive(true);
    } else {
      this.swimControls.setActive(false);
      this.camera.position.copy(this.overviewPosition);
      this.overviewControls.target.copy(this.overviewTarget);
      this.overviewControls.enabled = true;
      this.overviewControls.update();
    }

    this.mode = mode;
    this.onModeChange(mode);
  }

  toggleMode(): void {
    this.setMode(this.mode === 'first-person' ? 'overview' : 'first-person');
  }

  getMode(): ViewMode {
    return this.mode ?? 'first-person';
  }

  focusPlace(placeId: string): void {
    const place = this.dataset.places.find((item) => item.id === placeId);
    const object = this.placeObjects.get(placeId);
    if (!place || !object) return;

    if (this.selectedId) {
      setObjectHighlighted(this.placeObjects.get(this.selectedId), false);
    }
    setObjectHighlighted(object, true);
    this.selectedId = placeId;

    const bounds = new THREE.Box3().setFromObject(object);
    const target = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z, place.dimensions.width, 20);

    if (this.mode === 'first-person') {
      this.swimControls.moveNear(target, extent);
    } else {
      this.overviewControls.target.copy(target);
      this.camera.position.set(
        target.x + extent * 1.8,
        target.y + extent * 1.35,
        target.z + extent * 1.8,
      );
      this.overviewControls.update();
    }

    this.onSelect(place);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.swimControls.dispose();
    this.overviewControls.dispose();
    this.renderer.dispose();
    this.container.replaceChildren();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (this.mode === 'first-person' && this.swimControls.consumeClickSuppression()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersections = this.raycaster.intersectObjects(this.interactiveObjects, false);
    const placeId = intersections[0]?.object.userData.placeId as string | null | undefined;
    if (placeId) this.focusPlace(placeId);
  };

  private addFallbackPlaces(representedPlaceIds: ReadonlySet<string>): void {
    for (const place of this.dataset.places) {
      if (representedPlaceIds.has(place.id)) continue;

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
      this.placeObjects.set(place.id, mesh);
      this.interactiveObjects.push(mesh);
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
    const deltaSeconds = Math.min(this.clock.getDelta(), 0.05);

    if (this.mode === 'first-person') {
      this.swimControls.update(deltaSeconds);
      this.telemetryTick += 1;
      if (this.telemetryTick % 6 === 0) {
        this.onTelemetry(this.swimControls.getTelemetry());
      }
    } else {
      this.overviewControls.update();
    }

    this.renderer.render(this.scene, this.camera);
  };
}
