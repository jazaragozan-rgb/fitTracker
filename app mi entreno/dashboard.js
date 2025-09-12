// dashboard.js
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
  card.innerHTML = `<h3>Entrenamientos realizados</h3>`;

  const daysRow = document.createElement('div');
  daysRow.className = 'days-row';

  // Obtener fechas de sesiones (nivel 3)
  const sesiones = [];
  datos[0]?.hijos?.forEach(meso => {
    meso.hijos?.forEach(micro => {
      micro.hijos?.forEach(sesion => {
        if (sesion.fecha) {
          sesiones.push({
            fecha: sesion.fecha,
            ejercicios: sesion.hijos || []
          });
        }
      });
    });
  });

  // Fechas de esta semana
  const hoy = new Date();
  const primerDiaSemana = new Date(hoy);
  primerDiaSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo = 0

  const dias = ["D","L","M","X","J","V","S"];
  let detalleDiv = document.createElement('div');
  detalleDiv.className = "detalle-dia";

  for (let i = 0; i < 7; i++) {
    const fechaDia = new Date(primerDiaSemana);
    fechaDia.setDate(primerDiaSemana.getDate() + i);

    const fechaStr = fechaDia.toISOString().split("T")[0]; // yyyy-mm-dd
    const sesionDia = sesiones.find(s => s.fecha === fechaStr);

    const btn = document.createElement('button');
    btn.textContent = dias[i];
    btn.className = 'day-btn';
    if (sesionDia) btn.classList.add('done'); // marcar si entrenó

    btn.addEventListener('click', () => {
      detalleDiv.innerHTML = "";
      if (sesionDia) {
        const titulo = document.createElement('h4');
        titulo.textContent = `Ejercicios de ${fechaStr}`;
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

    daysRow.appendChild(btn);
  }

  card.appendChild(daysRow);
  card.appendChild(detalleDiv);
  dashboard.appendChild(card);

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
