// calendario.js
// Renderizado del calendario con vista mensual y semanal

export function renderizarCalendario(datos, contenido, subHeader, rutaActual, renderizar) {
  subHeader.innerHTML = '';

  let vistaActual = sessionStorage.getItem('calendarioVista') || 'mensual';

  // ===== SUBHEADER =====
  const subHeaderContent = document.createElement('div');
  subHeaderContent.className = 'cal-subheader-content';

  // Lado izquierdo: selector de vista
  const leftSide = document.createElement('div');
  leftSide.className = 'cal-subheader-left';

  const selectorVista = document.createElement('div');
  selectorVista.className = 'cal-selector-vista';

  const btnMensual = document.createElement('button');
  btnMensual.textContent = '📅 Mes';
  btnMensual.className = 'calendario-vista-btn' + (vistaActual === 'mensual' ? ' active' : '');

  const btnSemanal = document.createElement('button');
  btnSemanal.textContent = '📆 Semana';
  btnSemanal.className = 'calendario-vista-btn' + (vistaActual === 'semanal' ? ' active' : '');

  selectorVista.appendChild(btnMensual);
  selectorVista.appendChild(btnSemanal);
  leftSide.appendChild(selectorVista);

  // Centro: título absoluto
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = '';
  h2Nivel.className = 'cal-titulo-nivel';

  // Lado derecho: botón hoy + selector mes
  const rightSide = document.createElement('div');
  rightSide.className = 'cal-subheader-right';

  const btnHoy = document.createElement('button');
  btnHoy.textContent = '📍 Hoy';
  btnHoy.className = 'btn-hoy-calendario';

  const selectorMes = document.createElement('select');
  selectorMes.className = 'selector-mes-calendario';
  selectorMes.style.display = vistaActual === 'mensual' ? 'block' : 'none';

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  for (let offset = -12; offset <= 12; offset++) {
    const fecha = new Date(añoActual, mesActual + offset, 1);
    const option = document.createElement('option');
    option.value = offset;
    option.textContent = `${mesesNombres[fecha.getMonth()]} ${fecha.getFullYear()}`;
    if (offset === 0) option.selected = true;
    selectorMes.appendChild(option);
  }

  rightSide.appendChild(btnHoy);
  rightSide.appendChild(selectorMes);

  subHeaderContent.appendChild(leftSide);
  subHeaderContent.appendChild(h2Nivel);
  subHeaderContent.appendChild(rightSide);
  subHeader.appendChild(subHeaderContent);

  contenido.innerHTML = '';

  // Contenedor principal
  const calendarioContainer = document.createElement('div');
  calendarioContainer.className = 'calendario-container';
  calendarioContainer.id = 'calendarioContainer';

  // Calcular altura dinámica
  const calcularAlturaSuperior = () => {
    const header = document.querySelector('header');
    const subHeaderEl = document.getElementById('subHeader');
    const footer = document.getElementById('footerNav');
    const headerHeight = header ? header.offsetHeight : 48;
    const subHeaderHeight = subHeaderEl ? subHeaderEl.offsetHeight : 76;
    const footerHeight = footer ? footer.offsetHeight : 64;
    const totalTopHeight = headerHeight + subHeaderHeight;
    calendarioContainer.style.paddingTop = `${totalTopHeight}px`;
    calendarioContainer.style.height = `calc(100vh - ${totalTopHeight}px - ${footerHeight}px)`;
  };

  requestAnimationFrame(() => {
    calcularAlturaSuperior();
    setTimeout(calcularAlturaSuperior, 100);
  });

  let resizeTimeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(calcularAlturaSuperior, 100);
  };
  window.addEventListener('resize', handleResize);
  calendarioContainer.addEventListener('DOMNodeRemoved', () => {
    window.removeEventListener('resize', handleResize);
  });

  const sesiones = obtenerSesiones(datos);
  const sesionesPorFecha = crearMapaSesionesPorFecha(sesiones);

  const renderizarVista = (vista) => {
    calendarioContainer.innerHTML = '';
    vistaActual = vista;
    sessionStorage.setItem('calendarioVista', vista);

    // Actualizar clases de botones
    btnMensual.className = 'calendario-vista-btn' + (vista === 'mensual' ? ' active' : '');
    btnSemanal.className = 'calendario-vista-btn' + (vista === 'semanal' ? ' active' : '');

    selectorMes.style.display = vista === 'mensual' ? 'block' : 'none';
    calendarioContainer.className = 'calendario-container' + (vista === 'mensual' ? ' cal-padding' : '');

    if (vista === 'mensual') {
      renderizarVistaMensual(calendarioContainer, sesionesPorFecha, hoy, rutaActual, renderizar, selectorMes, btnHoy);
    } else {
      renderizarVistaSemanal(calendarioContainer, sesionesPorFecha, hoy, rutaActual, renderizar, btnHoy);
    }
  };

  btnMensual.addEventListener('click', () => renderizarVista('mensual'));
  btnSemanal.addEventListener('click', () => renderizarVista('semanal'));

  btnHoy.addEventListener('mouseenter', () => btnHoy.classList.add('cal-btn-hoy--hover'));
  btnHoy.addEventListener('mouseleave', () => btnHoy.classList.remove('cal-btn-hoy--hover'));

  contenido.appendChild(calendarioContainer);
  renderizarVista(vistaActual);
}

// ==================== OBTENER SESIONES ====================
function obtenerSesiones(datos) {
  const sesiones = [];
  datos[0]?.hijos?.forEach((meso, i) => {
    meso.hijos?.forEach((micro, j) => {
      micro.hijos?.forEach((sesion, k) => {
        let fechaSesion = sesion.fecha;
        if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
          for (const subNivel of sesion.hijos) {
            if (subNivel.fecha) { fechaSesion = subNivel.fecha; break; }
          }
        }
        if (fechaSesion) {
          let totalSeries = 0, seriesCompletadas = 0;
          if (sesion.hijos && sesion.hijos.length > 0) {
            sesion.hijos.forEach(item => {
              if (item.series && item.series.length > 0) {
                totalSeries += item.series.length;
                seriesCompletadas += item.series.filter(s => s.completada).length;
              }
              if (item.hijos && item.hijos.length > 0) {
                item.hijos.forEach(ej => {
                  if (ej.series && ej.series.length > 0) {
                    totalSeries += ej.series.length;
                    seriesCompletadas += ej.series.filter(s => s.completada).length;
                  }
                });
              }
            });
          }
          sesiones.push({
            fecha: fechaSesion,
            nombre: sesion.nombre || 'Sesión sin nombre',
            ejercicios: sesion.hijos || [],
            ruta: [0, i, j, k],
            completada: totalSeries > 0 && totalSeries === seriesCompletadas,
            duracionMinutos: sesion.duracionMinutos || 0,
            _stats: { totalSeries, seriesCompletadas }
          });
        }
      });
    });
  });
  return sesiones;
}

function crearMapaSesionesPorFecha(sesiones) {
  const mapa = {};
  sesiones.forEach(s => {
    if (!mapa[s.fecha]) mapa[s.fecha] = [];
    mapa[s.fecha].push(s);
  });
  return mapa;
}

// ==================== VISTA MENSUAL ====================
function renderizarVistaMensual(container, sesionesPorFecha, hoy, rutaActual, renderizar, selectorMes, btnHoy) {
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();
  let mesActualCard = null;
  const mesesCards = [];

  for (let offset = -12; offset <= 12; offset++) {
    const fecha = new Date(añoActual, mesActual + offset, 1);
    const mesCard = crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar);
    if (offset === 0) { mesActualCard = mesCard; mesCard.id = 'mes-actual-calendario'; }
    mesCard.dataset.offset = offset;
    mesesCards.push({ offset, card: mesCard, fecha });
    container.appendChild(mesCard);
  }

  selectorMes.addEventListener('change', (e) => {
    const offset = parseInt(e.target.value);
    const mesCard = mesesCards.find(m => m.offset === offset);
    if (mesCard) {
      const header = document.querySelector('header');
      const subHeaderEl = document.getElementById('subHeader');
      const headerHeight = header ? header.offsetHeight : 48;
      const subHeaderHeight = subHeaderEl ? subHeaderEl.offsetHeight : 76;
      const offset2 = headerHeight + subHeaderHeight + 16;
      const elementPosition = mesCard.card.getBoundingClientRect().top;
      const offsetPosition = elementPosition + container.scrollTop - offset2;
      container.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  });

  btnHoy.onclick = () => {
    if (mesActualCard) {
      const header = document.querySelector('header');
      const subHeaderEl = document.getElementById('subHeader');
      const headerHeight = header ? header.offsetHeight : 48;
      const subHeaderHeight = subHeaderEl ? subHeaderEl.offsetHeight : 76;
      const offset = headerHeight + subHeaderHeight + 16;
      setTimeout(() => {
        const elementPosition = mesActualCard.getBoundingClientRect().top;
        const offsetPosition = elementPosition + container.scrollTop - offset;
        container.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }, 200);
    }
  };
}

// ==================== CREAR MES ====================
function crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar) {
  const mesCard = document.createElement('div');
  mesCard.className = 'mes-card cal-mes-card';

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const titulo = document.createElement('h3');
  titulo.textContent = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  titulo.className = 'cal-mes-titulo';
  mesCard.appendChild(titulo);

  // Barra de progreso
  const fechaStr0 = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
  const sesionesMes = Object.entries(sesionesPorFecha)
    .filter(([f]) => f.startsWith(fechaStr0))
    .flatMap(([, s]) => s);
  if (sesionesMes.length > 0) {
    const completadas = sesionesMes.filter(s => s.completada).length;
    const porcentaje = Math.round((completadas / sesionesMes.length) * 100);
    const progressBar = document.createElement('div');
    progressBar.className = 'cal-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'cal-progress-fill';
    progressFill.style.width = `${porcentaje}%`;
    progressFill.style.background = porcentaje >= 80
      ? 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)'
      : porcentaje >= 50
        ? 'linear-gradient(90deg, #FFA500 0%, #FFB84D 100%)'
        : 'linear-gradient(90deg, #FF6B6B 0%, #FF8787 100%)';
    progressBar.appendChild(progressFill);
    mesCard.appendChild(progressBar);
  }

  // Cabecera de días de la semana
  const diasSemana = document.createElement('div');
  diasSemana.className = 'dias-semana-header cal-dias-semana';
  ['L','M','X','J','V','S','D'].forEach(dia => {
    const diaHeader = document.createElement('div');
    diaHeader.textContent = dia;
    diaHeader.className = 'cal-dia-semana-label';
    diasSemana.appendChild(diaHeader);
  });
  mesCard.appendChild(diasSemana);

  // Grid de días
  const diasGrid = document.createElement('div');
  diasGrid.className = 'dias-grid cal-dias-grid';

  const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  let primerDiaSemana = primerDia.getDay();
  primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
  const totalDias = ultimoDia.getDate();

  for (let i = 0; i < primerDiaSemana; i++) {
    const diaVacio = document.createElement('div');
    diaVacio.className = 'dia-vacio cal-dia-vacio';
    diasGrid.appendChild(diaVacio);
  }

  const coloresMeso = [
    'rgba(61,213,152,0.12)', 'rgba(0,212,212,0.12)', 'rgba(255,107,107,0.12)',
    'rgba(156,39,176,0.12)', 'rgba(255,193,7,0.12)', 'rgba(33,150,243,0.12)',
    'rgba(76,175,80,0.12)',  'rgba(255,152,0,0.12)',
  ];

  const rangosMeso = [];
  if (window.datos && window.datos[0]) {
    window.datos[0].hijos?.forEach((meso, mesoIdx) => {
      let fechaInicioMeso = null, fechaFinMeso = null;
      meso.hijos?.forEach((micro) => {
        micro.hijos?.forEach((sesion) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos?.length > 0) {
            for (const sub of sesion.hijos) { if (sub.fecha) { fechaSesion = sub.fecha; break; } }
          }
          if (fechaSesion) {
            const fechaObj = new Date(fechaSesion + 'T00:00:00');
            if (!fechaInicioMeso || fechaObj < fechaInicioMeso) fechaInicioMeso = fechaObj;
            if (!fechaFinMeso   || fechaObj > fechaFinMeso)   fechaFinMeso   = fechaObj;
          }
        });
      });
      if (fechaInicioMeso && fechaFinMeso) {
        rangosMeso.push({ inicio: fechaInicioMeso, fin: fechaFinMeso, color: coloresMeso[mesoIdx % coloresMeso.length] });
      }
    });
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const fechaDia = new Date(fecha.getFullYear(), fecha.getMonth(), dia);
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const sesionesDia = sesionesPorFecha[fechaStr] || [];
    const esHoy = fechaDia.toDateString() === hoy.toDateString();

    const mesosActivos = rangosMeso.filter(r => fechaDia >= r.inicio && fechaDia <= r.fin);
    let colorFondo = 'var(--bg-main)';
    if (mesosActivos.length > 0) colorFondo = mesosActivos[0].color;

    const diaDiv = document.createElement('div');
    diaDiv.className = 'cal-dia-celda';

    if (esHoy && sesionesDia.length > 0) {
      diaDiv.classList.add('cal-dia--hoy-con-sesion');
    } else if (esHoy) {
      diaDiv.classList.add('cal-dia--hoy');
      diaDiv.style.background = colorFondo;
    } else if (sesionesDia.length > 0) {
      diaDiv.classList.add('cal-dia--con-sesion');
    } else {
      diaDiv.style.background = colorFondo;
    }

    const numeroDia = document.createElement('div');
    numeroDia.textContent = dia;
    numeroDia.className = 'cal-dia-numero';
    diaDiv.appendChild(numeroDia);

    if (sesionesDia.length > 0) {
      const hayCompletadas = sesionesDia.some(s => s.completada);
      const todasCompletadas = sesionesDia.every(s => s.completada);

      const indicadoresContainer = document.createElement('div');
      indicadoresContainer.className = 'cal-indicadores';
      sesionesDia.forEach(sesion => {
        const punto = document.createElement('div');
        punto.className = 'cal-punto' + (sesion.completada ? ' cal-punto--completada' : ' cal-punto--pendiente');
        indicadoresContainer.appendChild(punto);
      });
      diaDiv.appendChild(indicadoresContainer);

      const badge = document.createElement('div');
      badge.textContent = sesionesDia.length;
      badge.className = 'cal-badge' + (todasCompletadas ? ' cal-badge--completo' : hayCompletadas ? ' cal-badge--parcial' : ' cal-badge--pendiente');
      diaDiv.appendChild(badge);

      diaDiv.addEventListener('click', () => mostrarInfoDia(fechaStr, fechaDia, sesionesDia, rutaActual, renderizar));
      diaDiv.addEventListener('mouseenter', () => { diaDiv.style.transform = 'scale(1.05)'; diaDiv.style.boxShadow = 'var(--shadow-md)'; });
      diaDiv.addEventListener('mouseleave', () => { diaDiv.style.transform = 'scale(1)'; diaDiv.style.boxShadow = esHoy ? 'var(--shadow-md)' : 'none'; });
    } else {
      diaDiv.addEventListener('click', () => mostrarInfoDia(fechaStr, fechaDia, sesionesDia, rutaActual, renderizar));
      diaDiv.addEventListener('mouseenter', () => { if (mesosActivos.length > 0) { diaDiv.style.transform = 'scale(1.02)'; diaDiv.style.opacity = '0.8'; } });
      diaDiv.addEventListener('mouseleave', () => { diaDiv.style.transform = 'scale(1)'; diaDiv.style.opacity = '1'; });
    }

    diasGrid.appendChild(diaDiv);
  }

  mesCard.appendChild(diasGrid);
  return mesCard;
}

// ==================== VISTA SEMANAL ====================
function renderizarVistaSemanal(container, sesionesPorFecha, hoy, rutaActual, renderizar, btnHoy) {
  let semanaOffset = parseInt(sessionStorage.getItem('calendarioSemanaOffset')) || 0;

  const encabezadoFijo = document.createElement('div');
  encabezadoFijo.id = 'encabezadoSemanaFijo';

  const navSemana = document.createElement('div');
  navSemana.className = 'calendario-nav-semana';

  const btnAnterior = document.createElement('button');
  btnAnterior.innerHTML = '←';
  btnAnterior.className = 'calendario-btn-semana';

  const tituloSemana = document.createElement('div');
  tituloSemana.className = 'calendario-titulo-semana';

  const btnSiguiente = document.createElement('button');
  btnSiguiente.innerHTML = '→';
  btnSiguiente.className = 'calendario-btn-semana';

  navSemana.appendChild(btnAnterior);
  navSemana.appendChild(tituloSemana);
  navSemana.appendChild(btnSiguiente);
  encabezadoFijo.appendChild(navSemana);
  container.appendChild(encabezadoFijo);

  const diasContainer = document.createElement('div');
  diasContainer.className = 'calendario-dias-container';

  const calcularPaddingDias = () => {
    const encabezadoHeight = encabezadoFijo ? encabezadoFijo.offsetHeight : 0;
    diasContainer.style.paddingTop = '0px';
  };
  setTimeout(calcularPaddingDias, 20);
  container.appendChild(diasContainer);

  const renderizarSemana = () => {
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1 + (semanaOffset * 7));
    if (hoy.getDay() === 0) inicioSemana.setDate(inicioSemana.getDate() - 7);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);

    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mesInicio = meses[inicioSemana.getMonth()];
    const mesFin = meses[finSemana.getMonth()];

    tituloSemana.textContent = inicioSemana.getMonth() === finSemana.getMonth()
      ? `${inicioSemana.getDate()} - ${finSemana.getDate()} ${mesInicio} ${inicioSemana.getFullYear()}`
      : `${inicioSemana.getDate()} ${mesInicio} - ${finSemana.getDate()} ${mesFin} ${inicioSemana.getFullYear()}`;

    diasContainer.innerHTML = '';

    const diasSemana = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(inicioSemana);
      fechaDia.setDate(inicioSemana.getDate() + i);
      const diaCard = crearDiaSemanaSemanal(fechaDia, diasSemana[i], sesionesPorFecha, hoy, rutaActual, renderizar);
      if (fechaDia.toDateString() === hoy.toDateString()) diaCard.id = 'dia-actual-semana';
      diasContainer.appendChild(diaCard);
    }

    sessionStorage.setItem('calendarioSemanaOffset', semanaOffset);
  };

  btnAnterior.addEventListener('click', () => { semanaOffset--; renderizarSemana(); });
  btnSiguiente.addEventListener('click', () => { semanaOffset++; renderizarSemana(); });

  btnAnterior.addEventListener('mouseenter', () => btnAnterior.classList.add('cal-btn-nav--hover'));
  btnAnterior.addEventListener('mouseleave', () => btnAnterior.classList.remove('cal-btn-nav--hover'));
  btnSiguiente.addEventListener('mouseenter', () => btnSiguiente.classList.add('cal-btn-nav--hover'));
  btnSiguiente.addEventListener('mouseleave', () => btnSiguiente.classList.remove('cal-btn-nav--hover'));

  btnHoy.onclick = () => {
    semanaOffset = 0;
    sessionStorage.setItem('calendarioSemanaOffset', '0');
    renderizarSemana();
    setTimeout(() => {
      const diaActual = document.getElementById('dia-actual-semana');
      const encabezado = document.getElementById('encabezadoSemanaFijo');
      if (diaActual && encabezado) {
        const containerEl = document.getElementById('calendarioContainer');
        const encabezadoHeight = encabezado.offsetHeight;
        const diaActualTop = diaActual.offsetTop;
        const scrollPosition = diaActualTop - encabezadoHeight - 12;
        containerEl.scrollTo({ top: scrollPosition, behavior: 'smooth' });
      }
    }, 150);
  };

  renderizarSemana();
}

// ==================== DÍA EN VISTA SEMANAL ====================
function crearDiaSemanaSemanal(fechaDia, nombreDia, sesionesPorFecha, hoy, rutaActual, renderizar) {
  const fechaStr = `${fechaDia.getFullYear()}-${String(fechaDia.getMonth()+1).padStart(2,'0')}-${String(fechaDia.getDate()).padStart(2,'0')}`;
  const sesionesDia = sesionesPorFecha[fechaStr] || [];
  const esHoy = fechaDia.toDateString() === hoy.toDateString();

  const card = document.createElement('div');
  card.className = 'calendario-dia-card' + (esHoy ? ' hoy' : '');

  const header = document.createElement('div');
  header.className = 'calendario-dia-header';

  const infoFecha = document.createElement('div');
  const nombre = document.createElement('div');
  nombre.textContent = nombreDia;
  nombre.className = 'calendario-dia-nombre' + (esHoy ? ' hoy' : '');
  const numero = document.createElement('div');
  numero.textContent = fechaDia.getDate();
  numero.className = 'calendario-dia-numero' + (esHoy ? ' hoy' : '');
  infoFecha.appendChild(nombre);
  infoFecha.appendChild(numero);
  header.appendChild(infoFecha);

  if (sesionesDia.length > 0) {
    const hayCompletadas = sesionesDia.some(s => s.completada);
    const todasCompletadas = sesionesDia.every(s => s.completada);
    const badge = document.createElement('div');
    badge.textContent = `${sesionesDia.length} ${sesionesDia.length === 1 ? 'sesión' : 'sesiones'}`;
    badge.className = 'calendario-sesion-badge' + (todasCompletadas ? ' cal-badge--completo' : hayCompletadas ? ' cal-badge--parcial' : ' cal-badge--pendiente');
    header.appendChild(badge);
  }

  card.appendChild(header);

  if (sesionesDia.length > 0) {
    sesionesDia.forEach(sesion => {
      const sesionDiv = document.createElement('div');
      sesionDiv.className = 'calendario-sesion-item cal-sesion-item-semanal';

      const estadoIcon = document.createElement('span');
      estadoIcon.className = 'cal-sesion-estado-icon';
      estadoIcon.textContent = sesion.completada ? '✅' : '⏳';
      sesionDiv.appendChild(estadoIcon);

      const infoSesion = document.createElement('div');
      infoSesion.className = 'cal-sesion-info';

      const nombreSesion = document.createElement('div');
      nombreSesion.textContent = sesion.nombre;
      nombreSesion.className = 'cal-sesion-nombre-semanal';
      infoSesion.appendChild(nombreSesion);

      const cantEj = document.createElement('div');
      cantEj.textContent = `${sesion.ejercicios.length} ejercicio${sesion.ejercicios.length !== 1 ? 's' : ''}`;
      cantEj.className = 'cal-sesion-cant-ejercicios';
      infoSesion.appendChild(cantEj);

      sesionDiv.appendChild(infoSesion);

      if (sesion.duracionMinutos > 0) {
        const dur = document.createElement('span');
        dur.className = 'cal-sesion-duracion';
        dur.textContent = `⏱ ${formatearDuracion(sesion.duracionMinutos)}`;
        sesionDiv.appendChild(dur);
      }

      const estado = document.createElement('div');
      estado.className = 'cal-sesion-estado';
      if (sesion._stats && sesion._stats.totalSeries > 0) {
        const pct = Math.round((sesion._stats.seriesCompletadas / sesion._stats.totalSeries) * 100);
        estado.textContent = `${pct}%`;
        estado.style.color = sesion.completada ? '#4CAF50' : pct > 0 ? '#FF9800' : '#FF9800';
      }
      sesionDiv.appendChild(estado);

      sesionDiv.addEventListener('click', () => {
        rutaActual.length = 0;
        rutaActual.push(...sesion.ruta);
        renderizar();
      });

      card.appendChild(sesionDiv);
    });
  } else {
    const sinSesiones = document.createElement('div');
    sinSesiones.className = 'cal-sin-sesiones';
    sinSesiones.innerHTML = `<div class="cal-sin-sesiones-icon">💤</div><div>Sin sesiones programadas</div>`;
    card.appendChild(sinSesiones);
  }

  card.style.cursor = 'pointer';
  card.addEventListener('click', (e) => {
    if (e.target.closest('.calendario-sesion-item')) return;
    mostrarInfoDia(fechaStr, fechaDia, sesionesDia, rutaActual, renderizar);
  });

  return card;
}

function formatearDuracion(minutos) {
  if (!minutos) return '';
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ==================== MODAL INFO DÍA ====================
function mostrarInfoDia(fechaStr, fechaDia, sesiones, rutaActual, renderizar) {
  let mesoInfo = null;
  let microInfos = [];

  if (window.datos && window.datos[0]) {
    window.datos[0].hijos?.forEach((meso, mesoIdx) => {
      let fechaInicioMeso = null, fechaFinMeso = null;
      meso.hijos?.forEach((micro) => {
        micro.hijos?.forEach((sesion) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos?.length > 0) {
            for (const sub of sesion.hijos) { if (sub.fecha) { fechaSesion = sub.fecha; break; } }
          }
          if (fechaSesion) {
            const fechaObj = new Date(fechaSesion + 'T00:00:00');
            if (!fechaInicioMeso || fechaObj < fechaInicioMeso) fechaInicioMeso = fechaObj;
            if (!fechaFinMeso   || fechaObj > fechaFinMeso)   fechaFinMeso   = fechaObj;
          }
        });
      });
      if (fechaInicioMeso && fechaFinMeso && fechaDia >= fechaInicioMeso && fechaDia <= fechaFinMeso) {
        mesoInfo = { nombre: meso.nombre || `Mesociclo ${mesoIdx + 1}`, indice: mesoIdx, inicio: fechaInicioMeso, fin: fechaFinMeso };
      }

      meso.hijos?.forEach((micro, microIdx) => {
        let fechaInicioMicro = null, fechaFinMicro = null;
        micro.hijos?.forEach((sesion) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos?.length > 0) {
            for (const sub of sesion.hijos) { if (sub.fecha) { fechaSesion = sub.fecha; break; } }
          }
          if (fechaSesion) {
            const fechaObj = new Date(fechaSesion + 'T00:00:00');
            if (!fechaInicioMicro || fechaObj < fechaInicioMicro) fechaInicioMicro = fechaObj;
            if (!fechaFinMicro   || fechaObj > fechaFinMicro)   fechaFinMicro   = fechaObj;
          }
        });
        if (fechaInicioMicro && fechaFinMicro && fechaDia >= fechaInicioMicro && fechaDia <= fechaFinMicro) {
          microInfos.push({ nombre: micro.nombre || `Microciclo ${microIdx + 1}`, indice: microIdx, inicio: fechaInicioMicro, fin: fechaFinMicro });
        }
      });
    });
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay cal-modal-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const modal = document.createElement('div');
  modal.className = 'modal cal-modal';

  const fechaFormateada = fechaDia.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const titulo = document.createElement('h3');
  titulo.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  titulo.className = 'cal-modal-titulo';
  modal.appendChild(titulo);

  // Info de mesociclo/microciclo
  if (mesoInfo || microInfos.length > 0) {
    const infoContainer = document.createElement('div');
    infoContainer.className = 'cal-info-periodo';

    const infoTitulo = document.createElement('div');
    infoTitulo.textContent = '📅 Información del período';
    infoTitulo.className = 'cal-info-periodo-titulo';
    infoContainer.appendChild(infoTitulo);

    if (mesoInfo) {
      const mesoDiv = document.createElement('div');
      mesoDiv.className = 'cal-meso-info' + (microInfos.length > 0 ? ' cal-meso-info--con-borde' : '');
      const inicioStr = mesoInfo.inicio.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
      const finStr = mesoInfo.fin.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
      mesoDiv.innerHTML = `
        <div class="cal-info-label">💪 Mesociclo</div>
        <div class="cal-info-nombre">${mesoInfo.nombre}</div>
        <div class="cal-info-rango">${inicioStr} - ${finStr}</div>
      `;
      infoContainer.appendChild(mesoDiv);
    }

    microInfos.forEach(micro => {
      const microDiv = document.createElement('div');
      microDiv.className = 'cal-micro-info';
      const inicioStr = micro.inicio.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
      const finStr = micro.fin.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
      microDiv.innerHTML = `
        <div class="cal-info-label">📆 Microciclo</div>
        <div class="cal-info-nombre">${micro.nombre}</div>
        <div class="cal-info-rango">${inicioStr} - ${finStr}</div>
      `;
      infoContainer.appendChild(microDiv);
    });

    modal.appendChild(infoContainer);
  } else {
    const sinInfo = document.createElement('div');
    sinInfo.className = 'cal-sin-info-periodo';
    sinInfo.textContent = 'Este día no está asignado a ningún mesociclo';
    modal.appendChild(sinInfo);
  }

  // Sesiones del día
  if (sesiones.length > 0) {
    const sesionesContainer = document.createElement('div');

    const sesionesTitulo = document.createElement('div');
    sesionesTitulo.textContent = `🏋️ Sesiones (${sesiones.length})`;
    sesionesTitulo.className = 'cal-sesiones-titulo';
    sesionesContainer.appendChild(sesionesTitulo);

    sesiones.forEach(sesion => {
      const sesionDiv = document.createElement('div');
      sesionDiv.className = 'cal-sesion-modal-item';

      const nombreSesion = document.createElement('div');
      nombreSesion.textContent = sesion.nombre;
      nombreSesion.className = 'cal-sesion-modal-nombre';
      nombreSesion.addEventListener('mouseenter', () => nombreSesion.classList.add('cal-sesion-modal-nombre--hover'));
      nombreSesion.addEventListener('mouseleave', () => nombreSesion.classList.remove('cal-sesion-modal-nombre--hover'));
      nombreSesion.addEventListener('click', () => {
        rutaActual.length = 0;
        rutaActual.push(...sesion.ruta);
        renderizar();
        overlay.remove();
      });
      sesionDiv.appendChild(nombreSesion);

      const infoDiv = document.createElement('div');
      infoDiv.className = 'cal-sesion-modal-info';

      const cantidadEjercicios = document.createElement('div');
      cantidadEjercicios.textContent = `${sesion.ejercicios.length} ejercicio${sesion.ejercicios.length !== 1 ? 's' : ''}`;
      cantidadEjercicios.className = 'cal-sesion-modal-cant';
      infoDiv.appendChild(cantidadEjercicios);

      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = sesion.fecha;
      fechaInput.className = 'cal-sesion-fecha-input';
      fechaInput.addEventListener('click', (e) => e.stopPropagation());
      fechaInput.addEventListener('change', async (e) => {
        const nuevaFecha = e.target.value;
        if (window.datos && window.datos[0]) {
          const [, mesoIdx, microIdx, sesionIdx] = sesion.ruta;
          window.datos[0].hijos[mesoIdx].hijos[microIdx].hijos[sesionIdx].fecha = nuevaFecha;
          if (typeof window.guardarDatos === 'function') window.guardarDatos();
          overlay.remove();
          renderizar();
        }
      });
      infoDiv.appendChild(fechaInput);

      if (sesion.duracionMinutos > 0) {
        const durLabel = document.createElement('span');
        durLabel.className = 'cal-sesion-dur-label';
        durLabel.textContent = `⏱ ${formatearDuracion(sesion.duracionMinutos)}`;
        infoDiv.appendChild(durLabel);
      }

      sesionDiv.appendChild(infoDiv);

      if (sesion._stats && sesion._stats.totalSeries > 0) {
        const estado = document.createElement('div');
        estado.className = 'cal-sesion-modal-estado';
        const pct = Math.round((sesion._stats.seriesCompletadas / sesion._stats.totalSeries) * 100);
        estado.innerHTML = `
          <div class="cal-progress-bar cal-progress-bar--sesion">
            <div class="cal-progress-fill" style="width:${pct}%; background:${sesion.completada ? '#4CAF50' : pct > 0 ? '#FFA500' : '#FF6B6B'}"></div>
          </div>
          <div class="cal-sesion-pct" style="color:${sesion.completada ? '#4CAF50' : pct > 0 ? '#FF9800' : '#FF9800'}">${pct}% (${sesion._stats.seriesCompletadas}/${sesion._stats.totalSeries} series)</div>
        `;
        sesionDiv.appendChild(estado);
      }

      sesionDiv.addEventListener('click', () => {
        rutaActual.length = 0;
        rutaActual.push(...sesion.ruta);
        renderizar();
      });

      sesionesContainer.appendChild(sesionDiv);
    });

    modal.appendChild(sesionesContainer);
  } else if (mesoInfo || microInfos.length > 0) {
    const descanso = document.createElement('div');
    descanso.className = 'cal-descanso';
    descanso.innerHTML = `
      <div class="cal-descanso-icon">😴</div>
      <div class="cal-descanso-titulo">Día de descanso</div>
      <div class="cal-descanso-subtitulo">Sin sesiones programadas</div>
    `;
    modal.appendChild(descanso);
  } else {
    const sinSesiones = document.createElement('div');
    sinSesiones.className = 'cal-sin-sesiones-modal';
    sinSesiones.innerHTML = `<div class="cal-sin-sesiones-modal-icon">💤</div><div>Sin sesiones programadas</div>`;
    modal.appendChild(sinSesiones);
  }

  // Botones de acción
  const botonesContainer = document.createElement('div');
  botonesContainer.className = 'cal-modal-botones';

  if (microInfos.length > 0 && mesoInfo) {
    const btnCrearSesion = document.createElement('button');
    btnCrearSesion.textContent = '+ Crear sesión';
    btnCrearSesion.className = 'cal-btn-crear-sesion';
    btnCrearSesion.addEventListener('mouseenter', () => btnCrearSesion.classList.add('cal-btn-crear-sesion--hover'));
    btnCrearSesion.addEventListener('mouseleave', () => btnCrearSesion.classList.remove('cal-btn-crear-sesion--hover'));
    btnCrearSesion.addEventListener('click', () => {
      rutaActual.length = 0;
      rutaActual.push(0, mesoInfo.indice, microInfos[0].indice);
      renderizar();
      overlay.remove();
    });
    botonesContainer.appendChild(btnCrearSesion);
  } else {
    const btnIrEntrenamiento = document.createElement('button');
    btnIrEntrenamiento.textContent = '📋 Ir a Entrenamiento';
    btnIrEntrenamiento.className = 'cal-btn-ir-entrenamiento';
    btnIrEntrenamiento.addEventListener('mouseenter', () => btnIrEntrenamiento.classList.add('cal-btn-ir-entrenamiento--hover'));
    btnIrEntrenamiento.addEventListener('mouseleave', () => btnIrEntrenamiento.classList.remove('cal-btn-ir-entrenamiento--hover'));
    btnIrEntrenamiento.addEventListener('click', () => {
      rutaActual.length = 0;
      rutaActual.push(0);
      renderizar();
      overlay.remove();
      setTimeout(() => alert('⚠️ Primero debes crear un Mesociclo y luego un Microciclo para poder añadir sesiones.'), 300);
    });
    botonesContainer.appendChild(btnIrEntrenamiento);
  }

  const btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Cerrar';
  btnCerrar.className = 'cal-btn-cerrar';
  btnCerrar.addEventListener('mouseenter', () => btnCerrar.classList.add('cal-btn-cerrar--hover'));
  btnCerrar.addEventListener('mouseleave', () => btnCerrar.classList.remove('cal-btn-cerrar--hover'));
  btnCerrar.addEventListener('click', () => overlay.remove());
  botonesContainer.appendChild(btnCerrar);

  modal.appendChild(botonesContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}