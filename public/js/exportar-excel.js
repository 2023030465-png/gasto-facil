import { guardarArchivoReporte } from './native-file.js';

export async function exportarGastosAExcel({ gastos, usuario, periodo }) {
  // Verifica que ExcelJS esté disponible
  if (!window.ExcelJS) {
    throw new Error('No se cargó la librería ExcelJS.');
  }

  // Valida que haya gastos
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error('No hay gastos para exportar');
  }

  const workbook = new window.ExcelJS.Workbook();

  // Configura metadatos
  workbook.creator = 'Gasto Fácil';
  workbook.company = 'Gasto Fácil';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Funciones auxiliares
  const cleanText = (value, maxLength = 100) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length > maxLength) {
      return cleaned.slice(0, maxLength - 1) + '…';
    }
    return cleaned;
  };

  const preventFormulaInjection = (value) => {
    const text = String(value || '');
    if (/^[=+@]/.test(text)) {
      return "'" + text;
    }
    return text;
  };

  const parseDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(String(dateString).replace(' ', 'T'));
    if (isNaN(date.getTime())) return null;
    return date;
  };

  const formatMXN = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(Number(value) || 0);
  };

  // ====== HOJA 1: RESUMEN ======
  const wsResumen = workbook.addWorksheet('Resumen');

  // Título combinado (A1:F2)
  wsResumen.mergeCells('A1:F2');
  const titleCell = wsResumen.getCell('A1');
  titleCell.value = 'Reporte de gastos - Gasto Fácil';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0456C5' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  titleCell.border = {
    top: { style: 'thin', color: { argb: 'FF0456C5' } },
    left: { style: 'thin', color: { argb: 'FF0456C5' } },
    bottom: { style: 'thin', color: { argb: 'FF0456C5' } },
    right: { style: 'thin', color: { argb: 'FF0456C5' } }
  };
  wsResumen.getRow(1).height = 30;

  // Información del reporte
  const generationDate = new Date();
  const generationLabel = generationDate.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const userEmail = usuario?.email ? cleanText(usuario.email, 64) : 'Usuario invitado';

  // Construye información de la derecha
  wsResumen.getCell('A4').value = 'Periodo';
  wsResumen.getCell('A4').font = { bold: true };
  wsResumen.getCell('B4').value = periodo || generationDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' });

  wsResumen.getCell('A5').value = 'Fecha de generación';
  wsResumen.getCell('A5').font = { bold: true };
  wsResumen.getCell('B5').value = generationLabel;

  wsResumen.getCell('A6').value = 'Usuario';
  wsResumen.getCell('A6').font = { bold: true };
  wsResumen.getCell('B6').value = userEmail;

  // Calcula totales
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0);
  const promedioGasto = totalGastos / gastos.length;

  // Construye mapa de categorías
  const categoryMap = {};
  gastos.forEach(g => {
    const cat = cleanText(g.categoria || 'Otros', 30);
    const monto = Number(g.monto || 0);
    categoryMap[cat] = (categoryMap[cat] || 0) + monto;
  });

  const categorias = Object.entries(categoryMap)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);

  const categoriaTop = categorias.length > 0 ? categorias[0] : null;

  // Fila 8: resumen de números
  wsResumen.getCell('A8').value = 'Cantidad de gastos';
  wsResumen.getCell('A8').font = { bold: true };
  wsResumen.getCell('B8').value = gastos.length;

  wsResumen.getCell('C8').value = 'Total gastado';
  wsResumen.getCell('C8').font = { bold: true };
  wsResumen.getCell('D8').value = totalGastos;
  wsResumen.getCell('D8').numFmt = '"$"#,##0.00';

  wsResumen.getCell('E8').value = 'Promedio';
  wsResumen.getCell('E8').font = { bold: true };
  wsResumen.getCell('F8').value = promedioGasto;
  wsResumen.getCell('F8').numFmt = '"$"#,##0.00';

  // Fila 10: categoría top (si existe)
  if (categoriaTop) {
    wsResumen.getCell('A10').value = 'Categoría con mayor gasto';
    wsResumen.getCell('A10').font = { bold: true };
    wsResumen.getCell('B10').value = categoriaTop.nombre;

    wsResumen.getCell('C10').value = 'Monto';
    wsResumen.getCell('C10').font = { bold: true };
    wsResumen.getCell('D10').value = categoriaTop.total;
    wsResumen.getCell('D10').numFmt = '"$"#,##0.00';
  }

  // Aplica estilos y bordes a la sección de información
  for (let row = 4; row <= (categoriaTop ? 10 : 8); row++) {
    for (let col = 1; col <= 6; col++) {
      const cell = wsResumen.getCell(row, col);
      if (cell.value) {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE6E8EA' } },
          left: { style: 'thin', color: { argb: 'FFE6E8EA' } },
          bottom: { style: 'thin', color: { argb: 'FFE6E8EA' } },
          right: { style: 'thin', color: { argb: 'FFE6E8EA' } }
        };
        cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        if (row % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      }
    }
  }

  // Anchos de columnas
  wsResumen.getColumn(1).width = 28;
  wsResumen.getColumn(2).width = 30;
  wsResumen.getColumn(3).width = 25;
  wsResumen.getColumn(4).width = 20;
  wsResumen.getColumn(5).width = 18;
  wsResumen.getColumn(6).width = 20;

  // ====== HOJA 2: DETALLE DE GASTOS ======
  const wsDetalle = workbook.addWorksheet('Detalle de gastos');

  // Ordena gastos de más reciente a más antiguo
  const gastosOrdenados = [...gastos].sort((a, b) => {
    const dateA = parseDate(a.fecha);
    const dateB = parseDate(b.fecha);
    if (!dateA || !dateB) return 0;
    return dateB - dateA;
  });

  // Encabezados
  const headers = ['Fecha', 'Concepto', 'Categoría', 'Método de pago', 'Monto'];
  const headerRow = wsDetalle.addRow(headers);

  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D7A' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  // Aplica bordes y estilos al encabezado
  headerRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF003D7A' } },
      left: { style: 'thin', color: { argb: 'FF003D7A' } },
      bottom: { style: 'thin', color: { argb: 'FF003D7A' } },
      right: { style: 'thin', color: { argb: 'FF003D7A' } }
    };
  });

  // Agrega los gastos
  const startRow = 2;
  gastosOrdenados.forEach((gasto, index) => {
    const fecha = parseDate(gasto.fecha);
    const fila = [
      fecha ? fecha : '',
      preventFormulaInjection(cleanText(gasto.concepto, 48)),
      preventFormulaInjection(cleanText(gasto.categoria, 30)),
      preventFormulaInjection(cleanText(gasto.metodo_pago, 30)),
      Number(gasto.monto || 0)
    ];

    const row = wsDetalle.addRow(fila);

    // Aplica formato de fecha
    if (row.getCell(1).value) {
      row.getCell(1).numFmt = 'dd/mm/yyyy';
    }

    // Aplica formato monetario a la columna Monto
    row.getCell(5).numFmt = '"$"#,##0.00';

    // Alternancia de colores
    const altColor = index % 2 === 0 ? { argb: 'FFFAFAFA' } : { argb: 'FFFFFFFF' };
    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE6E8EA' } },
        left: { style: 'thin', color: { argb: 'FFE6E8EA' } },
        bottom: { style: 'thin', color: { argb: 'FFE6E8EA' } },
        right: { style: 'thin', color: { argb: 'FFE6E8EA' } }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: altColor };

      if (colNum === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (colNum === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'center' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
      }
    });
  });

  // Fila de TOTAL
  const totalRowNum = startRow + gastosOrdenados.length;
  const totalRow = wsDetalle.getRow(totalRowNum);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true, size: 11 };
  totalRow.getCell(5).value = {
  formula: `SUM(E${startRow}:E${totalRowNum - 1})`,
  result: totalGastos
};

  totalRow.getCell(5).numFmt = '"$"#,##0.00';
  totalRow.getCell(5).font = { bold: true, size: 11 };

  totalRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FA' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0456C5' } },
      left: { style: 'thin', color: { argb: 'FFE6E8EA' } },
      bottom: { style: 'thin', color: { argb: 'FFE6E8EA' } },
      right: { style: 'thin', color: { argb: 'FFE6E8EA' } }
    };
    if (colNum === 1) {
      cell.alignment = { horizontal: 'left', vertical: 'center' };
    } else if (colNum === 5) {
      cell.alignment = { horizontal: 'right', vertical: 'center' };
    }
  });

  // Congela el encabezado
  wsDetalle.views = [{ state: 'frozen', ySplit: 1 }];

  // Agrega filtro automático al encabezado
wsDetalle.autoFilter = `A${headerRow.number}:E${headerRow.number}`;

  // Anchos de columnas
  wsDetalle.getColumn(1).width = 14;
  wsDetalle.getColumn(2).width = 32;
  wsDetalle.getColumn(3).width = 20;
  wsDetalle.getColumn(4).width = 22;
  wsDetalle.getColumn(5).width = 16;

  // ====== GENERA EL ARCHIVO ======
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const filename = `reporte-gastos-${generationDate.getFullYear()}-${String(
      generationDate.getMonth() + 1
    ).padStart(2, '0')}-${String(generationDate.getDate()).padStart(2, '0')}.xlsx`;

    return await guardarArchivoReporte(blob, filename);
  } catch (error) {
    console.error('Error al generar el archivo Excel:', error);
    throw error instanceof Error ? error : new Error('Error al generar el archivo Excel');
  }
}
