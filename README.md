# Landing — Etude ENARM

Página de aterrizaje de **Etude ENARM** (etudeenarm.com), publicada en Netlify.

## Estructura

- `site/` — el sitio que se publica (HTML, imágenes, assets).
  - `index.html` — página principal con el formulario de lista de espera (Netlify Forms, campo `email`).
  - `gracias.html` — página de confirmación tras registrarse.
  - `privacidad.html`, `terminos.html`, `eliminar-cuenta.html` — páginas legales.
- `netlify.toml` — configuración de despliegue.
- `netlify/functions/` — (pendiente) función de autoenvío del correo de invitación.

## Cómo se publica

Cambios en `main` → GitHub → Netlify despliega automáticamente.

## Notas

- El formulario se llama `waitlist` y captura el correo del interesado.
- Autoresponder planeado: al registrarse, enviar la invitación al formulario de la beta automáticamente (vía Resend).
