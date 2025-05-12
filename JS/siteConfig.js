/**
 * Script de configuración global del sistema de registro obligatorio
 * Debe incluirse en todas las páginas del sitio
 */

// Configuración global del sitio
const SiteConfig = {
    // Títulos del sitio
    siteName: "Portal Estadístico - Sistema de Salud Curicó",
    
    // Rutas excluidas de registro obligatorio (opcional)
    excludedPaths: [
        "/admin.html",  // Página de administración
        "/politica-privacidad.html"  // Política de privacidad
    ],
    
    // Tiempo de validez del registro (en días)
    registrationValidDays: 30,
    
    // Comprueba si la ruta actual está excluida
    isExcludedPath: function() {
        const currentPath = window.location.pathname;
        return this.excludedPaths.some(path => currentPath.endsWith(path));
    },
    
    // Redirige a la página de registro si es necesario
    checkRegistrationStatus: function() {
        // Si es una página excluida, no hacer nada
        if (this.isExcludedPath()) {
            return;
        }
        
        // Verificar si hay parámetro de registro forzado en la URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('forceRegister')) {
            return; // Ya estamos en el proceso de registro forzado
        }
        
        // Si el ContactModule no está disponible, redirigir a la página principal con indicador de registro
        if (typeof ContactModule === 'undefined') {
            if (!window.location.pathname.endsWith('/index.html') && 
                !window.location.pathname.endsWith('/')) {
                window.location.href = 'index.html#registration';
            }
        }
    },
    
    // Inicializa la configuración
    init: function() {
        // Verificar el estado de registro
        this.checkRegistrationStatus();
    }
};

// Inicializar la configuración del sitio
document.addEventListener('DOMContentLoaded', () => {
    SiteConfig.init();
});