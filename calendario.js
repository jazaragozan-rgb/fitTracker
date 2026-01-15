// calendario.js
// Renderizado del calendario con scroll infinito

export function renderizarCalendario(datos, contenido, subHeader, rutaActual, renderizar) {
  // Limpiar subheader
  subHeader.innerHTML = '';
  
  // Título del calendario
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Calendario';
  subHeader.appendChild(h2Nivel);

  // Limpiar contenido
  contenido.innerHTML = '';

  // Contenedor principal del calendario
  const calendarioContainer = document.createElement('div');
  calendarioContainer.className = 'calendario-container';
  calendarioContainer.style.padding = '16px';
  calendarioContainer.style.overflowY = 'auto';
  calendarioContainer.style.height = 'calc(100vh - 116px - 64px)'; // header + subheader + footer

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
            ruta: [0, i, j, k]
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

  // Generar calendario para 12 meses (6 anteriores y 6 siguientes)
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  // Generar desde 6 meses atrás hasta 6 meses adelante
  for (let offset = -6; offset <= 6; offset++) {
    const fecha = new Date(añoActual, mesActual + offset, 1);
    const mesCard = crearMesCalendario(fecha, sesionesPorFecha, hoy, rutaActual, renderizar);
    calendarioContainer.appendChild(mesCard);
  }

  contenido.appendChild(calendarioContainer);
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
  titulo.style.marginBottom = '16px';
  titulo.style.color = 'var(--primary-mint)';
  titulo.style.fontSize = '1.2rem';
  titulo.style.fontWeight = '700';
  titulo.style.textTransform = 'uppercase';
  mesCard.appendChild(titulo);

  // Días de la semana
  const diasSemana = document.createElement('div');
  diasSemana.className = 'dias-semana-header';
  diasSemana.style.display = 'grid';
  diasSemana.style.gridTemplateColumns = 'repeat(7, 1fr)';
  diasSemana.style.gap = '4px';
  diasSemana.style.marginBottom = '8px';
  
  ['D', 'L', 'M', 'X', 'J', 'V', 'S'].forEach(dia => {
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
  const primerDiaSemana = primerDia.getDay(); // 0 = domingo
  const totalDias = ultimoDia.getDate();

  // Días vacíos antes del primer día
  for (let i = 0; i < primerDiaSemana; i++) {
    const diaVacio = document.createElement('div');
    diaVacio.className = 'dia-vacio';
    diaVacio.style.padding = '12px';
    diasGrid.appendChild(diaVacio);
  }

  // Días del mes
  for (let dia = 1; dia <= totalDias; dia++) {
    const fechaDia = new Date(fecha.getFullYear(), fecha.getMonth(), dia);
    const fechaStr = fechaDia.getFullYear() + '-' + 
                     String(fechaDia.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(fechaDia.getDate()).padStart(2, '0');
    
    const sesionesDia = sesionesPorFecha[fechaStr] || [];
    const esHoy = fechaDia.toDateString() === hoy.toDateString();

    const diaDiv = document.createElement('div');
    diaDiv.className = 'dia-calendario';
    diaDiv.style.padding = '8px';
    diaDiv.style.borderRadius = '8px';
    diaDiv.style.textAlign = 'center';
    diaDiv.style.cursor = sesionesDia.length > 0 ? 'pointer' : 'default';
    diaDiv.style.minHeight = '50px';
    diaDiv.style.display = 'flex';
    diaDiv.style.flexDirection = 'column';
    diaDiv.style.alignItems = 'center';
    diaDiv.style.justifyContent = 'flex-start';
    diaDiv.style.transition = 'all 0.2s ease';

    // Estilos según estado
    if (esHoy && sesionesDia.length > 0) {
      diaDiv.style.background = 'var(--primary-mint)';
      diaDiv.style.color = '#ffffff';
      diaDiv.style.fontWeight = '700';
      diaDiv.style.boxShadow = 'var(--shadow-md)';
    } else if (esHoy) {
      diaDiv.style.background = 'var(--bg-main)';
      diaDiv.style.border = '2px solid var(--primary-mint)';
      diaDiv.style.color = 'var(--primary-mint)';
      diaDiv.style.fontWeight = '700';
    } else if (sesionesDia.length > 0) {
      diaDiv.style.background = 'var(--secondary-cyan)';
      diaDiv.style.color = '#ffffff';
      diaDiv.style.fontWeight = '600';
    } else {
      diaDiv.style.background = 'var(--bg-main)';
      diaDiv.style.color = 'var(--text-primary)';
    }

    // Número del día
    const numeroDia = document.createElement('div');
    numeroDia.textContent = dia;
    numeroDia.style.fontSize = '1rem';
    numeroDia.style.marginBottom = '4px';
    diaDiv.appendChild(numeroDia);

    // Indicador de sesiones
    if (sesionesDia.length > 0) {
      const indicador = document.createElement('div');
      indicador.textContent = `${sesionesDia.length}`;
      indicador.style.fontSize = '0.7rem';
      indicador.style.background = 'rgba(255, 255, 255, 0.3)';
      indicador.style.borderRadius = '10px';
      indicador.style.padding = '2px 6px';
      indicador.style.marginTop = '2px';
      diaDiv.appendChild(indicador);

      // Click para mostrar sesiones
      diaDiv.addEventListener('click', () => {
        mostrarSesionesDia(fechaStr, sesionesDia, rutaActual, renderizar);
      });

      diaDiv.addEventListener('mouseenter', () => {
        diaDiv.style.transform = 'scale(1.05)';
        diaDiv.style.boxShadow = 'var(--shadow-md)';
      });

      diaDiv.addEventListener('mouseleave', () => {
        diaDiv.style.transform = 'scale(1)';
        diaDiv.style.boxShadow = esHoy ? 'var(--shadow-md)' : 'none';
      });
    }

    diasGrid.appendChild(diaDiv);
  }

  mesCard.appendChild(diasGrid);
  return mesCard;
}

function mostrarSesionesDia(fecha, sesiones, rutaActual, renderizar) {
  // Crear modal para mostrar las sesiones del día
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

  // Título
  const fechaObj = new Date(fecha + 'T00:00:00');
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const titulo = document.createElement('h3');
  titulo.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  titulo.style.marginBottom = '16px';
  titulo.style.color = 'var(--primary-mint)';
  titulo.style.fontSize = '1.2rem';
  titulo.style.textAlign = 'center';
  modal.appendChild(titulo);

  // Lista de sesiones
  sesiones.forEach(sesion => {
    const sesionDiv = document.createElement('div');
    sesionDiv.style.background = 'var(--bg-main)';
    sesionDiv.style.padding = '12px';
    sesionDiv.style.borderRadius = '8px';
    sesionDiv.style.marginBottom = '8px';
    sesionDiv.style.cursor = 'pointer';
    sesionDiv.style.transition = 'all 0.2s ease';

    sesionDiv.addEventListener('mouseenter', () => {
      sesionDiv.style.background = 'var(--primary-mint)';
      sesionDiv.style.color = '#ffffff';
    });

    sesionDiv.addEventListener('mouseleave', () => {
      sesionDiv.style.background = 'var(--bg-main)';
      sesionDiv.style.color = 'var(--text-primary)';
    });

    sesionDiv.addEventListener('click', () => {
      // Navegar a la sesión
      rutaActual.length = 0;
      rutaActual.push(...sesion.ruta);
      renderizar();
      overlay.remove();
    });

    const nombreSesion = document.createElement('div');
    nombreSesion.textContent = sesion.nombre;
    nombreSesion.style.fontWeight = '700';
    nombreSesion.style.marginBottom = '4px';
    sesionDiv.appendChild(nombreSesion);

    const cantidadEjercicios = document.createElement('div');
    cantidadEjercicios.textContent = `${sesion.ejercicios.length} ejercicios`;
    cantidadEjercicios.style.fontSize = '0.85rem';
    cantidadEjercicios.style.opacity = '0.8';
    sesionDiv.appendChild(cantidadEjercicios);

    modal.appendChild(sesionDiv);
  });

  // Botón cerrar
  const btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Cerrar';
  btnCerrar.style.width = '100%';
  btnCerrar.style.marginTop = '16px';
  btnCerrar.style.padding = '12px';
  btnCerrar.style.background = 'var(--primary-mint)';
  btnCerrar.style.color = '#ffffff';
  btnCerrar.style.border = 'none';
  btnCerrar.style.borderRadius = '8px';
  btnCerrar.style.fontSize = '1rem';
  btnCerrar.style.fontWeight = '700';
  btnCerrar.style.cursor = 'pointer';
  btnCerrar.addEventListener('click', () => overlay.remove());
  modal.appendChild(btnCerrar);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}