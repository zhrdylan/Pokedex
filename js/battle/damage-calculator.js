/**
 * DAMAGE-CALCULATOR.JS - Motor matemático de cálculo de daño para batallas Pokémon.
 * Usa la categoría real del movimiento (physical/special/status) de la base de datos.
 */
import { evaluateEffectiveness } from './type-effectiveness.js';

/**
 * Calcula el daño infligido por un movimiento
 * @param {Object} attacker - Pokémon atacante
 * @param {Object} defender - Pokémon defensor
 * @param {Object} move - Movimiento ejecutado { name, type, power, accuracy, category }
 * @param {number} level - Nivel del combate (default: 50)
 * @returns {Object} { damage, isCritical, effectiveness, isMiss }
 */
export function calculateDamage(attacker, defender, move, level = 50) {
  // Movimientos de estado no hacen daño
  if ((move.category || '').toLowerCase() === 'status' || !move.power) {
    return {
      damage: 0,
      isCritical: false,
      effectiveness: { multiplier: 1, message: '', isSuper: false, isResisted: false, isImmune: false },
      isMiss: false,
      isStatus: true
    };
  }

  // Verificación de precisión (Accuracy)
  const accuracy = move.accuracy || 100;
  const roll = Math.random() * 100;
  if (roll > accuracy) {
    return {
      damage: 0,
      isCritical: false,
      effectiveness: { multiplier: 1, message: '¡El ataque falló!' },
      isMiss: true
    };
  }

  // Obtener estadísticas según la categoría REAL del movimiento
  const getStat = (pokemon, statName) => {
    const s = pokemon.stats?.find(st => st.stat.name === statName);
    return s ? s.base_stat : 60;
  };

  const category = (move.category || '').toLowerCase();
  const isSpecial = category === 'special';
  const attackStat = isSpecial ? getStat(attacker, 'special-attack') : getStat(attacker, 'attack');
  const defenseStat = isSpecial ? getStat(defender, 'special-defense') : getStat(defender, 'defense');

  const movePower = move.power || 60;

  // Multiplicador de tipo
  const defTypes = defender.types?.map(t => t.type.name) || [];
  const effectiveness = evaluateEffectiveness(move.type, defTypes);

  if (effectiveness.multiplier === 0) {
    return {
      damage: 0,
      isCritical: false,
      effectiveness,
      isMiss: false
    };
  }

  // Golpe crítico (6.25% de probabilidad)
  const isCritical = Math.random() < 0.0625;
  const critMultiplier = isCritical ? 1.5 : 1;

  // Bonificación de mismo tipo (STAB: 1.5 si coincide con tipos del atacante)
  const attackerTypes = attacker.types?.map(t => t.type.name.toLowerCase()) || [];
  const stab = attackerTypes.includes(move.type?.toLowerCase()) ? 1.5 : 1;

  // Variación aleatoria (0.85 a 1.0)
  const variation = 0.85 + Math.random() * 0.15;

  // Fórmula estándar equilibrada
  const baseDamage = (((2 * level / 5 + 2) * movePower * (attackStat / defenseStat)) / 50 + 2);
  const finalDamage = Math.max(1, Math.round(baseDamage * stab * effectiveness.multiplier * critMultiplier * variation));

  return {
    damage: finalDamage,
    isCritical,
    effectiveness,
    isMiss: false
  };
}

/**
 * HP máximo de combate a partir del stat base (fórmula centralizada).
 * @param {Object} pokemon
 * @param {number} bonus - ajuste aditivo por dificultad
 */
export function calcMaxHp(pokemon, bonus = 60) {
  const base = pokemon.stats?.find(st => st.stat.name === 'hp')?.base_stat || 60;
  return base * 2 + bonus;
}
