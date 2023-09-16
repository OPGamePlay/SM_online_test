import { drawPredictionCircleFill, drawPredictionLine } from '../graphics/PlanningView';
import { addTarget, addUnitTarget, getCurrentTargets, Spell } from './index';
import * as Unit from '../entity/Unit';
import * as colors from '../graphics/ui/colors';
import * as config from '../config';
import { CardCategory, CardRarity, probabilityMap } from '../types/commonTypes';
import { add, Vec2 } from '../jmath/Vec';
import * as math from '../jmath/math';
import { raceTimeout } from '../Promise';
import { similarTriangles, distance } from '../jmath/math';
import { easeOutCubic } from '../jmath/Easing';
import { isPickup } from '../entity/Pickup';
import { HasSpace } from '../entity/Type';

const id = 'Connect';
const numberOfTargetsPerQuantity = 2;
const baseRadius = config.PLAYER_BASE_ATTACK_RANGE - 10;
const spell: Spell = {
  card: {
    id,
    category: CardCategory.Targeting,
    manaCost: 20,
    healthCost: 0,
    expenseScaling: 1,
    probability: probabilityMap[CardRarity.COMMON],
    thumbnail: 'spellIconConnect.png',
    supportQuantity: true,
    requiresFollowingCard: true,
    description: ['spell_connect', id, numberOfTargetsPerQuantity.toString()],
    effect: async (state, card, quantity, underworld, prediction) => {
      let limitTargetsLeft = numberOfTargetsPerQuantity * quantity;
      const potentialTargets = underworld.getPotentialTargets(prediction);
      // Note: This loop must NOT be a for..of and it must cache the length because it
      // mutates state.targetedUnits as it iterates.  Otherwise it will continue to loop as it grows
      const targets = getCurrentTargets(state);
      const length = targets.length;
      const animationPromises = [];
      for (let i = 0; i < length; i++) {
        const target = targets[i];
        let animationPromise = Promise.resolve();
        if (target) {
          const filterFn = (x: any) => {
            if (Unit.isUnit(x) && Unit.isUnit(target)) {
              if (target.alive) {
                // Match living units of the same faction
                return x.faction == target.faction && x.alive;
              } else {
                // Match any dead unit
                return !x.alive;
              }
            } else if (!Unit.isUnit(x) && !Unit.isUnit(target)) {
              // Match both non units to each other
              return true;
            } else {
              // Do not match unit and non unit
              return false;
            }
          }

          // Find all units touching the spell origin
          const chained = await getTouchingTargetableEntitiesRecursive(
            target.x,
            target.y,
            potentialTargets,
            baseRadius + state.aggregator.radius,
            prediction,
            { limitTargetsLeft },
            0,
            filterFn,
            targets
          );
          // Draw prediction lines so user can see how it chains
          if (prediction) {
            chained.forEach(chained_entity => {
              drawPredictionLine(chained_entity.chainSource, chained_entity.entity);
            });
          } else {
            for (let { chainSource, entity } of chained) {
              playSFXKey('targeting');
              animationPromise = animationPromise.then(() => animate(chainSource, [entity]));
            }
            // Draw all final circles for a moment before casting
            animationPromise = animationPromise.then(() => animate({ x: 0, y: 0 }, []));
            animationPromises.push(animationPromise);
          }
          // Update effectState targets
          chained.forEach(u => addTarget(u.entity, state))
        }
      }
      await Promise.all(animationPromises).then(() => {
        // Only clear graphics once all lines are done animating
        if (!prediction) {
          globalThis.predictionGraphics?.clear();
        }
      });

      return state;
    },
  },
};
export async function getTouchingTargetableEntitiesRecursive(
  x: number,
  y: number,
  potentialTargets: HasSpace[],
  radius: number,
  prediction: boolean,
  // The number of targets left that it is able to add to the targets list
  // It is an object instead of just a number so it will be passed by reference
  chainState: { limitTargetsLeft: number },
  recurseLevel: number,
  // selects which type of entity to chain to
  filterFn: (x: any) => boolean,
  // object references
  ignore: HasSpace[] = [],
): Promise<{ chainSource: Vec2, entity: HasSpace }[]> {
  if (chainState.limitTargetsLeft <= 0) {
    return [];
  }
  // Draw visual circle for prediction
  // - config.COLLISION_MESH_RADIUS / 2 accounts for the fact that the game logic
  // will only connect entities if their CENTER POINT falls within the radius; however,
  // to the players eyes if any part of them is touching the circle it should connect
  if (prediction) {
    drawPredictionCircleFill({ x, y }, radius - config.COLLISION_MESH_RADIUS / 2);
  }
  const coords = { x, y }
  let touching = potentialTargets
    .filter((u) => {
      return (
        ignore.find((i) => i == u) === undefined &&
        u.x <= x + radius &&
        u.x >= x - radius &&
        u.y <= y + radius &&
        u.y >= y - radius
      );
    })
    // Filter chaining types
    .filter((x) => filterFn(x))
    // Order by closest to coords
    .sort((a, b) => math.distance(a, coords) - math.distance(b, coords))
    // Only select up to limitTargetsLeft
    .slice(0, chainState.limitTargetsLeft);

  // console.log('debug: touching', touching.map(x => `name:${x.unitSourceId || x.name},alive:${x.alive},faction:${x.faction},score:${prioritySorter(x)}`));

  ignore.push(...touching);

  let connected: { chainSource: Vec2, entity: HasSpace }[] = [];
  if (chainState.limitTargetsLeft > 0) {
    // Important: Using a regular for loop and cache the length instead of a for..of loop because 
    // the array being looped is modified in the interior of the loop and we only want it
    // to loop the original array contents, not the contents that are added inside of the loop
    const length = touching.length
    for (let i = 0; i < length; i++) {
      const t = touching[i];
      if (t) {
        if (chainState.limitTargetsLeft <= 0) {
          break;
        }
        connected.push({ chainSource: coords, entity: t });
        chainState.limitTargetsLeft--;
        if (!prediction) {
          playSFXKey('targetAquired');
        }
        const newTouching = await getTouchingTargetableEntitiesRecursive(t.x, t.y, potentialTargets, radius, prediction, chainState, recurseLevel + 1, filterFn, ignore)
        connected = connected.concat(newTouching);
      }
    }
  }
  return connected;
}

async function animate(pos: Vec2, newTargets: Vec2[]) {
  if (globalThis.headless) {
    // Animations do not occur on headless, so resolve immediately or else it
    // will just waste cycles on the server
    return Promise.resolve();
  }
  const iterations = 100;
  const millisBetweenIterations = 3;
  let playedSound = false;
  // "iterations + 10" gives it a little extra time so it doesn't timeout right when the animation would finish on time
  return raceTimeout(millisBetweenIterations * (iterations + 10), 'animatedConnect', new Promise<void>(resolve => {
    for (let i = 0; i < iterations; i++) {

      setTimeout(() => {
        if (globalThis.predictionGraphics) {
          // globalThis.predictionGraphics.clear();
          globalThis.predictionGraphics.lineStyle(2, colors.targetingSpellGreen, 1.0);
          // iterations - 10 allows the lerp value to stay over 1 for a time so that it will animate the final
          // select circle
          // ---
          // between 0 and 1;
          const proportionComplete = easeOutCubic((i + 1) / (iterations - 10));
          newTargets.forEach(target => {

            globalThis.predictionGraphics?.moveTo(pos.x, pos.y);
            const dist = distance(pos, target)
            const edgeOfCircle = add(target, math.similarTriangles(pos.x - target.x, pos.y - target.y, dist, config.COLLISION_MESH_RADIUS));
            const pointApproachingTarget = add(pos, math.similarTriangles(edgeOfCircle.x - pos.x, edgeOfCircle.y - pos.y, dist, dist * Math.min(1, proportionComplete)));
            globalThis.predictionGraphics?.lineTo(pointApproachingTarget.x, pointApproachingTarget.y);
            if (proportionComplete >= 1) {
              globalThis.predictionGraphics?.drawCircle(target.x, target.y, config.COLLISION_MESH_RADIUS);
              // Play sound when new target is animated to be selected
              if (!playedSound) {
                playedSound = true;
                playSFXKey('targetAquired');
              }
            }
          });

        }
        if (i >= iterations - 1) {
          resolve();
        }

      }, millisBetweenIterations * i)
    }
  }));
}
export default spell;
