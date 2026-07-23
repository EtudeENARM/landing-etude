// netlify/functions/submission-created.js
//
// Se ejecuta AUTOMÁTICAMENTE cada vez que alguien envía el formulario "waitlist"
// de la landing (Netlify dispara el evento "submission-created" y, por el nombre
// de este archivo, corre esta función).
//
// Qué hace: toma el correo del interesado y le manda la invitación a la beta
// usando Resend. La API key vive en las variables de entorno de Netlify
// (RESEND_API_KEY, marcada como secreta) — nunca en este código.

const FORM_URL = 'https://forms.gle/5HGn65waQrzrLVXe8';
const FROM = 'Etude ENARM <hola@etudeenarm.com>';
const REPLY_TO = 'etude.enarm@gmail.com';
const SUBJECT = 'Acceso anticipado a Etude ENARM';

const textBody = `Hola:

Recientemente dejaste tu correo en etudeenarm.com porque te interesó Etude ENARM, el simulador de casos clínicos para el ENARM.

Estamos abriendo la beta de fundadores: acceso completo y gratuito a la app durante toda la prueba. Solo pedimos dos cosas a cambio: que la uses de verdad y que nos compartas tu feedback honesto para mejorarla.

Los lugares son limitados, así que si te interesa, entra aquí y te tomará un minuto:

${FORM_URL}

El formulario te va a preguntar si usas Android o iPhone y te dará las instrucciones exactas para cada uno. Nada complicado.

Gracias por haber estado ahí desde antes de que existiera. Nos encantaría tenerte entre los primeros en probarla.

Un saludo,
El equipo de Etude ENARM`;

const htmlBody = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#0B0B0F;max-width:520px;margin:0 auto;">
  <p>Hola:</p>
  <p>Recientemente dejaste tu correo en <a href="https://etudeenarm.com" style="color:#0B0B0F;">etudeenarm.com</a> porque te interesó <strong>Etude ENARM</strong>, el simulador de casos clínicos para el ENARM.</p>
  <p>Estamos abriendo la <strong>beta de fundadores</strong>: acceso completo y gratuito a la app durante toda la prueba. Solo pedimos dos cosas a cambio: que la uses de verdad y que nos compartas tu feedback honesto para mejorarla.</p>
  <p>Los lugares son limitados, así que si te interesa, entra aquí y te tomará un minuto:</p>
  <p style="margin:22px 0;">
    <a href="${FORM_URL}" style="display:inline-block;background:#0B0B0F;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:600;">Completar el formulario</a>
  </p>
  <p style="font-size:13px;color:#8A8A8E;">O copia este enlace: <a href="${FORM_URL}" style="color:#8A8A8E;">${FORM_URL}</a></p>
  <p>El formulario te va a preguntar si usas Android o iPhone y te dará las instrucciones exactas para cada uno. Nada complicado.</p>
  <p>Gracias por haber estado ahí desde antes de que existiera. Nos encantaría tenerte entre los primeros en probarla.</p>
  <p>Un saludo,<br>El equipo de Etude ENARM</p>
</div>`;

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || '{}');

    // Seguridad 1: actuar solo sobre el formulario de lista de espera.
    if (payload && payload.form_name && payload.form_name !== 'waitlist') {
      return { statusCode: 200, body: 'Ignorado: no es el formulario waitlist.' };
    }

    // El correo puede venir en data.email o en email, según Netlify.
    const email =
      (payload && payload.data && payload.data.email) ||
      (payload && payload.email);

    if (!email) {
      console.log('submission-created: no se encontró correo en la submission.');
      return { statusCode: 200, body: 'Sin correo, nada que enviar.' };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('submission-created: falta RESEND_API_KEY en las variables de entorno.');
      return { statusCode: 500, body: 'Falta configuración (RESEND_API_KEY).' };
    }

    // Llamada a Resend (API REST, sin dependencias — fetch viene incluido en Node 18+).
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO,
        subject: SUBJECT,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('submission-created: Resend devolvió error', res.status, errText);
      // Devolvemos 200 para que Netlify no reintente en bucle; el error queda en los logs.
      return { statusCode: 200, body: 'Error al enviar (registrado en logs).' };
    }

    console.log('submission-created: invitación enviada a', email);
    return { statusCode: 200, body: 'Invitación enviada.' };
  } catch (err) {
    console.error('submission-created: error inesperado', err);
    return { statusCode: 200, body: 'Error manejado.' };
  }
};
