// ============================================================
// modules/calendario/calendario.js
// Calendario con vista mensual y semanal.
// ============================================================

import { formatearDuracion } from '../../shared/utils.js';

// ── Export principal ──────────────────────────────────────────
export function renderizarCalendario(datos, contenido, subHeader, rutaActual, renderizar) {
  subHeader.innerHTML = '';
  let vistaActual = sessionStorage.getItem('calendarioVista') || 'mensual';

  // ── Subheader ─────────────────────────────────────────────
  const subHeaderContent = document.createElement('div');
  subHeaderContent.className = 'cal-subheader-content';

  const leftSide  = document.createElement('div'); leftSide.className = 'cal-subheader-left';
  const rightSide = document.createElement('div'); rightSide.className = 'cal-subheader-right';

  const selectorVista = document.createElement('div'); selectorVista.className = 'cal-selector-vista';
  const btnMensual = document.createElement('button');
  btnMensual.textContent = '📅 Mes';
  btnMensual.className   = 'calendario-vista-btn' + (vistaActual === 'mensual' ? ' active' : '');
  const btnSemanal = document.createElement('button');
  btnSemanal.textContent = '📆 Semana';
  btnSemanal.className   = 'calendario-vista-btn' + (vistaActual === 'semanal' ? ' active' : '');
  selectorVista.append(btnMensual, btnSemanal);
  leftSide.appendChild(selectorVista);

  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel'; h2Nivel.textContent = ''; h2Nivel.className = 'cal-titulo-nivel';

  const btnHoy = document.createElement('button');
  btnHoy.textContent = '📍 Hoy'; btnHoy.className = 'btn-hoy-calendario';

  const selectorMes = document.createElement('select');
  selectorMes.className = 'selector-mes-calendario';
  selectorMes.style.display = vistaActual === 'mensual' ? 'block' : 'none';

  const hoy = new Date();
  const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  for (let offset = -12; offset <= 12; offset++) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
    const opt = document.createElement('option');
    opt.value = offset;
    opt.textContent = `${MESES_NOMBRES[f.getMonth()]} ${f.getFullYear()}`;
    if (offset === 0) opt.selected = true;
    selectorMes.appendChild(opt);
  }

  rightSide.append(btnHoy, selectorMes);
  subHeaderContent.append(leftSide, h2Nivel, rightSide);
  subHeader.appendChild(subHeaderContent);

  contenido.innerHTML = '';

  // ── Contenedor principal ──────────────────────────────────
  const calendarioContainer = document.createElement('div');
  calendarioContainer.className = 'calendario-container';
  calendarioContainer.id = 'calendarioContainer';

  const ajustarAltura = () => {
    const headerH    = (document.querySelector('header')?.offsetHeight    || 48);
    const subH       = (document.getElementById('subHeader')?.offsetHeight || 76);
    const footerH    = (document.getElementById('footerNav')?.offsetHeight || 64);
    const totalTop   = headerH + subH;
    calendarioContainer.style.paddingTop = `${totalTop}px`;
    calendarioContainer.style.height     = `calc(100vh - ${totalTop}px - ${footerH}px)`;
  };
  requestAnimationFrame(() => { ajustarAltura(); setTimeout(ajustarAltura, 100); });
  let resizeT;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(ajustarAltura, 100); };
  window.addEventListener('resize', onResize);
  calendarioContainer.addEventListener('DOMNodeRemoved', () => window.removeEventListener('resize', onResize));

  const sesiones         = _obtenerSesiones(datos);
  const sesionesPorFecha = _crearMapa(sesiones);

  // ── Render de vista ───────────────────────────────────────
  const renderizarVista = (vista) => {
    calendarioContainer.innerHTML = '';
    vistaActual = vista;
    sessionStorage.setItem('calendarioVista', vista);
    btnMensual.className = 'calendario-vista-btn' + (vista === 'mensual' ? ' active' : '');
    btnSemanal.className = 'calendario-vista-btn' + (vista === 'semanal' ? ' active' : '');
    selectorMes.style.display = vista === 'mensual' ? 'block' : 'none';
    calendarioContainer.className = 'calendario-container' + (vista === 'mensual' ? ' cal-padding' : '');

    if (vista === 'mensual') {
      _renderVistaMensual(calendarioContainer, sesionesPorFecha, hoy, rutaActual, renderizar, selectorMes, btnHoy);
    } else {
      _renderVistaSemanal(calendarioContainer, sesionesPorFecha, hoy, rutaActual, renderizar, btnHoy);
    }
  };

  btnMensual.addEventListener('click', () => renderizarVista('mensual'));
  btnSemanal.addEventListener('click', () => renderizarVista('semanal'));
  btnHoy.addEventListener('mouseenter', () => btnHoy.classList.add('cal-btn-hoy--hover'));
  btnHoy.addEventListener('mouseleave', () => btnHoy.classList.remove('cal-btn-hoy--hover'));

  contenido.appendChild(calendarioContainer);
  renderizarVista(vistaActual);
}

// ── Obtener sesiones del árbol de datos ───────────────────────
function _obtenerSesiones(datos) {
  const sesiones = [];
  datos[0]?.hijos?.forEach((meso, i) => {
    meso.hijos?.forEach((micro, j) => {
      micro.hijos?.forEach((sesion, k) => {
        let fecha = sesion.fecha;
        if (!fecha && sesion.hijos?.length > 0) {
          for (const sub of sesion.hijos) { if (sub.fecha) { fecha = sub.fecha; break; } }
        }
        if (!fecha) return;
        let totalSeries = 0, seriesCompletadas = 0;
        const contarSeries = (nodo) => {
          if (nodo.series?.length > 0) {
            totalSeries      += nodo.series.length;
            seriesCompletadas += nodo.series.filter(s => s.completada).length;
          }
          nodo.hijos?.forEach(contarSeries);
        };
        contarSeries(sesion);
        sesiones.push({
          fecha,
          nombre: sesion.nombre || 'Sesión sin nombre',
          ejercicios: sesion.hijos || [],
          ruta: [0, i, j, k],
          completada: totalSeries > 0 && totalSeries === seriesCompletadas,
          duracionMinutos: sesion.duracionMinutos || 0,
          _stats: { totalSeries, seriesCompletadas }
        });
      });
    });
  });
  return sesiones;
}

function _crearMapa(sesiones) {
  const mapa = {};
  sesiones.forEach(s => { if (!mapa[s.fecha]) mapa[s.fecha] = []; mapa[s.fecha].push(s); });
  return mapa;
}

// ── Vista mensual ─────────────────────────────────────────────
function _renderVistaMensual(container, sesionesPorFecha, hoy, rutaActual, renderizar, selectorMes, btnHoy) {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  let mesActualCard = null;
  const mesesCards  = [];

  for (let offset = -12; offset <= 12; offset++) {
    const fecha   = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
    const mesCard = _crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar);
    if (offset === 0) { mesActualCard = mesCard; mesCard.id = 'mes-actual-calendario'; }
    mesCard.dataset.offset = offset;
    mesesCards.push({ offset, card: mesCard });
    container.appendChild(mesCard);
  }

  const scrollTo = (card) => {
    const headerH  = document.querySelector('header')?.offsetHeight    || 48;
    const subH     = document.getElementById('subHeader')?.offsetHeight || 76;
    const offsetPx = headerH + subH + 16;
    const pos      = card.getBoundingClientRect().top + container.scrollTop - offsetPx;
    container.scrollTo({ top: pos, behavior: 'smooth' });
  };

  selectorMes.addEventListener('change', e => {
    const found = mesesCards.find(m => m.offset === parseInt(e.target.value));
    if (found) scrollTo(found.card);
  });

  btnHoy.onclick = () => { if (mesActualCard) scrollTo(mesActualCard); };

  // Scroll inicial al mes actual
  setTimeout(() => { if (mesActualCard) scrollTo(mesActualCard); }, 150);
}

function _crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar) {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesCard = document.createElement('div');
  mesCard.className = 'mes-card cal-mes-card';

  const titulo = document.createElement('h3');
  titulo.className   = 'cal-mes-titulo';
  titulo.textContent = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
  mesCard.appendChild(titulo);

  // Barra de progreso mensual
  const fechaStr0    = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
  const sesionesMes  = Object.entries(sesionesPorFecha).filter(([f]) => f.startsWith(fechaStr0)).flatMap(([,s]) => s);
  if (sesionesMes.length > 0) {
    const completadas  = sesionesMes.filter(s => s.completada).length;
    const pct          = Math.round((completadas / sesionesMes.length) * 100);
    const bar          = document.createElement('div'); bar.className = 'cal-progress-bar';
    const fill         = document.createElement('div'); fill.className = 'cal-progress-fill';
    fill.style.width   = `${pct}%`;
    fill.style.background = pct >= 80 ? 'linear-gradient(90deg,#4CAF50,#66BB6A)' : pct >= 50 ? 'linear-gradient(90deg,#FFA500,#FFB84D)' : 'linear-gradient(90deg,#FF6B6B,#FF8787)';
    bar.appendChild(fill); mesCard.appendChild(bar);
  }

  // Cabecera días semana
  const diasSemana = document.createElement('div'); diasSemana.className = 'cal-dias-semana';
  ['L','M','X','J','V','S','D'].forEach(d => {
    const h = document.createElement('div'); h.textContent = d; h.className = 'cal-dia-semana-label';
    diasSemana.appendChild(h);
  });
  mesCard.appendChild(diasSemana);

  // Grid de días
  const diasGrid = document.createElement('div'); diasGrid.className = 'cal-dias-grid';
  const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  let offset0 = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;
  for (let i = 0; i < offset0; i++) { const v = document.createElement('div'); v.className = 'cal-dia-vacio'; diasGrid.appendChild(v); }

  // Colores de mesociclos
  const COLORES_MESO = ['rgba(61,213,152,0.12)','rgba(0,212,212,0.12)','rgba(255,107,107,0.12)','rgba(156,39,176,0.12)','rgba(255,193,7,0.12)','rgba(33,150,243,0.12)'];
  const rangosMeso = [];
  window.datos?.[0]?.hijos?.forEach((meso, idx) => {
    let ini = null, fin = null;
    meso.hijos?.forEach(micro => micro.hijos?.forEach(sesion => {
      let f = sesion.fecha;
      if (!f && sesion.hijos?.length > 0) for (const s of sesion.hijos) { if (s.fecha) { f = s.fecha; break; } }
      if (f) {
        const d = new Date(f + 'T00:00:00');
        if (!ini || d < ini) ini = d;
        if (!fin || d > fin) fin = d;
      }
    }));
    if (ini && fin) rangosMeso.push({ inicio: ini, fin, color: COLORES_MESO[idx % COLORES_MESO.length] });
  });

  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const fechaDia = new Date(fecha.getFullYear(), fecha.getMonth(), dia);
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const sesionesDia = sesionesPorFecha[fechaStr] || [];
    const esHoy = fechaDia.toDateString() === hoy.toDateString();
    const mesosActivos = rangosMeso.filter(r => fechaDia >= r.inicio && fechaDia <= r.fin);
    const colorFondo   = mesosActivos.length > 0 ? mesosActivos[0].color : 'var(--bg-main)';

    const diaDiv = document.createElement('div'); diaDiv.className = 'cal-dia-celda';
    if (esHoy && sesionesDia.length > 0) diaDiv.classList.add('cal-dia--hoy-con-sesion');
    else if (esHoy) { diaDiv.classList.add('cal-dia--hoy'); diaDiv.style.background = colorFondo; }
    else if (sesionesDia.length > 0) diaDiv.classList.add('cal-dia--con-sesion');
    else diaDiv.style.background = colorFondo;

    const num = document.createElement('div'); num.textContent = dia; num.className = 'cal-dia-numero';
    diaDiv.appendChild(num);

    if (sesionesDia.length > 0) {
      const hay = sesionesDia.some(s => s.completada), todas = sesionesDia.every(s => s.completada);
      const indic = document.createElement('div'); indic.className = 'cal-indicadores';
      sesionesDia.forEach(s => { const p = document.createElement('div'); p.className = 'cal-punto' + (s.completada ? ' cal-punto--completada' : ' cal-punto--pendiente'); indic.appendChild(p); });
      diaDiv.appendChild(indic);
      const badge = document.createElement('div'); badge.textContent = sesionesDia.length;
      badge.className = 'cal-badge' + (todas ? ' cal-badge--completo' : hay ? ' cal-badge--parcial' : ' cal-badge--pendiente');
      diaDiv.appendChild(badge);
      diaDiv.addEventListener('mouseenter', () => { diaDiv.style.transform='scale(1.05)'; diaDiv.style.boxShadow='var(--shadow-md)'; });
      diaDiv.addEventListener('mouseleave', () => { diaDiv.style.transform='scale(1)'; diaDiv.style.boxShadow=esHoy?'var(--shadow-md)':'none'; });
    } else {
      diaDiv.addEventListener('mouseenter', () => { if (mesosActivos.length) { diaDiv.style.transform='scale(1.02)'; diaDiv.style.opacity='0.8'; } });
      diaDiv.addEventListener('mouseleave', () => { diaDiv.style.transform='scale(1)'; diaDiv.style.opacity='1'; });
    }
    diaDiv.addEventListener('click', () => _mostrarInfoDia(fechaStr, fechaDia, sesionesDia, rutaActual, renderizar));
    diasGrid.appendChild(diaDiv);
  }
  mesCard.appendChild(diasGrid);
  return mesCard;
}

// ── Vista semanal ─────────────────────────────────────────────
function _renderVistaSemanal(container, sesionesPorFecha, hoy, rutaActual, renderizar, btnHoy) {
  let semanaOffset = parseInt(sessionStorage.getItem('calendarioSemanaOffset')) || 0;
  const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  const encabezadoFijo = document.createElement('div'); encabezadoFijo.id = 'encabezadoSemanaFijo';
  const navSemana = document.createElement('div'); navSemana.className = 'calendario-nav-semana';
  const btnAnt = document.createElement('button'); btnAnt.innerHTML = '←'; btnAnt.className = 'calendario-btn-semana';
  const tituloSemana = document.createElement('div'); tituloSemana.className = 'calendario-titulo-semana';
  const btnSig = document.createElement('button'); btnSig.innerHTML = '→'; btnSig.className = 'calendario-btn-semana';
  navSemana.append(btnAnt, tituloSemana, btnSig);
  encabezadoFijo.appendChild(navSemana);
  container.appendChild(encabezadoFijo);

  const diasContainer = document.createElement('div'); diasContainer.className = 'calendario-dias-container';
  setTimeout(() => { diasContainer.style.paddingTop = '0px'; }, 20);
  container.appendChild(diasContainer);

  const renderSemana = () => {
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1) + (semanaOffset * 7));
    const fin = new Date(inicio); fin.setDate(inicio.getDate() + 6);
    tituloSemana.textContent = inicio.getMonth() === fin.getMonth()
      ? `${MESES[inicio.getMonth()]} ${inicio.getFullYear()}`
      : `${MESES[inicio.getMonth()]} - ${MESES[fin.getMonth()]} ${fin.getFullYear()}`;
    diasContainer.innerHTML = '';

    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicio); dia.setDate(inicio.getDate() + i);
      const fStr = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,'0')}-${String(dia.getDate()).padStart(2,'0')}`;
      const sesionesDia = sesionesPorFecha[fStr] || [];
      const esHoy = dia.toDateString() === hoy.toDateString();

      const card = document.createElement('div');
      card.className = 'calendario-sesion-card' + (esHoy ? ' cal-dia-hoy' : '');

      const header = document.createElement('div'); header.className = 'calendario-dia-header';
      const infoFecha = document.createElement('div');
      const nombre = document.createElement('div'); nombre.textContent = DIAS[i]; nombre.className = 'calendario-dia-nombre' + (esHoy ? ' hoy' : '');
      const numero = document.createElement('div'); numero.textContent = dia.getDate(); numero.className = 'calendario-dia-numero' + (esHoy ? ' hoy' : '');
      infoFecha.append(nombre, numero); header.appendChild(infoFecha);

      if (sesionesDia.length > 0) {
        const hay = sesionesDia.some(s => s.completada), todas = sesionesDia.every(s => s.completada);
        const badge = document.createElement('div');
        badge.textContent = `${sesionesDia.length} ${sesionesDia.length === 1 ? 'sesión' : 'sesiones'}`;
        badge.className = 'calendario-sesion-badge' + (todas ? ' cal-badge--completo' : hay ? ' cal-badge--parcial' : ' cal-badge--pendiente');
        header.appendChild(badge);
      }
      card.appendChild(header);

      if (sesionesDia.length > 0) {
        sesionesDia.forEach(sesion => {
          const sesionDiv = document.createElement('div'); sesionDiv.className = 'calendario-sesion-item cal-sesion-item-semanal';
          const icon = document.createElement('span'); icon.className = 'cal-sesion-estado-icon'; icon.textContent = sesion.completada ? '✅' : '⏳';
          const info = document.createElement('div'); info.className = 'cal-sesion-info';
          const nomS = document.createElement('div'); nomS.textContent = sesion.nombre; nomS.className = 'cal-sesion-nombre-semanal';
          const cantEj = document.createElement('div'); cantEj.textContent = `${sesion.ejercicios.length} ejercicio${sesion.ejercicios.length !== 1 ? 's' : ''}`; cantEj.className = 'cal-sesion-cant-ejercicios';
          info.append(nomS, cantEj);
          sesionDiv.append(icon, info);
          if (sesion.duracionMinutos > 0) {
            const dur = document.createElement('span'); dur.className = 'cal-sesion-duracion'; dur.textContent = `⏱ ${formatearDuracion(sesion.duracionMinutos)}`;
            sesionDiv.appendChild(dur);
          }
          if (sesion._stats?.totalSeries > 0) {
            const pct = Math.round((sesion._stats.seriesCompletadas / sesion._stats.totalSeries) * 100);
            const estado = document.createElement('div'); estado.className = 'cal-sesion-estado';
            estado.textContent = `${pct}%`;
            estado.style.color = sesion.completada ? '#4CAF50' : pct > 0 ? '#FF9800' : '#FF9800';
            sesionDiv.appendChild(estado);
          }
          sesionDiv.addEventListener('click', () => { rutaActual.length = 0; rutaActual.push(...sesion.ruta); renderizar(); });
          card.appendChild(sesionDiv);
        });
      } else {
        const sin = document.createElement('div'); sin.className = 'cal-sin-sesiones';
        sin.innerHTML = '<div class="cal-sin-sesiones-icon">💤</div><div>Sin sesiones programadas</div>';
        card.appendChild(sin);
      }
      diasContainer.appendChild(card);
    }
  };

  btnAnt.addEventListener('click', () => { semanaOffset--; sessionStorage.setItem('calendarioSemanaOffset', semanaOffset); renderSemana(); });
  btnSig.addEventListener('click', () => { semanaOffset++; sessionStorage.setItem('calendarioSemanaOffset', semanaOffset); renderSemana(); });
  btnHoy.onclick = () => { semanaOffset = 0; sessionStorage.setItem('calendarioSemanaOffset', 0); renderSemana(); };
  renderSemana();
}

// ── Modal info día ────────────────────────────────────────────
function _mostrarInfoDia(fechaStr, fechaDia, sesiones, rutaActual, renderizar) {
  let mesoInfo = null, microInfos = [];
  window.datos?.[0]?.hijos?.forEach((meso, mesoIdx) => {
    let ini = null, fin = null;
    meso.hijos?.forEach(micro => micro.hijos?.forEach(sesion => {
      let f = sesion.fecha;
      if (!f && sesion.hijos?.length > 0) for (const s of sesion.hijos) { if (s.fecha) { f = s.fecha; break; } }
      if (f) { const d = new Date(f+'T00:00:00'); if (!ini||d<ini) ini=d; if (!fin||d>fin) fin=d; }
    }));
    if (ini && fin && fechaDia >= ini && fechaDia <= fin) mesoInfo = { nombre: meso.nombre || `Mesociclo ${mesoIdx+1}`, inicio: ini, fin };
    meso.hijos?.forEach((micro, microIdx) => {
      let mi = null, mf = null;
      micro.hijos?.forEach(sesion => {
        let f = sesion.fecha;
        if (!f && sesion.hijos?.length > 0) for (const s of sesion.hijos) { if (s.fecha) { f = s.fecha; break; } }
        if (f) { const d = new Date(f+'T00:00:00'); if (!mi||d<mi) mi=d; if (!mf||d>mf) mf=d; }
      });
      if (mi && mf && fechaDia >= mi && fechaDia <= mf) microInfos.push({ nombre: micro.nombre || `Microciclo ${microIdx+1}`, inicio: mi, fin: mf });
    });
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay cal-modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const modal = document.createElement('div'); modal.className = 'cal-modal';
  const fechaFmt = fechaDia.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const titulo = document.createElement('h3'); titulo.className = 'cal-modal-titulo';
  titulo.textContent = fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1);
  modal.appendChild(titulo);

  if (mesoInfo || microInfos.length > 0) {
    const info = document.createElement('div'); info.className = 'cal-info-periodo';
    const infoTit = document.createElement('div'); infoTit.className = 'cal-info-periodo-titulo'; infoTit.textContent = '📅 Información del período';
    info.appendChild(infoTit);
    if (mesoInfo) {
      const div = document.createElement('div'); div.className = 'cal-meso-info';
      div.innerHTML = `<div class="cal-info-label">Mesociclo</div><div class="cal-info-nombre">${mesoInfo.nombre}</div>`;
      info.appendChild(div);
    }
    microInfos.forEach(mi => {
      const div = document.createElement('div'); div.className = 'cal-micro-info';
      div.innerHTML = `<div class="cal-info-label">Microciclo</div><div class="cal-info-nombre">${mi.nombre}</div>`;
      info.appendChild(div);
    });
    modal.appendChild(info);
  }

  if (sesiones.length > 0) {
    sesiones.forEach(sesion => {
      const sDiv = document.createElement('div'); sDiv.className = 'calendario-sesion-item';
      sDiv.innerHTML = `
        <div style="flex:1;text-align:left;">
          <div class="cal-sesion-nombre">${sesion.nombre}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);">${sesion.ejercicios.length} ejercicios${sesion.duracionMinutos > 0 ? ' · '+formatearDuracion(sesion.duracionMinutos) : ''}</div>
        </div>
        <div class="cal-sesion-estado">${sesion.completada ? '✅' : '⏳'}</div>`;
      sDiv.style.cursor = 'pointer';
      sDiv.addEventListener('click', () => { overlay.remove(); rutaActual.length = 0; rutaActual.push(...sesion.ruta); renderizar(); });
      modal.appendChild(sDiv);
    });
  }

  const botones = document.createElement('div'); botones.className = 'cal-modal-botones';
  const btnCerrar = document.createElement('button'); btnCerrar.className = 'btn-confirmacion-no'; btnCerrar.textContent = 'Cerrar';
  btnCerrar.onclick = () => overlay.remove();
  botones.appendChild(btnCerrar);
  modal.appendChild(botones);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
