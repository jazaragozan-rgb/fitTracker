// nutricion.js
// Sistema de seguimiento nutricional

export function renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual) {
  // Limpiar subheader
  subHeader.innerHTML = '';
  
  // Estado de la fecha actual (guardado en sessionStorage para persistir)
  let fechaActualNutricion = sessionStorage.getItem('nutricionFecha') || new Date().toISOString().slice(0, 10);
  
  // ===== ESTRUCTURA DEL SUBHEADER =====
  const subHeaderContent = document.createElement('div');
  subHeaderContent.style.display = 'flex';
  subHeaderContent.style.flexDirection = 'column';
  subHeaderContent.style.gap = '6px';
  subHeaderContent.style.width = '100%';
  subHeaderContent.style.padding = '6px 12px 4px 12px';
  
  // Título
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  h2Nivel.textContent = 'Nutrición';
  h2Nivel.style.margin = '0';
  h2Nivel.style.fontSize = '0.95rem';
  h2Nivel.style.fontWeight = '700';
  h2Nivel.style.color = 'var(--primary-mint)';
  h2Nivel.style.textTransform = 'uppercase';
  h2Nivel.style.letterSpacing = '0.5px';
  h2Nivel.style.textAlign = 'center';
  subHeaderContent.appendChild(h2Nivel);
  
  // Navegación de fechas
  const navegacionFechas = document.createElement('div');
  navegacionFechas.style.display = 'flex';
  navegacionFechas.style.justifyContent = 'space-between';
  navegacionFechas.style.alignItems = 'center';
  navegacionFechas.style.gap = '8px';
  
  const btnAnterior = document.createElement('button');
  btnAnterior.textContent = '◀';
  btnAnterior.className = 'header-btn';
  btnAnterior.style.width = '36px';
  btnAnterior.style.height = '36px';
  btnAnterior.style.padding = '0';
  btnAnterior.style.fontSize = '0.85rem';
  
  const fechaInput = document.createElement('input');
  fechaInput.type = 'date';
  fechaInput.value = fechaActualNutricion;
  fechaInput.style.flex = '1';
  fechaInput.style.padding = '6px 10px';
  fechaInput.style.border = '1px solid var(--border-color)';
  fechaInput.style.borderRadius = '8px';
  fechaInput.style.fontSize = '0.85rem';
  fechaInput.style.fontWeight = '600';
  fechaInput.style.color = 'var(--primary-mint)';
  fechaInput.style.textAlign = 'center';
  fechaInput.style.background = 'var(--bg-card)';
  fechaInput.style.height = '36px';
  
  const btnSiguiente = document.createElement('button');
  btnSiguiente.textContent = '▶';
  btnSiguiente.className = 'header-btn';
  btnSiguiente.style.width = '36px';
  btnSiguiente.style.height = '36px';
  btnSiguiente.style.padding = '0';
  btnSiguiente.style.fontSize = '0.85rem';
  
  // ===== EVENTOS DE NAVEGACIÓN (CORREGIDOS Y PERMITIENDO FUTURO) =====
  btnAnterior.addEventListener('click', () => {
    const fechaActual = new Date(fechaActualNutricion + 'T00:00:00');
    fechaActual.setDate(fechaActual.getDate() - 1);
    fechaActualNutricion = fechaActual.toISOString().slice(0, 10);
    sessionStorage.setItem('nutricionFecha', fechaActualNutricion);
    fechaInput.value = fechaActualNutricion;
    renderizarContenidoNutricion();
  });
  
  btnSiguiente.addEventListener('click', () => {
    const fechaActual = new Date(fechaActualNutricion + 'T00:00:00');
    fechaActual.setDate(fechaActual.getDate() + 1);
    fechaActualNutricion = fechaActual.toISOString().slice(0, 10);
    sessionStorage.setItem('nutricionFecha', fechaActualNutricion);
    fechaInput.value = fechaActualNutricion;
    renderizarContenidoNutricion();
  });
  
  fechaInput.addEventListener('change', (e) => {
    fechaActualNutricion = e.target.value;
    sessionStorage.setItem('nutricionFecha', fechaActualNutricion);
    renderizarContenidoNutricion();
  });
  
  navegacionFechas.appendChild(btnAnterior);
  navegacionFechas.appendChild(fechaInput);
  navegacionFechas.appendChild(btnSiguiente);
  subHeaderContent.appendChild(navegacionFechas);
  
  subHeader.appendChild(subHeaderContent);
  
  // Limpiar contenido
  contenido.innerHTML = '';
  contenido.style.padding = '12px';
  contenido.style.paddingBottom = '75px';
  
  // Función para renderizar el contenido según la fecha
  function renderizarContenidoNutricion() {
    contenido.innerHTML = '';
    
    // Buscar datos de nutrición para esta fecha
    const registroDelDia = nivel.hijos?.find(r => r.fecha === fechaActualNutricion);
    
    // ==================== CARD: RESUMEN DEL DÍA (MÁS COMPACTO) ====================
    const resumenCard = document.createElement('div');
    resumenCard.style.background = 'linear-gradient(135deg, var(--primary-mint) 0%, var(--mint-light) 100%)';
    resumenCard.style.padding = '14px';
    resumenCard.style.borderRadius = '12px';
    resumenCard.style.marginBottom = '12px';
    resumenCard.style.color = '#fff';
    resumenCard.style.boxShadow = 'var(--shadow-md)';
    
    const caloriasTotales = registroDelDia?.comidas?.reduce((sum, c) => sum + (parseFloat(c.calorias) || 0), 0) || 0;
    const proteinasTotales = registroDelDia?.comidas?.reduce((sum, c) => sum + (parseFloat(c.proteinas) || 0), 0) || 0;
    const carbohidratosTotales = registroDelDia?.comidas?.reduce((sum, c) => sum + (parseFloat(c.carbohidratos) || 0), 0) || 0;
    const grasasTotales = registroDelDia?.comidas?.reduce((sum, c) => sum + (parseFloat(c.grasas) || 0), 0) || 0;
    
    const fechaMostrar = new Date(fechaActualNutricion + 'T00:00:00');
    const fechaFormateada = fechaMostrar.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    resumenCard.innerHTML = `
      <div style="text-align: center; margin-bottom: 10px;">
        <div style="font-size: 0.75rem; opacity: 0.9; text-transform: capitalize; margin-bottom: 2px;">
          ${fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)}
        </div>
        <div style="font-size: 2rem; font-weight: 900; line-height: 1;">
          ${Math.round(caloriasTotales)}
        </div>
        <div style="font-size: 0.7rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">
          Calorías totales
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
        <div style="background: rgba(255,255,255,0.2); padding: 6px; border-radius: 8px; text-align: center; backdrop-filter: blur(10px);">
          <div style="font-size: 1.1rem; font-weight: 700;">${Math.round(proteinasTotales)}g</div>
          <div style="font-size: 0.6rem; opacity: 0.9; text-transform: uppercase; margin-top: 1px;">Proteína</div>
        </div>
        <div style="background: rgba(255,255,255,0.2); padding: 6px; border-radius: 8px; text-align: center; backdrop-filter: blur(10px);">
          <div style="font-size: 1.1rem; font-weight: 700;">${Math.round(carbohidratosTotales)}g</div>
          <div style="font-size: 0.6rem; opacity: 0.9; text-transform: uppercase; margin-top: 1px;">Carbohidratos</div>
        </div>
        <div style="background: rgba(255,255,255,0.2); padding: 6px; border-radius: 8px; text-align: center; backdrop-filter: blur(10px);">
          <div style="font-size: 1.1rem; font-weight: 700;">${Math.round(grasasTotales)}g</div>
          <div style="font-size: 0.6rem; opacity: 0.9; text-transform: uppercase; margin-top: 1px;">Grasas</div>
        </div>
      </div>
    `;
    
    contenido.appendChild(resumenCard);
    
    // ==================== BOTÓN AÑADIR COMIDA (MÁS COMPACTO) ====================
    const btnAñadirComida = document.createElement('button');
    btnAñadirComida.textContent = '+ Añadir comida';
    btnAñadirComida.style.width = '100%';
    btnAñadirComida.style.padding = '10px';
    btnAñadirComida.style.marginBottom = '12px';
    btnAñadirComida.style.background = 'var(--primary-mint)';
    btnAñadirComida.style.color = 'white';
    btnAñadirComida.style.border = 'none';
    btnAñadirComida.style.borderRadius = '10px';
    btnAñadirComida.style.fontSize = '0.9rem';
    btnAñadirComida.style.fontWeight = '700';
    btnAñadirComida.style.cursor = 'pointer';
    btnAñadirComida.style.transition = 'all 0.2s ease';
    btnAñadirComida.style.textTransform = 'uppercase';
    btnAñadirComida.style.letterSpacing = '0.5px';
    btnAñadirComida.style.boxShadow = 'var(--shadow-sm)';
    
    btnAñadirComida.addEventListener('mouseenter', () => {
      btnAñadirComida.style.background = 'var(--mint-light)';
      btnAñadirComida.style.transform = 'translateY(-1px)';
      btnAñadirComida.style.boxShadow = 'var(--shadow-md)';
    });
    
    btnAñadirComida.addEventListener('mouseleave', () => {
      btnAñadirComida.style.background = 'var(--primary-mint)';
      btnAñadirComida.style.transform = 'translateY(0)';
      btnAñadirComida.style.boxShadow = 'var(--shadow-sm)';
    });
    
    btnAñadirComida.addEventListener('click', () => {
      mostrarModalAñadirComida(fechaActualNutricion, nivel, renderizarContenidoNutricion);
    });
    
    contenido.appendChild(btnAñadirComida);
    
    // ==================== LISTA DE COMIDAS ====================
    if (!registroDelDia || !registroDelDia.comidas || registroDelDia.comidas.length === 0) {
      const sinComidas = document.createElement('div');
      sinComidas.style.textAlign = 'center';
      sinComidas.style.padding = '30px 20px';
      sinComidas.style.background = 'var(--bg-card)';
      sinComidas.style.borderRadius = '12px';
      sinComidas.style.color = 'var(--text-light)';
      sinComidas.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 8px; opacity: 0.3;">🍽️</div>
        <div style="font-size: 0.95rem; font-weight: 600;">Sin comidas registradas</div>
        <div style="font-size: 0.8rem; margin-top: 6px;">Añade tu primera comida del día</div>
      `;
      contenido.appendChild(sinComidas);
    } else {
      const listaComidas = document.createElement('div');
      listaComidas.style.display = 'flex';
      listaComidas.style.flexDirection = 'column';
      listaComidas.style.gap = '10px';
      
      registroDelDia.comidas.forEach((comida, index) => {
        const comidaCard = crearCardComida(comida, index, registroDelDia, nivel, renderizarContenidoNutricion);
        listaComidas.appendChild(comidaCard);
      });
      
      contenido.appendChild(listaComidas);
    }
  }
  
  // Renderizar contenido inicial
  renderizarContenidoNutricion();
}

// ==================== CARD: COMIDA (MÁS COMPACTO) ====================
function crearCardComida(comida, index, registroDelDia, nivel, renderizarCallback) {
  const card = document.createElement('div');
  card.style.background = 'var(--bg-card)';
  card.style.padding = '12px';
  card.style.borderRadius = '10px';
  card.style.boxShadow = 'var(--shadow-sm)';
  card.style.transition = 'all 0.2s ease';
  card.style.border = '1px solid transparent';
  
  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = 'var(--shadow-md)';
    card.style.borderColor = 'var(--border-color)';
    card.style.transform = 'translateY(-1px)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = 'var(--shadow-sm)';
    card.style.borderColor = 'transparent';
    card.style.transform = 'translateY(0)';
  });
  
  // Header de la comida
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '10px';
  
  const nombre = document.createElement('h3');
  nombre.textContent = comida.nombre || 'Sin nombre';
  nombre.style.margin = '0';
  nombre.style.fontSize = '1rem';
  nombre.style.fontWeight = '700';
  nombre.style.color = 'var(--text-primary)';
  
  const btnEliminar = document.createElement('button');
  btnEliminar.textContent = '🗑️';
  btnEliminar.style.background = 'transparent';
  btnEliminar.style.border = 'none';
  btnEliminar.style.fontSize = '1rem';
  btnEliminar.style.cursor = 'pointer';
  btnEliminar.style.padding = '6px';
  btnEliminar.style.borderRadius = '6px';
  btnEliminar.style.transition = 'all 0.2s ease';
  
  btnEliminar.addEventListener('mouseenter', () => {
    btnEliminar.style.background = 'rgba(255, 107, 107, 0.1)';
  });
  
  btnEliminar.addEventListener('mouseleave', () => {
    btnEliminar.style.background = 'transparent';
  });
  
  btnEliminar.addEventListener('click', () => {
    if (confirm(`¿Eliminar "${comida.nombre}"?`)) {
      registroDelDia.comidas.splice(index, 1);
      if (typeof window.guardarDatos === 'function') {
        window.guardarDatos();
      }
      renderizarCallback();
    }
  });
  
  header.appendChild(nombre);
  header.appendChild(btnEliminar);
  card.appendChild(header);
  
  // Macros (más compacto)
  const macrosGrid = document.createElement('div');
  macrosGrid.style.display = 'grid';
  macrosGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  macrosGrid.style.gap = '6px';
  macrosGrid.style.marginBottom = '6px';
  
  const macros = [
    { label: 'Calorías', value: comida.calorias, unidad: 'kcal', color: 'var(--primary-coral)' },
    { label: 'Proteína', value: comida.proteinas, unidad: 'g', color: 'var(--primary-mint)' },
    { label: 'Carbohidratos', value: comida.carbohidratos, unidad: 'g', color: 'var(--secondary-cyan)' },
    { label: 'Grasas', value: comida.grasas, unidad: 'g', color: '#FFA500' }
  ];
  
  macros.forEach(macro => {
    const macroDiv = document.createElement('div');
    macroDiv.style.background = 'var(--bg-main)';
    macroDiv.style.padding = '8px';
    macroDiv.style.borderRadius = '8px';
    macroDiv.style.textAlign = 'center';
    
    macroDiv.innerHTML = `
      <div style="font-size: 1.1rem; font-weight: 700; color: ${macro.color};">
        ${macro.value || 0}<span style="font-size: 0.75rem; font-weight: 500;">${macro.unidad}</span>
      </div>
      <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; margin-top: 2px;">
        ${macro.label}
      </div>
    `;
    
    macrosGrid.appendChild(macroDiv);
  });
  
  card.appendChild(macrosGrid);
  
  // Notas (si existen) - más compacto
  if (comida.notas && comida.notas.trim() !== '') {
    const notasDiv = document.createElement('div');
    notasDiv.style.marginTop = '6px';
    notasDiv.style.padding = '8px';
    notasDiv.style.background = 'var(--bg-main)';
    notasDiv.style.borderRadius = '6px';
    notasDiv.style.fontSize = '0.8rem';
    notasDiv.style.color = 'var(--text-secondary)';
    notasDiv.style.borderLeft = '3px solid var(--primary-mint)';
    notasDiv.textContent = comida.notas;
    card.appendChild(notasDiv);
  }
  
  return card;
}

// ==================== MODAL: AÑADIR COMIDA (MÁS COMPACTO) ====================
function mostrarModalAñadirComida(fecha, nivel, renderizarCallback) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0, 0, 0, 0.5)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.style.backdropFilter = 'blur(4px)';
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  const modal = document.createElement('div');
  modal.style.background = '#fff';
  modal.style.padding = '20px';
  modal.style.borderRadius = '16px';
  modal.style.maxWidth = '90%';
  modal.style.width = '400px';
  modal.style.boxShadow = 'var(--shadow-lg)';
  modal.style.maxHeight = '85vh';
  modal.style.overflowY = 'auto';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Añadir comida';
  titulo.style.fontSize = '1.2rem';
  titulo.style.fontWeight = '700';
  titulo.style.color = 'var(--text-primary)';
  titulo.style.marginBottom = '16px';
  modal.appendChild(titulo);
  
  // Formulario
  const form = document.createElement('div');
  form.style.display = 'flex';
  form.style.flexDirection = 'column';
  form.style.gap = '12px';
  
  const inputs = {};
  
  const campos = [
    { id: 'nombre', label: 'Nombre de la comida', type: 'text', placeholder: 'Ej: Desayuno' },
    { id: 'calorias', label: 'Calorías', type: 'number', placeholder: '0', step: '1' },
    { id: 'proteinas', label: 'Proteína (g)', type: 'number', placeholder: '0', step: '0.1' },
    { id: 'carbohidratos', label: 'Carbohidratos (g)', type: 'number', placeholder: '0', step: '0.1' },
    { id: 'grasas', label: 'Grasas (g)', type: 'number', placeholder: '0', step: '0.1' }
  ];
  
  campos.forEach(campo => {
    const container = document.createElement('div');
    
    const label = document.createElement('label');
    label.textContent = campo.label;
    label.style.fontSize = '0.8rem';
    label.style.fontWeight = '600';
    label.style.color = 'var(--text-secondary)';
    label.style.marginBottom = '4px';
    label.style.display = 'block';
    container.appendChild(label);
    
    const input = document.createElement('input');
    input.type = campo.type;
    input.placeholder = campo.placeholder;
    if (campo.step) input.step = campo.step;
    input.style.width = '100%';
    input.style.padding = '10px';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = '8px';
    input.style.fontSize = '0.95rem';
    input.style.transition = 'all 0.2s ease';
    
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--primary-mint)';
      input.style.outline = 'none';
      input.style.boxShadow = '0 0 0 3px rgba(61, 213, 152, 0.1)';
    });
    
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--border-color)';
      input.style.boxShadow = 'none';
    });
    
    inputs[campo.id] = input;
    container.appendChild(input);
    form.appendChild(container);
  });
  
  // Notas (textarea) - más compacto
  const notasContainer = document.createElement('div');
  const notasLabel = document.createElement('label');
  notasLabel.textContent = 'Notas (opcional)';
  notasLabel.style.fontSize = '0.8rem';
  notasLabel.style.fontWeight = '600';
  notasLabel.style.color = 'var(--text-secondary)';
  notasLabel.style.marginBottom = '4px';
  notasLabel.style.display = 'block';
  notasContainer.appendChild(notasLabel);
  
  const notasTextarea = document.createElement('textarea');
  notasTextarea.placeholder = 'Añade cualquier nota adicional...';
  notasTextarea.style.width = '100%';
  notasTextarea.style.padding = '10px';
  notasTextarea.style.border = '1px solid var(--border-color)';
  notasTextarea.style.borderRadius = '8px';
  notasTextarea.style.fontSize = '0.95rem';
  notasTextarea.style.minHeight = '60px';
  notasTextarea.style.resize = 'vertical';
  notasTextarea.style.fontFamily = 'inherit';
  notasTextarea.style.transition = 'all 0.2s ease';
  
  notasTextarea.addEventListener('focus', () => {
    notasTextarea.style.borderColor = 'var(--primary-mint)';
    notasTextarea.style.outline = 'none';
    notasTextarea.style.boxShadow = '0 0 0 3px rgba(61, 213, 152, 0.1)';
  });
  
  notasTextarea.addEventListener('blur', () => {
    notasTextarea.style.borderColor = 'var(--border-color)';
    notasTextarea.style.boxShadow = 'none';
  });
  
  notasContainer.appendChild(notasTextarea);
  form.appendChild(notasContainer);
  
  modal.appendChild(form);
  
  // Botones
  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '10px';
  botones.style.marginTop = '16px';
  
  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.flex = '1';
  btnCancelar.style.padding = '11px';
  btnCancelar.style.background = 'var(--bg-main)';
  btnCancelar.style.color = 'var(--text-secondary)';
  btnCancelar.style.border = 'none';
  btnCancelar.style.borderRadius = '8px';
  btnCancelar.style.fontSize = '0.9rem';
  btnCancelar.style.fontWeight = '700';
  btnCancelar.style.cursor = 'pointer';
  btnCancelar.style.transition = 'all 0.2s ease';
  
  btnCancelar.addEventListener('click', () => overlay.remove());
  
  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = 'Guardar';
  btnGuardar.style.flex = '1';
  btnGuardar.style.padding = '11px';
  btnGuardar.style.background = 'var(--primary-mint)';
  btnGuardar.style.color = 'white';
  btnGuardar.style.border = 'none';
  btnGuardar.style.borderRadius = '8px';
  btnGuardar.style.fontSize = '0.9rem';
  btnGuardar.style.fontWeight = '700';
  btnGuardar.style.cursor = 'pointer';
  btnGuardar.style.transition = 'all 0.2s ease';
  
  btnGuardar.addEventListener('click', () => {
    const nombre = inputs.nombre.value.trim();
    if (!nombre) {
      alert('⚠️ Debes ingresar un nombre para la comida');
      inputs.nombre.focus();
      return;
    }
    
    const nuevaComida = {
      nombre: nombre,
      calorias: parseFloat(inputs.calorias.value) || 0,
      proteinas: parseFloat(inputs.proteinas.value) || 0,
      carbohidratos: parseFloat(inputs.carbohidratos.value) || 0,
      grasas: parseFloat(inputs.grasas.value) || 0,
      notas: notasTextarea.value.trim()
    };
    
    // Buscar o crear registro del día
    let registroDelDia = nivel.hijos?.find(r => r.fecha === fecha);
    if (!registroDelDia) {
      if (!nivel.hijos) nivel.hijos = [];
      registroDelDia = {
        fecha: fecha,
        comidas: []
      };
      nivel.hijos.push(registroDelDia);
    }
    
    if (!registroDelDia.comidas) registroDelDia.comidas = [];
    registroDelDia.comidas.push(nuevaComida);
    
    // Guardar datos
    if (typeof window.guardarDatos === 'function') {
      window.guardarDatos();
    }
    
    overlay.remove();
    renderizarCallback();
  });
  
  botones.appendChild(btnCancelar);
  botones.appendChild(btnGuardar);
  modal.appendChild(botones);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Focus automático en el primer input
  setTimeout(() => inputs.nombre.focus(), 100);
}
