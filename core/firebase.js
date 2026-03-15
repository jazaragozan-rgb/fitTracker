// ============================================================
// core/firebase.js
// Inicialización de Firebase — único lugar donde se configura.
// Todos los demás archivos importan { app, auth, db } desde aquí.
// ============================================================

import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence }
                                 from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Configuración del proyecto ────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBYQPw0eoEtCZQ5NHYKHgXfcHpaW_ySzKU",
  authDomain:        "sesionmientreno.firebaseapp.com",
  projectId:         "sesionmientreno",
  storageBucket:     "sesionmientreno.firebasestorage.app",
  messagingSenderId: "730288236333",
  appId:             "1:730288236333:web:e4418ca39ffcd48f47d5a4",
  measurementId:     "G-T8QZ7WZT5Y"
};

// ── Inicialización (se ejecuta una sola vez al importar) ──────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Persistencia de sesión — no bloquea la inicialización
setPersistence(auth, browserSessionPersistence)
  .catch(e => console.warn('[firebase] setPersistence error:', e));

// ── Exports ──────────────────────────────────────────────────
export { app, auth, db };
