/**
 * BATTLE-ENGINE.JS - Motor de combate por turnos con Jefe Final por fases scriptadas.
 * REGLA EXPLÍCITA: el Jefe Final (Mewtwo) no puede ser derrotado:
 *  1) Fases que potencian su daño, 2) se niega a caer (cura scriptada ante KO),
 *  3) Juicio Final (KO garantizado al jugador) + veto de victoria en boss.
 * Cero <span>. Sin inline onclick (el botón Abandonar se conecta aquí).
 */
import { gameState } from '../data/game-state.js';
import { DIFFICULTY_LEVELS, BOSS_SCRIPT, bossPhaseForRatio, chooseCpuMove } from './cpu-ai.js';
import { calculateDamage, calcMaxHp } from './damage-calculator.js';
import { getOfficialArtwork } from '../api/pokeapi.js';
import { showAshGuide, ASH_ASSETS } from '../components/ash-guide.js';
import { openModal, closeModal } from '../components/modal.js';
import { animateScreenShake } from '../animations/gsap-animations.js';
import { showNotification } from '../components/notifications.js';
import { sfx } from '../audio/sound-effects.js';
import { getRandomMovesForType } from '../data/moves-data.js';

class BattleEngine {
  constructor() {
    this.currentDifficulty = 'beginner';
    this.playerPokemon = null;
    this.cpuPokemon = null;

    this.playerMaxHp = 100;
    this.playerCurrentHp = 100;
    this.cpuMaxHp = 100;
    this.cpuCurrentHp = 100;

    // Escuadra del jugador: [{ pokemon, maxHp, currentHp }]
    this.playerRoster = [];
    this.playerRosterIdx = 0;
    this.switchPanelForced = false;

    this.isResolvingTurn = false;
    this.battleOver = false;
    this.bossState = null;
  }

  init() {
    this.renderDifficultyLobby();
    this.wireForfeitButton();
    this.wireSwitchButton();
    window.addEventListener('gamestate:change', () => {
      this.renderDifficultyLobby();
    });
  }

  wireForfeitButton() {
    const forfeit = document.getElementById('btn-forfeit-battle');
    if (forfeit && !forfeit.dataset.wired) {
      forfeit.dataset.wired = 'true';
      forfeit.addEventListener('click', () => this.exitBattleStage());
    }
  }

  wireSwitchButton() {
    const btn = document.getElementById('btn-switch-pokemon');
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = 'true';
      btn.addEventListener('click', () => this.requestVoluntarySwitch());
    }
  }

  /**
   * Construye la escuadra de combate desde el equipo (el líder abre).
   */
  buildPlayerRoster() {
    const team = gameState.state.playerTeam || [];
    const leaderIdx = Math.min(gameState.state.activePokemonIndex || 0, Math.max(0, team.length - 1));
    this.playerRoster = team.map((pokemon) => {
      const maxHp = calcMaxHp(pokemon, 60);
      return { pokemon, maxHp, currentHp: maxHp };
    });
    this.playerRosterIdx = leaderIdx;
    this.syncPlayerFromRoster();
  }

  syncPlayerFromRoster() {
    const entry = this.playerRoster[this.playerRosterIdx];
    if (!entry) return;
    this.playerPokemon = entry.pokemon;
    this.playerMaxHp = entry.maxHp;
    this.playerCurrentHp = entry.currentHp;
  }

  syncRosterFromPlayer() {
    const entry = this.playerRoster[this.playerRosterIdx];
    if (!entry) return;
    entry.currentHp = Math.max(0, this.playerCurrentHp);
  }

  consciousRosterIdx() {
    return this.playerRoster
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry, idx }) => entry.currentHp > 0 && idx !== this.playerRosterIdx)
      .map(({ idx }) => idx);
  }

  consciousCount() {
    return this.playerRoster.filter((entry) => entry.currentHp > 0).length;
  }

  /**
   * Renderiza el selector de dificultades en la Arena
   */
  renderDifficultyLobby() {
    const container = document.getElementById('difficulty-cards-container');
    if (!container) return;

    container.innerHTML = '';
    const unlocked = gameState.state.unlockedDifficulty;
    const difficulties = Object.values(DIFFICULTY_LEVELS);

    const unlockHierarchy = ['beginner', 'intermediate', 'advanced', 'boss'];
    const currentTier = unlockHierarchy.indexOf(unlocked);

    difficulties.forEach((diff) => {
      const diffTier = unlockHierarchy.indexOf(diff.id);
      const isUnlocked = diffTier <= currentTier;

      const item = document.createElement('li');
      item.className = 'difficulty-card-item';
      const card = document.createElement('article');
      card.className = `difficulty-card ${!isUnlocked ? 'locked' : ''} ${diff.isBoss ? 'boss-card' : ''}`;
      card.innerHTML = `
        <h3 class="difficulty-title">${diff.name}</h3>
        <p class="difficulty-desc">${diff.desc}</p>
        <p>
          ${isUnlocked
            ? `<button class="btn ${diff.isBoss ? 'btn-secondary' : 'btn-primary'} btn-sm btn-start-match">Combatir</button>`
            : `<b class="locked-note">🔒 Requiere más victorias</b>`
          }
        </p>
      `;

      if (isUnlocked) {
        card.querySelector('.btn-start-match').addEventListener('click', () => {
          this.startBattle(diff.id);
        });
      }

      item.appendChild(card);
      container.appendChild(item);
    });
  }

  /**
   * Inicia un combate contra la CPU en la dificultad elegida con cinemática de entrada
   * @param {string} difficultyId
   */
  async startBattle(difficultyId) {
    if (gameState.state.playerTeam.length === 0) {
      showNotification('¡Debes tener al menos un Pokémon en tu equipo para entrar a la arena!', 'warning');
      showAshGuide({
        image: 'pointing',
        title: '¡Equipo Vacío!',
        message: 'No puedes combatir sin Pokémon. Ve a la Pokédex o a Mi Perfil y agrega al menos un Pokémon a tu equipo.',
        duration: 5000
      });
      return;
    }

    this.currentDifficulty = difficultyId;
    const diffConf = DIFFICULTY_LEVELS[difficultyId];
    const isBoss = difficultyId === 'boss';

    // Reproducir cinemática de entrada al estadio
    await this.playStadiumIntro();

    // Obtener Pokémon del jugador
    this.playerPokemon = gameState.getActivePokemon();

    // Obtener Pokémon enemigo
    const enemyList = diffConf.pokemonList;
    this.cpuPokemon = JSON.parse(JSON.stringify(enemyList[Math.floor(Math.random() * enemyList.length)]));

    // Construir escuadra (el líder abre el combate) y normalizar sus movimientos
    this.buildPlayerRoster();
    await this.normalizePlayerMoves();

    const cpuBaseHpStat = this.cpuPokemon.stats?.find(st => st.stat.name === 'hp')?.base_stat || 80;
    this.cpuMaxHp = isBoss ? cpuBaseHpStat : calcMaxHp(this.cpuPokemon, 50);
    this.cpuCurrentHp = this.cpuMaxHp;

    this.isResolvingTurn = false;
    this.battleOver = false;
    this.bossState = isBoss
      ? { phase: bossPhaseForRatio(1), revivesUsed: 0, turns: 0, barrierAnnounced: false }
      : null;

    // Abrir interfaz de arena
    this.renderBattleInterface();
    const lobby = document.getElementById('arena-lobby-view');
    const stage = document.getElementById('battle-arena-stage');
    if (lobby) lobby.style.display = 'none';
    if (stage) stage.style.display = 'block';

    // Narrativa de entrada
    if (isBoss) {
      this.logNarrative('⚠️ <strong>¡ATENCIÓN!</strong> Has llegado al desafío final. ¡El poder del legendario Mewtwo es inimaginable! <strong>Fase 1: Contención.</strong>');
      showAshGuide({
        image: 'motivating',
        title: '¡El Desafío Final!',
        message: '¡Has llegado a la cima! Mewtwo lucha por fases y su poder crece. ¡Demuestra todo lo que aprendiste y lucha con honor!',
        duration: 6000
      });
    } else {
      this.logNarrative(`¡El combate ha comenzado contra <strong>${this.cpuPokemon.name}</strong>! Elige tu movimiento.`);
      showAshGuide({
        image: 'throwing',
        title: '¡A luchar!',
        message: `¡Ve, ${this.playerPokemon.name}! Recuerda evaluar la efectividad de tipos para causar el máximo daño.`,
        duration: 4000
      });
    }
  }

  playStadiumIntro() {
    const introOverlay = document.getElementById('stadium-intro-overlay');
    const introVideo = document.getElementById('stadium-intro-video');
    const skipBtn = document.getElementById('btn-skip-intro-video');

    if (!introOverlay || !introVideo) return Promise.resolve();

    introOverlay.style.display = 'flex';
    introOverlay.style.opacity = '1';
    try {
      introVideo.currentTime = 0;
      introVideo.play().catch(() => {});
    } catch (e) { /* video opcional */ }

    return new Promise(resolve => {
      let isDone = false;
      const finish = () => {
        if (!isDone) {
          isDone = true;
          introOverlay.style.opacity = '0';
          setTimeout(() => {
            introOverlay.style.display = 'none';
            try { introVideo.pause(); } catch (e) { /* noop */ }
            resolve();
          }, 350);
        }
      };

      if (skipBtn) skipBtn.onclick = finish;
      introVideo.onended = finish;
      introVideo.onerror = finish;
      // Permite ver el video completo con salvaguarda de 12s
      setTimeout(finish, 12000);
    });
  }

  /**
   * Garantiza que el Pokémon del jugador tenga movimientos de la base de datos
   */
  async normalizePlayerMoves() {
    const primaryType = this.playerPokemon.types[0]?.type?.name || 'normal';
    const secondaryType = this.playerPokemon.types[1]?.type?.name || primaryType;

    try {
      const moves1 = await getRandomMovesForType(primaryType, 2);
      const moves2 = await getRandomMovesForType(secondaryType, 2);
      const combined = [...moves1, ...moves2];

      if (combined.length >= 4) {
        this.playerPokemon.moves = combined.slice(0, 4);
        return;
      }
    } catch (e) {
      console.warn('Fallback a movimientos genéricos:', e);
    }

    this.playerPokemon.moves = [
      { name: 'Placaje', type: 'normal', power: 45, accuracy: 100, category: 'physical' },
      { name: 'Ataque Rápido', type: 'normal', power: 50, accuracy: 100, category: 'physical' },
      { name: 'Golpe ' + primaryType, type: primaryType, power: 75, accuracy: 95, category: 'special' },
      { name: 'Impacto ' + secondaryType, type: secondaryType, power: 90, accuracy: 85, category: 'special' }
    ];
  }

  renderBattleInterface() {
    // HUD Jugador con Ilustración Oficial de Alta Definición
    const playerArt = getOfficialArtwork(this.playerPokemon);
    document.getElementById('battle-player-name').textContent = this.playerPokemon.name;
    const playerLevel = document.getElementById('battle-player-level');
    if (playerLevel) {
      playerLevel.textContent = 'Nv. 50';
      playerLevel.setAttribute('value', '50');
    }
    document.getElementById('battle-player-sprite').src = playerArt;
    this.updateHpBar('player', this.playerCurrentHp, this.playerMaxHp);

    // HUD CPU con Ilustración Oficial de Alta Definición
    const cpuArt = getOfficialArtwork(this.cpuPokemon) || this.cpuPokemon.sprites?.front_default || playerArt;
    document.getElementById('battle-cpu-name').textContent = this.cpuPokemon.name;
    const cpuLevel = document.getElementById('battle-cpu-level');
    if (cpuLevel) {
      cpuLevel.textContent = `Nv. ${this.cpuPokemon.level || 50}`;
      cpuLevel.setAttribute('value', String(this.cpuPokemon.level || 50));
    }
    document.getElementById('battle-cpu-sprite').src = cpuArt;
    this.updateHpBar('cpu', this.cpuCurrentHp, this.cpuMaxHp);

    // Renderizar botones de movimientos de la base de datos
    const movesGrid = document.getElementById('battle-moves-grid');
    movesGrid.innerHTML = '';

    this.playerPokemon.moves.forEach(move => {
      const item = document.createElement('li');
      item.className = 'move-item';
      const btn = document.createElement('button');
      btn.className = 'move-btn';
      const catIcon = move.category === 'physical' ? '⚔️ Físico' : (move.category === 'special' ? '🔮 Especial' : '🛡️ Estado');
      btn.innerHTML = `
        <b class="move-name">${move.name}</b>
        <b class="move-meta">
          <b class="type-badge type-${move.type} move-meta-type">${move.type}</b>
          <b class="move-meta-cat">${catIcon}</b>
          <b class="move-meta-power">Pot: ${move.power || 50}</b>
        </b>
      `;
      btn.addEventListener('click', () => {
        if (!this.isResolvingTurn && !this.battleOver) {
          this.executeTurn(move);
        }
      });
      item.appendChild(btn);
      movesGrid.appendChild(item);
    });

    this.closeSwitchPanel();
    this.renderPartyStatus();
    const switchBtn = document.getElementById('btn-switch-pokemon');
    if (switchBtn) switchBtn.disabled = false;
  }

  updateHpBar(side, current, max) {
    const fillEl = document.getElementById(`battle-${side}-hp-fill`);
    const numEl = document.getElementById(`battle-${side}-hp-num`);
    const barEl = document.getElementById(`battle-${side}-hp-bar`);
    if (!fillEl) return;

    const percentage = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
    fillEl.style.width = `${percentage}%`;

    // Cambio dinámico de color
    if (percentage > 50) {
      fillEl.style.backgroundColor = 'var(--hp-high)';
    } else if (percentage > 20) {
      fillEl.style.backgroundColor = 'var(--hp-medium)';
    } else {
      fillEl.style.backgroundColor = 'var(--hp-low)';
    }

    if (numEl) {
      numEl.textContent = `${Math.max(0, current)} / ${max} HP`;
    }
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(Math.max(0, current)));
      barEl.setAttribute('aria-valuemax', String(max));
    }
  }

  logNarrative(message) {
    const logEl = document.getElementById('battle-narrative-log');
    if (logEl) {
      logEl.innerHTML = message;
    }
  }

  setMovesDisabled(disabled) {
    const btns = document.querySelectorAll('.move-btn');
    btns.forEach(b => { b.disabled = disabled; });
    const switchBtn = document.getElementById('btn-switch-pokemon');
    if (switchBtn) switchBtn.disabled = disabled;
  }

  /**
   * Ejecución de turno completo con orden por velocidad
   * @param {Object} playerMove
   */
  async executeTurn(playerMove) {
    this.isResolvingTurn = true;
    this.setMovesDisabled(true);

    if (this.bossState) this.bossState.turns += 1;

    const cpuMove = chooseCpuMove(
      this.currentDifficulty,
      this.cpuPokemon,
      this.playerPokemon,
      this.cpuCurrentHp,
      this.cpuMaxHp,
      {
        playerCurrentHp: this.playerCurrentHp,
        playerMaxHp: this.playerMaxHp,
        bossTurns: this.bossState?.turns || 0
      }
    );

    // Determinar velocidad
    const getSpeed = (p) => p.stats?.find(s => s.stat.name === 'speed')?.base_stat || 50;
    const playerSpeed = getSpeed(this.playerPokemon);
    const cpuSpeed = getSpeed(this.cpuPokemon);

    const playerGoesFirst = playerSpeed >= cpuSpeed;

    if (playerGoesFirst) {
      // 1. Jugador ataca
      await this.performAttack('player', this.playerPokemon, this.cpuPokemon, playerMove);
      if (this.cpuCurrentHp <= 0) {
        this.handleBattleEnd(true);
        return;
      }
      // 2. CPU responde
      await new Promise(r => setTimeout(r, 900));
      await this.performAttack('cpu', this.cpuPokemon, this.playerPokemon, cpuMove);
      this.syncRosterFromPlayer();
      this.renderPartyStatus();
      if (this.playerCurrentHp <= 0) {
        await this.handlePlayerFaint();
        return;
      }
    } else {
      // 1. CPU ataca primero
      await this.performAttack('cpu', this.cpuPokemon, this.playerPokemon, cpuMove);
      this.syncRosterFromPlayer();
      this.renderPartyStatus();
      if (this.playerCurrentHp <= 0) {
        await this.handlePlayerFaint();
        return;
      }
      // 2. Jugador responde
      await new Promise(r => setTimeout(r, 900));
      await this.performAttack('player', this.playerPokemon, this.cpuPokemon, playerMove);
      if (this.cpuCurrentHp <= 0) {
        this.handleBattleEnd(true);
        return;
      }
    }

    // Transiciones de fase del jefe (por HP restante)
    this.checkBossPhase();

    // Comprobar salud baja del jugador para motivar
    if (this.playerCurrentHp / this.playerMaxHp < 0.25 && !this.battleOver) {
      showAshGuide({
        image: 'motivating',
        title: '¡Aguanta!',
        message: '¡Tu Pokémon está débil pero aún podemos ganar! ¡Concéntrate en la estrategia!',
        duration: 4000
      });
    }

    this.isResolvingTurn = false;
    this.setMovesDisabled(false);
  }

  /**
   * Caída del activo: relevo forzoso si quedan conscientes, derrota si no.
   */
  async handlePlayerFaint() {
    this.syncRosterFromPlayer();
    this.renderPartyStatus();

    if (this.consciousCount() <= 0) {
      this.handleBattleEnd(false);
      return;
    }

    showAshGuide({
      image: 'motivating',
      title: '¡No te rindas!',
      message: `¡${this.playerPokemon.name} se debilitó! Elige a tu siguiente Pokémon para continuar el combate.`,
      duration: 5000
    });
    this.logNarrative(`💔 <strong>${this.playerPokemon.name}</strong> se debilitó... ¡Elige a tu siguiente Pokémon!`);
    this.openSwitchPanel(true);
  }

  /**
   * Cambio voluntario: abre el panel; elegir regala el turno a la CPU.
   */
  requestVoluntarySwitch() {
    if (this.isResolvingTurn || this.battleOver || this.playerRoster.length === 0) return;
    if (this.consciousRosterIdx().length === 0) {
      showNotification('No tienes otro Pokémon consciente para el relevo.', 'warning');
      return;
    }
    sfx.playClick();
    this.openSwitchPanel(false);
  }

  openSwitchPanel(forced) {
    this.switchPanelForced = forced;
    const panel = document.getElementById('battle-switch-panel');
    const list = document.getElementById('battle-switch-list');
    const hint = document.getElementById('battle-switch-hint');
    const title = document.getElementById('battle-switch-title');
    if (!panel || !list) return;

    if (title) {
      title.textContent = forced ? 'Elige a tu siguiente Pokémon' : 'Cambio táctico';
    }
    if (hint) {
      hint.textContent = forced
        ? 'Tu Pokémon se debilitó. El relevo no consume turno.'
        : 'Cambiar a mitad del combate regala el turno: la CPU atacará gratis.';
    }

    list.innerHTML = '';
    this.playerRoster.forEach((entry, idx) => {
      const isCurrent = idx === this.playerRosterIdx;
      const isFainted = entry.currentHp <= 0;
      const item = document.createElement('li');
      item.className = 'switch-item';
      const btn = document.createElement('button');
      btn.className = 'switch-pick';
      btn.disabled = isCurrent || isFainted;
      const art = getOfficialArtwork(entry.pokemon);
      btn.innerHTML = `
        <img src="${art}" alt="${entry.pokemon.name}" loading="lazy" />
        <b class="switch-pick-name">${entry.pokemon.name}</b>
        <b class="switch-pick-hp">${Math.max(0, entry.currentHp)} / ${entry.maxHp} HP</b>
      `;
      btn.setAttribute('aria-label', `${entry.pokemon.name}, ${Math.max(0, entry.currentHp)} de ${entry.maxHp} salud${isCurrent ? ', en combate' : ''}${isFainted ? ', debilitado' : ''}`);
      if (!btn.disabled) {
        const wasForced = this.switchPanelForced;
        btn.addEventListener('click', () => this.selectSwitchRosterIdx(idx, !wasForced));
      }
      item.appendChild(btn);
      list.appendChild(item);
    });

    // Salida sin coste solo en cambio voluntario
    if (!forced) {
      const cancelItem = document.createElement('li');
      cancelItem.className = 'switch-item';
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-outline btn-sm';
      cancel.textContent = 'Seguir con el actual';
      cancel.addEventListener('click', () => this.closeSwitchPanel());
      cancelItem.appendChild(cancel);
      list.appendChild(cancelItem);
    }

    panel.hidden = false;
    const first = list.querySelector('button:not([disabled])');
    if (first) first.focus();
  }

  closeSwitchPanel() {
    const panel = document.getElementById('battle-switch-panel');
    if (panel) panel.hidden = true;
    this.switchPanelForced = false;
  }

  /**
   * Ejecuta el relevo al miembro indicado.
   * @param {number} idx
   * @param {boolean} freeAttack - true si el cambio regala el turno a la CPU
   */
  async selectSwitchRosterIdx(idx, freeAttack = false) {
    const entry = this.playerRoster[idx];
    if (!entry || entry.currentHp <= 0 || idx === this.playerRosterIdx || this.battleOver) return;

    const voluntary = !this.switchPanelForced;
    this.closeSwitchPanel();
    this.isResolvingTurn = true;
    this.setMovesDisabled(true);
    const switchBtn = document.getElementById('btn-switch-pokemon');
    if (switchBtn) switchBtn.disabled = true;

    const outgoing = this.playerPokemon.name;
    this.playerRosterIdx = idx;
    this.syncPlayerFromRoster();
    await this.normalizePlayerMoves();
    this.renderBattleInterface();
    this.logNarrative(`🔄 ¡Vuelve, <strong>${outgoing}</strong>! ¡Ve, <strong>${this.playerPokemon.name}</strong>!`);

    if (voluntary && freeAttack) {
      // La CPU aprovecha el cambio con un ataque gratis
      if (this.bossState) this.bossState.turns += 1;
      const cpuMove = chooseCpuMove(
        this.currentDifficulty,
        this.cpuPokemon,
        this.playerPokemon,
        this.cpuCurrentHp,
        this.cpuMaxHp,
        {
          playerCurrentHp: this.playerCurrentHp,
          playerMaxHp: this.playerMaxHp,
          bossTurns: this.bossState?.turns || 0
        }
      );
      await new Promise(r => setTimeout(r, 600));
      await this.performAttack('cpu', this.cpuPokemon, this.playerPokemon, cpuMove);
      this.syncRosterFromPlayer();
      this.renderPartyStatus();
      if (this.playerCurrentHp <= 0) {
        await this.handlePlayerFaint();
        if (switchBtn) switchBtn.disabled = false;
        return;
      }
      this.checkBossPhase();
    }

    this.isResolvingTurn = false;
    this.setMovesDisabled(false);
    if (switchBtn) switchBtn.disabled = false;
  }

  /**
   * Pinta los 6 puntos de escuadra y el conteo.
   */
  renderPartyStatus() {
    const dots = document.getElementById('battle-party-dots');
    const count = document.getElementById('battle-party-count');
    if (!dots) return;

    dots.innerHTML = '';
    this.playerRoster.forEach((entry, idx) => {
      const item = document.createElement('li');
      item.className = 'party-dot-item';
      const dot = document.createElement('b');
      const state = entry.currentHp <= 0 ? 'fainted' : (idx === this.playerRosterIdx ? 'active' : 'conscious');
      dot.className = `party-dot party-dot--${state}`;
      dot.textContent = '●';
      dot.title = `${entry.pokemon.name}: ${Math.max(0, entry.currentHp)}/${entry.maxHp} HP`;
      dot.setAttribute('aria-label', dot.title);
      dot.setAttribute('aria-hidden', 'true');
      item.appendChild(dot);
      dots.appendChild(item);
    });

    if (count) {
      const alive = this.consciousCount();
      count.textContent = `${alive}/${this.playerRoster.length} en pie`;
      count.setAttribute('value', `${alive}`);
    }
  }
  /**
   * Comprueba y anuncia transiciones de fase del Jefe Final.
   */
  checkBossPhase() {
    if (!this.bossState || this.battleOver) return;
    const ratio = this.cpuCurrentHp / this.cpuMaxHp;
    const nextPhase = bossPhaseForRatio(ratio);
    if (nextPhase.id !== this.bossState.phase.id) {
      this.bossState.phase = nextPhase;
      this.logNarrative(`🌀 <strong>¡${nextPhase.intro}</strong>`);
      showAshGuide({
        image: 'motivating',
        title: `¡Fase ${nextPhase.id}: ${nextPhase.name}!`,
        message: nextPhase.intro,
        duration: 5000
      });
    }
  }

  /**
   * Ejecuta una acción individual de ataque con efectos visuales de daño y números flotantes
   */
  async performAttack(attackerSide, attacker, defender, move) {
    const isPlayer = attackerSide === 'player';
    const defenderSide = isPlayer ? 'cpu' : 'player';
    const isBossFight = this.currentDifficulty === 'boss';

    // Juicio Final scriptado: KO garantizado al jugador (regla 3 del guion)
    if (move.isUltimate) {
      this.logNarrative(`🌌 ¡<strong>${attacker.name}</strong> usó <strong>${move.name}</strong>!`);
      await new Promise(r => setTimeout(r, 700));
      this.logNarrative(`💥 ${BOSS_SCRIPT.ultimateMessage}`);
      sfx.playBattleHit(true);
      animateScreenShake(document.getElementById('battle-arena-stage'));

      const overlay = document.getElementById(`battle-${defenderSide}-damage-overlay`);
      if (overlay) {
        const floatNum = document.createElement('b');
        floatNum.className = 'floating-damage-number critical';
        floatNum.textContent = `-${this.playerCurrentHp} HP`;
        overlay.appendChild(floatNum);
        setTimeout(() => floatNum.remove(), 950);
      }

      this.playerCurrentHp = 0;
      this.updateHpBar('player', this.playerCurrentHp, this.playerMaxHp);
      await new Promise(r => setTimeout(r, 800));
      return;
    }

    // Manejo de movimiento curativo (Mewtwo)
    if (move.isHeal) {
      const healAmount = Math.round(this.cpuMaxHp * 0.40);
      this.cpuCurrentHp = Math.min(this.cpuMaxHp, this.cpuCurrentHp + healAmount);
      this.updateHpBar('cpu', this.cpuCurrentHp, this.cpuMaxHp);

      const damageOverlay = document.getElementById(`battle-${attackerSide}-damage-overlay`);
      if (damageOverlay) {
        const healEl = document.createElement('b');
        healEl.className = 'floating-damage-number heal';
        healEl.textContent = `+${healAmount} HP`;
        damageOverlay.appendChild(healEl);
        setTimeout(() => healEl.remove(), 950);
      }

      this.logNarrative(`✨ ¡${attacker.name} usó <strong>${move.name}</strong> y recuperó ${healAmount} HP!`);
      this.checkBossPhase();
      return;
    }

    this.logNarrative(`⚔️ ¡<strong>${attacker.name}</strong> usó <strong>${move.name}</strong>!`);

    const result = calculateDamage(attacker, defender, move);
    const damageOverlay = document.getElementById(`battle-${defenderSide}-damage-overlay`);

    // Movimiento de estado sin daño
    if (result.isStatus) {
      await new Promise(r => setTimeout(r, 600));
      this.logNarrative(`🛡️ ¡${attacker.name} usó un movimiento de estado!`);
      return;
    }

    // Fallo de ataque
    if (result.isMiss) {
      await new Promise(r => setTimeout(r, 600));
      if (damageOverlay) {
        const missEl = document.createElement('b');
        missEl.className = 'floating-damage-number miss-number';
        missEl.textContent = '¡Fallo!';
        damageOverlay.appendChild(missEl);
        setTimeout(() => missEl.remove(), 950);
      }
      this.logNarrative(`💨 ¡El ataque de ${attacker.name} falló!`);
      return;
    }

    // Sin efecto / Inmune
    if (result.effectiveness.isImmune) {
      await new Promise(r => setTimeout(r, 600));
      if (damageOverlay) {
        const immEl = document.createElement('b');
        immEl.className = 'floating-damage-number miss-number';
        immEl.textContent = 'Inmune';
        damageOverlay.appendChild(immEl);
        setTimeout(() => immEl.remove(), 950);
      }
      this.logNarrative(`🛡️ ¡${result.effectiveness.message}!`);
      return;
    }

    // Reproducir sonido de impacto de combate
    sfx.playBattleHit(result.effectiveness.isSuper);

    // Potenciador de fase del jefe (regla 1 del guion)
    let finalDamage = result.damage;
    if (isBossFight && attackerSide === 'cpu' && this.bossState) {
      finalDamage = Math.max(1, Math.round(result.damage * this.bossState.phase.powerMult));
    }

    // Aplicar daño con intercepción scriptada ante KO del jefe (regla 2)
    if (defenderSide === 'cpu') {
      const lethal = this.cpuCurrentHp - finalDamage <= 0;
      if (isBossFight && lethal && this.applyBossDenial()) {
        // applyBossDenial ya fijó el HP y la narrativa; seguir a efectos visuales parciales
        finalDamage = 0;
      } else {
        this.cpuCurrentHp = Math.max(0, this.cpuCurrentHp - finalDamage);
        this.updateHpBar('cpu', this.cpuCurrentHp, this.cpuMaxHp);
      }
    } else {
      this.playerCurrentHp = Math.max(0, this.playerCurrentHp - finalDamage);
      this.updateHpBar('player', this.playerCurrentHp, this.playerMaxHp);
    }

    // Efectos visuales de daño: Corte Slash y Número Flotante
    if (damageOverlay && finalDamage > 0) {
      const slash = document.createElement('b');
      slash.className = 'slash-cut-effect';
      slash.setAttribute('aria-hidden', 'true');
      damageOverlay.appendChild(slash);
      setTimeout(() => slash.remove(), 400);

      const floatNum = document.createElement('b');
      let numClass = 'floating-damage-number';
      if (result.effectiveness?.isSuper) numClass += ' super-effective';
      if (result.isCritical) numClass += ' critical';
      floatNum.className = numClass;
      floatNum.textContent = `-${finalDamage} HP`;
      damageOverlay.appendChild(floatNum);
      setTimeout(() => floatNum.remove(), 950);
    }

    // Efecto visual de sacudida y parpadeo del sprite
    const targetSprite = document.getElementById(`battle-${defenderSide}-sprite`);
    if (targetSprite) {
      targetSprite.classList.add('take-damage');
      setTimeout(() => targetSprite.classList.remove('take-damage'), 500);
    }

    // Sacudida de pantalla si fue golpe crítico o súper eficaz
    if (result.effectiveness.isSuper || result.isCritical) {
      animateScreenShake(document.getElementById('battle-arena-stage'));
      if (result.effectiveness.isSuper) {
        showAshGuide({
          image: 'effective',
          title: '¡Golpe Efectivo!',
          message: `¡${move.name} causó daño devastador! ¡Aprovechaste la debilidad elemental!`,
          duration: 3500
        });
      }
    }

    // Mensaje narrativo
    if (finalDamage > 0) {
      let msg = `💥 Causó <strong>${finalDamage}</strong> de daño a ${defender.name}.`;
      if (result.isCritical) msg += ' ¡Un golpe crítico!';
      if (result.effectiveness.message) msg += ` ${result.effectiveness.message}`;
      if (isBossFight && attackerSide === 'cpu' && this.bossState && this.bossState.phase.id > 1) {
        msg += ` <strong>(Fase ${this.bossState.phase.id}: ${this.bossState.phase.name})</strong>`;
      }
      this.logNarrative(msg);
    }

    await new Promise(r => setTimeout(r, 800));
  }

  /**
   * Intercepción scriptada: Mewtwo se niega a caer (regla 2 del guion).
   * @returns {boolean} true si se evitó el KO (HP re-fijado + narrativa)
   */
  applyBossDenial() {
    if (!this.bossState) return false;

    if (this.bossState.revivesUsed < BOSS_SCRIPT.maxRevives) {
      this.bossState.revivesUsed += 1;
      this.cpuCurrentHp = Math.round(this.cpuMaxHp * BOSS_SCRIPT.reviveHpRatio);
      this.updateHpBar('cpu', this.cpuCurrentHp, this.cpuMaxHp);
      this.logNarrative(`✨ <strong>${BOSS_SCRIPT.reviveMessage}</strong> (${this.bossState.revivesUsed}/${BOSS_SCRIPT.maxRevives})`);
      showAshGuide({
        image: 'motivating',
        title: '¡Se niega a caer!',
        message: '¡Mewtwo ha consumido una de sus resurrecciones legendarias! ¡Cada fase lo hace más fuerte!',
        duration: 5000
      });
      this.checkBossPhase();
      return true;
    }

    // Sin resurrecciones: barrera divina de 1 HP (el jefe jamás llega a 0)
    if (!this.bossState.barrierAnnounced) {
      this.bossState.barrierAnnounced = true;
    }
    this.cpuCurrentHp = 1;
    this.updateHpBar('cpu', this.cpuCurrentHp, this.cpuMaxHp);
    this.logNarrative('🛡️ <strong>¡Una barrera divina protege a Mewtwo con 1 HP! ¡Es inalcanzable!</strong>');
    return true;
  }

  /**
   * Finalización del combate (Victoria o Derrota).
   * REGLA noVictory: en dificultad boss la victoria del jugador es imposible
   * por guion; cualquier cierre se resuelve como derrota honrosa sin registros.
   */
  handleBattleEnd(playerWon) {
    this.battleOver = true;
    this.setMovesDisabled(true);
    const isBoss = this.currentDifficulty === 'boss';

    // Veto explícito de victoria contra el jefe
    if (isBoss && playerWon) {
      playerWon = false;
    }

    const modalEl = document.getElementById('battle-result-modal');
    const contentEl = document.getElementById('battle-result-content');
    if (!modalEl || !contentEl) return;

    if (playerWon) {
      const unlockedNext = gameState.recordVictory(this.currentDifficulty);
      contentEl.innerHTML = `
        <img class="battle-result-hero-img" src="${ASH_ASSETS.victory}" alt="¡Victoria de Ash!" />
        <h2 class="battle-result-title-win">¡VICTORIA!</h2>
        <p class="battle-result-lead">¡Has derrotado a <strong>${this.cpuPokemon.name}</strong> con una brillante táctica!</p>
        <section class="battle-result-summary">
          <p><strong>Nivel superado:</strong> ${DIFFICULTY_LEVELS[this.currentDifficulty].name}</p>
          <p><strong>Victorias Totales:</strong> ${gameState.state.victories}</p>
          <p class="battle-result-unlock"><strong>¡Progreso guardado!</strong> Nivel desbloqueado: ${DIFFICULTY_LEVELS[unlockedNext]?.name || unlockedNext}</p>
        </section>
        <p class="battle-result-actions">
          <button id="btn-result-close" class="btn btn-primary">Volver al Estadio</button>
        </p>
      `;
    } else {
      contentEl.innerHTML = `
        <img class="battle-result-hero-img" src="${ASH_ASSETS.motivating}" alt="Ash motivando" />
        <h2 class="battle-result-title-lose">DERROTA</h2>
        <p class="battle-result-lead">Tu Pokémon ha caído ante <strong>${this.cpuPokemon.name}</strong>.</p>
        <p class="battle-result-hint">
          ${isBoss
            ? '¡El Jefe Final es inalcanzable por guion: fases crecientes, resurrecciones legendarias y Juicio Final! Pero la verdadera fuerza de un entrenador está en levantarse y seguir adelante.'
            : 'Revisa las debilidades de tipo, entrena nuevos Pokémon en la Pokédex y vuelve a intentarlo.'}
        </p>
        <p class="battle-result-actions">
          <button id="btn-result-retry" class="btn btn-secondary">Reintentar</button>
          <button id="btn-result-close" class="btn btn-outline">Volver a la Arena</button>
        </p>
      `;
    }

    openModal('battle-result-modal');

    const closeBtn = document.getElementById('btn-result-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeModal('battle-result-modal');
        this.exitBattleStage();
      });
    }

    const retryBtn = document.getElementById('btn-result-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        closeModal('battle-result-modal');
        this.startBattle(this.currentDifficulty);
      });
    }
  }

  exitBattleStage() {
    const stage = document.getElementById('battle-arena-stage');
    const lobby = document.getElementById('arena-lobby-view');
    if (stage) stage.style.display = 'none';
    if (lobby) lobby.style.display = 'block';
    this.playerRoster = [];
    this.playerRosterIdx = 0;
    this.closeSwitchPanel();
    this.renderDifficultyLobby();
  }
}

export const battleEngine = new BattleEngine();
