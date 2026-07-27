import * as THREE from 'three';

export interface CameraSwayState {
  pitch: number;
  yaw: number;
  roll: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function damp(current: number, target: number, smoothing: number, deltaSeconds: number): number {
  const alpha = 1 - Math.exp(-smoothing * deltaSeconds);
  return current + (target - current) * alpha;
}

export class CameraSway {
  private readonly pointer = new THREE.Vector2();
  private elapsed = 0;
  private pitch = 0;
  private yaw = 0;
  private roll = 0;
  private impulsePitch = 0;
  private impulseYaw = 0;

  setPointerFromEvent(event: MouseEvent, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointer.set(
      clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -1, 1),
    );
  }

  clearPointer(): void {
    this.pointer.set(0, 0);
  }

  addLookImpulse(deltaX: number, deltaY: number): void {
    this.impulseYaw = clamp(this.impulseYaw - deltaX * 0.00016, -0.02, 0.02);
    this.impulsePitch = clamp(this.impulsePitch - deltaY * 0.00012, -0.014, 0.014);
  }

  reset(): void {
    this.pointer.set(0, 0);
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    this.impulsePitch = 0;
    this.impulseYaw = 0;
  }

  update(
    deltaSeconds: number,
    movementRatio: number,
    lateralRatio: number,
  ): CameraSwayState {
    this.elapsed += deltaSeconds;
    this.impulseYaw = damp(this.impulseYaw, 0, 7.5, deltaSeconds);
    this.impulsePitch = damp(this.impulsePitch, 0, 7.5, deltaSeconds);

    const targetYaw = -this.pointer.x * 0.014
      + Math.sin(this.elapsed * 0.72) * 0.0025
      + this.impulseYaw;
    const targetPitch = this.pointer.y * 0.009
      + Math.sin(this.elapsed * 1.18 + 0.8) * (0.0025 + movementRatio * 0.0035)
      + this.impulsePitch;
    const targetRoll = -this.pointer.x * 0.012
      + Math.sin(this.elapsed * 0.54 + 1.4) * 0.0035
      - lateralRatio * 0.008;

    this.yaw = damp(this.yaw, targetYaw, 5.8, deltaSeconds);
    this.pitch = damp(this.pitch, targetPitch, 5.8, deltaSeconds);
    this.roll = damp(this.roll, targetRoll, 4.8, deltaSeconds);

    return { pitch: this.pitch, yaw: this.yaw, roll: this.roll };
  }
}
