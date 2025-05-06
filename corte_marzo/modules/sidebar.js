// modules/sidebar.js
// Gestión avanzada del panel lateral (sidebar) para Dashboard IAAPS Curicó
// Provee funcionalidades de:
//  - Colapso/expansión con persistencia de estado
//  - Navegación interna y resaltado de vista activa
//  - Comportamiento responsive (auto-colapso en móvil)
//  - Soporte de teclado y accesibilidad
//  - Eventos custom para integración con router o sistema principal

/**
 * SidebarManager extiende EventTarget para emitir eventos de navegación
 */
class SidebarManager extends EventTarget {
  constructor(options = {}) {
    super();
    // Elementos principales
    this.sidebar = document.querySelector('.sidebar');
    this.mainContent = document.querySelector('.main-content');
    this.toggleBtn = document.getElementById('sidebarToggle');
    this.menuItems = Array.from(document.querySelectorAll('.sidebar-item'));
    this.collapseKey = 'iaaps:sidebarCollapsed';
    this.isCollapsed = false;
    this.mobileBreakpoint = options.mobileBreakpoint || 768;
    this._init();
  }

  /**
   * Inicializa listeners y estado inicial
   * @private
   */
  _init() {
    this._restoreState();
    this._setupToggle();
    this._setupItemClicks();
    this._setupKeyboardNav();
    this._setupResponsiveListener();
    this._setupOutsideClick();
  }

  /**
   * Restaura estado de colapso desde localStorage
   * @private
   */
  _restoreState() {
    const saved = localStorage.getItem(this.collapseKey);
    if (saved === 'true') {
      this.collapse();
    }
  }

  /**
   * Guarda estado actual de colapso en localStorage
   * @private
   */
  _saveState() {
    localStorage.setItem(this.collapseKey, this.isCollapsed);
  }

  /**
   * Configura el botón de toggle para colapsar/expandir
   * @private
   */
  _setupToggle() {
    if (!this.toggleBtn) return;
    this.toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggle();
    });
  }

  /**
   * Alterna estado entre colapsado y expandido
   */
  toggle() {
    if (this.isCollapsed) this.expand();
    else this.collapse();
  }

  /**
   * Colapsa el sidebar (solo iconos visibles)
   */
  collapse() {
    this.sidebar.classList.add('collapsed');
    this.mainContent.classList.add('sidebar-collapsed');
    this.isCollapsed = true;
    this._saveState();
    this.dispatchEvent(new CustomEvent('sidebar:collapsed'));
  }

  /**
   * Expande el sidebar
   */
  expand() {
    this.sidebar.classList.remove('collapsed');
    this.mainContent.classList.remove('sidebar-collapsed');
    this.isCollapsed = false;
    this._saveState();
    this.dispatchEvent(new CustomEvent('sidebar:expanded'));
  }

  /**
   * Configura clicks en items para emitir evento navigation y actualizar activo
   * @private
   */
  _setupItemClicks() {
    this.menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this._activateItem(item);
        this.dispatchEvent(new CustomEvent('sidebar:navigate', { detail: view }));
      });
    });
  }

  /**
   * Marca un item como activo y desmarca los demás
   * @param {HTMLElement} item
   * @private
   */
  _activateItem(item) {
    this.menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  }

  /**
   * Configura navegación por teclado (flechas arriba/abajo, Enter para activar)
   * @private
   */
  _setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      const focusable = this.menuItems.map(i => i.querySelector('a'));
      const current = document.activeElement;
      const idx = focusable.indexOf(current);
      if (idx === -1) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = focusable[(idx + 1) % focusable.length];
        next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
        prev.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        current.click();
      }
    });
  }

  /**
   * Ajusta comportamiento en resize para collapsar en móvil
   * @private
   */
  _setupResponsiveListener() {
    window.addEventListener('resize', () => {
      if (window.innerWidth < this.mobileBreakpoint && !this.isCollapsed) {
        this.collapse();
      } else if (window.innerWidth >= this.mobileBreakpoint && this.isCollapsed) {
        this.expand();
      }
    });
  }

  /**
   * Detecta clics fuera del sidebar para colapsar en móvil
   * @private
   */
  _setupOutsideClick() {
    document.addEventListener('click', (e) => {
      if (window.innerWidth < this.mobileBreakpoint && !this.sidebar.contains(e.target) && !this.toggleBtn.contains(e.target)) {
        this.collapse();
      }
    });
  }

  /**
   * Permite suscribirse a eventos de navegación
   * @param {function(string):void} callback
   */
  onNavigate(callback) {
    this.addEventListener('sidebar:navigate', e => callback(e.detail));
  }
}

// Singleton
const sidebarManager = new SidebarManager();

/**
 * Inicializa la gestión del sidebar.
 * Función a invocar desde main.js.
 */
export function initSidebarToggle() {
  // Ya inicializado en constructor de SidebarManager
}

/**
 * Permite suscribirse a eventos de navegación desde el sidebar.
 * @param {function(string):void} callback
 */
export function onSidebarNavigate(callback) {
  sidebarManager.onNavigate(callback);
}



