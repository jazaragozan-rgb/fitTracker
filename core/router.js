// ============================================================
// core/router.js
// Navegación y renderizado principal de la app.
//
// Gestiona: rutaActual, renderizar(), menú lateral,
// subheader dinámico y despacho a cada módulo.
// ============================================================

import { datos, guardarDatos, nivelActual } from './store.js';
import { auth } from './firebase.js';
import { renderizarDashboard }   from '../modules/dashboard/dashboard.js';
import { renderizarSeguimiento } from '../modules/seguimiento/seguimiento.js';
import { renderizarCalendario }  from '../modules/calendario/calendario.js';
import { renderizarNutricion }   from '../modules/nutricion/nutricion.js';
import { iniciarEntrenamiento, abrirBuscadorEjercicios } from '../modules/live/live.js';
import { mostrarConfirmacion }   from '../shared/ui.js';
import {
  renderizarNivel4,
  renderizarLista
} from '../modules/entrenamiento/entrenamiento.js';
import { restaurarTimer } from '../shared/timer.js';

// ── Estado de navegación ──────────────────────────────────────
export let rutaActual        = [];
export let ejercicioExpandido = null;
let ultimoMenuSeleccionado   = 'Dashboard';

// ── Referencias al DOM (se inicializan en init()) ─────────────
let contenido, subHeader, menuTitulo;
let backButton, addButton, logoutButton;
let footerButtons, headerUserName, headerAvatar;

// ── Helpers ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function ajustarPaddingContenido() {
  if (!contenido) return;
  const headerEl    = document.querySelector('header');
  const subHeaderEl = document.getElementById('subHeader');
  const offsetTop   = (headerEl    ? headerEl.offsetHeight    : 48)
                    + (subHeaderEl ? subHeaderEl.offsetHeight : 60);
  contenido.style.setProperty('padding-top', `${offsetTop}px`, 'important');
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
  restaurarTimer();

  _updateHeaderUser();
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
  _highlightFooterButton();

  if (rutaActual.length === 0) {
    _buildSubheaderDashboard();
  } else {
    _buildSubheaderNivel(nivel);
  }

  // ── Despacho a módulos ───────────────────────────────────────
  if (rutaActual.length === 0) {
    renderizarDashboard(
      datos, rutaActual, _crearIndice, contenido,
      $('tituloNivel'), backButton, addButton, renderizar
    );
    return;
  }

  if (rutaActual.length === 1 && rutaActual[0] === 1) {
    if (!datos[1]) datos[1] = { nombre: 'Seguimiento', hijos: [] };
    renderizarSeguimiento(datos[1], contenido, subHeader, addButton);
    return;
  }

  if (rutaActual.length === 1 && rutaActual[0] === 4) {
    _renderizarMas(contenido);
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

  // ── Niveles de entrenamiento 1–4 ─────────────────────────────
  contenido.style.padding  = '';
  contenido.style.marginTop = '0';
  ajustarPaddingContenido();

  // NIVEL 4: acordeón de ejercicios
  if (rutaActual.length === 4) {
    renderizarNivel4(nivel, contenido, rutaActual);
    return;
  }

  // Niveles 1, 2, 3: lista de hijos
  ajustarPaddingContenido();

  if (nivel.hijos && nivel.hijos.length) {
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

  // En nivel 4: solo botón "Iniciar sesión", sin añadir ni buscar
  if (rutaActual.length === 4) {
    const btnIniciar = document.createElement('button');
    btnIniciar.className = 'header-btn';
    btnIniciar.textContent = '▶ Iniciar sesión';
    btnIniciar.style.cssText = 'background:var(--accent-green);min-width:160px;max-width:200px;';
    btnIniciar.addEventListener('click', () => _iniciarSesionDesdeNivel4(nivel));
    cont.appendChild(btnIniciar);
  } else {
    // Niveles 1-3: botón añadir normal
    const addBtn = document.createElement('button');
    addBtn.className   = 'header-btn';
    addBtn.textContent = '+ Añadir';
    addBtn.onclick = () => _onAnadir(nivel);
    cont.appendChild(addBtn);
  }

  subHeader.appendChild(cont);
}

function _iniciarSesionDesdeNivel4(nivel) {
  const ejercicios = [];

  const recogerEjercicios = (nodo) => {
    if (nodo.series !== undefined && nodo.nombre) {
      ejercicios.push({
        nombre: nodo.nombre,
        imagen: nodo.imagen || '',
        // Copiar series del plan pero resetear completada a false
        series: (nodo.series || []).map(s => ({
          reps:     s.reps     || '',
          peso:     s.peso     || '',
          rir:      s.rir      || '',
          descanso: s.descanso || '',
          marca:    s.marca    || '',
          completada: false
        }))
      });
    }
    (nodo.hijos || []).forEach(recogerEjercicios);
  };

  (nivel.hijos || []).forEach(recogerEjercicios);

  if (ejercicios.length === 0) {
    alert('Esta sesión no tiene ejercicios. Añade ejercicios primero desde el editor.');
    return;
  }

  import('../modules/live/live.js').then(({ iniciarEntrenamiento }) => {
    iniciarEntrenamiento(ejercicios);
  });
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
function _crearIndice(item, index, nivel) {
  if (typeof window.crearIndice === 'function') {
    return window.crearIndice(item, index, nivel);
  }
  // Fallback simple
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
  logoutButton = $('logoutButton');
  headerUserName = $('headerUserName');
  headerAvatar   = $('headerAvatar');

  // Botones fijos del header
  if (backButton) backButton.addEventListener('click', () => {
    if (rutaActual.length > 0) { rutaActual.pop(); ejercicioExpandido = null; renderizar(); }
  });
  if (logoutButton) logoutButton.addEventListener('click', () => window.salir?.());

  footerButtons = document.querySelectorAll('.footer-btn');
  footerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.seccion;
      const mapa = { dashboard: [], entrenamiento: [0], progreso: [1], nutricion: [3], mas: [4] };
      const nombreMapa = { dashboard: 'Dashboard', entrenamiento: 'Entrenamiento', progreso: 'Progreso', nutricion: 'Nutrición', mas: 'Más' };
      if (s in mapa) {
        rutaActual.length = 0;
        rutaActual.push(...mapa[s]);
        ultimoMenuSeleccionado = nombreMapa[s];
      }
      ejercicioExpandido = null;
      renderizar();
    });
  });

  // Exponer globalmente para compatibilidad con módulos
  window.renderizar              = renderizar;
  window.rutaActual              = rutaActual;
  window.guardarDatos            = guardarDatos;
  window.datos                   = datos;
  window.nivelActual             = nivelActual;
  window.abrirBuscadorEjercicios = abrirBuscadorEjercicios;
}

function _getAvatarText(user) {
  const source = user?.email ? user.email.split('@')[0] : user?.displayName || 'FT';
  const clean = source.replace(/[^A-Za-z0-9]/g, '');
  return clean.slice(0, 2).toUpperCase() || 'FT';
}

function _updateHeaderUser() {
  if (!headerUserName || !headerAvatar) return;
  const user = auth.currentUser;
  const name = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
  headerUserName.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  headerAvatar.textContent = _getAvatarText(user);
}

function _highlightFooterButton() {
  if (!footerButtons?.length) return;
  const section = rutaActual.length === 0 ? 'dashboard' :
    rutaActual.length === 1 && rutaActual[0] === 0 ? 'entrenamiento' :
    rutaActual.length === 1 && rutaActual[0] === 1 ? 'progreso' :
    rutaActual.length === 1 && rutaActual[0] === 3 ? 'nutricion' :
    rutaActual.length === 1 && rutaActual[0] === 4 ? 'mas' :
    'dashboard';
  footerButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.seccion === section));
}

function _renderizarMas(contenido) {
  const card = document.createElement('div');
  card.className = 'dashboard-card';
  card.innerHTML = `<div class="card-titulo">Más</div><div style="font-size:1rem;font-weight:600;color:var(--text-primary);">Próximas funciones</div><p style="margin-top:10px;color:var(--text-secondary);font-size:0.92rem;line-height:1.5;">Aquí podrás agregar accesos rápidos, ajustes y más opciones personalizadas.</p>`;
  contenido.appendChild(card);
}
