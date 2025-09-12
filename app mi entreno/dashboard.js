export function renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton) {
  tituloNivel.textContent = 'Dashboard';
  backButton.style.visibility = 'hidden';
  addButton.style.visibility = 'hidden';
  contenido.innerHTML = '';

  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard-container';

  // ==================== 📅 Entrenamientos realizados ====================
  const card = document.createElement('div');
  card.className = 'dashboard-card';

  // Nombre del mes
  const mesNombre = document.createElement('p');
  mesNombre.className = 'nombre-mes';
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  card.appendChild(mesNombre);

  // Contenedor principal de la fila de días y los botones de navegación
  const filaContainer = document.createElement('div');
  filaContainer.className = 'fila-container'; // para usar flex y alinear < y >

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
  card.appendChild(filaContainer);

  // Contenedor para detalle del día
  const detalleDiv = document.createElement('div');
  detalleDiv.className = "detalle-dia";
  card.appendChild(detalleDiv);

  dashboard.appendChild(card);

  // ==================== Sesiones y lógica ====================
  const sesiones = [];
  datos[0]?.hijos?.forEach(meso => {
    meso.hijos?.forEach(micro => {
      micro.hijos?.forEach(sesion => {
        if (sesion.fecha) sesiones.push({ fecha: sesion.fecha, ejercicios: sesion.hijos || [] });
      });
    });
  });

  // Semana actual (variable global dentro de esta función)
  let primerDiaSemana = new Date();
  primerDiaSemana.setDate(primerDiaSemana.getDate() - primerDiaSemana.getDay()); // domingo

  const diasLetra = ["D","L","M","X","J","V","S"];

  function renderDias() {
  daysRow.innerHTML = '';
  const mesActual = new Date(primerDiaSemana).getMonth();
  mesNombre.textContent = meses[mesActual];

  const hoyStr = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
  let btnHoy = null; // botón del día actual

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
        const titulo = document.createElement('h4');
        detalleDiv.appendChild(titulo);

        sesionDia.ejercicios.forEach(ej => {
          const p = document.createElement('p');
          p.textContent = ej.nombre || "Ejercicio sin nombre";
          detalleDiv.appendChild(p);
        });
      } else {
        detalleDiv.textContent = "Sin entreno este día.";
      }
    });

    // Guardamos el botón de hoy para disparar el click más tarde
    if (fechaStr === hoyStr) btnHoy = btn;

    daysRow.appendChild(btn);
  }

  // Disparar click en el botón de hoy automáticamente
  if (btnHoy) btnHoy.click();
}


  // Botones de cambio de semana
  btnPrev.addEventListener('click', () => {
    primerDiaSemana.setDate(primerDiaSemana.getDate() - 7);
    detalleDiv.innerHTML = ''; // <-- limpiar ejercicios
    renderDias();
  });

  btnNext.addEventListener('click', () => {
    primerDiaSemana.setDate(primerDiaSemana.getDate() + 7);
    detalleDiv.innerHTML = ''; // <-- limpiar ejercicios
    renderDias();
  });

  renderDias();

  // 👉 Otras tarjetas del dashboard
  [{ titulo: 'Ejercicios completados', valor: 0 },
   { titulo: 'Objetivos alcanzados', valor: 0 }]
   .forEach(t => {
     const card = document.createElement('div');
     card.className = 'dashboard-card';
     card.innerHTML = `<h3>${t.titulo}</h3><p>${t.valor}</p>`;
     dashboard.appendChild(card);
   });

  contenido.appendChild(dashboard);

  // Mostrar índices extra si existen
  datos.filter(item => !['Entrenamiento','Seguimiento','Calendario'].includes(item.nombre))
       .forEach((item, index) => {
         const div = crearIndice(item, index, { hijos: datos });
         div.addEventListener('click', () => { rutaActual.push(index); });
         contenido.appendChild(div);
       });
}
