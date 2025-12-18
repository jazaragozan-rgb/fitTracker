// ==================== Dashboard (Nivel 0) ====================
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
            ejercicios: sesion.hijos || [],
            ruta: [i, j, k],
            nombre: sesion.nombre || "Sesión sin nombre"
          });
        }
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
          // 👉 Botón con nombre de sesión
          const sesionBtn = document.createElement("button");
          sesionBtn.textContent = sesionDia.nombre;
          sesionBtn.className = "btn-sesion";
          sesionBtn.style.margin = "4px 0";
          detalleDiv.appendChild(sesionBtn);

          sesionBtn.addEventListener("click", () => {
            rutaActual.length = 0;
            rutaActual.push(0, ...sesionDia.ruta);
            window.renderizar();
          });

          // 👉 Lista de ejercicios
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

  // 👇 Selector de rango de días
  const filtroDias = document.createElement('select');
  [30, 60, 90].forEach(rango => {
    const option = document.createElement('option');
    option.value = rango;
    option.textContent = `Últimos ${rango} días`;
    filtroDias.appendChild(option);
  });
  card2.appendChild(filtroDias);

  // 👇 Selector de tipo de dato
  const filtroTipoDato = document.createElement('select');
  ['Peso máximo', '1RM', 'Volumen'].forEach(tipo => {
    const option = document.createElement('option');
    option.value = tipo;
    option.textContent = tipo;
    filtroTipoDato.appendChild(option);
  });
  card2.appendChild(filtroTipoDato);

  const scrollContainer = document.createElement('div');
  scrollContainer.style.display = 'flex';
  scrollContainer.style.overflowX = 'auto';
  scrollContainer.style.gap = '8px';
  scrollContainer.style.padding = '4px 0';
  scrollContainer.style.borderBottom = '1px solid #ccc';
  ['touchstart', 'touchmove', 'touchend'].forEach(eventName => {
    scrollContainer.addEventListener(eventName, e => e.stopPropagation());
  });
  card2.appendChild(scrollContainer);

  const chartWrapper = document.createElement('div');
  chartWrapper.style.width = '100%';
  chartWrapper.style.height = '180px';
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
        (sesion.hijos || []).forEach(subSesion => {
          const fechaSubSesion = subSesion.fecha;
          const fechaSubSesionTS = new Date(fechaSubSesion).getTime() || 0;
          if (fechaSubSesionTS <= hoy) {
            (subSesion.series ? [subSesion] : (subSesion.hijos || [])).forEach(ej => {
              const ejercicios = ej.series ? [ej] : (ej.hijos || []);
              ejercicios.forEach(ejercicio => {
                const pesoMax = Math.max(...(ejercicio.series?.map(s => parseFloat(s.peso) || 0) || [0]));
                if (pesoMax > 0) {
                  ejerciciosTodos.push({
                    nombre: ejercicio.nombre,
                    fecha: fechaSubSesion,
                    pesoMax,
                    series: ejercicio.series
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

    ejDiv.addEventListener('click', () => generarGrafico(nombre));

    scrollContainer.appendChild(ejDiv);
  });

  // ==================== Función para generar gráfico según tipo de dato ====================
  function generarGrafico(nombre) {
    const tipoDato = filtroTipoDato.value; // Peso máximo, 1RM, Volumen
    const datosEjercicio = ejerciciosTodos
      .filter(e => e.nombre === nombre)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const data = datosEjercicio.map(e => {
      let y = e.pesoMax; // default
      if (tipoDato === '1RM') y = e.pesoMax * 1.05; // ejemplo
      if (tipoDato === 'Volumen') y = e.series?.reduce((sum, s) => sum + (s.peso * s.reps || 0), 0) || 0;
      return { x: new Date(e.fecha), y };
    });

    if (window.Chart) {
      if (chartContainer.chartInstance) chartContainer.chartInstance.destroy();
      const ctx = chartContainer.getContext('2d');
      const rangoDias = parseInt(filtroDias.value);
      chartContainer.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: `${nombre} - ${tipoDato}`,
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
                  return `${context.dataset.label}: ${context.parsed.y} ${tipoDato === 'Volumen' ? 'kg·reps' : 'kg'}`;
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
              min: new Date(Date.now() - rangoDias * 24 * 60 * 60 * 1000),
              max: new Date()
            },
            y: {
              title: { display: true, text: tipoDato }
            }
          }
        }
      });
    }
  }

  if (nombresUnicos.length > 0) {
    setTimeout(() => {
      if (scrollContainer.firstChild) scrollContainer.firstChild.click();
    }, 50);
  }

  filtroDias.addEventListener('change', () => {
    if (scrollContainer.firstChild) generarGrafico(scrollContainer.firstChild.textContent);
  });

  filtroTipoDato.addEventListener('change', () => {
    if (scrollContainer.firstChild) generarGrafico(scrollContainer.firstChild.textContent);
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
