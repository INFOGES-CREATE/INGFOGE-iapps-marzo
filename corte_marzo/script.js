// script.js
// Bootstrap general para iniciar todos los módulos del Dashboard IAAPS Curicó

// Importar módulos locales (usar rutas relativas)
import { initThemeSwitcher } from './modules/theme.js';
import { initSidebarToggle, onSidebarNavigate } from './modules/sidebar.js';
import { initViewNavigation } from './modules/navigation.js';
import { initLoader, showLoader, hideLoader, showToast } from './modules/loader.js';
import { loadExcelData } from './modules/dataLoader.js';
import { initializeDashboard } from './modules/dashboard.js';
import { initChatbot } from './modules/chatbot.js';

// Punto de entrada: arrancar todo al cargar el documento
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Iniciando sistema IAAPS Curicó...');

    // 1) UI Básica
    initThemeSwitcher();       // Configura selector de tema
    console.log('✅ ThemeSwitcher inicializado');

    initSidebarToggle();       // Configura sidebar colapsable
    console.log('✅ SidebarToggle inicializado');
    onSidebarNavigate(view => {
      console.log('➡ Navegación solicitada a:', view);
      // TODO: Mostrar vista correspondiente, e.g. showView(view)
    });

    initViewNavigation();      // Configura navegación de vistas
    console.log('✅ ViewNavigation inicializado');

    // 2) Loader y Notificaciones
    initLoader();             // Prepara overlay y container de toasts
    showLoader('Iniciando carga de datos...');

    // 3) Carga de datos y Dashboard
    const iaapsData = await loadExcelData();  // Lee Excel y parsea datos
    console.log('✅ Datos cargados:', iaapsData);
    initializeDashboard(iaapsData);           // Renderiza tarjetas, gráficos, tablas
    console.log('✅ Dashboard inicializado');

    // 4) Chatbot IA
    initChatbot(iaapsData);    // Prepara asistente con datos y API
    console.log('✅ Chatbot inicializado');

    // Finalizar proceso de arranque
    hideLoader();
    showToast('success', 'Sistema IAAPS Curicó inicializado correctamente');
    console.log('🎉 Sistema completamente cargado');

  } catch (error) {
    console.error('❌ Error al iniciar sistema:', error);
    hideLoader();
    showToast('error', 'Error al inicializar el sistema');
  }
});
