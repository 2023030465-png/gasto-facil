import { supabase, ensureAuthenticated } from './supabase.js';
import { formatCurrency, setActiveNav } from './common.js';
import { exportarGastosAPdf } from './exportar-pdf.js';
import { exportarGastosAExcel } from './exportar-excel.js';

const totalAcumuladoEl = document.getElementById('totalMes');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const porcentajeEl = document.getElementById('porcentajeCambio');
const categoriaTopNameEl = document.getElementById('categoriaTopName');
const categoriaTopPctEl = document.getElementById('categoriaTopPct');
const donutSvgContainer = document.getElementById('donutSvg');
const categoryList = document.getElementById('categoryList');
const noDataEl = document.getElementById('noData');
const exportStatusEl = document.getElementById('exportStatus');

let gastosReporteData = [];
let usuarioActual = null;
let isExportingPdf = false;
let isExportingExcel = false;

function showExportStatus(message, type = 'success') {
  if (!exportStatusEl) return;
  exportStatusEl.textContent = message;
  exportStatusEl.style.display = 'block';
  exportStatusEl.style.color = type === 'success' ? '#007442' : '#BA1A1A';
}

function toDateOnly(value) {
  return String(value || '').slice(0, 10);
}

function getMonthRange(year, monthIndex) {
  const firstDay = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, '0')}`;
  return { firstDay, lastDay };
}

function totalDe(gastos) {
  return (gastos || []).reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0);
}

function buildDonutSvg(categorias) {
  const colors = ['#0456C5', '#006D3D', '#A13835', '#737785', '#D97706'];
  let offset = 0;
  const circumference = 2 * Math.PI * 80;

  return categorias.map((categoria, index) => {
    const porcentaje = Number(categoria.porcentaje || 0) / 100;
    const dash = porcentaje * circumference;
    const gap = circumference - dash;
    const circle = `<circle cx="100" cy="100" r="80" fill="none"
      stroke="${colors[index % colors.length]}"
      stroke-width="24"
      stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${-offset * circumference}"
      transform="rotate(-90 100 100)" />`;
    offset += porcentaje;
    return circle;
  }).join('');
}

function renderEmptyState() {
  if (noDataEl) {
    noDataEl.textContent = 'Sin gastos registrados todavía';
    noDataEl.style.display = 'block';
  }
  if (categoryList) categoryList.innerHTML = '';
  if (donutSvgContainer) {
    donutSvgContainer.innerHTML = '<circle cx="100" cy="100" r="80" fill="none" stroke="#E6E8EA" stroke-width="24" />';
  }
  if (categoriaTopNameEl) categoriaTopNameEl.textContent = 'Sin categoría';
  if (categoriaTopPctEl) categoriaTopPctEl.textContent = '0';
  const donutPercentage = document.querySelector('.donut-center__pct');
  if (donutPercentage) donutPercentage.textContent = '0%';
  const topProgress = document.getElementById('topProgress');
  if (topProgress) topProgress.style.width = '0%';
}

async function load() {
  setActiveNav('resumen');

  try {
    const user = await ensureAuthenticated();
    if (!user) return;

    const { data: gastos, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false });

    if (error) throw error;

    gastosReporteData = gastos || [];
    usuarioActual = user;

    // Disponible para el botón de WhatsApp.
    // Se usa el mismo conjunto de gastos que PDF, Excel y Resumen.
    window.gastosReporteActual = gastosReporteData;
    window.usuarioReporteActual = usuarioActual;

    if (exportPdfBtn) exportPdfBtn.disabled = false;
    if (exportExcelBtn) exportExcelBtn.disabled = false;

    // Esta pantalla dice "TOTAL ACUMULADO", por eso muestra todos los gastos,
    // incluidos los de meses anteriores. Así el reporte también incluye todos.
    const totalAcumulado = totalDe(gastosReporteData);
    if (totalAcumuladoEl) totalAcumuladoEl.textContent = formatCurrency(totalAcumulado);

    const now = new Date();
    const thisMonth = getMonthRange(now.getFullYear(), now.getMonth());
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = getMonthRange(previousMonthDate.getFullYear(), previousMonthDate.getMonth());

    const gastosEsteMes = gastosReporteData.filter(gasto => {
      const fecha = toDateOnly(gasto.fecha);
      return fecha >= thisMonth.firstDay && fecha <= thisMonth.lastDay;
    });
    const gastosMesAnterior = gastosReporteData.filter(gasto => {
      const fecha = toDateOnly(gasto.fecha);
      return fecha >= previousMonth.firstDay && fecha <= previousMonth.lastDay;
    });

    const totalEsteMes = totalDe(gastosEsteMes);
    const totalMesAnterior = totalDe(gastosMesAnterior);
    if (porcentajeEl) {
      if (totalMesAnterior > 0) {
        const variacion = ((totalEsteMes - totalMesAnterior) / totalMesAnterior) * 100;
        const texto = variacion >= 0 ? 'más' : 'menos';
        porcentajeEl.textContent = `${Math.abs(variacion).toFixed(0)}% ${texto} que el mes pasado`;
      } else if (totalEsteMes > 0) {
        porcentajeEl.textContent = 'Hay gastos registrados este mes';
      } else {
        porcentajeEl.textContent = 'Sin gastos registrados este mes';
      }
    }

    const categoriasMap = {};
    gastosReporteData.forEach(gasto => {
      const categoria = gasto.categoria || 'Otros';
      categoriasMap[categoria] = (categoriasMap[categoria] || 0) + Number(gasto.monto || 0);
    });

    const categorias = Object.entries(categoriasMap)
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalAcumulado > 0 ? ((total / totalAcumulado) * 100).toFixed(0) : 0
      }))
      .sort((a, b) => b.total - a.total);

    const subtitle = document.querySelector('.page-header__sub');
    if (subtitle) subtitle.textContent = 'Análisis de todos tus gastos registrados';

    if (categorias.length === 0) {
      renderEmptyState();
      return;
    }

    if (noDataEl) noDataEl.style.display = 'none';

    const categoriaTop = categorias[0];
    if (categoriaTopNameEl) categoriaTopNameEl.textContent = categoriaTop.nombre;
    if (categoriaTopPctEl) categoriaTopPctEl.textContent = categoriaTop.porcentaje;
    const donutPercentage = document.querySelector('.donut-center__pct');
    if (donutPercentage) donutPercentage.textContent = `${categoriaTop.porcentaje}%`;
    const topProgress = document.getElementById('topProgress');
    if (topProgress) topProgress.style.width = `${categoriaTop.porcentaje}%`;

    if (donutSvgContainer) donutSvgContainer.innerHTML = buildDonutSvg(categorias);
    if (categoryList) {
      categoryList.innerHTML = categorias.map(categoria => `
        <div class="expense-item expense-item--cat">
          <div class="expense-item__icon" style="background: rgba(0,0,0,0.05);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <div class="expense-item__info">
            <span class="expense-item__name">${categoria.nombre}</span>
            <span class="expense-item__date">${categoria.porcentaje}% del total</span>
          </div>
          <span class="expense-item__amount">$${formatCurrency(categoria.total)}</span>
        </div>`).join('');
    }
  } catch (error) {
    console.error('Error al cargar el resumen:', error);
    if (noDataEl) {
      noDataEl.textContent = error.message || 'Error al cargar el resumen';
      noDataEl.style.display = 'block';
    }
  }
}

async function handlePdfExportClick() {
  if (isExportingPdf || !exportPdfBtn || !usuarioActual) return;
  if (!gastosReporteData.length) {
    alert('No hay gastos para exportar');
    return;
  }

  isExportingPdf = true;
  const label = exportPdfBtn.textContent;
  exportPdfBtn.textContent = 'Generando PDF...';
  exportPdfBtn.disabled = true;

  try {
    const result = await exportarGastosAPdf({ gastos: gastosReporteData, usuario: usuarioActual });
    showExportStatus(result?.message || 'Reporte PDF generado correctamente.');
  } catch (error) {
    console.error(error);
    showExportStatus(error.message || 'Error al generar el PDF', 'error');
  } finally {
    exportPdfBtn.disabled = false;
    exportPdfBtn.textContent = label;
    isExportingPdf = false;
  }
}

async function handleExcelExportClick() {
  if (isExportingExcel || !exportExcelBtn || !usuarioActual) return;
  if (!gastosReporteData.length) {
    alert('No hay gastos para exportar');
    return;
  }

  isExportingExcel = true;
  const label = exportExcelBtn.textContent;
  exportExcelBtn.textContent = 'Generando Excel...';
  exportExcelBtn.disabled = true;

  try {
    const result = await exportarGastosAExcel({
      gastos: gastosReporteData,
      usuario: usuarioActual,
      periodo: 'Todos los gastos registrados'
    });
    showExportStatus(result?.message || 'Reporte Excel generado correctamente.');
  } catch (error) {
    console.error(error);
    showExportStatus(error.message || 'Error al generar el Excel', 'error');
  } finally {
    exportExcelBtn.disabled = false;
    exportExcelBtn.textContent = label;
    isExportingExcel = false;
  }
}

if (exportPdfBtn) {
  exportPdfBtn.disabled = true;
  exportPdfBtn.addEventListener('click', handlePdfExportClick);
}

if (exportExcelBtn) {
  exportExcelBtn.disabled = true;
  exportExcelBtn.addEventListener('click', handleExcelExportClick);
}

window.addEventListener('DOMContentLoaded', load);
