// ============================================================
// modules/seguimiento/seguimiento.js
// Seguimiento corporal: peso, medidas, IMC, gráficos, historial.
// ============================================================

import { hoyISO, formatearFechaLarga } from '../../shared/utils.js';

// ── Exportación principal ─────────────────────────────────────
export function renderizarSeguimiento(seguidoNivel, contenido, subHeader, addButton) {
  // Subheader
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
  subHeader.appendChild(botonesContainer);

  // Contenido
  contenido.innerHTML = '';
  contenido.className = (contenido.className || '') + ' seg-contenido';
  const medidas = seguidoNivel.hijos || [];

  if (medidas.length > 0) {
    contenido.appendChild(crearCardUltimaMedicion(medidas[medidas.length - 1]));
  } else {
    const sinDatos = document.createElement('div');
    sinDatos.className = 'sin-datos-card seg-sin-datos';
    sinDatos.innerHTML = `
      <div class="seg-sin-datos-icon">📊</div>
      <h3 class="seg-sin-datos-titulo">Sin datos registrados</h3>
      <p class="seg-sin-datos-texto">Pulsa "+ Añadir" para comenzar tu seguimiento</p>`;
    contenido.appendChild(sinDatos);
    return;
  }

  contenido.appendChild(crearCardResumenProgreso(medidas));

  const graficosContainer = document.createElement('div');
  graficosContainer.className = 'seg-graficos-container';
  graficosContainer.appendChild(crearGraficoMetrica(medidas, 'peso',    'Peso',    'kg',  '#3DD598'));
  graficosContainer.appendChild(crearGraficoIMC(medidas));

  const medidasGrid = document.createElement('div');
  medidasGrid.className = 'seg-medidas-grid';
  medidasGrid.appendChild(crearGraficoMetrica(medidas, 'brazo',   'Brazo',   'cm', '#00D4D4', true));
  medidasGrid.appendChild(crearGraficoMetrica(medidas, 'cintura', 'Cintura', 'cm', '#FF6B6B', true));
  graficosContainer.appendChild(medidasGrid);
  contenido.appendChild(graficosContainer);

  contenido.appendChild(crearSeccionHistorial(medidas, seguidoNivel, contenido));
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
  fechaLabel.className = 'seg-modal-fecha-label'; fechaLabel.textContent = '📅 Fecha';
  const fechaInput = document.createElement('input');
  fechaInput.type = 'date'; fechaInput.className = 'seg-modal-fecha-input';
  fechaInput.value = hoyISO();
  fechaContainer.append(fechaLabel, fechaInput);
  caja.appendChild(fechaContainer);

  // Campos de medida
  const campos = [
    { key:'peso',    label:'Peso',    placeholder:'kg',  icon:'⚖️' },
    { key:'altura',  label:'Altura',  placeholder:'cm',  icon:'📏' },
    { key:'brazo',   label:'Brazo',   placeholder:'cm',  icon:'💪' },
    { key:'cintura', label:'Cintura', placeholder:'cm',  icon:'⭕' },
  ];
  const inputs = {};
  campos.forEach(({ key, label, placeholder, icon }) => {
    const row = document.createElement('div');
    row.className = 'seg-modal-campo';
    const lbl = document.createElement('label');
    lbl.className = 'seg-modal-campo-label'; lbl.textContent = `${icon} ${label}`;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = '0.1'; inp.className = 'seg-modal-campo-input';
    inp.placeholder = placeholder;
    inputs[key] = inp;
    row.append(lbl, inp);
    caja.appendChild(row);
  });

  // Botones
  const botonesDiv = document.createElement('div');
  botonesDiv.className = 'seg-modal-botones';

  const btnGuardar = document.createElement('button');
  btnGuardar.className = 'btn-confirmacion-si'; btnGuardar.textContent = 'Guardar';
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

  const btnCancelar = document.createElement('button');
  btnCancelar.className = 'btn-confirmacion-no'; btnCancelar.textContent = 'Cancelar';
  btnCancelar.onclick = () => modal.remove();

  botonesDiv.append(btnGuardar, btnCancelar);
  caja.appendChild(botonesDiv);
  modal.appendChild(caja);
  document.body.appendChild(modal);
}
