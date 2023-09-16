import { addUnitTarget, refundLastSpell, Spell } from './index';
import * as Unit from '../entity/Unit';
import { CardCategory, Faction, UnitType } from '../types/commonTypes';
import { allUnits } from '../entity/units';
import { skyBeam } from '../VisualEffects';
import { playDefaultSpellSFX } from './cardUtils';
import floatingText from '../graphics/FloatingText';
import { addWarningAtMouse } from '../graphics/PlanningView';
import { CardRarity, probabilityMap } from '../types/commonTypes';

const id = 'decoy';
export { id as decoyId };
const spell: Spell = {
  card: {
    id,
    category: CardCategory.Soul,
    sfx: 'summonDecoy',
    supportQuantity: true,
    manaCost: 60,
    healthCost: 0,
    cooldown: 2,
    expenseScaling: 3,
    probability: probabilityMap[CardRarity.COMMON],
    thumbnail: 'spellIconDecoy.png',
    description: 'spell_summon_decoy',
    allowNonUnitTarget: true,
    effect: async (state, card, quantity, underworld, prediction) => {
      const unitId = 'decoy';
      const sourceUnit = allUnits[unitId];
      if (sourceUnit) {
        const summonLocation = {
          x: state.castLocation.x,
          y: state.castLocation.y
        }
        if (underworld.isCoordOnWallTile(summonLocation)) {
          if (prediction) {
            const WARNING = "Invalid Summon Location";
            addWarningAtMouse(WARNING);
          } else {
            refundLastSpell(state, prediction, 'Invalid summon location, mana refunded.')
          }
          return state;
        }
        playDefaultSpellSFX(card, prediction);
        const decoyUnit = Unit.create(
          sourceUnit.id,
          summonLocation.x,
          summonLocation.y,
          Faction.ALLY,
          sourceUnit.info.image,
          UnitType.AI,
          sourceUnit.info.subtype,
          sourceUnit.unitProps,
          underworld,
          prediction
        );
        addUnitTarget(decoyUnit, state);

        if (!prediction) {
          // Animate effect of unit spawning from the sky
          skyBeam(decoyUnit);
        }

        decoyUnit.healthMax *= quantity;
        decoyUnit.health = decoyUnit.healthMax;
      } else {
        console.error(`Source unit ${unitId} is missing`);
      }
      return state;
    },
  },
};
export default spell;
