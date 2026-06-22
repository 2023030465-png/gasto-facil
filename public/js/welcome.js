import { supabase, getSession, onAuthStateChange, signInGuest } from './supabase.js';

const guestButton = document.getElementById('guestButton');
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

async function handleGuestClick() {
  try {
    const { data, error } = await signInGuest();
    if (error) throw error;
    if (!data?.session) throw new Error('No se pudo iniciar sesión como invitado');
    window.location.href = '/';
  } catch (err) {
    showError(err.message || 'Error al iniciar como invitado');
  }
}

async function init() {
  const session = await getSession();
  if (session?.user?.id) {
    window.location.href = '/';
    return;
  }
  onAuthStateChange((event, session) => {
    if (session?.user?.id) {
      window.location.href = '/';
    }
  });
}

guestButton?.addEventListener('click', async () => {
  guestButton.disabled = true;
  guestButton.textContent = 'Cargando...';
  await handleGuestClick();
  guestButton.disabled = false;
  guestButton.textContent = 'Continuar como invitado';
});

window.addEventListener('DOMContentLoaded', init);
