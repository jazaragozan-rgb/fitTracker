// nutricion.js
// Sistema de seguimiento nutricional rediseñado - Inspirado en Yazio
// Diseño compacto, elegante y minimalista

// ==================== CONFIGURACIÓN ====================
const METAS_DIARIAS = {
  calorias: 2000,
  proteinas: 150,
  carbohidratos: 250,
  grasas: 65
};

const TIPOS_COMIDA = [
  { id: 'desayuno', nombre: 'Desayuno', icono: '🌅', color: '#FFB74D' },
  { id: 'almuerzo', nombre: 'Almuerzo', icono: '☀️', color: '#4FC3F7' },
  { id: 'cena', nombre: 'Cena', icono: '🌙', color: '#9575CD' },
  { id: 'snacks', nombre: 'Snacks', icono: '🍎', color: '#81C784' }
];

// ==================== RENDERIZADO PRINCIPAL ====================
export function renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual) {
  // Limpiar
  subHeader.innerHTML = '';
  contenido.innerHTML = '';
  
  // Configurar subheader
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Nutrición';
  h2Nivel.style.display = '';
  subHeader.appendChild(h2Nivel);
  
  const botonesContainer = document.createElement('div');
  botonesContainer.id = 'subHeaderButtons';
  botonesContainer.style.display = 'flex';
  botonesContainer.style.justifyContent = 'center';
  botonesContainer.style.gap = '8px';
  
  // Botón configurar metas
  const btnMetas = document.createElement('button');
  btnMetas.className = 'header-btn';
  btnMetas.innerHTML = '🎯';
  btnMetas.title = 'Configurar metas';
  btnMetas.style.width = '40px';
  btnMetas.style.padding = '8px';
  btnMetas.onclick = () => mostrarModalMetas();
  botonesContainer.appendChild(btnMetas);
  
  subHeader.appendChild(botonesContainer);

  // Configurar contenido
  contenido.style.padding = '0';
  contenido.style.paddingTop = '12px';
  contenido.style.paddingBottom = '80px';
  contenido.style.paddingLeft = '16px';
  contenido.style.paddingRight = '16px';
  contenido.style.overflowY = 'auto';
  contenido.style.background = 'var(--bg-main)';
  
  // Obtener fecha actual
  const fechaActual = obtenerFechaSeleccionada();
  const registrosHoy = (nivel.hijos || []).filter(r => r.fecha === fechaActual);
  
  // ==================== SELECTOR DE FECHA COMPACTO ====================
  const selectorFecha = crearSelectorFechaCompacto(fechaActual, nivel, contenido);
  contenido.appendChild(selectorFecha);
  
  // ==================== RESUMEN CIRCULAR DE CALORÍAS ====================
  const resumenCalorias = crearResumenCaloriasCircular(registrosHoy);
  contenido.appendChild(resumenCalorias);
  
  // ==================== MACROS CON BARRAS DE PROGRESO ====================
  const macrosCard = crearMacrosConBarras(registrosHoy);
  contenido.appendChild(macrosCard);
  
  // ==================== COMIDAS POR TIPO ====================
  const comidasSection = crearSeccionComidas(registrosHoy, nivel, contenido, fechaActual);
  contenido.appendChild(comidasSection);
  
  // ==================== RESUMEN SEMANAL COMPACTO ====================
  const resumenSemanal = crearResumenSemanalCompacto(nivel.hijos || []);
  contenido.appendChild(resumenSemanal);
  
  // ==================== ALIMENTOS FRECUENTES ====================
  const frecuentes = crearAlimentosFrecuentes(nivel);
  contenido.appendChild(frecuentes);
}

// ==================== SELECTOR DE FECHA COMPACTO ====================
let fechaSeleccionada = new Date().toISOString().split('T')[0];

function obtenerFechaSeleccionada() {
  return fechaSeleccionada;
}

function crearSelectorFechaCompacto(fechaActual, nivel, contenido) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.marginBottom = '16px';
  container.style.padding = '12px 16px';
  container.style.background = 'var(--bg-card)';
  container.style.borderRadius = '12px';
  container.style.boxShadow = 'var(--shadow-sm)';
  
  // Botón anterior
  const btnAnterior = document.createElement('button');
  btnAnterior.innerHTML = '←';
  btnAnterior.style.background = 'transparent';
  btnAnterior.style.border = 'none';
  btnAnterior.style.fontSize = '1.3rem';
  btnAnterior.style.cursor = 'pointer';
  btnAnterior.style.color = 'var(--text-primary)';
  btnAnterior.style.padding = '8px';
  btnAnterior.style.borderRadius = '6px';
  btnAnterior.style.transition = 'all 0.2s ease';
  btnAnterior.onclick = () => cambiarFecha(-1, nivel, contenido);
  
  btnAnterior.addEventListener('mouseenter', () => {
    btnAnterior.style.background = 'var(--bg-main)';
  });
  btnAnterior.addEventListener('mouseleave', () => {
    btnAnterior.style.background = 'transparent';
  });
  
  // Fecha actual
  const fecha = new Date(fechaActual + 'T00:00:00');
  const hoy = new Date().toISOString().split('T')[0];
  const esHoy = fechaActual === hoy;
  
  const fechaDiv = document.createElement('div');
  fechaDiv.style.flex = '1';
  fechaDiv.style.textAlign = 'center';
  fechaDiv.style.cursor = 'pointer';
  fechaDiv.onclick = () => mostrarCalendarioModal(nivel, contenido);
  
  const diaNombre = document.createElement('div');
  diaNombre.textContent = esHoy ? 'Hoy' : fecha.toLocaleDateString('es-ES', { weekday: 'long' });
  diaNombre.style.fontSize = '1rem';
  diaNombre.style.fontWeight = '700';
  diaNombre.style.color = esHoy ? 'var(--primary-mint)' : 'var(--text-primary)';
  diaNombre.style.textTransform = 'capitalize';
  
  const diaNumero = document.createElement('div');
  diaNumero.textContent = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  diaNumero.style.fontSize = '0.8rem';
  diaNumero.style.color = 'var(--text-secondary)';
  diaNumero.style.marginTop = '2px';
  
  fechaDiv.appendChild(diaNombre);
  fechaDiv.appendChild(diaNumero);
  
  // Botón siguiente
  const btnSiguiente = document.createElement('button');
  btnSiguiente.innerHTML = '→';
  btnSiguiente.style.background = 'transparent';
  btnSiguiente.style.border = 'none';
  btnSiguiente.style.fontSize = '1.3rem';
  btnSiguiente.style.cursor = 'pointer';
  btnSiguiente.style.color = 'var(--text-primary)';
  btnSiguiente.style.padding = '8px';
  btnSiguiente.style.borderRadius = '6px';
  btnSiguiente.style.transition = 'all 0.2s ease';
  btnSiguiente.onclick = () => cambiarFecha(1, nivel, contenido);
  
  btnSiguiente.addEventListener('mouseenter', () => {
    btnSiguiente.style.background = 'var(--bg-main)';
  });
  btnSiguiente.addEventListener('mouseleave', () => {
    btnSiguiente.style.background = 'transparent';
  });
  
  container.appendChild(btnAnterior);
  container.appendChild(fechaDiv);
  container.appendChild(btnSiguiente);
  
  return container;
}

function cambiarFecha(dias, nivel, contenido) {
  const fecha = new Date(fechaSeleccionada + 'T00:00:00');
  fecha.setDate(fecha.getDate() + dias);
  fechaSeleccionada = fecha.toISOString().split('T')[0];
  renderizarNutricion(nivel, contenido, document.getElementById('subHeader'), null);
}

// ==================== RESUMEN CIRCULAR DE CALORÍAS ====================
function crearResumenCaloriasCircular(registros) {
  const container = document.createElement('div');
  container.style.background = 'var(--bg-card)';
  container.style.borderRadius = '16px';
  container.style.padding = '24px';
  container.style.marginBottom = '12px';
  container.style.boxShadow = 'var(--shadow-sm)';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  
  const totales = calcularTotales(registros);
  const consumidas = totales.calorias;
  const meta = METAS_DIARIAS.calorias;
  const restantes = Math.max(0, meta - consumidas);
  const porcentaje = Math.min(100, (consumidas / meta) * 100);
  
  // Círculo de progreso
  const circleContainer = document.createElement('div');
  circleContainer.style.position = 'relative';
  circleContainer.style.width = '180px';
  circleContainer.style.height = '180px';
  circleContainer.style.marginBottom = '20px';
  
  // SVG del círculo
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '180');
  svg.setAttribute('height', '180');
  svg.style.transform = 'rotate(-90deg)';
  
  const circleBackground = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleBackground.setAttribute('cx', '90');
  circleBackground.setAttribute('cy', '90');
  circleBackground.setAttribute('r', '75');
  circleBackground.setAttribute('fill', 'none');
  circleBackground.setAttribute('stroke', '#E8E8E8');
  circleBackground.setAttribute('stroke-width', '12');
  
  const circleProgress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleProgress.setAttribute('cx', '90');
  circleProgress.setAttribute('cy', '90');
  circleProgress.setAttribute('r', '75');
  circleProgress.setAttribute('fill', 'none');
  circleProgress.setAttribute('stroke', 'url(#gradient)');
  circleProgress.setAttribute('stroke-width', '12');
  circleProgress.setAttribute('stroke-linecap', 'round');
  const circumference = 2 * Math.PI * 75;
  circleProgress.setAttribute('stroke-dasharray', circumference);
  circleProgress.setAttribute('stroke-dashoffset', circumference - (circumference * porcentaje / 100));
  circleProgress.style.transition = 'stroke-dashoffset 1s ease';
  
  // Gradiente
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', 'gradient');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');
  
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('style', 'stop-color:#3DD598;stop-opacity:1');
  
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('style', 'stop-color:#00D4D4;stop-opacity:1');
  
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  svg.appendChild(circleBackground);
  svg.appendChild(circleProgress);
  
  // Texto central
  const centerText = document.createElement('div');
  centerText.style.position = 'absolute';
  centerText.style.top = '50%';
  centerText.style.left = '50%';
  centerText.style.transform = 'translate(-50%, -50%)';
  centerText.style.textAlign = 'center';
  
  const caloriasNum = document.createElement('div');
  caloriasNum.textContent = Math.round(restantes);
  caloriasNum.style.fontSize = '2.5rem';
  caloriasNum.style.fontWeight = '900';
  caloriasNum.style.color = 'var(--text-primary)';
  caloriasNum.style.lineHeight = '1';
  
  const caloriasLabel = document.createElement('div');
  caloriasLabel.textContent = 'kcal restantes';
  caloriasLabel.style.fontSize = '0.75rem';
  caloriasLabel.style.color = 'var(--text-secondary)';
  caloriasLabel.style.marginTop = '6px';
  caloriasLabel.style.fontWeight = '600';
  
  centerText.appendChild(caloriasNum);
  centerText.appendChild(caloriasLabel);
  
  circleContainer.appendChild(svg);
  circleContainer.appendChild(centerText);
  
  // Resumen compacto debajo
  const resumen = document.createElement('div');
  resumen.style.display = 'flex';
  resumen.style.gap = '24px';
  resumen.style.fontSize = '0.85rem';
  
  const consumido = document.createElement('div');
  consumido.style.textAlign = 'center';
  consumido.innerHTML = `
    <div style="color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Consumido</div>
    <div style="color: var(--primary-mint); font-weight: 700; font-size: 1.1rem;">${Math.round(consumidas)}</div>
  `;
  
  const objetivo = document.createElement('div');
  objetivo.style.textAlign = 'center';
  objetivo.innerHTML = `
    <div style="color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Objetivo</div>
    <div style="color: var(--text-primary); font-weight: 700; font-size: 1.1rem;">${meta}</div>
  `;
  
  resumen.appendChild(consumido);
  resumen.appendChild(objetivo);
  
  container.appendChild(circleContainer);
  container.appendChild(resumen);
  
  return container;
}

// ==================== MACROS CON BARRAS DE PROGRESO ====================
function crearMacrosConBarras(registros) {
  const container = document.createElement('div');
  container.style.background = 'var(--bg-card)';
  container.style.borderRadius = '12px';
  container.style.padding = '16px';
  container.style.marginBottom = '12px';
  container.style.boxShadow = 'var(--shadow-sm)';
  
  const totales = calcularTotales(registros);
  
  const macros = [
    { nombre: 'Proteínas', valor: totales.proteinas, meta: METAS_DIARIAS.proteinas, unidad: 'g', color: '#FF6B6B', icono: '💪' },
    { nombre: 'Carbohidratos', valor: totales.carbohidratos, meta: METAS_DIARIAS.carbohidratos, unidad: 'g', color: '#4FC3F7', icono: '🍞' },
    { nombre: 'Grasas', valor: totales.grasas, meta: METAS_DIARIAS.grasas, unidad: 'g', color: '#FFB74D', icono: '🥑' }
  ];
  
  macros.forEach((macro, index) => {
    const macroDiv = document.createElement('div');
    macroDiv.style.marginBottom = index < macros.length - 1 ? '16px' : '0';
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';
    
    const nombre = document.createElement('div');
    nombre.innerHTML = `<span style="margin-right: 6px;">${macro.icono}</span><span style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${macro.nombre}</span>`;
    
    const valores = document.createElement('div');
    valores.style.fontSize = '0.85rem';
    valores.style.fontWeight = '700';
    valores.innerHTML = `<span style="color: ${macro.color};">${Math.round(macro.valor)}</span><span style="color: var(--text-light);"> / ${macro.meta}${macro.unidad}</span>`;
    
    header.appendChild(nombre);
    header.appendChild(valores);
    
    // Barra de progreso
    const barraContainer = document.createElement('div');
    barraContainer.style.width = '100%';
    barraContainer.style.height = '8px';
    barraContainer.style.background = '#E8E8E8';
    barraContainer.style.borderRadius = '4px';
    barraContainer.style.overflow = 'hidden';
    
    const barraProgreso = document.createElement('div');
    const porcentaje = Math.min(100, (macro.valor / macro.meta) * 100);
    barraProgreso.style.width = `${porcentaje}%`;
    barraProgreso.style.height = '100%';
    barraProgreso.style.background = macro.color;
    barraProgreso.style.borderRadius = '4px';
    barraProgreso.style.transition = 'width 0.5s ease';
    
    barraContainer.appendChild(barraProgreso);
    
    macroDiv.appendChild(header);
    macroDiv.appendChild(barraContainer);
    container.appendChild(macroDiv);
  });
  
  return container;
}

// ==================== SECCIÓN DE COMIDAS POR TIPO ====================
function crearSeccionComidas(registros, nivel, contenido, fechaActual) {
  const section = document.createElement('div');
  section.style.marginBottom = '12px';
  
  TIPOS_COMIDA.forEach(tipo => {
    const registrosTipo = registros.filter(r => r.tipoComida === tipo.id);
    const totalesTipo = calcularTotales(registrosTipo);
    
    const tipoCard = document.createElement('div');
    tipoCard.style.background = 'var(--bg-card)';
    tipoCard.style.borderRadius = '12px';
    tipoCard.style.marginBottom = '8px';
    tipoCard.style.overflow = 'hidden';
    tipoCard.style.boxShadow = 'var(--shadow-sm)';
    
    // Header de la comida
    const header = document.createElement('div');
    header.style.padding = '14px 16px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'pointer';
    header.style.background = `linear-gradient(90deg, ${tipo.color}15 0%, transparent 100%)`;
    header.style.borderLeft = `4px solid ${tipo.color}`;
    
    const headerLeft = document.createElement('div');
    headerLeft.style.display = 'flex';
    headerLeft.style.alignItems = 'center';
    headerLeft.style.gap = '10px';
    
    const icono = document.createElement('span');
    icono.textContent = tipo.icono;
    icono.style.fontSize = '1.3rem';
    
    const nombreTipo = document.createElement('div');
    nombreTipo.textContent = tipo.nombre;
    nombreTipo.style.fontWeight = '700';
    nombreTipo.style.color = 'var(--text-primary)';
    nombreTipo.style.fontSize = '0.95rem';
    
    headerLeft.appendChild(icono);
    headerLeft.appendChild(nombreTipo);
    
    const headerRight = document.createElement('div');
    headerRight.style.display = 'flex';
    headerRight.style.alignItems = 'center';
    headerRight.style.gap = '12px';
    
    const calorias = document.createElement('div');
    calorias.textContent = `${Math.round(totalesTipo.calorias)} kcal`;
    calorias.style.fontWeight = '700';
    calorias.style.color = tipo.color;
    calorias.style.fontSize = '0.9rem';
    
    const btnAdd = document.createElement('button');
    btnAdd.innerHTML = '+';
    btnAdd.style.width = '28px';
    btnAdd.style.height = '28px';
    btnAdd.style.borderRadius = '50%';
    btnAdd.style.border = 'none';
    btnAdd.style.background = tipo.color;
    btnAdd.style.color = 'white';
    btnAdd.style.fontSize = '1.2rem';
    btnAdd.style.fontWeight = '700';
    btnAdd.style.cursor = 'pointer';
    btnAdd.style.display = 'flex';
    btnAdd.style.alignItems = 'center';
    btnAdd.style.justifyContent = 'center';
    btnAdd.style.transition = 'all 0.2s ease';
    btnAdd.onclick = (e) => {
      e.stopPropagation();
      mostrarBuscadorAlimentos(nivel, contenido, tipo.id);
    };
    
    btnAdd.addEventListener('mouseenter', () => {
      btnAdd.style.transform = 'scale(1.1)';
    });
    btnAdd.addEventListener('mouseleave', () => {
      btnAdd.style.transform = 'scale(1)';
    });
    
    headerRight.appendChild(calorias);
    headerRight.appendChild(btnAdd);
    
    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    
    // Contenido expandible
    const contenidoComida = document.createElement('div');
    contenidoComida.style.maxHeight = '0';
    contenidoComida.style.overflow = 'hidden';
    contenidoComida.style.transition = 'max-height 0.3s ease';
    
    let expandido = false;
    
    header.onclick = (e) => {
      if (e.target === btnAdd || btnAdd.contains(e.target)) return;
      
      expandido = !expandido;
      if (expandido) {
        contenidoComida.style.maxHeight = '1000px';
        contenidoComida.style.padding = '0 16px 16px 16px';
      } else {
        contenidoComida.style.maxHeight = '0';
        contenidoComida.style.padding = '0 16px';
      }
    };
    
    // Alimentos de este tipo de comida
    if (registrosTipo.length > 0) {
      registrosTipo.forEach((registro, index) => {
        const itemAlimento = crearItemAlimentoCompacto(registro, registros, nivel, contenido);
        contenidoComida.appendChild(itemAlimento);
      });
    } else {
      const sinAlimentos = document.createElement('div');
      sinAlimentos.style.textAlign = 'center';
      sinAlimentos.style.padding = '20px';
      sinAlimentos.style.color = 'var(--text-light)';
      sinAlimentos.style.fontSize = '0.85rem';
      sinAlimentos.textContent = 'Sin alimentos registrados';
      contenidoComida.appendChild(sinAlimentos);
    }
    
    tipoCard.appendChild(header);
    tipoCard.appendChild(contenidoComida);
    section.appendChild(tipoCard);
  });
  
  return section;
}

// ==================== ITEM ALIMENTO COMPACTO ====================
function crearItemAlimentoCompacto(registro, registros, nivel, contenido) {
  const item = document.createElement('div');
  item.style.display = 'flex';
  item.style.justifyContent = 'space-between';
  item.style.alignItems = 'center';
  item.style.padding = '10px 0';
  item.style.borderBottom = '1px solid var(--bg-main)';
  
  const info = document.createElement('div');
  info.style.flex = '1';
  
  const nombre = document.createElement('div');
  nombre.textContent = registro.nombre;
  nombre.style.fontWeight = '600';
  nombre.style.color = 'var(--text-primary)';
  nombre.style.fontSize = '0.9rem';
  nombre.style.marginBottom = '4px';
  
  const detalles = document.createElement('div');
  detalles.style.fontSize = '0.75rem';
  detalles.style.color = 'var(--text-secondary)';
  detalles.textContent = `${registro.cantidad}g • ${Math.round(registro.calorias)} kcal`;
  
  info.appendChild(nombre);
  info.appendChild(detalles);
  
  const macrosCompactos = document.createElement('div');
  macrosCompactos.style.fontSize = '0.7rem';
  macrosCompactos.style.color = 'var(--text-light)';
  macrosCompactos.style.display = 'flex';
  macrosCompactos.style.gap = '8px';
  macrosCompactos.style.marginRight = '12px';
  macrosCompactos.innerHTML = `
    <span>P: ${Math.round(registro.proteinas)}g</span>
    <span>C: ${Math.round(registro.carbohidratos)}g</span>
    <span>G: ${Math.round(registro.grasas)}g</span>
  `;
  
  const btnEliminar = document.createElement('button');
  btnEliminar.innerHTML = '×';
  btnEliminar.style.width = '24px';
  btnEliminar.style.height = '24px';
  btnEliminar.style.borderRadius = '50%';
  btnEliminar.style.border = 'none';
  btnEliminar.style.background = 'transparent';
  btnEliminar.style.color = 'var(--text-light)';
  btnEliminar.style.fontSize = '1.3rem';
  btnEliminar.style.cursor = 'pointer';
  btnEliminar.style.display = 'flex';
  btnEliminar.style.alignItems = 'center';
  btnEliminar.style.justifyContent = 'center';
  btnEliminar.style.transition = 'all 0.2s ease';
  
  btnEliminar.onclick = () => {
    if (confirm(`¿Eliminar ${registro.nombre}?`)) {
      const index = registros.indexOf(registro);
      if (index > -1) {
        nivel.hijos.splice(nivel.hijos.indexOf(registro), 1);
        if (typeof window.guardarDatos === 'function') window.guardarDatos();
        renderizarNutricion(nivel, contenido, document.getElementById('subHeader'), null);
      }
    }
  };
  
  btnEliminar.addEventListener('mouseenter', () => {
    btnEliminar.style.background = '#FFE5E5';
    btnEliminar.style.color = 'var(--danger)';
  });
  btnEliminar.addEventListener('mouseleave', () => {
    btnEliminar.style.background = 'transparent';
    btnEliminar.style.color = 'var(--text-light)';
  });
  
  item.appendChild(info);
  item.appendChild(macrosCompactos);
  item.appendChild(btnEliminar);
  
  return item;
}

// ==================== RESUMEN SEMANAL COMPACTO ====================
function crearResumenSemanalCompacto(registros) {
  const container = document.createElement('div');
  container.style.background = 'var(--bg-card)';
  container.style.borderRadius = '12px';
  container.style.padding = '16px';
  container.style.marginBottom = '12px';
  container.style.boxShadow = 'var(--shadow-sm)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Últimos 7 días';
  titulo.style.fontSize = '0.9rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-secondary)';
  titulo.style.marginBottom = '16px';
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '0.5px';
  container.appendChild(titulo);
  
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
      dia: fecha.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase(),
      calorias: totales.calorias,
      cumpleMeta: totales.calorias >= METAS_DIARIAS.calorias * 0.8 && totales.calorias <= METAS_DIARIAS.calorias * 1.2
    });
  }
  
  // Mini gráfico de barras
  const grafico = document.createElement('div');
  grafico.style.display = 'flex';
  grafico.style.alignItems = 'flex-end';
  grafico.style.justifyContent = 'space-between';
  grafico.style.height = '80px';
  grafico.style.gap = '4px';
  
  const maxCalorias = Math.max(...datos7Dias.map(d => d.calorias), METAS_DIARIAS.calorias);
  
  datos7Dias.forEach(dia => {
    const barContainer = document.createElement('div');
    barContainer.style.flex = '1';
    barContainer.style.display = 'flex';
    barContainer.style.flexDirection = 'column';
    barContainer.style.alignItems = 'center';
    barContainer.style.gap = '6px';
    
    const barra = document.createElement('div');
    const altura = (dia.calorias / maxCalorias) * 100;
    barra.style.width = '100%';
    barra.style.height = `${Math.max(altura, 5)}%`;
    barra.style.background = dia.cumpleMeta ? 'var(--primary-mint)' : 'var(--text-light)';
    barra.style.borderRadius = '4px 4px 0 0';
    barra.style.transition = 'all 0.3s ease';
    
    const label = document.createElement('div');
    label.textContent = dia.dia;
    label.style.fontSize = '0.7rem';
    label.style.color = 'var(--text-secondary)';
    label.style.fontWeight = '600';
    
    barContainer.appendChild(barra);
    barContainer.appendChild(label);
    grafico.appendChild(barContainer);
  });
  
  container.appendChild(grafico);
  
  // Promedio semanal
  const promedio = datos7Dias.reduce((sum, d) => sum + d.calorias, 0) / 7;
  const promedioDiv = document.createElement('div');
  promedioDiv.style.marginTop = '12px';
  promedioDiv.style.textAlign = 'center';
  promedioDiv.style.fontSize = '0.8rem';
  promedioDiv.style.color = 'var(--text-secondary)';
  promedioDiv.innerHTML = `Promedio: <span style="font-weight: 700; color: var(--primary-mint);">${Math.round(promedio)} kcal/día</span>`;
  container.appendChild(promedioDiv);
  
  return container;
}

// ==================== ALIMENTOS FRECUENTES ====================
function crearAlimentosFrecuentes(nivel) {
  const container = document.createElement('div');
  container.style.background = 'var(--bg-card)';
  container.style.borderRadius = '12px';
  container.style.padding = '16px';
  container.style.marginBottom = '12px';
  container.style.boxShadow = 'var(--shadow-sm)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = '⚡ Acceso Rápido';
  titulo.style.fontSize = '0.9rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-secondary)';
  titulo.style.marginBottom = '12px';
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '0.5px';
  container.appendChild(titulo);
  
  // Calcular alimentos más frecuentes
  const frecuencias = {};
  (nivel.hijos || []).forEach(registro => {
    if (!frecuencias[registro.nombre]) {
      frecuencias[registro.nombre] = {
        count: 0,
        ultimoRegistro: registro
      };
    }
    frecuencias[registro.nombre].count++;
  });
  
  const topAlimentos = Object.entries(frecuencias)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  
  if (topAlimentos.length === 0) {
    const sinDatos = document.createElement('div');
    sinDatos.style.textAlign = 'center';
    sinDatos.style.padding = '20px';
    sinDatos.style.color = 'var(--text-light)';
    sinDatos.style.fontSize = '0.85rem';
    sinDatos.textContent = 'Registra alimentos para ver accesos rápidos';
    container.appendChild(sinDatos);
    return container;
  }
  
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(140px, 1fr))';
  grid.style.gap = '8px';
  
  topAlimentos.forEach(([nombre, data]) => {
    const btn = document.createElement('button');
    btn.style.padding = '12px';
    btn.style.background = 'var(--bg-main)';
    btn.style.border = '1px solid var(--border-color)';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';
    btn.style.textAlign = 'left';
    
    const nombreDiv = document.createElement('div');
    nombreDiv.textContent = nombre;
    nombreDiv.style.fontWeight = '600';
    nombreDiv.style.fontSize = '0.85rem';
    nombreDiv.style.color = 'var(--text-primary)';
    nombreDiv.style.marginBottom = '4px';
    nombreDiv.style.overflow = 'hidden';
    nombreDiv.style.textOverflow = 'ellipsis';
    nombreDiv.style.whiteSpace = 'nowrap';
    
    const infoDiv = document.createElement('div');
    infoDiv.textContent = `${Math.round(data.ultimoRegistro.calorias)} kcal`;
    infoDiv.style.fontSize = '0.75rem';
    infoDiv.style.color = 'var(--text-secondary)';
    
    btn.appendChild(nombreDiv);
    btn.appendChild(infoDiv);
    
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--primary-mint)';
      btn.style.borderColor = 'var(--primary-mint)';
      nombreDiv.style.color = 'white';
      infoDiv.style.color = 'white';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'var(--bg-main)';
      btn.style.borderColor = 'var(--border-color)';
      nombreDiv.style.color = 'var(--text-primary)';
      infoDiv.style.color = 'var(--text-secondary)';
    });
    
    btn.onclick = () => {
      mostrarModalAñadirRapido(data.ultimoRegistro, nivel);
    };
    
    grid.appendChild(btn);
  });
  
  container.appendChild(grid);
  return container;
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

// ==================== BUSCADOR DE ALIMENTOS MEJORADO ====================
export function mostrarBuscadorAlimentos(nivel, contenido, tipoComida = 'desayuno') {
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
  modal.style.background = 'var(--bg-card)';
  modal.style.borderRadius = '16px';
  modal.style.width = '90%';
  modal.style.maxWidth = '500px';
  modal.style.maxHeight = '85vh';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.boxShadow = 'var(--shadow-lg)';
  modal.style.overflow = 'hidden';
  
  // Header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '20px';
  header.style.borderBottom = '1px solid var(--border-color)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Buscar Alimento';
  titulo.style.margin = '0';
  titulo.style.fontWeight = '700';
  titulo.style.fontSize = '1.1rem';
  titulo.style.color = 'var(--text-primary)';
  
  const btnCerrar = document.createElement('button');
  btnCerrar.innerHTML = '✖';
  btnCerrar.style.background = 'transparent';
  btnCerrar.style.border = 'none';
  btnCerrar.style.fontSize = '1.3rem';
  btnCerrar.style.color = 'var(--text-secondary)';
  btnCerrar.style.cursor = 'pointer';
  btnCerrar.style.width = '36px';
  btnCerrar.style.height = '36px';
  btnCerrar.style.display = 'flex';
  btnCerrar.style.alignItems = 'center';
  btnCerrar.style.justifyContent = 'center';
  btnCerrar.style.borderRadius = '6px';
  btnCerrar.style.transition = 'all 0.2s ease';
  btnCerrar.onclick = () => overlay.remove();
  
  btnCerrar.addEventListener('mouseenter', () => {
    btnCerrar.style.background = 'var(--bg-main)';
  });
  btnCerrar.addEventListener('mouseleave', () => {
    btnCerrar.style.background = 'transparent';
  });
  
  header.appendChild(titulo);
  header.appendChild(btnCerrar);
  
  // Contenedor de búsqueda
  const searchContainer = document.createElement('div');
  searchContainer.style.display = 'flex';
  searchContainer.style.gap = '8px';
  searchContainer.style.padding = '16px 20px';
  searchContainer.style.alignItems = 'center';
  searchContainer.style.borderBottom = '1px solid var(--border-color)';
  
  const input = document.createElement('input');
  input.placeholder = 'ej: pollo, arroz, manzana...';
  input.type = 'text';
  input.style.flex = '1';
  input.style.padding = '12px 16px';
  input.style.border = '1px solid var(--border-color)';
  input.style.borderRadius = '8px';
  input.style.fontSize = '1rem';
  input.style.transition = 'all 0.2s ease';
  input.style.background = 'var(--bg-main)';
  
  input.addEventListener('focus', () => {
    input.style.borderColor = 'var(--primary-mint)';
    input.style.background = 'white';
  });
  
  input.addEventListener('blur', () => {
    input.style.borderColor = 'var(--border-color)';
    input.style.background = 'var(--bg-main)';
  });
  
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
  list.style.flex = '1';
  list.style.overflowY = 'auto';
  list.style.padding = '16px 20px';
  
  const mensajeInicial = document.createElement('div');
  mensajeInicial.style.textAlign = 'center';
  mensajeInicial.style.padding = '60px 20px';
  mensajeInicial.style.color = 'var(--text-light)';
  mensajeInicial.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;">🔍</div>
    <div style="font-size: 0.9rem;">Escribe y pulsa buscar</div>
    <div style="font-size: 0.75rem; margin-top: 8px;">Busca en más de 2 millones de alimentos</div>
  `;
  list.appendChild(mensajeInicial);
  
  const ejecutarBusqueda = () => {
    buscarAlimentos(input.value, list, nivel, contenido, overlay, tipoComida);
  };
  
  btnBuscar.addEventListener('click', ejecutarBusqueda);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') ejecutarBusqueda();
  });
  
  modal.appendChild(header);
  modal.appendChild(searchContainer);
  modal.appendChild(list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  setTimeout(() => input.focus(), 100);
}

// Continúa en la siguiente parte...

// ==================== BUSCAR EN API ====================
async function buscarAlimentos(query, list, nivel, contenido, overlay, tipoComida) {
  if (!query || query.trim().length < 2) {
    list.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-light);">
        <div style="font-size: 2.5rem; margin-bottom: 16px; opacity: 0.3;">⚠️</div>
        <div style="font-size: 0.9rem;">Escribe al menos 2 caracteres</div>
      </div>
    `;
    return;
  }
  
  list.innerHTML = `
    <div style="text-align: center; padding: 60px 20px; color: var(--text-light);">
      <div style="font-size: 2.5rem; margin-bottom: 16px;">⏳</div>
      <div style="font-size: 0.9rem;">Buscando...</div>
    </div>
  `;
  
  try {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=30&fields=product_name,image_small_url,nutriments,brands`);
    const data = await response.json();
    
    list.innerHTML = '';
    
    if (!data.products || data.products.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-light);">
          <div style="font-size: 2.5rem; margin-bottom: 16px; opacity: 0.3;">❌</div>
          <div style="font-size: 0.9rem;">No se encontraron alimentos</div>
          <div style="font-size: 0.75rem; margin-top: 8px;">Intenta con otro término</div>
        </div>
      `;
      return;
    }
    
    // Contador
    const contador = document.createElement('div');
    contador.textContent = `${data.products.length} resultado${data.products.length !== 1 ? 's' : ''}`;
    contador.style.padding = '0 0 12px 0';
    contador.style.fontSize = '0.8rem';
    contador.style.color = 'var(--text-secondary)';
    contador.style.fontWeight = '600';
    list.appendChild(contador);
    
    // Filtrar productos con datos nutricionales
    const productosValidos = data.products.filter(p => p.nutriments && p.nutriments['energy-kcal_100g']);
    
    productosValidos.forEach(producto => {
      const item = crearItemAlimentoBuscado(producto, nivel, contenido, overlay, tipoComida);
      list.appendChild(item);
    });
    
    if (productosValidos.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
          <div style="font-size: 0.9rem;">Productos encontrados pero sin datos nutricionales</div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error buscando alimentos:', error);
    list.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-light);">
        <div style="font-size: 2.5rem; margin-bottom: 16px; opacity: 0.3;">⚠️</div>
        <div style="font-size: 0.9rem;">Error en la búsqueda</div>
        <div style="font-size: 0.75rem; margin-top: 8px;">Verifica tu conexión e intenta de nuevo</div>
      </div>
    `;
  }
}

// ==================== ITEM ALIMENTO BUSCADO ====================
function crearItemAlimentoBuscado(producto, nivel, contenido, overlay, tipoComida) {
  const item = document.createElement('div');
  item.style.display = 'flex';
  item.style.alignItems = 'center';
  item.style.gap = '12px';
  item.style.padding = '12px';
  item.style.marginBottom = '8px';
  item.style.background = 'var(--bg-main)';
  item.style.border = '1px solid var(--border-color)';
  item.style.borderRadius = '12px';
  item.style.cursor = 'pointer';
  item.style.transition = 'all 0.2s ease';
  
  // Imagen
  const imagen = document.createElement('div');
  imagen.style.width = '50px';
  imagen.style.height = '50px';
  imagen.style.borderRadius = '8px';
  imagen.style.overflow = 'hidden';
  imagen.style.flexShrink = '0';
  imagen.style.background = 'white';
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
  
  // Info
  const info = document.createElement('div');
  info.style.flex = '1';
  info.style.minWidth = '0';
  
  const nombre = document.createElement('div');
  nombre.textContent = producto.product_name || 'Sin nombre';
  nombre.style.fontSize = '0.9rem';
  nombre.style.fontWeight = '700';
  nombre.style.color = 'var(--text-primary)';
  nombre.style.marginBottom = '4px';
  nombre.style.overflow = 'hidden';
  nombre.style.textOverflow = 'ellipsis';
  nombre.style.whiteSpace = 'nowrap';
  
  const nutri = producto.nutriments || {};
  const detalles = document.createElement('div');
  detalles.style.fontSize = '0.75rem';
  detalles.style.color = 'var(--text-secondary)';
  detalles.innerHTML = `
    <span>${Math.round(nutri['energy-kcal_100g'] || 0)} kcal</span>
    <span style="margin: 0 6px;">•</span>
    <span>P: ${Math.round(nutri.proteins_100g || 0)}g</span>
    <span style="margin: 0 6px;">•</span>
    <span>C: ${Math.round(nutri.carbohydrates_100g || 0)}g</span>
  `;
  
  if (producto.brands) {
    const marca = document.createElement('div');
    marca.textContent = producto.brands;
    marca.style.fontSize = '0.7rem';
    marca.style.color = 'var(--text-light)';
    marca.style.marginTop = '2px';
    marca.style.overflow = 'hidden';
    marca.style.textOverflow = 'ellipsis';
    marca.style.whiteSpace = 'nowrap';
    info.appendChild(nombre);
    info.appendChild(marca);
    info.appendChild(detalles);
  } else {
    info.appendChild(nombre);
    info.appendChild(detalles);
  }
  
  // Botón añadir
  const btnAdd = document.createElement('button');
  btnAdd.textContent = '+';
  btnAdd.style.width = '36px';
  btnAdd.style.height = '36px';
  btnAdd.style.background = 'var(--primary-mint)';
  btnAdd.style.color = 'white';
  btnAdd.style.border = 'none';
  btnAdd.style.borderRadius = '50%';
  btnAdd.style.fontSize = '1.3rem';
  btnAdd.style.fontWeight = '700';
  btnAdd.style.cursor = 'pointer';
  btnAdd.style.flexShrink = '0';
  btnAdd.style.transition = 'all 0.2s ease';
  btnAdd.style.display = 'flex';
  btnAdd.style.alignItems = 'center';
  btnAdd.style.justifyContent = 'center';
  
  btnAdd.onclick = (e) => {
    e.stopPropagation();
    mostrarModalCantidad(producto, nivel, contenido, overlay, tipoComida);
  };
  
  item.onclick = () => {
    mostrarModalCantidad(producto, nivel, contenido, overlay, tipoComida);
  };
  
  item.addEventListener('mouseenter', () => {
    item.style.background = 'white';
    item.style.borderColor = 'var(--primary-mint)';
    item.style.boxShadow = 'var(--shadow-sm)';
    btnAdd.style.transform = 'scale(1.1)';
  });
  
  item.addEventListener('mouseleave', () => {
    item.style.background = 'var(--bg-main)';
    item.style.borderColor = 'var(--border-color)';
    item.style.boxShadow = 'none';
    btnAdd.style.transform = 'scale(1)';
  });
  
  item.appendChild(imagen);
  item.appendChild(info);
  item.appendChild(btnAdd);
  
  return item;
}

// ==================== MODAL CANTIDAD ====================
function mostrarModalCantidad(producto, nivel, contenido, overlay, tipoComida) {
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
  caja.style.background = 'white';
  caja.style.borderRadius = '16px';
  caja.style.padding = '24px';
  caja.style.maxWidth = '90%';
  caja.style.width = '400px';
  caja.style.boxShadow = 'var(--shadow-lg)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = producto.product_name || 'Añadir alimento';
  titulo.style.marginBottom = '20px';
  titulo.style.color = 'var(--text-primary)';
  titulo.style.fontSize = '1.1rem';
  titulo.style.fontWeight = '700';
  caja.appendChild(titulo);
  
  // Selector de tipo de comida
  const tipoLabel = document.createElement('label');
  tipoLabel.textContent = 'Tipo de comida:';
  tipoLabel.style.display = 'block';
  tipoLabel.style.marginBottom = '8px';
  tipoLabel.style.fontWeight = '600';
  tipoLabel.style.fontSize = '0.9rem';
  tipoLabel.style.color = 'var(--text-secondary)';
  caja.appendChild(tipoLabel);
  
  const selectTipo = document.createElement('select');
  selectTipo.style.width = '100%';
  selectTipo.style.padding = '12px';
  selectTipo.style.border = '1px solid var(--border-color)';
  selectTipo.style.borderRadius = '8px';
  selectTipo.style.fontSize = '0.95rem';
  selectTipo.style.marginBottom = '16px';
  selectTipo.style.background = 'var(--bg-main)';
  
  TIPOS_COMIDA.forEach(tipo => {
    const option = document.createElement('option');
    option.value = tipo.id;
    option.textContent = `${tipo.icono} ${tipo.nombre}`;
    if (tipo.id === tipoComida) option.selected = true;
    selectTipo.appendChild(option);
  });
  caja.appendChild(selectTipo);
  
  // Cantidad
  const label = document.createElement('label');
  label.textContent = 'Cantidad:';
  label.style.display = 'block';
  label.style.marginBottom = '8px';
  label.style.fontWeight = '600';
  label.style.fontSize = '0.9rem';
  label.style.color = 'var(--text-secondary)';
  caja.appendChild(label);
  
  const inputContainer = document.createElement('div');
  inputContainer.style.position = 'relative';
  inputContainer.style.marginBottom = '20px';
  
  const input = document.createElement('input');
  input.type = 'number';
  input.value = '100';
  input.min = '1';
  input.style.width = '100%';
  input.style.padding = '12px';
  input.style.paddingRight = '50px';
  input.style.border = '1px solid var(--border-color)';
  input.style.borderRadius = '8px';
  input.style.fontSize = '1rem';
  input.style.background = 'var(--bg-main)';
  
  const unidad = document.createElement('span');
  unidad.textContent = 'gramos';
  unidad.style.position = 'absolute';
  unidad.style.right = '12px';
  unidad.style.top = '50%';
  unidad.style.transform = 'translateY(-50%)';
  unidad.style.color = 'var(--text-secondary)';
  unidad.style.fontSize = '0.85rem';
  unidad.style.fontWeight = '600';
  
  inputContainer.appendChild(input);
  inputContainer.appendChild(unidad);
  caja.appendChild(inputContainer);
  
  // Preview nutricional
  const nutri = producto.nutriments || {};
  const previewDiv = document.createElement('div');
  previewDiv.style.padding = '12px';
  previewDiv.style.background = 'var(--bg-main)';
  previewDiv.style.borderRadius = '8px';
  previewDiv.style.marginBottom = '20px';
  
  const actualizarPreview = () => {
    const cantidad = parseInt(input.value) || 100;
    const factor = cantidad / 100;
    previewDiv.innerHTML = `
      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">Información nutricional:</div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.85rem;">
        <div><strong>${Math.round((nutri['energy-kcal_100g'] || 0) * factor)}</strong> kcal</div>
        <div><strong>${Math.round((nutri.proteins_100g || 0) * factor)}</strong> g proteínas</div>
        <div><strong>${Math.round((nutri.carbohydrates_100g || 0) * factor)}</strong> g carbohidratos</div>
        <div><strong>${Math.round((nutri.fat_100g || 0) * factor)}</strong> g grasas</div>
      </div>
    `;
  };
  
  actualizarPreview();
  input.addEventListener('input', actualizarPreview);
  caja.appendChild(previewDiv);
  
  // Botones
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
  btnCancelar.style.transition = 'all 0.2s ease';
  btnCancelar.onclick = () => modal.remove();
  
  btnCancelar.addEventListener('mouseenter', () => {
    btnCancelar.style.background = 'var(--border-color)';
  });
  
  const btnAñadir = document.createElement('button');
  btnAñadir.textContent = 'Añadir';
  btnAñadir.style.flex = '1';
  btnAñadir.style.padding = '12px';
  btnAñadir.style.background = 'var(--primary-mint)';
  btnAñadir.style.color = 'white';
  btnAñadir.style.border = 'none';
  btnAñadir.style.borderRadius = '8px';
  btnAñadir.style.fontSize = '0.95rem';
  btnAñadir.style.fontWeight = '700';
  btnAñadir.style.cursor = 'pointer';
  btnAñadir.style.transition = 'all 0.2s ease';
  btnAñadir.onclick = () => {
    const cantidad = parseInt(input.value) || 100;
    const tipoSeleccionado = selectTipo.value;
    añadirAlimento(producto, cantidad, nivel, contenido, tipoSeleccionado);
    modal.remove();
    overlay.remove();
  };
  
  btnAñadir.addEventListener('mouseenter', () => {
    btnAñadir.style.background = 'var(--mint-light)';
  });
  btnAñadir.addEventListener('mouseleave', () => {
    btnAñadir.style.background = 'var(--primary-mint)';
  });
  
  botones.appendChild(btnCancelar);
  botones.appendChild(btnAñadir);
  caja.appendChild(botones);
  
  modal.appendChild(caja);
  document.body.appendChild(modal);
  
  setTimeout(() => input.focus(), 100);
}

// ==================== AÑADIR ALIMENTO ====================
function añadirAlimento(producto, cantidad, nivel, contenido, tipoComida) {
  const nutri = producto.nutriments || {};
  const factor = cantidad / 100;
  
  const registro = {
    fecha: obtenerFechaSeleccionada(),
    nombre: producto.product_name || 'Sin nombre',
    cantidad: cantidad,
    calorias: (nutri['energy-kcal_100g'] || 0) * factor,
    proteinas: (nutri.proteins_100g || 0) * factor,
    carbohidratos: (nutri.carbohydrates_100g || 0) * factor,
    grasas: (nutri.fat_100g || 0) * factor,
    tipoComida: tipoComida
  };
  
  nivel.hijos = nivel.hijos || [];
  nivel.hijos.push(registro);
  
  if (typeof window.guardarDatos === 'function') {
    window.guardarDatos();
  }
  
  renderizarNutricion(nivel, contenido, document.getElementById('subHeader'), null);
}

// ==================== MODAL AÑADIR RÁPIDO ====================
function mostrarModalAñadirRapido(alimentoBase, nivel) {
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
  caja.style.background = 'white';
  caja.style.borderRadius = '16px';
  caja.style.padding = '24px';
  caja.style.maxWidth = '90%';
  caja.style.width = '350px';
  caja.style.boxShadow = 'var(--shadow-lg)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = alimentoBase.nombre;
  titulo.style.marginBottom = '16px';
  titulo.style.fontSize = '1.1rem';
  titulo.style.fontWeight = '700';
  caja.appendChild(titulo);
  
  // Tipo de comida
  const tipoLabel = document.createElement('label');
  tipoLabel.textContent = 'Tipo de comida:';
  tipoLabel.style.display = 'block';
  tipoLabel.style.marginBottom = '8px';
  tipoLabel.style.fontWeight = '600';
  tipoLabel.style.fontSize = '0.9rem';
  caja.appendChild(tipoLabel);
  
  const selectTipo = document.createElement('select');
  selectTipo.style.width = '100%';
  selectTipo.style.padding = '10px';
  selectTipo.style.border = '1px solid var(--border-color)';
  selectTipo.style.borderRadius = '8px';
  selectTipo.style.marginBottom = '16px';
  
  TIPOS_COMIDA.forEach(tipo => {
    const option = document.createElement('option');
    option.value = tipo.id;
    option.textContent = `${tipo.icono} ${tipo.nombre}`;
    if (tipo.id === alimentoBase.tipoComida) option.selected = true;
    selectTipo.appendChild(option);
  });
  caja.appendChild(selectTipo);
  
  // Botones
  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '12px';
  botones.style.marginTop = '20px';
  
  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.flex = '1';
  btnCancelar.style.padding = '12px';
  btnCancelar.style.background = 'var(--bg-main)';
  btnCancelar.style.border = 'none';
  btnCancelar.style.borderRadius = '8px';
  btnCancelar.style.cursor = 'pointer';
  btnCancelar.onclick = () => modal.remove();
  
  const btnAñadir = document.createElement('button');
  btnAñadir.textContent = 'Añadir';
  btnAñadir.style.flex = '1';
  btnAñadir.style.padding = '12px';
  btnAñadir.style.background = 'var(--primary-mint)';
  btnAñadir.style.color = 'white';
  btnAñadir.style.border = 'none';
  btnAñadir.style.borderRadius = '8px';
  btnAñadir.style.fontWeight = '700';
  btnAñadir.style.cursor = 'pointer';
  btnAñadir.onclick = () => {
    const nuevoRegistro = {
      ...alimentoBase,
      fecha: obtenerFechaSeleccionada(),
      tipoComida: selectTipo.value
    };
    delete nuevoRegistro._id;
    
    nivel.hijos = nivel.hijos || [];
    nivel.hijos.push(nuevoRegistro);
    
    if (typeof window.guardarDatos === 'function') {
      window.guardarDatos();
    }
    
    modal.remove();
    renderizarNutricion(nivel, document.getElementById('contenido'), document.getElementById('subHeader'), null);
  };
  
  botones.appendChild(btnCancelar);
  botones.appendChild(btnAñadir);
  caja.appendChild(botones);
  
  modal.appendChild(caja);
  document.body.appendChild(modal);
}

// ==================== MODAL CALENDARIO ====================
function mostrarCalendarioModal(nivel, contenido) {
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
  
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  const caja = document.createElement('div');
  caja.style.background = 'white';
  caja.style.borderRadius = '16px';
  caja.style.padding = '20px';
  caja.style.maxWidth = '90%';
  caja.style.width = '320px';
  caja.style.boxShadow = 'var(--shadow-lg)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Seleccionar fecha';
  titulo.style.marginBottom = '16px';
  titulo.style.fontSize = '1.1rem';
  titulo.style.fontWeight = '700';
  caja.appendChild(titulo);
  
  const inputFecha = document.createElement('input');
  inputFecha.type = 'date';
  inputFecha.value = fechaSeleccionada;
  inputFecha.style.width = '100%';
  inputFecha.style.padding = '12px';
  inputFecha.style.border = '1px solid var(--border-color)';
  inputFecha.style.borderRadius = '8px';
  inputFecha.style.fontSize = '1rem';
  inputFecha.style.marginBottom = '16px';
  caja.appendChild(inputFecha);
  
  const btnAceptar = document.createElement('button');
  btnAceptar.textContent = 'Aceptar';
  btnAceptar.style.width = '100%';
  btnAceptar.style.padding = '12px';
  btnAceptar.style.background = 'var(--primary-mint)';
  btnAceptar.style.color = 'white';
  btnAceptar.style.border = 'none';
  btnAceptar.style.borderRadius = '8px';
  btnAceptar.style.fontWeight = '700';
  btnAceptar.style.cursor = 'pointer';
  btnAceptar.onclick = () => {
    fechaSeleccionada = inputFecha.value;
    modal.remove();
    renderizarNutricion(nivel, contenido, document.getElementById('subHeader'), null);
  };
  caja.appendChild(btnAceptar);
  
  modal.appendChild(caja);
  document.body.appendChild(modal);
}

// ==================== MODAL CONFIGURAR METAS ====================
function mostrarModalMetas() {
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
  caja.style.background = 'white';
  caja.style.borderRadius = '16px';
  caja.style.padding = '24px';
  caja.style.maxWidth = '90%';
  caja.style.width = '400px';
  caja.style.boxShadow = 'var(--shadow-lg)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = '🎯 Configurar Metas Diarias';
  titulo.style.marginBottom = '20px';
  titulo.style.fontSize = '1.1rem';
  titulo.style.fontWeight = '700';
  caja.appendChild(titulo);
  
  const inputs = [];
  
  const metas = [
    { key: 'calorias', label: 'Calorías', unidad: 'kcal' },
    { key: 'proteinas', label: 'Proteínas', unidad: 'g' },
    { key: 'carbohidratos', label: 'Carbohidratos', unidad: 'g' },
    { key: 'grasas', label: 'Grasas', unidad: 'g' }
  ];
  
  metas.forEach(meta => {
    const label = document.createElement('label');
    label.textContent = `${meta.label} (${meta.unidad}):`;
    label.style.display = 'block';
    label.style.marginBottom = '8px';
    label.style.fontWeight = '600';
    label.style.fontSize = '0.9rem';
    caja.appendChild(label);
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = METAS_DIARIAS[meta.key];
    input.min = '0';
    input.style.width = '100%';
    input.style.padding = '12px';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = '8px';
    input.style.marginBottom = '16px';
    input.style.fontSize = '1rem';
    caja.appendChild(input);
    
    inputs.push({ key: meta.key, input });
  });
  
  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '12px';
  botones.style.marginTop = '8px';
  
  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.flex = '1';
  btnCancelar.style.padding = '12px';
  btnCancelar.style.background = 'var(--bg-main)';
  btnCancelar.style.border = 'none';
  btnCancelar.style.borderRadius = '8px';
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
  btnGuardar.style.fontWeight = '700';
  btnGuardar.style.cursor = 'pointer';
  btnGuardar.onclick = () => {
    inputs.forEach(({ key, input }) => {
      METAS_DIARIAS[key] = parseInt(input.value) || 0;
    });
    // Aquí podrías guardar en localStorage o Firebase
    modal.remove();
    renderizarNutricion(
      window.datos[3],
      document.getElementById('contenido'),
      document.getElementById('subHeader'),
      null
    );
  };
  
  botones.appendChild(btnCancelar);
  botones.appendChild(btnGuardar);
  caja.appendChild(botones);
  
  modal.appendChild(caja);
  document.body.appendChild(modal);
}
