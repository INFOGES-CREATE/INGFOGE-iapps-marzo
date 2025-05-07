<?php
// Incluir el header
include_once 'includes/header.php';
?>

<!-- Hero Section -->
<section class="hero" id="home">
    <div class="container">
        <div class="row align-items-center">
            <div class="col-lg-7">
                <h1 class="hero-title animate__animated animate__fadeInUp">Portal Público de Salud Curicó</h1>
                <p class="hero-subtitle animate__animated animate__fadeInUp animate__delay-1s">Accede a información sobre nuestros centros de salud, estadísticas y herramientas para el cuidado de tu bienestar. Estamos comprometidos con la salud de nuestra comunidad.</p>
                <div class="d-flex flex-wrap gap-3 animate__animated animate__fadeInUp animate__delay-2s">
                    <a href="dashboard.html" class="btn btn-primary btn-lg">
                        <i class="fas fa-hospital-user me-2"></i> IAAPS CORTE MARZO 2025
                    </a>
                    <a href="#herramientas" class="btn btn-outline-light btn-lg">
                        <i class="fas fa-hospital-user me-2"></i> METAS CORTE MARZO 2025
                    </a>
                </div>
            </div>
           
        </div>
    </div>
</section>

F

<!-- Noticias Section -->
<section class="section bg-light" id="noticias">
    <div class="container">
        <div class="section-title text-center" data-aos="fade-up">
            <h2>Noticias y <span class="text-primary">Anuncios</span></h2>
            <p>Mantente informado sobre las últimas noticias y eventos de nuestro sistema de salud</p>
        </div>
        
        <div class="row g-4">
            <?php if (!empty($noticias)): ?>
                <?php foreach ($noticias as $index => $noticia): ?>
                    <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="<?php echo $index * 100; ?>">
                        <div class="card h-100 news-card">
                            <?php if (!empty($noticia['imagen_url'])): ?>
                            <img src="<?php echo htmlspecialchars($noticia['imagen_url']); ?>" class="card-img-top" alt="<?php echo htmlspecialchars($noticia['titulo']); ?>">
                            <?php else: ?>
                            <div class="card-img-top news-placeholder">
                                <i class="fas fa-newspaper"></i>
                            </div>
                            <?php endif; ?>
                            <div class="card-body">
                                <?php if ($noticia['destacada']): ?>
                                <span class="badge bg-primary mb-2">Destacado</span>
                                <?php endif; ?>
                                <h5 class="card-title"><?php echo htmlspecialchars($noticia['titulo']); ?></h5>
                                <p class="card-text text-muted">
                                    <?php echo mb_substr(strip_tags($noticia['contenido']), 0, 120) . '...'; ?>
                                </p>
                            </div>
                            <div class="card-footer bg-white d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    <i class="far fa-calendar-alt me-1"></i> 
                                    <?php echo date('d/m/Y', strtotime($noticia['fecha_publicacion'])); ?>
                                </small>
                                <a href="modules/noticias.php?id=<?php echo $noticia['id_noticia']; ?>" class="btn btn-sm btn-primary">Leer más</a>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i> No hay noticias disponibles en este momento.
                    </div>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="text-center mt-4" data-aos="fade-up">
            <a href="modules/noticias.php" class="btn btn-outline-primary">
                <i class="fas fa-newspaper me-2"></i> Ver todas las noticias
            </a>
        </div>
    </div>
</section>

<!-- Servicios Section -->
<section class="section" id="servicios">
    <div class="container">
        <div class="section-title text-center" data-aos="fade-up">
            <h2>Nuestros <span class="text-primary">Servicios</span></h2>
            <p>Conoce todos los servicios que ofrecemos para el cuidado de tu salud y bienestar</p>
        </div>
        
        <div class="row g-4">
            <?php if (!empty($servicios)): ?>
                <?php foreach ($servicios as $index => $servicio): ?>
                    <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="<?php echo $index * 100; ?>">
                        <div class="card h-100 service-card">
                            <div class="card-body text-center">
                                <div class="service-icon mb-4">
                                    <i class="fas fa-<?php echo !empty($servicio['icono']) ? $servicio['icono'] : 'briefcase-medical'; ?>"></i>
                                </div>
                                <h5 class="card-title"><?php echo htmlspecialchars($servicio['nombre']); ?></h5>
                                <p class="card-text">
                                    <?php echo mb_substr(strip_tags($servicio['descripcion']), 0, 100) . '...'; ?>
                                </p>
                                <div class="mt-3">
                                    <span class="badge bg-<?php echo $servicio['tipo'] === 'Online' ? 'success' : ($servicio['tipo'] === 'Mixto' ? 'warning' : 'info'); ?>">
                                        <?php echo htmlspecialchars($servicio['tipo']); ?>
                                    </span>
                                </div>
                            </div>
                            <div class="card-footer bg-white text-center">
                                <?php if ($servicio['disponible_online']): ?>
                                    <a href="<?php echo $servicio['url_tramite']; ?>" class="btn btn-primary">
                                        <i class="fas fa-external-link-alt me-2"></i> Acceder
                                    </a>
                                <?php else: ?>
                                    <a href="modules/servicios.php?id=<?php echo $servicio['id_servicio']; ?>" class="btn btn-outline-primary">
                                        <i class="fas fa-info-circle me-2"></i> Más información
                                    </a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i> No hay servicios disponibles en este momento.
                    </div>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="text-center mt-4" data-aos="fade-up">
            <a href="modules/servicios.php" class="btn btn-outline-primary">
                <i class="fas fa-list me-2"></i> Ver todos los servicios
            </a>
        </div>
    </div>
</section>

<!-- Herramientas Section -->
<section class="section bg-light" id="herramientas">
    <div class="container">
        <div class="section-title text-center" data-aos="fade-up">
            <h2>Herramientas de <span class="text-primary">Salud</span></h2>
            <p>Recursos diseñados para ayudarte en el cuidado de tu salud y bienestar</p>
        </div>
        
        <div class="row g-4">
            <div class="col-md-6 col-lg-4" data-aos="fade-up">
                <div class="tool-card">
                    <div class="tool-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <h3 class="tool-title">Calculadora de IMC</h3>
                    <p class="tool-text">Calcula tu Índice de Masa Corporal (IMC) para evaluar tu estado nutricional según estándares de la OMS.</p>
                    <a href="modules/herramientas.php?tool=imc" class="btn btn-primary">
                        <i class="fas fa-calculator me-2"></i> Calcular IMC
                    </a>
                </div>
            </div>
            
            <div class="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="100">
                <div class="tool-card">
                    <div class="tool-icon">
                        <i class="fas fa-heartbeat"></i>
                    </div>
                    <h3 class="tool-title">Riesgo Cardiovascular</h3>
                    <p class="tool-text">Evalúa tu riesgo cardiovascular basado en edad, presión arterial, colesterol y otros factores.</p>
                    <a href="modules/herramientas.php?tool=riesgo-cv" class="btn btn-primary">
                        <i class="fas fa-heartbeat me-2"></i> Evaluar Riesgo
                    </a>
                </div>
            </div>
            
            <div class="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="200">
                <div class="tool-card">
                    <div class="tool-icon">
                        <i class="fas fa-pills"></i>
                    </div>
                    <h3 class="tool-title">Recordatorio de Medicamentos</h3>
                    <p class="tool-text">Configura recordatorios para tomar tus medicamentos a tiempo con notificaciones personalizables.</p>
                    <a href="modules/herramientas.php?tool=medicamentos" class="btn btn-primary">
                        <i class="fas fa-bell me-2"></i> Crear Recordatorio
                    </a>
                </div>
            </div>
        </div>
        
        <div class="text-center mt-4" data-aos="fade-up">
            <a href="modules/herramientas.php" class="btn btn-outline-primary">
                <i class="fas fa-tools me-2"></i> Ver todas las herramientas
            </a>
        </div>
    </div>
</section>

<!-- Feedback Section -->
<section class="feedback-section" id="comentarios">
    <div class="container">
        <div class="section-title" data-aos="fade-up">
            <h2>Tus Comentarios y <span>Sugerencias</span></h2>
            <p>Tu opinión es importante para nosotros. Ayúdanos a mejorar nuestros servicios</p>
        </div>
        
        <div class="row">
            <div class="col-lg-8 mx-auto">
                <div class="feedback-card" data-aos="fade-up">
                    <div class="feedback-header">
                        <h2>Envíanos tu comentario</h2>
                        <p>Queremos conocer tus experiencias, ideas y sugerencias para seguir mejorando</p>
                    </div>
                    <div class="feedback-body">
                        <?php if (isset($feedbackSuccess)): ?>
                            <div class="alert alert-success" role="alert">
                                <i class="fas fa-check-circle me-2"></i> <?php echo $feedbackSuccess; ?>
                            </div>
                        <?php elseif (isset($feedbackError)): ?>
                            <div class="alert alert-danger" role="alert">
                                <i class="fas fa-exclamation-circle me-2"></i> <?php echo $feedbackError; ?>
                            </div>
                        <?php endif; ?>
                        
                        <form action="#comentarios" method="post">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label for="nombre">Nombre <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="nombre" name="nombre" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label for="email">Email <span class="text-danger">*</span></label>
                                        <input type="email" class="form-control" id="email" name="email" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label for="centro">Centro de Salud</label>
                                        <select class="form-select" id="centro" name="centro">
                                            <option value="">Seleccionar centro...</option>
                                            <?php foreach ($centros as $centro): ?>
                                            <option value="<?php echo $centro['id_centro']; ?>" <?php if ($selectedCentroId == $centro['id_centro']) echo 'selected'; ?>>
                                                <?php echo htmlspecialchars($centro['nombre']); ?>
                                            </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label for="tipo">Tipo de Comentario</label>
                                        <select class="form-select" id="tipo" name="tipo">
                                            <option value="Sugerencia">Sugerencia</option>
                                            <option value="Felicitación">Felicitación</option>
                                            <option value="Reclamo">Reclamo</option>
                                            <option value="Consulta">Consulta</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group mb-3">
                                <label for="mensaje">Mensaje <span class="text-danger">*</span></label>
                                <textarea class="form-control" id="mensaje" name="mensaje" rows="4" required></textarea>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" value="" id="terminos" required>
                                <label class="form-check-label" for="terminos">
                                    Acepto los <a href="#" target="_blank">términos y condiciones</a> y la <a href="#" target="_blank">política de privacidad</a>
                                </label>
                            </div>
                            
                            <button type="submit" name="submit_feedback" class="btn btn-primary">
                                <i class="fas fa-paper-plane me-2"></i> Enviar Comentario
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Chatbot -->


<div class="chatbot-container">
    <div class="chatbot-button" id="chatbotButton">
        <i class="fas fa-comment-dots"></i>
    </div>
    
    <div class="chatbot-window" id="chatbotWindow">
        <div class="chatbot-header">
            <h5 class="chatbot-title"><i class="fas fa-robot me-2"></i> Asistente Virtual</h5>
            <div class="chatbot-close" id="chatbotClose"><i class="fas fa-times"></i></div>
        </div>
        <div class="chatbot-body" id="chatbotBody">
            <div class="chat-message chat-bot">
                <div class="chat-bubble">
                    Hola 👋 Soy el asistente virtual de Salud Curicó. ¿En qué puedo ayudarte hoy?
                </div>
            </div>
        </div>
        <div class="chatbot-input">
            <form id="chatbotForm" class="d-flex gap-2">
                <input type="text" class="form-control" id="chatbotMessage" placeholder="Escribe tu mensaje..." autocomplete="off">
                <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i></button>
            </form>
        </div>
    </div>
</div>
<script>
    /**
 * Chatbot Premium para Portal de Salud Curicó
 * Script principal para la funcionalidad e interacción del chatbot
 * 
 * @version 1.0
 */

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const chatbotButton = document.getElementById('chatbotButton');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotBody = document.getElementById('chatbotBody');
    const chatbotForm = document.getElementById('chatbotForm');
    const chatbotMessage = document.getElementById('chatbotMessage');
    
    // Estado del chatbot
    let chatbotState = {
        isOpen: false,
        isTyping: false,
        sessionId: generateSessionId(),
        conversationHistory: []
    };
    
    // Mensajes de bienvenida y sugerencias
    const welcomeSuggestions = [
        "¿Dónde encuentro mi centro de salud más cercano?",
        "¿Cómo solicitar hora médica?",
        "Información sobre vacunas"
    ];
    
    // Configuración de escritura automática
    const typingSpeed = 15; // Velocidad en milisegundos por caracter
    const typingDelay = 500; // Retraso inicial antes de comenzar a escribir
    
    // Eventos para abrir/cerrar el chatbot
    chatbotButton.addEventListener('click', toggleChatbot);
    chatbotClose.addEventListener('click', toggleChatbot);
    
    // Evento para enviar mensajes
    chatbotForm.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessage();
    });
    
    // Inicializar chatbot (cargar historial si existe)
    initChatbot();
    
    /**
     * Inicializa el chatbot con configuración inicial
     */
    function initChatbot() {
        // Intentar cargar historial desde sessionStorage
        const savedHistory = sessionStorage.getItem('chatbotHistory');
        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                if (Array.isArray(parsedHistory)) {
                    chatbotState.conversationHistory = parsedHistory;
                    
                    // Reconstruir la conversación en la interfaz
                    parsedHistory.forEach(item => {
                        if (item.role === 'user') {
                            appendUserMessage(item.content);
                        } else if (item.role === 'assistant') {
                            appendBotMessage(item.content, false); // Sin animación
                        }
                    });
                    
                    // Si hay historial, no mostrar la bienvenida nuevamente
                    return;
                }
            } catch (error) {
                console.error("Error al cargar historial:", error);
            }
        }
        
        // Mostrar mensajes de bienvenida y sugerencias para nueva sesión
        setTimeout(() => {
            appendBotMessage("Hola 👋 Soy el asistente virtual de Salud Curicó. ¿En qué puedo ayudarte hoy?");
            
            // Añadir sugerencias después del mensaje de bienvenida
            setTimeout(() => {
                appendSuggestions(welcomeSuggestions);
            }, 1000);
        }, 500);
    }
    
    /**
     * Abre o cierra la ventana del chatbot
     */
    function toggleChatbot() {
        chatbotState.isOpen = !chatbotState.isOpen;
        
        if (chatbotState.isOpen) {
            chatbotWindow.classList.add('chatbot-window-active');
            chatbotButton.classList.add('chatbot-button-active');
            
            // Scroll al final del chat
            scrollToBottom();
            
            // Enfoque en el campo de mensaje
            setTimeout(() => {
                chatbotMessage.focus();
            }, 300);
        } else {
            chatbotWindow.classList.remove('chatbot-window-active');
            chatbotButton.classList.remove('chatbot-button-active');
        }
    }
    
    /**
     * Envía el mensaje del usuario al servidor
     */
    function sendMessage() {
        const message = chatbotMessage.value.trim();
        
        if (message === '' || chatbotState.isTyping) return;
        
        // Limpiar campo de mensaje
        chatbotMessage.value = '';
        
        // Mostrar mensaje del usuario
        appendUserMessage(message);
        
        // Guardar mensaje en historial
        chatbotState.conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Mostrar indicador de escritura
        showTypingIndicator();
        
        // Enviar mensaje al servidor
        fetchBotResponse(message);
    }
    
    /**
     * Muestra el mensaje del usuario en la interfaz
     */
    function appendUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message chat-user';
        messageElement.innerHTML = `
            <div class="chat-bubble">${escapeHTML(message)}</div>
        `;
        
        // Eliminar sugerencias al enviar un mensaje
        removeSuggestions();
        
        // Añadir mensaje y hacer scroll
        chatbotBody.appendChild(messageElement);
        scrollToBottom();
    }
    
    /**
     * Muestra el mensaje del bot en la interfaz, con opción de animación de escritura
     */
    function appendBotMessage(message, animate = true) {
        if (!animate) {
            // Insertar inmediatamente sin animación
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message chat-bot';
            messageElement.innerHTML = `
                <div class="chat-bubble">${formatBotMessage(message)}</div>
            `;
            chatbotBody.appendChild(messageElement);
            scrollToBottom();
            return;
        }
        
        // Crear contenedor del mensaje
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message chat-bot';
        
        const bubbleElement = document.createElement('div');
        bubbleElement.className = 'chat-bubble';
        
        messageElement.appendChild(bubbleElement);
        chatbotBody.appendChild(messageElement);
        
        // Remover indicador de escritura
        removeTypingIndicator();
        
        // Efecto de escritura automática
        let i = 0;
        const formattedMessage = formatBotMessage(message);
        
        // Retraso inicial para simular pensamiento
        setTimeout(() => {
            const typingInterval = setInterval(() => {
                // Extraer la parte del mensaje a mostrar, preservando las etiquetas HTML
                const currentText = extractTextWithTags(formattedMessage, i);
                bubbleElement.innerHTML = currentText;
                scrollToBottom();
                
                i++;
                if (i > formattedMessage.length) {
                    clearInterval(typingInterval);
                    chatbotState.isTyping = false;
                    
                    // Permitir seleccionar texto una vez completado
                    bubbleElement.style.userSelect = 'text';
                }
            }, typingSpeed);
        }, typingDelay);
    }
    
    /**
     * Extrae texto con etiquetas HTML intactas hasta la posición indicada
     */
    function extractTextWithTags(html, position) {
        const div = document.createElement('div');
        div.innerHTML = html;
        
        function processNode(node, currentPos) {
            if (currentPos >= position) return currentPos;
            
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeText = node.nodeValue;
                if (currentPos + nodeText.length >= position) {
                    const visibleText = nodeText.substring(0, position - currentPos);
                    node.nodeValue = visibleText;
                    return position;
                } else {
                    currentPos += nodeText.length;
                    return currentPos;
                }
            }
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                const childNodes = Array.from(node.childNodes);
                for (const child of childNodes) {
                    currentPos = processNode(child, currentPos);
                    if (currentPos >= position) break;
                }
            }
            
            return currentPos;
        }
        
        processNode(div, 0);
        return div.innerHTML;
    }
    
    /**
     * Muestra el indicador de escritura del bot
     */
    function showTypingIndicator() {
        chatbotState.isTyping = true;
        
        const typingElement = document.createElement('div');
        typingElement.className = 'chat-message chat-bot typing-indicator';
        typingElement.innerHTML = `
            <div class="chat-bubble">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatbotBody.appendChild(typingElement);
        scrollToBottom();
    }
    
    /**
     * Elimina el indicador de escritura
     */
    function removeTypingIndicator() {
        const typingIndicator = chatbotBody.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    /**
     * Añade botones de sugerencias
     */
    function appendSuggestions(suggestions) {
        // Eliminar sugerencias existentes
        removeSuggestions();
        
        const suggestionsElement = document.createElement('div');
        suggestionsElement.className = 'chat-suggestions';
        
        suggestions.forEach(suggestion => {
            const button = document.createElement('button');
            button.className = 'suggestion-button';
            button.textContent = suggestion;
            button.addEventListener('click', () => {
                chatbotMessage.value = suggestion;
                sendMessage();
            });
            
            suggestionsElement.appendChild(button);
        });
        
        chatbotBody.appendChild(suggestionsElement);
        scrollToBottom();
    }
    
    /**
     * Elimina los botones de sugerencias
     */
    function removeSuggestions() {
        const suggestions = chatbotBody.querySelector('.chat-suggestions');
        if (suggestions) {
            suggestions.remove();
        }
    }
    
   /**
 * Realiza solicitud a la API para obtener respuesta del chatbot
 */
async function fetchBotResponse(message) {
    try {
        console.log("Enviando mensaje:", message);
        console.log("Estado de la sesión:", chatbotState.sessionId);
        
        // Mostrar URL completa para depuración
        const apiUrl = 'api/chatbot.php';
        console.log("URL de la API:", new URL(apiUrl, window.location.href).href);
        
        const payload = {
            message: message,
            sessionId: chatbotState.sessionId,
            history: chatbotState.conversationHistory
        };
        console.log("Datos enviados:", payload);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log("Estado de la respuesta:", response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error("Error detallado:", errorData);
            } catch (parseError) {
                console.error("Error al parsear respuesta:", parseError);
                const responseText = await response.text();
                console.error("Texto de respuesta:", responseText);
            }
            throw new Error(errorData?.error || `Error HTTP: ${response.status}`);
        }
        
        // Intentar parsear la respuesta
        let data;
        try {
            data = await response.json();
            console.log("Datos recibidos:", data);
        } catch (parseError) {
            console.error("Error al parsear JSON:", parseError);
            const responseText = await response.text();
            console.error("Texto de respuesta:", responseText.substring(0, 500));
            throw new Error("Error al procesar la respuesta del servidor");
        }
        
        // Verificar que la respuesta tiene el formato esperado
        if (!data.response) {
            console.error("Respuesta inválida:", data);
            throw new Error("La respuesta del servidor no tiene el formato esperado");
        }
        
        // Guardar respuesta en historial
        chatbotState.conversationHistory.push({
            role: 'assistant',
            content: data.response
        });
        
        // Guardar historial en sessionStorage
        sessionStorage.setItem('chatbotHistory', JSON.stringify(chatbotState.conversationHistory));
        
        // Mostrar respuesta con animación
        appendBotMessage(data.response);
        
    } catch (error) {
        console.error('Error en la respuesta del chatbot:', error);
        
        // Eliminar indicador de escritura
        removeTypingIndicator();
        
        // Mostrar mensaje de error
        const errorMessage = "Lo siento, estoy teniendo problemas para responder en este momento. ¿Podrías intentarlo más tarde?";
        appendBotMessage(errorMessage);
        
        chatbotState.isTyping = false;
    }
}
    /**
     * Formatea el mensaje del bot para convertir URLs en enlaces, etc.
     */
    function formatBotMessage(message) {
        // Convertir URLs en enlaces
        message = message.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Convertir emoji de códigos a visuales (ejemplo básico)
        message = message.replace(/:smile:/g, '😊');
        message = message.replace(/:thumbsup:/g, '👍');
        
        // Destacar información importante
        message = message.replace(
            /\*\*(.*?)\*\*/g, 
            '<strong>$1</strong>'
        );
        
        return message;
    }
    
    /**
     * Función para hacer scroll al final del chat
     */
    function scrollToBottom() {
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
    }
    
    /**
     * Genera un ID de sesión único
     */
    function generateSessionId() {
        return 'chat_' + Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15) + 
               '_' + Date.now();
    }
    
    /**
     * Escapa caracteres HTML para prevenir XSS
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
</script>




<?php
// Incluir el footer
include_once 'includes/footer.php';
?>