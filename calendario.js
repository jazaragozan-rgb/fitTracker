// calendario.js
// Renderizado del calendario con vista mensual y semanal

export function renderizarCalendario(datos, contenido, subHeader, rutaActual, renderizar) {
  // Limpiar subheader
  subHeader.innerHTML = '';
  
  // Estado de la vista (guardar en sessionStorage para persistir)
  let vistaActual = sessionStorage.getItem('calendarioVista') || 'mensual';
  
  // ===== ESTRUCTURA DEL SUBHEADER =====
  // Contenedor principal con layout horizontal
  const subHeaderContent = document.createElement('div');
  subHeaderContent.style.display = 'flex';
  subHeaderContent.style.justifyContent = 'space-between';
  subHeaderContent.style.alignItems = 'flex-end'; // Alinear por la parte inferior
  subHeaderContent.style.width = '100%';
  subHeaderContent.style.gap = '12px';
  subHeaderContent.style.padding = '8px 12px 4px 12px'; // Padding inferior reducido para compactar
  subHeaderContent.style.position = 'relative';

  // ===== LADO IZQUIERDO: Selector de vista =====
  const leftSide = document.createElement('div');
  leftSide.style.display = 'flex';
  leftSide.style.flexDirection = 'column';
  leftSide.style.gap = '0px';
  leftSide.style.flex = '1';

  // Selector de vista (Mes/Semana) - 70px de altura
  const selectorVista = document.createElement('div');
  selectorVista.style.display = 'flex';
  selectorVista.style.background = 'var(--bg-main)';
  selectorVista.style.borderRadius = '8px';
  selectorVista.style.paddingBottom = '2px';
  selectorVista.style.border = '1px solid var(--border-color)';
  selectorVista.style.height = '60px'; // 70px de altura total

  const btnMensual = document.createElement('button');
  btnMensual.textContent = '📅 Mes';
  btnMensual.style.flex = '1';
  btnMensual.style.padding = '6px 12px';
  btnMensual.style.border = 'none';
  btnMensual.style.borderRadius = '6px';
  btnMensual.style.fontSize = '0.8rem';
  btnMensual.style.fontWeight = '700';
  btnMensual.style.cursor = 'pointer';
  btnMensual.style.transition = 'all 0.2s ease';
  btnMensual.style.background = vistaActual === 'mensual' ? 'var(--primary-mint)' : 'transparent';
  btnMensual.style.color = vistaActual === 'mensual' ? '#ffffff' : 'var(--text-secondary)';

  const btnSemanal = document.createElement('button');
  btnSemanal.textContent = '📆 Semana';
  btnSemanal.style.flex = '1';
  btnSemanal.style.padding = '6px 12px';
  btnSemanal.style.border = 'none';
  btnSemanal.style.borderRadius = '6px';
  btnSemanal.style.fontSize = '0.8rem';
  btnSemanal.style.fontWeight = '700';
  btnSemanal.style.cursor = 'pointer';
  btnSemanal.style.transition = 'all 0.2s ease';
  btnSemanal.style.background = vistaActual === 'semanal' ? 'var(--primary-mint)' : 'transparent';
  btnSemanal.style.color = vistaActual === 'semanal' ? '#ffffff' : 'var(--text-secondary)';

  selectorVista.appendChild(btnMensual);
  selectorVista.appendChild(btnSemanal);
  leftSide.appendChild(selectorVista);

  // ===== CENTRO: Título (posición absoluta para centrarlo) =====
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = '';
  h2Nivel.style.position = 'absolute';
  h2Nivel.style.left = '50%';
  h2Nivel.style.top = '8px';
  h2Nivel.style.transform = 'translateX(-50%)';
  h2Nivel.style.margin = '0';
  h2Nivel.style.fontSize = '1rem';
  h2Nivel.style.fontWeight = '700';
  h2Nivel.style.color = 'var(--primary-mint)';
  h2Nivel.style.textTransform = 'uppercase';
  h2Nivel.style.letterSpacing = '0.5px';
  h2Nivel.style.pointerEvents = 'none'; // Para que no interfiera con los clicks
  h2Nivel.style.zIndex = '1';

  // ===== LADO DERECHO: Navegación (Hoy + Selector mes) =====
  // Total: 70px = btnHoy (altura variable) + gap (espacio) + selectorMes (32px)
  // Calculamos: btnHoy = 70px - 32px - 6px(gap) = 32px
  const rightSide = document.createElement('div');
  rightSide.style.display = 'flex';
  rightSide.style.flexDirection = 'column';
  rightSide.style.justifyContent = 'space-between'; // Distribuir espacio
  rightSide.style.height = '70px'; // Altura total de 70px
  rightSide.style.minWidth = '180px';
  rightSide.style.flex = '1';
  rightSide.style.alignItems = 'flex-end';

  // Botón "Hoy" - altura calculada para que el total sea 70px
  const btnHoy = document.createElement('button');
  btnHoy.textContent = '📍 Hoy';
  btnHoy.className = 'btn-hoy-calendario';
  btnHoy.style.width = '100%';
  btnHoy.style.height = '22px'; // 32px para el botón Hoy
  btnHoy.style.padding = '0 12px';
  btnHoy.style.background = 'var(--primary-mint)';
  btnHoy.style.color = 'white';
  btnHoy.style.border = 'none';
  btnHoy.style.borderRadius = '8px';
  btnHoy.style.fontSize = '0.85rem';
  btnHoy.style.fontWeight = '700';
  btnHoy.style.cursor = 'pointer';
  btnHoy.style.transition = 'all 0.2s ease';
  btnHoy.style.textTransform = 'uppercase';
  btnHoy.style.letterSpacing = '0.5px';
  btnHoy.style.display = 'flex';
  btnHoy.style.alignItems = 'center';
  btnHoy.style.justifyContent = 'center';
  btnHoy.style.flexShrink = '0'; // No permitir que se encoja

  // Selector de mes - 32px fijo
  const selectorMes = document.createElement('select');
  selectorMes.className = 'selector-mes-calendario';
  selectorMes.style.width = '100%';
  selectorMes.style.height = '22px'; // 32px para el selector
  selectorMes.style.padding = '0 12px';
  selectorMes.style.border = '1px solid var(--border-color)';
  selectorMes.style.borderRadius = '8px';
  selectorMes.style.fontSize = '0.85rem';
  selectorMes.style.fontWeight = '600';
  selectorMes.style.background = 'var(--bg-card)';
  selectorMes.style.color = 'var(--text-primary)';
  selectorMes.style.cursor = 'pointer';
  selectorMes.style.display = vistaActual === 'mensual' ? 'block' : 'none';
  selectorMes.style.flexShrink = '0'; // No permitir que se encoja
  
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();
  
  // Generar opciones desde 12 meses atrás hasta 12 adelante
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

  // Ensamblar subheader
  subHeaderContent.appendChild(leftSide);
  subHeaderContent.appendChild(h2Nivel); // Título con posición absoluta
  subHeaderContent.appendChild(rightSide);
  subHeader.appendChild(subHeaderContent);

  // Limpiar contenido
  contenido.innerHTML = '';

  // Contenedor principal del calendario
  const calendarioContainer = document.createElement('div');
  calendarioContainer.className = 'calendario-container';
  calendarioContainer.id = 'calendarioContainer';
  calendarioContainer.style.padding = '16px';
  calendarioContainer.style.overflowY = 'auto';
  calendarioContainer.style.scrollBehavior = 'smooth';
  
  // Calcular dinámicamente el espacio superior
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

  // Obtener todas las sesiones con fecha
  const sesiones = obtenerSesiones(datos);
  const sesionesPorFecha = crearMapaSesionesPorFecha(sesiones);

  // Función para renderizar la vista correspondiente
  const renderizarVista = (vista) => {
    calendarioContainer.innerHTML = '';
    vistaActual = vista;
    sessionStorage.setItem('calendarioVista', vista);
    
    // Actualizar estilos de los botones
    btnMensual.style.background = vista === 'mensual' ? 'var(--primary-mint)' : 'transparent';
    btnMensual.style.color = vista === 'mensual' ? '#ffffff' : 'var(--text-secondary)';
    btnSemanal.style.background = vista === 'semanal' ? 'var(--primary-mint)' : 'transparent';
    btnSemanal.style.color = vista === 'semanal' ? '#ffffff' : 'var(--text-secondary)';
    
    // Mostrar/ocultar selector de mes según la vista
    selectorMes.style.display = vista === 'mensual' ? 'block' : 'none';
    
    if (vista === 'mensual') {
      renderizarVistaMensual(calendarioContainer, sesionesPorFecha, hoy, rutaActual, renderizar, selectorMes);
    } else {
      renderizarVistaSemanal(calendarioContainer, sesionesPorFecha, hoy, rutaActual, renderizar, btnHoy);
    }
  };

  // Event listeners para cambiar de vista
  btnMensual.addEventListener('click', () => renderizarVista('mensual'));
  btnSemanal.addEventListener('click', () => renderizarVista('semanal'));

  // Event listeners para hover
  btnHoy.addEventListener('mouseenter', () => {
    btnHoy.style.background = 'var(--mint-light)';
    btnHoy.style.transform = 'translateY(-1px)';
    btnHoy.style.boxShadow = 'var(--shadow-sm)';
  });

  btnHoy.addEventListener('mouseleave', () => {
    btnHoy.style.background = 'var(--primary-mint)';
    btnHoy.style.transform = 'translateY(0)';
    btnHoy.style.boxShadow = 'none';
  });

  contenido.appendChild(calendarioContainer);
  
  // Renderizar la vista inicial
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
            if (subNivel.fecha) {
              fechaSesion = subNivel.fecha;
              break;
            }
          }
        }
        if (fechaSesion) {
          let completada = false;
          let totalSeries = 0;
          let seriesCompletadas = 0;
          
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
          
          completada = totalSeries > 0 && totalSeries === seriesCompletadas;
          
          sesiones.push({
            fecha: fechaSesion,
            nombre: sesion.nombre || "Sesión sin nombre",
            ejercicios: sesion.hijos || [],
            ruta: [0, i, j, k],
            completada: completada,
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
    if (!mapa[s.fecha]) {
      mapa[s.fecha] = [];
    }
    mapa[s.fecha].push(s);
  });
  return mapa;
}

// ==================== VISTA MENSUAL ====================
function renderizarVistaMensual(container, sesionesPorFecha, hoy, rutaActual, renderizar, selectorMes) {
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();
  
  let mesActualCard = null;
  const mesesCards = [];

  // Generar desde 12 meses atrás hasta 12 meses adelante
  for (let offset = -12; offset <= 12; offset++) {
    const fecha = new Date(añoActual, mesActual + offset, 1);
    const mesCard = crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar);
    
    if (offset === 0) {
      mesActualCard = mesCard;
      mesCard.id = 'mes-actual-calendario';
    }
    
    mesCard.dataset.offset = offset;
    mesesCards.push({ offset, card: mesCard, fecha });
    container.appendChild(mesCard);
  }

  // Event listener para el selector de mes
  selectorMes.addEventListener('change', (e) => {
    const offset = parseInt(e.target.value);
    const mesCard = mesesCards.find(m => m.offset === offset);
    if (mesCard) {
      const header = document.querySelector('header');
      const subHeaderEl = document.getElementById('subHeader');
      const headerHeight = header ? header.offsetHeight : 48;
      const subHeaderHeight = subHeaderEl ? subHeaderEl.offsetHeight : 76;
      const scrollOffset = headerHeight + subHeaderHeight + 16;
      
      const elementPosition = mesCard.card.getBoundingClientRect().top;
      const offsetPosition = elementPosition + container.scrollTop - scrollOffset;
      
      container.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  });

  // Actualizar selector al hacer scroll
  let ticking = false;
  container.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        const containerTop = container.getBoundingClientRect().top;
        
        for (const mes of mesesCards) {
          const rect = mes.card.getBoundingClientRect();
          const relativeTop = rect.top - containerTop;
          
          if (relativeTop <= 100 && relativeTop >= -rect.height / 2) {
            selectorMes.value = mes.offset;
            break;
          }
        }
        
        ticking = false;
      });
      ticking = true;
    }
  });

  // Scroll al mes actual
  if (mesActualCard) {
    setTimeout(() => {
      const header = document.querySelector('header');
      const subHeaderEl = document.getElementById('subHeader');
      const headerHeight = header ? header.offsetHeight : 48;
      const subHeaderHeight = subHeaderEl ? subHeaderEl.offsetHeight : 76;
      const offset = headerHeight + subHeaderHeight + 16;
      
      const elementPosition = mesActualCard.getBoundingClientRect().top;
      const offsetPosition = elementPosition + container.scrollTop - offset;
      
      container.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }, 200);
  }
}

// ==================== VISTA SEMANAL ====================
function renderizarVistaSemanal(container, sesionesPorFecha, hoy, rutaActual, renderizar, btnHoy) {
  // Estado de la semana actual (guardar en sessionStorage)
  let semanaOffset = parseInt(sessionStorage.getItem('calendarioSemanaOffset')) || 0;
  
  // Contenedor de navegación de semana
  const navSemana = document.createElement('div');
  navSemana.style.display = 'flex';
  navSemana.style.justifyContent = 'space-between';
  navSemana.style.alignItems = 'center';
  navSemana.style.padding = '12px';
  navSemana.style.background = 'var(--bg-card)';
  navSemana.style.borderRadius = '12px';
  navSemana.style.marginBottom = '16px';
  navSemana.style.boxShadow = 'var(--shadow-sm)';

  const btnAnterior = document.createElement('button');
  btnAnterior.innerHTML = '←';
  btnAnterior.style.padding = '8px 16px';
  btnAnterior.style.background = 'var(--bg-main)';
  btnAnterior.style.border = '1px solid var(--border-color)';
  btnAnterior.style.borderRadius = '8px';
  btnAnterior.style.fontSize = '1.2rem';
  btnAnterior.style.fontWeight = '700';
  btnAnterior.style.cursor = 'pointer';
  btnAnterior.style.transition = 'all 0.2s ease';
  btnAnterior.style.width = '50px';
  btnAnterior.style.color = 'var(--primary-mint)';
  btnAnterior.style.marginLeft = '1px';

  const tituloSemana = document.createElement('div');
  tituloSemana.style.fontSize = '1.5rem';
  tituloSemana.style.fontWeight = '700';
  tituloSemana.style.color = 'var(--primary-mint)';
  tituloSemana.style.textAlign = 'center';
  tituloSemana.style.flex = '1';

  const btnSiguiente = document.createElement('button');
  btnSiguiente.innerHTML = '→';
  btnSiguiente.style.padding = '8px 16px';
  btnSiguiente.style.background = 'var(--bg-main)';
  btnSiguiente.style.border = '1px solid var(--border-color)';
  btnSiguiente.style.borderRadius = '8px';
  btnSiguiente.style.fontSize = '1.2rem';
  btnSiguiente.style.fontWeight = '700';
  btnSiguiente.style.cursor = 'pointer';
  btnSiguiente.style.transition = 'all 0.2s ease';
  btnSiguiente.style.width = '50px';
  btnSiguiente.style.color = 'var(--primary-mint)';

  navSemana.appendChild(btnAnterior);
  navSemana.appendChild(tituloSemana);
  navSemana.appendChild(btnSiguiente);
  container.appendChild(navSemana);

  // Contenedor de días de la semana
  const diasContainer = document.createElement('div');
  diasContainer.style.display = 'flex';
  diasContainer.style.flexDirection = 'column';
  diasContainer.style.gap = '12px';
  container.appendChild(diasContainer);

  const renderizarSemana = () => {
    // Calcular inicio de la semana (lunes)
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1 + (semanaOffset * 7));
    if (hoy.getDay() === 0) { // Si es domingo
      inicioSemana.setDate(inicioSemana.getDate() - 7);
    }

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);

    // Actualizar título
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesInicio = meses[inicioSemana.getMonth()];
    const mesFin = meses[finSemana.getMonth()];
    
    if (inicioSemana.getMonth() === finSemana.getMonth()) {
      tituloSemana.textContent = `${inicioSemana.getDate()} - ${finSemana.getDate()} ${mesInicio} ${inicioSemana.getFullYear()}`;
    } else {
      tituloSemana.textContent = `${inicioSemana.getDate()} ${mesInicio} - ${finSemana.getDate()} ${mesFin} ${inicioSemana.getFullYear()}`;
    }

    // Limpiar días
    diasContainer.innerHTML = '';

    // Renderizar cada día de la semana
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(inicioSemana);
      fechaDia.setDate(inicioSemana.getDate() + i);
      
      const diaCard = crearDiaSemanaSemanal(fechaDia, diasSemana[i], sesionesPorFecha, hoy, rutaActual, renderizar);
      diasContainer.appendChild(diaCard);
    }

    sessionStorage.setItem('calendarioSemanaOffset', semanaOffset);
  };

  btnAnterior.addEventListener('click', () => {
    semanaOffset--;
    renderizarSemana();
  });

  btnSiguiente.addEventListener('click', () => {
    semanaOffset++;
    renderizarSemana();
  });

  btnAnterior.addEventListener('mouseenter', () => {
    btnAnterior.style.background = 'var(--primary-mint)';
    btnAnterior.style.color = '#ffffff';
  });

  btnAnterior.addEventListener('mouseleave', () => {
    btnAnterior.style.background = 'var(--bg-main)';
    btnAnterior.style.color = 'var(--text-primary)';
  });

  btnSiguiente.addEventListener('mouseenter', () => {
    btnSiguiente.style.background = 'var(--primary-mint)';
    btnSiguiente.style.color = '#ffffff';
  });

  btnSiguiente.addEventListener('mouseleave', () => {
    btnSiguiente.style.background = 'var(--bg-main)';
    btnSiguiente.style.color = 'var(--text-primary)';
  });

  // Botón "Hoy" vuelve a la semana actual
  btnHoy.onclick = () => {
    semanaOffset = 0;
    renderizarSemana();
  };

  renderizarSemana();
}

function crearDiaSemanaSemanal(fechaDia, nombreDia, sesionesPorFecha, hoy, rutaActual, renderizar) {
  const fechaStr = fechaDia.getFullYear() + '-' + 
                   String(fechaDia.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(fechaDia.getDate()).padStart(2, '0');
  
  const sesionesDia = sesionesPorFecha[fechaStr] || [];
  const esHoy = fechaDia.toDateString() === hoy.toDateString();

  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.borderRadius = '12px';
  card.style.padding = '16px';
  card.style.boxShadow = 'var(--shadow-sm)';
  card.style.transition = 'all 0.2s ease';
  
  if (esHoy) {
    card.style.border = '2px solid var(--primary-mint)';
  }

  // Header del día
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '12px';
  header.style.paddingBottom = '12px';
  header.style.borderBottom = '2px solid var(--bg-main)';

  const infoFecha = document.createElement('div');
  
  const nombre = document.createElement('div');
  nombre.textContent = nombreDia;
  nombre.style.fontSize = '0.9rem';
  nombre.style.fontWeight = '700';
  nombre.style.color = esHoy ? 'var(--primary-mint)' : 'var(--text-secondary)';
  nombre.style.textTransform = 'uppercase';
  nombre.style.letterSpacing = '0.5px';
  
  const numero = document.createElement('div');
  numero.textContent = fechaDia.getDate();
  numero.style.fontSize = '2rem';
  numero.style.fontWeight = '900';
  numero.style.color = esHoy ? 'var(--primary-mint)' : 'var(--text-primary)';
  numero.style.lineHeight = '1';
  
  infoFecha.appendChild(nombre);
  infoFecha.appendChild(numero);
  header.appendChild(infoFecha);

  // Badge con número de sesiones
  if (sesionesDia.length > 0) {
    const badge = document.createElement('div');
    const hayCompletadas = sesionesDia.some(s => s.completada);
    const todasCompletadas = sesionesDia.every(s => s.completada);
    
    badge.textContent = `${sesionesDia.length} ${sesionesDia.length === 1 ? 'sesión' : 'sesiones'}`;
    badge.style.padding = '6px 12px';
    badge.style.borderRadius = '20px';
    badge.style.fontSize = '0.75rem';
    badge.style.fontWeight = '700';
    badge.style.background = todasCompletadas 
      ? 'rgba(76, 175, 80, 0.2)' 
      : hayCompletadas 
        ? 'rgba(255, 193, 7, 0.2)'
        : 'rgba(255, 165, 0, 0.2)';
    badge.style.color = todasCompletadas 
      ? '#4CAF50' 
      : hayCompletadas 
        ? '#F57C00'
        : '#FF9800';
    badge.style.border = `1px solid ${todasCompletadas 
      ? '#4CAF50' 
      : hayCompletadas 
        ? '#F57C00'
        : '#FF9800'}`;
    header.appendChild(badge);
  }

  card.appendChild(header);

  // Sesiones
  if (sesionesDia.length > 0) {
    sesionesDia.forEach(sesion => {
      const sesionDiv = document.createElement('div');
      sesionDiv.style.background = 'var(--bg-main)';
      sesionDiv.style.padding = '12px';
      sesionDiv.style.borderRadius = '8px';
      sesionDiv.style.marginBottom = '8px';
      sesionDiv.style.cursor = 'pointer';
      sesionDiv.style.transition = 'all 0.2s ease';
      sesionDiv.style.border = '1px solid transparent';

      const nombreSesion = document.createElement('div');
      nombreSesion.textContent = sesion.nombre;
      nombreSesion.style.fontWeight = '700';
      nombreSesion.style.marginBottom = '6px';
      nombreSesion.style.color = 'var(--text-primary)';
      sesionDiv.appendChild(nombreSesion);

      const infoSesion = document.createElement('div');
      infoSesion.style.display = 'flex';
      infoSesion.style.justifyContent = 'space-between';
      infoSesion.style.fontSize = '0.8rem';
      infoSesion.style.color = 'var(--text-secondary)';
      
      const ejercicios = document.createElement('span');
      ejercicios.textContent = `${sesion.ejercicios.length} ejercicio${sesion.ejercicios.length !== 1 ? 's' : ''}`;
      
      const estado = document.createElement('span');
      if (sesion.completada) {
        estado.textContent = '✅ Completada';
        estado.style.color = '#4CAF50';
        estado.style.fontWeight = '600';
      } else if (sesion._stats.seriesCompletadas > 0) {
        estado.textContent = `${sesion._stats.seriesCompletadas}/${sesion._stats.totalSeries} series`;
        estado.style.color = '#F57C00';
        estado.style.fontWeight = '600';
      } else {
        estado.textContent = '⏳ Pendiente';
        estado.style.color = '#FF9800';
        estado.style.fontWeight = '600';
      }
      
      infoSesion.appendChild(ejercicios);
      infoSesion.appendChild(estado);
      sesionDiv.appendChild(infoSesion);

      sesionDiv.addEventListener('mouseenter', () => {
        sesionDiv.style.background = 'var(--primary-mint)';
        sesionDiv.style.color = '#ffffff';
        sesionDiv.style.border = '1px solid var(--primary-mint)';
        nombreSesion.style.color = '#ffffff';
        infoSesion.style.color = '#ffffff';
        ejercicios.style.color = '#ffffff';
        estado.style.color = '#ffffff';
      });

      sesionDiv.addEventListener('mouseleave', () => {
        sesionDiv.style.background = 'var(--bg-main)';
        sesionDiv.style.color = 'var(--text-primary)';
        sesionDiv.style.border = '1px solid transparent';
        nombreSesion.style.color = 'var(--text-primary)';
        infoSesion.style.color = 'var(--text-secondary)';
        ejercicios.style.color = 'var(--text-secondary)';
        
        if (sesion.completada) {
          estado.style.color = '#4CAF50';
        } else if (sesion._stats.seriesCompletadas > 0) {
          estado.style.color = '#F57C00';
        } else {
          estado.style.color = '#FF9800';
        }
      });

      sesionDiv.addEventListener('click', () => {
        rutaActual.length = 0;
        rutaActual.push(...sesion.ruta);
        renderizar();
      });

      card.appendChild(sesionDiv);
    });
  } else {
    const sinSesiones = document.createElement('div');
    sinSesiones.style.textAlign = 'center';
    sinSesiones.style.padding = '20px';
    sinSesiones.style.color = 'var(--text-light)';
    sinSesiones.style.fontSize = '0.9rem';
    sinSesiones.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 8px; opacity: 0.3;">💤</div>
      <div>Sin sesiones programadas</div>
    `;
    card.appendChild(sinSesiones);
  }

  // Click en la card para ver detalles
  card.style.cursor = 'pointer';
  card.addEventListener('click', (e) => {
    if (e.target.closest('.sesionDiv')) return; // No abrir modal si se hace click en una sesión
    mostrarInfoDia(fechaStr, fechaDia, sesionesDia, rutaActual, renderizar);
  });

  return card;
}

function crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar) {
  const mesCard = document.createElement('div');
  mesCard.className = 'mes-card';
  mesCard.style.background = 'var(--bg-card)';
  mesCard.style.borderRadius = '12px';
  mesCard.style.padding = '16px';
  mesCard.style.marginBottom = '16px';
  mesCard.style.boxShadow = 'var(--shadow-sm)';

  // Título del mes
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const titulo = document.createElement('h3');
  titulo.textContent = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  titulo.style.textAlign = 'center';
  titulo.style.marginBottom = '12px';
  titulo.style.color = 'var(--primary-mint)';
  titulo.style.fontSize = '1.2rem';
  titulo.style.fontWeight = '700';
  titulo.style.textTransform = 'uppercase';
  mesCard.appendChild(titulo);

  // Calcular estadísticas del mes
  const primerDiaMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimoDiaMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  
  let sesionesDelMes = 0;
  let sesionesCompletadas = 0;
  let totalEjercicios = 0;
  
  Object.keys(sesionesPorFecha).forEach(fechaStr => {
    const fechaSesion = new Date(fechaStr + 'T00:00:00');
    if (fechaSesion >= primerDiaMes && fechaSesion <= ultimoDiaMes) {
      const sesiones = sesionesPorFecha[fechaStr];
      sesionesDelMes += sesiones.length;
      sesionesCompletadas += sesiones.filter(s => s.completada).length;
      sesiones.forEach(s => totalEjercicios += s.ejercicios.length);
    }
  });
  
  // Debug: Log estadísticas
  if (sesionesDelMes > 0) {
    console.log(`[Calendario] ${meses[fecha.getMonth()]} ${fecha.getFullYear()}:`, {
      sesionesDelMes,
      sesionesCompletadas,
      totalEjercicios,
      porcentaje: Math.round((sesionesCompletadas / sesionesDelMes) * 100)
    });
    
    // Log detallado de cada sesión para debug
    Object.keys(sesionesPorFecha).forEach(fechaStr => {
      const fechaSesion = new Date(fechaStr + 'T00:00:00');
      if (fechaSesion >= primerDiaMes && fechaSesion <= ultimoDiaMes) {
        const sesiones = sesionesPorFecha[fechaStr];
        sesiones.forEach(s => {
          if (s._stats) {
            console.log(`  └─ ${s.nombre}: ${s._stats.seriesCompletadas}/${s._stats.totalSeries} series completadas ${s.completada ? '✅' : '❌'}`);
          }
        });
      }
    });
  }

  // Panel de estadísticas (solo si hay sesiones en el mes)
  if (sesionesDelMes > 0) {
    const statsPanel = document.createElement('div');
    statsPanel.style.background = 'linear-gradient(135deg, rgba(61, 213, 152, 0.1) 0%, rgba(0, 212, 212, 0.1) 100%)';
    statsPanel.style.padding = '12px';
    statsPanel.style.borderRadius = '8px';
    statsPanel.style.marginBottom = '12px';
    statsPanel.style.display = 'grid';
    statsPanel.style.gridTemplateColumns = 'repeat(3, 1fr)';
    statsPanel.style.gap = '8px';
    statsPanel.style.border = '1px solid var(--border-color)';

    // Sesiones totales
    const statSesiones = document.createElement('div');
    statSesiones.style.textAlign = 'center';
    statSesiones.innerHTML = `
      <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-mint);">${sesionesDelMes}</div>
      <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Sesiones</div>
    `;
    statsPanel.appendChild(statSesiones);

    // Completadas
    const statCompletadas = document.createElement('div');
    statCompletadas.style.textAlign = 'center';
    statCompletadas.style.position = 'relative';
    const porcentaje = Math.round((sesionesCompletadas / sesionesDelMes) * 100);
    statCompletadas.innerHTML = `
      <div style="font-size: 1.5rem; font-weight: 700; color: ${porcentaje === 100 ? '#4CAF50' : porcentaje >= 50 ? '#FFA500' : '#FF6B6B'};">${porcentaje}%</div>
      <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;" title="Sesiones con TODAS las series marcadas como completadas (✔️)">Completado</div>
    `;
    statCompletadas.style.cursor = 'help';
    statsPanel.appendChild(statCompletadas);

    // Ejercicios totales
    const statEjercicios = document.createElement('div');
    statEjercicios.style.textAlign = 'center';
    statEjercicios.innerHTML = `
      <div style="font-size: 1.5rem; font-weight: 700; color: var(--secondary-cyan);">${totalEjercicios}</div>
      <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Ejercicios</div>
    `;
    statsPanel.appendChild(statEjercicios);

    mesCard.appendChild(statsPanel);

    // Barra de progreso
    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '6px';
    progressBar.style.background = 'var(--bg-main)';
    progressBar.style.borderRadius = '3px';
    progressBar.style.marginBottom = '12px';
    progressBar.style.overflow = 'hidden';

    const progressFill = document.createElement('div');
    progressFill.style.width = `${porcentaje}%`;
    progressFill.style.height = '100%';
    progressFill.style.background = porcentaje === 100 
      ? 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)' 
      : porcentaje >= 50 
        ? 'linear-gradient(90deg, #FFA500 0%, #FFB84D 100%)'
        : 'linear-gradient(90deg, #FF6B6B 0%, #FF8787 100%)';
    progressFill.style.borderRadius = '3px';
    progressFill.style.transition = 'width 0.3s ease';

    progressBar.appendChild(progressFill);
    mesCard.appendChild(progressBar);
  }

  // Días de la semana - Lunes como primer día
  const diasSemana = document.createElement('div');
  diasSemana.className = 'dias-semana-header';
  diasSemana.style.display = 'grid';
  diasSemana.style.gridTemplateColumns = 'repeat(7, 1fr)';
  diasSemana.style.gap = '4px';
  diasSemana.style.marginBottom = '8px';
  
  ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(dia => {
    const diaHeader = document.createElement('div');
    diaHeader.textContent = dia;
    diaHeader.style.textAlign = 'center';
    diaHeader.style.fontWeight = '700';
    diaHeader.style.fontSize = '0.75rem';
    diaHeader.style.color = 'var(--text-secondary)';
    diaHeader.style.padding = '4px';
    diasSemana.appendChild(diaHeader);
  });
  mesCard.appendChild(diasSemana);

  // Grid de días
  const diasGrid = document.createElement('div');
  diasGrid.className = 'dias-grid';
  diasGrid.style.display = 'grid';
  diasGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  diasGrid.style.gap = '4px';

  // Calcular primer día del mes y total de días
  const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  let primerDiaSemana = primerDia.getDay(); // 0 = domingo, 1 = lunes, etc.
  
  // Ajustar para que lunes sea 0: domingo pasa a ser 6
  primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
  
  const totalDias = ultimoDia.getDate();

  // Días vacíos antes del primer día
  for (let i = 0; i < primerDiaSemana; i++) {
    const diaVacio = document.createElement('div');
    diaVacio.className = 'dia-vacio';
    diaVacio.style.padding = '8px';
    diaVacio.style.minHeight = '50px';
    diaVacio.style.borderRadius = '8px';
    diasGrid.appendChild(diaVacio);
  }

  // Colores de fondo suave para mesociclos
  const coloresMeso = [
    'rgba(61, 213, 152, 0.12)',   // Verde menta suave
    'rgba(0, 212, 212, 0.12)',     // Cyan suave
    'rgba(255, 107, 107, 0.12)',   // Coral suave
    'rgba(156, 39, 176, 0.12)',    // Púrpura suave
    'rgba(255, 193, 7, 0.12)',     // Amarillo suave
    'rgba(33, 150, 243, 0.12)',    // Azul suave
    'rgba(76, 175, 80, 0.12)',     // Verde suave
    'rgba(255, 152, 0, 0.12)',     // Naranja suave
  ];

  // Construir mapa de rangos de mesociclos
  const rangosMeso = [];

  if (window.datos && window.datos[0]) {
    window.datos[0].hijos?.forEach((meso, mesoIdx) => {
      let fechaInicioMeso = null;
      let fechaFinMeso = null;

      meso.hijos?.forEach((micro) => {
        micro.hijos?.forEach((sesion) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
            for (const subNivel of sesion.hijos) {
              if (subNivel.fecha) {
                fechaSesion = subNivel.fecha;
                break;
              }
            }
          }
          
          if (fechaSesion) {
            const fechaObj = new Date(fechaSesion + 'T00:00:00');
            
            if (!fechaInicioMeso || fechaObj < fechaInicioMeso) {
              fechaInicioMeso = fechaObj;
            }
            if (!fechaFinMeso || fechaObj > fechaFinMeso) {
              fechaFinMeso = fechaObj;
            }
          }
        });
      });

      if (fechaInicioMeso && fechaFinMeso) {
        rangosMeso.push({
          inicio: fechaInicioMeso,
          fin: fechaFinMeso,
          mesoIdx,
          color: coloresMeso[mesoIdx % coloresMeso.length]
        });
      }
    });
  }

  // Función para verificar si una fecha está en un rango
  function estaEnRango(fecha, rangos) {
    return rangos.filter(rango => fecha >= rango.inicio && fecha <= rango.fin);
  }

  // Días del mes
  for (let dia = 1; dia <= totalDias; dia++) {
    const fechaDia = new Date(fecha.getFullYear(), fecha.getMonth(), dia);
    const fechaStr = fechaDia.getFullYear() + '-' + 
                     String(fechaDia.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(fechaDia.getDate()).padStart(2, '0');
    
    const sesionesDia = sesionesPorFecha[fechaStr] || [];
    const esHoy = fechaDia.toDateString() === hoy.toDateString();

    // Verificar si está en algún mesociclo
    const mesosActivos = estaEnRango(fechaDia, rangosMeso);

    const diaDiv = document.createElement('div');
    diaDiv.className = 'dia-calendario';
    diaDiv.style.padding = '8px';
    diaDiv.style.borderRadius = '8px';
    diaDiv.style.textAlign = 'center';
    diaDiv.style.cursor = 'pointer';
    diaDiv.style.minHeight = '50px';
    diaDiv.style.height = '80px'; // Altura fija para todos
    diaDiv.style.display = 'flex';
    diaDiv.style.flexDirection = 'column';
    diaDiv.style.alignItems = 'center';
    diaDiv.style.justifyContent = 'flex-start';
    diaDiv.style.transition = 'all 0.2s ease';

    // Aplicar fondo de mesociclo si está en alguno
    let colorFondo = 'var(--bg-main)';
    if (mesosActivos.length > 0) {
      colorFondo = mesosActivos[0].color;
    }

    // Estilos según estado
    if (esHoy && sesionesDia.length > 0) {
      diaDiv.style.background = 'var(--primary-mint)';
      diaDiv.style.color = '#ffffff';
      diaDiv.style.fontWeight = '700';
      diaDiv.style.boxShadow = 'var(--shadow-md)';
    } else if (esHoy) {
      diaDiv.style.background = colorFondo;
      diaDiv.style.border = '2px solid var(--primary-mint)';
      diaDiv.style.color = 'var(--primary-mint)';
      diaDiv.style.fontWeight = '700';
    } else if (sesionesDia.length > 0) {
      diaDiv.style.background = 'var(--secondary-cyan)';
      diaDiv.style.color = '#ffffff';
      diaDiv.style.fontWeight = '600';
    } else {
      diaDiv.style.background = colorFondo;
      diaDiv.style.color = 'var(--text-primary)';
    }

    // Número del día
    const numeroDia = document.createElement('div');
    numeroDia.textContent = dia;
    numeroDia.style.fontSize = '1rem';
    numeroDia.style.marginBottom = '4px';
    diaDiv.appendChild(numeroDia);

    // Indicadores visuales según estado de las sesiones
    if (sesionesDia.length > 0) {
      // Verificar si hay sesiones completadas
      const hayCompletadas = sesionesDia.some(s => s.completada);
      const todasCompletadas = sesionesDia.every(s => s.completada);
      
      // Contenedor de indicadores
      const indicadoresContainer = document.createElement('div');
      indicadoresContainer.style.display = 'flex';
      indicadoresContainer.style.gap = '3px';
      indicadoresContainer.style.marginTop = '4px';
      indicadoresContainer.style.justifyContent = 'center';
      
      // Puntos indicadores
      sesionesDia.forEach(sesion => {
        const punto = document.createElement('div');
        punto.style.width = '6px';
        punto.style.height = '6px';
        punto.style.borderRadius = '50%';
        punto.style.transition = 'all 0.2s ease';
        
        if (sesion.completada) {
          // Verde para completada
          punto.style.background = '#4CAF50';
          punto.style.boxShadow = '0 0 4px rgba(76, 175, 80, 0.6)';
        } else {
          // Naranja para pendiente
          punto.style.background = '#FFA500';
          punto.style.boxShadow = '0 0 4px rgba(255, 165, 0, 0.6)';
        }
        
        indicadoresContainer.appendChild(punto);
      });
      
      diaDiv.appendChild(indicadoresContainer);
      
      // Badge con número de sesiones
      const badge = document.createElement('div');
      badge.textContent = sesionesDia.length;
      badge.style.fontSize = '0.65rem';
      badge.style.fontWeight = '700';
      badge.style.background = todasCompletadas 
        ? 'rgba(76, 175, 80, 0.2)' 
        : hayCompletadas 
          ? 'rgba(255,193,7, 0.2)'
          : 'rgba(255, 165, 0, 0.2)';
      badge.style.color = todasCompletadas 
        ? '#4CAF50' 
        : hayCompletadas 
          ? '#F57C00'
          : '#FF9800';
      badge.style.borderRadius = '10px';
      badge.style.padding = '2px 6px';
      badge.style.marginTop = '4px';
      badge.style.border = `1px solid ${todasCompletadas 
        ? '#4CAF50' 
        : hayCompletadas 
          ? '#F57C00'
          : '#FF9800'}`;
      diaDiv.appendChild(badge);

      // Click para mostrar información del día (siempre, tenga o no sesiones)
      diaDiv.addEventListener('click', () => {
        mostrarInfoDia(fechaStr, fechaDia, sesionesDia, rutaActual, renderizar);
      });

      diaDiv.addEventListener('mouseenter', () => {
        diaDiv.style.transform = 'scale(1.05)';
        diaDiv.style.boxShadow = 'var(--shadow-md)';
      });

      diaDiv.addEventListener('mouseleave', () => {
        diaDiv.style.transform = 'scale(1)';
        diaDiv.style.boxShadow = esHoy ? 'var(--shadow-md)' : 'none';
      });
    } else {
      // Día sin sesiones - click para ver info
      diaDiv.addEventListener('click', () => {
        mostrarInfoDia(fechaStr, fechaDia, sesionesDia, rutaActual, renderizar);
      });

      diaDiv.addEventListener('mouseenter', () => {
        if (mesosActivos.length > 0) {
          diaDiv.style.transform = 'scale(1.02)';
          diaDiv.style.opacity = '0.8';
        }
      });

      diaDiv.addEventListener('mouseleave', () => {
        diaDiv.style.transform = 'scale(1)';
        diaDiv.style.opacity = '1';
      });
    }

    diasGrid.appendChild(diaDiv);
  }

  mesCard.appendChild(diasGrid);
  return mesCard;
}

function mostrarInfoDia(fechaStr, fechaDia, sesiones, rutaActual, renderizar) {
  // Buscar a qué mesociclo y microciclo pertenece este día
  let mesoInfo = null;
  let microInfos = []; // Array porque puede estar en varios microciclos del mismo meso
  
  if (window.datos && window.datos[0]) {
    window.datos[0].hijos?.forEach((meso, mesoIdx) => {
      let fechaInicioMeso = null;
      let fechaFinMeso = null;
      
      // Primero calcular el rango completo del mesociclo
      meso.hijos?.forEach((micro) => {
        micro.hijos?.forEach((sesion) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
            for (const subNivel of sesion.hijos) {
              if (subNivel.fecha) {
                fechaSesion = subNivel.fecha;
                break;
              }
            }
          }
          
          if (fechaSesion) {
            const fechaObj = new Date(fechaSesion + 'T00:00:00');
            if (!fechaInicioMeso || fechaObj < fechaInicioMeso) {
              fechaInicioMeso = fechaObj;
            }
            if (!fechaFinMeso || fechaObj > fechaFinMeso) {
              fechaFinMeso = fechaObj;
            }
          }
        });
      });
      
      // Si el día actual está dentro del rango del mesociclo
      if (fechaInicioMeso && fechaFinMeso && fechaDia >= fechaInicioMeso && fechaDia <= fechaFinMeso) {
        mesoInfo = {
          nombre: meso.nombre || `Mesociclo ${mesoIdx + 1}`,
          indice: mesoIdx,
          inicio: fechaInicioMeso,
          fin: fechaFinMeso
        };
        
        // Ahora buscar los microciclos dentro de este mesociclo
        meso.hijos?.forEach((micro, microIdx) => {
          let fechaInicioMicro = null;
          let fechaFinMicro = null;
          
          micro.hijos?.forEach((sesion) => {
            let fechaSesion = sesion.fecha;
            if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
              for (const subNivel of sesion.hijos) {
                if (subNivel.fecha) {
                  fechaSesion = subNivel.fecha;
                  break;
                }
              }
            }
            
            if (fechaSesion) {
              const fechaObj = new Date(fechaSesion + 'T00:00:00');
              if (!fechaInicioMicro || fechaObj < fechaInicioMicro) {
                fechaInicioMicro = fechaObj;
              }
              if (!fechaFinMicro || fechaObj > fechaFinMicro) {
                fechaFinMicro = fechaObj;
              }
            }
          });
          
          // Si el día actual está dentro de este microciclo
          if (fechaInicioMicro && fechaFinMicro && fechaDia >= fechaInicioMicro && fechaDia <= fechaFinMicro) {
            microInfos.push({
              nombre: micro.nombre || `Microciclo ${microIdx + 1}`,
              indice: microIdx,
              inicio: fechaInicioMicro,
              fin: fechaFinMicro
            });
          }
        });
      }
    });
  }

  // Crear modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0, 0, 0, 0.5)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '10000';

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.background = 'var(--bg-card)';
  modal.style.borderRadius = '16px';
  modal.style.padding = '24px';
  modal.style.maxWidth = '90%';
  modal.style.maxHeight = '80vh';
  modal.style.overflowY = 'auto';
  modal.style.boxShadow = 'var(--shadow-lg)';

  // Título con fecha
  const fechaFormateada = fechaDia.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const titulo = document.createElement('h3');
  titulo.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  titulo.style.marginBottom = '20px';
  titulo.style.color = 'var(--primary-mint)';
  titulo.style.fontSize = '1.2rem';
  titulo.style.textAlign = 'center';
  titulo.style.fontWeight = '700';
  modal.appendChild(titulo);

  // Información de mesociclo y microciclo
  if (mesoInfo || microInfos.length > 0) {
    const infoContainer = document.createElement('div');
    infoContainer.style.background = 'var(--bg-main)';
    infoContainer.style.padding = '16px';
    infoContainer.style.borderRadius = '12px';
    infoContainer.style.marginBottom = '16px';
    infoContainer.style.border = '2px solid var(--primary-mint)';

    const infoTitulo = document.createElement('div');
    infoTitulo.textContent = '📅 Información del período';
    infoTitulo.style.fontSize = '0.9rem';
    infoTitulo.style.fontWeight = '700';
    infoTitulo.style.color = 'var(--text-secondary)';
    infoTitulo.style.marginBottom = '12px';
    infoTitulo.style.textTransform = 'uppercase';
    infoTitulo.style.letterSpacing = '0.5px';
    infoContainer.appendChild(infoTitulo);

    if (mesoInfo) {
      const mesoDiv = document.createElement('div');
      mesoDiv.style.marginBottom = microInfos.length > 0 ? '12px' : '0';
      mesoDiv.style.paddingBottom = microInfos.length > 0 ? '12px' : '0';
      mesoDiv.style.borderBottom = microInfos.length > 0 ? '1px solid var(--border-color)' : 'none';
      
      const mesoHeader = document.createElement('div');
      mesoHeader.style.display = 'flex';
      mesoHeader.style.alignItems = 'center';
      mesoHeader.style.gap = '8px';
      mesoHeader.style.marginBottom = '4px';
      
      const mesoLabel = document.createElement('span');
      mesoLabel.textContent = 'Mesociclo:';
      mesoLabel.style.fontSize = '0.85rem';
      mesoLabel.style.color = 'var(--text-secondary)';
      mesoLabel.style.fontWeight = '600';
      
      const mesoNombre = document.createElement('span');
      mesoNombre.textContent = mesoInfo.nombre;
      mesoNombre.style.fontSize = '0.95rem';
      mesoNombre.style.color = 'var(--text-primary)';
      mesoNombre.style.fontWeight = '700';
      
      mesoHeader.appendChild(mesoLabel);
      mesoHeader.appendChild(mesoNombre);
      mesoDiv.appendChild(mesoHeader);
      
      // Mostrar rango de fechas del mesociclo
      const mesoRango = document.createElement('div');
      mesoRango.style.fontSize = '0.75rem';
      mesoRango.style.color = 'var(--text-light)';
      mesoRango.style.marginTop = '4px';
      const inicioStr = mesoInfo.inicio.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      const finStr = mesoInfo.fin.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      mesoRango.textContent = `${inicioStr} - ${finStr}`;
      mesoDiv.appendChild(mesoRango);
      
      infoContainer.appendChild(mesoDiv);
    }

    if (microInfos.length > 0) {
      microInfos.forEach((microInfo, idx) => {
        const microDiv = document.createElement('div');
        if (idx > 0) {
          microDiv.style.marginTop = '8px';
          microDiv.style.paddingTop = '8px';
          microDiv.style.borderTop = '1px solid var(--border-color)';
        }
        
        const microHeader = document.createElement('div');
        microHeader.style.display = 'flex';
        microHeader.style.alignItems = 'center';
        microHeader.style.gap = '8px';
        microHeader.style.marginBottom = '4px';
        
        const microLabel = document.createElement('span');
        microLabel.textContent = 'Microciclo:';
        microLabel.style.fontSize = '0.85rem';
        microLabel.style.color = 'var(--text-secondary)';
        microLabel.style.fontWeight = '600';
        
        const microNombre = document.createElement('span');
        microNombre.textContent = microInfo.nombre;
        microNombre.style.fontSize = '0.95rem';
        microNombre.style.color = 'var(--text-primary)';
        microNombre.style.fontWeight = '700';
        
        microHeader.appendChild(microLabel);
        microHeader.appendChild(microNombre);
        microDiv.appendChild(microHeader);
        
        // Mostrar rango de fechas del microciclo
        const microRango = document.createElement('div');
        microRango.style.fontSize = '0.75rem';
        microRango.style.color = 'var(--text-light)';
        microRango.style.marginTop = '4px';
        const inicioStr = microInfo.inicio.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const finStr = microInfo.fin.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        microRango.textContent = `${inicioStr} - ${finStr}`;
        microDiv.appendChild(microRango);
        
        infoContainer.appendChild(microDiv);
      });
    }

    modal.appendChild(infoContainer);
  } else {
    // Sin asignar a ningún período
    const sinInfo = document.createElement('div');
    sinInfo.style.background = 'var(--bg-main)';
    sinInfo.style.padding = '16px';
    sinInfo.style.borderRadius = '12px';
    sinInfo.style.marginBottom = '16px';
    sinInfo.style.textAlign = 'center';
    sinInfo.style.color = 'var(--text-light)';
    sinInfo.style.fontSize = '0.9rem';
    sinInfo.textContent = 'Este día no está asignado a ningún mesociclo';
    modal.appendChild(sinInfo);
  }

  // Sesiones del día
  if (sesiones.length > 0) {
    const sesionesContainer = document.createElement('div');
    
    const sesionesTitulo = document.createElement('div');
    sesionesTitulo.textContent = `🏋️ Sesiones (${sesiones.length})`;
    sesionesTitulo.style.fontSize = '0.9rem';
    sesionesTitulo.style.fontWeight = '700';
    sesionesTitulo.style.color = 'var(--text-secondary)';
    sesionesTitulo.style.marginBottom = '12px';
    sesionesTitulo.style.textTransform = 'uppercase';
    sesionesTitulo.style.letterSpacing = '0.5px';
    sesionesContainer.appendChild(sesionesTitulo);

    sesiones.forEach(sesion => {
      const sesionDiv = document.createElement('div');
      sesionDiv.style.background = 'var(--bg-main)';
      sesionDiv.style.padding = '12px';
      sesionDiv.style.borderRadius = '8px';
      sesionDiv.style.marginBottom = '8px';
      sesionDiv.style.transition = 'all 0.2s ease';
      sesionDiv.style.border = '1px solid var(--border-color)';

      // Nombre de la sesión (clicable para navegar)
      const nombreSesion = document.createElement('div');
      nombreSesion.textContent = sesion.nombre;
      nombreSesion.style.fontWeight = '700';
      nombreSesion.style.marginBottom = '8px';
      nombreSesion.style.cursor = 'pointer';
      nombreSesion.style.padding = '8px';
      nombreSesion.style.borderRadius = '6px';
      nombreSesion.style.transition = 'all 0.2s ease';

      nombreSesion.addEventListener('mouseenter', () => {
        nombreSesion.style.background = 'var(--primary-mint)';
        nombreSesion.style.color = '#ffffff';
      });

      nombreSesion.addEventListener('mouseleave', () => {
        nombreSesion.style.background = 'transparent';
        nombreSesion.style.color = 'var(--text-primary)';
      });

      nombreSesion.addEventListener('click', () => {
        // Navegar a la sesión
        rutaActual.length = 0;
        rutaActual.push(...sesion.ruta);
        renderizar();
        overlay.remove();
      });

      sesionDiv.appendChild(nombreSesion);

      // Información adicional
      const infoDiv = document.createElement('div');
      infoDiv.style.display = 'flex';
      infoDiv.style.justifyContent = 'space-between';
      infoDiv.style.alignItems = 'center';
      infoDiv.style.gap = '12px';

      const cantidadEjercicios = document.createElement('div');
      cantidadEjercicios.textContent = `${sesion.ejercicios.length} ejercicio${sesion.ejercicios.length !== 1 ? 's' : ''}`;
      cantidadEjercicios.style.fontSize = '0.85rem';
      cantidadEjercicios.style.opacity = '0.8';
      infoDiv.appendChild(cantidadEjercicios);

      // Input de fecha para modificar
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = sesion.fecha;
      fechaInput.style.padding = '4px 8px';
      fechaInput.style.border = '1px solid var(--border-color)';
      fechaInput.style.borderRadius = '6px';
      fechaInput.style.fontSize = '0.85rem';
      fechaInput.style.fontWeight = '600';
      fechaInput.style.color = 'var(--primary-mint)';
      fechaInput.style.background = 'var(--bg-card)';
      
      fechaInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      fechaInput.addEventListener('change', async (e) => {
        const nuevaFecha = e.target.value;
        
        // Actualizar la fecha en los datos
        if (window.datos && window.datos[0]) {
          const [, mesoIdx, microIdx, sesionIdx] = sesion.ruta;
          const sesionObj = window.datos[0].hijos[mesoIdx].hijos[microIdx].hijos[sesionIdx];
          sesionObj.fecha = nuevaFecha;
          
          // Guardar datos
          if (typeof window.guardarDatos === 'function') {
            window.guardarDatos();
          }
          
          // Cerrar modal y refrescar calendario
          overlay.remove();
          renderizar();
        }
      });

      infoDiv.appendChild(fechaInput);
      sesionDiv.appendChild(infoDiv);

      sesionesContainer.appendChild(sesionDiv);
    });

    modal.appendChild(sesionesContainer);
  } else if (mesoInfo || microInfos.length > 0) {
    // Día de descanso programado (está en un ciclo pero sin sesiones)
    const descanso = document.createElement('div');
    descanso.style.background = 'var(--bg-main)';
    descanso.style.padding = '20px';
    descanso.style.borderRadius = '12px';
    descanso.style.textAlign = 'center';
    descanso.style.border = '2px dashed var(--border-color)';
    descanso.innerHTML = `
      <div style="font-size: 2.5rem; margin-bottom: 8px;">😴</div>
      <div style="color: var(--text-secondary); font-weight: 600; font-size: 0.95rem;">Día de descanso</div>
      <div style="color: var(--text-light); font-size: 0.85rem; margin-top: 4px;">Sin sesiones programadas</div>
    `;
    modal.appendChild(descanso);
  } else {
    // Sin sesiones y fuera de ciclos
    const sinSesiones = document.createElement('div');
    sinSesiones.style.background = 'var(--bg-main)';
    sinSesiones.style.padding = '20px';
    sinSesiones.style.borderRadius = '12px';
    sinSesiones.style.textAlign = 'center';
    sinSesiones.style.color = 'var(--text-light)';
    sinSesiones.style.fontSize = '0.9rem';
    sinSesiones.innerHTML = `
      <div style="font-size: 2.5rem; margin-bottom: 8px; opacity: 0.3;">💤</div>
      <div>Sin sesiones programadas</div>
    `;
    modal.appendChild(sinSesiones);
  }

  // Botones de acción
  const botonesContainer = document.createElement('div');
  botonesContainer.style.display = 'flex';
  botonesContainer.style.gap = '8px';
  botonesContainer.style.marginTop = '16px';

  // Botón para crear sesión o ir a entrenamiento
  if (microInfos.length > 0 && mesoInfo) {
    // Si está en un microciclo, ir directamente al microciclo
    const btnCrearSesion = document.createElement('button');
    btnCrearSesion.textContent = '+ Crear sesión';
    btnCrearSesion.style.flex = '1';
    btnCrearSesion.style.padding = '12px';
    btnCrearSesion.style.background = 'var(--secondary-cyan)';
    btnCrearSesion.style.color = '#ffffff';
    btnCrearSesion.style.border = 'none';
    btnCrearSesion.style.borderRadius = '8px';
    btnCrearSesion.style.fontSize = '0.95rem';
    btnCrearSesion.style.fontWeight = '700';
    btnCrearSesion.style.cursor = 'pointer';
    btnCrearSesion.style.transition = 'all 0.2s ease';
    
    btnCrearSesion.addEventListener('mouseenter', () => {
      btnCrearSesion.style.background = '#00B8B8';
      btnCrearSesion.style.transform = 'translateY(-1px)';
      btnCrearSesion.style.boxShadow = 'var(--shadow-sm)';
    });
    
    btnCrearSesion.addEventListener('mouseleave', () => {
      btnCrearSesion.style.background = 'var(--secondary-cyan)';
      btnCrearSesion.style.transform = 'translateY(0)';
      btnCrearSesion.style.boxShadow = 'none';
    });
    
    btnCrearSesion.addEventListener('click', () => {
      // Ir al microciclo para crear la sesión
      rutaActual.length = 0;
      rutaActual.push(0, mesoInfo.indice, microInfos[0].indice);
      renderizar();
      overlay.remove();
    });
    
    botonesContainer.appendChild(btnCrearSesion);
  } else {
    // Si no está en ningún ciclo, ir al nivel 1 con mensaje
    const btnIrEntrenamiento = document.createElement('button');
    btnIrEntrenamiento.textContent = '📋 Ir a Entrenamiento';
    btnIrEntrenamiento.style.flex = '1';
    btnIrEntrenamiento.style.padding = '12px';
    btnIrEntrenamiento.style.background = 'var(--secondary-cyan)';
    btnIrEntrenamiento.style.color = '#ffffff';
    btnIrEntrenamiento.style.border = 'none';
    btnIrEntrenamiento.style.borderRadius = '8px';
    btnIrEntrenamiento.style.fontSize = '0.95rem';
    btnIrEntrenamiento.style.fontWeight = '700';
    btnIrEntrenamiento.style.cursor = 'pointer';
    btnIrEntrenamiento.style.transition = 'all 0.2s ease';
    
    btnIrEntrenamiento.addEventListener('mouseenter', () => {
      btnIrEntrenamiento.style.background = '#00B8B8';
      btnIrEntrenamiento.style.transform = 'translateY(-1px)';
      btnIrEntrenamiento.style.boxShadow = 'var(--shadow-sm)';
    });
    
    btnIrEntrenamiento.addEventListener('mouseleave', () => {
      btnIrEntrenamiento.style.background = 'var(--secondary-cyan)';
      btnIrEntrenamiento.style.transform = 'translateY(0)';
      btnIrEntrenamiento.style.boxShadow = 'none';
    });
    
    btnIrEntrenamiento.addEventListener('click', () => {
      // Ir al nivel 1 (mesociclos)
      rutaActual.length = 0;
      rutaActual.push(0);
      renderizar();
      overlay.remove();
      
      // Mostrar mensaje al usuario
      setTimeout(() => {
        alert('⚠️ Primero debes crear un Mesociclo y luego un Microciclo para poder añadir sesiones.');
      }, 300);
    });
    
    botonesContainer.appendChild(btnIrEntrenamiento);
  }

  // Botón cerrar
  const btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Cerrar';
  btnCerrar.style.flex = '1';
  btnCerrar.style.padding = '12px';
  btnCerrar.style.background = 'var(--primary-mint)';
  btnCerrar.style.color = '#ffffff';
  btnCerrar.style.border = 'none';
  btnCerrar.style.borderRadius = '8px';
  btnCerrar.style.fontSize = '1rem';
  btnCerrar.style.fontWeight = '700';
  btnCerrar.style.cursor = 'pointer';
  btnCerrar.style.transition = 'all 0.2s ease';
  
  btnCerrar.addEventListener('mouseenter', () => {
    btnCerrar.style.background = 'var(--mint-light)';
  });
  
  btnCerrar.addEventListener('mouseleave', () => {
    btnCerrar.style.background = 'var(--primary-mint)';
  });
  
  btnCerrar.addEventListener('click', () => overlay.remove());
  
  botonesContainer.appendChild(btnCerrar);
  modal.appendChild(botonesContainer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}