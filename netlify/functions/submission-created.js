// netlify/functions/submission-created.js
//
// Se ejecuta AUTOMÁTICAMENTE cada vez que alguien envía el formulario "waitlist"
// de la landing (Netlify dispara el evento "submission-created" y, por el nombre
// de este archivo, corre esta función).
//
// Qué hace: toma el correo del interesado y le manda la invitación a la beta
// usando Resend. La API key vive en las variables de entorno de Netlify
// (RESEND_API_KEY, marcada como secreta) — nunca en este código.

const INSTAGRAM_URL = 'https://instagram.com/etude.enarm';
const FROM = 'Etude ENARM <hola@etudeenarm.com>';
const REPLY_TO = 'etude.enarm@gmail.com';
const SUBJECT = 'Estás en la lista — Etude ENARM';

// v3 (8-ago-2026): la beta de fundadores cerró sus admisiones, así que este correo
// deja de ser una invitación al formulario y pasa a ser la confirmación de la lista
// de espera. Se quitó FORM_URL (el Google Form ya no acepta respuestas) y el botón
// ahora lleva a Instagram, que es el canal donde sí hay algo que ver mientras tanto.
// VOZ: de marca, no personal. Por la Regla de voz de `Etude Mail/01-contexto/marca-y-voz.md`,
// un correo automático a una lista firma como "El equipo de Etude ENARM"; la firma
// "Mario — Etude ENARM" queda para correos individuales. Por eso se quitó también la
// presentación del fundador que traía la v2.
// La v2 (23-jul, invitación a la beta, en primera persona) vive en el historial de git.
const textBody = `Hola:

Acabas de dejar tu correo en etudeenarm.com, así que ya estás en la lista.

Etude ENARM es un simulador de casos clínicos hecho para que entiendas cómo llegar a la respuesta, no solo cuál es.

Sale muy pronto. El día que esté disponible te escribimos a este mismo correo con el enlace para descargarla; no tienes que hacer nada más.

Mientras tanto, publicamos casos y explicaciones en Instagram:

${INSTAGRAM_URL}

El equipo de Etude ENARM`;

const htmlBody = `<div style="background-color:#F4F4F7;padding:36px 16px;">
  <div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',system-ui,sans-serif;">
    <div style="background-color:#FFFFFF;border:1px solid #E7E7EB;border-radius:16px;padding:38px 32px;">
      <div style="text-align:center;">
        <img src="https://etudeenarm.com/assets/logo-e-ink.png" alt="Etude ENARM" width="34" style="width:34px;height:auto;">
      </div>
      <p style="text-align:center;margin:24px 0 8px;font-size:11.5px;letter-spacing:2px;font-weight:600;color:#8A8A8E;">LISTA DE ESPERA</p>
      <h1 style="text-align:center;margin:0 0 24px;font-size:22px;line-height:1.3;color:#0B0B0F;font-weight:700;">Ya estás en la lista</h1>
      <p style="font-size:15px;line-height:1.6;color:#0B0B0F;margin:0 0 14px;">Hola:</p>
      <p style="font-size:15px;line-height:1.6;color:#0B0B0F;margin:0 0 14px;">Acabas de dejar tu correo en <a href="https://etudeenarm.com" style="color:#0B0B0F;">etudeenarm.com</a>, así que ya estás en la lista.</p>
      <p style="font-size:15px;line-height:1.6;color:#0B0B0F;margin:0 0 14px;"><strong>Etude ENARM</strong> es un simulador de casos clínicos hecho para que entiendas cómo llegar a la respuesta, no solo cuál es.</p>
      <p style="font-size:15px;line-height:1.6;color:#0B0B0F;margin:0 0 14px;"><strong>Sale muy pronto.</strong> El día que esté disponible te escribimos a este mismo correo con el enlace para descargarla; no tienes que hacer nada más.</p>
      <div style="border-top:1px solid #E7E7EB;margin:26px 0 22px;"></div>
      <p style="font-size:15px;line-height:1.6;color:#0B0B0F;margin:0 0 6px;">Mientras tanto, publicamos casos y explicaciones en Instagram:</p>
      <div style="text-align:center;margin:26px 0 26px;">
        <a href="${INSTAGRAM_URL}" style="display:inline-block;background-color:#0B0B0F;color:#FFFFFF;text-decoration:none;padding:14px 30px;border-radius:999px;font-weight:600;font-size:15px;">Ver @etude.enarm</a>
      </div>
      <p style="font-size:15px;line-height:1.6;color:#0B0B0F;margin:0;">El equipo de Etude&nbsp;ENARM</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#8A8A8E;margin:18px 0 0;line-height:1.6;">Recibiste este correo porque dejaste tu dirección en <a href="https://etudeenarm.com" style="color:#8A8A8E;">etudeenarm.com</a><br>Etude ENARM</p>
  </div>
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
    } else {
      console.log('submission-created: invitación enviada a', email);
    }

    // Además, dar de alta el contacto en la Audience de Resend: así la lista para el
    // lanzamiento se construye sola. La API actual usa una sola audiencia por cuenta,
    // por eso no lleva audienceId.
    //
    // Va en su PROPIO try/catch a propósito: si esto falla, no debe afectar el envío
    // de la invitación, que es lo importante para el usuario.
    try {
      const contactRes = await fetch('https://api.resend.com/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      });

      if (contactRes.ok) {
        console.log('submission-created: contacto agregado a la Audience —', email);
      } else {
        const contactErr = await contactRes.text();
        console.warn('submission-created: no se pudo agregar a la Audience', contactRes.status, contactErr);
      }
    } catch (e) {
      console.warn('submission-created: error al agregar a la Audience', e);
    }

    return { statusCode: 200, body: 'Listo.' };
  } catch (err) {
    console.error('submission-created: error inesperado', err);
    return { statusCode: 200, body: 'Error manejado.' };
  }
};
