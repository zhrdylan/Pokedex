/**
 * GSAP-ANIMATIONS.JS - Utilidades centralizadas de animación con GSAP Core.
 * (Solo GSAP Core: barras de stats, entradas de tarjetas, transiciones y screen shake.)
 */

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Anima la entrada secuencial de tarjetas en una cuadrícula
 * @param {string|NodeList} targets 
 */
export function animateCardGrid(targets) {
  if (prefersReducedMotion()) return;
  if (window.gsap) {
    window.gsap.fromTo(targets, 
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
    );
  }
}

/**
 * Anima el llenado de barras de estadísticas
 * @param {string|NodeList} bars 
 */
export function animateStatBars(bars) {
  if (window.gsap) {
    window.gsap.fromTo(bars,
      { width: '0%' },
      { width: (i, target) => target.dataset.targetWidth || '50%', duration: 0.8, ease: 'power3.out', stagger: 0.08 }
    );
  } else {
    // Fallback nativo
    bars.forEach(b => {
      b.style.width = b.dataset.targetWidth || '50%';
    });
  }
}

/**
 * Efecto de temblor en pantalla (Screen Shake) para golpes muy efectivos o críticos
 * @param {HTMLElement} target 
 */
export function animateScreenShake(target = document.body) {
  if (prefersReducedMotion()) return;
  if (window.gsap) {
    window.gsap.fromTo(target,
      { x: -8 },
      { x: 8, duration: 0.06, repeat: 5, yoyo: true, ease: 'sine.inOut', onComplete: () => {
        window.gsap.set(target, { x: 0 });
      }}
    );
  } else {
    target.classList.add('shake-screen');
    setTimeout(() => target.classList.remove('shake-screen'), 400);
  }
}

/**
 * Transición suave al cambiar de sección
 * @param {HTMLElement} sectionElement 
 */
export function animateSectionTransition(sectionElement) {
  if (prefersReducedMotion()) return;
  if (window.gsap) {
    window.gsap.fromTo(sectionElement,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    );
  }
}
