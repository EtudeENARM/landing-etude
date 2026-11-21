// Rehace site/assets/regalo-og.png desde herramientas/regalo-og.html (1200 × 630).
// Uso: node herramientas/regalo-og.js   (con Playwright instalado)
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await pagina.goto('file://' + path.join(__dirname, 'regalo-og.html'));
  await pagina.evaluate(() => document.fonts.ready);
  const fuera = path.join(__dirname, '..', 'site', 'assets', 'regalo-og.png');
  await pagina.locator('#og').screenshot({ path: fuera });
  await navegador.close();
  console.log('listo:', fuera);
})();
