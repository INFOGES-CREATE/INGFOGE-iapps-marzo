/**
 * Script mejorado para el formulario de contacto y captura obligatoria de correos electrónicos
 * Versión con manejo avanzado de errores y métodos alternativos de registro
 */

const ContactModule = {
    // Configuración
    config: {
        cookieDuration: 30, // Duración en días para recordar al usuario
        cookieName: 'saludCuricoRegistered',
        storageKeyEmail: 'saludCuricoUserRegisteredEmail',
        requiredOnAllPages: true, // Hacer obligatorio en todas las páginas
        debug: true, // Activar mensajes de depuración en la consola
        useAlternativeStorage: true, // Usar métodos alternativos de almacenamiento
    },
    
    // Estado del módulo
    state: {
        formSubmitted: false,
        isRegistered: false,
        errorMessage: '',
        registrationAttempts: 0,
    },
    
    // Función de depuración
    log: function(message) {
        if (this.config.debug) {
            console.log(`[ContactModule] ${message}`);
        }
    },
    
    // Inicializar el módulo
    init: function() {
        this.log('Inicializando módulo de contacto...');
        
        try {
            // Verificar si el usuario ya está registrado
            this.state.isRegistered = this.checkIfRegistered();
            
            // Si está registrado, no mostrar el formulario
            if (this.state.isRegistered) {
                this.log('Usuario ya registrado previamente');
                return;
            }
            
            // Crear el modal
            this.createModal();
            
            // Mostrar inmediatamente el modal obligatorio
            this.showModal();
            
            // Prevenir navegación en enlaces hasta completar registro
            if (this.config.requiredOnAllPages) {
                this.preventNavigation();
            }
            
            this.log('Módulo de contacto inicializado correctamente');
        } catch (error) {
            console.error('[ContactModule] Error crítico al inicializar:', error);
            // Implementar una solución de emergencia
            this.implementEmergencyAccess();
        }
    },
    
    // Crear el modal de contacto
    createModal: function() {
        this.log('Creando modal de registro...');
        
        try {
            // Crear el elemento del modal
            const modalEl = document.createElement('div');
            modalEl.id = 'contactModal';
            modalEl.className = 'contact-modal';
            modalEl.style.display = 'none';
            
            // Contenido HTML del modal
            modalEl.innerHTML = `
                <div class="contact-modal-content">
                    <div class="contact-modal-header">
                        <h3>Registro Requerido</h3>
                    </div>
                    <div class="contact-modal-body">
                        <p>Para acceder al contenido del Portal Estadístico, por favor completa tu registro:</p>
                        <form id="contactForm">
                            <div class="form-group">
                                <label for="contactEmail">Correo electrónico: <span class="required">*</span></label>
                                <input type="email" id="contactEmail" required placeholder="tu.correo@ejemplo.com" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="contactName">Nombre (opcional):</label>
                                <input type="text" id="contactName" placeholder="Tu nombre" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="contactOrganization">Organización (opcional):</label>
                                <input type="text" id="contactOrganization" placeholder="Tu organización" class="form-control">
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="contactConsent" required class="form-check-input">
                                <label for="contactConsent" class="form-check-label">
                                    Acepto recibir información y entiendo que mis datos serán tratados según la política de privacidad.
                                </label>
                            </div>
                            <button type="submit" id="contactSubmit" class="btn-contact-submit">Acceder al Portal</button>
                        </form>
                        <div id="contactSuccess" class="contact-success" style="display: none;">
                            <i class="fas fa-check-circle"></i>
                            <p>¡Gracias por registrarte!</p>
                            <p class="small">Redirigiendo...</p>
                        </div>
                        <div id="contactError" class="contact-error" style="display: none;">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Hubo un problema con el registro.</p>
                            <p class="error-details small"></p>
                            <p class="small">Por favor, intenta nuevamente.</p>
                            <button type="button" id="contactErrorBtn" class="btn-contact-error">Reintentar</button>
                            <button type="button" id="contactAltAccessBtn" class="btn-contact-alt mt-3">Acceso Alternativo</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Estilos CSS para el modal
            const styleEl = document.createElement('style');
            styleEl.textContent = `
                .contact-modal {
                    display: none;
                    position: fixed;
                    z-index: 9999;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                }
                
                .contact-modal.show {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 1;
                }
                
                .contact-modal-content {
                    background: white;
                    margin: 0 auto;
                    max-width: 500px;
                    width: 90%;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    transform: translateY(30px);
                    transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                    overflow: hidden;
                }
                
                .contact-modal.show .contact-modal-content {
                    transform: translateY(0);
                }
                
                .contact-modal-header {
                    background: linear-gradient(135deg, #1DA64A, #0A5D29);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                
                .contact-modal-header h3 {
                    margin: 0;
                    font-size: 1.5rem;
                }
                
                .contact-modal-body {
                    padding: 25px;
                }
                
                .form-group {
                    margin-bottom: 20px;
                }
                
                .form-control {
                    width: 100%;
                    padding: 12px 15px;
                    border: 1px solid #ddd;
                    border-radius: 50px;
                    font-size: 16px;
                    transition: all 0.3s ease;
                }
                
                .form-control:focus {
                    border-color: #1DA64A;
                    box-shadow: 0 0 0 3px rgba(29, 166, 74, 0.2);
                    outline: none;
                }
                
                .form-check {
                    margin: 15px 0 25px;
                    display: flex;
                    align-items: flex-start;
                }
                
                .form-check-input {
                    margin-top: 5px;
                    margin-right: 10px;
                }
                
                .form-check-label {
                    font-size: 14px;
                    line-height: 1.4;
                    color: #555;
                }
                
                .btn-contact-submit {
                    background: linear-gradient(135deg, #1DA64A, #0A5D29);
                    color: white;
                    border: none;
                    border-radius: 50px;
                    padding: 12px 25px;
                    width: 100%;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .btn-contact-submit:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 7px 15px rgba(29, 166, 74, 0.3);
                }
                
                .contact-success {
                    text-align: center;
                    padding: 20px 0 10px;
                }
                
                .contact-success i {
                    font-size: 4rem;
                    color: #1DA64A;
                    margin-bottom: 15px;
                }
                
                .contact-success p {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #333;
                }
                
                .contact-success .small {
                    font-size: 0.9rem;
                    font-weight: normal;
                    color: #666;
                }
                
                .contact-error {
                    text-align: center;
                    padding: 20px 0 10px;
                }
                
                .contact-error i {
                    font-size: 4rem;
                    color: #e74c3c;
                    margin-bottom: 15px;
                }
                
                .contact-error p {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #333;
                }
                
                .contact-error .small {
                    font-size: 0.9rem;
                    font-weight: normal;
                    color: #666;
                    margin-bottom: 15px;
                }
                
                .error-details {
                    color: #e74c3c;
                    font-style: italic;
                }
                
                .btn-contact-error {
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 50px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 150px;
                }
                
                .btn-contact-alt {
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 50px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 150px;
                    margin-top: 10px;
                    display: inline-block;
                }
                
                .mt-3 {
                    margin-top: 15px;
                }
                
                .required {
                    color: #e74c3c;
                }
                
                @media (max-width: 576px) {
                    .contact-modal-content {
                        width: 95%;
                    }
                    
                    .contact-modal-header h3 {
                        font-size: 1.3rem;
                    }
                }
                
                /* Estilos para el overlay de carga de página */
                .page-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.8);
                    backdrop-filter: blur(5px);
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                }
                
                .page-overlay.active {
                    opacity: 1;
                    pointer-events: all;
                }
                
                .page-overlay-content {
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                
                .page-overlay h3 {
                    color: #333;
                    margin-bottom: 15px;
                }
                
                .page-overlay p {
                    color: #666;
                    margin-bottom: 20px;
                }
            `;
            
            // Añadir elementos al DOM
            document.head.appendChild(styleEl);
            document.body.appendChild(modalEl);
            
            // Configurar manejadores de eventos para el modal
            this.setupModalEvents();
            
            this.log('Modal creado correctamente');
        } catch (error) {
            console.error('[ContactModule] Error al crear el modal:', error);
            // Implementar una solución de emergencia
            this.implementEmergencyAccess();
        }
    },
    
    // Configurar eventos para el modal
    setupModalEvents: function() {
        this.log('Configurando eventos del modal...');
        
        try {
            // Referencia al modal
            const modal = document.getElementById('contactModal');
            if (!modal) {
                throw new Error('No se encontró el elemento modal en el DOM');
            }
            
            const form = document.getElementById('contactForm');
            if (!form) {
                throw new Error('No se encontró el formulario en el DOM');
            }
            
            // Botón de error
            const errorBtn = document.getElementById('contactErrorBtn');
            if (errorBtn) {
                errorBtn.addEventListener('click', () => {
                    document.getElementById('contactError').style.display = 'none';
                    form.style.display = 'block';
                    form.reset(); // Reiniciar el formulario para una nueva entrada
                });
            }
            
            // Botón de acceso alternativo
            const altAccessBtn = document.getElementById('contactAltAccessBtn');
            if (altAccessBtn) {
                altAccessBtn.addEventListener('click', () => {
                    this.log('Usando método alternativo de acceso');
                    this.useAlternativeAccess();
                });
            }
            
            // Evento de envío del formulario - Usando un enfoque diferente con addEventListener
            if (form) {
                // Primero, limpiar cualquier evento previo para evitar duplicados
                const newForm = form.cloneNode(true);
                if (form.parentNode) {
                    form.parentNode.replaceChild(newForm, form);
                }
                
                // Ahora agregar el evento al nuevo formulario
                newForm.addEventListener('submit', this.handleFormSubmit.bind(this));
                
                // También agregar evento directamente al botón como respaldo
                const submitButton = document.getElementById('contactSubmit');
                if (submitButton) {
                    submitButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleFormSubmit(new Event('submit'));
                    });
                }
            }
            
            this.log('Eventos configurados correctamente');
        } catch (error) {
            console.error('[ContactModule] Error al configurar eventos:', error);
            this.showError('Error al configurar eventos: ' + error.message);
        }
    },
    
    // Manejar el envío del formulario separado como método
    handleFormSubmit: function(e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        this.log('Procesando envío del formulario...');
        this.state.registrationAttempts++;
        
        try {
            // Obtener referencias a los elementos
            const form = document.getElementById('contactForm');
            const emailField = document.getElementById('contactEmail');
            const nameField = document.getElementById('contactName');
            const orgField = document.getElementById('contactOrganization');
            const consentField = document.getElementById('contactConsent');
            
            if (!emailField) {
                throw new Error('Campo de correo no encontrado');
            }
            
            // Obtener valores de los campos
            const email = emailField.value.trim();
            const name = nameField ? nameField.value.trim() : '';
            const organization = orgField ? orgField.value.trim() : '';
            
            this.log(`Valores del formulario - Email: ${email}, Nombre: ${name}, Org: ${organization}`);
            
            // Verificar consentimiento
            if (consentField && !consentField.checked) {
                this.log('Error: Consentimiento no marcado');
                alert('Debes aceptar los términos para continuar');
                return;
            }
            
            // Validar correo (implementación directa para evitar dependencias)
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                this.log('Error: Email inválido');
                alert('Por favor, ingresa un correo electrónico válido');
                return;
            }
            
            this.log('Datos del formulario válidos, procediendo con registro');
            
            // Registrar directamente sin depender de UserTracker
            this.directRegisterUser(email, name, organization);
            
            // Ocultar formulario y mostrar éxito
            if (form) form.style.display = 'none';
            const successEl = document.getElementById('contactSuccess');
            if (successEl) successEl.style.display = 'block';
            
            // También intentar registrar en UserTracker si está disponible
            this.tryUserTrackerRegistration(email, name, organization);
            
            // Permitir acceso después de un breve retraso
            this.log('Permitiendo acceso en 2 segundos...');
            setTimeout(() => {
                this.completeRegistration();
            }, 2000);
            
        } catch (error) {
            console.error('[ContactModule] Error al procesar el formulario:', error);
            this.showError('Error al procesar registro: ' + error.message);
        }
    },
    
    // Registrar al usuario directamente (sin depender de UserTracker)
    directRegisterUser: function(email, name, organization) {
        this.log('Registrando usuario directamente...');
        
        try {
            // Usar múltiples métodos de almacenamiento para mayor seguridad
            
            // 1. Almacenamiento en cookie
            this.setCookie();
            
            // 2. LocalStorage directo (sin encriptar)
            localStorage.setItem(this.config.storageKeyEmail, email);
            localStorage.setItem('saludCuricoUserName', name || '');
            localStorage.setItem('saludCuricoUserOrg', organization || '');
            
            // 3. SessionStorage como respaldo
            sessionStorage.setItem(this.config.storageKeyEmail, email);
            
            // 4. Si está disponible, usar también indexedDB
            if (window.indexedDB && this.config.useAlternativeStorage) {
                this.storeInIndexedDB(email, name, organization);
            }
            
            // Actualizar estado
            this.state.isRegistered = true;
            this.state.formSubmitted = true;
            
            this.log('Usuario registrado directamente con éxito');
            return true;
        } catch (error) {
            console.error('[ContactModule] Error al registrar usuario directamente:', error);
            // A pesar del error, intentaremos establecer al menos la cookie
            try {
                this.setCookie();
            } catch (e) {
                console.error('[ContactModule] Error incluso al establecer cookie:', e);
            }
            return false;
        }
    },
    
    // Intenta registrar en UserTracker si está disponible
    tryUserTrackerRegistration: function(email, name, organization) {
        this.log('Intentando registrar en UserTracker...');
        
        try {
            // Verificar si UserTracker y sus métodos están disponibles
            if (typeof UserTracker !== 'undefined') {
                
                // Guardar email en UserTracker si el método está disponible
                if (typeof UserTracker.setUserEmail === 'function') {
                    UserTracker.setUserEmail(email);
                    this.log('Email guardado en UserTracker');
                } else {
                    this.log('Método UserTracker.setUserEmail no disponible');
                    
                    // Intento de asignación directa como alternativa
                    if (UserTracker.userData) {
                        UserTracker.userData.email = email;
                        this.log('Email asignado directamente a UserTracker.userData');
                    }
                }
                
                // Registrar evento si los métodos necesarios están disponibles
                if (typeof UserTracker.currentEvents !== 'undefined') {
                    const event = {
                        type: 'registration',
                        timestamp: new Date().toISOString(),
                        email: email,
                        name: name || '',
                        organization: organization || '',
                        url: window.location.href,
                        sessionId: UserTracker.userData ? UserTracker.userData.sessionId : 'unknown',
                        ipAddress: UserTracker.userData ? UserTracker.userData.ipAddress : 'unknown'
                    };
                    
                    UserTracker.currentEvents.push(event);
                    
                    if (typeof UserTracker.saveEvents === 'function') {
                        UserTracker.saveEvents();
                        this.log('Evento de registro guardado en UserTracker');
                    }
                }
                
                return true;
            } else {
                this.log('UserTracker no está definido');
                return false;
            }
        } catch (error) {
            console.error('[ContactModule] Error al registrar en UserTracker:', error);
            return false;
        }
    },
    
    // Completar el proceso de registro y permitir acceso
    completeRegistration: function() {
        this.log('Completando registro y permitiendo acceso...');
        
        try {
            // Cerrar modal y permitir el acceso
            this.hideModal();
            this.enableNavigation();
            
            // Actualizar la página si es necesario
            if (window.location.href.includes('#registration')) {
                window.location.href = window.location.href.replace('#registration', '');
            }
            
            this.log('Acceso permitido - navegación habilitada');
        } catch (error) {
            console.error('[ContactModule] Error al completar registro:', error);
            // Incluso en caso de error, intentar habilitar navegación
            this.enableNavigationEmergency();
        }
    },
    
    // Almacenar en IndexedDB como método alternativo
    storeInIndexedDB: function(email, name, organization) {
        this.log('Intentando almacenar en IndexedDB...');
        
        // Solo si IndexedDB está disponible
        if (!window.indexedDB) {
            this.log('IndexedDB no está disponible');
            return false;
        }
        
        try {
            const request = indexedDB.open("saludCuricoUserDB", 1);
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('usuarios')) {
                    db.createObjectStore('usuarios', { keyPath: 'email' });
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['usuarios'], 'readwrite');
                const store = transaction.objectStore('usuarios');
                
                // Datos de usuario para almacenar
                const userData = {
                    email: email,
                    name: name || '',
                    organization: organization || '',
                    timestamp: new Date().toISOString(),
                    registered: true
                };
                
                const saveRequest = store.put(userData);
                
                saveRequest.onsuccess = () => {
                    this.log('Datos guardados en IndexedDB');
                };
                
                saveRequest.onerror = (e) => {
                    console.error('[ContactModule] Error al guardar en IndexedDB:', e);
                };
            };
            
            request.onerror = (event) => {
                console.error('[ContactModule] Error al abrir IndexedDB:', event);
            };
            
            return true;
        } catch (error) {
            console.error('[ContactModule] Error con IndexedDB:', error);
            return false;
        }
    },
    
    // Mostrar mensaje de error
    showError: function(message) {
        this.log('Mostrando error: ' + message);
        
        try {
            const form = document.getElementById('contactForm');
            const errorEl = document.getElementById('contactError');
            const errorDetailsEl = errorEl ? errorEl.querySelector('.error-details') : null;
            
            // Guardar mensaje de error
            this.state.errorMessage = message;
            
            // Mostrar detalles del error si está en modo debug
            if (errorDetailsEl && this.config.debug) {
                errorDetailsEl.textContent = message;
            }
            
            // Ocultar formulario y mostrar error
            if (form) form.style.display = 'none';
            if (errorEl) errorEl.style.display = 'block';
            
            // Si hay demasiados intentos, mostrar acceso alternativo
            if (this.state.registrationAttempts >= 3) {
                this.log('Múltiples intentos fallidos, ofreciendo acceso alternativo');
                const altBtn = document.getElementById('contactAltAccessBtn');
                if (altBtn) altBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error('[ContactModule] Error al mostrar mensaje de error:', error);
            // Último recurso: mostrar alerta
            alert('Error en el registro: ' + message);
        }
    },
    
    // Método de acceso alternativo cuando fallan los métodos principales
    useAlternativeAccess: function() {
        this.log('Usando método alternativo de acceso');
        
        try {
            // Registrar con un correo genérico temporal
            const tempEmail = 'visitante_temporal@' + window.location.hostname;
            
            // Forzar registro con email temporal
            this.directRegisterUser(tempEmail, 'Visitante Temporal', '');
            
            // Completar registro
            this.completeRegistration();
            
            // Mensaje informativo
            alert('Acceso temporal concedido. Por favor, complete el registro en su próxima visita.');
        } catch (error) {
            console.error('[ContactModule] Error en acceso alternativo:', error);
            // Solución de emergencia final
            this.implementEmergencyAccess();
        }
    },
    
    // Solución de emergencia cuando todo lo demás falla
    implementEmergencyAccess: function() {
        this.log('Implementando acceso de emergencia...');
        
        try {
            // Establecer cookie de emergencia
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 1); // Solo 1 día
            document.cookie = `saludCuricoEmergencyAccess=true; expires=${expiryDate.toUTCString()}; path=/`;
            
            // Forzar rehabilitación de navegación
            this.enableNavigationEmergency();
            
            // Mensaje de advertencia
            console.warn('[ContactModule] Acceso de emergencia activado debido a errores críticos en el sistema de registro');
            
            // Recargar la página para aplicar cambios si es necesario
            if (document.getElementById('contactModal')) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            console.error('[ContactModule] Error incluso en acceso de emergencia:', error);
            // Último recurso: recargar la página sin el módulo
            window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'bypassRegistration=true';
        }
    },
    
    // Habilitar navegación de emergencia
    enableNavigationEmergency: function() {
        this.log('Habilitando navegación de emergencia...');
        
        try {
            // 1. Intentar el método normal
            this.enableNavigation();
            
            // 2. Método alternativo directo con JavaScript
            document.querySelectorAll('a').forEach(link => {
                if (link.hasAttribute('data-original-href')) {
                    const originalHref = link.getAttribute('data-original-href');
                    if (originalHref && originalHref !== 'null' && originalHref !== 'undefined' && originalHref !== '#') {
                        link.setAttribute('href', originalHref);
                        link.onclick = null; // Eliminar cualquier controlador de eventos
                    }
                }
            });
            
            // 3. Eliminar cualquier overlay
            const overlay = document.getElementById('pageOverlay');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            
            // 4. Ocultar el modal
            const modal = document.getElementById('contactModal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            this.log('Navegación de emergencia habilitada');
        } catch (error) {
            console.error('[ContactModule] Error al habilitar navegación de emergencia:', error);
        }
    },
    
    // Prever la navegación hasta completar registro
    preventNavigation: function() {
        this.log('Previniendo navegación hasta completar registro...');
        
        try {
            // Verificar si hay acceso de emergencia
            if (document.cookie.indexOf('saludCuricoEmergencyAccess=true') >= 0) {
                this.log('Acceso de emergencia detectado, no se previene navegación');
                return;
            }
            
            // Verificar parámetro de bypass
            if (window.location.href.includes('bypassRegistration=true')) {
                this.log('Parámetro de bypass detectado, no se previene navegación');
                return;
            }
            
            // Bloquear todos los enlaces de la página
            document.querySelectorAll('a').forEach(link => {
                // Guardar href original solo si no tiene ya uno guardado
                if (!link.hasAttribute('data-original-href')) {
                    link.setAttribute('data-original-href', link.getAttribute('href') || '#');
                }
                
                // Configurar evento y href
                link.addEventListener('click', this.handleLinkClick.bind(this));
                link.setAttribute('href', 'javascript:void(0)');
            });
            
            // Prevenir envío de formularios
            document.querySelectorAll('form').forEach(form => {
                if (form.id !== 'contactForm') {
                    form.addEventListener('submit', this.handleFormSubmit.bind(this));
                }
            });
            
            // Crear overlay solo si no existe ya
            if (!document.getElementById('pageOverlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'pageOverlay';
                overlay.className = 'page-overlay';
                overlay.innerHTML = `
                    <div class="page-overlay-content">
                        <h3>Registro Requerido</h3>
                        <p>Para acceder al contenido, debe registrarse primero.</p>
                        <button id="registerNowBtn" class="btn-contact-submit">Registrarse Ahora</button>
                    </div>
                `;
                document.body.appendChild(overlay);
                
                // Configurar botón de registro
                const registerBtn = document.getElementById('registerNowBtn');
                if (registerBtn) {
                    registerBtn.addEventListener('click', () => {
                        const overlayEl = document.getElementById('pageOverlay');
                        if (overlayEl) overlayEl.classList.remove('active');
                        this.showModal();
                    });
                }
            }
            
            this.log('Navegación prevenida correctamente');
        } catch (error) {
            console.error('[ContactModule] Error al prevenir navegación:', error);
        }
    },
    
    // Habilitar navegación después del registro
    enableNavigation: function() {
        this.log('Habilitando navegación...');
        
        try {
            // Restaurar todos los enlaces
            document.querySelectorAll('a').forEach(link => {
                const originalHref = link.getAttribute('data-original-href');
                if (originalHref && originalHref !== 'null' && originalHref !== 'undefined') {
                    link.setAttribute('href', originalHref);
                }
                
                // Eliminar el listener de eventos
                link.removeEventListener('click', this.handleLinkClick);
            });
            
            // Permitir envío de formularios
            document.querySelectorAll('form').forEach(form => {
                if (form.id !== 'contactForm') {
                    form.removeEventListener('submit', this.handleFormSubmit);
                }
            });
            
            this.log('Navegación habilitada correctamente');
        } catch (error) {
            console.error('[ContactModule] Error al habilitar navegación:', error);
        }
    },
    
    // Manejar clic en enlaces cuando no está registrado
    handleLinkClick: function(e) {
        e.preventDefault();
        
        try {
            // Mostrar overlay
            const overlay = document.getElementById('pageOverlay');
            if (overlay) {
                overlay.classList.add('active');
            }
        } catch (error) {
            console.error('[ContactModule] Error al manejar clic en enlace:', error);
        }
        
        return false;
    },
    
    // Manejar envío de formularios cuando no está registrado
    handleFormSubmit: function(e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        try {
            // Si es el formulario de contacto, procesarlo
            if (e && e.target && e.target.id === 'contactForm') {
                this.log('Procesando envío del formulario de contacto');
                return this.processContactForm(e);
            }
            
            // Para otros formularios, mostrar overlay
            const overlay = document.getElementById('pageOverlay');
            if (overlay) {
                overlay.classList.add('active');
            }
        } catch (error) {
            console.error('[ContactModule] Error al manejar envío de formulario:', error);
        }
        
        return false;
    },
    
    // Procesar específicamente el formulario de contacto
    processContactForm: function(e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        this.log('Procesando formulario de contacto directamente');
        
        // Lógica específica del formulario de contacto
        try {
            // Obtener referencias a los elementos
            const form = document.getElementById('contactForm');
            const emailField = document.getElementById('contactEmail');
            const nameField = document.getElementById('contactName');
            const orgField = document.getElementById('contactOrganization');
            const consentField = document.getElementById('contactConsent');
            
            if (!emailField) {
                throw new Error('Campo de correo no encontrado');
            }
            
            // Obtener valores de los campos
            const email = emailField.value.trim();
            const name = nameField ? nameField.value.trim() : '';
            const organization = orgField ? orgField.value.trim() : '';
            
            // Verificar consentimiento
            if (consentField && !consentField.checked) {
                alert('Debes aceptar los términos para continuar');
                return false;
            }
            
            // Validar correo (implementación directa para evitar dependencias)
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('Por favor, ingresa un correo electrónico válido');
                return false;
            }
            
            // Registrar directamente sin depender de UserTracker
            this.directRegisterUser(email, name, organization);
            
            // Ocultar formulario y mostrar éxito
            form.style.display = 'none';
            const successEl = document.getElementById('contactSuccess');
            if (successEl) successEl.style.display = 'block';
            
            // También intentar registrar en UserTracker si está disponible
            this.tryUserTrackerRegistration(email, name, organization);
            
            // Permitir acceso después de un breve retraso
            setTimeout(() => {
                this.completeRegistration();
            }, 2000);
            
            return true;
        } catch (error) {
            console.error('[ContactModule] Error al procesar formulario de contacto:', error);
            this.showError('Error al procesar formulario: ' + error.message);
            return false;
        }
    },
    
    // Mostrar el modal
    showModal: function() {
        this.log('Mostrando modal...');
        
        try {
            // Mostrar el modal
            const modal = document.getElementById('contactModal');
            if (!modal) {
                throw new Error('Elemento modal no encontrado');
            }
            
            modal.style.display = 'flex';
            
            // Activar la transición después de un breve retraso
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            this.log('Modal mostrado correctamente');
        } catch (error) {
            console.error('[ContactModule] Error al mostrar modal:', error);
        }
    },
    
    // Ocultar el modal
    hideModal: function() {
        this.log('Ocultando modal...');
        
        try {
            const modal = document.getElementById('contactModal');
            if (!modal) {
                throw new Error('Elemento modal no encontrado');
            }
            
            modal.classList.remove('show');
            
            // Quitar el modal del DOM después de la transición
            setTimeout(() => {
                modal.style.display = 'none';
            }, 400);
            
            this.log('Modal ocultado correctamente');
        } catch (error) {
            console.error('[ContactModule] Error al ocultar modal:', error);
        }
    },
    
    // Verificar si el usuario ya está registrado
    checkIfRegistered: function() {
        this.log('Verificando si el usuario está registrado...');
        
        try {
            // Verificar parámetro de bypass
            if (window.location.href.includes('bypassRegistration=true')) {
                this.log('Bypass de registro detectado en URL');
                return true;
            }
            
            // Verificar acceso de emergencia
            if (document.cookie.indexOf('saludCuricoEmergencyAccess=true') >= 0) {
                this.log('Acceso de emergencia detectado');
                return true;
            }
            
            // Verificar cookie
            const hasCookie = this.getCookie();
            if (hasCookie) {
                this.log('Cookie de registro encontrada');
                return true;
            }
            
            // Verificar localstorage directo
            const storedEmail = localStorage.getItem(this.config.storageKeyEmail);
            if (storedEmail) {
                this.log('Email encontrado en localStorage');
                
                // Actualizar datos de usuario si UserTracker está disponible
                if (typeof UserTracker !== 'undefined' && UserTracker.userData) {
                    UserTracker.userData.email = storedEmail;
                }
                
                return true;
            }
            
            // Verificar sessionStorage
            const sessionEmail = sessionStorage.getItem(this.config.storageKeyEmail);
            if (sessionEmail) {
                this.log('Email encontrado en sessionStorage');
                return true;
            }
            
            // Verificar IndexedDB si está habilitado
            if (window.indexedDB && this.config.useAlternativeStorage) {
                // Solo verificamos si existe la base de datos
                // Una verificación completa sería asíncrona y complicaría el código
                const dbs = indexedDB.databases ? indexedDB.databases() : null;
                if (dbs && dbs.some(db => db.name === "saludCuricoUserDB")) {
                    this.log('Base de datos IndexedDB encontrada');
                    return true;
                }
            }
            
            this.log('Usuario no registrado');
            return false;
        } catch (error) {
            console.error('[ContactModule] Error al verificar registro:', error);
            // En caso de error, ser permisivo para no bloquear al usuario
            return true;
        }
    },
    
    // Establecer cookie de registro
    setCookie: function() {
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + this.config.cookieDuration);
            document.cookie = `${this.config.cookieName}=true; expires=${expiryDate.toUTCString()}; path=/`;
            this.log('Cookie establecida correctamente');
        } catch (error) {
            console.error('[ContactModule] Error al establecer cookie:', error);
        }
    },
    
    // Verificar cookie de registro
    getCookie: function() {
        try {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.indexOf(this.config.cookieName + '=') === 0) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('[ContactModule] Error al verificar cookie:', error);
            return false;
        }
    }
};

// Inicializar el módulo cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar con un pequeño retraso para permitir que se cargue todo
    setTimeout(() => {
        ContactModule.init();
    }, 500);
});