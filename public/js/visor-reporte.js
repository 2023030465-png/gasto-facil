const previewRoot = document.getElementById('previewRoot');
const fileNameEl = document.getElementById('fileName');

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(value) {
  return currency.format(Number(value) || 0);
}

function buildRows(gastos = []) {
  if (!gastos.length) {
    return '<tr><td colspan="5" class="preview-empty">No hay gastos para mostrar.</td></tr>';
  }

  return gastos.map(gasto => `
    <tr>
      <td>${escapeHtml(gasto.fecha || '')}</td>
      <td>${escapeHtml(gasto.concepto || '')}</td>
      <td>${escapeHtml(gasto.categoria || 'Otros')}</td>
      <td>${escapeHtml(gasto.metodo_pago || '')}</td>
      <td class="amount">${formatMoney(gasto.monto)}</td>
    </tr>
  `).join('');
}

function buildSummaryCards(data) {
  const cards = [
    ['Cantidad de gastos', data.cantidadGastos ?? 0],
    ['Total gastado', formatMoney(data.total)],
    ['Promedio', formatMoney(data.promedio)],
    ['Tipo de reporte', data.tipo === 'excel' ? 'Excel' : 'PDF']
  ];

  return `<div class="preview-summary">${cards.map(([label, value]) => `
    <article class="preview-summary__card">
      <span class="preview-summary__label">${escapeHtml(label)}</span>
      <span class="preview-summary__value">${escapeHtml(value)}</span>
    </article>
  `).join('')}</div>`;
}

function renderPdf(data) {
  return `
    <div class="preview-note">El PDF ya se guardó en <strong>Documentos › GastoFacil › Reportes</strong>. Esta vista se abre dentro de Gasto Fácil para consultar su contenido sin salir de la app.</div>
    <section class="preview-sheet">
      <header class="preview-sheet__head">
        <h2>${escapeHtml(data.titulo || 'Reporte de gastos - Gasto Fácil')}</h2>
        <p>Fecha de generación: ${escapeHtml(data.fechaGeneracion || '')}</p>
        <p>Usuario: ${escapeHtml(data.usuario || 'Usuario invitado')}</p>
      </header>
      ${buildSummaryCards(data)}
      <div class="preview-body">
        <h3 class="preview-section-title">Detalle de gastos</h3>
        <div class="preview-table-wrap">
          <table class="preview-table">
            <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Método de pago</th><th class="amount">Monto</th></tr></thead>
            <tbody>${buildRows(data.gastos)}</tbody>
          </table>
        </div>
        <div class="preview-total"><span>Total</span><strong>${formatMoney(data.total)}</strong></div>
      </div>
    </section>
    <p class="preview-footer">Archivo guardado. <a href="/resumen/index.html">Volver al resumen</a></p>
  `;
}

function renderExcel(data) {
  return `
    <div class="preview-note">El Excel ya se guardó en <strong>Documentos › GastoFacil › Reportes</strong>. Puedes revisar sus dos hojas aquí sin abrir otra aplicación.</div>
    <section class="preview-sheet">
      <header class="preview-sheet__head">
        <h2>${escapeHtml(data.titulo || 'Reporte de gastos - Gasto Fácil')}</h2>
        <p>Fecha de generación: ${escapeHtml(data.fechaGeneracion || '')}</p>
        <p>Usuario: ${escapeHtml(data.usuario || 'Usuario invitado')}</p>
      </header>
      <div class="preview-tabs">
        <button class="preview-tab is-active" type="button" data-tab="resumen">Hoja: Resumen</button>
        <button class="preview-tab" type="button" data-tab="detalle">Hoja: Detalle de gastos</button>
      </div>
      <div id="excelPreviewContent"></div>
    </section>
    <p class="preview-footer">Archivo guardado. <a href="/resumen/index.html">Volver al resumen</a></p>
  `;
}

function excelResumen(data) {
  return `
    <div class="excel-info">
      <div class="excel-info__row"><span>Periodo</span><strong>${escapeHtml(data.periodo || 'Todos los gastos registrados')}</strong></div>
      <div class="excel-info__row"><span>Cantidad de gastos</span><strong>${escapeHtml(data.cantidadGastos ?? 0)}</strong></div>
      <div class="excel-info__row"><span>Total gastado</span><strong>${formatMoney(data.total)}</strong></div>
      <div class="excel-info__row"><span>Promedio</span><strong>${formatMoney(data.promedio)}</strong></div>
      <div class="excel-info__row"><span>Categoría con mayor gasto</span><strong>${escapeHtml(data.categoriaPrincipal || 'Sin categoría')}</strong></div>
      <div class="excel-info__row"><span>Monto de esa categoría</span><strong>${formatMoney(data.gastoCategoriaPrincipal)}</strong></div>
    </div>
  `;
}

function excelDetalle(data) {
  return `
    <div class="preview-body">
      <h3 class="preview-section-title">Detalle de gastos</h3>
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Método de pago</th><th class="amount">Monto</th></tr></thead>
          <tbody>${buildRows(data.gastos)}</tbody>
        </table>
      </div>
      <div class="preview-total"><span>Total</span><strong>${formatMoney(data.total)}</strong></div>
    </div>
  `;
}

function bindExcelTabs(data) {
  const content = document.getElementById('excelPreviewContent');
  if (!content) return;
  const showTab = tab => {
    content.innerHTML = tab === 'detalle' ? excelDetalle(data) : excelResumen(data);
    document.querySelectorAll('.preview-tab').forEach(button => {
      button.classList.toggle('is-active', button.dataset.tab === tab);
    });
  };
  document.querySelectorAll('.preview-tab').forEach(button => {
    button.addEventListener('click', () => showTab(button.dataset.tab));
  });
  showTab('resumen');
}

function showNoReport() {
  previewRoot.innerHTML = `
    <div class="preview-note">No hay un reporte listo para mostrar. Primero genera un PDF o Excel desde Resumen.</div>
    <section class="preview-sheet"><div class="preview-empty"><a href="/resumen/index.html">Volver al resumen</a></div></section>
  `;
}

function loadPreview() {
  let stored;
  try {
    stored = sessionStorage.getItem('gastoFacilReportePreview');
  } catch (error) {
    console.error(error);
  }

  if (!stored) {
    showNoReport();
    return;
  }

  let report;
  try {
    report = JSON.parse(stored);
  } catch (error) {
    console.error(error);
    showNoReport();
    return;
  }

  const data = report.preview || {};
  fileNameEl.textContent = report.filename || 'Reporte generado';

  if (report.type === 'excel' || data.tipo === 'excel') {
    previewRoot.innerHTML = renderExcel(data);
    bindExcelTabs(data);
  } else {
    previewRoot.innerHTML = renderPdf(data);
  }
}

loadPreview();
