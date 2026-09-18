/**
 * TYPES-DATA.JS - Definición de los 18 tipos elementales y matriz de efectividad
 */

export const POKEMON_TYPES = [
  { id: 1, name: 'normal', es: 'Normal', icon: '⚪' },
  { id: 2, name: 'fighting', es: 'Lucha', icon: '🥊' },
  { id: 3, name: 'flying', es: 'Volador', icon: '🦅' },
  { id: 4, name: 'poison', es: 'Veneno', icon: '☠️' },
  { id: 5, name: 'ground', es: 'Tierra', icon: '🏜️' },
  { id: 6, name: 'rock', es: 'Roca', icon: '🪨' },
  { id: 7, name: 'bug', es: 'Bicho', icon: '🐛' },
  { id: 8, name: 'ghost', es: 'Fantasma', icon: '👻' },
  { id: 9, name: 'steel', es: 'Acero', icon: '⚙️' },
  { id: 10, name: 'fire', es: 'Fuego', icon: '🔥' },
  { id: 11, name: 'water', es: 'Agua', icon: '💧' },
  { id: 12, name: 'grass', es: 'Planta', icon: '🌿' },
  { id: 13, name: 'electric', es: 'Eléctrico', icon: '⚡' },
  { id: 14, name: 'psychic', es: 'Psíquico', icon: '🔮' },
  { id: 15, name: 'ice', es: 'Hielo', icon: '❄️' },
  { id: 16, name: 'dragon', es: 'Dragón', icon: '🐉' },
  { id: 17, name: 'dark', es: 'Siniestro', icon: '🌑' },
  { id: 18, name: 'fairy', es: 'Hada', icon: '✨' }
];

/**
 * Matriz de relaciones de daño por tipo (Atacante vs Defensor)
 * Formato: TYPE_EFFECTIVENESS[atacante][defensor] = multiplicador (0, 0.5, 1, 2)
 */
export const TYPE_EFFECTIVENESS = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

/**
 * Retorna el multiplicador de efectividad de un ataque contra los tipos del defensor
 * @param {string} attackType 
 * @param {string[]} defenderTypes 
 * @returns {number} Multiplicador final (0, 0.25, 0.5, 1, 2, 4)
 */
export function getTypeMultiplier(attackType, defenderTypes = []) {
  if (!attackType) return 1;
  const aType = attackType.toLowerCase();
  let totalMultiplier = 1;

  for (const dType of defenderTypes) {
    const cleanDefType = dType.toLowerCase();
    const relations = TYPE_EFFECTIVENESS[aType];
    if (relations && relations[cleanDefType] !== undefined) {
      totalMultiplier *= relations[cleanDefType];
    }
  }

  return totalMultiplier;
}

/**
 * Traduce el nombre de un tipo a español
 * @param {string} typeName 
 */
export function getTypeNameEs(typeName) {
  const found = POKEMON_TYPES.find(t => t.name === typeName.toLowerCase());
  return found ? found.es : typeName;
}
