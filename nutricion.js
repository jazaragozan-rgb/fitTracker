// nutricion.js - VERSIÓN MINIMALISTA GARANTIZADA
console.log('✅ nutricion.js cargado');

// ==================== CONFIGURACIÓN ====================
const METAS = { calorias: 2000, proteinas: 150, carbohidratos: 250, grasas: 65 };
const TIPOS = [
  { id: 'desayuno', nombre: 'Desayuno', icono: '🌅', color: '#FFB74D' },
  { id: 'almuerzo', nombre: 'Almuerzo', icono: '☀️', color: '#4FC3F7' },
  { id: 'cena', nombre: 'Cena', icono: '🌙', color: '#9575CD' },
  { id: 'snacks', nombre: 'Snacks', icono: '🍎', color: '#81C784' }
];

let fecha = new Date().toISOString().split('T')[0];

// ==================== FUNCIÓN PRINCIPAL ====================
export function renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual) {
  console.log('🍽️ renderizarNutricion llamada', { nivel, fecha });
  
  // CRÍTICO: Asegurar que existe hijos
  if (!nivel.hijos) {
    nivel.hijos = [];
    console.log('⚠️ nivel.hijos no existía, creado como array vacío');
  }
  
  // Limpiar todo
  subHeader.innerHTML = '';
  contenido.innerHTML = '';
  
  // SUBHEADER
  subHeader.innerHTML = `
    <h2 id="tituloNivel" style="display: block;">Nutrición</h2>
    <div id="subHeaderButtons" style="display: flex; justify-content: center; gap: 8px;">
      <button class="header-btn" style="width: 40px;" onclick="alert('Metas - Próximamente')">🎯</button>
    </div>
  `;
  
  // CONTENIDO - Estilos
  contenido.style.padding = '16px';
  contenido.style.paddingBottom = '80px';
  contenido.style.overflowY = 'auto';
  contenido.style.background = 'var(--bg-main)';
  
  // Filtrar registros de hoy
  const registros = nivel.hijos.filter(r => r.fecha === fecha);
  console.log('📊 Registros de hoy:', registros.length);
  
  // Calcular totales
  const totales = registros.reduce((acc, r) => ({
    calorias: acc.calorias + (r.calorias || 0),
    proteinas: acc.proteinas + (r.proteinas || 0),
    carbohidratos: acc.carbohidratos + (r.carbohidratos || 0),
    grasas: acc.grasas + (r.grasas || 0)
  }), { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });
  
  console.log('📈 Totales:', totales);
  
  // ==================== 1. SELECTOR DE FECHA ====================
  const divFecha = document.createElement('div');
  divFecha.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 16px; background: var(--bg-card); border-radius: 12px; box-shadow: var(--shadow-sm);';
  
  const fechaObj = new Date(fecha + 'T00:00:00');
  const hoy = new Date().toISOString().split('T')[0];
  const esHoy = fecha === hoy;
  
  divFecha.innerHTML = `
    <button id="btnAnterior" style="background: transparent; border: none; font-size: 1.3rem; cursor: pointer; padding: 8px;">←</button>
    <div style="flex: 1; text-align: center;">
      <div style="font-size: 1rem; font-weight: 700; color: ${esHoy ? 'var(--primary-mint)' : 'var(--text-primary)'};">
        ${esHoy ? 'Hoy' : fechaObj.toLocaleDateString('es-ES', { weekday: 'long' })}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
        ${fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
      </div>
    </div>
    <button id="btnSiguiente" style="background: transparent; border: none; font-size: 1.3rem; cursor: pointer; padding: 8px;">→</button>
  `;
  contenido.appendChild(divFecha);
  
  // Listeners de fecha
  setTimeout(() => {
    document.getElementById('btnAnterior').onclick = () => {
      const f = new Date(fecha + 'T00:00:00');
      f.setDate(f.getDate() - 1);
      fecha = f.toISOString().split('T')[0];
      renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual);
    };
    document.getElementById('btnSiguiente').onclick = () => {
      const f = new Date(fecha + 'T00:00:00');
      f.setDate(f.getDate() + 1);
      fecha = f.toISOString().split('T')[0];
      renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual);
    };
  }, 100);
  
  // ==================== 2. CÍRCULO DE CALORÍAS ====================
  const divCirculo = document.createElement('div');
  divCirculo.style.cssText = 'background: var(--bg-card); border-radius: 16px; padding: 24px; margin-bottom: 12px; box-shadow: var(--shadow-sm); text-align: center;';
  
  const consumidas = totales.calorias;
  const meta = METAS.calorias;
  const restantes = Math.max(0, meta - consumidas);
  const porcentaje = Math.min(100, (consumidas / meta) * 100);
  
  const svg = `
    <svg width="180" height="180" style="transform: rotate(-90deg); margin: 0 auto 20px; display: block;">
      <circle cx="90" cy="90" r="75" fill="none" stroke="#E8E8E8" stroke-width="12"/>
      <circle cx="90" cy="90" r="75" fill="none" stroke="#3DD598" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${2 * Math.PI * 75}" 
        stroke-dashoffset="${2 * Math.PI * 75 - (2 * Math.PI * 75 * porcentaje / 100)}"/>
    </svg>
  `;
  
  divCirculo.innerHTML = `
    ${svg}
    <div style="margin-top: -120px; margin-bottom: 100px;">
      <div style="font-size: 2.5rem; font-weight: 900; color: var(--text-primary);">${Math.round(restantes)}</div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; margin-top: 4px;">kcal restantes</div>
    </div>
    <div style="display: flex; gap: 24px; justify-content: center; font-size: 0.85rem;">
      <div style="text-align: center;">
        <div style="color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Consumido</div>
        <div style="color: var(--primary-mint); font-weight: 700; font-size: 1.1rem;">${Math.round(consumidas)}</div>
      </div>
      <div style="text-align: center;">
        <div style="color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Objetivo</div>
        <div style="color: var(--text-primary); font-weight: 700; font-size: 1.1rem;">${meta}</div>
      </div>
    </div>
  `;
  contenido.appendChild(divCirculo);
  
  // ==================== 3. MACROS ====================
  const divMacros = document.createElement('div');
  divMacros.style.cssText = 'background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: var(--shadow-sm);';
  
  const macros = [
    { nombre: 'Proteínas', valor: totales.proteinas, meta: METAS.proteinas, color: '#FF6B6B', icono: '💪' },
    { nombre: 'Carbohidratos', valor: totales.carbohidratos, meta: METAS.carbohidratos, color: '#4FC3F7', icono: '🍞' },
    { nombre: 'Grasas', valor: totales.grasas, meta: METAS.grasas, color: '#FFB74D', icono: '🥑' }
  ];
  
  macros.forEach((m, i) => {
    const p = Math.min(100, (m.valor / m.meta) * 100);
    const html = `
      <div style="margin-bottom: ${i < 2 ? '16px' : '0'};">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <div><span style="margin-right: 6px;">${m.icono}</span><span style="font-weight: 600; font-size: 0.9rem;">${m.nombre}</span></div>
          <div style="font-size: 0.85rem; font-weight: 700;">
            <span style="color: ${m.color};">${Math.round(m.valor)}</span>
            <span style="color: var(--text-light);"> / ${m.meta}g</span>
          </div>
        </div>
        <div style="width: 100%; height: 8px; background: #E8E8E8; border-radius: 4px; overflow: hidden;">
          <div style="width: ${p}%; height: 100%; background: ${m.color}; border-radius: 4px; transition: width 0.5s ease;"></div>
        </div>
      </div>
    `;
    divMacros.innerHTML += html;
  });
  contenido.appendChild(divMacros);
  
  // ==================== 4. COMIDAS ====================
  TIPOS.forEach(tipo => {
    const regsTipo = registros.filter(r => r.tipoComida === tipo.id);
    const totTipo = regsTipo.reduce((sum, r) => sum + (r.calorias || 0), 0);
    
    const divTipo = document.createElement('div');
    divTipo.style.cssText = 'background: var(--bg-card); border-radius: 12px; margin-bottom: 8px; box-shadow: var(--shadow-sm); overflow: hidden;';
    
    const header = document.createElement('div');
    header.style.cssText = `padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, ${tipo.color}15 0%, transparent 100%); border-left: 4px solid ${tipo.color};`;
    
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.3rem;">${tipo.icono}</span>
        <span style="font-weight: 700; font-size: 0.95rem;">${tipo.nombre}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: 700; color: ${tipo.color}; font-size: 0.9rem;">${Math.round(totTipo)} kcal</span>
      </div>
    `;
    
    const btnAdd = document.createElement('button');
    btnAdd.innerHTML = '+';
    btnAdd.style.cssText = `width: 28px; height: 28px; border-radius: 50%; border: none; background: ${tipo.color}; color: white; font-size: 1.2rem; font-weight: 700; cursor: pointer;`;
    btnAdd.onclick = () => abrirModal(nivel, contenido, subHeader, addButton, rutaActual, tipo.id);
    header.querySelector('div:last-child').appendChild(btnAdd);
    
    divTipo.appendChild(header);
    
    // Alimentos
    if (regsTipo.length > 0) {
      const lista = document.createElement('div');
      lista.style.padding = '0 16px 12px 16px';
      
      regsTipo.forEach((reg, idx) => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg-main);';
        item.innerHTML = `
          <div>
            <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">${reg.nombre}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${reg.cantidad}g • ${Math.round(reg.calorias)} kcal</div>
          </div>
          <button style="background: transparent; border: none; font-size: 1.1rem; cursor: pointer; color: var(--text-secondary);">×</button>
        `;
        
        item.querySelector('button').onclick = () => {
          if (confirm('¿Eliminar?')) {
            const index = nivel.hijos.indexOf(reg);
            nivel.hijos.splice(index, 1);
            if (window.guardarDatos) window.guardarDatos();
            renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual);
          }
        };
        
        lista.appendChild(item);
      });
      
      divTipo.appendChild(lista);
    }
    
    contenido.appendChild(divTipo);
  });
  
  // ==================== 5. MENSAJE INICIAL ====================
  if (nivel.hijos.length === 0) {
    const ayuda = document.createElement('div');
    ayuda.style.cssText = 'background: rgba(61, 213, 152, 0.1); padding: 20px; border-radius: 12px; margin-top: 20px; border: 2px dashed var(--primary-mint); text-align: center;';
    ayuda.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 12px;">🍽️</div>
      <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1rem;">¡Comienza a registrar!</div>
      <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">
        Click en <strong>+</strong> para añadir alimentos
      </div>
      <button id="btnEjemplo" style="background: var(--primary-mint); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
        📊 Añadir ejemplos
      </button>
    `;
    contenido.appendChild(ayuda);
    
    setTimeout(() => {
      const btn = document.getElementById('btnEjemplo');
      if (btn) {
        btn.onclick = () => {
          // Añadir 4 alimentos de ejemplo
          const ejemplos = [
            { nombre: 'Pollo', cantidad: 150, calorias: 248, proteinas: 47, carbohidratos: 0, grasas: 5, tipoComida: 'almuerzo', fecha },
            { nombre: 'Arroz', cantidad: 100, calorias: 130, proteinas: 3, carbohidratos: 28, grasas: 0, tipoComida: 'almuerzo', fecha },
            { nombre: 'Plátano', cantidad: 120, calorias: 105, proteinas: 1, carbohidratos: 27, grasas: 0, tipoComida: 'snacks', fecha },
            { nombre: 'Avena', cantidad: 50, calorias: 190, proteinas: 7, carbohidratos: 33, grasas: 3, tipoComida: 'desayuno', fecha }
          ];
          nivel.hijos.push(...ejemplos);
          if (window.guardarDatos) window.guardarDatos();
          renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual);
        };
      }
    }, 100);
  }
  
  console.log('✅ Renderizado completo');
}

// ==================== MODAL AÑADIR ====================
function abrirModal(nivel, contenido, subHeader, addButton, rutaActual, tipoComida) {
  console.log('🔍 Abriendo modal para:', tipoComida);
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
  
  const box = document.createElement('div');
  box.style.cssText = 'background: white; border-radius: 16px; padding: 24px; max-width: 400px; width: 90%;';
  
  box.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: var(--primary-mint);">Añadir Alimento</h3>
    <input type="text" id="inp_nombre" placeholder="Nombre (ej: Pollo)" style="width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
    <input type="number" id="inp_cantidad" placeholder="Gramos" style="width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
    <input type="number" id="inp_calorias" placeholder="Calorías" style="width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;">
    <div style="display: flex; gap: 8px;">
      <button id="btn_cancelar" style="flex: 1; padding: 12px; background: #f0f0f0; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Cancelar</button>
      <button id="btn_guardar" style="flex: 1; padding: 12px; background: var(--primary-mint); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Añadir</button>
    </div>
  `;
  
  modal.appendChild(box);
  document.body.appendChild(modal);
  
  document.getElementById('btn_cancelar').onclick = () => modal.remove();
  document.getElementById('btn_guardar').onclick = () => {
    const nombre = document.getElementById('inp_nombre').value;
    const cantidad = parseInt(document.getElementById('inp_cantidad').value);
    const calorias = parseInt(document.getElementById('inp_calorias').value);
    
    if (nombre && cantidad && calorias) {
      nivel.hijos.push({
        fecha,
        nombre,
        cantidad,
        calorias,
        proteinas: Math.round(calorias * 0.3 / 4),
        carbohidratos: Math.round(calorias * 0.4 / 4),
        grasas: Math.round(calorias * 0.3 / 9),
        tipoComida
      });
      
      if (window.guardarDatos) window.guardarDatos();
      modal.remove();
      renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual);
    } else {
      alert('Completa todos los campos');
    }
  };
}
