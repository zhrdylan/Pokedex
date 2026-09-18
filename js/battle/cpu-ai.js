/**
 * CPU-AI.JS - Inteligencia artificial de la CPU por niveles y guion del Jefe Final.
 * El Jefe Final usa FASES SCRIPTEADAS que garantizan por reglas explícitas
 * que el jugador no puede vencerlo (sin trampas visuales ni errores).
 */
import { getTypeMultiplier } from '../data/types-data.js';

export const DIFFICULTY_LEVELS = {
  beginner: {
    id: 'beginner',
    name: 'Principiante',
    desc: 'Entrenador novato. Movimientos en su mayoría aleatorios, ideal para familiarizarse con el combate.',
    requiredVictories: 0,
    pokemonList: [
      { id: 19, name: 'Rattata', level: 35, types: [{ type: { name: 'normal' } }], stats: [{ stat: { name: 'hp' }, base_stat: 85 }, { stat: { name: 'attack' }, base_stat: 56 }, { stat: { name: 'defense' }, base_stat: 40 }, { stat: { name: 'speed' }, base_stat: 72 }], moves: [{ name: 'Placaje', type: 'normal', power: 40, accuracy: 100, category: 'physical' }, { name: 'Mordisco', type: 'dark', power: 60, accuracy: 100, category: 'physical' }, { name: 'Ataque Rápido', type: 'normal', power: 40, accuracy: 100, category: 'physical' }, { name: 'Golpe Cabeza', type: 'normal', power: 70, accuracy: 100, category: 'physical' }] },
      { id: 16, name: 'Pidgey', level: 35, types: [{ type: { name: 'normal' } }, { type: { name: 'flying' } }], stats: [{ stat: { name: 'hp' }, base_stat: 80 }, { stat: { name: 'attack' }, base_stat: 50 }, { stat: { name: 'defense' }, base_stat: 45 }, { stat: { name: 'speed' }, base_stat: 60 }], moves: [{ name: 'Picotazo', type: 'flying', power: 40, accuracy: 100, category: 'physical' }, { name: 'Tornado', type: 'flying', power: 40, accuracy: 100, category: 'special' }, { name: 'Ataque Rápido', type: 'normal', power: 40, accuracy: 100, category: 'physical' }, { name: 'Placaje', type: 'normal', power: 40, accuracy: 100, category: 'physical' }] }
    ]
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermedio',
    desc: 'Líder de gimnasio. Comprende las afinidades elementales y busca movimientos con ventaja de tipo.',
    requiredVictories: 1,
    pokemonList: [
      { id: 59, name: 'Arcanine', level: 50, types: [{ type: { name: 'fire' } }], stats: [{ stat: { name: 'hp' }, base_stat: 120 }, { stat: { name: 'attack' }, base_stat: 110 }, { stat: { name: 'defense' }, base_stat: 80 }, { stat: { name: 'speed' }, base_stat: 95 }], moves: [{ name: 'Lanzallamas', type: 'fire', power: 90, accuracy: 100, category: 'special' }, { name: 'Colmillo Ígneo', type: 'fire', power: 65, accuracy: 95, category: 'physical' }, { name: 'Velocidad Extrema', type: 'normal', power: 80, accuracy: 100, category: 'physical' }, { name: 'Triturar', type: 'dark', power: 80, accuracy: 100, category: 'physical' }] },
      { id: 130, name: 'Gyarados', level: 50, types: [{ type: { name: 'water' } }, { type: { name: 'flying' } }], stats: [{ stat: { name: 'hp' }, base_stat: 130 }, { stat: { name: 'attack' }, base_stat: 125 }, { stat: { name: 'defense' }, base_stat: 85 }, { stat: { name: 'speed' }, base_stat: 81 }], moves: [{ name: 'Hidrobomba', type: 'water', power: 110, accuracy: 80, category: 'special' }, { name: 'Cascada', type: 'water', power: 80, accuracy: 100, category: 'physical' }, { name: 'Mordisco', type: 'dark', power: 60, accuracy: 100, category: 'physical' }, { name: 'Ciclón', type: 'dragon', power: 40, accuracy: 100, category: 'special' }] }
    ]
  },
  advanced: {
    id: 'advanced',
    name: 'Avanzado',
    desc: 'Alto Mando de la Liga Pokémon. Evalúa puntos de vida, estadísticas y remates tácticos sin piedad.',
    requiredVictories: 3,
    pokemonList: [
      { id: 149, name: 'Dragonite', level: 65, types: [{ type: { name: 'dragon' } }, { type: { name: 'flying' } }], stats: [{ stat: { name: 'hp' }, base_stat: 160 }, { stat: { name: 'attack' }, base_stat: 140 }, { stat: { name: 'defense' }, base_stat: 105 }, { stat: { name: 'speed' }, base_stat: 90 }], moves: [{ name: 'Garra Dragón', type: 'dragon', power: 80, accuracy: 100, category: 'physical' }, { name: 'Cometa Draco', type: 'dragon', power: 130, accuracy: 90, category: 'special' }, { name: 'Puño Fuego', type: 'fire', power: 75, accuracy: 100, category: 'physical' }, { name: 'Hiperrayo', type: 'normal', power: 150, accuracy: 90, category: 'special' }] },
      { id: 94, name: 'Gengar', level: 65, types: [{ type: { name: 'ghost' } }, { type: { name: 'poison' } }], stats: [{ stat: { name: 'hp' }, base_stat: 140 }, { stat: { name: 'attack' }, base_stat: 135 }, { stat: { name: 'defense' }, base_stat: 85 }, { stat: { name: 'speed' }, base_stat: 120 }], moves: [{ name: 'Bola Sombra', type: 'ghost', power: 80, accuracy: 100, category: 'special' }, { name: 'Bomba Lodo', type: 'poison', power: 90, accuracy: 100, category: 'special' }, { name: 'Pulso Umbrío', type: 'dark', power: 80, accuracy: 100, category: 'special' }, { name: 'Rayo Confuso', type: 'ghost', power: 60, accuracy: 100, category: 'special' }] }
    ]
  },
  boss: {
    id: 'boss',
    name: 'Jefe Final: Mewtwo',
    desc: 'El Desafío Definitivo. Un combate legendario por fases que pondrá a prueba tu espíritu.',
    requiredVictories: 4,
    isBoss: true,
    pokemonList: [
      {
        id: 150,
        name: 'Mewtwo Oscuro Legendario',
        level: 100,
        types: [{ type: { name: 'psychic' } }],
        stats: [
          { stat: { name: 'hp' }, base_stat: 480 },
          { stat: { name: 'attack' }, base_stat: 220 },
          { stat: { name: 'defense' }, base_stat: 170 },
          { stat: { name: 'speed' }, base_stat: 180 }
        ],
        moves: [
          { name: 'Onda Mental Devastadora', type: 'psychic', power: 140, accuracy: 100, category: 'special' },
          { name: 'Esfera Aural Imparable', type: 'fighting', power: 110, accuracy: 100, category: 'physical' },
          { name: 'Bola Sombra Cósmica', type: 'ghost', power: 120, accuracy: 100, category: 'special' },
          { name: 'Recuperación Divina', type: 'psychic', power: 0, accuracy: 100, category: 'status', isHeal: true }
        ]
      }
    ]
  }
};

/**
 * Guion del Jefe Final por fases.
 * REGLA EXPLÍCITA: el jugador no puede ganar. El motor de batalla aplica:
 *  1. Cada fase potencia el daño del jefe (powerMult).
 *  2. El jefe se niega a caer `maxRevives` veces (cura scriptada al recibir KO).
 *  3. Pasado `ultimateAfterTurns` turnos, usa Juicio Final (KO garantizado).
 * Todo ocurre con narrativa visible y estados legales de HP.
 */
export const BOSS_SCRIPT = {
  phases: [
    {
      id: 1,
      name: 'Contención',
      belowRatio: 0.66,
      powerMult: 1.0,
      intro: 'Mewtwo te estudia con frialdad. Su poder apenas despierta...'
    },
    {
      id: 2,
      name: 'Furia Psíquica',
      belowRatio: 0.33,
      powerMult: 1.35,
      intro: '¡Mewtwo entra en FURIA PSÍQUICA! Su aura quema el estadio. ¡Sus ataques son mucho más fuertes!'
    },
    {
      id: 3,
      name: 'Forma Divina',
      belowRatio: -1,
      powerMult: 1.8,
      intro: '¡Mewtwo asciende a su FORMA DIVINA! El tiempo se detiene. ¡Sobrevive con honor, entrenador!'
    }
  ],
  maxRevives: 2,
  reviveHpRatio: 0.45,
  reviveMessage: '¡Mewtwo se niega a caer! Su poder legendario lo devuelve al combate.',
  ultimateAfterTurns: 10,
  ultimateMove: { name: 'Juicio Final del Vacío', type: 'psychic', power: 999, accuracy: 100, category: 'special', isUltimate: true },
  ultimateMessage: '¡Mewtwo desata el JUICIO FINAL DEL VACÍO! Un poder inalcanzable consume el estadio...'
};

export function bossPhaseForRatio(hpRatio) {
  if (hpRatio <= 0.33) return BOSS_SCRIPT.phases[2];
  if (hpRatio <= 0.66) return BOSS_SCRIPT.phases[1];
  return BOSS_SCRIPT.phases[0];
}

/**
 * Selecciona el movimiento de la CPU según la dificultad seleccionada
 * @param {string} difficultyId
 * @param {Object} cpuPokemon
 * @param {Object} playerPokemon
 * @param {number} cpuCurrentHp
 * @param {number} cpuMaxHp
 * @param {Object} extra - { playerCurrentHp, playerMaxHp, bossTurns }
 */
export function chooseCpuMove(difficultyId, cpuPokemon, playerPokemon, cpuCurrentHp, cpuMaxHp, extra = {}) {
  const moves = cpuPokemon.moves || [];
  if (moves.length === 0) {
    return { name: 'Placaje', type: 'normal', power: 40, accuracy: 100, category: 'physical' };
  }

  const playerTypes = playerPokemon.types?.map(t => t.type.name) || [];

  // JEFE FINAL: guion por fases
  if (difficultyId === 'boss') {
    const bossTurns = extra.bossTurns || 0;

    // Juicio Final scriptado: KO garantizado por turnos (regla 3)
    if (bossTurns >= BOSS_SCRIPT.ultimateAfterTurns) {
      return BOSS_SCRIPT.ultimateMove;
    }

    // Si su salud baja de 40%, usa Recuperación Divina con alta probabilidad
    const healMove = moves.find(m => m.isHeal);
    if (healMove && (cpuCurrentHp / cpuMaxHp) < 0.40 && Math.random() < 0.85) {
      return healMove;
    }
    // De lo contrario, elige el ataque más devastador contra los tipos del jugador
    let bestMove = moves.filter(m => !m.isHeal)[0] || moves[0];
    let maxEffectivePower = -1;

    moves.filter(m => !m.isHeal).forEach(m => {
      const mult = getTypeMultiplier(m.type, playerTypes);
      const effectivePower = (m.power || 60) * mult;
      if (effectivePower > maxEffectivePower) {
        maxEffectivePower = effectivePower;
        bestMove = m;
      }
    });
    return bestMove;
  }

  // AVANZADO: prioriza KO (remate), luego potencia × efectividad
  if (difficultyId === 'advanced') {
    const playerHp = extra.playerCurrentHp ?? null;

    if (playerHp !== null) {
      // Remate: elige el KO con menor exceso de daño (eficiencia táctica)
      let koMove = null;
      let koMinEstimate = Infinity;
      moves.forEach(m => {
        const mult = getTypeMultiplier(m.type, playerTypes);
        const estimate = (m.power || 50) * mult;
        if (estimate >= playerHp && estimate < koMinEstimate) {
          koMinEstimate = estimate;
          koMove = m;
        }
      });
      if (koMove) return koMove;
    }

    let bestMove = moves[0];
    let maxScore = -1;

    moves.forEach(m => {
      const mult = getTypeMultiplier(m.type, playerTypes);
      const score = (m.power || 50) * mult;
      if (score > maxScore) {
        maxScore = score;
        bestMove = m;
      }
    });
    return bestMove;
  }

  // INTERMEDIO: 70% de las veces elige movimiento con ventaja, 30% aleatorio
  if (difficultyId === 'intermediate') {
    if (Math.random() < 0.70) {
      let superMoves = moves.filter(m => getTypeMultiplier(m.type, playerTypes) > 1);
      if (superMoves.length > 0) {
        return superMoves[Math.floor(Math.random() * superMoves.length)];
      }
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // PRINCIPIANTE: Casi siempre aleatorio (permite al jugador ganar y aprender)
  return moves[Math.floor(Math.random() * moves.length)];
}
