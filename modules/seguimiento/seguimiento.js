// ============================================================
// modules/seguimiento/seguimiento.js
// Seguimiento corporal: peso, medidas, IMC, gráficos, historial.
// ============================================================

import { hoyISO, formatearFechaLarga } from '../../shared/utils.js';

const DIRECCION_OBJETIVO_POR_METRICA = {
  peso: 'decrease',
  cintura: 'decrease',
  cadera: 'decrease',
  pecho: 'increase',
  brazo: 'increase',
  muslo: 'increase',
  grasaCorporal: 'decrease',
  masaMuscular: 'increase'
};

function getDireccionObjetivoPorMetrica(metricKey, nivel) {
  const guardada = nivel?.objetivosDireccion?.[metricKey];
  if (guardada === 'increase' || guardada === 'decrease') return guardada;
  return DIRECCION_OBJETIVO_POR_METRICA[metricKey] || 'increase';
}

function getObjetivoMetricData(nivel, metricKey) {
  const valor = parseFloat(nivel?.objetivos?.[metricKey]);
  return {
    valor: Number.isFinite(valor) ? valor : null,
    tipo: getDireccionObjetivoPorMetrica(metricKey, nivel)
  };
}

function calcularProgresoObjetivo(inicial, actual, objetivo, tipo) {
  if (!Number.isFinite(inicial) || !Number.isFinite(actual) || !Number.isFinite(objetivo) || objetivo === 0) return 0;

  if (tipo === 'increase') {
    if (objetivo <= inicial) return 0;
    return Math.min(100, Math.max(0, ((actual - inicial) / (objetivo - inicial)) * 100));
  }

  if (tipo === 'decrease') {
    if (objetivo >= inicial) return 0;
    return Math.min(100, Math.max(0, ((inicial - actual) / (inicial - objetivo)) * 100));
  }

  return 0;
}

// ── Exportación principal ─────────────────────────────────────
export function renderizarSeguimiento(seguidoNivel, contenido, subHeader, addButton) {
  subHeader.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.id = 'tituloNivel'; h2.textContent = 'Seguimiento Corporal';
  subHeader.appendChild(h2);

  const botonesContainer = document.createElement('div');
  botonesContainer.id = 'subHeaderButtons';
  botonesContainer.className = 'seg-sub-header-buttons';
  const btnAdd = document.createElement('button');
  btnAdd.className = 'header-btn seg-btn-add';
  btnAdd.textContent = '+ Añadir';
  btnAdd.onclick = () => mostrarModalMedidas(seguidoNivel, contenido);
  botonesContainer.appendChild(btnAdd);
  
  const btnObjectives = document.createElement('button');
  btnObjectives.className = 'header-btn seg-btn-add';
  btnObjectives.textContent = '🎯 Objetivos';
  btnObjectives.onclick = () => mostrarModalObjetivos(seguidoNivel, contenido);
  botonesContainer.appendChild(btnObjectives);
  
  subHeader.appendChild(botonesContainer);

  contenido.innerHTML = '';
  contenido.className = (contenido.className || '') + ' seg-contenido seg-dashboard-shell';
  const medidas = seguidoNivel.hijos || [];

  if (!medidas.length) {
    const sinDatos = document.createElement('div');
    sinDatos.className = 'sin-datos-card seg-sin-datos';
    sinDatos.innerHTML = `
      <div class="seg-sin-datos-icon">📊</div>
      <h3 class="seg-sin-datos-titulo">Sin datos registrados</h3>
      <p class="seg-sin-datos-texto">Pulsa "+ Añadir" para comenzar tu seguimiento</p>`;
    contenido.appendChild(sinDatos);
    return;
  }

  const primera = medidas[0];
  const ultima = medidas[medidas.length - 1];
  const pesoInicial = parseFloat(primera.peso) || 0;
  const pesoActual = parseFloat(ultima.peso) || 0;
  const cambioTotal = pesoActual - pesoInicial;
  const objetivoPeso = parseFloat(seguidoNivel.objetivoPeso || ultima.peso || 0) || 0;
  const progresoPorcentaje = objetivoPeso && pesoInicial ? Math.min(100, Math.max(0, ((pesoInicial - pesoActual) / (pesoInicial - objetivoPeso || 1)) * 100)) : 0;
  const diasSeguimiento = Math.max(1, Math.ceil((new Date(ultima.fecha + 'T00:00:00') - new Date(primera.fecha + 'T00:00:00')) / 86400000));

  const grasaCorporal = parseFloat(ultima.grasaCorporal) || null;
  
  const summaryContainer = document.createElement('div');
  summaryContainer.className = 'seg-summary-container';
  
  const metricsData = [
    { key: 'peso', label: 'Peso', unit: 'kg', icon: '⚖️', inverse: true },
    { key: 'cintura', label: 'Cintura', unit: 'cm', icon: '⭕', inverse: true },
    { key: 'cadera', label: 'Cadera', unit: 'cm', icon: '🩺', inverse: true },
    { key: 'pecho', label: 'Pecho', unit: 'cm', icon: '🏋️', inverse: false },
    { key: 'brazo', label: 'Brazo', unit: 'cm', icon: '💪', inverse: false },
    { key: 'muslo', label: 'Muslo', unit: 'cm', icon: '🦵', inverse: true },
    { key: 'grasaCorporal', label: 'Grasa corporal', unit: '%', icon: '📉', inverse: true },
    { key: 'masaMuscular', label: 'Masa muscular', unit: 'kg', icon: '💪', inverse: false }
  ];
  
  metricsData.forEach(metric => {
    const valores = medidas.map(m => parseFloat(m[metric.key])).filter(v => !Number.isNaN(v));
    if (valores.length === 0) return;
    
    const inicial = valores[0];
    const actual = valores[valores.length - 1];
    const cambio = actual - inicial;
    const objetivoData = getObjetivoMetricData(seguidoNivel, metric.key);
    const objetivo = objetivoData.valor;
    const progressPercent = objetivo !== null ? calcularProgresoObjetivo(inicial, actual, objetivo, objetivoData.tipo) : 0;
    
    const card = document.createElement('div');
    card.className = 'seg-metric-card';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'seg-metric-header';
    headerDiv.innerHTML = `<span class="seg-metric-icon">${metric.icon}</span><span class="seg-metric-label">${metric.label}</span>`;
    card.appendChild(headerDiv);
    
    const contenidoDiv = document.createElement('div');
    contenidoDiv.className = 'seg-metric-content';
    
    // Medida anterior
    const anteriorDiv = document.createElement('div');
    anteriorDiv.className = 'seg-metric-field';
    anteriorDiv.innerHTML = `<div class="seg-metric-field-label">Anterior</div><div class="seg-metric-field-value">${inicial.toFixed(1)}</div><div class="seg-metric-field-unit">${metric.unit}</div>`;
    contenidoDiv.appendChild(anteriorDiv);

    // Medida actual
    const actualDiv = document.createElement('div');
    actualDiv.className = 'seg-metric-field';
    actualDiv.innerHTML = `<div class="seg-metric-field-label">Actual</div><div class="seg-metric-field-value">${actual.toFixed(1)}</div><div class="seg-metric-field-unit">${metric.unit}</div>`;
    contenidoDiv.appendChild(actualDiv);
    
    // Cambio actual respecto al inicio
    const cambioDiv = document.createElement('div');
    cambioDiv.className = 'seg-metric-field';
    const direccionObjetivo = objetivoData.tipo;
    const cambioSign = cambio >= 0 ? '↑' : '↓';
    const objetivoVaBien = direccionObjetivo === 'increase' ? cambio >= 0 : cambio <= 0;
    cambioDiv.innerHTML = `<div class="seg-metric-field-label">Cambio</div><div class="seg-metric-field-value seg-change-indicator ${objetivoVaBien ? 'good' : 'bad'}">${cambioSign} ${Math.abs(cambio).toFixed(1)}</div><div class="seg-metric-field-unit">${metric.unit}</div>`;
    contenidoDiv.appendChild(cambioDiv);

    // Objetivo
    const objetivoDiv = document.createElement('div');
    objetivoDiv.className = 'seg-metric-field';
    objetivoDiv.innerHTML = `<div class="seg-metric-field-label">Objetivo</div><div class="seg-metric-field-value">${objetivo !== null ? objetivo.toFixed(1) : 'S/O'}</div><div class="seg-metric-field-unit">${objetivo !== null ? metric.unit : ''}</div>`;
    contenidoDiv.appendChild(objetivoDiv);
    
    // Progreso
    const progressDiv = document.createElement('div');
    progressDiv.className = 'seg-metric-field seg-metric-field-progress';
    progressDiv.innerHTML = `<div class="seg-metric-field-label">Progreso</div><div class="seg-metric-progress-bar"><div class="seg-metric-progress-fill" style="width:${progressPercent}%;"></div></div><div class="seg-metric-field-value">${Math.round(progressPercent)}%</div>`;
    contenidoDiv.appendChild(progressDiv);
    
    card.appendChild(contenidoDiv);
    summaryContainer.appendChild(card);
  });
  
  contenido.appendChild(summaryContainer);
  
  const summaryRow = document.createElement('div');
  summaryRow.className = 'seg-summary-row seg-summary-row--hidden';
  // Tarjetas antiguas removidas - ahora usando contenedores horizontales por métrica
  
  const mainRow = document.createElement('div');
  mainRow.className = 'seg-main-row';

  const chartCard = document.createElement('div');
  chartCard.className = 'seg-panel seg-panel-chart';
  
  const headerDiv = document.createElement('div');
  headerDiv.className = 'seg-panel-header';
  headerDiv.innerHTML = '<div><h3>Evolución</h3></div>';
  
  const filterDiv = document.createElement('div');
  filterDiv.className = 'seg-panel-header-right';
  
  const select = document.createElement('select');
  select.className = 'seg-filter-select';
  
  const allMetrics = [
    { key: 'peso', label: 'Peso', unit: 'kg', color: '#7c6cf5', inverse: true },
    { key: 'altura', label: 'Altura', unit: 'cm', color: '#2db5ff', inverse: false },
    { key: 'cintura', label: 'Cintura', unit: 'cm', color: '#f06565', inverse: true },
    { key: 'cadera', label: 'Cadera', unit: 'cm', color: '#2db5ff', inverse: true },
    { key: 'pecho', label: 'Pecho', unit: 'cm', color: '#1ec0b0', inverse: false },
    { key: 'brazo', label: 'Brazo', unit: 'cm', color: '#f7a728', inverse: false },
    { key: 'muslo', label: 'Muslo', unit: 'cm', color: '#8b5cf6', inverse: true },
    { key: 'grasaCorporal', label: 'Grasa corporal', unit: '%', color: '#2ec5a2', inverse: true },
    { key: 'masaMuscular', label: 'Masa muscular', unit: 'kg', color: '#a855f7', inverse: false }
  ];
  
  const availableMetrics = allMetrics.filter(m => medidas.some(med => med[m.key]));
  
  availableMetrics.forEach(metric => {
    const option = document.createElement('option');
    option.value = metric.key;
    option.textContent = metric.label;
    select.appendChild(option);
  });
  
  select.value = 'peso';
  filterDiv.appendChild(select);
  headerDiv.appendChild(filterDiv);
  chartCard.appendChild(headerDiv);
  
  const chartWrap = document.createElement('div');
  chartWrap.className = 'seg-chart-wrap';
  const chartCanvas = document.createElement('canvas');
  chartCanvas.className = 'seg-weight-chart';
  chartWrap.appendChild(chartCanvas);
  chartCard.appendChild(chartWrap);
  
  let currentChart = null;
  
  const drawChart = (metricKey) => {
    const metric = allMetrics.find(m => m.key === metricKey);
    if (!metric || !window.Chart) return;
    
    const datosMetrica = medidas
      .filter(m => m[metricKey] && m.fecha)
      .map(m => ({ x: new Date(m.fecha + 'T00:00:00'), y: parseFloat(m[metricKey]) }))
      .sort((a, b) => a.x - b.x);
    
    if (datosMetrica.length === 0) {
      chartCanvas.style.display = 'none';
      return;
    }
    chartCanvas.style.display = 'block';
    
    if (currentChart) currentChart.destroy();
    
    const ctx = chartCanvas.getContext('2d');
    currentChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: metric.label,
          data: datosMetrica,
          borderColor: metric.color,
          backgroundColor: metric.color + '20',
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#fff',
          pointBorderColor: metric.color,
          pointBorderWidth: 2,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 22, 31, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            displayColors: false,
            callbacks: {
              title: item => item[0]?.label ? new Date(item[0].label).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
              label: ctx => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)} ${metric.unit}`
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'day', tooltipFormat: 'dd/MM', displayFormats: { day: 'dd/MM' } },
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#7987a1', font: { size: 10 } }
          },
          y: {
            min: Math.min(...datosMetrica.map(d => d.y)) - 2,
            max: Math.max(...datosMetrica.map(d => d.y)) + 2,
            grid: { color: 'rgba(125, 135, 153, 0.12)', drawBorder: false },
            border: { display: false },
            ticks: { color: '#7987a1', font: { size: 10 }, callback: value => `${value.toFixed(0)} ${metric.unit}` }
          }
        }
      }
    });
  };
  
  select.addEventListener('change', () => drawChart(select.value));
  
  mainRow.appendChild(chartCard);
  setTimeout(() => drawChart('peso'), 100);

  const sideCard = document.createElement('div');
  sideCard.className = 'seg-panel seg-panel-side';
  sideCard.innerHTML = '<div class="seg-panel-header"><h3>Resumen de progreso</h3></div>';
  const trendList = document.createElement('div');
  trendList.className = 'seg-trend-list';
  const metricDefinitions = [
    { key: 'peso', label: 'Peso', color: '#7c6cf5', icon: '⚖️', unit: 'kg', inverse: true },
    { key: 'cintura', label: 'Cintura', color: '#f06565', icon: '⭕', unit: 'cm', inverse: true },
    { key: 'grasaCorporal', label: 'Grasa corporal', color: '#2ec5a2', icon: '📉', unit: '%', inverse: true },
    { key: 'masaMuscular', label: 'Masa muscular', color: '#a855f7', icon: '💪', unit: 'kg', inverse: false }
  ];
  metricDefinitions.forEach(metric => {
    const item = document.createElement('div');
    item.className = 'seg-trend-item';
    const values = medidas.map(m => parseFloat(m[metric.key])).filter(v => !Number.isNaN(v));
    const initial = values[0] || 0;
    const final = values[values.length - 1] || 0;
    const delta = final - initial;
    const sparkSvg = crearSparkline(values, metric.color);
    item.innerHTML = `
      <div class="seg-trend-main">
        <div class="seg-trend-icon" style="background:${metric.color}18; color:${metric.color};">${metric.icon}</div>
        <div class="seg-trend-copy">
          <div class="seg-trend-label">${metric.label}</div>
          <div class="seg-trend-value">${delta >= 0 && !metric.inverse ? '+' : ''}${delta.toFixed(1)} ${metric.unit}</div>
        </div>
      </div>
      <div class="seg-trend-spark">${sparkSvg}</div>
    `;
    trendList.appendChild(item);
  });
  sideCard.appendChild(trendList);
  const footerBtn = document.createElement('button');
  footerBtn.className = 'seg-footer-btn';
  footerBtn.textContent = 'Ver informe completo';
  sideCard.appendChild(footerBtn);
  mainRow.appendChild(sideCard);
  contenido.appendChild(mainRow);

  const lowerRow = document.createElement('div');
  lowerRow.className = 'seg-lower-row';

  const tableCard = document.createElement('div');
  tableCard.className = 'seg-panel seg-panel-table';
  tableCard.innerHTML = '<div class="seg-panel-header"><h3>Medidas corporales</h3></div>';
  const table = document.createElement('div');
  table.className = 'seg-measures-table';
  const header = document.createElement('div');
  header.className = 'seg-measures-row seg-measures-header';
  header.innerHTML = '<span>Medida</span><span>Inicial</span><span>Actual</span><span>Cambio</span><span>Progreso</span>';
  table.appendChild(header);

  const medidasAComparar = [
    { key: 'cintura', label: 'Cintura', color: '#f06565', unit: 'cm', inverse: true },
    { key: 'cadera', label: 'Cadera', color: '#2db5ff', unit: 'cm', inverse: true },
    { key: 'pecho', label: 'Pecho', color: '#1ec0b0', unit: 'cm', inverse: false },
    { key: 'brazo', label: 'Brazo', color: '#f7a728', unit: 'cm', inverse: false },
    { key: 'muslo', label: 'Muslo', color: '#8b5cf6', unit: 'cm', inverse: true }
  ];

  medidasAComparar.forEach(m => {
    const valores = medidas.map(md => parseFloat(md[m.key])).filter(v => !Number.isNaN(v));
    const inicial = valores[0] || 0;
    const actual = valores[valores.length - 1] || 0;
    const cambio = actual - inicial;
    const progress = inicial ? Math.min(100, Math.max(0, Math.abs(cambio) / inicial * 100)) : 0;
    const deltaSign = m.inverse ? (cambio < 0 ? '↓' : cambio > 0 ? '↑' : '•') : (cambio > 0 ? '↑' : cambio < 0 ? '↓' : '•');
    const row = document.createElement('div');
    row.className = 'seg-measures-row';
    row.innerHTML = `
      <span class="seg-measure-name"><i style="color:${m.color}">●</i> ${m.label}</span>
      <span>${inicial.toFixed(1)} ${m.unit}</span>
      <span>${actual.toFixed(1)} ${m.unit}</span>
      <span class="seg-change ${cambio <= 0 ? 'seg-change-down' : 'seg-change-up'}">${deltaSign} ${Math.abs(cambio).toFixed(1)} ${m.unit}</span>
      <span class="seg-measure-progress"><em style="width:${progress}%"></em></span>
    `;
    table.appendChild(row);
  });
  tableCard.appendChild(table);
  lowerRow.appendChild(tableCard);

  const distCard = document.createElement('div');
  distCard.className = 'seg-panel seg-panel-distribution';
  distCard.innerHTML = '<div class="seg-panel-header"><h3>Distribución de medidas</h3></div>';
  const distribution = document.createElement('div');
  distribution.className = 'seg-distribution-wrap';
  const ultimo = medidas[medidas.length - 1];
  const bodyMap = [
    { key: 'pecho', label: 'Pecho', style: { left: '50%', top: '18%' } },
    { key: 'cintura', label: 'Cintura', style: { left: '50%', top: '38%' } },
    { key: 'cadera', label: 'Cadera', style: { left: '50%', top: '58%' } },
    { key: 'brazo', label: 'Brazo', style: { left: '28%', top: '32%' } },
    { key: 'muslo', label: 'Muslo', style: { left: '74%', top: '64%' } }
  ];
  distribution.innerHTML = `
    <svg viewBox="0 0 240 300" class="seg-silhouette">
      <g fill="none" stroke="#dfe6f1" stroke-width="2">
        <circle cx="120" cy="52" r="22" fill="#e7edf5"/>
        <path d="M96 88 L120 70 L144 88 L136 112 L104 112 Z" fill="#e7edf5"/>
        <rect x="88" y="110" width="64" height="74" rx="20" fill="#e7edf5"/>
        <rect x="100" y="188" width="18" height="62" rx="10" fill="#e7edf5"/>
        <rect x="122" y="188" width="18" height="62" rx="10" fill="#e7edf5"/>
        <rect x="74" y="126" width="14" height="66" rx="7" fill="#e7edf5"/>
        <rect x="152" y="126" width="14" height="66" rx="7" fill="#e7edf5"/>
      </g>
      <g stroke="#bfcad9" stroke-width="2" stroke-dasharray="5 5">
        <line x1="120" y1="52" x2="120" y2="12"/>
        <line x1="120" y1="72" x2="120" y2="145"/>
        <line x1="120" y1="145" x2="120" y2="200"/>
        <line x1="88" y1="130" x2="48" y2="146"/>
        <line x1="152" y1="130" x2="190" y2="146"/>
      </g>
    </svg>
  `;
  const labels = document.createElement('div');
  labels.className = 'seg-measure-layers';
  bodyMap.forEach(metric => {
    const value = ultimo?.[metric.key] ? Number(ultimo[metric.key]) : 0;
    const node = document.createElement('div');
    node.className = 'seg-body-tag';
    node.style.left = metric.style.left;
    node.style.top = metric.style.top;
    node.innerHTML = `<span class="seg-body-dot" style="background:${obtenerColor(metric.key)}"></span><span>${metric.label}</span><strong>${value.toFixed(1)} cm</strong>`;
    labels.appendChild(node);
  });
  distribution.append(labels);
  distCard.appendChild(distribution);
  lowerRow.appendChild(distCard);
  contenido.appendChild(lowerRow);
}

function crearTarjetaResumen({ icon, title, value, subtitle, tone = 'purple' }) {
  const card = document.createElement('div');
  card.className = `seg-summary-card seg-summary-card--${tone}`;
  card.innerHTML = `
    <div class="seg-summary-header">
      <div class="seg-summary-icon">${icon}</div>
    </div>
    <div class="seg-summary-body">
      <div class="seg-summary-title">${title}</div>
      <div class="seg-summary-value">${value}</div>
      <div class="seg-summary-subtitle">${subtitle}</div>
    </div>
  `;
  return card;
}

function crearSparkline(values, color) {
  if (!Array.isArray(values) || values.length === 0) {
    return '<svg viewBox="0 0 100 26" preserveAspectRatio="none"><path d="M0 13 L100 13" stroke="'+color+'" stroke-width="2" fill="none"/></svg>';
  }
  const clean = values.filter(v => Number.isFinite(v));
  if (clean.length < 2) {
    const y = 13;
    return '<svg viewBox="0 0 100 26" preserveAspectRatio="none"><path d="M0 '+y+' L100 '+y+'" stroke="'+color+'" stroke-width="2" fill="none"/></svg>';
  }
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const line = clean.map((value, index) => {
    const x = (index / (clean.length - 1)) * 100;
    const y = 22 - ((value - min) / range) * 16;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  return `<svg viewBox="0 0 100 26" preserveAspectRatio="none"><path d="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function obtenerColor(key) {
  const map = {
    pecho: '#1ec0b0',
    cintura: '#f06565',
    cadera: '#2db5ff',
    brazo: '#f7a728',
    muslo: '#8b5cf6',
    peso: '#7c6cf5',
    grasaCorporal: '#2ec5a2',
    masaMuscular: '#a855f7'
  };
  return map[key] || '#8b5cf6';
}

// ── Card: última medición ─────────────────────────────────────
function crearCardUltimaMedicion(medicion) {
  const card = document.createElement('div');
  card.className = 'ultima-medicion-card';
  const fechaStr = formatearFechaLarga(medicion.fecha);
  card.innerHTML = `
    <div class="seg-ultima-header">
      <div>
        <div class="seg-ultima-label">Última medición</div>
        <div class="seg-ultima-fecha">${fechaStr}</div>
      </div>
      <div class="seg-ultima-icon">📏</div>
    </div>
    <div class="seg-ultima-stats">
      <div class="seg-ultima-stat-item">
        <div class="seg-ultima-stat-label">Peso</div>
        <div class="seg-ultima-stat-valor">${medicion.peso || '--'} <span class="seg-ultima-stat-unidad">kg</span></div>
      </div>
      <div class="seg-ultima-stat-item">
        <div class="seg-ultima-stat-label">Altura</div>
        <div class="seg-ultima-stat-valor">${medicion.altura || '--'} <span class="seg-ultima-stat-unidad">cm</span></div>
      </div>
      <div class="seg-ultima-stat-item">
        <div class="seg-ultima-stat-label">Brazo</div>
        <div class="seg-ultima-stat-valor">${medicion.brazo || '--'} <span class="seg-ultima-stat-unidad">cm</span></div>
      </div>
      <div class="seg-ultima-stat-item">
        <div class="seg-ultima-stat-label">Cintura</div>
        <div class="seg-ultima-stat-valor">${medicion.cintura || '--'} <span class="seg-ultima-stat-unidad">cm</span></div>
      </div>
    </div>`;
  return card;
}

// ── Card: resumen de progreso ─────────────────────────────────
function crearCardResumenProgreso(medidas) {
  const card = document.createElement('div');
  card.className = 'seg-resumen-card';
  const titulo = document.createElement('h3');
  titulo.className = 'seg-section-titulo'; titulo.textContent = 'Progreso General';
  card.appendChild(titulo);

  const statsGrid = document.createElement('div');
  statsGrid.className = 'seg-stats-grid';

  if (medidas.length >= 2) {
    const primera = medidas[0], ultima = medidas[medidas.length - 1];
    [
      { label:'Peso',       inicial: parseFloat(primera.peso)    || 0, final: parseFloat(ultima.peso)    || 0, unidad:'kg',       icon:'⚖️', inverso:true },
      { label:'Brazo',      inicial: parseFloat(primera.brazo)   || 0, final: parseFloat(ultima.brazo)   || 0, unidad:'cm',       icon:'💪' },
      { label:'Cintura',    inicial: parseFloat(primera.cintura) || 0, final: parseFloat(ultima.cintura) || 0, unidad:'cm',       icon:'📏', inverso:true },
      { label:'Mediciones', inicial: 0,                               final: medidas.length,               unidad:'registros', icon:'📊', sinCambio:true }
    ].forEach(cambio => {
      const statDiv = document.createElement('div');
      statDiv.className = 'seg-stat-item';
      const diferencia = cambio.final - cambio.inicial;
      const porcentaje = cambio.inicial !== 0 ? ((diferencia / cambio.inicial) * 100) : 0;
      let colorClass = '', iconoCambio = '';
      if (!cambio.sinCambio) {
        if (cambio.inverso) {
          colorClass  = diferencia < 0 ? 'seg-cambio-positivo' : diferencia > 0 ? 'seg-cambio-negativo' : '';
          iconoCambio = diferencia < 0 ? '↓' : diferencia > 0 ? '↑' : '';
        } else {
          colorClass  = diferencia > 0 ? 'seg-cambio-positivo' : diferencia < 0 ? 'seg-cambio-negativo' : '';
          iconoCambio = diferencia > 0 ? '↑' : diferencia < 0 ? '↓' : '';
        }
      }
      statDiv.innerHTML = `
        <div class="seg-stat-icon">${cambio.icon}</div>
        <div class="seg-stat-label">${cambio.label}</div>
        <div class="seg-stat-valor">${cambio.final.toFixed(cambio.label==='Mediciones'?0:1)} ${cambio.unidad}</div>
        ${!cambio.sinCambio ? `<div class="seg-stat-cambio ${colorClass}">${iconoCambio} ${Math.abs(diferencia).toFixed(1)} ${cambio.unidad} (${Math.abs(porcentaje).toFixed(1)}%)</div>` : ''}`;
      statsGrid.appendChild(statDiv);
    });
  } else {
    const msg = document.createElement('div');
    msg.className = 'seg-mensaje-sin-datos';
    msg.textContent = 'Necesitas al menos 2 mediciones para ver el progreso';
    statsGrid.appendChild(msg);
  }
  card.appendChild(statsGrid);
  return card;
}

// ── Gráfico: métrica individual ───────────────────────────────
function crearGraficoMetrica(medidas, campo, titulo, unidad, color, compacto = false) {
  const card = document.createElement('div');
  card.className = 'seg-grafico-card' + (compacto ? ' seg-grafico-card--compacto' : '');
  const header = document.createElement('h3');
  header.className = 'seg-grafico-titulo' + (compacto ? ' seg-grafico-titulo--compacto' : '');
  header.textContent = titulo;
  card.appendChild(header);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'seg-canvas-wrapper' + (compacto ? ' seg-canvas-wrapper--compacto' : '');
  const canvas = document.createElement('canvas');
  canvas.className = 'seg-canvas';
  canvasWrapper.appendChild(canvas);
  card.appendChild(canvasWrapper);

  const datosFiltrados = medidas
    .filter(m => m[campo] && m.fecha)
    .map(m => ({ x: new Date(m.fecha + 'T00:00:00'), y: parseFloat(m[campo]) }))
    .sort((a, b) => a.x - b.x);

  if (datosFiltrados.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'seg-mensaje-sin-datos';
    msg.textContent = `Sin datos de ${titulo.toLowerCase()}`;
    card.replaceChild(msg, canvasWrapper);
    return card;
  }

  setTimeout(() => {
    if (!window.Chart) return;
    new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets: [{ label: titulo, data: datosFiltrados, borderColor: color,
        backgroundColor: color + '20', tension: 0.4, fill: true,
        pointRadius: 4, pointHoverRadius: 6,
        pointBackgroundColor: '#fff', pointBorderColor: color, pointBorderWidth: 2, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, cornerRadius: 8,
          callbacks: { title: ctx => new Date(ctx[0].parsed.x).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}),
                       label: ctx => `${ctx.parsed.y.toFixed(1)} ${unidad}` } } },
        scales: { x: { type:'time', time:{unit:'day',tooltipFormat:'dd/MM',displayFormats:{day:'dd/MM'}}, grid:{display:false}, ticks:{font:{size:10},color:'var(--text-secondary)'} },
                  y: { beginAtZero:false, grid:{color:'rgba(0,0,0,0.05)',drawBorder:false}, ticks:{font:{size:10},color:'var(--text-secondary)',callback:v=>v.toFixed(0)+' '+unidad} } },
        interaction: { intersect:false, mode:'index' } }
    });
  }, 100);
  return card;
}

// ── Gráfico: IMC ──────────────────────────────────────────────
function crearGraficoIMC(medidas) {
  const card = document.createElement('div');
  card.className = 'seg-grafico-card';
  const header = document.createElement('h3');
  header.className = 'seg-grafico-titulo'; header.textContent = 'Índice de Masa Corporal (IMC)';
  card.appendChild(header);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'seg-canvas-wrapper';
  const canvas = document.createElement('canvas');
  canvas.className = 'seg-canvas';
  canvasWrapper.appendChild(canvas);
  card.appendChild(canvasWrapper);

  const datosIMC = medidas
    .filter(m => m.peso && m.altura)
    .map(m => ({ x: new Date(m.fecha + 'T00:00:00'), y: parseFloat((parseFloat(m.peso) / ((parseFloat(m.altura)/100)**2)).toFixed(1)) }))
    .sort((a, b) => a.x - b.x);

  if (datosIMC.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'seg-mensaje-sin-datos';
    msg.textContent = 'Necesitas peso y altura para calcular el IMC';
    card.replaceChild(msg, canvasWrapper);
    return card;
  }

  setTimeout(() => {
    if (!window.Chart) return;
    new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets: [{ label:'IMC', data:datosIMC, borderColor:'#FF9F43', backgroundColor:'#FF9F4320',
        tension:0.4, fill:true, pointRadius:4, pointHoverRadius:6,
        pointBackgroundColor:'#fff', pointBorderColor:'#FF9F43', pointBorderWidth:2, borderWidth:2 }] },
      options: { responsive:true, maintainAspectRatio:false,
        plugins: { legend:{display:false}, tooltip:{backgroundColor:'rgba(0,0,0,0.8)',padding:12,cornerRadius:8,
          callbacks:{ title:ctx=>new Date(ctx[0].parsed.x).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}), label:ctx=>`IMC: ${ctx.parsed.y}` }},
          annotation:{annotations:{
            pesoNormal:    {type:'box',  yMin:18.5,yMax:24.9,backgroundColor:'rgba(61,213,152,0.08)',borderWidth:0},
            sobrepeso:     {type:'box',  yMin:25,  yMax:29.9,backgroundColor:'rgba(255,159,67,0.08)', borderWidth:0},
            lineaNormal:   {type:'line', yMin:18.5,yMax:18.5,borderColor:'rgba(61,213,152,0.5)',  borderWidth:1,borderDash:[5,5]},
            lineaSobrepeso:{type:'line', yMin:25,  yMax:25,  borderColor:'rgba(255,159,67,0.5)',  borderWidth:1,borderDash:[5,5]},
            lineaObesidad: {type:'line', yMin:30,  yMax:30,  borderColor:'rgba(255,107,107,0.5)', borderWidth:1,borderDash:[5,5]}
          }}},
        scales:{ x:{type:'time',time:{unit:'day',tooltipFormat:'dd/MM',displayFormats:{day:'dd/MM'}},grid:{display:false},ticks:{font:{size:10},color:'var(--text-secondary)'}},
                 y:{min:15,max:35,grid:{color:'rgba(0,0,0,0.05)',drawBorder:false},ticks:{font:{size:10},color:'var(--text-secondary)'}} },
        interaction:{intersect:false,mode:'index'} }
    });
  }, 100);
  return card;
}

// ── Historial ─────────────────────────────────────────────────
function crearSeccionHistorial(medidas, nivel, contenido) {
  const section = document.createElement('div');
  section.className = 'seg-historial-section';

  const header = document.createElement('div');
  header.className = 'seg-historial-header';
  const titulo = document.createElement('h3');
  titulo.className = 'seg-section-titulo'; titulo.textContent = 'Historial';
  const contador = document.createElement('div');
  contador.className = 'seg-historial-contador';
  contador.textContent = `${medidas.length} ${medidas.length === 1 ? 'registro' : 'registros'}`;
  header.append(titulo, contador);
  section.appendChild(header);

  medidas.slice().reverse().slice(0, 10).forEach((medicion, idx) => {
    section.appendChild(crearItemHistorial(medicion, medidas.length - idx - 1, nivel, contenido));
  });

  if (medidas.length > 10) {
    const verMas = document.createElement('button');
    verMas.className = 'seg-btn-ver-mas';
    verMas.textContent = `Ver todas (${medidas.length - 10} más)`;
    verMas.onclick = () => alert('Funcionalidad en desarrollo');
    section.appendChild(verMas);
  }
  return section;
}

function crearItemHistorial(medicion, index, nivel, contenido) {
  const item = document.createElement('div');
  item.className = 'seg-historial-item';

  const fechaStr = new Date(medicion.fecha + 'T00:00:00')
    .toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });

  const infoDiv = document.createElement('div');
  infoDiv.className = 'seg-historial-info';
  infoDiv.innerHTML = `
    <div class="seg-historial-fecha">${fechaStr}</div>
    <div class="seg-historial-datos">
      ${medicion.peso    ? `<span>⚖️ ${medicion.peso} kg</span>`    : ''}
      ${medicion.altura  ? `<span>📏 ${medicion.altura} cm</span>`  : ''}
      ${medicion.brazo   ? `<span>💪 ${medicion.brazo} cm</span>`   : ''}
      ${medicion.cintura ? `<span>⭕ ${medicion.cintura} cm</span>` : ''}
    </div>`;

  const btnEliminar = document.createElement('button');
  btnEliminar.className = 'seg-btn-eliminar';
  btnEliminar.textContent = '🗑️';
  btnEliminar.onclick = e => {
    e.stopPropagation();
    if (confirm('¿Desea eliminar esta medición?')) {
      nivel.hijos.splice(index, 1);
      window.guardarDatos?.();
      window.renderizar?.();
    }
  };

  item.append(infoDiv, btnEliminar);
  return item;
}

// ── Modal: añadir medidas ─────────────────────────────────────
function mostrarModalMedidas(nivel, contenido) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15, 23, 42, 0.62);display:flex;align-items:center;justify-content:center;padding:8px;z-index:2000;';

  const caja = document.createElement('div');
  caja.style.cssText = 'width:100%;height:100%;max-width:1200px;max-height:100vh;background:#f8fafc;display:flex;flex-direction:column;align-items:center;padding:16px 12px;overflow-y:auto;gap:6px;';

  const tituloEl = document.createElement('h3');
  tituloEl.style.cssText = 'margin:0 0 4px;font-size:0.95rem;font-weight:800;color:var(--text-primary);text-align:center;';
  tituloEl.textContent = 'Nueva medición';
  caja.appendChild(tituloEl);

  // Fecha
  const fechaContainer = document.createElement('div');
  fechaContainer.style.cssText = 'display:flex;flex-direction:column;gap:2px;align-items:center;margin-bottom:4px;width:min(100%,200px);';
  const fechaLabel = document.createElement('label');
  fechaLabel.style.cssText = 'font-size:0.75rem;font-weight:600;color:var(--text-secondary);';
  fechaLabel.textContent = 'Fecha';
  const fechaInput = document.createElement('input');
  fechaInput.type = 'date';
  fechaInput.value = hoyISO();
  fechaInput.style.cssText = 'width:100%;height:30px;padding:3px 6px;margin:0;font-size:1rem;font-weight:300;background:transparent;border:none;transition:all 0.2s ease;box-shadow:none;text-align:center;';
  fechaInput.addEventListener('focus', () => {
    fechaInput.style.border = '1px solid var(--primary)';
    fechaInput.style.background = 'rgba(255,255,255,0.5)';
  });
  fechaInput.addEventListener('blur', () => {
    fechaInput.style.border = 'none';
    fechaInput.style.background = 'transparent';
  });
  fechaContainer.append(fechaLabel, fechaInput);
  caja.appendChild(fechaContainer);

  // Grid de campos compactos
  const campos = [
    { key:'peso',    label:'Peso',    unit:'kg' },
    { key:'altura',  label:'Altura',  unit:'cm' },
    { key:'brazo',   label:'Brazo',   unit:'cm' },
    { key:'cintura', label:'Cintura', unit:'cm' },
    { key:'cadera',  label:'Cadera',  unit:'cm' },
    { key:'pecho',   label:'Pecho',   unit:'cm' },
    { key:'grasaCorporal', label:'Grasa', unit:'%' },
    { key:'masaMuscular',  label:'Masa',  unit:'kg' }
  ];

  const inputs = {};
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:6px 8px;width:100%;max-width:900px;margin-bottom:6px;';

  campos.forEach(({ key, label, unit }) => {
    const fieldDiv = document.createElement('div');
    fieldDiv.style.cssText = 'display:flex;flex-direction:column;gap:1px;';

    const lbl = document.createElement('label');
    lbl.style.cssText = 'font-size:0.7rem;font-weight:600;color:var(--text-secondary);text-align:center;letter-spacing:0.5px;';
    lbl.textContent = label;

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '0.1';
    inp.style.cssText = 'height:28px;padding:2px 3px;margin:0;font-size:1.1rem;font-weight:300;background:transparent;border:none;transition:all 0.2s ease;box-shadow:none;text-align:center;';
    inp.placeholder = unit;
    inp.addEventListener('focus', () => {
      inp.style.border = '1px solid var(--primary)';
      inp.style.background = 'rgba(255,255,255,0.5)';
    });
    inp.addEventListener('blur', () => {
      inp.style.border = 'none';
      inp.style.background = 'transparent';
    });
    inputs[key] = inp;

    fieldDiv.append(lbl, inp);
    gridContainer.appendChild(fieldDiv);
  });
  caja.appendChild(gridContainer);

  // Botón guardar medidas
  const btnGuardar = document.createElement('button');
  btnGuardar.style.cssText = 'width:min(100%,300px);height:32px;padding:6px 16px;background:var(--primary);color:white;border:none;border-radius:6px;font-weight:700;font-size:0.85rem;cursor:pointer;transition:all 0.2s;margin-bottom:4px;';
  btnGuardar.textContent = 'Guardar medición';
  btnGuardar.onmouseover = () => btnGuardar.style.opacity = '0.9';
  btnGuardar.onmouseout = () => btnGuardar.style.opacity = '1';
  btnGuardar.onclick = () => {
    const nuevaMedicion = { fecha: fechaInput.value };
    campos.forEach(({ key }) => {
      if (inputs[key].value) nuevaMedicion[key] = inputs[key].value;
    });
    if (!nuevaMedicion.fecha) { alert('Selecciona una fecha'); return; }
    if (!nivel.hijos) nivel.hijos = [];
    nivel.hijos.push(nuevaMedicion);
    nivel.hijos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    window.guardarDatos?.();
    modal.remove();
    window.renderizar?.();
  };
  caja.appendChild(btnGuardar);

  // Botón cancelar
  const btnCancelar = document.createElement('button');
  btnCancelar.style.cssText = 'width:min(100%,300px);height:30px;background:transparent;border:none;color:var(--text-secondary);font-weight:600;cursor:pointer;font-size:0.8rem;transition:all 0.2s;';
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.onmouseover = () => btnCancelar.style.color = 'var(--text-primary)';
  btnCancelar.onmouseout = () => btnCancelar.style.color = 'var(--text-secondary)';
  btnCancelar.onclick = () => modal.remove();
  caja.appendChild(btnCancelar);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}

// ── Modal: editar objetivos ────────────────────────────────────
function mostrarModalObjetivos(nivel, contenido) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15, 23, 42, 0.62);display:flex;align-items:center;justify-content:center;padding:8px;z-index:2000;';

  const caja = document.createElement('div');
  caja.style.cssText = 'width:100%;height:100%;max-width:1200px;max-height:100vh;background:#f8fafc;display:flex;flex-direction:column;align-items:center;padding:16px 12px;overflow-y:auto;gap:6px;';

  const tituloEl = document.createElement('h3');
  tituloEl.style.cssText = 'margin:0 0 4px;font-size:0.95rem;font-weight:800;color:var(--text-primary);text-align:center;';
  tituloEl.textContent = 'Objetivos de métricas';
  caja.appendChild(tituloEl);

  if (!nivel.objetivos) nivel.objetivos = {};
  if (!nivel.objetivosDireccion) nivel.objetivosDireccion = {};

  const campos = [
    { key:'peso',    label:'Peso',    unit:'kg' },
    { key:'altura',  label:'Altura',  unit:'cm' },
    { key:'brazo',   label:'Brazo',   unit:'cm' },
    { key:'cintura', label:'Cintura', unit:'cm' },
    { key:'cadera',  label:'Cadera',  unit:'cm' },
    { key:'pecho',   label:'Pecho',   unit:'cm' },
    { key:'grasaCorporal', label:'Grasa corp.', unit:'%' },
    { key:'masaMuscular',  label:'Masa musc.', unit:'kg' }
  ];

  const inputs = {};
  const directionInputs = {};
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px 12px;width:100%;max-width:900px;margin-bottom:6px;';

  campos.forEach(({ key, label, unit }) => {
    const fieldDiv = document.createElement('div');
    fieldDiv.style.cssText = 'display:flex;flex-direction:column;gap:2px;';

    const lbl = document.createElement('label');
    lbl.style.cssText = 'font-size:0.7rem;font-weight:600;color:var(--text-secondary);text-align:center;letter-spacing:0.5px;';
    lbl.textContent = label;

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '0.1';
    inp.value = nivel.objetivos[key] || '';
    inp.style.cssText = 'height:28px;padding:2px 3px;margin:0;font-size:1.1rem;font-weight:300;background:transparent;border:none;transition:all 0.2s ease;box-shadow:none;text-align:center;';
    inp.placeholder = unit;
    inp.addEventListener('focus', () => {
      inp.style.border = '1px solid var(--primary)';
      inp.style.background = 'rgba(255,255,255,0.5)';
    });
    inp.addEventListener('blur', () => {
      inp.style.border = 'none';
      inp.style.background = 'transparent';
    });
    inputs[key] = inp;

    const dirSelect = document.createElement('select');
    dirSelect.style.cssText = 'height:28px;padding:2px 5px;margin:0;border:1px solid var(--border-color);border-radius:6px;background:#fff;color:var(--text-primary);font-size:0.72rem;font-weight:600;';
    dirSelect.innerHTML = `
      <option value="increase">Aumentar</option>
      <option value="decrease">Disminuir</option>
    `;
    dirSelect.value = getDireccionObjetivoPorMetrica(key, nivel);
    directionInputs[key] = dirSelect;

    fieldDiv.append(lbl, inp, dirSelect);
    gridContainer.appendChild(fieldDiv);
  });
  caja.appendChild(gridContainer);

  const btnGuardar = document.createElement('button');
  btnGuardar.style.cssText = 'width:min(100%,300px);height:32px;padding:6px 16px;background:var(--primary);color:white;border:none;border-radius:6px;font-weight:700;font-size:0.85rem;cursor:pointer;transition:all 0.2s;margin-bottom:4px;';
  btnGuardar.textContent = 'Guardar objetivos';
  btnGuardar.onmouseover = () => btnGuardar.style.opacity = '0.9';
  btnGuardar.onmouseout = () => btnGuardar.style.opacity = '1';
  btnGuardar.onclick = () => {
    campos.forEach(({ key }) => {
      const valor = inputs[key].value;
      const tipo = directionInputs[key].value;

      if (valor) {
        nivel.objetivos[key] = valor;
        nivel.objetivosDireccion[key] = tipo;
      } else {
        delete nivel.objetivos[key];
        delete nivel.objetivosDireccion[key];
      }
    });
    window.guardarDatos?.();
    modal.remove();
    window.renderizar?.();
  };
  caja.appendChild(btnGuardar);

  const btnCancelar = document.createElement('button');
  btnCancelar.style.cssText = 'width:min(100%,300px);height:30px;background:transparent;border:none;color:var(--text-secondary);font-weight:600;cursor:pointer;font-size:0.8rem;transition:all 0.2s;';
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.onmouseover = () => btnCancelar.style.color = 'var(--text-primary)';
  btnCancelar.onmouseout = () => btnCancelar.style.color = 'var(--text-secondary)';
  btnCancelar.onclick = () => modal.remove();
  caja.appendChild(btnCancelar);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}
