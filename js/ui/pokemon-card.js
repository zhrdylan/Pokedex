/**
 * POKEMON-CARD.JS - Constructor compartido de tarjetas Pokémon (cero <span>).
 * Fuente única para Pokédex, Colección, Perfil y Equipo.
 * Usa: <data> para números, <b> para badges/etiquetas, <figure> para arte.
 */
import { getOfficialArtwork } from '../api/pokeapi.js';
import { getTypeNameEs } from '../data/types-data.js';

/**
 * Badges de tipo como lista semántica (sin spans).
 * @param {Array} types - [{ type: { name } }] o [{ name }]
 * @param {string} size - sufijo de clase opcional
 * @returns {string} HTML de <li><b class="type-badge">
 */
export function typeBadgesHtml(types = [], sizeClass = '') {
  return (types || []).map((t) => {
    const typeName = (t.type?.name || t.name || t || 'normal').toLowerCase();
    return `<li><b class="type-badge type-${typeName} ${sizeClass}">${getTypeNameEs(typeName)}</b></li>`;
  }).join('');
}

/**
 * Crea una tarjeta de Pokémon reutilizable.
 * @param {Object} p - Datos de Pokémon (id, name, types, sprites)
 * @param {Object} opts - { captured, inTeam, detailLabel, actionLabel, actionClass }
 * @returns {HTMLElement} <article class="pokemon-card">
 */
export function createPokemonCard(p, opts = {}) {
  const {
    captured = false,
    inTeam = false,
    detailLabel = 'Detalle',
    actionLabel = null,
    actionClass = 'btn-primary',
    showStatus = true
  } = opts;

  const card = document.createElement('article');
  card.className = 'pokemon-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Pokémon ${p.name}, número ${p.id}`);

  const artwork = getOfficialArtwork(p);
  const paddedId = String(p.id).padStart(3, '0');

  card.innerHTML = `
    <data class="card-number" value="${p.id}">#${paddedId}</data>
    ${showStatus ? `<b class="card-capture-status" data-pokemon-id="${p.id}" title="${captured ? 'Capturado' : 'No capturado'}">${captured ? '🔴' : '⚪'}</b>` : ''}
    <figure class="card-image-wrap">
      <img class="card-image" src="${artwork}" alt="${p.name}" loading="lazy" />
    </figure>
    <h3 class="card-name">${p.name}</h3>
    <ul class="card-types" aria-label="Tipos de ${p.name}">${typeBadgesHtml(p.types)}</ul>
    <p class="card-actions">
      <button class="btn btn-outline card-btn btn-view-detail">${detailLabel}</button>
      ${actionLabel ? `<button class="btn ${inTeam ? 'btn-danger' : actionClass} card-btn btn-card-action">${actionLabel}</button>` : ''}
    </p>
  `;

  return card;
}

/**
 * Actualiza los badges de captura ya renderizados (sin re-render).
 * @param {Function} isCaptured - (id) => boolean
 */
export function refreshCaptureBadges(isCaptured) {
  document.querySelectorAll('.card-capture-status').forEach((badge) => {
    const id = Number(badge.getAttribute('data-pokemon-id'));
    const cap = isCaptured(id);
    badge.textContent = cap ? '🔴' : '⚪';
    badge.setAttribute('title', cap ? 'Capturado' : 'No capturado');
  });
}
