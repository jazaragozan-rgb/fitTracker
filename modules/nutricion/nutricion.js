// ============================================================
// modules/nutricion/nutricion.js
// Sistema de seguimiento nutricional.
// Importa Firebase desde core/ — no desde auth.js directamente.
// ============================================================

import { auth, db }  from '../../core/firebase.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { hoyISO, sumarDias } from '../../shared/utils.js';

// ── Configuración ─────────────────────────────────────────────
const METAS_DIARIAS = { calorias: 2000, proteinas: 150, carbohidratos: 250, grasas: 65 };

const TIPOS_COMIDA = [
  { id: 'desayuno',  nombre: 'Desayuno',  icono: '🌅', color: '#FFB74D' },
  { id: 'almuerzo',  nombre: 'Almuerzo',  icono: '☀️', color: '#4FC3F7' },
  { id: 'cena',      nombre: 'Cena',      icono: '🌙', color: '#9575CD' },
  { id: 'snacks',    nombre: 'Snacks',    icono: '🍎', color: '#81C784' }
];

// ── Estado de fecha seleccionada (módulo-level) ───────────────
let fechaSeleccionada = hoyISO();
const obtenerFechaSeleccionada = () => fechaSeleccionada;
const cambiarFecha = (dias) => { fechaSeleccionada = sumarDias(fechaSeleccionada, dias); };

// ── Firestore: cargar metas ───────────────────────────────────
async function cargarMetasFirestore() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (snap.exists() && snap.data().metasNutricionales) {
      const m = snap.data().metasNutricionales;
      METAS_DIARIAS.calorias      = m.calorias               || 2000;
      METAS_DIARIAS.proteinas     = m.macros?.proteinas?.g    || 150;
      METAS_DIARIAS.carbohidratos = m.macros?.carbohidratos?.g|| 250;
      METAS_DIARIAS.grasas        = m.macros?.grasas?.g       || 65;
    }
  } catch (err) { console.error('[Nutrición] Error cargando metas:', err); }
}

// ── Firestore: cargar registros del día ───────────────────────
async function cargarRegistrosFirestore(nivel, fecha) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (!snap.exists()) return;
    const registros = snap.data().nutricion?.[fecha]?.items || [];
    nivel.hijos = (nivel.hijos || []).filter(r => r.fecha !== fecha);
    registros.forEach(r => nivel.hijos.push(r));
  } catch (err) { console.error('[Nutrición] Error cargando registros:', err); }
}

// ── Firestore: guardar registros del día ──────────────────────
async function guardarRegistrosFirestore(nivel, fecha) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const registrosDia = (nivel.hijos || []).filter(r => r.fecha === fecha);
    await setDoc(doc(db, 'usuarios', user.uid),
      { nutricion: { [fecha]: { items: registrosDia, updatedAt: new Date() } } },
      { merge: true }
    );
  } catch (err) { console.error('[Nutrición] Error guardando registros:', err); }
}

// ── Export principal ──────────────────────────────────────────
export async function renderizarNutricion(nivel, contenido, subHeader, addButton, rutaActual) {
  await cargarMetasFirestore();
  subHeader.innerHTML = '';
  if (!nivel)        nivel        = { nombre: 'Nutrición', hijos: [] };
  if (!nivel.hijos)  nivel.hijos  = [];

  const fechaActual = obtenerFechaSeleccionada();
  await cargarRegistrosFirestore(nivel, fechaActual);

  // Subheader
  const h2 = document.createElement('h2'); h2.id = 'tituloNivel'; h2.textContent = 'Nutrición';
  subHeader.appendChild(h2);
  const botonesContainer = document.createElement('div');
  botonesContainer.id = 'subHeaderButtons';
  botonesContainer.style.cssText = 'display:flex;justify-content:center;gap:8px;';
  const btnMetas = document.createElement('button');
  btnMetas.className = 'header-btn'; btnMetas.innerHTML = '🎯 Objetivo calorías';
  btnMetas.style.width = '200px'; btnMetas.style.padding = '8px';
  btnMetas.onclick = () => mostrarModalMetas();
  botonesContainer.appendChild(btnMetas);
  subHeader.appendChild(botonesContainer);

  // Wrapper principal fijo
  const mainWrapper = document.createElement('div');
  mainWrapper.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;z-index:1;';
  const calcEspacio = () => {
    const h = document.querySelector('header')?.offsetHeight    || 48;
    const s = document.getElementById('subHeader')?.offsetHeight || 76;
    return h + s;
  };
  mainWrapper.style.paddingTop = `${calcEspacio()}px`;
  let resizeT2;
  const onResize2 = () => { clearTimeout(resizeT2); resizeT2 = setTimeout(() => { mainWrapper.style.paddingTop = `${calcEspacio()}px`; }, 100); };
  window.addEventListener('resize', onResize2);
  mainWrapper.addEventListener('DOMNodeRemoved', () => window.removeEventListener('resize', onResize2));

  // Selector de fecha (fijo)
  mainWrapper.appendChild(_crearSelectorFecha(fechaActual, nivel));

  // Contenido scrolleable
  const scroll = document.createElement('div');
  scroll.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;background:var(--bg-main);padding:16px;padding-bottom:80px;';

  const registrosHoy = (nivel.hijos || []).filter(r => r.fecha === fechaActual);
  scroll.appendChild(await _crearResumenCalorias(registrosHoy, fechaActual));
  scroll.appendChild(_crearMacrosBarras(registrosHoy));
  scroll.appendChild(_crearSeccionComidas(registrosHoy, nivel, scroll, fechaActual));
  scroll.appendChild(_crearResumenSemanal(nivel.hijos || []));
  scroll.appendChild(_crearAlimentosFrecuentes(nivel));

  mainWrapper.appendChild(scroll);
  contenido.innerHTML = '';
  contenido.style.cssText = 'padding:0;margin:0;overflow:hidden;';
  contenido.appendChild(mainWrapper);
}

// ── Selector de fecha ─────────────────────────────────────────
function _crearSelectorFecha(fechaActual, nivel) {
  const container = document.createElement('div');
  container.className = 'nutricion-selector-fecha';
  const fecha = new Date(fechaActual + 'T00:00:00');
  const esHoy  = fechaActual === hoyISO();

  const btnAnt = document.createElement('button'); btnAnt.className = 'nutricion-fecha-nav-btn'; btnAnt.innerHTML = '←';
  const btnSig = document.createElement('button'); btnSig.className = 'nutricion-fecha-nav-btn'; btnSig.innerHTML = '→';
  btnSig.style.opacity = esHoy ? '0.3' : '1'; btnSig.disabled = esHoy;

  const centro = document.createElement('div'); centro.className = 'nutricion-fecha-centro';
  const diaNombre = document.createElement('div'); diaNombre.className = 'nutricion-fecha-dia';
  diaNombre.textContent = esHoy ? 'Hoy' : fecha.toLocaleDateString('es-ES', { weekday:'long' });
  diaNombre.style.color = esHoy ? 'var(--primary-mint)' : 'var(--text-primary)';
  const diaNum = document.createElement('div'); diaNum.className = 'nutricion-fecha-completa';
  diaNum.textContent = fecha.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
  centro.append(diaNombre, diaNum);

  const reload = async () => {
    const cont   = document.getElementById('contenido');
    const subHdr = document.getElementById('subHeader');
    if (cont && subHdr) await renderizarNutricion(nivel, cont, subHdr, null);
  };
  btnAnt.onclick = async e => { e.preventDefault(); cambiarFecha(-1); await reload(); };
  btnSig.onclick = async e => { e.preventDefault(); if (!esHoy) { cambiarFecha(1); await reload(); } };
  container.append(btnAnt, centro, btnSig);
  return container;
}

// ── Resumen calorías circular ─────────────────────────────────
async function _crearResumenCalorias(registros, fecha) {
  const container = document.createElement('div');
  container.style.cssText = 'background:var(--bg-card);border-radius:16px;padding:24px;margin-bottom:12px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;align-items:center;';
  const totales   = _calcularTotales(registros);
  const meta       = METAS_DIARIAS.calorias;
  const consumidas = totales.calorias;
  const restantes  = Math.max(0, meta - consumidas);
  const pct        = Math.min(100, (consumidas / meta) * 100);
  const quemadas   = await _calcularCaloriasQuemadasMET(fecha);

  // SVG circular
  const svgSize = 140, stroke = 12, r = (svgSize - stroke) / 2, circ = 2 * Math.PI * r;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', svgSize); svg.setAttribute('height', svgSize);
  svg.style.transform = 'rotate(-90deg)';
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', svgSize/2); bg.setAttribute('cy', svgSize/2); bg.setAttribute('r', r);
  bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', 'var(--border-color)'); bg.setAttribute('stroke-width', stroke);
  const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fg.setAttribute('cx', svgSize/2); fg.setAttribute('cy', svgSize/2); fg.setAttribute('r', r);
  fg.setAttribute('fill', 'none'); fg.setAttribute('stroke', pct >= 100 ? '#FF6B6B' : 'var(--primary-mint)'); fg.setAttribute('stroke-width', stroke);
  fg.setAttribute('stroke-linecap', 'round');
  fg.setAttribute('stroke-dasharray', `${(pct/100)*circ} ${circ}`);
  svg.append(bg, fg);

  const circWrap = document.createElement('div');
  circWrap.style.cssText = `position:relative;width:${svgSize}px;height:${svgSize}px;flex-shrink:0;`;
  circWrap.appendChild(svg);
  const centro = document.createElement('div');
  centro.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;`;
  centro.innerHTML = `<div style="font-size:1.6rem;font-weight:900;color:var(--text-primary);">${Math.round(consumidas)}</div><div style="font-size:0.65rem;font-weight:700;color:var(--text-secondary);">kcal</div>`;
  circWrap.appendChild(centro);

  const fila = document.createElement('div'); fila.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;gap:16px;';
  const bloqC = document.createElement('div'); bloqC.style.cssText = 'text-align:center;flex:1;';
  bloqC.innerHTML = `<div style="color:var(--text-secondary);font-size:0.75rem;font-weight:600;">Restantes</div><div style="color:var(--primary-mint);font-size:1.4rem;font-weight:800;">${Math.round(restantes)}</div>`;
  const bloqQ = document.createElement('div'); bloqQ.style.cssText = 'text-align:center;flex:1;';
  bloqQ.innerHTML = `<div style="color:var(--text-secondary);font-size:0.75rem;font-weight:600;">Quemadas</div><div style="color:#FF8A65;font-size:1.4rem;font-weight:800;">${Math.round(quemadas)}</div>`;
  fila.append(bloqC, circWrap, bloqQ);

  const objetivo = document.createElement('div');
  objetivo.style.cssText = 'text-align:center;margin-top:12px;width:100%;';
  objetivo.innerHTML = `<div style="color:var(--text-secondary);font-size:0.75rem;font-weight:600;">Objetivo</div><div style="color:var(--text-primary);font-size:1.1rem;font-weight:800;">${meta} kcal</div>`;
  container.append(fila, objetivo);
  return container;
}

async function _calcularCaloriasQuemadasMET(fecha) {
  const MET = 5.0;
  const datos = window.datos;
  if (!datos?.[0]) return 0;
  let minutos = 0;
  datos[0].hijos?.forEach(meso => meso.hijos?.forEach(micro => micro.hijos?.forEach(sesion => {
    const f = sesion.fecha ? sesion.fecha.slice(0, 10) : null;
    if (f === fecha && sesion.duracionMinutos > 0) minutos += sesion.duracionMinutos;
  })));
  if (!minutos) return 0;
  let peso = 75;
  try {
    const user = auth.currentUser;
    if (user) {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists() && snap.data().metasNutricionales?.medidas?.peso)
        peso = parseFloat(snap.data().metasNutricionales.medidas.peso);
    }
  } catch (_) {}
  return Math.round(MET * peso * (minutos / 60));
}

// ── Macros con barras ─────────────────────────────────────────
function _crearMacrosBarras(registros) {
  const container = document.createElement('div');
  container.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow-sm);';
  const totales = _calcularTotales(registros);
  [
    { nombre:'Proteínas',     valor:totales.proteinas,     meta:METAS_DIARIAS.proteinas,     unidad:'g', color:'#FF6B6B', icono:'💪' },
    { nombre:'Carbohidratos', valor:totales.carbohidratos, meta:METAS_DIARIAS.carbohidratos, unidad:'g', color:'#4FC3F7', icono:'🍞' },
    { nombre:'Grasas',        valor:totales.grasas,        meta:METAS_DIARIAS.grasas,        unidad:'g', color:'#FFB74D', icono:'🥑' }
  ].forEach((macro, i, arr) => {
    const div = document.createElement('div'); div.style.marginBottom = i < arr.length-1 ? '16px' : '0';
    const pct = Math.min(100, (macro.valor / macro.meta) * 100);
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div><span style="margin-right:6px;">${macro.icono}</span><span style="font-weight:600;color:var(--text-primary);font-size:0.9rem;">${macro.nombre}</span></div>
        <div style="font-size:0.85rem;font-weight:700;"><span style="color:${macro.color};">${Math.round(macro.valor)}</span><span style="color:var(--text-light);"> / ${macro.meta}${macro.unidad}</span></div>
      </div>
      <div style="width:100%;height:8px;background:#E8E8E8;border-radius:4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${macro.color};border-radius:4px;transition:width 0.5s ease;"></div>
      </div>`;
    container.appendChild(div);
  });
  return container;
}

// ── Sección de comidas por tipo ───────────────────────────────
function _crearSeccionComidas(registros, nivel, scroll, fechaActual) {
  const section = document.createElement('div'); section.style.marginBottom = '12px';
  TIPOS_COMIDA.forEach(tipo => {
    const regs    = registros.filter(r => r.tipoComida === tipo.id);
    const totales = _calcularTotales(regs);
    const card    = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card);border-radius:12px;margin-bottom:8px;overflow:hidden;box-shadow:var(--neu-out-sm);';
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;';
    header.innerHTML = `
      <span style="font-size:1.2rem;">${tipo.icono}</span>
      <span style="flex:1;font-size:0.9rem;font-weight:700;color:var(--text-primary);text-align:left;">${tipo.nombre}</span>
      <span style="font-size:0.85rem;font-weight:800;color:var(--primary-mint);">${Math.round(totales.calorias)} kcal</span>`;
    card.appendChild(header);

    // Alimentos del tipo
    regs.forEach((reg, idx) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 16px;border-top:1px solid var(--border-color);';
      item.innerHTML = `
        <div style="flex:1;text-align:left;">
          <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${reg.nombre}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);">${reg.cantidad}g · P:${Math.round(reg.proteinas)}g · C:${Math.round(reg.carbohidratos)}g · G:${Math.round(reg.grasas)}g</div>
        </div>
        <div style="font-size:0.85rem;font-weight:700;color:var(--primary-mint);">${Math.round(reg.calorias)} kcal</div>`;
      const btnDel = document.createElement('button');
      btnDel.textContent = '✕'; btnDel.style.cssText = 'background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.9rem;padding:4px 6px;width:auto;margin:0;box-shadow:none;';
      btnDel.onclick = async e => {
        e.stopPropagation();
        nivel.hijos = nivel.hijos.filter(r => r !== reg);
        await guardarRegistrosFirestore(nivel, fechaActual);
        const cont = document.getElementById('contenido'), subHdr = document.getElementById('subHeader');
        if (cont && subHdr) await renderizarNutricion(nivel, cont, subHdr, null);
      };
      item.appendChild(btnDel);
      card.appendChild(item);
    });

    // Botón añadir alimento
    const btnAdd = document.createElement('button');
    btnAdd.className = 'nutricion-btn-add-alimento';
    btnAdd.textContent = `+ Añadir a ${tipo.nombre.toLowerCase()}`;
    btnAdd.style.cssText += 'margin:8px 16px;width:calc(100% - 32px);';
    btnAdd.onclick = () => mostrarBuscadorAlimentos(nivel, document.getElementById('contenido'), tipo.id);
    card.appendChild(btnAdd);
    section.appendChild(card);
  });
  return section;
}

// ── Resumen semanal ───────────────────────────────────────────
function _crearResumenSemanal(registros) {
  const container = document.createElement('div');
  container.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow-sm);';
  const titulo = document.createElement('h3');
  titulo.style.cssText = 'font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px;';
  titulo.textContent = 'Últimos 7 días';
  container.appendChild(titulo);

  const datos7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const fStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const t = _calcularTotales(registros.filter(r => r.fecha === fStr));
    datos7.push({ dia: d.toLocaleDateString('es-ES',{weekday:'short'}).charAt(0).toUpperCase(), calorias: t.calorias, ok: t.calorias >= METAS_DIARIAS.calorias*0.8 && t.calorias <= METAS_DIARIAS.calorias*1.2 });
  }
  const maxC = Math.max(...datos7.map(d => d.calorias), METAS_DIARIAS.calorias);
  const graf = document.createElement('div'); graf.style.cssText = 'display:flex;align-items:flex-end;justify-content:space-between;height:80px;gap:4px;';
  datos7.forEach(d => {
    const bc = document.createElement('div'); bc.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;';
    const b  = document.createElement('div'); b.style.cssText = `width:100%;height:${Math.max((d.calorias/maxC)*100,5)}%;background:${d.ok?'var(--primary-mint)':'var(--text-light)'};border-radius:4px 4px 0 0;transition:all 0.3s;`;
    const l  = document.createElement('div'); l.textContent = d.dia; l.style.cssText = 'font-size:0.7rem;color:var(--text-secondary);font-weight:600;';
    bc.append(b, l); graf.appendChild(bc);
  });
  container.appendChild(graf);
  const prom = datos7.reduce((s,d)=>s+d.calorias,0)/7;
  const promDiv = document.createElement('div'); promDiv.style.cssText = 'margin-top:12px;text-align:center;font-size:0.8rem;color:var(--text-secondary);';
  promDiv.innerHTML = `Promedio: <span style="font-weight:700;color:var(--primary-mint);">${Math.round(prom)} kcal/día</span>`;
  container.appendChild(promDiv);
  return container;
}

// ── Alimentos frecuentes ──────────────────────────────────────
function _crearAlimentosFrecuentes(nivel) {
  const container = document.createElement('div');
  container.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow-sm);';
  const titulo = document.createElement('h3');
  titulo.style.cssText = 'font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;';
  titulo.textContent = '⚡ Acceso Rápido';
  container.appendChild(titulo);

  const frecuencias = {};
  (nivel.hijos || []).forEach(r => {
    if (!frecuencias[r.nombre]) frecuencias[r.nombre] = { count:0, ultimoRegistro:r };
    frecuencias[r.nombre].count++;
  });
  const top = Object.entries(frecuencias).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
  if (!top.length) {
    const msg = document.createElement('div'); msg.style.cssText = 'text-align:center;color:var(--text-light);font-size:0.85rem;padding:16px;';
    msg.textContent = 'Los alimentos frecuentes aparecerán aquí'; container.appendChild(msg); return container;
  }
  top.forEach(([nombre, data]) => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--bg-main);margin-bottom:6px;cursor:pointer;';
    item.innerHTML = `
      <div style="text-align:left;"><div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${nombre}</div><div style="font-size:0.72rem;color:var(--text-secondary);">${Math.round(data.ultimoRegistro.calorias)} kcal · ${data.count}× usado</div></div>
      <span style="color:var(--primary-mint);font-size:1.2rem;">+</span>`;
    item.onclick = () => {
      const reg = { ...data.ultimoRegistro, fecha: obtenerFechaSeleccionada(), tipoComida: data.ultimoRegistro.tipoComida || 'snacks' };
      nivel.hijos.push(reg);
      guardarRegistrosFirestore(nivel, reg.fecha).then(() => {
        const cont = document.getElementById('contenido'), subHdr = document.getElementById('subHeader');
        if (cont && subHdr) renderizarNutricion(nivel, cont, subHdr, null);
      });
    };
    container.appendChild(item);
  });
  return container;
}

// ── Helper: calcular totales de macros ────────────────────────
function _calcularTotales(registros) {
  return (registros || []).reduce((acc, r) => {
    acc.calorias      += r.calorias      || 0;
    acc.proteinas     += r.proteinas     || 0;
    acc.carbohidratos += r.carbohidratos || 0;
    acc.grasas        += r.grasas        || 0;
    return acc;
  }, { calorias:0, proteinas:0, carbohidratos:0, grasas:0 });
}

// ── Buscador de alimentos (OpenFoodFacts) ─────────────────────
export function mostrarBuscadorAlimentos(nivel, contenido, tipoComida = 'desayuno') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:16px;width:90%;max-width:500px;max-height:85vh;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden;';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:20px;border-bottom:1px solid var(--border-color);';
  const titulo = document.createElement('h3'); titulo.textContent = 'Buscar Alimento'; titulo.style.cssText = 'margin:0;font-weight:700;font-size:1.1rem;color:var(--text-primary);';
  const btnC = document.createElement('button'); btnC.textContent = '✖'; btnC.style.cssText = 'background:transparent;border:none;cursor:pointer;font-size:1rem;color:var(--text-secondary);width:auto;margin:0;padding:4px 8px;box-shadow:none;';
  btnC.onclick = () => overlay.remove();
  header.append(titulo, btnC); modal.appendChild(header);

  const input = document.createElement('input');
  input.placeholder = 'Buscar alimento...'; input.type = 'text';
  input.style.cssText = 'margin:12px 16px;background:var(--bg-main);border:none;border-radius:10px;padding:10px 14px;font-size:0.9rem;box-shadow:var(--neu-in-sm);outline:none;width:calc(100% - 32px);text-align:left;color:var(--text-primary);';

  const list = document.createElement('div');
  list.style.cssText = 'flex:1;overflow-y:auto;padding:0 12px 12px;';
  const msg = document.createElement('div'); msg.textContent = 'Escribe para buscar alimentos...'; msg.style.cssText = 'text-align:center;color:var(--text-light);font-size:0.9rem;padding:32px 16px;';
  list.appendChild(msg);

  modal.append(input, list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => input.focus(), 100);

  let searchT;
  input.addEventListener('input', () => {
    clearTimeout(searchT);
    searchT = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 2) { list.innerHTML = ''; list.appendChild(msg); return; }
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">🔍 Buscando...</div>';
      try {
        const res  = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,nutriments,brands,serving_size`);
        const data = await res.json();
        const productos = (data.products || []).filter(p => p.product_name && p.nutriments?.['energy-kcal_100g']);
        list.innerHTML = '';
        if (!productos.length) { list.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:20px;">Sin resultados</div>'; return; }
        productos.slice(0,15).forEach(p => {
          const item = document.createElement('div');
          item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;background:var(--bg-main);box-shadow:var(--neu-out-sm);margin-bottom:6px;';
          const n = p.nutriments;
          item.innerHTML = `
            <div style="width:44px;height:44px;border-radius:10px;background:rgba(61,213,152,0.1);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">🥗</div>
            <div style="flex:1;text-align:left;min-width:0;">
              <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.product_name}</div>
              <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px;">${Math.round(n['energy-kcal_100g'])} kcal · P:${Math.round(n.proteins_100g||0)}g · C:${Math.round(n.carbohydrates_100g||0)}g · G:${Math.round(n.fat_100g||0)}g (por 100g)</div>
            </div>`;
          item.addEventListener('mouseenter', () => item.style.boxShadow='var(--neu-in-sm)');
          item.addEventListener('mouseleave', () => item.style.boxShadow='var(--neu-out-sm)');
          item.onclick = () => _mostrarModalCantidad(p, nivel, tipoComida, overlay);
          list.appendChild(item);
        });
      } catch (err) { list.innerHTML = '<div style="text-align:center;color:var(--danger);padding:20px;">Error de conexión</div>'; }
    }, 400);
  });
}

function _mostrarModalCantidad(producto, nivel, tipoComida, overlayPadre) {
  const modal2 = document.createElement('div');
  modal2.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;';
  const caja = document.createElement('div');
  caja.style.cssText = 'background:var(--bg-main);border-radius:16px;padding:24px;width:90%;max-width:320px;box-shadow:var(--neu-out-lg);';
  const n = producto.nutriments;
  caja.innerHTML = `
    <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px;color:var(--text-primary);">${producto.product_name}</h3>
    <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">Por 100g: ${Math.round(n['energy-kcal_100g'])} kcal · P:${Math.round(n.proteins_100g||0)}g</div>
    <label style="display:block;font-size:0.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">Cantidad (gramos)</label>`;
  const inp = document.createElement('input'); inp.type='number'; inp.value='100'; inp.min='1'; inp.style.cssText='background:var(--bg-main);border:none;border-radius:10px;padding:10px 14px;width:100%;font-size:1rem;font-weight:700;text-align:center;box-shadow:var(--neu-in-sm);outline:none;margin:0 0 16px;color:var(--text-primary);';
  const bots = document.createElement('div'); bots.style.cssText = 'display:flex;gap:10px;';
  const btnG = document.createElement('button'); btnG.className='btn-confirmacion-si'; btnG.textContent='Añadir';
  btnG.onclick = async () => {
    const cant = parseFloat(inp.value) || 100;
    const f    = cant / 100;
    const reg  = { fecha: obtenerFechaSeleccionada(), nombre: producto.product_name, cantidad: cant, calorias: (n['energy-kcal_100g']||0)*f, proteinas: (n.proteins_100g||0)*f, carbohidratos: (n.carbohydrates_100g||0)*f, grasas: (n.fat_100g||0)*f, tipoComida };
    nivel.hijos = nivel.hijos || [];
    nivel.hijos.push(reg);
    await guardarRegistrosFirestore(nivel, reg.fecha);
    modal2.remove(); overlayPadre?.remove();
    const cont = document.getElementById('contenido'), subHdr = document.getElementById('subHeader');
    if (cont && subHdr) await renderizarNutricion(nivel, cont, subHdr, null);
  };
  const btnX = document.createElement('button'); btnX.className='btn-confirmacion-no'; btnX.textContent='Cancelar'; btnX.onclick=()=>modal2.remove();
  bots.append(btnG, btnX); caja.append(inp, bots); modal2.appendChild(caja);
  document.body.appendChild(modal2);
}

// ── Modal configurar metas ────────────────────────────────────
async function mostrarModalMetas() {
  const user = auth.currentUser; if (!user) return;
  let metasActuales = {};
  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (snap.exists()) metasActuales = snap.data().metasNutricionales || {};
  } catch(_) {}

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(180,190,195,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px);';
  const caja = document.createElement('div');
  caja.style.cssText = 'background:var(--bg-main);padding:24px;border-radius:20px;width:90%;max-width:400px;max-height:90vh;overflow-y:auto;box-shadow:var(--neu-out-lg);display:flex;flex-direction:column;gap:14px;';
  caja.innerHTML = '<h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);text-align:center;">🎯 Configurar Metas</h3>';

  const campos = [
    { key:'calorias',      label:'Calorías objetivo (kcal)', default: metasActuales.calorias || 2000 },
    { key:'proteinas',     label:'Proteínas (g)',             default: metasActuales.macros?.proteinas?.g || 150 },
    { key:'carbohidratos', label:'Carbohidratos (g)',         default: metasActuales.macros?.carbohidratos?.g || 250 },
    { key:'grasas',        label:'Grasas (g)',                default: metasActuales.macros?.grasas?.g || 65 },
  ];
  const inputs = {};
  campos.forEach(c => {
    const lbl = document.createElement('label'); lbl.style.cssText = 'display:block;font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-align:left;margin-bottom:4px;'; lbl.textContent = c.label;
    const inp = document.createElement('input'); inp.type='number'; inp.value=c.default; inp.style.cssText='background:var(--bg-main);border:none;border-radius:10px;padding:10px 14px;width:100%;font-size:1rem;font-weight:700;text-align:center;box-shadow:var(--neu-in-sm);outline:none;margin:0 0 8px;color:var(--text-primary);';
    inputs[c.key] = inp;
    caja.append(lbl, inp);
  });

  const bots = document.createElement('div'); bots.style.cssText = 'display:flex;gap:10px;margin-top:8px;';
  const btnG = document.createElement('button'); btnG.className='btn-confirmacion-si'; btnG.textContent='Guardar';
  btnG.onclick = async () => {
    try {
      const nuevasMetas = { calorias: +inputs.calorias.value, macros: { proteinas:{ g:+inputs.proteinas.value }, carbohidratos:{ g:+inputs.carbohidratos.value }, grasas:{ g:+inputs.grasas.value } }, updatedAt: new Date() };
      await setDoc(doc(db,'usuarios',user.uid), { metasNutricionales: nuevasMetas }, { merge:true });
      METAS_DIARIAS.calorias=nuevasMetas.calorias; METAS_DIARIAS.proteinas=nuevasMetas.macros.proteinas.g;
      METAS_DIARIAS.carbohidratos=nuevasMetas.macros.carbohidratos.g; METAS_DIARIAS.grasas=nuevasMetas.macros.grasas.g;
      alert('✅ Metas guardadas'); modal.remove(); window.renderizar?.();
    } catch (e) { alert('❌ Error al guardar: ' + e.message); }
  };
  const btnX = document.createElement('button'); btnX.className='btn-confirmacion-no'; btnX.textContent='Cancelar'; btnX.onclick=()=>modal.remove();
  bots.append(btnG, btnX); caja.appendChild(bots); modal.appendChild(caja);
  document.body.appendChild(modal);
}
