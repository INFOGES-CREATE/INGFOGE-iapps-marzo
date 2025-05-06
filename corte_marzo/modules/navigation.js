// modules/navigation.js
// Gestión de navegación de vistas para Dashboard IAAPS Curicó
// Provee:
//  - Inicialización de clicks en elementos de menú
//  - Activación/desactivación de vistas
//  - Actualización de título de página y breadcrumb
//  - Eventos custom para suscribirse a cambios de vista

const MENU_ITEM_SELECTOR = '.sidebar-item';
const VIEW_CONTENT_SELECTOR = '.view-content';
const TITLE_SELECTOR = '#currentViewTitle';
const BREADCRUMB_SELECTOR = '#currentBreadcrumb';

/**
 * NavigationManager extiende EventTarget para emitir eventos de cambio de vista
 */
class NavigationManager extends EventTarget {
  constructor() {
    super();
    this.menuItems = Array.from(document.querySelectorAll(MENU_ITEM_SELECTOR));
    this.views = Array.from(document.querySelectorAll(VIEW_CONTENT_SELECTOR));
    this.titles = {
      dashboard: 'Dashboard IAAPS',
      detail: 'Detalle de Indicadores',
      trends: 'Tendencias Históricas',
      centers: 'Centros de Salud',
      export: 'Exportar Datos',
      help: 'Ayuda'
    };
    this._init();
  }

  /**
   * Inicializa listeners y estado inicial
   * @private
   */
  _init() {
    this.menuItems.forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const view = item.dataset.view;
        this.activateView(view);
      });
    });
    // Activar la primera como default
    const activeItem = this.menuItems.find(i => i.classList.contains('active')) || this.menuItems[0];
    if (activeItem) {
      this.activateView(activeItem.dataset.view, false);
    }
  }

  /**
   * Activa una vista por nombre:
   *  - Muestra el contenedor correspondiente
   *  - Oculta los demás
   *  - Marca el menú
   *  - Actualiza título y breadcrumb
   *  - Emite evento nav:viewChange
   * @param {string} viewName
   * @param {boolean} [emit=true]
   */
  activateView(viewName, emit = true) {
    // Actualizar menú activo
    this.menuItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Mostrar/ocultar vistas
    this.views.forEach(view => {
      view.classList.toggle('active', view.id === `${viewName}View`);
    });

    // Actualizar encabezado
    const titleEl = document.querySelector(TITLE_SELECTOR);
    const bcEl = document.querySelector(BREADCRUMB_SELECTOR);
    const label = this.titles[viewName] || '';
    if (titleEl) titleEl.textContent = label;
    if (bcEl) bcEl.textContent = label;

    // Emitir evento
    if (emit) {
      this.dispatchEvent(new CustomEvent('nav:viewChange', { detail: viewName }));
    }
  }

  /**
   * Permite suscribirse a cambios de vista
   * @param {function(string):void} callback
   */
  onViewChange(callback) {
    this.addEventListener('nav:viewChange', e => callback(e.detail));
  }
}

// Instancia única
const navigationManager = new NavigationManager();

/**
 * Inicializa la navegación de vistas. Llamar en main.js
 */
export function initViewNavigation() {
  // Todo se configura en el constructor de NavigationManager
}

/**
 * Permite escuchar cambios de vista
 * @param {function(string):void} callback
 */
export function onViewChange(callback) {
  navigationManager.onViewChange(callback);
}

export default {
  initViewNavigation,
  onViewChange
};
