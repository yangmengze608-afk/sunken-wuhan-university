import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CampusDataset, CampusPlace } from '../data/types';

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
    private readonly onSelect: (place: CampusPlace) => void,
  ) {
    this.scene.background = new THREE.Color(0x041820);
    this.scene.fog = new THREE.FogExp2(0x09242c, 0.0025);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 3000);
    this.camera.position.set(320, 260, 420);

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
    this.controls.maxDistance = 1200;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.set(0, 0, 0);

    this.addEnvironment();
    this.addZones();
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
    const target = new THREE.Vector3(place.position.x, place.position.y, place.position.z);
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

  private addEnvironment(): void {
    const hemisphere = new THREE.HemisphereLight(0x9ad8cf, 0x061319, 1.7);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xd7efe8, 3.1);
    sun.position.set(180, 420, 160);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    this.scene.add(sun);

    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 760, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x173330, roughness: 0.96, metalness: 0.02 }),
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -1;
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    const grid = new THREE.GridHelper(900, 90, 0x47786f, 0x244840);
    grid.position.y = -0.7;
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    for (const material of materials) {
      material.transparent = true;
      material.opacity = 0.18;
    }
    this.scene.add(grid);
  }

  private addZones(): void {
    for (const zone of this.dataset.zones) {
      const geometry = new THREE.BoxGeometry(zone.size.width, 1, zone.size.depth);
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x5ea897, transparent: true, opacity: 0.25 }),
      );
      line.position.set(zone.center.x, zone.center.y, zone.center.z);
      this.scene.add(line);
    }
  }

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
      mesh.position.set(place.position.x, place.position.y + height / 2, place.position.z);
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
