/**
 * ASH-GUIDE.JS - Sistema de Guía Visual, Tour Interactivo (con +1000 Pokémon y 842 Movimientos) y Asistente Flotante
 */
import { gameState } from '../data/game-state.js';
import { sfx } from '../audio/sound-effects.js';

export const ASH_ASSETS = {
  pointing: 'assets/img/Ash_Ketchum/Ahs_Ketchum-Señalando.jpeg',
  victory: 'assets/img/Ash_Ketchum/Ahs_Ketchum-Victoria.jpeg',
  effective: 'assets/img/Ash_Ketchum/Ash_Ketchum-Golpe-Efectivo.jpeg',
  motivating: 'assets/img/Ash_Ketchum/Ash_Ketchum-Motivando.jpeg',
  greeting: 'assets/img/Ash_Ketchum/Ash_Ketchum-Saludando.png',
  mobile: 'assets/img/Ash_Ketchum/Ash_Ketchum-Teniendo-Celular.jpeg',
  trainer: 'assets/img/Ash_Ketchum/Ash_Ketchum.jpeg',
  throwing: 'assets/img/Ash_Ketchum/Ash_Ketchum_Lanzando-Pokemon.jpeg'
};

let guideWidgetEl = null;
let hideTimer = null;
let floatingAssistantEl = null;

function getOrCreateGuideWidget() {
  if (guideWidgetEl) return guideWidgetEl;

  guideWidgetEl = document.createElement('div');
  guideWidgetEl.id = 'ash-guide-widget';
  guideWidgetEl.className = 'ash-guide-widget';
  guideWidgetEl.setAttribute('role', 'region');
  guideWidgetEl.setAttribute('aria-label', 'Consejo de Ash Ketchum');

  guideWidgetEl.innerHTML = `
    <button class="ash-guide-close" aria-label="Cerrar consejo">&times;</button>
    <figure class="ash-guide-avatar-wrap">
      <img id="ash-guide-img" class="ash-guide-avatar-img" src="${ASH_ASSETS.greeting}" alt="Ash Ketchum" />
    </figure>
    <section class="ash-guide-content">
      <b id="ash-guide-badge" class="ash-guide-badge">CONSEJO DE ASH</b>
      <h4 id="ash-guide-title" class="ash-guide-title">¡Hola, Entrenador!</h4>
      <p id="ash-guide-msg" class="ash-guide-message">Bienvenido al centro de entrenamiento Pokémon.</p>
      <p id="ash-guide-actions" class="ash-guide-actions"></p>
    </section>
  `;

  document.body.appendChild(guideWidgetEl);

  const closeBtn = guideWidgetEl.querySelector('.ash-guide-close');
  closeBtn.addEventListener('click', () => hideAshGuide());

  return guideWidgetEl;
}

export function showAshGuide({
  image = 'greeting',
  title = 'Consejo de Ash',
  message = '',
  badge = 'ASH TE DICE',
  duration = 5000,
  actions = []
}) {
  const widget = getOrCreateGuideWidget();
  const imgEl = widget.querySelector('#ash-guide-img');
  const badgeEl = widget.querySelector('#ash-guide-badge');
  const titleEl = widget.querySelector('#ash-guide-title');
  const msgEl = widget.querySelector('#ash-guide-msg');
  const actionsEl = widget.querySelector('#ash-guide-actions');

  const resolvedImg = ASH_ASSETS[image] || image;
  imgEl.src = resolvedImg;
  imgEl.alt = title;

  badgeEl.textContent = badge;
  titleEl.textContent = title;
  msgEl.textContent = message;

  actionsEl.innerHTML = '';
  if (actions && actions.length > 0) {
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = `btn btn-sm ${action.primary ? 'btn-secondary' : 'btn-outline'}`;
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        sfx.playClick();
        // Ocultar PRIMERO y ejecutar despues: asi ningun onClick
        // (p. ej. arrancar el tour) puede quedar tapado por el hide.
        if (action.closeOnClick !== false && !action.preventClose) {
          hideAshGuide();
        }
        if (action.onClick) action.onClick();
      });
      actionsEl.appendChild(btn);
    });
  }

  if (hideTimer) clearTimeout(hideTimer);
  widget.classList.add('visible');

  if (duration > 0) {
    hideTimer = setTimeout(() => {
      hideAshGuide();
    }, duration);
  }
}

function hideAshGuide() {
  if (guideWidgetEl) {
    guideWidgetEl.classList.remove('visible');
  }
}

const TOUR_STEPS = [
  {
    viewId: 'pokedex',
    highlightSelector: '.pokedex-controls',
    image: ASH_ASSETS.mobile,
    title: '1. Pokédex Nacional (+1000 Pokémon)',
    badge: 'PASO 1 / 6 • POKÉDEX',
    message: '¡Explora las 9 generaciones desde Kanto (#001) hasta Paldea (#1025)! Filtra por generación, busca por nombre o número y pulsa sobre cualquier Pokémon para ver sus estadísticas.'
  },
  {
    viewId: 'capture',
    highlightSelector: '.wild-area-container',
    image: ASH_ASSETS.throwing,
    title: '2. Zona Silvestre y Captura Safari',
    badge: 'PASO 2 / 6 • SAFARI',
    message: '¡Explora la hierba alta en 4 biomas! Usa el minijuego de puntería con la barra de espacio o el botón. ¡Entre más Pokémon captures en tu Perfil, mayor probabilidad tendrás de atraer legendarios!'
  },
  {
    viewId: 'profile',
    highlightSelector: '.trainer-card-wrapper',
    image: ASH_ASSETS.trainer,
    title: '3. Mi Perfil y Carnet de Entrenador',
    badge: 'PASO 3 / 6 • PERFIL',
    message: 'Aquí ves tu carnet oficial, tu rango, tus medallas de gimnasio ganadas en la Arena y el multiplicador activo para encontrar Pokémon legendarios en el Safari.'
  },
  {
    viewId: 'types',
    highlightSelector: '#types-selector-grid',
    image: ASH_ASSETS.pointing,
    title: '4. Tabla de Afinidades y Tipos',
    badge: 'PASO 4 / 6 • TIPOS',
    message: 'Aprende las fortalezas, debilidades e inmunidades elementales. Saber cuándo un ataque es súper eficaz (x2) será la clave para ganar en el Estadio.'
  },
  {
    viewId: 'team',
    highlightSelector: '#team-slots-grid',
    image: ASH_ASSETS.motivating,
    title: '5. Mi Formación de Equipo',
    badge: 'PASO 5 / 6 • EQUIPO',
    message: 'Arma tu escuadrón élite de hasta 6 Pokémon. Selecciona a tu líder activo antes de desafiar los combates del Estadio.'
  },
  {
    viewId: 'arena',
    highlightSelector: '#difficulty-cards-container',
    image: ASH_ASSETS.victory,
    title: '6. El Gran Estadio y el Jefe Final',
    badge: 'PASO 6 / 6 • ESTADIO',
    message: '¡Disfruta la entrada cinemática al estadio y combate con movimientos reales y efectos de daño visual! Supera a los rivales hasta llegar al legendario Mewtwo.'
  }
];

let currentTourIndex = 0;
let currentHighlightedEl = null;
let isTourActive = false;

export function startInteractiveTour() {
  if (isTourActive) return;
  currentTourIndex = 0;
  isTourActive = true;
  setTourLock(true);
  runTourStep();
}

/**
 * Bloquea toda interacción fuera del widget de Ash durante el tour.
 * Usa `inert` (bloquea ratón, táctil, teclado y lectores en fondo).
 */
function setTourLock(locked) {
  const regions = [
    document.querySelector('.app-header'),
    document.querySelector('.app-main'),
    document.querySelector('.app-footer'),
    document.getElementById('toast-container'),
    floatingAssistantEl
  ];
  regions.forEach((el) => {
    if (!el) return;
    if (locked) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  });
}

// Salir del tour con Escape (solo fuera de modales)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isTourActive) {
    const anyModalOpen = document.querySelector('.modal-overlay.active');
    if (!anyModalOpen) {
      e.stopPropagation();
      finishTour();
    }
  }
});

function clearTourHighlight() {
  if (currentHighlightedEl) {
    currentHighlightedEl.classList.remove('tour-highlight-focus');
    currentHighlightedEl = null;
  }
}

function runTourStep() {
  clearTourHighlight();
  const step = TOUR_STEPS[currentTourIndex];

  // Navegar a la vista correspondiente
  window.dispatchEvent(new CustomEvent('tour:navigate', { detail: { viewId: step.viewId } }));

  const isFirst = currentTourIndex === 0;
  const isLast = currentTourIndex === TOUR_STEPS.length - 1;

  // Ocultar botón de cerrar widget durante el tour guiado
  const widget = getOrCreateGuideWidget();
  const closeBtn = widget.querySelector('.ash-guide-close');
  if (closeBtn) closeBtn.style.display = 'none';

  showAshGuide({
    image: step.image,
    title: step.title,
    badge: step.badge,
    message: step.message,
    duration: 0,
    actions: [
      ...(!isFirst ? [{
        label: '← Anterior',
        closeOnClick: false,
        onClick: () => {
          currentTourIndex--;
          runTourStep();
        }
      }] : []),
      {
        label: isLast ? '¡Comenzar Aventura! 🏆' : 'Siguiente Paso →',
        primary: true,
        closeOnClick: isLast,
        onClick: () => {
          if (isLast) {
            finishTour();
          } else {
            currentTourIndex++;
            runTourStep();
          }
        }
      },
      {
        label: 'Omitir tour',
        closeOnClick: false,
        onClick: () => finishTour()
      }
    ]
  });

  setTimeout(() => {
    if (step.highlightSelector) {
      const targetEl = document.querySelector(step.highlightSelector);
      if (targetEl) {
        currentHighlightedEl = targetEl;
        currentHighlightedEl.classList.add('tour-highlight-focus');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    // Blindaje: el paso del tour nunca puede quedar sin widget visible
    const liveWidget = getOrCreateGuideWidget();
    liveWidget.classList.add('visible');
  }, 180);
}

function finishTour() {
  if (!isTourActive) return;
  isTourActive = false;
  clearTourHighlight();
  setTourLock(false);
  gameState.completeOnboarding();
  sfx.playCaptureSuccess();

  const widget = getOrCreateGuideWidget();
  const closeBtn = widget.querySelector('.ash-guide-close');
  if (closeBtn) closeBtn.style.display = 'block';

  showAshGuide({
    image: 'victory',
    title: '¡Estás Listo para ser Maestro!',
    message: '¡Excelente recorrido! Ahora explora la Pokédex, captura en el Safari o desafía la Arena. ¡Estaré contigo en cada paso de tu aventura!',
    duration: 6000
  });
}

export function initFloatingAssistant() {
  if (floatingAssistantEl) return;

  floatingAssistantEl = document.createElement('button');
  floatingAssistantEl.className = 'ash-floating-assistant';
  floatingAssistantEl.setAttribute('aria-label', 'Consejos de Ash Ketchum');
  floatingAssistantEl.title = 'Pedir consejo a Ash';

  floatingAssistantEl.innerHTML = `
    <img src="${ASH_ASSETS.greeting}" alt="Ash Asistente" />
  `;

  document.body.appendChild(floatingAssistantEl);

  floatingAssistantEl.addEventListener('click', () => {
    sfx.playClick();
    giveContextualAdvice();
  });
}

function giveContextualAdvice() {
  const activeSection = document.querySelector('.app-section.active');
  const viewId = activeSection ? activeSection.id.replace('view-', '') : 'landing';

  if (viewId === 'pokedex') {
    showAshGuide({
      image: 'mobile',
      title: 'Consejo de Pokédex',
      message: '¡Puedes filtrar por las 9 generaciones desde Kanto hasta Paldea! O escribir el nombre o número exacto (ej: 1000 para Gholdengo).',
      duration: 6000,
      actions: [{ label: 'Repetir Tour Guiado', onClick: () => startInteractiveTour() }]
    });
  } else if (viewId === 'capture') {
    showAshGuide({
      image: 'throwing',
      title: 'Estrategia de Captura',
      message: '¡Prueba diferentes biomas! En la Caverna y el Santuario los Pokémon son mucho más raros y la zona verde es más estrecha. ¡Presiona la barra de espacio en el momento justo!',
      duration: 6000
    });
  } else if (viewId === 'profile') {
    showAshGuide({
      image: 'trainer',
      title: 'Tu Carnet de Entrenador',
      message: '¡Revisa tu rango, tus medallas de gimnasio ganadas y tu multiplicador para atraer Pokémon legendarios en el Safari!',
      duration: 6000
    });
  } else if (viewId === 'moves') {
    showAshGuide({
      image: 'effective',
      title: 'Biblioteca de Movimientos',
      message: '¡Aquí tienes todos los ataques de combate! Ordena por potencia para ver los movimientos más devastadores como Terremoto, Hidrobomba o Danza Espada.',
      duration: 6000
    });
  } else if (viewId === 'types') {
    showAshGuide({
      image: 'pointing',
      title: 'Consejo Táctico de Tipos',
      message: '¡Recuerda que los tipos Eléctricos son letales contra Agua y Volador, pero Tierra es completamente inmune a la electricidad!',
      duration: 6000
    });
  } else if (viewId === 'team' || viewId === 'collection') {
    showAshGuide({
      image: 'trainer',
      title: 'Consejo de Equipo',
      message: 'Un equipo balanceado con variedad de tipos (Agua, Fuego, Planta, Eléctrico) te dará ventaja contra cualquier rival en la Arena.',
      duration: 6000
    });
  } else if (viewId === 'arena') {
    showAshGuide({
      image: 'motivating',
      title: 'Estrategia de Combate',
      message: '¡Aprovecha siempre la velocidad! El Pokémon más rápido ataca primero. Y si llegas a Mewtwo... ¡lucha con todo tu corazón!',
      duration: 6000
    });
  } else {
    showAshGuide({
      image: 'greeting',
      title: '¿En qué te puedo ayudar?',
      message: '¡Puedo darte un recorrido interactivo por todas las funciones del Centro de Entrenamiento!',
      duration: 6000,
      actions: [{ label: '¡Iniciar Tour Guiado!', primary: true, onClick: () => startInteractiveTour() }]
    });
  }
}
