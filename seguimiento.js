// seguimiento.js
// Sistema de seguimiento corporal con múltiples métricas y visualizaciones

export function renderizarSeguimiento(nivel, contenido, subHeader, addButton) {
  // Limpiar subheader
  subHeader.innerHTML = '';
  
  // Título
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Seguimiento Corporal';
  h2Nivel.style.display = '';
  subHeader.appendChild(h2Nivel);
  
  // Contenedor de botones
  const botonesContainer = document.createElement('div');
  botonesContainer.id = 'subHeaderButtons';
  botonesContainer.style.display = 'flex';
  botonesContainer.style.justifyContent = 'center';
  
  // Botón añadir
  const btnAdd = document.createElement('button');
  btnAdd.className = 'header-btn';
  btnAdd.textContent = '+ Añadir';
  btnAdd.title = 'Añadir medidas';
  btnAdd.style.fontSize = '0.813rem';
  btnAdd.style.fontWeight = 'bold';
  btnAdd.onclick = () => mostrarModalMedidas(nivel, contenido);
  botonesContainer.appendChild(btnAdd);
  
  subHeader.appendChild(botonesContainer);

  // Contenido principal
  contenido.innerHTML = '';
  contenido.style.padding = '0';
  contenido.style.paddingTop = '16px'; // Espacio superior para no taparse con subheader
  contenido.style.paddingBottom = '16px';
  contenido.style.paddingLeft = '12px';
  contenido.style.paddingRight = '12px';
  contenido.style.overflowY = 'auto';
  
  const medidas = nivel.hijos || [];

  // ==================== SECCIÓN: ÚLTIMA MEDICIÓN ====================
  if (medidas.length > 0) {
    const ultimaMedicion = medidas[medidas.length - 1];
    const ultimaMedicionCard = crearCardUltimaMedicion(ultimaMedicion);
    contenido.appendChild(ultimaMedicionCard);
  } else {
    const sinDatos = document.createElement('div');
    sinDatos.className = 'sin-datos-card';
    sinDatos.style.background = 'var(--bg-card)';
    sinDatos.style.padding = '40px 20px';
    sinDatos.style.margin = '12px 0';
    sinDatos.style.borderRadius = '12px';
    sinDatos.style.textAlign = 'center';
    sinDatos.style.boxShadow = 'var(--shadow-sm)';
    sinDatos.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;">📊</div>
      <h3 style="color: var(--text-secondary); margin-bottom: 8px;">Sin datos registrados</h3>
      <p style="color: var(--text-light); font-size: 0.9rem;">Pulsa "+ Añadir" para comenzar tu seguimiento</p>
    `;
    contenido.appendChild(sinDatos);
    return;
  }

  // ==================== SECCIÓN: RESUMEN DE PROGRESO ====================
  const resumenCard = crearCardResumenProgreso(medidas);
  contenido.appendChild(resumenCard);

  // ==================== SECCIÓN: GRÁFICOS PRINCIPALES ====================
  const graficosContainer = document.createElement('div');
  graficosContainer.style.display = 'grid';
  graficosContainer.style.gridTemplateColumns = '1fr';
  graficosContainer.style.gap = '12px';
  graficosContainer.style.marginTop = '12px';

  // Gráfico de Peso
  const graficoPeso = crearGraficoMetrica(medidas, 'peso', 'Peso', 'kg', '#3DD598');
  graficosContainer.appendChild(graficoPeso);

  // Gráfico de IMC
  const graficoIMC = crearGraficoIMC(medidas);
  graficosContainer.appendChild(graficoIMC);

  // Gráficos de Medidas (en grid de 2 columnas)
  const medidasGrid = document.createElement('div');
  medidasGrid.style.display = 'grid';
  medidasGrid.style.gridTemplateColumns = '1fr 1fr';
  medidasGrid.style.gap = '12px';
  
  const graficoBrazo = crearGraficoMetrica(medidas, 'brazo', 'Brazo', 'cm', '#00D4D4', true);
  const graficoCintura = crearGraficoMetrica(medidas, 'cintura', 'Cintura', 'cm', '#FF6B6B', true);
  
  medidasGrid.appendChild(graficoBrazo);
  medidasGrid.appendChild(graficoCintura);
  
  graficosContainer.appendChild(medidasGrid);

  contenido.appendChild(graficosContainer);

  // ==================== SECCIÓN: HISTORIAL ====================
  const historialSection = crearSeccionHistorial(medidas, nivel, contenido);
  contenido.appendChild(historialSection);
}

// ==================== CARD: ÚLTIMA MEDICIÓN ====================
function crearCardUltimaMedicion(medicion) {
  const card = document.createElement('div');
  card.className = 'ultima-medicion-card';
  card.style.background = 'linear-gradient(135deg, var(--primary-mint) 0%, var(--mint-light) 100%)';
  card.style.padding = '20px';
  card.style.margin = '0 0 12px 0';
  card.style.borderRadius = '16px';
  card.style.boxShadow = 'var(--shadow-md)';
  card.style.color = '#fff';

  const fecha = new Date(medicion.fecha);
  const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Última medición</div>
        <div style="font-size: 0.85rem; opacity: 0.95; font-weight: 500;">${fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)}</div>
      </div>
      <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
        📏
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Peso</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${medicion.peso || '--'} <span style="font-size: 0.9rem; font-weight: 500;">kg</span></div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Altura</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${medicion.altura || '--'} <span style="font-size: 0.9rem; font-weight: 500;">cm</span></div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Brazo</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${medicion.brazo || '--'} <span style="font-size: 0.9rem; font-weight: 500;">cm</span></div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Cintura</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${medicion.cintura || '--'} <span style="font-size: 0.9rem; font-weight: 500;">cm</span></div>
      </div>
    </div>
  `;

  return card;
}

// ==================== CARD: RESUMEN DE PROGRESO ====================
function crearCardResumenProgreso(medidas) {
  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.padding = '16px';
  card.style.margin = '12px 0';
  card.style.borderRadius = '12px';
  card.style.boxShadow = 'var(--shadow-sm)';

  const titulo = document.createElement('h3');
  titulo.textContent = 'Progreso General';
  titulo.style.fontSize = '1rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-secondary)';
  titulo.style.marginBottom = '16px';
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '0.5px';
  card.appendChild(titulo);

  const statsGrid = document.createElement('div');
  statsGrid.style.display = 'grid';
  statsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  statsGrid.style.gap = '12px';

  // Calcular cambios
  if (medidas.length >= 2) {
    const primera = medidas[0];
    const ultima = medidas[medidas.length - 1];

    const cambios = [
      {
        label: 'Peso',
        inicial: parseFloat(primera.peso) || 0,
        final: parseFloat(ultima.peso) || 0,
        unidad: 'kg',
        icon: '⚖️',
        inverso: true // menor es mejor
      },
      {
        label: 'Brazo',
        inicial: parseFloat(primera.brazo) || 0,
        final: parseFloat(ultima.brazo) || 0,
        unidad: 'cm',
        icon: '💪'
      },
      {
        label: 'Cintura',
        inicial: parseFloat(primera.cintura) || 0,
        final: parseFloat(ultima.cintura) || 0,
        unidad: 'cm',
        icon: '📏',
        inverso: true
      },
      {
        label: 'Mediciones',
        inicial: 0,
        final: medidas.length,
        unidad: 'registros',
        icon: '📊',
        sinCambio: true
      }
    ];

    cambios.forEach(cambio => {
      const statDiv = document.createElement('div');
      statDiv.style.background = 'var(--bg-main)';
      statDiv.style.padding = '12px';
      statDiv.style.borderRadius = '10px';
      statDiv.style.textAlign = 'center';

      const diferencia = cambio.final - cambio.inicial;
      const porcentaje = cambio.inicial !== 0 ? ((diferencia / cambio.inicial) * 100) : 0;
      
      let colorCambio = 'var(--text-secondary)';
      let iconoCambio = '';
      
      if (!cambio.sinCambio) {
        if (cambio.inverso) {
          if (diferencia < 0) {
            colorCambio = 'var(--success)';
            iconoCambio = '↓';
          } else if (diferencia > 0) {
            colorCambio = 'var(--danger)';
            iconoCambio = '↑';
          }
        } else {
          if (diferencia > 0) {
            colorCambio = 'var(--success)';
            iconoCambio = '↑';
          } else if (diferencia < 0) {
            colorCambio = 'var(--danger)';
            iconoCambio = '↓';
          }
        }
      }

      statDiv.innerHTML = `
        <div style="font-size: 1.5rem; margin-bottom: 4px;">${cambio.icon}</div>
        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px; font-weight: 600;">${cambio.label}</div>
        <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
          ${cambio.final.toFixed(cambio.label === 'Mediciones' ? 0 : 1)} ${cambio.unidad}
        </div>
        ${!cambio.sinCambio ? `
          <div style="font-size: 0.75rem; color: ${colorCambio}; font-weight: 600;">
            ${iconoCambio} ${Math.abs(diferencia).toFixed(1)} ${cambio.unidad} (${Math.abs(porcentaje).toFixed(1)}%)
          </div>
        ` : ''}
      `;

      statsGrid.appendChild(statDiv);
    });
  } else {
    const mensaje = document.createElement('div');
    mensaje.style.textAlign = 'center';
    mensaje.style.padding = '20px';
    mensaje.style.color = 'var(--text-light)';
    mensaje.textContent = 'Necesitas al menos 2 mediciones para ver el progreso';
    statsGrid.appendChild(mensaje);
  }

  card.appendChild(statsGrid);
  return card;
}

// ==================== GRÁFICO: MÉTRICA INDIVIDUAL ====================
function crearGraficoMetrica(medidas, campo, titulo, unidad, color, compacto = false) {
  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.padding = compacto ? '12px' : '16px';
  card.style.borderRadius = '12px';
  card.style.boxShadow = 'var(--shadow-sm)';

  const header = document.createElement('h3');
  header.textContent = titulo;
  header.style.fontSize = compacto ? '0.85rem' : '0.95rem';
  header.style.fontWeight = '700';
  header.style.color = 'var(--text-secondary)';
  header.style.marginBottom = '12px';
  header.style.textTransform = 'uppercase';
  header.style.letterSpacing = '0.5px';
  card.appendChild(header);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.width = '100%';
  canvasWrapper.style.height = compacto ? '120px' : '180px';
  canvasWrapper.style.position = 'relative';
  
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  
  canvasWrapper.appendChild(canvas);
  card.appendChild(canvasWrapper);

  const datos = medidas
    .filter(m => m[campo])
    .map(m => ({
      x: new Date(m.fecha),
      y: parseFloat(m[campo])
    }))
    .sort((a, b) => a.x - b.x);

  if (datos.length === 0) {
    const sinDatos = document.createElement('div');
    sinDatos.style.textAlign = 'center';
    sinDatos.style.padding = '20px';
    sinDatos.style.color = 'var(--text-light)';
    sinDatos.style.fontSize = '0.85rem';
    sinDatos.textContent = 'Sin datos registrados';
    card.replaceChild(sinDatos, canvasWrapper);
    return card;
  }

  setTimeout(() => {
    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: `${titulo} (${unidad})`,
            data: datos,
            borderColor: color,
            backgroundColor: color + '20',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: color,
            pointBorderWidth: 2,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 14 },
              callbacks: {
                title: function(context) {
                  const fecha = new Date(context[0].parsed.x);
                  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                },
                label: function(context) {
                  return `${context.parsed.y.toFixed(1)} ${unidad}`;
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
              grid: { display: false },
              ticks: {
                font: { size: 10 },
                color: 'var(--text-secondary)'
              }
            },
            y: {
              beginAtZero: false,
              grid: {
                color: 'rgba(0,0,0,0.05)',
                drawBorder: false
              },
              ticks: {
                font: { size: 10 },
                color: 'var(--text-secondary)',
                callback: function(value) {
                  return value.toFixed(0) + ' ' + unidad;
                }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    }
  }, 100);

  return card;
}

// ==================== GRÁFICO: IMC ====================
function crearGraficoIMC(medidas) {
  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.padding = '16px';
  card.style.borderRadius = '12px';
  card.style.boxShadow = 'var(--shadow-sm)';

  const header = document.createElement('h3');
  header.textContent = 'Índice de Masa Corporal (IMC)';
  header.style.fontSize = '0.95rem';
  header.style.fontWeight = '700';
  header.style.color = 'var(--text-secondary)';
  header.style.marginBottom = '12px';
  header.style.textTransform = 'uppercase';
  header.style.letterSpacing = '0.5px';
  card.appendChild(header);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.width = '100%';
  canvasWrapper.style.height = '180px';
  canvasWrapper.style.position = 'relative';
  
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  
  canvasWrapper.appendChild(canvas);
  card.appendChild(canvasWrapper);

  // Calcular IMC para cada medida
  const datosIMC = medidas
    .filter(m => m.peso && m.altura)
    .map(m => {
      const pesoKg = parseFloat(m.peso);
      const alturaM = parseFloat(m.altura) / 100;
      const imc = pesoKg / (alturaM * alturaM);
      return {
        x: new Date(m.fecha),
        y: imc
      };
    })
    .sort((a, b) => a.x - b.x);

  if (datosIMC.length === 0) {
    const sinDatos = document.createElement('div');
    sinDatos.style.textAlign = 'center';
    sinDatos.style.padding = '20px';
    sinDatos.style.color = 'var(--text-light)';
    sinDatos.style.fontSize = '0.85rem';
    sinDatos.textContent = 'Necesitas registrar peso y altura';
    card.replaceChild(sinDatos, canvasWrapper);
    return card;
  }

  // Mostrar IMC actual
  const imcActual = datosIMC[datosIMC.length - 1].y;
  let categoria = '';
  let colorCategoria = '';
  
  if (imcActual < 18.5) {
    categoria = 'Bajo peso';
    colorCategoria = '#00D4D4';
  } else if (imcActual < 25) {
    categoria = 'Peso normal';
    colorCategoria = '#3DD598';
  } else if (imcActual < 30) {
    categoria = 'Sobrepeso';
    colorCategoria = '#FFA500';
  } else {
    categoria = 'Obesidad';
    colorCategoria = '#FF6B6B';
  }

  const imcInfo = document.createElement('div');
  imcInfo.style.display = 'flex';
  imcInfo.style.justifyContent = 'space-between';
  imcInfo.style.alignItems = 'center';
  imcInfo.style.marginBottom = '12px';
  imcInfo.style.padding = '12px';
  imcInfo.style.background = 'var(--bg-main)';
  imcInfo.style.borderRadius = '8px';
  imcInfo.innerHTML = `
    <div>
      <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">IMC Actual</div>
      <div style="font-size: 1.5rem; font-weight: 700; color: ${colorCategoria};">${imcActual.toFixed(1)}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">Categoría</div>
      <div style="font-size: 0.9rem; font-weight: 700; color: ${colorCategoria};">${categoria}</div>
    </div>
  `;
  card.insertBefore(imcInfo, canvasWrapper);

  setTimeout(() => {
    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: 'IMC',
            data: datosIMC,
            borderColor: colorCategoria,
            backgroundColor: colorCategoria + '20',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: colorCategoria,
            pointBorderWidth: 2,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 14 },
              callbacks: {
                title: function(context) {
                  const fecha = new Date(context[0].parsed.x);
                  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                },
                label: function(context) {
                  return `IMC: ${context.parsed.y.toFixed(1)}`;
                }
              }
            },
            annotation: {
              annotations: {
                bajoPeso: {
                  type: 'line',
                  yMin: 18.5,
                  yMax: 18.5,
                  borderColor: '#00D4D4',
                  borderWidth: 1,
                  borderDash: [5, 5],
                  label: {
                    content: 'Bajo peso',
                    enabled: false
                  }
                },
                normal: {
                  type: 'line',
                  yMin: 25,
                  yMax: 25,
                  borderColor: '#FFA500',
                  borderWidth: 1,
                  borderDash: [5, 5],
                  label: {
                    content: 'Sobrepeso',
                    enabled: false
                  }
                },
                obesidad: {
                  type: 'line',
                  yMin: 30,
                  yMax: 30,
                  borderColor: '#FF6B6B',
                  borderWidth: 1,
                  borderDash: [5, 5],
                  label: {
                    content: 'Obesidad',
                    enabled: false
                  }
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
              grid: { display: false },
              ticks: {
                font: { size: 10 },
                color: 'var(--text-secondary)'
              }
            },
            y: {
              min: 15,
              max: 35,
              grid: {
                color: 'rgba(0,0,0,0.05)',
                drawBorder: false
              },
              ticks: {
                font: { size: 10 },
                color: 'var(--text-secondary)'
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    }
  }, 100);

  return card;
}

// ==================== SECCIÓN: HISTORIAL ====================
function crearSeccionHistorial(medidas, nivel, contenido) {
  const section = document.createElement('div');
  section.style.marginTop = '24px';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '12px';

  const titulo = document.createElement('h3');
  titulo.textContent = 'Historial';
  titulo.style.fontSize = '1rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-secondary)';
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '0.5px';
  header.appendChild(titulo);

  const contador = document.createElement('div');
  contador.style.background = 'var(--bg-main)';
  contador.style.padding = '4px 12px';
  contador.style.borderRadius = '20px';
  contador.style.fontSize = '0.75rem';
  contador.style.fontWeight = '600';
  contador.style.color = 'var(--text-secondary)';
  contador.textContent = `${medidas.length} ${medidas.length === 1 ? 'registro' : 'registros'}`;
  header.appendChild(contador);

  section.appendChild(header);

  // Lista de mediciones (últimas 10)
  const listaMediciones = medidas.slice().reverse().slice(0, 10);
  
  listaMediciones.forEach((medicion, idx) => {
    const item = crearItemHistorial(medicion, medidas.length - idx - 1, nivel, contenido);
    section.appendChild(item);
  });

  if (medidas.length > 10) {
    const verMas = document.createElement('button');
    verMas.textContent = `Ver todas (${medidas.length - 10} más)`;
    verMas.style.width = '100%';
    verMas.style.padding = '12px';
    verMas.style.marginTop = '8px';
    verMas.style.background = 'var(--bg-main)';
    verMas.style.border = 'none';
    verMas.style.borderRadius = '8px';
    verMas.style.fontSize = '0.85rem';
    verMas.style.fontWeight = '600';
    verMas.style.color = 'var(--text-secondary)';
    verMas.style.cursor = 'pointer';
    verMas.onclick = () => {
      // TODO: Implementar vista expandida del historial
      alert('Funcionalidad en desarrollo');
    };
    section.appendChild(verMas);
  }

  return section;
}

// ==================== ITEM: HISTORIAL ====================
function crearItemHistorial(medicion, index, nivel, contenido) {
  const item = document.createElement('div');
  item.style.background = 'var(--bg-card)';
  item.style.padding = '12px';
  item.style.marginBottom = '8px';
  item.style.borderRadius = '10px';
  item.style.boxShadow = 'var(--shadow-sm)';
  item.style.display = 'flex';
  item.style.justifyContent = 'space-between';
  item.style.alignItems = 'center';
  item.style.transition = 'all 0.2s ease';

  const fecha = new Date(medicion.fecha);
  const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

  const infoDiv = document.createElement('div');
  infoDiv.style.flex = '1';
  infoDiv.innerHTML = `
    <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${fechaFormateada}</div>
    <div style="font-size: 0.75rem; color: var(--text-secondary); display: flex; gap: 12px; flex-wrap: wrap;">
      ${medicion.peso ? `<span>⚖️ ${medicion.peso} kg</span>` : ''}
      ${medicion.altura ? `<span>📏 ${medicion.altura} cm</span>` : ''}
      ${medicion.brazo ? `<span>💪 ${medicion.brazo} cm</span>` : ''}
      ${medicion.cintura ? `<span>⭕ ${medicion.cintura} cm</span>` : ''}
    </div>
  `;

  const btnEliminar = document.createElement('button');
  btnEliminar.textContent = '🗑️';
  btnEliminar.style.background = 'transparent';
  btnEliminar.style.border = 'none';
  btnEliminar.style.fontSize = '1.1rem';
  btnEliminar.style.cursor = 'pointer';
  btnEliminar.style.padding = '8px';
  btnEliminar.style.borderRadius = '6px';
  btnEliminar.style.transition = 'all 0.2s ease';
  btnEliminar.onclick = (e) => {
    e.stopPropagation();
    if (confirm('¿Desea eliminar esta medición?')) {
      nivel.hijos.splice(index, 1);
      if (typeof window.guardarDatos === 'function') window.guardarDatos();
      if (typeof window.renderizar === 'function') window.renderizar();
    }
  };

  btnEliminar.addEventListener('mouseenter', () => {
    btnEliminar.style.background = 'var(--bg-main)';
  });

  btnEliminar.addEventListener('mouseleave', () => {
    btnEliminar.style.background = 'transparent';
  });

  item.appendChild(infoDiv);
  item.appendChild(btnEliminar);

  item.addEventListener('mouseenter', () => {
    item.style.boxShadow = 'var(--shadow-md)';
    item.style.transform = 'translateY(-1px)';
  });

  item.addEventListener('mouseleave', () => {
    item.style.boxShadow = 'var(--shadow-sm)';
    item.style.transform = 'translateY(0)';
  });

  return item;
}

// ==================== MODAL: AÑADIR MEDIDAS ====================
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
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';
  modal.style.backdropFilter = 'blur(4px)';

  const caja = document.createElement('div');
  caja.style.background = '#fff';
  caja.style.padding = '24px';
  caja.style.borderRadius = '16px';
  caja.style.display = 'flex';
  caja.style.flexDirection = 'column';
  caja.style.gap = '16px';
  caja.style.maxWidth = '90%';
  caja.style.width = '400px';
  caja.style.boxShadow = 'var(--shadow-lg)';

  const titulo = document.createElement('h3');
  titulo.textContent = 'Añadir Medidas';
  titulo.style.fontSize = '1.3rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-primary)';
  titulo.style.marginBottom = '8px';
  caja.appendChild(titulo);

  // Fecha
  const fechaLabel = document.createElement('label');
  fechaLabel.textContent = 'Fecha';
  fechaLabel.style.fontSize = '0.85rem';
  fechaLabel.style.fontWeight = '600';
  fechaLabel.style.color = 'var(--text-secondary)';
  fechaLabel.style.marginBottom = '-8px';
  const fecha = document.createElement('input');
  fecha.type = 'date';
  fecha.value = new Date().toISOString().slice(0, 10);
  fecha.style.width = '100%';
  fecha.style.padding = '12px';
  fecha.style.border = '1px solid var(--border-color)';
  fecha.style.borderRadius = '8px';
  fecha.style.fontSize = '1rem';
  caja.appendChild(fechaLabel);
  caja.appendChild(fecha);

  // Grid de inputs
  const inputsGrid = document.createElement('div');
  inputsGrid.style.display = 'grid';
  inputsGrid.style.gridTemplateColumns = '1fr 1fr';
  inputsGrid.style.gap = '12px';

  const campos = [
    { id: 'peso', label: 'Peso', unidad: 'kg', icon: '⚖️' },
    { id: 'altura', label: 'Altura', unidad: 'cm', icon: '📏' },
    { id: 'brazo', label: 'Brazo', unidad: 'cm', icon: '💪' },
    { id: 'cintura', label: 'Cintura', unidad: 'cm', icon: '⭕' }
  ];

  const inputs = {};

  campos.forEach(campo => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';

    const label = document.createElement('label');
    label.textContent = `${campo.icon} ${campo.label}`;
    label.style.fontSize = '0.85rem';
    label.style.fontWeight = '600';
    label.style.color = 'var(--text-secondary)';

    const inputWrapper = document.createElement('div');
    inputWrapper.style.position = 'relative';

    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = '0.0';
    input.min = '0';
    input.step = '0.1';
    input.style.width = '100%';
    input.style.padding = '12px';
    input.style.paddingRight = '45px';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = '8px';
    input.style.fontSize = '1rem';
    inputs[campo.id] = input;

    const unidad = document.createElement('span');
    unidad.textContent = campo.unidad;
    unidad.style.position = 'absolute';
    unidad.style.right = '12px';
    unidad.style.top = '50%';
    unidad.style.transform = 'translateY(-50%)';
    unidad.style.fontSize = '0.85rem';
    unidad.style.color = 'var(--text-secondary)';
    unidad.style.fontWeight = '600';

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(unidad);
    container.appendChild(label);
    container.appendChild(inputWrapper);
    inputsGrid.appendChild(container);
  });

  caja.appendChild(inputsGrid);

  // Botones
  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '12px';
  botones.style.marginTop = '8px';

  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.flex = '1';
  btnCancelar.style.padding = '12px';
  btnCancelar.style.background = 'var(--bg-main)';
  btnCancelar.style.color = 'var(--text-secondary)';
  btnCancelar.style.border = 'none';
  btnCancelar.style.borderRadius = '8px';
  btnCancelar.style.fontSize = '0.95rem';
  btnCancelar.style.fontWeight = '700';
  btnCancelar.style.cursor = 'pointer';
  btnCancelar.onclick = () => modal.remove();

  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = 'Guardar';
  btnGuardar.style.flex = '1';
  btnGuardar.style.padding = '12px';
  btnGuardar.style.background = 'var(--primary-mint)';
  btnGuardar.style.color = 'white';
  btnGuardar.style.border = 'none';
  btnGuardar.style.borderRadius = '8px';
  btnGuardar.style.fontSize = '0.95rem';
  btnGuardar.style.fontWeight = '700';
  btnGuardar.style.cursor = 'pointer';
  btnGuardar.onclick = () => {
    const nuevaMedida = {
      fecha: fecha.value,
      peso: inputs.peso.value,
      altura: inputs.altura.value,
      brazo: inputs.brazo.value,
      cintura: inputs.cintura.value
    };
    
    nivel.hijos = nivel.hijos || [];
    nivel.hijos.push(nuevaMedida);
    
    if (typeof window.guardarDatos === 'function') window.guardarDatos();
    modal.remove();
    if (typeof window.renderizar === 'function') window.renderizar();
  };

  botones.appendChild(btnCancelar);
  botones.appendChild(btnGuardar);
  caja.appendChild(botones);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}