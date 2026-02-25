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
import { renderizarNutricion } from "./nutricion.js";
import { fetchAllExercises, searchExercisesByName } from "./exercises.js";

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
  { nombre: 'Calendario', hijos: [] },
  { nombre: 'Nutrición', hijos: [] }
];
let datos = structuredClone(DATOS_POR_DEFECTO);
console.log('[Datos iniciales] Usando datos por defecto, se cargarán de Firestore al autenticar');

// ==================== ESTADO / REFERENCIAS UI ====================
let rutaActual = [];
let ejercicioExpandido = null;
let contenido, tituloNivel, headerButtons, addButton, backButton, timerContainer, homeButton, logoutButton, menuButton, sideMenu, menuOverlay, subHeader;
let menuTitulo;
let ultimoMenuSeleccionado = 'Dashboard';
let sessionTimerSecs = 0;
let sessionTimerRunning = false;
let sessionTimerInterval = null;
// ==================== TIMER DE SESIÓN ====================
let sessionTimer = {
  interval: null,
  corriendo: false,
  rutaSesion: null
};

function sessionTimerGetSegundos() {
  const v = localStorage.getItem('sessionTimerSegundos');
  return v ? parseInt(v) : 0;
}
function sessionTimerSetSegundos(s) {
  localStorage.setItem('sessionTimerSegundos', s);
}
function sessionTimerGetRuta() {
  const v = localStorage.getItem('sessionTimerRuta');
  return v ? JSON.parse(v) : null;
}
function sessionTimerSetRuta(ruta) {
  if (ruta) localStorage.setItem('sessionTimerRuta', JSON.stringify(ruta));
  else localStorage.removeItem('sessionTimerRuta');
}

// ==================== FUNCIONES TIMER DE SESIÓN ====================
function iniciarTimerSesion(rutaSesion) {
  if (sessionTimer.corriendo) return;
  sessionTimer.rutaSesion = [...rutaSesion];
  sessionTimerSetRuta(rutaSesion);
  sessionTimer.corriendo = true;
  sessionTimer.interval = setInterval(() => {
    sessionTimerSetSegundos(sessionTimerGetSegundos() + 1);
    actualizarDisplayTimerSesion();
  }, 1000);
}

function pausarTimerSesion() {
  if (!sessionTimer.corriendo) return;
  clearInterval(sessionTimer.interval);
  sessionTimer.interval = null;
  sessionTimer.corriendo = false;
}

function resetearTimerSesion() {
  clearInterval(sessionTimer.interval);
  sessionTimer.interval = null;
  sessionTimer.corriendo = false;
  sessionTimer.rutaSesion = null;
  sessionTimerSetSegundos(0);
  sessionTimerSetRuta(null);
}

function restaurarTimerSesion() {
  const ruta = sessionTimerGetRuta();
  if (!ruta) return;
  sessionTimer.rutaSesion = ruta;
  sessionTimer.corriendo = true;
  sessionTimer.interval = setInterval(() => {
    sessionTimerSetSegundos(sessionTimerGetSegundos() + 1);
    actualizarDisplayTimerSesion();
  }, 1000);
}

function actualizarDisplayTimerSesion() {
  const display = document.getElementById('sessionTimerDisplay');
  if (!display) return;
  const seg = sessionTimerGetSegundos();
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatearDuracion(minutos) {
  if (!minutos || minutos === 0) return null;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function mostrarModalGuardarTiempo(rutaSesion, segundos) {
  const minutos = Math.round(segundos / 60);
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  const tiempoStr = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--bg-card);
    border-radius: 20px;
    padding: 28px 24px;
    width: 88%;
    max-width: 340px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    animation: slideDown 0.25s ease;
  `;

  modal.innerHTML = `
    <div style="font-size: 2.5rem;">🏁</div>
    <div style="text-align:center;">
      <div style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">
        ¿Guardar tiempo de sesión?
      </div>
      <div style="font-size:0.85rem; color:var(--text-secondary);">
        Tiempo registrado
      </div>
      <div style="font-size:2.2rem; font-weight:900; color:var(--primary-mint); font-family:monospace; margin-top:4px;">
        ${tiempoStr}
      </div>
      <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">${minutos} minutos</div>
    </div>
  `;

  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = '💾 Guardar';
  btnGuardar.style.cssText = `
    width: 100%; padding: 14px;
    background: var(--primary-mint);
    color: white; border: none; border-radius: 12px;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    transition: all 0.2s;
  `;
  btnGuardar.onmouseover = () => btnGuardar.style.background = 'var(--mint-light)';
  btnGuardar.onmouseout = () => btnGuardar.style.background = 'var(--primary-mint)';
  btnGuardar.onclick = async () => {
      try {
        // rutaSesion = [0, mesoIdx, microIdx, sesionIdx] — 4 índices
        let n = { hijos: datos };
        for (let i of rutaSesion) n = n.hijos[i];
        n.duracionMinutos = minutos;
        console.log('[Timer] Nodo donde se guarda:', n.nombre, 'minutos:', minutos);

        // Guardar en Firestore explícitamente
        const user = auth.currentUser;
        if (user) {
          await guardarDatosUsuario(user.uid, datos);
          console.log(`[Timer Sesión] ✓ ${minutos} min guardados en Firestore`);
        }
      } catch(e) {
        console.error('[Timer Sesión] Error al guardar:', e);
      }
      resetearTimerSesion();
      overlay.remove();
      renderizar();
    };

  const btnDescartar = document.createElement('button');
  btnDescartar.textContent = 'Descartar';
  btnDescartar.style.cssText = `
    width: 100%; padding: 12px;
    background: transparent;
    color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 12px;
    font-size: 0.95rem; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
  `;
  btnDescartar.onmouseover = () => btnDescartar.style.background = 'var(--bg-main)';
  btnDescartar.onmouseout = () => btnDescartar.style.background = 'transparent';
  btnDescartar.onclick = () => {
    resetearTimerSesion();
    overlay.remove();
    renderizar();
  };

  modal.appendChild(btnGuardar);
  modal.appendChild(btnDescartar);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function sessionTimerStart() {
  if (sessionTimerRunning) return;
  sessionTimerRunning = true;
  sessionTimerInterval = setInterval(() => {
    sessionTimerSecs++;
    _updateSessionTimerUI();
  }, 1000);
  _updateSessionTimerBtns();
}

function sessionTimerPause() {
  sessionTimerRunning = false;
  clearInterval(sessionTimerInterval);
  _updateSessionTimerBtns();
}

function sessionTimerReset() {
  sessionTimerRunning = false;
  clearInterval(sessionTimerInterval);
  sessionTimerSecs = 0;
  _updateSessionTimerUI();
  _updateSessionTimerBtns();
}

function _updateSessionTimerUI() {
  const display = document.getElementById('sessionTimerDisplay');
  if (!display) return;
  const h = Math.floor(sessionTimerSecs / 3600);
  const m = Math.floor((sessionTimerSecs % 3600) / 60);
  const s = sessionTimerSecs % 60;
  display.textContent = h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  display.className = 'session-timer-display' + (sessionTimerSecs >= 5400 ? ' warning' : '');
  const bar = document.getElementById('sessionTimerBar');
  if (bar) {
    const pct = Math.min((sessionTimerSecs / 5400) * 100, 100);
    bar.style.width = pct + '%';
    bar.style.background = sessionTimerSecs >= 5400 ? 'var(--primary-coral)' : 'var(--primary-mint)';
  }
}

function _updateSessionTimerBtns() {
  const btnStart = document.getElementById('sessionTimerBtnStart');
  const btnPause = document.getElementById('sessionTimerBtnPause');
  if (!btnStart || !btnPause) return;
  if (sessionTimerRunning) {
    btnStart.style.display = 'none';
    btnPause.style.display = 'flex';
  } else {
    btnStart.style.display = 'flex';
    btnStart.textContent = sessionTimerSecs > 0 ? '▶ Reanudar' : '▶ Iniciar';
    btnPause.style.display = 'none';
  }
}

function _crearSessionTimerBar() {
  // Evitar duplicados
  const existing = document.getElementById('sessionTimerBar_container');
  if (existing) return existing;

  const bar = document.createElement('div');
  bar.id = 'sessionTimerBar_container';
  bar.className = 'session-timer-bar';
  bar.innerHTML = `
    <div class="session-timer-left">
      <div class="session-timer-label">⏱ Tiempo entrenando</div>
      <div class="session-timer-display" id="sessionTimerDisplay">00:00</div>
    </div>
    <div class="session-timer-controls">
      <button class="session-timer-btn start" id="sessionTimerBtnStart">▶ Iniciar</button>
      <button class="session-timer-btn pause" id="sessionTimerBtnPause" style="display:none">⏸ Pausar</button>
      <button class="session-timer-btn reset" id="sessionTimerBtnReset">↺</button>
    </div>
    <div class="session-timer-progress-wrap">
      <div class="session-timer-progress" id="sessionTimerBar" style="width:0%"></div>
    </div>
  `;

  // Eventos
  bar.querySelector('#sessionTimerBtnStart').addEventListener('click', sessionTimerStart);
  bar.querySelector('#sessionTimerBtnPause').addEventListener('click', sessionTimerPause);
  bar.querySelector('#sessionTimerBtnReset').addEventListener('click', sessionTimerReset);

  // Restaurar estado visual si ya corría
  _updateSessionTimerUI();
  _updateSessionTimerBtns();

  return bar;
}

function navigatePush(index) {
  rutaActual.push(index);
  ejercicioExpandido = null;
  renderizar();
}

// ==================== FUNCIONES DE ESTADÍSTICAS ====================

// Función para calcular estadísticas de un ejercicio
function calcularEstadisticasEjercicio(ejercicio) {
  const series = ejercicio.series || [];
  
  // Peso máximo
  const pesoMax = Math.max(...series.map(s => parseFloat(s.peso) || 0), 0);
  
  // Volumen total (peso × reps sumado)
  const volumenTotal = series.reduce((total, s) => {
    const peso = parseFloat(s.peso) || 0;
    const reps = parseInt(s.reps) || 0;
    return total + (peso * reps);
  }, 0);
  
  // 1RM estimado usando la fórmula de Epley: 1RM = peso × (1 + reps/30)
  // Tomamos la serie con mayor 1RM estimado
  const oneRM = Math.max(...series.map(s => {
    const peso = parseFloat(s.peso) || 0;
    const reps = parseInt(s.reps) || 0;
    if (peso === 0 || reps === 0) return 0;
    return peso * (1 + reps / 30);
  }), 0);
  
  return {
    pesoMax: Math.round(pesoMax * 10) / 10,
    volumenTotal: Math.round(volumenTotal),
    oneRM: Math.round(oneRM * 10) / 10
  };
}

// Función para buscar la sesión anterior del mismo ejercicio
function buscarSesionAnteriorEjercicio(nombreEjercicio) {
  const todasLasSesiones = [];

  // Recolectar todas las sesiones con sus fechas
  if (datos && datos[0]) {
    datos[0].hijos?.forEach((meso, mesoIdx) => {
      meso.hijos?.forEach((micro, microIdx) => {
        micro.hijos?.forEach((sesion, sesionIdx) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
            for (const subNivel of sesion.hijos) {
              if (subNivel.fecha) {
                fechaSesion = subNivel.fecha;
                break;
              }
            }
          }

          if (fechaSesion) {
            // Buscar el ejercicio en la sesión
            const buscarEjercicioEnNivel = (nivel) => {
              if (nivel.nombre === nombreEjercicio && nivel.series) {
                return nivel;
              }
              if (nivel.hijos) {
                for (const hijo of nivel.hijos) {
                  const encontrado = buscarEjercicioEnNivel(hijo);
                  if (encontrado) return encontrado;
                }
              }
              return null;
            };

            const ejercicioEncontrado = buscarEjercicioEnNivel(sesion);
            if (ejercicioEncontrado) {
              todasLasSesiones.push({
                fecha: fechaSesion,
                ejercicio: ejercicioEncontrado,
                ruta: [0, mesoIdx, microIdx, sesionIdx]
              });
            }
          }
        });
      });
    });
  }

  // Ordenar por fecha descendente
  todasLasSesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Obtener la fecha (día) de la sesión actual — la sesión que contiene el ejercicio expandido
  let fechaActual = null;
  if (rutaActual.length >= 3) {
    // navegar hasta el nivel de sesión (los primeros 3 índices)
    let nivel = { hijos: datos };
    for (let i of rutaActual.slice(0, 3)) nivel = nivel.hijos[i];
    fechaActual = nivel?.fecha;
    if (!fechaActual && nivel?.hijos && nivel.hijos.length > 0) {
      for (const subNivel of nivel.hijos) {
        if (subNivel.fecha) { fechaActual = subNivel.fecha; break; }
      }
    }
  }

  // Normalizar a día (YYYY-MM-DD) para comparar por día y no por timestamp
  const toDia = (raw) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  };

  const fechaActualDia = toDia(fechaActual);

  // Buscar la sesión anterior (solo sesiones estrictamente anteriores al día de la sesión actual)
  for (const sesion of todasLasSesiones) {
    const sesionDia = toDia(sesion.fecha);
    if (fechaActualDia) {
      // Si la sesión es de un día anterior al día actual, devolverla
      if (sesionDia && sesionDia < fechaActualDia) return sesion;
      // Si sesionDia >= fechaActualDia, continuar buscando
      continue;
    } else {
      // Si no tenemos fechaActual, devolver la primer sesión encontrada (más reciente)
      return sesion;
    }
  }

  return null;
}

// ==================== DOMContentLoaded: inicialización UI ====================
document.addEventListener("DOMContentLoaded", () => {
  // ✅ PRIMERO: Toggle Login/Register - Debe funcionar en TODAS las páginas
  const formLogin = $("form-login");
  const formRegister = $("form-register");
  const showRegisterBtn = $("showRegisterBtn");
  const showLoginBtn = $("showLoginBtn");

  if (showRegisterBtn && formLogin && formRegister) {
    console.log('[DOMContentLoaded] ✓ Botón "Crear cuenta nueva" encontrado, añadiendo listener');
    showRegisterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log('[showRegisterBtn] Click detectado');
      formLogin.classList.add("hidden");
      formRegister.classList.remove("hidden");
      const logMsg = $("log-msg");
      if (logMsg) logMsg.textContent = "";
    });
  } else {
    console.log('[DOMContentLoaded] ⚠️ No se encontraron elementos de login/register');
  }
  
  if (showLoginBtn && formLogin && formRegister) {
    console.log('[DOMContentLoaded] ✓ Botón "Ya tengo cuenta" encontrado, añadiendo listener');
    showLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log('[showLoginBtn] Click detectado');
      formRegister.classList.add("hidden");
      formLogin.classList.remove("hidden");
      const regMsg = $("reg-msg");
      if (regMsg) regMsg.textContent = "";
    });
  }

  // ✅ DESPUÉS: Inicializar elementos de la app (solo si estamos en la página de app)
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

  // Botones principales (solo si existen)
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
      if (seccion === "nutricion") { rutaActual = [3]; ultimoMenuSeleccionado = 'Nutrición'; }
      if (seccion === "dashboard") { rutaActual = []; ultimoMenuSeleccionado = 'Dashboard'; }
      ejercicioExpandido = null;
      renderizar();
      sideMenu.style.left = "-70%";
      menuOverlay.classList.add("hidden");
    });
  });

  window.renderizar = renderizar;
  window.guardarDatos = guardarDatos;
  window.rutaActual = rutaActual;
  window.datos = datos; // ✅ CRÍTICO: exponer datos globalmente

  if (isAppPage()) {
    renderizar();
    // Restaurar timer de sesión si estaba corriendo
    if (sessionTimerGetRuta()) {
      restaurarTimerSesion();
    }
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
        window.datos = datos; // ✅ Actualizar referencia global
      } else {
        console.log('[onAuthStateChanged] No hay datos en Firestore, usando datos por defecto');
        datos = structuredClone(DATOS_POR_DEFECTO);
        window.datos = datos; // ✅ Actualizar referencia global
      }
      
      renderizar();
      
    } catch (error) {
      console.error('[onAuthStateChanged] Error al cargar datos:', error);
      datos = structuredClone(DATOS_POR_DEFECTO);
      window.datos = datos; // ✅ Actualizar referencia global
      renderizar();
    }
  } else {
    console.log('[onAuthStateChanged] ⚠️ No hay usuario autenticado');
    datos = structuredClone(DATOS_POR_DEFECTO);
    window.datos = datos; // ✅ Actualizar referencia global
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

// ==================== BUSCADOR DE EJERCICIOS GLOBAL (CON API) ====================
window.abrirBuscadorEjercicios = function(callback) {
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

  // ==================== MENSAJE INICIAL ====================
  const mensajeInicial = document.createElement('div');
  mensajeInicial.className = 'exercise-mensaje';
  mensajeInicial.innerHTML = '<p>🔍 Escribe para buscar ejercicios...</p>';
  list.appendChild(mensajeInicial);

  // ==================== BÚSQUEDA CON DEBOUNCE ====================
  let searchTimeout;
  
  input.addEventListener('input', async () => {
    const q = input.value.trim();
    
    // Limpiar timeout anterior
    clearTimeout(searchTimeout);
    
    if (q === '') {
      list.innerHTML = '';
      const mensaje = document.createElement('div');
      mensaje.className = 'exercise-mensaje';
      mensaje.innerHTML = '<p>🔍 Escribe para buscar ejercicios...</p>';
      list.appendChild(mensaje);
      return;
    }
    
    // Mostrar loading
    list.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'exercise-mensaje';
    loading.innerHTML = '<p>⏳ Buscando...</p>';
    list.appendChild(loading);
    
    // Debounce de 500ms
    searchTimeout = setTimeout(async () => {
      try {
        // ✅ IMPORTAR LA FUNCIÓN DESDE exercises.js
        const { searchExercisesByName } = await import(`./exercises.js?v=${Date.now()}`);

        const resultados = await searchExercisesByName(q);

        console.log('RESULTADOS CRUDOS:', resultados[0]);
        
        list.innerHTML = '';
        
        if (resultados.length === 0) {
          const mensaje = document.createElement('div');
          mensaje.className = 'exercise-mensaje';
          mensaje.innerHTML = '<p>❌ No se encontraron ejercicios</p>';
          list.appendChild(mensaje);
          return;
        }
        
        // Contador de resultados
        const contador = document.createElement('div');
        contador.className = 'exercise-counter';
        contador.textContent = `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`;
        list.appendChild(contador);
        
        // ==================== RENDERIZAR RESULTADOS ====================
        resultados.forEach(ej => {
          const item = document.createElement('div');
          item.className = 'exercise-item-card';
          
          // ✅✅✅ CORRECCIÓN CRÍTICA: Icono del ejercicio con GIF
          const icono = document.createElement('div');
          icono.className = 'exercise-icon';
          icono.style.background = 'transparent'; // Quitar fondo para ver el GIF
          
          // 🔥 SI HAY IMAGEN, mostrarla
          if (ej.imagen && ej.imagen.trim() !== '') {
            const img = document.createElement('img');
            icono.textContent = '⏳';
            
            img.onload = () => {
              icono.textContent = '';
              icono.appendChild(img);
            };
            
            img.onerror = () => {
              console.error('Error cargando imagen:', ej.imagen);
              icono.textContent = '🏋️';
            };

            // ✅ Cargar directamente (el proxy maneja CORS)
            img.src = ej.imagen;
            img.alt = ej.nombre;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '12px';
            
          } else {
            icono.textContent = '🏋️';
          }
          
          item.appendChild(icono);
          
          // Información del ejercicio
          const info = document.createElement('div');
          info.className = 'exercise-info';
          
          const nombre = document.createElement('div');
          nombre.className = 'exercise-name';
          nombre.textContent = ej.nombre;
          info.appendChild(nombre);
          
          // Tags con grupo muscular y equipamiento
          const detalles = document.createElement('div');
          detalles.className = 'exercise-details';
          
          // Tag grupo muscular
          const gruposPrincipales = Array.isArray(ej.grupo_muscular) ? ej.grupo_muscular : [ej.grupo_muscular];
          if (gruposPrincipales.length > 0 && gruposPrincipales[0]) {
            const tagGrupo = document.createElement('span');
            tagGrupo.className = 'exercise-tag';
            const grupoTexto = gruposPrincipales.join(', ').replace(/_/g, ' ');
            tagGrupo.innerHTML = `<span class="tag-icon">💪</span>${grupoTexto}`;
            detalles.appendChild(tagGrupo);
          }
          
          // Tag equipamiento
          if (ej.equipamiento) {
            const tagEquip = document.createElement('span');
            tagEquip.className = 'exercise-tag';
            const equipTexto = ej.equipamiento.replace(/_/g, ' ');
            const equipIconos = {
              'barra': '🏋️',
              'mancuernas': '🔩',
              'polea': '🎣',
              'maquina': '⚙️',
              'peso_corporal': '🧘',
              'smith': '🏗️',
              'lastre': '⚖️',
              'banda': '🎗️',
              'kettlebell': '⚖️'
            };
            tagEquip.innerHTML = `<span class="tag-icon">${equipIconos[ej.equipamiento] || '🏋️'}</span>${equipTexto}`;
            detalles.appendChild(tagEquip);
          }
          
          info.appendChild(detalles);
          item.appendChild(info);
          
          // Botón añadir
          const btnAdd = document.createElement('button');
          btnAdd.className = 'exercise-add-btn';
          btnAdd.textContent = '+';
          btnAdd.onclick = (e) => {
            e.stopPropagation();
            if (callback) {
              callback(ej.nombre, ej.imagen); // ✅ Pasar también la imagen
            } else {
              añadirEjercicioDesdeBiblioteca(ej.nombre, ej.imagen);
            }
            overlay.remove();
          };
          item.appendChild(btnAdd);
          
          // Click en toda la tarjeta también añade
          item.onclick = (e) => {
            if (e.target !== btnAdd) {
              if (callback) {
                callback(ej.nombre, ej.imagen);
              } else {
                añadirEjercicioDesdeBiblioteca(ej.nombre, ej.imagen);
              }
              overlay.remove();
            }
          };
          
          list.appendChild(item);
        });
        
      } catch (error) {
        console.error('Error buscando ejercicios:', error);
        list.innerHTML = '';
        const errorMsg = document.createElement('div');
        errorMsg.className = 'exercise-mensaje';
        errorMsg.innerHTML = '<p>❌ Error al buscar ejercicios</p><p style="font-size: 0.8rem; color: var(--text-light);">Verifica tu API key</p>';
        list.appendChild(errorMsg);
      }
    }, 500); // Debounce de 500ms
  });

  modal.appendChild(header);
  modal.appendChild(input);
  modal.appendChild(list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  setTimeout(() => input.focus(), 100);
};

// ✅ UNA SOLA función añadirEjercicioDesdeBiblioteca
  function añadirEjercicioDesdeBiblioteca(nombre, imagenUrl = null) {
  const nivel = nivelActual();
  
  // Buscar el ejercicio en la biblioteca para obtener su imagen
  //const ejercicioBiblioteca = exercises.find(e => e.nombre === nombre);
  
  const nuevoEjercicio = {
    nombre,
    hijos: [],
    series: []
  };

    // ✅ Si hay imagen, guardarla
  if (imagenUrl) {
    nuevoEjercicio.imagen = imagenUrl;
  }
  
  // Si el ejercicio tiene imagen en la biblioteca, añadirla
  //if (ejercicioBiblioteca && ejercicioBiblioteca.imagen) {
  //  nuevoEjercicio.imagen = ejercicioBiblioteca.imagen;
  //}
  
  nivel.hijos.push(nuevoEjercicio);
  guardarDatos();
  renderizar();
}

function crearTimerSesionBanda(rutaSesion) {
  const banda = document.createElement('div');
  banda.id = 'sessionTimerBanda';
  banda.style.cssText = `
    background: var(--bg-card);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-shrink: 0;
  `;

  const seg = sessionTimerGetSegundos();
  const m = Math.floor(seg / 60);
  const s = seg % 60;

  const display = document.createElement('div');
  display.id = 'sessionTimerDisplay';
  display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  display.style.cssText = `
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--primary-mint);
    font-family: monospace;
    min-width: 80px;
    text-align: center;
  `;

  const btnPlay = document.createElement('button');
  btnPlay.id = 'btnStartTimerSesion';
  btnPlay.textContent = sessionTimer.corriendo ? '⏸' : '▶';
  btnPlay.style.cssText = `
    width: 36px; height: 36px;
    border: none; border-radius: 50%;
    background: var(--primary-mint);
    color: white; font-size: 1rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;
  btnPlay.onmouseover = () => btnPlay.style.background = 'var(--mint-light)';
  btnPlay.onmouseout = () => btnPlay.style.background = 'var(--primary-mint)';
  btnPlay.onclick = () => {
    if (sessionTimer.corriendo) {
      pausarTimerSesion();
      btnPlay.textContent = '▶';
    } else {
      iniciarTimerSesion(rutaSesion);
      btnPlay.textContent = '⏸';
    }
  };

  const btnReset = document.createElement('button');
  btnReset.textContent = '↻';
  btnReset.style.cssText = `
    width: 32px; height: 32px;
    border: none; border-radius: 50%;
    background: var(--bg-main);
    color: var(--text-secondary); font-size: 0.95rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  `;
  btnReset.onmouseover = () => { btnReset.style.background = 'var(--border-color)'; };
  btnReset.onmouseout = () => { btnReset.style.background = 'var(--bg-main)'; };
  btnReset.onclick = () => {
    resetearTimerSesion();
    renderizar();
  };

  const btnStop = document.createElement('button');
  btnStop.textContent = '⏹';
  btnStop.style.cssText = `
    width: 36px; height: 36px;
    border: none; border-radius: 50%;
    background: #FF6B6B;
    color: white; font-size: 1rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;
  btnStop.onmouseover = () => { btnStop.style.background = '#FF8787'; btnStop.style.transform = 'scale(1.05)'; };
  btnStop.onmouseout = () => { btnStop.style.background = '#FF6B6B'; btnStop.style.transform = 'scale(1)'; };
  btnStop.onclick = () => {
    pausarTimerSesion();
    mostrarModalGuardarTiempo(rutaSesion, sessionTimerGetSegundos());
  };

  banda.appendChild(display);
  banda.appendChild(btnPlay);
  banda.appendChild(btnReset);
  banda.appendChild(btnStop);
  return banda;
}

function ajustarPaddingContenido() {
  const headerEl = document.querySelector('header');
  const subHeaderEl = document.getElementById('subHeader');
  const offsetTop = (headerEl ? headerEl.offsetHeight : 48) +
                    (subHeaderEl ? subHeaderEl.offsetHeight : 60);
  contenido.style.marginTop = '0';
  contenido.style.paddingTop = `${offsetTop + 0}px`;
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
    if (rutaActual.length >= 2 && rutaActual.length <= 4) {
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
          const nuevoItem = rutaActual.length === 4 
            ? { nombre:"", hijos:[], series:[], editando:true, placeholder:nombreDefault }
            : { nombre:"", hijos:[], editando:true, placeholder:nombreDefault };
          nivel.hijos.push(nuevoItem);
          guardarDatos(); renderizar();
        }, "Pegar", "Crear nuevo");
      } else {
        const nombreDefault = "Nuevo " + tituloNivel.textContent;
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
      searchBtn.onclick = () => window.abrirBuscadorEjercicios();
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
  // Pantalla nutrición
if (rutaActual.length === 1 && rutaActual[0] === 3) {
  if (!datos[3]) {
    datos[3] = { nombre: 'Nutrición', hijos: [] };
  }
  renderizarNutricion(datos[3], contenido, subHeader, addButton, rutaActual);
  return;
}

  // Resetear padding antes de cualquier nivel
  contenido.style.padding = '';
  contenido.style.marginTop = '0';
  ajustarPaddingContenido();

  // NIVEL 4 UNIFICADO (ejercicios con series desplegables)
  if (rutaActual.length === 4) {
    backButton.style.visibility = 'visible';
    addButton.style.visibility = 'visible';
    tituloNivel.textContent = nivel.nombre;

    // Calcular la ruta de la sesión padre (primeros 3 índices)
    const rutaSesionPadre = rutaActual.slice(0, 4);

    // Restaurar timer si estaba corriendo en background
    if (!sessionTimer.corriendo && sessionTimerGetRuta() &&
        JSON.stringify(sessionTimerGetRuta()) === JSON.stringify(rutaSesionPadre)) {
      restaurarTimerSesion();
    }

    // Wrapper con layout fijo (banda timer no scrolleable + ejercicios scrolleables)
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      z-index: 1;
    `;

    // Calcular offset del header + subheader
    const headerEl = document.querySelector('header');
    const subHeaderEl = document.getElementById('subHeader');
    const offsetTop = (headerEl ? headerEl.offsetHeight : 48) +
                      (subHeaderEl ? subHeaderEl.offsetHeight : 60);
    wrapper.style.paddingTop = `${offsetTop}px`;

    // Banda del timer (fija, no scrolleable)
    const banda = crearTimerSesionBanda(rutaSesionPadre);
    wrapper.appendChild(banda);

    // Zona scrolleable de ejercicios
    const zonaScroll = document.createElement('div');
    zonaScroll.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      padding-bottom: 80px;
      background: var(--bg-main);
    `;

    if (nivel.hijos && nivel.hijos.length) {
      nivel.hijos.forEach((ejercicio, index) => {
        const ejercicioWrapper = crearEjercicioAcordeon(ejercicio, index, nivel);
        zonaScroll.appendChild(ejercicioWrapper);
      });
    }

    wrapper.appendChild(zonaScroll);
    contenido.style.padding = '0';
    contenido.appendChild(wrapper);
    return;
  }

  // Otros niveles (lista de hijos)
  backButton.style.visibility = 'visible';
  addButton.style.visibility  = 'visible';
  const nombres = ['Mesociclos','Microciclos','Sesiones','Ejercicios'];
  tituloNivel.textContent = nombres[rutaActual.length - 1] || nivel.nombre;

  // Ajustar padding para que el contenido quede bajo el subheader fijo
  ajustarPaddingContenido();

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
  wrapper.dataset.index = index;
  wrapper.dataset.nivel = rutaActual.length;

  // ── Drag & drop (igual que antes) ──
  wrapper.addEventListener('mousedown', startDragEjercicio, { passive: false, capture: true });
  wrapper.addEventListener('touchstart', startDragEjercicio, { passive: false, capture: true });

  // ════════════════════════
  //  HEADER
  // ════════════════════════
  const header = document.createElement('div');
  header.className = 'ejercicio-header' + (ejercicioExpandido === index ? ' expanded' : '');

  if (ejercicio.editando) {
    // ── Modo edición ──
    header.style.padding = '12px';
    header.style.gap = '8px';

    const input = document.createElement('input');
    input.value = ejercicio.nombre || '';
    input.placeholder = ejercicio.placeholder || 'Nombre del ejercicio';
    input.style.cssText = 'flex:1;border:none;background:transparent;font-size:1rem;font-weight:600;outline:none;min-width:0;';
    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));
    ['pointerdown','mousedown','touchstart','click'].forEach(ev => input.addEventListener(ev, e => e.stopPropagation()));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { ejercicio.nombre = input.value || 'Sin nombre'; ejercicio.editando = false; guardarDatos(); renderizar(); }
    });
    input.addEventListener('blur', () => {
      ejercicio.nombre = input.value || 'Sin nombre'; ejercicio.editando = false; guardarDatos(); renderizar();
    });
    header.appendChild(input);

  } else {
    // ── Modo normal ──

    // Icono expand
    const iconoExpand = document.createElement('span');
    iconoExpand.className = 'ej-expand-icon';
    iconoExpand.textContent = ejercicioExpandido === index ? '▼' : '▶';
    header.appendChild(iconoExpand);

    // Imagen / emoji
    const imgBox = document.createElement('div');
    imgBox.className = 'ej-icon-box';

    if (ejercicio.imagen && ejercicio.imagen.trim()) {
      const placeholder = document.createElement('span');
      placeholder.textContent = '⏳';
      imgBox.appendChild(placeholder);
      const img = document.createElement('img');
      img.alt = ejercicio.nombre;
      img.onload = () => { imgBox.innerHTML = ''; imgBox.appendChild(img); };
      img.onerror = () => { placeholder.textContent = '🏋️'; };
      img.src = ejercicio.imagen;
    } else {
      const emoji = document.createElement('span');
      emoji.textContent = '🏋️';
      imgBox.appendChild(emoji);
    }
    header.appendChild(imgBox);

    // Info (nombre + tags)
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
      const tagS = document.createElement('span');
      tagS.className = 'li-tag green';
      tagS.textContent = `${nSeries} serie${nSeries !== 1 ? 's' : ''}`;
      meta.appendChild(tagS);
    }
    const nDone = (ejercicio.series || []).filter(s => s.completada).length;
    if (nDone > 0) {
      const tagD = document.createElement('span');
      tagD.className = 'li-tag cyan';
      tagD.textContent = `${nDone} ✓`;
      meta.appendChild(tagD);
    }
    infoBlock.appendChild(meta);
    header.appendChild(infoBlock);

    // Acciones (botón opciones)
    const opcionesBtn = document.createElement('button');
    opcionesBtn.className = 'btn-opciones';
    opcionesBtn.appendChild(document.createElement('span')); // punto central (::before y ::after hacen los otros)
    opcionesBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.menu-opciones').forEach(m => m.remove());
      mostrarMenuOpciones({
        anchorElement: opcionesBtn,
        onEditar:  () => { ejercicio.editando = true; guardarDatos(); renderizar(); },
        onEliminar: () => {
          mostrarConfirmacion(`¿Desea borrar "${ejercicio.nombre}"?`, () => {
            nivel.hijos.splice(index, 1);
            ejercicioExpandido = null;
            guardarDatos(); renderizar();
          });
        },
        onCopiar: () => ({ nivel: rutaActual.length, datos: structuredClone(ejercicio) })
      });
    });
    header.appendChild(opcionesBtn);

    // Toggle expand
    header.addEventListener('click', e => {
      if (draggingEjercicio) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.target === opcionesBtn || opcionesBtn.contains(e.target)) return;
      ejercicioExpandido = ejercicioExpandido === index ? null : index;
      renderizar();
    });
  }

  wrapper.appendChild(header);

  // ════════════════════════
  //  BODY EXPANDIDO
  // ════════════════════════
  if (ejercicioExpandido === index && !ejercicio.editando) {
    const body = document.createElement('div');
    body.className = 'ejercicio-body';
    const inner = document.createElement('div');
    inner.className = 'ejercicio-body-inner';

    // ── Botón + Serie ──
    const addSerieBtn = document.createElement('button');
    addSerieBtn.textContent = '+ Serie';
    addSerieBtn.className = 'btn-add-serie-compact';
    addSerieBtn.onclick = e => {
      e.stopPropagation();
      if (!ejercicio.series) ejercicio.series = [];
      ejercicio.series.push({});
      guardarDatos(); renderizar();
    };
    inner.appendChild(addSerieBtn);

    // ── Cabeceras grid ──
    const encabezados = document.createElement('div');
    encabezados.className = 'series-header-compact';
    ['', 'REPS', 'PESO', 'RIR', 'DESC', '', ''].forEach(txt => {
      const c = document.createElement('div'); c.textContent = txt; encabezados.appendChild(c);
    });
    inner.appendChild(encabezados);

    // ── Filas de series ──
    ejercicio.series = ejercicio.series || [];
    ejercicio.series.forEach((serie, idx) => {
      const serieDiv = document.createElement('div');
      serieDiv.className = 'serie-row-compact';
      if (serie.completada) serieDiv.style.background = 'rgba(61,213,152,0.08)';

      // Número / marca
      const numBtn = document.createElement('button');
      numBtn.className = 'serie-num';
      numBtn.textContent = serie.marca || (idx + 1);
      numBtn.addEventListener('click', e => {
        e.stopPropagation();
        mostrarSelectorMarca(serie, idx, () => { guardarDatos(); renderizar(); });
      });

      // Inputs
      const mkInput = (placeholder, value, key) => {
        const inp = document.createElement('input');
        inp.placeholder = placeholder;
        inp.value = value || '';
        inp.addEventListener('click', e => e.stopPropagation());
        inp.addEventListener('blur', e => { serie[key] = e.target.value; guardarDatos(); });
        return inp;
      };
      const reps     = mkInput('R', serie.reps,     'reps');
      const peso     = mkInput('P', serie.peso,     'peso');
      const rir      = mkInput('R', serie.rir,      'rir');
      const descanso = mkInput('D', serie.descanso, 'descanso');

      // Check
      const checkBtn = document.createElement('button');
      checkBtn.className = 'serie-button';
      checkBtn.textContent = serie.completada ? '✔️' : '🕔';
      checkBtn.addEventListener('click', e => {
        e.stopPropagation();
        serie.completada = !serie.completada;
        if (serie.completada && serie.descanso) iniciarTimer(serie.descanso);
        guardarDatos(); renderizar();
      });

      // Eliminar serie
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'serie-button btn-del-serie';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'Eliminar serie';
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        mostrarConfirmacion('¿Desea borrar esta serie?', () => {
          ejercicio.series.splice(idx, 1);
          guardarDatos(); renderizar();
        });
      });

      [numBtn, reps, peso, rir, descanso, checkBtn, deleteBtn].forEach(el => serieDiv.appendChild(el));
      inner.appendChild(serieDiv);
    });

    // ── Stats sesión actual ──
    const statsActual = calcularEstadisticasEjercicio(ejercicio);
    if (statsActual.pesoMax > 0 || statsActual.volumenTotal > 0) {
      const sc = document.createElement('div');
      sc.className = 'ej-stats-card';
      sc.innerHTML = `
        <div class="ej-card-label">📊 Estadísticas de esta sesión</div>
        <div class="ej-stats-grid">
          <div class="ej-stat-cell">
            <div class="ej-stat-val" style="color:var(--primary-mint)">${statsActual.pesoMax}<span>kg</span></div>
            <div class="ej-stat-lbl">Peso máx</div>
          </div>
          <div class="ej-stat-cell">
            <div class="ej-stat-val" style="color:var(--secondary-cyan)">${statsActual.volumenTotal}<span>kg</span></div>
            <div class="ej-stat-lbl">Volumen</div>
          </div>
          <div class="ej-stat-cell">
            <div class="ej-stat-val" style="color:var(--primary-coral)">${statsActual.oneRM}<span>kg</span></div>
            <div class="ej-stat-lbl">1RM est.</div>
          </div>
        </div>
      `;
      inner.appendChild(sc);
    }

    // ── Comparación sesión anterior ──
    const sesionAnterior = buscarSesionAnteriorEjercicio(ejercicio.nombre);
    if (sesionAnterior) {
      const statsAnterior = calcularEstadisticasEjercicio(sesionAnterior.ejercicio);
      const fechaStr = new Date(sesionAnterior.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });

      const progBadge = (actual, prev) => {
        if (!prev || prev === 0) return '';
        const pct = ((actual - prev) / prev * 100).toFixed(1);
        const cl = pct > 0 ? 'up' : pct < 0 ? 'down' : 'eq';
        const icon = pct > 0 ? '▲' : pct < 0 ? '▼' : '=';
        return `<span class="ej-prog-badge ${cl}">${icon} ${Math.abs(pct)}%</span>`;
      };

      const pc = document.createElement('div');
      pc.className = 'ej-prev-card';

      const progresoPesoMax  = ((statsActual.pesoMax - statsAnterior.pesoMax) / (statsAnterior.pesoMax || 1) * 100).toFixed(1);
      const progresoVolumen  = ((statsActual.volumenTotal - statsAnterior.volumenTotal) / (statsAnterior.volumenTotal || 1) * 100).toFixed(1);
      const progreso1RM      = ((statsActual.oneRM - statsAnterior.oneRM) / (statsAnterior.oneRM || 1) * 100).toFixed(1);

      pc.innerHTML = `
        <div class="ej-prev-header">
          <div class="ej-card-label" style="margin-bottom:0">📈 Última sesión</div>
          <div class="ej-prev-date">${fechaStr}</div>
        </div>
        <div class="ej-stats-grid">
          <div class="ej-stat-cell">
            <div class="ej-stat-val" style="color:var(--primary-mint)">
              ${statsAnterior.pesoMax}<span>kg</span>
              ${progBadge(statsActual.pesoMax, statsAnterior.pesoMax)}
            </div>
            <div class="ej-stat-lbl">Peso máx</div>
          </div>
          <div class="ej-stat-cell">
            <div class="ej-stat-val" style="color:var(--secondary-cyan)">
              ${statsAnterior.volumenTotal}<span>kg</span>
              ${progBadge(statsActual.volumenTotal, statsAnterior.volumenTotal)}
            </div>
            <div class="ej-stat-lbl">Volumen</div>
          </div>
          <div class="ej-stat-cell">
            <div class="ej-stat-val" style="color:var(--primary-coral)">
              ${statsAnterior.oneRM}<span>kg</span>
              ${progBadge(statsActual.oneRM, statsAnterior.oneRM)}
            </div>
            <div class="ej-stat-lbl">1RM est.</div>
          </div>
        </div>
      `;
      inner.appendChild(pc);
    }

    // ── Notas ──
    const nc = document.createElement('div');
    nc.className = 'ej-notas-card';
    const nl = document.createElement('div');
    nl.className = 'ej-card-label';
    nl.textContent = '📝 Notas';
    const ta = document.createElement('textarea');
    ta.className = 'ej-notas-textarea';
    ta.value = ejercicio.notas || '';
    ta.placeholder = 'Añade notas sobre el ejercicio...';
    ta.addEventListener('click', e => e.stopPropagation());
    ta.addEventListener('focus', () => { ta.style.borderColor = 'var(--primary-mint)'; ta.style.background = 'white'; });
    ta.addEventListener('blur', () => {
      ta.style.borderColor = 'var(--border-color)'; ta.style.background = 'var(--bg-main)';
      ejercicio.notas = ta.value; guardarDatos();
    });
    nc.appendChild(nl);
    nc.appendChild(ta);
    inner.appendChild(nc);

    body.appendChild(inner);
    wrapper.appendChild(body);
  }

  return wrapper;
}

// ==================== DRAG & DROP PARA EJERCICIOS ====================
let dragEjercicio = null;
let dragEjercicioStartX = 0;
let dragEjercicioStartY = 0;
let draggingEjercicio = false;
let dragEjercicioStartIndex = null;
let dragEjercicioTimer = null;
let hasMovedEjercicio = false;

function startDragEjercicio(e) {
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
const MOVEMENT_THRESHOLD = 10;
const LONG_PRESS_DURATION = 500;

function startDrag(e) {
  if (e.type === "mousedown" && e.button !== 0) return;
  
  dragItem = e.currentTarget.closest(".list-item");
  if (!dragItem) return;

  dragging = false;
  hasMoved = false;
  dragStartIndex = [...contenido.children].indexOf(dragItem);

  const touch = e.touches ? e.touches[0] : e;
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;

  const checkMovement = (moveEvent) => {
    const moveTouch = moveEvent.touches ? moveEvent.touches[0] : moveEvent;
    const deltaX = Math.abs(moveTouch.clientX - dragStartX);
    const deltaY = Math.abs(moveTouch.clientY - dragStartY);
    
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

  document.addEventListener('mousemove', checkMovement, { passive: true });
  document.addEventListener('touchmove', checkMovement, { passive: true });

  dragTimer = setTimeout(() => {
    cleanup();
    
    if (!hasMoved) {
      dragging = true;
      dragItem.classList.add("dragging");
      
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      dragItem.style.opacity = '0.7';
      dragItem.style.transform = 'scale(1.02)';
    }
  }, LONG_PRESS_DURATION);
}

function dragMove(e) {
  if (!dragging || !dragItem) return;
  
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

  if (targetItem) {
    contenido.insertBefore(dragItem, targetItem);
  } else if (items.length > 0) {
    contenido.appendChild(dragItem);
  }
}

function dragEnd() {
  clearTimeout(dragTimer);
  dragTimer = null;
  
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';

  if (!dragging || !dragItem) {
    dragItem = null;
    dragStartIndex = null;
    hasMoved = false;
    return;
  }

  dragItem.style.opacity = '';
  dragItem.style.transform = '';
  
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
  hasMoved = false;
}

// ============================================================
//  crearIndice — Rediseño profesional niveles 1-4
//  Reemplaza la función crearIndice completa en script.js
// ============================================================

function crearIndice(item, index, nivel) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.dataset.index = index;
  div.dataset.nivel = rutaActual.length;

  div.addEventListener('click', (e) => {
    if (dragging) { e.preventDefault(); e.stopPropagation(); return; }
    const target = e.target;
    if (target.tagName === 'BUTTON' || target.type === 'date' || target.closest('.btn-opciones')) {
      e.stopPropagation(); return;
    }
    e.stopPropagation();
    navigatePush(index);
  });

  div.addEventListener('mousedown', startDrag, { passive: false, capture: true });
  div.addEventListener('touchstart', startDrag, { passive: false, capture: true });

  if (!item.editando) item.editando = false;

  // ── Helpers ──────────────────────────────────────────────
  const tieneEjercicios = (it) =>
    it.hijos?.length > 0 && it.hijos.some(h => h.series);

  const contarHijos = (it) => it.hijos?.length || 0;

  // Emojis por nivel: 1=🗂️, 2=🗂️, 3=📅 siempre, 4=🏋️ (o imagen)
  const NIVEL_EMOJIS = ['', '🗂️', '🗂️', '📅', '🏋️'];

  // ── Zona icono ────────────────────────────────────────────
  const liIcon = document.createElement('div');
  liIcon.className = 'li-icon';

  // Si el item tiene imagen (solo posible en nivel 4 / ejercicios)
  if (item.imagen && item.imagen.trim()) {
    const emojiPlaceholder = document.createElement('span');
    emojiPlaceholder.className = 'li-emoji';
    emojiPlaceholder.textContent = '⏳';
    liIcon.appendChild(emojiPlaceholder);

    const img = document.createElement('img');
    img.alt = item.nombre || '';
    img.onload = () => { liIcon.innerHTML = ''; liIcon.appendChild(img); };
    img.onerror = () => { emojiPlaceholder.textContent = NIVEL_EMOJIS[rutaActual.length] || '🏋️'; };
    img.src = item.imagen;
  } else {
    const emoji = document.createElement('span');
    emoji.className = 'li-emoji';
    emoji.textContent = NIVEL_EMOJIS[rutaActual.length] || '📁';
    liIcon.appendChild(emoji);
  }

  div.appendChild(liIcon);

  // ── Zona cuerpo ───────────────────────────────────────────
  const liBody = document.createElement('div');
  liBody.className = 'li-body';

  // Nombre (editable o lectura)
  if (item.editando) {
    const input = document.createElement('input');
    input.className = 'li-name-input';
    input.value = item.nombre || '';
    input.placeholder = item.placeholder || 'Sin nombre';

    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));

    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt =>
      input.addEventListener(evt, e => e.stopPropagation())
    );

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        item.nombre = input.value.trim() || 'Sin nombre';
        item.editando = false;
        guardarDatos(); renderizar();
      }
    });
    input.addEventListener('blur', () => {
      item.nombre = input.value.trim() || 'Sin nombre';
      item.editando = false;
      guardarDatos(); renderizar();
    });

    liBody.appendChild(input);
  } else {
    const nameDiv = document.createElement('div');
    nameDiv.className = 'li-name';
    nameDiv.textContent = item.nombre || 'Sin nombre';
    liBody.appendChild(nameDiv);
  }

  // Meta-tags
  const liMeta = document.createElement('div');
  liMeta.className = 'li-meta';

  // Nivel 1 y 2: mostrar número de hijos
  if (rutaActual.length <= 2 && contarHijos(item) > 0) {
    const tagHijos = document.createElement('span');
    tagHijos.className = 'li-tag';
    const nextLabel = rutaActual.length === 1 ? 'Micro' : 'Sesión';
    const n = contarHijos(item);
    tagHijos.textContent = `${n} ${nextLabel}${n !== 1 ? 's' : ''}`;
    liMeta.appendChild(tagHijos);
  }

  // Nivel 3: mostrar número de ejercicios contando en profundidad
  if (rutaActual.length === 3) {
    const numEjercicios = (item.hijos || []).reduce((acc, bloque) =>
      acc + (bloque.hijos?.length || 0), 0);
    if (numEjercicios > 0) {
      const tagEj = document.createElement('span');
      tagEj.className = 'li-tag green';
      tagEj.textContent = `${numEjercicios} ejercicio${numEjercicios !== 1 ? 's' : ''}`;
      liMeta.appendChild(tagEj);
    }
  }

  // Fecha (solo nivel 3 = sesiones)
  if (rutaActual.length === 3) {
    const fechaInput = document.createElement('input');
    fechaInput.type = 'date';
    fechaInput.className = 'li-date';
    fechaInput.value = nivel.hijos[index].fecha || '';
    fechaInput.title = 'Fecha de la sesión';

    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt =>
      fechaInput.addEventListener(evt, e => e.stopPropagation())
    );

    fechaInput.addEventListener('change', async e => {
      const raw = e.target.value;
      nivel.hijos[index].fecha = raw;
      nivel.hijos[index]._fecha = raw;
      guardarDatos();
      const user = auth.currentUser;
      if (user) {
        try { await guardarDatosUsuario(user.uid, datos); } catch (err) { console.error(err); }
      }
    });

    liMeta.appendChild(fechaInput);
console.log('[badge duracion] item.nombre:', item.nombre, 'duracionMinutos:', item.duracionMinutos);
    // Badge duración de sesión
    const durLabel = document.createElement('span');
    durLabel.className = 'li-tag';
    durLabel.style.cssText = `
      color: var(--primary-mint);
      background: rgba(61,213,152,0.1);
      border: 1px solid rgba(61,213,152,0.25);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
      flex-shrink: 0;
    `;
    const duracion = item.duracionMinutos;
    durLabel.textContent = duracion && duracion > 0 
      ? `⏱ ${formatearDuracion(duracion)}` 
      : '⏱ --';
    liMeta.appendChild(durLabel); 
  }

  if (liMeta.children.length > 0) liBody.appendChild(liMeta);

  div.appendChild(liBody);

  // ── Zona acciones ─────────────────────────────────────────
  const liActions = document.createElement('div');
  liActions.className = 'li-actions';

  // Flecha indicadora de navegación
  const arrow = document.createElement('span');
  arrow.className = 'li-arrow';
  arrow.textContent = '›';
  liActions.appendChild(arrow);

  // Botón de opciones (tres puntos)
  const btnOpc = document.createElement('button');
  btnOpc.className = 'btn-opciones';
  btnOpc.title = 'Opciones';
  btnOpc.innerHTML = '<span></span>';  // el ::before y ::after hacen los otros dos puntos

  btnOpc.addEventListener('click', (e) => {
    e.stopPropagation();

    // Cerrar cualquier menú abierto
    document.querySelectorAll('.menu-opciones').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'menu-opciones';
    menu.style.cssText = `
      position: fixed;
      z-index: 999;
    `;

    const rect = btnOpc.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${document.body.clientWidth - rect.right}px`;

    const opciones = [
      { label: '✏️  Renombrar', action: () => { item.editando = true; guardarDatos(); renderizar(); } },
      { label: '📋  Copiar',    action: () => { window.itemCopiado = { nivel: rutaActual.length, datos: structuredClone(item) }; menu.remove(); } },
      { label: '🗑️  Eliminar',  action: () => {
        mostrarConfirmacion('¿Eliminar este elemento?', () => {
          nivel.hijos.splice(index, 1);
          guardarDatos(); renderizar();
        });
      }},
    ];

    opciones.forEach(({ label, action }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); menu.remove(); action(); });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    // Cerrar al hacer click fuera
    const cerrar = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== btnOpc) {
        menu.remove();
        document.removeEventListener('click', cerrar);
      }
    };
    setTimeout(() => document.addEventListener('click', cerrar), 0);
  });

  liActions.appendChild(btnOpc);
  div.appendChild(liActions);

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
      window.datos = datos;
      
      console.log('✅ Datos restaurados correctamente');
      alert('✅ Datos restaurados correctamente');
      renderizar();
      
    } catch (error) {
      console.error('❌ Error al restaurar:', error);
      alert('Error al restaurar: ' + error.message);
    }
  };

    // ==================== REGISTRO SERVICE WORKER (PWA) ====================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[PWA] Service Worker registrado:', reg.scope))
        .catch(err => console.error('[PWA] Error al registrar SW:', err));
    });
  }
  console.log('💾 Función restaurarDesdeJSON() disponible. Uso: restaurarDesdeJSON(\'tu json aquí\')');

  document.addEventListener("mousemove", dragMove);
  document.addEventListener("touchmove", dragMove, { passive: false });
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("touchend", dragEnd);
  document.addEventListener("touchcancel", dragEnd);
  
  document.addEventListener("mousemove", dragMoveEjercicio);
  document.addEventListener("touchmove", dragMoveEjercicio, { passive: false });
  document.addEventListener("mouseup", dragEndEjercicio);
  document.addEventListener("touchend", dragEndEjercicio);
  document.addEventListener("touchcancel", dragEndEjercicio);
}
