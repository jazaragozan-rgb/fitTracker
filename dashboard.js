// ==================== Dashboard (Nivel 0) - REDISEÑADO ====================
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
        if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
          for (const subNivel of sesion.hijos) {
            if (subNivel.fecha) {
              fechaSesion = subNivel.fecha;
              break;
            }
          }
        }
        if (fechaSesion) {
          const fechaObj = new Date(fechaSesion);
          const mesKey = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`;
          sesionesPorMes[mesKey] = (sesionesPorMes[mesKey] || 0) + 1;
          
          sesiones.push({
            fecha: fechaSesion,
            ejercicios: sesion.hijos || [],
            ruta: [i, j, k],
            nombre: sesion.nombre || "Sesión sin nombre"
          });
        }
      });
    });
  });

  // Recolectar ejercicios con datos Y calcular volumen por sesión
  const volumenPorFecha = {};
  
  // Función recursiva para extraer ejercicios con series de cualquier nivel
  const extraerEjercicios = (nodo, fechaSesion, volumenAcumulado) => {
    if (!nodo) return volumenAcumulado;
    
    // Si el nodo tiene series directamente, es un ejercicio
    if (nodo.series && Array.isArray(nodo.series) && nodo.series.length > 0) {
      let volumenEjercicio = 0;
      
      nodo.series.forEach(serie => {
        const peso = parseFloat(serie.peso) || 0;
        const reps = parseInt(serie.reps) || 0;
        volumenEjercicio += peso * reps;
      });
      
      volumenAcumulado += volumenEjercicio;
      
      // Recolectar para ejercicios (para gráficos de progreso)
      const pesoMax = Math.max(...nodo.series.map(s => parseFloat(s.peso) || 0), 0);
      if (pesoMax > 0 && nodo.nombre) {
        ejerciciosTodos.push({
          nombre: nodo.nombre,
          fecha: fechaSesion,
          pesoMax,
          series: nodo.series
        });
      }
    }
    
    // Continuar recursivamente con los hijos
    if (nodo.hijos && Array.isArray(nodo.hijos)) {
      nodo.hijos.forEach(hijo => {
        volumenAcumulado = extraerEjercicios(hijo, fechaSesion, volumenAcumulado);
      });
    }
    
    return volumenAcumulado;
  };
  
  datos[0]?.hijos?.forEach(meso => {
    (meso.hijos || []).forEach(micro => {
      (micro.hijos || []).forEach(sesion => {
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
          // Calcular volumen total de esta sesión usando la función recursiva
          const volumenSesion = extraerEjercicios(sesion, fechaSesion, 0);
          
          // Agrupar por fecha para luego convertir a semanas
          if (volumenSesion > 0) {
            volumenPorFecha[fechaSesion] = (volumenPorFecha[fechaSesion] || 0) + volumenSesion;
          }
        }
      });
    });
  });
  
  // Convertir volumen por fecha a volumen por semana
  Object.keys(volumenPorFecha).forEach(fecha => {
    const fechaObj = new Date(fecha);
    const inicioSemana = new Date(fechaObj);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const semanaKey = inicioSemana.toISOString().split('T')[0];
    
    const semanaExistente = volumenPorSemana.find(s => s.semana === semanaKey);
    if (semanaExistente) {
      semanaExistente.volumen += volumenPorFecha[fecha];
    } else {
      volumenPorSemana.push({ semana: semanaKey, volumen: volumenPorFecha[fecha] });
    }
  });

  // ==================== 1. RESUMEN RÁPIDO ====================
  const cardResumen = crearCard('Resumen General', 'full-width');
  
  const estadisticas = document.createElement('div');
  estadisticas.className = 'stats-grid';
  
  // Total de sesiones
  const totalSesiones = sesiones.length;
  const sesionesEsteMes = sesiones.filter(s => {
    const fecha = new Date(s.fecha);
    return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
  }).length;
  
  // Ejercicios únicos
  const ejerciciosUnicos = new Set(ejerciciosTodos.map(e => e.nombre)).size;
  
  // Volumen total últimos 30 días
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const volumenTotal = ejerciciosTodos
    .filter(e => new Date(e.fecha) >= hace30Dias)
    .reduce((sum, e) => sum + (e.series?.reduce((s, serie) => s + (parseFloat(serie.peso) * parseInt(serie.reps) || 0), 0) || 0), 0);

  // Racha actual
  let racha = 0;
  const sesionesSorted = [...sesiones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  let fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);
  
  for (const sesion of sesionesSorted) {
    const fechaSesion = new Date(sesion.fecha);
    fechaSesion.setHours(0, 0, 0, 0);
    const diff = Math.floor((fechaActual - fechaSesion) / (1000 * 60 * 60 * 24));
    
    if (diff === racha || (racha === 0 && diff <= 1)) {
      racha++;
      fechaActual = fechaSesion;
    } else {
      break;
    }
  }

  estadisticas.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${totalSesiones}</div>
      <div class="stat-label">Sesiones totales</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${sesionesEsteMes}</div>
      <div class="stat-label">Este mes</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${ejerciciosUnicos}</div>
      <div class="stat-label">Ejercicios distintos</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${Math.round(volumenTotal)}<span class="stat-unit">kg</span></div>
      <div class="stat-label">Volumen 30 días</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${racha}<span class="stat-unit">🔥</span></div>
      <div class="stat-label">Racha de días</div>
    </div>
  `;
  
  cardResumen.appendChild(estadisticas);
  dashboard.appendChild(cardResumen);

  // ==================== 2. CALENDARIO SEMANAL ====================
  const cardCalendario = crearCard('Esta Semana', '');
  
  let primerDiaSemana = new Date();
  // Ajustar para que lunes sea el primer día (0=domingo -> 6, 1=lunes -> 0)
  const diaSemana = primerDiaSemana.getDay();
  const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  primerDiaSemana.setDate(primerDiaSemana.getDate() - diasHastaLunes);
  
  const calendarioWrapper = document.createElement('div');
  calendarioWrapper.className = 'calendario-wrapper';
  
  const mesNombre = document.createElement('p');
  mesNombre.className = 'nombre-mes';
  calendarioWrapper.appendChild(mesNombre);

  const filaContainer = document.createElement('div');
  filaContainer.className = 'fila-container';

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '<';
  btnPrev.className = 'week-nav';
  
  const btnNext = document.createElement('button');
  btnNext.textContent = '>';
  btnNext.className = 'week-nav';

  const daysRow = document.createElement('div');
  daysRow.className = 'days-row';

  filaContainer.appendChild(btnPrev);
  filaContainer.appendChild(daysRow);
  filaContainer.appendChild(btnNext);
  calendarioWrapper.appendChild(filaContainer);

  const detalleDiv = document.createElement('div');
  detalleDiv.className = "detalle-dia";
  calendarioWrapper.appendChild(detalleDiv);

  const diasLetra = ["L","M","X","J","V","S","D"];

  function renderDias() {
    daysRow.innerHTML = '';
    const mesActual = new Date(primerDiaSemana).getMonth();
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    mesNombre.textContent = meses[mesActual];

    const hoy = new Date();
    const hoyStr = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    let btnHoy = null;

    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(primerDiaSemana);
      fechaDia.setDate(primerDiaSemana.getDate() + i);
      const fechaStr = fechaDia.getFullYear() + '-' + String(fechaDia.getMonth() + 1).padStart(2, '0') + '-' + String(fechaDia.getDate()).padStart(2, '0');
      const sesionDia = sesiones.find(s => s.fecha === fechaStr);

      const btn = document.createElement('button');
      btn.className = 'day-btn';
      if (sesionDia) btn.classList.add('done');
      if (fechaStr === hoyStr) btn.classList.add('today');
      if (fechaStr === hoyStr && sesionDia) btn.classList.add('today-done');

      btn.innerHTML = `<span class="num">${fechaDia.getDate()}</span><span class="letra">${diasLetra[i]}</span>`;

      btn.addEventListener('click', () => {
        detalleDiv.innerHTML = "";

        if (sesionDia) {
          const sesionBtn = document.createElement("button");
          sesionBtn.textContent = sesionDia.nombre;
          sesionBtn.className = "btn-sesion";
          detalleDiv.appendChild(sesionBtn);

          sesionBtn.addEventListener("click", () => {
            rutaActual.length = 0;
            rutaActual.push(0, ...sesionDia.ruta);
            window.renderizar();
          });

          sesionDia.ejercicios.forEach(ej => {
            const p = document.createElement('p');
            p.textContent = ej.nombre || "Ejercicio sin nombre";
            p.style.fontSize = '0.85rem';
            p.style.color = 'var(--text-secondary)';
            detalleDiv.appendChild(p);
          });
        } else {
          detalleDiv.textContent = "Sin entreno este día.";
        }
      });

      if (fechaStr === hoyStr) btnHoy = btn;

      daysRow.appendChild(btn);
    }

    if (btnHoy) btnHoy.click();
  }

  btnPrev.addEventListener('click', () => {
    primerDiaSemana.setDate(primerDiaSemana.getDate() - 7);
    detalleDiv.innerHTML = '';
    renderDias();
  });
  
  btnNext.addEventListener('click', () => {
    primerDiaSemana.setDate(primerDiaSemana.getDate() + 7);
    detalleDiv.innerHTML = '';
    renderDias();
  });

  renderDias();
  cardCalendario.appendChild(calendarioWrapper);
  dashboard.appendChild(cardCalendario);

  // ==================== 3. FRECUENCIA DE ENTRENAMIENTO ====================
  const cardFrecuencia = crearCard('Frecuencia Mensual', '');
  
  const chartFrecuencia = document.createElement('canvas');
  chartFrecuencia.className = 'dashboard-chart';
  cardFrecuencia.appendChild(chartFrecuencia);

  // Últimos 6 meses
  const mesesData = [];
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - i);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const mesNombre = fecha.toLocaleDateString('es-ES', { month: 'short' });
    mesesData.push({
      mes: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
      sesiones: sesionesPorMes[mesKey] || 0
    });
  }

  if (window.Chart) {
    new Chart(chartFrecuencia, {
      type: 'bar',
      data: {
        labels: mesesData.map(m => m.mes),
        datasets: [{
          label: 'Sesiones',
          data: mesesData.map(m => m.sesiones),
          backgroundColor: 'rgba(61, 213, 152, 0.8)',
          borderColor: 'rgb(61, 213, 152)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  dashboard.appendChild(cardFrecuencia);

  // ==================== 4. VOLUMEN POR SEMANA ====================
  const cardVolumen = crearCard('Volumen Semanal', '');
  
  const chartVolumen = document.createElement('canvas');
  chartVolumen.className = 'dashboard-chart';
  cardVolumen.appendChild(chartVolumen);

  // Últimas 8 semanas
  volumenPorSemana.sort((a, b) => new Date(a.semana) - new Date(b.semana));
  const ultimasSemanas = volumenPorSemana.slice(-8);

  if (window.Chart && ultimasSemanas.length > 0) {
    new Chart(chartVolumen, {
      type: 'line',
      data: {
        labels: ultimasSemanas.map(s => {
          const fecha = new Date(s.semana);
          return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
        }),
        datasets: [{
          label: 'Volumen (kg)',
          data: ultimasSemanas.map(s => Math.round(s.volumen)),
          borderColor: 'rgb(0, 212, 212)',
          backgroundColor: 'rgba(0, 212, 212, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(0, 212, 212)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: (context) => `${context.parsed.y} kg totales`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } else {
    // Mostrar mensaje si no hay datos
    const mensajeVacio = document.createElement('div');
    mensajeVacio.className = 'empty-state';
    mensajeVacio.textContent = 'No hay datos de volumen disponibles. Completa sesiones con series registradas para ver este gráfico.';
    cardVolumen.appendChild(mensajeVacio);
  }

  dashboard.appendChild(cardVolumen);

  // ==================== 5. TOP EJERCICIOS ====================
  const cardTop = crearCard('Ejercicios Más Realizados', '');
  
  const ejerciciosCount = {};
  ejerciciosTodos.forEach(e => {
    ejerciciosCount[e.nombre] = (ejerciciosCount[e.nombre] || 0) + 1;
  });

  const topEjercicios = Object.entries(ejerciciosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const listaTop = document.createElement('div');
  listaTop.className = 'top-ejercicios-lista';
  
  topEjercicios.forEach(([nombre, cantidad], index) => {
    const item = document.createElement('div');
    item.className = 'top-item';
    item.innerHTML = `
      <div class="top-rank">${index + 1}</div>
      <div class="top-nombre">${nombre}</div>
      <div class="top-cantidad">${cantidad}×</div>
    `;
    listaTop.appendChild(item);
  });

  if (topEjercicios.length === 0) {
    listaTop.innerHTML = '<p class="empty-state">No hay ejercicios registrados aún</p>';
  }

  cardTop.appendChild(listaTop);
  dashboard.appendChild(cardTop);

  // ==================== 6. PROGRESO DE EJERCICIO DESTACADO ====================
  const cardProgreso = crearCard('Progreso de Ejercicio', '');
  
  const selectorEjercicio = document.createElement('select');
  selectorEjercicio.className = 'selector-ejercicio';
  
  const nombresUnicos = [...new Set(ejerciciosTodos.map(e => e.nombre))].sort();
  nombresUnicos.forEach(nombre => {
    const option = document.createElement('option');
    option.value = nombre;
    option.textContent = nombre;
    selectorEjercicio.appendChild(option);
  });
  
  cardProgreso.appendChild(selectorEjercicio);

  const chartProgreso = document.createElement('canvas');
  chartProgreso.className = 'dashboard-chart';
  chartProgreso.style.marginTop = '12px';
  cardProgreso.appendChild(chartProgreso);

  function renderizarProgreso(nombreEjercicio) {
    const datosEjercicio = ejerciciosTodos
      .filter(e => e.nombre === nombreEjercicio)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-10); // Últimas 10 sesiones

    const data = datosEjercicio.map(e => ({
      x: new Date(e.fecha),
      y: e.pesoMax
    }));

    if (chartProgreso.chartInstance) chartProgreso.chartInstance.destroy();

    if (window.Chart && data.length > 0) {
      chartProgreso.chartInstance = new Chart(chartProgreso, {
        type: 'line',
        data: {
          datasets: [{
            label: 'Peso máximo (kg)',
            data,
            borderColor: 'rgb(255, 107, 107)',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: 'rgb(255, 107, 107)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              callbacks: {
                label: (context) => `${context.parsed.y} kg`
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
                tooltipFormat: 'dd/MM',
                displayFormats: { day: 'dd/MM' }
              },
              grid: { display: false }
            },
            y: {
              beginAtZero: false,
              grid: { color: 'rgba(0, 0, 0, 0.05)' }
            }
          }
        }
      });
    } else {
      const ctx = chartProgreso.getContext('2d');
      ctx.clearRect(0, 0, chartProgreso.width, chartProgreso.height);
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.fillText('No hay datos suficientes', chartProgreso.width / 2, chartProgreso.height / 2);
    }
  }

  selectorEjercicio.addEventListener('change', (e) => {
    renderizarProgreso(e.target.value);
  });

  if (nombresUnicos.length > 0) {
    setTimeout(() => renderizarProgreso(nombresUnicos[0]), 100);
  }

  dashboard.appendChild(cardProgreso);

  // ==================== CONTENIDO EXTRA ====================
  datos.filter(item => !['Entrenamiento','Seguimiento','Calendario'].includes(item.nombre))
       .forEach((item, index) => {
         const div = crearIndice(item, index, { hijos: datos });
         div.addEventListener('click', () => { rutaActual.push(index); });
         contenido.appendChild(div);
       });
}

// ==================== HELPER: CREAR TARJETA ====================
function crearCard(titulo, extraClass = '') {
  const card = document.createElement('div');
  card.className = `dashboard-card ${extraClass}`;
  
  const tituloEl = document.createElement('h3');
  tituloEl.className = 'card-title';
  tituloEl.textContent = titulo;
  card.appendChild(tituloEl);
  
  return card;
}