// seguimiento.js
// Sistema de seguimiento corporal con múltiples métricas y visualizaciones

export function renderizarSeguimiento(nivel, contenido, subHeader, addButton) {
  // Limpiar subheader
  subHeader.innerHTML = '';
  
  // Título
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Seguimiento Corporal';
  h2Nivel.style.display = '';
  subHeader.appendChild(h2Nivel);
  
  // Contenedor de botones
  const botonesContainer = document.createElement('div');
  botonesContainer.id = 'subHeaderButtons';
  botonesContainer.className = 'seg-sub-header-buttons';
  
  // Botón añadir
  const btnAdd = document.createElement('button');
  btnAdd.className = 'header-btn seg-btn-add';
  btnAdd.textContent = '+ Añadir';
  btnAdd.title = 'Añadir medidas';
  btnAdd.onclick = () => mostrarModalMedidas(nivel, contenido);
  botonesContainer.appendChild(btnAdd);
  
  subHeader.appendChild(botonesContainer);

  // Contenido principal
  contenido.innerHTML = '';
  contenido.className = (contenido.className || '') + ' seg-contenido';

  const medidas = nivel.hijos || [];

  // ==================== SECCIÓN: ÚLTIMA MEDICIÓN ====================
  if (medidas.length > 0) {
    const ultimaMedicion = medidas[medidas.length - 1];
    const ultimaMedicionCard = crearCardUltimaMedicion(ultimaMedicion);
    contenido.appendChild(ultimaMedicionCard);
  } else {
    const sinDatos = document.createElement('div');
    sinDatos.className = 'sin-datos-card seg-sin-datos';
    sinDatos.innerHTML = `
      <div class="seg-sin-datos-icon">📊</div>
      <h3 class="seg-sin-datos-titulo">Sin datos registrados</h3>
      <p class="seg-sin-datos-texto">Pulsa "+ Añadir" para comenzar tu seguimiento</p>
    `;
    contenido.appendChild(sinDatos);
    return;
  }

  // ==================== SECCIÓN: RESUMEN DE PROGRESO ====================
  const resumenCard = crearCardResumenProgreso(medidas);
  contenido.appendChild(resumenCard);

  // ==================== SECCIÓN: GRÁFICOS PRINCIPALES ====================
  const graficosContainer = document.createElement('div');
  graficosContainer.className = 'seg-graficos-container';

  // Gráfico de Peso
  const graficoPeso = crearGraficoMetrica(medidas, 'peso', 'Peso', 'kg', '#3DD598');
  graficosContainer.appendChild(graficoPeso);

  // Gráfico de IMC
  const graficoIMC = crearGraficoIMC(medidas);
  graficosContainer.appendChild(graficoIMC);

  // Gráficos de Medidas (en grid de 2 columnas)
  const medidasGrid = document.createElement('div');
  medidasGrid.className = 'seg-medidas-grid';
  
  const graficoBrazo = crearGraficoMetrica(medidas, 'brazo', 'Brazo', 'cm', '#00D4D4', true);
  const graficoCintura = crearGraficoMetrica(medidas, 'cintura', 'Cintura', 'cm', '#FF6B6B', true);
  
  medidasGrid.appendChild(graficoBrazo);
  medidasGrid.appendChild(graficoCintura);
  
  graficosContainer.appendChild(medidasGrid);

  contenido.appendChild(graficosContainer);

  // ==================== SECCIÓN: HISTORIAL ====================
  const historialSection = crearSeccionHistorial(medidas, nivel, contenido);
  contenido.appendChild(historialSection);
}

// ==================== CARD: ÚLTIMA MEDICIÓN ====================
function crearCardUltimaMedicion(medicion) {
  const card = document.createElement('div');
  card.className = 'ultima-medicion-card';

  const fecha = new Date(medicion.fecha);
  const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  card.innerHTML = `
    <div class="seg-ultima-header">
      <div>
        <div class="seg-ultima-label">Última medición</div>
        <div class="seg-ultima-fecha">${fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)}</div>
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
    </div>
  `;

  return card;
}

// ==================== CARD: RESUMEN DE PROGRESO ====================
function crearCardResumenProgreso(medidas) {
  const card = document.createElement('div');
  card.className = 'seg-resumen-card';

  const titulo = document.createElement('h3');
  titulo.className = 'seg-section-titulo';
  titulo.textContent = 'Progreso General';
  card.appendChild(titulo);

  const statsGrid = document.createElement('div');
  statsGrid.className = 'seg-stats-grid';

  if (medidas.length >= 2) {
    const primera = medidas[0];
    const ultima = medidas[medidas.length - 1];

    const cambios = [
      { label: 'Peso',      inicial: parseFloat(primera.peso)    || 0, final: parseFloat(ultima.peso)    || 0, unidad: 'kg',        icon: '⚖️', inverso: true },
      { label: 'Brazo',     inicial: parseFloat(primera.brazo)   || 0, final: parseFloat(ultima.brazo)   || 0, unidad: 'cm',        icon: '💪' },
      { label: 'Cintura',   inicial: parseFloat(primera.cintura) || 0, final: parseFloat(ultima.cintura) || 0, unidad: 'cm',        icon: '📏', inverso: true },
      { label: 'Mediciones',inicial: 0,                               final: medidas.length,               unidad: 'registros', icon: '📊', sinCambio: true }
    ];

    cambios.forEach(cambio => {
      const statDiv = document.createElement('div');
      statDiv.className = 'seg-stat-item';

      const diferencia = cambio.final - cambio.inicial;
      const porcentaje = cambio.inicial !== 0 ? ((diferencia / cambio.inicial) * 100) : 0;
      
      let colorClass = '';
      let iconoCambio = '';
      
      if (!cambio.sinCambio) {
        if (cambio.inverso) {
          colorClass = diferencia < 0 ? 'seg-cambio-positivo' : diferencia > 0 ? 'seg-cambio-negativo' : '';
          iconoCambio = diferencia < 0 ? '↓' : diferencia > 0 ? '↑' : '';
        } else {
          colorClass = diferencia > 0 ? 'seg-cambio-positivo' : diferencia < 0 ? 'seg-cambio-negativo' : '';
          iconoCambio = diferencia > 0 ? '↑' : diferencia < 0 ? '↓' : '';
        }
      }

      statDiv.innerHTML = `
        <div class="seg-stat-icon">${cambio.icon}</div>
        <div class="seg-stat-label">${cambio.label}</div>
        <div class="seg-stat-valor">${cambio.final.toFixed(cambio.label === 'Mediciones' ? 0 : 1)} ${cambio.unidad}</div>
        ${!cambio.sinCambio ? `
          <div class="seg-stat-cambio ${colorClass}">
            ${iconoCambio} ${Math.abs(diferencia).toFixed(1)} ${cambio.unidad} (${Math.abs(porcentaje).toFixed(1)}%)
          </div>
        ` : ''}
      `;

      statsGrid.appendChild(statDiv);
    });
  } else {
    const mensaje = document.createElement('div');
    mensaje.className = 'seg-mensaje-sin-datos';
    mensaje.textContent = 'Necesitas al menos 2 mediciones para ver el progreso';
    statsGrid.appendChild(mensaje);
  }

  card.appendChild(statsGrid);
  return card;
}

// ==================== GRÁFICO: MÉTRICA INDIVIDUAL ====================
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

  const datos = medidas
    .filter(m => m[campo])
    .map(m => ({ x: new Date(m.fecha), y: parseFloat(m[campo]) }))
    .sort((a, b) => a.x - b.x);

  if (datos.length === 0) {
    const sinDatos = document.createElement('div');
    sinDatos.className = 'seg-mensaje-sin-datos';
    sinDatos.textContent = 'Sin datos registrados';
    card.replaceChild(sinDatos, canvasWrapper);
    return card;
  }

  setTimeout(() => {
    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: `${titulo} (${unidad})`,
            data: datos,
            borderColor: color,
            backgroundColor: color + '20',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: color,
            pointBorderWidth: 2,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 14 },
              callbacks: {
                title: function(context) {
                  const fecha = new Date(context[0].parsed.x);
                  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                },
                label: function(context) {
                  return `${context.parsed.y.toFixed(1)} ${unidad}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: { unit: 'day', tooltipFormat: 'dd/MM', displayFormats: { day: 'dd/MM' } },
              grid: { display: false },
              ticks: { font: { size: 10 }, color: 'var(--text-secondary)' }
            },
            y: {
              beginAtZero: false,
              grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
              ticks: {
                font: { size: 10 },
                color: 'var(--text-secondary)',
                callback: function(value) { return value.toFixed(0) + ' ' + unidad; }
              }
            }
          },
          interaction: { intersect: false, mode: 'index' }
        }
      });
    }
  }, 100);

  return card;
}

// ==================== GRÁFICO: IMC ====================
function crearGraficoIMC(medidas) {
  const card = document.createElement('div');
  card.className = 'seg-grafico-card';

  const header = document.createElement('h3');
  header.className = 'seg-grafico-titulo';
  header.textContent = 'Índice de Masa Corporal (IMC)';
  card.appendChild(header);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'seg-canvas-wrapper';
  
  const canvas = document.createElement('canvas');
  canvas.className = 'seg-canvas';
  
  canvasWrapper.appendChild(canvas);
  card.appendChild(canvasWrapper);

  const datosIMC = medidas
    .filter(m => m.peso && m.altura)
    .map(m => {
      const pesoKg = parseFloat(m.peso);
      const alturaM = parseFloat(m.altura) / 100;
      return { x: new Date(m.fecha), y: parseFloat((pesoKg / (alturaM * alturaM)).toFixed(1)) };
    })
    .sort((a, b) => a.x - b.x);

  if (datosIMC.length === 0) {
    const sinDatos = document.createElement('div');
    sinDatos.className = 'seg-mensaje-sin-datos';
    sinDatos.textContent = 'Necesitas peso y altura para calcular el IMC';
    card.replaceChild(sinDatos, canvasWrapper);
    return card;
  }

  setTimeout(() => {
    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: 'IMC',
            data: datosIMC,
            borderColor: '#FF9F43',
            backgroundColor: '#FF9F4320',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#FF9F43',
            pointBorderWidth: 2,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                title: function(context) {
                  const fecha = new Date(context[0].parsed.x);
                  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                },
                label: function(context) { return `IMC: ${context.parsed.y}`; }
              }
            },
            annotation: {
              annotations: {
                pesoNormal: { type: 'box', yMin: 18.5, yMax: 24.9, backgroundColor: 'rgba(61,213,152,0.08)', borderWidth: 0 },
                sobrepeso:  { type: 'box', yMin: 25,   yMax: 29.9, backgroundColor: 'rgba(255,159,67,0.08)',  borderWidth: 0 },
                lineaNormal:    { type: 'line', yMin: 18.5, yMax: 18.5, borderColor: 'rgba(61,213,152,0.5)',  borderWidth: 1, borderDash: [5,5] },
                lineaSobrepeso: { type: 'line', yMin: 25,   yMax: 25,   borderColor: 'rgba(255,159,67,0.5)',  borderWidth: 1, borderDash: [5,5] },
                lineaObesidad:  { type: 'line', yMin: 30,   yMax: 30,   borderColor: 'rgba(255,107,107,0.5)', borderWidth: 1, borderDash: [5,5] }
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: { unit: 'day', tooltipFormat: 'dd/MM', displayFormats: { day: 'dd/MM' } },
              grid: { display: false },
              ticks: { font: { size: 10 }, color: 'var(--text-secondary)' }
            },
            y: {
              min: 15, max: 35,
              grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
              ticks: { font: { size: 10 }, color: 'var(--text-secondary)' }
            }
          },
          interaction: { intersect: false, mode: 'index' }
        }
      });
    }
  }, 100);

  return card;
}

// ==================== SECCIÓN: HISTORIAL ====================
function crearSeccionHistorial(medidas, nivel, contenido) {
  const section = document.createElement('div');
  section.className = 'seg-historial-section';

  const header = document.createElement('div');
  header.className = 'seg-historial-header';

  const titulo = document.createElement('h3');
  titulo.className = 'seg-section-titulo';
  titulo.textContent = 'Historial';
  header.appendChild(titulo);

  const contador = document.createElement('div');
  contador.className = 'seg-historial-contador';
  contador.textContent = `${medidas.length} ${medidas.length === 1 ? 'registro' : 'registros'}`;
  header.appendChild(contador);

  section.appendChild(header);

  const listaMediciones = medidas.slice().reverse().slice(0, 10);
  
  listaMediciones.forEach((medicion, idx) => {
    const item = crearItemHistorial(medicion, medidas.length - idx - 1, nivel, contenido);
    section.appendChild(item);
  });

  if (medidas.length > 10) {
    const verMas = document.createElement('button');
    verMas.className = 'seg-btn-ver-mas';
    verMas.textContent = `Ver todas (${medidas.length - 10} más)`;
    verMas.onclick = () => { alert('Funcionalidad en desarrollo'); };
    section.appendChild(verMas);
  }

  return section;
}

// ==================== ITEM: HISTORIAL ====================
function crearItemHistorial(medicion, index, nivel, contenido) {
  const item = document.createElement('div');
  item.className = 'seg-historial-item';

  const fecha = new Date(medicion.fecha);
  const fechaFormateada = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  const infoDiv = document.createElement('div');
  infoDiv.className = 'seg-historial-info';
  infoDiv.innerHTML = `
    <div class="seg-historial-fecha">${fechaFormateada}</div>
    <div class="seg-historial-datos">
      ${medicion.peso    ? `<span>⚖️ ${medicion.peso} kg</span>`    : ''}
      ${medicion.altura  ? `<span>📏 ${medicion.altura} cm</span>`  : ''}
      ${medicion.brazo   ? `<span>💪 ${medicion.brazo} cm</span>`   : ''}
      ${medicion.cintura ? `<span>⭕ ${medicion.cintura} cm</span>` : ''}
    </div>
  `;

  const btnEliminar = document.createElement('button');
  btnEliminar.className = 'seg-btn-eliminar';
  btnEliminar.textContent = '🗑️';
  btnEliminar.onclick = (e) => {
    e.stopPropagation();
    if (confirm('¿Desea eliminar esta medición?')) {
      nivel.hijos.splice(index, 1);
      if (typeof window.guardarDatos === 'function') window.guardarDatos();
      if (typeof window.renderizar === 'function') window.renderizar();
    }
  };

  item.appendChild(infoDiv);
  item.appendChild(btnEliminar);
  return item;
}

// ==================== MODAL: AÑADIR MEDIDAS ====================
function mostrarModalMedidas(nivel, contenido) {
  const modal = document.createElement('div');
  modal.className = 'modal-medidas-overlay';

  const caja = document.createElement('div');
  caja.className = 'modal-medidas-caja';

  const tituloEl = document.createElement('h3');
  tituloEl.className = 'seg-modal-titulo';
  tituloEl.textContent = '📏 Nueva Medición';
  caja.appendChild(tituloEl);

  // Fecha
  const fechaContainer = document.createElement('div');
  fechaContainer.className = 'seg-modal-fecha-container';
  const fechaLabel = document.createElement('label');
  fechaLabel.className = 'seg-modal-fecha-label';
  fechaLabel.textContent = '📅 Fecha';
  const fecha = document.createElement('input');
  fecha.type = 'date';
  fecha.className = 'seg-modal-fecha-input';
  fecha.value = new Date().toISOString().split('T')[0];
  fechaContainer.appendChild(fechaLabel);
  fechaContainer.appendChild(fecha);
  caja.appendChild(fechaContainer);

  // Campos de medidas
  const campos = [
    { id: 'peso',    label: 'Peso',    icon: '⚖️', unidad: 'kg' },
    { id: 'altura',  label: 'Altura',  icon: '📏', unidad: 'cm' },
    { id: 'brazo',   label: 'Brazo',   icon: '💪', unidad: 'cm' },
    { id: 'cintura', label: 'Cintura', icon: '⭕', unidad: 'cm' }
  ];

  const inputsGrid = document.createElement('div');
  inputsGrid.className = 'medidas-inputs-grid';
  
  const inputs = {};
  campos.forEach(campo => {
    const container = document.createElement('div');
    container.className = 'medida-campo';

    const label = document.createElement('label');
    label.textContent = `${campo.icon} ${campo.label}`;
    label.className = 'medida-campo-label';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'medida-input-wrapper';

    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = '0.0';
    input.min = '0';
    input.step = '0.1';
    input.className = 'medida-input';
    inputs[campo.id] = input;

    const unidad = document.createElement('span');
    unidad.textContent = campo.unidad;
    unidad.className = 'medida-unidad';

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(unidad);
    container.appendChild(label);
    container.appendChild(inputWrapper);
    inputsGrid.appendChild(container);
  });

  caja.appendChild(inputsGrid);

  // Botones
  const botones = document.createElement('div');
  botones.className = 'seg-modal-botones';

  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.className = 'seg-btn-cancelar';
  btnCancelar.onclick = () => modal.remove();

  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = 'Guardar';
  btnGuardar.className = 'seg-btn-guardar';
  btnGuardar.onclick = () => {
    const nuevaMedida = {
      fecha:   fecha.value,
      peso:    inputs.peso.value,
      altura:  inputs.altura.value,
      brazo:   inputs.brazo.value,
      cintura: inputs.cintura.value
    };
    nivel.hijos = nivel.hijos || [];
    nivel.hijos.push(nuevaMedida);
    if (typeof window.guardarDatos === 'function') window.guardarDatos();
    modal.remove();
    if (typeof window.renderizar === 'function') window.renderizar();
  };

  botones.appendChild(btnCancelar);
  botones.appendChild(btnGuardar);
  caja.appendChild(botones);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}