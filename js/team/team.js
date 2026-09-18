/**
 * TEAM.JS - Gestión del equipo de combate de hasta 6 Pokémon (cero <span>).
 * Permite añadir, quitar, designar líder y reorganizar (subir/bajar).
 */
import { gameState } from '../data/game-state.js';
import { getOfficialArtwork } from '../api/pokeapi.js';
import { typeBadgesHtml } from '../ui/pokemon-card.js';
import { showNotification } from '../components/notifications.js';
import { navigateTo } from '../components/navigation.js';
import { showPokemonDetail } from '../pokedex/pokemon-detail.js';
import { sfx } from '../audio/sound-effects.js';

export function initTeamView() {
  renderTeamView();

  window.addEventListener('gamestate:change', () => {
    renderTeamView();
  });
}

function renderTeamView() {
  const container = document.getElementById('team-slots-grid');
  const countBadge = document.getElementById('team-counter-badge');
  if (!container) return;

  const team = gameState.state.playerTeam;
  const maxTeamSize = 6;

  if (countBadge) {
    countBadge.textContent = `EQUIPO ${team.length} / ${maxTeamSize}`;
  }

  container.innerHTML = '';

  // Renderizar los 6 slots
  for (let i = 0; i < maxTeamSize; i++) {
    const p = team[i];
    const slot = document.createElement('li');
    slot.className = 'team-slot-item';

    if (p) {
      // Slot ocupado
      const isLead = i === gameState.state.activePokemonIndex;
      const artwork = getOfficialArtwork(p);

      const card = document.createElement('article');
      card.className = `team-slot-card ${isLead ? 'is-active-lead' : ''}`;
      card.innerHTML = `
        ${isLead ? '<b class="team-lead-crown">👑 LÍDER ACTIVO</b>' : ''}
        <figure class="team-slot-img-wrap">
          <img class="team-slot-img" src="${artwork}" alt="${p.name}" loading="lazy" />
        </figure>
        <section class="team-slot-info">
          <h3 class="team-slot-name">${p.name}</h3>
          <ul class="team-slot-types">${typeBadgesHtml(p.types)}</ul>
          <p class="team-slot-actions">
            ${!isLead ? `<button class="btn btn-secondary btn-sm btn-set-lead">Hacer Líder</button>` : ''}
            <button class="btn btn-outline btn-sm btn-team-detail">Detalle</button>
            <button class="btn btn-outline btn-sm btn-move-up" title="Subir posición" ${i === 0 ? 'disabled' : ''} aria-label="Subir a ${p.name}">↑</button>
            <button class="btn btn-outline btn-sm btn-move-down" title="Bajar posición" ${i === team.length - 1 ? 'disabled' : ''} aria-label="Bajar a ${p.name}">↓</button>
            <button class="btn btn-danger btn-sm btn-remove-member" title="Quitar del equipo" aria-label="Quitar a ${p.name} del equipo">&times;</button>
          </p>
        </section>
      `;

      // Eventos
      const setLeadBtn = card.querySelector('.btn-set-lead');
      if (setLeadBtn) {
        setLeadBtn.addEventListener('click', () => {
          sfx.playClick();
          gameState.setActiveLeader(i);
          showNotification(`${p.name} es ahora tu Pokémon líder.`, 'info');
        });
      }

      card.querySelector('.btn-team-detail').addEventListener('click', () => {
        sfx.playClick();
        showPokemonDetail(p.id);
      });

      card.querySelector('.btn-remove-member').addEventListener('click', () => {
        sfx.playClick();
        gameState.removeFromTeam(p.id);
        showNotification(`${p.name} salió del equipo.`, 'warning');
      });

      const upBtn = card.querySelector('.btn-move-up');
      if (upBtn) {
        upBtn.addEventListener('click', () => {
          sfx.playClick();
          gameState.moveTeamMember(p.id, -1);
        });
      }

      const downBtn = card.querySelector('.btn-move-down');
      if (downBtn) {
        downBtn.addEventListener('click', () => {
          sfx.playClick();
          gameState.moveTeamMember(p.id, 1);
        });
      }

      slot.appendChild(card);
    } else {
      // Slot vacío
      const emptySlot = document.createElement('section');
      emptySlot.className = 'team-slot-card empty-slot';
      emptySlot.innerHTML = `
        <b class="empty-slot-icon" aria-hidden="true">+</b>
        <p class="empty-slot-text">Ranura ${i + 1} Disponible</p>
        <p><button class="btn btn-outline btn-sm btn-add-from-col">Asignar desde Colección</button></p>
      `;

      emptySlot.querySelector('.btn-add-from-col').addEventListener('click', () => {
        sfx.playClick();
        navigateTo('collection');
      });

      slot.appendChild(emptySlot);
    }

    container.appendChild(slot);
  }
}
