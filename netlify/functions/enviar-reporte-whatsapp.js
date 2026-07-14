exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        ok: false,
        mensaje: 'Método no permitido.'
      })
    };
  }

  try {
    const token = process.env.WHAPI_TOKEN;

    if (!token) {
      throw new Error('Falta configurar WHAPI_TOKEN en Netlify.');
    }

    const { telefono, reporte } = JSON.parse(event.body || '{}');
    const numeroLimpio = String(telefono || '').replace(/\D/g, '');

    if (!numeroLimpio || numeroLimpio.length < 10) {
      throw new Error('Número de WhatsApp inválido.');
    }

    if (!reporte || String(reporte).trim().length < 5) {
      throw new Error('El reporte está vacío.');
    }

    const respuesta = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: numeroLimpio,
        body: reporte
      })
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      console.error('Error Whapi:', datos);

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          ok: false,
          mensaje: datos?.message || datos?.error || 'Whapi no pudo enviar el mensaje.',
          detalle: datos
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        mensaje: 'Reporte enviado por WhatsApp.',
        datos
      })
    };
  } catch (error) {
    console.error('Error enviando reporte por WhatsApp:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        mensaje: error.message || 'Error enviando reporte por WhatsApp.'
      })
    };
  }
};
