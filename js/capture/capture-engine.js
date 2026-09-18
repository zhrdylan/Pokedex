/**
 * CAPTURE-ENGINE.JS - Motor único de captura (Pokédex + Safari).
 * Elimina la duplicación entre pokedex/capture.js y capture/timing-minigame.js.
 * Las vistas son adaptadores finos de UI; toda la probabilidad vive aquí.
 */

const RARITY_TABLE = {
  common: { label: 'COMÚN', greenWidth: 36, yellowWidth: 60, speed: 0.9, baseRate: 0.80, driftAmp: 0, driftPeriodMs: 4000 },
  uncommon: { label: 'POCO COMÚN', greenWidth: 26, yellowWidth: 48, speed: 1.3, baseRate: 0.58, driftAmp: 4, driftPeriodMs: 3600 },
  rare: { label: 'RARO', greenWidth: 16, yellowWidth: 36, speed: 1.8, baseRate: 0.30, driftAmp: 8, driftPeriodMs: 3000 },
  legendary: { label: 'LEGENDARIO', greenWidth: 8, yellowWidth: 22, speed: 2.4, baseRate: 0.12, driftAmp: 12, driftPeriodMs: 2400 }
};

/** Baya: ensancha la zona verde un 50% durante un lanzamiento (1× por encuentro). */
const BERRY_GREEN_BONUS = 1.5;

/** Alerta: +12% de velocidad del puntero por intento fallido (tope +60%). */
const ALERT_STEP = 0.12;
const ALERT_MAX = 0.60;

export const BALL_TABLE = {
  pokeball: { label: 'Poké Ball', multiplier: 1.0 },
  greatball: { label: 'Super Ball', multiplier: 1.35 },
  ultraball: { label: 'Ultra Ball', multiplier: 1.70 }
};

const LEGENDARY_IDS = [144, 145, 146, 150, 151];
const RARE_IDS = [131, 143, 147, 148, 149, 94, 65, 68];

/**
 * Determina la rareza de un Pokémon por ID y experiencia base.
 */
export function rarityForPokemon(pokemon) {
  if (!pokemon) return 'common';
  if (LEGENDARY_IDS.includes(pokemon.id)) return 'legendary';
  if (RARE_IDS.includes(pokemon.id)) return 'rare';
  if (pokemon.id > 30 || (pokemon.base_experience || 0) > 120) return 'uncommon';
  return 'common';
}

/**
 * Calcula las zonas de puntería y velocidad para una rareza.
 * Con `berry=true` la zona verde se ensancha (cebo de un lanzamiento).
 */
export function zonesForRarity(rarity = 'common', { berry = false } = {}) {
  const conf = RARITY_TABLE[rarity] || RARITY_TABLE.common;
  const greenWidth = berry ? conf.greenWidth * BERRY_GREEN_BONUS : conf.greenWidth;
  const greenStart = (100 - greenWidth) / 2;
  const yellowStart = (100 - conf.yellowWidth) / 2;
  return {
    rarity,
    label: conf.label,
    speed: conf.speed,
    baseRate: conf.baseRate,
    driftAmp: conf.driftAmp,
    driftPeriodMs: conf.driftPeriodMs,
    berry,
    greenStart,
    greenEnd: greenStart + greenWidth,
    greenWidth,
    yellowStart,
    yellowEnd: yellowStart + conf.yellowWidth,
    yellowWidth: conf.yellowWidth
  };
}

/**
 * Desplazamiento de deriva de la zona verde en el instante t (ms).
 * Oscila de forma sinusoidal alrededor del centro; amplitud por rareza.
 */
export function driftOffsetAt(zones, tMs) {
  const amp = zones.driftAmp || 0;
  if (!amp) return 0;
  const period = zones.driftPeriodMs || 3000;
  const maxShift = Math.max(0, (100 - zones.yellowWidth) / 2 - 1);
  const raw = amp * Math.sin((2 * Math.PI * tMs) / period);
  return Math.max(-maxShift, Math.min(maxShift, raw));
}

/**
 * Devuelve las zonas con la deriva aplicada en el instante t (ms).
 */
export function driftedZones(zones, tMs) {
  const shift = driftOffsetAt(zones, tMs);
  if (!shift) return zones;
  return {
    ...zones,
    greenStart: zones.greenStart + shift,
    greenEnd: zones.greenEnd + shift,
    yellowStart: zones.yellowStart + shift,
    yellowEnd: zones.yellowEnd + shift
  };
}

/**
 * Velocidad del puntero con alerta por intentos fallidos del encuentro.
 * @param {number} baseSpeed
 * @param {number} failedAttempts
 */
export function alertSpeed(baseSpeed, failedAttempts = 0) {
  const bonus = Math.min(ALERT_MAX, Math.max(0, failedAttempts) * ALERT_STEP);
  return baseSpeed * (1 + bonus);
}

/**
 * Evalúa la posición del puntero contra las zonas.
 */
export function evaluateTiming(hitPos, zones) {
  if (hitPos >= zones.greenStart && hitPos <= zones.greenEnd) {
    return { multiplier: 2.5, zone: 'green', feedback: '🌟 ¡LANZAMIENTO PERFECTO!' };
  }
  if (hitPos >= zones.yellowStart && hitPos <= zones.yellowEnd) {
    return { multiplier: 1.2, zone: 'yellow', feedback: '👍 Buen lanzamiento' };
  }
  return { multiplier: 0.4, zone: 'red', feedback: 'Fuera de tiempo' };
}

/**
 * Probabilidad final de captura (acotada 5%–98%).
 */
export function captureProbability(rarity, timingMultiplier = 1, ballType = 'pokeball') {
  const conf = RARITY_TABLE[rarity] || RARITY_TABLE.common;
  const ball = BALL_TABLE[ballType] || BALL_TABLE.pokeball;
  const raw = conf.baseRate * timingMultiplier * ball.multiplier;
  return Math.min(0.98, Math.max(0.05, raw));
}

export function rollCapture(probability) {
  return Math.random() < probability;
}

/**
 * Secuencia de suspense 1... 2... 3... con sonidos de oscilación.
 * @param {Object} opts - { onTick(label), playWobble() }
 */
export async function runSuspense({ onTick, playWobble } = {}) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(900);
  playWobble?.();
  onTick?.('1...');
  await wait(1000);
  playWobble?.();
  onTick?.('2...');
  await wait(1000);
  playWobble?.();
  onTick?.('3...');
  await wait(900);
}

/**
 * Registro mínimo persistible de un capturado (evita guardar basura de la API).
 */
export function buildCapturedRecord(pokemon) {
  return {
    id: pokemon.id,
    name: pokemon.name,
    sprites: pokemon.sprites,
    types: pokemon.types,
    stats: pokemon.stats,
    moves: pokemon.moves ? pokemon.moves.slice(0, 4) : [],
    height: pokemon.height,
    weight: pokemon.weight,
    capturedAt: new Date().toISOString()
  };
}
