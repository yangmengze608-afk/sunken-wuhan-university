import * as THREE from 'three';
import { sampleTerrainHeight } from '../world/terrain';
import type { WholeCampusLayout } from '../world/types';
import { CameraSway, type CameraSwayState } from './CameraSway';

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
  private targetYaw = 0;
  private targetPitch = -0.04;
  private speed = 28;
  private readonly velocity = new THREE.Vector3();
  private readonly keys = new Set<string>();
  private readonly savedPosition = new THREE.Vector3();
  private readonly cameraSway = new CameraSway();
  private active = false;
  private dragging = false;
  private draggedSincePointerDown = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly domElement: HTMLElement,
    private readonly layout: WholeCampusLayout,
  ) {
    this.camera.rotation.order = 'YXZ';

    const startX = 140;
    const startZ = 340;
    const startY = sampleTerrainHeight(layout, startX, startZ) + 8;
    this.savedPosition.set(startX, startY, startZ);
    this.lookAtFrom(startX, startY, startZ, 20, sampleTerrainHeight(layout, 20, 20) + 14, 20);

    this.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.domElement.addEventListener('mousemove', this.handlePointerPosition);
    this.domElement.addEventListener('mouseleave', this.handlePointerLeave);
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
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
      this.dragging = false;
      this.cameraSway.reset();
      this.domElement.classList.remove('swim-active', 'dragging');
    }
  }

  isActive(): boolean {
    return this.active;
  }

  update(deltaSeconds: number): void {
    if (!this.active) return;

    const lookAlpha = 1 - Math.exp(-13 * deltaSeconds);
    const yawDelta = Math.atan2(
      Math.sin(this.targetYaw - this.yaw),
      Math.cos(this.targetYaw - this.yaw),
    );
    this.yaw += yawDelta * lookAlpha;
    this.pitch += (this.targetPitch - this.pitch) * lookAlpha;

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
    this.camera.position.addScaledVector(this.velocity, deltaSeconds);

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

    const movementRatio = clamp(this.velocity.length() / Math.max(this.speed, 1), 0, 1);
    const lateralRatio = clamp(this.velocity.dot(right) / Math.max(this.speed, 1), -1, 1);
    const sway = this.cameraSway.update(deltaSeconds, movementRatio, lateralRatio);

    this.savedPosition.copy(position);
    this.applyRotation(sway);
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
    this.cameraSway.reset();
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
    const shouldSuppress = this.draggedSincePointerDown;
    this.draggedSincePointerDown = false;
    return shouldSuppress;
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.domElement.removeEventListener('mousemove', this.handlePointerPosition);
    this.domElement.removeEventListener('mouseleave', this.handlePointerLeave);
    this.domElement.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
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
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
  }

  private applyRotation(sway: CameraSwayState = { pitch: 0, yaw: 0, roll: 0 }): void {
    this.camera.rotation.set(
      clamp(this.pitch + sway.pitch, -1.52, 1.52),
      this.yaw + sway.yaw,
      sway.roll,
      'YXZ',
    );
  }

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (!this.active || event.button !== 0) return;
    this.dragging = true;
    this.draggedSincePointerDown = false;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.domElement.classList.add('dragging');
  };

  private readonly handlePointerPosition = (event: MouseEvent): void => {
    if (!this.active) return;
    this.cameraSway.setPointerFromEvent(event, this.domElement);
  };

  private readonly handlePointerLeave = (): void => {
    this.cameraSway.clearPointer();
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.active || !this.dragging) return;
    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) this.draggedSincePointerDown = true;
    this.targetYaw -= deltaX * 0.0032;
    this.targetPitch = clamp(this.targetPitch - deltaY * 0.0032, -1.5, 1.5);
    this.cameraSway.addLookImpulse(deltaX, deltaY);
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private readonly handleMouseUp = (): void => {
    this.dragging = false;
    this.domElement.classList.remove('dragging');
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
    this.cameraSway.clearPointer();
    this.dragging = false;
    this.domElement.classList.remove('dragging');
  };
}
