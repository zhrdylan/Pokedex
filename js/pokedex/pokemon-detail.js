/**
 * POKEMON-DETAIL.JS - Modal con detalles enriquecidos y estadísticas animadas con GSAP.
 * Cero <span>: <data> para valores, <b> para badges, <figure> para arte, <dl> para stats.
 */
import { getPokemonByIdOrName, getOfficialArtwork } from '../api/pokeapi.js';
import { openModal, closeModal } from '../components/modal.js';
import { getTypeNameEs } from '../data/types-data.js';
import { gameState } from '../data/game-state.js';
import { animateStatBars } from '../animations/gsap-animations.js';
import { getMoveByName } from '../data/moves-data.js';
import { startCaptureSequence } from './capture.js';
import { loadingState, errorState } from '../ui/feedback.js';

export async function showPokemonDetail(idOrName) {
  const modalEl = document.getElementById('pokemon-detail-modal');
  const bodyEl = document.getElementById('pokemon-detail-content');
  if (!modalEl || !bodyEl) return;

  bodyEl.innerHTML = loadingState('Consultando datos del Pokémon...');
  openModal('pokemon-detail-modal');

  try {
    const p = await getPokemonByIdOrName(idOrName);
    const artwork = getOfficialArtwork(p);
    const typesItems = p.types.map(t => `
      <li><b class="type-badge type-${t.type.name}">${getTypeNameEs(t.type.name)}</b></li>
    `).join('');

    const statsMap = {
      hp: { label: 'HP', class: 'hp', max: 255 },
      attack: { label: 'Ataque', class: 'attack', max: 190 },
      defense: { label: 'Defensa', class: 'defense', max: 230 },
      'special-attack': { label: 'Atq. Esp.', class: 'sp-attack', max: 194 },
      'special-defense': { label: 'Def. Esp.', class: 'sp-defense', max: 230 },
      speed: { label: 'Velocidad', class: 'speed', max: 180 }
    };

    const statsHtml = p.stats.map(s => {
      const conf = statsMap[s.stat.name] || { label: s.stat.name, class: '', max: 200 };
      const percentage = Math.min(100, Math.round((s.base_stat / conf.max) * 100));
      return `
        <section class="stat-row">
          <dt class="stat-label">${conf.label}</dt>
          <dd class="stat-value"><data value="${s.base_stat}">${s.base_stat}</data></dd>
          <dd class="stat-bar-track" role="progressbar" aria-label="${conf.label} ${s.base_stat}" aria-valuemin="0" aria-valuemax="${conf.max}" aria-valuenow="${s.base_stat}">
            <b class="stat-bar-fill ${conf.class}" data-target-width="${percentage}%"></b>
          </dd>
        </section>
      `;
    }).join('');

    const abilitiesStr = p.abilities.map(a => a.ability.name.replace(/-/g, ' ')).join(', ');

    // Enriquecer movimientos con la base de datos de 842 movimientos
    const topMoves = p.moves.slice(0, 10);
    const enrichedMoves = await Promise.all(
      topMoves.map(async m => {
        const moveDetails = await getMoveByName(m.move.name);
        return {
          name: m.move.name.replace(/-/g, ' '),
          type: moveDetails?.type || p.types[0]?.type?.name || 'normal',
          category: moveDetails?.category || 'physical',
          power: moveDetails?.power || '—',
          accuracy: moveDetails?.accuracy ? moveDetails.accuracy + '%' : '—',
          effect: moveDetails?.effect || 'Ataque característico de combate.'
        };
      })
    );

    const movesHtml = enrichedMoves.map(m => `
      <li class="detail-move-row">
        <section>
          <strong class="detail-move-name">${m.name}</strong>
          <small class="detail-move-effect">${m.effect}</small>
        </section>
        <p class="detail-move-side">
          <b class="type-badge type-${m.type} detail-move-type">${m.type}</b>
          <strong class="detail-move-power">Pot: ${m.power}</strong>
        </p>
      </li>
    `).join('');

    bodyEl.innerHTML = `
      <article class="pokemon-detail-body">
        <header class="detail-header">
          <hgroup class="detail-title-group">
            <h2 class="detail-name">${p.name}</h2>
            <data class="detail-id" value="${p.id}">#${String(p.id).padStart(3, '0')}</data>
          </hgroup>
          <ul class="detail-types-list">${typesItems}</ul>
        </header>

        <section class="detail-main-info">
          <figure class="detail-art-container">
            <img class="detail-art-img" src="${artwork}" alt="${p.name}" />
            <figcaption class="detail-art-caption">
              <img src="assets/img/Ash_Ketchum/Ash_Ketchum-Teniendo-Celular.jpeg" alt="Ash consultando su dispositivo"
                   class="detail-art-ash" />
              <b class="detail-art-tag">FICHA NACIONAL</b>
            </figcaption>
          </figure>

          <section>
            <dl class="detail-quick-specs">
              <section class="spec-item">
                <dt class="spec-label">Altura</dt>
                <dd class="spec-val"><data value="${p.height}">${(p.height / 10).toFixed(1)} m</data></dd>
              </section>
              <section class="spec-item">
                <dt class="spec-label">Peso</dt>
                <dd class="spec-val"><data value="${p.weight}">${(p.weight / 10).toFixed(1)} kg</data></dd>
              </section>
              <section class="spec-item">
                <dt class="spec-label">Exp. Base</dt>
                <dd class="spec-val"><data value="${p.base_experience || 0}">${p.base_experience || 'N/A'} XP</data></dd>
              </section>
              <section class="spec-item">
                <dt class="spec-label">Habilidades</dt>
                <dd class="spec-val spec-val--small">${abilitiesStr}</dd>
              </section>
            </dl>

            <section class="detail-stats-section">
              <h4>Estadísticas Base Oficiales</h4>
              <dl class="stats-list">
                ${statsHtml}
              </dl>
            </section>
          </section>
        </section>

        <section class="detail-moves-section">
          <h4>Movimientos Destacados</h4>
          <ul class="detail-moves-list">
            ${movesHtml}
          </ul>
        </section>

        <p class="detail-capture-cta">
          <button id="btn-detail-capture" class="btn ${gameState.isCaptured(p.id) ? 'btn-outline' : 'btn-primary'} btn-lg capture-throw-full capture-throw-btn" ${gameState.isCaptured(p.id) ? 'disabled' : ''}>
            <b class="capture-pokeball-graphic capture-throw-ball" aria-hidden="true"></b>
            <b class="capture-throw-label">${gameState.isCaptured(p.id) ? 'YA CAPTURADO' : 'CAPTURAR ESTE POKÉMON'}</b>
          </button>
        </p>
      </article>
    `;

    setTimeout(() => {
      const bars = bodyEl.querySelectorAll('.stat-bar-fill');
      animateStatBars(bars);
    }, 50);

    const detailCaptureBtn = document.getElementById('btn-detail-capture');
    if (detailCaptureBtn && !gameState.isCaptured(p.id)) {
      detailCaptureBtn.addEventListener('click', () => {
        closeModal('pokemon-detail-modal');
        startCaptureSequence(p);
      });
    }

  } catch (err) {
    bodyEl.innerHTML = errorState('No se pudo cargar la información del Pokémon.', 'btn-detail-retry', 'Reintentar');
    const retry = document.getElementById('btn-detail-retry');
    if (retry) retry.addEventListener('click', () => showPokemonDetail(idOrName));
  }
}
