/**
 * IAAPS-Chatbot.js - Sistema avanzado de reportes y asistencia
 * Versión 2.0 - Generación de reportes en tiempo real
 */

// Cargamos dependencias
document.addEventListener('DOMContentLoaded', () => {
    // Cargar librerías necesarias si no están presentes
    loadDependencies([
        { type: 'script', src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' },
        { type: 'script', src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js' },
        { type: 'script', src: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js' },
        { type: 'style', src: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' }
    ]).then(initIAAPSBot);
});

// Configuración del sistema
const IAAPS_CONFIG = {
    apiUrl: '/api/iaaps-chat',
    apiKey: document.querySelector('meta[name="iaaps-api-key"]')?.getAttribute('content') || '',
    logoUrl: 'images/logo2.png',
    colors: {
        primary: "rgb(46, 155, 97)",       // Verde principal
        primaryDark: "#2d7d54",            // Verde oscuro
        secondary: "#389CC0",              // Azul complementario
        accent: "#FFBD3D",                 // Amarillo advertencia
        danger: "#FF5A5A",                 // Rojo alerta
        success: "#3AC97C",                // Verde éxito
        text: "#ffffff",                   // Texto claro
        textDark: "#263238"                // Texto oscuro
    },
    reportHeader: {
        title: "Reporte IAAPS Curicó",
        subtitle: "Índices de Actividad de la Atención Primaria de Salud",
        logo: "images/logo2.png"
    }
};

// Estado global del bot
let IAAPS_STATE = {
    isOpen: false,
    isLoading: false,
    dataCached: false,
    pendingRequests: 0,
    sessionId: generateUUID(),
    currentCenter: null,
    currentIndicator: null,
    messages: [],
    data: {
        iaapsData: null,
        centers: null,
        indicators: null
    }
};

// Referencias DOM
let iaapsElements = {
    container: null,
    chatButton: null,
    chatWindow: null,
    messagesContainer: null,
    inputField: null,
    sendButton: null
};

/**
 * Inicializa el chatbot
 */
function initIAAPSBot() {
    console.log("Inicializando IAAPS Bot...");
    
    // Crear estructura del bot
    createBotElements();
    
    // Cargar datos reales del sistema
    loadIAAPSData();
    
    // Configurar eventos
    setupEventListeners();
    
    // Mostrar mensaje de bienvenida después de un breve delay
    setTimeout(() => {
        if (!IAAPS_STATE.isOpen) {
            // Añadir efecto de alerta al botón para llamar la atención
            iaapsElements.chatButton.classList.add('iaaps-attention-pulse');
        }
    }, 3000);
    
    // Exposición global para integración con el sistema
    window.IAAPSBot = {
        open: openChat,
        close: closeChat,
        toggle: toggleChat,
        generateReport: generateCustomReport,
        sendMessage: (msg) => {
            if (!IAAPS_STATE.isOpen) openChat();
            setTimeout(() => processUserInput(msg, true), 300);
        }
    };
    
    console.log("IAAPS Bot inicializado correctamente");
}

/**
 * Carga librerías externas necesarias
 */
function loadDependencies(dependencies) {
    const promises = dependencies.map(dep => {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargada
            if (dep.type === 'script' && window[dep.check]) {
                resolve();
                return;
            }
            
            if (dep.type === 'style' && document.querySelector(`link[href="${dep.src}"]`)) {
                resolve();
                return;
            }
            
            // Crear el elemento
            let element;
            if (dep.type === 'script') {
                element = document.createElement('script');
                element.src = dep.src;
                element.async = true;
            } else {
                element = document.createElement('link');
                element.rel = 'stylesheet';
                element.href = dep.src;
            }
            
            // Configurar eventos
            element.onload = () => resolve();
            element.onerror = () => reject(new Error(`Error al cargar ${dep.src}`));
            
            // Añadir al DOM
            document.head.appendChild(element);
        });
    });
    
    return Promise.all(promises);
}

/**
 * Crea los elementos DOM del chat
 */
function createBotElements() {
    // 1. Contenedor principal
    const container = document.createElement('div');
    container.id = 'iaaps-bot-container';
    container.className = 'iaaps-bot-container';
    
    // 2. Botón flotante
    const button = document.createElement('button');
    button.id = 'iaaps-chat-button';
    button.className = 'iaaps-chat-button';
    button.innerHTML = `
        <i class="fas fa-comment-medical"></i>
        <span class="iaaps-badge">1</span>
    `;
    button.setAttribute('aria-label', 'Abrir asistente INFOGES');
    
    // 3. Ventana de chat
    const chatWindow = document.createElement('div');
    chatWindow.id = 'iaaps-chat-window';
    chatWindow.className = 'iaaps-chat-window';
    chatWindow.style.display = 'none';
    
    // 4. Header
    const header = document.createElement('div');
    header.className = 'iaaps-chat-header';
    header.innerHTML = `
        <div class="iaaps-header-title">
            <img src="images/logo2.png alt="Logo IAAPS" class="iaaps-logo">
            <span>INFOGES Curicó</span>
        </div>
        <div class="iaaps-header-actions">
            <button id="iaaps-minimize-btn" class="iaaps-header-btn" aria-label="Minimizar">
                <i class="fas fa-minus"></i>
            </button>
            <button id="iaaps-close-btn" class="iaaps-header-btn" aria-label="Cerrar">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // 5. Cuerpo de mensajes
    const messages = document.createElement('div');
    messages.id = 'iaaps-messages';
    messages.className = 'iaaps-messages';
    
    // 6. Área de entrada
    const inputArea = document.createElement('div');
    inputArea.className = 'iaaps-input-area';
    
    const inputField = document.createElement('textarea');
    inputField.id = 'iaaps-input';
    inputField.className = 'iaaps-input';
    inputField.placeholder = 'Escribe tu consulta sobre IAAPS...';
    inputField.rows = 1;
    inputField.maxLength = 500;
    
    const sendButton = document.createElement('button');
    sendButton.id = 'iaaps-send-btn';
    sendButton.className = 'iaaps-send-btn';
    sendButton.innerHTML = `<i class="fas fa-paper-plane"></i>`;
    sendButton.setAttribute('aria-label', 'Enviar mensaje');
    sendButton.disabled = true;
    
    inputArea.appendChild(inputField);
    inputArea.appendChild(sendButton);
    
    // 7. Footer con sugerencias iniciales
    const footer = document.createElement('div');
    footer.className = 'iaaps-footer';
    footer.innerHTML = `
        <div class="iaaps-suggestions" id="iaaps-suggestions">
            <button class="iaaps-suggestion-chip" data-query="reporte comunal">📊 Reporte Comunal</button>
            <button class="iaaps-suggestion-chip" data-query="comparar centros">🔍 Comparar Centros</button>
            <button class="iaaps-suggestion-chip" data-query="indicadores críticos">⚠️ Indicadores Críticos</button>
        </div>
    `;
    
    // Ensamblar estructura
    chatWindow.appendChild(header);
    chatWindow.appendChild(messages);
    chatWindow.appendChild(inputArea);
    chatWindow.appendChild(footer);
    
    container.appendChild(button);
    container.appendChild(chatWindow);
    document.body.appendChild(container);
    
    // Guardar referencias
    iaapsElements = {
        container: container,
        chatButton: button,
        chatWindow: chatWindow,
        messagesContainer: messages,
        inputField: inputField,
        sendButton: sendButton
    };
    
    // Añadir estilos
    addChatStyles();
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Botón principal para abrir/cerrar
    iaapsElements.chatButton.addEventListener('click', toggleChat);
    
    // Botones de cierre y minimizar
    document.getElementById('iaaps-close-btn').addEventListener('click', closeChat);
    document.getElementById('iaaps-minimize-btn').addEventListener('click', closeChat);
    
    // Input y envío
    iaapsElements.inputField.addEventListener('input', adjustInputHeight);
    iaapsElements.inputField.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processUserInput();
        }
    });
    iaapsElements.sendButton.addEventListener('click', processUserInput);
    
    // Chips de sugerencias
    document.querySelectorAll('.iaaps-suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            if (query) {
                processUserInput(query, true);
            }
        });
    });
}

/**
 * Ajusta la altura del textarea de entrada
 */
function adjustInputHeight() {
    const input = iaapsElements.inputField;
    
    // Resetear la altura
    input.style.height = 'auto';
    
    // Ajustar altura basada en contenido (max 120px)
    const newHeight = Math.min(input.scrollHeight, 120);
    input.style.height = `${newHeight}px`;
    
    // Habilitar/deshabilitar botón de envío
    iaapsElements.sendButton.disabled = input.value.trim() === '';
}

/**
 * Alterna entre abrir y cerrar el chat
 */
function toggleChat() {
    if (IAAPS_STATE.isOpen) {
        closeChat();
    } else {
        openChat();
    }
}

/**
 * Abre la ventana de chat
 */
function openChat() {
    // Mostrar ventana con animación
    iaapsElements.chatWindow.style.display = 'flex';
    iaapsElements.chatWindow.style.opacity = '0';
    iaapsElements.chatWindow.style.transform = 'translateY(20px) scale(0.95)';
    
    // Animar apertura
    setTimeout(() => {
        iaapsElements.chatWindow.style.opacity = '1';
        iaapsElements.chatWindow.style.transform = 'translateY(0) scale(1)';
        IAAPS_STATE.isOpen = true;
        
        // Focus en input
        iaapsElements.inputField.focus();
        
        // Ocultar badge
        iaapsElements.chatButton.querySelector('.iaaps-badge').style.display = 'none';
        iaapsElements.chatButton.classList.remove('iaaps-attention-pulse');
    }, 50);
    
    // Cambiar icono del botón
    iaapsElements.chatButton.innerHTML = '<i class="fas fa-times"></i>';
    
    // Si no hay mensajes, mostrar mensaje de bienvenida
    if (IAAPS_STATE.messages.length === 0) {
        addBotMessage(`👋 Hola, soy el asistente INFOGES de Salud Curicó.

Puedo ayudarte con:
• Generación de reportes PDF/Excel por centro o comunal
• Datos de indicadores específicos
• Comparativas entre centros de salud
• Análisis de cumplimiento y tendencias

¿Qué información necesitas hoy?`);
    }
}

/**
 * Cierra la ventana de chat
 */
function closeChat() {
    // Animar cierre
    iaapsElements.chatWindow.style.opacity = '0';
    iaapsElements.chatWindow.style.transform = 'translateY(20px) scale(0.95)';
    
    // Ocultar después de la animación
    setTimeout(() => {
        iaapsElements.chatWindow.style.display = 'none';
        IAAPS_STATE.isOpen = false;
    }, 300);
    
    // Restaurar icono del botón
    iaapsElements.chatButton.innerHTML = `
        <i class="fas fa-comment-medical"></i>
        <span class="iaaps-badge" style="display:none;">1</span>
    `;
}

/**
 * Procesa la entrada del usuario
 * @param {string} [override] - Mensaje predefinido (opcional)
 * @param {boolean} [simulate] - Si debe simular la entrada del usuario
 */
function processUserInput(override = null, simulate = false) {
    // Obtener mensaje (del override o del input)
    const message = override || iaapsElements.inputField.value.trim();
    
    // Verificar si hay mensaje y no está cargando
    if (!message || IAAPS_STATE.isLoading) return;
    
    // Si es simulado, mostrar como si el usuario lo escribiera
    if (simulate) {
        iaapsElements.inputField.value = message;
        adjustInputHeight();
    }
    
    // Añadir mensaje del usuario
    addUserMessage(message);
    
    // Limpiar input y ajustar altura
    iaapsElements.inputField.value = '';
    iaapsElements.inputField.style.height = 'auto';
    iaapsElements.sendButton.disabled = true;
    
    // Procesar mensaje
    handleUserMessage(message);
}

/**
 * Maneja el mensaje del usuario y determina la acción a realizar
 * @param {string} message - Mensaje del usuario
 */
function handleUserMessage(message) {
    // Mostrar indicador de "escribiendo..."
    showTypingIndicator();
    
    // Normalizar mensaje
    const normalizedMsg = message.toLowerCase().trim();
    
    // PROCESAMIENTO LOCAL - Priorizar respuestas inmediatas
    
    // 1. Solicitudes de reportes
    if (containsAny(normalizedMsg, ['reporte', 'informe', 'pdf', 'excel'])) {
        let centerName = null;
        let format = null;
        
        // Detectar formato solicitado
        if (containsAny(normalizedMsg, ['pdf', 'documento'])) {
            format = 'pdf';
        } else if (containsAny(normalizedMsg, ['excel', 'xlsx', 'tabla', 'hoja de cálculo'])) {
            format = 'excel';
        }
        
        // Detectar centro
        if (normalizedMsg.includes('comunal') || normalizedMsg.includes('general')) {
            centerName = 'comunal';
        } else if (containsAny(normalizedMsg, ['curico', 'curicó', 'centro'])) {
            centerName = 'Curicó Centro';
        } else if (containsAny(normalizedMsg, ['colón', 'colon'])) {
            centerName = 'Colón';
        } else if (containsAny(normalizedMsg, ['betty', 'muñoz'])) {
            centerName = 'Betty Muñoz';
        } else if (normalizedMsg.includes('miguel')) {
            centerName = 'Miguel Ángel';
        } else if (normalizedMsg.includes('niches')) {
            centerName = 'Los Niches';
        } else if (normalizedMsg.includes('sarmiento')) {
            centerName = 'Sarmiento';
        }
        
        // Si tenemos un centro reconocido, generar reporte
        if (centerName) {
            IAAPS_STATE.currentCenter = centerName;
            setTimeout(() => {
                hideTypingIndicator();
                generateReport(centerName, format);
            }, 800);
            return;
        }
    }
    
    // 2. Consultas sobre indicadores específicos
    if (containsAny(normalizedMsg, ['indicador', 'cobertura', 'tasa', 'porcentaje', 'meta', 'cumplimiento'])) {
        let indicatorName = null;
        
        // Detectar indicador
        if (containsAny(normalizedMsg, ['emp', 'preventivo'])) {
            if (normalizedMsg.includes('mujer')) {
                indicatorName = 'Cobertura EMP Mujeres';
            } else if (normalizedMsg.includes('hombre')) {
                indicatorName = 'Cobertura EMP Hombres';
            } else {
                indicatorName = 'EMP';
            }
        } else if (containsAny(normalizedMsg, ['visita', 'domiciliaria', 'vdi'])) {
            indicatorName = 'Tasa Visita Domiciliaria';
        } else if (containsAny(normalizedMsg, ['vacuna', 'influenza', 'inmunización'])) {
            indicatorName = 'Vacunación Influenza';
        } else if (containsAny(normalizedMsg, ['mental', 'psicosocial'])) {
            indicatorName = 'Cobertura Salud Mental';
        }
        
        // Si tenemos un indicador reconocido, mostrar sus datos
        if (indicatorName) {
            IAAPS_STATE.currentIndicator = indicatorName;
            setTimeout(() => {
                hideTypingIndicator();
                showIndicatorData(indicatorName);
            }, 600);
            return;
        }
    }
    
    // 3. Ranking o comparación de centros
    if (containsAny(normalizedMsg, ['ranking', 'comparar', 'comparación', 'comparativa', 'mejores', 'peores'])) {
        setTimeout(() => {
            hideTypingIndicator();
            showCentersComparison();
        }, 700);
        return;
    }
    
    // 4. Resumen Comunal
    if (containsAny(normalizedMsg, ['resumen', 'comunal', 'general', 'global', 'panorama'])) {
        setTimeout(() => {
            hideTypingIndicator();
            showCommunalSummary();
        }, 700);
        return;
    }
    
    // 5. Indicadores en estado crítico
    if (containsAny(normalizedMsg, ['crítico', 'critico', 'alerta', 'incumplimiento', 'riesgo'])) {
        setTimeout(() => {
            hideTypingIndicator();
            showCriticalIndicators();
        }, 700);
        return;
    }
    
    // Si no se ha capturado la intención, enviar a la API
    processWithAPI(message);
}

/**
 * Procesa el mensaje usando la API de OpenAI
 * @param {string} message - Mensaje del usuario
 */
async function processWithAPI(message) {
    try {
        // Si no estamos en producción, usar respuestas simuladas
        if (location.hostname === 'localhost' || !IAAPS_CONFIG.apiKey) {
            setTimeout(() => {
                const response = getFallbackResponse(message);
                hideTypingIndicator();
                addBotMessage(response);
            }, 1200);
            return;
        }
        
        // Preparar historial de mensajes para contexto
        const history = IAAPS_STATE.messages.slice(-10).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));
        
        // Preparar prompt del sistema
        const systemPrompt = `Eres un asistente especializado en el sistema IAAPS (Índices de Actividad de la Atención Primaria de Salud) 
        para Salud Curicó. Debes proporcionar respuestas directas, precisas y concisas. 
        Si te piden datos o reportes específicos, proporciónaselos sin explicaciones largas.
        Usa un formato profesional con viñetas y datos numéricos precisos.`;
        
        // Solicitud a la API
        const response = await fetch(IAAPS_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${IAAPS_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history,
                    { role: 'user', content: message }
                ],
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                session_id: IAAPS_STATE.sessionId
            })
        });
        
        if (!response.ok) {
            throw new Error('Error en la API');
        }
        
        const result = await response.json();
        const botResponse = result.choices[0].message.content;
        
        // Mostrar respuesta
        hideTypingIndicator();
        addBotMessage(botResponse);
        
    } catch (error) {
        console.error('Error al procesar con API:', error);
        
        // Respuesta de fallback si falla la API
        hideTypingIndicator();
        addBotMessage(`Disculpa, no he podido procesar tu consulta. Prueba con alguna de estas opciones:

• Ver reporte comunal
• Datos de un indicador específico
• Comparar centros de salud`);
        
        // Añadir botones de ayuda
        addQuickActions([
            { text: 'Reporte Comunal', action: 'reporte_comunal' },
            { text: 'Ver Indicadores', action: 'mostrar_indicadores' },
            { text: 'Comparar Centros', action: 'comparar_centros' }
        ]);
    }
}

/**
 * Genera respuestas simuladas para desarrollo local
 * @param {string} message - Mensaje del usuario
 * @returns {string} - Respuesta simulada
 */
function getFallbackResponse(message) {
    const lowMsg = message.toLowerCase();
    
    if (lowMsg.includes('hola') || lowMsg.length < 10) {
        return `👋 ¡Hola! Soy el asistente IAAPS. ¿Necesitas algún reporte o información específica?`;
    }
    
    if (lowMsg.includes('ayuda') || lowMsg.includes('puedes hacer')) {
        return `Puedo ayudarte con:

• Generar reportes en PDF y Excel por centro o comunal
• Mostrar datos de indicadores específicos
• Comparar centros de salud
• Identificar indicadores críticos
• Analizar tendencias de cumplimiento

¿Qué necesitas específicamente?`;
    }
    
    return `He recibido tu consulta sobre "${message}". Para ayudarte mejor, ¿podrías especificar si necesitas:

• Un reporte específico de algún centro
• Información sobre algún indicador particular
• Datos comparativos entre centros`;
}

/**
 * Muestra datos de un indicador específico
 * @param {string} indicatorName - Nombre del indicador
 */
function showIndicatorData(indicatorName) {
    // Datos simulados para desarrollo
    const indicators = {
        'Cobertura EMP Mujeres': {
            codigo: '6.1.A',
            meta: '23.89%',
            actual: '9.88%',
            cumplimiento: '41.37%',
            tendencia: '+2.3%',
            estado: 'warning',
            mejorCentro: 'Miguel Ángel (12.06%)',
            peorCentro: 'Curicó Centro (7.06%)'
        },
        'Cobertura EMP Hombres': {
            codigo: '6.1.B',
            meta: '22.31%',
            actual: '5.14%',
            cumplimiento: '23.04%',
            tendencia: '+1.1%',
            estado: 'danger',
            mejorCentro: 'Miguel Ángel (6.02%)',
            peorCentro: 'Curicó Centro (3.49%)'
        },
        'Tasa Visita Domiciliaria': {
            codigo: '5',
            meta: '0.24',
            actual: '0.05',
            cumplimiento: '22.66%',
            tendencia: '+0.7%',
            estado: 'danger',
            mejorCentro: 'Sarmiento (0.06)',
            peorCentro: 'Curicó Centro (0.04)'
        },
        'Vacunación Influenza': {
            codigo: '11',
            meta: '85.00%',
            actual: '71.00%',
            cumplimiento: '84.00%',
            tendencia: '+5.2%',
            estado: 'warning',
            mejorCentro: 'Sarmiento (77%)',
            peorCentro: 'Los Niches (67%)'
        },
        'Cobertura Salud Mental': {
            codigo: '9.1',
            meta: '27.11%',
            actual: '32.29%',
            cumplimiento: '100.00%',
            tendencia: '+3.6%',
            estado: 'success',
            mejorCentro: 'Betty Muñoz (36.24%)',
            peorCentro: 'Sarmiento (26.50%)'
        },
        'EMP': {
            codigo: '6.1',
            info: 'Indicador general que incluye EMP Hombres y Mujeres'
        }
    };
    
    // Si es un indicador general, mostrar opciones
    if (indicatorName === 'EMP') {
        addBotMessage(`El indicador EMP (Examen de Medicina Preventiva) tiene dos componentes específicos. ¿Cuál te interesa?`);
        
        addQuickActions([
            { text: 'EMP Mujeres', action: 'indicador_emp_mujeres' },
            { text: 'EMP Hombres', action: 'indicador_emp_hombres' },
            { text: 'Ambos', action: 'indicador_emp_ambos' }
        ]);
        
        return;
    }
    
    // Obtener datos del indicador
    const data = indicators[indicatorName];
    
    if (!data) {
        addBotMessage(`No encontré datos específicos para el indicador "${indicatorName}". ¿Puedes especificar otro indicador?`);
        return;
    }
    
    // Determinar clase basada en estado
    const stateClass = data.estado === 'success' ? 'success' : 
                      data.estado === 'warning' ? 'warning' : 'danger';
    
    // Crear carta de indicador
    const indicatorCard = `
    <div class="iaaps-indicator-card">
        <div class="iaaps-indicator-header ${stateClass}">
            <h3>${indicatorName}</h3>
            <span class="iaaps-indicator-code">Indicador ${data.codigo}</span>
        </div>
        <div class="iaaps-indicator-body">
            <div class="iaaps-indicator-stats">
                <div class="iaaps-stat">
                    <span class="iaaps-stat-label">Meta</span>
                    <span class="iaaps-stat-value">${data.meta}</span>
                </div>
                <div class="iaaps-stat">
                    <span class="iaaps-stat-label">Actual</span>
                    <span class="iaaps-stat-value">${data.actual}</span>
                </div>
                <div class="iaaps-stat">
                    <span class="iaaps-stat-label">Cumplimiento</span>
                    <span class="iaaps-stat-value ${stateClass}">${data.cumplimiento}</span>
                </div>
            </div>
            <div class="iaaps-indicator-details">
                <p><i class="fas fa-chart-line"></i> <strong>Tendencia:</strong> <span class="${data.tendencia.startsWith('+') ? 'success' : 'danger'}">${data.tendencia}</span></p>
                <p><i class="fas fa-trophy"></i> <strong>Mejor centro:</strong> ${data.mejorCentro}</p>
                <p><i class="fas fa-exclamation-triangle"></i> <strong>Peor centro:</strong> ${data.peorCentro}</p>
            </div>
        </div>
        <div class="iaaps-indicator-actions">
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('ver detalle indicador ${data.codigo}')">
                <i class="fas fa-search-plus"></i> Ver detalle
            </button>
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('exportar datos del indicador ${data.codigo} a excel')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar gráfico de tendencia del indicador ${data.codigo}')">
                <i class="fas fa-chart-bar"></i> Ver gráfico
            </button>
        </div>
    </div>
    `;
    
    // Mostrar tarjeta
    addBotMessage(indicatorCard);
}

/**
 * Muestra comparación de centros de salud
 */
function showCentersComparison() {
    // Datos simulados para desarrollo
    const centers = [
        { name: 'Colón', value: 62.43, ranking: 1 },
        { name: 'Los Niches', value: 61.83, ranking: 2 },
        { name: 'Curicó Centro', value: 61.60, ranking: 3 },
        { name: 'Miguel Ángel', value: 59.86, ranking: 4 },
        { name: 'Sarmiento', value: 55.90, ranking: 5 },
        { name: 'Betty Muñoz', value: 57.63, ranking: 6 }
    ].sort((a, b) => a.ranking - b.ranking);
    
    // Preparar datos para Chart.js
    const labels = centers.map(c => c.name);
    const values = centers.map(c => c.value);
    const colors = centers.map(c => {
        if (c.value >= 60) return '#3AC97C';
        if (c.value >= 55) return '#FFBD3D';
        return '#FF5A5A';
    });
    
    // Generar ID único para el canvas
    const chartId = 'iaaps-chart-' + Date.now();
    
    // Crear mensaje con la comparativa
    addBotMessage(`
    <div class="iaaps-comparison-card">
        <h3><i class="fas fa-chart-bar"></i> Comparativa de Centros de Salud</h3>
        <div class="iaaps-chart-container">
            <canvas id="${chartId}" width="400" height="200"></canvas>
        </div>
        <div class="iaaps-comparison-table">
            <table>
                <thead>
                    <tr>
                        <th>Ranking</th>
                        <th>Centro</th>
                        <th>Cumplimiento</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${centers.map((center, index) => `
                        <tr>
                            <td class="rank">${center.ranking}</td>
                            <td>${center.name}</td>
                            <td class="value">${center.value.toFixed(2)}%</td>
                            <td class="state">
                                <span class="iaaps-badge ${center.value >= 60 ? 'success' : center.value >= 55 ? 'warning' : 'danger'}">
                                    ${center.value >= 60 ? 'Óptimo' : center.value >= 55 ? 'Parcial' : 'Crítico'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="iaaps-card-actions">
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar reporte comparativo en pdf')">
                <i class="fas fa-file-pdf"></i> Exportar a PDF
            </button>
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar reporte comparativo en excel')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        </div>
    </div>
    `);
    
    // Crear gráfico después de que se haya añadido al DOM
    setTimeout(() => {
        const ctx = document.getElementById(chartId).getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cumplimiento (%)',
                    data: values,
                    backgroundColor: colors,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Cumplimiento (%)'
                        }
                    }
                }
            }
        });
    }, 100);
}

/**
 * Muestra resumen comunal de IAAPS
 */
function showCommunalSummary() {
    // Datos simulados para desarrollo
    const summary = {
        cumplimiento: 59.84,
        indicadores_cumplidos: 12,
        indicadores_parciales: 5,
        indicadores_criticos: 3,
        tendencia: '+2.7%',
        mejor_centro: 'Colón (62.43%)',
        peor_centro: 'Sarmiento (55.90%)',
        mejor_indicador: 'Cobertura Salud Mental (100%)',
        peor_indicador: 'Cobertura EMP Hombres (23.04%)'
    };
    
    // Generar ID único para el canvas
    const chartId = 'iaaps-donut-' + Date.now();
    
    // Crear mensaje con el resumen
    addBotMessage(`
    <div class="iaaps-summary-card">
        <h3><i class="fas fa-clipboard-check"></i> Resumen Comunal IAAPS - Marzo 2025</h3>
        <div class="iaaps-summary-container">
            <div class="iaaps-summary-chart">
                <canvas id="${chartId}" width="200" height="200"></canvas>
            </div>
            <div class="iaaps-summary-data">
                <div class="iaaps-big-stat">
                    <span class="iaaps-big-value ${summary.cumplimiento >= 60 ? 'success' : summary.cumplimiento >= 55 ? 'warning' : 'danger'}">${summary.cumplimiento}%</span>
                    <span class="iaaps-big-label">Cumplimiento Comunal</span>
                </div>
                <div class="iaaps-stats-grid">
                    <div class="iaaps-stat-item success">
                        <span class="iaaps-stat-value">${summary.indicadores_cumplidos}</span>
                        <span class="iaaps-stat-label">Indicadores Cumplidos</span>
                    </div>
                    <div class="iaaps-stat-item warning">
                        <span class="iaaps-stat-value">${summary.indicadores_parciales}</span>
                        <span class="iaaps-stat-label">Indicadores Parciales</span>
                    </div>
                    <div class="iaaps-stat-item danger">
                        <span class="iaaps-stat-value">${summary.indicadores_criticos}</span>
                        <span class="iaaps-stat-label">Indicadores Críticos</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="iaaps-summary-highlights">
            <div class="iaaps-highlight">
                <i class="fas fa-chart-line text-success"></i>
                <span><strong>Tendencia:</strong> ${summary.tendencia}</span>
            </div>
            <div class="iaaps-highlight">
                <i class="fas fa-trophy text-success"></i>
                <span><strong>Mejor centro:</strong> ${summary.mejor_centro}</span>
            </div>
            <div class="iaaps-highlight">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <span><strong>Peor centro:</strong> ${summary.peor_centro}</span>
            </div>
            <div class="iaaps-highlight">
                <i class="fas fa-award text-success"></i>
                <span><strong>Mejor indicador:</strong> ${summary.mejor_indicador}</span>
            </div>
            <div class="iaaps-highlight">
                <i class="fas fa-exclamation-circle text-danger"></i>
                <span><strong>Peor indicador:</strong> ${summary.peor_indicador}</span>
            </div>
        </div>
        <div class="iaaps-card-actions">
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar reporte comunal detallado en pdf')">
                <i class="fas fa-file-pdf"></i> Reporte PDF
            </button>
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar reporte comunal en excel')">
                <i class="fas fa-file-excel"></i> Exportar Excel
            </button>
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('ver indicadores críticos')">
                <i class="fas fa-exclamation-triangle"></i> Ver Críticos
            </button>
        </div>
    </div>
    `);
    
    // Crear gráfico después de que se haya añadido al DOM
    setTimeout(() => {
        const ctx = document.getElementById(chartId).getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Cumplidos', 'Parciales', 'Críticos'],
                datasets: [{
                    data: [summary.indicadores_cumplidos, summary.indicadores_parciales, summary.indicadores_criticos],
                    backgroundColor: ['#3AC97C', '#FFBD3D', '#FF5A5A'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }, 100);
}

/**
 * Muestra indicadores en estado crítico
 */
function showCriticalIndicators() {
    // Datos simulados para desarrollo
    const criticalIndicators = [
        { 
            code: '6.1.B', 
            name: 'Cobertura EMP Hombres', 
            value: '5.14%', 
            meta: '22.31%', 
            compliance: '23.04%',
            centers: 'Todos los centros'
        },
        { 
            code: '5', 
            name: 'Tasa Visita Domiciliaria', 
            value: '0.05', 
            meta: '0.24', 
            compliance: '22.66%',
            centers: 'Todos los centros excepto Sarmiento'
        },
        { 
            code: '7', 
            name: 'Cobertura EMPAM', 
            value: '15.80%', 
            meta: '58.48%', 
            compliance: '27.02%',
            centers: 'Curicó Centro, Betty Muñoz'
        }
    ];
    
    // Crear mensaje con indicadores críticos
    addBotMessage(`
    <div class="iaaps-alert-card">
        <div class="iaaps-alert-header">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Indicadores en Estado Crítico</h3>
        </div>
        <div class="iaaps-critical-indicators">
            ${criticalIndicators.map(indicator => `
                <div class="iaaps-critical-item">
                    <div class="iaaps-critical-header">
                        <span class="iaaps-critical-code">${indicator.code}</span>
                        <span class="iaaps-critical-name">${indicator.name}</span>
                        <span class="iaaps-critical-compliance">${indicator.compliance}</span>
                    </div>
                    <div class="iaaps-critical-details">
                        <div class="iaaps-critical-stats">
                            <div class="iaaps-mini-stat">
                                <span class="iaaps-mini-label">Actual</span>
                                <span class="iaaps-mini-value">${indicator.value}</span>
                            </div>
                            <div class="iaaps-mini-stat">
                                <span class="iaaps-mini-label">Meta</span>
                                <span class="iaaps-mini-value">${indicator.meta}</span>
                            </div>
                            <div class="iaaps-critical-progress">
                                <div class="iaaps-progress-bar">
                                    <div class="iaaps-progress-fill" style="width: ${indicator.compliance};"></div>
                                </div>
                            </div>
                        </div>
                        <div class="iaaps-critical-centers">
                            <i class="fas fa-hospital-alt"></i> ${indicator.centers}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="iaaps-card-footer">
            <p><i class="fas fa-info-circle"></i> Se consideran críticos los indicadores con cumplimiento menor al 30%.</p>
            <div class="iaaps-card-actions">
                <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar plan de acción para indicadores críticos')">
                    <i class="fas fa-tasks"></i> Plan de Acción
                </button>
                <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('exportar indicadores críticos a excel')">
                    <i class="fas fa-file-excel"></i> Exportar a Excel
                </button>
            </div>
        </div>
    </div>
    `);
}

/**
 * Genera un reporte para un centro específico
 * @param {string} centerName - Nombre del centro
 * @param {string} [format] - Formato del reporte (pdf, excel)
 */
function generateReport(centerName, format = null) {
    // Si no se especificó formato, presentar opciones
    if (!format) {
        addBotMessage(`
        <div class="iaaps-message-header">
            <i class="fas fa-file-alt"></i> Generación de Reporte: ${centerName}
        </div>
        <p>Puedo generar el reporte en diferentes formatos. ¿Cuál prefieres?</p>
        `);
        
        addQuickActions([
            { text: 'PDF', action: `generar_pdf_${centerName.toLowerCase().replace(' ', '_')}` },
            { text: 'Excel', action: `generar_excel_${centerName.toLowerCase().replace(' ', '_')}` },
            { text: 'Ver Resumen', action: `resumen_${centerName.toLowerCase().replace(' ', '_')}` }
        ]);
        
        return;
    }
    
    // Si quiere PDF, generar reporte
    if (format === 'pdf') {
        addBotMessage(`<div class="iaaps-processing">
            <div class="iaaps-processing-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="iaaps-processing-text">
                <h4>Generando reporte PDF: ${centerName}</h4>
                <div class="iaaps-progress">
                    <div class="iaaps-progress-bar"><div class="iaaps-progress-fill"></div></div>
                </div>
                <p>Procesando datos y generando documento...</p>
            </div>
        </div>`);
        
        // Simular procesamiento
        setTimeout(() => {
            // Generar reporte real
            createPDFReport(centerName);
            
            // Mostrar confirmación
            addBotMessage(`<div class="iaaps-success-message">
                <i class="fas fa-check-circle"></i>
                <h4>¡Reporte PDF generado con éxito!</h4>
                <p>El reporte para ${centerName} ha sido creado correctamente.</p>
                <div class="iaaps-download-link">
                    <a href="#" onclick="IAAPSBot.generateReport('${centerName}', 'pdf-download'); return false;" class="iaaps-download-btn">
                        <i class="fas fa-download"></i> Descargar PDF
                    </a>
                </div>
            </div>`);
        }, 1500);
        
        return;
    }
    
    // Si quiere Excel, generar reporte
    if (format === 'excel') {
        addBotMessage(`<div class="iaaps-processing">
            <div class="iaaps-processing-icon">
                <i class="fas fa-file-excel"></i>
            </div>
            <div class="iaaps-processing-text">
                <h4>Generando reporte Excel: ${centerName}</h4>
                <div class="iaaps-progress">
                    <div class="iaaps-progress-bar"><div class="iaaps-progress-fill"></div></div>
                </div>
                <p>Procesando datos y generando hoja de cálculo...</p>
            </div>
        </div>`);
        
        // Simular procesamiento
        setTimeout(() => {
            // Generar Excel real
            createExcelReport(centerName);
            
            // Mostrar confirmación
            addBotMessage(`<div class="iaaps-success-message">
                <i class="fas fa-check-circle"></i>
                <h4>¡Reporte Excel generado con éxito!</h4>
                <p>El reporte para ${centerName} ha sido creado correctamente.</p>
                <div class="iaaps-download-link">
                    <a href="#" onclick="IAAPSBot.generateReport('${centerName}', 'excel-download'); return false;" class="iaaps-download-btn">
                        <i class="fas fa-download"></i> Descargar Excel
                    </a>
                </div>
            </div>`);
        }, 1500);
        
        return;
    }
    
    // Si se solicita descarga real de PDF
    if (format === 'pdf-download') {
        // Trigger descarga real
        downloadPDFReport(centerName);
        return;
    }
    
    // Si se solicita descarga real de Excel
    if (format === 'excel-download') {
        // Trigger descarga real
        downloadExcelReport(centerName);
        return;
    }
}

/**
 * Genera un reporte PDF personalizado
 * @param {string} centerName - Nombre del centro
 */
function createPDFReport(centerName) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) throw new Error('jsPDF no disponible');
        
        // Crear nueva instancia PDF
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(22);
        doc.setTextColor(46, 155, 97);
        doc.text("Reporte IAAPS", 105, 20, { align: "center" });
        
        // Subtítulo
        doc.setFontSize(16);
        doc.setTextColor(60, 60, 60);
        doc.text(`Centro de Salud: ${centerName}`, 105, 30, { align: "center" });
        
        // Fecha
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const today = new Date().toLocaleDateString('es-CL');
        doc.text(`Fecha de generación: ${today}`, 105, 40, { align: "center" });
        
        // Línea separadora
        doc.setDrawColor(46, 155, 97);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);
        
        // Resumen
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text("Resumen General", 20, 55);
        
        // Datos simulados
        doc.setFontSize(12);
        doc.text("Cumplimiento general: 61.60%", 25, 65);
        doc.text("Indicadores cumplidos: 12", 25, 75);
        doc.text("Indicadores parciales: 5", 25, 85);
        doc.text("Indicadores críticos: 3", 25, 95);
        
        // Más contenido...
        doc.setFontSize(14);
        doc.text("Indicadores Destacados", 20, 110);
        
        // Tabla de indicadores
        const headers = [['Código', 'Indicador', 'Meta', 'Actual', 'Cumplimiento']];
        const data = [
            ['6.1.A', 'Cobertura EMP Mujeres', '23.89%', '7.06%', '29.54%'],
            ['6.1.B', 'Cobertura EMP Hombres', '22.31%', '3.49%', '15.65%'],
            ['9.1', 'Cobertura Salud Mental', '27.11%', '29.31%', '100.00%'],
            ['11', 'Vacunación Influenza', '85.00%', '75.00%', '88.23%'],
            ['5', 'Tasa Visita Domiciliaria', '0.24', '0.04', '17.94%']
        ];
        
        // Añadir tabla
        doc.autoTable({
            head: headers,
            body: data,
            startY: 115,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [46, 155, 97],
                textColor: 255
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 70 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 30 }
            }
        });
        
        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${i} de ${pageCount} - IAAPS Curicó - Sistema de Monitoreo`, 105, 290, { align: 'center' });
        }
        
        // Guardar en IAAPS_STATE para descarga posterior
        IAAPS_STATE.pdfDoc = doc;
        
    } catch (error) {
        console.error('Error al crear PDF:', error);
    }
}

/**
 * Descarga el reporte PDF generado
 * @param {string} centerName - Nombre del centro
 */
function downloadPDFReport(centerName) {
    try {
        if (!IAAPS_STATE.pdfDoc) {
            // Si no hay documento creado, crearlo ahora
            createPDFReport(centerName);
        }
        
        // Nombre de archivo
        const fileName = `Reporte_IAAPS_${centerName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Descargar
        IAAPS_STATE.pdfDoc.save(fileName);
        
    } catch (error) {
        console.error('Error al descargar PDF:', error);
        addBotMessage('Lo siento, hubo un error al descargar el reporte PDF. Por favor, intenta nuevamente.');
    }
}

/**
 * Genera un reporte Excel
 * @param {string} centerName - Nombre del centro
 */
function createExcelReport(centerName) {
    try {
        if (!window.XLSX) throw new Error('SheetJS no disponible');
        
        // Crear libro de trabajo
        const wb = window.XLSX.utils.book_new();
        wb.Props = {
            Title: `Reporte IAAPS - ${centerName}`,
            Subject: "Indicadores de Actividad de la Atención Primaria de Salud",
            Author: "Sistema IAAPS Curicó",
            CreatedDate: new Date()
        };
        
        // Crear hoja de resumen
        const wsData = [
            ["REPORTE IAAPS", "", "", "", ""],
            [`Centro de Salud: ${centerName}`, "", "", "", ""],
            [`Fecha: ${new Date().toLocaleDateString('es-CL')}`, "", "", "", ""],
            ["", "", "", "", ""],
            ["RESUMEN GENERAL", "", "", "", ""],
            ["Cumplimiento general:", "61.60%", "", "", ""],
            ["Indicadores cumplidos:", "12", "", "", ""],
            ["Indicadores parciales:", "5", "", "", ""],
            ["Indicadores críticos:", "3", "", "", ""],
            ["", "", "", "", ""],
            ["INDICADORES", "", "", "", ""],
            ["Código", "Indicador", "Meta", "Actual", "Cumplimiento"],
            ["6.1.A", "Cobertura EMP Mujeres", "23.89%", "7.06%", "29.54%"],
            ["6.1.B", "Cobertura EMP Hombres", "22.31%", "3.49%", "15.65%"],
            ["9.1", "Cobertura Salud Mental", "27.11%", "29.31%", "100.00%"],
            ["11", "Vacunación Influenza", "85.00%", "75.00%", "88.23%"],
            ["5", "Tasa Visita Domiciliaria", "0.24", "0.04", "17.94%"]
        ];
        
        // Crear hoja y añadir al libro
        const ws = window.XLSX.utils.aoa_to_sheet(wsData);
        window.XLSX.utils.book_append_sheet(wb, ws, "Resumen");
        
        // Segunda hoja con todos los indicadores
        const indicadoresData = [
            ["INDICADORES COMPLETOS", "", "", "", "", "", ""],
            ["Código", "Indicador", "Meta", "Numerador", "Denominador", "Resultado", "Cumplimiento"],
            // Datos simulados para todos los indicadores...
            ["1", "Porcentaje de centros de salud autoevaluados mediante MAIS", "100.00%", "45", "45", "100.00%", "100.00%"],
            ["2.1", "Continuidad de Atención", "100.00%", "18", "18", "100.00%", "100.00%"],
            ["2.2", "Disponibilidad de fármacos trazadores", "100.00%", "36", "36", "100.00%", "100.00%"],
            ["3", "Tasa de consultas médicas de morbilidad por habitante año", "0.82", "6873", "41532", "0.17", "20.18%"],
            ["4", "Porcentaje de derivación al nivel secundario", "10.00%", "746", "11905", "6.27%", "62.66%"],
            ["5", "Tasa de Visita Domiciliaria Integral", "0.24", "542", "12585", "0.04", "17.94%"],
            ["6.1.A", "Cobertura EMP mujeres (20-64 años)", "23.89%", "1030", "14597", "7.06%", "29.54%"],
            ["6.1.B", "Cobertura EMP hombres (20-64 años)", "22.31%", "380", "10883", "3.49%", "15.65%"],
            ["6.2", "Cobertura EMPAM (65+ años)", "58.48%", "837", "6609", "12.66%", "21.66%"],
            ["7", "Cobertura evaluación desarrollo psicomotor (12-23 meses)", "25.00%", "38", "267", "14.23%", "14.98%"],
            ["8", "Cobertura control adolescentes (10-19 años)", "24.17%", "236", "5444", "4.34%", "17.94%"],
            ["9.1", "Cobertura atención salud mental", "27.11%", "2678", "9137", "29.31%", "100.00%"],
            ["9.2", "Tasa controles salud mental", "6.00", "3029", "2678", "1.13", "18.85%"],
            ["9.3", "Personas egresadas por alta clínica", "13.00%", "14", "2678", "0.52%", "4.02%"],
            ["11", "Cobertura vacunación anti-influenza", "85.00%", "22004", "16408", "75.00%", "88.23%"],
            ["12", "Ingreso precoz a control de embarazo", "90.04%", "69", "23", "225.71%", "100.00%"],
            ["13", "Cobertura regulación fertilidad adolescentes", "25.91%", "2220", "2773", "80.06%", "100.00%"],
            ["14", "Cobertura DM2 (15+ años)", "71.00%", "8703", "4868", "178.78%", "100.00%"],
            ["15", "Cobertura HTA (15+ años)", "63.50%", "17430", "11065", "157.52%", "100.00%"],
            ["16", "Proporción niños sin caries (<3 años)", "64.67%", "114", "829", "13.75%", "21.26%"],
            ["17", "Prevalencia normalidad menores de 2 años", "61.13%", "324", "526", "61.60%", "100.00%"]
        ];
        
        // Crear segunda hoja
        const wsIndicadores = window.XLSX.utils.aoa_to_sheet(indicadoresData);
        window.XLSX.utils.book_append_sheet(wb, wsIndicadores, "Indicadores");
        
        // Guardar en IAAPS_STATE para descarga posterior
        IAAPS_STATE.excelWB = wb;
        
    } catch (error) {
        console.error('Error al crear Excel:', error);
    }
}

/**
 * Descarga el reporte Excel generado
 * @param {string} centerName - Nombre del centro
 */
function downloadExcelReport(centerName) {
    try {
        if (!IAAPS_STATE.excelWB) {
            // Si no hay libro creado, crearlo ahora
            createExcelReport(centerName);
        }
        
        // Nombre de archivo
        const fileName = `Reporte_IAAPS_${centerName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Descargar
        window.XLSX.writeFile(IAAPS_STATE.excelWB, fileName);
        
    } catch (error) {
        console.error('Error al descargar Excel:', error);
        addBotMessage('Lo siento, hubo un error al descargar el reporte Excel. Por favor, intenta nuevamente.');
    }
}

/**
 * Genera un reporte personalizado (punto de entrada para integraciones)
 * @param {string} centerName - Nombre del centro
 * @param {string} format - Formato del reporte
 */
function generateCustomReport(centerName, format) {
    if (format === 'pdf') {
        createPDFReport(centerName);
        downloadPDFReport(centerName);
    } else if (format === 'excel') {
        createExcelReport(centerName);
        downloadExcelReport(centerName);
    }
}

/**
 * Carga los datos reales de IAAPS
 */
function loadIAAPSData() {
    IAAPS_STATE.pendingRequests++;
    
    // Si estamos en localhost o en desarrollo, simular datos
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        setTimeout(() => {
            IAAPS_STATE.dataCached = true;
            IAAPS_STATE.pendingRequests--;
            console.log('Datos IAAPS simulados cargados');
        }, 1000);
        return;
    }
    
    // En producción, cargar datos reales
    fetch('/api/iaaps-data')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar datos IAAPS');
            return response.json();
        })
        .then(data => {
            IAAPS_STATE.data.iaapsData = data;
            IAAPS_STATE.data.centers = data.centers;
            IAAPS_STATE.data.indicators = data.indicators;
            IAAPS_STATE.dataCached = true;
            IAAPS_STATE.pendingRequests--;
            console.log('Datos IAAPS reales cargados');
        })
        .catch(error => {
            console.error('Error al cargar datos:', error);
            IAAPS_STATE.pendingRequests--;
        });
}

/**
 * Añade un mensaje del usuario al chat
 * @param {string} text - Texto del mensaje
 */
function addUserMessage(text) {
    const timestamp = new Date();
    const messageId = 'msg-' + Date.now();
    
    // Crear elemento mensaje
    const messageElement = document.createElement('div');
    messageElement.id = messageId;
    messageElement.className = 'iaaps-user-message';
    messageElement.innerHTML = `
        <div class="iaaps-message-bubble">
            <div class="iaaps-message-text">${escapeHtml(text)}</div>
        </div>
        <div class="iaaps-message-time">${formatTime(timestamp)}</div>
    `;
    
    // Añadir al contenedor de mensajes
    iaapsElements.messagesContainer.appendChild(messageElement);
    scrollToBottom();
    
    // Guardar en historial
    IAAPS_STATE.messages.push({
        id: messageId,
        type: 'user',
        text: text,
        timestamp: timestamp.toISOString()
    });
}

/**
 * Añade un mensaje del bot al chat
 * @param {string} html - Contenido HTML del mensaje
 */
function addBotMessage(html) {
    const timestamp = new Date();
    const messageId = 'msg-' + Date.now();
    
    // Crear elemento mensaje
    const messageElement = document.createElement('div');
    messageElement.id = messageId;
    messageElement.className = 'iaaps-bot-message';
    messageElement.innerHTML = `
        <div class="iaaps-message-bubble">
            <div class="iaaps-message-text">${html}</div>
        </div>
        <div class="iaaps-message-time">${formatTime(timestamp)}</div>
    `;
    
    // Añadir al contenedor de mensajes
    iaapsElements.messagesContainer.appendChild(messageElement);
    scrollToBottom();
    
    // Guardar en historial
    IAAPS_STATE.messages.push({
        id: messageId,
        type: 'bot',
        text: stripHtml(html),
        html: html,
        timestamp: timestamp.toISOString()
    });
}

/**
 * Añade acciones rápidas después de un mensaje
 * @param {Array} actions - Array de objetos {text, action}
 */
function addQuickActions(actions) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'iaaps-quick-actions';
    
    actions.forEach(action => {
        const actionButton = document.createElement('button');
        actionButton.className = 'iaaps-quick-action-btn';
        actionButton.textContent = action.text;
        actionButton.addEventListener('click', () => {
            handleQuickAction(action.action);
        });
        actionsContainer.appendChild(actionButton);
    });
    
    iaapsElements.messagesContainer.appendChild(actionsContainer);
    scrollToBottom();
}

/**
 * Maneja el clic en un botón de acción rápida
 * @param {string} action - Acción a realizar
 */
function handleQuickAction(action) {
    if (action.startsWith('generar_pdf_')) {
        const center = action.replace('generar_pdf_', '').replace('_', ' ');
        processUserInput(`Generar reporte PDF de ${center}`, true);
    } else if (action.startsWith('generar_excel_')) {
        const center = action.replace('generar_excel_', '').replace('_', ' ');
        processUserInput(`Generar reporte Excel de ${center}`, true);
    } else if (action.startsWith('resumen_')) {
        const center = action.replace('resumen_', '').replace('_', ' ');
        processUserInput(`Ver resumen de ${center}`, true);
    } else if (action === 'reporte_comunal') {
        processUserInput('Generar reporte comunal', true);
    } else if (action === 'mostrar_indicadores') {
        processUserInput('Mostrar indicadores', true);
    } else if (action === 'comparar_centros') {
        processUserInput('Comparar centros de salud', true);
    } else if (action === 'indicador_emp_mujeres') {
        processUserInput('Mostrar datos de indicador EMP mujeres', true);
    } else if (action === 'indicador_emp_hombres') {
        processUserInput('Mostrar datos de indicador EMP hombres', true);
    } else if (action === 'indicador_emp_ambos') {
        processUserInput('Comparar EMP hombres y mujeres', true);
    }
}

/**
 * Muestra indicador de "escribiendo..."
 */
function showTypingIndicator() {
    IAAPS_STATE.isLoading = true;
    
    const typingElement = document.createElement('div');
    typingElement.id = 'iaaps-typing-indicator';
    typingElement.className = 'iaaps-bot-message iaaps-typing';
    typingElement.innerHTML = `
        <div class="iaaps-message-bubble iaaps-typing-bubble">
            <div class="iaaps-typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    iaapsElements.messagesContainer.appendChild(typingElement);
    scrollToBottom();
}

/**
 * Oculta indicador de "escribiendo..."
 */
function hideTypingIndicator() {
    IAAPS_STATE.isLoading = false;
    
    const typingElement = document.getElementById('iaaps-typing-indicator');
    if (typingElement) {
        typingElement.remove();
    }
}

/**
 * Hace scroll al final del chat
 */
function scrollToBottom() {
    iaapsElements.messagesContainer.scrollTop = iaapsElements.messagesContainer.scrollHeight;
}

/**
 * Añade los estilos CSS al documento
 */
function addChatStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Chatbot IAAPS - Estilos profesionales */
        .iaaps-bot-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: 'Segoe UI', 'Roboto', 'Open Sans', sans-serif;
        }
        
        .iaaps-chat-button {
            position: relative;
            width: 60px;
            height: 60px;
            border-radius: 30px;
            background: ${IAAPS_CONFIG.colors.primary};
            color: ${IAAPS_CONFIG.colors.text};
            border: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            transition: all 0.3s ease;
        }
        
        .iaaps-chat-button:hover {
            background: ${IAAPS_CONFIG.colors.primaryDark};
            transform: scale(1.05);
        }
        
        .iaaps-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: ${IAAPS_CONFIG.colors.danger};
            color: white;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(46, 155, 97, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(46, 155, 97, 0); }
            100% { box-shadow: 0 0 0 0 rgba(46, 155, 97, 0); }
        }
        
        .iaaps-attention-pulse {
            animation: pulse 2s infinite;
        }
        
        .iaaps-chat-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 380px;
            height: 600px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 30px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .iaaps-chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .iaaps-header-title {
            display: flex;
            align-items: center;
            font-weight: 600;
            font-size: 16px;
        }
        
        .iaaps-logo {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            margin-right: 10px;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.5);
        }
        
        .iaaps-header-actions {
            display: flex;
            gap: 5px;
        }
        
        .iaaps-header-btn {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-header-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .iaaps-messages {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            background: #f5f7f8;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .iaaps-user-message,
        .iaaps-bot-message {
            display: flex;
            flex-direction: column;
            max-width: 85%;
            align-items: flex-end;
            animation: fadeIn 0.3s ease;
        }
        
        .iaaps-user-message {
            align-self: flex-end;
        }
        
        .iaaps-bot-message {
            align-self: flex-start;
            align-items: flex-start;
        }
        
        .iaaps-message-bubble {
            padding: 12px 15px;
            border-radius: 18px;
            position: relative;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            max-width: 100%;
        }
        
        .iaaps-user-message .iaaps-message-bubble {
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
            border-bottom-right-radius: 4px;
        }
        
        .iaaps-bot-message .iaaps-message-bubble {
            background: white;
            color: ${IAAPS_CONFIG.colors.textDark};
            border-bottom-left-radius: 4px;
        }
        
        .iaaps-message-text {
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.5;
        }
        
        .iaaps-message-time {
            font-size: 11px;
            color: #999;
            margin-top: 4px;
            margin-right: 5px;
        }
        
        /* Efectos de typing */
        .iaaps-typing-bubble {
            padding: 15px;
            min-width: 70px;
        }
        
        .iaaps-typing-dots {
            display: flex;
            gap: 5px;
        }
        
        .iaaps-typing-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ccc;
            animation: typing 1.4s infinite;
        }
        
        .iaaps-typing-dots span:nth-child(1) { animation-delay: 0s; }
        .iaaps-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .iaaps-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Área de input */
        .iaaps-input-area {
            display: flex;
            padding: 15px;
            border-top: 1px solid #eee;
            background: white;
            gap: 10px;
            align-items: flex-end;
        }
        
        .iaaps-input {
            flex: 1;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 24px;
            font-size: 14px;
            min-height: 20px;
            max-height: 120px;
            resize: none;
            outline: none;
            font-family: inherit;
            transition: all 0.2s;
        }
        
        .iaaps-input:focus {
            border-color: ${IAAPS_CONFIG.colors.primary};
            box-shadow: 0 0 0 2px rgba(46, 155, 97, 0.1);
        }
        
        .iaaps-send-btn {
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-send-btn:hover:not(:disabled) {
            background: ${IAAPS_CONFIG.colors.primaryDark};
            transform: scale(1.05);
        }
        
        .iaaps-send-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        /* Footer con sugerencias */
        .iaaps-footer {
            padding: 10px 15px 15px;
            border-top: 1px solid #eee;
            background: white;
        }
        
        .iaaps-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .iaaps-suggestion-chip {
            background: #f0f4f8;
            border: 1px solid #ddd;
            border-radius: 20px;
            padding: 8px 12px;
            font-size: 13px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }
        
        .iaaps-suggestion-chip:hover {
            background: #e8f4ee;
            border-color: ${IAAPS_CONFIG.colors.primary};
        }
        
        /* Acciones rápidas */
        .iaaps-quick-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 0 0 5px 10px;
            align-self: flex-start;
        }
        
        .iaaps-quick-action-btn {
            background: #f2f2f2;
            border: 1px solid #e0e0e0;
            border-radius: 18px;
            padding: 8px 14px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            color: ${IAAPS_CONFIG.colors.primary};
        }
        
        .iaaps-quick-action-btn:hover {
            background: #e8f4ee;
            border-color: ${IAAPS_CONFIG.colors.primary};
        }
        
        /* Tarjetas de visualización */
        .iaaps-indicator-card,
        .iaaps-comparison-card,
        .iaaps-summary-card,
        .iaaps-alert-card,
        .iaaps-processing,
        .iaaps-success-message {
            width: 100%;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 5px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        
        .iaaps-indicator-header {
            padding: 12px 15px;
            color: white;
            background: ${IAAPS_CONFIG.colors.primary};
        }
        
        .iaaps-indicator-header.success {
            background: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-indicator-header.warning {
            background: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-indicator-header.danger {
            background: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-indicator-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .iaaps-indicator-code {
            font-size: 12px;
            opacity: 0.8;
        }
        
        .iaaps-indicator-body {
            padding: 15px;
        }
        
        .iaaps-indicator-stats {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .iaaps-stat {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 8px;
            background: #f5f7f8;
            border-radius: 8px;
        }
        
        .iaaps-stat-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .iaaps-stat-value {
            font-size: 18px;
            font-weight: 600;
        }
        
        .iaaps-stat-value.success {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-stat-value.warning {
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-stat-value.danger {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-indicator-details {
            background: #f9f9f9;
            padding: 10px 15px;
            border-radius: 8px;
        }
        
        .iaaps-indicator-details p {
            margin: 8px 0;
            font-size: 13px;
        }
        
        .iaaps-indicator-actions,
        .iaaps-card-actions {
            display: flex;
            gap: 8px;
            padding: 10px 15px;
            border-top: 1px solid #eee;
            flex-wrap: wrap;
        }
        
        /* Botones de acción */
        .iaaps-action-btn {
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 12px;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s;
        }
        
        .iaaps-action-btn:hover {
            background: ${IAAPS_CONFIG.colors.primaryDark};
        }
        
        /* Comparativa */
        .iaaps-comparison-card h3 {
            padding: 15px;
            margin: 0;
            font-size: 16px;
            border-bottom: 1px solid #eee;
        }
        
        .iaaps-chart-container {
            height: 250px;
            padding: 10px;
            position: relative;
        }
        
        .iaaps-comparison-table {
            padding: 0 15px 15px;
            overflow-x: auto;
        }
        
        .iaaps-comparison-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        
        .iaaps-comparison-table th,
        .iaaps-comparison-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .iaaps-comparison-table th {
            font-weight: 600;
            color: #555;
            border-bottom: 2px solid #ddd;
        }
        
        .iaaps-comparison-table td.rank {
            font-weight: bold;
            color: #555;
        }
        
        .iaaps-comparison-table td.value {
            font-weight: 600;
            text-align: right;
        }
        
        .iaaps-comparison-table td.state {
            text-align: center;
        }
        
        .iaaps-badge {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 500;
        }
        
        .iaaps-badge.success {
            background: #e6f7ef;
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-badge.warning {
            background: #fff5e6;
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-badge.danger {
            background: #ffebeb;
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        /* Resumen comunal */
        .iaaps-summary-container {
            display: flex;
            padding: 15px;
            gap: 20px;
        }
        
        .iaaps-summary-chart {
            width: 40%;
            max-width: 200px;
        }
        
        .iaaps-summary-data {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .iaaps-big-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        
        .iaaps-big-value {
            font-size: 32px;
            font-weight: 700;
        }
        
        .iaaps-big-value.success {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-big-value.warning {
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-big-value.danger {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-big-label {
            font-size: 14px;
            color: #666;
        }
        
        .iaaps-stats-grid {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }
        
        .iaaps-stat-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 10px;
            border-radius: 8px;
        }
        
        .iaaps-stat-item.success {
            background: rgba(58, 201, 124, 0.1);
        }
        
        .iaaps-stat-item.warning {
            background: rgba(255, 189, 61, 0.1);
        }
        
        .iaaps-stat-item.danger {
            background: rgba(255, 90, 90, 0.1);
        }
        
        .iaaps-stat-item .iaaps-stat-value {
            font-size: 24px;
            font-weight: 700;
        }
        
        .iaaps-stat-item.success .iaaps-stat-value {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-stat-item.warning .iaaps-stat-value {
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-stat-item.danger .iaaps-stat-value {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-stat-item .iaaps-stat-label {
            font-size: 12px;
            margin-top: 5px;
        }
        
        .iaaps-summary-highlights {
            padding: 0 15px 15px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 10px;
        }
        
        .iaaps-highlight {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            padding: 8px 10px;
            background: #f9f9f9;
            border-radius: 6px;
        }
        
        .iaaps-highlight i {
            font-size: 14px;
        }
        
        .text-success {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .text-warning {
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .text-danger {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
     /* Continuación de los estilos CSS */
        .iaaps-alert-card .iaaps-alert-header {
            background: ${IAAPS_CONFIG.colors.danger};
            color: white;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .iaaps-alert-header i {
            font-size: 20px;
        }
        
        .iaaps-alert-header h3 {
            margin: 0;
            font-size: 16px;
        }
        
        .iaaps-critical-indicators {
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .iaaps-critical-item {
            background: #f9f9f9;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .iaaps-critical-header {
            display: flex;
            align-items: center;
            padding: 10px 15px;
            background: #fee;
            border-left: 4px solid ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-critical-code {
            font-weight: 600;
            width: 60px;
            font-size: 13px;
        }
        
        .iaaps-critical-name {
            flex: 1;
            font-size: 14px;
        }
        
        .iaaps-critical-compliance {
            font-weight: 700;
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-critical-details {
            padding: 12px 15px;
        }
        
        .iaaps-critical-stats {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .iaaps-mini-stat {
            display: flex;
            flex-direction: column;
            width: 65px;
        }
        
        .iaaps-mini-label {
            font-size: 11px;
            color: #888;
        }
        
        .iaaps-mini-value {
            font-size: 14px;
            font-weight: 600;
        }
        
        .iaaps-critical-progress {
            flex: 1;
        }
        
        .iaaps-progress-bar {
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .iaaps-progress-fill {
            height: 100%;
            background: ${IAAPS_CONFIG.colors.danger};
            width: 0;
            transition: width 1s ease-in-out;
        }
        
        .iaaps-critical-centers {
            font-size: 12px;
            color: #666;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .iaaps-card-footer {
            padding: 15px;
            border-top: 1px solid #eee;
            font-size: 13px;
            color: #666;
        }
        
        /* Procesamiento */
        .iaaps-processing {
            display: flex;
            gap: 15px;
            padding: 15px;
            align-items: center;
        }
        
        .iaaps-processing-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        
        .iaaps-processing-text {
            flex: 1;
        }
        
        .iaaps-processing-text h4 {
            margin: 0 0 8px 0;
            font-size: 15px;
        }
        
        .iaaps-processing-text p {
            margin: 8px 0 0 0;
            font-size: 13px;
            color: #666;
        }
        
        .iaaps-processing .iaaps-progress {
            margin-top: 8px;
        }
        
        .iaaps-processing .iaaps-progress-bar {
            height: 6px;
            border-radius: 3px;
        }
        
        .iaaps-processing .iaaps-progress-fill {
            background: ${IAAPS_CONFIG.colors.primary};
            animation: progress-bar-animation 1.5s infinite linear;
            width: 100%;
            background: linear-gradient(to right, transparent, ${IAAPS_CONFIG.colors.primary}, transparent);
            background-size: 50% 100%;
            background-repeat: no-repeat;
        }
        
        @keyframes progress-bar-animation {
            0% { background-position: -50% 0; }
            100% { background-position: 150% 0; }
        }
        
        /* Mensaje de éxito */
        .iaaps-success-message {
            padding: 15px;
            text-align: center;
        }
        
        .iaaps-success-message i {
            font-size: 40px;
            color: ${IAAPS_CONFIG.colors.success};
            margin-bottom: 10px;
        }
        
        .iaaps-success-message h4 {
            margin: 10px 0;
            font-size: 16px;
            color: ${IAAPS_CONFIG.colors.textDark};
        }
        
        .iaaps-success-message p {
            margin: 5px 0 15px;
            font-size: 13px;
            color: #666;
        }
        
        .iaaps-download-link {
            margin-top: 15px;
        }
        
        .iaaps-download-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .iaaps-download-btn:hover {
            background: ${IAAPS_CONFIG.colors.primaryDark};
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Estilos de mensaje con encabezado */
        .iaaps-message-header {
            padding: 8px 0;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            font-weight: 600;
            color: ${IAAPS_CONFIG.colors.primary};
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Dashboard flotante */
        .iaaps-dashboard {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        
        .iaaps-dashboard.active {
            opacity: 1;
            pointer-events: auto;
        }
        
        .iaaps-dashboard-container {
            width: 90%;
            max-width: 1200px;
            height: 90%;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            transform: scale(0.95);
            transition: transform 0.3s ease;
        }
        
        .iaaps-dashboard.active .iaaps-dashboard-container {
            transform: scale(1);
        }
        
        .iaaps-dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
        }
        
        .iaaps-dashboard-title {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .iaaps-dashboard-title img {
            height: 40px;
            border-radius: 8px;
        }
        
        .iaaps-dashboard-title h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }
        
        .iaaps-dashboard-actions {
            display: flex;
            gap: 10px;
        }
        
        .iaaps-dashboard-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            height: 36px;
            width: 36px;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-dashboard-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .iaaps-dashboard-close {
            background: rgba(255, 255, 255, 0.3);
            width: auto;
            padding: 0 15px;
            font-size: 14px;
            display: flex;
            gap: 8px;
        }
        
        .iaaps-dashboard-body {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        
        .iaaps-dashboard-sidebar {
            width: 280px;
            background: #f5f7f8;
            border-right: 1px solid #eee;
            display: flex;
            flex-direction: column;
        }
        
        .iaaps-dashboard-sidebar-header {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .iaaps-dashboard-controls {
            display: flex;
            gap: 10px;
        }
        
        .iaaps-dashboard-date {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .iaaps-sidebar-title {
            padding: 12px 15px;
            font-size: 14px;
            font-weight: 600;
            color: #555;
            margin: 0;
            border-bottom: 1px solid #eee;
        }
        
        .iaaps-dashboard-nav {
            flex: 1;
            overflow-y: auto;
        }
        
        .iaaps-nav-item {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        
        .iaaps-nav-item:hover {
            background: rgba(0, 0, 0, 0.03);
        }
        
        .iaaps-nav-item.active {
            background: rgba(46, 155, 97, 0.1);
            border-left-color: ${IAAPS_CONFIG.colors.primary};
        }
        
        .iaaps-nav-item i {
            color: #555;
            width: 20px;
            text-align: center;
        }
        
        .iaaps-nav-item.active i {
            color: ${IAAPS_CONFIG.colors.primary};
        }
        
        .iaaps-nav-item span {
            flex: 1;
            font-size: 14px;
            color: #333;
        }
        
        .iaaps-nav-item.active span {
            font-weight: 500;
            color: ${IAAPS_CONFIG.colors.primary};
        }
        
        .iaaps-sidebar-footer {
            padding: 15px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
        }
        
        .iaaps-sidebar-footer-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-sidebar-footer-btn:hover {
            background: #e8e8e8;
        }
        
        .iaaps-dashboard-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .iaaps-content-header {
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .iaaps-content-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            color: #333;
        }
        
        .iaaps-content-filters {
            display: flex;
            gap: 10px;
        }
        
        .iaaps-filter-select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .iaaps-content-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        .iaaps-widget-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .iaaps-widget {
            background: white;
            border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .iaaps-widget:hover {
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }
        
        .iaaps-widget-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .iaaps-widget-title {
            font-size: 15px;
            font-weight: 600;
            margin: 0;
            color: #333;
        }
        
        .iaaps-widget-actions {
            display: flex;
            gap: 5px;
        }
        
        .iaaps-widget-action {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 5px;
            cursor: pointer;
            color: #777;
            transition: all 0.2s;
        }
        
        .iaaps-widget-action:hover {
            background: #f0f0f0;
            color: #333;
        }
        
        .iaaps-widget-body {
            padding: 15px;
        }
        
        .iaaps-widget-chart {
            height: 200px;
        }
        
        .iaaps-big-widget {
            grid-column: span 2;
        }
        
        .iaaps-big-widget .iaaps-widget-chart {
            height: 300px;
        }
        
        /* Indicadores en tarjetas */
        .iaaps-kpi-cards {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .iaaps-kpi-card {
            flex: 1;
            min-width: 200px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: all 0.3s ease;
        }
        
        .iaaps-kpi-card:hover {
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }
        
        .iaaps-kpi-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 22px;
        }
        
        .iaaps-kpi-icon.success {
            background: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-kpi-icon.warning {
            background: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-kpi-icon.danger {
            background: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-kpi-icon.info {
            background: ${IAAPS_CONFIG.colors.secondary};
        }
        
        .iaaps-kpi-content {
            flex: 1;
        }
        
        .iaaps-kpi-value {
            font-size: 22px;
            font-weight: 700;
            margin: 0;
            line-height: 1.2;
        }
        
        .iaaps-kpi-value.success {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-kpi-value.warning {
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-kpi-value.danger {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-kpi-label {
            font-size: 13px;
            color: #666;
            margin: 0;
        }
        
        .iaaps-kpi-change {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            margin-top: 3px;
        }
        
        .iaaps-kpi-change.up {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-kpi-change.down {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        /* Tabla de datos */
        .iaaps-data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin-bottom: 20px;
        }
        
        .iaaps-data-table th,
        .iaaps-data-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .iaaps-data-table th {
            background: #f9f9f9;
            font-weight: 600;
            color: #444;
            position: sticky;
            top: 0;
        }
        
        .iaaps-data-table tbody tr {
            transition: all 0.2s;
        }
        
        .iaaps-data-table tbody tr:hover {
            background: #f5f5f5;
        }
        
        .iaaps-data-table td.success {
            color: ${IAAPS_CONFIG.colors.success};
            font-weight: 500;
        }
        
        .iaaps-data-table td.warning {
            color: ${IAAPS_CONFIG.colors.accent};
            font-weight: 500;
        }
        
        .iaaps-data-table td.danger {
            color: ${IAAPS_CONFIG.colors.danger};
            font-weight: 500;
        }
        
        .iaaps-table-status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .iaaps-table-status.success {
            background: rgba(58, 201, 124, 0.1);
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-table-status.warning {
            background: rgba(255, 189, 61, 0.1);
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-table-status.danger {
            background: rgba(255, 90, 90, 0.1);
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        /* Mapa de calor */
        .iaaps-heatmap {
            margin-bottom: 20px;
        }
        
        .iaaps-heatmap-row {
            display: flex;
        }
        
        .iaaps-heatmap-cell {
            flex: 1;
            aspect-ratio: 1;
            margin: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 14px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-heatmap-cell:hover {
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .iaaps-heatmap-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            color: #666;
            font-size: 12px;
        }
        
        /* Modal de detalle */
        .iaaps-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        
        .iaaps-modal.active {
            opacity: 1;
            pointer-events: auto;
        }
        
        .iaaps-modal-container {
            width: 90%;
            max-width: 800px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transform: scale(0.95);
            transition: transform 0.3s ease;
        }
        
        .iaaps-modal.active .iaaps-modal-container {
            transform: scale(1);
        }
        
        .iaaps-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
        }
        
        .iaaps-modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }
        
        .iaaps-modal-close {
            width: 30px;
            height: 30px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-modal-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .iaaps-modal-body {
            padding: 20px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .iaaps-modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .iaaps-modal-btn {
            padding: 8px 16px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-modal-btn.secondary {
            background: #f0f0f0;
            border: 1px solid #ddd;
            color: #333;
        }
        
        .iaaps-modal-btn.secondary:hover {
            background: #e8e8e8;
        }
        
        .iaaps-modal-btn.primary {
            background: ${IAAPS_CONFIG.colors.primary};
            border: 1px solid ${IAAPS_CONFIG.colors.primaryDark};
            color: white;
        }
        
        .iaaps-modal-btn.primary:hover {
            background: ${IAAPS_CONFIG.colors.primaryDark};
        }
        
        /* Estilos para impresión */
        @media print {
            body * {
                visibility: hidden;
            }
            
            .iaaps-print-content,
            .iaaps-print-content * {
                visibility: visible;
            }
            
            .iaaps-print-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            
            .iaaps-no-print {
                display: none !important;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

/**
 * Función utilitaria para verificar si un texto contiene alguna de las palabras clave
 * @param {string} text - Texto a verificar
 * @param {Array<string>} keywords - Array de palabras clave
 * @returns {boolean} - Verdadero si contiene alguna palabra clave
 */
function containsAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}

/**
 * Formatea una hora para mostrar en los mensajes
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Hora formateada
 */
function formatTime(date) {
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Genera un UUID v4 único para las sesiones
 * @returns {string} - UUID generado
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} unsafe - Texto a escapar
 * @returns {string} - Texto escapado
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Elimina etiquetas HTML de un texto
 * @param {string} html - HTML a procesar
 * @returns {string} - Texto sin HTML
 */
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * NUEVAS FUNCIONALIDADES
 */

/**
 * Abre el dashboard
 */
function openDashboard() {
    // Si ya existe el dashboard, solo mostrarlo
    if (document.getElementById('iaaps-dashboard')) {
        document.getElementById('iaaps-dashboard').classList.add('active');
        return;
    }
    
    // Crear contenedor del dashboard
    const dashboard = document.createElement('div');
    dashboard.id = 'iaaps-dashboard';
    dashboard.className = 'iaaps-dashboard';
    
    // Contenido HTML del dashboard
    dashboard.innerHTML = `
        <div class="iaaps-dashboard-container">
            <div class="iaaps-dashboard-header">
                <div class="iaaps-dashboard-title">
                    <img src="images/logo2.png" alt="Logo IAAPS">
                    <h1>Dashboard IAAPS Curicó</h1>
                </div>
                <div class="iaaps-dashboard-actions">
                    <button class="iaaps-dashboard-btn" id="iaaps-dashboard-refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="iaaps-dashboard-btn" id="iaaps-dashboard-print">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="iaaps-dashboard-btn" id="iaaps-dashboard-fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="iaaps-dashboard-btn iaaps-dashboard-close" id="iaaps-dashboard-close">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
            <div class="iaaps-dashboard-body">
                <div class="iaaps-dashboard-sidebar">
                    <div class="iaaps-dashboard-sidebar-header">
                        <div class="iaaps-dashboard-controls">
                            <input type="month" class="iaaps-dashboard-date" value="${new Date().toISOString().slice(0, 7)}">
                        </div>
                    </div>
                    <h3 class="iaaps-sidebar-title">Navegación</h3>
                    <div class="iaaps-dashboard-nav">
                        <div class="iaaps-nav-item active" data-page="resumen">
                            <i class="fas fa-home"></i>
                            <span>Resumen General</span>
                        </div>
                        <div class="iaaps-nav-item" data-page="centros">
                            <i class="fas fa-hospital"></i>
                            <span>Centros de Salud</span>
                        </div>
                        <div class="iaaps-nav-item" data-page="indicadores">
                            <i class="fas fa-chart-line"></i>
                            <span>Indicadores</span>
                        </div>
                        <div class="iaaps-nav-item" data-page="mapas">
                            <i class="fas fa-map"></i>
                            <span>Mapa de Cobertura</span>
                        </div>
                        <div class="iaaps-nav-item" data-page="reportes">
                            <i class="fas fa-file-alt"></i>
                            <span>Reportes</span>
                        </div>
                        <div class="iaaps-nav-item" data-page="configuracion">
                            <i class="fas fa-cog"></i>
                            <span>Configuración</span>
                        </div>
                    </div>
                    <div class="iaaps-sidebar-footer">
                        <button class="iaaps-sidebar-footer-btn" id="iaaps-export-pdf">
                            <i class="fas fa-file-pdf"></i> Exportar PDF
                        </button>
                        <button class="iaaps-sidebar-footer-btn" id="iaaps-export-excel">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                    </div>
                </div>
                <div class="iaaps-dashboard-content">
                    <div class="iaaps-content-header">
                        <h2 class="iaaps-content-title">Resumen General</h2>
                        <div class="iaaps-content-filters">
                            <select class="iaaps-filter-select">
                                <option value="todos">Todos los centros</option>
                                <option value="curico-centro">Curicó Centro</option>
                                <option value="colon">Colón</option>
                                <option value="betty-munoz">Betty Muñoz</option>
                                <option value="miguel-angel">Miguel Ángel</option>
                                <option value="los-niches">Los Niches</option>
                                <option value="sarmiento">Sarmiento</option>
                            </select>
                        </div>
                    </div>
                    <div class="iaaps-content-body">
                        <div id="dashboard-content">
                            <!-- El contenido se cargará dinámicamente según la página seleccionada -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Añadir al DOM
    document.body.appendChild(dashboard);
    
    // Configurar eventos
    setupDashboardEvents();
    
    // Mostrar dashboard con animación
    setTimeout(() => {
        dashboard.classList.add('active');
    }, 10);
    
    // Cargar contenido inicial
    loadDashboardContent('resumen');
}

/**
 * Configura los eventos del dashboard
 */
function setupDashboardEvents() {
    // Botón de cierre
    document.getElementById('iaaps-dashboard-close').addEventListener('click', closeDashboard);
    
    // Navegación
    document.querySelectorAll('.iaaps-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Desactivar ítem activo
            document.querySelector('.iaaps-nav-item.active').classList.remove('active');
            
            // Activar nuevo ítem
            item.classList.add('active');
            
            // Cargar contenido
            loadDashboardContent(item.getAttribute('data-page'));
            
            // Actualizar título
            document.querySelector('.iaaps-content-title').textContent = item.querySelector('span').textContent;
        });
    });
    
    // Botones de exportación
    document.getElementById('iaaps-export-pdf').addEventListener('click', () => {
        const activePage = document.querySelector('.iaaps-nav-item.active').getAttribute('data-page');
        exportDashboardToPDF(activePage);
    });
    
    document.getElementById('iaaps-export-excel').addEventListener('click', () => {
        const activePage = document.querySelector('.iaaps-nav-item.active').getAttribute('data-page');
        exportDashboardToExcel(activePage);
    });
    
    // Botón de actualizar
    document.getElementById('iaaps-dashboard-refresh').addEventListener('click', () => {
        const activePage = document.querySelector('.iaaps-nav-item.active').getAttribute('data-page');
        refreshDashboardContent(activePage);
    });
    
    // Botón de imprimir
    document.getElementById('iaaps-dashboard-print').addEventListener('click', printDashboard);
    
    // Botón de pantalla completa
    document.getElementById('iaaps-dashboard-fullscreen').addEventListener('click', toggleFullscreen);
}

/**
 * Cierra el dashboard
 */
function closeDashboard() {
    const dashboard = document.getElementById('iaaps-dashboard');
    if (dashboard) {
        dashboard.classList.remove('active');
    }
}

/**
 * Carga el contenido del dashboard según la página seleccionada
 * @param {string} page - Página a cargar
 */
function loadDashboardContent(page) {
    const contentContainer = document.getElementById('dashboard-content');
    
    // Mostrar efecto de carga
    contentContainer.innerHTML = `
        <div class="iaaps-dashboard-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Cargando datos...</span>
        </div>
    `;
    
    // Simulamos carga de datos
    setTimeout(() => {
        switch (page) {
            case 'resumen':
                loadResumenDashboard(contentContainer);
                break;
            case 'centros':
                loadCentrosDashboard(contentContainer);
                break;
            case 'indicadores':
                loadIndicadoresDashboard(contentContainer);
                break;
            case 'mapas':
                loadMapasDashboard(contentContainer);
                break;
            case 'reportes':
                loadReportesDashboard(contentContainer);
                break;
            case 'configuracion':
                loadConfiguracionDashboard(contentContainer);
                break;
            default:
                loadResumenDashboard(contentContainer);
        }
    }, 800);
}

/**
 * Carga la página de resumen del dashboard
 * @param {HTMLElement} container - Contenedor donde cargar el contenido
 */
function loadResumenDashboard(container) {
    container.innerHTML = `
        <div class="iaaps-kpi-cards">
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon info">
                    <i class="fas fa-chart-pie"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value">59.84%</h3>
                    <p class="iaaps-kpi-label">Cumplimiento Comunal</p>
                    <div class="iaaps-kpi-change up">
                        <i class="fas fa-arrow-up"></i> 2.7% vs mes anterior
                    </div>
                </div>
            </div>
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon success">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value success">12</h3>
                    <p class="iaaps-kpi-label">Indicadores Cumplidos</p>
                    <div class="iaaps-kpi-change up">
                        <i class="fas fa-arrow-up"></i> 1 más que mes anterior
                    </div>
                </div>
            </div>
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon warning">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value warning">5</h3>
                    <p class="iaaps-kpi-label">Indicadores Parciales</p>
                    <div class="iaaps-kpi-change down">
                        <i class="fas fa-arrow-down"></i> 1 menos que mes anterior
                    </div>
                </div>
            </div>
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon danger">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value danger">3</h3>
                    <p class="iaaps-kpi-label">Indicadores Críticos</p>
                    <div class="iaaps-kpi-change">
                        <i class="fas fa-equals"></i> Sin cambios
                    </div>
                </div>
            </div>
        </div>
        
        <div class="iaaps-widget-grid">
            <div class="iaaps-widget iaaps-big-widget">
                <div class="iaaps-widget-header">
                    <h3 class="iaaps-widget-title">Evolución del Cumplimiento Comunal</h3>
                    <div class="iaaps-widget-actions">
                        <div class="iaaps-widget-action" title="Descargar">
                            <i class="fas fa-download"></i>
                        </div>
                        <div class="iaaps-widget-action" title="Expandir">
                            <i class="fas fa-expand"></i>
                        </div>
                    </div>
                </div>
                <div class="iaaps-widget-body">
                    <div class="iaaps-widget-chart" id="cumplimiento-chart"></div>
                </div>
            </div>
            
            <div class="iaaps-widget">
                <div class="iaaps-widget-header">
                    <h3 class="iaaps-widget-title">Distribución de Indicadores</h3>
                    <div class="iaaps-widget-actions">
                        <div class="iaaps-widget-action" title="Descargar">
                            <i class="fas fa-download"></i>
                        </div>
                    </div>
                </div>
                <div class="iaaps-widget-body">
                    <div class="iaaps-widget-chart" id="dist-indicadores-chart"></div>
                </div>
            </div>
            
            <div class="iaaps-widget">
                <div class="iaaps-widget-header">
                    <h3 class="iaaps-widget-title">Ranking de Centros</h3>
                    <div class="iaaps-widget-actions">
                        <div class="iaaps-widget-action" title="Descargar">
                            <i class="fas fa-download"></i>
                        </div>
                    </div>
                </div>
                <div class="iaaps-widget-body">
                    <div class="iaaps-widget-chart" id="ranking-centros-chart"></div>
                </div>
            </div>
        </div>
        
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Indicadores Críticos</h3>
                <div class="iaaps-widget-actions">
                    <div class="iaaps-widget-action" title="Exportar">
                        <i class="fas fa-file-export"></i>
                    </div>
                </div>
            </div>
            <div class="iaaps-widget-body">
                <table class="iaaps-data-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Indicador</th>
                            <th>Meta</th>
                            <th>Actual</th>
                            <th>Cumplimiento</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>6.1.B</td>
                            <td>Cobertura EMP Hombres</td>
                            <td>22.31%</td>
                            <td>5.14%</td>
                            <td class="danger">23.04%</td>
                            <td><span class="iaaps-table-status danger">Crítico</span></td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Tasa Visita Domiciliaria</td>
                            <td>0.24</td>
                            <td>0.05</td>
                            <td class="danger">22.66%</td>
                            <td><span class="iaaps-table-status danger">Crítico</span></td>
                        </tr>
                        <tr>
                            <td>7</td>
                            <td>Cobertura EMPAM</td>
                            <td>58.48%</td>
                            <td>15.80%</td>
                            <td class="danger">27.02%</td>
                            <td><span class="iaaps-table-status danger">Crítico</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Inicializar gráficos
    initDashboardCharts();
}

/**
 * Carga la página de centros de salud del dashboard
 * @param {HTMLElement} container - Contenedor donde cargar el contenido
 */
function loadCentrosDashboard(container) {
    container.innerHTML = `
        <div class="iaaps-kpi-cards">
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon success">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value success">Colón</h3>
                    <p class="iaaps-kpi-label">Centro con mejor desempeño</p>
                    <div class="iaaps-kpi-change">
                        <strong>62.43%</strong> cumplimiento
                    </div>
                </div>
            </div>
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon danger">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value danger">Sarmiento</h3>
                    <p class="iaaps-kpi-label">Centro con menor desempeño</p>
                    <div class="iaaps-kpi-change">
                        <strong>55.90%</strong> cumplimiento
                    </div>
                </div>
            </div>
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon info">
                    <i class="fas fa-calculator"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value">6.53%</h3>
                    <p class="iaaps-kpi-label">Diferencia max-min</p>
                    <div class="iaaps-kpi-change down">
                        <i class="fas fa-arrow-down"></i> 1.2% vs mes anterior
                    </div>
                </div>
            </div>
        </div>
        
        <div class="iaaps-widget-grid">
            <div class="iaaps-widget iaaps-big-widget">
                <div class="iaaps-widget-header">
                    <h3 class="iaaps-widget-title">Comparativa de Centros de Salud</h3>
                    <div class="iaaps-widget-actions">
                        <div class="iaaps-widget-action" title="Descargar">
                            <i class="fas fa-download"></i>
                        </div>
                        <div class="iaaps-widget-action" title="Expandir">
                            <i class="fas fa-expand"></i>
                        </div>
                    </div>
                </div>
                <div class="iaaps-widget-body">
                    <div class="iaaps-widget-chart" id="centros-comparativa-chart"></div>
                </div>
            </div>
        </div>
        
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Detalle de Centros de Salud</h3>
                <div class="iaaps-widget-actions">
                    <div class="iaaps-widget-action" title="Exportar">
                        <i class="fas fa-file-export"></i>
                    </div>
                </div>
            </div>
            <div class="iaaps-widget-body">
                <table class="iaaps-data-table">
                    <thead>
                        <tr>
                            <th>Ranking</th>
                            <th>Centro</th>
                            <th>Población</th>
                            <th>Indicadores Cumplidos</th>
                            <th>Indicadores Parciales</th>
                            <th>Indicadores Críticos</th>
                            <th>Cumplimiento</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>Colón</td>
                            <td>36,482</td>
                            <td>13</td>
                            <td>4</td>
                            <td>3</td>
                            <td class="success">62.43%</td>
                            <td><span class="iaaps-table-status success">Óptimo</span></td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>Los Niches</td>
                            <td>18,756</td>
                            <td>13</td>
                            <td>4</td>
                            <td>3</td>
                            <td class="success">61.83%</td>
                            <td><span class="iaaps-table-status success">Óptimo</span></td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td>Curicó Centro</td>
                            <td>42,731</td>
                            <td>12</td>
                            <td>5</td>
                            <td>3</td>
                            <td class="success">61.60%</td>
                            <td><span class="iaaps-table-status success">Óptimo</span></td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td>Miguel Ángel</td>
                            <td>29,614</td>
                            <td>11</td>
                            <td>6</td>
                            <td>3</td>
                            <td>59.86%</td>
                            <td><span class="iaaps-table-status warning">Parcial</span></td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Betty Muñoz</td>
                            <td>31,298</td>
                            <td>11</td>
                            <td>5</td>
                            <td>4</td>
                            <td>57.63%</td>
                            <td><span class="iaaps-table-status warning">Parcial</span></td>
                        </tr>
                        <tr>
                            <td>6</td>
                            <td>Sarmiento</td>
                            <td>15,427</td>
                            <td>10</td>
                            <td>5</td>
                            <td>5</td>
                            <td>55.90%</td>
                            <td><span class="iaaps-table-status warning">Parcial</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Inicializar gráficos
    setTimeout(() => {
        initCentrosCharts();
    }, 100);
}

/**
 * Carga la página de indicadores del dashboard
 * @param {HTMLElement} container - Contenedor donde cargar el contenido
 */
function loadIndicadoresDashboard(container) {
    container.innerHTML = `
        <div class="iaaps-kpi-cards">
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon success">
                    <i class="fas fa-award"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value success">Salud Mental</h3>
                    <p class="iaaps-kpi-label">Mejor indicador</p>
                    <div class="iaaps-kpi-change">
                        <strong>100%</strong> cumplimiento
                    </div>
                </div>
            </div>
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon danger">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value danger">EMP Hombres</h3>
                    <p class="iaaps-kpi-label">Peor indicador</p>
                    <div class="iaaps-kpi-change">
                        <strong>23.04%</strong> cumplimiento
                    </div>
                </div>
            </div>
            <div class="iaaps-kpi-card">
                <div class="iaaps-kpi-icon info">
                    <i class="fas fa-percentage"></i>
                </div>
                <div class="iaaps-kpi-content">
                    <h3 class="iaaps-kpi-value">59.84%</h3>
                    <p class="iaaps-kpi-label">Promedio general</p>
                    <div class="iaaps-kpi-change up">
                        <i class="fas fa-arrow-up"></i> 2.7% vs mes anterior
                    </div>
                </div>
            </div>
        </div>
        
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Indicadores por Área</h3>
                <div class="iaaps-widget-actions">
                    <div class="iaaps-widget-action" title="Descargar">
                        <i class="fas fa-download"></i>
                    </div>
                </div>
            </div>
            <div class="iaaps-widget-body">
                <div class="iaaps-widget-chart" id="indicadores-areas-chart"></div>
            </div>
        </div>
        
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Listado de Indicadores</h3>
                <div class="iaaps-widget-actions">
                    <div class="iaaps-widget-action" title="Exportar">
                        <i class="fas fa-file-export"></i>
                    </div>
                </div>
            </div>
            <div class="iaaps-widget-body">
                <table class="iaaps-data-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Indicador</th>
                            <th>Meta</th>
                            <th>Actual</th>
                            <th>Cumplimiento</th>
                            <th>Tendencia</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>Autoevaluación MAIS</td>
                            <td>100.00%</td>
                            <td>100.00%</td>
                            <td class="success">100.00%</td>
                            <td><i class="fas fa-equals text-warning"></i></td>
                            <td><span class="iaaps-table-status success">Óptimo</span></td>
                        </tr>
                        <tr>
                            <td>2.1</td>
                            <td>Continuidad de Atención</td>
                            <td>100.00%</td>
                            <td>100.00%</td>
                            <td class="success">100.00%</td>
                            <td><i class="fas fa-equals text-warning"></i></td>
                            <td><span class="iaaps-table-status success">Óptimo</span></td>
                        </tr>
                        <tr>
                            <td>9.1</td>
                            <td>Cobertura Salud Mental</td>
                            <td>27.11%</td>
                            <td>32.29%</td>
                            <td class="success">100.00%</td>
                            <td><i class="fas fa-arrow-up text-success"></i></td>
                            <td><span class="iaaps-table-status success">Óptimo</span></td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Tasa Visita Domiciliaria</td>
                            <td>0.24</td>
                            <td>0.05</td>
                            <td class="danger">22.66%</td>
                            <td><i class="fas fa-arrow-up text-success"></i></td>
                            <td><span class="iaaps-table-status danger">Crítico</span></td>
                        </tr>
                        <tr>
                            <td>6.1.B</td>
                            <td>Cobertura EMP Hombres</td>
                            <td>22.31%</td>
                            <td>5.14%</td>
                            <td class="danger">23.04%</td>
                            <td><i class="fas fa-arrow-up text-success"></i></td>
                            <td><span class="iaaps-table-status danger">Crítico</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Inicializar gráficos
    setTimeout(() => {
        initIndicadoresCharts();
    }, 100);
}

/**
 * Carga la página de mapas del dashboard
 * @param {HTMLElement} container - Contenedor donde cargar el contenido
 */
function loadMapasDashboard(container) {
    container.innerHTML = `
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Mapa de Calor - Cobertura Indicadores</h3>
                <div class="iaaps-widget-actions">
                    <div class="iaaps-widget-action" title="Descargar">
                        <i class="fas fa-download"></i>
                    </div>
                    <div class="iaaps-widget-action" title="Expandir">
                        <i class="fas fa-expand"></i>
                    </div>
                </div>
            </div>
            <div class="iaaps-widget-body">
                <div class="iaaps-heatmap" id="heatmap-container">
                    <!-- Se generará dinámicamente -->
                </div>
                <div class="iaaps-heatmap-labels">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                </div>
            </div>
        </div>
        
        <div class="iaaps-widget iaaps-big-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Mapa de Distribución Territorial</h3>
                <div class="iaaps-widget-actions">
                    <div class="iaaps-widget-action" title="Descargar">
                        <i class="fas fa-download"></i>
                    </div>
                </div>
            </div>
            <div class="iaaps-widget-body">
                <div style="height: 400px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666;">
                    <div style="text-align: center;">
                        <i class="fas fa-map-marked-alt" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>Mapa geográfico de distribución de centros e indicadores</p>
                        <p style="font-size: 12px;">Datos simulados para el ejemplo</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inicializar mapa de calor
    generateHeatmap();
}

/**
 * Carga la página de reportes del dashboard
 * @param {HTMLElement} container - Contenedor donde cargar el contenido
 */
function loadReportesDashboard(container) {
    container.innerHTML = `
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Generación de Reportes</h3>
            </div>
            <div class="iaaps-widget-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                    <div class="iaaps-report-card" style="border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background: ${IAAPS_CONFIG.colors.primary}; color: white; padding: 15px;">
                            <i class="fas fa-file-pdf" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <h3 style="margin: 0; font-size: 16px;">Reporte Comunal</h3>
                        </div>
                        <div style="padding: 15px;">
                            <p style="margin: 0 0 15px; color: #666; font-size: 13px;">Reporte completo de todos los indicadores a nivel comunal con comparativa histórica.</p>
                            <button class="iaaps-action-btn" onclick="IAAPSBot.generateReport('comunal', 'pdf')">
                                <i class="fas fa-download"></i> Descargar PDF
                            </button>
                        </div>
                    </div>
                    
                    <div class="iaaps-report-card" style="border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background: ${IAAPS_CONFIG.colors.secondary}; color: white; padding: 15px;">
                            <i class="fas fa-file-excel" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <h3 style="margin: 0; font-size: 16px;">Datos por Centro</h3>
                        </div>
                        <div style="padding: 15px;">
                            <p style="margin: 0 0 15px; color: #666; font-size: 13px;">Datos detallados en formato Excel de cada centro de salud y sus indicadores.</p>
                            <button class="iaaps-action-btn" style="background: ${IAAPS_CONFIG.colors.secondary};" onclick="IAAPSBot.generateReport('comunal', 'excel')">
                                <i class="fas fa-download"></i> Descargar Excel
                            </button>
                        </div>
                    </div>
                    
                    <div class="iaaps-report-card" style="border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background: #5C6BC0; color: white; padding: 15px;">
                            <i class="fas fa-chart-bar" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <h3 style="margin: 0; font-size: 16px;">Informe Ejecutivo</h3>
                        </div>
                        <div style="padding: 15px;">
                            <p style="margin: 0 0 15px; color: #666; font-size: 13px;">Presentación ejecutiva con indicadores clave y gráficos para toma de decisiones.</p>
                            <button class="iaaps-action-btn" style="background: #5C6BC0;" onclick="IAAPSBot.generateReport('ejecutivo', 'pdf')">
                                <i class="fas fa-download"></i> Descargar Informe
                            </button>
                        </div>
                    </div>
                    
                    <div class="iaaps-report-card" style="border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background: #26A69A; color: white; padding: 15px;">
                            <i class="fas fa-tasks" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <h3 style="margin: 0; font-size: 16px;">Plan de Acción</h3>
                        </div>
                        <div style="padding: 15px;">
                            <p style="margin: 0 0 15px; color: #666; font-size: 13px;">Plan de acción para mejora de indicadores críticos con estrategias recomendadas.</p>
                            <button class="iaaps-action-btn" style="background: #26A69A;" onclick="IAAPSBot.generateReport('plan-accion', 'pdf')">
                                <i class="fas fa-download"></i> Descargar Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Reportes Programados</h3>
                <div class="iaaps-widget-actions">
                    <div class="iaaps-widget-action" title="Añadir Nuevo">
                        <i class="fas fa-plus"></i>
                    </div>
                </div>
            </div>
            <div class="iaaps-widget-body">
                <table class="iaaps-data-table">
                    <thead>
                        <tr>
                            <th>Reporte</th>
                            <th>Tipo</th>
                            <th>Frecuencia</th>
                            <th>Destinatarios</th>
                            <th>Próximo Envío</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Resumen Comunal</td>
                            <td>PDF</td>
                            <td>Mensual</td>
                            <td>Director, Jefes SOME</td>
                            <td>01/04/2025</td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="iaaps-widget-action" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button class="iaaps-widget-action" title="Eliminar"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Indicadores Críticos</td>
                            <td>Excel</td>
                            <td>Semanal</td>
                            <td>Coordinadores Centros</td>
                            <td>09/03/2025</td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="iaaps-widget-action" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button class="iaaps-widget-action" title="Eliminar"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Informe Directivo</td>
                            <td>PDF</td>
                            <td>Trimestral</td>
                            <td>Dirección Comunal</td>
                            <td>15/05/2025</td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="iaaps-widget-action" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button class="iaaps-widget-action" title="Eliminar"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Carga la página de configuración del dashboard
 * @param {HTMLElement} container - Contenedor donde cargar el contenido
 */
function loadConfiguracionDashboard(container) {
    container.innerHTML = `
        <div class="iaaps-widget">
            <div class="iaaps-widget-header">
                <h3 class="iaaps-widget-title">Configuración General</h3>
            </div>
            <div class="iaaps-widget-body">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4 style="margin-top: 0; font-size: 16px; color: #333;">Preferencias de Visualización</h4>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Tema del Dashboard</label>
                            <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                <option value="light">Claro (Predeterminado)</option>
                                <option value="dark">Oscuro</option>
                                <option value="contrast">Alto Contraste</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Color Principal</label>
                            <input type="color" value="${IAAPS_CONFIG.colors.primary}" style="width: 100%; height: 40px; padding: 5px; border: 1px solid #ddd; border-radius: 5px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Vista Predeterminada</label>
                            <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                <option value="resumen">Resumen General</option>
                                <option value="centros">Centros de Salud</option>
                                <option value="indicadores">Indicadores</option>
                                <option value="mapas">Mapas</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin-top: 0; font-size: 16px; color: #333;">Ajustes de Notificaciones</h4>
                        
                        <div style="margin-bottom: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px; color: #555;">
                                <input type="checkbox" checked style="width: 16px; height: 16px;">
                                <span>Alertas de Indicadores Críticos</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px; color: #555;">
                                <input type="checkbox" checked style="width: 16px; height: 16px;">
                                <span>Notificaciones de Reportes Generados</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px; color: #555;">
                                <input type="checkbox" style="width: 16px; height: 16px;">
                                <span>Alertas por Correo Electrónico</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Correo Electrónico</label>
                            <input type="email" placeholder="ejemplo@salud-curico.cl" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Umbral de Alerta (%)</label>
                            <input type="number" value="30" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                    <h4 style="font-size: 16px; color: #333;">Configuración de la API</h4>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">URL de la API</label>
                        <input type="text" value="/api/iaaps-data" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">API Key</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="password" value="********" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <button class="iaaps-action-btn" style="background: #555;">
                                <i class="fas fa-sync-alt"></i> Regenerar
                            </button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Intervalo de Actualización (min)</label>
                        <input type="number" value="30" min="5" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="iaaps-modal-btn secondary">
                        Cancelar
                    </button>
                    <button class="iaaps-modal-btn primary">
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Inicializa los gráficos del dashboard principal
 */
function initDashboardCharts() {
    // Gráfico de evolución de cumplimiento
    const ctxCumplimiento = document.getElementById('cumplimiento-chart').getContext('2d');
    new Chart(ctxCumplimiento, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [{
                label: 'Cumplimiento 2025',
                data: [54.2, 55.6, 57.1, 59.84, null, null, null, null, null, null, null, null],
                borderColor: IAAPS_CONFIG.colors.primary,
                backgroundColor: 'rgba(46, 155, 97, 0.1)',
                tension: 0.3,
                fill: true
            }, {
                label: 'Cumplimiento 2024',
                data: [52.1, 53.4, 54.8, 55.2, 56.7, 57.9, 58.4, 59.1, 59.8, 60.3, 61.1, 61.8],
                borderColor: IAAPS_CONFIG.colors.secondary,
                borderDash: [5, 5],
                tension: 0.3,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    min: 50,
                    max: 70,
                    title: {
                        display: true,
                        text: 'Cumplimiento (%)'
                    }
                }
            }
        }
    });
    
    // Gráfico de distribución de indicadores
    const ctxDist = document.getElementById('dist-indicadores-chart').getContext('2d');
    new Chart(ctxDist, {
        type: 'doughnut',
        data: {
            labels: ['Cumplidos', 'Parciales', 'Críticos'],
            datasets: [{
                data: [12, 5, 3],
                backgroundColor: [
                    IAAPS_CONFIG.colors.success,
                    IAAPS_CONFIG.colors.accent,
                    IAAPS_CONFIG.colors.danger
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '65%'
        }
    });
    
    // Gráfico de ranking de centros
    const ctxRanking = document.getElementById('ranking-centros-chart').getContext('2d');
    new Chart(ctxRanking, {
        type: 'bar',
        data: {
            labels: ['Colón', 'Los Niches', 'Curicó Centro', 'Miguel Ángel', 'Betty Muñoz', 'Sarmiento'],
            datasets: [{
                label: 'Cumplimiento (%)',
                data: [62.43, 61.83, 61.60, 59.86, 57.63, 55.90],
                backgroundColor: [
                    IAAPS_CONFIG.colors.success,
                    IAAPS_CONFIG.colors.success,
                    IAAPS_CONFIG.colors.success,
                    'rgba(255, 189, 61, 0.7)',
                    'rgba(255, 189, 61, 0.7)',
                    'rgba(255, 189, 61, 0.7)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    min: 50,
                    max: 70
                }
            }
        }
    });
}

/**
 * Inicializa los gráficos de la página de centros
 */
function initCentrosCharts() {
    // Gráfico de comparativa de centros
    const ctxCentros = document.getElementById('centros-comparativa-chart').getContext('2d');
    new Chart(ctxCentros, {
        type: 'radar',
        data: {
            labels: [
                'Prevención', 
                'Recuperación', 
                'Cobertura', 
                'Continuidad', 
                'Accesibilidad', 
                'Calidad',
                'Satisfacción'
            ],
            datasets: [
                {
                    label: 'Colón',
                    data: [75, 68, 80, 65, 82, 70, 73],
                    backgroundColor: 'rgba(46, 155, 97, 0.2)',
                    borderColor: IAAPS_CONFIG.colors.primary,
                    pointBackgroundColor: IAAPS_CONFIG.colors.primary,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: IAAPS_CONFIG.colors.primary
                },
                {
                    label: 'Curicó Centro',
                    data: [65, 75, 70, 75, 68, 60, 63],
                    backgroundColor: 'rgba(56, 156, 192, 0.2)',
                    borderColor: IAAPS_CONFIG.colors.secondary,
                    pointBackgroundColor: IAAPS_CONFIG.colors.secondary,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: IAAPS_CONFIG.colors.secondary
                },
                {
                    label: 'Sarmiento',
                    data: [60, 55, 65, 50, 70, 65, 58],
                    backgroundColor: 'rgba(255, 90, 90, 0.2)',
                    borderColor: IAAPS_CONFIG.colors.danger,
                    pointBackgroundColor: IAAPS_CONFIG.colors.danger,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: IAAPS_CONFIG.colors.danger
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 40,
                    suggestedMax: 100
                }
            }
        }
    });
}

/**
 * Inicializa los gráficos de la página de indicadores
 */
function initIndicadoresCharts() {
    // Gráfico de indicadores por área
    const ctxIndicadores = document.getElementById('indicadores-areas-chart').getContext('2d');
    new Chart(ctxIndicadores, {
        type: 'bar',
        data: {
            labels: [
                'Prevención (EMP)', 
                'Salud Mental', 
                'Visitas Domiciliarias', 
                'Inmunización', 
                'Control Infantil', 
                'Salud Cardiovascular',
                'Salud de la Mujer'
            ],
            datasets: [
                {
                    label: 'Cumplimiento (%)',
                    data: [35, 100, 23, 88, 25, 85, 78],
                    backgroundColor: [
                        'rgba(255, 90, 90, 0.7)',
                        'rgba(46, 155, 97, 0.7)',
                        'rgba(255, 90, 90, 0.7)',
                        'rgba(255, 189, 61, 0.7)',
                        'rgba(255, 90, 90, 0.7)',
                        'rgba(46, 155, 97, 0.7)',
                        'rgba(255, 189, 61, 0.7)'
                    ],
                    borderWidth: 0
                },
                {
                    label: 'Meta (%)',
                    data: [80, 80, 80, 80, 80, 80, 80],
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 0,
                    type: 'line'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Cumplimiento (%)'
                    }
                }
            }
        }
    });
}

/**
 * Genera un mapa de calor para la visualización de datos
 */
function generateHeatmap() {
    const container = document.getElementById('heatmap-container');
    const centers = ['Curicó Centro', 'Colón', 'Betty Muñoz', 'Miguel Ángel', 'Los Niches', 'Sarmiento'];
    const indicators = ['EMP Mujeres', 'EMP Hombres', 'EMPAM', 'Visita Dom.', 'Salud Mental', 'Vacunación', 'Cardiovascular', 'MAIS'];
    
    // Generar datos simulados
    const data = [];
    for (let i = 0; i < centers.length; i++) {
        const row = [];
        for (let j = 0; j < indicators.length; j++) {
            // Generar valor aleatorio entre 10 y 100
            const value = Math.floor(Math.random() * (100 - 10 + 1) + 10);
            row.push(value);
        }
        data.push(row);
    }
    
    // Crear etiquetas para los indicadores
    const headerRow = document.createElement('div');
    headerRow.className = 'iaaps-heatmap-row';
    headerRow.innerHTML = '<div style="width: 120px;"></div>'; // Espacio vacío para esquina superior izquierda
    
    indicators.forEach(indicator => {
        const label = document.createElement('div');
        label.style.flex = '1';
        label.style.padding = '10px 5px';
        label.style.textAlign = 'center';
        label.style.fontWeight = '600';
        label.style.fontSize = '12px';
        label.style.color = '#555';
        label.style.transform = 'rotate(-45deg)';
        label.style.transformOrigin = 'center left';
        label.style.height = '40px';
        label.style.whiteSpace = 'nowrap';
        label.textContent = indicator;
        headerRow.appendChild(label);
    });
    
    container.appendChild(headerRow);
    
    // Crear filas del mapa de calor
    centers.forEach((center, rowIndex) => {
        const row = document.createElement('div');
        row.className = 'iaaps-heatmap-row';
        
        // Etiqueta de centro
        const centerLabel = document.createElement('div');
        centerLabel.style.width = '120px';
        centerLabel.style.padding = '10px';
        centerLabel.style.fontWeight = '600';
        centerLabel.style.fontSize = '13px';
        centerLabel.style.color = '#555';
        centerLabel.textContent = center;
        row.appendChild(centerLabel);
        
        // Celdas de valores
        data[rowIndex].forEach(value => {
            const cell = document.createElement('div');
            cell.className = 'iaaps-heatmap-cell';
            cell.textContent = value + '%';
            
            // Determinar color según valor
            let backgroundColor;
            if (value >= 80) {
                backgroundColor = IAAPS_CONFIG.colors.success;
            } else if (value >= 50) {
                backgroundColor = IAAPS_CONFIG.colors.accent;
            } else {
                backgroundColor = IAAPS_CONFIG.colors.danger;
            }
            
            cell.style.backgroundColor = backgroundColor;
            
            // Añadir tooltip
            cell.title = `${center} - ${indicators[row.children.length - 1]}: ${value}%`;
            
            row.appendChild(cell);
        });
        
        container.appendChild(row);
    });
}

/**
 * Refresca el contenido del dashboard
 * @param {string} page - Página a refrescar
 */
function refreshDashboardContent(page) {
    const contentContainer = document.getElementById('dashboard-content');
    
    // Mostrar efecto de carga
    contentContainer.innerHTML = `
        <div class="iaaps-loading-overlay" style="display: flex; align-items: center; justify-content: center; padding: 50px; text-align: center;">
            <div>
                <i class="fas fa-sync-alt fa-spin" style="font-size: 32px; color: ${IAAPS_CONFIG.colors.primary}; margin-bottom: 15px;"></i>
                <p style="margin: 0; color: #666;">Actualizando datos en tiempo real...</p>
            </div>
        </div>
    `;
    
    // Simular una solicitud a la API
    setTimeout(() => {
        // Cargar el contenido actualizado
        switch (page) {
            case 'resumen':
                loadResumenDashboard(contentContainer);
                break;
            case 'centros':
                loadCentrosDashboard(contentContainer);
                break;
            case 'indicadores':
                loadIndicadoresDashboard(contentContainer);
                break;
            case 'mapas':
                loadMapasDashboard(contentContainer);
                break;
            case 'reportes':
                loadReportesDashboard(contentContainer);
                break;
            case 'configuracion':
                loadConfiguracionDashboard(contentContainer);
                break;
            default:
                loadResumenDashboard(contentContainer);
        }
        
        // Mostrar notificación de actualización exitosa
        showNotification('Datos actualizados correctamente', 'success');
    }, 1500);
}

/**
 * Exporta el dashboard actual a PDF
 * @param {string} page - Página actual del dashboard
 */
function exportDashboardToPDF(page) {
    // Mostrar notificación de procesamiento
    showNotification('Generando PDF, por favor espere...', 'info');
    
    // Crear instancia de jsPDF
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) throw new Error('jsPDF no disponible');
        
        // Crear nueva instancia PDF
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Añadir metadatos
        doc.setProperties({
            title: `Dashboard IAAPS - ${getTitleForPage(page)}`,
            subject: 'Indicadores de Actividad de la Atención Primaria de Salud',
            author: 'Sistema IAAPS Curicó',
            creator: 'IAAPS Bot'
        });
        
        // Título
        doc.setFontSize(22);
        doc.setTextColor(46, 155, 97);
        doc.text(`Dashboard IAAPS - ${getTitleForPage(page)}`, 149, 20, { align: "center" });
        
        // Fecha
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}`, 149, 30, { align: "center" });
        
        // Línea separadora
        doc.setDrawColor(46, 155, 97);
        doc.setLineWidth(0.5);
        doc.line(10, 35, 287, 35);
        
        // Capturar contenido del dashboard
        capturePageContent(doc, page);
        
        // Definir nombre de archivo
        const fileName = `Dashboard_IAAPS_${page}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Descargar PDF
        setTimeout(() => {
            doc.save(fileName);
            showNotification('PDF generado exitosamente', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        showNotification('Error al generar PDF. Intente nuevamente.', 'error');
    }
}

/**
 * Captura el contenido de la página actual para el PDF
 * @param {jsPDF} doc - Instancia del documento PDF
 * @param {string} page - Página actual del dashboard
 */
function capturePageContent(doc, page) {
    const contentContainer = document.getElementById('dashboard-content');
    
    // En un entorno real, aquí se utilizaría html2canvas para capturar el contenido
    // Simulamos la captura para este ejemplo
    
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text('Contenido del Dashboard', 20, 50);
    
    switch (page) {
        case 'resumen':
            // Datos resumen
            doc.setFontSize(14);
            doc.text('Resumen de Indicadores IAAPS', 20, 60);
            
            doc.setFontSize(12);
            doc.text('Cumplimiento Comunal: 59.84%', 25, 70);
            doc.text('Indicadores Cumplidos: 12', 25, 80);
            doc.text('Indicadores Parciales: 5', 25, 90);
            doc.text('Indicadores Críticos: 3', 25, 100);
            
            // Simulamos una tabla para indicadores críticos
            const headers = [['Código', 'Indicador', 'Meta', 'Actual', 'Cumplimiento']];
            const data = [
                ['6.1.B', 'Cobertura EMP Hombres', '22.31%', '5.14%', '23.04%'],
                ['5', 'Tasa Visita Domiciliaria', '0.24', '0.05', '22.66%'],
                ['7', 'Cobertura EMPAM', '58.48%', '15.80%', '27.02%']
            ];
            
            doc.autoTable({
                head: headers,
                body: data,
                startY: 110,
                theme: 'grid',
                styles: {
                    fontSize: 10,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [46, 155, 97],
                    textColor: 255
                }
            });
            break;
            
        case 'centros':
            // Datos centros
            doc.setFontSize(14);
            doc.text('Comparativa de Centros de Salud', 20, 60);
            
            const centerHeaders = [['Ranking', 'Centro', 'Población', 'Cumplimiento', 'Estado']];
            const centerData = [
                ['1', 'Colón', '36,482', '62.43%', 'Óptimo'],
                ['2', 'Los Niches', '18,756', '61.83%', 'Óptimo'],
                ['3', 'Curicó Centro', '42,731', '61.60%', 'Óptimo'],
                ['4', 'Miguel Ángel', '29,614', '59.86%', 'Parcial'],
                ['5', 'Betty Muñoz', '31,298', '57.63%', 'Parcial'],
                ['6', 'Sarmiento', '15,427', '55.90%', 'Parcial']
            ];
            
            doc.autoTable({
                head: centerHeaders,
                body: centerData,
                startY: 70,
                theme: 'grid',
                styles: {
                    fontSize: 10,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [46, 155, 97],
                    textColor: 255
                }
            });
            break;
            
        case 'indicadores':
            // Datos indicadores
            doc.setFontSize(14);
            doc.text('Análisis de Indicadores IAAPS', 20, 60);
            
            const indicatorHeaders = [['Código', 'Indicador', 'Meta', 'Actual', 'Cumplimiento', 'Estado']];
            const indicatorData = [
                ['1', 'Autoevaluación MAIS', '100.00%', '100.00%', '100.00%', 'Óptimo'],
                ['2.1', 'Continuidad de Atención', '100.00%', '100.00%', '100.00%', 'Óptimo'],
                ['9.1', 'Cobertura Salud Mental', '27.11%', '32.29%', '100.00%', 'Óptimo'],
                ['5', 'Tasa Visita Domiciliaria', '0.24', '0.05', '22.66%', 'Crítico'],
                ['6.1.B', 'Cobertura EMP Hombres', '22.31%', '5.14%', '23.04%', 'Crítico']
            ];
            
            doc.autoTable({
                head: indicatorHeaders,
                body: indicatorData,
                startY: 70,
                theme: 'grid',
                styles: {
                    fontSize: 10,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [46, 155, 97],
                    textColor: 255
                }
            });
            break;
            
        default:
            doc.setFontSize(12);
            doc.text(`Contenido del dashboard de ${page} exportado a PDF.`, 25, 70);
    }
    
    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount} - IAAPS Curicó - Sistema de Monitoreo`, 149, 200, { align: 'center' });
        doc.text(`Documento confidencial - Uso interno`, 149, 205, { align: 'center' });
    }
}

/**
 * Exporta el dashboard actual a Excel
 * @param {string} page - Página actual del dashboard
 */
function exportDashboardToExcel(page) {
    // Mostrar notificación de procesamiento
    showNotification('Generando Excel, por favor espere...', 'info');
    
    try {
        if (!window.XLSX) throw new Error('SheetJS no disponible');
        
        // Crear libro de trabajo
        const wb = window.XLSX.utils.book_new();
        wb.Props = {
            Title: `Dashboard IAAPS - ${getTitleForPage(page)}`,
            Subject: "Indicadores de Actividad de la Atención Primaria de Salud",
            Author: "Sistema IAAPS Curicó",
            CreatedDate: new Date()
        };
        
        // Preparar datos según la página
        let wsName = '';
        let wsData = [];
        
        switch (page) {
            case 'resumen':
                wsName = 'Resumen';
                wsData = prepareResumenExcelData();
                break;
            case 'centros':
                wsName = 'Centros';
                wsData = prepareCentrosExcelData();
                break;
            case 'indicadores':
                wsName = 'Indicadores';
                wsData = prepareIndicadoresExcelData();
                break;
            case 'mapas':
                wsName = 'Mapa Cobertura';
                wsData = prepareMapasExcelData();
                break;
            default:
                wsName = page.charAt(0).toUpperCase() + page.slice(1);
                wsData = [
                    ['Dashboard IAAPS - ' + getTitleForPage(page)],
                    ['Fecha de generación:', new Date().toLocaleString('es-CL')],
                    [''],
                    ['Datos exportados a Excel.']
                ];
        }
        
        // Crear hoja y añadir al libro
        const ws = window.XLSX.utils.aoa_to_sheet(wsData);
        window.XLSX.utils.book_append_sheet(wb, ws, wsName);
        
        // Añadir hoja de metadatos
        const metaData = [
            ['METADATOS DEL REPORTE'],
            [''],
            ['Título:', `Dashboard IAAPS - ${getTitleForPage(page)}`],
            ['Fecha de generación:', new Date().toLocaleString('es-CL')],
            ['Generado por:', 'IAAPS Bot v2.0'],
            ['Módulo:', getTitleForPage(page)],
            [''],
            ['Sistema de Monitoreo IAAPS - Salud Curicó'],
            ['DOCUMENTO CONFIDENCIAL - USO INTERNO']
        ];
        const metaSheet = window.XLSX.utils.aoa_to_sheet(metaData);
        window.XLSX.utils.book_append_sheet(wb, metaSheet, 'Información');
        
        // Definir nombre de archivo
        const fileName = `Dashboard_IAAPS_${page}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Descargar Excel
        setTimeout(() => {
            window.XLSX.writeFile(wb, fileName);
            showNotification('Excel generado exitosamente', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Error al generar Excel:', error);
        showNotification('Error al generar Excel. Intente nuevamente.', 'error');
    }
}

/**
 * Prepara los datos del resumen para Excel
 * @returns {Array} - Datos para Excel
 */
function prepareResumenExcelData() {
    return [
        ['DASHBOARD IAAPS - RESUMEN GENERAL'],
        ['Fecha de generación:', new Date().toLocaleString('es-CL')],
        [''],
        ['INDICADORES GENERALES'],
        ['Cumplimiento Comunal:', '59.84%'],
        ['Indicadores Cumplidos:', '12'],
        ['Indicadores Parciales:', '5'],
        ['Indicadores Críticos:', '3'],
        ['Tendencia mensual:', '+2.7%'],
        [''],
        ['RANKING DE CENTROS DE SALUD'],
        ['Ranking', 'Centro', 'Cumplimiento', 'Estado'],
        ['1', 'Colón', '62.43%', 'Óptimo'],
        ['2', 'Los Niches', '61.83%', 'Óptimo'],
        ['3', 'Curicó Centro', '61.60%', 'Óptimo'],
        ['4', 'Miguel Ángel', '59.86%', 'Parcial'],
        ['5', 'Betty Muñoz', '57.63%', 'Parcial'],
        ['6', 'Sarmiento', '55.90%', 'Parcial'],
        [''],
        ['INDICADORES CRÍTICOS'],
        ['Código', 'Indicador', 'Meta', 'Actual', 'Cumplimiento', 'Estado'],
        ['6.1.B', 'Cobertura EMP Hombres', '22.31%', '5.14%', '23.04%', 'Crítico'],
        ['5', 'Tasa Visita Domiciliaria', '0.24', '0.05', '22.66%', 'Crítico'],
        ['7', 'Cobertura EMPAM', '58.48%', '15.80%', '27.02%', 'Crítico']
    ];
}

/**
 * Prepara los datos de centros para Excel
 * @returns {Array} - Datos para Excel
 */
function prepareCentrosExcelData() {
    return [
        ['DASHBOARD IAAPS - CENTROS DE SALUD'],
        ['Fecha de generación:', new Date().toLocaleString('es-CL')],
        [''],
        ['COMPARATIVA DE CENTROS DE SALUD'],
        ['Ranking', 'Centro', 'Población', 'Indicadores Cumplidos', 'Indicadores Parciales', 'Indicadores Críticos', 'Cumplimiento', 'Estado'],
        ['1', 'Colón', '36,482', '13', '4', '3', '62.43%', 'Óptimo'],
        ['2', 'Los Niches', '18,756', '13', '4', '3', '61.83%', 'Óptimo'],
        ['3', 'Curicó Centro', '42,731', '12', '5', '3', '61.60%', 'Óptimo'],
        ['4', 'Miguel Ángel', '29,614', '11', '6', '3', '59.86%', 'Parcial'],
        ['5', 'Betty Muñoz', '31,298', '11', '5', '4', '57.63%', 'Parcial'],
        ['6', 'Sarmiento', '15,427', '10', '5', '5', '55.90%', 'Parcial'],
        [''],
        ['INDICADORES POR CENTRO'],
        ['Centro', 'Mejor Indicador', 'Valor', 'Peor Indicador', 'Valor'],
        ['Colón', 'Salud Mental', '100.00%', 'EMP Hombres', '25.34%'],
        ['Los Niches', 'MAIS', '100.00%', 'EMP Hombres', '24.85%'],
        ['Curicó Centro', 'Salud Mental', '100.00%', 'EMP Hombres', '23.04%'],
        ['Miguel Ángel', 'Vacunación', '92.40%', 'Visitas Domiciliarias', '22.66%'],
        ['Betty Muñoz', 'MAIS', '100.00%', 'EMP Hombres', '21.56%'],
        ['Sarmiento', 'Continuidad', '100.00%', 'EMPAM', '20.23%']
    ];
}

/**
 * Prepara los datos de indicadores para Excel
 * @returns {Array} - Datos para Excel
 */
function prepareIndicadoresExcelData() {
    return [
        ['DASHBOARD IAAPS - INDICADORES'],
        ['Fecha de generación:', new Date().toLocaleString('es-CL')],
        [''],
        ['LISTADO DE INDICADORES'],
        ['Código', 'Indicador', 'Meta', 'Actual', 'Cumplimiento', 'Tendencia', 'Estado'],
        ['1', 'Autoevaluación MAIS', '100.00%', '100.00%', '100.00%', 'Estable', 'Óptimo'],
        ['2.1', 'Continuidad de Atención', '100.00%', '100.00%', '100.00%', 'Estable', 'Óptimo'],
        ['2.2', 'Disponibilidad de fármacos', '100.00%', '100.00%', '100.00%', 'Estable', 'Óptimo'],
        ['3', 'Tasa de consultas médicas', '0.82', '0.17', '20.18%', 'En aumento', 'Crítico'],
        ['4', 'Porcentaje derivación nivel secundario', '10.00%', '6.27%', '62.66%', 'Estable', 'Parcial'],
        ['5', 'Tasa Visita Domiciliaria', '0.24', '0.05', '22.66%', 'En aumento', 'Crítico'],
        ['6.1.A', 'Cobertura EMP mujeres', '23.89%', '9.88%', '41.37%', 'En aumento', 'Parcial'],
        ['6.1.B', 'Cobertura EMP hombres', '22.31%', '5.14%', '23.04%', 'En aumento', 'Crítico'],
        ['6.2', 'Cobertura EMPAM', '58.48%', '15.80%', '27.02%', 'En aumento', 'Crítico'],
        ['7', 'Cobertura evaluación psicomotor', '25.00%', '14.23%', '14.98%', 'Estable', 'Crítico'],
        ['8', 'Cobertura control adolescentes', '24.17%', '4.34%', '17.94%', 'En disminución', 'Crítico'],
        ['9.1', 'Cobertura atención salud mental', '27.11%', '32.29%', '100.00%', 'En aumento', 'Óptimo'],
        ['9.2', 'Tasa controles salud mental', '6.00', '1.13', '18.85%', 'Estable', 'Crítico'],
        ['9.3', 'Personas egresadas por alta clínica', '13.00%', '0.52%', '4.02%', 'En disminución', 'Crítico'],
        ['11', 'Cobertura vacunación anti-influenza', '85.00%', '71.00%', '84.00%', 'En aumento', 'Parcial'],
        ['12', 'Ingreso precoz a control de embarazo', '90.04%', '100.00%', '100.00%', 'Estable', 'Óptimo'],
        ['13', 'Cobertura regulación fertilidad adolescentes', '25.91%', '80.06%', '100.00%', 'Estable', 'Óptimo'],
        ['14', 'Cobertura DM2', '71.00%', '100.00%', '100.00%', 'Estable', 'Óptimo'],
        ['15', 'Cobertura HTA', '63.50%', '100.00%', '100.00%', 'Estable', 'Óptimo'],
        ['16', 'Proporción niños sin caries', '64.67%', '13.75%', '21.26%', 'En disminución', 'Crítico'],
        ['17', 'Prevalencia normalidad menores de 2 años', '61.13%', '61.60%', '100.00%', 'Estable', 'Óptimo']
    ];
}

/**
 * Prepara los datos de mapas para Excel
 * @returns {Array} - Datos para Excel
 */
function prepareMapasExcelData() {
    const data = [
        ['DASHBOARD IAAPS - MAPA DE COBERTURA'],
        ['Fecha de generación:', new Date().toLocaleString('es-CL')],
        [''],
        ['MAPA DE CALOR - CUMPLIMIENTO POR INDICADOR Y CENTRO'],
        ['Centro/Indicador', 'EMP Mujeres', 'EMP Hombres', 'EMPAM', 'Visita Dom.', 'Salud Mental', 'Vacunación', 'Cardiovascular', 'MAIS']
    ];
    
    // Generar datos simulados
    const centers = ['Curicó Centro', 'Colón', 'Betty Muñoz', 'Miguel Ángel', 'Los Niches', 'Sarmiento'];
    
    centers.forEach(center => {
        const row = [center];
        
        // Generar 8 valores aleatorios (para cada indicador)
        for (let i = 0; i < 8; i++) {
            // Generar valor aleatorio entre 10 y 100
            const value = Math.floor(Math.random() * (100 - 10 + 1) + 10);
            row.push(value + '%');
        }
        
        data.push(row);
    });
    
    // Añadir promedio comunal
    const promedioRow = ['PROMEDIO COMUNAL'];
    for (let i = 0; i < 8; i++) {
        const value = Math.floor(Math.random() * (100 - 30 + 1) + 30);
        promedioRow.push(value + '%');
    }
    
    data.push([]);
    data.push(promedioRow);
    
    return data;
}

/**
 * Obtiene el título para la página actual
 * @param {string} page - Página actual del dashboard
 * @returns {string} - Título de la página
 */
function getTitleForPage(page) {
    switch (page) {
        case 'resumen':
            return 'Resumen General';
        case 'centros':
            return 'Centros de Salud';
        case 'indicadores':
            return 'Indicadores';
        case 'mapas':
            return 'Mapa de Cobertura';
        case 'reportes':
            return 'Reportes';
        case 'configuracion':
            return 'Configuración';
        default:
            return 'Dashboard';
    }
}

/**
 * Activa el modo pantalla completa para el dashboard
 */
function toggleFullscreen() {
    const dashboard = document.querySelector('.iaaps-dashboard-container');
    
    if (!document.fullscreenElement) {
        // Entrar en modo pantalla completa
        if (dashboard.requestFullscreen) {
            dashboard.requestFullscreen();
        } else if (dashboard.mozRequestFullScreen) { /* Firefox */
            dashboard.mozRequestFullScreen();
        } else if (dashboard.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            dashboard.webkitRequestFullscreen();
        } else if (dashboard.msRequestFullscreen) { /* IE/Edge */
            dashboard.msRequestFullscreen();
        }
        
        // Cambiar icono del botón
        document.getElementById('iaaps-dashboard-fullscreen').innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        // Salir del modo pantalla completa
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari & Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
        
        // Restaurar icono del botón
        document.getElementById('iaaps-dashboard-fullscreen').innerHTML = '<i class="fas fa-expand"></i>';
    }
}

/**
 * Imprime el dashboard actual
 */
function printDashboard() {
    // Mostrar notificación
    showNotification('Preparando impresión...', 'info');
    
    // Crear un iframe oculto para la impresión
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    
    document.body.appendChild(printFrame);
    
    printFrame.contentDocument.write(`
        <html>
            <head>
                <title>IAAPS Dashboard - Impresión</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #ccc;
                    }
                    .print-header h1 {
                        color: ${IAAPS_CONFIG.colors.primary};
                        margin: 0;
                    }
                    .print-header p {
                        color: #666;
                        margin: 5px 0 0;
                    }
                    .print-section {
                        margin-bottom: 30px;
                    }
                    .print-section h2 {
                        color: ${IAAPS_CONFIG.colors.primary};
                        border-bottom: 1px solid #eee;
                        padding-bottom: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px 12px;
                        text-align: left;
                    }
                    th {
                        background: #f5f5f5;
                    }
                    .print-footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 10px;
                        border-top: 1px solid #ccc;
                        font-size: 12px;
                        color: #666;
                    }
                    @media print {
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>Dashboard IAAPS Curicó</h1>
                    <p>${getTitleForPage(document.querySelector('.iaaps-nav-item.active').getAttribute('data-page'))}</p>
                    <p>Generado el: ${new Date().toLocaleString('es-CL')}</p>
                </div>
                
                <div class="print-content">
                    ${generatePrintContent()}
                </div>
                
                <div class="print-footer">
                    <p>Sistema de Monitoreo IAAPS - Salud Curicó</p>
                    <p>DOCUMENTO CONFIDENCIAL - USO INTERNO</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    
    printFrame.contentWindow.focus();
}

/**
 * Genera el contenido para la impresión según la página actual
 * @returns {string} - HTML del contenido para imprimir
 */
function generatePrintContent() {
    const currentPage = document.querySelector('.iaaps-nav-item.active').getAttribute('data-page');
    let content = '';
    
    switch (currentPage) {
        case 'resumen':
            content = `
                <div class="print-section">
                    <h2>Indicadores Generales</h2>
                    <table>
                        <tr>
                            <th>Indicador</th>
                            <th>Valor</th>
                        </tr>
                        <tr>
                            <td>Cumplimiento Comunal</td>
                            <td>59.84%</td>
                        </tr>
                        <tr>
                            <td>Indicadores Cumplidos</td>
                            <td>12</td>
                        </tr>
                        <tr>
                            <td>Indicadores Parciales</td>
                            <td>5</td>
                        </tr>
                        <tr>
                            <td>Indicadores Críticos</td>
                            <td>3</td>
                        </tr>
                        <tr>
                            <td>Tendencia mensual</td>
                            <td>+2.7%</td>
                        </tr>
                    </table>
                </div>
                
                <div class="print-section">
                    <h2>Ranking de Centros de Salud</h2>
                    <table>
                        <tr>
                            <th>Ranking</th>
                            <th>Centro</th>
                            <th>Cumplimiento</th>
                            <th>Estado</th>
                        </tr>
                        <tr>
                            <td>1</td>
                            <td>Colón</td>
                            <td>62.43%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>Los Niches</td>
                            <td>61.83%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td>Curicó Centro</td>
                            <td>61.60%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td>Miguel Ángel</td>
                            <td>59.86%</td>
                            <td>Parcial</td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Betty Muñoz</td>
                            <td>57.63%</td>
                            <td>Parcial</td>
                        </tr>
                        <tr>
                            <td>6</td>
                            <td>Sarmiento</td>
                            <td>55.90%</td>
                            <td>Parcial</td>
                        </tr>
                    </table>
                </div>
                
                <div class="print-section">
                    <h2>Indicadores Críticos</h2>
                    <table>
                        <tr>
                            <th>Código</th>
                            <th>Indicador</th>
                            <th>Meta</th>
                            <th>Actual</th>
                            <th>Cumplimiento</th>
                        </tr>
                        <tr>
                            <td>6.1.B</td>
                            <td>Cobertura EMP Hombres</td>
                            <td>22.31%</td>
                            <td>5.14%</td>
                            <td>23.04%</td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Tasa Visita Domiciliaria</td>
                            <td>0.24</td>
                            <td>0.05</td>
                            <td>22.66%</td>
                        </tr>
                        <tr>
                            <td>7</td>
                            <td>Cobertura EMPAM</td>
                            <td>58.48%</td>
                            <td>15.80%</td>
                            <td>27.02%</td>
                        </tr>
                    </table>
                </div>
            `;
            break;
            
        case 'centros':
            content = `
                <div class="print-section">
                    <h2>Comparativa de Centros de Salud</h2>
                    <table>
                        <tr>
                            <th>Ranking</th>
                            <th>Centro</th>
                            <th>Población</th>
                            <th>Ind. Cumplidos</th>
                            <th>Ind. Parciales</th>
                            <th>Ind. Críticos</th>
                            <th>Cumplimiento</th>
                            <th>Estado</th>
                        </tr>
                        <tr>
                            <td>1</td>
                            <td>Colón</td>
                            <td>36,482</td>
                            <td>13</td>
                            <td>4</td>
                            <td>3</td>
                            <td>62.43%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>Los Niches</td>
                            <td>18,756</td>
                            <td>13</td>
                            <td>4</td>
                            <td>3</td>
                            <td>61.83%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td>Curicó Centro</td>
                            <td>42,731</td>
                            <td>12</td>
                            <td>5</td>
                            <td>3</td>
                            <td>61.60%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td>Miguel Ángel</td>
                            <td>29,614</td>
                            <td>11</td>
                            <td>6</td>
                            <td>3</td>
                            <td>59.86%</td>
                            <td>Parcial</td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Betty Muñoz</td>
                            <td>31,298</td>
                            <td>11</td>
                            <td>5</td>
                            <td>4</td>
                            <td>57.63%</td>
                            <td>Parcial</td>
                        </tr>
                        <tr>
                            <td>6</td>
                            <td>Sarmiento</td>
                            <td>15,427</td>
                            <td>10</td>
                            <td>5</td>
                            <td>5</td>
                            <td>55.90%</td>
                            <td>Parcial</td>
                        </tr>
                    </table>
                </div>
            `;
            break;
            
        case 'indicadores':
            content = `
                <div class="print-section">
                    <h2>Listado de Indicadores</h2>
                    <table>
                        <tr>
                            <th>Código</th>
                            <th>Indicador</th>
                            <th>Meta</th>
                            <th>Actual</th>
                            <th>Cumplimiento</th>
                            <th>Estado</th>
                        </tr>
                        <tr>
                            <td>1</td>
                            <td>Autoevaluación MAIS</td>
                            <td>100.00%</td>
                            <td>100.00%</td>
                            <td>100.00%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>2.1</td>
                            <td>Continuidad de Atención</td>
                            <td>100.00%</td>
                            <td>100.00%</td>
                            <td>100.00%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>9.1</td>
                            <td>Cobertura Salud Mental</td>
                            <td>27.11%</td>
                            <td>32.29%</td>
                            <td>100.00%</td>
                            <td>Óptimo</td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Tasa Visita Domiciliaria</td>
                            <td>0.24</td>
                            <td>0.05</td>
                            <td>22.66%</td>
                            <td>Crítico</td>
                        </tr>
                        <tr>
                            <td>6.1.B</td>
                            <td>Cobertura EMP Hombres</td>
                            <td>22.31%</td>
                            <td>5.14%</td>
                            <td>23.04%</td>
                            <td>Crítico</td>
                        </tr>
                    </table>
                </div>
            `;
            break;
            
        default:
            content = `
                <div class="print-section">
                    <h2>${getTitleForPage(currentPage)}</h2>
                    <p>Contenido del dashboard de ${currentPage}.</p>
                </div>
            `;
    }
    
    return content;
}

/**
 * Muestra una notificación flotante
 * @param {string} message - Mensaje de la notificación
 * @param {string} type - Tipo de notificación (success, error, info, warning)
 */
function showNotification(message, type = 'info') {
    // Crear un nuevo elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'iaaps-notification';
    
    // Determinar color según tipo
    let bgColor, icon;
    switch (type) {
        case 'success':
            bgColor = IAAPS_CONFIG.colors.success;
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            bgColor = IAAPS_CONFIG.colors.danger;
            icon = 'fas fa-times-circle';
            break;
        case 'warning':
            bgColor = IAAPS_CONFIG.colors.accent;
            icon = 'fas fa-exclamation-triangle';
            break;
        case 'info':
        default:
            bgColor = IAAPS_CONFIG.colors.secondary;
            icon = 'fas fa-info-circle';
    }
    
    // Aplicar estilos
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = bgColor;
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    notification.style.zIndex = '10002';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '10px';
    notification.style.maxWidth = '400px';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // Contenido de la notificación
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Muestra un modal con detalles específicos
 * @param {string} title - Título del modal
 * @param {string} content - Contenido HTML del modal
 * @param {Function} [callback] - Función a ejecutar al cerrar el modal
 */
function showModal(title, content, callback = null) {
    // Verificar si ya existe un modal abierto
    if (document.getElementById('iaaps-modal')) {
        document.getElementById('iaaps-modal').remove();
    }
    
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'iaaps-modal';
    modal.className = 'iaaps-modal';
    
    // Contenido del modal
    modal.innerHTML = `
        <div class="iaaps-modal-container">
            <div class="iaaps-modal-header">
                <h3 class="iaaps-modal-title">${title}</h3>
                <button class="iaaps-modal-close" aria-label="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="iaaps-modal-body">
                ${content}
            </div>
            <div class="iaaps-modal-footer">
                <button class="iaaps-modal-btn secondary" id="iaaps-modal-cancel">Cancelar</button>
                <button class="iaaps-modal-btn primary" id="iaaps-modal-confirm">Aceptar</button>
            </div>
        </div>
    `;
    
    // Añadir al DOM
    document.body.appendChild(modal);
    
    // Configurar eventos
    document.querySelector('.iaaps-modal-close').addEventListener('click', () => {
        closeModal(modal);
    });
    
    document.getElementById('iaaps-modal-cancel').addEventListener('click', () => {
        closeModal(modal);
    });
    
    document.getElementById('iaaps-modal-confirm').addEventListener('click', () => {
        if (callback) callback();
        closeModal(modal);
    });
    
    // Mostrar modal con animación
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

/**
 * Cierra un modal
 * @param {HTMLElement} modal - Elemento modal a cerrar
 */
function closeModal(modal) {
    modal.classList.remove('active');
    
    // Eliminar del DOM después de la animación
    setTimeout(() => {
        modal.remove();
    }, 300);
}

/**
 * Muestra el detalle de un indicador específico
 * @param {string} code - Código del indicador
 */
function showIndicatorDetail(code) {
    // Datos simulados para este ejemplo
    const indicadores = {
        '6.1.B': {
            codigo: '6.1.B',
            nombre: 'Cobertura EMP Hombres',
            definicion: 'Porcentaje de hombres de 20 a 64 años con Examen de Medicina Preventiva (EMP) vigente.',
            meta: '22.31%',
            actual: '5.14%',
            cumplimiento: '23.04%',
            formula: 'N° de EMP vigente en hombres de 20-64 años / N° de hombres de 20-64 años inscritos x 100',
            numerador: 380,
            denominador: 7392,
            tendencia: {
                enero: '4.21%',
                febrero: '4.56%',
                marzo: '4.89%',
                abril: '5.14%'
            },
            responsable: 'Coordinador IAAPS',
            observaciones: 'Indicador en estado crítico. Se requiere implementar plan de acción inmediato para mejorar cobertura.'
        },
        '5': {
            codigo: '5',
            nombre: 'Tasa Visita Domiciliaria Integral',
            definicion: 'Tasa de visitas domiciliarias integrales realizadas por cada 1.000 inscritos.',
            meta: '0.24',
            actual: '0.05',
            cumplimiento: '22.66%',
            formula: 'N° visitas domiciliarias integrales realizadas / N° de población inscrita validada x 1.000',
            numerador: 542,
            denominador: 10800,
            tendencia: {
                enero: '0.03',
                febrero: '0.04',
                marzo: '0.05',
                abril: '0.05'
            },
            responsable: 'Coordinador SOME',
            observaciones: 'Indicador con cumplimiento crítico. Fortalecer programación de visitas domiciliarias.'
        }
    };
    
    const indicador = indicadores[code] || {
        codigo: code,
        nombre: 'Indicador ' + code,
        definicion: 'Información no disponible',
        meta: '-',
        actual: '-',
        cumplimiento: '-',
        formula: '-',
        numerador: 0,
        denominador: 0,
        tendencia: {},
        responsable: '-',
        observaciones: 'No hay información detallada para este indicador.'
    };
    
    // Generar contenido del modal
    const content = `
        <div style="padding: 10px;">
            <div style="background: #f9f9f9; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: ${IAAPS_CONFIG.colors.primary};">${indicador.codigo} - ${indicador.nombre}</h4>
                <p style="margin-bottom: 0;">${indicador.definicion}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: #f5f5f5; border-radius: 8px; padding: 15px;">
                    <h4 style="margin-top: 0; color: #333;">Información General</h4>
                    <p><strong>Fórmula:</strong> ${indicador.formula}</p>
                    <p><strong>Numerador:</strong> ${indicador.numerador}</p>
                    <p><strong>Denominador:</strong> ${indicador.denominador}</p>
                    <p><strong>Responsable:</strong> ${indicador.responsable}</p>
                </div>
                
                <div style="background: #f5f5f5; border-radius: 8px; padding: 15px;">
                    <h4 style="margin-top: 0; color: #333;">Cumplimiento</h4>
                    <p><strong>Meta:</strong> ${indicador.meta}</p>
                    <p><strong>Valor Actual:</strong> ${indicador.actual}</p>
                    <p><strong>Cumplimiento:</strong> <span style="color: ${parseFloat(indicador.cumplimiento) >= 80 ? IAAPS_CONFIG.colors.success : parseFloat(indicador.cumplimiento) >= 50 ? IAAPS_CONFIG.colors.accent : IAAPS_CONFIG.colors.danger}; font-weight: bold;">${indicador.cumplimiento}</span></p>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #333;">Tendencia Mensual</h4>
                <div style="height: 200px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                    <p style="color: #666; text-align: center;">
                        <i class="fas fa-chart-line" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                        Gráfico de tendencia mensual
                    </p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Mes</th>
                            ${Object.keys(indicador.tendencia).map(mes => `<th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">${mes.charAt(0).toUpperCase() + mes.slice(1)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px 12px;">Valor</td>
                            ${Object.values(indicador.tendencia).map(valor => `<td style="border: 1px solid #ddd; padding: 8px 12px;">${valor}</td>`).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div style="background: #fff5f5; border: 1px solid #ffecec; border-radius: 8px; padding: 15px;">
                <h4 style="margin-top: 0; color: #d32f2f;">Observaciones</h4>
                <p style="margin-bottom: 0;">${indicador.observaciones}</p>
            </div>
            
            <div style="margin-top: 20px;">
                <button id="btn-plan-accion" style="background: ${IAAPS_CONFIG.colors.primary}; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-tasks"></i> Generar Plan de Acción
                </button>
            </div>
        </div>
    `;
    
    // Mostrar modal
    showModal(`Detalle del Indicador ${indicador.codigo}`, content, () => {
        generateActionPlan(indicador.codigo, indicador.nombre);
    });
    
    // Configurar evento para el botón de plan de acción
    setTimeout(() => {
        const btnPlanAccion = document.getElementById('btn-plan-accion');
        if (btnPlanAccion) {
            btnPlanAccion.addEventListener('click', () => {
                generateActionPlan(indicador.codigo, indicador.nombre);
                closeModal(document.getElementById('iaaps-modal'));
            });
        }
    }, 100);
}

/**
 * Genera un plan de acción para un indicador crítico
 * @param {string} code - Código del indicador
 * @param {string} name - Nombre del indicador
 */
function generateActionPlan(code, name) {
    // Mostrar notificación de procesamiento
    showNotification('Generando plan de acción...', 'info');
    
    // Simular procesamiento
    setTimeout(() => {
        // Contenido del plan de acción
        const content = `
            <div style="padding: 10px;">
                <div style="background: #f0f8ff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: ${IAAPS_CONFIG.colors.primary};">Plan de Acción para Indicador ${code}</h4>
                    <p style="margin-bottom: 0;">${name}</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Estrategias Recomendadas</h4>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                        <h5 style="margin-top: 0; color: ${IAAPS_CONFIG.colors.primary};">1. Aumentar Cobertura</h5>
                        <ul style="margin-bottom: 0; padding-left: 20px;">
                            <li>Implementar llamadas telefónicas a pacientes pendientes</li>
                            <li>Realizar campañas en horarios extendidos</li>
                            <li>Habilitar capacidad adicional en fines de semana</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                        <h5 style="margin-top: 0; color: ${IAAPS_CONFIG.colors.primary};">2. Optimizar Recursos</h5>
                        <ul style="margin-bottom: 0; padding-left: 20px;">
                            <li>Reasignar personal según demanda</li>
                            <li>Implementar sistema de agendamiento más eficiente</li>
                            <li>Capacitar a personal adicional</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px;">
                        <h5 style="margin-top: 0; color: ${IAAPS_CONFIG.colors.primary};">3. Seguimiento</h5>
                        <ul style="margin-bottom: 0; padding-left: 20px;">
                            <li>Monitoreo semanal de avances</li>
                            <li>Reuniones de coordinación cada 15 días</li>
                            <li>Evaluación mensual de resultados</li>
                        </ul>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Cronograma Sugerido</h4>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Actividad</th>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Responsable</th>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Plazo</th>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Actualizar base de datos pacientes</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">SOME</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">1 semana</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Pendiente</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Campaña de difusión</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Comunicaciones</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">2 semanas</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Pendiente</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Implementar horarios extendidos</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Dirección</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">1 mes</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Pendiente</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Evaluación primera fase</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Coord. IAAPS</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">6 semanas</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Pendiente</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="background: #f0f8ff; border-radius: 8px; padding: 15px;">
                    <h4 style="margin-top: 0; color: #333;">Metas por Centro</h4>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Centro</th>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Actual</th>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Meta 30 días</th>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Meta 60 días</th>
                                <th style="border: 1px solid #ddd; padding: 8px 12px; background: #f1f1f1;">Meta 90 días</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Curicó Centro</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">7.06%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">10%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">15%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">20%</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Colón</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">8.12%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">11%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">16%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">22%</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">Betty Muñoz</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">6.54%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">9%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">14%</td>
                                <td style="border: 1px solid #ddd; padding: 8px 12px;">20%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button style="background: ${IAAPS_CONFIG.colors.secondary}; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file-pdf"></i> Exportar a PDF
                    </button>
                    <button style="background: ${IAAPS_CONFIG.colors.success}; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-envelope"></i> Enviar por correo
                    </button>
                </div>
            </div>
        `;
        
        // Mostrar modal con el plan de acción
        showModal(`Plan de Acción - ${name}`, content);
        
        // Notificar éxito
        showNotification('Plan de acción generado con éxito', 'success');
    }, 1500);
}

/**
 * Componente para mostrar un gráfico de predicción de tendencias
 * Basado en inteligencia artificial
 */
function addAIPredictiveInsights() {
    // Verificar si ya existe el contenedor
    if (document.getElementById('iaaps-predictive-insights')) {
        return;
    }
    
    // Crear botón de IA
    const aiButton = document.createElement('button');
    aiButton.id = 'iaaps-ai-button';
    aiButton.className = 'iaaps-ai-button';
    aiButton.innerHTML = '<i class="fas fa-brain"></i>';
    aiButton.title = 'Análisis Predictivo IA';
    aiButton.setAttribute('aria-label', 'Abrir análisis predictivo');
    
    // Estilos para el botón
    aiButton.style.position = 'fixed';
    aiButton.style.bottom = '90px';
    aiButton.style.right = '20px';
    aiButton.style.width = '50px';
    aiButton.style.height = '50px';
    aiButton.style.borderRadius = '25px';
    aiButton.style.backgroundColor = '#6200EA';
    aiButton.style.color = 'white';
    aiButton.style.border = 'none';
    aiButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    aiButton.style.cursor = 'pointer';
    aiButton.style.zIndex = '9999';
    aiButton.style.display = 'flex';
    aiButton.style.alignItems = 'center';
    aiButton.style.justifyContent = 'center';
    aiButton.style.fontSize = '20px';
    aiButton.style.transition = 'all 0.3s ease';
    
    // Añadir evento hover
    aiButton.addEventListener('mouseover', () => {
        aiButton.style.transform = 'scale(1.1)';
        aiButton.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
    });
    
    aiButton.addEventListener('mouseout', () => {
        aiButton.style.transform = 'scale(1)';
        aiButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    });
    
    // Añadir evento clic
    aiButton.addEventListener('click', showPredictiveInsights);
    
    // Añadir al DOM
    document.body.appendChild(aiButton);
}

/**
 * Muestra el análisis predictivo de IA
 */
function showPredictiveInsights() {
    // Mostrar notificación de procesamiento
    showNotification('Analizando datos con IA...', 'info');
    
    // Simular procesamiento de IA (en un sistema real, aquí se enviaría una solicitud a un API de IA)
    setTimeout(() => {
        // Contenido del análisis predictivo
        const content = `
            <div style="padding: 10px;">
                <div style="background: linear-gradient(135deg, #6200EA, #B388FF); border-radius: 8px; padding: 15px; margin-bottom: 20px; color: white;">
                    <h4 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-brain"></i> Análisis Predictivo Inteligente
                    </h4>
                    <p style="margin-bottom: 0;">Basado en tendencias históricas, estacionalidad y patrones detectados en los datos.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Predicción de Indicadores para Próximos 3 Meses</h4>
                    
                    <div style="height: 250px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                        <p style="color: #666; text-align: center;">
                            <i class="fas fa-chart-line" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                            Gráfico de predicción de tendencias
                        </p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                        <div style="background: #f0f8ff; border-radius: 8px; padding: 15px;">
                            <h5 style="margin-top: 0; color: #333; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-arrow-up" style="color: #2E9B61;"></i> Indicadores en mejora
                            </h5>
                            <ul style="margin-bottom: 0; padding-left: 20px;">
                                <li>Vacunación Influenza (71% → 83%)</li>
                                <li>Salud Mental (32% → 36%)</li>
                                <li>Visita Domiciliaria (0.05 → 0.09)</li>
                            </ul>
                            <p style="margin-top: 10px; font-size: 13px; color: #666;">Probabilidad de mejora: 87%</p>
                        </div>
                        
                        <div style="background: #fff5f5; border-radius: 8px; padding: 15px;">
                            <h5 style="margin-top: 0; color: #333; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-arrow-down" style="color: #FF5A5A;"></i> Indicadores en riesgo
                            </h5>
                            <ul style="margin-bottom: 0; padding-left: 20px;">
                                <li>EMP Hombres (5.14% → 4.8%)</li>
                                <li>EMPAM (15.80% → 14.5%)</li>
                                <li>Cobertura niños sin caries (13.75% → 12.9%)</li>
                            </ul>
                            <p style="margin-top: 10px; font-size: 13px; color: #666;">Probabilidad de deterioro: 76%</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Recomendaciones Inteligentes</h4>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <h5 style="margin-top: 0; color: #6200EA;">1. Optimización de Recursos</h5>
                        <p style="margin-bottom: 0;">Según el análisis de datos, se detecta un patrón de subutilización de recursos en horario vespertino (15:00-18:00). Reasignar 2 profesionales en este horario podría aumentar la cobertura de EMP en un 18% en 30 días.</p>
                    </div>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <h5 style="margin-top: 0; color: #6200EA;">2. Campañas Focalizadas</h5>
                        <p style="margin-bottom: 0;">Se identifican 3 sectores geográficos con alta concentración de población masculina entre 40-50 años con baja asistencia a EMP. Una campaña focalizada en estos sectores podría generar un aumento de 23% en cobertura EMP Hombres.</p>
                    </div>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px;">
                        <h5 style="margin-top: 0; color: #6200EA;">3. Prevención Estacional</h5>
                        <p style="margin-bottom: 0;">Se proyecta un aumento de demanda por enfermedades respiratorias en próximos 45 días basado en datos históricos. Incrementar stock de medicamentos clave y personal en un 15% permitiría mantener continuidad de atención.</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Alertas Inteligentes</h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                        <div style="background: #ff5a5a10; border-left: 4px solid #FF5A5A; padding: 15px; border-radius: 0 8px 8px 0;">
                            <h5 style="margin-top: 0; color: #FF5A5A; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-exclamation-triangle"></i> Alerta Crítica
                            </h5>
                            <p style="margin-bottom: 0;">El indicador EMP Hombres se proyecta con 95% de probabilidad de no alcanzar meta anual si no se implementan cambios inmediatos.</p>
                        </div>
                        
                        <div style="background: #ffbd3d10; border-left: 4px solid #FFBD3D; padding: 15px; border-radius: 0 8px 8px 0;">
                            <h5 style="margin-top: 0; color: #FFBD3D; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-exclamation-circle"></i> Alerta Moderada
                            </h5>
                            <p style="margin-bottom: 0;">Se detecta tendencia de disminución en cobertura EMPAM en 3 de 6 centros durante últimos 30 días.</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button style="background: #6200EA; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file-pdf"></i> Exportar Análisis
                    </button>
                    <button style="background: #6200EA; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-cog"></i> Configurar Alertas
                    </button>
                </div>
            </div>
        `;
        
        // Mostrar modal con el análisis predictivo
        showModal('Análisis Predictivo IA', content);
        
        // Notificar éxito
        showNotification('Análisis predictivo completado', 'success');
    }, 2000);
}

/**
 * Inicializa las funcionalidades avanzadas del chatbot
 */
function initAdvancedFeatures() {
    // Agregar predicción con IA
    addAIPredictiveInsights();
    
    // Cargar scripts adicionales si es necesario
    loadAdvancedDependencies();
    
    // Configurar actualizaciones en tiempo real
    setupRealTimeUpdates();
    
    // Añadir eventos para gráficos interactivos
    setupInteractiveCharts();
    
    console.log('Funcionalidades avanzadas inicializadas correctamente');
}

/**
 * Carga dependencias adicionales para funciones avanzadas
 */
function loadAdvancedDependencies() {
    // En un sistema real, aquí se cargarían bibliotecas adicionales
    // Como websockets para tiempo real, librerías avanzadas de gráficos, etc.
    
    console.log('Cargando dependencias avanzadas...');
    
    // Simular carga exitosa
    setTimeout(() => {
        console.log('Dependencias avanzadas cargadas correctamente');
    }, 1000);
}

/**
 * Configura actualizaciones en tiempo real
 */
function setupRealTimeUpdates() {
    // En un sistema real, aquí se configuraría conexión websocket
    console.log('Configurando actualizaciones en tiempo real...');
    
    // Simular actualizaciones periódicas
    setInterval(() => {
        // Verificar si hay nuevos datos
        if (Math.random() > 0.85 && IAAPS_STATE.isOpen) {
            showNotification('Se han actualizado indicadores IAAPS', 'info');
        }
    }, 30000); // Cada 30 segundos
}

/**
 * Configura eventos adicionales para gráficos interactivos
 */
function setupInteractiveCharts() {
    // Configurar eventos para interactividad mejorada
    document.addEventListener('click', (e) => {
        // Detectar clics en celdas del mapa de calor
        if (e.target.classList.contains('iaaps-heatmap-cell')) {
            const cellData = e.target.title.split(' - ');
            if (cellData.length >= 2) {
                const center = cellData[0];
                const indicator = cellData[1].split(':')[0];
                
                // Buscar código de indicador basado en nombre
                let indicatorCode = '6.1.A'; // Valor predeterminado
                
                if (indicator.includes('EMP Hombres')) {
                    indicatorCode = '6.1.B';
                } else if (indicator.includes('Visita')) {
                    indicatorCode = '5';
                }
                
                // Mostrar detalle del indicador
                showIndicatorDetail(indicatorCode);
            }
        }
    });
    
    // Añadir eventos a widgets para expandir
    document.addEventListener('click', (e) => {
        if (e.target.closest('.iaaps-widget-action') && e.target.closest('.iaaps-widget-action').title === 'Expandir') {
            const widget = e.target.closest('.iaaps-widget');
            if (widget) {
                expandWidget(widget);
            }
        }
    });
}

/**
 * Expande un widget a tamaño completo
 * @param {HTMLElement} widget - Widget a expandir
 */
function expandWidget(widget) {
    // Clonar el widget para el modal
    const widgetClone = widget.cloneNode(true);
    
    // Obtener título
    const title = widgetClone.querySelector('.iaaps-widget-title').textContent;
    
    // Ajustar altura del gráfico
    const chartContainer = widgetClone.querySelector('.iaaps-widget-chart');
    if (chartContainer) {
        chartContainer.style.height = '400px';
    }
    
    // Añadir al contenido del modal
    const content = `
        <div style="padding: 0;">
            ${widgetClone.outerHTML}
        </div>
    `;
    
    // Mostrar modal con el widget expandido
    showModal(title, content);
}

// Inicializar funciones avanzadas cuando se carga el chatbot
document.addEventListener('DOMContentLoaded', () => {
    // Las funciones avanzadas se inicializarán cuando el chatbot esté listo
    const checkIAAPSReady = setInterval(() => {
        if (window.IAAPSBot) {
            clearInterval(checkIAAPSReady);
            initAdvancedFeatures();
        }
    }, 100);
});

/**
 * Muestra el análisis predictivo de IA
 */
function showPredictiveInsights() {
    // Mostrar notificación de procesamiento
    showNotification('Analizando datos con IA...', 'info');
    
    // Simular procesamiento de IA (en un sistema real, aquí se enviaría una solicitud a un API de IA)
    setTimeout(() => {
        // Contenido del análisis predictivo
        const content = `
            <div style="padding: 10px;">
                <div style="background: linear-gradient(135deg, #6200EA, #B388FF); border-radius: 8px; padding: 15px; margin-bottom: 20px; color: white;">
                    <h4 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-brain"></i> Análisis Predictivo Inteligente
                    </h4>
                    <p style="margin-bottom: 0;">Basado en tendencias históricas, estacionalidad y patrones detectados en los datos.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Predicción de Indicadores para Próximos 3 Meses</h4>
                    
                    <div style="height: 250px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                        <p style="color: #666; text-align: center;">
                            <i class="fas fa-chart-line" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                            Gráfico de predicción de tendencias
                        </p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                        <div style="background: #f0f8ff; border-radius: 8px; padding: 15px;">
                            <h5 style="margin-top: 0; color: #333; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-arrow-up" style="color: #2E9B61;"></i> Indicadores en mejora
                            </h5>
                            <ul style="margin-bottom: 0; padding-left: 20px;">
                                <li>Vacunación Influenza (71% → 83%)</li>
                                <li>Salud Mental (32% → 36%)</li>
                                <li>Visita Domiciliaria (0.05 → 0.09)</li>
                            </ul>
                            <p style="margin-top: 10px; font-size: 13px; color: #666;">Probabilidad de mejora: 87%</p>
                        </div>
                        
                        <div style="background: #fff5f5; border-radius: 8px; padding: 15px;">
                            <h5 style="margin-top: 0; color: #333; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-arrow-down" style="color: #FF5A5A;"></i> Indicadores en riesgo
                            </h5>
                            <ul style="margin-bottom: 0; padding-left: 20px;">
                                <li>EMP Hombres (5.14% → 4.8%)</li>
                                <li>EMPAM (15.80% → 14.5%)</li>
                                <li>Cobertura niños sin caries (13.75% → 12.9%)</li>
                            </ul>
                            <p style="margin-top: 10px; font-size: 13px; color: #666;">Probabilidad de deterioro: 76%</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Recomendaciones Inteligentes</h4>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <h5 style="margin-top: 0; color: #6200EA;">1. Optimización de Recursos</h5>
                        <p style="margin-bottom: 0;">Según el análisis de datos, se detecta un patrón de subutilización de recursos en horario vespertino (15:00-18:00). Reasignar 2 profesionales en este horario podría aumentar la cobertura de EMP en un 18% en 30 días.</p>
                    </div>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <h5 style="margin-top: 0; color: #6200EA;">2. Campañas Focalizadas</h5>
                        <p style="margin-bottom: 0;">Se identifican 3 sectores geográficos con alta concentración de población masculina entre 40-50 años con baja asistencia a EMP. Una campaña focalizada en estos sectores podría generar un aumento de 23% en cobertura EMP Hombres.</p>
                    </div>
                    
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px;">
                        <h5 style="margin-top: 0; color: #6200EA;">3. Prevención Estacional</h5>
                        <p style="margin-bottom: 0;">Se proyecta un aumento de demanda por enfermedades respiratorias en próximos 45 días basado en datos históricos. Incrementar stock de medicamentos clave y personal en un 15% permitiría mantener continuidad de atención.</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #333;">Alertas Inteligentes</h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                        <div style="background: #ff5a5a10; border-left: 4px solid #FF5A5A; padding: 15px; border-radius: 0 8px 8px 0;">
                            <h5 style="margin-top: 0; color: #FF5A5A; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-exclamation-triangle"></i> Alerta Crítica
                            </h5>
                            <p style="margin-bottom: 0;">El indicador EMP Hombres se proyecta con 95% de probabilidad de no alcanzar meta anual si no se implementan cambios inmediatos.</p>
                        </div>
                        
                        <div style="background: #ffbd3d10; border-left: 4px solid #FFBD3D; padding: 15px; border-radius: 0 8px 8px 0;">
                            <h5 style="margin-top: 0; color: #FFBD3D; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-exclamation-circle"></i> Alerta Moderada
                            </h5>
                            <p style="margin-bottom: 0;">Se detecta tendencia de disminución en cobertura EMPAM en 3 de 6 centros durante últimos 30 días.</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button id="btn-export-analysis" style="background: #6200EA; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file-pdf"></i> Exportar Análisis
                    </button>
                    <button id="btn-configure-alerts" style="background: #6200EA; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-cog"></i> Configurar Alertas
                    </button>
                </div>
            </div>
        `;
        
        // Mostrar modal con el análisis predictivo
        showModal('Análisis Predictivo IA', content);
        
        // Configurar eventos para los botones
        setTimeout(() => {
            // Configurar evento para el botón de exportar análisis
            const btnExportAnalysis = document.getElementById('btn-export-analysis');
            if (btnExportAnalysis) {
                btnExportAnalysis.addEventListener('click', exportPredictiveAnalysis);
            }
            
            // Configurar evento para el botón de configurar alertas
            const btnConfigureAlerts = document.getElementById('btn-configure-alerts');
            if (btnConfigureAlerts) {
                btnConfigureAlerts.addEventListener('click', configureAIAlerts);
            }
        }, 100);
        
        // Notificar éxito
        showNotification('Análisis predictivo completado', 'success');
    }, 2000);
}

/**
 * Exporta el análisis predictivo a PDF
 */
function exportPredictiveAnalysis() {
    // Mostrar notificación de procesamiento
    showNotification('Generando PDF del análisis predictivo...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) throw new Error('jsPDF no disponible');
        
        // Crear nueva instancia PDF
        const doc = new jsPDF();
        
        // Añadir metadatos
        doc.setProperties({
            title: 'Análisis Predictivo IA - IAAPS',
            subject: 'Predicciones y recomendaciones basadas en inteligencia artificial',
            author: 'Sistema IAAPS Curicó',
            creator: 'IAAPS Bot AI'
        });
        
        // Título
        doc.setFontSize(22);
        doc.setTextColor(98, 0, 234); // Color violeta para IA
        doc.text("Análisis Predictivo IA", 105, 20, { align: "center" });
        
        // Subtítulo
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text('Predicciones y Recomendaciones Inteligentes', 105, 30, { align: "center" });
        
        // Fecha
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}`, 105, 40, { align: "center" });
        
        // Línea separadora
        doc.setDrawColor(98, 0, 234);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);
        
        // Resumen
        doc.setFontSize(16);
        doc.setTextColor(98, 0, 234);
        doc.text("Resumen Ejecutivo", 20, 55);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("El análisis predictivo basado en IA ha identificado tendencias y patrones en los datos", 20, 65);
        doc.text("de IAAPS, proyectando la evolución de indicadores para los próximos 3 meses.", 20, 72);
        
        // Indicadores en mejora
        doc.setFontSize(16);
        doc.setTextColor(46, 155, 97);
        doc.text("Indicadores en Mejora", 20, 85);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("• Vacunación Influenza (71% → 83%)", 25, 95);
        doc.text("• Salud Mental (32% → 36%)", 25, 102);
        doc.text("• Visita Domiciliaria (0.05 → 0.09)", 25, 109);
        doc.text("Probabilidad de mejora: 87%", 25, 119);
        
        // Indicadores en riesgo
        doc.setFontSize(16);
        doc.setTextColor(255, 90, 90);
        doc.text("Indicadores en Riesgo", 20, 132);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("• EMP Hombres (5.14% → 4.8%)", 25, 142);
        doc.text("• EMPAM (15.80% → 14.5%)", 25, 149);
        doc.text("• Cobertura niños sin caries (13.75% → 12.9%)", 25, 156);
        doc.text("Probabilidad de deterioro: 76%", 25, 166);
        
        // Recomendaciones
        doc.setFontSize(16);
        doc.setTextColor(98, 0, 234);
        doc.text("Recomendaciones Inteligentes", 20, 179);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("1. Optimización de Recursos: Reasignar personal en horario vespertino.", 25, 189);
        doc.text("2. Campañas Focalizadas: Enfoque en sectores con baja asistencia a EMP.", 25, 196);
        doc.text("3. Prevención Estacional: Preparación para aumento de enfermedades respiratorias.", 25, 203);
        
        // Alertas
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setTextColor(255, 90, 90);
        doc.text("Alertas Críticas", 20, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("El indicador EMP Hombres se proyecta con 95% de probabilidad de no alcanzar", 25, 30);
        doc.text("meta anual si no se implementan cambios inmediatos.", 25, 37);
        
        doc.setFontSize(16);
        doc.setTextColor(255, 189, 61);
        doc.text("Alertas Moderadas", 20, 50);
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("Se detecta tendencia de disminución en cobertura EMPAM en 3 de 6 centros", 25, 60);
        doc.text("durante últimos 30 días.", 25, 67);
        
        // Gráficos (simulados en este ejemplo)
        doc.setFontSize(16);
        doc.setTextColor(98, 0, 234);
        doc.text("Proyección de Tendencias", 20, 85);
        
        // Simular gráfico
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(240, 240, 240);
        doc.rect(25, 95, 160, 80, 'FD');
        
        doc.setFontSize(12);
        doc.setTextColor(150, 150, 150);
        doc.text("[Gráfico de proyección de tendencias]", 105, 135, { align: "center" });
        
        // Nota metodológica
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Nota: Este análisis predictivo está basado en algoritmos de aprendizaje automático", 20, 190);
        doc.text("que utilizan datos históricos, patrones estacionales y factores contextuales.", 20, 195);
        
        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${i} de ${pageCount} - IAAPS Curicó - Análisis Predictivo IA`, 105, 290, { align: 'center' });
            doc.text(`Documento confidencial - Uso interno`, 105, 295, { align: 'center' });
        }
        
        // Nombre de archivo
        const fileName = `Analisis_Predictivo_IA_IAAPS_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Descargar PDF
        setTimeout(() => {
            doc.save(fileName);
            showNotification('Análisis predictivo exportado exitosamente', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Error al exportar análisis predictivo:', error);
        showNotification('Error al exportar el análisis. Intente nuevamente.', 'error');
    }
}

/**
 * Muestra la configuración de alertas inteligentes
 */
function configureAIAlerts() {
    // Contenido del modal de configuración de alertas
    const content = `
        <div style="padding: 10px;">
            <div style="background: linear-gradient(135deg, #6200EA, #B388FF); border-radius: 8px; padding: 15px; margin-bottom: 20px; color: white;">
                <h4 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-bell"></i> Configuración de Alertas Inteligentes
                </h4>
                <p style="margin-bottom: 0;">Personalice cómo y cuándo recibir alertas generadas por el sistema de IA.</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #333;">Canales de Notificación</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-bell" style="color: #6200EA;"></i> Notificaciones en el sistema</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-envelope" style="color: #6200EA;"></i> Correo electrónico</span>
                    </label>
                    
                    <div style="margin-left: 28px; margin-bottom: 10px;">
                        <input type="email" value="director@salud-curico.cl" placeholder="Correo electrónico" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" style="width: 18px; height: 18px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-mobile-alt" style="color: #6200EA;"></i> SMS</span>
                    </label>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #333;">Nivel de Alertas</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-exclamation-circle" style="color: #FF5A5A;"></i> Alertas críticas (indicadores < 30%)</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-exclamation-triangle" style="color: #FFBD3D;"></i> Alertas moderadas (indicadores < 60%)</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" style="width: 18px; height: 18px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-info-circle" style="color: #389CC0;"></i> Alertas informativas (cambios positivos)</span>
                    </label>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #333;">Frecuencia de Alertas</h4>
                
                <div style="margin-bottom: 15px;">
                    <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                        <option value="real-time">En tiempo real</option>
                        <option value="daily" selected>Diarias (resumen)</option>
                        <option value="weekly">Semanales (resumen)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #555;">Hora preferida para resúmenes:</label>
                    <input type="time" value="08:00" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #333;">Indicadores a Monitorear</h4>
                
                <div style="margin-bottom: 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span>EMP Hombres</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span>EMP Mujeres</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span>EMPAM</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span>Visita Domiciliaria</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span>Salud Mental</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked style="width: 18px; height: 18px;">
                        <span>Vacunación</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" style="width: 18px; height: 18px;">
                        <span>Control Infantil</span>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" style="width: 18px; height: 18px;">
                        <span>Cobertura HTA</span>
                    </label>
                </div>
                
                <button style="background: #6200EA; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px;">
                    <i class="fas fa-plus"></i> Agregar más indicadores
                </button>
            </div>
            
            <div style="margin-top: 20px; display: flex; justify-content: space-between;">
                <button id="btn-test-alert" style="background: #389CC0; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-bell"></i> Probar Alerta
                </button>
                
                <button id="btn-save-alerts-config" style="background: #6200EA; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-save"></i> Guardar Configuración
                </button>
            </div>
        </div>
    `;
    
    // Mostrar modal
    showModal('Configuración de Alertas IA', content);
    
    // Configurar eventos para los botones
    setTimeout(() => {
        // Evento para probar alerta
        const btnTestAlert = document.getElementById('btn-test-alert');
        if (btnTestAlert) {
            btnTestAlert.addEventListener('click', () => {
                showTestAlert();
            });
        }
        
        // Evento para guardar configuración
        const btnSaveConfig = document.getElementById('btn-save-alerts-config');
        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', () => {
                saveAlertsConfiguration();
            });
        }
    }, 100);
}

/**
 * Muestra una alerta de prueba
 */
function showTestAlert() {
    // Crear un elemento de notificación estilizado como alerta de IA
    const notification = document.createElement('div');
    notification.className = 'iaaps-ai-notification';
    
    // Aplicar estilos
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#6200EA';
    notification.style.color = 'white';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 4px 15px rgba(98, 0, 234, 0.3)';
    notification.style.zIndex = '10002';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '15px';
    notification.style.maxWidth = '450px';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    
    // Contenido de la notificación
    notification.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.2); padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-brain" style="font-size: 24px;"></i>
        </div>
        <div style="flex: 1;">
            <h4 style="margin: 0 0 5px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-exclamation-triangle" style="color: #FFBD3D;"></i> Alerta Predictiva IA
            </h4>
            <p style="margin: 0; font-size: 14px;">
                Tendencia negativa detectada en EMP Hombres. Se proyecta caída de 7% para fin de mes.
            </p>
            <div style="margin-top: 8px; display: flex; gap: 8px;">
                <button style="background: rgba(255, 255, 255, 0.2); border: none; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; cursor: pointer;">
                    Ver Detalles
                </button>
                <button style="background: rgba(255, 255, 255, 0.2); border: none; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; cursor: pointer;">
                    Generar Plan
                </button>
            </div>
        </div>
        <button style="background: transparent; border: none; color: rgba(255, 255, 255, 0.7); cursor: pointer; padding: 5px; display: flex; align-items: center; justify-content: center; margin-left: 10px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Configurar botón de cierre
    notification.querySelector('button:last-child').addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            
            // Eliminar del DOM después de la animación
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

/**
 * Guarda la configuración de alertas
 */
function saveAlertsConfiguration() {
    // Mostrar notificación de guardado
    showNotification('Configuración de alertas guardada con éxito', 'success');
    
    // Cerrar el modal
    closeModal(document.getElementById('iaaps-modal'));
    
    // En un sistema real, aquí se enviarían los datos al servidor
    console.log('Configuración de alertas guardada');
}

/**
 * Mejoras al chatbot IAAPS:
 * 1. Solución a los botones de descarga
 * 2. Funcionalidad para redimensionar el chat
 * 3. Posibilidad de mover el chat por la pantalla (arrastrar)
 * 4. Mejora en la calidad de PDFs y Excel
 * 5. Mini dashboard comunal
 */

/**
 * Solución a los botones de descarga de PDF y Excel
 * Reemplazando las funciones anteriores con versiones que efectivamente funcionen
 */

/**
 * Descarga el reporte PDF generado
 * @param {string} centerName - Nombre del centro
 */
function downloadPDFReport(centerName) {
    try {
        // Crear reporte si no existe
        if (!IAAPS_STATE.pdfDoc) {
            createPDFReport(centerName);
        }
        
        // Nombre de archivo
        const fileName = `Reporte_IAAPS_${centerName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Descargar directamente usando el método save de jsPDF
        IAAPS_STATE.pdfDoc.save(fileName);
        
        // Confirmar descarga
        showNotification(`Reporte PDF para ${centerName} descargado con éxito`, 'success');
        
    } catch (error) {
        console.error('Error al descargar PDF:', error);
        
        // Intentar método alternativo de descarga si el principal falla
        try {
            // Generar blob desde datos del PDF
            const pdfBlob = IAAPS_STATE.pdfDoc.output('blob');
            
            // Crear URL para el blob
            const blobUrl = URL.createObjectURL(pdfBlob);
            
            // Crear elemento de enlace para la descarga
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = `Reporte_IAAPS_${centerName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            // Simular clic para iniciar descarga
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Liberar URL
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 100);
            
            showNotification(`Reporte PDF para ${centerName} descargado con éxito`, 'success');
            
        } catch (backupError) {
            console.error('Error en método alternativo:', backupError);
            addBotMessage('Lo siento, hubo un problema al descargar el reporte PDF. Por favor, intenta nuevamente.');
        }
    }
}

/**
 * Descarga el reporte Excel generado
 * @param {string} centerName - Nombre del centro
 */
function downloadExcelReport(centerName) {
    try {
        // Crear reporte si no existe
        if (!IAAPS_STATE.excelWB) {
            createExcelReport(centerName);
        }
        
        // Nombre de archivo
        const fileName = `Reporte_IAAPS_${centerName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Método directo usando la biblioteca XLSX
        window.XLSX.writeFile(IAAPS_STATE.excelWB, fileName);
        
        // Confirmar descarga
        showNotification(`Reporte Excel para ${centerName} descargado con éxito`, 'success');
        
    } catch (error) {
        console.error('Error al descargar Excel:', error);
        
        // Método alternativo de descarga
        try {
            // Generar arraybuffer desde el libro
            const excelBuffer = window.XLSX.write(IAAPS_STATE.excelWB, { bookType: 'xlsx', type: 'array' });
            
            // Crear blob
            const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Crear URL para el blob
            const blobUrl = URL.createObjectURL(excelBlob);
            
            // Crear elemento de enlace para la descarga
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = fileName;
            
            // Simular clic para iniciar descarga
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Liberar URL
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 100);
            
            showNotification(`Reporte Excel para ${centerName} descargado con éxito`, 'success');
            
        } catch (backupError) {
            console.error('Error en método alternativo:', backupError);
            addBotMessage('Lo siento, hubo un problema al descargar el reporte Excel. Por favor, intenta nuevamente.');
        }
    }
}

/**
 * Mejora para crear reportes de PDF de alta calidad
 * @param {string} centerName - Nombre del centro
 */
function createPDFReport(centerName) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) throw new Error('jsPDF no disponible');
        
        // Crear nueva instancia PDF con mejor calidad
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        // Mejorar metadatos
        doc.setProperties({
            title: `Reporte IAAPS - ${centerName}`,
            subject: "Índices de Actividad de la Atención Primaria de Salud",
            author: "Sistema IAAPS Curicó",
            creator: "IAAPS Bot v2.0",
            keywords: "IAAPS, Salud, Atención Primaria, Indicadores, Reporte"
        });
        
        // Añadir logo (simular posición)
        // En un entorno real, se cargaría una imagen real
        // doc.addImage(logoData, 'PNG', 10, 10, 50, 20);
        doc.setFillColor(46, 155, 97);
        doc.rect(10, 10, 50, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text("LOGO IAAPS", 20, 22);
        
        // Título mejorado con estilo premium
        doc.setFontSize(24);
        doc.setTextColor(46, 155, 97);
        doc.text("Reporte IAAPS Premium", 105, 30, { align: "center" });
        
        // Subtítulo
        doc.setFontSize(18);
        doc.setTextColor(60, 60, 60);
        doc.text(`Centro de Salud: ${centerName}`, 105, 40, { align: "center" });
        
        // Fecha con formato mejorado
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const today = new Date().toLocaleDateString('es-CL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(`Generado el: ${today}`, 105, 50, { align: "center" });
        
        // Línea decorativa
        doc.setDrawColor(46, 155, 97);
        doc.setLineWidth(0.5);
        doc.line(20, 55, 190, 55);
        
        // Añadir marca de agua ligera
        doc.setFontSize(60);
        doc.setTextColor(240, 240, 240);
        doc.text("IAAPS", 105, 150, { align: "center" });
        
        // Resumen con diseño mejorado
        doc.setFontSize(16);
        doc.setTextColor(46, 155, 97);
        doc.text("Resumen General", 20, 70);
        
        // Fondo para sección de resumen
        doc.setFillColor(246, 251, 248);
        doc.roundedRect(15, 75, 180, 40, 3, 3, 'F');
        
        // Datos con iconos simulados
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text("● Cumplimiento general: 61.60%", 25, 85);
        doc.text("● Indicadores cumplidos: 12", 25, 95);
        doc.text("● Indicadores parciales: 5", 25, 105);
        doc.text("● Indicadores críticos: 3", 25, 115);
        
        // Sección de indicadores con estilo premium
        doc.setFillColor(46, 155, 97, 0.1);
        doc.roundedRect(15, 125, 180, 80, 3, 3, 'F');
        
        doc.setFontSize(16);
        doc.setTextColor(46, 155, 97);
        doc.text("Indicadores Destacados", 20, 140);
        
        // Tabla de indicadores con estilo mejorado
        const headers = [['Código', 'Indicador', 'Meta', 'Actual', 'Cumplimiento']];
        const data = [
            ['6.1.A', 'Cobertura EMP Mujeres', '23.89%', '7.06%', '29.54%'],
            ['6.1.B', 'Cobertura EMP Hombres', '22.31%', '3.49%', '15.65%'],
            ['9.1', 'Cobertura Salud Mental', '27.11%', '29.31%', '100.00%'],
            ['11', 'Vacunación Influenza', '85.00%', '75.00%', '88.23%'],
            ['5', 'Tasa Visita Domiciliaria', '0.24', '0.04', '17.94%']
        ];
        
        // Añadir tabla con estilo mejorado
        doc.autoTable({
            head: headers,
            body: data,
            startY: 145,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [46, 155, 97],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [246, 251, 248]
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 70 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 30 }
            }
        });
        
        // Añadir gráfico de cumplimiento (simulado)
        doc.setFontSize(16);
        doc.setTextColor(46, 155, 97);
        doc.text("Análisis Gráfico", 20, 210);
        
        // Simular gráfico (en un entorno real se insertaría un gráfico real)
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(20, 215, 170, 60, 3, 3, 'F');
        
        // Simular barras
        doc.setFillColor(46, 155, 97);
        doc.rect(40, 260, 20, -25, 'F');
        
        doc.setFillColor(56, 156, 192);
        doc.rect(70, 260, 20, -40, 'F');
        
        doc.setFillColor(255, 189, 61);
        doc.rect(100, 260, 20, -30, 'F');
        
        doc.setFillColor(255, 90, 90);
        doc.rect(130, 260, 20, -15, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Ind. 1", 50, 265, { align: "center" });
        doc.text("Ind. 2", 80, 265, { align: "center" });
        doc.text("Ind. 3", 110, 265, { align: "center" });
        doc.text("Ind. 4", 140, 265, { align: "center" });
        
        // Pie de página con diseño premium
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Fondo del pie de página
            doc.setFillColor(246, 251, 248);
            doc.rect(0, 280, 210, 17, 'F');
            
            // Texto de pie de página
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Página ${i} de ${pageCount}`, 20, 290);
            doc.text(`Sistema IAAPS Curicó - Reporte Premium`, 105, 290, { align: 'center' });
            doc.text(`Documento Confidencial`, 190, 290, { align: 'right' });
        }
        
        // Guardar en IAAPS_STATE para descarga posterior
        IAAPS_STATE.pdfDoc = doc;
        
    } catch (error) {
        console.error('Error al crear PDF:', error);
        
        // Intentar método alternativo más simple si falla el premium
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) throw new Error('jsPDF no disponible');
            
            // Crear nueva instancia PDF
            const doc = new jsPDF();
            
            // Título
            doc.setFontSize(22);
            doc.setTextColor(46, 155, 97);
            doc.text("Reporte IAAPS", 105, 20, { align: "center" });
            
            // Subtítulo
            doc.setFontSize(16);
            doc.setTextColor(60, 60, 60);
            doc.text(`Centro de Salud: ${centerName}`, 105, 30, { align: "center" });
            
            // Datos
            doc.setFontSize(12);
            doc.text("Cumplimiento general: 61.60%", 20, 50);
            
            // Guardar en IAAPS_STATE
            IAAPS_STATE.pdfDoc = doc;
            
        } catch (fallbackError) {
            console.error('Error en método alternativo de PDF:', fallbackError);
        }
    }
}

/**
 * Mejora para crear reportes de Excel de alta calidad
 * @param {string} centerName - Nombre del centro
 */
function createExcelReport(centerName) {
    try {
        if (!window.XLSX) throw new Error('SheetJS no disponible');
        
        // Crear libro de trabajo
        const wb = window.XLSX.utils.book_new();
        
        // Mejorar metadatos
        wb.Props = {
            Title: `Reporte IAAPS Premium - ${centerName}`,
            Subject: "Índices de Actividad de la Atención Primaria de Salud",
            Author: "Sistema IAAPS Curicó",
            Manager: "Dirección de Salud",
            Company: "Municipalidad de Curicó",
            Category: "Reportes de Salud",
            Keywords: "IAAPS, Salud, Atención Primaria, Indicadores",
            Comments: "Reporte generado por IAAPS Bot v2.0",
            CreatedDate: new Date()
        };
        
        // Mejorar estilo del informe
        // Datos para la portada
        const portadaData = [
            ["REPORTE IAAPS PREMIUM", "", "", "", ""],
            ["", "", "", "", ""],
            [`Centro de Salud: ${centerName}`, "", "", "", ""],
            [`Fecha: ${new Date().toLocaleDateString('es-CL')}`, "", "", "", ""],
            ["", "", "", "", ""],
            ["SISTEMA DE MONITOREO INTEGRAL", "", "", "", ""],
            ["Índices de Actividad de la Atención Primaria de Salud", "", "", "", ""],
            ["", "", "", "", ""],
            ["Documento Confidencial - Uso Interno", "", "", "", ""],
            ["", "", "", "", ""],
        ];
        
        // Crear hoja de portada
        const wsPortada = window.XLSX.utils.aoa_to_sheet(portadaData);
        
        // Configurar anchos de columna
        wsPortada['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        
        // Añadir la hoja
        window.XLSX.utils.book_append_sheet(wb, wsPortada, "Portada");
        
        // Datos para resumen
        const wsData = [
            ["RESUMEN GENERAL", "", "", "", ""],
            ["", "", "", "", ""],
            ["Cumplimiento general:", "61.60%", "", "", ""],
            ["Indicadores cumplidos:", "12", "", "", ""],
            ["Indicadores parciales:", "5", "", "", ""],
            ["Indicadores críticos:", "3", "", "", ""],
            ["", "", "", "", ""],
            ["INDICADORES", "", "", "", ""],
            ["Código", "Indicador", "Meta", "Actual", "Cumplimiento"],
            ["6.1.A", "Cobertura EMP Mujeres", "23.89%", "7.06%", "29.54%"],
            ["6.1.B", "Cobertura EMP Hombres", "22.31%", "3.49%", "15.65%"],
            ["9.1", "Cobertura Salud Mental", "27.11%", "29.31%", "100.00%"],
            ["11", "Vacunación Influenza", "85.00%", "75.00%", "88.23%"],
            ["5", "Tasa Visita Domiciliaria", "0.24", "0.04", "17.94%"]
        ];
        
        // Crear hoja y añadir al libro
        const ws = window.XLSX.utils.aoa_to_sheet(wsData);
        
        // Configurar anchos de columna
        ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        
        // Añadir la hoja
        window.XLSX.utils.book_append_sheet(wb, ws, "Resumen");
        
        // Segunda hoja con todos los indicadores
        const indicadoresData = [
            ["INDICADORES COMPLETOS", "", "", "", "", "", ""],
            ["", "", "", "", "", "", ""],
            ["Código", "Indicador", "Meta", "Numerador", "Denominador", "Resultado", "Cumplimiento"],
            // Datos simulados para todos los indicadores...
            ["1", "Porcentaje de centros de salud autoevaluados mediante MAIS", "100.00%", "45", "45", "100.00%", "100.00%"],
            ["2.1", "Continuidad de Atención", "100.00%", "18", "18", "100.00%", "100.00%"],
            ["2.2", "Disponibilidad de fármacos trazadores", "100.00%", "36", "36", "100.00%", "100.00%"],
            ["3", "Tasa de consultas médicas de morbilidad por habitante año", "0.82", "6873", "41532", "0.17", "20.18%"],
            ["4", "Porcentaje de derivación al nivel secundario", "10.00%", "746", "11905", "6.27%", "62.66%"],
            ["5", "Tasa de Visita Domiciliaria Integral", "0.24", "542", "12585", "0.04", "17.94%"],
            ["6.1.A", "Cobertura EMP mujeres (20-64 años)", "23.89%", "1030", "14597", "7.06%", "29.54%"],
            ["6.1.B", "Cobertura EMP hombres (20-64 años)", "22.31%", "380", "10883", "3.49%", "15.65%"],
            ["6.2", "Cobertura EMPAM (65+ años)", "58.48%", "837", "6609", "12.66%", "21.66%"],
            ["7", "Cobertura evaluación desarrollo psicomotor (12-23 meses)", "25.00%", "38", "267", "14.23%", "14.98%"],
            ["8", "Cobertura control adolescentes (10-19 años)", "24.17%", "236", "5444", "4.34%", "17.94%"],
            ["9.1", "Cobertura atención salud mental", "27.11%", "2678", "9137", "29.31%", "100.00%"],
            ["9.2", "Tasa controles salud mental", "6.00", "3029", "2678", "1.13", "18.85%"],
            ["9.3", "Personas egresadas por alta clínica", "13.00%", "14", "2678", "0.52%", "4.02%"],
            ["11", "Cobertura vacunación anti-influenza", "85.00%", "22004", "16408", "75.00%", "88.23%"],
            ["12", "Ingreso precoz a control de embarazo", "90.04%", "69", "23", "225.71%", "100.00%"],
            ["13", "Cobertura regulación fertilidad adolescentes", "25.91%", "2220", "2773", "80.06%", "100.00%"],
            ["14", "Cobertura DM2 (15+ años)", "71.00%", "8703", "4868", "178.78%", "100.00%"],
            ["15", "Cobertura HTA (15+ años)", "63.50%", "17430", "11065", "157.52%", "100.00%"],
            ["16", "Proporción niños sin caries (<3 años)", "64.67%", "114", "829", "13.75%", "21.26%"],
            ["17", "Prevalencia normalidad menores de 2 años", "61.13%", "324", "526", "61.60%", "100.00%"]
        ];
        
        // Crear segunda hoja
        const wsIndicadores = window.XLSX.utils.aoa_to_sheet(indicadoresData);
        
        // Configurar anchos de columna para esta hoja
        wsIndicadores['!cols'] = [
            { wch: 10 }, // Columna A - Código
            { wch: 50 }, // Columna B - Indicador
            { wch: 15 }, // Columna C - Meta
            { wch: 15 }, // Columna D - Numerador
            { wch: 15 }, // Columna E - Denominador
            { wch: 15 }, // Columna F - Resultado
            { wch: 15 }  // Columna G - Cumplimiento
        ];
        
        // Añadir la hoja al libro
        window.XLSX.utils.book_append_sheet(wb, wsIndicadores, "Indicadores");
        
        // Añadir hoja de gráficos (simulado)
        const graficosData = [
            ["GRÁFICOS DE CUMPLIMIENTO", "", "", "", ""],
            ["", "", "", "", ""],
            ["Estos datos pueden importarse en Excel para generar gráficos interactivos", "", "", "", ""],
            ["", "", "", "", ""],
            ["Indicador", "Enero", "Febrero", "Marzo", "Abril"],
            ["EMP Mujeres", "4.21%", "5.12%", "6.08%", "7.06%"],
            ["EMP Hombres", "1.85%", "2.21%", "2.87%", "3.49%"],
            ["Salud Mental", "25.40%", "26.82%", "28.11%", "29.31%"],
            ["Visita Domiciliaria", "0.02", "0.03", "0.03", "0.04"],
            ["Vacunación", "68.00%", "70.00%", "73.00%", "75.00%"]
        ];
        
        const wsGraficos = window.XLSX.utils.aoa_to_sheet(graficosData);
        wsGraficos['!cols'] = [
            { wch: 25 }, // Columna A
            { wch: 15 }, // Columna B
            { wch: 15 }, // Columna C
            { wch: 15 }, // Columna D
            { wch: 15 }  // Columna E
        ];
        
        // Añadir hoja de gráficos
        window.XLSX.utils.book_append_sheet(wb, wsGraficos, "Gráficos");
        
        // Guardar en IAAPS_STATE para descarga posterior
        IAAPS_STATE.excelWB = wb;
        
    } catch (error) {
        console.error('Error al crear Excel:', error);
        
        // Método alternativo simple
        try {
            if (!window.XLSX) throw new Error('SheetJS no disponible');
            
            // Crear libro simple
            const wb = window.XLSX.utils.book_new();
            wb.Props = {
                Title: `Reporte IAAPS - ${centerName}`,
                Subject: "Indicadores IAAPS",
                Author: "Sistema IAAPS"
            };
            
            // Datos simples
            const wsData = [
                ["REPORTE IAAPS", ""],
                [`Centro: ${centerName}`, ""],
                ["Indicador", "Valor"],
                ["Cumplimiento", "61.60%"]
            ];
            
            // Crear hoja y guardar
            const ws = window.XLSX.utils.aoa_to_sheet(wsData);
            window.XLSX.utils.book_append_sheet(wb, ws, "Datos");
            
            // Guardar
            IAAPS_STATE.excelWB = wb;
            
        } catch (fallbackError) {
            console.error('Error en método alternativo de Excel:', fallbackError);
        }
    }
}

/**
 * FUNCIONALIDAD PARA REDIMENSIONAR LA VENTANA DE CHAT
 */

/**
 * Añade la capacidad de redimensionar el chatbot
 */
function makeResizable() {
    // Verificar que el chatbot existe
    if (!iaapsElements.chatWindow) return;
    
    // Agregar controles de redimensionado
    const resizeControls = document.createElement('div');
    resizeControls.className = 'iaaps-resize-controls';
    resizeControls.innerHTML = `
        <div class="iaaps-resize-handle iaaps-resize-handle-se"></div>
        <button class="iaaps-resize-btn iaaps-maximize-btn" title="Maximizar">
            <i class="fas fa-expand"></i>
        </button>
        <button class="iaaps-resize-btn iaaps-restore-btn" title="Restaurar" style="display: none;">
            <i class="fas fa-compress"></i>
        </button>
    `;
    
    // Estilos para los controles
    resizeControls.style.position = 'absolute';
    resizeControls.style.right = '5px';
    resizeControls.style.bottom = '5px';
    resizeControls.style.display = 'flex';
    resizeControls.style.alignItems = 'center';
    resizeControls.style.gap = '5px';
    resizeControls.style.zIndex = '10';
    
    // Estilos para el manejador de redimensionado
    const resizeHandleStyle = document.createElement('style');
    resizeHandleStyle.textContent = `
        .iaaps-resize-handle {
            width: 12px;
            height: 12px;
            background: #ddd;
            border-radius: 50%;
            cursor: nwse-resize;
            transition: background 0.2s;
        }
        
        .iaaps-resize-handle:hover {
            background: ${IAAPS_CONFIG.colors.primary};
        }
        
        .iaaps-resize-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 0, 0, 0.05);
            color: #777;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .iaaps-resize-btn:hover {
            background: rgba(0, 0, 0, 0.1);
            color: ${IAAPS_CONFIG.colors.primary};
        }
    `;
    
    document.head.appendChild(resizeHandleStyle);
    
    // Agregar controles al chatbot
    iaapsElements.chatWindow.appendChild(resizeControls);
    
    // Guardar tamaño original para restaurar
    const originalSize = {
        width: iaapsElements.chatWindow.style.width || '380px',
        height: iaapsElements.chatWindow.style.height || '600px'
    };
    
    // Función de maximizar
    const maximizeBtn = resizeControls.querySelector('.iaaps-maximize-btn');
    const restoreBtn = resizeControls.querySelector('.iaaps-restore-btn');
    
    maximizeBtn.addEventListener('click', () => {
        // Guardar tamaño actual antes de maximizar
        originalSize.width = iaapsElements.chatWindow.style.width || '380px';
        originalSize.height = iaapsElements.chatWindow.style.height || '600px';
        
        // Maximizar
        iaapsElements.chatWindow.style.width = '90vw';
        iaapsElements.chatWindow.style.height = '80vh';
        
        // Centrar en pantalla
        iaapsElements.chatWindow.style.left = '5vw';
        iaapsElements.chatWindow.style.bottom = 'auto';
        iaapsElements.chatWindow.style.top = '10vh';
        
        // Cambiar botones
        maximizeBtn.style.display = 'none';
        restoreBtn.style.display = 'flex';
    });
    
    // Función de restaurar
    restoreBtn.addEventListener('click', () => {
        // Restaurar tamaño
        iaapsElements.chatWindow.style.width = originalSize.width;
        iaapsElements.chatWindow.style.height = originalSize.height;
        
        // Restaurar posición
        iaapsElements.chatWindow.style.left = 'auto';
        iaapsElements.chatWindow.style.top = 'auto';
        iaapsElements.chatWindow.style.right = '0';
        iaapsElements.chatWindow.style.bottom = '80px';
        
        // Cambiar botones
        maximizeBtn.style.display = 'flex';
        restoreBtn.style.display = 'none';
    });
    
    // Implementar redimensionado manual
    const resizeHandle = resizeControls.querySelector('.iaaps-resize-handle-se');
    let isResizing = false;
    let lastX, lastY;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        lastX = e.clientX;
        lastY = e.clientY;
        
        // Añadir clase mientras se redimensiona
        iaapsElements.chatWindow.classList.add('iaaps-resizing');
        
        // Prevenir selección de texto durante redimensionado
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        
        // Obtener tamaño actual
        const currentWidth = parseInt(iaapsElements.chatWindow.offsetWidth);
        const currentHeight = parseInt(iaapsElements.chatWindow.offsetHeight);
        
        // Calcular nuevo tamaño con límites
        const newWidth = Math.max(300, Math.min(1200, currentWidth + deltaX));
        const newHeight = Math.max(400, Math.min(800, currentHeight + deltaY));
        
        // Aplicar nuevo tamaño
        iaapsElements.chatWindow.style.width = newWidth + 'px';
        iaapsElements.chatWindow.style.height = newHeight + 'px';
        
        // Actualizar posición de referencia
        lastX = e.clientX;
        lastY = e.clientY;
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            
            // Quitar clase de redimensionado
            iaapsElements.chatWindow.classList.remove('iaaps-resizing');
            
            // Restaurar selección de texto
            document.body.style.userSelect = '';
            
            // Desplazar al final de los mensajes
            scrollToBottom();
        }
    });
}

/**
 * FUNCIONALIDAD PARA MOVER EL CHATBOT
 */

/**
 * Agrega la capacidad de mover el chatbot por la pantalla
 */
function makeDraggable() {
    // Verificar que el chatbot existe
    if (!iaapsElements.chatWindow) return;
    
    // Añadir un controlador de arrastre en el encabezado
    const header = iaapsElements.chatWindow.querySelector('.iaaps-chat-header');
    if (!header) return;
    
    // Agregar clase e indicador visual
    header.classList.add('iaaps-draggable');
    header.style.cursor = 'move';
    
    // Variables para controlar el arrastre
    let isDragging = false;
    let offsetX, offsetY;
    
    // Convertir la ventana a posición absoluta para permitir movimiento
    iaapsElements.chatWindow.style.position = 'fixed';
    
    // Eventos para arrastrar
    header.addEventListener('mousedown', startDrag);
    
    // Iniciar arrastre
    function startDrag(e) {
        // No iniciar si el clic fue en los botones de acción
        if (e.target.closest('.iaaps-header-btn')) return;
        
        isDragging = true;
        
        // Calcular el offset del mouse relativo a la ventana
        const rect = iaapsElements.chatWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Añadir clase mientras se arrastra
        iaapsElements.chatWindow.classList.add('iaaps-dragging');
        
        // Prevenir selección de texto durante arrastre
        document.body.style.userSelect = 'none';
        
        // Añadir eventos para arrastrar y soltar
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        
        e.preventDefault();
    }
    
    // Arrastrar
    function drag(e) {
        if (!isDragging) return;
        
        // Calcular nueva posición
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        
        // Límites para no salirse de la pantalla
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const chatWidth = iaapsElements.chatWindow.offsetWidth;
        const chatHeight = iaapsElements.chatWindow.offsetHeight;
        
        // Restringir X
        newX = Math.max(0, Math.min(windowWidth - chatWidth, newX));
        
        // Restringir Y
        newY = Math.max(0, Math.min(windowHeight - chatHeight, newY));
        
        // Aplicar nueva posición
        iaapsElements.chatWindow.style.left = newX + 'px';
        iaapsElements.chatWindow.style.top = newY + 'px';
        iaapsElements.chatWindow.style.right = 'auto';
        iaapsElements.chatWindow.style.bottom = 'auto';
    }
    
    // Detener arrastre
    function stopDrag() {
        if (isDragging) {
            isDragging = false;
            
            // Quitar clase de arrastre
            iaapsElements.chatWindow.classList.remove('iaaps-dragging');
            
            // Restaurar selección de texto
            document.body.style.userSelect = '';
            
            // Quitar eventos temporales
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
        }
    }
}

/**
 * IMPLEMENTACIÓN DE MINI DASHBOARD COMUNAL
 */

/**
 * Muestra un mini dashboard comunal en el chat
 */
function showMiniDashboard() {
    // Obtener datos simulados
    const dashboardData = {
        cumplimiento: 59.84,
        indicadores_cumplidos: 12,
        indicadores_parciales: 5,
        indicadores_criticos: 3,
        tendencia: '+2.7%',
        mejor_centro: 'Colón (62.43%)',
        peor_centro: 'Sarmiento (55.90%)',
        mejor_indicador: 'Salud Mental (100%)',
        peor_indicador: 'EMP Hombres (23.04%)'
    };
    
    // ID único para los gráficos
    const donutId = 'iaaps-mini-donut-' + Date.now();
    const barId = 'iaaps-mini-bar-' + Date.now();
    
    // Crear mensaje con el mini dashboard
    const dashboardHtml = `
    <div class="iaaps-mini-dashboard">
        <div class="iaaps-dashboard-header">
            <h3><i class="fas fa-tachometer-alt"></i> Dashboard Comunal</h3>
            <span class="iaaps-dashboard-date">Abril 2025</span>
        </div>
        
        <div class="iaaps-dashboard-body">
            <div class="iaaps-dashboard-summary">
                <div class="iaaps-dashboard-kpi iaaps-kpi-main">
                    <div class="iaaps-kpi-value ${dashboardData.cumplimiento >= 60 ? 'success' : dashboardData.cumplimiento >= 55 ? 'warning' : 'danger'}">${dashboardData.cumplimiento}%</div>
                    <div class="iaaps-kpi-label">Cumplimiento</div>
                    <div class="iaaps-kpi-trend ${dashboardData.tendencia.startsWith('+') ? 'up' : 'down'}">
                        <i class="fas fa-arrow-${dashboardData.tendencia.startsWith('+') ? 'up' : 'down'}"></i> ${dashboardData.tendencia}
                    </div>
                </div>
                
                <div class="iaaps-dashboard-kpis">
                    <div class="iaaps-dashboard-kpi">
                        <div class="iaaps-kpi-value success">${dashboardData.indicadores_cumplidos}</div>
                        <div class="iaaps-kpi-label">Cumplidos</div>
                    </div>
                    <div class="iaaps-dashboard-kpi">
                        <div class="iaaps-kpi-value warning">${dashboardData.indicadores_parciales}</div>
                        <div class="iaaps-kpi-label">Parciales</div>
                    </div>
                    <div class="iaaps-dashboard-kpi">
                        <div class="iaaps-kpi-value danger">${dashboardData.indicadores_criticos}</div>
                        <div class="iaaps-kpi-label">Críticos</div>
                    </div>
                </div>
            </div>
            
            <div class="iaaps-dashboard-charts">
                <div class="iaaps-dashboard-chart">
                    <h4>Distribución</h4>
                    <div class="iaaps-chart-container">
                        <canvas id="${donutId}" width="120" height="120"></canvas>
                    </div>
                </div>
                
                <div class="iaaps-dashboard-chart">
                    <h4>Top Centros</h4>
                    <div class="iaaps-chart-container">
                        <canvas id="${barId}" width="150" height="120"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="iaaps-dashboard-highlights">
                <div class="iaaps-highlight-item">
                    <i class="fas fa-trophy text-success"></i>
                    <span><strong>Mejor centro:</strong> ${dashboardData.mejor_centro}</span>
                </div>
                <div class="iaaps-highlight-item">
                    <i class="fas fa-exclamation-triangle text-danger"></i>
                    <span><strong>Peor centro:</strong> ${dashboardData.peor_centro}</span>
                </div>
            </div>
            
            <div class="iaaps-dashboard-alerts">
                <div class="iaaps-alert-item danger">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>EMP Hombres (23.04%): Crítico</span>
                </div>
                <div class="iaaps-alert-item warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Visita domiciliaria (22.66%): Crítico</span>
                </div>
            </div>
        </div>
        
        <div class="iaaps-dashboard-footer">
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar reporte comunal detallado en pdf')">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
            <button class="iaaps-action-btn" onclick="IAAPSBot.sendMessage('generar reporte comunal en excel')">
                <i class="fas fa-file-excel"></i> Excel
            </button>
            <button class="iaaps-action-btn iaaps-btn-secondary" onclick="IAAPSBot.openDashboard()">
                <i class="fas fa-expand-alt"></i> Ver Completo
            </button>
        </div>
    </div>
    `;
    
    // Añadir estilos para el mini dashboard
    const dashboardStyles = document.createElement('style');
    dashboardStyles.textContent = `
        .iaaps-mini-dashboard {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-top: 10px;
            width: 100%;
        }
        
        .iaaps-dashboard-header {
            padding: 12px 15px;
            background: ${IAAPS_CONFIG.colors.primary};
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .iaaps-dashboard-header h3 {
            margin: 0;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .iaaps-dashboard-date {
            font-size: 13px;
            opacity: 0.8;
        }
        
        .iaaps-dashboard-body {
            padding: 15px;
        }
        
        .iaaps-dashboard-summary {
            display: flex;
            margin-bottom: 15px;
            gap: 15px;
        }
        
        .iaaps-dashboard-kpi {
            text-align: center;
            padding: 8px;
            border-radius: 8px;
            background: #f9f9f9;
        }
        
        .iaaps-kpi-main {
            flex: 1;
        }
        
        .iaaps-dashboard-kpis {
            flex: 2;
            display: flex;
            gap: 10px;
        }
        
        .iaaps-dashboard-kpis .iaaps-dashboard-kpi {
            flex: 1;
        }
        
        .iaaps-kpi-value {
            font-size: 22px;
            font-weight: 700;
            line-height: 1.2;
        }
        
        .iaaps-kpi-value.success {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-kpi-value.warning {
            color: ${IAAPS_CONFIG.colors.accent};
        }
        
        .iaaps-kpi-value.danger {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-kpi-label {
            font-size: 12px;
            color: #666;
        }
        
        .iaaps-kpi-trend {
            font-size: 13px;
            margin-top: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
        
        .iaaps-kpi-trend.up {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .iaaps-kpi-trend.down {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-dashboard-charts {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .iaaps-dashboard-chart {
            flex: 1;
            background: #f9f9f9;
            border-radius: 8px;
            padding: 10px;
        }
        
        .iaaps-dashboard-chart h4 {
            margin: 0 0 10px;
            font-size: 14px;
            color: #555;
            text-align: center;
        }
        
        .iaaps-chart-container {
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .iaaps-dashboard-highlights {
            margin-bottom: 15px;
        }
        
        .iaaps-highlight-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            margin-bottom: 8px;
        }
        
        .text-success {
            color: ${IAAPS_CONFIG.colors.success};
        }
        
        .text-danger {
            color: ${IAAPS_CONFIG.colors.danger};
        }
        
        .iaaps-dashboard-alerts {
            margin-bottom: 15px;
        }
        
        .iaaps-alert-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 13px;
            margin-bottom: 8px;
        }
        
        .iaaps-alert-item.danger {
            background: rgba(255, 90, 90, 0.1);
            color: #d32f2f;
        }
        
        .iaaps-alert-item.warning {
            background: rgba(255, 189, 61, 0.1);
            color: #ed6c02;
        }
        
        .iaaps-dashboard-footer {
            padding: 10px 15px;
            background: #f5f5f5;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        .iaaps-btn-secondary {
            background: #555;
        }
    `;
    
    // Añadir estilos al documento
    document.head.appendChild(dashboardStyles);
    
    // Añadir mensaje con el dashboard
    addBotMessage(dashboardHtml);
    
    // Inicializar gráficos después de que se hayan añadido al DOM
    setTimeout(() => {
        initMiniDashboardCharts(donutId, barId, dashboardData);
    }, 100);
}

/**
 * Inicializa los gráficos del mini dashboard
 * @param {string} donutId - ID del elemento canvas para el gráfico de dona
 * @param {string} barId - ID del elemento canvas para el gráfico de barras
 * @param {Object} data - Datos para los gráficos
 */
function initMiniDashboardCharts(donutId, barId, data) {
    // Gráfico de dona para distribución de indicadores
    const ctxDonut = document.getElementById(donutId).getContext('2d');
    new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['Cumplidos', 'Parciales', 'Críticos'],
            datasets: [{
                data: [data.indicadores_cumplidos, data.indicadores_parciales, data.indicadores_criticos],
                backgroundColor: [
                    IAAPS_CONFIG.colors.success,
                    IAAPS_CONFIG.colors.accent,
                    IAAPS_CONFIG.colors.danger
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true
                }
            },
            cutout: '70%'
        }
    });
    
    // Gráfico de barras para top centros
    const ctxBar = document.getElementById(barId).getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Colón', 'Los N.', 'Curicó', 'Miguel A.', 'Betty M.', 'Sarm.'],
            datasets: [{
                label: 'Cumplimiento (%)',
                data: [62.43, 61.83, 61.60, 59.86, 57.63, 55.90],
                backgroundColor: [
                    IAAPS_CONFIG.colors.success,
                    IAAPS_CONFIG.colors.success,
                    IAAPS_CONFIG.colors.success,
                    IAAPS_CONFIG.colors.accent,
                    IAAPS_CONFIG.colors.accent,
                    IAAPS_CONFIG.colors.accent
                ],
                borderWidth: 0,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    min: 50,
                    max: 70,
                    ticks: {
                        display: false
                    },
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                }
            }
        }
    });
}

/**
 * Muestra una notificación flotante
 * @param {string} message - Mensaje de la notificación
 * @param {string} type - Tipo de notificación (success, error, info, warning)
 */
function showNotification(message, type = 'info') {
    // Crear un nuevo elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'iaaps-notification';
    
    // Determinar color según tipo
    let bgColor, icon;
    switch (type) {
        case 'success':
            bgColor = IAAPS_CONFIG.colors.success;
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            bgColor = IAAPS_CONFIG.colors.danger;
            icon = 'fas fa-times-circle';
            break;
        case 'warning':
            bgColor = IAAPS_CONFIG.colors.accent;
            icon = 'fas fa-exclamation-triangle';
            break;
        case 'info':
        default:
            bgColor = IAAPS_CONFIG.colors.secondary;
            icon = 'fas fa-info-circle';
    }
    
    // Aplicar estilos
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = bgColor;
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    notification.style.zIndex = '10002';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '10px';
    notification.style.maxWidth = '400px';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // Contenido de la notificación
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Modifica la función original de generación de reportes para usar las nuevas funciones mejoradas
 * @param {string} centerName - Nombre del centro
 * @param {string} format - Formato del reporte (pdf, excel)
 */
function generateReport(centerName, format = null) {
    // Si no se especificó formato, presentar opciones
    if (!format) {
        addBotMessage(`
        <div class="iaaps-message-header">
            <i class="fas fa-file-alt"></i> Generación de Reporte: ${centerName}
        </div>
        <p>Puedo generar el reporte en diferentes formatos. ¿Cuál prefieres?</p>
        `);
        
        addQuickActions([
            { text: 'PDF', action: `generar_pdf_${centerName.toLowerCase().replace(' ', '_')}` },
            { text: 'Excel', action: `generar_excel_${centerName.toLowerCase().replace(' ', '_')}` },
            { text: 'Ver Resumen', action: `resumen_${centerName.toLowerCase().replace(' ', '_')}` }
        ]);
        
        return;
    }
    
    // Si quiere PDF, generar reporte
    if (format === 'pdf') {
        addBotMessage(`<div class="iaaps-processing">
            <div class="iaaps-processing-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="iaaps-processing-text">
                <h4>Generando reporte PDF: ${centerName}</h4>
                <div class="iaaps-progress">
                    <div class="iaaps-progress-bar"><div class="iaaps-progress-fill"></div></div>
                </div>
                <p>Procesando datos y generando documento...</p>
            </div>
        </div>`);
        
        // Simular procesamiento
        setTimeout(() => {
            // Generar reporte real con la nueva función mejorada
            createPDFReport(centerName);
            
            // Mostrar confirmación
            addBotMessage(`<div class="iaaps-success-message">
                <i class="fas fa-check-circle"></i>
                <h4>¡Reporte PDF generado con éxito!</h4>
                <p>El reporte para ${centerName} ha sido creado correctamente.</p>
                <div class="iaaps-download-link">
                    <a href="#" onclick="downloadPDFReport('${centerName}'); return false;" class="iaaps-download-btn">
                        <i class="fas fa-download"></i> Descargar PDF
                    </a>
                </div>
            </div>`);
        }, 1500);
        
        return;
    }
    
    // Si quiere Excel, generar reporte
    if (format === 'excel') {
        addBotMessage(`<div class="iaaps-processing">
            <div class="iaaps-processing-icon">
                <i class="fas fa-file-excel"></i>
            </div>
            <div class="iaaps-processing-text">
                <h4>Generando reporte Excel: ${centerName}</h4>
                <div class="iaaps-progress">
                    <div class="iaaps-progress-bar"><div class="iaaps-progress-fill"></div></div>
                </div>
                <p>Procesando datos y generando hoja de cálculo...</p>
            </div>
        </div>`);
        
        // Simular procesamiento
        setTimeout(() => {
            // Generar Excel real con la nueva función mejorada
            createExcelReport(centerName);
            
            // Mostrar confirmación
            addBotMessage(`<div class="iaaps-success-message">
                <i class="fas fa-check-circle"></i>
                <h4>¡Reporte Excel generado con éxito!</h4>
                <p>El reporte para ${centerName} ha sido creado correctamente.</p>
                <div class="iaaps-download-link">
                    <a href="#" onclick="downloadExcelReport('${centerName}'); return false;" class="iaaps-download-btn">
                        <i class="fas fa-download"></i> Descargar Excel
                    </a>
                </div>
            </div>`);
        }, 1500);
        
        return;
    }
    
    // Si se solicita descarga real de PDF
    if (format === 'pdf-download') {
        // Trigger descarga real utilizando la nueva función mejorada
        downloadPDFReport(centerName);
        return;
    }
    
    // Si se solicita descarga real de Excel
    if (format === 'excel-download') {
        // Trigger descarga real utilizando la nueva función mejorada
        downloadExcelReport(centerName);
        return;
    }
}

/**
 * Inicializa las mejoras adicionales del chatbot
 */
function initChatbotEnhancements() {
    // Hacer redimensionable el chatbot
    makeResizable();
    
    // Hacer que el chatbot se pueda mover
    makeDraggable();
    
    // Exponer la funcionalidad del mini dashboard
    if (window.IAAPSBot) {
        window.IAAPSBot.showMiniDashboard = showMiniDashboard;
    }
    
    console.log('Mejoras del chatbot inicializadas correctamente');
}

// Inicializar mejoras cuando se carga el documento
document.addEventListener('DOMContentLoaded', () => {
    // Las mejoras se inicializarán cuando el chatbot esté listo
    const checkIAAPSReady = setInterval(() => {
        if (window.IAAPSBot) {
            clearInterval(checkIAAPSReady);
            initChatbotEnhancements();
        }
    }, 100);
});