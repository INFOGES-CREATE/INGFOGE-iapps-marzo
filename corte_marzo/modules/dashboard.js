// modules/dashboard.js
// Gestión completa del Dashboard IAAPS Curicó
// Provee funcionalidad para:
//  - Actualizar tarjetas de resumen
//  - Renderizar gráfico de cumplimiento por centro (Chart.js)
//  - Llenar tabla de cumplimiento por centro
//  - Inicializar gráficos de Top 5 indicadores (ApexCharts)
//  - Inicializar mapa de centros (Leaflet)
//  - Exportar datos básicos de resumen para otros módulos

/**
 * Inicializa completamente el dashboard:
 *  - Actualiza tarjetas de resumen
 *  - Genera gráfico de centros
 *  - Puebla tabla de centros
 *  - Crea gráficos top indicadores
 *  - Dibuja mapa de centros
 * @param {{resumen: Array<Object>, centros: Array<Object>}} iaapsData
 */
export function initializeDashboard(iaapsData) {
  const { resumen, centros } = iaapsData;

  // 1) Tarjetas resumen
  updateSummaryCards(resumen);

  // 2) Cumplimiento por centro (gráfico y tabla)
  renderCentroChart(centros);
  populateCentroTable(centros);

  // 3) Top 5 indicadores
  initTopIndicators(resumen);

  // 4) Mapa de centros
  initCentersMap(centros);
}

/**
 * Actualiza las tarjetas de resumen en la UI.
 * @param {Array<{Indicador: string, Meta: number, Actual: number, Cumplimiento: number}>} resumen
 */
function updateSummaryCards(resumen) {
  const total = resumen.length;
  const cumplidosCount = resumen.filter(r => r.Cumplimiento >= 95).length;
  const parcialCount = resumen.filter(r => r.Cumplimiento >= 80 && r.Cumplimiento < 95).length;
  const criticoCount = resumen.filter(r => r.Cumplimiento < 80).length;
  const comunalPct = Math.round((cumplidosCount / total) * 100);

  // Elementos del DOM
  const eCumplidosVal = document.getElementById('indicadorCumplidosValue');
  const eParcialVal = document.getElementById('indicadorParcialValue');
  const eCriticoVal = document.getElementById('indicadorCriticosValue');
  const eComunalVal = document.getElementById('cumplimientoComunalValue');
  const eCumplidosBar = document.getElementById('indicadorCumplidosProgress');
  const eParcialBar = document.getElementById('indicadorParcialProgress');
  const eCriticoBar = document.getElementById('indicadorCriticosProgress');
  const eComunalBar = document.getElementById('cumplimientoComunalProgress');

  if (eCumplidosVal) eCumplidosVal.textContent = cumplidosCount;
  if (eParcialVal) eParcialVal.textContent = parcialCount;
  if (eCriticoVal) eCriticoVal.textContent = criticoCount;
  if (eComunalVal) eComunalVal.textContent = `${comunalPct}%`;

  if (eCumplidosBar) eCumplidosBar.style.width = `${(cumplidosCount/total)*100}%`;
  if (eParcialBar) eParcialBar.style.width = `${(parcialCount/total)*100}%`;
  if (eCriticoBar) eCriticoBar.style.width = `${(criticoCount/total)*100}%`;
  if (eComunalBar) eComunalBar.style.width = `${comunalPct}%`;
}

/**
 * Renderiza el gráfico de cumplimiento por centro usando Chart.js
 * @param {Array<{Centro: string, Cumplidos: number}>} centros
 */
function renderCentroChart(centros) {
  const canvas = document.getElementById('centroChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Destruir gráfico previo si existe
  if (window.centroChart) {
    window.centroChart.destroy();
  }

  // Datos para gráfico
  const labels = centros.map(c => c.Centro);
  const data = centros.map(c => c.Cumplidos);

  // Crear nuevo gráfico
  window.centroChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Cumplidos',
        data,
        backgroundColor: 'var(--primary-color)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/**
 * Llena la tabla de cumplimiento por centro
 * @param {Array<{Centro: string, Cumplidos: number, Parciales: number, Críticos: number}>} centros
 */
function populateCentroTable(centros) {
  const tbody = document.getElementById('centroCumplimientoTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  centros.forEach(c => {
    const fulfilled = c.Cumplidos;
    const partial = c.Parciales;
    const critical = c.Críticos;
    const total = fulfilled + partial + critical;
    const pct = total > 0 ? ((fulfilled/total)*100).toFixed(1) : '0.0';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.Centro}</td>
      <td class="text-center">${pct}%</td>
      <td class="text-center">${fulfilled}</td>
      <td class="text-center">${partial}</td>
      <td class="text-center">${critical}</td>
      <td class="text-center">
        <button class="btn-action bot-ver-centro" data-centro="${c.Centro}">Ver</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Inicializa los gráficos de Top 5 indicadores con ApexCharts
 * @param {Array<{Indicador: string, Cumplimiento: number}>} resumen
 */
function initTopIndicators(resumen) {
  // Ordenar indicadores
  const sorted = resumen.slice().sort((a, b) => b.Cumplimiento - a.Cumplimiento);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();

  // Top 5 altos
  const topEl = document.getElementById('topIndicadoresChart');
  if (topEl) {
    new ApexCharts(topEl, {
      chart: { type: 'radar' },
      series: [{ name: 'Cumplimiento', data: top5.map(i => i.Cumplimiento) }],
      labels: top5.map(i => i.Indicador),
      stroke: { show: true }
    }).render();
  }
  // Top 5 bajos
  const botEl = document.getElementById('bottomIndicadoresChart');
  if (botEl) {
    new ApexCharts(botEl, {
      chart: { type: 'radar' },
      series: [{ name: 'Cumplimiento', data: bottom5.map(i => i.Cumplimiento) }],
      labels: bottom5.map(i => i.Indicador),
      stroke: { show: true }
    }).render();
  }
}

/**
 * Inicializa el mapa de centros con Leaflet
 * @param {Array<{Centro: string}>} centros
 */
function initCentersMap(centros) {
  const mapEl = document.getElementById('centersMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Destruir mapa previo
  if (window._centersMap) {
    window._centersMap.remove();
  }
  // Crear nuevo mapa
  window._centersMap = L.map(mapEl).setView([-34.98, -71.23], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(window._centersMap);

  centros.forEach(c => {
    const coords = getCenterCoordinates(c.Centro);
    const marker = L.marker(coords).addTo(window._centersMap);
    marker.bindPopup(`<strong>${c.Centro}</strong>`);
  });
}

/**
 * Devuelve coordenadas aproximadas para un centro de salud
 * @param {string} name
 * @returns {[number, number]} [lat, lng]
 */
function getCenterCoordinates(name) {
  const map = {
    'CESFAM Curicó Centro': [-34.987, -71.227],
    'CESFAM Miguel Ángel': [-34.982, -71.233],
    'CESFAM Betty Muñoz': [-34.980, -71.220]
    // Añadir otros centros según sea necesario
  };
  return map[name] || [-34.98, -71.23];
}
