// nutricion.js
// Sistema de seguimiento nutricional rediseñado - Inspirado en Yazio
// Diseño compacto, elegante y minimalista

import { auth, db } from './auth.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// ==================== CARGAR Y GUARDAR METAS EN FIRESTORE ====================

async function cargarRegistrosFirestore(nivel, fecha) {
  const user = auth.currentUser;
  if (!user) {
    console.warn('[Nutrición] Usuario no autenticado');
    return;
  }

  try {
    const ref = doc(db, "usuarios", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.log('[Nutrición] Documento de usuario no existe');
      return;
    }

    const data = snap.data();
    const registros = data.nutricion?.[fecha]?.items || [];

    // Limpiar registros locales de ese día
    nivel.hijos = (nivel.hijos || []).filter(r => r.fecha !== fecha);

    // Añadir los de Firestore
    registros.forEach(r => nivel.hijos.push(r));

    console.log(`[Nutrición] ✓ Registros cargados (${fecha})`, registros);
  } catch (err) {
    console.error('[Nutrición] Error cargando registros:', err);
  }
}


async function guardarRegistrosFirestore(nivel, fecha) {
  const user = auth.currentUser;
  if (!user) {
    console.warn('[Nutrición] Usuario no autenticado');
    return;
  }

  try {
    const registrosDia = (nivel.hijos || []).filter(r => r.fecha === fecha);

    const ref = doc(db, "usuarios", user.uid);

    await setDoc(
      ref,
      {
        nutricion: {
          [fecha]: {
            items: registrosDia,
            updatedAt: new Date()
          }
        }
      },
      { merge: true } // 🔥 CLAVE
    );

    console.log(`[Nutrición] ✓ Registros guardados (${fecha})`);
  } catch (err) {
    console.error('[Nutrición] Error guardando registros:', err);
  }
}



// ==================== RENDERIZADO PRINCIPAL ====================
export async function renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual) {
  // Limpiar
  subHeader.innerHTML = '';
  
  // ✅ Limpiar completamente el contenido (incluido selector de fecha anterior)
  //contenido.innerHTML = '';

  if (!nivel) {
    nivel = { nombre: 'Nutrición', hijos: [] };
  }
  if (!nivel.hijos) {
    nivel.hijos = [];
  }

  // Cargar registros del día seleccionado
  const fechaActual = obtenerFechaSeleccionada();
  await cargarRegistrosFirestore(nivel, fechaActual);

  // ==================== CONFIGURAR SUBHEADER ====================
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
  btnMetas.innerHTML = '🎯 Objetivo calorias';
  btnMetas.title = 'Configurar metas';
  btnMetas.style.width = '240px';
  btnMetas.style.padding = '8px';
  btnMetas.onclick = () => mostrarModalMetas();
  botonesContainer.appendChild(btnMetas);
  
  subHeader.appendChild(botonesContainer);

  // ==================== CONTENEDOR PRINCIPAL CON DISEÑO FIJO ====================
  // Wrapper principal que contendrá selector fijo + contenido scrolleable
  const mainWrapper = document.createElement('div');
  mainWrapper.style.position = 'fixed';
  mainWrapper.style.top = '0';
  mainWrapper.style.left = '0';
  mainWrapper.style.width = '100%';
  mainWrapper.style.height = '100%';
  mainWrapper.style.display = 'flex';
  mainWrapper.style.flexDirection = 'column';
  mainWrapper.style.zIndex = '1';
  
  // Calcular espacio superior (header + subheader)
  const calcularEspacioSuperior = () => {
    const header = document.querySelector('header');
    const subHeaderEl = document.getElementById('subHeader');
    const headerHeight = header ? header.offsetHeight : 48;
    const subHeaderHeight = subHeaderEl ? subHeaderEl.offsetHeight : 76;
    return headerHeight + subHeaderHeight;
  };

  const espacioSuperior = calcularEspacioSuperior();
  mainWrapper.style.paddingTop = `${espacioSuperior}px`;

  // ==================== SELECTOR DE FECHA FIJO (NO SCROLLEABLE) ====================
  const selectorFechaFijo = crearSelectorFechaFijo(obtenerFechaSeleccionada(), nivel);
  mainWrapper.appendChild(selectorFechaFijo);

  // ==================== CONTENIDO SCROLLEABLE ====================
  const contenidoScrolleable = document.createElement('div');
  contenidoScrolleable.id = 'nutricion-contenido-scrolleable';
  contenidoScrolleable.style.flex = '1';
  contenidoScrolleable.style.overflowY = 'auto';
  contenidoScrolleable.style.overflowX = 'hidden';
  contenidoScrolleable.style.background = 'var(--bg-main)';
  contenidoScrolleable.style.padding = '16px';
  contenidoScrolleable.style.paddingBottom = '80px'; // Espacio para footer
  contenidoScrolleable.style.opacity = 0;
  contenidoScrolleable.innerHTML = '';
  // renderizas nuevo contenido
  contenidoScrolleable.style.opacity = 1;


  // Obtener registros del día
  const registrosHoy = (nivel.hijos || []).filter(r => r.fecha === fechaActual);
  
  // ==================== RESUMEN CIRCULAR DE CALORÍAS ====================
  const resumenCalorias = crearResumenCaloriasCircular(registrosHoy);
  contenidoScrolleable.appendChild(resumenCalorias);
  
  // ==================== MACROS CON BARRAS DE PROGRESO ====================
  const macrosCard = crearMacrosConBarras(registrosHoy);
  contenidoScrolleable.appendChild(macrosCard);
  
  // ==================== COMIDAS POR TIPO ====================
  const comidasSection = crearSeccionComidas(registrosHoy, nivel, contenidoScrolleable, fechaActual);
  contenidoScrolleable.appendChild(comidasSection);
  
  // ==================== RESUMEN SEMANAL COMPACTO ====================
  const resumenSemanal = crearResumenSemanalCompacto(nivel.hijos || []);
  contenidoScrolleable.appendChild(resumenSemanal);
  
  // ==================== ALIMENTOS FRECUENTES ====================
  const frecuentes = crearAlimentosFrecuentes(nivel);
  contenidoScrolleable.appendChild(frecuentes);
  
  mainWrapper.appendChild(contenidoScrolleable);
  
  // Limpiar contenido principal y añadir wrapper
  contenido.innerHTML = '';
  contenido.style.padding = '0';
  contenido.style.margin = '0';
  contenido.style.overflow = 'hidden';
  contenido.appendChild(mainWrapper);
  
  // Ajustar altura al cambiar tamaño de ventana
  let resizeTimeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const nuevoEspacio = calcularEspacioSuperior();
      mainWrapper.style.paddingTop = `${nuevoEspacio}px`;
    }, 100);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Limpiar listener al destruir
  mainWrapper.addEventListener('DOMNodeRemoved', () => {
    window.removeEventListener('resize', handleResize);
  });
}


// ==================== SELECTOR DE FECHA FIJO (NUEVA FUNCIÓN) ====================
function crearSelectorFechaFijo(fechaActual, nivel) {
  const container = document.createElement('div');
  container.id = 'selector-fecha-fijo';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.padding = '12px 16px';
  container.style.background = 'var(--bg-card)';
  container.style.borderBottom = '1px solid var(--border-color)';
  container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
  container.style.zIndex = '10';
  container.style.flexShrink = '0'; // No se encoge
  
  // Botón anterior
  const btnAnterior = document.createElement('button');
  btnAnterior.innerHTML = '←';
  btnAnterior.style.background = 'transparent';
  btnAnterior.style.border = 'none';
  btnAnterior.style.fontSize = '1.5rem';
  btnAnterior.style.cursor = 'pointer';
  btnAnterior.style.color = 'var(--text-primary)';
  btnAnterior.style.padding = '8px 12px';
  btnAnterior.style.borderRadius = '8px';
  btnAnterior.style.transition = 'all 0.2s ease';
  btnAnterior.style.fontWeight = '700';
  btnAnterior.style.width = '44px';
  btnAnterior.style.height = '44px';
  btnAnterior.style.display = 'flex';
  btnAnterior.style.alignItems = 'center';
  btnAnterior.style.justifyContent = 'center';
  
  btnAnterior.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    cambiarFecha(-1);
    await renderizarNutricion(
      nivel,
      document.getElementById('contenido'),
      document.getElementById('subHeader'),
      null
    );
  };

  
  btnAnterior.addEventListener('mouseenter', () => {
    btnAnterior.style.background = 'var(--bg-main)';
    btnAnterior.style.color = 'var(--primary-mint)';
  });
  btnAnterior.addEventListener('mouseleave', () => {
    btnAnterior.style.background = 'transparent';
    btnAnterior.style.color = 'var(--text-primary)';
  });
  
  // Fecha actual (clicable para abrir calendario)
  const fecha = new Date(fechaActual + 'T00:00:00');
  const hoy = new Date().toISOString().split('T')[0];
  const esHoy = fechaActual === hoy;
  
  const fechaDiv = document.createElement('div');
  fechaDiv.style.flex = '1';
  fechaDiv.style.textAlign = 'center';
  fechaDiv.style.cursor = 'pointer';
  fechaDiv.style.padding = '8px';
  fechaDiv.style.borderRadius = '8px';
  fechaDiv.style.transition = 'all 0.2s ease';
  fechaDiv.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mostrarCalendarioModal(nivel);
  };
  
  fechaDiv.addEventListener('mouseenter', () => {
    fechaDiv.style.background = 'var(--bg-main)';
  });
  fechaDiv.addEventListener('mouseleave', () => {
    fechaDiv.style.background = 'transparent';
  });
  
  // Día nombre (ej: "Hoy" o "Lunes")
  const diaNombre = document.createElement('div');
  if (esHoy) {
    diaNombre.textContent = '📅 Hoy';
  } else {
    const ayer = new Date(hoy + 'T00:00:00');
    ayer.setDate(ayer.getDate() - 1);
    const esAyer = fechaActual === ayer.toISOString().split('T')[0];
    
    if (esAyer) {
      diaNombre.textContent = 'Ayer';
    } else {
      diaNombre.textContent = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
    }
  }
  diaNombre.style.fontSize = '1.1rem';
  diaNombre.style.fontWeight = '700';
  diaNombre.style.color = esHoy ? 'var(--primary-mint)' : 'var(--text-primary)';
  diaNombre.style.textTransform = 'capitalize';
  diaNombre.style.marginBottom = '2px';
  
  // Día número y mes (ej: "30 ene")
  const diaNumero = document.createElement('div');
  diaNumero.textContent = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  diaNumero.style.fontSize = '0.8rem';
  diaNumero.style.color = 'var(--text-secondary)';
  diaNumero.style.fontWeight = '600';
  
  fechaDiv.appendChild(diaNombre);
  fechaDiv.appendChild(diaNumero);
  
  // Botón siguiente
  const btnSiguiente = document.createElement('button');
  btnSiguiente.innerHTML = '→';
  btnSiguiente.style.background = 'transparent';
  btnSiguiente.style.border = 'none';
  btnSiguiente.style.fontSize = '1.5rem';
  btnSiguiente.style.cursor = 'pointer';
  btnSiguiente.style.color = 'var(--text-primary)';
  btnSiguiente.style.padding = '8px 12px';
  btnSiguiente.style.borderRadius = '8px';
  btnSiguiente.style.transition = 'all 0.2s ease';
  btnSiguiente.style.fontWeight = '700';
  btnSiguiente.style.width = '44px';
  btnSiguiente.style.height = '44px';
  btnSiguiente.style.display = 'flex';
  btnSiguiente.style.alignItems = 'center';
  btnSiguiente.style.justifyContent = 'center';
  
  btnSiguiente.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    cambiarFecha(1);
    renderizarNutricion(
      nivel,
      document.getElementById('contenido'),
      document.getElementById('subHeader'),
      null
    );
  };

  
  btnSiguiente.addEventListener('mouseenter', () => {
    btnSiguiente.style.background = 'var(--bg-main)';
    btnSiguiente.style.color = 'var(--primary-mint)';
  });
  btnSiguiente.addEventListener('mouseleave', () => {
    btnSiguiente.style.background = 'transparent';
    btnSiguiente.style.color = 'var(--text-primary)';
  });
  
  container.appendChild(btnAnterior);
  container.appendChild(fechaDiv);
  container.appendChild(btnSiguiente);
  
  return container;
}

// ==================== SELECTOR DE FECHA COMPACTO ====================
let fechaSeleccionada = new Date().toISOString().split('T')[0];

function obtenerFechaSeleccionada() {
  return fechaSeleccionada;
}

let cambiandoFecha = false;
let ultimoEventoFecha = null;

function cambiarFecha(dias) {
  const base = new Date(fechaSeleccionada);
  base.setDate(base.getDate() + dias);

  // Formatear en local YYYY-MM-DD sin toISOString()
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const dd = String(base.getDate()).padStart(2, '0');

  fechaSeleccionada = `${yyyy}-${mm}-${dd}`;
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

  // 🔥 Placeholder para calorías quemadas
  const caloriasQuemadas = 0; // ← aquí luego conectas tu lógica

  // ================= CONTENEDOR CÍRCULO =================
  const circleContainer = document.createElement('div');
  circleContainer.style.position = 'relative';
  circleContainer.style.width = '180px';
  circleContainer.style.height = '180px';
  circleContainer.style.flex = '0 0 180px';


  // ================= SVG CÍRCULO =================
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
  circleProgress.setAttribute(
    'stroke-dashoffset',
    circumference - (circumference * porcentaje / 100)
  );
  circleProgress.style.transition = 'stroke-dashoffset 1s ease';

  // ================= GRADIENTE =================
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

  // ================= TEXTO CENTRAL =================
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

  // ================= FILA PRINCIPAL (RESPONSIVE) =================
  const fila = document.createElement('div');
  fila.style.display = 'flex';
  fila.style.alignItems = 'center';
  fila.style.justifyContent = 'center';
  fila.style.gap = '24px';
  fila.style.flexWrap = 'nowrap';
  fila.style.width = '100%';

  // Consumidas (izquierda)
  const bloqueConsumidas = document.createElement('div');
  bloqueConsumidas.style.textAlign = 'center';
  bloqueConsumidas.style.flex = '1';
  bloqueConsumidas.style.minWidth = '0';
  bloqueConsumidas.innerHTML = `
    <div style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Consumidas</div>
    <div style="color: var(--primary-mint); font-size: 1.4rem; font-weight: 800;">
      ${Math.round(consumidas)}
    </div>
  `;

  // Quemadas (derecha)
  const bloqueQuemadas = document.createElement('div');
  bloqueQuemadas.style.textAlign = 'center';
  bloqueQuemadas.style.flex = '1';
  bloqueQuemadas.style.minWidth = '0';
  bloqueQuemadas.innerHTML = `
    <div style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Quemadas</div>
    <div style="color: #FF8A65; font-size: 1.4rem; font-weight: 800;">
      ${Math.round(caloriasQuemadas)}
    </div>
  `;

  fila.appendChild(bloqueConsumidas);
  fila.appendChild(circleContainer);
  fila.appendChild(bloqueQuemadas);

  // ================= OBJETIVO ABAJO =================
  const objetivo = document.createElement('div');
  objetivo.style.textAlign = 'center';
  objetivo.style.marginTop = '12px';
  objetivo.style.width = '100%';
  objetivo.innerHTML = `
    <div style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Objetivo</div>
    <div style="color: var(--text-primary); font-size: 1.1rem; font-weight: 800;">
      ${meta} kcal
    </div>
  `;

  container.appendChild(fila);
  container.appendChild(objetivo);

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
        guardarRegistrosFirestore(nivel, registro.fecha);
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

  // Mensaje de búsqueda
  list.innerHTML = `
    <div style="text-align: center; padding: 60px 20px; color: var(--text-light);">
      <div style="font-size: 2.5rem; margin-bottom: 16px;">⏳</div>
      <div style="font-size: 0.9rem;">Buscando...</div>
    </div>
  `;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=30&fields=product_name,image_small_url,nutriments,brands`
    );
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
    const productosValidos = data.products.filter(
      p => p.nutriments && p.nutriments['energy-kcal_100g']
    );

    productosValidos.forEach(producto => {
      const item = crearItemAlimentoBuscado(producto, nivel, contenido, overlay, tipoComida);
      list.appendChild(item);

      // Cargar imagen de forma asíncrona
      if (producto.image_small_url) {
        const img = new Image();
        img.src = producto.image_small_url;
        img.onload = () => {
          const divImagen = item.querySelector('.imagen-alimento');
          divImagen.innerHTML = ''; // Limpiar placeholder
          divImagen.appendChild(img);
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
        };
      }
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

  // Imagen con placeholder
  const imagen = document.createElement('div');
  imagen.className = 'imagen-alimento';
  imagen.style.width = '50px';
  imagen.style.height = '50px';
  imagen.style.borderRadius = '8px';
  imagen.style.overflow = 'hidden';
  imagen.style.flexShrink = '0';
  imagen.style.background = 'white';
  imagen.style.display = 'flex';
  imagen.style.alignItems = 'center';
  imagen.style.justifyContent = 'center';
  imagen.textContent = '🍽️'; // placeholder
  imagen.style.fontSize = '1.5rem';

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
async function añadirAlimento(producto, cantidad, nivel, contenido, tipoComida) {
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
  
await guardarRegistrosFirestore(nivel, registro.fecha);
  
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
function mostrarCalendarioModal(nivel) {
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
  modal.style.backdropFilter = 'blur(4px)';
  
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  const caja = document.createElement('div');
  caja.style.background = 'white';
  caja.style.borderRadius = '16px';
  caja.style.padding = '24px';
  caja.style.maxWidth = '90%';
  caja.style.width = '340px';
  caja.style.boxShadow = 'var(--shadow-lg)';
  
  const titulo = document.createElement('h3');
  titulo.textContent = '📅 Seleccionar fecha';
  titulo.style.marginBottom = '20px';
  titulo.style.fontSize = '1.2rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-primary)';
  titulo.style.textAlign = 'center';
  caja.appendChild(titulo);
  
  const inputFecha = document.createElement('input');
  inputFecha.type = 'date';
  inputFecha.value = fechaSeleccionada;
  inputFecha.style.width = '100%';
  inputFecha.style.padding = '14px';
  inputFecha.style.border = '1px solid var(--border-color)';
  inputFecha.style.borderRadius = '8px';
  inputFecha.style.fontSize = '1rem';
  inputFecha.style.marginBottom = '20px';
  inputFecha.style.background = 'var(--bg-main)';
  inputFecha.style.fontWeight = '600';
  inputFecha.style.color = 'var(--primary-mint)';
  caja.appendChild(inputFecha);
  
  // Botones rápidos
  const botonesRapidos = document.createElement('div');
  botonesRapidos.style.display = 'grid';
  botonesRapidos.style.gridTemplateColumns = 'repeat(3, 1fr)';
  botonesRapidos.style.gap = '8px';
  botonesRapidos.style.marginBottom = '20px';
  
  const accesosRapidos = [
    { label: 'Hoy', dias: 0 },
    { label: 'Ayer', dias: -1 },
    { label: 'Ant-ayer', dias: -2 }
  ];
  
  accesosRapidos.forEach(acceso => {
    const btn = document.createElement('button');
    btn.textContent = acceso.label;
    btn.style.padding = '8px';
    btn.style.background = 'var(--bg-main)';
    btn.style.border = '1px solid var(--border-color)';
    btn.style.borderRadius = '6px';
    btn.style.fontSize = '0.85rem';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';
    
    btn.onclick = () => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + acceso.dias);
      inputFecha.value = fecha.toISOString().split('T')[0];
    };
    
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--primary-mint)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--primary-mint)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'var(--bg-main)';
      btn.style.color = 'var(--text-primary)';
      btn.style.borderColor = 'var(--border-color)';
    });
    
    botonesRapidos.appendChild(btn);
  });
  
  caja.appendChild(botonesRapidos);
  
  // Botones principales
  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '12px';
  
  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.flex = '1';
  btnCancelar.style.padding = '12px';
  btnCancelar.style.background = 'var(--bg-main)';
  btnCancelar.style.border = 'none';
  btnCancelar.style.borderRadius = '8px';
  btnCancelar.style.fontWeight = '600';
  btnCancelar.style.cursor = 'pointer';
  btnCancelar.style.transition = 'all 0.2s ease';
  btnCancelar.onclick = () => modal.remove();
  
  btnCancelar.addEventListener('mouseenter', () => {
    btnCancelar.style.background = 'var(--border-color)';
  });
  btnCancelar.addEventListener('mouseleave', () => {
    btnCancelar.style.background = 'var(--bg-main)';
  });
  
  const btnAceptar = document.createElement('button');
  btnAceptar.textContent = 'Aceptar';
  btnAceptar.style.flex = '1';
  btnAceptar.style.padding = '12px';
  btnAceptar.style.background = 'var(--primary-mint)';
  btnAceptar.style.color = 'white';
  btnAceptar.style.border = 'none';
  btnAceptar.style.borderRadius = '8px';
  btnAceptar.style.fontWeight = '700';
  btnAceptar.style.cursor = 'pointer';
  btnAceptar.style.transition = 'all 0.2s ease';
  btnAceptar.onclick = () => {
    fechaSeleccionada = inputFecha.value;
    modal.remove();
    renderizarNutricion(
      nivel,
      document.getElementById('contenido'),
      document.getElementById('subHeader'),
      null
    );
  };
  
  btnAceptar.addEventListener('mouseenter', () => {
    btnAceptar.style.background = 'var(--mint-light)';
  });
  btnAceptar.addEventListener('mouseleave', () => {
    btnAceptar.style.background = 'var(--primary-mint)';
  });
  
  botones.appendChild(btnCancelar);
  botones.appendChild(btnAceptar);
  caja.appendChild(botones);
  
  modal.appendChild(caja);
  document.body.appendChild(modal);
  
  setTimeout(() => inputFecha.focus(), 100);
}

// ==================== MODAL CONFIGURAR METAS ====================
// ==================== MODAL CONFIGURAR METAS ====================

function mostrarModalMetas() {

  /* ───────── ESTADO ───────── */
  let MEDIDAS = {
    peso: 85,
    altura: 179,
    edad: 38,
    sexo: 'hombre',
    actividad: 'moderado'
  };

  const FACTOR_ACTIVIDAD = {
    sedentario: 1.2,
    ligero: 1.375,
    moderado: 1.55,
    alto: 1.725
  };

  const MACROS = {
    proteinas: { kcal: 4, presets: [20, 25, 30, 35] },
    carbohidratos: { kcal: 4, presets: [35, 40, 45, 50] },
    grasas: { kcal: 9, presets: [20, 25, 30] }
  };

  const PRESETS_OBJETIVO = {
    mantener: { proteinas: 30, carbohidratos: 45, grasas: 25 },
    ganar: { proteinas: 25, carbohidratos: 50, grasas: 25 },
    perder: { proteinas: 35, carbohidratos: 40, grasas: 25 }
  };

  function calcularCalorias(objetivo) {
    const sexoFactor = MEDIDAS.sexo === 'hombre' ? 5 : -161;
    const tmb =
      10 * MEDIDAS.peso +
      6.25 * MEDIDAS.altura -
      5 * MEDIDAS.edad +
      sexoFactor;

    let tdee = tmb * FACTOR_ACTIVIDAD[MEDIDAS.actividad];
    if (objetivo === 'ganar') tdee += 300;
    if (objetivo === 'perder') tdee -= 400;

    return Math.round(tdee);
  }

  /* ───────── MODAL BASE ───────── */
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
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
  modal.style.backdropFilter = 'blur(4px)';
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  const caja = document.createElement('div');
  caja.style.background = 'var(--bg-card)';
  caja.style.padding = '24px';
  caja.style.borderRadius = '16px';
  caja.style.width = '440px';
  caja.style.maxWidth = '95%';
  caja.style.boxShadow = 'var(--shadow-lg)';
  caja.style.maxHeight = '90vh';
  caja.style.overflowY = 'auto';

  const titulo = document.createElement('h3');
  titulo.textContent = '🎯 Metas nutricionales';
  titulo.style.marginBottom = '20px';
  titulo.style.fontSize = '1.2rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-primary)';
  titulo.style.textAlign = 'center';
  caja.appendChild(titulo);

  /* ───────── OBJETIVO ───────── */
  const labelObjetivo = document.createElement('label');
  labelObjetivo.textContent = 'Objetivo:';
  labelObjetivo.style.display = 'block';
  labelObjetivo.style.marginBottom = '8px';
  labelObjetivo.style.fontWeight = '600';
  labelObjetivo.style.fontSize = '0.9rem';
  labelObjetivo.style.color = 'var(--text-secondary)';
  caja.appendChild(labelObjetivo);

  const objetivo = document.createElement('select');
  objetivo.innerHTML = `
    <option value="mantener">Mantener peso</option>
    <option value="ganar">Ganar músculo</option>
    <option value="perder">Perder grasa</option>
  `;
  objetivo.style.width = '100%';
  objetivo.style.padding = '12px';
  objetivo.style.border = '1px solid var(--border-color)';
  objetivo.style.borderRadius = '8px';
  objetivo.style.fontSize = '0.95rem';
  objetivo.style.marginBottom = '16px';
  objetivo.style.background = 'var(--bg-main)';
  objetivo.style.color = 'var(--text-primary)';
  objetivo.style.fontWeight = '600';
  objetivo.style.cursor = 'pointer';
  objetivo.style.transition = 'all 0.2s ease';
  
  objetivo.addEventListener('focus', () => {
    objetivo.style.borderColor = 'var(--primary-mint)';
    objetivo.style.background = 'var(--bg-card)';
  });
  
  objetivo.addEventListener('blur', () => {
    objetivo.style.borderColor = 'var(--border-color)';
    objetivo.style.background = 'var(--bg-main)';
  });
  
  caja.appendChild(objetivo);

  /* ───────── ACTIVIDAD ───────── */
  const labelActividad = document.createElement('label');
  labelActividad.textContent = 'Nivel de actividad:';
  labelActividad.style.display = 'block';
  labelActividad.style.marginBottom = '8px';
  labelActividad.style.fontWeight = '600';
  labelActividad.style.fontSize = '0.9rem';
  labelActividad.style.color = 'var(--text-secondary)';
  caja.appendChild(labelActividad);

  const actividad = document.createElement('select');
  actividad.innerHTML = `
    <option value="sedentario">Sedentario (poco o ningún ejercicio)</option>
    <option value="ligero">Actividad ligera (1-3 días/semana)</option>
    <option value="moderado">Actividad moderada (3-5 días/semana)</option>
    <option value="alto">Actividad alta (6-7 días/semana)</option>
  `;
  actividad.value = MEDIDAS.actividad;
  actividad.style.width = '100%';
  actividad.style.padding = '12px';
  actividad.style.border = '1px solid var(--border-color)';
  actividad.style.borderRadius = '8px';
  actividad.style.fontSize = '0.95rem';
  actividad.style.marginBottom = '16px';
  actividad.style.background = 'var(--bg-main)';
  actividad.style.color = 'var(--text-primary)';
  actividad.style.fontWeight = '600';
  actividad.style.cursor = 'pointer';
  actividad.style.transition = 'all 0.2s ease';
  
  actividad.addEventListener('focus', () => {
    actividad.style.borderColor = 'var(--primary-mint)';
    actividad.style.background = 'var(--bg-card)';
  });
  
  actividad.addEventListener('blur', () => {
    actividad.style.borderColor = 'var(--border-color)';
    actividad.style.background = 'var(--bg-main)';
  });

  actividad.onchange = () => {
    MEDIDAS.actividad = actividad.value;
    recalcularTodo();
  };
  
  caja.appendChild(actividad);

  /* ───────── MEDIDAS ───────── */
  const btnMedidas = document.createElement('button');
  btnMedidas.textContent = '📐 Seleccionar medidas corporales';
  btnMedidas.style.width = '100%';
  btnMedidas.style.padding = '12px';
  btnMedidas.style.margin = '8px 0 16px 0';
  btnMedidas.style.background = 'var(--secondary-cyan)';
  btnMedidas.style.color = 'white';
  btnMedidas.style.border = 'none';
  btnMedidas.style.borderRadius = '8px';
  btnMedidas.style.fontSize = '0.95rem';
  btnMedidas.style.fontWeight = '700';
  btnMedidas.style.cursor = 'pointer';
  btnMedidas.style.transition = 'all 0.2s ease';
  
  btnMedidas.addEventListener('mouseenter', () => {
    btnMedidas.style.background = '#00B8B8';
    btnMedidas.style.transform = 'translateY(-1px)';
    btnMedidas.style.boxShadow = 'var(--shadow-sm)';
  });
  
  btnMedidas.addEventListener('mouseleave', () => {
    btnMedidas.style.background = 'var(--secondary-cyan)';
    btnMedidas.style.transform = 'translateY(0)';
    btnMedidas.style.boxShadow = 'none';
  });
  
  btnMedidas.onclick = () => {
    // 🔧 AQUÍ VA TU MODAL REAL DE MEDIDAS
    recalcularTodo();
  };
  caja.appendChild(btnMedidas);

  /* ───────── CALORÍAS ───────── */
  const labelCalorias = document.createElement('label');
  labelCalorias.textContent = 'Calorías objetivo:';
  labelCalorias.style.display = 'block';
  labelCalorias.style.marginBottom = '8px';
  labelCalorias.style.fontWeight = '600';
  labelCalorias.style.fontSize = '0.9rem';
  labelCalorias.style.color = 'var(--text-secondary)';
  caja.appendChild(labelCalorias);

  const caloriasWrapper = document.createElement('div');
  caloriasWrapper.style.position = 'relative';
  caloriasWrapper.style.marginBottom = '20px';

  const calorias = document.createElement('input');
  calorias.type = 'number';
  calorias.readOnly = true;
  calorias.style.width = '100%';
  calorias.style.padding = '12px';
  calorias.style.paddingRight = '60px';
  calorias.style.border = '1px solid var(--border-color)';
  calorias.style.borderRadius = '8px';
  calorias.style.fontSize = '1.1rem';
  calorias.style.background = 'var(--bg-main)';
  calorias.style.color = 'var(--primary-mint)';
  calorias.style.textAlign = 'center';
  calorias.style.fontWeight = '700';

  const unidadCal = document.createElement('span');
  unidadCal.textContent = 'kcal';
  unidadCal.style.position = 'absolute';
  unidadCal.style.right = '12px';
  unidadCal.style.top = '50%';
  unidadCal.style.transform = 'translateY(-50%)';
  unidadCal.style.color = 'var(--text-secondary)';
  unidadCal.style.fontSize = '0.85rem';
  unidadCal.style.fontWeight = '600';

  caloriasWrapper.appendChild(calorias);
  caloriasWrapper.appendChild(unidadCal);
  caja.appendChild(caloriasWrapper);

  /* ───────── MACROS TÍTULO ───────── */
  const tituloMacros = document.createElement('div');
  tituloMacros.textContent = 'Distribución de macronutrientes';
  tituloMacros.style.fontSize = '0.9rem';
  tituloMacros.style.fontWeight = '700';
  tituloMacros.style.color = 'var(--text-secondary)';
  tituloMacros.style.marginBottom = '12px';
  tituloMacros.style.textTransform = 'uppercase';
  tituloMacros.style.letterSpacing = '0.5px';
  caja.appendChild(tituloMacros);

  /* ───────── MACROS ───────── */
  const contMacros = document.createElement('div');
  contMacros.style.background = 'var(--bg-main)';
  contMacros.style.padding = '16px';
  contMacros.style.borderRadius = '12px';
  contMacros.style.marginBottom = '20px';
  caja.appendChild(contMacros);

  Object.entries(MACROS).forEach(([key, macro]) => {
    const fila = document.createElement('div');
    fila.style.display = 'flex';
    fila.style.alignItems = 'center';
    fila.style.gap = '8px';
    fila.style.marginBottom = '12px';

    const label = document.createElement('strong');
    label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    label.style.width = '110px';
    label.style.fontSize = '0.9rem';
    label.style.color = 'var(--text-primary)';
    label.style.fontWeight = '600';

    const gramosWrapper = document.createElement('div');
    gramosWrapper.style.position = 'relative';
    gramosWrapper.style.width = '75px';

    const gramos = document.createElement('input');
    gramos.type = 'number';
    gramos.readOnly = true;
    gramos.style.width = '100%';
    gramos.style.padding = '8px';
    gramos.style.paddingRight = '24px';
    gramos.style.border = '1px solid var(--border-color)';
    gramos.style.borderRadius = '6px';
    gramos.style.fontSize = '0.85rem';
    gramos.style.background = 'var(--bg-card)';
    gramos.style.color = 'var(--text-secondary)';
    gramos.style.textAlign = 'center';
    gramos.style.fontWeight = '600';

    const unidadG = document.createElement('span');
    unidadG.textContent = 'g';
    unidadG.style.position = 'absolute';
    unidadG.style.right = '8px';
    unidadG.style.top = '50%';
    unidadG.style.transform = 'translateY(-50%)';
    unidadG.style.fontSize = '0.75rem';
    unidadG.style.color = 'var(--text-light)';
    unidadG.style.fontWeight = '600';

    gramosWrapper.appendChild(gramos);
    gramosWrapper.appendChild(unidadG);

    const pctWrap = document.createElement('div');
    pctWrap.style.position = 'relative';
    pctWrap.style.width = '70px';

    const pct = document.createElement('input');
    pct.type = 'number';
    pct.style.width = '100%';
    pct.style.padding = '8px';
    pct.style.paddingRight = '24px';
    pct.style.border = '1px solid var(--border-color)';
    pct.style.borderRadius = '6px';
    pct.style.fontSize = '0.85rem';
    pct.style.background = 'var(--bg-card)';
    pct.style.color = 'var(--text-primary)';
    pct.style.textAlign = 'center';
    pct.style.fontWeight = '700';
    pct.style.transition = 'all 0.2s ease';

    pct.addEventListener('focus', () => {
      pct.style.borderColor = 'var(--primary-mint)';
      pct.style.boxShadow = '0 0 0 2px rgba(61, 213, 152, 0.1)';
    });

    pct.addEventListener('blur', () => {
      pct.style.borderColor = 'var(--border-color)';
      pct.style.boxShadow = 'none';
    });

    pct.addEventListener('input', recalcularMacros);

    const simbolo = document.createElement('span');
    simbolo.textContent = '%';
    simbolo.style.position = 'absolute';
    simbolo.style.right = '8px';
    simbolo.style.top = '50%';
    simbolo.style.transform = 'translateY(-50%)';
    simbolo.style.fontSize = '0.75rem';
    simbolo.style.color = 'var(--text-secondary)';
    simbolo.style.fontWeight = '600';

    pctWrap.appendChild(pct);
    pctWrap.appendChild(simbolo);

    const presets = document.createElement('div');
    presets.style.display = 'flex';
    presets.style.gap = '4px';
    presets.style.flex = '1';
    presets.style.justifyContent = 'flex-end';

    macro.presets.forEach(v => {
      const b = document.createElement('button');
      b.textContent = v + '%';
      b.style.fontSize = '0.7rem';
      b.style.padding = '4px 8px';
      b.style.background = 'var(--bg-card)';
      b.style.color = 'var(--text-secondary)';
      b.style.border = '1px solid var(--border-color)';
      b.style.borderRadius = '6px';
      b.style.cursor = 'pointer';
      b.style.fontWeight = '600';
      b.style.transition = 'all 0.2s ease';
      
      b.addEventListener('mouseenter', () => {
        b.style.background = 'var(--primary-mint)';
        b.style.color = 'white';
        b.style.borderColor = 'var(--primary-mint)';
      });
      
      b.addEventListener('mouseleave', () => {
        b.style.background = 'var(--bg-card)';
        b.style.color = 'var(--text-secondary)';
        b.style.borderColor = 'var(--border-color)';
      });
      
      b.onclick = () => {
        pct.value = v;
        recalcularMacros();
      };
      
      presets.appendChild(b);
    });

    fila.append(label, gramosWrapper, pctWrap, presets);
    contMacros.appendChild(fila);

    macro.g = gramos;
    macro.pct = pct;
  });

  function recalcularMacros() {
    const total = Object.values(MACROS)
      .reduce((s, m) => s + (+m.pct.value || 0), 0);

    tituloMacros.style.color = total === 100 ? 'var(--success)' : 'var(--danger)';
    
    if (total !== 100) {
      tituloMacros.textContent = `Distribución de macronutrientes (${total}% - debe sumar 100%)`;
      return;
    }
    
    tituloMacros.textContent = 'Distribución de macronutrientes ✓';

    Object.values(MACROS).forEach(m => {
      m.g.value = Math.round(
        (calorias.value * (m.pct.value / 100)) / m.kcal
      );
    });
  }

  function aplicarPresetObjetivo() {
    const p = PRESETS_OBJETIVO[objetivo.value];
    Object.keys(p).forEach(k => {
      MACROS[k].pct.value = p[k];
    });
    recalcularMacros();
  }

  objetivo.onchange = () => {
    recalcularTodo();
    aplicarPresetObjetivo();
  };

  function recalcularTodo() {
    calorias.value = calcularCalorias(objetivo.value);
    recalcularMacros();
  }

  /* ───────── BOTONES ───────── */
  const contBotones = document.createElement('div');
  contBotones.style.display = 'flex';
  contBotones.style.gap = '12px';
  contBotones.style.marginTop = '20px';

  const btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Cerrar';
  btnCerrar.style.flex = '1';
  btnCerrar.style.padding = '12px';
  btnCerrar.style.background = 'var(--bg-main)';
  btnCerrar.style.color = 'var(--text-secondary)';
  btnCerrar.style.border = 'none';
  btnCerrar.style.borderRadius = '8px';
  btnCerrar.style.fontSize = '0.95rem';
  btnCerrar.style.fontWeight = '700';
  btnCerrar.style.cursor = 'pointer';
  btnCerrar.style.transition = 'all 0.2s ease';
  
  btnCerrar.addEventListener('mouseenter', () => {
    btnCerrar.style.background = 'var(--border-color)';
  });
  
  btnCerrar.addEventListener('mouseleave', () => {
    btnCerrar.style.background = 'var(--bg-main)';
  });
  
  btnCerrar.onclick = () => modal.remove();

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
  btnGuardar.style.transition = 'all 0.2s ease';
  
  btnGuardar.addEventListener('mouseenter', () => {
    btnGuardar.style.background = 'var(--mint-light)';
  });
  
  btnGuardar.addEventListener('mouseleave', () => {
    btnGuardar.style.background = 'var(--primary-mint)';
  });

  btnGuardar.onclick = async () => {
    const total = Object.values(MACROS)
      .reduce((s, m) => s + (+m.pct.value || 0), 0);

    if (total !== 100) {
      alert('Los macros deben sumar 100%');
      return;
    }

    const uid = auth.currentUser.uid;

    const data = {
      objetivo: objetivo.value,
      actividad: MEDIDAS.actividad,
      calorias: +calorias.value,
      medidas: MEDIDAS,
      macros: {
        proteinas: {
          pct: +MACROS.proteinas.pct.value,
          g: +MACROS.proteinas.g.value
        },
        carbohidratos: {
          pct: +MACROS.carbohidratos.pct.value,
          g: +MACROS.carbohidratos.g.value
        },
        grasas: {
          pct: +MACROS.grasas.pct.value,
          g: +MACROS.grasas.g.value
        }
      },
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'usuarios', uid, 'nutricion', 'actual'), data);
    await addDoc(collection(db, 'usuarios', uid, 'nutricion', 'historial'), data);

    modal.remove();
  };

  contBotones.append(btnCerrar, btnGuardar);
  caja.appendChild(contBotones);

  modal.appendChild(caja);
  document.body.appendChild(modal);

  /* ───────── INIT ───────── */
  recalcularTodo();
  aplicarPresetObjetivo();
}
