import { supabase, getSession } from './supabase.js';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageEl = document.getElementById('message');

function showError(message) {
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.style.display = 'block';
}

function hideError() {
  if (!messageEl) return;
  messageEl.textContent = '';
  messageEl.style.display = 'none';
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
  hideError();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError('Ingresa correo y contraseña');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    if (!data?.session) throw new Error('No se pudo iniciar sesión');
    window.location.href = '/';
  } catch (err) {
    showError(err.message || 'Error al iniciar sesión');
  }
});

window.addEventListener('DOMContentLoaded', init);
