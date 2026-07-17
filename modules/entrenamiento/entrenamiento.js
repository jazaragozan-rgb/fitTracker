// ============================================================
// modules/entrenamiento/entrenamiento.js
// Lógica completa del módulo de entrenamiento:
//   - Niveles 1-3: lista de mesociclos/microciclos/sesiones
//   - Nivel 4: acordeón de ejercicios con series
//   - Drag & drop en ambos niveles
//   - Timer de sesión
//   - Buscador de ejercicios (API ExerciseDB + backup)
// ============================================================

import { datos as datosStore, guardarDatos } from '../../core/store.js';
import { mostrarConfirmacion, mostrarMenuOpciones, mostrarSelectorMarca } from '../../shared/ui.js';
import { iniciarTimer }          from '../../shared/timer.js';
import { calcularVolumen, calcular1RM, redondear, formatearSegundos } from '../../shared/utils.js';

// ── Estado del módulo ─────────────────────────────────────────
let ejercicioExpandido = null;

// ── Estado drag & drop: lista (niveles 1-3) ───────────────────
let dragItem = null, dragStartX = 0, dragStartY = 0, dragging = false;
let dragStartIndex = null, dragTimer = null, hasMoved = false;
// Estado drag específico para ejercicios (nivel 4)
let draggingEjercicio = false;

// ── Referencias al renderizador y ruta actuales ───────────────
// Se asignan al llamar a renderizarNivel4 / renderizarLista
let _renderizar = null;
let _rutaActual = null;
let _sessionTimerInterval = null;

const MOVEMENT_THRESHOLD  = 10;
const LONG_PRESS_DURATION = 500;

// ── Emojis por nivel ──────────────────────────────────────────
const NIVEL_EMOJIS = { 1:'🗂️', 2:'📋', 3:'📅', 4:'💪' };

// ── Helpers internos ──────────────────────────────────────────
function getRenderizar() { return _renderizar || window.renderizar; }
function getRutaActual() { return _rutaActual || window.rutaActual || []; }
function getNivelActual(ruta) {
  const datosRef = datosStore || [];
  let nivel = { hijos: datosRef };
  for (const i of ruta) {
    if (!nivel.hijos || nivel.hijos[i] === undefined) return { hijos: [] };
    nivel = nivel.hijos[i];
  }
  return nivel;
}

function _rutasIguales(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

// ============================================================
// RENDER NIVEL 4: acordeón de ejercicios
// ============================================================
export function renderizarNivel4(nivel, contenido, rutaActual) {
  const rutaAnterior = _rutaActual;
  _renderizar = window.renderizar;
  _rutaActual = rutaActual;
  if (!rutaAnterior || !_rutasIguales(rutaAnterior, rutaActual)) {
    ejercicioExpandido = null;
  }

  const headerEl    = document.querySelector('header');
  const subHeaderEl = document.getElementById('subHeader');
  const offsetTop   = (headerEl?.offsetHeight || 48) + (subHeaderEl?.offsetHeight || 60);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;z-index:1;`;
  wrapper.style.paddingTop = `${offsetTop}px`;

  // Zona scrolleable
  const zonaScroll = document.createElement('div');
  zonaScroll.style.cssText = `flex:1;overflow-y:auto;padding:12px;padding-bottom:80px;background:var(--bg-main);`;

  (nivel.hijos || []).forEach((ejercicio, index) => {
    zonaScroll.appendChild(_crearEjercicioAcordeon(ejercicio, index, nivel, rutaActual));
  });

  wrapper.appendChild(zonaScroll);
  contenido.appendChild(wrapper);

  // Exponer crearEjercicioAcordeon para compatibilidad
  window.crearEjercicioAcordeon = (ej, idx, niv) => _crearEjercicioAcordeon(ej, idx, niv, rutaActual);
}

// ============================================================
// RENDER NIVELES 1-3: lista de hijos con drag & drop
// ============================================================
export function renderizarLista(nivel, contenido, rutaActual) {
  _renderizar = window.renderizar;
  _rutaActual = rutaActual;

  (nivel.hijos || []).forEach((item, index) => {
    contenido.appendChild(_crearIndice(item, index, nivel, rutaActual));
  });

  // Exponer para dashboard y calendario
  window.crearIndice = (item, idx, niv) => _crearIndice(item, idx, niv, rutaActual);
}

// ============================================================
// CREAR ÍTEM DE LISTA (niveles 1-3)
// ============================================================
function _crearIndice(item, index, nivel, rutaActual) {
  const div = document.createElement('div');
  div.className = 'list-item li-item';
  div.dataset.index = index;

  div.addEventListener('mousedown', startDrag, { passive: false, capture: true });
  div.addEventListener('touchstart', startDrag, { passive: false, capture: true });

  // Icono de nivel
  const liIcon = document.createElement('div');
  liIcon.className = 'li-icon';
  const emoji = document.createElement('span');
  emoji.className = 'li-emoji';
  emoji.textContent = NIVEL_EMOJIS[rutaActual.length] || '📁';
  liIcon.appendChild(emoji);
  div.appendChild(liIcon);

  // Cuerpo
  const liBody = document.createElement('div');
  liBody.className = 'li-body';

  if (item.editando) {
    const input = document.createElement('input');
    input.className = 'li-name-input li-input-nombre';
    input.value       = item.nombre || '';
    input.placeholder = item.placeholder || 'Sin nombre';
    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));
    ['pointerdown','mousedown','touchstart','click'].forEach(ev => input.addEventListener(ev, e => e.stopPropagation()));
    const guardar = () => {
      item.nombre = input.value.trim() || 'Sin nombre';
      item.editando = false;
      guardarDatos();
      getRenderizar()?.();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); });
    input.addEventListener('blur', guardar);
    liBody.appendChild(input);
  } else {
    const nameDiv = document.createElement('div');
    nameDiv.className = 'li-name li-nombre';
    nameDiv.textContent = item.nombre || 'Sin nombre';
    liBody.appendChild(nameDiv);
  }

  // Meta tags
  const liMeta = document.createElement('div');
  liMeta.className = 'li-meta';

  const contarHijos = (n) => (n.hijos || []).length;

  if (rutaActual.length <= 2 && contarHijos(item) > 0) {
    const tagHijos = document.createElement('span');
    tagHijos.className = 'li-tag';
    const lbl = rutaActual.length === 1 ? 'Micro' : 'Sesión';
    const n   = contarHijos(item);
    tagHijos.textContent = `${n} ${lbl}${n !== 1 ? 's' : ''}`;
    liMeta.appendChild(tagHijos);
  }

  if (rutaActual.length === 3) {
    const numEj = (item.hijos || []).reduce((acc, b) => acc + (b.hijos?.length || 0), 0);
    if (numEj > 0) {
      const tagEj = document.createElement('span');
      tagEj.className = 'li-tag';
      tagEj.textContent = `${numEj} ejercicio${numEj !== 1 ? 's' : ''}`;
      liMeta.appendChild(tagEj);
    }

    const fechaInput = document.createElement('input');
    fechaInput.type      = 'date';
    fechaInput.className = 'li-date';
    fechaInput.value     = nivel.hijos[index].fecha || '';
    ['pointerdown','mousedown','touchstart','click'].forEach(ev => fechaInput.addEventListener(ev, e => e.stopPropagation()));
    fechaInput.addEventListener('change', e => {
      nivel.hijos[index].fecha = e.target.value;
      guardarDatos();
    });
    liMeta.appendChild(fechaInput);

    if (item.duracionMinutos > 0) {
      const dur = document.createElement('span');
      dur.className    = 'li-tag';
      const h = Math.floor(item.duracionMinutos / 60), m = item.duracionMinutos % 60;
      dur.textContent  = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
      liMeta.appendChild(dur);
    }

    let totalS = 0, doneS = 0;
    (item.hijos || []).forEach(b => {
      (b.series || []).forEach(s => { totalS++; if (s.completada) doneS++; });
      (b.hijos  || []).forEach(ej => (ej.series || []).forEach(s => { totalS++; if (s.completada) doneS++; }));
    });
    if (totalS > 0) {
      const tagS = document.createElement('span');
      tagS.className = `li-tag${doneS === totalS ? ' cyan' : ''}`;
      tagS.textContent = `${doneS}/${totalS} ✓`;
      liMeta.appendChild(tagS);
    }
  }

  liBody.appendChild(liMeta);
  div.appendChild(liBody);

  // Botón opciones
  const opBtn = document.createElement('button');
  opBtn.className = 'btn-opciones';
  opBtn.appendChild(document.createElement('span'));
  opBtn.addEventListener('click', e => {
    e.stopPropagation();
    mostrarMenuOpciones({
      anchorElement: opBtn,
      onEditar:  () => { item.editando = true; guardarDatos(); getRenderizar()?.(); },
      onEliminar: () => mostrarConfirmacion(`¿Desea borrar "${item.nombre}"?`, () => {
        nivel.hijos.splice(index, 1); guardarDatos(); getRenderizar()?.();
      }),
      onCopiar: () => ({ nivel: rutaActual.length, datos: structuredClone(item) })
    });
  });
  div.appendChild(opBtn);

  // Click: navegar
  div.addEventListener('click', e => {
    if (dragging) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.target === opBtn || opBtn.contains(e.target)) return;
    if (e.target.tagName === 'INPUT') return;
    const ruta = getRutaActual();
    ruta.push(index);
    getRenderizar()?.();
  });

  return div;
}

// ============================================================
// CREAR ACORDEÓN DE EJERCICIO (nivel 4)
// ============================================================
function _crearEjercicioAcordeon(ejercicio, index, nivel, rutaActual) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ejercicio-acordeon';
  wrapper.dataset.index = index;

  // ── Header ────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'ejercicio-header' + (ejercicioExpandido === index ? ' expandido' : '');

  if (ejercicio.editando) {
    header.style.padding = '12px';
    header.style.gap = '8px';
    const input = document.createElement('input');
    input.value = ejercicio.nombre || '';
    input.placeholder = ejercicio.placeholder || 'Nombre del ejercicio';
    input.style.cssText = 'flex:1;border:none;background:transparent;font-size:1rem;font-weight:600;outline:none;min-width:0;';
    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));
    ['pointerdown','mousedown','touchstart','click'].forEach(ev => input.addEventListener(ev, e => e.stopPropagation()));
    const guardar = () => {
      ejercicio.nombre = input.value || 'Sin nombre';
      ejercicio.editando = false;
      guardarDatos();
      getRenderizar()?.();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); });
    input.addEventListener('blur', guardar);
    header.appendChild(input);
  } else {
    const iconoExpand = document.createElement('span');
    iconoExpand.className = 'ej-expand-icon';
    iconoExpand.textContent = ejercicioExpandido === index ? '▼' : '▶';
    header.appendChild(iconoExpand);

    // Imagen
    const imgBox = document.createElement('div');
    imgBox.className = 'ej-icon-box';
    if (ejercicio.imagen?.trim()) {
      const ph = document.createElement('span'); ph.textContent = '⏳'; imgBox.appendChild(ph);
      const img = document.createElement('img'); img.alt = ejercicio.nombre;
      img.onload  = () => { imgBox.innerHTML = ''; imgBox.appendChild(img); };
      img.onerror = () => { ph.textContent = '🏋️'; };
      img.src = ejercicio.imagen;
    } else {
      const em = document.createElement('span'); em.textContent = '🏋️'; imgBox.appendChild(em);
    }
    header.appendChild(imgBox);

    // Info
    const infoBlock = document.createElement('div');
    infoBlock.className = 'ej-info-block';
    const nombre = document.createElement('div');
    nombre.className = 'ej-name';
    nombre.textContent = ejercicio.nombre;
    infoBlock.appendChild(nombre);

    const meta = document.createElement('div');
    meta.className = 'ej-meta';
    const nSeries = (ejercicio.series || []).length;
    if (nSeries > 0) {
      const tagS = document.createElement('span'); tagS.className = 'li-tag';
      tagS.textContent = `${nSeries} serie${nSeries !== 1 ? 's' : ''}`;
      meta.appendChild(tagS);
    }
    const nDone = (ejercicio.series || []).filter(s => s.completada).length;
    if (nDone > 0) {
      const tagD = document.createElement('span'); tagD.className = 'li-tag cyan';
      tagD.textContent = `${nDone} ✓`; meta.appendChild(tagD);
    }
    infoBlock.appendChild(meta);
    header.appendChild(infoBlock);

    // Botón opciones
    const opcionesBtn = document.createElement('button');
    opcionesBtn.className = 'btn-opciones';
    opcionesBtn.appendChild(document.createElement('span'));
    opcionesBtn.addEventListener('click', e => {
      e.stopPropagation();
      const menuOpts = {
        anchorElement: opcionesBtn,
        onEliminar: () => mostrarConfirmacion(`¿Desea borrar "${ejercicio.nombre}"?`, () => {
          nivel.hijos.splice(index, 1);
          ejercicioExpandido = null;
          guardarDatos();
          getRenderizar()?.();
        }),
        onCopiar: () => ({ nivel: rutaActual.length, datos: structuredClone(ejercicio) })
      };
      if (ejercicioExpandido !== index) {
        menuOpts.onEditar = () => { ejercicio.editando = true; guardarDatos(); getRenderizar()?.(); };
      }
      mostrarMenuOpciones(menuOpts);
    });
    header.appendChild(opcionesBtn);

    // Toggle expand
    header.addEventListener('click', e => {
      if (draggingEjercicio) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.target === opcionesBtn || opcionesBtn.contains(e.target)) return;
      e.preventDefault();

      if (ejercicioExpandido === index) {
        ejercicioExpandido = null;
      } else {
        ejercicioExpandido = index;
      }
      getRenderizar()?.();
    });
  }

  wrapper.appendChild(header);

  // ── Body expandido ─────────────────────────────────────────
  if (ejercicioExpandido === index && !ejercicio.editando) {
    const body = document.createElement('div');
    body.className = 'ejercicio-body';
    body.style.display = 'block';
    const inner = document.createElement('div');
    inner.className = 'ejercicio-body-inner';

    _rellenarBodyEjercicio(ejercicio, inner, nivel, index, rutaActual);

    body.appendChild(inner);
    wrapper.appendChild(body);
  }

  return wrapper;
}

// ── Rellena el interior del acordeón expandido ────────────────
function _rellenarBodyEjercicio(ejercicio, inner, nivel, index, rutaActual) {
  ejercicio.series = ejercicio.series || [];

  // Construir listado combinado de series: propias + series de hijos (si existen)
  const seriesToShow = [];
  const _collectSeries = (nodo) => {
    (nodo.series || []).forEach(s => seriesToShow.push(Object.assign({ _origen: nodo.nombre }, s)));
    (nodo.hijos || []).forEach(h => _collectSeries(h));
  };
  _collectSeries(ejercicio);

  // Cabeceras
  const encabezados = document.createElement('div');
  encabezados.style.cssText = `
    display:grid;grid-template-columns:40px repeat(4,1fr) 80px;
    gap:4px;margin-bottom:8px;font-size:0.7rem;font-weight:700;
    color:var(--text-secondary);text-transform:uppercase;text-align:center;
  `;
  ['', 'REPS', 'PESO', 'RIR', 'DESC', ''].forEach(txt => {
    const c = document.createElement('div'); c.textContent = txt; encabezados.appendChild(c);
  });
  inner.appendChild(encabezados);

  // Filas de series
    seriesToShow.forEach((serie, idx) => {
      const serieDiv = document.createElement('div');
      serieDiv.style.cssText = `
        display:grid;grid-template-columns:40px repeat(4,1fr) 40px;
        gap:4px;margin:2px;padding:1px 4px;align-items:center;
        border-radius:8px;min-height:45px;height:45px;
        background:${serie.completada ? 'rgba(61,213,152,0.1)' : 'transparent'};
      `;

      const numBtn = document.createElement('div');
      numBtn.style.cssText = `
        width:26px;height:26px;
        font-size:1.2rem;font-weight:700;
        border-radius:6px;background:transparent;
        color:var(--text-primary);
        display:flex;align-items:center;justify-content:center;
      `;
      numBtn.textContent = serie.marca || (idx + 1);
      if (serie._origen && serie._origen !== ejercicio.nombre) {
        numBtn.title = serie._origen;
      }

      const mkInput = (value, placeholder) => {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = value || '';
        inp.placeholder = placeholder;
        inp.readOnly = true;
        inp.style.cssText = `
          margin:2px;padding:2px 4px;font-size:1.2rem;font-weight:300;
          background:transparent;border:none;
          box-shadow:none;min-height:26px;height:26px;text-align:center;
          color:var(--text-primary);cursor:default;
        `;
        return inp;
      };

      const reps     = mkInput(serie.reps,     'R');
      const peso     = mkInput(serie.peso,     'P');
      const rir      = mkInput(serie.rir,      'R');
      const descanso = mkInput(serie.descanso, 'D');

      // Check visible pero no clickeable (solo informativo)
      const checkIcon = document.createElement('div');
      checkIcon.style.cssText = `
        font-size:1.1rem;display:flex;align-items:center;justify-content:center;
        width:26px;height:26px;opacity:${serie.completada ? '1' : '0.3'};
      `;
      checkIcon.textContent = serie.completada ? '✔️' : '🕔';

      [numBtn, reps, peso, rir, descanso, checkIcon].forEach(el => serieDiv.appendChild(el));
      inner.appendChild(serieDiv);
    });

  // Stats sesión actual + comparación con sesión anterior (si existe)
  const stats = _calcularEstadisticas(ejercicio);
  const sesionAnterior = _buscarSesionAnterior(ejercicio.nombre, rutaActual);
  let statsAnt = null;
  if (sesionAnterior) statsAnt = _calcularEstadisticas(sesionAnterior.ejercicio);

  const badge = (actual, prev) => {
    if (!prev && prev !== 0) return '';
    if (prev === 0) return '';
    const pct = ((actual - prev) / prev * 100).toFixed(1);
    const cl = pct > 0 ? 'up' : pct < 0 ? 'down' : 'eq';
    const ic = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
    return `<span class="prog-badge prog-${cl}">${ic} ${Math.abs(pct)}%</span>`;
  };

  if (stats.pesoMax > 0 || stats.volumenTotal > 0) {
    const sc = document.createElement('div');
    sc.className = 'ej-stats-card';
    sc.innerHTML = `
      <div class="ej-card-label">📊 Esta sesión</div>
      <div class="ej-stats-grid">
        <div class="ej-stat-cell"><div class="ej-stat-val" style="color:var(--primary-mint)">${stats.pesoMax}<span>kg</span></div><div class="ej-stat-lbl">Peso máx ${statsAnt ? badge(stats.pesoMax, statsAnt.pesoMax) : ''}</div></div>
        <div class="ej-stat-cell"><div class="ej-stat-val" style="color:var(--secondary-cyan)">${stats.volumenTotal}<span>kg</span></div><div class="ej-stat-lbl">Volumen ${statsAnt ? badge(stats.volumenTotal, statsAnt.volumenTotal) : ''}</div></div>
        <div class="ej-stat-cell"><div class="ej-stat-val" style="color:var(--primary-coral)">${stats.oneRM}<span>kg</span></div><div class="ej-stat-lbl">1RM est. ${statsAnt ? badge(stats.oneRM, statsAnt.oneRM) : ''}</div></div>
      </div>`;
    inner.appendChild(sc);
  }

  // Comparación: mostrar bloque de la sesión anterior SIN badges (solo valores)
  if (sesionAnterior) {
    const statsPrev = statsAnt || _calcularEstadisticas(sesionAnterior.ejercicio);
    const fechaStr = new Date(sesionAnterior.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
    const sc2 = document.createElement('div');
    sc2.className = 'ej-stats-card ej-stats-card--prev';
    sc2.innerHTML = `
      <div class="ej-card-label">📅 Anterior (${fechaStr})</div>
      <div class="ej-stats-grid">
        <div class="ej-stat-cell"><div class="ej-stat-val">${statsPrev.pesoMax}<span>kg</span></div><div class="ej-stat-lbl">Peso</div></div>
        <div class="ej-stat-cell"><div class="ej-stat-val">${statsPrev.volumenTotal}<span>kg</span></div><div class="ej-stat-lbl">Vol</div></div>
        <div class="ej-stat-cell"><div class="ej-stat-val">${statsPrev.oneRM}<span>kg</span></div><div class="ej-stat-lbl">1RM</div></div>
      </div>`;
    inner.appendChild(sc2);
  }

  // Notas
    const nc = document.createElement('div');
    nc.className = 'ej-notas-container';
    const nl = document.createElement('label');
    nl.className = 'ej-notas-label';
    nl.textContent = '📝 Notas';
    const ta = document.createElement('textarea');
    ta.className = 'ej-notas-textarea';
    ta.value = ejercicio.notas || '';
    ta.placeholder = 'Notas del ejercicio...';
    ta.readOnly = true;
    ta.style.cursor = 'default';
    ta.style.color = 'var(--text-secondary)';
    nc.append(nl, ta);
    inner.appendChild(nc);
}

// Guarda la duración en el nodo de sesión y persiste en Firestore
export function guardarDuracionSesion(rutaSesion, minutos) {
  try {
    const datosRef = datosStore || [];
    if (!Array.isArray(datosRef)) return false;
    window.datos = datosRef;
    let nodo = { hijos: datosRef };
    for (const i of rutaSesion) {
      if (!nodo.hijos || nodo.hijos[i] === undefined) return false;
      nodo = nodo.hijos[i];
    }
    nodo.duracionMinutos = Math.max(0, Number(minutos) || 0);
    guardarDatos({ immediate: true });
    console.log(`[Timer Sesión] ✓ ${nodo.duracionMinutos} min guardados en sesión`);
    return true;
  } catch (e) {
    console.error('[Timer Sesión] Error al guardar duración:', e);
    return false;
  }
}

// ============================================================
// BUSCADOR DE EJERCICIOS (ExerciseDB API + backup)
// ============================================================

// ============================================================
// DRAG & DROP — LISTA (niveles 1-3)
// ============================================================
function startDrag(e) {
  if (e.type === 'mousedown' && e.button !== 0) return;
  dragItem = e.currentTarget.closest('.list-item');
  if (!dragItem) return;
  dragging = false; hasMoved = false;
  dragStartIndex = [...(dragItem.parentElement?.children || [])].indexOf(dragItem);
  const touch = e.touches?.[0] || e;
  dragStartX = touch.clientX; dragStartY = touch.clientY;

  const check = (me) => {
    const mt = me.touches?.[0] || me;
    if (Math.abs(mt.clientX - dragStartX) > MOVEMENT_THRESHOLD || Math.abs(mt.clientY - dragStartY) > MOVEMENT_THRESHOLD) {
      hasMoved = true; clearTimeout(dragTimer); dragTimer = null; cleanup();
    }
  };
  const cleanup = () => { document.removeEventListener('mousemove', check); document.removeEventListener('touchmove', check); };
  document.addEventListener('mousemove', check, { passive: true });
  document.addEventListener('touchmove', check, { passive: true });

  dragTimer = setTimeout(() => {
    cleanup();
    if (!hasMoved) {
      dragging = true;
      dragItem.classList.add('dragging');
      dragItem.style.opacity = '0.7';
      dragItem.style.transform = 'scale(1.02)';
      document.body.style.userSelect = 'none';
      navigator.vibrate?.(50);
    }
  }, LONG_PRESS_DURATION);
}

function dragMove(e) {
  if (!dragging || !dragItem) return;
  e.preventDefault();
  const y = (e.touches?.[0] || e).clientY;
  const items = [...document.querySelectorAll('.list-item:not(.dragging)')];
  const target = items.find(item => y < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
  if (target) dragItem.parentElement?.insertBefore(dragItem, target);
  else if (items.length > 0) items[0].parentElement?.appendChild(dragItem);
}

function dragEnd() {
  clearTimeout(dragTimer); dragTimer = null;
  document.body.style.userSelect = '';
  if (!dragging || !dragItem) { dragItem = null; dragStartIndex = null; hasMoved = false; return; }
  dragItem.style.opacity = ''; dragItem.style.transform = '';
  dragging = false; dragItem.classList.remove('dragging');
  const newIndex = [...(dragItem.parentElement?.children || [])].indexOf(dragItem);
  if (dragStartIndex !== null && newIndex !== dragStartIndex) {
    const ruta = getRutaActual();
    const nivel = getNivelActual(ruta);
    if (nivel) { const moved = nivel.hijos.splice(dragStartIndex, 1)[0]; nivel.hijos.splice(newIndex, 0, moved); guardarDatos(); }
  }
  dragItem = null; dragStartIndex = null; hasMoved = false;
}

// Registrar listeners globales de drag
document.addEventListener('mousemove', dragMove);
document.addEventListener('touchmove', dragMove, { passive: false });
document.addEventListener('mouseup',   dragEnd);
document.addEventListener('touchend',  dragEnd);

// ============================================================
// HELPERS INTERNOS
// ============================================================
function _calcularEstadisticas(ejercicio) {
  const series = ejercicio.series || [];
  const pesoMax = Math.max(...series.map(s => parseFloat(s.peso) || 0), 0);
  const volumenTotal = calcularVolumen(series);
  const oneRM = Math.max(...series.map(s => {
    const p = parseFloat(s.peso) || 0, r = parseInt(s.reps) || 0;
    return p && r ? calcular1RM(p, r) : 0;
  }), 0);
  return { pesoMax: redondear(pesoMax), volumenTotal: Math.round(volumenTotal), oneRM: redondear(oneRM) };
}

function _buscarSesionAnterior(nombreEjercicio, rutaActual) {
  const datos = window.datos || [];
  const sesiones = [];

  const buscarEjercicioEnNivel = (nodo) => {
    if (nodo.nombre === nombreEjercicio && nodo.series) return nodo;
    for (const hijo of (nodo.hijos || [])) {
      const encontrado = buscarEjercicioEnNivel(hijo);
      if (encontrado) return encontrado;
    }
    return null;
  };

  const toDia = (raw) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  };

  datos[0]?.hijos?.forEach((meso, mi) => {
    meso.hijos?.forEach((micro, mci) => {
      micro.hijos?.forEach((sesion, si) => {
        let fecha = sesion.fecha;
        if (!fecha && sesion.hijos?.length) {
          for (const sub of sesion.hijos) { if (sub.fecha) { fecha = sub.fecha; break; } }
        }
        if (!fecha) return;
        const ejercicioEncontrado = buscarEjercicioEnNivel(sesion);
        if (ejercicioEncontrado) {
          sesiones.push({ fecha, ejercicio: ejercicioEncontrado, ruta: [0, mi, mci, si] });
        }
      });
    });
  });

  sesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Obtener la fecha de la sesión actual desde rutaActual
  let fechaActual = null;
  if (rutaActual.length >= 4) {
    try {
      let nodo = { hijos: datos };
      for (const i of rutaActual.slice(0, 4)) nodo = nodo.hijos[i];
      fechaActual = nodo?.fecha;
      if (!fechaActual && nodo?.hijos?.length) {
        for (const sub of nodo.hijos) { if (sub.fecha) { fechaActual = sub.fecha; break; } }
      }
    } catch (_) {}
  }

  const fechaActualDia = toDia(fechaActual);

  for (const sesion of sesiones) {
    const sesionDia = toDia(sesion.fecha);
    if (fechaActualDia) {
      if (sesionDia && sesionDia < fechaActualDia) return sesion;
    } else {
      // Sin fecha en sesión actual: devolver la más reciente que no sea la sesión misma
      const rutaActualStr = rutaActual.slice(0, 4).join(',');
      if (sesion.ruta.join(',') !== rutaActualStr) return sesion;
    }
  }
  return null;
}