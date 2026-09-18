/**
 * CAPTURE.JS - Modal de captura desde la Pokédex (adaptador fino de UI).
 * La probabilidad y el suspense viven en capture/capture-engine.js.
 * Cero <span>. Sin alert().
 */
import { gameState } from '../data/game-state.js';
import { getOfficialArtwork } from '../api/pokeapi.js';
import { openModal, closeModal } from '../components/modal.js';
import { showAshGuide } from '../components/ash-guide.js';
import { showNotification } from '../components/notifications.js';
import { sfx } from '../audio/sound-effects.js';
import {
  zonesForRarity,
  rarityForPokemon,
  evaluateTiming,
  captureProbability,
  rollCapture,
  runSuspense,
  buildCapturedRecord
} from '../capture/capture-engine.js';

let isCapturingInProgress = false;
let pointerLoopId = null;
let pointerPos = 0;
let pointerDir = 1;
let activeSpeed = 1.3;

/**
 * Inicia la secuencia de captura interactiva para un Pokémon desde la Pokédex
 * @param {Object} pokemon - Objeto con datos del Pokémon
 */
export function startCaptureSequence(pokemon) {
  if (isCapturingInProgress) return;

  if (gameState.isCaptured(pokemon.id)) {
    showNotification(`¡${pokemon.name} ya está en tu colección!`, 'warning');
    showAshGuide({
      image: 'pointing',
      title: '¡Ya lo tienes!',
      message: `${pokemon.name} ya forma parte de tu colección. ¡Puedes asignarlo a tu equipo en la sección Mi Colección!`,
      duration: 4500
    });
    return;
  }

  isCapturingInProgress = true;
  const modalEl = document.getElementById('capture-modal');
  const bodyEl = document.getElementById('capture-modal-content');
  if (!modalEl || !bodyEl) {
    isCapturingInProgress = false;
    return;
  }

  const artwork = getOfficialArtwork(pokemon);
  const rarity = rarityForPokemon(pokemon);
  const zones = zonesForRarity(rarity);
  activeSpeed = zones.speed;

  // Interfaz del modal
  bodyEl.innerHTML = `
    <p class="capture-modal-field">
      <b class="rarity-badge rarity-${rarity}">RAREZA: ${zones.label}</b>
      <data class="capture-modal-id" value="${pokemon.id}">#${String(pokemon.id).padStart(3, '0')}</data>
    </p>

    <h3 class="capture-modal-title">¡${pokemon.name} Salvaje!</h3>
    <p class="capture-modal-hint">Detén el medidor en la zona verde para maximizar tu ratio de captura.</p>

    <figure class="capture-stage">
      <img id="modal-capture-target-img" class="capture-target-pokemon" src="${artwork}" alt="${pokemon.name}" />
      <b id="modal-capture-ball" class="capture-pokeball-graphic" hidden></b>
      <figcaption id="modal-capture-status" class="capture-status-text">¡Apunta y lanza!</figcaption>
    </figure>

    <!-- Barra de Puntería -->
    <section id="modal-timing-wrap" class="capture-timing-wrap" aria-label="Medidor de puntería">
      <p class="timing-track-outer capture-track" aria-hidden="true">
        <b class="timing-zone-yellow" style="left:20%; width:60%;"></b>
        <b class="timing-zone-green" style="left:${zones.greenStart}%; width:${zones.greenWidth}%;"></b>
        <b id="modal-timing-pointer" class="timing-pointer"></b>
      </p>
    </section>

    <p id="modal-capture-actions" class="capture-modal-actions">
      <button id="btn-modal-throw" class="btn btn-primary btn-lg capture-throw-full capture-throw-btn">
        <b class="capture-pokeball-graphic capture-throw-ball" aria-hidden="true"></b>
        <b class="capture-throw-label">¡LANZAR POKÉ BALL!</b>
      </button>
    </p>
  `;

  openModal('capture-modal');

  // Iniciar oscilación del puntero
  pointerPos = 5;
  pointerDir = 1;
  const pointerEl = document.getElementById('modal-timing-pointer');

  function loopPointer() {
    pointerPos += activeSpeed * pointerDir;
    if (pointerPos >= 98) { pointerPos = 98; pointerDir = -1; }
    else if (pointerPos <= 2) { pointerPos = 2; pointerDir = 1; }

    if (pointerEl) pointerEl.style.left = `${pointerPos}%`;
    pointerLoopId = requestAnimationFrame(loopPointer);
  }

  loopPointer();

  // Disparo al pulsar botón
  const throwBtn = document.getElementById('btn-modal-throw');
  if (throwBtn) {
    throwBtn.onclick = () => {
      executeModalThrow(pokemon, zones);
    };
  }
}

async function executeModalThrow(pokemon, zones) {
  if (pointerLoopId) {
    cancelAnimationFrame(pointerLoopId);
    pointerLoopId = null;
  }

  sfx.playThrow();

  const timing = evaluateTiming(pointerPos, zones);
  const finalChance = captureProbability(zones.rarity, timing.multiplier, 'pokeball');
  const isSuccess = rollCapture(finalChance);

  const targetImg = document.getElementById('modal-capture-target-img');
  const ball = document.getElementById('modal-capture-ball');
  const status = document.getElementById('modal-capture-status');
  const timingWrap = document.getElementById('modal-timing-wrap');
  const actionWrap = document.getElementById('modal-capture-actions');

  if (timingWrap) timingWrap.style.display = 'none';
  if (actionWrap) actionWrap.style.display = 'none';
  if (targetImg) targetImg.style.display = 'none';

  if (ball) {
    ball.hidden = false;
    ball.classList.add('shaking');
  }

  if (status) status.innerHTML = `<strong>${timing.feedback}</strong><br>¡Poké Ball lanzada!`;

  // 3 oscilaciones con sonido (motor compartido)
  await runSuspense({
    playWobble: () => sfx.playWobble(),
    onTick: (label) => { if (status) status.textContent = label; }
  });

  if (ball) ball.classList.remove('shaking');
  isCapturingInProgress = false;

  if (isSuccess) {
    sfx.playCaptureSuccess();
    if (ball) ball.style.boxShadow = '0 0 25px #10B981';
    if (status) status.innerHTML = `<b class="capture-status-ok">¡Ya está! ¡${pokemon.name} atrapado!</b>`;

    gameState.capturePokemon(buildCapturedRecord(pokemon));

    showNotification(`¡${pokemon.name} se unió a tu colección!`, 'success');
    showAshGuide({
      image: 'victory',
      title: '¡Gran Captura!',
      message: `¡Excelente tiro en la Pokédex! ${pokemon.name} ya está disponible en tu colección.`,
      duration: 5000
    });

  } else {
    sfx.playEscape();
    if (ball) ball.hidden = true;
    if (targetImg) {
      targetImg.style.display = 'block';
      targetImg.style.filter = 'grayscale(1) opacity(0.5)';
    }
    if (status) status.innerHTML = `<b class="capture-status-fail">¡Oh no! ¡${pokemon.name} escapó!</b>`;

    showNotification(`${pokemon.name} ha escapado...`, 'danger');
  }

  // Botón de cierre
  if (actionWrap) {
    actionWrap.style.display = 'block';
    actionWrap.innerHTML = `
      <button id="btn-modal-capture-finish" class="btn btn-outline capture-throw-full">Continuar</button>
    `;
    const finish = document.getElementById('btn-modal-capture-finish');
    if (finish) {
      finish.onclick = () => {
        closeModal('capture-modal');
      };
    }
  }
}
