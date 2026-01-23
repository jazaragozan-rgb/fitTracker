// calendario.js
// Renderizado del calendario con scroll infinito y resaltado de microciclos/mesociclos

export function renderizarCalendario(datos, contenido, subHeader, rutaActual, renderizar) {
  // Limpiar subheader
  subHeader.innerHTML = '';
  
  // Título del calendario
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Calendario';
  subHeader.appendChild(h2Nivel);

  // Contenedor de controles de navegación
  const controlesNav = document.createElement('div');
  controlesNav.id = 'subHeaderButtons';
  controlesNav.style.display = 'flex';
  controlesNav.style.gap = '8px';
  controlesNav.style.justifyContent = 'center';
  controlesNav.style.alignItems = 'center';
  controlesNav.style.marginTop = '8px';

  // Selector de mes
  const selectorMes = document.createElement('select');
  selectorMes.className = 'selector-mes-calendario';
  selectorMes.style.padding = '8px 12px';
  selectorMes.style.border = '1px solid var(--border-color)';
  selectorMes.style.borderRadius = '8px';
  selectorMes.style.fontSize = '0.85rem';
  selectorMes.style.fontWeight = '600';
  selectorMes.style.background = 'var(--bg-card)';
  selectorMes.style.color = 'var(--text-primary)';
  selectorMes.style.cursor = 'pointer';
  
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

  // Botón "Hoy"
  const btnHoy = document.createElement('button');
  btnHoy.textContent = '📍 Hoy';
  btnHoy.className = 'btn-hoy-calendario';
  btnHoy.style.padding = '8px 16px';
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

  controlesNav.appendChild(selectorMes);
  controlesNav.appendChild(btnHoy);
  subHeader.appendChild(controlesNav);

  // Breadcrumb dinámico (se actualizará con el scroll)
  const breadcrumb = document.createElement('div');
  breadcrumb.id = 'breadcrumb-mes';
  breadcrumb.style.fontSize = '0.75rem';
  breadcrumb.style.color = 'var(--text-secondary)';
  breadcrumb.style.textAlign = 'center';
  breadcrumb.style.marginTop = '8px';
  breadcrumb.style.fontWeight = '600';
  breadcrumb.style.textTransform = 'uppercase';
  breadcrumb.style.letterSpacing = '0.5px';
  breadcrumb.textContent = `${mesesNombres[mesActual]} ${añoActual}`;
  subHeader.appendChild(breadcrumb);

  // Limpiar contenido
  contenido.innerHTML = '';

  // Contenedor principal del calendario
  const calendarioContainer = document.createElement('div');
  calendarioContainer.className = 'calendario-container';
  calendarioContainer.style.padding = '16px';
  calendarioContainer.style.overflowY = 'auto';
  calendarioContainer.style.height = 'calc(100vh - 116px - 64px)'; // header + subheader + footer
  calendarioContainer.style.scrollBehavior = 'smooth';

  // Obtener todas las sesiones con fecha
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
          sesiones.push({
            fecha: fechaSesion,
            nombre: sesion.nombre || "Sesión sin nombre",
            ejercicios: sesion.hijos || [],
            ruta: [0, i, j, k],
            completada: (sesion.hijos || []).some(bloque => 
              (bloque.hijos || []).some(ej => 
                (ej.series || []).some(s => s.completada)
              )
            )
          });
        }
      });
    });
  });

  // Crear un mapa de sesiones por fecha
  const sesionesPorFecha = {};
  sesiones.forEach(s => {
    if (!sesionesPorFecha[s.fecha]) {
      sesionesPorFecha[s.fecha] = [];
    }
    sesionesPorFecha[s.fecha].push(s);
  });

  let mesActualCard = null;
  const mesesCards = [];

  // Generar desde 12 meses atrás hasta 12 meses adelante
  for (let offset = -12; offset <= 12; offset++) {
    const fecha = new Date(añoActual, mesActual + offset, 1);
    const mesCard = crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar);
    
    // Marcar el mes actual para hacer scroll después
    if (offset === 0) {
      mesActualCard = mesCard;
      mesCard.id = 'mes-actual-calendario';
    }
    
    mesCard.dataset.offset = offset;
    mesesCards.push({ offset, card: mesCard, fecha });
    calendarioContainer.appendChild(mesCard);
  }

  contenido.appendChild(calendarioContainer);

  // Event listener para el selector de mes
  selectorMes.addEventListener('change', (e) => {
    const offset = parseInt(e.target.value);
    const mesCard = mesesCards.find(m => m.offset === offset);
    if (mesCard) {
      mesCard.card.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  });

  // Event listener para el botón "Hoy"
  btnHoy.addEventListener('click', () => {
    if (mesActualCard) {
      mesActualCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
      selectorMes.value = '0';
    }
  });

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

  // Actualizar breadcrumb y selector al hacer scroll
  let ticking = false;
  calendarioContainer.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = calendarioContainer.scrollTop;
        const containerTop = calendarioContainer.getBoundingClientRect().top;
        
        // Encontrar qué mes está visible
        for (const mes of mesesCards) {
          const rect = mes.card.getBoundingClientRect();
          const relativeTop = rect.top - containerTop;
          
          if (relativeTop <= 100 && relativeTop >= -rect.height / 2) {
            breadcrumb.textContent = `${mesesNombres[mes.fecha.getMonth()]} ${mes.fecha.getFullYear()}`;
            selectorMes.value = mes.offset;
            break;
          }
        }
        
        ticking = false;
      });
      ticking = true;
    }
  });

  // Hacer scroll al mes actual después de renderizar
  if (mesActualCard) {
    setTimeout(() => {
      mesActualCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 100);
  }
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
    const porcentaje = Math.round((sesionesCompletadas / sesionesDelMes) * 100);
    statCompletadas.innerHTML = `
      <div style="font-size: 1.5rem; font-weight: 700; color: ${porcentaje === 100 ? '#4CAF50' : porcentaje >= 50 ? '#FFA500' : '#FF6B6B'};">${porcentaje}%</div>
      <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Completado</div>
    `;
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
    diaVacio.style.padding = '12px';
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
    diaDiv.style.cursor = 'pointer'; // Siempre clicable
    diaDiv.style.minHeight = '50px';
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
          ? 'rgba(255, 193, 7, 0.2)'
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