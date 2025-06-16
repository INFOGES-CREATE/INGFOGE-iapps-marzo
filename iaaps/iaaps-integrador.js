/**
 * IAAPS Dashboard - Integrador de Establecimientos y Centros
 * ==========================================================
 * Este archivo extiende las funcionalidades del Dashboard IAAPS, permitiendo:
 * 1. Sumar automáticamente los datos de establecimientos a sus centros principales
 * 2. Calcular promedios de cumplimiento de forma automática
 * 3. Crear enlaces interactivos en las tablas de indicadores
 * 4. Visualizar datos de establecimientos por centro y por indicador
 */

// Variables globales para tablas y gráficos adicionales
let establecimientosPorCentroChartInstance = null;
let establecimientosPorIndicadorChartInstance = null;

/**
 * Inicializar el integrador de establecimientos
 * Esta función se debe llamar después de cargar el dashboard principal
 */
function inicializarIntegradorEstablecimientos() {
    console.log("Inicializando integrador de establecimientos...");
    
    // Agregar eventos a elementos DOM
    agregarEventosIntegracion();
    
    // Extender funciones del dashboard principal
    extenderFuncionesDashboard();
    
    // Crear modales y contenedores adicionales
    crearElementosInterfazAdicionales();
    
    console.log("Integrador de establecimientos inicializado correctamente");
}

/**
 * Extender las funciones principales del dashboard para incorporar
 * la suma automática de establecimientos y promedios
 */
function extenderFuncionesDashboard() {
    // Guardar referencia a la función original
    const procesarDatosOriginal = window.procesarDatos;
    
    // Sobreescribir procesarDatos para sumar establecimientos
    window.procesarDatos = function() {
        // Llamar a la función original primero
        if (procesarDatosOriginal) {
            procesarDatosOriginal();
        }
        
        // Extender con la suma de establecimientos
        sumarEstablecimientosACentros();
        
        // Calcular promedios de cumplimiento
        calcularPromediosCumplimiento();
    };
    
    // Extender actualizarTablaIndicadoresCentro para agregar interactividad
    const actualizarTablaIndicadoresCentroOriginal = window.actualizarTablaIndicadoresCentro;
    
    window.actualizarTablaIndicadoresCentro = function() {
        // Llamar a la función original primero
        if (actualizarTablaIndicadoresCentroOriginal) {
            actualizarTablaIndicadoresCentroOriginal();
        }
        
        // Extender con interactividad
        agregarInteractividadTablaCentro();
    };
    
    // Extender actualizarDetalleIndicador para mostrar establecimientos
    const actualizarDetalleIndicadorOriginal = window.actualizarDetalleIndicador;
    
    window.actualizarDetalleIndicador = function() {
        // Llamar a la función original primero
        if (actualizarDetalleIndicadorOriginal) {
            actualizarDetalleIndicadorOriginal();
        }
        
        // Extender con detalles de establecimientos
        agregarDetallesEstablecimientosPorIndicador();
    };
    
    // Extender seleccionarCentro para incluir establecimientos
    const seleccionarCentroOriginal = window.seleccionarCentro;
    
    window.seleccionarCentro = function(codigo) {
        // Llamar a la función original primero
        if (seleccionarCentroOriginal) {
            seleccionarCentroOriginal(codigo);
        }
        
        // Extender con detalles de establecimientos
        mostrarDetallesEstablecimientosPorCentro(codigo);
    };
}

/**
 * Suma automáticamente los datos de los establecimientos a sus centros principales
 * Actualiza los resultados en la estructura iaapsData
 */
function sumarEstablecimientosACentros() {
    if (!window.iaapsData) {
        console.error("Datos IAAPS no disponibles");
        return;
    }
    
    console.log("Sumando datos de establecimientos a centros principales...");
    
    // Para cada centro principal (excepto comunal)
    window.iaapsData.centros
        .filter(centro => centro.codigo !== 'comunal')
        .forEach(centro => {
            // Obtener establecimientos asociados
            const establecimientosCodigos = obtenerEstablecimientosCodigos(centro.codigo);
            
            if (establecimientosCodigos.length === 0) {
                console.log(`Centro ${centro.nombre} no tiene establecimientos asociados`);
                return;
            }
            
            // Para cada indicador, sumar resultados de los establecimientos
            window.iaapsData.indicadores.forEach(indicador => {
                // Encontrar el resultado del centro principal
                const resultadoCentro = indicador.resultados.find(r => r.centro === centro.codigo);
                
                if (!resultadoCentro) {
                    console.warn(`No se encontraron resultados del indicador ${indicador.codigo} para el centro ${centro.nombre}`);
                    return;
                }
                
                // Sumar numeradores y denominadores de los establecimientos
                let numeradorEstablecimientos = 0;
                let denominadorEstablecimientos = 0;
                
                establecimientosCodigos.forEach(estCodigo => {
                    const resultadoEst = indicador.resultados.find(r => r.centro === estCodigo);
                    
                    if (resultadoEst) {
                        // Sumar solo si los valores son números válidos
                        if (!isNaN(resultadoEst.numerador)) {
                            numeradorEstablecimientos += resultadoEst.numerador;
                        }
                        
                        if (!isNaN(resultadoEst.denominador)) {
                            denominadorEstablecimientos += resultadoEst.denominador;
                        }
                    }
                });
                
                // Actualizar el resultado del centro con la suma
                if (numeradorEstablecimientos > 0 || denominadorEstablecimientos > 0) {
                    console.log(`Actualizando centro ${centro.nombre}, indicador ${indicador.codigo}: sumando ${numeradorEstablecimientos}/${denominadorEstablecimientos}`);
                    
                    // Guardar los valores originales para referencia
                    resultadoCentro.numeradorOriginal = resultadoCentro.numerador;
                    resultadoCentro.denominadorOriginal = resultadoCentro.denominador;
                    
                    // Actualizar con valores sumados
                    resultadoCentro.numerador += numeradorEstablecimientos;
                    resultadoCentro.denominador += denominadorEstablecimientos;
                    
                    // Recalcular resultado
                    if (resultadoCentro.denominador > 0) {
                        if (indicador.tipo === 'porcentaje') {
                            resultadoCentro.resultado = (resultadoCentro.numerador / resultadoCentro.denominador) * 100;
                        } else {
                            resultadoCentro.resultado = resultadoCentro.numerador / resultadoCentro.denominador;
                        }
                    }
                }
            });
        });
    
    // Actualizar resultados comunales después de actualizar los centros
    actualizarResultadosComunales();
    
    console.log("Datos de establecimientos sumados correctamente");
}

/**
 * Actualiza los resultados comunales basándose en las sumas de los centros
 */
function actualizarResultadosComunales() {
    window.iaapsData.indicadores.forEach(indicador => {
        const resultadoComunal = indicador.resultados.find(r => r.centro === 'comunal');
        
        if (!resultadoComunal) {
            console.warn(`No se encontró resultado comunal para el indicador ${indicador.codigo}`);
            return;
        }
        
        // Sumar todos los centros principales (excepto comunal)
        let numeradorTotal = 0;
        let denominadorTotal = 0;
        
        window.iaapsData.centros
            .filter(centro => centro.codigo !== 'comunal')
            .forEach(centro => {
                const resultadoCentro = indicador.resultados.find(r => r.centro === centro.codigo);
                
                if (resultadoCentro) {
                    numeradorTotal += resultadoCentro.numerador;
                    denominadorTotal += resultadoCentro.denominador;
                }
            });
        
        // Guardar valores originales para referencia
        resultadoComunal.numeradorOriginal = resultadoComunal.numerador;
        resultadoComunal.denominadorOriginal = resultadoComunal.denominador;
        
        // Actualizar con valores sumados
        resultadoComunal.numerador = numeradorTotal;
        resultadoComunal.denominador = denominadorTotal;
        
        // Recalcular resultado
        if (resultadoComunal.denominador > 0) {
            if (indicador.tipo === 'porcentaje') {
                resultadoComunal.resultado = (resultadoComunal.numerador / resultadoComunal.denominador) * 100;
            } else {
                resultadoComunal.resultado = resultadoComunal.numerador / resultadoComunal.denominador;
            }
        }
    });
}

/**
 * Calcula los promedios de cumplimiento para centros y comunal
 */
function calcularPromediosCumplimiento() {
    // Para cada centro (incluido comunal)
    window.iaapsData.centros.forEach(centro => {
        let totalCumplimiento = 0;
        let indicadoresValidos = 0;
        
        // Calcular promedio para cada indicador
        window.iaapsData.indicadores.forEach(indicador => {
            const resultado = indicador.resultados.find(r => r.centro === centro.codigo);
            
            if (resultado && resultado.denominador > 0) {
                // Calcular cumplimiento (respetando límite de 100%)
                let cumplimiento = 0;
                
                if (indicador.meta > 0) {
                    cumplimiento = (resultado.resultado / indicador.meta) * 100;
                    cumplimiento = Math.min(cumplimiento, 100); // Limitar a 100%
                }
                
                resultado.cumplimiento = cumplimiento;
                totalCumplimiento += cumplimiento;
                indicadoresValidos++;
            }
        });
        
        // Guardar cumplimiento promedio en el centro
        if (indicadoresValidos > 0) {
            centro.cumplimientoPromedio = totalCumplimiento / indicadoresValidos;
        } else {
            centro.cumplimientoPromedio = 0;
        }
        
        console.log(`Cumplimiento promedio de ${centro.nombre}: ${centro.cumplimientoPromedio.toFixed(2)}%`);
    });
}

/**
 * Agrega eventos para la integración
 */
function agregarEventosIntegracion() {
    // Evento para mostrar detalles de establecimientos
    document.addEventListener('click', function(e) {
        // Delegar eventos de clic en la tabla
        if (e.target && e.target.closest('.btn-ver-establecimientos')) {
            const boton = e.target.closest('.btn-ver-establecimientos');
            const centroCodigo = boton.dataset.centro;
            mostrarModalEstablecimientos(centroCodigo);
        }
        
        // Delegar eventos de clic en la fila de tabla para ver detalles por indicador
        if (e.target && e.target.closest('.indicador-row')) {
            const fila = e.target.closest('.indicador-row');
            const indicadorCodigo = fila.dataset.indicador;
            mostrarDetallesIndicador(indicadorCodigo);
        }
    });
}

/**
 * Crea elementos adicionales de interfaz (modales, contenedores, etc.)
 */
function crearElementosInterfazAdicionales() {
    // Crear modal para detalles de establecimientos
    const modalHTML = `
    <div class="modal fade" id="establecimientosModal" tabindex="-1" aria-labelledby="establecimientosModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="establecimientosModalLabel">
                        <i class="fas fa-hospital-alt me-2"></i>
                        Detalle de Establecimientos
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h5 class="mb-0">Establecimientos Asociados</h5>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="establecimientosCentroChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h5 class="mb-0">Aporte por Establecimiento</h5>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="aporteEstablecimientosChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Indicadores por Establecimiento</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover">
                                    <thead id="establecimientosDetalleTableHead">
                                        <!-- Se llenará dinámicamente -->
                                    </thead>
                                    <tbody id="establecimientosDetalleTableBody">
                                        <!-- Se llenará dinámicamente -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="exportarEstablecimientosExcelBtn">
                        <i class="fas fa-file-excel me-1"></i> Exportar a Excel
                    </button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Agregar modal al DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Agregar elementos para detalles de establecimientos por indicador
    const detallesIndicadorHTML = `
    <div id="establecimientosPorIndicadorCard" class="card mb-4" style="display: none;">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Establecimientos por Indicador</h5>
            <div>
                <button class="btn btn-sm btn-outline-success" id="exportarEstablecimientosPorIndicadorBtn">
                    <i class="fas fa-file-excel me-1"></i> Excel
                </button>
            </div>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <div class="chart-container">
                        <canvas id="establecimientosPorIndicadorChart"></canvas>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover">
                            <thead>
                                <tr>
                                    <th>Establecimiento</th>
                                    <th class="text-center">Numerador</th>
                                    <th class="text-center">Denominador</th>
                                    <th class="text-center">Resultado</th>
                                    <th class="text-center">Cumplimiento</th>
                                </tr>
                            </thead>
                            <tbody id="establecimientosPorIndicadorTableBody">
                                <!-- Se llenará dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Agregar elemento al contenedor de detalles de indicador
    const indicadorContent = document.getElementById('indicador-content');
    if (indicadorContent) {
        const rowElement = indicadorContent.querySelector('.row');
        if (rowElement) {
            const colElement = rowElement.querySelector('.col-md-9');
            if (colElement) {
                const container = document.createElement('div');
                container.innerHTML = detallesIndicadorHTML;
                colElement.appendChild(container.firstElementChild);
            }
        }
    }
    
    // Agregar eventos para exportación
    document.getElementById('exportarEstablecimientosExcelBtn').addEventListener('click', function() {
        exportarEstablecimientosExcel();
    });
    
    document.getElementById('exportarEstablecimientosPorIndicadorBtn').addEventListener('click', function() {
        exportarEstablecimientosPorIndicadorExcel();
    });
}

/**
 * Agrega interactividad a la tabla de indicadores por centro
 */
function agregarInteractividadTablaCentro() {
    const tableBody = document.getElementById('centroIndicadoresTableBody');
    if (!tableBody) return;
    
    // Recorrer las filas y agregar clase CSS para cursor pointer
    const filas = tableBody.querySelectorAll('tr');
    filas.forEach(fila => {
        fila.classList.add('cursor-pointer');
        fila.title = 'Haga clic para ver detalles por indicador';
        
        // Obtener código de indicador (primera columna, primer texto fuerte)
        const codigoIndicador = fila.querySelector('td:first-child strong')?.textContent;
        if (codigoIndicador) {
            fila.dataset.indicador = codigoIndicador;
            
            // Agregar evento de clic
            fila.addEventListener('click', function() {
                mostrarDetallesIndicador(codigoIndicador);
            });
        }
    });
    
    // Agregar botón para ver establecimientos
    if (currentCentro !== 'comunal') {
        const establecimientosAsociados = window.establecimientosMap[currentCentro] || [];
        
        if (establecimientosAsociados.length > 0) {
            const btnEstablecimientos = document.createElement('button');
            btnEstablecimientos.className = 'btn btn-primary mt-3 btn-ver-establecimientos';
            btnEstablecimientos.dataset.centro = currentCentro;
            btnEstablecimientos.innerHTML = `
                <i class="fas fa-hospital-alt me-1"></i>
                Ver ${establecimientosAsociados.length} Establecimientos Asociados
            `;
            
            const cardBody = document.querySelector('#centro-content .card-body');
            if (cardBody) {
                cardBody.appendChild(btnEstablecimientos);
                
                btnEstablecimientos.addEventListener('click', function() {
                    mostrarModalEstablecimientos(currentCentro);
                });
            }
        }
    }
}

/**
 * Obtiene los códigos de establecimientos para un centro dado
 * @param {string} centroCodigo - Código del centro principal
 * @returns {Array} - Array de códigos de establecimientos
 */
function obtenerEstablecimientosCodigos(centroCodigo) {
    if (!window.iaapsData) return [];
    
    // Obtener nombres de establecimientos del mapa
    const establecimientosNombres = window.establecimientosMap[centroCodigo] || [];
    
    // Convertir nombres a códigos
    return window.iaapsData.establecimientos
        .filter(est => est.centro === centroCodigo || establecimientosNombres.includes(est.nombre))
        .map(est => est.codigo);
}

/**
 * Muestra detalles de establecimientos por centro
 * @param {string} centroCodigo - Código del centro principal
 */
function mostrarDetallesEstablecimientosPorCentro(centroCodigo) {
    if (centroCodigo === 'comunal') return;
    
    // Obtener establecimientos asociados
    const establecimientosCodigos = obtenerEstablecimientosCodigos(centroCodigo);
    
    if (establecimientosCodigos.length === 0) {
        console.log(`No hay establecimientos asociados al centro ${centroCodigo}`);
        return;
    }
    
    // Modificar la vista para mostrar establecimientos
    const establecimientosCard = document.getElementById('establecimientosCard');
    if (establecimientosCard) {
        establecimientosCard.style.display = 'block';
        
        // Actualizar tabla de establecimientos
        actualizarTablaEstablecimientos(centroCodigo, establecimientosCodigos);
    }
}

/**
 * Actualiza la tabla de establecimientos con datos detallados
 * @param {string} centroCodigo - Código del centro principal
 * @param {Array} establecimientosCodigos - Array de códigos de establecimientos
 */
function actualizarTablaEstablecimientos(centroCodigo, establecimientosCodigos) {
    const tableBody = document.getElementById('establecimientosTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    establecimientosCodigos.forEach(estCodigo => {
        const establecimiento = window.iaapsData.establecimientos.find(e => e.codigo === estCodigo);
        if (!establecimiento) return;
        
        let cumplimientoTotal = 0;
        let indicadoresContados = 0;
        let indicadoresCumplidos = 0;
        let indicadoresParciales = 0;
        let indicadoresCriticos = 0;
        
        // Calcular métricas por indicador
        window.iaapsData.indicadores.forEach(indicador => {
            const resultado = indicador.resultados.find(r => r.centro === estCodigo);
            if (resultado && resultado.denominador > 0) {
                const cumplimiento = resultado.cumplimiento || 0;
                cumplimientoTotal += cumplimiento;
                indicadoresContados++;
                
                if (cumplimiento >= 95) {
                    indicadoresCumplidos++;
                } else if (cumplimiento >= 80) {
                    indicadoresParciales++;
                } else {
                    indicadoresCriticos++;
                }
            }
        });
        
        const cumplimientoPromedio = indicadoresContados > 0 ? 
            parseFloat((cumplimientoTotal / indicadoresContados).toFixed(2)) : 0;
        
        let statusClass = '';
        if (cumplimientoPromedio >= 95) statusClass = 'bg-success';
        else if (cumplimientoPromedio >= 80) statusClass = 'bg-warning';
        else statusClass = 'bg-danger';
        
        const row = document.createElement('tr');
        row.dataset.establecimiento = estCodigo;
        row.className = 'cursor-pointer';
        row.title = 'Haga clic para ver detalles por indicador';
        
        row.innerHTML = `
            <td>${establecimiento.nombre}</td>
            <td class="text-center">
                <div class="d-flex align-items-center">
                    <div class="progress flex-grow-1 me-2" style="height: 8px;">
                        <div class="progress-bar ${statusClass}" role="progressbar" style="width: ${cumplimientoPromedio}%" aria-valuenow="${cumplimientoPromedio}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <span>${cumplimientoPromedio}%</span>
                </div>
            </td>
            <td class="text-center">
                <span class="badge bg-success">${indicadoresCumplidos}</span>
            </td>
            <td class="text-center">
                <span class="badge bg-warning">${indicadoresParciales}</span>
            </td>
            <td class="text-center">
                <span class="badge bg-danger">${indicadoresCriticos}</span>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Agregar evento de clic para ver detalles
        row.addEventListener('click', function() {
            mostrarModalEstablecimientos(centroCodigo, estCodigo);
        });
    });
}

/**
 * Muestra el modal con detalles de establecimientos
 * @param {string} centroCodigo - Código del centro principal
 * @param {string} establecimientoCodigo - (Opcional) Código del establecimiento específico
 */
function mostrarModalEstablecimientos(centroCodigo, establecimientoCodigo = null) {
    const modal = new bootstrap.Modal(document.getElementById('establecimientosModal'));
    const centro = window.iaapsData.centros.find(c => c.codigo === centroCodigo);
    
    if (!centro) {
        console.error(`Centro ${centroCodigo} no encontrado`);
        return;
    }
    
    // Actualizar título del modal
    document.getElementById('establecimientosModalLabel').textContent = 
        `Establecimientos Asociados a ${centro.nombre}`;
    
    // Obtener establecimientos
    const establecimientosCodigos = obtenerEstablecimientosCodigos(centroCodigo);
    
    // Llenar tabla de detalles
    llenarTablaDetalleEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoCodigo);
    
    // Actualizar gráficos
    actualizarGraficosEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoCodigo);
    
    // Mostrar modal
    modal.show();
}

/**
 * Llena la tabla de detalles de establecimientos
 * @param {string} centroCodigo - Código del centro principal
 * @param {Array} establecimientosCodigos - Array de códigos de establecimientos
 * @param {string} establecimientoSeleccionado - (Opcional) Código del establecimiento seleccionado
 */
function llenarTablaDetalleEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoSeleccionado) {
    const tableHead = document.getElementById('establecimientosDetalleTableHead');
    const tableBody = document.getElementById('establecimientosDetalleTableBody');
    
    if (!tableHead || !tableBody) return;
    
    // Construir encabezados
    let headHTML = '<tr><th>Indicador</th>';
    
    // Agregar columna para centro principal
    const centro = window.iaapsData.centros.find(c => c.codigo === centroCodigo);
    headHTML += `<th class="text-center">${centro ? centro.nombre : centroCodigo}</th>`;
    
    // Agregar columnas para cada establecimiento
    establecimientosCodigos.forEach(estCodigo => {
        const establecimiento = window.iaapsData.establecimientos.find(e => e.codigo === estCodigo);
        if (establecimiento) {
            headHTML += `<th class="text-center">${establecimiento.nombre}</th>`;
        }
    });
    
    headHTML += '</tr>';
    tableHead.innerHTML = headHTML;
    
    // Construir filas para cada indicador
    tableBody.innerHTML = '';
    
    window.iaapsData.indicadores.forEach(indicador => {
        const row = document.createElement('tr');
        row.dataset.indicador = indicador.codigo;
        
        // Columna de indicador
        row.innerHTML = `<td><strong>${indicador.codigo}</strong> - ${indicador.nombre}</td>`;
        
        // Columna para centro principal
        const resultadoCentro = indicador.resultados.find(r => r.centro === centroCodigo);
        if (resultadoCentro) {
            const cumplimiento = resultadoCentro.cumplimiento || 0;
            let statusClass = '';
            if (cumplimiento >= 95) statusClass = 'bg-success';
            else if (cumplimiento >= 80) statusClass = 'bg-warning';
            else statusClass = 'bg-danger';
            
            let cellHTML = `
                <td class="text-center">
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 8px;">
                            <div class="progress-bar ${statusClass}" role="progressbar" style="width: ${Math.min(cumplimiento, 100)}%" aria-valuenow="${cumplimiento}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <span>${cumplimiento.toFixed(2)}%</span>
                    </div>
                    <small class="text-muted">${resultadoCentro.numerador}/${resultadoCentro.denominador}</small>
                </td>
            `;
            row.innerHTML += cellHTML;
        } else {
            row.innerHTML += '<td class="text-center">-</td>';
        }
        
        // Columnas para cada establecimiento
        establecimientosCodigos.forEach(estCodigo => {
            const resultadoEst = indicador.resultados.find(r => r.centro === estCodigo);
            if (resultadoEst && resultadoEst.denominador > 0) {
                // Calcular cumplimiento si no existe
                if (resultadoEst.cumplimiento === undefined) {
                    if (indicador.meta > 0) {
                        resultadoEst.cumplimiento = Math.min((resultadoEst.resultado / indicador.meta) * 100, 100);
                    } else {
                        resultadoEst.cumplimiento = 0;
                    }
                }
                
                const cumplimiento = resultadoEst.cumplimiento;
                let statusClass = '';
                if (cumplimiento >= 95) statusClass = 'bg-success';
                else if (cumplimiento >= 80) statusClass = 'bg-warning';
                else statusClass = 'bg-danger';
                
                let cellClass = estCodigo === establecimientoSeleccionado ? 'table-primary' : '';
                
                let cellHTML = `
                    <td class="text-center ${cellClass}">
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height: 8px;">
                                <div class="progress-bar ${statusClass}" role="progressbar" style="width: ${Math.min(cumplimiento, 100)}%" aria-valuenow="${cumplimiento}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            <span>${cumplimiento.toFixed(2)}%</span>
                        </div>
                        <small class="text-muted">${resultadoEst.numerador}/${resultadoEst.denominador}</small>
                    </td>
                `;
                row.innerHTML += cellHTML;
            } else {
                row.innerHTML += '<td class="text-center">-</td>';
            }
        });
        
        tableBody.appendChild(row);
    });
}

/**
 * Actualiza los gráficos de establecimientos
 * @param {string} centroCodigo - Código del centro principal
 * @param {Array} establecimientosCodigos - Array de códigos de establecimientos
 * @param {string} establecimientoSeleccionado - (Opcional) Código del establecimiento seleccionado
 */
function actualizarGraficosEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoSeleccionado) {
    // Gráfico 1: Cumplimiento por establecimiento
    actualizarGraficoCumplimientoEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoSeleccionado);
    
    // Gráfico 2: Aporte por establecimiento
    actualizarGraficoAporteEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoSeleccionado);
}

/**
 * Actualiza el gráfico de cumplimiento por establecimiento
 * @param {string} centroCodigo - Código del centro principal
 * @param {Array} establecimientosCodigos - Array de códigos de establecimientos
 * @param {string} establecimientoSeleccionado - (Opcional) Código del establecimiento seleccionado
 */
function actualizarGraficoCumplimientoEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoSeleccionado) {
    // Preparar datos para el gráfico
    const labels = [];
    const data = [];
    const backgroundColors = [];
    
    // Agregar datos para cada establecimiento
    establecimientosCodigos.forEach(estCodigo => {
        const establecimiento = window.iaapsData.establecimientos.find(e => e.codigo === estCodigo);
        if (!establecimiento) return;
        
        // Calcular cumplimiento promedio
        let cumplimientoTotal = 0;
        let indicadoresContados = 0;
        
        window.iaapsData.indicadores.forEach(indicador => {
            const resultado = indicador.resultados.find(r => r.centro === estCodigo);
            if (resultado && resultado.denominador > 0) {
                cumplimientoTotal += resultado.cumplimiento || 0;
                indicadoresContados++;
            }
        });
        
        const cumplimientoPromedio = indicadoresContados > 0 ? 
            parseFloat((cumplimientoTotal / indicadoresContados).toFixed(2)) : 0;
        
        labels.push(establecimiento.nombre);
        data.push(cumplimientoPromedio);
        
        // Color según cumplimiento
        let color = '';
        if (cumplimientoPromedio >= 95) color = '#27ae60';
        else if (cumplimientoPromedio >= 80) color = '#f39c12';
        else color = '#e74c3c';
        
        // Resaltar si está seleccionado
        if (estCodigo === establecimientoSeleccionado) {
            color = '#3498db';
        }
        
        backgroundColors.push(color);
    });
    
    // Destruir gráfico anterior si existe
    if (window.establecimientosCentroChartInstance) {
        window.establecimientosCentroChartInstance.destroy();
    }
    
    // Crear nuevo gráfico
    const ctx = document.getElementById('establecimientosCentroChart').getContext('2d');
    window.establecimientosCentroChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumplimiento (%)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Cumplimiento por Establecimiento'
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
 * Actualiza el gráfico de aporte por establecimiento
 * @param {string} centroCodigo - Código del centro principal
 * @param {Array} establecimientosCodigos - Array de códigos de establecimientos
 * @param {string} establecimientoSeleccionado - (Opcional) Código del establecimiento seleccionado
 */
function actualizarGraficoAporteEstablecimientos(centroCodigo, establecimientosCodigos, establecimientoSeleccionado) {
    // Calcular aporte total de numeradores y denominadores
    const aportes = [];
    
    establecimientosCodigos.forEach(estCodigo => {
        const establecimiento = window.iaapsData.establecimientos.find(e => e.codigo === estCodigo);
        if (!establecimiento) return;
        
        let numeradorTotal = 0;
        let denominadorTotal = 0;
        
        window.iaapsData.indicadores.forEach(indicador => {
            const resultado = indicador.resultados.find(r => r.centro === estCodigo);
            if (resultado) {
                numeradorTotal += resultado.numerador || 0;
                denominadorTotal += resultado.denominador || 0;
            }
        });
        
        aportes.push({
            nombre: establecimiento.nombre,
            codigo: estCodigo,
            numerador: numeradorTotal,
            denominador: denominadorTotal
        });
    });
    
    // Ordenar por aporte (numerador)
    aportes.sort((a, b) => b.numerador - a.numerador);
    
    // Preparar datos para el gráfico
    const labels = aportes.map(a => a.nombre);
    const dataNumerador = aportes.map(a => a.numerador);
    const dataDenominador = aportes.map(a => a.denominador);
    
    // Colores para destacar establecimiento seleccionado
    const coloresNumerador = aportes.map(a => 
        a.codigo === establecimientoSeleccionado ? 'rgba(52, 152, 219, 0.8)' : 'rgba(39, 174, 96, 0.8)'
    );
    
    const coloresDenominador = aportes.map(a => 
        a.codigo === establecimientoSeleccionado ? 'rgba(52, 152, 219, 0.4)' : 'rgba(39, 174, 96, 0.4)'
    );
    
    // Destruir gráfico anterior si existe
    if (window.aporteEstablecimientosChartInstance) {
        window.aporteEstablecimientosChartInstance.destroy();
    }
    
    // Crear nuevo gráfico
    const ctx = document.getElementById('aporteEstablecimientosChart').getContext('2d');
    window.aporteEstablecimientosChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Numerador',
                    data: dataNumerador,
                    backgroundColor: coloresNumerador,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                },
                {
                    label: 'Denominador',
                    data: dataDenominador,
                    backgroundColor: coloresDenominador,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Aporte Total por Establecimiento'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                }
            }
        }
    });
}

/**
 * Muestra detalles de establecimientos por indicador
 * @param {string} indicadorCodigo - Código del indicador
 */
function agregarDetallesEstablecimientosPorIndicador() {
    // Verificar si estamos en vista de indicador
    if (!document.getElementById('indicador-tab').classList.contains('active')) {
        return;
    }
    
    const indicador = window.iaapsData.indicadores.find(i => i.codigo === currentIndicador);
    if (!indicador) return;
    
    // Mostrar tarjeta con detalles de establecimientos
    const card = document.getElementById('establecimientosPorIndicadorCard');
    if (card) {
        card.style.display = 'block';
    }
    
    // Obtener todos los establecimientos con resultados para este indicador
    const establecimientosConResultados = [];
    
    window.iaapsData.establecimientos.forEach(est => {
        const resultado = indicador.resultados.find(r => r.centro === est.codigo);
        if (resultado && resultado.denominador > 0) {
            establecimientosConResultados.push({
                codigo: est.codigo,
                nombre: est.nombre,
                resultado: resultado,
                centroPrincipal: est.centro
            });
        }
    });
    
    // Actualizar tabla con detalles
    actualizarTablaEstablecimientosPorIndicador(indicador, establecimientosConResultados);
    
    // Actualizar gráfico
    actualizarGraficoEstablecimientosPorIndicador(indicador, establecimientosConResultados);
}

/**
 * Actualiza la tabla de establecimientos por indicador
 * @param {Object} indicador - Objeto indicador
 * @param {Array} establecimientos - Array de establecimientos con resultados
 */
function actualizarTablaEstablecimientosPorIndicador(indicador, establecimientos) {
    const tableBody = document.getElementById('establecimientosPorIndicadorTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Ordenar establecimientos por resultado descendente
    establecimientos.sort((a, b) => b.resultado.resultado - a.resultado.resultado);
    
    establecimientos.forEach(est => {
        const centroPrincipal = window.iaapsData.centros.find(c => c.codigo === est.centroPrincipal);
        const nombreCentro = centroPrincipal ? centroPrincipal.nombre : '';
        
        const resultado = est.resultado;
        const cumplimiento = resultado.cumplimiento || 0;
        
        let statusClass = '';
        if (cumplimiento >= 95) statusClass = 'bg-success';
        else if (cumplimiento >= 80) statusClass = 'bg-warning';
        else statusClass = 'bg-danger';
        
        const row = document.createElement('tr');
        row.dataset.establecimiento = est.codigo;
        
        row.innerHTML = `
            <td>
                ${est.nombre}
                <small class="text-muted d-block">${nombreCentro}</small>
            </td>
            <td class="text-center">${resultado.numerador}</td>
            <td class="text-center">${resultado.denominador}</td>
            <td class="text-center">
                ${indicador.tipo === 'porcentaje' ? resultado.resultado.toFixed(2) + '%' : resultado.resultado.toFixed(2)}
            </td>
            <td class="text-center">
                <div class="d-flex align-items-center">
                    <div class="progress flex-grow-1 me-2" style="height: 8px;">
                        <div class="progress-bar ${statusClass}" role="progressbar" style="width: ${Math.min(cumplimiento, 100)}%" aria-valuenow="${cumplimiento}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <span>${cumplimiento.toFixed(2)}%</span>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Actualiza el gráfico de establecimientos por indicador
 * @param {Object} indicador - Objeto indicador
 * @param {Array} establecimientos - Array de establecimientos con resultados
 */
function actualizarGraficoEstablecimientosPorIndicador(indicador, establecimientos) {
    // Limitar a top 10 establecimientos para no saturar el gráfico
    const topEstablecimientos = [...establecimientos]
        .sort((a, b) => b.resultado.resultado - a.resultado.resultado)
        .slice(0, 10);
    
    // Preparar datos para el gráfico
    const labels = topEstablecimientos.map(e => e.nombre);
    const data = topEstablecimientos.map(e => e.resultado.resultado);
    const meta = Array(topEstablecimientos.length).fill(indicador.meta);
    
    // Colores según cumplimiento
    const backgroundColors = topEstablecimientos.map(e => {
        const cumplimiento = e.resultado.cumplimiento || 0;
        if (cumplimiento >= 95) return 'rgba(39, 174, 96, 0.7)';
        else if (cumplimiento >= 80) return 'rgba(243, 156, 18, 0.7)';
        else return 'rgba(231, 76, 60, 0.7)';
    });
    
    // Destruir gráfico anterior si existe
    if (establecimientosPorIndicadorChartInstance) {
        establecimientosPorIndicadorChartInstance.destroy();
    }
    
    // Crear nuevo gráfico
    const ctx = document.getElementById('establecimientosPorIndicadorChart').getContext('2d');
    establecimientosPorIndicadorChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Resultado ${indicador.tipo === 'porcentaje' ? '(%)' : ''}`,
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    order: 1
                },
                {
                    label: 'Meta',
                    data: meta,
                    type: 'line',
                    borderColor: 'rgb(231, 76, 60)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Top 10 Establecimientos - Indicador ${indicador.codigo}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: indicador.tipo === 'porcentaje' ? 'Valor (%)' : 'Valor'
                    }
                }
            }
        }
    });
}

/**
 * Muestra detalles de un indicador específico
 * @param {string} indicadorCodigo - Código del indicador
 */
function mostrarDetallesIndicador(indicadorCodigo) {
    // Cambiar a la vista de detalle si no estamos en ella
    if (document.getElementById('dashboardView').style.display !== 'none') {
        mostrarVista('detailView');
    }
    
    // Activar la pestaña de indicador
    document.getElementById('indicador-tab').click();
    
    // Seleccionar el indicador
    seleccionarIndicador(indicadorCodigo);
}

/**
 * Exporta los datos de establecimientos a Excel
 */
function exportarEstablecimientosExcel() {
    mostrarCargando(true);
    
    setTimeout(() => {
        try {
            // Obtener centro actual
            const centro = window.iaapsData.centros.find(c => c.codigo === currentCentro);
            if (!centro) {
                mostrarCargando(false);
                mostrarNotificacion('Error: Centro no encontrado', 'error');
                return;
            }
            
            // Obtener establecimientos
            const establecimientosCodigos = obtenerEstablecimientosCodigos(currentCentro);
            
            // Crear datos para Excel
            const data = [];
            
            // Encabezados
            let headers = ['Indicador', 'Meta', centro.nombre];
            
            establecimientosCodigos.forEach(estCodigo => {
                const est = window.iaapsData.establecimientos.find(e => e.codigo === estCodigo);
                if (est) {
                    headers.push(est.nombre);
                }
            });
            
            data.push(headers);
            
            // Datos para cada indicador
            window.iaapsData.indicadores.forEach(indicador => {
                const row = [
                    `${indicador.codigo} - ${indicador.nombre}`,
                    indicador.tipo === 'porcentaje' ? indicador.meta.toFixed(2) + '%' : indicador.meta.toFixed(2)
                ];
                
                // Datos del centro
                const resultadoCentro = indicador.resultados.find(r => r.centro === currentCentro);
                if (resultadoCentro) {
                    row.push(resultadoCentro.cumplimiento.toFixed(2) + '%');
                } else {
                    row.push('-');
                }
                
                // Datos de cada establecimiento
                establecimientosCodigos.forEach(estCodigo => {
                    const resultadoEst = indicador.resultados.find(r => r.centro === estCodigo);
                    if (resultadoEst && resultadoEst.denominador > 0) {
                        row.push(resultadoEst.cumplimiento.toFixed(2) + '%');
                    } else {
                        row.push('-');
                    }
                });
                
                data.push(row);
            });
            
            // Crear libro Excel
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Ajustar ancho de columnas
            const wscols = data[0].map((col, i) => {
                const maxLength = data.reduce((w, r) => Math.max(w, r[i] ? r[i].toString().length : 0), col.length);
                return { wch: maxLength + 2 };
            });
            ws['!cols'] = wscols;
            
            // Agregar hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, "Establecimientos");
            
            // Nombre del archivo
            const nombreArchivo = `IAAPS_Establecimientos_${centro.nombre}_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            // Descargar archivo
            XLSX.writeFile(wb, nombreArchivo);
            
            mostrarCargando(false);
            mostrarNotificacion('Excel exportado correctamente', 'success');
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            mostrarCargando(false);
            mostrarNotificacion('Error al exportar datos', 'error');
        }
    }, 1000);
}

/**
 * Exporta los datos de establecimientos por indicador a Excel
 */
function exportarEstablecimientosPorIndicadorExcel() {
    mostrarCargando(true);
    
    setTimeout(() => {
        try {
            // Obtener indicador actual
            const indicador = window.iaapsData.indicadores.find(i => i.codigo === currentIndicador);
            if (!indicador) {
                mostrarCargando(false);
                mostrarNotificacion('Error: Indicador no encontrado', 'error');
                return;
            }
            
            // Obtener establecimientos con resultados
            const establecimientosConResultados = [];
            
            window.iaapsData.establecimientos.forEach(est => {
                const resultado = indicador.resultados.find(r => r.centro === est.codigo);
                if (resultado && resultado.denominador > 0) {
                    const centroPrincipal = window.iaapsData.centros.find(c => c.codigo === est.centro);
                    
                    establecimientosConResultados.push({
                        codigo: est.codigo,
                        nombre: est.nombre,
                        centroPrincipal: centroPrincipal ? centroPrincipal.nombre : '',
                        resultado: resultado
                    });
                }
            });
            
            // Ordenar por resultado descendente
            establecimientosConResultados.sort((a, b) => b.resultado.resultado - a.resultado.resultado);
            
            // Crear datos para Excel
            const data = [
                ['Establecimiento', 'Centro Principal', 'Numerador', 'Denominador', 'Resultado', 'Meta', 'Cumplimiento']
            ];
            
            establecimientosConResultados.forEach(est => {
                const res = est.resultado;
                
                data.push([
                    est.nombre,
                    est.centroPrincipal,
                    res.numerador,
                    res.denominador,
                    indicador.tipo === 'porcentaje' ? res.resultado.toFixed(2) + '%' : res.resultado.toFixed(2),
                    indicador.tipo === 'porcentaje' ? indicador.meta.toFixed(2) + '%' : indicador.meta.toFixed(2),
                    res.cumplimiento.toFixed(2) + '%'
                ]);
            });
            
            // Crear libro Excel
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Ajustar ancho de columnas
            const wscols = data[0].map((col, i) => {
                const maxLength = data.reduce((w, r) => Math.max(w, r[i] ? r[i].toString().length : 0), col.length);
                return { wch: maxLength + 2 };
            });
            ws['!cols'] = wscols;
            
            // Agregar hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, `Indicador ${indicador.codigo}`);
            
            // Nombre del archivo
            const nombreArchivo = `IAAPS_Indicador_${indicador.codigo}_Establecimientos_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            // Descargar archivo
            XLSX.writeFile(wb, nombreArchivo);
            
            mostrarCargando(false);
            mostrarNotificacion('Excel exportado correctamente', 'success');
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            mostrarCargando(false);
            mostrarNotificacion('Error al exportar datos', 'error');
        }
    }, 1000);
}

// Añadir estilos CSS adicionales para interactividad
function agregarEstilosCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .cursor-pointer {
            cursor: pointer;
        }
        
        .cursor-pointer:hover {
            background-color: rgba(0, 0, 0, 0.03);
        }
        
        .dark-mode .cursor-pointer:hover {
            background-color: rgba(255, 255, 255, 0.05);
        }
        
        .btn-ver-establecimientos {
            transition: all 0.2s ease;
        }
        
        .btn-ver-establecimientos:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(58, 201, 124, 0.3);
        }
        
        /* Destacar celdas de establecimientos */
        .highlight-est {
            background-color: rgba(52, 152, 219, 0.1);
            position: relative;
        }
        
        .highlight-est:after {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 3px;
            background-color: #3498db;
        }
        
        /* Animación de carga para actualización */
        @keyframes pulse-border {
            0% {
                box-shadow: 0 0 0 0 rgba(58, 201, 124, 0.7);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(58, 201, 124, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(58, 201, 124, 0);
            }
        }
        
        .pulse-update {
            animation: pulse-border 1.5s infinite;
        }
    `;
    
    document.head.appendChild(style);
}

// Inicializar integrador cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que se cargue el dashboard principal
    setTimeout(function() {
        inicializarIntegradorEstablecimientos();
        agregarEstilosCSS();
    }, 1500);
});