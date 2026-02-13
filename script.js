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

    // Nombre del ejercicio
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

    // Botón añadir serie
    const addSerieBtn = document.createElement('button');
    addSerieBtn.textContent = '+ Serie';
    addSerieBtn.className = 'btn-add-serie-compact';
    addSerieBtn.onclick = (e) => {
      e.stopPropagation();
      if (!ejercicio.series) ejercicio.series = [];
      ejercicio.series.push({});
      guardarDatos();
      renderizar();
    };
    contenidoExpandible.appendChild(addSerieBtn);

    // Encabezados de series
    const encabezados = document.createElement('div');
    encabezados.className = 'series-header-compact';
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

      // Botón número de serie
      const numBtn = document.createElement('button');
      numBtn.className = "serie-num";
      numBtn.textContent = serie.marca || (idx + 1);
      numBtn.addEventListener('click', e => {
        e.stopPropagation();
        mostrarSelectorMarca(serie, idx, () => { guardarDatos(); renderizar(); });
      });

      // Inputs
      const createInput = (placeholder, value, key) => {
        const input = document.createElement('input');
        input.placeholder = placeholder;
        input.value = value || '';
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
      const checkBtn = document.createElement('serie-button');
      if (serie.completada) {
        checkBtn.textContent = '✔️';
        serieDiv.style.background = 'rgba(61, 213, 152, 0.25)';
      } else {
        checkBtn.textContent = '🕔';
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
      const deleteBtn = document.createElement('serie-button');
      deleteBtn.textContent = '❌';
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

    // ==================== ESTADÍSTICAS DEL EJERCICIO ACTUAL ====================
    const statsActual = calcularEstadisticasEjercicio(ejercicio);
    if (statsActual.pesoMax > 0 || statsActual.volumenTotal > 0) {
      const statsContainer = document.createElement('div');
      statsContainer.style.marginTop = '16px';
      statsContainer.style.padding = '12px';
      statsContainer.style.background = 'linear-gradient(135deg, rgba(61, 213, 152, 0.1) 0%, rgba(0, 212, 212, 0.1) 100%)';
      statsContainer.style.borderRadius = '10px';
      statsContainer.style.border = '1px solid var(--border-color)';

      const statsTitulo = document.createElement('div');
      statsTitulo.textContent = '📊 Estadísticas de esta sesión';
      statsTitulo.style.fontSize = '0.8rem';
      statsTitulo.style.fontWeight = '700';
      statsTitulo.style.color = 'var(--text-secondary)';
      statsTitulo.style.marginBottom = '10px';
      statsTitulo.style.textTransform = 'uppercase';
      statsTitulo.style.letterSpacing = '0.5px';
      statsContainer.appendChild(statsTitulo);

      const statsGrid = document.createElement('div');
      statsGrid.style.display = 'grid';
      statsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      statsGrid.style.gap = '8px';

      // Peso máximo
      const statPesoMax = document.createElement('div');
      statPesoMax.style.textAlign = 'center';
      statPesoMax.style.padding = '8px';
      statPesoMax.style.background = 'var(--bg-card)';
      statPesoMax.style.borderRadius = '8px';
      statPesoMax.innerHTML = `
        <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-mint);">${statsActual.pesoMax}<span style="font-size: 0.8rem; font-weight: 500;">kg</span></div>
        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">PESO MÁX</div>
      `;
      statsGrid.appendChild(statPesoMax);

      // Volumen total
      const statVolumen = document.createElement('div');
      statVolumen.style.textAlign = 'center';
      statVolumen.style.padding = '8px';
      statVolumen.style.background = 'var(--bg-card)';
      statVolumen.style.borderRadius = '8px';
      statVolumen.innerHTML = `
        <div style="font-size: 1.3rem; font-weight: 700; color: var(--secondary-cyan);">${statsActual.volumenTotal}<span style="font-size: 0.8rem; font-weight: 500;">kg</span></div>
        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">VOLUMEN</div>
      `;
      statsGrid.appendChild(statVolumen);

      // 1RM estimado
      const stat1RM = document.createElement('div');
      stat1RM.style.textAlign = 'center';
      stat1RM.style.padding = '8px';
      stat1RM.style.background = 'var(--bg-card)';
      stat1RM.style.borderRadius = '8px';
      stat1RM.innerHTML = `
        <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-coral);">${statsActual.oneRM}<span style="font-size: 0.8rem; font-weight: 500;">kg</span></div>
        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">1RM EST.</div>
      `;
      statsGrid.appendChild(stat1RM);

      statsContainer.appendChild(statsGrid);
      contenidoExpandible.appendChild(statsContainer);
    }

    // ==================== COMPARACIÓN CON SESIÓN ANTERIOR ====================
    const sesionAnterior = buscarSesionAnteriorEjercicio(ejercicio.nombre);
    if (sesionAnterior) {
      const statsAnterior = calcularEstadisticasEjercicio(sesionAnterior.ejercicio);
      
      const comparacionContainer = document.createElement('div');
      comparacionContainer.style.marginTop = '12px';
      comparacionContainer.style.padding = '12px';
      comparacionContainer.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)';
      comparacionContainer.style.borderRadius = '10px';
      comparacionContainer.style.border = '1px solid var(--border-color)';

      const comparacionTitulo = document.createElement('div');
      comparacionTitulo.style.fontSize = '0.8rem';
      comparacionTitulo.style.fontWeight = '700';
      comparacionTitulo.style.color = 'var(--text-secondary)';
      comparacionTitulo.style.marginBottom = '8px';
      comparacionTitulo.style.textTransform = 'uppercase';
      comparacionTitulo.style.letterSpacing = '0.5px';
      comparacionTitulo.style.display = 'flex';
      comparacionTitulo.style.justifyContent = 'space-between';
      comparacionTitulo.style.alignItems = 'center';
      
      const tituloTexto = document.createElement('span');
      tituloTexto.textContent = '📈 Última vez';
      
      const fechaTexto = document.createElement('span');
      fechaTexto.textContent = new Date(sesionAnterior.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      fechaTexto.style.fontSize = '0.75rem';
      fechaTexto.style.fontWeight = '600';
      fechaTexto.style.color = 'var(--text-light)';
      
      comparacionTitulo.appendChild(tituloTexto);
      comparacionTitulo.appendChild(fechaTexto);
      comparacionContainer.appendChild(comparacionTitulo);

      const comparacionGrid = document.createElement('div');
      comparacionGrid.style.display = 'grid';
      comparacionGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      comparacionGrid.style.gap = '8px';

      // Calcular progresos
      const progresoPesoMax = statsActual.pesoMax > 0 && statsAnterior.pesoMax > 0
        ? ((statsActual.pesoMax - statsAnterior.pesoMax) / statsAnterior.pesoMax * 100)
        : 0;
      
      const progresoVolumen = statsActual.volumenTotal > 0 && statsAnterior.volumenTotal > 0
        ? ((statsActual.volumenTotal - statsAnterior.volumenTotal) / statsAnterior.volumenTotal * 100)
        : 0;

      const progreso1RM = statsActual.oneRM > 0 && statsAnterior.oneRM > 0
        ? ((statsActual.oneRM - statsAnterior.oneRM) / statsAnterior.oneRM * 100)
        : 0;

      // Función helper para crear stat con progreso
      const crearStatProgreso = (valor, progresoPercent, label) => {
        const div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.padding = '8px';
        div.style.background = 'var(--bg-card)';
        div.style.borderRadius = '8px';
        
        let colorProgreso = 'var(--text-secondary)';
        let iconoProgreso = '━';
        if (progresoPercent > 0) {
          colorProgreso = 'var(--success)';
          iconoProgreso = '↗';
        } else if (progresoPercent < 0) {
          colorProgreso = 'var(--danger)';
          iconoProgreso = '↘';
        }
        
        div.innerHTML = `
          <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${valor}<span style="font-size: 0.7rem; font-weight: 500;">kg</span></div>
          <div style="font-size: 0.7rem; color: ${colorProgreso}; font-weight: 700; margin-top: 2px;">
            ${iconoProgreso} ${Math.abs(progresoPercent).toFixed(1)}%
          </div>
          <div style="font-size: 0.6rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">${label}</div>
        `;
        return div;
      };

      comparacionGrid.appendChild(crearStatProgreso(statsAnterior.pesoMax, progresoPesoMax, 'PESO MÁX'));
      comparacionGrid.appendChild(crearStatProgreso(statsAnterior.volumenTotal, progresoVolumen, 'VOLUMEN'));
      comparacionGrid.appendChild(crearStatProgreso(statsAnterior.oneRM, progreso1RM, '1RM EST.'));

      comparacionContainer.appendChild(comparacionGrid);
      contenidoExpandible.appendChild(comparacionContainer);
    }

    // ==================== NOTAS DEL EJERCICIO ====================
    const notasContainer = document.createElement('div');
    notasContainer.style.marginTop = '12px';
    notasContainer.style.padding = '8px';
    notasContainer.style.background = 'var(--bg-card)';
    notasContainer.style.borderRadius = '8px';
    notasContainer.style.border = '1px solid var(--border-color)';

    const notasLabel = document.createElement('div');
    notasLabel.textContent = '📝 Notas';
    notasLabel.style.fontSize = '0.7rem';
    notasLabel.style.fontWeight = '700';
    notasLabel.style.color = 'var(--text-secondary)';
    notasLabel.style.marginBottom = '4px';
    notasLabel.style.textTransform = 'uppercase';
    notasLabel.style.letterSpacing = '0.5px';
    notasContainer.appendChild(notasLabel);

    const notasTextarea = document.createElement('textarea');
    notasTextarea.value = ejercicio.notas || '';
    notasTextarea.placeholder = 'Añade notas sobre el ejercicio...';
    notasTextarea.style.width = '100%';
    notasTextarea.style.minHeight = '36px';
    notasTextarea.style.maxHeight = '54px';
    notasTextarea.style.padding = '6px 8px';
    notasTextarea.style.border = '1px solid var(--border-color)';
    notasTextarea.style.borderRadius = '6px';
    notasTextarea.style.fontSize = '0.85rem';
    notasTextarea.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    notasTextarea.style.resize = 'vertical';
    notasTextarea.style.background = 'var(--bg-main)';
    notasTextarea.style.color = 'var(--text-primary)';
    notasTextarea.style.transition = 'all 0.2s ease';
    
    notasTextarea.addEventListener('focus', () => {
      notasTextarea.style.borderColor = 'var(--primary-mint)';
      notasTextarea.style.background = 'white';
    });
    
    notasTextarea.addEventListener('blur', () => {
      notasTextarea.style.borderColor = 'var(--border-color)';
      notasTextarea.style.background = 'var(--bg-main)';
      ejercicio.notas = notasTextarea.value;
      guardarDatos();
    });
    
    notasContainer.appendChild(notasTextarea);
    contenidoExpandible.appendChild(notasContainer);

    wrapper.appendChild(contenidoExpandible);
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

function crearIndice(item, index, nivel) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.dataset.index = index;
  div.dataset.nivel = rutaActual.length;
  
  div.addEventListener('click', (e) => {
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

  if (!item.editando) item.editando = false;

  // Contenedor para icono + input
  const contentContainer = document.createElement('div');
  contentContainer.style.display = 'flex';
  contentContainer.style.alignItems = 'center';
  contentContainer.style.gap = '8px';
  contentContainer.style.flex = '1';

  // Función para detectar si un item tiene ejercicios en el siguiente nivel
  const tieneEjercicios = (item) => {
    if (!item.hijos || item.hijos.length === 0) return false;
    // Buscar solo en el siguiente nivel si hay ejercicios
    return item.hijos.some(hijo => hijo.series);
  };

  // Icono para diferenciar carpeta vs sesión (nivel 1-3)
  if (rutaActual.length >= 1 && rutaActual.length <= 3) {
    const iconoContainer = document.createElement('div');
    iconoContainer.style.width = '32px';
    iconoContainer.style.height = '32px';
    iconoContainer.style.borderRadius = '6px';
    iconoContainer.style.display = 'flex';
    iconoContainer.style.alignItems = 'center';
    iconoContainer.style.justifyContent = 'center';
    iconoContainer.style.flexShrink = '0';
    iconoContainer.style.background = 'var(--bg-main)';
    iconoContainer.style.fontSize = '1.2rem';
    
    // Mostrar sesión (💪) si tiene ejercicios, carpeta (📁) si no
    if (tieneEjercicios(item)) {
      iconoContainer.textContent = '💪';
    } else {
      iconoContainer.textContent = '📁';
    }
    
    contentContainer.appendChild(iconoContainer);
  }

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

    contentContainer.appendChild(input);
    div.appendChild(contentContainer);

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
  } else {
    const input = document.createElement('input');
    input.value = item.nombre;
    input.readOnly = true;
    input.style.flex = '1';
    input.style.cursor = 'pointer';

    contentContainer.appendChild(input);
    div.appendChild(contentContainer);

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
      window.datos = datos;
      
      console.log('✅ Datos restaurados correctamente');
      alert('✅ Datos restaurados correctamente');
      renderizar();
      
    } catch (error) {
      console.error('❌ Error al restaurar:', error);
      alert('Error al restaurar: ' + error.message);
    }
  };

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
