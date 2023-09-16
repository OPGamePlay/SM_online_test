import { refundLastSpell, Spell } from './index';
import floatingText from '../graphics/FloatingText';
import { addPixiSpriteAnimated } from '../graphics/PixiUtils';
import { manaBlue } from '../graphics/ui/colors';
import { MultiColorReplaceFilter } from '@pixi/filter-multi-color-replace';
import { makeManaTrail } from '../graphics/Particles';
import { CardCategory } from '../types/commonTypes';
import { playDefaultSpellSFX } from './cardUtils';
import * as config from '../config';
import { explain, EXPLAIN_OVERFILL } from '../graphics/Explain';
import { CardRarity, probabilityMap } from '../types/commonTypes';

const id = 'Mana Steal';
const mana_stolen = 20;
const health_burn = 30;
const spell: Spell = {
  card: {
    id,
    category: CardCategory.Mana,
    sfx: 'manaSteal',
    supportQuantity: true,
    manaCost: 0,
    healthCost: health_burn,
    expenseScaling: 1,
    probability: probabilityMap[CardRarity.SPECIAL],
    thumbnail: 'spellIconManaSteal.png',
    description: ['spell_mana_steal', mana_stolen.toString()],
    effect: async (state, card, quantity, underworld, prediction) => {
      // .filter: only target living units
      const targets = state.targetedUnits.filter(u => u.alive && u.mana > 0);
      const caster = state.casterUnit;
      let promises = [];
      let totalManaStolen = 0;
      for (let unit of targets) {
        const unitManaStolen = Math.min(unit.mana, mana_stolen * quantity);
        totalManaStolen += unitManaStolen;
        unit.mana -= unitManaStolen;
        const manaTrailPromises = [];
        if (!prediction) {
          for (let i = 0; i < quantity; i++) {
            manaTrailPromises.push(makeManaTrail(unit, caster, underworld, '#e4f9ff', '#3fcbff'));
          }
        }
        promises.push((prediction ? Promise.resolve() : Promise.all(manaTrailPromises)));
      }
      await Promise.all(promises).then(() => {
        state.casterUnit.mana += totalManaStolen;
        if (!prediction) {
          playDefaultSpellSFX(card, prediction);
          // Animate
          if (state.casterUnit.image) {
            // Note: This uses the lower-level addPixiSpriteAnimated directly so that it can get a reference to the sprite
            // and add a filter; however, addOneOffAnimation is the higher level and more common for adding a simple
            // "one off" animated sprite.  Use it instead of addPixiSpriteAnimated unless you need more direct control like
            // we do here
            const animationSprite = addPixiSpriteAnimated('spell-effects/potionPickup', state.casterUnit.image.sprite, {
              loop: false,
              onComplete: () => {
                if (animationSprite?.parent) {
                  animationSprite.parent.removeChild(animationSprite);
                }
              }
            });
            if (animationSprite) {

              if (!animationSprite.filters) {
                animationSprite.filters = [];
              }
              // Change the health color to blue
              animationSprite.filters.push(
                new MultiColorReplaceFilter(
                  [
                    [0xff0000, manaBlue],
                  ],
                  0.1
                )
              );
            }
          }
          explain(EXPLAIN_OVERFILL);
        }
      });
      if (totalManaStolen > 0) {
        if (!prediction) {
          floatingText({
            coords: caster,
            text: `+ ${totalManaStolen} Mana`,
            style: { fill: 'blue', ...config.PIXI_TEXT_DROP_SHADOW }
          });
        }
      } else {
        refundLastSpell(state, prediction, 'No targets have mana to steal\nHealth cost refunded')
      }
      return state;
    },
  },
};
export default spell;
