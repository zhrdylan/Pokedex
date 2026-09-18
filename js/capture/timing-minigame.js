/**
 * TIMING-MINIGAME.JS - Minijuego de puntería del Safari (adaptador fino de UI).
 * Mecánicas: zona verde a la deriva, alerta por intentos (+velocidad),
 * baya 1× por encuentro, racha de perfectos y vuelo de la ball.
 * La probabilidad y el suspense viven en capture/capture-engine.js.
 * Cero <span>.
 */
import { sfx } from '../audio/sound-effects.js';
import { gameState } from '../data/game-state.js';
import { showAshGuide } from '../components/ash-guide.js';
import { showNotification } from '../components/notifications.js';
import {
  zonesForRarity,
  driftedZones,
  alertSpeed,
  evaluateTiming,
  captureProbability,
  rollCapture,
  runSuspense,
  buildCapturedRecord,
  BALL_TABLE
} from './capture-engine.js';

const MAX_ATTEMPTS = 3;

class TimingMinigame {
  constructor() {
    this.isRunning = false;
    this.pointerPos = 0; // 0 a 100
    this.pointerDirection = 1; // 1: derecha, -1: izquierda
    this.speed = 1.2;
    this.baseSpeed = 1.2;
    this.animFrameId = null;
    this.driftStart = 0;

    this.currentPokemon = null;
    this.rarity = 'common';
    this.selectedBall = 'pokeball'; // pokeball | greatball | ultraball

    this.failedAttempts = 0;
    this.berryUsed = false;
    this.perfectStreak = 0;

    this.zones = zonesForRarity('common');
    this.allowMotion = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Configura e inicia el minijuego de puntería (nuevo encuentro)
   * @param {Object} pokemon
   * @param {'common'|'uncommon'|'rare'|'legendary'} rarity
   */
  start(pokemon, rarity = 'common') {
    this.currentPokemon = pokemon;
    this.rarity = rarity;
    this.selectedBall = 'pokeball';
    this.failedAttempts = 0;
    this.berryUsed = false;
    this.zones = zonesForRarity(rarity);
    this.baseSpeed = this.zones.speed;
    this.speed = this.baseSpeed;

    const panel = document.getElementById('timing-minigame-panel');
    const greenZone = document.getElementById('timing-zone-green');
    const yellowZone = document.getElementById('timing-zone-yellow');
    if (!panel || !greenZone || !yellowZone) return;

    panel.style.display = 'block';
    this.paintZones();
    this.updateAttemptsUI();
    this.updateBerryUI();

    this.pointerPos = 5;
    this.pointerDirection = 1;
    this.isRunning = true;
    this.driftStart = performance.now();

    this.setupBallSelector();
    this.setupBerryButton();
    this.loop();
  }

  /**
   * Reanuda el mismo encuentro tras un escape (intento N, más alerta).
   */
  resume() {
    if (!this.currentPokemon || this.failedAttempts >= MAX_ATTEMPTS) return;
    this.speed = alertSpeed(this.baseSpeed, this.failedAttempts);
    this.pointerPos = 5;
    this.pointerDirection = 1;
    this.isRunning = true;
    this.updateAttemptsUI();
    this.loop();

    // La baya sigue disponible si no se usó en este encuentro
    const berryBtn = document.getElementById('btn-use-berry');
    if (berryBtn && !this.berryUsed) berryBtn.disabled = false;

    const wildArt = document.getElementById('wild-pokemon-art');
    if (wildArt) {
      wildArt.style.display = 'block';
      wildArt.style.filter = 'none';
    }
    const ball = document.getElementById('wild-pokeball-graphic');
    if (ball) {
      ball.hidden = true;
      ball.style.display = 'none';
      ball.classList.remove('shaking', 'ball-flying');
    }
  }

  /**
   * El botón Reintentar reanuda el encuentro y devuelve el botón de lanzar.
   */
  retryEncounter() {
    this.resume();
    const actionWrap = document.getElementById('wild-action-controls');
    if (!actionWrap) return;
    actionWrap.innerHTML = this.throwButtonHTML('¡LANZAR POKÉ BALL!');
    this.wireThrowButton();
  }

  paintZones() {
    const greenZone = document.getElementById('timing-zone-green');
    const yellowZone = document.getElementById('timing-zone-yellow');
    if (greenZone) {
      greenZone.style.left = `${this.zones.greenStart}%`;
      greenZone.style.width = `${this.zones.greenWidth}%`;
    }
    if (yellowZone) {
      yellowZone.style.left = `${this.zones.yellowStart}%`;
      yellowZone.style.width = `${this.zones.yellowWidth}%`;
    }
  }

  updateAttemptsUI() {
    const counter = document.getElementById('wild-attempts-count');
    if (counter) {
      const attempt = Math.min(MAX_ATTEMPTS, this.failedAttempts + 1);
      counter.textContent = `Intento ${attempt}/${MAX_ATTEMPTS}`;
      if (this.failedAttempts > 0) {
        counter.setAttribute('data-alerted', 'true');
      } else {
        counter.removeAttribute('data-alerted');
      }
    }
  }

  updateBerryUI() {
    const berryBtn = document.getElementById('btn-use-berry');
    if (!berryBtn) return;
    if (this.berryUsed) {
      berryBtn.disabled = true;
      berryBtn.innerHTML = `🍇 Baya usada`;
    } else {
      berryBtn.disabled = false;
      berryBtn.innerHTML = `🍇 Usar Baya <small>(1× por encuentro)</small>`;
    }
  }

  updateComboUI() {
    const line = document.getElementById('wild-combo-line');
    const count = document.getElementById('wild-combo-count');
    if (!line) return;
    if (this.perfectStreak >= 2) {
      line.hidden = false;
      if (count) count.textContent = `Racha ×${this.perfectStreak}`;
    } else {
      line.hidden = true;
    }
  }

  setupBerryButton() {
    const berryBtn = document.getElementById('btn-use-berry');
    if (!berryBtn) return;
    berryBtn.onclick = () => {
      if (!this.isRunning || this.berryUsed) return;
      sfx.playClick();
      this.berryUsed = true;
      this.zones = zonesForRarity(this.rarity, { berry: true });
      this.paintZones();
      this.updateBerryUI();
      const feedbackEl = document.getElementById('timing-feedback-text');
      if (feedbackEl) {
        feedbackEl.innerHTML = `<strong>🍇 ¡Baya activada!</strong> La zona verde se ensancha para este lanzamiento.`;
      }
    };
  }

  setupBallSelector() {
    const ballBtns = document.querySelectorAll('.pokeball-choice-btn');
    ballBtns.forEach(btn => {
      const isSelected = btn.dataset.ball === this.selectedBall;
      btn.classList.toggle('selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      btn.onclick = () => {
        sfx.playClick();
        ballBtns.forEach(b => {
          b.classList.remove('selected');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
        this.selectedBall = btn.dataset.ball;
      };
    });
  }

  loop() {
    if (!this.isRunning) return;

    this.pointerPos += this.speed * this.pointerDirection;

    if (this.pointerPos >= 98) {
      this.pointerPos = 98;
      this.pointerDirection = -1;
    } else if (this.pointerPos <= 2) {
      this.pointerPos = 2;
      this.pointerDirection = 1;
    }

    const pointer = document.getElementById('timing-pointer');
    if (pointer) {
      pointer.style.left = `${this.pointerPos}%`;
    }

    // Deriva de la zona verde (quieta con reduced-motion)
    if (this.allowMotion && (this.zones.driftAmp || 0) > 0) {
      const elapsed = performance.now() - this.driftStart;
      const drifted = driftedZones(this.zones, elapsed);
      const greenZone = document.getElementById('timing-zone-green');
      const yellowZone = document.getElementById('timing-zone-yellow');
      if (greenZone) greenZone.style.left = `${drifted.greenStart}%`;
      if (yellowZone) yellowZone.style.left = `${drifted.yellowStart}%`;
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  currentEffectiveZones() {
    if (!this.allowMotion) return this.zones;
    return driftedZones(this.zones, performance.now() - this.driftStart);
  }

  /**
   * Ejecuta el intento de captura al pulsar el botón de lanzamiento
   */
  async triggerCatch() {
    if (!this.isRunning) return;
    this.stop();
    sfx.playThrow();

    const effectiveZones = this.currentEffectiveZones();
    const timing = evaluateTiming(this.pointerPos, effectiveZones);
    const ballLabel = BALL_TABLE[this.selectedBall]?.label || 'Poké Ball';
    const finalProb = captureProbability(this.rarity, timing.multiplier, this.selectedBall);
    const isSuccess = rollCapture(finalProb);

    // Racha de lanzamientos perfectos (solo feedback, no toca la probabilidad)
    if (timing.zone === 'green') {
      this.perfectStreak += 1;
      this.updateComboUI();
      if (this.perfectStreak === 3) {
        showAshGuide({
          image: 'effective',
          title: '¡Puntería Legendaria!',
          message: '¡Tres lanzamientos perfectos seguidos! ¡Tienes la puntería de un Maestro Pokémon!',
          duration: 4500
        });
      }
    } else {
      this.perfectStreak = 0;
      this.updateComboUI();
    }

    // Desactivar controles durante el suspense
    const throwBtn = document.getElementById('btn-timing-throw');
    if (throwBtn) throwBtn.disabled = true;
    const berryBtn = document.getElementById('btn-use-berry');
    if (berryBtn) berryBtn.disabled = true;

    const feedbackEl = document.getElementById('timing-feedback-text');
    if (feedbackEl) {
      feedbackEl.innerHTML = `<strong>${timing.feedback}</strong> — ${ballLabel}: calculando captura...`;
    }

    // Ocultar sprite del Pokémon y mostrar la Poké Ball volando + oscilando
    const stage = document.getElementById('wild-encounter-stage');
    const wildArt = document.getElementById('wild-pokemon-art');
    let pokeballGraphic = document.getElementById('wild-pokeball-graphic');

    if (!pokeballGraphic && stage) {
      pokeballGraphic = document.createElement('b');
      pokeballGraphic.id = 'wild-pokeball-graphic';
      pokeballGraphic.className = 'capture-pokeball-graphic shaking';
      pokeballGraphic.setAttribute('aria-hidden', 'true');
      stage.appendChild(pokeballGraphic);
    }

    if (wildArt) wildArt.style.display = 'none';
    if (pokeballGraphic) {
      pokeballGraphic.hidden = false;
      pokeballGraphic.style.display = 'flex';
      pokeballGraphic.className = 'capture-pokeball-graphic shaking';
      pokeballGraphic.style.boxShadow = '';
      if (this.allowMotion) {
        pokeballGraphic.classList.add('ball-flying');
        setTimeout(() => pokeballGraphic && pokeballGraphic.classList.remove('ball-flying'), 550);
      }
    }

    // 3 oscilaciones de suspense con sonido (motor compartido)
    await runSuspense({
      playWobble: () => sfx.playWobble(),
      onTick: (label) => { if (feedbackEl) feedbackEl.textContent = label; }
    });

    if (pokeballGraphic) pokeballGraphic.classList.remove('shaking');

    if (isSuccess) {
      // ÉXITO
      sfx.playCaptureSuccess();
      if (pokeballGraphic) pokeballGraphic.style.boxShadow = '0 0 25px #10B981';
      if (feedbackEl) {
        feedbackEl.innerHTML = `<b class="capture-status-ok">¡Ya está! ¡${this.currentPokemon.name} ha sido capturado!</b>`;
      }

      gameState.capturePokemon(buildCapturedRecord(this.currentPokemon));

      showNotification(`¡${this.currentPokemon.name} atrapado exitosamente!`, 'success');
      showAshGuide({
        image: 'victory',
        title: '¡Captura Magistral!',
        message: `¡Gran puntería, entrenador! Has atrapado a ${this.currentPokemon.name} (${this.rarity.toUpperCase()}).`,
        duration: 5000
      });
      this.failedAttempts = 0;
      this.renderExploreAgain();

    } else {
      // ESCAPE: el Pokémon se alerta (+velocidad) salvo huida definitiva
      this.failedAttempts += 1;
      sfx.playEscape();
      if (pokeballGraphic) {
        pokeballGraphic.hidden = true;
        pokeballGraphic.style.display = 'none';
      }

      if (this.failedAttempts >= MAX_ATTEMPTS) {
        if (wildArt) wildArt.style.display = 'none';
        if (feedbackEl) {
          feedbackEl.innerHTML = `<b class="capture-status-fail">¡El ${this.currentPokemon.name} salvaje huyó definitivamente!</b>`;
        }
        const encounterCard = document.getElementById('wild-encounter-card');
        if (encounterCard) encounterCard.style.display = 'none';
        showNotification(`${this.currentPokemon.name} huyó definitivamente...`, 'danger');
        showAshGuide({
          image: 'motivating',
          title: '¡Huyó!',
          message: 'Tras tres intentos el Pokémon se puso en alerta máxima y huyó. ¡La baya y la Ultra Ball ayudan con los difíciles!',
          duration: 4500
        });
        this.failedAttempts = 0;
        this.renderExploreAgain();
        return;
      }

      if (wildArt) {
        wildArt.style.display = 'block';
        wildArt.style.filter = 'grayscale(1) opacity(0.5)';
      }

      if (feedbackEl) {
        feedbackEl.innerHTML = `<b class="capture-status-fail">¡Oh no! ¡${this.currentPokemon.name} se ha escapado! (Alerta: el puntero irá más rápido)</b>`;
      }

      showNotification(`${this.currentPokemon.name} escapó... ¡Intento ${this.failedAttempts + 1}/${MAX_ATTEMPTS}!`, 'danger');
      this.renderRetry();
    }
  }

  throwButtonHTML(label) {
    return `
      <button id="btn-timing-throw" class="btn btn-secondary btn-lg capture-throw-btn">
        <b class="capture-pokeball-graphic capture-throw-ball" aria-hidden="true"></b>
        <b class="capture-throw-label">${label}</b>
        <kbd class="throw-kbd" title="Atajo de teclado">Espacio</kbd>
      </button>
    `;
  }

  wireThrowButton() {
    const btn = document.getElementById('btn-timing-throw');
    if (btn) btn.onclick = () => this.triggerCatch();
  }

  renderRetry() {
    const actionWrap = document.getElementById('wild-action-controls');
    if (!actionWrap) return;
    actionWrap.innerHTML = `
      <button id="btn-timing-retry" class="btn btn-secondary btn-lg capture-throw-btn">
        <b class="capture-pokeball-graphic capture-throw-ball" aria-hidden="true"></b>
        <b class="capture-throw-label">¡REINTENTAR! (Intento ${this.failedAttempts + 1}/${MAX_ATTEMPTS})</b>
        <kbd class="throw-kbd" title="Atajo de teclado">Espacio</kbd>
      </button>
      <button id="btn-wild-explore-again" class="btn btn-outline">Explorar hierba de nuevo</button>
    `;
    const retry = document.getElementById('btn-timing-retry');
    if (retry) retry.onclick = () => this.retryEncounter();
    const again = document.getElementById('btn-wild-explore-again');
    if (again) {
      again.onclick = () => {
        window.dispatchEvent(new CustomEvent('wild:explore-again'));
      };
    }
    this.updateAttemptsUI();
  }

  renderExploreAgain() {
    // Botón para volver a explorar la hierba
    const actionWrap = document.getElementById('wild-action-controls');
    if (actionWrap) {
      actionWrap.innerHTML = `
        <button id="btn-wild-explore-again" class="btn btn-primary btn-lg">Explorar Hierba Alta de Nuevo</button>
      `;
      const again = document.getElementById('btn-wild-explore-again');
      if (again) {
        again.onclick = () => {
          window.dispatchEvent(new CustomEvent('wild:explore-again'));
        };
      }
    }
    this.updateAttemptsUI();
  }
}

export const timingMinigame = new TimingMinigame();
