/**
 * Script de verificación estricta - Debe colocarse antes de cualquier otro script
 * Este código verifica si el usuario está registrado y redirecciona al formulario
 * si intenta acceder a cualquier página sin estar registrado
 */

(function() {
    // Configuración
    const config = {
        cookieName: 'saludCuricoRegistered',
        storageKeyEmail: 'saludCuricoUserRegisteredEmail',
        registrationPage: 'registro.html',
        excludedPaths: ['/registro.html', '/admin.html'], // Páginas excluidas de la redirección
        requireRegistrationEverywhere: true // Forzar registro en TODAS las páginas
    };
    
    // Función para verificar cookies
    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.indexOf(name + '=') === 0) {
                return cookie.substring(name.length + 1);
            }
        }
        return null;
    }
    
    // Función para verificar si el usuario está registrado
    function checkRegistrationStatus() {
        // Verificar si estamos en una página excluida
        const currentPath = window.location.pathname;
        const isExcludedPath = config.excludedPaths.some(path => 
            currentPath.endsWith(path) || currentPath === path || 
            currentPath.toLowerCase().includes(path.toLowerCase())
        );
        
        if (isExcludedPath && !config.requireRegistrationEverywhere) {
            console.log('[RegistroEstricto] En página excluida, permitiendo acceso');
            return true;
        }
        
        // Verificar registros en cookies y localStorage
        const hasCookie = getCookie(config.cookieName);
        const hasLocalStorage = localStorage.getItem(config.storageKeyEmail);
        const isRegistered = hasCookie || hasLocalStorage;
        
        // Si no está registrado, redireccionar a la página de registro
        if (!isRegistered) {
            console.log('[RegistroEstricto] Usuario no registrado, redireccionando...');
            
            // Guardar URL actual para regresar después del registro
            if (currentPath !== '/' && !currentPath.endsWith('/index.html') && !isExcludedPath) {
                sessionStorage.setItem('redirectAfterRegistration', window.location.href);
            }
            
            // Solamente si no estamos ya en la página de registro
            if (!window.location.pathname.endsWith(config.registrationPage)) {
                window.location.href = config.registrationPage;
                return false;
            }
        }
        
        return isRegistered;
    }
    
    // Ejecutar la verificación inmediatamente
    const isUserRegistered = checkRegistrationStatus();
    
    // También verificar después de que la página se cargue completamente
    window.addEventListener('DOMContentLoaded', function() {
        if (!isUserRegistered) {
            // Bloquear cualquier contenido que pueda haberse cargado
            document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>Redireccionando al registro...</h2></div>';
            setTimeout(() => {
                if (!window.location.pathname.endsWith(config.registrationPage)) {
                    window.location.href = config.registrationPage;
                }
            }, 100);
        }
    });
})();