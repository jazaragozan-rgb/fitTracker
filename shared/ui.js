// ============================================================
// shared/ui.js
// Componentes de UI reutilizables: modales, menús, confirmaciones.
// Reemplaza modals.js — todos los módulos importan desde aquí.
// ============================================================


// ── Helper: resetea series completadas en un nodo recursivo ──
function resetCompletadas(nodo) {
  if (!nodo) return;
  if (Array.isArray(nodo)) { nodo.forEach(resetCompletadas); return; }
  if (Array.isArray(nodo.series)) nodo.series.forEach(s => { s.completada = false; });
  if (Array.isArray(nodo.hijos))  nodo.hijos.forEach(resetCompletadas);
}


// ── Modal de confirmación ─────────────────────────────────────
export function mostrarConfirmacion(
  mensaje, onConfirm, onCancel = null,
  textoConfirm = 'Sí', textoCancel = 'No'
) {
  document.getElementById('modalConfirmacion')?.remove();

  const modal = document.createElement('div');
  modal.id = 'modalConfirmacion';

  const caja = document.createElement('div');
  caja.className = 'modal-confirmacion-caja';

  const texto = document.createElement('p');
  texto.className   = 'modal-confirmacion-texto';
  texto.textContent = mensaje;
  caja.appendChild(texto);

  const botones = document.createElement('div');
  botones.className = 'modal-confirmacion-botones';

  const btnSi = document.createElement('button');
  btnSi.className   = 'btn-confirmacion-si';
  btnSi.textContent = textoConfirm;
  btnSi.onclick = () => { modal.remove(); onConfirm?.(); };

  const btnNo = document.createElement('button');
  btnNo.className   = 'btn-confirmacion-no';
  btnNo.textContent = textoCancel;
  btnNo.onclick = () => { modal.remove(); onCancel?.(); };

  botones.append(btnSi, btnNo);
  caja.appendChild(botones);
  modal.appendChild(caja);
  document.body.appendChild(modal);
}


// ── Menú contextual (Editar / Copiar / Eliminar) ──────────────
export function mostrarMenuOpciones({ anchorElement, onEditar, onEliminar, onCopiar }) {
  document.getElementById('modalMenuOpciones')?.remove();
  document.getElementById('menuOpcionesOverlay')?.remove();

  // Overlay transparente que cierra el menú al tocar fuera
  const overlay = document.createElement('div');
  overlay.id = 'menuOpcionesOverlay';
  const closeAll = () => { overlay.remove(); menu.remove(); };
  overlay.addEventListener('click', closeAll);
  overlay.addEventListener('touchstart', e => { e.preventDefault(); closeAll(); }, { passive: false });
  document.body.appendChild(overlay);

  const menu = document.createElement('div');
  menu.id = 'modalMenuOpciones';
  menu.style.cssText = 'position:fixed;z-index:1000;visibility:hidden;';
  document.body.appendChild(menu);

  const addBtn = (label, color, handler) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (color) btn.style.color = color;
    btn.addEventListener('mouseenter', () => { btn.style.background='rgba(61,213,152,0.08)'; btn.style.color=color||'var(--primary-mint)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background=''; btn.style.color=color||''; });
    btn.addEventListener('click', e => { e.stopPropagation(); closeAll(); handler?.(); });
    menu.appendChild(btn);
  };

  addBtn('Editar', null, onEditar);
  addBtn('Copiar', null, async () => {
    if (!onCopiar) return;
    try {
      const ret      = onCopiar();
      const resolved = (ret && typeof ret.then === 'function') ? await ret : ret;
      let resultado  = resolved || window.itemCopiado || null;
      if (!resultado) return;
      let datosCopiados = resultado.datos || resultado;
      if (!datosCopiados) return;
      resetCompletadas(datosCopiados);
      window.itemCopiado = resultado.datos
        ? { ...resultado, datos: datosCopiados }
        : { nivel: window.itemCopiado?.nivel, datos: datosCopiados };
    } catch (err) { console.error('[ui] Error en onCopiar:', err); }
  });

  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:var(--border-color,#E8E8E8);margin:2px 0;';
  menu.appendChild(sep);
  addBtn('Eliminar', '#e74c3c', onEliminar);

  // Posicionamiento inteligente
  requestAnimationFrame(() => {
    const menuH = menu.offsetHeight, menuW = menu.offsetWidth;
    const vw = window.innerWidth, vh = window.innerHeight, margin = 6;
    let top, left;

    if (anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      top  = rect.bottom + menuH + margin <= vh ? rect.bottom : Math.max(margin, rect.top - menuH);
      left = rect.right - menuW;
    } else {
      top = 40; left = vw - menuW - 10;
    }

    menu.style.top  = Math.max(margin, Math.min(top,  vh - menuH - margin)) + 'px';
    menu.style.left = Math.max(margin, Math.min(left, vw - menuW - margin)) + 'px';
    menu.style.visibility = 'visible';
  });
}


// ── Selector de marca de serie ────────────────────────────────
export function mostrarSelectorMarca(serie, index, onSelect) {
  document.getElementById('modalSelector')?.remove();

  const modal = document.createElement('div');
  modal.id = 'modalSelector';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:99999;';

  const caja = document.createElement('div');
  caja.style.cssText = 'background:#e8edf0;padding:20px;border-radius:16px;display:flex;flex-direction:column;gap:8px;min-width:220px;box-shadow:var(--neu-out-lg);';

  const titulo = document.createElement('p');
  titulo.textContent = 'Tipo de serie';
  titulo.style.cssText = 'font-weight:700;font-size:0.95rem;color:var(--text-primary);margin-bottom:4px;text-align:center;';
  caja.appendChild(titulo);

  [
    { inicial: (index + 1).toString(), texto: `Serie ${index + 1}` },
    { inicial: 'W', texto: 'Serie de calentamiento' },
    { inicial: 'D', texto: 'Dropset' },
    { inicial: 'R', texto: 'Rest pause' },
    { inicial: 'F', texto: 'Serie fallada' }
  ].forEach(op => {
    const b = document.createElement('button');
    b.textContent = `${op.inicial}  —  ${op.texto}`;
    b.style.cssText = 'padding:10px 16px;border-radius:10px;border:none;background:var(--bg-main);font-size:0.875rem;font-weight:600;cursor:pointer;text-align:left;transition:all 0.15s;';
    b.onmouseenter = () => { b.style.background='var(--primary-mint)'; b.style.color='#fff'; };
    b.onmouseleave = () => { b.style.background='var(--bg-main)'; b.style.color=''; };
    b.onclick = e => {
      e.stopPropagation();
      serie.marca = op.inicial;
      modal.remove();
      onSelect?.(serie, index);
    };
    caja.appendChild(b);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = 'margin-top:4px;padding:10px;border-radius:10px;border:none;background:transparent;color:var(--text-secondary);font-weight:600;cursor:pointer;';
  cancelBtn.onclick = e => { e.stopPropagation(); modal.remove(); };
  caja.appendChild(cancelBtn);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}
