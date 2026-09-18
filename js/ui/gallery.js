/**
 * GALLERY.JS - Galería canónica fusionada de capturados (Colección + Perfil).
 * Una sola implementación: la Colección muestra todo, el Perfil una vista previa.
 * Cero <span>: <data> para números, <b> para badges, <figure> para arte.
 */
import { getOfficialArtwork } from '../api/pokeapi.js';
import { getTypeNameEs } from '../data/types-data.js';
import { ASH_ASSETS } from '../components/ash-guide.js';

const NATIONAL_TOTAL = 1025;
export const PROFILE_PREVIEW_LIMIT = 6;

/**
 * Renderiza una galería de capturados en el contenedor dado.
 * @param {HTMLElement} gridEl
 * @param {Array} list - capturados
 * @param {Object} opts - { isInTeam(id), onDetail(p), onToggleTeam(p, inTeam), onBrowse(), limit, showSearch }
 * @returns {number} cantidad renderizada
 */
export function renderCapturedGallery(gridEl, list = [], opts = {}) {
  if (!gridEl) return 0;
  const {
    isInTeam = () => false,
    onDetail = () => {},
    onToggleTeam = () => {},
    onBrowse = null,
    limit = 0
  } = opts;

  gridEl.innerHTML = '';
  const visible = limit > 0 ? list.slice(0, limit) : list;

  if (visible.length === 0) {
    const empty = document.createElement('section');
    empty.className = 'collection-empty-trainer';
    empty.innerHTML = `
      <img class="collection-empty-ash-img" src="${ASH_ASSETS.greeting}" alt="Ash Ketchum animando a capturar" />
      <h3>¡Aún no has capturado ningún Pokémon!</h3>
      <p>Ve a la Pokédex y utiliza tus Poké Balls para comenzar tu colección.</p>
    `;
    if (onBrowse) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Ir a la Pokédex';
      btn.addEventListener('click', onBrowse);
      const wrap = document.createElement('p');
      wrap.appendChild(btn);
      empty.appendChild(wrap);
    }
    gridEl.appendChild(empty);
    return 0;
  }

  visible.forEach((p) => {
    const inTeam = isInTeam(p.id);
    const artwork = getOfficialArtwork(p);
    const typesItems = (p.types || []).map((t) => {
      const typeName = (t.type?.name || t.name || t || 'normal').toLowerCase();
      return `<li><b class="type-badge type-${typeName}">${getTypeNameEs(typeName)}</b></li>`;
    }).join('');

    const card = document.createElement('article');
    card.className = 'collection-card';
    card.setAttribute('data-name', `${String(p.name).toLowerCase()} ${p.id}`);
    card.innerHTML = `
      <figure class="collection-card-img-wrap">
        <img class="collection-card-img" src="${artwork}" alt="${p.name}" loading="lazy" />
      </figure>
      <section class="collection-card-info">
        <data class="collection-card-id" value="${p.id}">#${String(p.id).padStart(4, '0')}</data>
        <h4 class="collection-card-name">${p.name}</h4>
        <ul class="collection-card-types">${typesItems}</ul>
        <p class="collection-card-actions">
          <button class="btn btn-sm ${inTeam ? 'btn-outline' : 'btn-primary'} btn-toggle-team">${inTeam ? '✓ En Equipo' : '+ Al Equipo'}</button>
          <button class="btn btn-outline btn-sm btn-view-detail">Ver</button>
        </p>
      </section>
    `;

    card.querySelector('.btn-view-detail').addEventListener('click', (e) => {
      e.stopPropagation();
      onDetail(p);
    });
    card.querySelector('.btn-toggle-team').addEventListener('click', (e) => {
      e.stopPropagation();
      onToggleTeam(p, inTeam);
    });
    card.addEventListener('click', () => onDetail(p));
    gridEl.appendChild(card);
  });

  return visible.length;
}

/**
 * Filtra tarjetas ya renderizadas por texto (nombre o número).
 */
export function filterGallery(gridEl, query = '') {
  const clean = String(query).toLowerCase().trim();
  gridEl.querySelectorAll('.collection-card').forEach((card) => {
    const hay = (card.getAttribute('data-name') || '');
    card.style.display = (!clean || hay.includes(clean)) ? '' : 'none';
  });
}

/**
 * Actualiza contadores de progreso nacional (Colección).
 */
export function updateCollectionProgress(count) {
  const dataEl = document.getElementById('collection-count-data');
  const numWrap = document.getElementById('collection-count-number');
  const fill = document.getElementById('collection-progress-fill');
  const bar = document.getElementById('collection-progressbar');
  const pct = Math.min(100, Math.round((count / NATIONAL_TOTAL) * 100));
  if (dataEl) {
    dataEl.textContent = count;
    dataEl.setAttribute('value', String(count));
  }
  if (numWrap) {
    const small = numWrap.querySelector('small');
    if (small) small.textContent = `/ ${NATIONAL_TOTAL}`;
  }
  if (fill) fill.style.width = `${pct}%`;
  if (bar) bar.setAttribute('aria-valuenow', count);
}
