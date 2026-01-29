// nutricion.js - VERSIÓN FUNCIONAL
// Sistema de seguimiento nutricional - Versión simplificada que funciona

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

let fechaSeleccionada = new Date().toISOString().split('T')[0];

// ==================== RENDERIZADO PRINCIPAL ====================
export function renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual) {
  console.log('🍽️ Renderizando Nutrición:', { nivel, fechaSeleccionada });
  
  // Limpiar
  subHeader.innerHTML = '';
  contenido.innerHTML = '';
  
  // Configurar subheader
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Nutrición';
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
  btnMetas.onclick = () => alert('Configurar metas - Próximamente');
  botonesContainer.appendChild(btnMetas);
  
  subHeader.appendChild(botonesContainer);

  // Configurar contenido
  contenido.style.padding = '16px';
  contenido.style.paddingBottom = '80px';
  contenido.style.overflowY = 'auto';
  contenido.style.background = 'var(--bg-main)';
  
  // Asegurar que nivel.hijos existe
  if (!nivel.hijos) nivel.hijos = [];
  
  const fechaActual = fechaSeleccionada;
  const registrosHoy = nivel.hijos.filter(r => r.fecha === fechaActual);
  
  console.log('📊 Datos:', { fechaActual, registrosHoy: registrosHoy.length });
  
  // ==================== SELECTOR DE FECHA ====================
  contenido.appendChild(crearSelectorFecha(fechaActual, nivel, contenido, subHeader));
  
  // ==================== RESUMEN CIRCULAR ====================
  contenido.appendChild(crearResumenCircular(registrosHoy));
  
  // ==================== MACROS ====================
  contenido.appendChild(crearMacros(registrosHoy));
  
  // ==================== COMIDAS ====================
  contenido.appendChild(crearComidas(registrosHoy, nivel, contenido, subHeader));
  
  // ==================== DATOS DE PRUEBA (SI ESTÁ VACÍO) ====================
  if (nivel.hijos.length === 0) {
    const ayuda = document.createElement('div');
    ayuda.style.background = 'rgba(61, 213, 152, 0.1)';
    ayuda.style.padding = '20px';
    ayuda.style.borderRadius = '12px';
    ayuda.style.marginTop = '20px';
    ayuda.style.border = '2px dashed var(--primary-mint)';
    ayuda.innerHTML = `
      <div style="text-align: center; color: var(--text-primary);">
        <div style="font-size: 2rem; margin-bottom: 12px;">🍽️</div>
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1rem;">¡Comienza a registrar!</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">
          Click en el botón <strong>+</strong> de cualquier comida para añadir alimentos
        </div>
        <button id="btnDatosPrueba" style="
          background: var(--primary-mint);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.9rem;
        ">📊 Añadir datos de ejemplo</button>
      </div>
    `;
    contenido.appendChild(ayuda);
    
    // Listener para datos de prueba
    setTimeout(() => {
      const btnPrueba = document.getElementById('btnDatosPrueba');
      if (btnPrueba) {
        btnPrueba.onclick = () => {
          añadirDatosPrueba(nivel);
          renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual);
        };
      }
    }, 100);
  }
}

// ==================== SELECTOR DE FECHA ====================
function crearSelectorFecha(fechaActual, nivel, contenido, subHeader) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--bg-card);
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
  `;
  
  const fecha = new Date(fechaActual + 'T00:00:00');
  const hoy = new Date().toISOString().split('T')[0];
  const esHoy = fechaActual === hoy;
  
  // Botón anterior
  const btnAnterior = document.createElement('button');
  btnAnterior.innerHTML = '←';
  btnAnterior.style.cssText = `
    background: transparent;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
  `;
  btnAnterior.onclick = () => {
    const nuevaFecha = new Date(fechaSeleccionada + 'T00:00:00');
    nuevaFecha.setDate(nuevaFecha.getDate() - 1);
    fechaSeleccionada = nuevaFecha.toISOString().split('T')[0];
    renderizarNutricion(nivel, contenido, subHeader);
  };
  
  // Fecha
  const fechaDiv = document.createElement('div');
  fechaDiv.style.cssText = 'flex: 1; text-align: center;';
  fechaDiv.innerHTML = `
    <div style="font-size: 1rem; font-weight: 700; color: ${esHoy ? 'var(--primary-mint)' : 'var(--text-primary)'};">
      ${esHoy ? 'Hoy' : fecha.toLocaleDateString('es-ES', { weekday: 'long' })}
    </div>
    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
      ${fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
    </div>
  `;
  
  // Botón siguiente
  const btnSiguiente = document.createElement('button');
  btnSiguiente.innerHTML = '→';
  btnSiguiente.style.cssText = `
    background: transparent;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
  `;
  btnSiguiente.onclick = () => {
    const nuevaFecha = new Date(fechaSeleccionada + 'T00:00:00');
    nuevaFecha.setDate(nuevaFecha.getDate() + 1);
    fechaSeleccionada = nuevaFecha.toISOString().split('T')[0];
    renderizarNutricion(nivel, contenido, subHeader);
  };
  
  container.appendChild(btnAnterior);
  container.appendChild(fechaDiv);
  container.appendChild(btnSiguiente);
  
  return container;
}

// ==================== RESUMEN CIRCULAR ====================
function crearResumenCircular(registros) {
  const container = document.createElement('div');
  container.style.cssText = `
    background: var(--bg-card);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 12px;
    box-shadow: var(--shadow-sm);
    text-align: center;
  `;
  
  const totales = calcularTotales(registros);
  const consumidas = totales.calorias;
  const meta = METAS_DIARIAS.calorias;
  const restantes = Math.max(0, meta - consumidas);
  const porcentaje = Math.min(100, (consumidas / meta) * 100);
  
  // Círculo SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '180');
  svg.setAttribute('height', '180');
  svg.style.transform = 'rotate(-90deg)';
  svg.style.margin = '0 auto 20px';
  svg.style.display = 'block';
  
  const circleBack = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleBack.setAttribute('cx', '90');
  circleBack.setAttribute('cy', '90');
  circleBack.setAttribute('r', '75');
  circleBack.setAttribute('fill', 'none');
  circleBack.setAttribute('stroke', '#E8E8E8');
  circleBack.setAttribute('stroke-width', '12');
  
  const circleProg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleProg.setAttribute('cx', '90');
  circleProg.setAttribute('cy', '90');
  circleProg.setAttribute('r', '75');
  circleProg.setAttribute('fill', 'none');
  circleProg.setAttribute('stroke', '#3DD598');
  circleProg.setAttribute('stroke-width', '12');
  circleProg.setAttribute('stroke-linecap', 'round');
  const circumference = 2 * Math.PI * 75;
  circleProg.setAttribute('stroke-dasharray', circumference);
  circleProg.setAttribute('stroke-dashoffset', circumference - (circumference * porcentaje / 100));
  
  svg.appendChild(circleBack);
  svg.appendChild(circleProg);
  
  // Texto central
  const textoDiv = document.createElement('div');
  textoDiv.style.cssText = 'margin-top: -120px; margin-bottom: 100px;';
  textoDiv.innerHTML = `
    <div style="font-size: 2.5rem; font-weight: 900; color: var(--text-primary);">${Math.round(restantes)}</div>
    <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; margin-top: 4px;">kcal restantes</div>
  `;
  
  // Resumen
  const resumen = document.createElement('div');
  resumen.style.cssText = 'display: flex; gap: 24px; justify-content: center; font-size: 0.85rem;';
  resumen.innerHTML = `
    <div style="text-align: center;">
      <div style="color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Consumido</div>
      <div style="color: var(--primary-mint); font-weight: 700; font-size: 1.1rem;">${Math.round(consumidas)}</div>
    </div>
    <div style="text-align: center;">
      <div style="color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Objetivo</div>
      <div style="color: var(--text-primary); font-weight: 700; font-size: 1.1rem;">${meta}</div>
    </div>
  `;
  
  container.appendChild(svg);
  container.appendChild(textoDiv);
  container.appendChild(resumen);
  
  return container;
}

// ==================== MACROS ====================
function crearMacros(registros) {
  const container = document.createElement('div');
  container.style.cssText = `
    background: var(--bg-card);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: var(--shadow-sm);
  `;
  
  const totales = calcularTotales(registros);
  
  const macros = [
    { nombre: 'Proteínas', valor: totales.proteinas, meta: METAS_DIARIAS.proteinas, color: '#FF6B6B', icono: '💪' },
    { nombre: 'Carbohidratos', valor: totales.carbohidratos, meta: METAS_DIARIAS.carbohidratos, color: '#4FC3F7', icono: '🍞' },
    { nombre: 'Grasas', valor: totales.grasas, meta: METAS_DIARIAS.grasas, color: '#FFB74D', icono: '🥑' }
  ];
  
  macros.forEach((macro, i) => {
    const div = document.createElement('div');
    div.style.marginBottom = i < 2 ? '16px' : '0';
    
    const porcentaje = Math.min(100, (macro.valor / macro.meta) * 100);
    
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div>
          <span style="margin-right: 6px;">${macro.icono}</span>
          <span style="font-weight: 600; font-size: 0.9rem;">${macro.nombre}</span>
        </div>
        <div style="font-size: 0.85rem; font-weight: 700;">
          <span style="color: ${macro.color};">${Math.round(macro.valor)}</span>
          <span style="color: var(--text-light);"> / ${macro.meta}g</span>
        </div>
      </div>
      <div style="width: 100%; height: 8px; background: #E8E8E8; border-radius: 4px; overflow: hidden;">
        <div style="width: ${porcentaje}%; height: 100%; background: ${macro.color}; border-radius: 4px; transition: width 0.5s ease;"></div>
      </div>
    `;
    
    container.appendChild(div);
  });
  
  return container;
}

// ==================== COMIDAS ====================
function crearComidas(registros, nivel, contenido, subHeader) {
  const section = document.createElement('div');
  section.style.marginBottom = '12px';
  
  TIPOS_COMIDA.forEach(tipo => {
    const registrosTipo = registros.filter(r => r.tipoComida === tipo.id);
    const totalesTipo = calcularTotales(registrosTipo);
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--bg-card);
      border-radius: 12px;
      margin-bottom: 8px;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(90deg, ${tipo.color}15 0%, transparent 100%);
      border-left: 4px solid ${tipo.color};
    `;
    
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.3rem;">${tipo.icono}</span>
        <span style="font-weight: 700; font-size: 0.95rem;">${tipo.nombre}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: 700; color: ${tipo.color}; font-size: 0.9rem;">${Math.round(totalesTipo.calorias)} kcal</span>
      </div>
    `;
    
    // Botón añadir
    const btnAdd = document.createElement('button');
    btnAdd.innerHTML = '+';
    btnAdd.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: ${tipo.color};
      color: white;
      font-size: 1.2rem;
      font-weight: 700;
      cursor: pointer;
      margin-left: 12px;
    `;
    btnAdd.onclick = () => mostrarBuscador(nivel, contenido, subHeader, tipo.id);
    
    header.querySelector('div:last-child').appendChild(btnAdd);
    
    // Lista de alimentos
    if (registrosTipo.length > 0) {
      const lista = document.createElement('div');
      lista.style.padding = '0 16px 12px 16px';
      
      registrosTipo.forEach(reg => {
        const item = document.createElement('div');
        item.style.cssText = `
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--bg-main);
        `;
        
        item.innerHTML = `
          <div>
            <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">${reg.nombre}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${reg.cantidad}g • ${Math.round(reg.calorias)} kcal</div>
          </div>
          <button onclick="eliminarAlimento(${nivel.hijos.indexOf(reg)})" style="
            background: transparent;
            border: none;
            font-size: 1.1rem;
            cursor: pointer;
            color: var(--text-secondary);
          ">×</button>
        `;
        
        lista.appendChild(item);
      });
      
      card.appendChild(header);
      card.appendChild(lista);
    } else {
      card.appendChild(header);
    }
    
    section.appendChild(card);
  });
  
  return section;
}

// ==================== BUSCADOR (SIMPLIFICADO) ====================
function mostrarBuscador(nivel, contenido, subHeader, tipoComida) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const contenidoModal = document.createElement('div');
  contenidoModal.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
  `;
  
  contenidoModal.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: var(--primary-mint);">Añadir Alimento</h3>
    <input type="text" id="nombreAlimento" placeholder="Nombre (ej: Pollo)" style="
      width: 100%;
      padding: 12px;
      margin-bottom: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 1rem;
    ">
    <input type="number" id="cantidadAlimento" placeholder="Cantidad (gramos)" style="
      width: 100%;
      padding: 12px;
      margin-bottom: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 1rem;
    ">
    <input type="number" id="caloriasAlimento" placeholder="Calorías totales" style="
      width: 100%;
      padding: 12px;
      margin-bottom: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 1rem;
    ">
    <div style="display: flex; gap: 8px;">
      <button id="btnCancelar" style="
        flex: 1;
        padding: 12px;
        background: var(--bg-main);
        border: none;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
      ">Cancelar</button>
      <button id="btnAñadir" style="
        flex: 1;
        padding: 12px;
        background: var(--primary-mint);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
      ">Añadir</button>
    </div>
  `;
  
  modal.appendChild(contenidoModal);
  document.body.appendChild(modal);
  
  document.getElementById('btnCancelar').onclick = () => modal.remove();
  document.getElementById('btnAñadir').onclick = () => {
    const nombre = document.getElementById('nombreAlimento').value;
    const cantidad = parseInt(document.getElementById('cantidadAlimento').value);
    const calorias = parseInt(document.getElementById('caloriasAlimento').value);
    
    if (nombre && cantidad && calorias) {
      nivel.hijos.push({
        fecha: fechaSeleccionada,
        nombre,
        cantidad,
        calorias,
        proteinas: Math.round(calorias * 0.3 / 4), // Estimación
        carbohidratos: Math.round(calorias * 0.4 / 4),
        grasas: Math.round(calorias * 0.3 / 9),
        tipoComida
      });
      
      if (typeof window.guardarDatos === 'function') window.guardarDatos();
      modal.remove();
      renderizarNutricion(nivel, contenido, subHeader);
    }
  };
}

// ==================== HELPERS ====================
function calcularTotales(registros) {
  return registros.reduce((acc, r) => ({
    calorias: acc.calorias + (parseFloat(r.calorias) || 0),
    proteinas: acc.proteinas + (parseFloat(r.proteinas) || 0),
    carbohidratos: acc.carbohidratos + (parseFloat(r.carbohidratos) || 0),
    grasas: acc.grasas + (parseFloat(r.grasas) || 0)
  }), { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });
}

function añadirDatosPrueba(nivel) {
  const hoy = new Date().toISOString().split('T')[0];
  
  const ejemplos = [
    { nombre: 'Pollo a la plancha', cantidad: 150, calorias: 248, proteinas: 47, carbohidratos: 0, grasas: 5, tipoComida: 'almuerzo' },
    { nombre: 'Arroz blanco', cantidad: 100, calorias: 130, proteinas: 3, carbohidratos: 28, grasas: 0, tipoComida: 'almuerzo' },
    { nombre: 'Plátano', cantidad: 120, calorias: 105, proteinas: 1, carbohidratos: 27, grasas: 0, tipoComida: 'snacks' },
    { nombre: 'Avena', cantidad: 50, calorias: 190, proteinas: 7, carbohidratos: 33, grasas: 3, tipoComida: 'desayuno' }
  ];
  
  ejemplos.forEach(ej => {
    nivel.hijos.push({ ...ej, fecha: hoy });
  });
  
  if (typeof window.guardarDatos === 'function') window.guardarDatos();
}

// Función global para eliminar
window.eliminarAlimento = function(index) {
  if (confirm('¿Eliminar este alimento?')) {
    const nivel = window.datos[3];
    nivel.hijos.splice(index, 1);
    if (typeof window.guardarDatos === 'function') window.guardarDatos();
    const contenido = document.getElementById('contenido');
    const subHeader = document.getElementById('subHeader');
    renderizarNutricion(nivel, contenido, subHeader);
  }
};
