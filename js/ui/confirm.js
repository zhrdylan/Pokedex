/**
 * CONFIRM.JS - Diálogo de confirmación accesible (sustituye a confirm()).
 * Usa el modal #confirm-modal del index. Retorna Promise<boolean>.
 */
import { openModal, closeModal } from '../components/modal.js';

const MODAL_ID = 'confirm-modal';

export function confirmAction({ title = '¿Confirmar acción?', message = '', acceptLabel = 'Confirmar', cancelLabel = 'Cancelar' } = {}) {
  const titleEl = document.getElementById('confirm-modal-title');
  const msgEl = document.getElementById('confirm-modal-message');
  const acceptBtn = document.getElementById('btn-confirm-accept');
  const cancelBtn = document.getElementById('btn-confirm-cancel');

  if (!titleEl || !msgEl || !acceptBtn || !cancelBtn) {
    return Promise.resolve(window.confirm(message || title));
  }

  titleEl.textContent = title;
  msgEl.textContent = message;
  acceptBtn.textContent = acceptLabel;
  cancelBtn.textContent = cancelLabel;

  openModal(MODAL_ID);

  return new Promise((resolve) => {
    const done = (value) => {
      acceptBtn.removeEventListener('click', onAccept);
      cancelBtn.removeEventListener('click', onCancel);
      closeModal(MODAL_ID);
      resolve(value);
    };
    const onAccept = () => done(true);
    const onCancel = () => done(false);
    acceptBtn.addEventListener('click', onAccept);
    cancelBtn.addEventListener('click', onCancel);
  });
}
