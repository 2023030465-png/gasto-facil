import { getSession, resetPasswordForEmail } from './supabase.js';

const form = document.getElementById('forgotForm');
const emailInput = document.getElementById('email');
const messageEl = document.getElementById('message');
const errorEl = document.getElementById('error');

function showMessage(message) {
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.style.display = 'block';
}

function showError(message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function hideFeedback() {
  if (messageEl) {
    messageEl.textContent = '';
    messageEl.style.display = 'none';
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}

async function init() {
  const session = await getSession();
  if (session?.user?.id) {
    window.location.href = '/';
    return;
  }
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  hideFeedback();

  const email = emailInput.value.trim();
  if (!email) {
    showError('Ingresa un correo válido');
    return;
  }

  try {
    const { error } = await resetPasswordForEmail(email);
    if (error) throw error;
    showMessage('Correo enviado. Revisa tu bandeja y sigue el enlace para restablecer contraseña.');
  } catch (err) {
    showError(err.message || 'No se pudo enviar el correo');
  }
});

window.addEventListener('DOMContentLoaded', init);
