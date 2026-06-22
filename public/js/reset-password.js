import { supabase } from './supabase.js';

const statusMessage = document.getElementById('statusMessage');
const errorMessage = document.getElementById('errorMessage');
const recoveryInfo = document.getElementById('recoveryInfo');
const recoveryForm = document.getElementById('recoveryForm');
const newPasswordInput = document.getElementById('newPassword');
const waiting = document.getElementById('waiting');

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

function showRecoveryForm() {
  if (recoveryForm) recoveryForm.style.display = 'block';
  if (recoveryInfo) recoveryInfo.style.display = 'block';
  if (waiting) waiting.style.display = 'none';
}

function showWaiting() {
  if (recoveryForm) recoveryForm.style.display = 'none';
  if (recoveryInfo) recoveryInfo.style.display = 'none';
  if (waiting) waiting.style.display = 'block';
}

async function handleAuthState(event, session) {
  if (event === 'PASSWORD_RECOVERY') {
    showRecoveryForm();
    showStatus('Completa el formulario para establecer tu nueva contraseña.');
  }
}

recoveryForm?.addEventListener('submit', async event => {
  event.preventDefault();
  hideError();
  const password = newPasswordInput.value.trim();
  if (!password) {
    showError('Ingresa una nueva contraseña');
    return;
  }

  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    showStatus('Contraseña actualizada. Ahora puedes iniciar sesión con tu correo y contraseña.');
    window.setTimeout(() => {
      window.location.href = '/login.html';
    }, 2000);
  } catch (err) {
    showError(err.message || 'Error al actualizar la contraseña');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  showWaiting();
  supabase.auth.onAuthStateChange((event, session) => {
    handleAuthState(event, session);
  });
});
