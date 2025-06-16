/**
 * Sistema de Seguimiento de Usuarios - Portal Estadístico Salud Curicó
 * Este script registra las acciones de usuarios y las almacena localmente
 * para su posterior exportación a Excel.
 */

// Objeto principal de seguimiento
const UserTracker = {
    // Configuración del sistema
    config: {
        storageKey: 'saludCuricoUserTracking',
        sessionIdKey: 'saludCuricoSessionId',
        maxRecordsBeforeSync: 100,
        trackingEnabled: true,
        adminPassword: 'CuricoSalud2025', // Contraseña para acceder a la página de administración
        encryptionKey: 'saludCuricoSecureKey2025', // Clave para encriptar datos sensibles
    },
    
    // Datos del usuario actual
    userData: {
        sessionId: '',
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        referrer: document.referrer,
        startTime: new Date().toISOString(),
        ipAddress: '',
        email: '',
    },
    
    // Eventos registrados durante la sesión actual
    currentEvents: [],
    
    /**
     * Inicializa el sistema de seguimiento
     */
    init: function() {
        // Verificar si el seguimiento está habilitado
        if (!this.config.trackingEnabled) return;
        
        // Generar o recuperar ID de sesión
        this.userData.sessionId = this.getSessionId();
        
        // Obtener dirección IP del usuario
        this.getIPAddress();
        
        // Registrar evento de carga de página
        this.trackPageView();
        
        // Configurar oyentes de eventos
        this.setupEventListeners();
        
        // Configurar guardado periódico
        setInterval(() => this.saveEvents(), 30000); // Guardar cada 30 segundos
        
        // Configurar guardado al cerrar la página
        window.addEventListener('beforeunload', () => this.saveEvents());
        
        console.log('Sistema de seguimiento de usuarios inicializado');
    },
    
    /**
     * Obtiene la dirección IP del usuario utilizando un servicio API
     */
    getIPAddress: function() {
        fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => {
                this.userData.ipAddress = data.ip;
                this.saveEvents(); // Guardar inmediatamente al obtener la IP
            })
            .catch(error => {
                console.error('Error al obtener la IP:', error);
                this.userData.ipAddress = 'No disponible';
            });
    },
    
    /**
     * Genera o recupera un ID de sesión único
     */
    getSessionId: function() {
        let sessionId = sessionStorage.getItem(this.config.sessionIdKey);
        if (!sessionId) {
            sessionId = this.generateUUID();
            sessionStorage.setItem(this.config.sessionIdKey, sessionId);
        }
        return sessionId;
    },
    
    /**
     * Genera un UUID único para identificar sesiones
     */
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * Configura oyentes para diferentes tipos de eventos
     */
    setupEventListeners: function() {
        // Rastrear clics
        document.addEventListener('click', (e) => this.trackClick(e), { passive: true });
        
        // Rastrear navegación entre páginas
        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            UserTracker.trackPageView();
        };
        
        window.addEventListener('popstate', () => this.trackPageView());
        
        // Rastrear interacciones con formularios
        document.addEventListener('submit', (e) => this.trackFormSubmit(e), { passive: true });
        
        // Rastrear interacciones con botones
        document.querySelectorAll('button, .btn').forEach(button => {
            button.addEventListener('click', (e) => this.trackButtonClick(e), { passive: true });
        });
    },
    
    /**
     * Registra una vista de página
     */
    trackPageView: function() {
        const event = {
            type: 'pageview',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
            sessionId: this.userData.sessionId,
            ipAddress: this.userData.ipAddress,
            email: this.userData.email
        };
        
        this.currentEvents.push(event);
        console.log('Página registrada:', event.url);
    },
    
    /**
     * Registra un clic en la página
     */
    trackClick: function(e) {
        // Obtener información del elemento clickeado
        const targetElement = e.target.tagName;
        const targetText = e.target.textContent?.trim().substring(0, 50) || '';
        const targetId = e.target.id || '';
        const targetClass = e.target.className || '';
        
        // Obtener la ruta del elemento clickeado (para identificación más precisa)
        const path = this.getElementPath(e.target);
        
        const event = {
            type: 'click',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            element: targetElement,
            elementText: targetText,
            elementId: targetId,
            elementClass: targetClass,
            path: path,
            x: e.clientX,
            y: e.clientY,
            sessionId: this.userData.sessionId,
            ipAddress: this.userData.ipAddress,
            email: this.userData.email
        };
        
        this.currentEvents.push(event);
        
        // Si hay muchos eventos, guardar automáticamente
        if (this.currentEvents.length >= this.config.maxRecordsBeforeSync) {
            this.saveEvents();
        }
    },
    
    /**
     * Registra un clic en un botón específico
     */
    trackButtonClick: function(e) {
        const buttonText = e.target.textContent?.trim() || '';
        const buttonId = e.target.id || '';
        const buttonClasses = e.target.className || '';
        
        const event = {
            type: 'button_click',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            buttonText: buttonText,
            buttonId: buttonId, 
            buttonClasses: buttonClasses,
            sessionId: this.userData.sessionId,
            ipAddress: this.userData.ipAddress,
            email: this.userData.email
        };
        
        this.currentEvents.push(event);
    },
    
    /**
     * Registra un envío de formulario
     */
    trackFormSubmit: function(e) {
        const formId = e.target.id || '';
        const formAction = e.target.action || '';
        
        // Verificar si hay un campo de correo electrónico en el formulario
        const emailField = e.target.querySelector('input[type="email"]');
        if (emailField && emailField.value) {
            this.setUserEmail(emailField.value);
        }
        
        const event = {
            type: 'form_submit',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            formId: formId,
            formAction: formAction,
            sessionId: this.userData.sessionId,
            ipAddress: this.userData.ipAddress,
            email: this.userData.email
        };
        
        this.currentEvents.push(event);
    },
    
    /**
     * Establece o actualiza el correo electrónico del usuario
     */
    setUserEmail: function(email) {
        if (this.isValidEmail(email)) {
            this.userData.email = email;
            // Guardar el correo en almacenamiento persistente para futuras sesiones
            localStorage.setItem('saludCuricoUserEmail', this.encryptData(email));
            console.log('Correo electrónico registrado');
            return true;
        }
        return false;
    },
    
    /**
     * Obtiene la ruta DOM para un elemento
     */
    getElementPath: function(element) {
        const path = [];
        let currentElement = element;
        
        while (currentElement && currentElement !== document.body && path.length < 5) {
            let selector = currentElement.tagName.toLowerCase();
            
            if (currentElement.id) {
                selector += `#${currentElement.id}`;
            } else if (currentElement.className) {
                const classes = Array.from(currentElement.classList).join('.');
                if (classes) {
                    selector += `.${classes}`;
                }
            }
            
            path.unshift(selector);
            currentElement = currentElement.parentElement;
        }
        
        return path.join(' > ');
    },
    
    /**
     * Guarda los eventos actuales en el almacenamiento local
     */
    saveEvents: function() {
        if (this.currentEvents.length === 0) return;
        
        try {
            // Obtener eventos existentes
            let allEvents = this.getAllEvents();
            
            // Añadir nuevos eventos
            allEvents = [...allEvents, ...this.currentEvents];
            
            // Encriptar y guardar
            const encryptedData = this.encryptData(JSON.stringify(allEvents));
            localStorage.setItem(this.config.storageKey, encryptedData);
            
            // Limpiar eventos actuales
            this.currentEvents = [];
            
            console.log(`Guardados ${allEvents.length} eventos de seguimiento`);
        } catch (error) {
            console.error('Error al guardar eventos:', error);
        }
    },
    
    /**
     * Obtiene todos los eventos almacenados
     */
    getAllEvents: function() {
        const encryptedData = localStorage.getItem(this.config.storageKey);
        if (!encryptedData) return [];
        
        try {
            const decryptedData = this.decryptData(encryptedData);
            return JSON.parse(decryptedData);
        } catch (error) {
            console.error('Error al recuperar eventos:', error);
            return [];
        }
    },
    
    /**
     * Encripta datos para mayor seguridad
     */
    encryptData: function(data) {
        // Implementación simple de encriptación usando XOR
        let encrypted = '';
        const key = this.config.encryptionKey;
        
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            encrypted += String.fromCharCode(charCode);
        }
        
        return btoa(encrypted); // Codificar en base64
    },
    
    /**
     * Desencripta datos almacenados
     */
    decryptData: function(encryptedData) {
        const data = atob(encryptedData); // Decodificar base64
        const key = this.config.encryptionKey;
        let decrypted = '';
        
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            decrypted += String.fromCharCode(charCode);
        }
        
        return decrypted;
    },
    
    /**
     * Exporta todos los eventos a formato Excel
     */
    exportToExcel: function() {
        const allEvents = this.getAllEvents();
        
        if (allEvents.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        try {
            // Preparar datos para exportación
            const worksheetData = [
                // Encabezados
                [
                    'Tipo de Evento', 'Fecha y Hora', 'URL', 'Título', 'ID Sesión', 'Dirección IP', 'Correo Electrónico',
                    'Elemento', 'Texto', 'ID', 'Clase', 'Ruta', 'X', 'Y'
                ]
            ];
            
            // Agregar filas de datos
            allEvents.forEach(event => {
                worksheetData.push([
                    event.type,
                    event.timestamp,
                    event.url,
                    event.title || '',
                    event.sessionId,
                    event.ipAddress || '',
                    event.email || '',
                    event.element || '',
                    event.elementText || event.buttonText || '',
                    event.elementId || event.buttonId || event.formId || '',
                    event.elementClass || event.buttonClasses || '',
                    event.path || '',
                    event.x || '',
                    event.y || ''
                ]);
            });
            
            // Crear libro y hoja de trabajo
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro');
            
            // Generar archivo y descargarlo
            XLSX.writeFile(workbook, 'registro_usuarios_salud_curico.xlsx');
            
            console.log(`Exportados ${allEvents.length} eventos a Excel`);
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            alert('Error al exportar datos: ' + error.message);
        }
    },
    
    /**
     * Verifica la contraseña de administrador
     */
    verifyAdminPassword: function(password) {
        return password === this.config.adminPassword;
    },
    
    /**
     * Limpia todos los datos almacenados
     */
    clearAllData: function() {
        if (confirm('¿Estás seguro de que deseas eliminar todos los datos de seguimiento? Esta acción no se puede deshacer.')) {
            localStorage.removeItem(this.config.storageKey);
            this.currentEvents = [];
            alert('Todos los datos han sido eliminados');
        }
    }
};

// Inicializar el sistema de seguimiento cuando se carga la página
document.addEventListener('DOMContentLoaded', () => UserTracker.init());