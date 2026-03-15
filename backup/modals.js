// Función auxiliar: resetea todas las series a no completadas (completada = false)
function resetCompletadas(nodo) {
  if (!nodo) return;
  // Si es array, recorrer
  if (Array.isArray(nodo)) {
    nodo.forEach(n => resetCompletadas(n));
    return;
  }
  // nodo es objeto: mirar series e hijos
  if (Array.isArray(nodo.series)) {
    nodo.series.forEach(s => { s.completada = false; });
  }
  if (Array.isArray(nodo.hijos)) {
    nodo.hijos.forEach(h => resetCompletadas(h));
  }
}

// Muestra el menú de opciones (Editar, Eliminar, Copiar) como modal flotante
// ============================================================
//  PARCHE — modals.js
//  Reemplaza la función mostrarMenuOpciones COMPLETA
//  (desde "export function mostrarMenuOpciones" hasta su "}")
// ============================================================

// ============================================================
//  PARCHE — modals.js
//
//  Reemplaza la función mostrarMenuOpciones COMPLETA.
//  Busca desde:
//    // Muestra el menú de opciones (Editar, Eliminar, Copiar) como modal flotante
//    export function mostrarMenuOpciones
//  hasta su llave de cierre final "}"
//  y sustituye TODO por este bloque.
// ============================================================

// Muestra el menú de opciones (Editar, Eliminar, Copiar) como modal flotante
export function mostrarMenuOpciones({ anchorElement, onEditar, onEliminar, onCopiar }) {
  // Limpiar instancias anteriores
  document.getElementById('modalMenuOpciones')?.remove();
  document.getElementById('menuOpcionesOverlay')?.remove();

  // ── Overlay transparente ─────────────────────────────────
  // Ocupa toda la pantalla por debajo del menú.
  // Al hacer click fuera, el overlay lo consume → el item de
  // debajo NO recibe el evento → hace falta un 2º tap para navegar.
  const overlay = document.createElement('div');
  overlay.id = 'menuOpcionesOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    z-index: 999;
    background: transparent;
  `;
  const closeAll = () => {
    overlay.remove();
    menu.remove();
  };
  overlay.addEventListener('click', closeAll);
  overlay.addEventListener('touchstart', (e) => {
    e.preventDefault();
    closeAll();
  }, { passive: false });
  document.body.appendChild(overlay);

  // ── Menú ─────────────────────────────────────────────────
  const menu = document.createElement('div');
  menu.id = 'modalMenuOpciones';
  menu.className = 'menu-opciones';
  menu.style.cssText = `
    position: fixed;
    z-index: 1000;
    visibility: hidden;
  `;
  document.body.appendChild(menu);

  // Estilos comunes para botones
  const btnStyle = {
    display: 'block', width: '100%', height: '40px',
    border: 'none', background: 'none',
    padding: '8px 16px', margin: '0', textAlign: 'left',
    cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500',
    color: '#000',
  };

  const addBtn = (label, color, handler) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, btnStyle);
    if (color) btn.style.color = color;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--bg-main, #F5F9F7)';
      btn.style.color = color || 'var(--primary-mint, #3DD598)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'none';
      btn.style.color = color || '#000';
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAll();
      if (handler) handler();
    });
    menu.appendChild(btn);
  };

  addBtn('Editar',   null,      onEditar);
  addBtn('Copiar',   null,      async () => {
    if (!onCopiar) return;
    try {
      const ret = onCopiar();
      const resolved = (ret && typeof ret.then === 'function') ? await ret : ret;
      let resultado = resolved || window.itemCopiado || null;
      if (!resultado) return;
      let datosCopiados = resultado.datos || resultado;
      if (!datosCopiados) return;
      resetCompletadas(datosCopiados);
      if (resultado.datos) {
        resultado.datos = datosCopiados;
        window.itemCopiado = resultado;
      } else {
        const nivelPrev = window.itemCopiado ? window.itemCopiado.nivel : undefined;
        window.itemCopiado = { nivel: nivelPrev, datos: datosCopiados };
      }
    } catch (err) {
      console.error('Error en onCopiar:', err);
    }
  });

  // Separador visual
  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px; background:var(--border-color,#E8E8E8); margin:2px 0;';
  menu.appendChild(sep);

  addBtn('Eliminar', '#e74c3c', onEliminar);

  // ── Posicionamiento inteligente ──────────────────────────
  if (anchorElement) {
    const rect   = anchorElement.getBoundingClientRect();
    const menuH  = menu.offsetHeight;
    const menuW  = menu.offsetWidth;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;
    const margin = 6;

    // Vertical: abajo si cabe, si no → arriba
    let top;
    if (rect.bottom + menuH + margin <= vh) {
      top = rect.bottom;
    } else {
      top = rect.top - menuH;
      if (top < margin) top = margin;
    }

    // Horizontal: alinear borde derecho con el botón
    let left = rect.right - menuW;
    if (left < margin) left = margin;
    if (left + menuW > vw - margin) left = vw - menuW - margin;

    menu.style.top  = top  + 'px';
    menu.style.left = left + 'px';
  } else {
    menu.style.top   = '40px';
    menu.style.right = '10px';
  }

  menu.style.visibility = 'visible';
}


// modals.js
export function mostrarSelectorMarca(serie, index, onSelect) {
  let anterior = document.getElementById('modalSelector');
  if (anterior) anterior.remove();

  const modal = document.createElement('div');
  modal.id = 'modalSelector';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '99999';

  const caja = document.createElement('div');
  caja.style.background = '#fff';
  caja.style.padding = '1em';
  caja.style.borderRadius = '10px';

  // ✅ Primero la opción con el número de la serie
  const opciones = [
    { inicial: (index + 1).toString(), texto: `Serie ${index + 1}` },
    { inicial: 'W', texto: 'Serie de calentamiento' },
    { inicial: 'D', texto: 'Dropset' },
    { inicial: 'R', texto: 'Rest pause' },
    { inicial: 'F', texto: 'Serie fallada' }
  ];

  opciones.forEach(op => {
    const b = document.createElement('button');
    b.textContent = `${op.inicial} - ${op.texto}`;
    b.style.margin = '0.5em';
    b.onclick = (e) => {
      e.stopPropagation();
      // Guardamos solo la inicial o número
      serie.marca = op.inicial;
      modal.remove();
      if (onSelect) onSelect(serie, index);
    };
    caja.appendChild(b);
  });

  // ✅ Botón cancelar genérico
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.margin = '0.5em';
  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
  };
  caja.appendChild(cancelBtn);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}

export function mostrarConfirmacion(mensaje, onConfirm, onCancel = null, textoConfirm = 'Sí', textoCancel = 'No') {
  let anterior = document.getElementById('modalConfirmacion');
  if (anterior) anterior.remove();

  const modal = document.createElement('div');
  modal.id = 'modalConfirmacion';
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

  const texto = document.createElement('p');
  texto.textContent = mensaje;
  texto.style.marginBottom = '1em';
  texto.style.textAlign = 'center';
  caja.appendChild(texto);

  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '1em';

  const btnSi = document.createElement('button');
  btnSi.textContent = textoConfirm;
  btnSi.onclick = () => {
    modal.remove();
    if (onConfirm) onConfirm();
  };

  const btnNo = document.createElement('button');
  btnNo.textContent = textoCancel;
  btnNo.onclick = () => {
    modal.remove();
    if (onCancel) onCancel();
  };

  botones.appendChild(btnSi);
  botones.appendChild(btnNo);
  caja.appendChild(botones);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}

