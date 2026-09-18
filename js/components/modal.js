/**
 * MODAL.JS - Controlador reutilizable de ventanas modales accesibles.
 * Con trampa de foco, retorno de foco y cierre con Escape / overlay.
 */

let lastFocusedEl = null;

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Abre un modal por ID
 * @param {string} modalId
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  lastFocusedEl = document.activeElement;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Enfocar el primer elemento enfocable
  const focusable = modal.querySelector(FOCUSABLE_SELECTOR);
  if (focusable) focusable.focus();
}

/**
 * Cierra un modal por ID y devuelve el foco
 * @param {string} modalId
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';

  if (lastFocusedEl && document.contains(lastFocusedEl)) {
    lastFocusedEl.focus();
  }
  lastFocusedEl = null;
}

/**
 * Configura oyentes de eventos para un modal (Escape, click en fondo, botones de cierre, trampa de foco)
 * @param {string} modalId
 */
export function setupModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || modal.dataset.wired) return;
  modal.dataset.wired = 'true';

  // Click en el overlay
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modalId);
    }
  });

  // Botones con data-close
  const closeBtns = modal.querySelectorAll('[data-close-modal], .modal-close-btn');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => closeModal(modalId));
  });

  // Tecla Escape + trampa de foco (Tab circular dentro del modal)
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeModal(modalId);
      return;
    }

    if (e.key === 'Tab') {
      const focusables = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
