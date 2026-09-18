/**
 * NAVIGATION.JS - Enrutador simple estilo SPA y navegación responsive.
 * Incluye Pokédex, Safari, Colección, Movimientos, Perfil, Tipos, Equipo y Arena.
 */
import { animateSectionTransition } from '../animations/gsap-animations.js';
import { showAshGuide } from './ash-guide.js';
import { sfx } from '../audio/sound-effects.js';

const viewIds = ['landing', 'pokedex', 'capture', 'collection', 'moves', 'profile', 'types', 'team', 'arena'];

export function initNavigation() {
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('main-nav');
  const moreToggle = document.getElementById('btn-nav-more');

  const closeMoreMenu = () => {
    if (moreToggle) moreToggle.setAttribute('aria-expanded', 'false');
  };

  // Delegación global para cualquier botón o enlace con data-nav-target
  document.addEventListener('click', (e) => {
    // Cerrar «Más» al hacer clic fuera del grupo
    if (moreToggle && !e.target.closest('.nav-more')) {
      closeMoreMenu();
    }

    const targetLink = e.target.closest('[data-nav-target]');
    if (targetLink) {
      e.preventDefault();
      sfx.playClick();
      const targetView = targetLink.getAttribute('data-nav-target');
      if (targetView) {
        navigateTo(targetView);

        // Si fue el botón principal de aventura, dar el consejo inicial
        if (targetLink.id === 'btn-start-adventure') {
          showAshGuide({
            image: 'mobile',
            title: '¡Aquí comienza tu aventura!',
            message: 'Esta es la Pokédex Nacional con más de 1000 Pokémon. Pulsa sobre cualquier Pokémon para ver su detalle y capturarlo, o visita el Safari para cazar en la hierba alta.',
            duration: 6000
          });
        }
      }

      if (mainNav && mainNav.classList.contains('menu-open')) {
        mainNav.classList.remove('menu-open');
        menuToggle?.setAttribute('aria-expanded', 'false');
        menuToggle?.setAttribute('aria-label', 'Abrir menú de navegación');
      }
      closeMoreMenu();
    }
  });

  if (menuToggle && mainNav && !menuToggle.dataset.wired) {
    menuToggle.dataset.wired = 'true';
    menuToggle.addEventListener('click', () => {
      sfx.playClick();
      const isOpen = mainNav.classList.toggle('menu-open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
      if (!isOpen) closeMoreMenu();
    });
  }

  // Grupo desplegable «Más»: alternar, cerrar con Escape
  if (moreToggle && !moreToggle.dataset.wired) {
    moreToggle.dataset.wired = 'true';
    moreToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.playClick();
      const isOpen = moreToggle.getAttribute('aria-expanded') === 'true';
      moreToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
    moreToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMoreMenu();
        moreToggle.focus();
      }
    });
  }

  window.addEventListener('tour:navigate', (e) => {
    if (e.detail && e.detail.viewId) {
      navigateTo(e.detail.viewId);
    }
  });
}

export function navigateTo(viewId) {
  if (!viewIds.includes(viewId)) return;

  viewIds.forEach(id => {
    const section = document.getElementById(`view-${id}`);
    const navItems = document.querySelectorAll(`[data-nav-target="${id}"]`);

    if (id === viewId) {
      if (section) {
        section.classList.add('active');
        animateSectionTransition(section);
      }
      navItems.forEach(item => {
        item.classList.add('active');
        if (item.classList.contains('nav-link')) {
          item.setAttribute('aria-current', 'page');
        }
      });
    } else {
      if (section) section.classList.remove('active');
      navItems.forEach(item => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      });
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.dispatchEvent(new CustomEvent('view:change', { detail: { viewId } }));
}
