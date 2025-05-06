// modules/loader.js
// Gestión de loader (overlay de carga) y notificaciones (toasts) para Dashboard IAAPS Curicó

/**
 * Inicializa el sistema de loader y toasts:
 * - Crea contenedor de toasts si no existe
 * - Configura estilos básicos (si se requiere)
 */
export function initLoader() {
  // Crear contenedor para notificaciones (toasts)
  if (!document.getElementById('toastContainer')) {
    const tc = document.createElement('div');
    tc.id = 'toastContainer';
    tc.className = 'toast-container';
    document.body.appendChild(tc);
  }
}

/**
 * Muestra un overlay de carga con mensaje opcional.
 * @param {string} [message='Cargando...']
 */
export function showLoader(message = 'Cargando...') {
  // Si ya existe overlay, actualiza el texto
  let overlay = document.getElementById('loaderOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loaderOverlay';
    overlay.className = 'loading-overlay';
    // Contenido del loader
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner-3d">
          <div class="cube1"></div>
          <div class="cube2"></div>
        </div>
        <p class="loading-text">${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    // Actualizar mensaje
    const textElem = overlay.querySelector('.loading-text');
    if (textElem) textElem.textContent = message;
    overlay.style.display = 'flex';
  }
}

/**
 * Oculta y elimina el overlay de carga.
 */
export function hideLoader() {
  const overlay = document.getElementById('loaderOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Muestra una notificación tipo toast.
 * @param {'success' | 'error' | 'info' | 'warning'} type Tipo de toast
 * @param {string} message Mensaje a mostrar
 * @param {number} [duration=4000] Duración en milisegundos
 */
export function showToast(type = 'info', message, duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Crear toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${_iconForType(type)}"></i>
    </div>
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
  `;

  container.appendChild(toast);
  // Animar entrada (opcional, CSS debe definir animación)
  setTimeout(() => {
    toast.classList.add('show');
  }, 50);

  // Eliminar después de duration
  setTimeout(() => {
    toast.classList.remove('show');
    // Limpiar del DOM tras animación de salida
    setTimeout(() => container.removeChild(toast), 500);
  }, duration);
}

/**
 * Obtiene el icono FontAwesome según el tipo de toast.
 * @param {string} type
 * @returns {string}
 * @private
 */
function _iconForType(type) {
  switch (type) {
    case 'success': return 'check-circle';
    case 'error': return 'times-circle';
    case 'warning': return 'exclamation-triangle';
    case 'info':
    default: return 'info-circle';
  }
}