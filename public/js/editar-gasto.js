import { supabase, ensureAuthenticated } from './supabase.js';
import { setActiveNav } from './common.js';

const form = document.getElementById('expenseForm');
const messageEl = document.getElementById('formMessage');
const saveButton = document.getElementById('saveExpenseBtn');
const expenseId = new URLSearchParams(window.location.search).get('id');
let currentUser = null;

function showMessage(message, type = 'error') {
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.style.display = 'block';
  messageEl.style.color = type === 'success' ? '#007442' : '#BA1A1A';
}

function setSaving(isSaving) {
  if (!saveButton) return;
  saveButton.disabled = isSaving;
  saveButton.textContent = isSaving ? 'Guardando...' : 'Guardar cambios';
}

function setRadioValue(name, value) {
  form?.querySelectorAll(`input[name="${name}"]`).forEach(input => {
    input.checked = input.value === (value || '');
  });
}

function populateForm(gasto) {
  form.elements.concepto.value = gasto.concepto || '';
  form.elements.monto.value = gasto.monto ?? '';
  form.elements.fecha.value = String(gasto.fecha || '').slice(0, 10);
  form.elements.categoria.value = gasto.categoria || 'Otros';
  form.elements.notas.value = gasto.notas || '';
  setRadioValue('metodo_pago', gasto.metodo_pago || 'Efectivo');
}

async function loadExpense() {
  setActiveNav('gastos');

  if (!expenseId) {
    showMessage('No se encontró el gasto que quieres editar.');
    return;
  }

  try {
    currentUser = await ensureAuthenticated();
    if (!currentUser) return;

    const { data: gasto, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('id', expenseId)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (error) throw error;
    if (!gasto) throw new Error('Ese gasto ya no existe o no te pertenece.');

    populateForm(gasto);
  } catch (error) {
    console.error('Error al cargar el gasto:', error);
    showMessage(error.message || 'No se pudo cargar el gasto.');
  }
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!expenseId || !currentUser) return;

  const formData = new FormData(form);
  const monto = Number(formData.get('monto'));

  if (!Number.isFinite(monto) || monto < 0) {
    showMessage('Escribe un monto válido.');
    return;
  }

  const payload = {
    concepto: String(formData.get('concepto') || '').trim(),
    monto,
    fecha: formData.get('fecha'),
    categoria: formData.get('categoria') || 'Otros',
    metodo_pago: formData.get('metodo_pago') || 'Efectivo',
    notas: String(formData.get('notas') || '').trim()
  };

  if (!payload.concepto || !payload.fecha) {
    showMessage('Completa concepto y fecha antes de guardar.');
    return;
  }

  setSaving(true);
  try {
    const { error } = await supabase
      .from('gastos')
      .update(payload)
      .eq('id', expenseId)
      .eq('user_id', currentUser.id);

    if (error) throw error;

    showMessage('Gasto actualizado correctamente.', 'success');
    window.setTimeout(() => {
      window.location.href = '/gastos/index.html';
    }, 450);
  } catch (error) {
    console.error('Error al guardar el gasto:', error);
    showMessage(error.message || 'No se pudo actualizar el gasto.');
  } finally {
    setSaving(false);
  }
});

window.addEventListener('DOMContentLoaded', loadExpense);
