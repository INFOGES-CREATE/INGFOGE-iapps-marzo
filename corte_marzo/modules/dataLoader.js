// modules/dataLoader.js
// Módulo de carga y procesamiento de datos desde Excel para Dashboard IAAPS Curicó
// Requiere que en index.html se incluya:
// <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

/**
 * Carga y parsea el archivo IAAPS_Corte_Marzo.xlsx.
 * Genera dos conjuntos de datos:
 *  - resumen: indicadores a nivel comunal
 *  - centros: conteos de cumplimiento por centro de salud
 * @returns {Promise<{resumen: Array<Object>, centros: Array<Object>}>}
 */
export async function loadExcelData() {
  if (typeof XLSX === 'undefined') {
    throw new Error('La librería XLSX no está disponible. Incluye <script> de xlsx.full.min.js antes de este módulo.');
  }
  try {
    const resp = await fetch('IAAPS_Corte_Marzo.xlsx');
    if (!resp.ok) throw new Error('No se encontró IAAPS_Corte_Marzo.xlsx');
    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });

    // Solo hay una hoja con todos los datos
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // 1) Construir resumen (filas donde CENTROS es Curicó total comunal)
    const comunaKey = raw[0] && raw[0]['CENTROS'] ? raw[0]['CENTROS'].replace(/\s+$/,'') : null;
    const resumenRows = raw.filter(r => r['CENTROS'] && r['CENTROS'].toString().toLowerCase().includes('curico total comunal'));
    const resumen = resumenRows.map(r => ({
      Indicador: r['Nombre indicador'],
      Meta: parseFloat(String(r['Meta']).replace('%','')) || 0,
      Actual: parseFloat(String(r['Resultado']).replace('%','')) || 0,
      Cumplimiento: parseFloat(String(r['CUMPLIMIENTO']).replace('%','')) || 0
    }));

    // 2) Construir centros (excluyendo la fila comunal)
    const centrosMap = {};
    raw.forEach(r => {
      const centro = r['CENTROS'];
      if (!centro || centro.toString().toLowerCase().includes('curico total comunal')) return;
      const val = parseFloat(String(r['CUMPLIMIENTO']).replace('%','')) || 0;
      if (!centrosMap[centro]) centrosMap[centro] = { Centro: centro, Cumplidos: 0, Parciales: 0, Críticos: 0 };
      if (val >= 95) centrosMap[centro].Cumplidos += 1;
      else if (val >= 80) centrosMap[centro].Parciales += 1;
      else centrosMap[centro].Críticos += 1;
    });
    const centros = Object.values(centrosMap);

    return { resumen, centros };
  } catch (error) {
    console.error('Error cargando datos Excel:', error);
    throw error;
  }
}