/**
 * FEEDBACK.JS - Estados reutilizables loading / empty / error (cero <span>).
 */

export function loadingState(message = 'Cargando...') {
  return `
    <section class="empty-state" aria-label="Cargando">
      <b class="capture-pokeball-graphic shaking empty-state-ball" aria-hidden="true"></b>
      <p>${message}</p>
    </section>
  `;
}

export function emptyState(icon = '🔍', message = 'Sin resultados.') {
  return `
    <section class="empty-state" aria-label="Sin resultados">
      <p class="empty-state-icon" aria-hidden="true">${icon}</p>
      <p>${message}</p>
    </section>
  `;
}

export function errorState(message = 'Ocurrió un error.', retryId = 'btn-feedback-retry', retryLabel = 'Reintentar') {
  return `
    <section class="empty-state" role="alert" aria-label="Error">
      <p class="empty-state-icon" aria-hidden="true">⚠️</p>
      <p>${message}</p>
      <p><button id="${retryId}" class="btn btn-outline">${retryLabel}</button></p>
    </section>
  `;
}
