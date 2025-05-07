<!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="row">
                <div class="col-lg-4 col-md-6">
                    <div class="footer-logo">
                        <img src="../images/logo2.png" alt="Logo Salud Curicó">
                    </div>
                    <div class="footer-text">
                        <p>Sistema Integrado de Información para la Gestión en Salud - INFOGES CURICÓ. Comprometidos con la salud y bienestar de nuestra comunidad.</p>
                    </div>
                    <div class="footer-social">
                        <a href="#"><i class="fab fa-facebook-f"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="#"><i class="fab fa-linkedin-in"></i></a>
                    </div>
                </div>
                
                <div class="col-lg-2 col-md-6">
                    <h4 class="footer-heading">Enlaces Rápidos</h4>
                    <ul class="footer-links">
                        <li><a href="index.php"><i class="fas fa-chevron-right"></i> Inicio</a></li>
                        <li><a href="#centros"><i class="fas fa-chevron-right"></i> Centros de Salud</a></li>
                        <li><a href="modules/noticias.php"><i class="fas fa-chevron-right"></i> Noticias</a></li>
                        <li><a href="modules/servicios.php"><i class="fas fa-chevron-right"></i> Servicios</a></li>
                        <li><a href="modules/herramientas.php"><i class="fas fa-chevron-right"></i> Herramientas</a></li>
                        <li><a href="login.php"><i class="fas fa-chevron-right"></i> Acceder</a></li>
                    </ul>
                </div>
                
                <div class="col-lg-3 col-md-6">
                    <h4 class="footer-heading">Información Útil</h4>
                    <ul class="footer-links">
                        <li><a href="faq.php"><i class="fas fa-question-circle"></i> Preguntas Frecuentes</a></li>
                        <li><a href="terminos.php"><i class="fas fa-file-alt"></i> Términos y Condiciones</a></li>
                        <li><a href="privacidad.php"><i class="fas fa-lock"></i> Política de Privacidad</a></li>
                        <li><a href="contacto.php"><i class="fas fa-envelope"></i> Contacto</a></li>
                        <li><a href="ayuda.php"><i class="fas fa-hands-helping"></i> Ayuda y Soporte</a></li>
                        <li><a href="mapa-sitio.php"><i class="fas fa-sitemap"></i> Mapa del Sitio</a></li>
                    </ul>
                </div>
                
                <div class="col-lg-3 col-md-6">
                    <h4 class="footer-heading">Contacto</h4>
                    <div class="footer-contact">
                        <div class="footer-contact-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="footer-contact-content">
                            <h4>Dirección</h4>
                            <p>Carmen 123, Curicó, Región del Maule</p>
                        </div>
                    </div>
                    <div class="footer-contact">
                        <div class="footer-contact-icon">
                            <i class="fas fa-phone-alt"></i>
                        </div>
                        <div class="footer-contact-content">
                            <h4>Teléfono</h4>
                            <p>+56 75 2 317 000</p>
                        </div>
                    </div>
                    <div class="footer-contact">
                        <div class="footer-contact-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="footer-contact-content">
                            <h4>Email</h4>
                            <p>contacto@sams.curico.cl</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; <?php echo date('Y'); ?> INFOGES CURICÓ - Sistema Integrado de Información para la Gestión en Salud. Todos los derechos reservados.</p>
            </div>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    <script src="js/main.js"></script>
    
    <script>
        // Inicializar AOS (Animate on Scroll)
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
        
        // Inicializar chatbot
        document.addEventListener('DOMContentLoaded', function() {
            // Elementos del chatbot
            const chatbotButton = document.getElementById('chatbotButton');
            const chatbotWindow = document.getElementById('chatbotWindow');
            const chatbotClose = document.getElementById('chatbotClose');
            const chatbotForm = document.getElementById('chatbotForm');
            const chatbotMessage = document.getElementById('chatbotMessage');
            const chatbotBody = document.getElementById('chatbotBody');
            
            if (!chatbotButton || !chatbotWindow || !chatbotClose || !chatbotForm) return;
            
            // Toggle chatbot window
            chatbotButton.addEventListener('click', function() {
                chatbotWindow.classList.toggle('show');
                // Si se abre el chatbot, focus en el input
                if (chatbotWindow.classList.contains('show')) {
                    chatbotMessage.focus();
                }
            });
            
            // Close chatbot
            chatbotClose.addEventListener('click', function() {
                chatbotWindow.classList.remove('show');
            });
            
            // Submit message
            chatbotForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const message = chatbotMessage.value.trim();
                if (!message) return;
                
                // Añadir mensaje del usuario
                addChatMessage(message, 'user');
                
                // Limpiar input
                chatbotMessage.value = '';
                
                // Mostrar indicador de escritura
                addTypingIndicator();
                
                // Enviar mensaje al servidor
                fetch('modules/chatbot.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'message=' + encodeURIComponent(message)
                })
                .then(response => response.json())
                .then(data => {
                    // Eliminar indicador de escritura
                    removeTypingIndicator();
                    
                    // Mostrar respuesta
                    if (data.error) {
                        addChatMessage(data.response || 'Lo siento, ocurrió un error. Por favor intenta nuevamente.', 'bot');
                    } else {
                        addChatMessage(data.response, 'bot');
                    }
                    
                    // Scroll al fondo
                    chatbotBody.scrollTop = chatbotBody.scrollHeight;
                })
                .catch(error => {
                    console.error('Error:', error);
                    removeTypingIndicator();
                    addChatMessage('Lo siento, ocurrió un error de conexión. Por favor intenta nuevamente.', 'bot');
                });
            });
            
            // Función para añadir mensajes al chat
            function addChatMessage(message, sender) {
                const messageElement = document.createElement('div');
                messageElement.className = 'chat-message chat-' + sender;
                
                const bubbleElement = document.createElement('div');
                bubbleElement.className = 'chat-bubble';
                bubbleElement.innerHTML = message;
                
                messageElement.appendChild(bubbleElement);
                chatbotBody.appendChild(messageElement);
                
                // Scroll al fondo
                chatbotBody.scrollTop = chatbotBody.scrollHeight;
            }
            
            // Función para mostrar indicador de escritura
            function addTypingIndicator() {
                const typingElement = document.createElement('div');
                typingElement.className = 'chat-message chat-bot typing-indicator';
                typingElement.innerHTML = '<div class="chat-bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
                chatbotBody.appendChild(typingElement);
                chatbotBody.scrollTop = chatbotBody.scrollHeight;
            }
            
            // Función para eliminar indicador de escritura
            function removeTypingIndicator() {
                const typingIndicator = document.querySelector('.typing-indicator');
                if (typingIndicator) {
                    typingIndicator.remove();
                }
            }
        });
    </script>
</body>
</html>