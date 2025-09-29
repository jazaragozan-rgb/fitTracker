export function renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton) {
  tituloNivel.textContent = 'Dashboard';
  backButton.style.visibility = 'hidden';
  addButton.style.visibility = 'hidden';
  contenido.innerHTML = '';

  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard-container';
  dashboard.style.display = 'flex';
  dashboard.style.gap = '16px';
  dashboard.style.flexWrap = 'wrap';

  // ==================== 📅 Entrenamientos realizados ====================
  const card1 = document.createElement('div');
  card1.className = 'dashboard-card';
  card1.style.flex = '1 1 300px';
  card1.style.padding = '12px';
  card1.style.border = '1px solid #ccc';
  card1.style.borderRadius = '8px';
  card1.style.background = '#fff';

  const mesNombre = document.createElement('p');
  mesNombre.className = 'nombre-mes';
  card1.appendChild(mesNombre);

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
  card1.appendChild(filaContainer);

  const detalleDiv = document.createElement('div');
  detalleDiv.className = "detalle-dia";
  card1.appendChild(detalleDiv);

  dashboard.appendChild(card1);

  // ==================== Sesiones ====================
  const sesiones = [];
  datos[0]?.hijos?.forEach(meso => {
    meso.hijos?.forEach(micro => {
      micro.hijos?.forEach(sesion => {
        // Buscar la fecha más profunda disponible
        let fechaSesion = sesion.fecha;
        if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
          // Si la sesión no tiene fecha, buscar en el primer hijo que tenga fecha
          for (const subNivel of sesion.hijos) {
            if (subNivel.fecha) {
              fechaSesion = subNivel.fecha;
              break;
            }
          }
        }
        if (fechaSesion) sesiones.push({ fecha: fechaSesion, ejercicios: sesion.hijos || [] });
      });
    });
  });

  let primerDiaSemana = new Date();
  primerDiaSemana.setDate(primerDiaSemana.getDate() - primerDiaSemana.getDay()); // domingo

  const diasLetra = ["D","L","M","X","J","V","S"];

  function renderDias() {
    daysRow.innerHTML = '';
    const mesActual = new Date(primerDiaSemana).getMonth();
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    mesNombre.textContent = meses[mesActual];

    const hoyStr = new Date().toISOString().split("T")[0];
    let btnHoy = null;

    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(primerDiaSemana);
      fechaDia.setDate(primerDiaSemana.getDate() + i);
      const fechaStr = fechaDia.toISOString().split("T")[0];
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
          sesionDia.ejercicios.forEach(ej => {
            const p = document.createElement('p');
            p.textContent = ej.nombre || "Ejercicio sin nombre";
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

// ==================== Ejercicios completados con gráfico dinámico ====================
const card2 = document.createElement('div');
card2.className = 'dashboard-card';
card2.style.flex = '1 1 300px';
card2.style.padding = '12px';
card2.style.border = '1px solid #ccc';
card2.style.borderRadius = '8px';
card2.style.background = '#fff';

const tituloCard2 = document.createElement('h3');
tituloCard2.textContent = 'Progreso de ejercicios';
card2.appendChild(tituloCard2);

// 👇 Selector de rango
const filtroDias = document.createElement('select');
[30, 60, 90].forEach(rango => {
  const option = document.createElement('option');
  option.value = rango;
  option.textContent = `Últimos ${rango} días`;
  filtroDias.appendChild(option);
});
card2.appendChild(filtroDias);

const scrollContainer = document.createElement('div');
scrollContainer.style.display = 'flex';
scrollContainer.style.overflowX = 'auto';
scrollContainer.style.gap = '8px';
scrollContainer.style.padding = '4px 0';
scrollContainer.style.borderBottom = '1px solid #ccc';
// Deshabilitar swipe global solo en el área de scroll
['touchstart', 'touchmove', 'touchend'].forEach(eventName => {
  scrollContainer.addEventListener(eventName, e => e.stopPropagation());
});
card2.appendChild(scrollContainer);

// ✅ Contenedor para el gráfico (controla la altura)
const chartWrapper = document.createElement('div');
chartWrapper.style.width = '100%';
chartWrapper.style.height = '180px'; // Ajusta este valor según necesites
chartWrapper.style.position = 'relative';

const chartContainer = document.createElement('canvas');
chartContainer.id = 'ejerciciosChart';
chartContainer.style.width = '100%';
chartContainer.style.height = '100%';
chartWrapper.appendChild(chartContainer);

card2.appendChild(chartWrapper);


  // ==================== Recolectar datos de ejercicios ====================
  const hoy = Date.now();
  const ejerciciosTodos = [];

  datos.forEach(meso => {
    (meso.hijos || []).forEach(micro => {
      (micro.hijos || []).forEach(sesion => {
        // Recorrer los hijos de la sesión (Día A, Día B)
        (sesion.hijos || []).forEach(subSesion => {
          const fechaSubSesion = subSesion.fecha;
          const fechaSubSesionTS = new Date(fechaSubSesion).getTime() || 0;
          if (fechaSubSesionTS <= hoy) {
            (subSesion.series ? [subSesion] : (subSesion.hijos || [])).forEach(ej => {
              // Si subSesion tiene series, es un ejercicio; si no, recorrer sus hijos
              const ejercicios = ej.series ? [ej] : (ej.hijos || []);
              ejercicios.forEach(ejercicio => {
                const pesoMax = Math.max(...(ejercicio.series?.map(s => parseFloat(s.peso) || 0) || [0]));
                if (pesoMax > 0) {
                  console.log('[Gráfico] Ejercicio:', ejercicio.nombre, 'Fecha:', fechaSubSesion, 'PesoMax:', pesoMax);
                  ejerciciosTodos.push({
                    nombre: ejercicio.nombre,
                    fecha: fechaSubSesion,
                    pesoMax
                  });
                }
              });
            });
          }
        });
      });
    });
  });

  const nombresUnicos = [...new Set(ejerciciosTodos.map(e => e.nombre))];

  scrollContainer.innerHTML = '';
  nombresUnicos.forEach(nombre => {
    const ejDiv = document.createElement('div');
    ejDiv.textContent = nombre;
    ejDiv.style.padding = '4px 8px';
    ejDiv.style.background = '#eee';
    ejDiv.style.borderRadius = '4px';
    ejDiv.style.whiteSpace = 'nowrap';
    ejDiv.style.cursor = 'pointer';

    ejDiv.addEventListener('click', () => {
      const datosEjercicio = ejerciciosTodos
        .filter(e => e.nombre === nombre)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      const data = datosEjercicio.map(e => ({
        x: new Date(e.fecha),
        y: e.pesoMax
      }));

      if (window.Chart) {
        if (chartContainer.chartInstance) chartContainer.chartInstance.destroy();

        const ctx = chartContainer.getContext('2d');
        const rangoDias = parseInt(filtroDias.value); // 👈 lee el rango elegido
        chartContainer.chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            datasets: [{
              label: nombre + ' - Peso máximo (kg)',
              data,
              borderColor: '#3498f7',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.3,
              fill: true,
              pointRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.dataset.label}: ${context.parsed.y} kg`;
                  }
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
                title: { display: false },
                min: new Date(Date.now() - rangoDias * 24 * 60 * 60 * 1000), // 👈 dinámico
                max: new Date()
              },
              y: {
                title: { display: true, text: 'Peso máximo (kg)' }
              }
            }
          }
        });
      }
    });

    scrollContainer.appendChild(ejDiv);
  });

  if (nombresUnicos.length > 0) {
    // Forzar el click en el primer ejercicio tras un pequeño delay para asegurar que el DOM está listo
    setTimeout(() => {
      if (scrollContainer.firstChild) scrollContainer.firstChild.click();
    }, 50);
  }

  // 👇 Si cambia el filtro, se redibuja el gráfico con el primer ejercicio
  filtroDias.addEventListener('change', () => {
    if (scrollContainer.firstChild) {
      scrollContainer.firstChild.click();
    }
  });

  dashboard.appendChild(card2);

  // ==================== Contenido extra ====================
  contenido.appendChild(dashboard);

  datos.filter(item => !['Entrenamiento','Seguimiento','Calendario'].includes(item.nombre))
       .forEach((item, index) => {
         const div = crearIndice(item, index, { hijos: datos });
         div.addEventListener('click', () => { rutaActual.push(index); });
         contenido.appendChild(div);
       });
}
