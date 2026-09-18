/**
 * COLLECTION.JS - Galería canónica de capturados (fusionada con Perfil).
 * Usa js/ui/gallery.js como única implementación. Total nacional: 1025.
 */
import { gameState } from '../data/game-state.js';
import { showPokemonDetail } from '../pokedex/pokemon-detail.js';
import { showNotification } from '../components/notifications.js';
import { showAshGuide } from '../components/ash-guide.js';
import { navigateTo } from '../components/navigation.js';
import { sfx } from '../audio/sound-effects.js';
import { renderCapturedGallery, filterGallery, updateCollectionProgress } from '../ui/gallery.js';

export function initCollection() {
  renderCollection();
  wireCollectionSearch();

  // Escuchar cambios de estado
  window.addEventListener('gamestate:change', () => {
    renderCollection();
  });
}

function wireCollectionSearch() {
  const searchInput = document.getElementById('collection-search-input');
  const form = document.getElementById('collection-search-form');
  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const grid = document.getElementById('collection-grid');
      if (grid) filterGallery(grid, searchInput.value);
    });
  }
}

function renderCollection() {
  const container = document.getElementById('collection-grid');
  if (!container) return;

  const captured = gameState.state.capturedPokemon || [];
  updateCollectionProgress(captured.length);

  // Conservar filtro de búsqueda activo tras re-render
  const searchInput = document.getElementById('collection-search-input');
  const query = searchInput ? searchInput.value : '';

  renderCapturedGallery(container, captured, {
    isInTeam: (id) => gameState.state.playerTeam.some((tp) => tp.id === id),
    onDetail: (p) => {
      sfx.playClick();
      showPokemonDetail(p.id);
    },
    onToggleTeam: (p, inTeam) => {
      sfx.playClick();
      if (inTeam) {
        gameState.removeFromTeam(p.id);
        showNotification(`${p.name} fue retirado del equipo.`, 'warning');
      } else {
        const res = gameState.addToTeam(p);
        if (res.success) {
          showNotification(res.message, 'success');
        } else {
          showNotification(res.message, 'danger');
          showAshGuide({
            image: 'pointing',
            title: 'Equipo Completo',
            message: 'Tu equipo tiene el máximo de 6 Pokémon. Retira uno antes de agregar a otro.',
            duration: 4000
          });
        }
      }
    },
    onBrowse: () => navigateTo('pokedex')
  });

  if (query) filterGallery(container, query);
}
