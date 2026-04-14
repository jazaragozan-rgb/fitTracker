// ============================================================
// modules/entrenamiento/entrenamiento.js
// Lógica completa del módulo de entrenamiento:
//   - Niveles 1-3: lista de mesociclos/microciclos/sesiones
//   - Nivel 4: acordeón de ejercicios con series
//   - Drag & drop en ambos niveles
//   - Timer de sesión
//   - Buscador de ejercicios (API ExerciseDB + backup)
// ============================================================

import { guardarDatos }          from '../../core/store.js';
import { mostrarConfirmacion, mostrarMenuOpciones, mostrarSelectorMarca } from '../../shared/ui.js';
import { iniciarTimer }          from '../../shared/timer.js';
import { calcularVolumen, calcular1RM, redondear, formatearSegundos } from '../../shared/utils.js';
import { fetchAllExercises, searchExercisesByName } from '../exercises/exercises.js';

// ── Estado del módulo ─────────────────────────────────────────
let ejercicioExpandido = null;

// ── Estado drag & drop: lista (niveles 1-3) ───────────────────
let dragItem = null, dragStartX = 0, dragStartY = 0, dragging = false;
let dragStartIndex = null, dragTimer = null, hasMoved = false;

// ── Estado drag & drop: ejercicios (nivel 4) ─────────────────
let dragEjercicio = null, dragEjercicioStartX = 0, dragEjercicioStartY = 0;
let draggingEjercicio = false, dragEjercicioStartIndex = null;
let dragEjercicioTimer = null, hasMovedEjercicio = false;

const MOVEMENT_THRESHOLD  = 10;
const LONG_PRESS_DURATION = 500;

// ── Emojis por nivel ──────────────────────────────────────────
const NIVEL_EMOJIS = { 1:'🗂️', 2:'📋', 3:'📅', 4:'💪' };

// ============================================================
// RENDER NIVEL 4: acordeón de ejercicios
// ============================================================
export function renderizarNivel4(nivel, contenido, rutaActual) {
  ejercicioExpandido = null;   // reset al entrar

  const headerEl    = document.querySelector('header');
  const subHeaderEl = document.getElementById('subHeader');
  const offsetTop   = (headerEl?.offsetHeight || 48) + (subHeaderEl?.offsetHeight || 60);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;z-index:1;`;

  // Banda del timer de sesión
  wrapper.appendChild(crearTimerSesionBanda(rutaActual.slice(0, 4)));

  // Zona scrolleable
  const zonaScroll = document.createElement('div');
  zonaScroll.style.cssText = `flex:1;overflow-y:auto;padding:${offsetTop + 12}px 12px 80px;`;

  (nivel.hijos || []).forEach((ejercicio, index) => {
    zonaScroll.appendChild(crearEjercicioAcordeon(ejercicio, index, nivel, rutaActual));
  });

  wrapper.appendChild(zonaScroll);
  contenido.appendChild(wrapper);

  // Exponer zonaScroll para guardar scroll en checks
  window.zonaScroll = zonaScroll;

  // Función para renderizar guardando scroll
  window.renderConScroll = () => {
    // Guardar el index del ejercicio en la parte superior
    let topIndex = -1;
    let topEjercicioNombre = '';
    if (window.zonaScroll) {
      const rect = window.zonaScroll.getBoundingClientRect();
      const topVisible = rect.top;
      const headers = window.zonaScroll.querySelectorAll('.ejercicio-header');
      for (let i = 0; i < headers.length; i++) {
        const hRect = headers[i].getBoundingClientRect();
        if (hRect.top >= topVisible) {
          topIndex = i;
          topEjercicioNombre = headers[i].textContent.trim();
          break;
        }
      }
    }
    window.topIndex = topIndex;
    window.topEjercicioNombre = topEjercicioNombre;

    window.renderizar?.();

    requestAnimationFrame(() => {
      if (window.zonaScroll && window.topEjercicioNombre) {
        const headers = window.zonaScroll.querySelectorAll('.ejercicio-header');
        for (let h of headers) {
          if (h.textContent.trim() === window.topEjercicioNombre) {
            h.scrollIntoView({ block: 'start', behavior: 'instant' });
            break;
          }
        }
      }
    });
  };

  // Exponer para compatibilidad con router.js
  window.crearEjercicioAcordeon = (ej, idx, niv) => crearEjercicioAcordeon(ej, idx, niv, rutaActual);
}

// ============================================================
// RENDER NIVELES 1-3: lista de hijos con drag & drop
// ============================================================
export function renderizarLista(nivel, contenido, rutaActual) {
  (nivel.hijos || []).forEach((item, index) => {
    contenido.appendChild(crearIndice(item, index, nivel, rutaActual));
  });
  // Exponer para router y dashboard
  window.crearIndice = (item, idx, niv) => crearIndice(item, idx, niv, rutaActual);
}

// ============================================================
// CREAR ÍTEM DE LISTA (niveles 1-3)
// ============================================================
function crearIndice(item, index, nivel, rutaActual) {
  const div = document.createElement('div');
  div.className = 'list-item li-item';
  div.dataset.index = index;

  // Drag & drop
  div.addEventListener('mousedown', startDrag, { passive: false, capture: true });
  div.addEventListener('touchstart', startDrag, { passive: false, capture: true });
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('touchmove', dragMove, { passive: false });
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchend', dragEnd);

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
    const guardar = () => { item.nombre = input.value.trim() || 'Sin nombre'; item.editando = false; guardarDatos(); window.renderizar?.(); };
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
    // Conteo de ejercicios
    const numEj = (item.hijos || []).reduce((acc, b) => acc + (b.hijos?.length || 0), 0);
    if (numEj > 0) {
      const tagEj = document.createElement('span');
      tagEj.className = 'li-tag';
      tagEj.textContent = `${numEj} ejercicio${numEj !== 1 ? 's' : ''}`;
      liMeta.appendChild(tagEj);
    }

    // Fecha de sesión
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

    // Badge duración
    if (item.duracionMinutos > 0) {
      const dur = document.createElement('span');
      dur.className    = 'li-tag';
      const h = Math.floor(item.duracionMinutos / 60), m = item.duracionMinutos % 60;
      dur.textContent  = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
      liMeta.appendChild(dur);
    }

    // Series completadas
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
      onEditar:  () => { item.editando = true; guardarDatos(); window.renderizar?.(); },
      onEliminar: () => mostrarConfirmacion(`¿Desea borrar "${item.nombre}"?`, () => {
        nivel.hijos.splice(index, 1); guardarDatos(); window.renderizar?.();
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
    window.rutaActual?.push(index);
    window.renderizar?.();
  });

  return div;
}

// ============================================================
// CREAR ACORDEÓN DE EJERCICIO (nivel 4)
// ============================================================
function crearEjercicioAcordeon(ejercicio, index, nivel, rutaActual) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ejercicio-acordeon';
  wrapper.dataset.index = index;

  // Drag & drop ejercicios
  wrapper.addEventListener('mousedown', startDragEjercicio, { passive: false, capture: true });
  wrapper.addEventListener('touchstart', startDragEjercicio, { passive: false, capture: true });

  // ── Header ────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'ejercicio-header' + (ejercicioExpandido === index ? ' expandido' : '');

  if (ejercicio.editando) {
    header.style.padding = '12px'; header.style.gap = '8px';
    const input = document.createElement('input');
    input.value = ejercicio.nombre || '';
    input.placeholder = ejercicio.placeholder || 'Nombre del ejercicio';
    input.style.cssText = 'flex:1;border:none;background:transparent;font-size:1rem;font-weight:600;outline:none;min-width:0;';
    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));
    ['pointerdown','mousedown','touchstart','click'].forEach(ev => input.addEventListener(ev, e => e.stopPropagation()));
    const guardar = () => { ejercicio.nombre = input.value || 'Sin nombre'; ejercicio.editando = false; guardarDatos(); window.renderizar?.(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); });
    input.addEventListener('blur', guardar);
    header.appendChild(input);
  } else {
    const iconoExpand = document.createElement('span');
    iconoExpand.className = 'ej-expand-icon';
    iconoExpand.textContent = ejercicioExpandido === index ? '▼' : '▶';
    header.appendChild(iconoExpand);

    // Imagen
    const imgBox = document.createElement('div'); imgBox.className = 'ej-icon-box';
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

    // Info nombre + tags
    const infoBlock = document.createElement('div'); infoBlock.className = 'ej-info-block';
    const nombre    = document.createElement('div'); nombre.className = 'ej-name'; nombre.textContent = ejercicio.nombre;
    infoBlock.appendChild(nombre);
    const meta = document.createElement('div'); meta.className = 'ej-meta';
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
    const opcionesBtn = document.createElement('button'); opcionesBtn.className = 'btn-opciones';
    opcionesBtn.appendChild(document.createElement('span'));
    opcionesBtn.addEventListener('click', e => {
      e.stopPropagation();
      mostrarMenuOpciones({
        anchorElement: opcionesBtn,
        onEditar:  () => { ejercicio.editando = true; guardarDatos(); window.renderConScroll(); },
        onEliminar: () => mostrarConfirmacion(`¿Desea borrar "${ejercicio.nombre}"?`, () => {
          nivel.hijos.splice(index, 1); ejercicioExpandido = null; guardarDatos(); window.renderConScroll();
        }),
        onCopiar: () => ({ nivel: rutaActual.length, datos: structuredClone(ejercicio) })
      });
    });
    header.appendChild(opcionesBtn);

    // Toggle expand
    header.addEventListener('click', e => {
      if (draggingEjercicio) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.target === opcionesBtn || opcionesBtn.contains(e.target)) return;
      e.preventDefault();
      if (ejercicioExpandido === index) {
        ejercicioExpandido = null;
        body.style.display = 'none';
        iconoExpand.textContent = '▶';
      } else {
        ejercicioExpandido = index;
        actualizarBody(ejercicio, body);
        body.style.display = 'block';
        iconoExpand.textContent = '▼';
      }
    });
  }

  wrapper.appendChild(header);

  // ── Body (siempre presente, oculto inicialmente) ───
  const body = document.createElement('div'); body.className = 'ejercicio-body'; body.style.display = 'none';
  const inner = document.createElement('div'); inner.className = 'ejercicio-body-inner';
  body.appendChild(inner);
  wrapper.appendChild(body);
  ejercicio.bodyElement = body;

  // Función para actualizar body
  function actualizarBody(ejercicio, body) {
    const inner = body.querySelector('.ejercicio-body-inner');
    inner.innerHTML = '';

    // Botón + Serie
    const addSerieBtn = document.createElement('button');
    addSerieBtn.textContent = '+ Serie'; addSerieBtn.className = 'add-serie';
    addSerieBtn.onclick = e => {
      e.stopPropagation(); e.preventDefault();
      ejercicio.series.push({});
      guardarDatos();
      actualizarBody(ejercicio, body);
    };
    inner.appendChild(addSerieBtn);

    // Cabeceras
    const encabezados = document.createElement('div'); encabezados.className = 'series-header-compact';
    ['', 'REPS', 'PESO', 'RIR', 'DESC', '', ''].forEach(txt => { const c = document.createElement('div'); c.textContent = txt; encabezados.appendChild(c); });
    inner.appendChild(encabezados);

    // Filas de series
    ejercicio.series.forEach((serie, idx) => {
      const serieDiv = document.createElement('div');
      serieDiv.className = 'serie-row-compact';
      if (serie.completada) serieDiv.style.background = 'rgba(61,213,152,0.08)';

      // Número / marca
      const numBtn = document.createElement('button'); numBtn.className = 'serie-num';
      numBtn.textContent = serie.marca || (idx + 1);
      numBtn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); mostrarSelectorMarca(serie, idx, () => { guardarDatos(); numBtn.textContent = serie.marca || (idx + 1); }); });

      // Inputs
      const mkInput = (placeholder, value, key) => {
        const inp = document.createElement('input');
        inp.placeholder = placeholder; inp.value = value || '';
        inp.className = 'serie-input';
        inp.addEventListener('click', e => e.stopPropagation());
        inp.addEventListener('blur', e => { serie[key] = e.target.value; guardarDatos(); });
        return inp;
      };
      const reps = mkInput('R', serie.reps, 'reps');
      const peso = mkInput('P', serie.peso, 'peso');
      const rir = mkInput('R', serie.rir, 'rir');
      const descanso = mkInput('D', serie.descanso, 'descanso');

      // Check
      const checkBtn = document.createElement('button'); checkBtn.className = 'serie-button';
      checkBtn.textContent = serie.completada ? '✔️' : '🕔';
      checkBtn.addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        serie.completada = !serie.completada;
        if (serie.completada) {
          serieDiv.style.background = 'rgba(61,213,152,0.08)';
          if (serie.descanso) iniciarTimer(serie.descanso);
        } else {
          serieDiv.style.background = '';
        }
        checkBtn.textContent = serie.completada ? '✔️' : '🕔';
        guardarDatos();
      });

      // Eliminar
      const deleteBtn = document.createElement('button'); deleteBtn.className = 'serie-button btn-del-serie';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        mostrarConfirmacion('¿Desea borrar esta serie?', () => { ejercicio.series.splice(idx, 1); guardarDatos(); actualizarBody(ejercicio, body); });
      });

      [numBtn, reps, peso, rir, descanso, checkBtn, deleteBtn].forEach(el => serieDiv.appendChild(el));
      inner.appendChild(serieDiv);
    });

    // Stats
    const stats = _calcularEstadisticas(ejercicio);
    if (stats.pesoMax > 0 || stats.volumenTotal > 0) {
      const sc = document.createElement('div'); sc.className = 'ej-stats-card';
      sc.innerHTML = `
        <div class="ej-card-label">📊 Esta sesión</div>
        <div class="ej-stats-grid">
          <div class="ej-stat-cell"><div class="ej-stat-val" style="color:var(--primary-mint)">${stats.pesoMax}<span>kg</span></div><div class="ej-stat-lbl">Peso máx</div></div>
          <div class="ej-stat-cell"><div class="ej-stat-val" style="color:var(--secondary-cyan)">${stats.volumenTotal}<span>kg</span></div><div class="ej-stat-lbl">Volumen</div></div>
          <div class="ej-stat-cell"><div class="ej-stat-val" style="color:var(--primary-coral)">${stats.oneRM}<span>kg</span></div><div class="ej-stat-lbl">1RM est.</div></div>
        </div>`;
      inner.appendChild(sc);
    }

    // Comparación sesión anterior
    const sesionAnterior = _buscarSesionAnterior(ejercicio.nombre, rutaActual);
    if (sesionAnterior) {
      const statsAnt = _calcularEstadisticas(sesionAnterior.ejercicio);
      const fechaStr = new Date(sesionAnterior.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
      const badge = (actual, prev) => {
        if (!prev) return '';
        const pct = ((actual - prev) / prev * 100).toFixed(1);
        const cl = pct > 0 ? 'up' : pct < 0 ? 'down' : 'eq';
        const ic = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
        return `<span class="prog-badge prog-${cl}">${ic} ${Math.abs(pct)}%</span>`;
      };
      const sc2 = document.createElement('div'); sc2.className = 'ej-stats-card ej-stats-card--prev';
      sc2.innerHTML = `
        <div class="ej-card-label">📅 Anterior (${fechaStr})</div>
        <div class="ej-stats-grid">
          <div class="ej-stat-cell"><div class="ej-stat-val">${statsAnt.pesoMax}<span>kg</span></div><div class="ej-stat-lbl">Peso ${badge(stats.pesoMax, statsAnt.pesoMax)}</div></div>
          <div class="ej-stat-cell"><div class="ej-stat-val">${statsAnt.volumenTotal}<span>kg</span></div><div class="ej-stat-lbl">Vol ${badge(stats.volumenTotal, statsAnt.volumenTotal)}</div></div>
          <div class="ej-stat-cell"><div class="ej-stat-val">${statsAnt.oneRM}<span>kg</span></div><div class="ej-stat-lbl">1RM ${badge(stats.oneRM, statsAnt.oneRM)}</div></div>
        </div>`;
      inner.appendChild(sc2);
    }

    // Notas
    const nc = document.createElement('div'); nc.className = 'ej-notas-container';
    const nl = document.createElement('label'); nl.className = 'ej-notas-label'; nl.textContent = '📝 Notas';
    const ta = document.createElement('textarea'); ta.className = 'ej-notas-textarea';
    ta.value = ejercicio.notas || ''; ta.placeholder = 'Notas del ejercicio...';
    ['pointerdown','mousedown','touchstart','click'].forEach(ev => ta.addEventListener(ev, e => e.stopPropagation()));
    ta.addEventListener('blur', () => { ejercicio.notas = ta.value; guardarDatos(); });
    nc.append(nl, ta); inner.appendChild(nc);
  }

  return wrapper;
}

// ============================================================
// TIMER DE SESIÓN
// ============================================================
function crearTimerSesionBanda(rutaSesion) {
  const banda = document.createElement('div');
  banda.id = 'sessionTimerBanda';
  banda.className = 'session-timer-banda';

  // Leer segundos del localStorage
  const getSegs  = ()  => parseInt(localStorage.getItem('sessionTimerSegundos') || '0');
  const setSegs  = (s) => localStorage.setItem('sessionTimerSegundos', s);
  const getRuta  = ()  => { const v = localStorage.getItem('sessionTimerRuta'); return v ? JSON.parse(v) : null; };
  const setRuta  = (r) => r ? localStorage.setItem('sessionTimerRuta', JSON.stringify(r)) : localStorage.removeItem('sessionTimerRuta');

  const seg = getSegs();
  const display = document.createElement('div');
  display.id = 'sessionTimerDisplay';
  display.textContent = formatearSegundos(seg);
  display.style.cssText = 'font-size:1.6rem;font-weight:700;color:var(--primary-mint);font-family:monospace;min-width:80px;text-align:center;';

  let corriendo = !!getRuta();
  let interval  = null;

  const tick = () => { setSegs(getSegs() + 1); display.textContent = formatearSegundos(getSegs()); };

  if (corriendo) interval = setInterval(tick, 1000);

  const btnPlay = document.createElement('button');
  btnPlay.style.cssText = 'width:auto;margin:0;padding:6px 14px;font-size:0.8rem;font-weight:700;';
  btnPlay.textContent = corriendo ? '⏸ Pausar' : '▶ Iniciar';
  btnPlay.onclick = () => {
    if (corriendo) {
      clearInterval(interval); interval = null; corriendo = false;
      btnPlay.textContent = '▶ Reanudar';
    } else {
      setRuta(rutaSesion); corriendo = true;
      interval = setInterval(tick, 1000);
      btnPlay.textContent = '⏸ Pausar';
    }
  };

  const btnReset = document.createElement('button');
  btnReset.style.cssText = 'width:auto;margin:0;padding:6px 14px;font-size:0.8rem;font-weight:700;background:var(--bg-main);color:var(--text-secondary);';
  btnReset.textContent = '↺ Reset';
  btnReset.onclick = () => {
    clearInterval(interval); interval = null; corriendo = false;
    setSegs(0); setRuta(null);
    display.textContent = '00:00'; btnPlay.textContent = '▶ Iniciar';
  };

  banda.append(display, btnPlay, btnReset);
  return banda;
}

// ============================================================
// BUSCADOR DE EJERCICIOS (ExerciseDB API + backup)
// ============================================================
export function abrirBuscadorEjercicios(callback) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const modal = document.createElement('div'); modal.className = 'modal-ejercicios';

  const header = document.createElement('div'); header.className = 'modal-ejercicios-header';
  const titulo = document.createElement('h3'); titulo.textContent = 'Buscar ejercicio'; titulo.style.cssText = 'margin:0;color:#414141;font-size:1.3rem;';
  const btnC = document.createElement('button'); btnC.className = 'btn-cerrar-modal'; btnC.innerHTML = '✖'; btnC.onclick = () => overlay.remove();
  header.append(titulo, btnC);

  const input = document.createElement('input');
  input.className = 'input-buscar-ejercicio';
  input.placeholder = 'Buscar ejercicio...'; input.type = 'text';

  const list = document.createElement('div'); list.className = 'exercise-list';
  const msgInicial = document.createElement('div');
  msgInicial.style.cssText = 'text-align:center;color:var(--text-secondary);padding:32px 16px;';
  msgInicial.textContent = 'Escribe para buscar ejercicios...';
  list.appendChild(msgInicial);

  modal.append(header, input, list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => input.focus(), 100);

  let searchT;
  input.addEventListener('input', () => {
    clearTimeout(searchT);
    searchT = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 2) { list.innerHTML = ''; list.appendChild(msgInicial); return; }
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">Buscando...</div>';
      try {
        const resultados = await searchExercisesByName(q);
        list.innerHTML = '';
        if (!resultados.length) { list.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:20px;">Sin resultados</div>'; return; }
        const contador = document.createElement('div'); contador.style.cssText = 'text-align:center;font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;';
        contador.textContent = `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`;
        list.appendChild(contador);

        resultados.forEach(ej => {
          const item = document.createElement('div'); item.className = 'exercise-item-card';
          const icono = document.createElement('div'); icono.className = 'exercise-icon';
          if (ej.imagen?.trim()) {
            icono.textContent = '⏳';
            const img = document.createElement('img');
            img.onload  = () => { icono.textContent = ''; icono.appendChild(img); };
            img.onerror = () => { icono.textContent = '🏋️'; };
            img.src = ej.imagen; img.alt = ej.nombre;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px;';
          } else { icono.textContent = '🏋️'; }

          const info = document.createElement('div'); info.className = 'exercise-info';
          const nom  = document.createElement('div'); nom.className = 'exercise-name'; nom.textContent = ej.nombre;
          const detalles = document.createElement('div'); detalles.className = 'exercise-details';
          const grupos = Array.isArray(ej.grupo_muscular) ? ej.grupo_muscular : [ej.grupo_muscular || ''];
          grupos.slice(0,2).forEach(g => { if (g) { const t = document.createElement('span'); t.className='exercise-tag'; t.textContent=g; detalles.appendChild(t); } });
          if (ej.equipamiento) { const t = document.createElement('span'); t.className='exercise-tag equip'; t.textContent=ej.equipamiento; detalles.appendChild(t); }
          info.append(nom, detalles);
          item.append(icono, info);

          item.addEventListener('mouseenter', () => item.style.boxShadow='var(--neu-in-sm)');
          item.addEventListener('mouseleave', () => item.style.boxShadow='var(--neu-out-sm)');
          item.addEventListener('click', () => {
            overlay.remove();
            if (callback) { callback(ej.nombre, ej.imagen); }
            else { _agregarEjercicioDesdeAPI(ej.nombre, ej.imagen); }
          });
          list.appendChild(item);
        });
      } catch (err) {
        list.innerHTML = '<div style="text-align:center;color:var(--danger);padding:20px;">Error al buscar</div>';
        console.error('[Buscador]', err);
      }
    }, 300);
  });
}

function _agregarEjercicioDesdeAPI(nombre, imagenUrl) {
  const rutaActual = window.rutaActual;
  if (!rutaActual || rutaActual.length < 4) return;
  const nivel = window.nivelActual ? window.nivelActual(rutaActual) : null;
  if (!nivel) return;
  nivel.hijos.push({ nombre, hijos:[], series:[], imagen: imagenUrl || '' });
  guardarDatos();
  window.renderizar?.();
}

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
    if (Math.abs(mt.clientX - dragStartX) > MOVEMENT_THRESHOLD || Math.abs(mt.clientY - dragStartY) > MOVEMENT_THRESHOLD) { hasMoved = true; clearTimeout(dragTimer); dragTimer = null; cleanup(); }
  };
  const cleanup = () => { document.removeEventListener('mousemove', check); document.removeEventListener('touchmove', check); };
  document.addEventListener('mousemove', check, { passive:true });
  document.addEventListener('touchmove', check, { passive:true });

  dragTimer = setTimeout(() => {
    cleanup();
    if (!hasMoved) { dragging = true; dragItem.classList.add('dragging'); dragItem.style.opacity='0.7'; dragItem.style.transform='scale(1.02)'; document.body.style.userSelect='none'; navigator.vibrate?.(50); }
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
    const nivel = window.nivelActual?.(window.rutaActual);
    if (nivel) { const moved = nivel.hijos.splice(dragStartIndex, 1)[0]; nivel.hijos.splice(newIndex, 0, moved); guardarDatos(); }
  }
  dragItem = null; dragStartIndex = null; hasMoved = false;
}

// ============================================================
// DRAG & DROP — EJERCICIOS (nivel 4)
// ============================================================
function startDragEjercicio(e) {
  if (e.type === 'mousedown' && e.button !== 0) return;
  dragEjercicio = e.currentTarget.closest('.ejercicio-acordeon');
  if (!dragEjercicio) return;
  draggingEjercicio = false; hasMovedEjercicio = false;
  dragEjercicioStartIndex = [...(dragEjercicio.parentElement?.children || [])].indexOf(dragEjercicio);
  const touch = e.touches?.[0] || e;
  dragEjercicioStartX = touch.clientX; dragEjercicioStartY = touch.clientY;

  const check = (me) => {
    const mt = me.touches?.[0] || me;
    if (Math.abs(mt.clientX - dragEjercicioStartX) > MOVEMENT_THRESHOLD || Math.abs(mt.clientY - dragEjercicioStartY) > MOVEMENT_THRESHOLD) { hasMovedEjercicio = true; clearTimeout(dragEjercicioTimer); dragEjercicioTimer = null; cleanup(); }
  };
  const cleanup = () => { document.removeEventListener('mousemove', check); document.removeEventListener('touchmove', check); };
  document.addEventListener('mousemove', check, { passive:true });
  document.addEventListener('touchmove', check, { passive:true });

  dragEjercicioTimer = setTimeout(() => {
    cleanup();
    if (!hasMovedEjercicio) { draggingEjercicio = true; dragEjercicio.classList.add('dragging'); dragEjercicio.style.opacity='0.7'; dragEjercicio.style.transform='scale(1.02)'; document.body.style.userSelect='none'; navigator.vibrate?.(50); }
  }, LONG_PRESS_DURATION);
}

function dragMoveEjercicio(e) {
  if (!draggingEjercicio || !dragEjercicio) return;
  e.preventDefault();
  const y = (e.touches?.[0] || e).clientY;
  const items = [...document.querySelectorAll('.ejercicio-acordeon:not(.dragging)')];
  const target = items.find(item => y < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
  if (target) dragEjercicio.parentElement?.insertBefore(dragEjercicio, target);
  else if (items.length > 0) dragEjercicio.parentElement?.appendChild(dragEjercicio);
}

function dragEndEjercicio() {
  clearTimeout(dragEjercicioTimer); dragEjercicioTimer = null;
  document.body.style.userSelect = '';
  if (!draggingEjercicio || !dragEjercicio) { dragEjercicio = null; dragEjercicioStartIndex = null; hasMovedEjercicio = false; return; }
  dragEjercicio.style.opacity = ''; dragEjercicio.style.transform = '';
  draggingEjercicio = false; dragEjercicio.classList.remove('dragging');
  const newIndex = [...(dragEjercicio.parentElement?.children || [])].indexOf(dragEjercicio);
  if (dragEjercicioStartIndex !== null && newIndex !== dragEjercicioStartIndex) {
    const nivel = window.nivelActual?.(window.rutaActual);
    if (nivel) { const moved = nivel.hijos.splice(dragEjercicioStartIndex, 1)[0]; nivel.hijos.splice(newIndex, 0, moved); guardarDatos(); }
  }
  dragEjercicio = null; dragEjercicioStartIndex = null; hasMovedEjercicio = false;
}

// Registrar listeners globales de drag de ejercicios
document.addEventListener('mousemove', dragMoveEjercicio);
document.addEventListener('touchmove', dragMoveEjercicio, { passive: false });
document.addEventListener('mouseup',   dragEndEjercicio);
document.addEventListener('touchend',  dragEndEjercicio);

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
  datos[0]?.hijos?.forEach((meso, mi) => meso.hijos?.forEach((micro, mci) => micro.hijos?.forEach((sesion, si) => {
    let fecha = sesion.fecha;
    if (!fecha && sesion.hijos?.length) for (const s of sesion.hijos) { if (s.fecha) { fecha = s.fecha; break; } }
    sesion.hijos?.forEach(bloque => {
      (bloque.hijos || [bloque]).forEach(ej => {
        if (ej.nombre === nombreEjercicio && fecha) sesiones.push({ fecha, ejercicio: ej, ruta: [0, mi, mci, si] });
      });
    });
  })));
  sesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const fechaActualDia = (() => { const v = localStorage.getItem('sessionTimerRuta'); return null; })();
  return sesiones.find(s => s.ruta.join('-') !== rutaActual.join('-')) || null;
}
