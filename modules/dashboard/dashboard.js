// ============================================================
// modules/dashboard/dashboard.js
// Renderizado del Dashboard (nivel 0).
// Importa utilidades desde shared/ — no duplica código.
// ============================================================

import { hoyISO, formatearFechaCorta, calcularVolumen, calcular1RM, redondear } from '../../shared/utils.js';

// ── Helper interno: crea una card con título ──────────────────
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

// ── Exportación principal ─────────────────────────────────────
export function renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton) {
  if (tituloNivel) tituloNivel.textContent = 'Dashboard';
  if (backButton)  backButton.style.visibility = 'hidden';
  if (addButton)   addButton.style.visibility  = 'hidden';
  contenido.innerHTML = '';

  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard-container-grid';
  contenido.appendChild(dashboard);

  // ── Recolectar datos ────────────────────────────────────────
  const hoy        = new Date();
  const hoyStr     = hoyISO();
  const hace30Dias = new Date(); hace30Dias.setDate(hoy.getDate() - 30);

  const sesiones        = [];
  const ejerciciosTodos = [];
  const sesionesPorMes  = {};
  const volumenPorSemana = [];
  const volumenPorFecha  = {};

  // Función recursiva para extraer ejercicios y volumen
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
          const mesKey = fecha.slice(0, 7);
          sesionesPorMes[mesKey] = (sesionesPorMes[mesKey] || 0) + 1;
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
  const sesionesEsteMes = sesiones.filter(s => {
    const f = new Date(s.fecha);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  }).length;
  const ejerciciosUnicos = new Set(ejerciciosTodos.map(e => e.nombre)).size;
  const volumenTotal = ejerciciosTodos
    .filter(e => new Date(e.fecha) >= hace30Dias)
    .reduce((sum, e) => sum + calcularVolumen(e.series || []), 0);

  // Racha actual
  let racha = 0, fechaRef = new Date(); fechaRef.setHours(0, 0, 0, 0);
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

  // ══════════════════════════════════════════════════════════
  // 1. RESUMEN GENERAL
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // 2. CALENDARIO SEMANAL
  // ══════════════════════════════════════════════════════════
  _renderCardCalendario(dashboard, sesiones, crearCard, rutaActual);

  // ══════════════════════════════════════════════════════════
  // 3. FRECUENCIA MENSUAL
  // ══════════════════════════════════════════════════════════
  const cardFrecuencia = crearCard('Frecuencia Mensual', '');
  const chartFrecuencia = document.createElement('canvas');
  chartFrecuencia.className = 'dashboard-chart';
  cardFrecuencia.appendChild(chartFrecuencia);
  const meses12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleDateString('es-ES',{month:'short'}) };
  });
  if (window.Chart) {
    new window.Chart(chartFrecuencia.getContext('2d'), {
      type: 'bar',
      data: {
        labels: meses12.map(m => m.label),
        datasets: [{ data: meses12.map(m => sesionesPorMes[m.key] || 0),
          backgroundColor: meses12.map((m,i) => i === 11 ? 'rgba(61,213,152,0.95)' : 'rgba(61,213,152,0.4)'),
          borderColor: 'rgb(61,213,152)', borderWidth: 2, borderRadius: 8, borderSkipped: false }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(26,29,35,0.92)', padding: 10, callbacks: { label: ctx => `${ctx.parsed.y} sesiones` } } },
        scales: { y: { beginAtZero: true, ticks: { stepSize:1, font:{size:11}, color:'#9ca3af' }, grid:{color:'rgba(0,0,0,0.04)'}, border:{display:false} },
                  x: { grid:{display:false}, ticks:{font:{size:11,weight:'700'}, color:'#6b7280'}, border:{display:false} } } }
    });
  }
  dashboard.appendChild(cardFrecuencia);

  // ══════════════════════════════════════════════════════════
  // 4. VOLUMEN SEMANAL
  // ══════════════════════════════════════════════════════════
  const cardVolumen = crearCard('Volumen Semanal', '');
  const chartVolumen = document.createElement('canvas');
  chartVolumen.className = 'dashboard-chart';
  cardVolumen.appendChild(chartVolumen);
  const ultimasSemanas = [...volumenPorSemana].sort((a,b) => new Date(a.semana)-new Date(b.semana)).slice(-8);
  if (window.Chart && ultimasSemanas.length > 0) {
    const ctxV = chartVolumen.getContext('2d');
    const gradV = ctxV.createLinearGradient(0,0,0,220);
    gradV.addColorStop(0,'rgba(0,212,212,0.28)'); gradV.addColorStop(1,'rgba(0,212,212,0.02)');
    new window.Chart(ctxV, {
      type: 'line',
      data: { labels: ultimasSemanas.map(s => { const f=new Date(s.semana); return `${f.getDate()}/${f.getMonth()+1}`; }),
              datasets: [{ data: ultimasSemanas.map(s => Math.round(s.volumen)), borderColor:'rgb(0,212,212)', backgroundColor:gradV,
                borderWidth:2.5, tension:0.4, fill:true, pointRadius:4, pointHoverRadius:7,
                pointBackgroundColor:'rgb(0,212,212)', pointBorderColor:'#fff', pointBorderWidth:2 }] },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{backgroundColor:'rgba(26,29,35,0.92)',padding:10, callbacks:{label:ctx=>{ const v=ctx.parsed.y; return v>=1000?`${(v/1000).toFixed(1)}k kg`:`${v} kg`; }}} },
        scales:{ y:{beginAtZero:true,ticks:{font:{size:11},color:'#9ca3af',callback:v=>v>=1000?`${(v/1000).toFixed(0)}k`:v},grid:{color:'rgba(0,0,0,0.04)'},border:{display:false}},
                 x:{grid:{display:false},ticks:{font:{size:11,weight:'600'},color:'#6b7280'},border:{display:false}} } }
    });
  } else if (!ultimasSemanas.length) {
    const msg = document.createElement('div'); msg.className='empty-state';
    msg.textContent='Completa sesiones con series registradas para ver este gráfico.';
    cardVolumen.appendChild(msg);
  }
  dashboard.appendChild(cardVolumen);

  // ══════════════════════════════════════════════════════════
  // 5. TOP EJERCICIOS
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // 6. DISTRIBUCIÓN MUSCULAR
  // ══════════════════════════════════════════════════════════
  _renderCardMuscular(dashboard, ejerciciosTodos, hace30Dias, crearCard);

  // ══════════════════════════════════════════════════════════
  // 7. RÉCORDS PERSONALES
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // 8. PROGRESO DE EJERCICIO
  // ══════════════════════════════════════════════════════════
  _renderCardProgreso(dashboard, ejerciciosTodos, crearCard);
}

// ── Card: Calendario semanal ──────────────────────────────────
function _renderCardCalendario(dashboard, sesiones, crearCard, rutaActual) {
  const cardCalendario = crearCard('Esta Semana', '');
  const DIAS_LETRA = ['L','M','X','J','V','S','D'];
  const MESES_UP   = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

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

  const daysRow   = document.createElement('div'); daysRow.className='cal-days-row';
  const detalleDiv= document.createElement('div'); detalleDiv.className='cal-detalle';

  calWrapper.append(navRow, daysRow, detalleDiv);

  const renderDetalle = (fs, fd, sesionDia) => {
    detalleDiv.innerHTML = '';
    const titulo = document.createElement('div'); titulo.className='cal-detalle-titulo';
    titulo.textContent = fd.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
    detalleDiv.appendChild(titulo);

    if (sesionDia) {
      // Botón con nombre de la sesión para navegar a ella
      const btn = document.createElement('button');
      btn.textContent = sesionDia.nombre || 'Ver sesión';
      btn.className = 'btn-sesion';
      btn.style.cssText = 'margin-bottom:8px;width:100%;';
      btn.addEventListener('click', () => {
        rutaActual.length = 0;
        rutaActual.push(0, ...sesionDia.ruta);
        window.renderizar?.();
      });
      detalleDiv.appendChild(btn);

      // Extraer ejercicios (pueden estar en hijos directos o un nivel más abajo)
      const ejerciciosFlat = [];
      (sesionDia.ejercicios || []).forEach(bloque => {
        if (Array.isArray(bloque.series) && bloque.series.length > 0) {
          ejerciciosFlat.push(bloque);
        }
        (bloque.hijos || []).forEach(ej => {
          if (Array.isArray(ej.series) && ej.series.length > 0) {
            ejerciciosFlat.push(ej);
          }
        });
      });

      if (ejerciciosFlat.length === 0) {
        const v = document.createElement('div');
        v.className = 'detalle-empty';
        v.textContent = 'Sesión sin ejercicios registrados.';
        detalleDiv.appendChild(v);
      } else {
        ejerciciosFlat.slice(0, 5).forEach(ej => {
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
      const v = document.createElement('div');
      v.className = 'detalle-empty';
      v.textContent = 'Sin entreno este día.';
      detalleDiv.appendChild(v);
    }
  };

  const renderDias = () => {
    daysRow.innerHTML = '';
    mesEl.textContent = MESES_UP[new Date(primerDiaSemana).getMonth()];
    const hoyLocalStr = fStr(new Date());
    let datosBtnHoy = null;

    for (let i = 0; i < 7; i++) {
      const fd = new Date(primerDiaSemana); fd.setDate(primerDiaSemana.getDate() + i);
      const fs = fStr(fd);
      const sesionDia = sesiones.find(s => s.fecha === fs);

      const btn = document.createElement('button'); btn.className='day-btn';
      if (sesionDia)        btn.classList.add('done');
      if (fs === diaSelStr) btn.classList.add('selected');
      if (fs === hoyLocalStr){ btn.classList.add('today'); datosBtnHoy = { fs, fd, sesionDia }; }

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
  const musculoCounts = {};
  Object.keys(grupoKeywords).forEach(g => musculoCounts[g] = 0);
  ejerciciosTodos.filter(e => new Date(e.fecha) >= hace30Dias).forEach(e => {
    const nl = (e.nombre || '').toLowerCase();
    for (const [g, kws] of Object.entries(grupoKeywords)) {
      if (kws.some(k => nl.includes(k))) { musculoCounts[g]++; break; }
    }
  });
  const maxM = Math.max(...Object.values(musculoCounts), 1);
  const mintAlpha = g => { const p=(musculoCounts[g]||0)/maxM; return p===0?'rgba(61,213,152,0)':`rgba(61,213,152,${(0.25+p*0.45).toFixed(2)})`; };
  const musclePct  = g => { const c=musculoCounts[g]||0; return c>0?Math.round((c/maxM)*100)+'%':null; };

  const muscleWrapper = document.createElement('div');
  muscleWrapper.style.cssText = 'position:relative;width:100%;max-width:320px;margin:0 auto;';
  const muscleImg = document.createElement('img');
  muscleImg.src = 'muscle-map.png'; muscleImg.style.cssText='width:100%;display:block;';
  muscleWrapper.appendChild(muscleImg);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 507 960');
  svg.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;';

  const musclePaths = [
    {grupo:'Pecho',   d:'M175,168 Q215,148 253,158 L250,235 Q212,252 175,235 Z'},
    {grupo:'Pecho',   d:'M330,168 Q290,148 253,158 L256,235 Q294,252 330,235 Z'},
    {grupo:'Hombros', d:'M118,148 Q142,135 168,150 Q162,200 148,218 Q124,205 110,180 Z'},
    {grupo:'Hombros', d:'M388,148 Q364,135 338,150 Q344,200 358,218 Q382,205 396,180 Z'},
    {grupo:'Bíceps',  d:'M95,220 Q72,272 80,325 Q104,338 128,325 Q124,272 115,220 Z'},
    {grupo:'Bíceps',  d:'M410,220 Q433,272 424,325 Q400,338 376,325 Q380,272 390,220 Z'},
    {grupo:'Tríceps', d:'M78,222 Q58,275 65,325 Q82,335 100,325 Q96,272 100,220 Z'},
    {grupo:'Tríceps', d:'M428,222 Q448,275 441,325 Q424,335 406,325 Q410,272 406,220 Z'},
    {grupo:'Core',    d:'M196,238 Q253,224 310,238 L305,388 Q253,400 200,388 Z'},
    {grupo:'Core',    d:'M176,242 Q196,238 200,388 Q166,372 150,338 Q135,295 155,262 Z'},
    {grupo:'Core',    d:'M330,242 Q310,238 306,388 Q340,372 356,338 Q371,295 351,262 Z'},
    {grupo:'Piernas', d:'M175,455 Q150,525 155,608 Q185,622 215,610 Q228,528 222,455 Z'},
    {grupo:'Piernas', d:'M330,455 Q355,525 350,608 Q320,622 290,610 Q277,528 283,455 Z'},
  ];
  musclePaths.forEach(({grupo,d}) => {
    const path = document.createElementNS(svgNS,'path');
    path.setAttribute('d',d);
    path.setAttribute('fill',mintAlpha(grupo));
    path.setAttribute('stroke', musculoCounts[grupo]>0?'rgba(61,213,152,0.6)':'none');
    path.setAttribute('stroke-width','1.5');
    path.style.cssText='cursor:pointer;transition:fill 0.2s;';
    const pct = musclePct(grupo);
    if (pct) {
      path.addEventListener('mouseenter', () => {
        path.setAttribute('fill', mintAlpha(grupo).replace(/[\d.]+\)$/, v => (parseFloat(v)+0.2).toFixed(2)+')'));
        let tip = svg.querySelector('.muscle-tip');
        if (!tip) { tip=document.createElementNS(svgNS,'text'); tip.setAttribute('class','muscle-tip'); tip.style.cssText='font-size:28px;font-weight:700;fill:rgba(61,213,152,1);pointer-events:none;'; svg.appendChild(tip); }
        const bb = path.getBBox();
        tip.setAttribute('x', bb.x+bb.width/2); tip.setAttribute('y', bb.y+bb.height/2+10);
        tip.setAttribute('text-anchor','middle'); tip.textContent=`${grupo} ${pct}`;
      });
      path.addEventListener('mouseleave', () => {
        path.setAttribute('fill',mintAlpha(grupo));
        const tip=svg.querySelector('.muscle-tip'); if(tip) tip.textContent='';
      });
    }
    svg.appendChild(path);
  });
  muscleWrapper.appendChild(svg);

  const leyenda = document.createElement('div');
  leyenda.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:center;';
  Object.entries(musculoCounts).forEach(([grupo,count]) => {
    if (!count) return;
    const item=document.createElement('div');
    item.style.cssText='display:flex;align-items:center;gap:5px;font-size:0.72rem;font-weight:600;color:var(--text-secondary);';
    item.innerHTML=`<span style="width:10px;height:10px;border-radius:50%;background:${mintAlpha(grupo).replace('0)','1)')};display:inline-block;"></span>${grupo} <span style="color:var(--primary-mint)">${musclePct(grupo)}</span>`;
    leyenda.appendChild(item);
  });
  cardMuscular.appendChild(muscleWrapper);
  cardMuscular.appendChild(leyenda);
  dashboard.appendChild(cardMuscular);
}

// ── Card: Progreso de ejercicio ───────────────────────────────
function _renderCardProgreso(dashboard, ejerciciosTodos, crearCard) {
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
                 y:{beginAtZero:false,ticks:{font:{size:11},color:'#9ca3af',callback:v=>`${v}kg`},grid:{color:'rgba(0,0,0,0.04)'},border:{display:false}} } }
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
