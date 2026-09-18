/**
 * TYPE-EFFECTIVENESS.JS - Cálculo de efectividad de combate
 */
import { getTypeMultiplier } from '../data/types-data.js';

/**
 * Evalúa el efecto de un movimiento elemental sobre el defensor
 * @param {string} moveType 
 * @param {string[]} defenderTypes 
 * @returns {{ multiplier: number, message: string, isSuper: boolean, isResisted: boolean, isImmune: boolean }}
 */
export function evaluateEffectiveness(moveType, defenderTypes = []) {
  const multiplier = getTypeMultiplier(moveType, defenderTypes);

  let message = '';
  let isSuper = false;
  let isResisted = false;
  let isImmune = false;

  if (multiplier >= 2) {
    message = '¡Es muy eficaz!';
    isSuper = true;
  } else if (multiplier > 0 && multiplier < 1) {
    message = 'No es muy eficaz...';
    isResisted = true;
  } else if (multiplier === 0) {
    message = '¡No tuvo ningún efecto!';
    isImmune = true;
  }

  return { multiplier, message, isSuper, isResisted, isImmune };
}
