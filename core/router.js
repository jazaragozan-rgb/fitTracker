// ============================================================
// core/router.js
// Navegación y renderizado principal de la app.
//
// Gestiona: rutaActual, renderizar(), menú lateral,
// subheader dinámico y despacho a cada módulo.
// ============================================================

import { datos, guardarDatos, nivelActual } from './store.js';
import { renderizarDashboard }   from '../modules/dashboard/dashboard.js';
import { renderizarSeguimiento } from '../modules/seguimiento/seguimiento.js';
import { renderizarCalendario }  from '../modules/calendario/calendario.js';
import { renderizarNutricion }   from '../modules/nutricion/nutricion.js';
import { iniciarEntrenamiento }  from '../modules/live/live.js';
import { mostrarConfirmacion }   from '../shared/ui.js';
import {
  renderizarNivel4,
  renderizarLista,
  abrirBuscadorEjercicios
} from '../modules/entrenamiento/entrenamiento.js';

// ── Estado de navegación ──────────────────────────────────────
export let rutaActual        = [];
export let ejercicioExpandido = null;
let ultimoMenuSeleccionado   = 'Dashboard';

// ── Referencias al DOM (se inicializan en init()) ─────────────
let contenido, subHeader, menuTitulo;
let backButton, addButton, menuButton, sideMenu, menuOverlay;
let homeButton, logoutButton;

// ── Helpers ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function ajustarPaddingContenido() {
  if (!contenido) return;
  const headerEl    = document.querySelector('header');
  const subHeaderEl = document.getElementById('subHeader');
  const offsetTop   = (headerEl    ? headerEl.offsetHeight    : 48)
                    + (subHeaderEl ? subHeaderEl.offsetHeight : 60);
  contenido.style.paddingTop = `${offsetTop}px`;
  contenido.style.marginTop  = '0';
}

function asignarSesionIds(datosArray) {
  datosArray.forEach((meso, i) => {
    (meso.hijos || []).forEach((micro, j) => {
      (micro.hijos || []).forEach((sesion, k) => {
        sesion.sesionId = `${i}-${j}-${k}`;
        (sesion.hijos || []).forEach(bloque => {
          (bloque.hijos || []).forEach(ej => { ej.sesionId = sesion.sesionId; });
        });
      });
    });
  });
}

// ── Renderizado principal ─────────────────────────────────────
export function renderizar() {
  if (!contenido) return;
  contenido.innerHTML = '';

  const nivel = nivelActual(rutaActual);
  asignarSesionIds(datos);

  // Título del menú lateral
  if (menuTitulo) {
    if (rutaActual.length === 0) menuTitulo.textContent = 'Dashboard';
    else if (rutaActual.length >= 1 && rutaActual.length <= 4) menuTitulo.textContent = 'Entrenamiento';
    else menuTitulo.textContent = ultimoMenuSeleccionado;
  }

  // ── Subheader ────────────────────────────────────────────────
  subHeader.innerHTML = '';
  subHeader.style.display = 'flex';

  if (rutaActual.length === 0) {
    // Dashboard: botón "Empezar entrenamiento"
    _buildSubheaderDashboard();
  } else {
    // Niveles 1–4: título + botones volver / añadir / buscar
    _buildSubheaderNivel(nivel);
  }

  // ── Despacho a módulos ───────────────────────────────────────
  if (rutaActual.length === 0) {
    renderizarDashboard(datos, rutaActual, _crearIndice, contenido,
      $('tituloNivel'), backButton, addButton);
    return;
  }
  if (rutaActual.length === 1 && rutaActual[0] === 1) {
    renderizarSeguimiento(nivel, contenido, subHeader, addButton);
    return;
  }
  if (rutaActual.length === 1 && rutaActual[0] === 2) {
    renderizarCalendario(datos, contenido, subHeader, rutaActual, renderizar);
    return;
  }
  if (rutaActual.length === 1 && rutaActual[0] === 3) {
    if (!datos[3]) datos[3] = { nombre: 'Nutrición', hijos: [] };
    renderizarNutricion(datos[3], contenido, subHeader, addButton, rutaActual);
    return;
  }

  // Niveles de entrenamiento 1–4
  contenido.style.padding  = '';
  contenido.style.marginTop = '0';
  ajustarPaddingContenido();

  if (rutaActual.length === 4) {
    _renderNivel4(nivel);
    return;
  }

  // Niveles 1, 2, 3: lista de hijos
  backButton.style.visibility = 'visible';
  addButton.style.visibility  = 'visible';
  ajustarPaddingContenido();

  if (nivel.hijos && nivel.hijos.length) {
    // renderizarLista usa el módulo de entrenamiento y expone window.crearIndice
    renderizarLista(nivel, contenido, rutaActual);
  }
}



// ── Subheader: Dashboard ──────────────────────────────────────
function _buildSubheaderDashboard() {
  const h2 = document.createElement('h2');
  h2.id          = 'tituloNivel';
  h2.textContent = 'Dashboard';
  subHeader.appendChild(h2);

  const cont = document.createElement('div');
  cont.id           = 'subHeaderButtons';
  cont.style.display = 'flex';
  cont.style.justifyContent = 'center';

  const btn = document.createElement('button');
  btn.id        = 'liveEntrenamiento';
  btn.textContent = 'Empezar entrenamiento';
  btn.className = 'btn-primary';
  btn.addEventListener('click', iniciarEntrenamiento);
  cont.appendChild(btn);
  subHeader.appendChild(cont);
}

// ── Subheader: Niveles 1–4 ────────────────────────────────────
function _buildSubheaderNivel(nivel) {
  const nombres = ['Mesociclos', 'Microciclos', 'Sesiones', 'Ejercicios'];
  const titulo  = rutaActual.length === 1
    ? ['Entrenamiento', 'Seguimiento', 'Calendario', 'Nutrición'][rutaActual[0]] ?? nivel.nombre
    : nombres[rutaActual.length - 1] ?? nivel.nombre;

  const h2 = document.createElement('h2');
  h2.id          = 'tituloNivel';
  h2.textContent = titulo;
  subHeader.appendChild(h2);

  const cont = document.createElement('div');
  cont.id = 'subHeaderButtons';

  // Botón volver (niveles 2–4)
  if (rutaActual.length >= 2 && rutaActual.length <= 4) {
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-back-subheader';
    backBtn.innerHTML = '⬅';
    backBtn.addEventListener('click', e => {
      e.stopPropagation();
      rutaActual.pop();
      ejercicioExpandido = null;
      renderizar();
    });
    cont.appendChild(backBtn);
  }

  // Botón añadir
  const addBtn = document.createElement('button');
  addBtn.className   = 'header-btn';
  addBtn.textContent = '+ Añadir';
  addBtn.onclick = () => _onAnadir(nivel);
  cont.appendChild(addBtn);

  // Botón buscar ejercicio (solo nivel 4)
  if (rutaActual.length === 4) {
    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍';
    searchBtn.className   = 'btn-search';
    searchBtn.onclick     = () => window.abrirBuscadorEjercicios?.();
    cont.appendChild(searchBtn);
  }

  subHeader.appendChild(cont);
}

// ── Lógica del botón Añadir ───────────────────────────────────
function _onAnadir(nivel) {
  const nombreDefault = document.getElementById('tituloNivel')?.textContent ?? 'Nuevo';
  const crearItem = () => rutaActual.length === 4
    ? { nombre: '', hijos: [], series: [], editando: true, placeholder: `Nuevo ${nombreDefault}` }
    : { nombre: '', hijos: [],            editando: true, placeholder: `Nuevo ${nombreDefault}` };

  if (window.itemCopiado) {
    mostrarConfirmacion(
      '¿Pegar el contenido aquí o crear uno nuevo?',
      () => {
        if (window.itemCopiado.nivel !== rutaActual.length) {
          mostrarConfirmacion(`El contenido debe pegarse en el nivel ${window.itemCopiado.nivel}`, () => {}, null, 'Aceptar');
        } else {
          nivel.hijos.push(structuredClone(window.itemCopiado.datos));
          window.itemCopiado = null;
          guardarDatos(); renderizar();
        }
      },
      () => { nivel.hijos.push(crearItem()); guardarDatos(); renderizar(); },
      'Pegar', 'Crear nuevo'
    );
  } else {
    nivel.hijos.push(crearItem());
    guardarDatos(); renderizar();
  }
}

// ── Crear tarjeta de índice (niveles 1–3) ─────────────────────
// Delegamos al módulo de entrenamiento que tiene la implementación completa.
function _crearIndice(item, index, nivel) {
  // renderizarLista expone window.crearIndice al llamarse,
  // pero aquí creamos el elemento directamente via la función importada.
  // Como crearIndice no es export directo, usamos window como puente.
  if (typeof window.crearIndice === 'function') {
    return window.crearIndice(item, index, nivel);
  }
  // Fallback si el módulo aún no ha cargado
  const div = document.createElement('div');
  div.textContent = item.nombre || '(sin nombre)';
  div.style.cssText = 'padding:14px 16px;margin:8px 12px;border-radius:14px;cursor:pointer;background:var(--bg-card);box-shadow:var(--neu-out-sm);';
  div.addEventListener('click', () => { rutaActual.push(index); renderizar(); });
  return div;
}

// ── Inicialización: bind DOM + menú lateral ───────────────────
export function init() {
  contenido    = $('contenido');
  subHeader    = $('subHeader');
  menuTitulo   = $('menuTitulo');
  backButton   = $('backButton');
  addButton    = $('addButton');
  menuButton   = $('menuButton');
  sideMenu     = $('sideMenu');
  menuOverlay  = $('menuOverlay');
  homeButton   = $('navHome');
  logoutButton = $('logoutButton');

  // Botones fijos del header
  if (backButton) backButton.addEventListener('click', () => {
    if (rutaActual.length > 0) { rutaActual.pop(); ejercicioExpandido = null; renderizar(); }
  });
  if (homeButton) homeButton.addEventListener('click', () => {
    rutaActual = []; ejercicioExpandido = null; renderizar();
  });
  if (logoutButton) logoutButton.addEventListener('click', () => window.salir?.());

  // Menú lateral
  if (menuButton) menuButton.addEventListener('click', () => {
    sideMenu.style.left = '0';
    menuOverlay.classList.remove('hidden');
  });
  if (menuOverlay) menuOverlay.addEventListener('click', () => {
    sideMenu.style.left = '-70%';
    menuOverlay.classList.add('hidden');
  });

  document.querySelectorAll('.sideMenu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.seccion;
      const mapa = { dashboard: [], entrenamiento: [0], seguimiento: [1], calendario: [2], nutricion: [3] };
      const nombreMapa = { dashboard: 'Dashboard', entrenamiento: 'Entrenamiento', seguimiento: 'Seguimiento', calendario: 'Calendario', nutricion: 'Nutrición' };
      if (s in mapa) {
        rutaActual = mapa[s];
        ultimoMenuSeleccionado = nombreMapa[s];
      }
      ejercicioExpandido = null;
      renderizar();
      sideMenu.style.left = '-70%';
      menuOverlay.classList.add('hidden');
    });
  });

  // Exponer globalmente para compatibilidad con módulos legacy
  window.renderizar   = renderizar;
  window.rutaActual   = rutaActual;
  window.abrirBuscadorEjercicios = abrirBuscadorEjercicios;
}
