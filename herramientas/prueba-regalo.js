// Prueba site/regalo.html contra el núcleo real de los regalos (Etude CC-FF,
// herramientas/pases/pases.js) con su almacén en memoria: no toca Firestore ni la red
// de Google; las llamadas a paseCanje se contestan aquí mismo. Recorre iPhone, Android
// y computadora, en claro y en oscuro, y deja capturas de cada estado.
//
// Uso:  PASES="/ruta/a/Etude CC-FF/herramientas/pases" node herramientas/prueba-regalo.js
//       (necesita Playwright; las capturas quedan en $FOTOS o en la carpeta temporal)
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium, devices } = require('playwright');

if (!process.env.PASES) { console.error('Falta PASES: la carpeta herramientas/pases de Etude CC-FF.'); process.exit(2); }
const { montar, idDe, T, DIA_MS } = require(path.join(process.env.PASES, 'pruebas', 'apoyo', 'montaje'));
const { ErrorPedido } = require(path.join(process.env.PASES, 'pases'));

const SITIO = path.join(__dirname, '..', 'site');
const FOTOS = process.env.FOTOS || path.join(os.tmpdir(), 'prueba-regalo');
fs.mkdirSync(FOTOS, { recursive: true });
const API = 'https://us-central1-residencia-2f69a.cloudfunctions.net/paseCanje';
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };

function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (/^\/regalo\/.+/.test(p)) p = '/regalo.html'; // la reescritura de netlify.toml
      const archivo = path.join(SITIO, p);
      if (!archivo.startsWith(SITIO) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end('no'); }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
      fs.createReadStream(archivo).pipe(res);
    });
    s.listen(0, () => ok(s));
  });
}

const fallas = [];
const revisar = (cond, que) => { if (!cond) { fallas.push(que); console.log('  ✗', que); } else console.log('  ✓', que); };

(async () => {
  const s = await servidor();
  const BASE = `http://localhost:${s.address().port}`;
  const navegador = await chromium.launch();

  // El mundo: una cuenta Pro pagada con su regalo, códigos de Apple y de Google.
  // `tiendas` como de fábrica (solo Apple) salvo cuando la prueba lo abre.
  // Todas las cuentas de la prueba son Pro pagadas.
  const todasPagadas = new Proxy({}, { get: () => ({ pro: true, cobrado: true }) });
  const mundo = montar({ ajustes: { modo: 'todos', tiendas: ['apple'] }, soloDeFabrica: true, clientes: todasPagadas });
  const puestos = [];
  const cargar = (tienda, codigo, dias) => { mundo.ponerCodigo(tienda, codigo, { vence: T + dias * DIA_MS }); puestos.push(`pasesCodigos/${tienda}-${codigo}`); };
  // Vacía la bolsa de una tienda y devuelve cómo dejarla.
  const vaciar = (tienda) => {
    const quitados = puestos.filter((r) => (mundo.leer(r) || {}).libre === tienda);
    for (const r of quitados) mundo.poner(r, { ...mundo.leer(r), libre: null });
    return () => { for (const r of quitados) mundo.poner(r, { ...mundo.leer(r), libre: tienda }); };
  };
  const PRIMERO = { claro: ['ABCD1234EFGH5678', 'GOOG7777PLAY8888'], oscuro: ['WXYZ9876KLMN5432', 'GOOG5555PLAY6666'] };
  const crear = async (uid) => { const r = await mundo.app(uid, 'crear'); return idDe(r.pase.enlace); };
  const pedidos = [];
  let red = 'bien'; // 'bien' | 'caida'

  async function contexto(opciones, oscuro) {
    const c = await navegador.newContext({ ...opciones, colorScheme: oscuro ? 'dark' : 'light' });
    await c.route(API, async (ruta) => {
      const req = ruta.request();
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
      if (req.method() === 'OPTIONS') return ruta.fulfill({ status: 204, headers: cors });
      if (red === 'caida') return ruta.abort('internetdisconnected');
      const { data } = JSON.parse(req.postData() || '{}');
      pedidos.push(data);
      mundo.reloj.ahora += 60e3; // un minuto entre pedido y pedido, como en la vida
      try {
        const result = await mundo.pagina(data);
        return ruta.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ result }) });
      } catch (e) {
        const status = e instanceof ErrorPedido ? e.codigo.toUpperCase().replace(/-/g, '_') : 'INTERNAL';
        return ruta.fulfill({ status: 400, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: { status, message: e.message } }) });
      }
    });
    const errores = [];
    c.on('page', (p) => { p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED/.test(m.text())) errores.push(m.text()); }); });
    return { c, errores };
  }
  const foto = async (p, nombre) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(FOTOS, nombre + '.png'), fullPage: true }); };
  const texto = (p) => p.locator('main#contenido').innerText();
  const ponerAjustes = (extra) => mundo.poner('ajustes/pases', { modo: 'todos', tiendas: ['apple'], ...extra });

  const IPHONE = devices['iPhone 15'];
  const ANDROID = devices['Pixel 7'];
  const COMPU = { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 };

  for (const oscuro of [false, true]) {
    const m = oscuro ? 'oscuro' : 'claro';
    console.log(`\n=== ${m} ===`);
    ponerAjustes({});
    const [CA, CG] = PRIMERO[m];
    cargar('apple', CA, 200); cargar('google', CG, 200);
    for (let i = 0; i < 5; i++) { cargar('apple', `${m.toUpperCase()}RELLENO${i}`.padEnd(16, 'X').slice(0, 16), 210); }
    const agr = (c) => c.replace(/(.{4})(?=.)/g, '$1 ');

    // ── iPhone, de principio a fin ──
    {
      const { c, errores } = await contexto(IPHONE, oscuro);
      await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {});
      const p = await c.newPage();
      const id = await crear(`pagado-${m}`);
      await p.goto(`${BASE}/regalo/${id}`);
      await p.getByText('Te regalaron 14 días de Etude Pro').waitFor();
      revisar((await texto(p)).includes('Nunca he tenido Etude Pro ni su prueba gratis'), 'iPhone: sin-usar con la casilla');
      revisar(!(await texto(p)).includes(CA.slice(0, 4)), 'iPhone: el código no se ve antes de la casilla');
      revisar(pedidos.at(-1).accion === 'ver', 'iPhone: al abrir solo pide «ver»');
      await foto(p, `${m}-iphone-1-abre`);
      await p.getByRole('checkbox').click();
      await p.getByRole('link', { name: 'Canjear en el App Store' }).waitFor();
      const href = await p.getByRole('link', { name: 'Canjear en el App Store' }).getAttribute('href');
      revisar(href === `https://apps.apple.com/redeem?ctx=offercodes&id=6759030566&code=${CA}`, 'iPhone: el botón lleva el enlace de canje de Apple con el código');
      revisar(pedidos.at(-1).accion === 'codigo' && pedidos.at(-1).tienda === 'apple', 'iPhone: la casilla pide el código de Apple');
      revisar((await texto(p)).includes('toca «Cancelar»: «Comprar» te cobra el plan completo.'), 'iPhone: el aviso de «Comprar»');
      await foto(p, `${m}-iphone-2-casilla`);
      await p.getByRole('button', { name: '¿No se abrió la tienda? Ver tu código' }).click();
      revisar((await p.locator('#codigo').innerText()) === agr(CA), 'iPhone: el código en grupos de cuatro');
      await p.getByRole('button', { name: 'Copiar' }).click();
      await p.waitForTimeout(200);
      const copiado = await p.evaluate(() => navigator.clipboard.readText()).catch(() => null);
      revisar(copiado === CA || copiado === null, `iPhone: Copiar deja el código sin espacios (${copiado === null ? 'portapapeles no legible aquí' : copiado})`);
      await foto(p, `${m}-iphone-3-codigo`);
      const pase = mundo.leer(`users/pagado-${m}/pasesRegalo/${id}`);
      revisar(pase && pase.estado !== 'usado' && !pase.usado, 'iPhone: ver el código no gasta el regalo');

      // Otra persona con el mismo enlace ve el mismo código.
      const p2 = await c.newPage();
      await p2.goto(`${BASE}/regalo/${id}`);
      await p2.getByRole('checkbox').click();
      await p2.getByRole('link', { name: 'Canjear en el App Store' }).waitFor();
      await p2.getByRole('button', { name: '¿No se abrió la tienda? Ver tu código' }).click();
      revisar((await p2.locator('#codigo').innerText()) === agr(CA), 'iPhone: un segundo visitante ve el mismo código');
      await p2.close();

      // Se canjea en la tienda: la página dice «Ya se usó».
      await mundo.evento(mundo.eventoDeCanje({ tienda: 'apple', comprado: mundo.reloj.ahora + 60e3 }));
      await p.reload();
      await p.getByText('Este regalo ya se usó').waitFor();
      revisar(true, 'iPhone: tras el canje, «Este regalo ya se usó»');
      await foto(p, `${m}-iphone-4-usado`);

      // «Ya tuve Etude Pro», ida y vuelta.
      const id2 = await crear('excepcion-' + m);
      await p.goto(`${BASE}/regalo/${id2}`);
      await p.getByRole('button', { name: 'Ya tuve Etude Pro o su prueba' }).click();
      await p.getByText('Este regalo es para quien nunca ha tenido Etude Pro').waitFor();
      revisar((await p.getByRole('link', { name: 'Descargar Etude en el App Store' }).count()) === 1, 'iPhone: «no califica» ofrece descargar en el App Store');
      await foto(p, `${m}-iphone-5-nocalifica`);
      await p.getByRole('button', { name: 'Me equivoqué: nunca lo he tenido' }).click();
      await p.getByRole('checkbox').waitFor();
      revisar(true, 'iPhone: «Me equivoqué» vuelve a la casilla');

      // Sin códigos en la bolsa.
      const id3 = await crear('excepcion2-' + m);
      const devolver = vaciar('apple');
      await p.goto(`${BASE}/regalo/${id3}`);
      await p.getByRole('checkbox').click();
      await p.getByText('Por ahora no hay códigos para el App Store').waitFor();
      revisar(true, 'iPhone: sin códigos, «Por ahora no hay códigos…» y el regalo sigue libre');
      await foto(p, `${m}-iphone-6-sincodigos`);
      devolver();

      // Caducado: el reloj del servidor avanza 31 días para este pase.
      const id4 = await crear('excepcion3-' + m);
      // El reloj no vuelve atrás: los ajustes se guardan en memoria hasta «ahora + 0».
      mundo.reloj.ahora += 31 * DIA_MS;
      await p.goto(`${BASE}/regalo/${id4}`);
      await p.getByText('Este regalo caducó').waitFor();
      revisar(true, 'iPhone: a los 31 días, «Este regalo caducó»');
      await foto(p, `${m}-iphone-7-caducado`);
      const idRed = await crear('excepcion7-' + m);

      // Enlace roto, y uno que no existe.
      await p.goto(`${BASE}/regalo/abc`);
      await p.getByText('Este regalo ya no está disponible').waitFor();
      revisar(pedidos.at(-1).pase !== 'abc', 'iPhone: un id mal formado no llega a la función');
      await p.goto(`${BASE}/regalo/NoExisteEsteRegaloXYZ123`);
      await p.getByText('Este regalo ya no está disponible').waitFor();
      revisar(true, 'iPhone: un id que no existe, «ya no está disponible»');
      await foto(p, `${m}-iphone-8-noexiste`);

      // Apagado.
      mundo.poner('ajustes/pases', { modo: 'apagado' });
      await p.goto(`${BASE}/regalo/${id2}`);
      await p.getByText('Este regalo no se puede canjear por ahora').waitFor();
      revisar(true, 'iPhone: con los regalos apagados, «no se puede canjear por ahora»');
      await foto(p, `${m}-iphone-9-apagado`);
      ponerAjustes({});

      // Sin red, y luego con red.
      red = 'caida';
      await p.goto(`${BASE}/regalo/${idRed}`);
      await p.getByText('No pudimos abrir tu regalo').waitFor();
      await foto(p, `${m}-iphone-10-sinred`);
      red = 'bien';
      await p.getByRole('button', { name: 'Intentar de nuevo' }).click();
      await p.getByRole('checkbox').waitFor();
      revisar(true, 'iPhone: sin red avisa, e «Intentar de nuevo» abre el regalo');
      // Se cae la red justo al tocar la casilla.
      red = 'caida';
      await p.getByRole('checkbox').click();
      await p.getByText('No se pudo pedir el código').waitFor();
      red = 'bien';
      await p.getByRole('button', { name: 'Intentar de nuevo' }).click();
      await p.getByRole('link', { name: 'Canjear en el App Store' }).waitFor();
      revisar(true, 'iPhone: si la red falla al pedir el código, reintenta y lo da');

      revisar(errores.length === 0, `iPhone: sin errores en la consola${errores.length ? ': ' + errores.join(' | ') : ''}`);
      await c.close();
    }

    // ── Android ──
    {
      const { c, errores } = await contexto(ANDROID, oscuro);
      const p = await c.newPage();
      const id = await crear('excepcion4-' + m);
      await p.goto(`${BASE}/regalo/${id}`);
      await p.getByText('Este regalo es para iPhone').waitFor();
      revisar((await p.getByRole('link', { name: 'Descargar Etude en Google Play' }).count()) === 1, 'Android (solo iPhone): «Este regalo es para iPhone» y descargar en Google Play');
      revisar(!pedidos.some((d) => d.pase === id && d.accion === 'codigo'), 'Android (solo iPhone): ni pide código');
      await foto(p, `${m}-android-1-nodisponible`);

      // Con Android abierto (ajustes.py tiendas apple google).
      ponerAjustes({ tiendas: ['apple', 'google'] });
      await p.reload();
      await p.getByRole('checkbox').click();
      await p.getByRole('link', { name: 'Canjear en Google Play' }).waitFor();
      const href = await p.getByRole('link', { name: 'Canjear en Google Play' }).getAttribute('href');
      revisar(href === `https://play.google.com/redeem?code=${CG}`, 'Android (abierto): el enlace de canje de Google Play');
      revisar(!(await texto(p)).includes('«Comprar»'), 'Android (abierto): sin el aviso de «Comprar», que es de Apple');
      revisar((await texto(p)).includes('en los próximos 3 días'), 'Android (abierto): el paso de los 3 días');
      await foto(p, `${m}-android-2-abierto`);
      ponerAjustes({});

      // La página ya abierta en Android cuando el servidor cierra Android.
      const id2 = await crear('excepcion5-' + m);
      ponerAjustes({ tiendas: ['apple', 'google'] });
      await p.goto(`${BASE}/regalo/${id2}`);
      await p.getByRole('checkbox').waitFor();
      ponerAjustes({});
      await p.getByRole('checkbox').click();
      await p.getByText('Este regalo es para iPhone').waitFor();
      revisar(true, 'Android: si cierran Android con la página abierta, la casilla lleva a «es para iPhone»');
      revisar(errores.length === 0, `Android: sin errores en la consola${errores.length ? ': ' + errores.join(' | ') : ''}`);
      await c.close();
    }

    // ── Computadora ──
    {
      const { c, errores } = await contexto(COMPU, oscuro);
      const p = await c.newPage();
      const id = await crear('excepcion6-' + m);
      await p.goto(`${BASE}/regalo/${id}`);
      await p.getByText('¿En qué teléfono vas a usar Etude?').waitFor();
      await p.locator('#qr svg').waitFor();
      revisar(true, 'Computadora: pregunta el teléfono y dibuja el QR');
      await p.getByRole('checkbox').click({ force: true });
      revisar((await p.getByRole('link', { name: /Canjear/ }).count()) === 0 && (await p.evaluate(() => document.activeElement.textContent)) === 'iPhone', 'Computadora: sin teléfono elegido, la casilla no pide código y lleva a elegirlo');
      await foto(p, `${m}-compu-1-abre`);
      await p.getByRole('button', { name: 'Android' }).click();
      await p.getByText('Este regalo es para iPhone').waitFor();
      revisar((await p.getByRole('link', { name: 'Descargar Etude en Google Play' }).count()) === 1, 'Computadora → Android: «es para iPhone»');
      await foto(p, `${m}-compu-2-android`);
      await p.getByRole('button', { name: 'Elegir otro teléfono' }).click();
      await p.getByRole('button', { name: 'iPhone' }).click();
      await p.getByRole('checkbox').click();
      await p.getByRole('link', { name: 'Canjear en el App Store' }).waitFor();
      revisar(true, 'Computadora → iPhone: la casilla da el canje del App Store');
      await foto(p, `${m}-compu-3-iphone`);
      revisar(errores.length === 0, `Computadora: sin errores en la consola${errores.length ? ': ' + errores.join(' | ') : ''}`);
      await c.close();
    }
  }

  // Lo que quedó en el registro del servidor: ningún código.
  const todo = [...mundo.registro.log, ...mundo.registro.error].join('\n');
  revisar(!puestos.some((r) => todo.includes(r.split('-').slice(1).join('-'))), 'Servidor: ningún código en el registro');

  await navegador.close();
  s.close();
  console.log(`\n${fallas.length ? fallas.length + ' FALLAS' : 'todo bien'}`);
  process.exit(fallas.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
