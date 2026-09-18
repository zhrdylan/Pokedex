/**
 * POKEAPI.JS - Cliente de integración para PokéAPI v2 con soporte para todas las generaciones
 */

const BASE_URL = 'https://pokeapi.co/api/v2';
const cache = new Map();
const MAX_CACHE_ENTRIES = 300;

function cacheSet(url, data) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Evicción FIFO: elimina la entrada más antigua
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(url, data);
}

async function fetchWithCache(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  if (cache.has(url)) {
    return cache.get(url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error en PokéAPI: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    cacheSet(url, data);
    return data;
  } catch (error) {
    console.error(`Error al consultar ${url}:`, error);
    throw error;
  }
}

export async function getPokemonList(limit = 24, offset = 0) {
  return await fetchWithCache(`/pokemon?limit=${limit}&offset=${offset}`);
}

export async function getPokemonByIdOrName(idOrName) {
  const cleanId = String(idOrName).toLowerCase().trim();
  return await fetchWithCache(`/pokemon/${cleanId}`);
}

export async function getTypeDetails(typeNameOrId) {
  const cleanType = String(typeNameOrId).toLowerCase().trim();
  return await fetchWithCache(`/type/${cleanType}`);
}

/**
 * Retorna siempre la ilustración oficial en alta definición del Pokémon
 * @param {Object} pokemonData 
 * @returns {string} URL de la imagen
 */
export function getOfficialArtwork(pokemonData) {
  if (!pokemonData) return '';
  const id = pokemonData.id;

  if (id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  return pokemonData.sprites?.other?.['official-artwork']?.front_default ||
         pokemonData.sprites?.other?.home?.front_default ||
         pokemonData.sprites?.front_default ||
         'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
}
