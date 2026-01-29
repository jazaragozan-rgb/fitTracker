// nutricion.js
// Sistema completo de seguimiento nutricional con API de OpenFoodFacts

// ==================== RENDERIZADO PRINCIPAL ====================
export function renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual) {
  // Limpiar subheader
  subHeader.innerHTML = '';

  let nivelActivo = null;
  nivelActivo = nivel;
  
  // Título
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Nutrición';
  h2Nivel.style.display = '';
  subHeader.appendChild(h2Nivel);
  
  // Contenedor de botones
  const botonesContainer = document.createElement('div');
  botonesContainer.id = 'subHeaderButtons';
  botonesContainer.style.display = 'flex';
  botonesContainer.style.justifyContent = 'center';
  
  // Botón añadir comida
  const btnAdd = document.createElement('button');
  btnAdd.className = 'header-btn';
  btnAdd.textContent = '+ Añadir comida';
  btnAdd.title = 'Registrar alimentos';
  btnAdd.style.fontSize = '0.813rem';
  btnAdd.style.fontWeight = 'bold';
  btnAdd.onclick = () => mostrarBuscadorAlimentos(nivel, contenido);
  botonesContainer.appendChild(btnAdd);
  
  subHeader.appendChild(botonesContainer);

  // Contenido principal
  contenido.innerHTML = '';
  contenido.style.padding = '0';
  contenido.style.paddingTop = '16px';
  contenido.style.paddingBottom = '16px';
  contenido.style.paddingLeft = '12px';
  contenido.style.paddingRight = '12px';
  contenido.style.overflowY = 'auto';
  
  // Obtener registros de hoy
  const hoy = new Date().toISOString().split('T')[0];
  const registrosHoy = (nivel.hijos || []).filter(r => r.fecha === hoy);
  
  // ==================== RESUMEN DEL DÍA ====================
  const resumenCard = crearResumenDiario(registrosHoy);
  contenido.appendChild(resumenCard);
  
  // ==================== SELECTOR DE FECHA ====================
  const selectorFecha = crearSelectorFecha(nivel, contenido);
  contenido.appendChild(selectorFecha);
  
  // ==================== COMIDAS DEL DÍA ====================
  const comidasCard = crearComidasDelDia(registrosHoy, nivel, contenido);
  contenido.appendChild(comidasCard);
  
  // ==================== GRÁFICOS DE MACROS ====================
  const graficosContainer = document.createElement('div');
  graficosContainer.style.display = 'grid';
  graficosContainer.style.gridTemplateColumns = '1fr';
  graficosContainer.style.gap = '12px';
  graficosContainer.style.marginTop = '12px';
  
  // Gráfico de macros del día
  const graficoMacros = crearGraficoMacros(registrosHoy);
  graficosContainer.appendChild(graficoMacros);
  
  // Gráfico de calorías semanales
  const graficoSemanal = crearGraficoSemanal(nivel.hijos || []);
  graficosContainer.appendChild(graficoSemanal);
  
  contenido.appendChild(graficosContainer);
  
  // ==================== HISTORIAL ====================
  const historialSection = crearHistorial(nivel.hijos || [], nivel, contenido);
  contenido.appendChild(historialSection);
}

// ==================== RESUMEN DIARIO ====================
function crearResumenDiario(registros) {
  const card = document.createElement('div');
  card.style.background = 'linear-gradient(135deg, var(--primary-mint) 0%, var(--mint-light) 100%)';
  card.style.padding = '20px';
  card.style.margin = '0 0 12px 0';
  card.style.borderRadius = '16px';
  card.style.boxShadow = 'var(--shadow-md)';
  card.style.color = '#fff';
  
  // Calcular totales
  const totales = calcularTotales(registros);
  
  const hoy = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Resumen de hoy</div>
        <div style="font-size: 0.85rem; opacity: 0.95; font-weight: 500;">${hoy.charAt(0).toUpperCase() + hoy.slice(1)}</div>
      </div>
      <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
        🍽️
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Calorías</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${totales.calorias.toFixed(0)} <span style="font-size: 0.9rem; font-weight: 500;">kcal</span></div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Comidas</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${registros.length}</div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Proteínas</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${totales.proteinas.toFixed(0)} <span style="font-size: 0.9rem; font-weight: 500;">g</span></div>
      </div>
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; backdrop-filter: blur(10px);">
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Carbohidratos</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${totales.carbohidratos.toFixed(0)} <span style="font-size: 0.9rem; font-weight: 500;">g</span></div>
      </div>
    </div>
  `;
  
  return card;
}

// ==================== CALCULAR TOTALES ====================
function calcularTotales(registros) {
  return registros.reduce((acc, registro) => {
    acc.calorias += registro.calorias || 0;
    acc.proteinas += registro.proteinas || 0;
    acc.carbohidratos += registro.carbohidratos || 0;
    acc.grasas += registro.grasas || 0;
    return acc;
  }, { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });
}

// ==================== SELECTOR DE FECHA ====================
function crearSelectorFecha(nivel, contenido) {
  const container = document.createElement('div');
  container.style.background = 'var(--bg-card)';
  container.style.padding = '12px';
  container.style.margin = '12px 0';
  container.style.borderRadius = '12px';
  container.style.boxShadow = 'var(--shadow-sm)';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '12px';
  
  const label = document.createElement('label');
  label.textContent = 'Ver fecha:';
  label.style.fontSize = '0.9rem';
  label.style.fontWeight = '600';
  label.style.color = 'var(--text-secondary)';
  
  const input = document.createElement('input');
  input.type = 'date';
  input.value = new Date().toISOString().split('T')[0];
  input.style.flex = '1';
  input.style.padding = '8px 12px';
  input.style.border = '1px solid var(--border-color)';
  input.style.borderRadius = '8px';
  input.style.fontSize = '0.9rem';
  input.style.fontWeight = '600';
  input.style.color = 'var(--primary-mint)';
  
  input.addEventListener('change', () => {
    // Actualizar vista con la fecha seleccionada
    renderizarNutricion(nivel, contenido, document.getElementById('subHeader'), null);
  });
  
  container.appendChild(label);
  container.appendChild(input);
  
  return container;
}

// ==================== COMIDAS DEL DÍA ====================
function crearComidasDelDia(registros, nivel, contenido) {
  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.padding = '16px';
  card.style.margin = '12px 0';
  card.style.borderRadius = '12px';
  card.style.boxShadow = 'var(--shadow-sm)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Comidas de hoy';
  titulo.style.fontSize = '1rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-secondary)';
  titulo.style.marginBottom = '16px';
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '0.5px';
  card.appendChild(titulo);
  
  if (registros.length === 0) {
    const sinDatos = document.createElement('div');
    sinDatos.style.textAlign = 'center';
    sinDatos.style.padding = '40px 20px';
    sinDatos.style.color = 'var(--text-light)';
    sinDatos.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;">🍴</div>
      <div>No has registrado comidas hoy</div>
      <div style="font-size: 0.85rem; margin-top: 8px;">Pulsa "+ Añadir comida" para comenzar</div>
    `;
    card.appendChild(sinDatos);
  } else {
    registros.forEach((registro, index) => {
      const item = crearItemComida(registro, index, nivel, contenido);
      card.appendChild(item);
    });
  }
  
  return card;
}

// ==================== ITEM COMIDA ====================
function crearItemComida(registro, index, nivel, contenido) {
  const item = document.createElement('div');
  item.style.background = 'var(--bg-main)';
  item.style.padding = '12px';
  item.style.marginBottom = '8px';
  item.style.borderRadius = '10px';
  item.style.display = 'flex';
  item.style.justifyContent = 'space-between';
  item.style.alignItems = 'center';
  item.style.transition = 'all 0.2s ease';
  item.style.border = '1px solid transparent';
  
  const info = document.createElement('div');
  info.style.flex = '1';
  
  const nombre = document.createElement('div');
  nombre.textContent = registro.nombre;
  nombre.style.fontWeight = '700';
  nombre.style.color = 'var(--text-primary)';
  nombre.style.marginBottom = '4px';
  
  const detalles = document.createElement('div');
  detalles.style.fontSize = '0.75rem';
  detalles.style.color = 'var(--text-secondary)';
  detalles.style.display = 'flex';
  detalles.style.gap = '8px';
  detalles.innerHTML = `
    <span>🔥 ${registro.calorias.toFixed(0)} kcal</span>
    <span>💪 ${registro.proteinas.toFixed(0)}g</span>
    <span>🍞 ${registro.carbohidratos.toFixed(0)}g</span>
    <span>🥑 ${registro.grasas.toFixed(0)}g</span>
  `;
  
  info.appendChild(nombre);
  info.appendChild(detalles);
  
  const cantidad = document.createElement('div');
  cantidad.textContent = `${registro.cantidad}g`;
  cantidad.style.fontSize = '0.9rem';
  cantidad.style.fontWeight = '600';
  cantidad.style.color = 'var(--primary-mint)';
  cantidad.style.marginRight = '12px';
  
  const btnEliminar = document.createElement('button');
  btnEliminar.textContent = '🗑️';
  btnEliminar.style.background = 'transparent';
  btnEliminar.style.border = 'none';
  btnEliminar.style.fontSize = '1.1rem';
  btnEliminar.style.cursor = 'pointer';
  btnEliminar.style.padding = '8px';
  btnEliminar.style.borderRadius = '6px';
  btnEliminar.style.transition = 'all 0.2s ease';
  
  btnEliminar.onclick = () => {
    if (confirm(`¿Eliminar ${registro.nombre}?`)) {
      const hoy = new Date().toISOString().split('T')[0];
      nivel.hijos = (nivel.hijos || []).filter((r, i) => !(r.fecha === hoy && i === index));
      if (typeof window.guardarDatos === 'function') window.guardarDatos();
      renderizarNutricion(nivel, contenido, document.getElementById('subHeader'), null);
    }
  };
  
  btnEliminar.addEventListener('mouseenter', () => {
    btnEliminar.style.background = 'var(--bg-card)';
  });
  
  btnEliminar.addEventListener('mouseleave', () => {
    btnEliminar.style.background = 'transparent';
  });
  
  item.appendChild(info);
  item.appendChild(cantidad);
  item.appendChild(btnEliminar);
  
  item.addEventListener('mouseenter', () => {
    item.style.boxShadow = 'var(--shadow-sm)';
    item.style.borderColor = 'var(--border-color)';
  });
  
  item.addEventListener('mouseleave', () => {
    item.style.boxShadow = 'none';
    item.style.borderColor = 'transparent';
  });
  
  return item;
}

// ==================== GRÁFICO MACROS ====================
function crearGraficoMacros(registros) {
  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.padding = '16px';
  card.style.borderRadius = '12px';
  card.style.boxShadow = 'var(--shadow-sm)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Distribución de Macros';
  titulo.style.fontSize = '0.95rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-secondary)';
  titulo.style.marginBottom = '12px';
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '0.5px';
  card.appendChild(titulo);
  
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.width = '100%';
  canvasWrapper.style.height = '250px';
  canvasWrapper.style.position = 'relative';
  
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  
  canvasWrapper.appendChild(canvas);
  card.appendChild(canvasWrapper);
  
  const totales = calcularTotales(registros);
  
  if (registros.length === 0) {
    const sinDatos = document.createElement('div');
    sinDatos.style.textAlign = 'center';
    sinDatos.style.padding = '80px 20px';
    sinDatos.style.color = 'var(--text-light)';
    sinDatos.textContent = 'Registra alimentos para ver la distribución';
    card.replaceChild(sinDatos, canvasWrapper);
    return card;
  }
  
  setTimeout(() => {
    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Proteínas', 'Carbohidratos', 'Grasas'],
          datasets: [{
            data: [totales.proteinas, totales.carbohidratos, totales.grasas],
            backgroundColor: [
              'rgba(61, 213, 152, 0.8)',
              'rgba(0, 212, 212, 0.8)',
              'rgba(255, 107, 107, 0.8)'
            ],
            borderColor: [
              'rgb(61, 213, 152)',
              'rgb(0, 212, 212)',
              'rgb(255, 107, 107)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: { size: 12, weight: 'bold' }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: function(context) {
                  const valor = context.parsed;
                  const total = totales.proteinas + totales.carbohidratos + totales.grasas;
                  const porcentaje = ((valor / total) * 100).toFixed(1);
                  return `${context.label}: ${valor.toFixed(0)}g (${porcentaje}%)`;
                }
              }
            }
          }
        }
      });
    }
  }, 100);
  
  return card;
}

// ==================== GRÁFICO SEMANAL ====================
function crearGraficoSemanal(registros) {
  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.padding = '16px';
  card.style.borderRadius = '12px';
  card.style.boxShadow = 'var(--shadow-sm)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Calorías Últimos 7 Días';
  titulo.style.fontSize = '0.95rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-secondary)';
  titulo.style.marginBottom = '12px';
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '0.5px';
  card.appendChild(titulo);
  
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.width = '100%';
  canvasWrapper.style.height = '200px';
  canvasWrapper.style.position = 'relative';
  
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  
  canvasWrapper.appendChild(canvas);
  card.appendChild(canvasWrapper);
  
  // Calcular datos de los últimos 7 días
  const datos7Dias = [];
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const fechaStr = fecha.toISOString().split('T')[0];
    
    const registrosDia = registros.filter(r => r.fecha === fechaStr);
    const totales = calcularTotales(registrosDia);
    
    datos7Dias.push({
      fecha: fechaStr,
      calorias: totales.calorias,
      label: fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
    });
  }
  
  setTimeout(() => {
    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: datos7Dias.map(d => d.label),
          datasets: [{
            label: 'Calorías',
            data: datos7Dias.map(d => d.calorias),
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
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: {
                callback: function(value) {
                  return value + ' kcal';
                }
              }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }
  }, 100);
  
  return card;
}

// ==================== HISTORIAL ====================
function crearHistorial(registros, nivel, contenido) {
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
  contador.textContent = `${registros.length} ${registros.length === 1 ? 'registro' : 'registros'}`;
  header.appendChild(contador);
  
  section.appendChild(header);
  
  // Agrupar por fecha
  const registrosPorFecha = registros.reduce((acc, registro) => {
    if (!acc[registro.fecha]) {
      acc[registro.fecha] = [];
    }
    acc[registro.fecha].push(registro);
    return acc;
  }, {});
  
  // Ordenar fechas descendente
  const fechasOrdenadas = Object.keys(registrosPorFecha).sort((a, b) => b.localeCompare(a));
  
  // Mostrar últimos 7 días
  fechasOrdenadas.slice(0, 7).forEach(fecha => {
    const fechaObj = new Date(fecha + 'T00:00:00');
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { 
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    });
    
    const registrosFecha = registrosPorFecha[fecha];
    const totales = calcularTotales(registrosFecha);
    
    const diaCard = document.createElement('div');
    diaCard.style.background = 'var(--bg-card)';
    diaCard.style.padding = '12px';
    diaCard.style.marginBottom = '8px';
    diaCard.style.borderRadius = '10px';
    diaCard.style.boxShadow = 'var(--shadow-sm)';
    
    diaCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">
          ${fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">
          ${registrosFecha.length} ${registrosFecha.length === 1 ? 'comida' : 'comidas'}
        </div>
      </div>
      <div style="display: flex; gap: 12px; font-size: 0.75rem; color: var(--text-secondary);">
        <span>🔥 ${totales.calorias.toFixed(0)} kcal</span>
        <span>💪 ${totales.proteinas.toFixed(0)}g</span>
        <span>🍞 ${totales.carbohidratos.toFixed(0)}g</span>
        <span>🥑 ${totales.grasas.toFixed(0)}g</span>
      </div>
    `;
    
    section.appendChild(diaCard);
  });
  
  if (fechasOrdenadas.length > 7) {
    const verMas = document.createElement('button');
    verMas.textContent = `Ver todas (${fechasOrdenadas.length - 7} más)`;
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
    verMas.onclick = () => alert('Funcionalidad en desarrollo');
    section.appendChild(verMas);
  }
  
  return section;
}

// ==================== BUSCADOR DE ALIMENTOS ====================
export function mostrarBuscadorAlimentos(nivel, contenido) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.5)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.style.backdropFilter = 'blur(4px)';
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  const modal = document.createElement('div');
  modal.className = 'modal-ejercicios';
  modal.style.background = 'var(--bg-card)';
  modal.style.borderRadius = '16px';
  modal.style.width = '90%';
  modal.style.maxWidth = '500px';
  modal.style.maxHeight = '80vh';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.boxShadow = 'var(--shadow-lg)';
  modal.style.overflow = 'hidden';
  
  // Header
  const header = document.createElement('div');
  header.className = 'modal-ejercicios-header';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '20px';
  header.style.background = 'var(--primary-coral)';
  header.style.color = 'white';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Buscar Alimento';
  titulo.style.margin = '0';
  titulo.style.color = 'white';
  titulo.style.fontWeight = '700';
  titulo.style.fontSize = '1.125rem';
  titulo.style.letterSpacing = '-0.3px';
  titulo.style.textTransform = 'uppercase';
  
  const btnCerrar = document.createElement('button');
  btnCerrar.className = 'btn-cerrar-modal';
  btnCerrar.innerHTML = '✖';
  btnCerrar.style.background = 'rgba(255, 255, 255, 0.2)';
  btnCerrar.style.border = 'none';
  btnCerrar.style.fontSize = '1.3rem';
  btnCerrar.style.color = 'white';
  btnCerrar.style.cursor = 'pointer';
  btnCerrar.style.width = '40px';
  btnCerrar.style.height = '40px';
  btnCerrar.style.display = 'flex';
  btnCerrar.style.alignItems = 'center';
  btnCerrar.style.justifyContent = 'center';
  btnCerrar.style.borderRadius = '8px';
  btnCerrar.style.transition = 'all 0.2s ease';
  btnCerrar.onclick = () => overlay.remove();
  
  header.appendChild(titulo);
  header.appendChild(btnCerrar);
  
  // Contenedor de búsqueda (input + botón)
  const searchContainer = document.createElement('div');
  searchContainer.style.display = 'flex';
  searchContainer.style.gap = '8px';
  searchContainer.style.margin = '16px 20px';
  searchContainer.style.alignItems = 'center';
  
  // Input de búsqueda
  const input = document.createElement('input');
  input.className = 'input-buscar-ejercicio';
  input.placeholder = 'Buscar alimento (ej: pollo, arroz, manzana)...';
  input.type = 'text';
  input.style.flex = '1';
  input.style.margin = '0';
  input.style.padding = '12px 16px';
  input.style.border = '1px solid var(--border-color)';
  input.style.borderRadius = '8px';
  input.style.fontSize = '1rem';
  input.style.transition = 'all 0.2s ease';
  input.style.background = 'var(--bg-main)';
  
  // Botón buscar con lupa
  const btnBuscar = document.createElement('button');
  btnBuscar.innerHTML = '🔍';
  btnBuscar.style.width = '48px';
  btnBuscar.style.height = '48px';
  btnBuscar.style.background = 'var(--primary-mint)';
  btnBuscar.style.border = 'none';
  btnBuscar.style.borderRadius = '8px';
  btnBuscar.style.fontSize = '1.2rem';
  btnBuscar.style.cursor = 'pointer';
  btnBuscar.style.transition = 'all 0.2s ease';
  btnBuscar.style.flexShrink = '0';
  btnBuscar.style.display = 'flex';
  btnBuscar.style.alignItems = 'center';
  btnBuscar.style.justifyContent = 'center';
  
  btnBuscar.addEventListener('mouseenter', () => {
    btnBuscar.style.background = 'var(--mint-light)';
    btnBuscar.style.transform = 'scale(1.05)';
  });
  
  btnBuscar.addEventListener('mouseleave', () => {
    btnBuscar.style.background = 'var(--primary-mint)';
    btnBuscar.style.transform = 'scale(1)';
  });
  
  searchContainer.appendChild(input);
  searchContainer.appendChild(btnBuscar);
  
  // Lista de resultados
  const list = document.createElement('div');
  list.className = 'exercise-list';
  list.style.flex = '1';
  list.style.overflowY = 'auto';
  list.style.padding = '0 20px 20px 20px';
  list.style.maxHeight = 'calc(80vh - 180px)';
  
  // Mensaje inicial
  const mensajeInicial = document.createElement('div');
  mensajeInicial.className = 'exercise-mensaje';
  mensajeInicial.style.padding = '60px 20px';
  mensajeInicial.style.textAlign = 'center';
  mensajeInicial.style.color = 'var(--text-light)';
  mensajeInicial.innerHTML = '<p>🔍 Escribe y pulsa el botón para buscar...</p>';
  list.appendChild(mensajeInicial);
  
  // Evento de búsqueda al pulsar el botón
  const ejecutarBusqueda = () => {
    buscarAlimentos(input.value, list, nivel, contenido, overlay);
  };
  
  btnBuscar.addEventListener('click', ejecutarBusqueda);
  
  // También permitir buscar con Enter
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      ejecutarBusqueda();
    }
  });
  
  modal.appendChild(header);
  modal.appendChild(searchContainer);
  modal.appendChild(list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  setTimeout(() => input.focus(), 100);
}

// ==================== BUSCAR EN API ====================
async function buscarAlimentos(query, list, nivel, contenido, overlay) {
  if (!query || query.trim().length < 2) {
    list.innerHTML = '<div class="exercise-mensaje" style="padding: 60px 20px; text-align: center; color: var(--text-light);"><p>🔍 Escribe al menos 2 caracteres y pulsa buscar...</p></div>';
    return;
  }
  
  list.innerHTML = '<div class="exercise-mensaje" style="padding: 60px 20px; text-align: center; color: var(--text-light);"><p>⏳ Buscando...</p></div>';
  
  try {
    // API de OpenFoodFacts
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`);
    const data = await response.json();
    
    list.innerHTML = '';
    
    if (!data.products || data.products.length === 0) {
      list.innerHTML = '<div class="exercise-mensaje" style="padding: 60px 20px; text-align: center; color: var(--text-light);"><p>❌ No se encontraron alimentos</p></div>';
      return;
    }
    
    // Contador
    const contador = document.createElement('div');
    contador.className = 'exercise-counter';
    contador.textContent = `${data.products.length} resultado${data.products.length !== 1 ? 's' : ''}`;
    contador.style.padding = '0 20px 8px 20px';
    contador.style.fontSize = '0.813rem';
    contador.style.color = 'var(--text-secondary)';
    contador.style.textAlign = 'right';
    contador.style.fontWeight = '600';
    list.appendChild(contador);
    
    // Mostrar resultados
    data.products.forEach(producto => {
      const item = crearItemAlimento(producto, nivel, contenido, overlay);
      list.appendChild(item);
    });
    
  } catch (error) {
    console.error('Error buscando alimentos:', error);
    list.innerHTML = '<div class="exercise-mensaje" style="padding: 60px 20px; text-align: center; color: var(--text-light);"><p>❌ Error en la búsqueda. Intenta de nuevo.</p></div>';
  }
}

// ==================== ITEM ALIMENTO ====================
function crearItemAlimento(producto, nivel, contenido, overlay) {
  const item = document.createElement('div');
  item.className = 'exercise-item-card';
  item.style.display = 'flex';
  item.style.alignItems = 'center';
  item.style.gap = '12px';
  item.style.padding = '14px';
  item.style.margin = '8px 0';
  item.style.background = 'var(--bg-card)';
  item.style.border = '1px solid var(--border-color)';
  item.style.borderRadius = '12px';
  item.style.cursor = 'pointer';
  item.style.transition = 'all 0.2s ease';
  
  // Imagen del producto
  const imagen = document.createElement('div');
  imagen.style.width = '50px';
  imagen.style.height = '50px';
  imagen.style.borderRadius = '8px';
  imagen.style.overflow = 'hidden';
  imagen.style.flexShrink = '0';
  imagen.style.background = 'var(--bg-main)';
  imagen.style.display = 'flex';
  imagen.style.alignItems = 'center';
  imagen.style.justifyContent = 'center';
  
  if (producto.image_small_url) {
    const img = document.createElement('img');
    img.src = producto.image_small_url;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    imagen.appendChild(img);
  } else {
    imagen.textContent = '🍽️';
    imagen.style.fontSize = '1.5rem';
  }
  
  // Información del producto
  const info = document.createElement('div');
  info.style.flex = '1';
  info.style.minWidth = '0';
  
  const nombre = document.createElement('div');
  nombre.textContent = producto.product_name || 'Sin nombre';
  nombre.style.fontSize = '0.938rem';
  nombre.style.fontWeight = '700';
  nombre.style.color = 'var(--text-primary)';
  nombre.style.lineHeight = '1.3';
  nombre.style.overflow = 'hidden';
  nombre.style.textOverflow = 'ellipsis';
  nombre.style.whiteSpace = 'nowrap';
  nombre.style.marginBottom = '4px';
  
  const nutri = producto.nutriments || {};
  const detalles = document.createElement('div');
  detalles.style.fontSize = '0.75rem';
  detalles.style.color = 'var(--text-secondary)';
  detalles.style.display = 'flex';
  detalles.style.gap = '8px';
  detalles.innerHTML = `
    <span>🔥 ${Math.round(nutri['energy-kcal_100g'] || 0)} kcal</span>
    <span>💪 ${Math.round(nutri.proteins_100g || 0)}g</span>
    <span>🍞 ${Math.round(nutri.carbohydrates_100g || 0)}g</span>
  `;
  
  info.appendChild(nombre);
  info.appendChild(detalles);
  
  // Botón añadir
  const btnAdd = document.createElement('button');
  btnAdd.textContent = '+';
  btnAdd.style.width = '40px';
  btnAdd.style.height = '40px';
  btnAdd.style.background = 'var(--primary-mint)';
  btnAdd.style.color = 'white';
  btnAdd.style.border = 'none';
  btnAdd.style.borderRadius = '50%';
  btnAdd.style.fontSize = '1.5rem';
  btnAdd.style.fontWeight = '700';
  btnAdd.style.cursor = 'pointer';
  btnAdd.style.flexShrink = '0';
  btnAdd.style.transition = 'all 0.2s ease';
  btnAdd.style.display = 'flex';
  btnAdd.style.alignItems = 'center';
  btnAdd.style.justifyContent = 'center';
  
  btnAdd.onclick = (e) => {
    e.stopPropagation();
    mostrarModalCantidad(producto, nivel, contenido, overlay);
  };
  
  item.appendChild(imagen);
  item.appendChild(info);
  item.appendChild(btnAdd);
  
  item.addEventListener('mouseenter', () => {
    item.style.background = 'var(--bg-main)';
    item.style.borderColor = 'var(--primary-mint)';
    item.style.boxShadow = 'var(--shadow-sm)';
  });
  
  item.addEventListener('mouseleave', () => {
    item.style.background = 'var(--bg-card)';
    item.style.borderColor = 'var(--border-color)';
    item.style.boxShadow = 'none';
  });
  
  return item;
}

// ==================== MODAL CANTIDAD ====================
function mostrarModalCantidad(producto, nivel, contenido, overlay) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10000';
  
  const caja = document.createElement('div');
  caja.style.background = '#fff';
  caja.style.padding = '24px';
  caja.style.borderRadius = '16px';
  caja.style.maxWidth = '90%';
  caja.style.width = '400px';
  caja.style.boxShadow = 'var(--shadow-lg)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = producto.product_name || 'Añadir alimento';
  titulo.style.marginBottom = '16px';
  titulo.style.color = 'var(--primary-mint)';
  caja.appendChild(titulo);
  
  const label = document.createElement('label');
  label.textContent = 'Cantidad (gramos):';
  label.style.display = 'block';
  label.style.marginBottom = '8px';
  label.style.fontWeight = '600';
  caja.appendChild(label);
  
  const input = document.createElement('input');
  input.type = 'number';
  input.value = '100';
  input.min = '1';
  input.style.width = '100%';
  input.style.padding = '12px';
  input.style.border = '1px solid var(--border-color)';
  input.style.borderRadius = '8px';
  input.style.fontSize = '1rem';
  input.style.marginBottom = '16px';
  caja.appendChild(input);
  
  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '12px';
  
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
  
  const btnAnadir = document.createElement('button');
  btnAnadir.textContent = 'Añadir';
  btnAnadir.style.flex = '1';
  btnAnadir.style.padding = '12px';
  btnAnadir.style.background = 'var(--primary-mint)';
  btnAnadir.style.color = 'white';
  btnAnadir.style.border = 'none';
  btnAnadir.style.borderRadius = '8px';
  btnAnadir.style.fontSize = '0.95rem';
  btnAnadir.style.fontWeight = '700';
  btnAnadir.style.cursor = 'pointer';
  btnAnadir.onclick = () => {
    const cantidad = parseInt(input.value) || 100;
    anadirAlimento(producto, cantidad, nivel, contenido);
    modal.remove();
    overlay.remove();
  };
  
  botones.appendChild(btnCancelar);
  botones.appendChild(btnAnadir);
  caja.appendChild(botones);
  
  modal.appendChild(caja);
  document.body.appendChild(modal);
  
  setTimeout(() => input.focus(), 100);
}

// ==================== AÑADIR ALIMENTO ====================
function anadirAlimento(producto, cantidad, nivel, contenido) {
  const nutri = producto.nutriments || {};
  const factor = cantidad / 100;
  
  const registro = {
    fecha: new Date().toISOString().split('T')[0],
    nombre: producto.product_name || 'Sin nombre',
    cantidad: cantidad,
    calorias: (nutri['energy-kcal_100g'] || 0) * factor,
    proteinas: (nutri.proteins_100g || 0) * factor,
    carbohidratos: (nutri.carbohydrates_100g || 0) * factor,
    grasas: (nutri.fat_100g || 0) * factor
  };
  
  nivel.hijos = nivel.hijos || [];
  nivel.hijos.push(registro);
  
  if (typeof window.guardarDatos === 'function') {
    window.guardarDatos();
  }
  
  renderizarNutricion(nivel, contenido, document.getElementById('subHeader'), null);
}
