import type * as PIXI from 'pixi.js';

import { allUnits } from '../entity/units';
import { containerSpells, containerUI, getCamera, withinCameraBounds } from './PixiUtils';
import { containerPlanningView } from './PixiUtils';
import { Faction, UnitSubType, UnitType } from '../types/commonTypes';
import { clone, equal, Vec2, round } from '../jmath/Vec';
import Underworld, { biomeTextColor, turn_phase } from '../Underworld';
import * as CardUI from './ui/CardUI';
import * as config from '../config';
import * as Unit from '../entity/Unit';
import * as Vec from '../jmath/Vec';
import * as math from '../jmath/math';
import * as ImmediateMode from './ImmediateModeSprites';
import * as colors from './ui/colors';
import { isOutOfRange } from '../PlayerUtils';
import { pointsEveryXDistanceAlongPath } from '../jmath/Pathfinding';
import { distance, getCoordsAtDistanceTowardsTarget } from '../jmath/math';
import { Graphics } from 'pixi.js';
import { allCards } from '../cards';
import { keyDown } from './ui/eventListeners';
import { inPortal } from '../entity/Player';
import { getPerkText } from '../Perk';
import { View } from '../views';
import { gripthulu_id } from '../entity/units/gripthulu';

const TEXT_OUT_OF_RANGE = 'Out of Range';
// Graphics for rendering above board and walls but beneath units and doodads,
// see containerPlanningView for exact render order.
let planningViewGraphics: PIXI.Graphics | undefined;
// Graphics for drawing the spell effects during the dry run phase
let predictionGraphics: PIXI.Graphics | undefined;
// labelText is used to add a label to planningView circles 
// so that the player knows what the circle is referencing.
let labelText = !globalThis.pixi ? undefined : new globalThis.pixi.Text('', { fill: 'white', ...config.PIXI_TEXT_DROP_SHADOW, fontFamily: 'Forum' });
let mouseLabelText = !globalThis.pixi ? undefined : new globalThis.pixi.Text('', { fill: 'white', ...config.PIXI_TEXT_DROP_SHADOW, fontFamily: 'Forum' });
export function initPlanningView() {
  if (containerPlanningView && containerUI && globalThis.pixi) {
    planningViewGraphics = new globalThis.pixi.Graphics();
    globalThis.planningViewGraphics = planningViewGraphics;
    containerPlanningView.addChild(planningViewGraphics);
    predictionGraphics = new globalThis.pixi.Graphics();
    globalThis.predictionGraphics = predictionGraphics;
    containerUI.addChild(predictionGraphics);
    if (labelText) {
      labelText.anchor.x = 0.5;
      labelText.anchor.y = 0;
      containerUI.addChild(labelText);
    }
    if (mouseLabelText) {
      mouseLabelText.anchor.x = 0.5;
      mouseLabelText.anchor.y = 0;
      containerUI.addChild(mouseLabelText);
    }
  }
}
let lastSpotCurrentPlayerTurnCircle: Vec2 = { x: 0, y: 0 };
export function updatePlanningView(underworld: Underworld) {
  if (planningViewGraphics && globalThis.unitOverlayGraphics && labelText && globalThis.selectedUnitGraphics) {
    const mouseTarget = underworld.getMousePos();
    planningViewGraphics.clear();
    globalThis.selectedUnitGraphics.clear();
    if (labelText) {
      labelText.text = '';
      labelText.style.fill = biomeTextColor(underworld.lastLevelCreated?.biome)
    }
    if (globalThis.selectedPickup) {
      // Draw circle to show that pickup is selected
      drawCircleUnderTarget(globalThis.selectedPickup, underworld, 1.0, planningViewGraphics);
    }
    // If the player has a spell ready and the mouse is beyond their max cast range
    // show the players cast range so they user knows that they are out of range
    if (globalThis.player) {
      // Do not draw out of range information if player is viewing the walkRope so that
      // they can see how far they can move unobstructed
      if (!keyDown.showWalkRope) {
        const cardIds = CardUI.getSelectedCardIds();
        if (cardIds.length) {
          const outOfRange = isOutOfRange(globalThis.player, mouseTarget, underworld, cardIds);
          if (outOfRange) {
            // Only show outOfRange information if mouse is over the game canvas, not when it's over UI elements
            if (globalThis.hoverTarget && globalThis.hoverTarget.closest('#PIXI-holder')) {
              addWarningAtMouse(TEXT_OUT_OF_RANGE);
            }
          } else {
            removeWarningAtMouse(TEXT_OUT_OF_RANGE);
          }
        }
      }
    }
    const currentlyWarningOutOfRange = warnings.has(TEXT_OUT_OF_RANGE);
    // Draw UI for the globalThis.selectedUnit
    if (globalThis.selectedUnit) {
      if (
        globalThis.selectedUnit.alive
      ) {
        // Draw circle to show that unit is selected
        drawCircleUnderTarget(globalThis.selectedUnit, underworld, 1.0, planningViewGraphics);
        // If globalThis.selectedUnit is an archer, draw LOS attack line
        //  instead of attack range for them
        if (globalThis.selectedUnit.unitSubType == UnitSubType.RANGED_LOS || globalThis.selectedUnit.unitSubType == UnitSubType.SPECIAL_LOS) {
          const unitSource = allUnits[globalThis.selectedUnit.unitSourceId];
          let archerTargets: Unit.IUnit[] = [];
          if (unitSource) {
            archerTargets = unitSource.getUnitAttackTargets(globalThis.selectedUnit, underworld);
          } else {
            console.error('Cannot find unitSource for ', globalThis.selectedUnit.unitSourceId);
          }
          // If they don't have a target they can actually attack
          // draw a line to the closest enemy that they would target if
          // they had LOS
          let canAttack = true;
          if (!archerTargets.length) {
            const nextTarget = Unit.findClosestUnitInDifferentFaction(globalThis.selectedUnit, underworld)
            if (nextTarget) {
              archerTargets.push(nextTarget);
            }
            // If getBestRangedLOSTarget returns undefined, the archer doesn't have a valid attack target
            canAttack = false;
          }
          if (archerTargets.length) {
            for (let target of archerTargets) {
              const attackLine = { p1: globalThis.selectedUnit, p2: target };
              globalThis.selectedUnitGraphics.moveTo(attackLine.p1.x, attackLine.p1.y);
              if (canAttack) {
                const color = colors.healthRed;
                // Draw a red line, showing that you are in danger
                globalThis.selectedUnitGraphics.lineStyle(3, color, 0.7);
                globalThis.selectedUnitGraphics.lineTo(attackLine.p2.x, attackLine.p2.y);
                globalThis.selectedUnitGraphics.drawCircle(attackLine.p2.x, attackLine.p2.y, 3);
              } else {
                // Draw a grey line  showing that the target is blocked
                globalThis.selectedUnitGraphics.lineStyle(3, colors.outOfRangeGrey, 0.7);
                globalThis.selectedUnitGraphics.lineTo(attackLine.p2.x, attackLine.p2.y);
                globalThis.selectedUnitGraphics.drawCircle(attackLine.p2.x, attackLine.p2.y, 3);
              }
            }
          }
          globalThis.selectedUnitGraphics.drawCircle(
            globalThis.selectedUnit.x,
            globalThis.selectedUnit.y,
            globalThis.selectedUnit.attackRange
          );
          labelText.text = i18n('Attack Range');
          const labelPosition = withinCameraBounds({ x: globalThis.selectedUnit.x, y: globalThis.selectedUnit.y + globalThis.selectedUnit.attackRange }, labelText.width / 2);
          labelText.x = labelPosition.x;
          labelText.y = labelPosition.y;
        } else {

          if (globalThis.selectedUnit.attackRange > 0) {
            const rangeCircleColor = currentlyWarningOutOfRange
              ? colors.outOfRangeGrey
              : globalThis.selectedUnit.faction == Faction.ALLY
                ? colors.attackRangeAlly
                : colors.attackRangeEnemy;
            globalThis.selectedUnitGraphics.lineStyle(2, rangeCircleColor, 1.0);
            if (globalThis.selectedUnit.unitSubType === UnitSubType.RANGED_RADIUS) {
              globalThis.selectedUnitGraphics.drawCircle(
                globalThis.selectedUnit.x,
                globalThis.selectedUnit.y,
                globalThis.selectedUnit.attackRange
              );
              labelText.text = i18n('Attack Range');
              const labelPosition = withinCameraBounds({ x: globalThis.selectedUnit.x, y: globalThis.selectedUnit.y + globalThis.selectedUnit.attackRange }, labelText.width / 2);
              labelText.x = labelPosition.x;
              labelText.y = labelPosition.y;
            } else if (globalThis.selectedUnit.unitSubType === UnitSubType.SUPPORT_CLASS) {
              globalThis.selectedUnitGraphics.drawCircle(
                globalThis.selectedUnit.x,
                globalThis.selectedUnit.y,
                globalThis.selectedUnit.attackRange
              );
              labelText.text = i18n('Support Range');
              const labelPosition = withinCameraBounds({ x: globalThis.selectedUnit.x, y: globalThis.selectedUnit.y + globalThis.selectedUnit.attackRange }, labelText.width / 2);
              labelText.x = labelPosition.x;
              labelText.y = labelPosition.y;
            } else if (globalThis.selectedUnit.unitSubType === UnitSubType.MELEE) {
              globalThis.selectedUnitGraphics.drawCircle(
                globalThis.selectedUnit.x,
                globalThis.selectedUnit.y,
                globalThis.selectedUnit.staminaMax + globalThis.selectedUnit.attackRange
              );
              globalThis.selectedUnitGraphics.endFill();
              labelText.text = i18n('Attack Range');
              const labelPosition = withinCameraBounds({ x: globalThis.selectedUnit.x, y: globalThis.selectedUnit.y + globalThis.selectedUnit.staminaMax + globalThis.selectedUnit.attackRange }, labelText.width / 2);
              labelText.x = labelPosition.x;
              labelText.y = labelPosition.y;
            }
          }
        }
      }
    }
    // Draw a circle under the feet of the player whos current turn it is
    if (underworld) {
      // Update tooltip for whatever is being hovered
      updateTooltipContent(underworld);

      if (globalThis.player && globalThis.player.isSpawned && !inPortal(globalThis.player)) {
        // Only draw circle if player isn't moving to avoid UI thrashing
        // Gold circle under player feet
        if (equal(lastSpotCurrentPlayerTurnCircle, globalThis.player.unit)) {
          const fill = underworld.isMyTurn() ? 0xffde5e : 0xdddddd;
          drawCircleUnderTarget(globalThis.player.unit, underworld, 1.0, planningViewGraphics, fill);
        }
        lastSpotCurrentPlayerTurnCircle = clone(globalThis.player.unit);
      }
    }
    if (uiPolys.length || uiCones.length || uiCircles.length || currentlyWarningOutOfRange) {

      // Override other graphics (like selected unit) when out of range info is showing
      labelText.text = '';
      globalThis.selectedUnitGraphics.clear();
    }
    // Draw prediction circles
    if (unitOverlayGraphics && !globalThis.isHUDHidden) {
      for (let { points, color, text } of uiPolys) {
        // Draw color stored in prediction unless the UI is currently warning that the user
        // is aiming out of range, then override the color with grey
        const colorOverride = currentlyWarningOutOfRange ? colors.outOfRangeGrey : color;
        unitOverlayGraphics.lineStyle(2, colorOverride, 1.0)
        unitOverlayGraphics.endFill();
        unitOverlayGraphics.drawPolygon(points as PIXI.Point[]);
      }
      for (let { target, color, radius, startArc, endArc, text } of uiCones) {
        // Draw color stored in prediction unless the UI is currently warning that the user
        // is aiming out of range, then override the color with grey
        const colorOverride = currentlyWarningOutOfRange ? colors.outOfRangeGrey : color;
        rawDrawUICone(target, radius, startArc, endArc, colorOverride, unitOverlayGraphics);
      }
      for (let { target, color, radius, text } of uiCircles) {
        // Draw color stored in predictionCircles unless the UI is currently warning that the user
        // is aiming out of range, then override the color with grey
        const colorOverride = currentlyWarningOutOfRange ? colors.outOfRangeGrey : color;
        unitOverlayGraphics.lineStyle(2, colorOverride, 1.0)
        unitOverlayGraphics.endFill();
        unitOverlayGraphics.drawCircle(target.x, target.y, radius);
        if (text && labelText) {
          // Deprioritize text by making it grey if the UI is currently
          // warning that the player is aiming out of range so that the out of
          // range warning is more noticable than this text
          if (currentlyWarningOutOfRange) {
            labelText.style.fill = colors.outOfRangeGrey;
          }
          labelText.text = text;
          const labelPosition = withinCameraBounds({ x: target.x, y: target.y + radius }, labelText.width / 2);
          labelText.x = labelPosition.x;
          labelText.y = labelPosition.y;
        }
      }

    }
    // Draw warnings
    if (mouseLabelText && globalThis.player) {
      const text = Array.from(warnings).map(i18n).join('\n');
      mouseLabelText.text = text;
      mouseLabelText.style.fill = colors.errorRed;
      // Make text crisper
      mouseLabelText.style.fontSize = 64;
      mouseLabelText.scale.x = 0.5;
      mouseLabelText.scale.y = 0.5;

      mouseLabelText.style.align = 'center';
      const labelPosition = withinCameraBounds({ x: mouseTarget.x, y: mouseTarget.y - mouseLabelText.height * 2 }, mouseLabelText.width / 2);
      mouseLabelText.x = labelPosition.x;
      mouseLabelText.y = labelPosition.y;
      if (currentlyWarningOutOfRange) {
        globalThis.unitOverlayGraphics.lineStyle(3, colors.errorRed, 1.0);
        globalThis.unitOverlayGraphics.drawCircle(
          globalThis.player.unit.x,
          globalThis.player.unit.y,
          globalThis.player.unit.attackRange
        );

      }
    }
  }
}
// a UnitPath that is used to display the player's "walk rope"
// which shows the path that they will travel if they were
// to move towards the mouse cursor
let walkRopePath: Unit.UnitPath | undefined = undefined;
export function drawWalkRope(target: Vec2, underworld: Underworld) {
  if (!globalThis.player) {
    return
  }
  //
  // Show the player's current walk path (walk rope)
  //
  // The distance that the player can cover with their current stamina
  // is drawn in the stamina color.
  // There are dots dilineating how far the unit can move each turn.
  //
  // Show walk path
  globalThis.walkPathGraphics?.clear();
  walkRopePath = underworld.calculatePath(walkRopePath, round(globalThis.player.unit), round(target));
  const { points: currentPlayerPath } = walkRopePath;
  if (currentPlayerPath[0]) {
    const turnStopPoints = pointsEveryXDistanceAlongPath(globalThis.player.unit, currentPlayerPath, globalThis.player.unit.staminaMax, globalThis.player.unit.staminaMax - globalThis.player.unit.stamina);
    globalThis.walkPathGraphics?.lineStyle(4, 0xffffff, 1.0);
    // Use this similarTriangles calculation to make the line pretty so it doesn't originate from the exact center of the
    // other player but from the edge instead
    const startPoint = math.distance(globalThis.player.unit, currentPlayerPath[0]) <= config.COLLISION_MESH_RADIUS
      ? currentPlayerPath[0]
      : Vec.subtract(globalThis.player.unit, math.similarTriangles(globalThis.player.unit.x - currentPlayerPath[0].x, globalThis.player.unit.y - currentPlayerPath[0].y, math.distance(globalThis.player.unit, currentPlayerPath[0]), config.COLLISION_MESH_RADIUS));
    globalThis.walkPathGraphics?.moveTo(startPoint.x, startPoint.y);

    let lastPoint: Vec2 = globalThis.player.unit;
    let distanceCovered = 0;
    // Default to current unit position, in the event that they have no stamina this will be the point
    // at which they are out of stamina.  If they do have stamina it will be reassigned later
    let lastStaminaPoint: Vec2 = globalThis.player.unit;
    const distanceLeftToMove = globalThis.player.unit.stamina;
    for (let i = 0; i < currentPlayerPath.length; i++) {
      const point = currentPlayerPath[i];
      if (point) {
        const thisLineDistance = distance(lastPoint, point);
        if (distanceCovered > distanceLeftToMove) {
          globalThis.walkPathGraphics?.lineStyle(4, 0xffffff, 1.0);
          globalThis.walkPathGraphics?.lineTo(point.x, point.y);
        } else {
          globalThis.walkPathGraphics?.lineStyle(4, colors.stamina, 1.0);
          lastStaminaPoint = point;
          if (distanceCovered + thisLineDistance > distanceLeftToMove) {
            // Draw up to the firstStop with the stamina color
            lastStaminaPoint = getCoordsAtDistanceTowardsTarget(lastPoint, point, distanceLeftToMove - distanceCovered);
            globalThis.walkPathGraphics?.lineTo(lastStaminaPoint.x, lastStaminaPoint.y);
            globalThis.walkPathGraphics?.lineStyle(4, 0xffffff, 1.0);
            globalThis.walkPathGraphics?.lineTo(point.x, point.y);
          } else {
            globalThis.walkPathGraphics?.lineTo(point.x, point.y);
          }
        }
        distanceCovered += distance(lastPoint, point);
        lastPoint = point;
      }
    }
    drawCastRangeCircle(lastStaminaPoint, globalThis.player.unit.attackRange, globalThis.walkPathGraphics, 'Potential Cast Range');
    // Draw the points along the path at which the unit will stop on each turn
    for (let i = 0; i < turnStopPoints.length; i++) {
      if (i == 0 && distanceLeftToMove > 0) {
        globalThis.walkPathGraphics?.lineStyle(4, colors.stamina, 1.0);
      } else {
        globalThis.walkPathGraphics?.lineStyle(4, 0xffffff, 1.0);
      }
      const point = turnStopPoints[i];
      if (point) {
        globalThis.walkPathGraphics?.drawCircle(point.x, point.y, 3);
      }
    }
    if (turnStopPoints.length == 0 && distanceLeftToMove > 0) {
      globalThis.walkPathGraphics?.lineStyle(4, colors.stamina, 1.0);
    } else {
      globalThis.walkPathGraphics?.lineStyle(4, 0xffffff, 1.0);
    }
    // Draw a stop circle at the end
    const lastPointInPath = currentPlayerPath[currentPlayerPath.length - 1]
    if (lastPointInPath) {
      globalThis.walkPathGraphics?.drawCircle(lastPointInPath.x, lastPointInPath.y, 3);
    }
  }

}
function drawCastRangeCircle(point: Vec2, range: number, graphics?: Graphics, text: string = 'Cast Range') {
  if (graphics) {
    // Draw what cast range would be if unit moved to this point:
    graphics.lineStyle(3, colors.attackRangeAlly, 1.0);
    graphics.drawCircle(
      point.x,
      point.y,
      range
    );
    if (labelText) {
      labelText.text = text;
      const labelPosition = withinCameraBounds({ x: point.x, y: point.y + range }, labelText.width / 2);
      labelText.x = labelPosition.x;
      labelText.y = labelPosition.y;
    }
  }
}
export function clearTints(underworld: Underworld) {
  // Reset tints before setting new tints to show targeting
  underworld.units.forEach(unit => {
    if (unit.image) {
      unit.image.sprite.tint = 0xFFFFFF;
    }
  });
  underworld.pickups.forEach(pickup => {
    if (pickup.image) {
      pickup.image.sprite.tint = 0xFFFFFF;
    }
  });
  underworld.doodads.forEach(doodad => {
    if (doodad.image) {
      doodad.image.sprite.tint = 0xFFFFFF;
    }
  });
}

// Returns true if castCards has effect
async function showCastCardsPrediction(underworld: Underworld, target: Vec2, casterUnit: Unit.IUnit, cardIds: string[], outOfRange: boolean): Promise<boolean> {
  if (keyDown.showWalkRope) {
    // Do not show castCards prediction if the player is also viewing walkRope
    return Promise.resolve(false);
  }
  if (globalThis.player) {
    // Note: setPredictionGraphicsLineStyle must be called before castCards (because castCards may use it
    // to draw predictions) and after clearSpellEffectProjection, which clears predictionGraphics.
    setPredictionGraphicsLineStyle(outOfRange ? 0xaaaaaa : colors.targetBlue);
    const effectState = await underworld.castCards({
      // Make a copy of cardUsageCounts for prediction so it can accurately
      // calculate mana for multiple copies of one spell in one cast
      casterCardUsage: JSON.parse(JSON.stringify(globalThis.player.cardUsageCounts)),
      casterUnit,
      casterPositionAtTimeOfCast: Vec.clone(casterUnit),
      cardIds,
      castLocation: target,
      prediction: true,
      outOfRange,
      magicColor: undefined,
      casterPlayer: globalThis.player,
    });
    // Clears unit tints in preparation for setting new tints to symbolize which units are targeted by spell
    clearTints(underworld);
    // Show pickups as targeted with tint
    for (let targetedPickup of effectState.targetedPickups) {
      // Convert prediction pickup's associated real pickup
      const realPickup = targetedPickup.real || targetedPickup;
      // don't change tint if HUD is hidden
      if (realPickup && realPickup.image && !globalThis.isHUDHidden) {
        if (outOfRange) {
          realPickup.image.sprite.tint = 0xaaaaaa;
        } else {
          realPickup.image.sprite.tint = 0xff5555;
        }
      }
    }
    // Show doodads as targeted with tint
    for (let targetedDoodad of effectState.targetedDoodads) {
      // Convert prediction doodad's associated real doodad
      const realDoodad = targetedDoodad.real || targetedDoodad;
      // don't change tint if HUD is hidden
      if (realDoodad && realDoodad.image && !globalThis.isHUDHidden) {
        if (outOfRange) {
          realDoodad.image.sprite.tint = 0xaaaaaa;
        } else {
          realDoodad.image.sprite.tint = 0xff5555;
        }
      }
    }
    // Show units as targeted with tint
    for (let targetedUnit of effectState.targetedUnits) {
      // Convert prediction unit's associated real unit
      const realUnit = underworld.units.find(u => u.id == targetedUnit.id);
      // don't change tint if HUD is hidden
      if (realUnit && realUnit.image && !globalThis.isHUDHidden) {
        if (outOfRange) {
          realUnit.image.sprite.tint = 0xaaaaaa;
        } else {
          if (targetedUnit.faction == globalThis.player?.unit.faction) {
            // Ally
            realUnit.image.sprite.tint = 0x5555ff;
          } else {
            // Enemy
            realUnit.image.sprite.tint = 0xff5555;
          }
        }
      }
    }
    return effectState.targetedUnits.length > 0 || effectState.targetedPickups.length > 0;
  }
  return false;
}
export function drawHealthBarAboveHead(unitIndex: number, underworld: Underworld, zoom: number) {
  const u = underworld.units[unitIndex];
  if (u) {
    const predictionUnit = !underworld.unitsPrediction ? undefined : underworld.unitsPrediction[unitIndex];
    // Draw unit overlay graphics
    //--
    // Prevent drawing unit overlay graphics when a unit is in the portal
    if (u.x !== null && u.y !== null && !globalThis.isHUDHidden) {
      // Draw health bar
      const healthBarColor = u.faction == Faction.ALLY ? colors.healthAllyGreen : colors.healthRed;
      const healthBarHurtColor = u.faction == Faction.ALLY ? 0x235730 : colors.healthHurtRed;
      const healthBarHealColor = u.faction == Faction.ALLY ? 0x23ff30 : 0xff2828;
      globalThis.unitOverlayGraphics?.lineStyle(0, 0x000000, 1.0);
      globalThis.unitOverlayGraphics?.beginFill(healthBarColor, 1.0);
      const healthBarProps = getUIBarProps(u.x, u.y, u.health, u.healthMax, zoom, u);
      globalThis.unitOverlayGraphics?.drawRect(
        healthBarProps.x,
        // Stack the health bar above the mana bar
        healthBarProps.y - config.UNIT_UI_BAR_HEIGHT / zoom,
        healthBarProps.width,
        healthBarProps.height
      );

      // Only show health bar predictions on PlayerTurns, while players are able
      // to cast, otherwise it will show out of sync when NPCs do damage
      if (underworld.turn_phase == turn_phase.PlayerTurns && globalThis.unitOverlayGraphics) {
        // Show how much damage they'll take on their health bar
        globalThis.unitOverlayGraphics.beginFill(healthBarHurtColor, 1.0);
        if (predictionUnit) {
          const healthAfterHurt = predictionUnit.health;
          if (healthAfterHurt > u.health) {
            globalThis.unitOverlayGraphics.beginFill(healthBarHealColor, 1.0);
          }
          // const healthBarHurtWidth = Math.max(0, config.UNIT_UI_BAR_WIDTH * (u.health - healthAfterHurt) / u.healthMax);
          const healthBarHurtProps = getUIBarProps(u.x, u.y, u.health - healthAfterHurt, u.healthMax, zoom, u);
          globalThis.unitOverlayGraphics.drawRect(
            // Show the healthBarHurtBar on the right side of the health  bar
            healthBarHurtProps.x + config.UNIT_UI_BAR_WIDTH / zoom * healthAfterHurt / u.healthMax,
            // Stack the health bar above the mana bar
            healthBarHurtProps.y - config.UNIT_UI_BAR_HEIGHT / zoom,
            healthBarHurtProps.width,
            healthBarHurtProps.height);
          // Draw red death circle if a unit is currently alive, but wont be after cast
          if (u.alive && !predictionUnit.alive) {
            const skullPosition = withinCameraBounds({ x: u.x, y: u.y - config.COLLISION_MESH_RADIUS * 2 + 8 });
            const imagePath = globalThis.player && u.faction === globalThis.player.unit.faction ? 'badgeDeathAlly.png' : 'badgeDeath.png';
            ImmediateMode.draw(imagePath, skullPosition, (1 / zoom) + (Math.sin(Date.now() / 500) + 1) / 3);
          }
        }
      }
      // Draw mana bar
      if (u.manaMax != 0 && globalThis.unitOverlayGraphics) {
        globalThis.unitOverlayGraphics.lineStyle(0, 0x000000, 1.0);
        globalThis.unitOverlayGraphics.beginFill(colors.manaBlue, 1.0);
        const manaBarProps = getUIBarProps(u.x, u.y, u.mana, u.manaMax, zoom, u);
        globalThis.unitOverlayGraphics.drawRect(
          manaBarProps.x,
          manaBarProps.y,
          manaBarProps.width,
          manaBarProps.height);
        // Draw the mana that goes missing after a spell (useful for mana_burn)
        if (predictionUnit) {
          globalThis.unitOverlayGraphics.beginFill(colors.manaLostBlue, 1.0);
          // Math.max prevents the manabar from going negative
          const manaAfterSpell = Math.max(0, predictionUnit.mana);
          const manaBarHurtProps = getUIBarProps(u.x, u.y, u.mana - manaAfterSpell, u.manaMax, zoom, u);
          // Only render hurt mana bar if it dips below mana max
          // (it can remain above mana max if mana is overfilled)
          if (manaAfterSpell < u.manaMax) {
            const hurtX = manaBarHurtProps.x + config.UNIT_UI_BAR_WIDTH / zoom * manaAfterSpell / u.manaMax;
            globalThis.unitOverlayGraphics.drawRect(
              // Show the manaBarHurtBar on the right side of the mana  bar
              hurtX,
              manaBarHurtProps.y,
              // Special width calculation required to prevent overfillmana
              // from rendering wrongly 
              manaBarProps.width - (hurtX - manaBarProps.x),
              manaBarHurtProps.height);
          }
          // if (manaAfterSpell > u.mana) {
          //   globalThis.unitOverlayGraphics?.beginFill(manaBarHealColor, 1.0);
          // }
        }
      }
      globalThis.unitOverlayGraphics?.endFill();
    }

  }
}
globalThis.currentPredictionId = 0;
// runPredictions predicts what will happen next turn
// via enemy attention markers (showing if they will hurt you)
// your health and mana bar (the stripes)
// and enemy health and mana bars
// Note: if the player's health or mana or stamina has JUST
// changed before you invoke this function, you should also call
// underworld.syncPlayerPredictionUnitOnly() and then this function
// to update the attribute bars.  syncPlayerPredictionUnitOnly isn't
// automatically invoked in this function, because sometimes
// it is critical that the prediction player's attributes
// are different than the players (for example, when showing
// "50 Mana Remaining" when running a spell prediction). Syncing
// the prediction player with the player brings the prediction player's
// attributes in sync with the players, so for example after the player
// takes damage is when syncPlayerPredictionunitOnly should be called
// prior to runPredictions()
export async function runPredictions(underworld: Underworld) {
  if (globalThis.view !== View.Game) {
    return;
  }
  // TODO: Future enhancement: If runPredictions is allowed to run
  // while spells are animating you could set up and cast your next spell
  // visually while the other is still animating.  The issue is that
  // if you don't return here it won't properly clear animating graphics
  // objects
  if (globalThis.animatingSpells) {
    // Do not change the hover icons when spells are animating
    return;
  }
  if (!underworld) {
    return;
  }
  if (globalThis.currentPredictionId !== undefined) {
    globalThis.currentPredictionId++;
  }
  const startTime = Date.now();
  const mousePos = underworld.getMousePos();
  // Clear the spelleffectprojection in preparation for showing the current ones
  clearSpellEffectProjection(underworld);
  // only show hover target when it's the correct turn phase
  if (underworld.turn_phase == turn_phase.PlayerTurns) {

    if (globalThis.player) {
      underworld.syncPredictionEntities();
      CardUI.updateCardBadges(underworld);
      // Dry run cast so the user can see what effect it's going to have
      const target = mousePos;
      const casterUnit = underworld.unitsPrediction.find(u => u.id == globalThis.player?.unit.id)
      if (!casterUnit) {
        if (underworld.unitsPrediction.length) {
          console.error('Critical Error, caster unit not found');
        } else {
          // unitsPrediction is empty, this can happen after a load()
        }
        return;
      }
      const cardIds = CardUI.getSelectedCardIds();
      if (cardIds.length) {
        const outOfRange = isOutOfRange(globalThis.player, target, underworld, cardIds);
        await showCastCardsPrediction(underworld, target, casterUnit, cardIds, outOfRange);
      } else {
        // If there are no cards ready to cast, clear unit tints (which symbolize units that are targeted by the active spell)
        clearTints(underworld);
      }
      // Send this client's intentions to the other clients so they can see what they're thinking
      underworld.sendPlayerThinking({ target, cardIds })

      // Run onTurnStartEvents on unitsPrediction:
      // Displays markers above units heads if they will attack the current client's unit
      // next turn
      globalThis.attentionMarkers = [];
      // Clear predicted next turn damage so that attack targets can be intelligently calculated
      underworld.clearPredictedNextTurnDamage();
      for (let u of underworld.unitsPrediction) {
        const skipTurn = await Unit.runTurnStartEvents(u, true, underworld);
        if (skipTurn) {
          continue;
        }
        // Only check for threats if the threat is alive and AI controlled
        if (u.alive && u.unitType == UnitType.AI) {
          if (u.unitSubType == UnitSubType.SUPPORT_CLASS) {
            const unitSource = allUnits[u.unitSourceId];
            if (unitSource) {
              const targets = unitSource.getUnitAttackTargets(u, underworld);
              if (targets.length) {
                globalThis.attentionMarkers.push({ imagePath: Unit.subTypeToAttentionMarkerImage(u), pos: clone(u), scale: u.predictionScale || 1 });
              }
            }
          } else {
            const unitSource = allUnits[u.unitSourceId];
            if (unitSource) {
              const targets = unitSource.getUnitAttackTargets(u, underworld);
              if (targets) {
                for (let target of targets) {
                  // Only bother determining if the unit can attack the target 
                  // if the target is the current player, because that's the only
                  // player this function has to warn with an attention marker
                  const canAttack = underworld.canUnitAttackTarget(u, target);
                  underworld.incrementTargetsNextTurnDamage(targets, u.damage, canAttack);
                  if (target === globalThis.player.unit && canAttack) {
                    globalThis.attentionMarkers.push({ imagePath: Unit.subTypeToAttentionMarkerImage(u), pos: clone(u), scale: u.predictionScale || 1 });
                  }
                }
              }
            } else {
              console.error('Cannot find unit source for unitSourceId', u.unitSourceId);

            }
          }
        }
      }
      // Show if unit will be resurrected
      globalThis.resMarkers = [];
      if (cardIds.includes('resurrect')) {
        underworld.unitsPrediction.filter(u => u.faction == Faction.ALLY && u.alive).forEach(u => {
          // Check if their non-prediction counterpart is dead to see if they will be resurrected:
          const realUnit = underworld.units.find(x => x.id == u.id)
          if (realUnit && !realUnit.alive) {
            globalThis.resMarkers?.push(clone(realUnit));
          }
        })
      }
      Unit.syncPlayerHealthManaUI(underworld);
    }
  }
  if (globalThis.runPredictionsPanel) {
    globalThis.runPredictionsPanel.update(Date.now() - startTime, 300);
  }
}

// SpellEffectProjection are images to denote some information, such as the spell or action about to be cast/taken when clicked
export function clearSpellEffectProjection(underworld: Underworld, forceClear?: boolean) {
  if (!globalThis.animatingSpells || forceClear) {
    if (predictionGraphics) {
      predictionGraphics.clear();
    }
    if (globalThis.radiusGraphics) {
      globalThis.radiusGraphics.clear();
    }
    if (containerSpells) {
      containerSpells.removeChildren();
    }
    clearWarnings();
    uiCircles = [];
    uiCones = [];
    uiPolys = [];
  }
}

export function drawPredictionLine(start: Vec2, end: Vec2) {
  if (predictionGraphics && !globalThis.isHUDHidden) {
    predictionGraphics.lineStyle(3, colors.targetingSpellGreen, 1.0);
    predictionGraphics.moveTo(start.x, start.y);
    predictionGraphics.lineTo(end.x, end.y);
  }
}
let uiCones: { target: Vec2, radius: number, startArc: number, endArc: number, color: number, text?: string }[] = [];
let uiCircles: { target: Vec2, radius: number, color: number, text?: string }[] = [];
let uiPolys: { points: Vec2[], color: number, text?: string }[] = [];
export function drawUIPoly(points: Vec2[], color: number, text?: string) {
  // clone target so it's not a reference, it should draw what the value was when it was passed into this function
  uiPolys.push({ points: points.map(Vec.clone), color, text });
  // Note: The actual drawing now happens inside of updatePlanningView so it can account for other UI
  // circles and text that might need to take precedence.
}
export function drawUICone(target: Vec2, radius: number, startArc: number, endArc: number, color: number, text?: string) {
  // clone target so it's not a reference, it should draw what the value was when it was passed into this function
  uiCones.push({ target: Vec.clone(target), radius, startArc, endArc, color, text });
  // Note: The actual drawing now happens inside of updatePlanningView so it can account for other UI
  // circles and text that might need to take precedence.
}
export function rawDrawUICone(target: Vec2, radius: number, startArc: number, endArc: number, color: number, graphics: PIXI.Graphics) {
  graphics.lineStyle(2, color, 1.0)
  graphics.endFill();
  // Note: endAngle corresponds to startArc and startAngle corresponds to endArc because
  // how pixi.js draws arcs is opposite to how I think of angles (going counterclockwise)
  graphics.arc(target.x, target.y, radius, endArc, startArc);
  graphics.moveTo(target.x, target.y);
  const startArcPoint = math.getPosAtAngleAndDistance(target, startArc, radius);
  graphics.lineTo(startArcPoint.x, startArcPoint.y);
  graphics.moveTo(target.x, target.y);
  const endArcPoint = math.getPosAtAngleAndDistance(target, endArc, radius);
  graphics.lineTo(endArcPoint.x, endArcPoint.y);
}
export function drawUICircle(target: Vec2, radius: number, color: number, text?: string) {
  // clone target so it's not a reference, it should draw what the value was when it was passed into this function
  uiCircles.push({ target: Vec.clone(target), radius, color, text });
  // Note: The actual drawing now happens inside of updatePlanningView so it can account for other UI
  // circles and text that might need to take precedence.
}
export function setPredictionGraphicsLineStyle(color: number) {
  if (predictionGraphics) {
    predictionGraphics.lineStyle(3, color, 1.0)
  }
}
export function drawPredictionCircleFill(target: Vec2, radius: number, text: string = 'Connect Area') {
  if (globalThis.isHUDHidden) {
    return;
  }
  if (globalThis.radiusGraphics) {
    globalThis.radiusGraphics.lineStyle(1, 0x000000, 0.0);
    globalThis.radiusGraphics.beginFill(0xFFFFFF, 1.0);
    globalThis.radiusGraphics.drawCircle(target.x, target.y, radius);
    globalThis.radiusGraphics.endFill();
    if (labelText) {
      // Exception: Don't override label text if text is
      // currently telling the user that they are aiming out of range
      if (labelText.text !== i18n(TEXT_OUT_OF_RANGE)) {
        labelText.text = i18n(text);
        const labelPosition = withinCameraBounds({ x: target.x, y: target.y + radius }, labelText.width / 2);
        labelText.x = labelPosition.x;
        labelText.y = labelPosition.y;
      }
    }
  }
}

export function isOutOfBounds(target: Vec2, underworld: Underworld) {
  return (
    target.x < underworld.limits.xMin || target.x >= underworld.limits.xMax || target.y < underworld.limits.yMin || target.y >= underworld.limits.yMax
  );
}

const elInspectorTooltip = document.getElementById('inspector-tooltip');
const elInspectorTooltipContainer = document.getElementById(
  'inspector-tooltip-container',
);
const elInspectorTooltipContent = document.getElementById(
  'inspector-tooltip-content',
);
const elInspectorTooltipImage: HTMLImageElement | undefined = document.getElementById(
  'inspector-tooltip-img',
) as HTMLImageElement | undefined;

let selectedType: "unit" | "pickup" | "obstacle" | null = null;
export function updateTooltipContent(underworld: Underworld) {
  if (
    !(
      elInspectorTooltipContent &&
      elInspectorTooltip &&
      elInspectorTooltipContainer &&
      elInspectorTooltipImage
    )
  ) {
    console.error("Tooltip elements failed to initialize")
    return;
  }
  // Update information in content
  // show info on unit, pickup, etc clicked
  let text = '';
  switch (selectedType) {
    case "unit":
      let playerSpecificInfo = '';
      if (globalThis.selectedUnit) {
        if (globalThis.selectedUnit.unitType === UnitType.PLAYER_CONTROLLED) {
          const player = underworld.players.find((p) => p.unit === globalThis.selectedUnit);
          if (player) {
            playerSpecificInfo = '';
            if (player.mageType) {
              playerSpecificInfo += `<br/>${player.mageType}</div>`;
            }
            playerSpecificInfo += `<br/>${i18n('Level')} ${underworld.cardDropsDropped}</div>`;
            const lastLevelKills = underworld.calculateKillsNeededForLevel(underworld.cardDropsDropped);
            const nextLevelKills = underworld.getNumberOfEnemyKillsNeededForNextLevelUp();
            const expDenominator = nextLevelKills - lastLevelKills;
            const expNumerator = underworld.enemiesKilled - lastLevelKills;
            playerSpecificInfo += `<br/>${i18n('Experience')} ${expNumerator}/${expDenominator}<div><progress id="experience-bar" max="${expDenominator}" value="${expNumerator}"></progress></div>`;

            // playerSpecificInfo += `<br/><h3>${i18n('Perks')}</h3>`;
            // const everyLevel = player.attributePerks.filter(p => p.when == 'everyLevel');
            // const everyTurn = player.attributePerks.filter(p => p.when == 'everyTurn');
            // // Add perk descriptions to player
            // playerSpecificInfo += `${i18n('Every level')}\n`;
            // for (let perk of everyLevel) {
            //   let perkString = getPerkText(perk, true).trim() + '\n';
            //   // Simplify for tooltip
            //   perkString = perkString.split('single-turn ').join('');
            //   playerSpecificInfo += perkString;
            // }
            // playerSpecificInfo += `${i18n('Every turn')}\n`;
            // for (let perk of everyTurn) {
            //   let perkString = getPerkText(perk, true).trim();
            //   // Remove newline between chance and attribute when displayed in the tooltip so it displays on one line
            //   // https://stackoverflow.com/a/10805198
            //   perkString = perkString.replace(/[\n\r]/g, '');
            //   // Simplify for tooltip
            //   perkString = perkString.split('single-turn ').join('');

            //   playerSpecificInfo += perkString + '\n';
            // }
            playerSpecificInfo +=
              '<h3>Spells</h3>' +
              player.inventory.filter(x => x !== '').join(', ');

          } else {
            console.error('Tooltip: globalThis.selectedUnit is player controlled but does not exist in underworld.players array.');
            globalThis.selectedUnit = undefined;
            break;
          }
        }
        const unitSource = allUnits[globalThis.selectedUnit.unitSourceId]
        if (unitSource) {
          const imageSrc = Unit.getExplainPathForUnitId(unitSource.id);
          if (!elInspectorTooltipImage.src.endsWith(imageSrc)) {
            elInspectorTooltipImage.src = imageSrc;
          }
          // on error image is hidden so set it back to block whenever it is changed.
          // the onError handler prevents the broken image icon from showing
          elInspectorTooltipImage.style.display = "block";
          const extraText = `
${modifiersToText(globalThis.selectedUnit.modifiers)}
${unitSource.unitProps.manaCostToCast && unitSource.unitProps.manaCostToCast > 0 ? `${i18n('mana cost to cast')}: ${unitSource.unitProps.manaCostToCast}` : ''}
          `.trim();
          // NOTE: globalThis.selectedUnit.name is NOT localized on purpose
          // because those are user provided names
          text += `\
<h1>${globalThis.selectedUnit.name || i18n(unitSource.id)}</h1>
<hr/>
<div>${i18n(unitSource.info.description)}</div>
<hr/>
${globalThis.selectedUnit.faction == Faction.ALLY ? '🤝' : '⚔️️'} ${i18n((Faction[globalThis.selectedUnit.faction] || '').toString())}
🗡️ ${globalThis.selectedUnit.damage} ${i18n(['damage'])}${globalThis.selectedUnit.unitSubType !== UnitSubType.MELEE ? `
🎯 ${globalThis.selectedUnit.attackRange} ${i18n(['attack range'])}` : ''}
❤️ ${globalThis.selectedUnit.health}/${globalThis.selectedUnit.healthMax} ${i18n(['health capacity'])}
🔵 ${globalThis.selectedUnit.mana}/${globalThis.selectedUnit.manaMax} + ${globalThis.selectedUnit.manaPerTurn} ${i18n('Mana')} ${i18n('per turn')}
${extraText}
${playerSpecificInfo}
      `;
        }
      }
      break;
    case "pickup":
      if (globalThis.selectedPickup) {
        // Hide tooltip since pickups don't yet have tooltip images
        elInspectorTooltipImage.style.display = 'none';
        text += `\
<h1>${i18n(globalThis.selectedPickup.name)}</h1>
<hr/>
${i18n(globalThis.selectedPickup.description)}
<hr/>
      `;
      }
      break;
  }

  elInspectorTooltipContent.innerHTML = text;
  if (text == '') {
    elInspectorTooltipContainer.style.display = "none";
  } else {
    elInspectorTooltipContainer.style.display = "block";

  }
}
function modifiersToText(modifiers: object): string {
  if (Object.keys(modifiers).length === 0) {
    return ''
  }
  let message = '';
  for (let [key, value] of Object.entries(modifiers)) {
    message += `<div style="line-height:16px; display:flex;"><img width="16px" height="16px" src="${CardUI.getSpellThumbnailPath(allCards[key]?.thumbnail)}"> ${value.tooltip || `${key} ${value.quantity || ''}`}</div>`
  }
  return `<div class="modifiers">${message}</div>`;

}
export function checkIfNeedToClearTooltip() {
  if (globalThis.selectedUnit && !globalThis.selectedUnit.alive) {
    clearTooltipSelection();
  }
  // Quick hack to check if the pickup has been picked up
  // If so, deselect it
  if (globalThis.selectedPickup && (globalThis.selectedPickup.image && globalThis.selectedPickup.image.sprite.parent === null)) {
    clearTooltipSelection();
  }

}
// return boolean represents if there was a tooltip to clear
export function clearTooltipSelection(): boolean {
  if (selectedType) {
    globalThis.selectedUnit = undefined;
    globalThis.selectedPickup = undefined;
    selectedType = null;
    return true
  } else {
    return false;
  }
}

// A special slightly-modified copy of updateTooltipSelection to be used when
// player is choosing a spawn point but also wants to inspect units or things on
// the game field.
export function updateTooltipSelectionWhileSpawning(mousePos: Vec2, underworld: Underworld) {
  if (player && !player.isSpawned) {

    // Find unit:
    const units = underworld.getUnitsAt(mousePos);
    // Omit the current player unit from the tooltip selection,
    // because the player is currently looking for a spawn point,
    // their self will always be the first unit returned from getUnitsAt
    // and they want to inspect what's under them, not themself
    if (units[0] == player.unit) {
      units.shift();
    }
    const unit = units[0];
    if (unit) {
      globalThis.selectedUnit = unit;
      selectedType = "unit";
      return
    } else {
      globalThis.selectedUnit = undefined;
    }
    const pickup = underworld.getPickupAt(mousePos);
    if (pickup) {
      globalThis.selectedPickup = pickup;
      selectedType = "pickup";
      return
    } else {
      globalThis.selectedPickup = undefined;
    }
    // If nothing was found to select, null-out selectedType
    // deselect
    selectedType = null;
  }
}
export function updateTooltipSelection(mousePos: Vec2, underworld: Underworld) {

  // Find unit:
  const unit = underworld.getUnitAt(mousePos);
  if (unit) {
    globalThis.selectedUnit = unit;
    selectedType = "unit";
    return
  } else {
    globalThis.selectedUnit = undefined;
  }
  const pickup = underworld.getPickupAt(mousePos);
  if (pickup) {
    globalThis.selectedPickup = pickup;
    selectedType = "pickup";
    return
  } else {
    globalThis.selectedPickup = undefined;
  }
  // If nothing was found to select, null-out selectedType
  // deselect
  selectedType = null;
}

// Draws a faint circle over things that can be clicked on
export function drawCircleUnderTarget(mousePos: Vec2, underworld: Underworld, opacity: number, graphics: PIXI.Graphics | undefined, fill?: number) {
  if (!graphics) {
    // For headless
    return;
  }
  const targetUnit = underworld.getUnitAt(mousePos)
  const target: Vec2 | undefined = targetUnit || underworld.getPickupAt(mousePos);
  if (target) {
    graphics.lineStyle(3, fill || 0xaaaaaa, opacity);
    graphics.beginFill(0x000000, 0);
    // offset ensures the circle is under the player's feet
    // and is dependent on the animation's feet location
    const offsetX = targetUnit ? 0 : 0;
    const offsetY = targetUnit ? targetUnit.UITargetCircleOffsetY : -15;
    const scaleY = targetUnit?.image?.sprite.scale.y || 1;
    graphics.drawEllipse(target.x + offsetX, target.y + config.COLLISION_MESH_RADIUS * scaleY + offsetY * scaleY, Math.abs(targetUnit?.image?.sprite.scale.x || 1) * config.COLLISION_MESH_RADIUS / 2, (targetUnit?.image?.sprite.scale.y || 1) * config.COLLISION_MESH_RADIUS / 3);
    graphics.endFill();
  }
}


// Used to return properties for drawRect for drawing
// unit health and mana bars
export function getUIBarProps(x: number, y: number, numerator: number, denominator: number, zoom: number, unit: Unit.IUnit): { x: number, y: number, width: number, height: number } {
  const barWidthAccountForZoom = config.UNIT_UI_BAR_WIDTH / zoom;
  const barWidth = Math.max(0, barWidthAccountForZoom * Math.min(1, numerator / denominator));
  const height = config.UNIT_UI_BAR_HEIGHT / zoom;
  return {
    x: x - barWidthAccountForZoom / 2,
    // - height so that bar stays in the same position relative to the unit
    // regardless of zoom
    // - config.HEALTH_BAR_UI_Y_POS so that it renders above their head instead of
    // on their center point
    y: y - config.HEALTH_BAR_UI_Y_POS * (unit.image?.sprite.scale.y || 1) - height,
    width: barWidth,
    height
  }
}

let warnings = new Set<string>();
export function addWarningAtMouse(warning: string) {
  if (globalThis.isHUDHidden) {
    return
  }
  warnings.add(warning);
}
export function removeWarningAtMouse(warning: string) {
  warnings.delete(warning);
}
export function clearWarnings() {
  warnings.clear();
}