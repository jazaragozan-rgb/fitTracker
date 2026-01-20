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
let ejercicioExpandido = null; // Para controlar qué ejercicio está expandido
let contenido, tituloNivel, headerButtons, addButton, backButton, timerContainer, homeButton, logoutButton, menuButton, sideMenu, menuOverlay, subHeader;
let menuTitulo;
let ultimoMenuSeleccionado = 'Dashboard';

function navigatePush(index) {
  rutaActual.push(index);
  ejercicioExpandido = null; // Resetear ejercicio expandido al navegar
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
    if (rutaActual.length > 0) { rutaActual.pop(); ejercicioExpandido = null; renderizar(); }
  });
  if (homeButton) homeButton.addEventListener("click", () => { rutaActual = []; ejercicioExpandido = null; renderizar(); });
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
      ejercicioExpandido = null;
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
function abrirBuscadorEjercicios() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const modal = document.createElement('div');
  modal.className = 'modal-ejercicios';

  const header = document.createElement('div');
  header.className = 'modal-ejercicios-header';
  
  const titulo = document.createElement('h3');
  titulo.textContent = 'Buscar ejercicio';
  titulo.style.margin = '0';
  titulo.style.color = '#414141';
  titulo.style.fontSize = '1.3rem';
  
  const btnCerrar = document.createElement('button');
  btnCerrar.className = 'btn-cerrar-modal';
  btnCerrar.innerHTML = '✖';
  btnCerrar.onclick = () => overlay.remove();
  
  header.appendChild(titulo);
  header.appendChild(btnCerrar);

  const input = document.createElement('input');
  input.className = 'input-buscar-ejercicio';
  input.placeholder = 'Buscar ejercicio...';
  input.type = 'text';

  const list = document.createElement('div');
  list.className = 'exercise-list';

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    list.innerHTML = '';
    
    if (q.trim() === '') {
      const mensaje = document.createElement('div');
      mensaje.className = 'exercise-mensaje';
      mensaje.textContent = 'Escribe para buscar ejercicios...';
      list.appendChild(mensaje);
      return;
    }
    
    const resultados = exercises.filter(e => e.nombre.toLowerCase().includes(q)).slice(0, 50);
    
    if (resultados.length === 0) {
      const mensaje = document.createElement('div');
      mensaje.className = 'exercise-mensaje';
      mensaje.textContent = 'No se encontraron ejercicios';
      list.appendChild(mensaje);
      return;
    }
    
    resultados.forEach(ej => {
      const item = document.createElement('div');
      item.className = 'exercise-item';
      item.textContent = ej.nombre;
      item.onclick = () => {
        añadirEjercicioDesdeBiblioteca(ej.nombre);
        overlay.remove();
      };
      list.appendChild(item);
    });
  });

  const mensajeInicial = document.createElement('div');
  mensajeInicial.className = 'exercise-mensaje';
  mensajeInicial.textContent = 'Escribe para buscar ejercicios...';
  list.appendChild(mensajeInicial);

  modal.appendChild(header);
  modal.appendChild(input);
  modal.appendChild(list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  setTimeout(() => input.focus(), 100);
}

function añadirEjercicioDesdeBiblioteca(nombre) {
  const nivel = nivelActual();
  
  // Buscar el ejercicio en la biblioteca para obtener su imagen
  const ejercicioBiblioteca = exercises.find(e => e.nombre === nombre);
  
  const nuevoEjercicio = {
    nombre,
    hijos: [],
    series: []
  };
  
  // Si el ejercicio tiene imagen en la biblioteca, añadirla
  if (ejercicioBiblioteca && ejercicioBiblioteca.imagen) {
    nuevoEjercicio.imagen = ejercicioBiblioteca.imagen;
  }
  
  nivel.hijos.push(nuevoEjercicio);
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
    else if (rutaActual.length >= 1 && rutaActual.length <= 4) menuTitulo.textContent = 'Entrenamiento';
    else menuTitulo.textContent = ultimoMenuSeleccionado;
  }

  // -------------------- SUBHEADER --------------------
  subHeader.innerHTML = '';
  subHeader.style.display = rutaActual.length === 0 ? 'flex' : ''; 

  if (rutaActual.length === 0) {
    // Nivel 0: Dashboard
    tituloNivel.style.display = 'none';
    subHeader.innerHTML = '';
    
    const h2Nivel = document.createElement('h2');
    h2Nivel.id = 'tituloNivel';
    h2Nivel.textContent = 'Dashboard';
    subHeader.appendChild(h2Nivel);
    
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
    // Niveles 1–4
    tituloNivel.style.display = '';
    const h2Nivel = document.createElement('h2');
    h2Nivel.id = 'tituloNivel';
    h2Nivel.textContent = rutaActual.length === 1 ? 'Bloques' : (nivel.nombre || ultimoMenuSeleccionado);
    subHeader.appendChild(h2Nivel);

    // -------------------- CONTENEDOR DE BOTONES --------------------
    const botonesContainer = document.createElement('div');
    botonesContainer.id = 'subHeaderButtons';

    // -------------------- BOTÓN VOLVER --------------------
    if (rutaActual.length >= 1 && rutaActual.length <= 4) {
      const backSubBtn = document.createElement('button');
      backSubBtn.className = 'btn-back-subheader';
      backSubBtn.innerHTML = '⬅';
      backSubBtn.title = 'Volver al nivel anterior';
      backSubBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        rutaActual.pop();
        ejercicioExpandido = null;
        renderizar();
      });
      botonesContainer.appendChild(backSubBtn);
    }

    // -------------------- BOTÓN AÑADIR --------------------
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
          // En nivel 4 (ejercicios), añadir también el array de series
          const nuevoItem = rutaActual.length === 4 
            ? { nombre:"", hijos:[], series:[], editando:true, placeholder:nombreDefault }
            : { nombre:"", hijos:[], editando:true, placeholder:nombreDefault };
          nivel.hijos.push(nuevoItem);
          guardarDatos(); renderizar();
        }, "Pegar", "Crear nuevo");
      } else {
        const nombreDefault = "Nuevo " + tituloNivel.textContent;
        // En nivel 4 (ejercicios), añadir también el array de series
        const nuevoItem = rutaActual.length === 4 
          ? { nombre:"", hijos:[], series:[], editando:true, placeholder:nombreDefault }
          : { nombre:"", hijos:[], editando:true, placeholder:nombreDefault };
        nivel.hijos.push(nuevoItem);
        guardarDatos(); renderizar();
      }
    };

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

  // NIVEL 4 UNIFICADO (ejercicios con series desplegables)
  if (rutaActual.length === 4) {
    backButton.style.visibility = 'visible';
    addButton.style.visibility = 'visible';
    tituloNivel.textContent = nivel.nombre;

    if (nivel.hijos && nivel.hijos.length) {
      nivel.hijos.forEach((ejercicio, index) => {
        const ejercicioWrapper = crearEjercicioAcordeon(ejercicio, index, nivel);
        contenido.appendChild(ejercicioWrapper);
      });
    }
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
      contenido.appendChild(div);
    });
  }
}

// ==================== CREAR EJERCICIO ACORDEON (NIVEL 4 UNIFICADO) ====================
function crearEjercicioAcordeon(ejercicio, index, nivel) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ejercicio-acordeon';
  wrapper.style.marginBottom = '8px';
  // Necesario para que el drag funcione
  wrapper.dataset.index = index;
  wrapper.dataset.nivel = rutaActual.length;

  // Header del ejercicio (siempre visible)
  const header = document.createElement('div');
  header.className = 'ejercicio-header';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '8px';
  header.style.padding = '12px';
  header.style.background = 'var(--bg-card)';
  header.style.borderRadius = '12px';
  header.style.cursor = 'pointer';
  header.style.boxShadow = 'var(--shadow-sm)';
  header.style.transition = 'all 0.2s ease';
  header.style.border = '1px solid transparent';

  // ===== DRAG & DROP para ejercicios =====
  wrapper.addEventListener('mousedown', startDragEjercicio, { passive: false, capture: true });
  wrapper.addEventListener('touchstart', startDragEjercicio, { passive: false, capture: true });

  header.addEventListener('mouseenter', () => {
    header.style.boxShadow = 'var(--shadow-md)';
    header.style.borderColor = 'var(--border-color)';
  });

  header.addEventListener('mouseleave', () => {
    if (ejercicioExpandido !== index) {
      header.style.boxShadow = 'var(--shadow-sm)';
      header.style.borderColor = 'transparent';
    }
  });

  // Modo edición
  if (ejercicio.editando) {
    const input = document.createElement('input');
    input.value = ejercicio.nombre || '';
    input.placeholder = ejercicio.placeholder || 'Nombre del ejercicio';
    input.style.flex = '1';
    input.style.border = 'none';
    input.style.background = 'transparent';
    input.style.fontSize = '1rem';
    input.style.fontWeight = '600';
    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));

    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt => 
      input.addEventListener(evt, e => e.stopPropagation())
    );

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        ejercicio.nombre = input.value || 'Sin nombre';
        ejercicio.editando = false;
        guardarDatos();
        renderizar();
      }
    });

    input.addEventListener('blur', () => {
      ejercicio.nombre = input.value || 'Sin nombre';
      ejercicio.editando = false;
      guardarDatos();
      renderizar();
    });

    header.appendChild(input);
  } else {
    // Icono expandir/contraer
    const iconoExpand = document.createElement('span');
    iconoExpand.textContent = ejercicioExpandido === index ? '▼' : '▶';
    iconoExpand.style.fontSize = '0.8rem';
    iconoExpand.style.color = 'var(--text-secondary)';
    iconoExpand.style.transition = 'transform 0.2s ease';
    iconoExpand.style.flexShrink = '0';
    header.appendChild(iconoExpand);

    // Contenedor de imagen del ejercicio
    const imagenContainer = document.createElement('div');
    imagenContainer.className = 'ejercicio-imagen';
    imagenContainer.style.width = '48px';
    imagenContainer.style.height = '48px';
    imagenContainer.style.borderRadius = '8px';
    imagenContainer.style.overflow = 'hidden';
    imagenContainer.style.flexShrink = '0';
    imagenContainer.style.background = 'var(--bg-main)';
    imagenContainer.style.display = 'flex';
    imagenContainer.style.alignItems = 'center';
    imagenContainer.style.justifyContent = 'center';
    
    // Si existe imagen, mostrarla
    if (ejercicio.imagen && ejercicio.imagen.trim() !== '') {
      const img = document.createElement('img');
      img.src = ejercicio.imagen;
      img.alt = ejercicio.nombre;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      
      // Manejar error de carga de imagen
      img.onerror = () => {
        imagenContainer.innerHTML = '🏋️';
        imagenContainer.style.fontSize = '1.5rem';
        imagenContainer.style.color = 'var(--text-secondary)';
      };
      
      imagenContainer.appendChild(img);
    } else {
      // Placeholder cuando no hay imagen
      imagenContainer.innerHTML = '🏋️';
      imagenContainer.style.fontSize = '1.5rem';
      imagenContainer.style.color = 'var(--text-secondary)';
    }
    header.appendChild(imagenContainer);

    // Nombre del ejercicio (justificado a la izquierda)
    const nombre = document.createElement('div');
    nombre.textContent = ejercicio.nombre;
    nombre.style.flex = '1';
    nombre.style.fontWeight = '600';
    nombre.style.fontSize = '0.95rem';
    nombre.style.textAlign = 'left';
    nombre.style.paddingLeft = '8px';
    header.appendChild(nombre);

    // Contador de series
    const seriesCount = document.createElement('div');
    const numSeries = (ejercicio.series || []).length;
    seriesCount.textContent = `${numSeries} ${numSeries === 1 ? 'serie' : 'series'}`;
    seriesCount.style.fontSize = '0.8rem';
    seriesCount.style.color = 'var(--text-secondary)';
    seriesCount.style.marginRight = '8px';
    header.appendChild(seriesCount);

    // Botón opciones
    const opcionesBtn = document.createElement('button');
    opcionesBtn.className = "btn-opciones";
    const punto = document.createElement('span');
    opcionesBtn.appendChild(punto);
    opcionesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.menu-opciones').forEach(m => m.remove());
      mostrarMenuOpciones({
        anchorElement: opcionesBtn,
        onEditar: () => { ejercicio.editando = true; guardarDatos(); renderizar(); },
        onEliminar: () => { 
          mostrarConfirmacion(`¿Desea borrar "${ejercicio.nombre}"?`, () => { 
            nivel.hijos.splice(index, 1); 
            ejercicioExpandido = null;
            guardarDatos(); 
            renderizar(); 
          }); 
        },
        onCopiar: () => { return { nivel: rutaActual.length, datos: structuredClone(ejercicio) }; }
      });
    });
    header.appendChild(opcionesBtn);

    // Click en header para expandir/contraer
    header.addEventListener('click', (e) => {
      // Si estamos arrastrando, ignorar el click
      if (draggingEjercicio) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      if (e.target === opcionesBtn || opcionesBtn.contains(e.target)) return;
      
      if (ejercicioExpandido === index) {
        ejercicioExpandido = null;
      } else {
        ejercicioExpandido = index;
      }
      renderizar();
    });
  }

  wrapper.appendChild(header);

  // Contenido expandible (series)
  if (ejercicioExpandido === index && !ejercicio.editando) {
    const contenidoExpandible = document.createElement('div');
    contenidoExpandible.className = 'ejercicio-contenido';
    contenidoExpandible.style.padding = '12px';
    contenidoExpandible.style.background = 'var(--bg-main)';
    contenidoExpandible.style.borderRadius = '0 0 12px 12px';
    contenidoExpandible.style.marginTop = '-8px';

    // Botón añadir serie (compacto)
    const addSerieBtn = document.createElement('button');
    addSerieBtn.textContent = '+ Serie';
    addSerieBtn.className = 'btn-add-serie-compact';
    addSerieBtn.style.width = '100%';
    addSerieBtn.style.padding = '8px';
    addSerieBtn.style.marginBottom = '12px';
    addSerieBtn.style.background = 'var(--primary-mint)';
    addSerieBtn.style.color = 'white';
    addSerieBtn.style.border = 'none';
    addSerieBtn.style.borderRadius = '8px';
    addSerieBtn.style.fontSize = '0.85rem';
    addSerieBtn.style.fontWeight = '700';
    addSerieBtn.style.cursor = 'pointer';
    addSerieBtn.onclick = (e) => {
      e.stopPropagation();
      if (!ejercicio.series) ejercicio.series = [];
      ejercicio.series.push({});
      guardarDatos();
      renderizar();
    };
    contenidoExpandible.appendChild(addSerieBtn);

    // Encabezados de series (compactos)
    const encabezados = document.createElement('div');
    encabezados.className = 'series-header-compact';
    encabezados.style.display = 'grid';
    encabezados.style.gridTemplateColumns = '40px repeat(4, 1fr) 50px 40px';
    encabezados.style.gap = '4px';
    encabezados.style.marginBottom = '8px';
    encabezados.style.fontSize = '0.7rem';
    encabezados.style.fontWeight = '700';
    encabezados.style.color = 'var(--text-secondary)';
    encabezados.style.textTransform = 'uppercase';

    ['', 'REPS', 'PESO', 'RIR', 'DESC', '', ''].forEach(txt => {
      const col = document.createElement('div');
      col.textContent = txt;
      col.style.textAlign = 'center';
      encabezados.appendChild(col);
    });
    contenidoExpandible.appendChild(encabezados);

    // Series
    ejercicio.series = ejercicio.series || [];
    ejercicio.series.forEach((serie, idx) => {
      const serieDiv = document.createElement('div');
      serieDiv.className = "serie-row-compact";
      serieDiv.style.display = 'grid';
      serieDiv.style.gridTemplateColumns = '40px repeat(4, 1fr) 50px 40px';
      serieDiv.style.gap = '4px';
      serieDiv.style.marginBottom = '4px';
      serieDiv.style.padding = '2px 4px';
      serieDiv.style.background = 'transparent';
      serieDiv.style.borderRadius = '8px';
      serieDiv.style.alignItems = 'center';
      serieDiv.style.transition = 'all 0.2s ease';
      serieDiv.style.minHeight = 'auto';
      serieDiv.style.height = 'auto';

      // Botón número de serie
      const numBtn = document.createElement('button');
      numBtn.className = "serie-num";
      numBtn.textContent = serie.marca || (idx + 1);
      numBtn.style.width = '32px';
      numBtn.style.height = '32px';
      numBtn.style.fontSize = '0.85rem';
      numBtn.style.fontWeight = '700';
      numBtn.style.border = 'none';
      numBtn.style.borderRadius = '6px';
      numBtn.style.background = 'transparent';
      numBtn.style.cursor = 'pointer';
      numBtn.style.color = 'var(--text-primary)';
      numBtn.style.display = 'flex';
      numBtn.style.alignItems = 'center';
      numBtn.style.justifyContent = 'center';
      numBtn.style.boxShadow = 'none';
      numBtn.addEventListener('click', e => {
        e.stopPropagation();
        mostrarSelectorMarca(serie, idx, () => { guardarDatos(); renderizar(); });
      });

      // Inputs (compactos)
      const createInput = (placeholder, value, key) => {
        const input = document.createElement('input');
        input.placeholder = placeholder;
        input.value = value || '';
        input.style.width = '100%';
        input.style.padding = '6px 4px';
        input.style.fontSize = '0.85rem';
        input.style.fontWeight = '600';
        input.style.textAlign = 'center';
        input.style.border = '1px solid rgba(0, 0, 0, 0.08)';
        input.style.borderRadius = '6px';
        input.style.background = 'transparent';
        input.style.color = 'var(--text-primary)';
        input.style.height = '32px';
        input.addEventListener('blur', e => {
          serie[key] = e.target.value;
          guardarDatos();
        });
        return input;
      };

      const reps = createInput('R', serie.reps, 'reps');
      const peso = createInput('P', serie.peso, 'peso');
      const rir = createInput('R', serie.rir, 'rir');
      const descanso = createInput('D', serie.descanso, 'descanso');

      // Botón check/timer
      const checkBtn = document.createElement('button');
      checkBtn.style.width = '36px';
      checkBtn.style.height = '36px';
      checkBtn.style.border = 'none';
      checkBtn.style.borderRadius = '6px';
      checkBtn.style.fontSize = '1.2rem';
      checkBtn.style.cursor = 'pointer';
      checkBtn.style.transition = 'all 0.2s ease';
      checkBtn.style.display = 'flex';
      checkBtn.style.alignItems = 'center';
      checkBtn.style.justifyContent = 'center';
      checkBtn.style.margin = '0 auto';
      checkBtn.style.boxShadow = 'none';

      if (serie.completada) {
        checkBtn.textContent = '✔️';
        checkBtn.style.background = 'transparent';
        serieDiv.style.background = 'rgba(232, 245, 233, 0.6)';
      } else {
        checkBtn.textContent = '🕔';
        checkBtn.style.background = 'transparent';
      }

      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        serie.completada = !serie.completada;
        if (serie.completada && serie.descanso) {
          iniciarTimer(serie.descanso);
        }
        guardarDatos();
        renderizar();
      });

      // Botón eliminar
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '❌';
      deleteBtn.style.width = '32px';
      deleteBtn.style.height = '32px';
      deleteBtn.style.border = 'none';
      deleteBtn.style.borderRadius = '6px';
      deleteBtn.style.background = 'transparent';
      deleteBtn.style.fontSize = '0.9rem';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.display = 'flex';
      deleteBtn.style.alignItems = 'center';
      deleteBtn.style.justifyContent = 'center';
      deleteBtn.style.margin = '0 auto';
      deleteBtn.style.boxShadow = 'none';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mostrarConfirmacion("¿Desea borrar esta serie?", () => {
          ejercicio.series.splice(idx, 1);
          guardarDatos();
          renderizar();
        });
      });

      [numBtn, reps, peso, rir, descanso, checkBtn, deleteBtn].forEach(el => serieDiv.appendChild(el));
      contenidoExpandible.appendChild(serieDiv);
    });

    // Stats compactos
    const statsBox = document.createElement('div');
    statsBox.style.background = 'var(--bg-card)';
    statsBox.style.padding = '10px';
    statsBox.style.marginTop = '12px';
    statsBox.style.borderRadius = '8px';
    statsBox.style.fontSize = '0.85rem';
    statsBox.style.display = 'grid';
    statsBox.style.gridTemplateColumns = '1fr 1fr';
    statsBox.style.gap = '8px';
    statsBox.style.textAlign = 'center';

    let volumenTotal = 0;
    let mejor1RM = 0;
    ejercicio.series.forEach(serie => {
      const peso = parseFloat(serie.peso) || 0;
      const reps = parseInt(serie.reps) || 0;
      volumenTotal += peso * reps;
      const estimado = peso * (1 + reps / 30);
      if (estimado > mejor1RM) mejor1RM = estimado;
    });

    const volDiv = document.createElement('div');
    volDiv.innerHTML = `<b>Volumen:</b><br>${volumenTotal.toFixed(1)} kg`;
    const rmDiv = document.createElement('div');
    rmDiv.innerHTML = `<b>1RM est:</b><br>${mejor1RM.toFixed(1)} kg`;
    statsBox.appendChild(volDiv);
    statsBox.appendChild(rmDiv);
    contenidoExpandible.appendChild(statsBox);

    // Ejercicio anterior (compacto)
    function buscarEjercicioAnterior(datosArg, rutaArg, ejercicioActual) {
      if (!ejercicioActual || !datosArg) return null;
      const nombreEjercicioActual = (ejercicioActual.nombre || '').trim().toLowerCase();

      let sesionActual = null;
      if (Array.isArray(rutaArg) && rutaArg.length >= 3) {
        const m = rutaArg[0], mi = rutaArg[1], s = rutaArg[2];
        sesionActual = datosArg?.[m]?.hijos?.[mi]?.hijos?.[s] || null;
      }

      const fechaReferencia = (sesionActual && (sesionActual._fecha || sesionActual.fecha)) || ejercicioActual._fecha || ejercicioActual.fecha;
      const timestampActual = fechaReferencia ? Date.parse(fechaReferencia) : null;

      const sesionesPlan = [];
      let linearIndex = 0;
      for (let mi = 0; mi < datosArg.length; mi++) {
        const meso = datosArg[mi];
        for (let mj = 0; mj < (meso.hijos || []).length; mj++) {
          const micro = meso.hijos[mj];
          for (let sk = 0; sk < (micro.hijos || []).length; sk++) {
            const ses = micro.hijos[sk];
            let fechaSesion = ses._fecha || ses.fecha || null;
            const tsSesion = fechaSesion ? Date.parse(fechaSesion) : null;
            sesionesPlan.push({ sesion: ses, fechaSesion, tsSesion, linearIndex });
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
        if (timestampActual !== null && sInfo.tsSesion !== null && sInfo.tsSesion >= timestampActual) continue;
        if (timestampActual === null && actualLinear !== null && sInfo.linearIndex >= actualLinear) continue;

        for (const bloque of sesion.hijos || []) {
          for (const ejerc of bloque.hijos || []) {
            if (((ejerc.nombre || '').trim().toLowerCase()) !== nombreEjercicioActual) continue;
            if (!ejerc.series || ejerc.series.length === 0) continue;
            if (!mejor || (timestampActual !== null ? (sInfo.tsSesion || 0) > (mejor.fechaTs || 0) : sInfo.linearIndex > (mejor.linearIndex || 0))) {
              mejor = { ejerc, fechaTs: sInfo.tsSesion, fechaRaw: sInfo.fechaSesion, linearIndex: sInfo.linearIndex };
            }
          }
        }
      }
      return mejor;
    }

    const ejercicioAnteriorObj = buscarEjercicioAnterior(datos, rutaActual, ejercicio);
    if (ejercicioAnteriorObj) {
      const ejercicioAnterior = ejercicioAnteriorObj.ejerc;
      let fechaMostrar = ejercicioAnteriorObj.fechaRaw || '';
      if (fechaMostrar && fechaMostrar.includes('T')) fechaMostrar = fechaMostrar.split('T')[0];
      if (fechaMostrar) {
        const d = new Date(fechaMostrar + 'T00:00:00');
        fechaMostrar = d.toLocaleDateString('es-ES');
      }

      const statsBoxAnt = document.createElement('div');
      statsBoxAnt.style.background = '#f0f8ff';
      statsBoxAnt.style.padding = '10px';
      statsBoxAnt.style.marginTop = '8px';
      statsBoxAnt.style.borderRadius = '8px';
      statsBoxAnt.style.fontSize = '0.75rem';
      statsBoxAnt.style.borderLeft = '3px solid var(--secondary-cyan)';

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
        <b>📅 Anterior (${fechaMostrar}):</b><br>
        Vol: ${volumenAnt.toFixed(1)} kg | 1RM: ${mejor1RMAnt.toFixed(1)} kg | Max: ${pesoMax.toFixed(1)} kg
      `;
      contenidoExpandible.appendChild(statsBoxAnt);
    }

    // Notas (compactas)
    const notas = document.createElement('textarea');
    notas.placeholder = 'Notas...';
    notas.value = ejercicio.notas || '';
    notas.style.width = '100%';
    notas.style.height = '60px';
    notas.style.marginTop = '8px';
    notas.style.padding = '8px';
    notas.style.border = '1px solid var(--border-color)';
    notas.style.borderRadius = '8px';
    notas.style.fontSize = '0.85rem';
    notas.style.resize = 'vertical';
    notas.addEventListener('input', e => { ejercicio.notas = e.target.value; guardarDatos(); });
    contenidoExpandible.appendChild(notas);

    wrapper.appendChild(contenidoExpandible);
  }

  return wrapper;
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

// ==================== DRAG & DROP PARA EJERCICIOS (NIVEL 4) ====================
let dragEjercicio = null;
let dragEjercicioStartX = 0;
let dragEjercicioStartY = 0;
let draggingEjercicio = false;
let dragEjercicioStartIndex = null;
let dragEjercicioTimer = null;
let hasMovedEjercicio = false;

function startDragEjercicio(e) {
  // No interferir con clicks normales
  if (e.type === "mousedown" && e.button !== 0) return;
  
  dragEjercicio = e.currentTarget.closest(".ejercicio-acordeon");
  if (!dragEjercicio) return;

  draggingEjercicio = false;
  hasMovedEjercicio = false;
  dragEjercicioStartIndex = [...contenido.children].indexOf(dragEjercicio);

  const touch = e.touches ? e.touches[0] : e;
  dragEjercicioStartX = touch.clientX;
  dragEjercicioStartY = touch.clientY;

  const checkMovement = (moveEvent) => {
    const moveTouch = moveEvent.touches ? moveEvent.touches[0] : moveEvent;
    const deltaX = Math.abs(moveTouch.clientX - dragEjercicioStartX);
    const deltaY = Math.abs(moveTouch.clientY - dragEjercicioStartY);
    
    if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
      hasMovedEjercicio = true;
      clearTimeout(dragEjercicioTimer);
      dragEjercicioTimer = null;
      cleanup();
    }
  };

  const cleanup = () => {
    document.removeEventListener('mousemove', checkMovement);
    document.removeEventListener('touchmove', checkMovement);
  };

  document.addEventListener('mousemove', checkMovement, { passive: true });
  document.addEventListener('touchmove', checkMovement, { passive: true });

  dragEjercicioTimer = setTimeout(() => {
    cleanup();
    
    if (!hasMovedEjercicio) {
      draggingEjercicio = true;
      dragEjercicio.classList.add("dragging");
      
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      dragEjercicio.style.opacity = '0.7';
      dragEjercicio.style.transform = 'scale(1.02)';
    }
  }, LONG_PRESS_DURATION);
}

function dragMoveEjercicio(e) {
  if (!draggingEjercicio || !dragEjercicio) return;
  
  e.preventDefault();

  const touch = e.touches ? e.touches[0] : e;
  const y = touch.clientY;

  const items = [...document.querySelectorAll(".ejercicio-acordeon:not(.dragging)")];
  
  let targetItem = null;

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    const itemMiddle = rect.top + rect.height / 2;
    
    if (y < itemMiddle) {
      targetItem = item;
      break;
    }
  }

  if (targetItem) {
    contenido.insertBefore(dragEjercicio, targetItem);
  } else if (items.length > 0) {
    contenido.appendChild(dragEjercicio);
  }
}

function dragEndEjercicio() {
  clearTimeout(dragEjercicioTimer);
  dragEjercicioTimer = null;
  
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';

  if (!draggingEjercicio || !dragEjercicio) {
    dragEjercicio = null;
    dragEjercicioStartIndex = null;
    hasMovedEjercicio = false;
    return;
  }

  dragEjercicio.style.opacity = '';
  dragEjercicio.style.transform = '';
  
  draggingEjercicio = false;
  dragEjercicio.classList.remove("dragging");

  const newIndex = [...contenido.children].indexOf(dragEjercicio);

  if (dragEjercicioStartIndex !== null && newIndex !== dragEjercicioStartIndex) {
    const nivel = nivelActual();
    const movedItem = nivel.hijos.splice(dragEjercicioStartIndex, 1)[0];
    nivel.hijos.splice(newIndex, 0, movedItem);
    guardarDatos();
  }

  dragEjercicio = null;
  dragEjercicioStartIndex = null;
  hasMovedEjercicio = false;
}

// ==================== CREAR INDICE (DRAG & DROP + UI ITEM) ====================
let dragItem = null;
let dragStartX = 0;
let dragStartY = 0;
let dragging = false;
let dragStartIndex = null;
let dragTimer = null;
let hasMoved = false;
const MOVEMENT_THRESHOLD = 10; // píxeles de holgura permitidos antes de cancelar drag
const LONG_PRESS_DURATION = 500; // ms para activar drag

function startDrag(e) {
  // No interferir con clicks normales - NO preventDefault
  if (e.type === "mousedown" && e.button !== 0) return;
  
  dragItem = e.currentTarget.closest(".list-item");
  if (!dragItem) return;

  dragging = false;
  hasMoved = false;
  dragStartIndex = [...contenido.children].indexOf(dragItem);

  const touch = e.touches ? e.touches[0] : e;
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;

  // Listener temporal para detectar movimiento durante el long-press
  const checkMovement = (moveEvent) => {
    const moveTouch = moveEvent.touches ? moveEvent.touches[0] : moveEvent;
    const deltaX = Math.abs(moveTouch.clientX - dragStartX);
    const deltaY = Math.abs(moveTouch.clientY - dragStartY);
    
    // Si el usuario se mueve demasiado, cancelar el drag (probablemente está haciendo scroll)
    if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
      hasMoved = true;
      clearTimeout(dragTimer);
      dragTimer = null;
      cleanup();
    }
  };

  const cleanup = () => {
    document.removeEventListener('mousemove', checkMovement);
    document.removeEventListener('touchmove', checkMovement);
  };

  // Listeners temporales - IMPORTANTE: { passive: true } para no bloquear scroll
  document.addEventListener('mousemove', checkMovement, { passive: true });
  document.addEventListener('touchmove', checkMovement, { passive: true });

  // Timer para activar drag después del long-press
  dragTimer = setTimeout(() => {
    cleanup();
    
    // Solo activar drag si NO hubo movimiento
    if (!hasMoved) {
      dragging = true;
      dragItem.classList.add("dragging");
      
      // Bloquear selección de texto solo cuando se activa el drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      // Feedback háptico si está disponible
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Añadir feedback visual
      dragItem.style.opacity = '0.7';
      dragItem.style.transform = 'scale(1.02)';
    }
  }, LONG_PRESS_DURATION);
}

function dragMove(e) {
  // Solo procesar si estamos en modo drag activo
  if (!dragging || !dragItem) return;
  
  // Ahora sí, prevenir scroll mientras arrastramos
  e.preventDefault();

  const touch = e.touches ? e.touches[0] : e;
  const y = touch.clientY;

  const items = [...document.querySelectorAll(".list-item:not(.dragging)")];
  
  let targetItem = null;

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    const itemMiddle = rect.top + rect.height / 2;
    
    if (y < itemMiddle) {
      targetItem = item;
      break;
    }
  }

  // Reordenar elementos
  if (targetItem) {
    contenido.insertBefore(dragItem, targetItem);
  } else if (items.length > 0) {
    contenido.appendChild(dragItem);
  }
}

function dragEnd() {
  clearTimeout(dragTimer);
  dragTimer = null;
  
  // Restaurar selección de texto
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';

  // Si no estábamos en modo drag, simplemente limpiar
  if (!dragging || !dragItem) {
    dragItem = null;
    dragStartIndex = null;
    hasMoved = false;
    return;
  }

  // Restaurar estilos visuales
  dragItem.style.opacity = '';
  dragItem.style.transform = '';
  
  dragging = false;
  dragItem.classList.remove("dragging");

  const newIndex = [...contenido.children].indexOf(dragItem);

  // Guardar cambios solo si hubo reordenamiento
  if (dragStartIndex !== null && newIndex !== dragStartIndex) {
    const nivel = nivelActual();
    const movedItem = nivel.hijos.splice(dragStartIndex, 1)[0];
    nivel.hijos.splice(newIndex, 0, movedItem);
    guardarDatos();
  }

  dragItem = null;
  dragStartIndex = null;
  hasMoved = false;
}

function crearIndice(item, index, nivel) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.dataset.index = index;
  div.dataset.nivel = rutaActual.length;
  
  // Click en el div completo
  div.addEventListener('click', (e) => {
    // Si estamos arrastrando, ignorar el click
    if (dragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const target = e.target;
    if (target.tagName === 'BUTTON' || 
        target.type === 'date' ||
        target.closest('.btn-opciones')) {
      e.stopPropagation();
      return;
    }
    
    e.stopPropagation();
    navigatePush(index);
  });

  div.addEventListener('mousedown', startDrag, { passive: false, capture: true });
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
    input.readOnly = true;
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

    // opciones botón
    if (rutaActual.length >= 1 && rutaActual.length <= 3) {
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

  // Drag & drop global para listas normales
  document.addEventListener("mousemove", dragMove);
  document.addEventListener("touchmove", dragMove, { passive: false });
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("touchend", dragEnd);
  document.addEventListener("touchcancel", dragEnd);
  
  // Drag & drop global para ejercicios (nivel 4)
  document.addEventListener("mousemove", dragMoveEjercicio);
  document.addEventListener("touchmove", dragMoveEjercicio, { passive: false });
  document.addEventListener("mouseup", dragEndEjercicio);
  document.addEventListener("touchend", dragEndEjercicio);
  document.addEventListener("touchcancel", dragEndEjercicio);
}