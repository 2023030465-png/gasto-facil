import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm';
import { autoTable } from 'https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.8/+esm';

export async function exportarGastosAPdf({ gastos, usuario }) {
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error('No hay gastos para exportar');
  }

  if (typeof jsPDF !== 'function' || typeof autoTable !== 'function') {
    throw new Error('No se pudieron cargar las librerías para generar el PDF.');
  }

  const formatCurrencyMXN = value => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(value) || 0);

  const normalizeText = (value, maxLength = 80) => {
    const text = value == null ? '' : String(value);
    const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
  };

  const parseDate = dateString => {
    const date = new Date(String(dateString).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const sortedGastos = [...gastos].sort((a, b) => {
    const dateA = new Date(String(a.fecha).replace(' ', 'T')).getTime();
    const dateB = new Date(String(b.fecha).replace(' ', 'T')).getTime();
    return dateB - dateA;
  });

  const totalGastos = sortedGastos.reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0);
  const promedioGasto = totalGastos / sortedGastos.length;
  const userEmail = usuario?.email ? normalizeText(usuario.email, 64) : 'Usuario invitado';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const generationDate = new Date();
  const generationLabel = generationDate.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  doc.setFontSize(18);
  doc.text('Reporte de gastos - Gasto Fácil', 14, 18);
  doc.setFontSize(11);
  doc.text(`Fecha de generación: ${generationLabel}`, 14, 26);
  doc.text(`Usuario: ${userEmail}`, 14, 32);

  doc.setFontSize(12);
  doc.text(`Cantidad total de gastos: ${sortedGastos.length}`, 14, 42);
  doc.text(`Suma total: ${formatCurrencyMXN(totalGastos)}`, 14, 48);
  doc.text(`Promedio: ${formatCurrencyMXN(promedioGasto)}`, 14, 54);

  const tableBody = sortedGastos.map(gasto => [
    parseDate(gasto.fecha),
    normalizeText(gasto.concepto, 48),
    normalizeText(gasto.categoria, 30),
    normalizeText(gasto.metodo_pago, 30),
    formatCurrencyMXN(gasto.monto)
  ]);

  autoTable(doc, {
    startY: 62,
    head: [[
      'Fecha',
      'Concepto',
      'Categoría',
      'Método de pago',
      'Monto'
    ]],
    body: tableBody,
    styles: {
      fontSize: 10,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [4, 86, 197],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 80 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 30, halign: 'right' }
    },
    didDrawPage: data => {
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.getWidth();
      const pageHeight = pageSize.getHeight();
      doc.setFontSize(9);
      doc.text('Generado por Gasto Fácil', 14, pageHeight - 10);
      doc.text(`Fecha de generación: ${generationLabel}`, 14, pageHeight - 5);
      const pageNumber = `Página ${doc.internal.getNumberOfPages()}`;
      doc.text(pageNumber, pageWidth - 14, pageHeight - 5, { align: 'right' });
    }
  });

  const filename = `reporte-gastos-${generationDate.getFullYear()}-${String(generationDate.getMonth() + 1).padStart(2, '0')}-${String(generationDate.getDate()).padStart(2, '0')}.pdf`;

  doc.save(filename);
}
