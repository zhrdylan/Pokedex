/**
 * PROFILE.JS - Carnet de Entrenador + vista previa de colección (galería fusionada).
 * La gestión completa vive en Mi Colección; aquí solo vista previa (6) con el
 * mismo motor js/ui/gallery.js. Cero <span>.
 */
import { gameState } from '../data/game-state.js';
import { showNotification } from '../components/notifications.js';
import { showPokemonDetail } from '../pokedex/pokemon-detail.js';
import { sfx } from '../audio/sound-effects.js';
import { navigateTo } from '../components/navigation.js';
import { renderCapturedGallery, filterGallery, PROFILE_PREVIEW_LIMIT } from '../ui/gallery.js';

const GYM_BADGES = [
  { id: 1, name: 'Medalla Roca', icon: '🪨', requiredVictories: 1, gym: 'Gimnasio Plateada' },
  { id: 2, name: 'Medalla Cascada', icon: '💧', requiredVictories: 2, gym: 'Gimnasio Celeste' },
  { id: 3, name: 'Medalla Trueno', icon: '⚡', requiredVictories: 3, gym: 'Gimnasio Carmín' },
  { id: 4, name: 'Medalla Arcoíris', icon: '🌈', requiredVictories: 4, gym: 'Gimnasio Azulona' },
  { id: 5, name: 'Medalla Alma', icon: '💜', requiredVictories: 5, gym: 'Gimnasio Fucsia' },
  { id: 6, name: 'Medalla Pantano', icon: '🔮', requiredVictories: 6, gym: 'Gimnasio Azafrán' },
  { id: 7, name: 'Medalla Volcán', icon: '🔥', requiredVictories: 7, gym: 'Gimnasio Canela' },
  { id: 8, name: 'Medalla Tierra', icon: '🌍', requiredVictories: 8, gym: 'Gimnasio Verde' }
];

function calculateTrainerRank(capturedCount, victories) {
  if (capturedCount >= 25 || victories >= 8) return 'Maestro Pokémon';
  if (capturedCount >= 15 || victories >= 5) return 'Líder Promesa';
  if (capturedCount >= 7 || victories >= 3) return 'Entrenador Élite';
  if (capturedCount >= 3 || victories >= 1) return 'Explorador Safari';
  return 'Novato de Pueblo Paleta';
}

function calculateLegendaryBoost(capturedCount) {
  // Cada Pokémon capturado aporta +3% de probabilidad de aparición legendaria (hasta 75%)
  return Math.min(75, capturedCount * 3);
}

export function initProfileView() {
  renderProfileView();

  // Escuchar cambios de estado
  window.addEventListener('gamestate:change', () => {
    renderProfileView();
  });

  // Filtro de búsqueda en la vista previa
  const searchInput = document.getElementById('profile-search-input');
  const form = document.getElementById('profile-search-form');
  if (form) form.addEventListener('submit', (e) => e.preventDefault());
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const grid = document.getElementById('profile-captured-grid');
      if (grid) filterGallery(grid, searchInput.value);
    });
  }
}

function renderProfileView() {
  const container = document.getElementById('view-profile');
  if (!container) return;

  const captured = gameState.state.capturedPokemon || [];
  const discovered = gameState.state.discoveredPokemon || [];
  const victories = gameState.state.victories || 0;
  const unlockedDiff = gameState.state.unlockedDifficulty || 'beginner';

  const rank = calculateTrainerRank(captured.length, victories);
  const boost = calculateLegendaryBoost(captured.length);

  // 1. Carnet de Entrenador
  const rankPill = document.getElementById('profile-trainer-rank');
  if (rankPill) rankPill.textContent = rank;

  const countCapEl = document.getElementById('profile-stat-captured');
  if (countCapEl) {
    countCapEl.textContent = `${captured.length} / 1025`;
    countCapEl.setAttribute('value', String(captured.length));
  }

  const countDiscEl = document.getElementById('profile-stat-discovered');
  if (countDiscEl) {
    countDiscEl.textContent = `${discovered.length} / 1025`;
    countDiscEl.setAttribute('value', String(discovered.length));
  }

  const victoriesEl = document.getElementById('profile-stat-victories');
  if (victoriesEl) {
    victoriesEl.textContent = victories;
    victoriesEl.setAttribute('value', String(victories));
  }

  const diffEl = document.getElementById('profile-stat-difficulty');
  if (diffEl) {
    const diffMap = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado', boss: 'Jefe Final' };
    diffEl.textContent = diffMap[unlockedDiff] || unlockedDiff;
    diffEl.setAttribute('value', unlockedDiff);
  }

  const boostEl = document.getElementById('profile-legendary-boost');
  if (boostEl) {
    boostEl.textContent = `+${boost}%`;
    boostEl.setAttribute('value', String(boost));
  }

  const boostBar = document.getElementById('profile-boost-progress-fill');
  const boostBarWrap = document.getElementById('profile-boost-progressbar');
  if (boostBar) boostBar.style.width = `${Math.min(100, (boost / 75) * 100)}%`;
  if (boostBarWrap) boostBarWrap.setAttribute('aria-valuenow', String(boost));

  // 2. Medallas de gimnasio
  const badgesContainer = document.getElementById('profile-gym-badges');
  if (badgesContainer) {
    badgesContainer.innerHTML = GYM_BADGES.map((b) => {
      const isEarned = victories >= b.requiredVictories;
      return `
        <li class="badge-token ${isEarned ? 'earned' : ''}" title="${b.name} (${b.gym}) - ${isEarned ? 'Obtenida' : `Requiere ${b.requiredVictories} victorias`}" aria-label="${b.name}: ${isEarned ? 'obtenida' : 'bloqueada'}">
          ${b.icon}
        </li>
      `;
    }).join('');
  }

  // 3. Vista previa de capturados (máx 6, motor fusionado)
  renderPreviewGrid(captured);
}

function renderPreviewGrid(captured) {
  const grid = document.getElementById('profile-captured-grid');
  const emptyNotice = document.getElementById('profile-empty-notice');
  if (!grid) return;

  const searchInput = document.getElementById('profile-search-input');
  const query = searchInput ? searchInput.value : '';

  if (!captured || captured.length === 0) {
    grid.innerHTML = '';
    if (emptyNotice) emptyNotice.style.display = 'block';
    return;
  }

  if (emptyNotice) emptyNotice.style.display = 'none';

  renderCapturedGallery(grid, captured, {
    limit: PROFILE_PREVIEW_LIMIT,
    isInTeam: (id) => gameState.state.playerTeam.some((tp) => tp.id === id),
    onDetail: (p) => {
      sfx.playClick();
      showPokemonDetail(p.id);
    },
    onToggleTeam: (p, inTeam) => {
      sfx.playClick();
      if (inTeam) {
        gameState.removeFromTeam(p.id);
        showNotification(`${p.name} salió de tu equipo.`, 'warning');
      } else {
        const res = gameState.addToTeam(p);
        showNotification(res.message, res.success ? 'success' : 'warning');
      }
    },
    onBrowse: () => navigateTo('pokedex')
  });

  if (query) filterGallery(grid, query);
}
