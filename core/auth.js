// ============================================================
// core/auth.js
// Login, registro y logout (solo se usa en auth.html).
// Firebase se importa desde core/firebase.js — nunca desde aquí.
//
// NOVEDAD (Tanda 1):
//  - Si ya tienes sesión iniciada, te lleva directo a la app.
//  - Mensaje correcto cuando el email o la contraseña fallan.
// ============================================================

import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Helper DOM ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// Evita redirigir mientras se está entrando o registrando
let ocupado = false;

// ── Mensajes de error legibles ────────────────────────────────
function getErrorMessage(error) {
  const map = {
    'auth/email-already-in-use':   'Ese email ya está registrado.',
    'auth/invalid-email':          'El email no es válido.',
    'auth/weak-password':          'Contraseña demasiado débil.',
    'auth/wrong-password':         'Contraseña incorrecta.',
    'auth/user-not-found':         'No existe un usuario con ese email.',
    'auth/invalid-credential':     'Email o contraseña incorrectos.',
    'auth/too-many-requests':      'Demasiados intentos, espera un momento.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.'
  };
  return map[error.code] || error.message;
}

// ── Si ya hay sesión, ir directo a la app ─────────────────────
onAuthStateChanged(auth, (user) => {
  if (user && !ocupado) window.location.replace('./app.html');
});

// ── Registro ──────────────────────────────────────────────────
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
  ocupado = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    msg.textContent = 'Cuenta creada. Revisa tu correo. Entrando...';
    msg.classList.add('ok');
    $('reg-email').value = $('reg-pass').value = $('reg-pass2').value = '';
    setTimeout(() => window.location.replace('./app.html'), 2500);
  } catch (err) {
    ocupado = false;
    msg.textContent = getErrorMessage(err);
    msg.classList.add('err');
  }
};

// ── Login ─────────────────────────────────────────────────────
window.login = async function () {
  const email = $('log-email').value.trim();
  const pass  = $('log-pass').value;
  const msg   = $('log-msg');
  msg.textContent = ''; msg.className = 'hint';
  ocupado = true;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    $('log-email').value = $('log-pass').value = '';
    if (typeof window.onLoginSuccess === 'function') {
      window.onLoginSuccess();
    } else {
      window.location.replace('./app.html');
    }
  } catch (err) {
    ocupado = false;
    msg.textContent = getErrorMessage(err);
    msg.classList.add('err');
  }
};

// ── Logout ────────────────────────────────────────────────────
window.salir = async function () {
  if (window.liveSessionActive) {
    const confirmar = confirm(
      'Tienes un entrenamiento en vivo en curso. Si cierras sesión, podrás recuperarlo en este dispositivo, pero no quedará asociado a tu cuenta. ¿Continuar?'
    );
    if (!confirmar) return;
  }

  try {
    await signOut(auth);
    window.location.href = './auth.html';
  } catch (err) {
    console.error('[auth] Error al cerrar sesión:', err);
  }
};

// ── Bind botones del formulario ───────────────────────────────
// Los módulos ES6 no exponen funciones al scope global para onclick=""
document.addEventListener('DOMContentLoaded', () => {
  const btnLogin    = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  if (btnLogin)    btnLogin.addEventListener('click', window.login);
  if (btnRegister) btnRegister.addEventListener('click', window.register);
});

// ── Exports ───────────────────────────────────────────────────
export { auth, db, onAuthStateChanged };