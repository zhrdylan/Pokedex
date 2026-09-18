/**
 * MAIN.JS - Punto de entrada principal de la aplicación (+1000 Pokémon y 842 movimientos)
 */
import { initNavigation } from './components/navigation.js';
import { setupModal } from './components/modal.js';
import { gameState } from './data/game-state.js';
import { startInteractiveTour, initFloatingAssistant, showAshGuide } from './components/ash-guide.js';
import { initPokedex } from './pokedex/pokedex.js';
import { initTypesView } from './types/types-view.js';
import { initCollection } from './collection/collection.js';
import { initTeamView } from './team/team.js';
import { battleEngine } from './battle/battle-engine.js';
import { wildArea } from './capture/wild-area.js';
import { initMovesView } from './moves/moves-view.js';
import { initProfileView } from './profile/profile.js';
import { sfx } from './audio/sound-effects.js';
import { confirmAction } from './ui/confirm.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar navegación SPA
  initNavigation();

  // 2. Configurar modales reutilizables
  ['pokemon-detail-modal', 'capture-modal', 'battle-result-modal', 'confirm-modal'].forEach(id => {
    setupModal(id);
  });

  // 3. Inicializar módulos de contenido
  initPokedex();
  wildArea.init();
  initMovesView();
  initTypesView();
  initCollection();
  initProfileView();
  initTeamView();
  battleEngine.init();

  // 4. Inicializar Asistente Flotante de Ash
  initFloatingAssistant();

  // 5. Botón de Mute / Unmute de sonido
  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const isMuted = sfx.toggleMute();
      soundBtn.innerHTML = isMuted ? '🔇 <b class="sr-only">Sonido desactivado</b>' : '🔊 <b class="sr-only">Sonido activado</b>';
      soundBtn.title = isMuted ? 'Activar sonido' : 'Silenciar sonido';
    });
  }

  // 6. Botones para disparar el Tour Guiado con Ash (Delegación global)
  document.addEventListener('click', (e) => {
    const tourBtn = e.target.closest('.btn-start-tour, #btn-help-guide');
    if (tourBtn) {
      e.preventDefault();
      sfx.playClick();
      startInteractiveTour();
    }
  });

  // 7. Botón de reinicio de datos (diálogo accesible, sin confirm())
  const resetBtn = document.getElementById('btn-reset-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const ok = await confirmAction({
        title: '¿Reiniciar tu aventura?',
        message: 'Se borrarán tus capturas, equipo, victorias y progreso. Esta acción no se puede deshacer.',
        acceptLabel: 'Sí, reiniciar',
        cancelLabel: 'Cancelar'
      });
      if (ok) {
        gameState.resetGame();
        location.reload();
      }
    });
  }

  // 8. Saludo inicial de Ash
  if (!gameState.state.onboardingCompleted) {
    setTimeout(() => {
      // Solo sugerir de manera suave si el usuario continúa en la pantalla de inicio
      const landingSection = document.getElementById('view-landing');
      if (landingSection && landingSection.classList.contains('active')) {
        showAshGuide({
          image: 'greeting',
          title: '¡Te doy la bienvenida!',
          message: '¡Hola! Puedes pulsar "Iniciar Tour" para que recorramos juntos cada rincón, o usar los botones de arriba para explorar libremente.',
          duration: 6500,
          actions: [
            { label: '✨ Iniciar Tour', primary: true, onClick: () => startInteractiveTour() }
          ]
        });
      }
    }, 2500);
  } else {
    setTimeout(() => {
      showAshGuide({
        image: 'greeting',
        title: '¡Bienvenido de vuelta, Entrenador!',
        message: '¡Me alegra verte de nuevo! ¿Listo para capturar Pokémon en el Safari o combatir en la Arena?',
        duration: 5000,
        actions: [
          { label: 'Ir al Safari', primary: true, onClick: () => window.dispatchEvent(new CustomEvent('tour:navigate', { detail: { viewId: 'capture' } })) },
          { label: 'Mi Perfil', onClick: () => window.dispatchEvent(new CustomEvent('tour:navigate', { detail: { viewId: 'profile' } })) }
        ]
      });
    }, 1500);
  }
});
