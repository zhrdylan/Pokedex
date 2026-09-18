/**
 * TYPES-VIEW.JS - Módulo de consulta de tipos elementales y relaciones de daño
 */
import { POKEMON_TYPES, TYPE_EFFECTIVENESS, getTypeNameEs } from '../data/types-data.js';
import { getTypeDetails, getOfficialArtwork, getPokemonByIdOrName } from '../api/pokeapi.js';

let activeTypeName = 'fire'; // Fuego por defecto

export async function initTypesView() {
  renderTypesSelector();
  await loadAndRenderTypeDetails(activeTypeName);
}

function renderTypesSelector() {
  const container = document.getElementById('types-selector-grid');
  if (!container) return;

  container.innerHTML = '';
  POKEMON_TYPES.forEach(t => {
    const item = document.createElement('li');
    item.className = 'type-pill-item';
    const btn = document.createElement('button');
    btn.className = `type-pill-btn type-${t.name} ${t.name === activeTypeName ? 'active' : ''}`;
    btn.setAttribute('aria-pressed', t.name === activeTypeName ? 'true' : 'false');
    btn.innerHTML = `
      <b class="type-pill-icon" aria-hidden="true">${t.icon}</b>
      <b class="type-pill-label">${t.es}</b>
    `;
    btn.addEventListener('click', () => {
      activeTypeName = t.name;
      // Actualizar clase activa
      container.querySelectorAll('.type-pill-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      loadAndRenderTypeDetails(t.name);
    });
    item.appendChild(btn);
    container.appendChild(item);
  });
}

async function loadAndRenderTypeDetails(typeName) {
  const panel = document.getElementById('type-detail-panel');
  if (!panel) return;

  const currentTypeMeta = POKEMON_TYPES.find(t => t.name === typeName) || { es: typeName, icon: '⚡' };

  // Relaciones desde la matriz local para respuesta inmediata
  const relations = TYPE_EFFECTIVENESS[typeName] || {};
  const superEffective = [];
  const notEffective = [];
  const noEffect = [];

  Object.entries(relations).forEach(([target, mult]) => {
    if (mult === 2) superEffective.push(target);
    else if (mult === 0.5) notEffective.push(target);
    else if (mult === 0) noEffect.push(target);
  });

  const renderChips = (list) => {
    if (list.length === 0) return '<li class="empty-relation-msg">Ninguno</li>';
    return list.map(t => `
      <li><b class="type-badge type-${t}">${getTypeNameEs(t)}</b></li>
    `).join('');
  };

  panel.innerHTML = `
    <header class="type-panel-header">
      <b class="type-badge type-${typeName} type-active-badge">
        ${currentTypeMeta.icon} ${currentTypeMeta.es}
      </b>
      <p class="type-description-text">
        Análisis táctico de ventajas y debilidades del tipo <strong>${currentTypeMeta.es}</strong> en combate.
      </p>
    </header>

    <ul class="damage-relations-container">
      <li class="damage-relation-card super-effective">
        <header class="damage-card-header">
          <h4 class="damage-card-title">Super Efectivo Contra</h4>
          <b class="damage-multiplier-tag">x2.0 Daño</b>
        </header>
        <ul class="damage-types-list">
          ${renderChips(superEffective)}
        </ul>
      </li>

      <li class="damage-relation-card not-effective">
        <header class="damage-card-header">
          <h4 class="damage-card-title">Poco Efectivo Contra</h4>
          <b class="damage-multiplier-tag">x0.5 Daño</b>
        </header>
        <ul class="damage-types-list">
          ${renderChips(notEffective)}
        </ul>
      </li>

      <li class="damage-relation-card no-effect">
        <header class="damage-card-header">
          <h4 class="damage-card-title">Sin Efecto Contra</h4>
          <b class="damage-multiplier-tag">x0.0 Daño</b>
        </header>
        <ul class="damage-types-list">
          ${renderChips(noEffect)}
        </ul>
      </li>
    </ul>

    <section class="type-showcase-section">
      <h3 class="type-pokemon-showcase-title">Pokémon Representativos de Tipo ${currentTypeMeta.es}</h3>
      <ul id="type-pokemon-showcase-list" class="type-showcase-list">
        <li><p class="type-showcase-loading">Consultando...</p></li>
      </ul>
    </section>
  `;

  // Cargar Pokémon representativos de la API
  try {
    const apiData = await getTypeDetails(typeName);
    const showcaseContainer = document.getElementById('type-pokemon-showcase-list');
    if (!showcaseContainer) return;

    const sampleList = apiData.pokemon.slice(0, 6);
    const detailedSamples = await Promise.all(
      sampleList.map(item => getPokemonByIdOrName(item.pokemon.name))
    );

    showcaseContainer.innerHTML = '';
    detailedSamples.forEach(p => {
      const art = getOfficialArtwork(p);
      const item = document.createElement('li');
      item.className = 'type-showcase-item';
      item.innerHTML = `
        <img src="${art}" alt="${p.name}" loading="lazy" />
        <section>
          <h4>${p.name}</h4>
          <data value="${p.id}">#${String(p.id).padStart(3, '0')}</data>
        </section>
      `;
      showcaseContainer.appendChild(item);
    });

  } catch (err) {
    console.warn('No se pudieron obtener los Pokémon de la API para el tipo:', err);
  }
}
