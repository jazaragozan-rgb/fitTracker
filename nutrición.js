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
  item.style.just
