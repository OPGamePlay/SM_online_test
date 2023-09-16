import type * as PIXI from 'pixi.js';
import { addPixiSpriteAnimated, containerProjectiles, PixiSpriteOptions } from '../graphics/PixiUtils';
import { lerp, distance } from '../jmath/math';
import type { Vec2 } from '../jmath/Vec';
import * as Vec from '../jmath/Vec';
import * as config from '../config';
import * as math from '../jmath/math';
import { raceTimeout } from '../Promise';

interface Projectile {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  endTime: number;
  target: Vec2;
  sprite: PIXI.Sprite | undefined;
}
function createProjectile(
  coords: Vec2,
  target: Vec2,
  imagePath: string,
  options?: PixiSpriteOptions
): Projectile {
  const sprite = addPixiSpriteAnimated(imagePath, containerProjectiles, Object.assign({ animationSpeed: 0.25, loop: true }, options || {}));
  if (sprite) {

    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;

    sprite.x = coords.x;
    sprite.y = coords.y;

    sprite.rotation = Math.atan2(target.y - coords.y, target.x - coords.x);
  }

  return {
    x: coords.x,
    y: coords.y,
    startX: coords.x,
    startY: coords.y,
    startTime: 0,
    endTime: 0,
    target,
    sprite,
  };

}
export const SPEED_PER_MILLI = 0.9;
export function createVisualFlyingProjectile(
  coords: Vec2,
  target: Vec2,
  imagePath: string,
): Promise<void> {
  // Use this similarTriangles calculation to make the projectile animation pretty so it doesn't originate from the exact center of the
  // source but at the edge instead
  const startPoint = math.distance(coords, target) <= config.COLLISION_MESH_RADIUS
    ? coords
    : Vec.subtract(coords, math.similarTriangles(coords.x - target.x, coords.y - target.y, math.distance(coords, target), config.COLLISION_MESH_RADIUS));
  const instance = createProjectile(startPoint, target, imagePath);
  const time_in_flight =
    distance(instance, instance.target) /
    SPEED_PER_MILLI;
  // + 1000 is an arbitrary delay to give the original promise ample time to finish without a timeout error
  // being reported
  return raceTimeout(time_in_flight + 1000, 'createVisualFlyingProjectile', new Promise((resolve) => {
    if (globalThis.headless) {
      fly(instance, 0, resolve);
    } else {
      requestAnimationFrame((time) => fly(instance, time, resolve));
    }
  }));
}

function fly(
  instance: Projectile,
  time: number,
  resolve: (value: void | PromiseLike<void>) => void,
) {
  const shouldInitialize = instance.startTime == 0;
  // This block is invoked when the first time fly() is invoked for this instance
  if (shouldInitialize) {
    instance.startTime = time;
    const time_in_flight =
      distance(instance, instance.target) /
      SPEED_PER_MILLI;
    instance.endTime = time + time_in_flight;
  }
  if (instance.sprite) {

    instance.sprite.x = instance.x;
    instance.sprite.y = instance.y;
  }
  if (globalThis.headless) {
    // Simulate finishing immediately on headless since there are no visuals:
    // Note: this block must occur AFTER the instance is initialized
    time = instance.endTime;
  }
  const t =
    (time - instance.startTime) / (instance.endTime - instance.startTime);
  instance.x = lerp(instance.startX, instance.target.x, t);
  instance.y = lerp(instance.startY, instance.target.y, t);
  // Once it's fully done animating
  if (time >= instance.endTime) {
    // Clean up the element
    if (instance.sprite && instance.sprite.parent) {
      instance.sprite.parent.removeChild(instance.sprite);
    }
    resolve();
  } else {
    requestAnimationFrame((time) => fly(instance, time, resolve));
  }
}
export function createVisualLobbingProjectile(
  coords: Vec2,
  target: Vec2,
  imagePath?: string,
  options?: PixiSpriteOptions
): Promise<void> {
  if (!imagePath) {
    return Promise.resolve();
  }
  const instance = createProjectile(coords, target, imagePath, options);
  // + 1000 is an arbitrary delay to give the original promise ample time to finish without a timeout error
  // being reported
  return raceTimeout(config.LOB_PROJECTILE_SPEED + 1000, 'createVisualLobbingProjectile', new Promise((resolve) => {
    if (globalThis.headless) {
      lob(instance, 0, resolve);
    } else {
      requestAnimationFrame((time) => lob(instance, time, resolve));
    }
  }));
}
// Arbitrary lobHeight (negative so it lobs the projectile UP)
const lobHeight = -100;
// lob a projectile in an arch
function lob(
  instance: Projectile,
  time: number,
  resolve: (value: void | PromiseLike<void>) => void,
) {
  if (instance.startTime == 0) {
    instance.startTime = time;
    const time_in_flight = config.LOB_PROJECTILE_SPEED;
    instance.endTime = time + time_in_flight;
  }
  if (instance.sprite) {
    instance.sprite.x = instance.x;
    instance.sprite.y = instance.y;
  }
  if (globalThis.headless) {
    // Simulate finishing immediately on headless since there are no visuals:
    // Note: this block must occur AFTER the instance is initialized
    time = instance.endTime;
  }
  const t =
    (time - instance.startTime) / (instance.endTime - instance.startTime);
  instance.x = lerp(instance.startX, instance.target.x, t);
  // y goes from startY to toY but is offset Math.sin(Math.PI/2)*lobHeight in the middle
  const yOffset = Math.sin(t * Math.PI) * lobHeight;
  instance.y = lerp(instance.startY, instance.target.y, t) + yOffset;
  // Once it's fully done animating
  if (time >= instance.endTime) {
    // Clean up the element
    if (instance.sprite?.parent) {
      instance.sprite.parent.removeChild(instance.sprite);
    }
    resolve();
  } else {
    requestAnimationFrame((time) => lob(instance, time, resolve));
  }
}
