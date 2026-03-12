// ==================== Dashboard (Nivel 0) ====================
export function renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton) {
  tituloNivel.textContent = 'Dashboard';
  backButton.style.visibility = 'hidden';
  addButton.style.visibility = 'hidden';
  contenido.innerHTML = '';

  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard-container-grid';
  contenido.appendChild(dashboard);

  // ==================== RECOLECTAR DATOS ====================
  const hoy = new Date();
  const hoyStr = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

  const sesiones = [];
  const ejerciciosTodos = [];
  const sesionesPorMes = {};
  const volumenPorSemana = [];

  datos[0]?.hijos?.forEach((meso, i) => {
    meso.hijos?.forEach((micro, j) => {
      micro.hijos?.forEach((sesion, k) => {
        let fechaSesion = sesion.fecha;
        if (!fechaSesion && sesion.hijos?.length > 0) {
          for (const sub of sesion.hijos) { if (sub.fecha) { fechaSesion = sub.fecha; break; } }
        }
        if (fechaSesion) {
          const mesKey = fechaSesion.slice(0, 7);
          sesionesPorMes[mesKey] = (sesionesPorMes[mesKey] || 0) + 1;
          sesiones.push({ fecha: fechaSesion, ejercicios: sesion.hijos || [], ruta: [i, j, k], nombre: sesion.nombre || 'Sesión sin nombre' });
        }
      });
    });
  });

  // Extraer ejercicios y volumen recursivamente
  const volumenPorFecha = {};
  const extraerEjercicios = (nodo, fecha, vol) => {
    if (!nodo) return vol;
    if (nodo.series?.length > 0) {
      let v = 0;
      nodo.series.forEach(s => { v += (parseFloat(s.peso) || 0) * (parseInt(s.reps) || 0); });
      vol += v;
      const pesoMax = Math.max(...nodo.series.map(s => parseFloat(s.peso) || 0), 0);
      if (pesoMax > 0 && nodo.nombre) ejerciciosTodos.push({ nombre: nodo.nombre, fecha, pesoMax, series: nodo.series });
    }
    nodo.hijos?.forEach(h => { vol = extraerEjercicios(h, fecha, vol); });
    return vol;
  };

  datos[0]?.hijos?.forEach(meso => {
    (meso.hijos || []).forEach(micro => {
      (micro.hijos || []).forEach(sesion => {
        let f = sesion.fecha;
        if (!f && sesion.hijos?.length > 0) { for (const s of sesion.hijos) { if (s.fecha) { f = s.fecha; break; } } }
        if (f) { const v = extraerEjercicios(sesion, f, 0); if (v > 0) volumenPorFecha[f] = (volumenPorFecha[f] || 0) + v; }
      });
    });
  });

  Object.keys(volumenPorFecha).forEach(fecha => {
    const d = new Date(fecha);
    const ini = new Date(d); ini.setDate(d.getDate() - d.getDay());
    const key = ini.toISOString().split('T')[0];
    const ex = volumenPorSemana.find(s => s.semana === key);
    if (ex) ex.volumen += volumenPorFecha[fecha];
    else volumenPorSemana.push({ semana: key, volumen: volumenPorFecha[fecha] });
  });

  // ── Stats base ──
  const totalSesiones = sesiones.length;
  const sesionesEsteMes = sesiones.filter(s => {
    const f = new Date(s.fecha);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  }).length;
  const ejerciciosUnicos = new Set(ejerciciosTodos.map(e => e.nombre)).size;
  const hace30Dias = new Date(); hace30Dias.setDate(hace30Dias.getDate() - 30);
  const volumenTotal = ejerciciosTodos
    .filter(e => new Date(e.fecha) >= hace30Dias)
    .reduce((sum, e) => sum + (e.series?.reduce((s, serie) => s + ((parseFloat(serie.peso) || 0) * (parseInt(serie.reps) || 0)), 0) || 0), 0);

  // Racha actual
  let racha = 0;
  let fechaRef = new Date(); fechaRef.setHours(0, 0, 0, 0);
  for (const s of [...sesiones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))) {
    const fs = new Date(s.fecha); fs.setHours(0, 0, 0, 0);
    const diff = Math.floor((fechaRef - fs) / 86400000);
    if (diff === racha || (racha === 0 && diff <= 1)) { racha++; fechaRef = fs; } else break;
  }

  // Mejor racha
  let mejorRacha = 0, rt = 0, fa = null;
  [...sesiones].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach(s => {
    const f = new Date(s.fecha); f.setHours(0, 0, 0, 0);
    rt = fa ? (Math.floor((f - fa) / 86400000) <= 1 ? rt + 1 : 1) : 1;
    if (rt > mejorRacha) mejorRacha = rt;
    fa = f;
  });

  const duracionEstimada = sesiones.length > 0
    ? Math.min(120, Math.max(30, Math.round((ejerciciosTodos.length / Math.max(sesiones.length, 1)) * 8)))
    : 0;

  // ==================== 1. RESUMEN GENERAL ====================
  const cardResumen = crearCard('Resumen General', 'full-width');
  const statsScroll = document.createElement('div');
  statsScroll.className = 'stats-scroll-row';

  [
    { icon: '🏋️', value: totalSesiones,   label: 'Sesiones totales' },
    { icon: '📅', value: sesionesEsteMes,  label: 'Este mes' },
    { icon: '💪', value: ejerciciosUnicos, label: 'Ejercicios distintos' },
    { icon: '⚖️', value: `${Math.round(volumenTotal)}<span class="stat-unit">kg</span>`, label: 'Volumen 30 días' },
    { icon: '🔥', value: racha,            label: 'Racha actual' },
    { icon: '🏅', value: mejorRacha,       label: 'Mejor racha' },
    { icon: '⏱️', value: sesiones.length > 0 ? `${duracionEstimada}<span class="stat-unit">min</span>` : '—', label: 'Duración est.' },
  ].forEach(s => {
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `<div class="stat-icon-emoji">${s.icon}</div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div>`;
    statsScroll.appendChild(item);
  });

  cardResumen.appendChild(statsScroll);
  dashboard.appendChild(cardResumen);

  // ==================== 2. CALENDARIO SEMANAL ====================
  const cardCalendario = crearCard('Esta Semana', '');
  let primerDiaSemana = new Date();
  const ds = primerDiaSemana.getDay();
  primerDiaSemana.setDate(primerDiaSemana.getDate() - (ds === 0 ? 6 : ds - 1));

  const calWrapper = document.createElement('div');
  calWrapper.className = 'calendario-wrapper';

  const mesEl = document.createElement('p');
  mesEl.className = 'nombre-mes';
  calWrapper.appendChild(mesEl);

  const filaContainer = document.createElement('div');
  filaContainer.className = 'fila-container';

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '‹'; btnPrev.className = 'week-nav';
  const btnNext = document.createElement('button');
  btnNext.textContent = '›'; btnNext.className = 'week-nav';
  const daysRow = document.createElement('div');
  daysRow.className = 'days-row';

  filaContainer.appendChild(btnPrev);
  filaContainer.appendChild(daysRow);
  filaContainer.appendChild(btnNext);
  calWrapper.appendChild(filaContainer);

  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-dia';
  calWrapper.appendChild(detalleDiv);

  const DIAS_LETRA  = ['L','M','X','J','V','S','D'];
  const DIAS_NOMBRE = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const MESES_UP    = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const MESES_MIN   = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  let diaSelStr = hoyStr;

  function fStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

function renderDetalle(fs, fd, sesionDia) {
  detalleDiv.innerHTML = '';
  const idx = fd.getDay() === 0 ? 6 : fd.getDay() - 1;

  const tit = document.createElement('div');
  tit.className = 'detalle-titulo';
  tit.textContent = `${DIAS_NOMBRE[idx]} ${fd.getDate()} de ${MESES_MIN[fd.getMonth()]}`;
  detalleDiv.appendChild(tit);

  if (sesionDia) {
    const btn = document.createElement('button');
    btn.textContent = sesionDia.nombre;
    btn.className = 'btn-sesion';
    btn.addEventListener('click', () => { rutaActual.length = 0; rutaActual.push(0, ...sesionDia.ruta); window.renderizar(); });
    detalleDiv.appendChild(btn);

    sesionDia.ejercicios.forEach(ej => {
      const p = document.createElement('div');
      p.className = 'detalle-ejercicio-item';

      // Calcular series totales, completadas y volumen
      const series = ej.series || [];
      const total = series.length;
      const completadas = series.filter(s => s.completada).length;
      const volumen = series.reduce((sum, s) => sum + ((parseFloat(s.peso) || 0) * (parseInt(s.reps) || 0)), 0);

      p.innerHTML = `
        <span class="det-ej-nombre">${ej.nombre || 'Ejercicio sin nombre'}</span>
        <span class="det-ej-stats">
          ${total > 0 ? `<span class="det-series ${completadas === total && total > 0 ? 'det-series--ok' : ''}">${completadas}/${total}</span>` : ''}
          ${volumen > 0 ? `<span class="det-vol">${Math.round(volumen)}<span class="det-vol-unit">kg</span></span>` : ''}
        </span>
      `;
      detalleDiv.appendChild(p);
    });
  } else {
    const v = document.createElement('div');
    v.className = 'detalle-empty';
    v.textContent = 'Sin entreno este día.';
    detalleDiv.appendChild(v);
  }
}

  function renderDias() {
    daysRow.innerHTML = '';
    mesEl.textContent = MESES_UP[new Date(primerDiaSemana).getMonth()];
    const hoyLocalStr = fStr(new Date());
    let btnHoy = null;

    for (let i = 0; i < 7; i++) {
      const fd = new Date(primerDiaSemana);
      fd.setDate(primerDiaSemana.getDate() + i);
      const fs = fStr(fd);
      const sesionDia = sesiones.find(s => s.fecha === fs);

      const btn = document.createElement('button');
      btn.className = 'day-btn';
      if (sesionDia)          btn.classList.add('done');
      if (fs === diaSelStr)   btn.classList.add('selected');
      if (fs === hoyLocalStr) btn.classList.add('today');

      btn.innerHTML = `<span class="day-letter">${DIAS_LETRA[i]}</span><span class="day-number">${fd.getDate()}</span><span class="day-dot"></span>`;
      btn.addEventListener('click', () => { diaSelStr = fs; renderDias(); renderDetalle(fs, fd, sesionDia); });

      if (fs === hoyLocalStr) btnHoy = btn;
      daysRow.appendChild(btn);
    }
    if (btnHoy) btnHoy.click();
  }

  btnPrev.addEventListener('click', () => { primerDiaSemana.setDate(primerDiaSemana.getDate()-7); detalleDiv.innerHTML=''; renderDias(); });
  btnNext.addEventListener('click', () => { primerDiaSemana.setDate(primerDiaSemana.getDate()+7); detalleDiv.innerHTML=''; renderDias(); });
  renderDias();
  cardCalendario.appendChild(calWrapper);
  dashboard.appendChild(cardCalendario);

  // ==================== 3. OBJETIVO MENSUAL ====================
  const cardObjetivo = crearCard('Objetivo Mensual', '');

  const rachaInner = document.createElement('div');
  rachaInner.className = 'racha-card-inner';
  rachaInner.innerHTML = `
    <div class="racha-big">🔥 ${racha}</div>
    <div class="racha-info">
      <div class="racha-label">Días en racha</div>
      <div class="racha-sub">Mejor racha: ${mejorRacha} días</div>
    </div>`;
  cardObjetivo.appendChild(rachaInner);

  const OBJ_SESIONES = 12;
  const OBJ_VOLUMEN  = 20000;
  const pctS = Math.min(100, Math.round((sesionesEsteMes / OBJ_SESIONES) * 100));
  const pctV = Math.min(100, Math.round((volumenTotal / OBJ_VOLUMEN) * 100));
  const volK = (Math.round(volumenTotal / 100) / 10).toFixed(1);

  const progBlock = document.createElement('div');
  progBlock.className = 'objetivo-progress-block';
  progBlock.innerHTML = `
    <div class="progress-label"><span>Sesiones este mes</span><span>${sesionesEsteMes} / ${OBJ_SESIONES}</span></div>
    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pctS}%"></div></div>
    <div class="progress-label"><span>Volumen 30 días</span><span>${volK}k / ${OBJ_VOLUMEN/1000}k kg</span></div>
    <div class="progress-bar-track"><div class="progress-bar-fill progress-bar-fill--cyan" style="width:${pctV}%"></div></div>`;
  cardObjetivo.appendChild(progBlock);
  dashboard.appendChild(cardObjetivo);

  // ==================== 4. FRECUENCIA MENSUAL ====================
  const cardFrecuencia = crearCard('Frecuencia Mensual', '');
  const chartFrecuencia = document.createElement('canvas');
  chartFrecuencia.className = 'dashboard-chart';
  cardFrecuencia.appendChild(chartFrecuencia);

  const mesesData = [];
  for (let i = 5; i >= 0; i--) {
    const f = new Date(); f.setMonth(f.getMonth() - i);
    const key   = f.getFullYear() + '-' + String(f.getMonth()+1).padStart(2,'0');
    const label = f.toLocaleDateString('es-ES', { month: 'short' });
    mesesData.push({ mes: label.charAt(0).toUpperCase() + label.slice(1), sesiones: sesionesPorMes[key] || 0, esActual: i === 0 });
  }

  if (window.Chart) {
    new Chart(chartFrecuencia, {
      type: 'bar',
      data: {
        labels: mesesData.map(m => m.mes),
        datasets: [{
          data: mesesData.map(m => m.sesiones),
          backgroundColor: mesesData.map(m => m.esActual ? 'rgba(61,213,152,0.95)' : 'rgba(61,213,152,0.4)'),
          borderColor: 'rgb(61,213,152)',
          borderWidth: 2, borderRadius: 8, borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: 'rgba(26,29,35,0.92)', padding: 10, callbacks: { label: ctx => `${ctx.parsed.y} sesiones` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 }, color: '#9ca3af' }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' }, color: '#6b7280' }, border: { display: false } }
        }
      }
    });
  }
  dashboard.appendChild(cardFrecuencia);

  // ==================== 5. VOLUMEN SEMANAL ====================
  const cardVolumen = crearCard('Volumen Semanal', '');
  const chartVolumen = document.createElement('canvas');
  chartVolumen.className = 'dashboard-chart';
  cardVolumen.appendChild(chartVolumen);

  volumenPorSemana.sort((a, b) => new Date(a.semana) - new Date(b.semana));
  const ultimasSemanas = volumenPorSemana.slice(-8);

  if (window.Chart && ultimasSemanas.length > 0) {
    const ctxV = chartVolumen.getContext('2d');
    const gradV = ctxV.createLinearGradient(0, 0, 0, 220);
    gradV.addColorStop(0, 'rgba(0,212,212,0.28)');
    gradV.addColorStop(1, 'rgba(0,212,212,0.02)');
    new Chart(ctxV, {
      type: 'line',
      data: {
        labels: ultimasSemanas.map(s => { const f = new Date(s.semana); return `${f.getDate()}/${f.getMonth()+1}`; }),
        datasets: [{
          data: ultimasSemanas.map(s => Math.round(s.volumen)),
          borderColor: 'rgb(0,212,212)', backgroundColor: gradV,
          borderWidth: 2.5, tension: 0.4, fill: true,
          pointRadius: 4, pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(0,212,212)', pointBorderColor: '#fff', pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: 'rgba(26,29,35,0.92)', padding: 10, callbacks: { label: ctx => { const v = ctx.parsed.y; return v >= 1000 ? `${(v/1000).toFixed(1)}k kg` : `${v} kg`; } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { font: { size: 11 }, color: '#9ca3af', callback: v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#6b7280' }, border: { display: false } }
        }
      }
    });
  } else {
    const msg = document.createElement('div');
    msg.className = 'empty-state';
    msg.textContent = 'Completa sesiones con series registradas para ver este gráfico.';
    cardVolumen.appendChild(msg);
  }
  dashboard.appendChild(cardVolumen);

  // ==================== 6. TOP EJERCICIOS ====================
  const cardTop = crearCard('Ejercicios Más Realizados', '');
  const ejerciciosCount = {};
  ejerciciosTodos.forEach(e => { ejerciciosCount[e.nombre] = (ejerciciosCount[e.nombre] || 0) + 1; });
  const topEjercicios = Object.entries(ejerciciosCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const listaTop = document.createElement('div');
  listaTop.className = 'top-ejercicios-lista';

  if (topEjercicios.length === 0) {
    listaTop.innerHTML = '<p class="empty-state">No hay ejercicios registrados aún</p>';
  } else {
    topEjercicios.forEach(([nombre, cantidad], i) => {
      const item = document.createElement('div');
      item.className = 'top-item';
      item.innerHTML = `<div class="top-rank">${i+1}</div><div class="top-nombre">${nombre}</div><div class="top-cantidad">${cantidad}×</div>`;
      listaTop.appendChild(item);
    });
  }
  cardTop.appendChild(listaTop);
  dashboard.appendChild(cardTop);

// ==================== 7. DISTRIBUCIÓN MUSCULAR ====================
const cardMuscular = crearCard('Distribución Muscular (30 días)', '');

const grupoKeywords = {
  'Pecho':   ['pecho','press','bench','fly','apert'],
  'Espalda': ['espalda','remo','jalón','pull','dominada','row','lat'],
  'Piernas': ['pierna','sentadilla','prensa','femoral','cuádric','zancada','squat','lunge','leg'],
  'Hombros': ['hombro','press militar','elevación','deltoid','shoulder'],
  'Bíceps':  ['bíceps','bicep','curl'],
  'Tríceps': ['tríceps','tricep','extensión','dips'],
  'Core':    ['abdomen','core','plancha','crunch','oblicuo'],
};
const musculoCounts = {};
Object.keys(grupoKeywords).forEach(g => musculoCounts[g] = 0);

ejerciciosTodos.filter(e => new Date(e.fecha) >= hace30Dias).forEach(e => {
  const nl = (e.nombre || '').toLowerCase();
  for (const [g, kws] of Object.entries(grupoKeywords)) {
    if (kws.some(k => nl.includes(k))) { musculoCounts[g]++; break; }
  }
});

const maxM = Math.max(...Object.values(musculoCounts), 1);

// Colores por intensidad (de transparente a verde)
function muscleColor(grupo) {
  const count = musculoCounts[grupo] || 0;
  const pct = count / maxM;
  if (pct === 0) return 'rgba(180,180,180,0.15)';
  const alpha = 0.25 + pct * 0.75;
  return `rgba(61,213,152,${alpha.toFixed(2)})`;
}
function muscleStroke(grupo) {
  const count = musculoCounts[grupo] || 0;
  return count > 0 ? 'rgba(61,213,152,0.8)' : 'rgba(150,150,150,0.2)';
}
function musclePct(grupo) {
  const count = musculoCounts[grupo] || 0;
  return count > 0 ? Math.round((count / maxM) * 100) + '%' : null;
}

const muscleWrapper = document.createElement('div');
muscleWrapper.className = 'muscle-body-wrapper';

// SVG del cuerpo humano con grupos musculares como paths
muscleWrapper.innerHTML = `
<div class="muscle-body-container">
  <div class="muscle-body-side">
    <div class="muscle-side-label">FRONTAL</div>
    <svg viewBox="0 0 120 260" class="muscle-svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Cabeza -->
      <ellipse cx="60" cy="18" rx="13" ry="16" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1.2"/>
      <!-- Cuello -->
      <rect x="54" y="32" width="12" height="10" rx="3" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- Torso base -->
      <path d="M35,42 Q60,38 85,42 L88,110 Q60,115 32,110 Z" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- PECHO -->
      <path d="M37,44 Q50,41 60,43 Q60,43 60,60 Q50,63 37,60 Z"
        fill="${muscleColor('Pecho')}" stroke="${muscleStroke('Pecho')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Pecho"/>
      <path d="M83,44 Q70,41 60,43 Q60,43 60,60 Q70,63 83,60 Z"
        fill="${muscleColor('Pecho')}" stroke="${muscleStroke('Pecho')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Pecho"/>
      <!-- HOMBROS front -->
      <ellipse cx="31" cy="50" rx="8" ry="11"
        fill="${muscleColor('Hombros')}" stroke="${muscleStroke('Hombros')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Hombros"/>
      <ellipse cx="89" cy="50" rx="8" ry="11"
        fill="${muscleColor('Hombros')}" stroke="${muscleStroke('Hombros')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Hombros"/>
      <!-- BÍCEPS front -->
      <path d="M19,61 Q14,72 16,85 Q22,88 27,85 Q25,72 24,61 Z"
        fill="${muscleColor('Bíceps')}" stroke="${muscleStroke('Bíceps')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Bíceps"/>
      <path d="M101,61 Q106,72 104,85 Q98,88 93,85 Q95,72 96,61 Z"
        fill="${muscleColor('Bíceps')}" stroke="${muscleStroke('Bíceps')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Bíceps"/>
      <!-- TRÍCEPS front (lateral del brazo) -->
      <path d="M16,85 Q13,98 15,108 Q20,110 24,108 Q22,96 22,85 Z"
        fill="${muscleColor('Tríceps')}" stroke="${muscleStroke('Tríceps')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Tríceps"/>
      <path d="M104,85 Q107,98 105,108 Q100,110 96,108 Q98,96 98,85 Z"
        fill="${muscleColor('Tríceps')}" stroke="${muscleStroke('Tríceps')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Tríceps"/>
      <!-- CORE / ABS -->
      <path d="M42,63 Q60,60 78,63 L76,108 Q60,112 44,108 Z"
        fill="${muscleColor('Core')}" stroke="${muscleStroke('Core')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Core"/>
      <!-- Línea alba y separaciones abs -->
      <line x1="60" y1="63" x2="60" y2="108" stroke="${muscleCounts['Core']>0?'rgba(61,213,152,0.4)':'rgba(150,150,150,0.15)'}" stroke-width="0.8"/>
      <line x1="44" y1="75" x2="76" y2="75" stroke="${muscleCounts['Core']>0?'rgba(61,213,152,0.4)':'rgba(150,150,150,0.15)'}" stroke-width="0.8"/>
      <line x1="44" y1="88" x2="76" y2="88" stroke="${muscleCounts['Core']>0?'rgba(61,213,152,0.4)':'rgba(150,150,150,0.15)'}" stroke-width="0.8"/>
      <line x1="44" y1="100" x2="76" y2="100" stroke="${muscleCounts['Core']>0?'rgba(61,213,152,0.4)':'rgba(150,150,150,0.15)'}" stroke-width="0.8"/>
      <!-- PIERNAS front — cuádriceps -->
      <path d="M36,112 Q30,135 31,162 Q40,167 50,163 Q54,138 52,112 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Piernas"/>
      <path d="M84,112 Q90,135 89,162 Q80,167 70,163 Q66,138 68,112 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Piernas"/>
      <!-- Gemelos front -->
      <path d="M31,164 Q28,182 30,200 Q37,203 44,200 Q46,182 50,164 Z"
        fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <path d="M89,164 Q92,182 90,200 Q83,203 76,200 Q74,182 70,164 Z"
        fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- Pies -->
      <ellipse cx="37" cy="206" rx="10" ry="6" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <ellipse cx="83" cy="206" rx="10" ry="6" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- Antebrazos -->
      <path d="M15,108 Q11,124 13,136 Q18,138 22,136 Q24,124 22,108 Z" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <path d="M105,108 Q109,124 107,136 Q102,138 98,136 Q96,124 98,108 Z" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- Manos -->
      <ellipse cx="15" cy="141" rx="5" ry="7" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <ellipse cx="105" cy="141" rx="5" ry="7" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>

      ${['Pecho','Hombros','Bíceps','Core','Piernas'].filter(g => musculoPct(g)).map(g => {
        const positions = { 'Pecho':'60,52', 'Hombros':'60,44', 'Bíceps':'60,73', 'Core':'60,84', 'Piernas':'60,138' };
        const [px,py] = (positions[g]||'60,50').split(',');
        return `<text x="${px}" y="${py}" class="muscle-label-pct" text-anchor="middle">${musclePct(g)}</text>`;
      }).join('')}
    </svg>
  </div>

  <div class="muscle-body-side">
    <div class="muscle-side-label">POSTERIOR</div>
    <svg viewBox="0 0 120 260" class="muscle-svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Cabeza -->
      <ellipse cx="60" cy="18" rx="13" ry="16" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1.2"/>
      <!-- Cuello -->
      <rect x="54" y="32" width="12" height="10" rx="3" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- Torso base -->
      <path d="M35,42 Q60,38 85,42 L88,110 Q60,115 32,110 Z" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- ESPALDA / DORSALES -->
      <path d="M37,44 Q48,41 60,43 L58,80 Q46,85 36,78 Z"
        fill="${muscleColor('Espalda')}" stroke="${muscleStroke('Espalda')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Espalda"/>
      <path d="M83,44 Q72,41 60,43 L62,80 Q74,85 84,78 Z"
        fill="${muscleColor('Espalda')}" stroke="${muscleStroke('Espalda')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Espalda"/>
      <!-- Trapecio -->
      <path d="M47,38 Q60,34 73,38 Q60,46 47,38 Z"
        fill="${muscleColor('Hombros')}" stroke="${muscleStroke('Hombros')}" stroke-width="1"
        class="muscle-path" data-grupo="Hombros"/>
      <!-- Espalda baja / lumbar -->
      <path d="M42,80 Q60,85 78,80 L76,110 Q60,114 44,110 Z"
        fill="${muscleColor('Espalda')}" stroke="${muscleStroke('Espalda')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Espalda"/>
      <!-- HOMBROS posterior -->
      <ellipse cx="31" cy="50" rx="8" ry="11"
        fill="${muscleColor('Hombros')}" stroke="${muscleStroke('Hombros')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Hombros"/>
      <ellipse cx="89" cy="50" rx="8" ry="11"
        fill="${muscleColor('Hombros')}" stroke="${muscleStroke('Hombros')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Hombros"/>
      <!-- TRÍCEPS posterior -->
      <path d="M19,61 Q13,74 15,87 Q21,90 26,87 Q25,74 24,61 Z"
        fill="${muscleColor('Tríceps')}" stroke="${muscleStroke('Tríceps')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Tríceps"/>
      <path d="M101,61 Q107,74 105,87 Q99,90 94,87 Q95,74 96,61 Z"
        fill="${muscleColor('Tríceps')}" stroke="${muscleStroke('Tríceps')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Tríceps"/>
      <!-- Antebrazos -->
      <path d="M15,108 Q11,124 13,136 Q18,138 22,136 Q24,124 22,108 Z" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <path d="M105,108 Q109,124 107,136 Q102,138 98,136 Q96,124 98,108 Z" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- Manos -->
      <ellipse cx="15" cy="141" rx="5" ry="7" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <ellipse cx="105" cy="141" rx="5" ry="7" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <!-- PIERNAS posterior — femorales/glúteos -->
      <path d="M36,112 Q30,136 32,162 Q41,167 50,163 Q53,138 52,112 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Piernas"/>
      <path d="M84,112 Q90,136 88,162 Q79,167 70,163 Q67,138 68,112 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Piernas"/>
      <!-- Glúteos -->
      <path d="M36,110 Q44,107 52,110 Q52,122 44,125 Q36,122 36,110 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1" opacity="0.7"/>
      <path d="M84,110 Q76,107 68,110 Q68,122 76,125 Q84,122 84,110 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1" opacity="0.7"/>
      <!-- Gemelos -->
      <path d="M31,164 Q27,182 30,200 Q37,204 44,200 Q47,182 50,164 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Piernas" opacity="0.7"/>
      <path d="M89,164 Q93,182 90,200 Q83,204 76,200 Q73,182 70,164 Z"
        fill="${muscleColor('Piernas')}" stroke="${muscleStroke('Piernas')}" stroke-width="1.2"
        class="muscle-path" data-grupo="Piernas" opacity="0.7"/>
      <!-- Pies -->
      <ellipse cx="37" cy="206" rx="10" ry="6" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>
      <ellipse cx="83" cy="206" rx="10" ry="6" fill="var(--bg-main)" stroke="var(--border-color)" stroke-width="1"/>

      ${['Espalda','Hombros','Tríceps','Piernas'].filter(g => musclePct(g)).map(g => {
        const positions = { 'Espalda':'60,62', 'Hombros':'60,44', 'Tríceps':'60,74', 'Piernas':'60,138' };
        const [px,py] = (positions[g]||'60,50').split(',');
        return `<text x="${px}" y="${py}" class="muscle-label-pct" text-anchor="middle">${musclePct(g)}</text>`;
      }).join('')}
    </svg>
  </div>
</div>

<!-- Leyenda -->
<div class="muscle-legend">
  ${Object.entries(musculoCounts).map(([g, c]) => `
    <div class="muscle-legend-item">
      <span class="muscle-legend-dot" style="background:${c>0?muscleColor(g):'rgba(150,150,150,0.2)'}; border: 1px solid ${muscleStroke(g)}"></span>
      <span class="muscle-legend-name">${g}</span>
      <span class="muscle-legend-count">${c > 0 ? c + '×' : '—'}</span>
    </div>
  `).join('')}
</div>
`;

cardMuscular.appendChild(muscleWrapper);
dashboard.appendChild(cardMuscular);

  // ==================== 8. RÉCORDS PERSONALES ====================
  const cardRecords = crearCard('🏆 Récords Personales', '');
  const prPorEjercicio = {};
  ejerciciosTodos.forEach(e => {
    if (!prPorEjercicio[e.nombre] || e.pesoMax > prPorEjercicio[e.nombre].peso)
      prPorEjercicio[e.nombre] = { peso: e.pesoMax, fecha: e.fecha };
  });
  const topPRs = Object.entries(prPorEjercicio).sort((a, b) => b[1].peso - a[1].peso).slice(0, 5);
  const prList = document.createElement('div');
  prList.className = 'pr-list';

  if (topPRs.length === 0) {
    prList.innerHTML = '<p class="empty-state">Aún no hay registros de peso</p>';
  } else {
    topPRs.forEach(([nombre, data]) => {
      const fechaLabel = new Date(data.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      const item = document.createElement('div');
      item.className = 'pr-item';
      item.innerHTML = `
        <div><div class="pr-name">${nombre}</div><div class="pr-date">${fechaLabel}</div></div>
        <div class="pr-weight">${data.peso} kg</div>`;
      prList.appendChild(item);
    });
  }
  cardRecords.appendChild(prList);
  dashboard.appendChild(cardRecords);

  // ==================== 9. PROGRESO DE EJERCICIO ====================
  const cardProgreso = crearCard('Progreso de Ejercicio', '');
  const selectorEjercicio = document.createElement('select');
  selectorEjercicio.className = 'selector-ejercicio';

  const nombresUnicos = [...new Set(ejerciciosTodos.map(e => e.nombre))].sort();
  nombresUnicos.forEach(nombre => {
    const opt = document.createElement('option');
    opt.value = nombre; opt.textContent = nombre;
    selectorEjercicio.appendChild(opt);
  });
  cardProgreso.appendChild(selectorEjercicio);

  const chartProgreso = document.createElement('canvas');
  chartProgreso.className = 'dashboard-chart dashboard-chart--mt';
  cardProgreso.appendChild(chartProgreso);

  function renderizarProgreso(nombre) {
    const datosEj = ejerciciosTodos
      .filter(e => e.nombre === nombre)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-10);
    const data = datosEj.map(e => ({ x: new Date(e.fecha), y: e.pesoMax }));

    if (chartProgreso.chartInstance) chartProgreso.chartInstance.destroy();

    if (window.Chart && data.length > 0) {
      const ctxP = chartProgreso.getContext('2d');
      const gradP = ctxP.createLinearGradient(0, 0, 0, 200);
      gradP.addColorStop(0, 'rgba(255,107,107,0.25)');
      gradP.addColorStop(1, 'rgba(255,107,107,0.02)');

      chartProgreso.chartInstance = new Chart(ctxP, {
        type: 'line',
        data: {
          datasets: [{
            data,
            borderColor: 'rgb(255,107,107)', backgroundColor: gradP,
            borderWidth: 2.5, tension: 0.35, fill: true,
            pointRadius: 5, pointHoverRadius: 8,
            pointBackgroundColor: 'rgb(255,107,107)', pointBorderColor: '#fff', pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: 'rgba(26,29,35,0.92)', padding: 10, callbacks: { label: ctx => `${ctx.parsed.y} kg` } }
          },
          scales: {
            x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd/MM', displayFormats: { day: 'dd/MM' } }, grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#6b7280' }, border: { display: false } },
            y: { beginAtZero: false, ticks: { font: { size: 11 }, color: '#9ca3af', callback: v => `${v}kg` }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } }
          }
        }
      });
    } else {
      const ctx = chartProgreso.getContext('2d');
      ctx.clearRect(0, 0, chartProgreso.width, chartProgreso.height);
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText('No hay datos suficientes', chartProgreso.width / 2, chartProgreso.height / 2);
    }
  }

  selectorEjercicio.addEventListener('change', e => renderizarProgreso(e.target.value));
  if (nombresUnicos.length > 0) setTimeout(() => renderizarProgreso(nombresUnicos[0]), 100);
  dashboard.appendChild(cardProgreso);
}

// ==================== HELPER ====================
function crearCard(titulo, extraClass = '') {
  const card = document.createElement('div');
  card.className = `dashboard-card ${extraClass}`;
  const h = document.createElement('h3');
  h.className = 'card-title';
  h.textContent = titulo;
  card.appendChild(h);
  return card;
}