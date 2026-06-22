import { supabase, ensureAuthenticated } from './supabase.js';

const statusMessage = document.getElementById('statusMessage');
const errorMessage = document.getElementById('errorMessage');
const anonymousSection = document.getElementById('anonymousSection');
const passwordSection = document.getElementById('passwordSection');
const emailInput = document.getElementById('emailInput');
const currentEmail = document.getElementById('currentEmail');
const protectButton = document.getElementById('protectButton');
const passwordInput = document.getElementById('passwordInput');
const passwordButton = document.getElementById('passwordButton');
const signOutButton = document.getElementById('signOutButton');

function showStatus(message) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.style.display = 'block';
}

function showError(message) {
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  if (!errorMessage) return;
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';
}

function showAnonymousSection() {
  if (anonymousSection) anonymousSection.style.display = 'block';
  if (passwordSection) passwordSection.style.display = 'none';
}

function showPasswordSection() {
  if (anonymousSection) anonymousSection.style.display = 'none';
  if (passwordSection) passwordSection.style.display = 'block';
}

async function updateEmail() {
  hideError();
  const email = emailInput.value.trim();
  if (!email) {
    showError('Ingresa un correo válido');
    return;
  }

  try {
    protectButton.disabled = true;
    protectButton.textContent = 'Enviando...';
    const { data, error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
    showStatus('Correo enviado. Revisa tu bandeja y confirma el enlace.');
  } catch (err) {
    showError(err.message || 'No se pudo proteger la cuenta');
  } finally {
    protectButton.disabled = false;
    protectButton.textContent = 'Proteger mi cuenta';
  }
}

async function updatePassword() {
  hideError();
  const password = passwordInput.value.trim();
  if (!password) {
    showError('Ingresa una nueva contraseña');
    return;
  }

  try {
    passwordButton.disabled = true;
    passwordButton.textContent = 'Guardando...';
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    showStatus('Contraseña establecida correctamente. Inicia sesión en otro dispositivo si quieres.');
  } catch (err) {
    showError(err.message || 'No se pudo establecer la contraseña');
  } finally {
    passwordButton.disabled = false;
    passwordButton.textContent = 'Establecer contraseña';
  }
}

async function signOut() {
  try {
    await supabase.auth.signOut();
    window.location.href = '/welcome.html';
  } catch (err) {
    showError(err.message || 'No se pudo cerrar sesión');
  }
}

async function init() {
  const user = await ensureAuthenticated();
  if (!user) return;

  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  const isAnonymous = session?.user?.is_anonymous === true;

  if (isAnonymous) {
    showAnonymousSection();
    return;
  }

  currentEmail.value = user.email || '';
  if (!user.email_confirmed_at) {
    showStatus('Confirma tu correo para poder establecer contraseña.');
  }
  showPasswordSection();
}

protectButton?.addEventListener('click', updateEmail);
passwordButton?.addEventListener('click', updatePassword);
signOutButton?.addEventListener('click', signOut);
window.addEventListener('DOMContentLoaded', init);
