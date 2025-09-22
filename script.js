//llamada a modulo dashboard.js
import { renderizarDashboard } from "./dashboard.js";

import { renderizarSeguimiento } from "./seguimiento.js";

// ==================== Firebase Auth + Firestore ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendEmailVerification, setPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { mostrarConfirmacion, mostrarSelectorMarca, mostrarMenuOpciones } from "./modals.js";
import { iniciarTimer, restaurarTimer } from "./timer.js";

// ⚡ Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBYQPw0eoEtCZQ5NHYKHgXfcHpaW_ySzKU",
  authDomain: "sesionmientreno.firebaseapp.com",
  projectId: "sesionmientreno",
  storageBucket: "sesionmientreno.firebasestorage.app",
  messagingSenderId: "730288236333",
  appId: "1:730288236333:web:e4418ca39ffcd48f47d5a4",
  measurementId: "G-T8QZ7WZT5Y"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence);
const db = getFirestore(app);

// ==================== Helpers ====================
const $ = (id) => document.getElementById(id);
const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');
function getErrorMessage(error) {
  const map = {
    'auth/email-already-in-use': 'Ese email ya está registrado.',
    'auth/invalid-email': 'El email no es válido.',
    'auth/weak-password': 'Contraseña demasiado débil.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'No existe un usuario con ese email.',
    'auth/too-many-requests': 'Demasiados intentos, espera un momento.'
  };
  return map[error.code] || error.message;
}

// ==================== Registro / Login / Logout ====================
window.register = async function () {
  const email = $('reg-email').value.trim();
  const pass  = $('reg-pass').value;
  const pass2 = $('reg-pass2').value;
  const msg   = $('reg-msg');
  msg.textContent = ''; msg.className = 'hint';

  if (pass !== pass2) {
    msg.textContent = 'Las contraseñas no coinciden.'; 
    msg.classList.add('err');
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    msg.textContent = 'Cuenta creada. Revisa tu correo.';
    msg.classList.add('ok');
    $('reg-email').value = $('reg-pass').value = $('reg-pass2').value = '';
  } catch (err) {
    msg.textContent = getErrorMessage(err);
    msg.classList.add('err');
  }
};

window.login = async function () {
  const email = $('log-email').value.trim();
  const pass  = $('log-pass').value;
  const msg   = $('log-msg');
  msg.textContent = ''; msg.className = 'hint';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    $('log-email').value = $('log-pass').value = '';
  } catch (err) {
    msg.textContent = getErrorMessage(err);
    msg.classList.add('err');
  }
};

window.salir = async function () {
  try { await signOut(auth); }
  catch (err) { console.error("Error al cerrar sesión:", err); }
};

// ==================== Datos por defecto ====================
const DATOS_POR_DEFECTO = [
  { nombre: 'Entrenamiento', hijos: [] },
  { nombre: 'Seguimiento', hijos: [] },
  { nombre: 'Calendario', hijos: [] }
];
let datos = JSON.parse(localStorage.getItem("misDatos")) || structuredClone(DATOS_POR_DEFECTO);
console.log('[Datos iniciales] datos:', datos);

// Referencias UI
let rutaActual = [];
let contenido, tituloNivel, headerButtons, addButton, backButton, timerContainer, homeButton, logoutButton, menuButton, sideMenu, menuOverlay;
let menuTitulo;

let ultimoMenuSeleccionado = 'Dashboard';

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar referencias UI globales
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

  // Eventos principales de botones
  if (backButton) {
    backButton.addEventListener("click", () => {
      if (rutaActual.length > 0) {
        rutaActual.pop();   // ← sube un nivel en la jerarquía
        renderizar();
      }
    });
  }
  if (homeButton) {
    homeButton.addEventListener("click", () => {
      rutaActual = [];
      renderizar();
    });
  }
  if (logoutButton) {
    logoutButton.addEventListener("click", () => salir());
  }
  if (menuButton) {
    menuButton.addEventListener("click", () => {
      sideMenu.style.left = "0";
      menuOverlay.classList.remove("hidden");
    });
  }
  if (menuOverlay) {
    menuOverlay.addEventListener("click", () => {
      sideMenu.style.left = "-70%";
      menuOverlay.classList.add("hidden");
    });
  }
  document.querySelectorAll(".sideMenu-btn").forEach((btn) => {
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

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", () => {
      hide(formLogin);
      show(formRegister);
      $("log-msg").textContent = "";
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", () => {
      hide(formRegister);
      show(formLogin);
      $("reg-msg").textContent = "";
    });
  }

  // Inicialización final
  window.renderizar = renderizar;
  window.guardarDatos = guardarDatos;
  renderizar();
  restaurarTimer();
});

// ==================== Firestore ====================
async function cargarDatosUsuario(uid) {
  if (!uid) return null;
  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d && Array.isArray(d.datos)) return structuredClone(d.datos);
    }
    return null;
  } catch (e) {
    console.error("Error al cargar datos:", e);
    return null;
  }
}

async function guardarDatosUsuario(uid, datosActuales) {
  if (!uid || !Array.isArray(datosActuales)) {
    console.warn('[guardarDatosUsuario] uid o datosActuales inválidos:', uid, datosActuales);
    return;
  }
  try {
    const ref = doc(db, "usuarios", uid);
    console.log('[guardarDatosUsuario] datos que se guardan en Firestore:', datosActuales);
    await setDoc(ref, { datos: structuredClone(datosActuales) });
    console.log('[guardarDatosUsuario] guardado exitoso en Firestore');
  } catch (e) { console.error("Error al guardar datos:", e); }
}

let saveTimer = null;
function guardarDatos() {
  console.log('[guardarDatos] datos a guardar:', datos);
  localStorage.setItem("misDatos", JSON.stringify(datos));
  const user = auth.currentUser;
  if (!user) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { guardarDatosUsuario(user.uid, datos); }, 300);
}

function nivelActual() {
  let nivel = { hijos: datos };
  for (let i of rutaActual) nivel = nivel.hijos[i];
  return nivel;
}

// ==================== Estado de sesión ====================
onAuthStateChanged(auth, async (user) => {
  const authSec = $('auth');
  const appSec  = $('app');
  hide($('welcome')); hide($('verify-hint'));

  if (user) {
    hide(authSec); 
    show(appSec); 
    show(contenido); 
    show(timerContainer);
    show(headerButtons); 
    show(homeButton); 
    show(logoutButton);
    show(addButton); 
    show(backButton);
    show(menuButton);
    show(tituloNivel);
    show(menuTitulo);

    const datosRemotos = await cargarDatosUsuario(user.uid);
    datos = datosRemotos && Array.isArray(datosRemotos) ? datosRemotos : structuredClone(DATOS_POR_DEFECTO);
    console.log('[Datos cargados Firestore] datos:', datos);
    if (!datosRemotos) await guardarDatosUsuario(user.uid, datos);
  } else {
    show(authSec); 
    hide(appSec); 
    hide(contenido); 
    hide(timerContainer);
    hide(headerButtons); 
    hide(homeButton); 
    hide(logoutButton); 
    hide(addButton); 
    hide(backButton);
    hide(menuButton);
    hide(tituloNivel);
    hide(menuTitulo);

    datos = JSON.parse(localStorage.getItem("misDatos")) || structuredClone(DATOS_POR_DEFECTO);
    console.log('[Datos cargados localStorage] datos:', datos);
  }
  rutaActual = [];
  renderizar();
});

// ==================== Renderizado ====================
function renderizar() {
  if (!contenido) return;
  contenido.innerHTML = '';
  let nivel = nivelActual();

  // Mostrar el nombre correcto en el header según el nivel
  if (menuTitulo) {
    if (rutaActual.length === 0) {
      menuTitulo.textContent = 'Dashboard';
    } else if (rutaActual.length >= 1 && rutaActual.length <= 5) {
      menuTitulo.textContent = 'Entrenamiento';
    } else {
      menuTitulo.textContent = ultimoMenuSeleccionado;
    }
  }

  // Subheader: añadir h2 con el nombre del nivel
  subHeader.innerHTML = '';
  if (rutaActual.length !== 0 && rutaActual.length !== 5) {
    addButton.style.display = '';
    subHeader.appendChild(addButton);
    const addText = document.createElement('span');
    addText.textContent = 'Añadir';
    addText.style.marginLeft = '8px';
    addText.style.fontWeight = 'bold';
    subHeader.appendChild(addText);
  } else {
    addButton.style.display = 'none';
    if (rutaActual.length === 5) {
      const addSerieBtn = document.createElement('button');
      addSerieBtn.className = 'add-serie';
      addSerieBtn.textContent = 'Añadir serie';
      addSerieBtn.onclick = function() {
        if (nivel.series) nivel.series.push({});
        else nivel.series = [{}];
        guardarDatos();
        renderizar();
      };
      subHeader.appendChild(addSerieBtn);
    }
  }
  // Crear y añadir el h2 con el nombre del nivel
  const h2Nivel = document.createElement('h2');
  h2Nivel.id = 'tituloNivel';
  if (rutaActual.length === 0) {
    h2Nivel.style.display = 'none';
  } else if (rutaActual.length === 1) {
    h2Nivel.textContent = 'Bloques';
    h2Nivel.style.display = '';
  } else {
    h2Nivel.textContent = nivel.nombre || ultimoMenuSeleccionado;
    h2Nivel.style.display = '';
  }
  subHeader.appendChild(h2Nivel);

  // Pantalla Seguimiento SOLO si estamos en la sección Seguimiento
  if (rutaActual.length === 1 && rutaActual[0] === 1) {
    const nivel = nivelActual();
    renderizarSeguimiento(nivel, contenido, subHeader, addButton);
    return;
  }
  if (rutaActual.length === 0) {
    renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton);
    return;
  }

  // Nivel de series
  if (rutaActual.length === 5) {
    backButton.style.visibility = 'visible';
    addButton.style.visibility = 'hidden';
    tituloNivel.textContent = nivel.nombre;

    const encabezados = document.createElement('div');
    encabezados.className = 'series-header';
    ['','REPS','PESO','RIR','DESCANSO','',''].forEach(txt=>{
      const col=document.createElement('div');
      col.textContent=txt;
      encabezados.appendChild(col);
    });
    contenido.appendChild(encabezados);

    const seriesContainer = document.createElement('div');
    seriesContainer.className = 'series-container';
    nivel.series = nivel.series || [];
    nivel.series.forEach((serie, idx) => {
      const serieDiv = document.createElement('div');
      serieDiv.className="serie-row";

      const numBtn=document.createElement('button');
      numBtn.className="serie-num";
      numBtn.textContent=serie.marca|| (idx+1);
      numBtn.addEventListener('click',e=>{
        e.stopPropagation();
        mostrarSelectorMarca(serie,idx,()=>{
          guardarDatos();     // aquí sí tienes acceso
          renderizar();       // refresca la UI
        });
      });

      const reps=document.createElement('input');
      reps.placeholder='Reps'; reps.value=serie.reps||'';
      reps.addEventListener('input',e=>{serie.reps=e.target.value;guardarDatos();});

      const peso=document.createElement('input');
      peso.placeholder='Peso'; peso.value=serie.peso||'';
      peso.addEventListener('input',e=>{serie.peso=e.target.value;guardarDatos();});

      const rir=document.createElement('input');
      rir.placeholder='RIR'; rir.value=serie.rir||'';
      rir.addEventListener('input',e=>{serie.rir=e.target.value;guardarDatos();});

      const descanso=document.createElement('input');
      descanso.placeholder='Descanso'; descanso.value=serie.descanso||'';
      descanso.addEventListener('input',e=>{serie.descanso=e.target.value;guardarDatos();});

      const temporizador=document.createElement('button');
      temporizador.className="btn-timer"; temporizador.textContent='⏱';
      temporizador.addEventListener('click',()=>iniciarTimer(serie.descanso));

      const borrar=document.createElement('button');
      borrar.className="btn-delete"; borrar.textContent='🗑';
      borrar.addEventListener('click',()=> {
        mostrarConfirmacion("¿Desea borrar esta serie?",()=> {
          nivel.series.splice(idx,1); guardarDatos(); renderizar();
        });
      });

      [numBtn,reps,peso,rir,descanso,temporizador,borrar].forEach(el=>serieDiv.appendChild(el));
      seriesContainer.appendChild(serieDiv);
    });
    contenido.appendChild(seriesContainer);

 // 📊 Bloque Volumen y 1RM
    const statsBox = document.createElement('div');
    statsBox.style.background = "#ffffffff";
    statsBox.style.padding = "14px";
    statsBox.style.margin = "12px";
    statsBox.style.borderRadius = "10px";
    statsBox.style.color = "#000";
    statsBox.style.boxShadow = "0px 2px 10px #b6b6b6";
    statsBox.style.width = "94%";

    // Calcular volumen total y 1RM
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

    // ==================== FUNCIONES ====================

function fechaATimestamp(fechaStr) {
  if (!fechaStr || typeof fechaStr !== "string") return 0;
  return new Date(fechaStr).getTime() || 0;
}

// ==================== Buscar ejercicio anterior ====================
// Obtener nodo "Full body" o "Push pull legs" (nivel 3)
const sesion = datos?.[rutaActual[0]]?.hijos?.[rutaActual[1]]?.hijos?.[rutaActual[2]];
console.log("📌 Nodo 'Full body' o 'Push pull legs' (nivel 3):", sesion);

// Mostrar los hijos de "Full body" o "Push pull legs" (nivel 4)
console.log("📌 Hijos de 'Full body' o 'Push pull legs' (nivel 4):", sesion?.hijos);

// Obtener el hijo específico en nivel 4 (donde puede estar la fecha)
const nivel4 = sesion?.hijos?.[rutaActual[3]];
console.log("📌 Nodo nivel 4:", nivel4);

// Intentar leer la fecha en nivel 4
const fechaActualSesion = nivel4?.fecha || null;
console.log("📌 Fecha sesión actual (nivel 4):", fechaActualSesion);

const nombreEjercicioActual = nivel.nombre.trim().toLowerCase();  // Normalizar nombre ejercicio actual
let ejercicioAnterior = null;
let timestampActual = fechaATimestamp(fechaActualSesion);

console.log("📌 Fecha sesión actual:", fechaActualSesion);
console.log("📌 Timestamp actual:", timestampActual);
console.log("📌 Nombre ejercicio actual:", nombreEjercicioActual);  // Mostrar nombre ejercicio actual normalizado

// Ahora solo necesitamos recorrer las sesiones de "Full body" y "Push pull legs" que contienen la fecha
for (const meso of datos) {
  console.log(`🔸 Mesociclo: ${meso.nombre || "sin nombre"}`);

  // Buscar el nodo "Full body" o "Push pull legs"
  for (const micro of meso.hijos || []) {
    console.log(`  🔹 Microciclo: ${micro.nombre || "sin nombre"}`);

      // Buscamos dentro de los hijos de "Full body" o "Push pull legs" (sesiones)
      for (const sesion of micro.hijos || []) {
        console.log(`    🔹 Sesión encontrada: ${sesion.nombre}`);

        // Verificamos si la sesión tiene una fecha
        if (!sesion.fecha) {
          console.log(`      ⚠️ Sesión sin fecha, buscando en el siguiente nivel...`);

          // Si la sesión no tiene fecha, verificamos en los hijos de esta sesión
          if (sesion.hijos && sesion.hijos.length > 0) {
            for (const sesionInferior of sesion.hijos) {
              console.log(`        🔍 Buscando en nivel inferior: ${sesionInferior.nombre}`);
              if (sesionInferior.fecha) {
                console.log(`        ✅ Sesión en nivel inferior con fecha encontrada: ${sesionInferior.nombre} - Fecha: ${sesionInferior.fecha}`);
                sesion.fecha = sesionInferior.fecha;  // Asignamos la fecha encontrada en el nivel inferior
                break;  // Ya encontramos la fecha, podemos continuar
              }
            }
          }
          // Si después de buscar en los hijos no tiene fecha, la saltamos
          if (!sesion.fecha) {
            console.log("        ⚠️ No se encontró ninguna fecha en el nivel inferior. Se salta.");
            continue;
          }
        }

        // Aquí es donde debe usarse sesionInferior si se encontró una fecha en el subnivel
        console.log(`    ✅ Sesión con fecha encontrada: ${sesion.fecha ? sesion.nombre : sesionInferior.nombre} - Fecha: ${sesion.fecha || sesionInferior.fecha}`);

        // Convertimos la fecha de la sesión a timestamp
        const fechaSes = fechaATimestamp(sesion.fecha || sesionInferior.fecha);
        console.log(`    🔍 Sesión: ${sesion.nombre || sesionInferior.nombre} - Fecha: ${sesion.fecha || sesionInferior.fecha} (timestamp: ${fechaSes})`);

        if (fechaSes >= timestampActual) {
          console.log("      ❌ Sesión no es anterior a la actual, se salta.");
          continue;  // Si la sesión no es anterior a la fecha actual, se salta
        }

        // **Aquí está la modificación principal**
        // Ahora buscamos los ejercicios dentro de esta sesión, que están en los "hijos de los hijos"
        for (const sesionInferior of sesion.hijos || []) {
          console.log(`      ➤ Buscando ejercicios dentro de los hijos de la sesión: ${sesionInferior.nombre}`);

          // Verificamos si esta sesión inferior tiene ejercicios
          for (const ejercicio of sesionInferior.hijos || []) {
            console.log(`        ➤ Ejercicio encontrado: ${ejercicio.nombre}`);

            const nombreEjercicioComparar = ejercicio.nombre.trim().toLowerCase();  // Normalizamos también el nombre del ejercicio anterior
            console.log(`        ➤ Comparando ejercicio: '${ejercicio.nombre}' (normalizado: '${nombreEjercicioComparar}')`);
            console.log(`        ➤ Ejercicio actual: '${nombreEjercicioActual}'`);

            // Comprobamos si el nombre del ejercicio coincide
            if (nombreEjercicioComparar === nombreEjercicioActual) {
              console.log("          ✅ Coincidencia encontrada con ejercicio:", ejercicio.nombre);

              // La fecha aquí debe ser del nivel de la sesión, no del propio ejercicio
              const fechaSesionEjercicioAnterior = sesion.fecha || sesionInferior.fecha; // Fecha de la sesión, no del ejercicio

              if (ejercicio.series?.length > 0) {
                console.log("          ✅ Ejercicio anterior con series encontrado");

                if (!ejercicioAnterior || fechaATimestamp(fechaSesionEjercicioAnterior) > fechaATimestamp(ejercicioAnterior._fecha)) {
                  ejercicioAnterior = { ...ejercicio, _fecha: fechaSesionEjercicioAnterior };
                  console.log(`          ⭐ Nuevo ejercicio anterior más reciente guardado de fecha: ${fechaSesionEjercicioAnterior}`);
                }
              } else {
                console.log("          ⚠️ Ejercicio encontrado sin series, se ignora.");
              }
            } else {
              console.log("          ❌ Nombres no coinciden");
            }
          }
        }
      }
  }
}

if (ejercicioAnterior) {
  console.log("📦 Ejercicio anterior más reciente:", ejercicioAnterior);
} else {
  console.log("❌ No se encontró ningún ejercicio anterior con el mismo nombre y series.");
}

// Si encontramos un ejercicio anterior, mostramos la caja de estadísticas
if (ejercicioAnterior) {
  const statsBoxAnt = document.createElement('div');
    statsBoxAnt.style.background = "#ffffffff";
    statsBoxAnt.style.padding = "14px";
    statsBoxAnt.style.margin = "12px";
    statsBoxAnt.style.borderRadius = "10px";
    statsBoxAnt.style.color = "#000";
    statsBoxAnt.style.boxShadow = "-2px 2px 5px #b6b6b6";
    statsBoxAnt.style.width = "94%";

  let volumenAnt = 0;
  let mejor1RMAnt = 0;
  let pesoMax = 0;

  ejercicioAnterior.series.forEach(serie => {
    const peso = parseFloat(serie.peso) || 0;
    const reps = parseInt(serie.reps) || 0;
    volumenAnt += peso * reps;
    const estimado = peso * (1 + reps / 30);
    if (estimado > mejor1RMAnt) mejor1RMAnt = estimado;
    if (peso > pesoMax) pesoMax = peso;
  });

  statsBoxAnt.innerHTML = `
    <p><b>📅 Anterior (${ejercicioAnterior._fecha}):</b></p>
    <p><b>Volumen total:</b> ${volumenAnt.toFixed(2)} kg</p>
    <p><b>1RM estimado:</b> ${mejor1RMAnt.toFixed(2)} kg</p>
    <p><b>Peso máximo:</b> ${pesoMax.toFixed(2)} kg</p>
  `;

  contenido.appendChild(statsBoxAnt);
}


    const notas=document.createElement('textarea');
    notas.placeholder='Notas del ejercicio...';
    notas.value=nivel.notas||''; notas.className='notes';
    notas.addEventListener('input',e=>{nivel.notas=e.target.value;guardarDatos();});
    contenido.appendChild(notas);
    return;
  }

  // Otros niveles
  backButton.style.visibility = 'visible';
  addButton.style.visibility  = 'visible';
  const nombres = ['Mesociclos','Microciclos','Sesiones','Ejercicios'];
  tituloNivel.textContent = nombres[rutaActual.length-1] || nivel.nombre;

  if (nivel.hijos && nivel.hijos.length) {
    nivel.hijos.forEach((item, index) => {
      const div=crearIndice(item,index,nivel);
      div.addEventListener('click',()=>{ rutaActual.push(index); renderizar(); });
      contenido.appendChild(div);
    });
  }

  addButton.onclick = () => {
    // Solo mostrar confirmación si hay algo que pegar
    if (rutaActual.length >= 1 && rutaActual.length <= 4 && window.itemCopiado) {
      mostrarConfirmacion("¿Desea pegar el contenido aquí o desea crear un bloque nuevo?", () => {
        // Pegar
        if (window.itemCopiado.nivel !== rutaActual.length) {
          mostrarConfirmacion(`El contenido se debe pegar en el nivel ${window.itemCopiado.nivel}`, () => {}, null, "Aceptar");
        } else {
          nivel.hijos.push(structuredClone(window.itemCopiado.datos));
          window.itemCopiado = null;
          guardarDatos();
          renderizar();
        }
      }, () => {
        // Crear nuevo índice normal
        const nombreDefault = "Nuevo " + tituloNivel.textContent;
        nivel.hijos.push({ nombre:"", hijos:[], editando:true, placeholder:nombreDefault });
        guardarDatos(); renderizar();
      }, "Pegar", "Crear nuevo");
    } else {
      // Crear nuevo índice normal directamente
      const nombreDefault = "Nuevo " + tituloNivel.textContent;
      nivel.hijos.push({ nombre:"", hijos:[], editando:true, placeholder:nombreDefault });
      guardarDatos(); renderizar();
    }
  };
}

// ==================== Crear índice ====================
function crearIndice(item, index, nivel) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '4px';
  div.style.flexWrap = 'nowrap';
  div.style.overflow = 'hidden';

  if (!item.editando) item.editando = false;

  if (item.editando) {
    // ----------- MODO EDICIÓN -----------
    const input = document.createElement('input');
    input.value = item.nombre || '';
    input.placeholder = item.placeholder || '';
    input.style.flex = '1 1 auto';
    input.style.minWidth = '40px';
    setTimeout(() => { input.focus(); input.select(); }, 0);

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

    // 👉 Si estamos en nivel 3, añadimos input de fecha
    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = nivel.hijos[index].fecha || '';
      fechaInput.addEventListener('input', e => {
        nivel.hijos[index].fecha = e.target.value;
        console.log('[Input fecha nivel 3] sesión principal:', nivel.hijos[index]);
        guardarDatos();
      });
      div.appendChild(fechaInput);
    }

  } else {
    // ----------- MODO VISUAL -----------
    const input = document.createElement('input');
    input.value = item.nombre;
    input.disabled = true;
    input.style.flex = '1 1 auto';
    input.style.minWidth = '40px';
    // Permite que todo el área del input sea clicable para navegar
    input.addEventListener('click', () => { rutaActual.push(index); renderizar(); });
    input.addEventListener('touchstart', () => { rutaActual.push(index); renderizar(); });
    div.appendChild(input);

    // 👉 Si estamos en nivel 3, mostramos también la fecha
    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = nivel.hijos[index].fecha || '';
      fechaInput.addEventListener('mousedown', e => e.stopPropagation());
      fechaInput.addEventListener('click', e => e.stopPropagation());
      fechaInput.addEventListener('change', e => {
        nivel.hijos[index].fecha = e.target.value;
        console.log('[Input fecha nivel 3] sesión principal:', nivel.hijos[index]);
        guardarDatos();
        renderizar();
      });
      div.appendChild(fechaInput);
    }

    // Solo mostrar el botón de opciones en niveles 1-4
    if (rutaActual.length >= 1 && rutaActual.length <= 4) {
      // Botón de opciones (3 círculos horizontales)
      const opcionesBtn = document.createElement('button');
      opcionesBtn.className = "btn-opciones";
      opcionesBtn.innerHTML = `<span style="display:inline-block;width:18px;text-align:center;">
        <span style="display:inline-block;width:5px;height:5px;background:#888;border-radius:50%;margin:0 2px;"></span>
        <span style="display:inline-block;width:5px;height:5px;background:#888;border-radius:50%;margin:0 2px;"></span>
        <span style="display:inline-block;width:5px;height:5px;background:#888;border-radius:50%;margin:0 2px;"></span>
      </span>`;

      opcionesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Oculta otros menús abiertos
  document.querySelectorAll('.menu-opciones').forEach(m => m.remove());
  mostrarMenuOpciones({
          anchorElement: opcionesBtn,
          onEditar: () => {
            item.editando = true;
            guardarDatos();
            renderizar();
          },
          onEliminar: () => {
            mostrarConfirmacion(`¿Desea borrar "${item.nombre}"?`, () => {
              nivel.hijos.splice(index, 1);
              guardarDatos();
              renderizar();
            });
          },
          onCopiar: () => {
            window.itemCopiado = { nivel: rutaActual.length, datos: structuredClone(item) };
            // No mostrar ningún alert ni ventana del navegador
          }
        });
      });
      div.appendChild(opcionesBtn);
    }
  }
  return div;
}

// ==================== Eventos ====================
// Modal para añadir medidas corporales
// ...el resto del código...
// (Eliminado bloque duplicado de DOMContentLoaded)

// ==================== Init ====================
// (Eliminado: ahora la inicialización está dentro de DOMContentLoaded)

// Swipe para navegación entre niveles (touch y mouse drag en toda la pantalla)
  let touchStartX = null;
  let touchEndX = null;
  let isMouseDown = false;

  function handleGesture() {
    if (touchStartX === null || touchEndX === null) return;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) < 50) return; // umbral mínimo
    if (deltaX > 0) {
      // Swipe derecha: volver nivel (en todos los niveles)
      if (rutaActual.length > 0) {
        rutaActual.pop();
        renderizar();
      }
    } else {
      // Swipe izquierda: avanzar solo en nivel 0 y 1
      if (rutaActual.length === 0) {
        let nivel = nivelActual();
        if (nivel.hijos && Array.isArray(nivel.hijos) && nivel.hijos.length > 0) {
          rutaActual.push(0); // avanzar al primer hijo
          renderizar();
        }
      }
    }
    touchStartX = null;
    touchEndX = null;
    isMouseDown = false;
  }

  function onTouchStart(e) {
    if (e.touches) {
      touchStartX = e.touches[0].clientX;
    } else {
      isMouseDown = true;
      touchStartX = e.clientX;
    }
  }
  function onTouchMove(e) {
    if (isMouseDown && e.clientX !== undefined) {
      touchEndX = e.clientX;
    }
  }
  function onTouchEnd(e) {
    if (e.changedTouches) {
      touchEndX = e.changedTouches[0].clientX;
    } else if (isMouseDown) {
      if (touchEndX === null) touchEndX = e.clientX;
    }
    handleGesture();
  }
  // Usar document.body para toda la pantalla
  document.body.addEventListener('touchstart', onTouchStart);
  document.body.addEventListener('touchend', onTouchEnd);
  document.body.addEventListener('mousedown', onTouchStart);
  document.body.addEventListener('mousemove', onTouchMove);
  document.body.addEventListener('mouseup', onTouchEnd);
