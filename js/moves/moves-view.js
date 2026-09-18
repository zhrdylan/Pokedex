/**
 * MOVES-VIEW.JS - Controlador de la Biblioteca de Movimientos de Pokémon
 */
import { loadMovesDatabase, translateCategory } from '../data/moves-data.js';
import { POKEMON_TYPES, getTypeNameEs } from '../data/types-data.js';
import { sfx } from '../audio/sound-effects.js';

let allMoves = [];
let filteredMoves = [];
let currentDisplayCount = 30;
const BATCH_SIZE = 30;

let searchTerm = '';
let selectedType = 'all';
let selectedCategory = 'all';
let sortOrder = 'name-asc';

export async function initMovesView() {
  allMoves = await loadMovesDatabase();
  filteredMoves = [...allMoves];

  setupMovesControls();
  renderMoves();
}

function setupMovesControls() {
  const searchInput = document.getElementById('moves-search-input');
  const typeFilter = document.getElementById('moves-type-filter');
  const catFilter = document.getElementById('moves-cat-filter');
  const sortSelect = document.getElementById('moves-sort-select');
  const loadMoreBtn = document.getElementById('btn-load-more-moves');

  // Llenar select de tipos
  if (typeFilter) {
    POKEMON_TYPES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = `${t.icon} ${t.es}`;
      typeFilter.appendChild(opt);
    });

    typeFilter.addEventListener('change', (e) => {
      selectedType = e.target.value;
      applyFilters();
    });
  }

  // Búsqueda con debounce
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        searchTerm = e.target.value.trim().toLowerCase();
        applyFilters();
      }, 300);
    });
  }

  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      selectedCategory = e.target.value;
      applyFilters();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortOrder = e.target.value;
      applyFilters();
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      sfx.playClick();
      currentDisplayCount += BATCH_SIZE;
      renderMoves();
    });
  }
}

function applyFilters() {
  filteredMoves = allMoves.filter(m => {
    const matchSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm) || m.effect.toLowerCase().includes(searchTerm);
    const matchType = selectedType === 'all' || m.type === selectedType.toLowerCase();
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory.toLowerCase();
    return matchSearch && matchType && matchCat;
  });

  // Ordenamiento
  if (sortOrder === 'power-desc') {
    filteredMoves.sort((a, b) => b.power - a.power);
  } else if (sortOrder === 'power-asc') {
    filteredMoves.sort((a, b) => a.power - b.power);
  } else if (sortOrder === 'acc-desc') {
    filteredMoves.sort((a, b) => b.accuracy - a.accuracy);
  } else if (sortOrder === 'name-asc') {
    filteredMoves.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === 'name-desc') {
    filteredMoves.sort((a, b) => b.name.localeCompare(a.name));
  }

  currentDisplayCount = BATCH_SIZE;
  renderMoves();
}

function renderMoves() {
  const container = document.getElementById('moves-grid-list');
  const countEl = document.getElementById('moves-count-badge');
  const loadMoreBtn = document.getElementById('btn-load-more-moves');
  if (!container) return;

  if (countEl) {
    countEl.textContent = `${filteredMoves.length} de ${allMoves.length} Movimientos`;
  }

  const movesToRender = filteredMoves.slice(0, currentDisplayCount);

  if (movesToRender.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p class="empty-state-icon">⚔️</p>
        <p>No se encontraron movimientos con los filtros aplicados.</p>
      </div>
    `;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  container.innerHTML = '';
  movesToRender.forEach(m => {
    const card = document.createElement('article');
    card.className = 'move-card';

    const categoryIcons = {
      physical: '⚔️',
      special: '🔮',
      status: '🛡️'
    };

    card.innerHTML = `
      <header class="move-card-header">
        <h3 class="move-card-name">${m.name}</h3>
        <b class="type-badge type-${m.type}">${getTypeNameEs(m.type)}</b>
      </header>

      <p class="move-card-category-row">
        <b class="category-tag category-${m.category}">
          ${categoryIcons[m.category] || ''} ${translateCategory(m.category)}
        </b>
      </p>

      <dl class="move-card-stats">
        <section class="move-stat-item">
          <dt>Potencia</dt>
          <dd><strong>${m.power > 0 ? m.power : '—'}</strong></dd>
        </section>
        <section class="move-stat-item">
          <dt>Precisión</dt>
          <dd><strong>${m.accuracy > 0 ? m.accuracy + '%' : '—'}</strong></dd>
        </section>
        <section class="move-stat-item">
          <dt>PP</dt>
          <dd><strong>${m.pp}</strong></dd>
        </section>
      </dl>

      <p class="move-card-effect">${m.effect}</p>
    `;

    container.appendChild(card);
  });

  if (loadMoreBtn) {
    loadMoreBtn.style.display = currentDisplayCount < filteredMoves.length ? 'inline-flex' : 'none';
  }
}
