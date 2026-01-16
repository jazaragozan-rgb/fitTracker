// ==================== IMPORTS ====================
import { auth, db, onAuthStateChanged } from './auth.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { renderizarDashboard } from "./dashboard.js";
import { renderizarSeguimiento } from "./seguimiento.js";
import { renderizarCalendario } from "./calendario.js";
import { iniciarEntrenamiento } from './live.js';
import { mostrarConfirmacion, mostrarSelectorMarca, mostrarMenuOpciones } from "./modals.js";
import { iniciarTimer, restaurarTimer } from "./timer.js";
import exercises from "./exercises.js";

// ==================== HELPERS DOM / UTIL ====================
const $ = id => document.getElementById(id);
const show = el => el && el.classList.remove('hidden');
const hide = el => el && el.classList.add('hidden');

// ==================== CONTEXTO DE PÁGINA ====================
function isAppPage() {
  return !!document.getElementById("app") && !!document.getElementById("contenido");
}

// ==================== DATOS INICIALES ====================
const DATOS_POR_DEFECTO = [
  { nombre: 'Entrenamiento', hijos: [] },
  { nombre: 'Seguimiento', hijos: [] },
  { nombre: 'Calendario', hijos: [] }
];
let datos = structuredClone(DATOS_POR_DEFECTO);
console.log('[Datos iniciales] Usando datos por defecto, se cargarán de Firestore al autenticar');

// ==================== ESTADO / REFERENCIAS UI ====================
let rutaActual = [];
let contenido, tituloNivel, headerButtons, addButton, backButton, timerContainer, homeButton, logoutButton, menuButton, sideMenu, menuOverlay, subHeader;
let menuTitulo;
let ultimoMenuSeleccionado = 'Dashboard';

function navigatePush(index) {
  rutaActual.push(index);
  renderizar();
}

// ==================== DOMContentLoaded: inicialización UI ====================
document.addEventListener("DOMContentLoaded", () => {
  contenido = $('contenido');
  tituloNivel = $('tituloNivel');
  headerButtons = $('headerButtons');
  addButton = $('addButton');
  backButton = $('backButton');
  timerContainer = $('timerContainer');
  homeButton = $('navHome');
  logoutButton = $('logoutButton');
  menuButton = $('menuButton');
  sideMenu = $('sideMenu');
  menuOverlay = $('menuOverlay');
  menuTitulo = $('menuTitulo');
  subHeader = $('subHeader');

  // Botones principales
  if (backButton) backButton.addEventListener("click", () => {
    if (rutaActual.length > 0) { rutaActual.pop(); renderizar(); }
  });
  if (homeButton) homeButton.addEventListener("click", () => { rutaActual = []; renderizar(); });
  if (logoutButton) logoutButton.addEventListener("click", () => salir());
  if (menuButton) menuButton.addEventListener("click", () => {
    sideMenu.style.left = "0"; menuOverlay.classList.remove("hidden");
  });
  if (menuOverlay) menuOverlay.addEventListener("click", () => {
    sideMenu.style.left = "-70%"; menuOverlay.classList.add("hidden");
  });

  document.querySelectorAll(".sideMenu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const seccion = btn.dataset.seccion;
      if (seccion === "entrenamiento") { rutaActual = [0]; ultimoMenuSeleccionado = 'Entrenamiento'; }
      if (seccion === "seguimiento") { rutaActual = [1]; ultimoMenuSeleccionado = 'Seguimiento'; }
      if (seccion === "calendario") { rutaActual = [2]; ultimoMenuSeleccionado = 'Calendario'; }
      if (seccion === "dashboard") { rutaActual = []; ultimoMenuSeleccionado = 'Dashboard'; }
      renderizar();
      sideMenu.style.left = "-70%";
      menuOverlay.classList.add("hidden");
    });
  });

  // Toggle Login/Register
  const formLogin = $("form-login");
  const formRegister = $("form-register");
  const showRegisterBtn = $("showRegisterBtn");
  const showLoginBtn = $("showLoginBtn");

  if (showRegisterBtn) showRegisterBtn.addEventListener("click", () => {
    hide(formLogin); show(formRegister); $("log-msg").textContent = "";
  });
  if (showLoginBtn) showLoginBtn.addEventListener("click", () => {
    hide(formRegister); show(formLogin); $("reg-msg").textContent = "";
  });

  window.renderizar = renderizar;
  window.guardarDatos = guardarDatos;
  window.rutaActual = rutaActual;

  if (isAppPage()) {
    renderizar();
    restaurarTimer();
    
    // NO sincronizar automáticamente al recargar la página
    // Solo sincronizar cuando el usuario hace login (onAuthStateChanged)
    console.log('[DOMContentLoaded] Página cargada, usando datos locales');
  }

  initGlobalListeners();
});

// ==================== FIRESTORE HELPERS ====================
async function cargarDatosUsuario(uid) {
  console.log('[cargarDatosUsuario] Intentando cargar datos para uid:', uid);
  if (!uid) {
    console.warn('[cargarDatosUsuario] No hay uid');
    return null;
  }
  try {
    const ref = doc(db, "usuarios", uid);
    console.log('[cargarDatosUsuario] Referencia creada:', ref.path);
    
    const snap = await getDoc(ref);
    console.log('[cargarDatosUsuario] Snapshot obtenido. Existe?:', snap.exists());
    
    if (snap.exists()) {
      const d = snap.data();
      console.log('[cargarDatosUsuario] Datos cargados:', d);
      if (d && Array.isArray(d.datos)) {
        console.log('[cargarDatosUsuario] ✓ Datos válidos, cantidad de elementos:', d.datos.length);
        return structuredClone(d.datos);
      }
      console.warn('[cargarDatosUsuario] ⚠️ Datos inválidos o no es array');
      return { __exists: true, __datosInvalidos: true };
    }
    console.log('[cargarDatosUsuario] Documento no existe en Firestore');
    return null;
  } catch (e) {
    console.error("[cargarDatosUsuario] ❌ Error:", e);
    console.error("[cargarDatosUsuario] Código de error:", e?.code);
    console.error("[cargarDatosUsuario] Mensaje:", e?.message);
    return { __error: true, __message: e?.message || String(e) };
  }
}

async function guardarDatosUsuario(uid, datosActuales) {
  console.log('[guardarDatosUsuario] Iniciando guardado para uid:', uid);
  console.log('[guardarDatosUsuario] Datos a guardar (preview):', JSON.stringify(datosActuales).substring(0, 200) + '...');
  
  if (!uid || !Array.isArray(datosActuales)) {
    console.warn('[guardarDatosUsuario] ⚠️ uid o datosActuales inválidos:', uid, datosActuales);
    return;
  }
  
  try {
    const ref = doc(db, "usuarios", uid);
    console.log('[guardarDatosUsuario] Guardando en:', ref.path);
    
    await setDoc(ref, { 
      datos: structuredClone(datosActuales),
      ultimaActualizacion: new Date().toISOString()
    }, { merge: true });
    
    console.log('[guardarDatosUsuario] ✓ Datos guardados exitosamente en Firestore');
  } catch (e) {
    console.error("[guardarDatosUsuario] ❌ Error al guardar:", e);
    console.error("[guardarDatosUsuario] Código de error:", e?.code);
  }
}

// ==================== SINCRONIZACIÓN - SOLO FIRESTORE ====================
onAuthStateChanged(auth, async (user) => {
  console.log('[onAuthStateChanged] Estado de autenticación cambió');
  console.log('[onAuthStateChanged] Usuario:', user ? user.uid : 'null');
  
  if (user) {
    console.log('[onAuthStateChanged] ✓ Usuario autenticado, cargando datos de Firestore...');
    
    try {
      const datosRemoto = await cargarDatosUsuario(user.uid);
      
      if (datosRemoto && Array.isArray(datosRemoto)) {
        console.log('[onAuthStateChanged] ✓ Datos cargados de Firestore');
        datos = structuredClone(datosRemoto);
      } else {
        console.log('[onAuthStateChanged] No hay datos en Firestore, usando datos por defecto');
        datos = structuredClone(DATOS_POR_DEFECTO);
      }
      
      renderizar();
      
    } catch (error) {
      console.error('[onAuthStateChanged] Error al cargar datos:', error);
      datos = structuredClone(DATOS_POR_DEFECTO);
      renderizar();
    }
  } else {
    console.log('[onAuthStateChanged] ⚠️ No hay usuario autenticado');
    datos = structuredClone(DATOS_POR_DEFECTO);
    if (isAppPage()) renderizar();
  }
});

// ==================== GUARDADO - SOLO FIRESTORE ====================
let saveTimer = null;
function guardarDatos() {
  console.log('[guardarDatos] ========== INICIO GUARDADO ==========');
  console.log('[guardarDatos] Datos actuales:', JSON.stringify(datos).substring(0, 300));
  
  const user = auth.currentUser;
  if (!user) {
    console.log('[guardarDatos] No hay usuario autenticado, no se puede guardar');
    return;
  }
  
  if (saveTimer) {
    console.log('[guardarDatos] Cancelando timer anterior');
    clearTimeout(saveTimer);
  }
  
  console.log('[guardarDatos] Programando guardado en Firestore en 300ms...');
  saveTimer = setTimeout(async () => { 
    console.log('[guardarDatos] Ejecutando guardado en Firestore...');
    await guardarDatosUsuario(user.uid, datos);
    console.log('[guardarDatos] ========== FIN GUARDADO ==========');
  }, 300);
}

// ==================== UTILITY: nivelActual ====================
function nivelActual() {
  let nivel = { hijos: datos };
  for (let i of rutaActual) nivel = nivel.hijos[i];
  return nivel;
}

// ==================== funcion buscador ejercicios de biblioteca ====================
// REEMPLAZAR la función abrirBuscadorEjercicios() en script.js

function abrirBuscadorEjercicios() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const modal = document.createElement('div');
  modal.className = 'modal-ejercicios';

  // ========== HEADER ==========
  const header = document.createElement('div');
  header.className = 'modal-ejercicios-header';
  
  const titulo = document.createElement('h3');
  titulo.textContent = '🔍 Buscar ejercicio';
  titulo.style.margin = '0';
  
  const btnCerrar = document.createElement('button');
  btnCerrar.className = 'btn-cerrar-modal';
  btnCerrar.innerHTML = '✖';
  btnCerrar.onclick = () => overlay.remove();
  
  header.appendChild(titulo);
  header.appendChild(btnCerrar);

  // ========== INPUT DE BÚSQUEDA ==========
  const searchContainer = document.createElement('div');
  searchContainer.style.padding = '16px 20px';
  
  const input = document.createElement('input');
  input.className = 'input-buscar-ejercicio';
  input.placeholder = 'Buscar por nombre, músculo o equipamiento...';
  input.type = 'text';
  
  searchContainer.appendChild(input);

  // ========== CONTADOR ==========
  const counter = document.createElement('div');
  counter.className = 'exercise-counter';
  counter.style.cssText = `
    padding: 0 20px 8px 20px;
    font-size: 0.813rem;
    color: var(--text-secondary);
    text-align: right;
    font-weight: 600;
  `;

  // ========== LISTA DE EJERCICIOS ==========
  const list = document.createElement('div');
  list.className = 'exercise-list';

  // ========== FUNCIÓN DE RENDERIZADO ==========
  function renderizarEjercicios(query = '') {
    list.innerHTML = '';
    const q = query.toLowerCase().trim();
    
    if (q === '') {
      const mensaje = document.createElement('div');
      mensaje.className = 'exercise-mensaje';
      mensaje.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 12px;">💪</div>
        <p style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
          Busca ejercicios
        </p>
        <p style="font-size: 0.875rem; color: var(--text-light);">
          ${exercises.length} ejercicios disponibles
        </p>
      `;
      list.appendChild(mensaje);
      counter.textContent = '';
      return;
    }
    
    // Filtrar ejercicios
    const resultados = exercises.filter(e => {
      const nombreMatch = e.nombre.toLowerCase().includes(q);
      const grupoMatch = Array.isArray(e.grupo_muscular) 
        ? e.grupo_muscular.some(g => g.toLowerCase().includes(q))
        : e.grupo_muscular.toLowerCase().includes(q);
      const equipMatch = e.equipamiento.toLowerCase().includes(q);
      
      return nombreMatch || grupoMatch || equipMatch;
    }).slice(0, 50);

    // Actualizar contador
    counter.textContent = `${resultados.length} ejercicio${resultados.length !== 1 ? 's' : ''} encontrado${resultados.length !== 1 ? 's' : ''}`;
    
    if (resultados.length === 0) {
      const mensaje = document.createElement('div');
      mensaje.className = 'exercise-mensaje';
      mensaje.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 12px;">🤔</div>
        <p style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
          No se encontraron ejercicios
        </p>
        <p style="font-size: 0.875rem; color: var(--text-light);">
          Intenta con otro término
        </p>
      `;
      list.appendChild(mensaje);
      return;
    }

    // Mapeo de emojis por grupo muscular
    const grupoEmojis = {
      'pecho': '💪',
      'espalda': '🔙',
      'hombros': '🦾',
      'piernas': '🦵',
      'gluteos': '🍑',
      'biceps': '💪',
      'triceps': '💪',
      'cuadriceps': '🦵',
      'isquiotibiales': '🦵',
      'gemelos': '🦿',
      'core': '🔥',
      'hombro_lateral': '🦾',
      'hombro_posterior': '🦾'
    };

    const equipamientoEmojis = {
      'barra': '🏋️',
      'mancuernas': '🔩',
      'polea': '⚙️',
      'maquina': '🏗️',
      'peso_corporal': '🧍',
      'smith': '🏋️',
      'lastre': '⚖️',
      'barra_ez': '〰️',
      'rueda': '⭕'
    };

    // Renderizar resultados
    resultados.forEach(ej => {
      const item = document.createElement('div');
      item.className = 'exercise-item-card';
      
      // Obtener grupos musculares
      const grupos = Array.isArray(ej.grupo_muscular) ? ej.grupo_muscular : [ej.grupo_muscular];
      const grupoTexto = grupos
        .map(g => g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' '))
        .join(', ');
      
      // Emoji del primer grupo muscular
      const grupoEmoji = grupoEmojis[grupos[0]] || '💪';
      
      // Equipamiento
      const equipTexto = ej.equipamiento
        .replace(/_/g, ' ')
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
      
      const equipEmoji = equipamientoEmojis[ej.equipamiento] || '🏋️';

      item.innerHTML = `
        <div class="exercise-icon">${grupoEmoji}</div>
        <div class="exercise-info">
          <div class="exercise-name">${ej.nombre}</div>
          <div class="exercise-details">
            <span class="exercise-tag">
              <span class="tag-icon">${grupoEmoji}</span>
              ${grupoTexto}
            </span>
            <span class="exercise-tag">
              <span class="tag-icon">${equipEmoji}</span>
              ${equipTexto}
            </span>
          </div>
        </div>
        <button class="exercise-add-btn">+</button>
      `;
      
      // Click en la tarjeta completa
      item.onclick = (e) => {
        if (e.target.classList.contains('exercise-add-btn')) return;
        añadirEjercicioDesdeBiblioteca(ej.nombre);
        overlay.remove();
      };
      
      // Click en el botón +
      const addBtn = item.querySelector('.exercise-add-btn');
      addBtn.onclick = (e) => {
        e.stopPropagation();
        añadirEjercicioDesdeBiblioteca(ej.nombre);
        overlay.remove();
      };
      
      list.appendChild(item);
    });
  }

  // Event listener del input
  input.addEventListener('input', (e) => {
    renderizarEjercicios(e.target.value);
  });

  // Renderizar estado inicial
  renderizarEjercicios('');

  // Montar todo
  modal.appendChild(header);
  modal.appendChild(searchContainer);
  modal.appendChild(counter);
  modal.appendChild(list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Autofocus
  setTimeout(() => input.focus(), 100);
}

function añadirEjercicioDesdeBiblioteca(nombre) {
  const nivel = nivelActual();
  nivel.hijos.push({
    nombre,
    hijos: []
  });
  guardarDatos();
  renderizar();
}

// ==================== RENDERIZADO PRINCIPAL ====================
function renderizar() {
  console.log('[renderizar] ========== INICIO RENDER ==========');
  console.log('[renderizar] Stack trace:', new Error().stack.split('\n').slice(1, 4).join('\n'));
  
  if (!contenido) return;
  contenido.innerHTML = '';
  let nivel = nivelActual();

  // Asignar ids de sesión (mantenimiento)
  (function asignarSesionIds(datosArray, ruta = []) {
    datosArray.forEach((meso, i) => {
      (meso.hijos || []).forEach((micro, j) => {
        (micro.hijos || []).forEach((sesion, k) => {
          sesion.sesionId = `${ruta.join('-')}-${i}-${j}-${k}`;
          (sesion.hijos || []).forEach(bloque => {
            (bloque.hijos || []).forEach(ejerc => {
              ejerc.sesionId = sesion.sesionId;
            });
          });
        });
      });
    });
  })(datos);

  // Header/menu title
  if (menuTitulo) {
    if (rutaActual.length === 0) menuTitulo.textContent = 'Dashboard';
    else if (rutaActual.length >= 1 && rutaActual.length <= 5) menuTitulo.textContent = 'Entrenamiento';
    else menuTitulo.textContent = ultimoMenuSeleccionado;
  }

  // -------------------- SUBHEADER --------------------
  subHeader.innerHTML = '';
  subHeader.style.display = rutaActual.length === 0 ? 'flex' : ''; 

  if (rutaActual.length === 0) {
    // Nivel 0: Dashboard
    tituloNivel.style.display = 'none';
    subHeader.innerHTML = '';
    
    // Añadir título como en otros niveles
    const h2Nivel = document.createElement('h2');
    h2Nivel.id = 'tituloNivel';
    h2Nivel.textContent = 'Dashboard';
    subHeader.appendChild(h2Nivel);
    
    // Contenedor para el botón (misma estructura que otros niveles)
    const botonesContainer = document.createElement('div');
    botonesContainer.id = 'subHeaderButtons';
    botonesContainer.style.display = 'flex';
    botonesContainer.style.justifyContent = 'center';
    
    const btnEntreno = document.createElement('button');
    btnEntreno.id = 'liveEntrenamiento';
    btnEntreno.textContent = 'Empezar entrenamiento';
    btnEntreno.className = 'btn-primary';
    btnEntreno.addEventListener('click', iniciarEntrenamiento);
    botonesContainer.appendChild(btnEntreno);
    
    subHeader.appendChild(botonesContainer);

  } else {
    // Niveles 1–5
    tituloNivel.style.display = '';
    const h2Nivel = document.createElement('h2');
    h2Nivel.id = 'tituloNivel';
    h2Nivel.textContent = rutaActual.length === 1 ? 'Bloques' : (nivel.nombre || ultimoMenuSeleccionado);
    subHeader.appendChild(h2Nivel);

    // -------------------- CONTENEDOR DE BOTONES --------------------
    const botonesContainer = document.createElement('div');
    botonesContainer.id = 'subHeaderButtons';

    // -------------------- BOTÓN VOLVER --------------------
    if (rutaActual.length >= 1 && rutaActual.length <= 5) {
      const backSubBtn = document.createElement('button');
      backSubBtn.className = 'btn-back-subheader';
      backSubBtn.innerHTML = '⬅';
      backSubBtn.title = 'Volver al nivel anterior';
      backSubBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        rutaActual.pop();
        renderizar();
      });
      botonesContainer.appendChild(backSubBtn);
    }

    // -------------------- BOTÓN AÑADIR --------------------
    if (rutaActual.length !== 5) {
      const addBtn = document.createElement('button');
      addBtn.className = 'header-btn';
      addBtn.textContent = '+ Añadir';
      addBtn.style.display = '';
      botonesContainer.appendChild(addBtn);
      
      // Asignar onclick al botón añadir
      addBtn.onclick = () => {
        if (rutaActual.length >= 1 && rutaActual.length <= 4 && window.itemCopiado) {
          mostrarConfirmacion("¿Desea pegar el contenido aquí o desea crear un bloque nuevo?", () => {
            if (window.itemCopiado.nivel !== rutaActual.length) {
              mostrarConfirmacion(`El contenido se debe pegar en el nivel ${window.itemCopiado.nivel}`, () => {}, null, "Aceptar");
            } else {
              nivel.hijos.push(structuredClone(window.itemCopiado.datos));
              window.itemCopiado = null;
              guardarDatos();
              renderizar();
            }
          }, () => {
            const nombreDefault = "Nuevo " + tituloNivel.textContent;
            nivel.hijos.push({ nombre:"", hijos:[], editando:true, placeholder:nombreDefault });
            guardarDatos(); renderizar();
          }, "Pegar", "Crear nuevo");
        } else {
          const nombreDefault = "Nuevo " + tituloNivel.textContent;
          nivel.hijos.push({ nombre:"", hijos:[], editando:true, placeholder:nombreDefault });
          guardarDatos(); renderizar();
        }
      };
    } else {
      // Nivel 5: botón añadir serie
      const addSerieBtn = document.createElement('button');
      addSerieBtn.className = 'add-serie';
      addSerieBtn.textContent = '+ Añadir serie';
      addSerieBtn.onclick = () => {
        if (nivel.series) nivel.series.push({});
        else nivel.series = [{}];
        guardarDatos();
        renderizar();
      };
      botonesContainer.appendChild(addSerieBtn);
    }

    // -------------------- BOTÓN BUSCAR (solo nivel 4) --------------------
    if (rutaActual.length === 4) {
      const searchBtn = document.createElement('button');
      searchBtn.textContent = '🔍';
      searchBtn.className = 'btn-search';
      searchBtn.onclick = abrirBuscadorEjercicios;
      botonesContainer.appendChild(searchBtn);
    }

    subHeader.appendChild(botonesContainer);
  }

  // Pantalla calendario, seguimiento y dashboard
  if (rutaActual.length === 1 && rutaActual[0] === 2) {
    renderizarCalendario(datos, contenido, subHeader, rutaActual, renderizar);
    return;
  }
  if (rutaActual.length === 1 && rutaActual[0] === 1) {
    renderizarSeguimiento(nivel, contenido, subHeader, addButton);
    return;
  }
  if (rutaActual.length === 0) {
    renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton);
    return;
  }

  // Nivel series (5)
  if (rutaActual.length === 5) {
    backButton.style.visibility = 'visible';
    addButton.style.visibility = 'hidden';
    tituloNivel.textContent = nivel.nombre;

    const encabezados = document.createElement('div');
    encabezados.className = 'series-header';
    ['','REPS','PESO','RIR','DESCANSO','',''].forEach(txt => {
      const col = document.createElement('div');
      col.textContent = txt;
      encabezados.appendChild(col);
    });
    contenido.appendChild(encabezados);

    const seriesContainer = document.createElement('div');
    seriesContainer.className = 'series-container';
    nivel.series = nivel.series || [];
    nivel.series.forEach((serie, idx) => {
      const serieDiv = document.createElement('div');
      serieDiv.className = "serie-row";

      const numBtn = document.createElement('button');
      numBtn.className = "serie-num";
      numBtn.textContent = serie.marca || (idx + 1);
      numBtn.addEventListener('click', e => {
        e.stopPropagation();
        mostrarSelectorMarca(serie, idx, () => { guardarDatos(); renderizar(); });
      });

      const reps = document.createElement('input');
      reps.placeholder = 'Reps'; reps.value = serie.reps || '';
      reps.addEventListener('blur', e => {
        serie.reps = e.target.value;
        guardarDatos();
        setTimeout(() => {
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && seriesContainer.contains(active)) {
            return;
          }
          renderizar();
        }, 0);
      });

      const peso = document.createElement('input');
      peso.placeholder = 'Peso'; peso.value = serie.peso || '';
      peso.addEventListener('blur', e => {
        serie.peso = e.target.value;
        guardarDatos();
        setTimeout(() => {
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && seriesContainer.contains(active)) {
            return;
          }
          renderizar();
        }, 0);
      });

      const rir = document.createElement('input');
      rir.placeholder = 'RIR'; rir.value = serie.rir || '';
      rir.addEventListener('blur', e => {
        serie.rir = e.target.value;
        guardarDatos();
        setTimeout(() => {
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && seriesContainer.contains(active)) {
            return;
          }
          renderizar();
        }, 0);
      });

      const descanso = document.createElement('input');
      descanso.placeholder = 'Descanso'; descanso.value = serie.descanso || '';
      descanso.addEventListener('blur', e => {
        serie.descanso = e.target.value;
        guardarDatos();
        setTimeout(() => {
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && seriesContainer.contains(active)) {
            return;
          }
          renderizar();
        }, 0);
      });

      const temporizador = document.createElement('button');
      temporizador.className = "btn-timer";
      if (serie.completada) {
        temporizador.textContent = '✔️';
        serieDiv.style.backgroundColor = '#d4edda';
        serieDiv.style.borderColor = '#6fbe82ff';
      } else {
        temporizador.textContent = '🕔';
        serieDiv.style.backgroundColor = '';
        serieDiv.style.borderColor = '#afafaf';
      }
      temporizador.addEventListener('click', () => {
        serie.completada = !serie.completada;
        if (serie.completada) {
          temporizador.textContent = '✔️';
          serieDiv.style.backgroundColor = '#d4edda';
          serieDiv.style.borderColor = '#6fbe82ff';
          if (serie.descanso) iniciarTimer(serie.descanso);
        } else {
          temporizador.textContent = '🕔';
          serieDiv.style.backgroundColor = '';
          serieDiv.style.borderColor = '#afafaf';
        }
        guardarDatos();
      });

      const borrar = document.createElement('button');
      borrar.className = "btn-delete"; borrar.textContent = '❌';
      borrar.style.fontSize = '0.7rem';
      borrar.addEventListener('click', () => {
        mostrarConfirmacion("¿Desea borrar esta serie?", () => {
          nivel.series.splice(idx, 1); guardarDatos(); renderizar();
        });
      });

      [numBtn, reps, peso, rir, descanso, temporizador, borrar].forEach(el => serieDiv.appendChild(el));
      seriesContainer.appendChild(serieDiv);
    });
    contenido.appendChild(seriesContainer);

    // Stats box (volumen y 1RM)
    const statsBox = document.createElement('div');
    statsBox.style.background = "#ffffffff";
    statsBox.style.padding = "14px";
    statsBox.style.margin = "12px";
    statsBox.style.borderRadius = "10px";
    statsBox.style.color = "#000";
    statsBox.style.boxShadow = "0px 2px 10px #b6b6b6";
    statsBox.style.width = "94%";

    let volumenTotal = 0;
    let mejor1RM = 0;
    nivel.series.forEach(serie => {
      const peso = parseFloat(serie.peso) || 0;
      const reps = parseInt(serie.reps) || 0;
      volumenTotal += peso * reps;
      const estimado = peso * (1 + reps / 30);
      if (estimado > mejor1RM) mejor1RM = estimado;
    });

    statsBox.innerHTML = `
      <p><b>Volumen total:</b> ${volumenTotal.toFixed(2)} kg</p>
      <p><b>1RM estimado:</b> ${mejor1RM.toFixed(2)} kg</p>
    `;
    contenido.appendChild(statsBox);

    // buscar ejercicio anterior y mostrar
    function fechaATimestamp(fechaStr) {
      if (!fechaStr || typeof fechaStr !== "string") return null;
      const simpleDate = /^\d{4}-\d{2}-\d{2}$/.test(fechaStr);
      const input = simpleDate ? (fechaStr + 'T00:00:00Z') : fechaStr;
      const ts = Date.parse(input);
      if (Number.isNaN(ts)) return null;
      return ts;
    }
    
    function buscarEjercicioAnterior(datosArg, rutaArg, ejercicioActual) {
      if (!ejercicioActual || !datosArg) return null;
      const nombreEjercicioActual = (ejercicioActual.nombre || '').trim().toLowerCase();

      let sesionActual = null;
      if (Array.isArray(rutaArg) && rutaArg.length >= 3) {
        const m = rutaArg[0];
        const mi = rutaArg[1];
        const s = rutaArg[2];
        sesionActual = datosArg?.[m]?.hijos?.[mi]?.hijos?.[s] || null;
      }

      const fechaReferencia = (sesionActual && (sesionActual._fecha || sesionActual.fecha)) || ejercicioActual._fecha || ejercicioActual.fecha;
      const timestampActual = fechaATimestamp(fechaReferencia);

      const sesionesPlan = [];
      let linearIndex = 0;
      for (let mi = 0; mi < datosArg.length; mi++) {
        const meso = datosArg[mi];
        for (let mj = 0; mj < (meso.hijos || []).length; mj++) {
          const micro = meso.hijos[mj];
          for (let sk = 0; sk < (micro.hijos || []).length; sk++) {
            const ses = micro.hijos[sk];
            let fechaSesion = ses._fecha || ses.fecha || null;
            if (!fechaSesion) {
              for (const b of ses.hijos || []) {
                if (b._fecha || b.fecha) { fechaSesion = b._fecha || b.fecha; break; }
                for (const e of b.hijos || []) {
                  if (e._fecha || e.fecha) { fechaSesion = e._fecha || e.fecha; break; }
                }
                if (fechaSesion) break;
              }
            }
            const tsSesion = fechaATimestamp(fechaSesion);
            sesionesPlan.push({ mesoIdx: mi, microIdx: mj, sesionIdx: sk, sesion: ses, fechaSesion, tsSesion, linearIndex });
            linearIndex++;
          }
        }
      }

      let actualLinear = null;
      if (sesionActual) {
        for (const s of sesionesPlan) {
          if (s.sesion === sesionActual) { actualLinear = s.linearIndex; break; }
        }
      }

      let mejor = null;

      for (const sInfo of sesionesPlan) {
        const sesion = sInfo.sesion;
        if (sesionActual && sesion === sesionActual) continue;

        if (timestampActual !== null) {
          if (sInfo.tsSesion === null) continue;
          if (sInfo.tsSesion >= timestampActual) continue;
        } else if (actualLinear !== null) {
          if (sInfo.linearIndex >= actualLinear) continue;
        } else {
          continue;
        }

        for (const bloque of sesion.hijos || []) {
          for (const ejerc of bloque.hijos || []) {
            if (((ejerc.nombre || '').trim().toLowerCase()) !== nombreEjercicioActual) continue;
            if (!ejerc.series || ejerc.series.length === 0) continue;
            if (!mejor) {
              mejor = { ejerc, fechaTs: sInfo.tsSesion, fechaRaw: sInfo.fechaSesion, linearIndex: sInfo.linearIndex };
            } else {
              if (timestampActual !== null) {
                if ((sInfo.tsSesion || 0) > (mejor.fechaTs || 0)) {
                  mejor = { ejerc, fechaTs: sInfo.tsSesion, fechaRaw: sInfo.fechaSesion, linearIndex: sInfo.linearIndex };
                }
              } else {
                if (sInfo.linearIndex > (mejor.linearIndex || 0)) {
                  mejor = { ejerc, fechaTs: sInfo.tsSesion, fechaRaw: sInfo.fechaSesion, linearIndex: sInfo.linearIndex };
                }
              }
            }
          }
        }
      }

      return mejor;
    }

    const sesionObj = datos?.[rutaActual[0]]?.hijos?.[rutaActual[1]]?.hijos?.[rutaActual[2]];
    if (sesionObj?.hijos) {
      for (const bloque of sesionObj.hijos) {
        const bloqueFecha = bloque._fecha || bloque.fecha || sesionObj._fecha || sesionObj?.fecha || null;
        if (bloque.hijos) {
          for (const ejerc of bloque.hijos) {
            ejerc._fecha = bloqueFecha || ejerc._fecha;
          }
        }
      }
    }
    nivel._fecha = nivel._fecha || sesionObj?.fecha || sesionObj?._fecha || null;

    const ejercicioAnteriorObj = buscarEjercicioAnterior(datos, rutaActual, nivel);
    if (ejercicioAnteriorObj) {
      const ejercicioAnterior = ejercicioAnteriorObj.ejerc;
      let fechaMostrar = ejercicioAnteriorObj.fechaRaw || ejercicioAnterior._fecha || ejercicioAnterior.fecha || '';
      if (fechaMostrar) {
        if (fechaMostrar.includes('T')) {
          fechaMostrar = fechaMostrar.split('T')[0];
        }
        const d = new Date(fechaMostrar + 'T00:00:00');
        fechaMostrar = d.toLocaleDateString('es-ES');
      }
      const statsBoxAnt = document.createElement('div');
      statsBoxAnt.style.background = "#ffffffff";
      statsBoxAnt.style.padding = "14px";
      statsBoxAnt.style.margin = "12px";
      statsBoxAnt.style.borderRadius = "10px";
      statsBoxAnt.style.color = "#000";
      statsBoxAnt.style.boxShadow = "-2px 2px 5px #b6b6b6";
      statsBoxAnt.style.width = "94%";

      let volumenAnt = 0, mejor1RMAnt = 0, pesoMax = 0;
      (ejercicioAnterior.series || []).forEach(serie => {
        const peso = parseFloat(serie.peso) || 0;
        const reps = parseInt(serie.reps) || 0;
        volumenAnt += peso * reps;
        const estimado = peso * (1 + reps / 30);
        if (estimado > mejor1RMAnt) mejor1RMAnt = estimado;
        if (peso > pesoMax) pesoMax = peso;
      });

      statsBoxAnt.innerHTML = `
        <p><b>📅 Anterior (${fechaMostrar}):</b></p>
        <p><b>Volumen total:</b> ${volumenAnt.toFixed(2)} kg</p>
        <p><b>1RM estimado:</b> ${mejor1RMAnt.toFixed(2)} kg</p>
        <p><b>Peso máximo:</b> ${pesoMax.toFixed(2)} kg</p>
      `;
      contenido.appendChild(statsBoxAnt);
    }

    const notas = document.createElement('textarea');
    notas.placeholder = 'Notas del ejercicio...';
    notas.value = nivel.notas || '';
    notas.className = 'notes';
    notas.addEventListener('input', e => { nivel.notas = e.target.value; guardarDatos(); });
    contenido.appendChild(notas);
    return;
  }

  // Otros niveles (lista de hijos)
  backButton.style.visibility = 'visible';
  addButton.style.visibility  = 'visible';
  const nombres = ['Mesociclos','Microciclos','Sesiones','Ejercicios'];
  tituloNivel.textContent = nombres[rutaActual.length - 1] || nivel.nombre;

  if (nivel.hijos && nivel.hijos.length) {
    nivel.hijos.forEach((item, index) => {
      const div = crearIndice(item, index, nivel);
      // NO añadir listener de click aquí, ya está en crearIndice
      contenido.appendChild(div);
    });
  }
}

function asegurarContenidoVisible() {
  if (!contenido) return;
  contenido.style.opacity = "1";
  contenido.style.transform = "translateX(0)";
  contenido.style.transition = "none";
  contenido.style.pointerEvents = "auto";
  document.querySelectorAll('[data-clon], .drag-ghost, .clon').forEach(el => el.remove());
}
asegurarContenidoVisible();

// ==================== CREAR INDICE (DRAG & DROP + UI ITEM) ====================
let dragItem = null;
let dragStartY = 0;
let dragging = false;
let dragStartIndex = null;
let dragTimer = null;

function startDrag(e) {
  if (e.type === "mousedown" && e.button !== 0) return;

  dragItem = e.currentTarget.closest(".list-item");
  if (!dragItem) return;

  dragging = false;
  dragStartIndex = [...contenido.children].indexOf(dragItem);

  const touch = e.touches ? e.touches[0] : e;
  dragStartY = touch.clientY;

  dragTimer = setTimeout(() => {
    dragging = true;
    dragItem.classList.add("dragging");
  }, 600);
}

function dragMove(e) {
  if (!dragging || !dragItem) return;

  const touch = e.touches ? e.touches[0] : e;
  const y = touch.clientY;

  const items = [...document.querySelectorAll(".list-item:not(.dragging)")];

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) {
      item.parentNode.insertBefore(dragItem, item);
      break;
    } else {
      item.parentNode.appendChild(dragItem);
    }
  }

  e.preventDefault();
}

function dragEnd() {
  clearTimeout(dragTimer);

  if (!dragging || !dragItem) return;

  dragging = false;
  dragItem.classList.remove("dragging");

  const newIndex = [...contenido.children].indexOf(dragItem);

  if (dragStartIndex !== null && newIndex !== dragStartIndex) {
    const nivel = nivelActual();
    const movedItem = nivel.hijos.splice(dragStartIndex, 1)[0];
    nivel.hijos.splice(newIndex, 0, movedItem);
    guardarDatos();
  }

  dragItem = null;
  dragStartIndex = null;
}

function crearIndice(item, index, nivel) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.dataset.index = index;
  div.dataset.nivel = rutaActual.length;
  
  // Click en el div completo
  div.addEventListener('click', (e) => {
    // No navegar si estamos arrastrando
    if (dragging) return;
    
    // No navegar si clickeamos en:
    // - Botones (opciones, editar, etc)
    // - Inputs de fecha
    const target = e.target;
    if (target.tagName === 'BUTTON' || 
        target.type === 'date' ||
        target.closest('.btn-opciones')) {
      e.stopPropagation();
      return;
    }
    
    // Navegar al siguiente nivel
    e.stopPropagation();
    navigatePush(index);
  });

  div.addEventListener('mousedown', startDrag, { capture: true });
  div.addEventListener('touchstart', startDrag, { passive: false, capture: true });

  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '4px';
  div.style.padding = '8px';
  div.style.borderBottom = '1px solid #ddd';
  div.style.cursor = 'pointer';

  if (!item.editando) item.editando = false;

  // MODO EDICIÓN
  if (item.editando) {
    const input = document.createElement('input');
    input.value = item.nombre || '';
    input.placeholder = item.placeholder || '';
    input.style.flex = '1 1 auto';
    input.style.minWidth = '40px';
    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));

    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt => input.addEventListener(evt, e => e.stopPropagation()));

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        item.nombre = input.value || 'Sin nombre';
        item.editando = false; guardarDatos(); renderizar();
      }
    });
    input.addEventListener('blur', () => {
      item.nombre = input.value || 'Sin nombre';
      item.editando = false; guardarDatos(); renderizar();
    });

    div.appendChild(input);

    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = nivel.hijos[index].fecha || '';
      ['pointerdown','mousedown','touchstart','click'].forEach(evt => fechaInput.addEventListener(evt, e => e.stopPropagation()));
      fechaInput.addEventListener('change', async e => {
        const raw = e.target.value;
        nivel.hijos[index].fecha = raw;
        nivel.hijos[index]._fecha = raw;
        guardarDatos();
        const user = auth.currentUser;
        if (user) {
          try { await guardarDatosUsuario(user.uid, datos); } catch(err){ console.error(err); }
        }
      });
      div.appendChild(fechaInput);
    }
  }
  // MODO VISUAL
  else {
    const input = document.createElement('input');
    input.value = item.nombre;
    input.readOnly = true; // Usar readonly en lugar de disabled
    input.style.flex = '1';
    input.style.cursor = 'pointer';

    div.appendChild(input);

    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = nivel.hijos[index].fecha ? nivel.hijos[index].fecha.slice(0,10) : '';
      ['mousedown','click'].forEach(evt => fechaInput.addEventListener(evt, e => e.stopPropagation()));
      fechaInput.addEventListener('change', async e => {
        const raw = e.target.value;
        nivel.hijos[index].fecha = raw;
        nivel.hijos[index]._fecha = raw;
        guardarDatos();
        const user = auth.currentUser;
        if (user) {
          try { await guardarDatosUsuario(user.uid, datos); } catch(err){ console.error(err); }
        }
      });
      div.appendChild(fechaInput);
    }

    // opciones botón - MODIFICADO CON NUEVA ESTRUCTURA
    if (rutaActual.length >= 1 && rutaActual.length <= 4) {
      const opcionesBtn = document.createElement('button');
      opcionesBtn.className = "btn-opciones";
      const punto = document.createElement('span');
      opcionesBtn.appendChild(punto);
      opcionesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.menu-opciones').forEach(m => m.remove());
        mostrarMenuOpciones({
          anchorElement: opcionesBtn,
          onEditar: () => { item.editando = true; guardarDatos(); renderizar(); },
          onEliminar: () => { mostrarConfirmacion(`¿Desea borrar "${item.nombre}"?`, () => { nivel.hijos.splice(index, 1); guardarDatos(); renderizar(); }); },
          onCopiar: () => { return { nivel: rutaActual.length, datos: structuredClone(item) }; }
        });
      });
      div.appendChild(opcionesBtn);
    }
  }
  
  return div;
}

// ==================== LISTENERS GLOBALES ====================
function initGlobalListeners() {
  if (!isAppPage() || !contenido) return;

  // ==================== FUNCIÓN DE RESTAURACIÓN ====================
  window.restaurarDesdeJSON = async function(jsonString) {
    try {
      const datosRecuperados = JSON.parse(jsonString);
      const user = auth.currentUser;
      
      if (!user) {
        console.error('❌ Debes iniciar sesión primero');
        alert('Debes iniciar sesión primero');
        return;
      }
      
      if (!Array.isArray(datosRecuperados)) {
        console.error('❌ Formato de datos inválido');
        alert('Formato de datos inválido');
        return;
      }
      
      console.log('[restaurarDesdeJSON] Restaurando datos para uid:', user.uid);
      console.log('[restaurarDesdeJSON] Cantidad de elementos:', datosRecuperados.length);
      
      await setDoc(doc(db, "usuarios", user.uid), { 
        datos: structuredClone(datosRecuperados),
        ultimaActualizacion: new Date().toISOString()
      }, { merge: true });
      
      datos = structuredClone(datosRecuperados);
      localStorage.setItem("misDatos", JSON.stringify(datos));
      
      console.log('✅ Datos restaurados correctamente');
      alert('✅ Datos restaurados correctamente');
      renderizar();
      
    } catch (error) {
      console.error('❌ Error al restaurar:', error);
      alert('Error al restaurar: ' + error.message);
    }
  };

  console.log('💾 Función restaurarDesdeJSON() disponible. Uso: restaurarDesdeJSON(\'tu json aquí\')');

  // Drag & drop global
  document.addEventListener("mousemove", dragMove);
  document.addEventListener("touchmove", dragMove, { passive: false });
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("touchend", dragEnd);
  document.addEventListener("touchcancel", dragEnd);
}