# Landing — Etude ENARM

Página de aterrizaje de **Etude ENARM** (etudeenarm.com), publicada en Netlify.

## Estructura

- `site/` — el sitio que se publica (HTML, imágenes, assets).
  - `index.html` — página principal con el formulario de lista de espera (Netlify Forms, campo `email`).
  - `gracias.html` — página de confirmación tras registrarse.
  - `privacidad.html`, `terminos.html`, `eliminar-cuenta.html` — páginas legales.
  - `regalo.html` — la página del regalo de Etude Pro (`/regalo/<id>`, reescritura en
    `netlify.toml`). Habla con la función `paseCanje` de Etude CC-FF
    (`herramientas/pases/`, su `CONTRATO.md`). `assets/regalo-og.png` es su vista previa
    de WhatsApp y `assets/qrcode.js`, la librería del QR que muestra en una computadora.
- `herramientas/` — lo que no se publica:
  - `regalo-og.html` y `regalo-og.js` — de donde sale `assets/regalo-og.png`.
  - `prueba-regalo.js` — prueba `regalo.html` contra el código real del servidor de los
    regalos, sin tocar la base (instrucciones dentro).
- `netlify.toml` — configuración de despliegue.
- `netlify/functions/` — (pendiente) función de autoenvío del correo de invitación.

## Cómo se publica

Cambios en `main` → GitHub → Netlify despliega automáticamente.

## Notas

- El formulario se llama `waitlist` y captura el correo del interesado.
- Autoresponder planeado: al registrarse, enviar la invitación al formulario de la beta automáticamente (vía Resend).
