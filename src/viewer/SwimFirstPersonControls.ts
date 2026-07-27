import * as THREE from 'three';
import { pointHitsExpandedBox } from '../world/collision';
import { sampleTerrainHeight } from '../world/terrain';
import type { WholeCampusLayout } from '../world/types';

export interface SwimTelemetry {
  speed: number;
  terrainClearance: number;
  x: number;
  y: number;
  z: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isFormControl(target: EventTarget | null): boolean {
  return target instanceof HTMLButtonElement
    || target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement;
}

export class SwimFirstPersonControls {
  private yaw = 0;
  private pitch = -0.04;
  private speed = 28;
  private readonly velocity = new THREE.Vector3();
  private readonly keys = new Set<string>();
  private readonly savedPosition = new THREE.Vector3();
  private active = false;
  private suppressNextClick = false;
  private readonly collisionRadius = 1.1;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly domElement: HTMLElement,
    private readonly layout: WholeCampusLayout,
    private readonly collisionBoxes: readonly THREE.Box3[],
  ) {
    this.camera.rotation.order = 'YXZ';

    const startX = -70;
    const startZ = 90;
    const startY = sampleTerrainHeight(layout, startX, startZ) + 10;
    const targetX = -150;
    const targetZ = -72;
    const targetY = sampleTerrainHeight(layout, targetX, targetZ) + 24;
    this.savedPosition.set(startX, startY, startZ);
    this.lookAtFrom(startX, startY, startZ, targetX, targetY, targetZ);

    this.domElement.addEventListener('mousedown', this.handlePointerRequest);
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('pointerlockerror', this.handlePointerLockError);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.keys.clear();
    this.velocity.set(0, 0, 0);

    if (active) {
      this.camera.position.copy(this.savedPosition);
      this.applyRotation();
      this.domElement.classList.add('swim-active');
    } else {
      this.savedPosition.copy(this.camera.position);
      if (this.isPointerLocked()) document.exitPointerLock();
      this.domElement.classList.remove('swim-active', 'pointer-locked');
      document.body.classList.remove('pointer-locked');
    }
  }

  isActive(): boolean {
    return this.active;
  }

  isPointerLocked(): boolean {
    return document.pointerLockElement === this.domElement;
  }

  update(deltaSeconds: number): void {
    if (!this.active) return;

    const cosPitch = Math.cos(this.pitch);
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * cosPitch,
    );
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const desired = new THREE.Vector3();

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) desired.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) desired.sub(forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) desired.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) desired.sub(right);
    if (this.keys.has('Space')) desired.y += 0.9;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) desired.y -= 1.7;

    if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(this.speed);
    const inertia = 1 - Math.pow(0.0012, deltaSeconds);
    this.velocity.lerp(desired, inertia);

    const movement = this.velocity.clone().multiplyScalar(deltaSeconds);
    this.tryMoveAxis('x', movement.x);
    this.tryMoveAxis('z', movement.z);
    this.tryMoveAxis('y', movement.y);

    const position = this.camera.position;
    position.x = clamp(position.x, this.layout.bounds.minX + 4, this.layout.bounds.maxX - 4);
    position.z = clamp(position.z, this.layout.bounds.minZ + 4, this.layout.bounds.maxZ - 4);

    const floor = sampleTerrainHeight(this.layout, position.x, position.z) + 2.2;
    if (position.y < floor) {
      position.y = floor;
      this.velocity.y = Math.max(this.velocity.y, 0);
    }

    const ceiling = this.layout.bounds.maxY - 4;
    if (position.y > ceiling) {
      position.y = ceiling;
      this.velocity.y = Math.min(this.velocity.y, 0);
    }

    this.savedPosition.copy(position);
  }

  moveNear(target: THREE.Vector3, extent: number): void {
    const distance = clamp(extent * 1.1, 18, 95);
    const direction = new THREE.Vector3(1, 0, 1).normalize();
    const x = clamp(
      target.x + direction.x * distance,
      this.layout.bounds.minX + 5,
      this.layout.bounds.maxX - 5,
    );
    const z = clamp(
      target.z + direction.z * distance,
      this.layout.bounds.minZ + 5,
      this.layout.bounds.maxZ - 5,
    );
    const floor = sampleTerrainHeight(this.layout, x, z);
    const y = clamp(
      Math.max(floor + 5, target.y + clamp(extent * 0.12, 2, 14)),
      floor + 2.2,
      this.layout.bounds.maxY - 4,
    );

    this.savedPosition.set(x, y, z);
    this.camera.position.copy(this.savedPosition);
    this.lookAt(target);
    this.velocity.set(0, 0, 0);
  }

  getTelemetry(): SwimTelemetry {
    const position = this.active ? this.camera.position : this.savedPosition;
    const floor = sampleTerrainHeight(this.layout, position.x, position.z);
    return {
      speed: this.speed,
      terrainClearance: Math.max(0, position.y - floor),
      x: position.x,
      y: position.y,
      z: position.z,
    };
  }

  consumeClickSuppression(): boolean {
    const shouldSuppress = this.suppressNextClick;
    this.suppressNextClick = false;
    return shouldSuppress;
  }

  dispose(): void {
    if (this.isPointerLocked()) document.exitPointerLock();
    document.body.classList.remove('pointer-locked');
    this.domElement.removeEventListener('mousedown', this.handlePointerRequest);
    this.domElement.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('pointerlockerror', this.handlePointerLockError);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  private tryMoveAxis(axis: 'x' | 'y' | 'z', amount: number): void {
    if (Math.abs(amount) < 0.000001) return;
    const candidate = this.camera.position.clone();
    candidate[axis] += amount;
    if (pointHitsExpandedBox(candidate, this.collisionBoxes, this.collisionRadius)) {
      this.velocity[axis] = 0;
      return;
    }
    this.camera.position[axis] = candidate[axis];
  }

  private lookAt(target: THREE.Vector3): void {
    this.lookAtFrom(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z,
      target.x,
      target.y,
      target.z,
    );
    this.applyRotation();
  }

  private lookAtFrom(
    fromX: number,
    fromY: number,
    fromZ: number,
    toX: number,
    toY: number,
    toZ: number,
  ): void {
    const direction = new THREE.Vector3(toX - fromX, toY - fromY, toZ - fromZ).normalize();
    this.yaw = Math.atan2(-direction.x, -direction.z);
    this.pitch = Math.asin(clamp(direction.y, -1, 1));
  }

  private applyRotation(): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private readonly handlePointerRequest = (event: MouseEvent): void => {
    if (!this.active || event.button !== 0 || this.isPointerLocked()) return;
    this.suppressNextClick = true;
    this.domElement.requestPointerLock();
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.active || !this.isPointerLocked()) return;

    const sensitivity = 0.00235;
    this.yaw -= event.movementX * sensitivity;
    this.pitch = clamp(
      this.pitch - event.movementY * sensitivity,
      -Math.PI / 2 + 0.025,
      Math.PI / 2 - 0.025,
    );

    if (Math.abs(this.yaw) > Math.PI * 4) {
      this.yaw = THREE.MathUtils.euclideanModulo(this.yaw + Math.PI, Math.PI * 2) - Math.PI;
    }

    this.applyRotation();
  };

  private readonly handlePointerLockChange = (): void => {
    const locked = this.isPointerLocked();
    this.domElement.classList.toggle('pointer-locked', locked);
    document.body.classList.toggle('pointer-locked', locked);
    if (!locked) {
      this.keys.clear();
      this.velocity.set(0, 0, 0);
    }
  };

  private readonly handlePointerLockError = (): void => {
    this.suppressNextClick = false;
    this.domElement.classList.remove('pointer-locked');
    document.body.classList.remove('pointer-locked');
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.active) return;
    event.preventDefault();
    this.speed = clamp(this.speed * (event.deltaY < 0 ? 1.12 : 0.9), 6, 120);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.active || isFormControl(event.target)) return;
    this.keys.add(event.code);
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.keys.clear();
    this.velocity.set(0, 0, 0);
  };
}
