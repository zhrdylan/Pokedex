import { getPokemonByIdOrName, getOfficialArtwork } from '../api/pokeapi.js';
import { timingMinigame } from './timing-minigame.js';
import { sfx } from '../audio/sound-effects.js';
import { showAshGuide, ASH_ASSETS } from '../components/ash-guide.js';
import { gameState } from '../data/game-state.js';

const LEGENDARY_POOL = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 384];

const BIOMES = [
  {
    id: 'meadow',
    name: 'Pradera de Kanto',
    icon: '🌾',
    desc: 'Tierras abiertas donde habitan especies comunes y amigables.',
    rarity: 'common',
    candidates: [16, 19, 10, 43, 69, 29] // Pidgey, Rattata, Caterpie, Oddish, Bellsprout, Nidoran
  },
  {
    id: 'forest',
    name: 'Bosque Verde',
    icon: '🌲',
    desc: 'Espesos árboles con Pokémon ágiles y poco comunes.',
    rarity: 'uncommon',
    candidates: [25, 1, 12, 123, 127, 37] // Pikachu, Bulbasaur, Butterfree, Scyther, Pinsir, Vulpix
  },
  {
    id: 'cave',
    name: 'Caverna Celeste',
    icon: '⛰️',
    desc: 'Profundidades rocosas donde habitan especies poderosas y raras.',
    rarity: 'rare',
    candidates: [95, 94, 68, 93, 65, 74] // Onix, Gengar, Machamp, Haunter, Alakazam, Geodude
  },
  {
    id: 'sanctuary',
    name: 'Santuario Místico',
    icon: '✨',
    desc: 'Un lugar sagrado donde se manifiestan Pokémon míticos y legendarios.',
    rarity: 'legendary',
    candidates: [131, 143, 148, 144, 145, 146, 151] // Lapras, Snorlax, Dragonair, Articuno, Zapdos, Moltres, Mew
  }
];

class WildAreaManager {
  constructor() {
    this.activeBiomeId = 'meadow';
    this.isEncounterActive = false;
  }

  init() {
    this.renderBiomes();
    this.setupEventListeners();
    this.updateLegendaryBanner();

    window.addEventListener('wild:explore-again', () => {
      this.resetToExploreStage();
    });

    window.addEventListener('gamestate:change', () => {
      this.updateLegendaryBanner();
    });
  }

  updateLegendaryBanner() {
    const rateEl = document.getElementById('safari-legendary-rate');
    const captured = gameState.state.capturedPokemon || [];
    const bonus = Math.min(75, captured.length * 3);
    if (rateEl) {
      rateEl.textContent = `+${bonus}%`;
    }
  }

  renderBiomes() {
    const grid = document.getElementById('biomes-selector-grid');
    if (!grid) return;

    grid.innerHTML = '';
    BIOMES.forEach(b => {
      const item = document.createElement('li');
      item.className = 'biome-item';
      const card = document.createElement('button');
      card.className = `biome-card ${b.id === this.activeBiomeId ? 'active' : ''}`;
      card.setAttribute('aria-pressed', b.id === this.activeBiomeId ? 'true' : 'false');
      card.innerHTML = `
        <b class="biome-icon" aria-hidden="true">${b.icon}</b>
        <h4 class="biome-name">${b.name}</h4>
        <p class="biome-desc">${b.desc}</p>
        <b class="rarity-badge rarity-${b.rarity}">${b.rarity.toUpperCase()}</b>
      `;
      card.onclick = () => {
        sfx.playClick();
        this.activeBiomeId = b.id;
        grid.querySelectorAll('.biome-card').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-pressed', 'true');
        this.resetToExploreStage();
      };
      item.appendChild(card);
      grid.appendChild(item);
    });
  }

  setupEventListeners() {
    const exploreBtn = document.getElementById('btn-explore-grass');
    if (exploreBtn) {
      exploreBtn.onclick = () => this.exploreGrass();
    }

    const throwBtn = document.getElementById('btn-timing-throw');
    if (throwBtn) {
      throwBtn.onclick = () => timingMinigame.triggerCatch();
    }

    // Tecla Espacio para disparar el lanzamiento
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && timingMinigame.isRunning) {
        e.preventDefault();
        timingMinigame.triggerCatch();
      }
    });
  }

  resetToExploreStage() {
    this.isEncounterActive = false;
    timingMinigame.stop();

    const stage = document.getElementById('wild-encounter-stage');
    const grass = document.getElementById('wild-grass-container');
    const encounterCard = document.getElementById('wild-encounter-card');
    const minigamePanel = document.getElementById('timing-minigame-panel');
    const actionWrap = document.getElementById('wild-action-controls');
    const pokeballGraphic = document.getElementById('wild-pokeball-graphic');

    if (pokeballGraphic) {
      pokeballGraphic.style.display = 'none';
      pokeballGraphic.classList.remove('shaking', 'ball-flying');
    }
    const wildArt = document.getElementById('wild-pokemon-art');
    if (wildArt) wildArt.classList.remove('wild-dodge-rare', 'wild-dodge-legendary');
    if (grass) grass.style.display = 'flex';
    if (encounterCard) encounterCard.style.display = 'none';
    if (minigamePanel) minigamePanel.style.display = 'none';

    if (actionWrap) {
      actionWrap.innerHTML = `
        <button id="btn-explore-grass" class="btn btn-primary btn-lg">Explorar Hierba Alta</button>
      `;
      document.getElementById('btn-explore-grass').onclick = () => this.exploreGrass();
    }

    const hint = document.getElementById('wild-stage-hint');
    if (hint) hint.textContent = '¡Explora la hierba para detectar Pokémon salvajes en este bioma!';
  }

  async exploreGrass() {
    if (this.isEncounterActive) return;
    this.isEncounterActive = true;
    sfx.playClick();

    const grassClumps = document.querySelectorAll('.grass-clump');
    grassClumps.forEach(g => g.classList.add('rustling'));

    const hint = document.getElementById('wild-stage-hint');
    if (hint) hint.textContent = '¡Buscando entre la hierba alta...!';

    const exploreBtn = document.getElementById('btn-explore-grass');
    if (exploreBtn) {
      exploreBtn.disabled = true;
      exploreBtn.textContent = 'Rastreando...';
    }

    // Suspense de exploración
    await new Promise(r => setTimeout(r, 1400));

    grassClumps.forEach(g => g.classList.remove('rustling'));

    // Probabilidad de aparición legendaria dinámica según la cantidad de Pokémon capturados
    const captured = gameState.state.capturedPokemon || [];
    const legendaryBoost = Math.min(75, captured.length * 3);
    const isLegendaryRoll = Math.random() * 100 < (this.activeBiomeId === 'sanctuary' ? 60 : legendaryBoost);

    const biome = BIOMES.find(b => b.id === this.activeBiomeId) || BIOMES[0];
    let chosenId;
    let encounterRarity;

    if (isLegendaryRoll && (captured.length > 0 || this.activeBiomeId === 'sanctuary')) {
      chosenId = LEGENDARY_POOL[Math.floor(Math.random() * LEGENDARY_POOL.length)];
      encounterRarity = 'legendary';
    } else {
      chosenId = biome.candidates[Math.floor(Math.random() * biome.candidates.length)];
      encounterRarity = biome.rarity;
    }

    try {
      const pokemon = await getPokemonByIdOrName(chosenId);
      this.displayWildEncounter(pokemon, encounterRarity);
    } catch (err) {
      console.error('Error buscando Pokémon salvaje:', err);
      this.resetToExploreStage();
    }
  }

  displayWildEncounter(pokemon, rarity) {
    const grass = document.getElementById('wild-grass-container');
    const encounterCard = document.getElementById('wild-encounter-card');
    const artImg = document.getElementById('wild-pokemon-art');
    const nameEl = document.getElementById('wild-pokemon-name');
    const rarityBadge = document.getElementById('wild-rarity-badge');
    const typesWrap = document.getElementById('wild-types-wrap');
    const actionWrap = document.getElementById('wild-action-controls');
    const hint = document.getElementById('wild-stage-hint');

    if (grass) grass.style.display = 'none';
    if (encounterCard) encounterCard.style.display = 'flex';

    const artwork = getOfficialArtwork(pokemon);
    if (artImg) {
      artImg.src = artwork;
      artImg.alt = pokemon.name;
      artImg.style.display = 'block';
      artImg.style.filter = 'none';
      artImg.classList.remove('wild-dodge-rare', 'wild-dodge-legendary');
      if (rarity === 'legendary') artImg.classList.add('wild-dodge-legendary');
      else if (rarity === 'rare') artImg.classList.add('wild-dodge-rare');
    }

    if (nameEl) nameEl.textContent = pokemon.name;

    if (rarityBadge) {
      rarityBadge.className = `rarity-badge rarity-${rarity}`;
      rarityBadge.textContent = rarity.toUpperCase();
    }

    if (typesWrap) {
      typesWrap.innerHTML = pokemon.types.map(t => `
        <li><b class="type-badge type-${t.type.name} wild-type-badge">${t.type.name}</b></li>
      `).join('');
    }

    if (hint) {
      hint.textContent = `¡Un ${pokemon.name} salvaje (${rarity.toUpperCase()}) ha salido al paso!`;
    }

    if (actionWrap) {
      actionWrap.innerHTML = `
        <button id="btn-timing-throw" class="btn btn-secondary btn-lg capture-throw-btn">
          <b class="capture-pokeball-graphic capture-throw-ball" aria-hidden="true"></b>
          <b class="capture-throw-label">¡LANZAR POKÉ BALL!</b>
          <kbd class="throw-kbd" title="Atajo de teclado">Espacio</kbd>
        </button>
      `;
      document.getElementById('btn-timing-throw').onclick = () => timingMinigame.triggerCatch();
    }

    // Mensaje de Ash según rareza
    if (rarity === 'legendary') {
      showAshGuide({
        image: 'effective',
        title: '¡ENCUENTRO LEGENDARIO!',
        message: `¡Es increíble! ¡Un ${pokemon.name} legendario ha aparecido! La zona verde de captura es diminuta. ¡Mantén la calma y calcula tu tiro!`,
        duration: 6000
      });
    } else if (rarity === 'rare') {
      showAshGuide({
        image: 'pointing',
        title: '¡Pokémon Raro Detectado!',
        message: `¡${pokemon.name} es muy veloz! Te sugiero usar una Ultra Ball para aumentar tus probabilidades.`,
        duration: 4500
      });
    }

    // Iniciar minijuego de puntería
    timingMinigame.start(pokemon, rarity);
  }
}

export const wildArea = new WildAreaManager();
