/**
 * NOTIFICATIONS.JS - Sistema de notificaciones toast flotantes accesibles
 */

const toastContainerId = 'toast-container';

function getOrCreateContainer() {
  let container = document.getElementById(toastContainerId);
  if (!container) {
    container = document.createElement('div');
    container.id = toastContainerId;
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Muestra una notificación emergente
 * @param {string} message 
 * @param {'info'|'success'|'warning'|'danger'} type 
 * @param {number} duration 
 */
export function showNotification(message, type = 'info', duration = 3500) {
  const container = getOrCreateContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');

  const textEl = document.createElement('p');
  textEl.className = 'toast-text';
  textEl.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close-btn';
  closeBtn.setAttribute('aria-label', 'Cerrar notificación');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => removeToast(toast));

  toast.appendChild(textEl);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  const timeoutId = setTimeout(() => {
    removeToast(toast);
  }, duration);

  function removeToast(el) {
    clearTimeout(timeoutId);
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }
}
