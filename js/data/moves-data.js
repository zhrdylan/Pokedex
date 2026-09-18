/**
 * MOVES-DATA.JS - Base de datos de 842 movimientos de Pokémon
 */

let movesCache = null;

export async function loadMovesDatabase() {
  if (movesCache) return movesCache;
  try {
    const res = await fetch('js/data/moves-data.json');
    movesCache = await res.json();
    return movesCache;
  } catch (err) {
    console.error('Error cargando moves-data.json:', err);
    return [];
  }
}

export function translateCategory(cat) {
  const map = {
    physical: 'Físico',
    special: 'Especial',
    status: 'Estado'
  };
  return map[cat] || cat;
}

export async function getMoveByName(name) {
  const moves = await loadMovesDatabase();
  const cleanName = name.toLowerCase().replace(/-/g, ' ').trim();
  return moves.find(m => m.name.toLowerCase() === cleanName) || null;
}

export async function getRandomMovesForType(type, count = 4) {
  const moves = await loadMovesDatabase();
  const matching = moves.filter(m => m.type === type.toLowerCase() && m.power > 0);
  if (matching.length <= count) return matching;

  const shuffled = [...matching].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
