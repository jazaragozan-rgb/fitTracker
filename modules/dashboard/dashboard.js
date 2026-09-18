// ============================================================
// modules/dashboard/dashboard.js
// Renderizado del Dashboard (nivel 0).
// ============================================================

import { auth, db } from '../../core/firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { hoyISO, formatearFechaCorta, calcularVolumen, calcular1RM, redondear } from '../../shared/utils.js';

function crearCard(titulo, extraClass = '') {
  const card = document.createElement('div');
  card.className = `dashboard-card${extraClass ? ' ' + extraClass : ''}`;
  if (titulo) {
    const h = document.createElement('div');
    h.className = 'card-titulo';
    h.textContent = titulo;
    card.appendChild(h);
  }
  return card;
}

function _getDisplayName() {
  const user = auth.currentUser;
  if (!user) return 'Usuario';
  const base = user.displayName || user.email?.split('@')[0] || 'Usuario';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function _obtenerFechaSesionMasReciente(nodo) {
  if (!nodo) return null;

  if (nodo.fecha) {
    const fecha = new Date(`${nodo.fecha}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  if (Array.isArray(nodo.hijos)) {
    let fechaMasReciente = null;
    for (const hijo of nodo.hijos) {
      const fecha = _obtenerFechaSesionMasReciente(hijo);
      if (fecha && (!fechaMasReciente || fecha > fechaMasReciente)) {
        fechaMasReciente = fecha;
      }
    }
    return fechaMasReciente;
  }

  return null;
}

function _getRutinaActiva(datos) {
  const mesociclos = datos[0]?.hijos || [];
  let rutinaActiva = null;
  let ultimaFecha = null;
  let mesocicloActivo = -1;

  mesociclos.forEach((meso, indice) => {
    if (!Array.isArray(meso?.hijos)) return;

    meso.hijos.forEach(micro => {
      if (!Array.isArray(micro?.hijos)) return;

      micro.hijos.forEach(sesion => {
        const fecha = _obtenerFechaSesionMasReciente(sesion);
        if (!fecha) return;

        if (!ultimaFecha || fecha > ultimaFecha) {
          ultimaFecha = fecha;
          rutinaActiva = meso?.nombre || 'Sin nombre';
          mesocicloActivo = indice;
        }
      });
    });
  });

  return {
    nombre: rutinaActiva || mesociclos[0]?.nombre || null,
    fecha: ultimaFecha,
    indice: mesocicloActivo >= 0 ? mesocicloActivo : (mesociclos.length ? 0 : -1)
  };
}

// ── Exportación principal ─────────────────────────────────────
// Recibe renderizarFn para que los botones del calendario puedan navegar
export async function renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton, renderizarFn) {
  if (tituloNivel) tituloNivel.textContent = 'Dashboard';
  if (backButton)  backButton.style.visibility = 'hidden';
  if (addButton)   addButton.style.visibility  = 'hidden';
  contenido.innerHTML = '';

  // Usar renderizarFn recibido, o window.renderizar como fallback
  const renderizar = renderizarFn || window.renderizar;

  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard-container-grid';
  contenido.appendChild(dashboard);

  // ── Recolectar datos ────────────────────────────────────────
  const hoy        = new Date();
  const hoyStr     = hoyISO();
  const hace30Dias = new Date(); hace30Dias.setDate(hoy.getDate() - 30);

  const sesiones        = [];
  const ejerciciosTodos = [];
  const volumenPorSemana = [];
  const volumenPorFecha  = {};

  const extraerEjercicios = (nodo, fecha) => {
    if (!nodo) return 0;
    let vol = 0;
    if (nodo.series?.length > 0) {
      vol = calcularVolumen(nodo.series);
      const pesoMax = Math.max(...nodo.series.map(s => parseFloat(s.peso) || 0), 0);
      if (pesoMax > 0 && nodo.nombre) {
        ejerciciosTodos.push({ nombre: nodo.nombre, fecha, pesoMax, series: nodo.series });
      }
    }
    (nodo.hijos || []).forEach(h => { vol += extraerEjercicios(h, fecha); });
    return vol;
  };

  datos[0]?.hijos?.forEach((meso, i) => {
    meso.hijos?.forEach((micro, j) => {
      micro.hijos?.forEach((sesion, k) => {
        let fecha = sesion.fecha;
        if (!fecha && sesion.hijos?.length > 0) {
          for (const sub of sesion.hijos) { if (sub.fecha) { fecha = sub.fecha; break; } }
        }
        if (fecha) {
          sesiones.push({ fecha, ejercicios: sesion.hijos || [], ruta: [i, j, k], nombre: sesion.nombre || 'Sesión sin nombre' });
          const vol = extraerEjercicios(sesion, fecha);
          if (vol > 0) volumenPorFecha[fecha] = (volumenPorFecha[fecha] || 0) + vol;
        }
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

  // ── Stats base ──────────────────────────────────────────────
  const totalSesiones   = sesiones.length;
  const inicioSemana = new Date(hoy);
  const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
  inicioSemana.setDate(hoy.getDate() - diaSemana);
  inicioSemana.setHours(0, 0, 0, 0);
  const inicioSemanaAnterior = new Date(inicioSemana);
  inicioSemanaAnterior.setDate(inicioSemana.getDate() - 7);
  const finSemanaAnterior = new Date(inicioSemana);
  finSemanaAnterior.setMilliseconds(-1);
  const sesionesEsteMes = sesiones.filter(s => {
    const f = new Date(s.fecha);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  }).length;
  const sesionesMesAnterior = sesiones.filter(s => {
    const f = new Date(s.fecha);
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    return f.getMonth() === mesAnterior.getMonth() && f.getFullYear() === mesAnterior.getFullYear();
  }).length;
  const sesionesEstaSemana = sesiones.filter(s => new Date(`${s.fecha}T00:00:00`) >= inicioSemana).length;
  const sesionesSemanaAnterior = sesiones.filter(s => {
    const fecha = new Date(`${s.fecha}T00:00:00`);
    return fecha >= inicioSemanaAnterior && fecha <= finSemanaAnterior;
  }).length;
  const ejerciciosUnicos = new Set(ejerciciosTodos.map(e => e.nombre)).size;
  const volumenTotal = ejerciciosTodos
    .filter(e => new Date(e.fecha) >= hace30Dias)
    .reduce((sum, e) => sum + calcularVolumen(e.series || []), 0);
  const volumenPeriodoAnterior = ejerciciosTodos
    .filter(e => {
      const fecha = new Date(e.fecha);
      return fecha >= new Date(hace30Dias.getTime() - 30 * 86400000) && fecha < hace30Dias;
    })
    .reduce((sum, e) => sum + calcularVolumen(e.series || []), 0);
  const porcentajeCambio = (actual, anterior) => anterior > 0
    ? Math.round(((actual - anterior) / anterior) * 100)
    : 0;

  let racha = 0, fechaRef = new Date(); fechaRef.setHours(0, 0, 0, 0);
  for (const s of [...sesiones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))) {
    const fs = new Date(s.fecha); fs.setHours(0, 0, 0, 0);
    const diff = Math.floor((fechaRef - fs) / 86400000);
    if (diff === racha || (racha === 0 && diff <= 1)) { racha++; fechaRef = fs; } else break;
  }

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

  // ── 1. DASHBOARD HERO ──────────────────────────────────────
  const cardHero = crearCard('', 'hero');
  cardHero.innerHTML = `
    <div class="dashboard-hero-title">Hola ${_getDisplayName()}!</div>
    <div class="dashboard-hero-subtitle">La constancia de hoy,<br>es el progreso de mañana.</div>
    <div class="dashboard-stats-grid">
      <div class="dashboard-stat-card dashboard-stat-card-sessions">
        <div class="dashboard-stat-icon">🏋️</div>
        <div class="dashboard-stat-value">${totalSesiones}</div>
        <div class="dashboard-stat-label">Sesiones totales</div>
        <div class="dashboard-stat-trend">↗ <span>+${porcentajeCambio(sesionesEsteMes, sesionesMesAnterior)}% vs. mes anterior</span></div>
      </div>
      <div class="dashboard-stat-card dashboard-stat-card-week">
        <div class="dashboard-stat-icon">▣</div>
        <div class="dashboard-stat-value">${sesionesEstaSemana}</div>
        <div class="dashboard-stat-label">ESTA SEMANA</div>
        <div class="dashboard-stat-trend">↗ <span>+${sesionesEstaSemana - sesionesSemanaAnterior} vs. semana anterior</span></div>
      </div>
      <div class="dashboard-stat-card dashboard-stat-card-streak">
        <div class="dashboard-stat-icon">🔥</div>
        <div class="dashboard-stat-value">${racha}</div>
        <div class="dashboard-stat-label">Racha actual</div>
        <div class="dashboard-stat-trend">🔥 <span>¡Sigue así!</span></div>
      </div>
      <div class="dashboard-stat-card dashboard-stat-card-volume">
        <div class="dashboard-stat-icon">kg</div>
        <div class="dashboard-stat-value">${Math.round(volumenTotal)}<span class="stat-unit">kg</span></div>
        <div class="dashboard-stat-label">Volumen total</div>
        <div class="dashboard-stat-trend">↗ <span>+${porcentajeCambio(volumenTotal, volumenPeriodoAnterior)}% vs. mes anterior</span></div>
      </div>
    </div>
  `;
  dashboard.appendChild(cardHero);

  const cardRutina = crearCard('Última rutina activa', 'rutina-activa');
  const rutinaActiva = _getRutinaActiva(datos);
  const nombreRutina = rutinaActiva.nombre || 'Sin rutina activa';
  const fechaRutina = rutinaActiva.fecha
    ? rutinaActiva.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '--/--/----';
  cardRutina.innerHTML = `
    <div class="rutina-activa-main">
      <div class="rutina-activa-icon" aria-hidden="true">🏋️</div>
      <div class="rutina-activa-copy">
        <div class="rutina-activa-kicker">Última rutina activa</div>
        <div class="rutina-activa-title">${nombreRutina}</div>
        <div class="rutina-activa-date">${fechaRutina}</div>
      </div>
    </div>
    <div class="rutina-activa-footer">
      <div class="rutina-activa-progress" role="progressbar" aria-label="Progreso de la rutina" aria-valuemin="0" aria-valuemax="100" aria-valuenow="58">
        <span></span>
      </div>
      <button class="rutina-activa-button" type="button">Continuar <span aria-hidden="true">›</span></button>
    </div>
  `;
  cardRutina.querySelector('.rutina-activa-button').addEventListener('click', () => {
    if (rutinaActiva.indice < 0 || typeof renderizar !== 'function') return;
    rutaActual.length = 0;
    rutaActual.push(0, rutinaActiva.indice);
    renderizar();
  });
  dashboard.appendChild(cardRutina);

  // ── 2. CALENDARIO SEMANAL ───────────────────────────────────
  _renderCardCalendario(dashboard, sesiones, crearCard, rutaActual, renderizar);

  // ── 3. NUTRICIÓN COMPACTA ───────────────────────────────────
  const nivelNutricion = datos[3];
  await _renderCardNutricionCompacta(dashboard, nivelNutricion || { hijos: [] }, crearCard, hoyStr);

  // ── 4. FRECUENCIA MENSUAL ───────────────────────────────────
  const cardFrecuencia = crearCard('Frecuencia Mensual', 'dashboard-chart-card');
  const chartFrecuencia = document.createElement('canvas');
  chartFrecuencia.className = 'dashboard-chart';
  const navFrecuencia = document.createElement('div');
  navFrecuencia.className = 'dashboard-chart-nav';
  navFrecuencia.innerHTML = '<button type="button" class="dashboard-chart-nav-btn" aria-label="Mes anterior">‹</button><span></span><button type="button" class="dashboard-chart-nav-btn" aria-label="Mes siguiente">›</button>';
  cardFrecuencia.appendChild(navFrecuencia);
  const navFrecuenciaLabel = navFrecuencia.querySelector('span');
  const navFrecuenciaPrev = navFrecuencia.querySelector('button:first-child');
  const navFrecuenciaNext = navFrecuencia.querySelector('button:last-child');
  cardFrecuencia.appendChild(chartFrecuencia);
  const obtenerSemanaISO = fecha => {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dia = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dia);
    const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - inicioAnio) / 86400000) + 1) / 7);
  };
  const pluginValoresBarras = {
    id: 'pluginValoresBarras',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.fillStyle = '#102A43';
      ctx.font = '700 11px sans-serif';
      ctx.textAlign = 'center';
      meta.data.forEach((barra, indice) => {
        ctx.fillText(String(chart.data.datasets[0].data[indice]), barra.x, barra.y - 8);
      });
      ctx.restore();
    }
  };
  let frecuenciaChart = null;
  let frecuenciaOffset = 0;
  const renderizarFrecuencia = () => {
    const fechaMes = new Date(hoy.getFullYear(), hoy.getMonth() + frecuenciaOffset, 1);
    const inicioMes = new Date(fechaMes.getFullYear(), fechaMes.getMonth(), 1);
    const finMes = new Date(fechaMes.getFullYear(), fechaMes.getMonth() + 1, 0);
    const semanasMes = new Map();
    for (let dia = new Date(inicioMes); dia <= finMes; dia.setDate(dia.getDate() + 1)) {
      const semana = obtenerSemanaISO(dia);
      if (!semanasMes.has(semana)) semanasMes.set(semana, new Set());
    }
    sesiones.forEach(sesion => {
      const fecha = new Date(`${sesion.fecha}T00:00:00`);
      if (fecha.getFullYear() !== fechaMes.getFullYear() || fecha.getMonth() !== fechaMes.getMonth()) return;
      const semana = obtenerSemanaISO(fecha);
      if (semanasMes.has(semana)) semanasMes.get(semana).add(sesion.fecha);
    });
    const frecuenciaSemanal = [...semanasMes.entries()].map(([semana, dias]) => ({ semana, dias: dias.size, label: `S${semana}` }));
    navFrecuenciaLabel.textContent = fechaMes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    navFrecuenciaNext.disabled = frecuenciaOffset >= 0;
    if (!window.Chart) return;
    if (frecuenciaChart) frecuenciaChart.destroy();
    frecuenciaChart = new window.Chart(chartFrecuencia.getContext('2d'), {
      type: 'bar',
      data: {
        labels: frecuenciaSemanal.map(semana => semana.label),
        datasets: [{ data: frecuenciaSemanal.map(semana => semana.dias),
          backgroundColor: 'rgba(22,131,255,0.72)',
          borderColor: '#1683FF', borderWidth: 1, borderRadius: 7, borderSkipped: false,
          maxBarThickness: 34 }]
      },
      plugins: [pluginValoresBarras],
      options: { responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 18, right: 4, left: 0, bottom: 0 } },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(16,42,67,0.94)', padding: 10, callbacks: { label: ctx => `${ctx.parsed.y} días de entrenamiento` } } },
        scales: { y: { beginAtZero: true, suggestedMax: Math.max(...frecuenciaSemanal.map(semana => semana.dias), 1) + 1, ticks: { stepSize:1, font:{size:11}, color:'#64748b', precision:0 }, grid:{color:'rgba(16,42,67,0.06)'}, border:{display:false} },
                  x: { grid:{display:false}, ticks:{font:{size:11,weight:'700'}, color:'#475569'}, border:{display:false} } } }
    });
  };
  navFrecuenciaPrev.addEventListener('click', () => { frecuenciaOffset -= 1; renderizarFrecuencia(); });
  navFrecuenciaNext.addEventListener('click', () => { if (frecuenciaOffset < 0) { frecuenciaOffset += 1; renderizarFrecuencia(); } });
  renderizarFrecuencia();
  dashboard.appendChild(cardFrecuencia);

  // ── 4. VOLUMEN SEMANAL ──────────────────────────────────────
  const cardVolumen = crearCard('Volumen Semanal', 'dashboard-chart-card');
  const chartVolumen = document.createElement('canvas');
  chartVolumen.className = 'dashboard-chart';
  const navVolumen = document.createElement('div');
  navVolumen.className = 'dashboard-chart-nav';
  navVolumen.innerHTML = '<button type="button" class="dashboard-chart-nav-btn" aria-label="Semanas anteriores">‹</button><span></span><button type="button" class="dashboard-chart-nav-btn" aria-label="Semanas siguientes">›</button>';
  cardVolumen.appendChild(navVolumen);
  const navVolumenLabel = navVolumen.querySelector('span');
  const navVolumenPrev = navVolumen.querySelector('button:first-child');
  const navVolumenNext = navVolumen.querySelector('button:last-child');
  cardVolumen.appendChild(chartVolumen);
  const semanasVolumen = [...volumenPorSemana].sort((a,b) => new Date(a.semana)-new Date(b.semana));
  let volumenChart = null;
  let volumenOffset = 0;
  const renderizarVolumen = () => {
    if (!semanasVolumen.length) {
      navVolumenLabel.textContent = 'Sin datos';
      navVolumenPrev.disabled = true;
      navVolumenNext.disabled = true;
      return;
    }
    const fin = Math.max(7, Math.min(semanasVolumen.length - 1, semanasVolumen.length - 1 + volumenOffset * 8));
    const inicio = Math.max(0, fin - 7);
    const ultimasSemanas = semanasVolumen.slice(inicio, fin + 1);
    const primera = new Date(`${ultimasSemanas[0].semana}T00:00:00`);
    const ultima = new Date(`${ultimasSemanas[ultimasSemanas.length - 1].semana}T00:00:00`);
    navVolumenLabel.textContent = `${primera.toLocaleDateString('es-ES', { day:'numeric', month:'short' })} - ${ultima.toLocaleDateString('es-ES', { day:'numeric', month:'short' })}`;
    navVolumenPrev.disabled = inicio === 0;
    navVolumenNext.disabled = fin >= semanasVolumen.length - 1;
    if (!window.Chart) return;
    if (volumenChart) volumenChart.destroy();
    const ctxV = chartVolumen.getContext('2d');
    const gradV = ctxV.createLinearGradient(0,0,0,220);
    gradV.addColorStop(0,'rgba(0,212,212,0.28)'); gradV.addColorStop(1,'rgba(0,212,212,0.02)');
    volumenChart = new window.Chart(ctxV, {
      type: 'line',
      data: { labels: ultimasSemanas.map(s => `S${obtenerSemanaISO(new Date(`${s.semana}T00:00:00`))}`),
              datasets: [{ data: ultimasSemanas.map(s => Math.round(s.volumen)), borderColor:'rgb(0,212,212)', backgroundColor:gradV,
                borderWidth:2.5, tension:0.4, fill:true, pointRadius:4, pointHoverRadius:7,
                pointBackgroundColor:'rgb(0,212,212)', pointBorderColor:'#fff', pointBorderWidth:2 }] },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{backgroundColor:'rgba(26,29,35,0.92)',padding:10, callbacks:{label:ctx=>{ const v=ctx.parsed.y; return v>=1000?`${(v/1000).toFixed(1)}k kg`:`${v} kg`; }}} },
        scales:{ y:{beginAtZero:true,ticks:{font:{size:11},color:'#9ca3af',callback:v=>v>=1000?`${(v/1000).toFixed(0)}k`:v},grid:{color:'rgba(0,0,0,0.04)'},border:{display:false}},
                 x:{grid:{display:false},ticks:{font:{size:11,weight:'600'},color:'#6b7280'},border:{display:false}} } }
    });
  };
  navVolumenPrev.addEventListener('click', () => { if (!navVolumenPrev.disabled) { volumenOffset -= 1; renderizarVolumen(); } });
  navVolumenNext.addEventListener('click', () => { if (!navVolumenNext.disabled) { volumenOffset += 1; renderizarVolumen(); } });
  renderizarVolumen();
  if (!semanasVolumen.length) {
    const msg = document.createElement('div'); msg.className='empty-state';
    msg.textContent='Completa sesiones con series registradas para ver este gráfico.';
    cardVolumen.appendChild(msg);
  }
  dashboard.appendChild(cardVolumen);

  // ── 5. TOP EJERCICIOS ───────────────────────────────────────
  const cardTop  = crearCard('Ejercicios Más Realizados', '');
  const listaTop = document.createElement('div');
  listaTop.className = 'top-ejercicios-lista';
  const ejerciciosCount = {};
  ejerciciosTodos.forEach(e => { ejerciciosCount[e.nombre] = (ejerciciosCount[e.nombre] || 0) + 1; });
  const topEjercicios = Object.entries(ejerciciosCount).sort((a,b) => b[1]-a[1]).slice(0,5);
  if (!topEjercicios.length) {
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

  // ── 6. DISTRIBUCIÓN MUSCULAR ────────────────────────────────
  _renderCardMuscular(dashboard, ejerciciosTodos, hace30Dias, crearCard);

  // ── 7. RÉCORDS PERSONALES ───────────────────────────────────
  const cardRecords = crearCard('🏆 Récords Personales', '');
  const prList      = document.createElement('div');
  prList.className  = 'pr-list';
  const prPorEjercicio = {};
  ejerciciosTodos.forEach(e => {
    if (!prPorEjercicio[e.nombre] || e.pesoMax > prPorEjercicio[e.nombre].peso)
      prPorEjercicio[e.nombre] = { peso: e.pesoMax, fecha: e.fecha };
  });
  const topPRs = Object.entries(prPorEjercicio).sort((a,b) => b[1].peso-a[1].peso).slice(0,5);
  if (!topPRs.length) {
    prList.innerHTML = '<p class="empty-state">Aún no hay registros de peso</p>';
  } else {
    topPRs.forEach(([nombre, data]) => {
      const fechaLabel = new Date(data.fecha).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
      const item = document.createElement('div');
      item.className = 'pr-item';
      item.innerHTML = `<div><div class="pr-name">${nombre}</div><div class="pr-date">${fechaLabel}</div></div><div class="pr-weight">${data.peso} kg</div>`;
      prList.appendChild(item);
    });
  }
  cardRecords.appendChild(prList);
  dashboard.appendChild(cardRecords);

  // ── 8. PROGRESO DE EJERCICIO ────────────────────────────────
  _renderCardProgreso(dashboard, ejerciciosTodos, crearCard, hoyStr, datos);
}

// ── Card: Calendario semanal ──────────────────────────────────
function _renderCardCalendario(dashboard, sesiones, crearCard, rutaActual, renderizar) {
  const cardCalendario = crearCard('', '');
  const DIAS_LETRA = ['L','M','X','J','V','S','D'];

  const fStr = d => {
    const yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const hoy = new Date();
  const primerDiaSemana = new Date(hoy);
  const dow = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
  primerDiaSemana.setDate(hoy.getDate() - dow);
  primerDiaSemana.setHours(0,0,0,0);

  let diaSelStr = fStr(hoy);

  const calWrapper  = document.createElement('div'); calWrapper.className='cal-wrapper';
  const navRow      = document.createElement('div'); navRow.className='cal-nav-row';
  const btnPrev     = document.createElement('button'); btnPrev.className='cal-nav-btn'; btnPrev.textContent='‹';
  const mesEl       = document.createElement('span');  mesEl.className='cal-mes-label';
  const btnNext     = document.createElement('button'); btnNext.className='cal-nav-btn'; btnNext.textContent='›';
  navRow.append(btnPrev, mesEl, btnNext);

  const daysRow    = document.createElement('div'); daysRow.className='cal-days-row';
  const detalleDiv = document.createElement('div'); detalleDiv.className='cal-detalle';

  calWrapper.append(navRow, daysRow, detalleDiv);

  const renderDetalle = (fs, fd, sesionDia) => {
    detalleDiv.innerHTML = '';
    const titulo = document.createElement('div'); titulo.className='cal-detalle-titulo';
    titulo.textContent = fd.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
    detalleDiv.appendChild(titulo);

    if (sesionDia) {
      const btn = document.createElement('button');
      btn.textContent = sesionDia.nombre || 'Ver sesión';
      btn.className = 'btn-sesion';
      btn.style.cssText = 'margin-bottom:8px;width:100%;';
      btn.addEventListener('click', () => {
        // Usar la referencia correcta de rutaActual y renderizar pasados como parámetro
        rutaActual.length = 0;
        rutaActual.push(0, ...sesionDia.ruta);
        renderizar();
      });
      detalleDiv.appendChild(btn);

      const ejerciciosFlat = [];
      (sesionDia.ejercicios || []).forEach(bloque => {
        if (Array.isArray(bloque.series) && bloque.series.length > 0) ejerciciosFlat.push(bloque);
        (bloque.hijos || []).forEach(ej => {
          if (Array.isArray(ej.series) && ej.series.length > 0) ejerciciosFlat.push(ej);
        });
      });

      if (ejerciciosFlat.length === 0) {
        const v = document.createElement('div'); v.className = 'detalle-empty';
        v.textContent = 'Sesión sin ejercicios registrados.';
        detalleDiv.appendChild(v);
      } else {
        ejerciciosFlat.forEach(ej => {
          const series      = ej.series || [];
          const completadas = series.filter(s => s.completada).length;
          const total       = series.length;
          const volumen     = calcularVolumen(series);
          const p = document.createElement('div'); p.className = 'cal-detalle-item';
          p.innerHTML = `
            <span class="det-nombre">${ej.nombre || '(sin nombre)'}</span>
            <span class="det-meta">
              ${total > 0 ? `<span class="det-series${completadas === total ? ' det-series--ok' : ''}">${completadas}/${total}</span>` : ''}
              ${volumen > 0 ? `<span class="det-vol">${Math.round(volumen)}<span class="det-vol-unit">kg</span></span>` : ''}
            </span>`;
          detalleDiv.appendChild(p);
        });
      }
    } else {
      const v = document.createElement('div'); v.className = 'detalle-empty';
      v.textContent = 'Sin entreno este día.';
      detalleDiv.appendChild(v);
    }
  };

  const renderDias = () => {
    daysRow.innerHTML = '';
    mesEl.textContent = new Date(primerDiaSemana).toLocaleDateString('es-ES', { month: 'long' });
    const hoyLocalStr = fStr(new Date());
    let datosBtnHoy = null;

    for (let i = 0; i < 7; i++) {
      const fd = new Date(primerDiaSemana); fd.setDate(primerDiaSemana.getDate() + i);
      const fs = fStr(fd);
      const sesionDia = sesiones.find(s => s.fecha === fs);

      const btn = document.createElement('button'); btn.className='day-btn';
      if (sesionDia)        btn.classList.add('done');
      if (fs === diaSelStr) btn.classList.add('selected');
      if (fs === hoyLocalStr) { btn.classList.add('today'); datosBtnHoy = { fs, fd, sesionDia }; }

      btn.innerHTML = `<span class="day-letter">${DIAS_LETRA[i]}</span><span class="day-number">${fd.getDate()}</span><span class="day-dot"></span>`;
      btn.addEventListener('click', ((fs,fd,sesionDia) => () => { diaSelStr=fs; renderDias(); renderDetalle(fs,fd,sesionDia); })(fs,fd,sesionDia));
      daysRow.appendChild(btn);
    }
    if (datosBtnHoy) renderDetalle(datosBtnHoy.fs, datosBtnHoy.fd, datosBtnHoy.sesionDia);
  };

  btnPrev.addEventListener('click', () => { primerDiaSemana.setDate(primerDiaSemana.getDate()-7); detalleDiv.innerHTML=''; renderDias(); });
  btnNext.addEventListener('click', () => { primerDiaSemana.setDate(primerDiaSemana.getDate()+7); detalleDiv.innerHTML=''; renderDias(); });
  renderDias();
  cardCalendario.appendChild(calWrapper);
  dashboard.appendChild(cardCalendario);
}

// ── Card: Distribución muscular ───────────────────────────────
function _renderCardMuscular(dashboard, ejerciciosTodos, hace30Dias, crearCard) {
  const cardMuscular = crearCard('Distribución Muscular (30 días)', '');
  const grupoKeywords = {
    'Pecho':   ['pecho','press','bench','fly','apert'],
    'Espalda': ['espalda','remo','jalón','pull','dominada','row','lat'],
    'Piernas': ['pierna','sentadilla','prensa','femoral','cuádric','zancada','squat','lunge','leg'],
    'Hombros': ['hombro','press militar','elevación','deltoid','shoulder','militar'],
    'Bíceps':  ['bíceps','bicep','curl'],
    'Tríceps': ['tríceps','tricep','extensión','dips'],
    'Core':    ['abdomen','core','plancha','crunch','oblicuo','abs'],
  };

  const musculoCounts = Object.keys(grupoKeywords).reduce((acc, g) => ({ ...acc, [g]: 0 }), {});
  ejerciciosTodos.filter(e => new Date(e.fecha) >= hace30Dias).forEach(e => {
    const nl = (e.nombre || '').toLowerCase();
    for (const [g, kws] of Object.entries(grupoKeywords)) {
      if (kws.some(k => nl.includes(k))) { musculoCounts[g]++; break; }
    }
  });

  const maxCount = Math.max(...Object.values(musculoCounts), 1);
  const calcOpacity = count => count === 0 ? 0.08 : 0.25 + (count / maxCount) * 0.45;
  const calcShadow = count => count === 0 ? 'rgba(0,0,0,0.04)' : `rgba(0,0,0,${0.1 + (count / maxCount) * 0.15})`;
  const mintAlpha = g => `rgba(61,213,152,${calcOpacity(musculoCounts[g] || 0)})`;
  const musclePct = g => {
    const count = musculoCounts[g] || 0;
    return count > 0 ? `${Math.round((count / maxCount) * 100)}%` : null;
  };

  const muscleWrapper = document.createElement('div');
  muscleWrapper.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;max-width:720px;margin:0 auto;';

  const slugify = str => str.normalize('NFD').replace(/[ -]/g, s => s).replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'');
  const overlayName = (base, grupo) => `${base}-${slugify(grupo)}.png`;
  const getOpacity = count => count === 0 ? 0 : 0.25 + (count / maxCount) * 0.55;

  const createPanel = (titulo, imageSrc, grupoList) => {
    const panel = document.createElement('div');
    panel.style.cssText = 'background:var(--bg-secondary);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 8px 18px rgba(0,0,0,0.06);';
    const heading = document.createElement('div');
    heading.textContent = titulo;
    heading.style.cssText = 'font-weight:700;color:var(--text-primary);font-size:0.95rem;text-align:center;';

    const frame = document.createElement('div');
    frame.style.cssText = 'position:relative;width:100%;overflow:hidden;border-radius:14px;background:var(--bg-secondary);';

    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = titulo;
    img.style.cssText = 'width:100%;height:auto;display:block;';
    frame.appendChild(img);

    grupoList.forEach(grupo => {
      const overlay = document.createElement('img');
      overlay.src = overlayName(imageSrc.replace(/\.png$/, ''), grupo);
      overlay.alt = `${titulo} ${grupo}`;
      overlay.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;opacity:${getOpacity(musculoCounts[grupo] || 0)};transition:opacity 0.25s ease;pointer-events:none;`;
      overlay.addEventListener('error', () => { overlay.style.display = 'none'; });
      frame.appendChild(overlay);
    });

    panel.appendChild(heading);
    panel.appendChild(frame);
    return panel;
  };

  const muscleFrontGroups = ['Hombros','Pecho','Bíceps','Tríceps','Core','Piernas'];
  const muscleBackGroups  = ['Hombros','Espalda','Bíceps','Tríceps','Core','Piernas'];

  muscleWrapper.appendChild(createPanel('Frontal', 'muscle-map-front.png', muscleFrontGroups));
  muscleWrapper.appendChild(createPanel('Posterior', 'muscle-map-back.png', muscleBackGroups));

  const leyenda = document.createElement('div');
  leyenda.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:center;';
  Object.entries(musculoCounts).forEach(([grupo,count]) => {
    if (!count) return;
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:0.72rem;font-weight:600;color:var(--text-secondary);';
    item.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${mintAlpha(grupo)};display:inline-block;"></span>${grupo} <span style="color:var(--primary-mint)">${musclePct(grupo)}</span>`;
    leyenda.appendChild(item);
  });

  cardMuscular.appendChild(muscleWrapper);
  cardMuscular.appendChild(leyenda);
  dashboard.appendChild(cardMuscular);
}

// ── Card: Progreso de ejercicio ───────────────────────────────
function _renderCardProgreso(dashboard, ejerciciosTodos, crearCard, hoyStr, datos) {
  const cardProgreso = crearCard('Progreso de Ejercicio', '');
  const selectorEjercicio = document.createElement('select');
  selectorEjercicio.className = 'selector-ejercicio';
  const nombresUnicos = [...new Set(ejerciciosTodos.map(e => e.nombre))].sort();
  nombresUnicos.forEach(nombre => {
    const opt=document.createElement('option'); opt.value=nombre; opt.textContent=nombre;
    selectorEjercicio.appendChild(opt);
  });
  cardProgreso.appendChild(selectorEjercicio);

  const chartProgreso = document.createElement('canvas');
  chartProgreso.className = 'dashboard-chart dashboard-chart--mt';
  cardProgreso.appendChild(chartProgreso);

  const renderizarProgreso = nombre => {
    const datosEj = ejerciciosTodos.filter(e => e.nombre===nombre)
      .sort((a,b) => new Date(a.fecha)-new Date(b.fecha)).slice(-10);
    const data = datosEj.map(e => ({ x: new Date(e.fecha), y: e.pesoMax }));
    if (chartProgreso.chartInstance) { chartProgreso.chartInstance.destroy(); }
    if (!window.Chart || !data.length) return;
    const ctxP = chartProgreso.getContext('2d');
    chartProgreso.chartInstance = new window.Chart(ctxP, {
      type:'line',
      data:{ datasets:[{ data, borderColor:'rgb(61,213,152)', backgroundColor:'rgba(61,213,152,0.1)',
        borderWidth:2.5, tension:0.3, fill:true, pointRadius:5, pointHoverRadius:8,
        pointBackgroundColor:'rgb(61,213,152)', pointBorderColor:'#fff', pointBorderWidth:2 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{backgroundColor:'rgba(26,29,35,0.92)',padding:10,
          callbacks:{label:ctx=>`${ctx.parsed.y} kg`, title:items=>new Date(items[0].raw.x).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}}},
        scales:{ x:{type:'time',time:{unit:'day'},ticks:{font:{size:11},color:'#6b7280'},grid:{display:false},border:{display:false}},
                 y:{beginAtZero:false,ticks:{font:{size:11},color:'#9ca3af',callback:v=>`${Math.floor(v)}kg`},grid:{color:'rgba(0,0,0,0.04)'},border:{display:false}} } }
    });
  };

  if (nombresUnicos.length) {
    selectorEjercicio.addEventListener('change', e => renderizarProgreso(e.target.value));
    renderizarProgreso(nombresUnicos[0]);
  } else {
    cardProgreso.innerHTML += '<p class="empty-state">Añade ejercicios con series para ver su progreso</p>';
  }
  dashboard.appendChild(cardProgreso);
}

// ── Card: Nutrición compacta ──────────────────────────────────
async function _renderCardNutricionCompacta(dashboard, nivelNutricion, crearCard, hoyStr) {
  const METAS_DIARIAS = { calorias: 2000, proteinas: 150, carbohidratos: 250, grasas: 65 };
  const user = auth.currentUser;
  if (user) {
    try {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      const metaNutricional = snap.exists() ? snap.data().metasNutricionales : null;
      if (metaNutricional?.calorias) METAS_DIARIAS.calorias = metaNutricional.calorias;
      if (metaNutricional?.macros) {
        METAS_DIARIAS.proteinas = metaNutricional.macros.proteinas?.g || METAS_DIARIAS.proteinas;
        METAS_DIARIAS.carbohidratos = metaNutricional.macros.carbohidratos?.g || METAS_DIARIAS.carbohidratos;
        METAS_DIARIAS.grasas = metaNutricional.macros.grasas?.g || METAS_DIARIAS.grasas;
      }
    } catch (error) {
      console.error('[Dashboard] Error cargando meta de calorías:', error);
    }
  }
  const registrosHoy = (nivelNutricion.hijos || []).filter(r => r.fecha === hoyStr);
  const totales = _calcularTotalNutricion(registrosHoy);

  const meta = METAS_DIARIAS.calorias;
  const consumidas = totales.calorias;
  const pctReal = meta > 0 ? (consumidas / meta) * 100 : 0;
  const pct = Math.min(100, Math.max(0, pctReal));
  const restantes = Math.max(0, meta - consumidas);
  const excedido = pctReal > 100;
  const formatear = valor => Math.round(valor).toLocaleString('es-ES');

  const cardCalories = crearCard('', 'nutrition-summary-card');
  cardCalories.innerHTML = `
    <div class="nutrition-card-header">
      <div class="nutrition-card-icon" aria-hidden="true">⌁</div>
      <div>
        <div class="nutrition-card-kicker">Nutrición de hoy</div>
        <div class="nutrition-card-subtitle">Tu alimentación, tu progreso.</div>
      </div>
    </div>
    <div class="nutrition-calories-layout">
      <div class="nutrition-ring-wrap${excedido ? ' is-over' : ''}">
        <svg class="nutrition-ring" viewBox="0 0 120 120" role="img" aria-label="${Math.round(pctReal)}% del objetivo de calorías">
          <circle class="nutrition-ring-track" cx="60" cy="60" r="50"></circle>
          <circle class="nutrition-ring-progress" cx="60" cy="60" r="50" pathLength="100" style="--ring-progress:${pct};"></circle>
        </svg>
        <div class="nutrition-ring-center">
          <strong>${formatear(consumidas)}</strong>
          <span>kcal</span>
          <b>${Math.round(pctReal)}%</b>
        </div>
      </div>
      <div class="nutrition-calorie-details">
        <div class="nutrition-detail-row">
          <span><i class="nutrition-detail-dot is-blue"></i>Consumidas</span>
          <strong>${formatear(consumidas)} kcal</strong>
        </div>
        <div class="nutrition-detail-row">
          <span><i class="nutrition-detail-dot is-amber"></i>Objetivo</span>
          <strong>${formatear(meta)} kcal</strong>
        </div>
        <div class="nutrition-detail-row${excedido ? ' is-over' : ''}">
          <span><i class="nutrition-detail-dot is-coral"></i>${excedido ? 'Exceso' : 'Restantes'}</span>
          <strong>${formatear(excedido ? consumidas - meta : restantes)} kcal</strong>
        </div>
        <div class="nutrition-progress" role="progressbar" aria-label="Progreso de calorías" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(pctReal))}">
          <span style="--bar-progress:${pct}%;"></span>
        </div>
      </div>
    </div>
    ${consumidas === 0 ? '<div class="nutrition-empty-state">Todavía no has registrado alimentos hoy.</div>' : ''}`;

  const macrosGrid = document.createElement('div');
  macrosGrid.className = 'nutrition-macros-grid';
  [
    { nombre: 'Proteínas', valor: totales.proteinas, meta: METAS_DIARIAS.proteinas, color: '#f26b6b', icono: 'P', clase: 'protein' },
    { nombre: 'Carbohidratos', valor: totales.carbohidratos, meta: METAS_DIARIAS.carbohidratos, color: '#e5a623', icono: 'C', clase: 'carbs' },
    { nombre: 'Grasas', valor: totales.grasas, meta: METAS_DIARIAS.grasas, color: '#20a982', icono: 'G', clase: 'fats' }
  ].forEach(macro => {
    const pctMacroReal = macro.meta > 0 ? (macro.valor / macro.meta) * 100 : 0;
    const pctMacro = Math.min(100, Math.max(0, pctMacroReal));
    const macroBox = document.createElement('div');
    macroBox.className = `nutrition-macro-card ${macro.clase}`;
    macroBox.innerHTML = `
      <div class="nutrition-macro-top"><span class="nutrition-macro-icon">${macro.icono}</span><span class="nutrition-macro-percent">${Math.round(pctMacroReal)}%</span></div>
      <div class="nutrition-macro-name">${macro.nombre}</div>
      <div class="nutrition-macro-value">${formatear(macro.valor)} <small>g</small></div>
      <div class="nutrition-macro-goal">de ${formatear(macro.meta)} g</div>
      <div class="nutrition-macro-progress"><span style="--macro-progress:${pctMacro}%;background:${macro.color};"></span>
      </div>`;
    macrosGrid.appendChild(macroBox);
  });
  cardCalories.appendChild(macrosGrid);
  dashboard.appendChild(cardCalories);
}

function _calcularTotalNutricion(registros) {
  return (registros || []).reduce((acc, r) => {
    acc.calorias      += r.calorias      || 0;
    acc.proteinas     += r.proteinas     || 0;
    acc.carbohidratos += r.carbohidratos || 0;
    acc.grasas        += r.grasas        || 0;
    return acc;
  }, { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });
}