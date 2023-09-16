import * as Unit from '../entity/Unit';
import { CardCategory } from '../types/commonTypes';
import { playDefaultSpellSFX } from './cardUtils';
import { refundLastSpell, Spell } from './index';
import { CardRarity, probabilityMap } from '../types/commonTypes';
import { Vec2 } from '../jmath/Vec';
import { distance, lerp } from '../jmath/math';
import * as config from '../config';
import { makeBurstParticles } from '../graphics/ParticleCollection';

export const burstCardId = 'Burst';
const maxDamage = 50;
function calculateDamage(stack: number, casterPositionAtTimeOfCast: Vec2, casterAttackRange: number, target: Vec2): number {
  const dist = distance(casterPositionAtTimeOfCast, target)
  return Math.ceil(lerp(0, maxDamage, 1 - dist / (casterAttackRange + config.COLLISION_MESH_RADIUS * 2)) * stack);
}
export interface UnitDamage {
  id: number;
  x: number;
  y: number;
  health: number;
  damageTaken: number;

}
const spell: Spell = {
  card: {
    id: burstCardId,
    category: CardCategory.Damage,
    supportQuantity: true,
    manaCost: 10,
    healthCost: 0,
    expenseScaling: 1,
    probability: probabilityMap[CardRarity.RARE],
    thumbnail: 'spellIconBurst.png',
    animationPath: '',
    sfx: 'burst',
    description: ['spell_burst', maxDamage.toString()],
    effect: async (state, card, quantity, underworld, prediction) => {
      await new Promise<void>((resolve) => {
        // .filter: only target living units
        const targets = state.targetedUnits.filter(u => u.alive)
        if (!prediction && !globalThis.headless) {
          if (targets.length) {
            playDefaultSpellSFX(card, prediction);
            for (let unit of targets) {
              const damage = calculateDamage(quantity, state.casterUnit, state.casterUnit.attackRange, unit);
              Unit.takeDamage(unit, damage, state.casterUnit, underworld, prediction, state);
              // Animate:
              makeBurstParticles(unit, lerp(0.1, 1, damage / maxDamage), prediction, resolve);
            }
          } else {
            // Prevent timeout if burst is cast on no living units
            refundLastSpell(state, prediction);
            resolve();
          }
        } else {
          for (let unit of targets) {
            const damage = calculateDamage(quantity, state.casterUnit, state.casterUnit.attackRange, unit);
            Unit.takeDamage(unit, damage, state.casterUnit, underworld, prediction, state);
          }
          resolve();
        }
      });
      return state;
    },
  },
};
export default spell;
