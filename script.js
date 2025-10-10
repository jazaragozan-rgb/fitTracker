//llamada a modulo dashboard.js
import { renderizarDashboard } from "./dashboard.js";

import { renderizarSeguimiento } from "./seguimiento.js";

import { iniciarEntrenamiento } from './live.js';

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
    // Forzar ejecución de redirección, log y fallback
    try {
      console.log('Login exitoso, redirigiendo a subindex.html');
      if (typeof window.onLoginSuccess === 'function') {
        window.onLoginSuccess();
      } else {
        console.log('window.onLoginSuccess no está definida');
        window.location.href = './subindex.html';
      }
    } catch (e) {
      console.error('Error en redirección post-login:', e);
      window.location.href = './subindex.html';
    }
  } catch (err) {
    msg.textContent = getErrorMessage(err);
    msg.classList.add('err');
  }
};

window.salir = async function () {
  try { await signOut(auth); 
        // Redirigir a la página de autenticación
    window.location.href = "./auth.html"; 
  }
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
// ==================== Firestore (mejoradas) ====================
async function cargarDatosUsuario(uid) {
  if (!uid) return null;
  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d && Array.isArray(d.datos)) return structuredClone(d.datos);
      // documento existe pero estructura inesperada:
      return { __exists: true, __datosInvalidos: true };
    }
    // NO existe el documento
    return null;
  } catch (e) {
    // Error de lectura (p.e. red/offline). Devolver un objeto que indique error
    console.error("Error al cargar datos (network/other):", e);
    return { __error: true, __message: e?.message || String(e) };
  }
}

async function guardarDatosUsuario(uid, datosActuales) {
  if (!uid || !Array.isArray(datosActuales)) {
    console.warn('[guardarDatosUsuario] uid o datosActuales inválidos:', uid, datosActuales);
    return;
  }

  // Guard para evitar escribir el DATOS_POR_DEFECTO por accidente
  const isDefault = JSON.stringify(datosActuales) === JSON.stringify(DATOS_POR_DEFECTO);
  if (isDefault) {
    console.warn('[guardarDatosUsuario] datos son los por defecto; evitar guardado automático para prevenir sobrescrituras');
    // Si realmente quieres forzar la creación la primera vez, podrías permitirlo con confirmación o flag.
    // return; // <-- descomenta para impedir guardar defaults
  }

  try {
    const ref = doc(db, "usuarios", uid);
    console.log('[guardarDatosUsuario] escribiendo en Firestore (merge):', datosActuales);
    // usar merge para no sobrescribir todo el documento
    await setDoc(ref, { datos: structuredClone(datosActuales) }, { merge: true });
    console.log('[guardarDatosUsuario] guardado exitoso en Firestore (merge)');
  } catch (e) {
    console.error("Error al guardar datos:", e);
  }
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
    console.log("✅ Usuario logueado con UID:", user.uid);
    console.log("📧 Email:", user.email);
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

    if (datosRemotos && datosRemotos.__error) {
      // Hubo un error (network, permisos, etc.) -> NO sobrescribir remoto
      console.warn('[onAuthStateChanged] Error al leer remoto; manteniendo datos locales y evitando sobreescritura:', datosRemotos.__message);
      // Si hay datos locales en localStorage los cargamos (o pedimos reintentar luego)
      datos = JSON.parse(localStorage.getItem("misDatos")) || structuredClone(DATOS_POR_DEFECTO);
      // opcional: mostrar aviso al usuario
      // mostrarToast('No se pudieron cargar tus datos remotos. Trabajando en local.');
    } else if (datosRemotos === null) {
      // No existe documento remoto -> crear solo si tenemos datos no-default
      const local = JSON.parse(localStorage.getItem("misDatos"));
      datos = Array.isArray(local) ? local : structuredClone(DATOS_POR_DEFECTO);
      // Solo crear en Firestore si local tiene contenido real (no defaults)
      const soloDefaults = JSON.stringify(datos) === JSON.stringify(DATOS_POR_DEFECTO);
      if (!soloDefaults) {
        console.log('[onAuthStateChanged] creando documento remoto con datos locales');
        await guardarDatosUsuario(user.uid, datos); // usar merge dentro de la función
      } else {
        console.log('[onAuthStateChanged] documento remoto no existe y datos locales son defaults; no crear para evitar sobrescritura');
      }
    } else if (Array.isArray(datosRemotos)) {
      // Documento existe y tiene datos válidos -> usar remoto
      datos = datosRemotos;
      console.log('[Datos cargados Firestore] datos:', datos);
    } else if (datosRemotos && datosRemotos.__datosInvalidos) {
      // Documento existe pero estructura distinta -> decidir estrategia
      console.warn('[onAuthStateChanged] documento remoto con estructura inesperada; se cargan datos locales por seguridad.');
      datos = JSON.parse(localStorage.getItem("misDatos")) || structuredClone(DATOS_POR_DEFECTO);
    }

    // NOTA: evitamos forzar guardar si hubo error de lectura
    // render y resto
  } else {
    // usuario no autenticado: cargar desde localStorage
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

  // Función auxiliar para generar IDs únicos de sesión
  function asignarSesionIds(datos, ruta = []) {
    datos.forEach((meso, i) => {
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
  }

  asignarSesionIds(datos);

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

  // Subheader: ocultar en nivel 0
  if (rutaActual.length === 0) {
    tituloNivel.style.display = 'none';
    subHeader.style.display = 'flex';
    subHeader.innerHTML = '';
    const btnEntreno = document.createElement('button');
    btnEntreno.id = 'liveEntrenamiento';
    btnEntreno.textContent = 'Empezar entrenamiento';
    btnEntreno.className = 'btn-primary';
    subHeader.appendChild(btnEntreno);
    btnEntreno.addEventListener('click', () => {
      iniciarEntrenamiento();
    });
  } else {
    subHeader.style.display = '';
    subHeader.innerHTML = '';
    const h2Nivel = document.createElement('h2');
    h2Nivel.id = 'tituloNivel';
    if (rutaActual.length === 1) {
      h2Nivel.textContent = 'Bloques';
    } else {
      h2Nivel.textContent = nivel.nombre || ultimoMenuSeleccionado;
    }
    subHeader.appendChild(h2Nivel);

    if (rutaActual.length !== 5) {
      addButton.style.display = '';
      subHeader.appendChild(addButton);
    } else {
      addButton.style.display = 'none';
      const addSerieBtn = document.createElement('button');
      addSerieBtn.className = 'add-serie';
      addSerieBtn.textContent = '+ Añadir serie';
      addSerieBtn.onclick = function() {
        if (nivel.series) nivel.series.push({});
        else nivel.series = [{}];
        guardarDatos();
        renderizar();
      };
      subHeader.appendChild(addSerieBtn);
    }
  }

  // Pantalla Seguimiento
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
          guardarDatos();
          renderizar();
        });
      });

      const reps=document.createElement('input');
      reps.placeholder='Reps'; reps.value=serie.reps||'';
      reps.addEventListener('blur',e=>{serie.reps=e.target.value;guardarDatos();renderizar();});

      const peso=document.createElement('input');
      peso.placeholder='Peso'; peso.value=serie.peso||'';
      peso.addEventListener('blur',e=>{serie.peso=e.target.value;guardarDatos();renderizar();});

      const rir=document.createElement('input');
      rir.placeholder='RIR'; rir.value=serie.rir||'';
      rir.addEventListener('blur',e=>{serie.rir=e.target.value;guardarDatos();renderizar();});

      const descanso=document.createElement('input');
      descanso.placeholder='Descanso'; descanso.value=serie.descanso||'';
      descanso.addEventListener('blur',e=>{serie.descanso=e.target.value;guardarDatos();renderizar();});

// ================== Temporizador con estado guardado ==================
const temporizador = document.createElement('button');
temporizador.className = "btn-timer";

// Mostrar estado guardado (✔️ o 🕔)
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
  serie.completada = !serie.completada; // alternar estado

  if (serie.completada) {
    temporizador.textContent = '✔️';
    serieDiv.style.backgroundColor = '#d4edda';
    serieDiv.style.borderColor = '#6fbe82ff';
    if (serie.descanso) iniciarTimer(serie.descanso); // 👈 solo si tiene descanso
  } else {
    temporizador.textContent = '🕔';
    serieDiv.style.backgroundColor = '';
    serieDiv.style.borderColor = '#afafaf';
  }

  guardarDatos(); // 🔥 se guarda en Firestore y en localStorage
});

serieDiv.appendChild(temporizador);



      const borrar=document.createElement('button');
      borrar.className="btn-delete"; borrar.textContent='❌';
      borrar.style.fontSize='0.7rem';
      borrar.addEventListener('click',()=> {
        mostrarConfirmacion("¿Desea borrar esta serie?",()=> {
          nivel.series.splice(idx,1); guardarDatos(); renderizar();
        });
      });

      [numBtn,reps,peso,rir,descanso,temporizador,borrar].forEach(el=>serieDiv.appendChild(el));
      seriesContainer.appendChild(serieDiv);
    });
    contenido.appendChild(seriesContainer);

    // 📊 Bloque Volumen y 1RM de la sesión actual
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

    // ==================== Funciones auxiliares ====================
    function fechaATimestamp(fechaStr) {
      if (!fechaStr || typeof fechaStr !== "string") return 0;
      return new Date(fechaStr).getTime() || 0;
    }

    function buscarEjercicioAnterior(datos, rutaActual, ejercicioActual) {
      if (!ejercicioActual || !datos) return null;
      const nombreEjercicioActual = ejercicioActual.nombre.trim().toLowerCase();
      const timestampActual = fechaATimestamp(ejercicioActual._fecha || ejercicioActual.fecha);

      let ejercicioAnterior = null;

      for (const meso of datos) {
        for (const micro of meso.hijos || []) {
          for (const sesion of micro.hijos || []) {
            const tsSesion = fechaATimestamp(sesion._fecha || sesion.fecha);
            if (tsSesion >= timestampActual) continue;

            for (const sesionInferior of sesion.hijos || []) {
              for (const ejerc of sesionInferior.hijos || []) {
                if (ejerc === ejercicioActual) continue;
                if ((ejerc.nombre || '').trim().toLowerCase() !== nombreEjercicioActual) continue;
                if (!ejerc.series || ejerc.series.length === 0) continue;
                if (!ejercicioAnterior || tsSesion > fechaATimestamp(ejercicioAnterior._fecha || ejercicioAnterior.fecha)) {
                  ejercicioAnterior = ejerc;
                }
              }
            }
          }
        }
      }
      return ejercicioAnterior;
    }

    // Asignar _fecha a todos los ejercicios de la sesión actual
    const nivel4 = datos?.[rutaActual[0]]?.hijos?.[rutaActual[1]]?.hijos?.[rutaActual[2]]?.hijos?.[rutaActual[3]];
    if (nivel4?.hijos) {
      for (const bloque of nivel4.hijos) {
        if (bloque.hijos) {
          for (const ejerc of bloque.hijos) {
            ejerc._fecha = nivel4.fecha;
          }
        }
      }
    }
    nivel._fecha = nivel4?.fecha || nivel._fecha || null;

    // Buscar ejercicio anterior
    const ejercicioAnterior = buscarEjercicioAnterior(datos, rutaActual, nivel);

    if (ejercicioAnterior) {
      console.log("📦 Ejercicio anterior más reciente:", ejercicioAnterior);

      // Obtener la fecha actual de la sesión anterior
      let fechaMostrar = ejercicioAnterior._fecha || ejercicioAnterior.fecha;

      const statsBoxAnt = document.createElement('div');
      statsBoxAnt.style.background = "#ffffffff";
      statsBoxAnt.style.padding = "14px";
      statsBoxAnt.style.margin = "12px";
      statsBoxAnt.style.borderRadius = "10px";
      statsBoxAnt.style.color = "#000";
      statsBoxAnt.style.boxShadow = "-2px 2px 5px #b6b6b6";
      statsBoxAnt.style.width = "94%";

      let volumenAnt = 0, mejor1RMAnt = 0, pesoMax = 0;
      ejercicioAnterior.series.forEach(serie => {
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
    } else {
      console.log("❌ No se encontró ningún ejercicio anterior con el mismo nombre y series.");
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
}


// ==================== Crear índice con drag & drop ====================
let dragItem = null;          // Índice que estamos moviendo
let dragStartY = 0;           // Posición Y inicial
let dragStartX = 0;           // Posición X inicial
let dragTimer = null;         // Timer de 500 ms
let placeholder = null;       // Marcador visual mientras arrastras
let dragOffsetY = 0;
let dragging = false;
const dragThreshold = 10;     // tolerancia mínima en px para diferenciar swipe/drag

function crearIndice(item, index, nivel) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '4px';
  div.style.flexWrap = 'nowrap';
  div.style.overflow = 'hidden';
  div.setAttribute('draggable', 'true');

  if (!item.editando) item.editando = false;

  // ----------- MODO EDICIÓN -----------
  if (item.editando) {
    const input = document.createElement('input');
    input.value = item.nombre || '';
    input.placeholder = item.placeholder || '';
    input.style.flex = '1 1 auto';
    input.style.minWidth = '40px';

    requestAnimationFrame(() => setTimeout(() => { input.focus(); input.select(); }, 0));

    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt =>
      input.addEventListener(evt, e => e.stopPropagation())
    );

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        item.nombre = input.value || 'Sin nombre';
        item.editando = false; 
        guardarDatos(); 
        renderizar();
      }
    });

    input.addEventListener('blur', () => {
      item.nombre = input.value || 'Sin nombre';
      item.editando = false; 
      guardarDatos(); 
      renderizar();
    });

    div.appendChild(input);

    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = nivel.hijos[index].fecha || '';
      ['pointerdown','mousedown','touchstart','click'].forEach(evt =>
        fechaInput.addEventListener(evt, e => e.stopPropagation())
      );
      fechaInput.addEventListener('input', async e => {
        nivel.hijos[index].fecha = e.target.value;
        guardarDatos();
        const user = auth.currentUser;
        if (user) {
          try { await guardarDatosUsuario(user.uid, datos); } 
          catch(err){ console.error(err); }
        }
      });
      div.appendChild(fechaInput);
    }
  } 
  // ----------- MODO VISUAL -----------
  else {
    const input = document.createElement('input');
    input.value = item.nombre;
    input.disabled = true;
    input.style.flex = '1 1 auto';
    input.style.minWidth = '40px';

    let startX = null;
    let startY = null;

    input.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dragging = false;
      }
    });

    input.addEventListener('touchmove', e => {
      if (startX === null || startY === null) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      if (!dragging && Math.abs(deltaY) > Math.abs(deltaX) + dragThreshold) {
        // Iniciar drag vertical
        dragging = true;
        startDrag(e);
      }

      if (dragging) {
        dragMove(e);
        e.preventDefault(); // solo bloquear scroll mientras arrastramos
      }
      // Horizontal → swipe, no interferir
    });

    input.addEventListener('touchend', e => {
      if (!dragging) {
        // Detectar swipe horizontal
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const distancia = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
        if (distancia < 10) {
          // click/tap
          e.stopImmediatePropagation();
          rutaActual.push(index);
          renderizar();
        }
        // swipe horizontal se maneja fuera
      }

      // Reset
      startX = null;
      startY = null;
      clearTimeout(dragTimer);
    });

    input.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      rutaActual.push(index);
      renderizar();
    });

    div.appendChild(input);

    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = nivel.hijos[index].fecha || '';
      ['mousedown','click'].forEach(evt => fechaInput.addEventListener(evt, e => e.stopPropagation()));
      fechaInput.addEventListener('change', async e => {
        nivel.hijos[index].fecha = e.target.value;
        guardarDatos();
        const user = auth.currentUser;
        if (user) {
          try { await guardarDatosUsuario(user.uid, datos); } 
          catch(err){ console.error(err); }
        }
      });
      div.appendChild(fechaInput);
    }

    // Botón de opciones
    if (rutaActual.length >= 1 && rutaActual.length <= 4) {
      const opcionesBtn = document.createElement('button');
      opcionesBtn.className = "btn-opciones";
      opcionesBtn.innerHTML = `<span style="display:inline-block;width:40px;text-align:center;">
        <span style="display:inline-block;width:5px;height:5px;background:#888;border-radius:50%;margin:0 2px;"></span>
        <span style="display:inline-block;width:5px;height:5px;background:#888;border-radius:50%;margin:0 2px;"></span>
        <span style="display:inline-block;width:5px;height:5px;background:#888;border-radius:50%;margin:0 2px;"></span>
      </span>`;

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

    // ----------- DRAG & DROP -----------
    div.addEventListener('mousedown', startDrag);
    div.addEventListener('touchstart', e => { /* ya manejado en input */ });

    function startDrag(e) {
      e.stopPropagation();
      dragItem = { div, index, nivel };

      const y = e.clientY || (e.touches && e.touches[0].clientY);
      const x = e.clientX || (e.touches && e.touches[0].clientX);
      const rect = div.getBoundingClientRect();
      dragStartY = y;
      dragStartX = x;
      dragOffsetY = y - rect.top;

      dragTimer = setTimeout(() => {
        placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.style.height = div.offsetHeight + 'px';
        div.parentNode.insertBefore(placeholder, div.nextSibling);

        div.style.position = 'absolute';
        div.style.zIndex = '1000';
        div.style.width = div.offsetWidth + 'px';
        div.style.pointerEvents = 'none';
        div.style.top = rect.top + 'px';
        div.style.left = rect.left + 'px';

        document.body.appendChild(div);

        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', dragMove);
        document.addEventListener('touchend', dragEnd);
      }, 500);
    }

    function dragMove(e) {
      if (!dragItem) return;
      const y = e.clientY || e.touches[0].clientY;
      dragItem.div.style.top = (y - dragOffsetY) + 'px';

      const siblings = Array.from(placeholder.parentNode.children).filter(c => c !== dragItem.div && c !== placeholder);
      for (let sib of siblings) {
        const rect = sib.getBoundingClientRect();
        if (y > rect.top && y < rect.bottom) {
          sib.parentNode.insertBefore(placeholder, y < rect.top + rect.height/2 ? sib : sib.nextSibling);
          break;
        }
      }
    }

    function dragEnd(e) {
      clearTimeout(dragTimer);
      if (!dragItem) return;

      placeholder.parentNode.insertBefore(dragItem.div, placeholder);
      dragItem.div.style.position = '';
      dragItem.div.style.zIndex = '';
      dragItem.div.style.width = '';
      dragItem.div.style.pointerEvents = '';
      placeholder.remove();
      placeholder = null;

      const newIndex = Array.from(dragItem.div.parentNode.children).indexOf(dragItem.div);
      const arr = dragItem.nivel.hijos;
      arr.splice(newIndex, 0, arr.splice(dragItem.index, 1)[0]);
      guardarDatos();
      renderizar();

      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('mouseup', dragEnd);
      document.removeEventListener('touchmove', dragMove);
      document.removeEventListener('touchend', dragEnd);
      dragItem = null;
      dragging = false;
    }

    div.addEventListener('mouseup', () => clearTimeout(dragTimer));
    div.addEventListener('touchend', () => clearTimeout(dragTimer));
  }

  return div;
}



// ==================== Eventos ====================
// Modal para añadir medidas corporales
// ...el resto del código...
// (Eliminado bloque duplicado de DOMContentLoaded)

// ==================== Init ====================
// (Eliminado: ahora la inicialización está dentro de DOMContentLoaded)

let touchStartX = null;
let touchEndX = null;
let isMouseDown = false;
let duracion = 300;
let clon = null;
let direccionSwipe = null;

function resetTouch() {
  touchStartX = null;
  touchEndX = null;
  isMouseDown = false;
  direccionSwipe = null;
  if (clon) {
    clon.remove();
    clon = null;
  }
}

function crearClon(avanzar, retroceder) {
  if (!contenido) return null;

  const ancho = contenido.offsetWidth;

  // Crear el contenedor absoluto del clon (cubrirá el contenedor padre)
  const nuevoClon = document.createElement("div");
  nuevoClon.style.position = "absolute";
  nuevoClon.style.top = "0px";
  nuevoClon.style.left = "0px";
  nuevoClon.style.width = "100%";
  nuevoClon.style.height = "100%";
  nuevoClon.style.zIndex = "10000";
  nuevoClon.style.pointerEvents = "none";
  nuevoClon.style.opacity = "0.95";
  nuevoClon.style.transition = "none";
  nuevoClon.style.overflow = "visible";
  // opcional: background para debug (descomenta si quieres ver el contenedor)
  // nuevoClon.style.background = "rgba(255,255,255,0.01)";

  // Construir la ruta temporal (siguiente o anterior)
  const rutaTemp = avanzar
    ? [...rutaActual, 0]
    : retroceder
    ? rutaActual.slice(0, -1)
    : [...rutaActual];

  // --- localizar el nivel destino partiendo de { hijos: datos } (coincide con tu lógica) ---
  let nivel = { hijos: datos };
  for (const idx of rutaTemp) {
    if (!nivel || !nivel.hijos || !nivel.hijos[idx]) {
      nivel = null;
      break;
    }
    nivel = nivel.hijos[idx];
  }

  // Si existe el nivel destino, renderizarlo dentro del clon
  if (nivel) {
    // Nivel de series (o caso donde tenga .series) -> renderizamos encabezados y filas
    if (nivel.series && Array.isArray(nivel.series)) {
      const encabezados = document.createElement("div");
      encabezados.className = "series-header";
      ['','REPS','PESO','RIR','DESCANSO','',''].forEach(txt=>{
        const col = document.createElement("div");
        col.textContent = txt;
        encabezados.appendChild(col);
      });
      nuevoClon.appendChild(encabezados);

      const seriesContainer = document.createElement("div");
      seriesContainer.className = "series-container";
      nivel.series.forEach((serie, idx) => {
        const serieDiv = document.createElement("div");
        serieDiv.className = "serie-row";

        const numBtn = document.createElement("button");
        numBtn.className = "serie-num";
        numBtn.textContent = serie.marca || (idx + 1);
        serieDiv.appendChild(numBtn);

        const reps = document.createElement("div");
        reps.textContent = serie.reps ?? "";
        reps.className = "serie-cell";
        serieDiv.appendChild(reps);

        const peso = document.createElement("div");
        peso.textContent = serie.peso ?? "";
        peso.className = "serie-cell";
        serieDiv.appendChild(peso);

        const rir = document.createElement("div");
        rir.textContent = serie.rir ?? "";
        rir.className = "serie-cell";
        serieDiv.appendChild(rir);

        const descanso = document.createElement("div");
        descanso.textContent = serie.descanso ?? "";
        descanso.className = "serie-cell";
        serieDiv.appendChild(descanso);

        // temporizador / borrar (representación simple)
        const tmp = document.createElement("div");
        tmp.textContent = serie.completada ? "✔️" : "🕔";
        tmp.className = "serie-cell";
        serieDiv.appendChild(tmp);

        const borrar = document.createElement("div");
        borrar.textContent = "❌";
        borrar.className = "serie-cell";
        serieDiv.appendChild(borrar);

        seriesContainer.appendChild(serieDiv);
      });
      nuevoClon.appendChild(seriesContainer);

    // Si el nivel tiene hijos -> usar crearIndice para generar los list-items tal y como en renderizar()
    } else if (nivel.hijos && nivel.hijos.length > 0) {
      nivel.hijos.forEach((item, index) => {
        // crearIndice devuelve un elemento DOM con listeners; lo añadimos al clon
        const div = crearIndice(item, index, nivel);
        // IMPORTANT: crearIndice puede hacer cosas que asuman que el elemento está en el DOM.
        // Aun así, agregarlo al clon mantendrá los event listeners creados.
        nuevoClon.appendChild(div);
      });

    // Si no tiene hijos -> mostrar nombre u otra info del nivel
    } else {
      const texto = document.createElement("div");
      texto.className = "nivel-empty";
      texto.textContent = nivel.nombre || "(sin contenido)";
      nuevoClon.appendChild(texto);
    }
  } else {
    // Ruta inválida -> aviso simple
    const aviso = document.createElement("div");
    aviso.className = "nivel-empty";
    aviso.textContent = "(nivel vacío)";
    nuevoClon.appendChild(aviso);
  }

  // Posicionar inicialmente fuera de la vista según la dirección (entrará con transform)
  if (avanzar) {
    nuevoClon.style.transform = `translateX(${ancho}px)`;
  } else if (retroceder) {
    nuevoClon.style.transform = `translateX(${-ancho}px)`;
  } else {
    nuevoClon.style.transform = `translateX(${ancho}px)`;
  }

  // Asegurarnos que el padre del contenido es position: relative para posicionado absoluto
  const padre = contenido.parentNode;
  if (padre && getComputedStyle(padre).position === "static") {
    padre.style.position = "relative";
  }

  padre.appendChild(nuevoClon);
  return nuevoClon;
}


function onTouchStart(e) {
  touchStartX = e.touches ? e.touches[0].clientX : e.clientX;
  isMouseDown = !e.touches;
  direccionSwipe = null;
}

function onTouchMove(e) {
  if (touchStartX === null) return;

  touchEndX = e.touches ? e.touches[0].clientX : e.clientX;
  const deltaX = touchEndX - touchStartX;

  direccionSwipe = deltaX > 0 ? "derecha" : "izquierda";
  contenido.style.transition = "none";
  contenido.style.transform = `translateX(${deltaX}px)`;

  const nivel = nivelActual();
  const nivel0 = rutaActual.length === 0;

  let avanzar = false, retroceder = false;

  if (nivel0 && direccionSwipe === "izquierda" && nivel.hijos?.length > 0) {
    avanzar = true;
  } else if (!nivel0 && direccionSwipe === "derecha") {
    retroceder = true;
  }

  // Crear clon si corresponde y aún no existe
  if ((avanzar || retroceder) && !clon) {
    clon = crearClon(avanzar, retroceder);
  }

  // Mover clon en tiempo real
  if (clon) {
    const ancho = contenido.offsetWidth;
    const clonDesplazamiento = direccionSwipe === "izquierda"
      ? deltaX + ancho
      : deltaX - ancho;
    clon.style.transform = `translateX(${clonDesplazamiento}px)`;
  }
}

function onTouchEnd(e) {
  touchEndX =
    e.changedTouches && e.changedTouches.length
      ? e.changedTouches[0].clientX
      : e.clientX;

  const deltaX = touchEndX - touchStartX;
  const ancho = contenido.offsetWidth;
  const umbral = 80;
  const nivel = nivelActual();
  const nivel0 = rutaActual.length === 0;

  // swipe corto → rebote
  if (Math.abs(deltaX) < umbral) {
    contenido.style.transition = `transform ${duracion}ms ease`;
    contenido.style.transform = "translateX(0)";
    if (clon) {
      clon.style.transition = `transform ${duracion}ms ease`;
      clon.style.transform = `translateX(${direccionSwipe === "izquierda" ? ancho : -ancho}px)`;
    }
    setTimeout(resetTouch, duracion);
    return;
  }

  let avanzar = false, retroceder = false;

  if (nivel0 && direccionSwipe === "izquierda" && nivel.hijos?.length > 0) {
    avanzar = true;
  } else if (!nivel0 && direccionSwipe === "derecha") {
    retroceder = true;
  }

  if (!avanzar && !retroceder) {
    contenido.style.transition = `transform ${duracion}ms ease`;
    contenido.style.transform = "translateX(0)";
    setTimeout(resetTouch, duracion);
    return;
  }

  // Animación final
  contenido.style.transition = `transform ${duracion}ms ease, opacity ${duracion}ms ease`;
  if (clon) clon.style.transition = `transform ${duracion}ms ease, opacity ${duracion}ms ease`;

  contenido.style.transform = direccionSwipe === "izquierda"
    ? `translateX(${-ancho}px)`
    : `translateX(${ancho}px)`;
  contenido.style.opacity = "0";

  if (clon) clon.style.transform = "translateX(0)";

  setTimeout(() => {
    if (retroceder) rutaActual.pop();
    if (avanzar) rutaActual.push(0);

    renderizar();

    contenido.style.transition = "none";
    contenido.style.transform = "translateX(0)";
    contenido.style.opacity = "1";

    resetTouch();
  }, duracion);
}

// listeners
if (document.getElementById("contenido")) {
  document.body.addEventListener("touchstart", onTouchStart);
  document.body.addEventListener("touchmove", onTouchMove);
  document.body.addEventListener("touchend", onTouchEnd);
  document.body.addEventListener("mousedown", onTouchStart);
  document.body.addEventListener("mousemove", onTouchMove);
  document.body.addEventListener("mouseup", onTouchEnd);
}
