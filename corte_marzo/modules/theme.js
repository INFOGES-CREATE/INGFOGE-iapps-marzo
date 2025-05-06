// modules/theme.js
// Gestión avanzada de temas para Dashboard IAAPS Curicó

/**
 * Módulo de gestión de temas (theme.js)
 * ------------------------------------------------
 * Provee funcionalidades para:
 *  - Detectar y aplicar temas CSS personalizados
 *  - Persistencia de la selección en localStorage
 *  - Ciclo de temas (toggle)
 *  - Suscripción a eventos de cambio
 *  - Detección de preferencia de sistema (modo oscuro)
 *
 * Uso:
 *   import themeManager, { setTheme, getTheme, onThemeChange } from './modules/theme.js';
 *   initThemeSwitcher();
 *   // Cambiar tema manualmente:
 *   setTheme('dark');
 *   // Escuchar cambios:
 *   onThemeChange(theme => console.log('Nuevo tema:', theme));
 */

// Clave de almacenamiento local
const STORAGE_KEY = 'iaaps:theme';
// Prefijo de clase CSS para temas (se asigna a <body>)
const CSS_PREFIX = 'theme-';
// Nombre de evento custom para cambios de tema
const EVENT_THEME_CHANGED = 'themeChanged';

/**
 * ThemeManager extiende EventTarget para emitir eventos de cambio de tema.
 */
class ThemeManager extends EventTarget {
  constructor() {
    super();
    /** @type {string[]} */
    this.availableThemes = [];
    /** @type {string|null} */
    this.currentTheme = null;
    this._init();
  }

  /**
   * Configura la detección de botones, aplica tema inicial
   * y registra listener para preferencia de color del sistema.
   * @private
   */
  _init() {
    this._detectThemeButtons();
    this._applyStoredTheme();
    this._registerSystemPreferenceListener();
  }

  /**
   * Encuentra botones .theme-btn en el DOM y extrae sus data-theme.
   * Asocia evento click para cambiar tema.
   * @private
   */
  _detectThemeButtons() {
    const buttons = Array.from(document.querySelectorAll('.theme-btn'));
    // Extraer temas disponibles de los atributos data-theme
    this.availableThemes = buttons
      .map(btn => btn.dataset.theme)
      .filter(t => typeof t === 'string' && t.trim().length);

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTheme(btn.dataset.theme);
      });
    });
  }

  /**
   * Aplica el tema guardado en localStorage o el primer tema disponible.
   * @private
   */
  _applyStoredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = this.availableThemes.includes(saved)
      ? saved
      : this.availableThemes[0] || 'default';
    this.setTheme(initial, { persist: false, notify: false });
  }

  /**
   * Escucha cambios en preferencia de color del sistema y aplica modo oscuro/claro
   * si el usuario no ha forzado manualmente un tema.
   * @private
   */
  _registerSystemPreferenceListener() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', e => {
      const autoTheme = e.matches ? 'dark' : 'default';
      if (!localStorage.getItem(STORAGE_KEY)) {
        this.setTheme(autoTheme);
      }
    });
  }

  /**
   * Aplica un tema determinado:
   *  - Elimina clases anteriores de tema en <body>
   *  - Asigna clase CSS del nuevo tema
   *  - Actualiza botones y persistencia
   *  - Emite evento ThemeManager.EVENT_THEME_CHANGED
   * @param {string} themeName
   * @param {{persist?: boolean, notify?: boolean}} [options]
   */
  setTheme(themeName, options = {}) {
    const { persist = true, notify = true } = options;
    // Validar tema y fallback
    const theme = this.availableThemes.includes(themeName)
      ? themeName
      : (this.availableThemes[0] || 'default');

    // Eliminar clases previas de tema del body
    document.body.classList.forEach(cls => {
      if (cls.startsWith(CSS_PREFIX)) {
        document.body.classList.remove(cls);
      }
    });
    // Asignar nuevo tema al body
    document.body.classList.add(`${CSS_PREFIX}${theme}`);
    this.currentTheme = theme;

    // Persistir si corresponde
    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }

    // Marcar botón activo visualmente
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    // Notificar suscriptores vía evento
    if (notify) {
      this.dispatchEvent(
        new CustomEvent(EVENT_THEME_CHANGED, { detail: theme })
      );
    }
  }

  /**
   * Obtiene el tema actualmente activo.
   * @returns {string|null}
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Retorna copia de la lista de temas disponibles.
   * @returns {string[]}
   */
  getAvailableThemes() {
    return [...this.availableThemes];
  }

  /**
   * Cicla al siguiente tema en availableThemes.
   */
  toggleNextTheme() {
    if (!this.availableThemes.length) return;
    const idx = this.availableThemes.indexOf(this.currentTheme);
    const next = this.availableThemes[(idx + 1) % this.availableThemes.length];
    this.setTheme(next);
  }

  /**
   * Permite suscribirse a cambios de tema.
   * @param {function(string):void} callback
   */
  onThemeChange(callback) {
    this.addEventListener(EVENT_THEME_CHANGED, e => {
      try {
        callback(e.detail);
      } catch (err) {
        console.error('Error en callback de onThemeChange:', err);
      }
    });
  }
}

// Instancia única (singleton)
const themeManager = new ThemeManager();

// Exportar API pública
export function initThemeSwitcher() {
  // La instancia en constructor ya inicializó todo
}
export function setTheme(themeName) {
  themeManager.setTheme(themeName);
}
export function getTheme() {
  return themeManager.getTheme();
}
export function getAvailableThemes() {
  return themeManager.getAvailableThemes();
}
export function toggleNextTheme() {
  themeManager.toggleNextTheme();
}
export function onThemeChange(callback) {
  themeManager.onThemeChange(callback);
}

export default {
  initThemeSwitcher,
  setTheme,
  getTheme,
  getAvailableThemes,
  toggleNextTheme,
  onThemeChange
};

