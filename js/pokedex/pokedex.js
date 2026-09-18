/**
 * POKEDEX.JS - Pokédex completa de más de 1000 Pokémon (Generaciones 1 a 9).
 * Usa tarjeta compartida js/ui/pokemon-card.js y estados js/ui/feedback.js.
 * Cero <span>. Búsqueda con debounce + fallback directo a la API.
 */
import { getPokemonList, getPokemonByIdOrName } from '../api/pokeapi.js';
import { gameState } from '../data/game-state.js';
import { POKEMON_TYPES } from '../data/types-data.js';
import { showPokemonDetail } from './pokemon-detail.js';
import { animateCardGrid } from '../animations/gsap-animations.js';
import { sfx } from '../audio/sound-effects.js';
import { createPokemonCard, refreshCaptureBadges } from '../ui/pokemon-card.js';
import { loadingState, emptyState, errorState } from '../ui/feedback.js';

const GENERATIONS = [
  { id: 'all', name: 'Todas las Generaciones (#001 - #1025)', offset: 0, limit: 1025 },
  { id: 'gen1', name: 'Gen 1: Kanto (#001 - #151)', offset: 0, limit: 151 },
  { id: 'gen2', name: 'Gen 2: Johto (#152 - #251)', offset: 151, limit: 100 },
  { id: 'gen3', name: 'Gen 3: Hoenn (#252 - #386)', offset: 251, limit: 135 },
  { id: 'gen4', name: 'Gen 4: Sinnoh (#387 - #493)', offset: 386, limit: 107 },
  { id: 'gen5', name: 'Gen 5: Teselia (#494 - #649)', offset: 493, limit: 156 },
  { id: 'gen6', name: 'Gen 6: Kalos (#650 - #721)', offset: 649, limit: 72 },
  { id: 'gen7', name: 'Gen 7: Alola (#722 - #809)', offset: 721, limit: 88 },
  { id: 'gen8', name: 'Gen 8: Galar (#810 - #905)', offset: 809, limit: 96 },
  { id: 'gen9', name: 'Gen 9: Paldea (#906 - #1025)', offset: 905, limit: 120 }
];

const PAGE_SIZE = 24;
let activeGen = GENERATIONS[0];
let currentOffset = 0;
let maxGenOffset = 1025;
let allLoadedPokemon = [];
let isLoading = false;
let currentSearchTerm = '';
let currentSelectedType = 'all';
let currentSortOrder = 'id-asc';
let loadAbort = null;

export async function initPokedex() {
  setupPokedexControls();
  await loadGeneration('all');

  window.addEventListener('gamestate:change', () => {
    refreshCaptureBadges((id) => gameState.isCaptured(id));
    updatePokedexCounters();
  });
}

function setupPokedexControls() {
  const form = document.getElementById('pokedex-controls-form');
  const searchInput = document.getElementById('pokedex-search-input');
  const genFilter = document.getElementById('pokedex-gen-filter');
  const typeFilter = document.getElementById('pokedex-type-filter');
  const sortSelect = document.getElementById('pokedex-sort-select');
  const loadMoreBtn = document.getElementById('btn-load-more-pokedex');

  if (form) form.addEventListener('submit', (e) => e.preventDefault());

  // Llenar select de generaciones
  if (genFilter) {
    genFilter.innerHTML = '';
    GENERATIONS.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      genFilter.appendChild(opt);
    });

    genFilter.addEventListener('change', async (e) => {
      sfx.playClick();
      await loadGeneration(e.target.value);
    });
  }

  // Llenar select de tipos
  if (typeFilter) {
    POKEMON_TYPES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = `${t.icon} ${t.es}`;
      typeFilter.appendChild(opt);
    });

    typeFilter.addEventListener('change', (e) => {
      sfx.playClick();
      currentSelectedType = e.target.value;
      renderFilteredPokemon();
    });
  }

  // Búsqueda en tiempo real con fallback directo a la API
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        currentSearchTerm = e.target.value.trim().toLowerCase();
        await handleSearchOrFilter();
      }, 350);
    });
  }

  // Ordenamiento
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sfx.playClick();
      currentSortOrder = e.target.value;
      renderFilteredPokemon();
    });
  }

  // Cargar más
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      sfx.playClick();
      loadNextBatch();
    });
  }
}

async function loadGeneration(genId) {
  if (loadAbort) loadAbort.aborted = true;
  const controller = { aborted: false };
  loadAbort = controller;

  activeGen = GENERATIONS.find(g => g.id === genId) || GENERATIONS[0];
  currentOffset = activeGen.offset;
  maxGenOffset = activeGen.offset + activeGen.limit;
  allLoadedPokemon = [];

  const grid = document.getElementById('pokedex-grid');
  if (grid) grid.innerHTML = loadingState('Consultando la base de datos nacional...');

  await loadNextBatch(controller);
}

async function loadNextBatch(controller = null) {
  if (isLoading || currentOffset >= maxGenOffset) return;
  if (controller?.aborted) return;
  isLoading = true;

  const loadMoreBtn = document.getElementById('btn-load-more-pokedex');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Cargando Pokémon...';
  }

  const limit = Math.min(PAGE_SIZE, maxGenOffset - currentOffset);

  try {
    const listRes = await getPokemonList(limit, currentOffset);
    if (controller?.aborted) return;

    // Obtener detalles en paralelo
    const detailedList = await Promise.all(
      listRes.results.map(item => getPokemonByIdOrName(item.name))
    );
    if (controller?.aborted) return;

    allLoadedPokemon.push(...detailedList);
    detailedList.forEach(p => gameState.discoverPokemon(p.id));

    currentOffset += limit;
    renderFilteredPokemon();
    updatePokedexCounters();

  } catch (error) {
    console.error('Error cargando lote de Pokédex:', error);
    const grid = document.getElementById('pokedex-grid');
    if (grid && allLoadedPokemon.length === 0) {
      grid.innerHTML = errorState('No se pudo conectar con la base de datos. Revisa tu conexión e inténtalo de nuevo.');
      const retry = document.getElementById('btn-feedback-retry');
      if (retry) retry.addEventListener('click', () => loadNextBatch());
    }
  } finally {
    isLoading = false;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = currentOffset >= maxGenOffset;
      loadMoreBtn.textContent = currentOffset >= maxGenOffset ? '¡Todos los Pokémon del rango han sido cargados!' : 'Cargar Más Pokémon';
    }
  }
}

async function handleSearchOrFilter() {
  if (!currentSearchTerm) {
    renderFilteredPokemon();
    return;
  }

  // Verificar si ya existe en los cargados
  const localMatch = allLoadedPokemon.some(p =>
    p.name.toLowerCase().includes(currentSearchTerm) ||
    String(p.id) === currentSearchTerm
  );

  if (!localMatch) {
    // Buscar directamente en la API si es un término de búsqueda nuevo
    const grid = document.getElementById('pokedex-grid');
    if (grid) {
      grid.innerHTML = loadingState('Buscando en la base de datos nacional (+1000 Pokémon)...');
    }

    try {
      const remotePokemon = await getPokemonByIdOrName(currentSearchTerm);
      if (remotePokemon && !allLoadedPokemon.some(p => p.id === remotePokemon.id)) {
        allLoadedPokemon.unshift(remotePokemon);
        gameState.discoverPokemon(remotePokemon.id);
      }
    } catch (err) {
      // No encontrado: se muestra el estado vacío en el render
    }
  }

  renderFilteredPokemon();
}

function renderFilteredPokemon() {
  const grid = document.getElementById('pokedex-grid');
  if (!grid) return;

  let filtered = [...allLoadedPokemon];

  if (currentSearchTerm) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(currentSearchTerm) ||
      String(p.id) === currentSearchTerm ||
      String(p.id).padStart(3, '0') === currentSearchTerm
    );
  }

  if (currentSelectedType !== 'all') {
    filtered = filtered.filter(p =>
      p.types.some(t => t.type.name.toLowerCase() === currentSelectedType.toLowerCase())
    );
  }

  if (currentSortOrder === 'id-asc') {
    filtered.sort((a, b) => a.id - b.id);
  } else if (currentSortOrder === 'id-desc') {
    filtered.sort((a, b) => b.id - a.id);
  } else if (currentSortOrder === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSortOrder === 'name-desc') {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (filtered.length === 0) {
    grid.innerHTML = emptyState('🔍', 'No se encontró ningún Pokémon con ese criterio en la base de datos.');
    return;
  }

  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  filtered.forEach(p => {
    fragment.appendChild(createPokemonCardElement(p));
  });
  grid.appendChild(fragment);

  animateCardGrid(grid.querySelectorAll('.pokemon-card'));
}

function createPokemonCardElement(p) {
  const isCap = gameState.isCaptured(p.id);
  const card = createPokemonCard(p, { captured: isCap });

  card.setAttribute('aria-label', `Pokémon ${p.name}, número ${p.id}. Pulsa para ver el detalle.`);

  const detailBtn = card.querySelector('.btn-view-detail');

  if (detailBtn) {
    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.playClick();
      showPokemonDetail(p.id);
    });
  }

  card.addEventListener('click', () => {
    sfx.playClick();
    showPokemonDetail(p.id);
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sfx.playClick();
      showPokemonDetail(p.id);
    }
  });

  return card;
}

function updatePokedexCounters() {
  const discCounter = document.getElementById('count-discovered');
  const capCounter = document.getElementById('count-captured');

  if (discCounter) {
    discCounter.textContent = `${gameState.state.discoveredPokemon.length} / 1025`;
    discCounter.setAttribute('value', String(gameState.state.discoveredPokemon.length));
  }
  if (capCounter) {
    capCounter.textContent = `${gameState.state.capturedPokemon.length} / 1025`;
    capCounter.setAttribute('value', String(gameState.state.capturedPokemon.length));
  }
}
