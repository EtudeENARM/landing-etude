// Medición de campañas — el único lugar donde se llenan los valores.
// Vacíos, las páginas funcionan igual y no cargan nada de Meta.
window.ETUDE_MEDICION = {
  // Pixel de Meta (Events Manager → Orígenes de datos → el ID del conjunto de datos)
  PIXEL_ID: '',
  // Provider token de App Store Connect (el "pt" que trae su generador de campaign links)
  APPLE_PT: ''
};

(function () {
  var id = window.ETUDE_MEDICION.PIXEL_ID;
  if (!id) return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', id);
  fbq('track', 'PageView');
})();
