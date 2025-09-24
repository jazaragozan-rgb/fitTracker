// seguimiento.js
// Renderizado y modal para medidas corporales

export function renderizarSeguimiento(nivel, contenido, subHeader, addButton) {
  // Subheader: solo mostrar botón añadir
  subHeader.innerHTML = '';
  // Título primero
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Seguimiento corporal';
  h2Nivel.style.display = '';
  subHeader.appendChild(h2Nivel);
  // Botón añadir debajo
  const btnAdd = document.createElement('button');
  btnAdd.className = 'header-btn';
  btnAdd.textContent = '+ Añadir';
  btnAdd.title = 'Añadir medidas';
  btnAdd.style.fontSize = '1.5rem';
  btnAdd.style.fontWeight = 'bold';
  btnAdd.onclick = () => mostrarModalMedidas(nivel, contenido);
  subHeader.appendChild(btnAdd);

  // Listado histórico de medidas
  contenido.innerHTML = '';
  const medidas = nivel.hijos || [];
  // Caja de últimos datos
  const boxUltimos = document.createElement('div');
  boxUltimos.className = 'seguimiento-card';
  boxUltimos.style.background = '#fff';
  boxUltimos.style.padding = '16px';
  boxUltimos.style.margin = '12px auto';
  boxUltimos.style.borderRadius = '10px';
  boxUltimos.style.boxShadow = '0px 2px 10px #b6b6b6';
  boxUltimos.style.width = '94%';
  boxUltimos.style.textAlign = 'center';
  if (medidas.length > 0) {
    const ultima = medidas[medidas.length-1];
    boxUltimos.innerHTML = `<h3>Últimos datos</h3>
      <b>${ultima.fecha}</b><br>
      Peso: ${ultima.peso} kg<br>
      Altura: ${ultima.altura} cm<br>
      Brazo: ${ultima.brazo} cm<br>
      Cintura: ${ultima.cintura} cm`;
  } else {
    boxUltimos.innerHTML = '<h3>Últimos datos</h3><p>No hay datos registrados.</p>';
  }
  contenido.appendChild(boxUltimos);

  // Caja para el gráfico
  const boxGrafico = document.createElement('div');
  boxGrafico.className = 'seguimiento-card';
  boxGrafico.style.background = '#fff';
  boxGrafico.style.padding = '16px';
  boxGrafico.style.margin = '12px auto';
  boxGrafico.style.borderRadius = '10px';
  boxGrafico.style.boxShadow = '0px 2px 10px #b6b6b6';
  boxGrafico.style.width = '94%';
  boxGrafico.style.textAlign = 'center';
  boxGrafico.innerHTML = `<h3>Evolución de medidas</h3><canvas id="seguimientoChart" style="width:100%;height:200px;"></canvas>`;
  contenido.appendChild(boxGrafico);

  // Selector de medida
  const selector = document.createElement('select');
  ['peso','altura','brazo','cintura'].forEach(medida => {
    const opt = document.createElement('option');
    opt.value = medida;
    opt.textContent = medida.charAt(0).toUpperCase() + medida.slice(1);
    selector.appendChild(opt);
  });
  boxGrafico.insertBefore(selector, boxGrafico.firstChild);

  // Función para renderizar el gráfico
  function renderGrafico(tipoMedida) {
    const ctx = document.getElementById('seguimientoChart').getContext('2d');
    if (!ctx) return;
    if (boxGrafico.chartInstance) boxGrafico.chartInstance.destroy();
    const datosMedida = (medidas || []).filter(m => m[tipoMedida]).map(m => ({
      x: new Date(m.fecha),
      y: parseFloat(m[tipoMedida])
    })).sort((a,b) => a.x-b.x);
    boxGrafico.chartInstance = new window.Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: tipoMedida.charAt(0).toUpperCase() + tipoMedida.slice(1),
          data: datosMedida,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
          fill: true,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
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
            title: { display: true, text: 'Fecha' }
          },
          y: {
            title: { display: true, text: tipoMedida.charAt(0).toUpperCase() + tipoMedida.slice(1) }
          }
        }
      }
    });
  }
  selector.addEventListener('change', e => renderGrafico(e.target.value));
  // Render inicial
  renderGrafico('peso');
  // Eliminada la lista de medidas debajo del gráfico
}

export function mostrarModalMedidas(nivel, contenido) {
  let anterior = document.getElementById('modalMedidas');
  if (anterior) anterior.remove();
  const modal = document.createElement('div');
  modal.id = 'modalMedidas';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const caja = document.createElement('div');
  caja.style.background = '#fff';
  caja.style.padding = '2em';
  caja.style.borderRadius = '10px';
  caja.style.display = 'flex';
  caja.style.flexDirection = 'column';
  caja.style.alignItems = 'center';
  caja.style.gap = '1em';

  const titulo = document.createElement('h3');
  titulo.textContent = 'Añadir medidas corporales';
  caja.appendChild(titulo);

  // Inputs
  const fecha = document.createElement('input');
  fecha.type = 'date';
  fecha.value = new Date().toISOString().slice(0,10);
  caja.appendChild(fecha);
  const peso = document.createElement('input');
  peso.type = 'number'; peso.placeholder = 'Peso (kg)'; peso.min = '0'; peso.step = '0.1';
  caja.appendChild(peso);
  const altura = document.createElement('input');
  altura.type = 'number'; altura.placeholder = 'Altura (cm)'; altura.min = '0'; altura.step = '0.1';
  caja.appendChild(altura);
  const brazo = document.createElement('input');
  brazo.type = 'number'; brazo.placeholder = 'Brazo (cm)'; brazo.min = '0'; brazo.step = '0.1';
  caja.appendChild(brazo);
  const cintura = document.createElement('input');
  cintura.type = 'number'; cintura.placeholder = 'Cintura (cm)'; cintura.min = '0'; cintura.step = '0.1';
  caja.appendChild(cintura);

  // Botones
  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '1em';
  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = 'Guardar';
  btnGuardar.onclick = () => {
    const nuevaMedida = {
      fecha: fecha.value,
      peso: peso.value,
      altura: altura.value,
      brazo: brazo.value,
      cintura: cintura.value
    };
    nivel.hijos = nivel.hijos || [];
    nivel.hijos.push(nuevaMedida);
    // Guardar en localStorage y Firestore
    if (typeof window.guardarDatos === 'function') window.guardarDatos();
    modal.remove();
    // Actualizar la pantalla de seguimiento inmediatamente
    if (typeof window.renderizar === 'function') window.renderizar();
  };
  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.onclick = () => modal.remove();
  botones.appendChild(btnGuardar);
  botones.appendChild(btnCancelar);
  caja.appendChild(botones);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}
