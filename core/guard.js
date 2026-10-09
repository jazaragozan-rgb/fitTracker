// ============================================================
// core/guard.js
// Control de acceso de la app:
//  - Si no hay sesión iniciada, te manda a la pantalla de login.
//  - Define window.salir (cerrar sesión), que antes solo existía
//    en la página de login y por eso el botón no funcionaba.
// Se carga automáticamente desde core/store.js.
// ============================================================

import { auth } from './firebase.js';
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

window.salir = async function () {
  if (window.liveSessionActive) {
    const confirmar = confirm(
      'Tienes un entrenamiento en vivo en curso. Si cierras sesión, podrás recuperarlo en este dispositivo, pero no quedará asociado a tu cuenta. ¿Continuar?'
    );
    if (!confirmar) return;
  }
  try {
    await signOut(auth);
    window.location.replace('./auth.html');
  } catch (err) {
    console.error('[guard] Error al cerrar sesión:', err);
    alert('No se pudo cerrar la sesión. Inténtalo de nuevo.');
  }
};

onAuthStateChanged(auth, (user) => {
  if (!user) window.location.replace('./auth.html');
});
