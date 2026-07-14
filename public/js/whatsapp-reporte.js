/*
  Botón: Enviar reporte por WhatsApp
  - Este archivo NO contiene el token de Whapi.
  - El token vive en Netlify como WHAPI_TOKEN.
  - Funciona desde Netlify PWA, Android/Capacitor y pruebas locales con internet.
*/

const WHATSAPP_ENDPOINT =
  'https://jolly-mandazi-4b4269.netlify.app/.netlify/functions/enviar-reporte-whatsapp';

const whatsappBtn = document.getElementById('btnEnviarWhatsApp');
const exportStatusElWhatsapp = document.getElementById('exportStatus');

function mostrarEstadoWhatsApp(mensaje, tipo = 'success') {
  if (exportStatusElWhatsapp) {
    exportStatusElWhatsapp.textContent = mensaje;
    exportStatusElWhatsapp.style.display = 'block';
    exportStatusElWhatsapp.style.color = tipo === 'success' ? '#007442' : '#BA1A1A';
    return;
  }

  alert(mensaje);
}

function formatearDineroWhatsApp(valor) {
  return Number(valor || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });
}

function obtenerMonto(gasto) {
  return Number(gasto?.monto ?? gasto?.amount ?? gasto?.valor ?? gasto?.total ?? 0);
}

function obtenerConcepto(gasto) {
  return gasto?.concepto || gasto?.descripcion || gasto?.nombre || gasto?.name || 'Gasto';
}

function obtenerCategoria(gasto) {
  return gasto?.categoria || gasto?.category || 'Sin categoría';
}

function obtenerFecha(gasto) {
  const fecha = gasto?.fecha || gasto?.date || gasto?.created_at || '';
  if (!fecha) return 'Sin fecha';
  return String(fecha).slice(0, 10);
}

function obtenerGastosParaWhatsApp() {
  if (Array.isArray(window.gastosReporteActual)) {
    return window.gastosReporteActual;
  }

  const posiblesClaves = [
    'gastos',
    'gastoFacilGastos',
    'expenses',
    'gastos_actuales'
  ];

  for (const clave of posiblesClaves) {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || '[]');
      if (Array.isArray(datos) && datos.length > 0) return datos;
    } catch (error) {
      console.warn('No se pudo leer localStorage:', clave, error);
    }
  }

  return [];
}

function crearMensajeReporteWhatsApp(gastos) {
  const total = gastos.reduce((suma, gasto) => suma + obtenerMonto(gasto), 0);
  const cantidad = gastos.length;
  const promedio = cantidad > 0 ? total / cantidad : 0;

  const porCategoria = {};
  gastos.forEach((gasto) => {
    const categoria = obtenerCategoria(gasto);
    porCategoria[categoria] = (porCategoria[categoria] || 0) + obtenerMonto(gasto);
  });

  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  const categoriaMayor = categoriasOrdenadas[0]
    ? `${categoriasOrdenadas[0][0]} (${formatearDineroWhatsApp(categoriasOrdenadas[0][1])})`
    : 'Sin datos';

  const ultimosGastos = gastos
    .slice(0, 5)
    .map((gasto, index) => {
      const concepto = obtenerConcepto(gasto);
      const categoria = obtenerCategoria(gasto);
      const monto = formatearDineroWhatsApp(obtenerMonto(gasto));
      const fecha = obtenerFecha(gasto);
      return `${index + 1}. ${concepto} | ${categoria} | ${monto} | ${fecha}`;
    })
    .join('\n');

  return `📊 *Reporte de gastos - Gasto Fácil*

Fecha del reporte: ${new Date().toLocaleDateString('es-MX')}

💰 Total gastado: ${formatearDineroWhatsApp(total)}
🧾 Número de gastos: ${cantidad}
📈 Promedio por gasto: ${formatearDineroWhatsApp(promedio)}
🏷️ Categoría con mayor gasto: ${categoriaMayor}

🕒 *Últimos gastos:*
${ultimosGastos || 'No hay gastos registrados.'}

_Reporte generado desde Gasto Fácil._`;
}

async function enviarReporteWhatsApp() {
  if (!whatsappBtn) return;

  const labelOriginal = whatsappBtn.textContent;

  try {
    const gastos = obtenerGastosParaWhatsApp();

    if (!gastos.length) {
      mostrarEstadoWhatsApp('No hay gastos para enviar por WhatsApp.', 'error');
      return;
    }

    let telefono = localStorage.getItem('telefono_whatsapp_gasto_facil') || '';

    telefono = prompt(
      'Escribe el número de WhatsApp con lada. Ejemplo México: 521XXXXXXXXXX',
      telefono
    );

    if (!telefono) return;

    telefono = String(telefono).replace(/\D/g, '');

    if (telefono.length < 10) {
      mostrarEstadoWhatsApp('El número de WhatsApp no es válido.', 'error');
      return;
    }

    localStorage.setItem('telefono_whatsapp_gasto_facil', telefono);

    const reporte = crearMensajeReporteWhatsApp(gastos);

    whatsappBtn.disabled = true;
    whatsappBtn.textContent = 'Enviando WhatsApp...';
    mostrarEstadoWhatsApp('Enviando reporte por WhatsApp...', 'success');

    const respuesta = await fetch(WHATSAPP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ telefono, reporte })
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || !datos.ok) {
      throw new Error(datos.mensaje || 'No se pudo enviar el reporte por WhatsApp.');
    }

    mostrarEstadoWhatsApp('Reporte enviado por WhatsApp correctamente.');
  } catch (error) {
    console.error('Error WhatsApp:', error);
    mostrarEstadoWhatsApp(error.message || 'Error enviando reporte por WhatsApp.', 'error');
  } finally {
    whatsappBtn.disabled = false;
    whatsappBtn.textContent = labelOriginal;
  }
}

if (whatsappBtn) {
  whatsappBtn.addEventListener('click', enviarReporteWhatsApp);
}
