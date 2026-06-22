import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}

export async function ensureAuthenticated() {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) {
    window.location.href = '/welcome.html';
    return null;
  }
  return user;
}

export async function getCurrentUserId() {
  const session = await getSession();
  return session?.user?.id || null;
}

export async function signInGuest() {
  return supabase.auth.signInAnonymously();
}

export async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function updateUser(update) {
  return supabase.auth.updateUser(update);
}

export async function resetPasswordForEmail(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/restablecer-contrasena.html`
  });
}
