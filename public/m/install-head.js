/**
 * Runs before React on /m/:slug install & pwa routes.
 * iOS reads document.title + apple-touch-icon at "Add to Home Screen" time —
 * must be set before the SPA boots (Pixieset serves these from the server).
 */
(function () {
  var path = location.pathname;
  var match = path.match(/^\/m\/([^/]+)(?:\/(pwa))?\/?$/);
  if (!match) return;

  var slug = decodeURIComponent(match[1]);
  var isPwaRoute = match[2] === 'pwa';
  var encodedSlug = encodeURIComponent(slug);
  var manifestHref = '/m/' + encodedSlug + '/manifest.json';

  document.documentElement.classList.add('mg-public-route');

  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (node) {
    node.parentNode.removeChild(node);
  });

  if (!document.querySelector('link[rel="manifest"]')) {
    var manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = manifestHref;
    document.head.appendChild(manifest);
  }

  ['apple-mobile-web-app-capable', 'mobile-web-app-capable'].forEach(function (name) {
    if (!document.querySelector('meta[name="' + name + '"]')) {
      var meta = document.createElement('meta');
      meta.name = name;
      meta.content = 'yes';
      document.head.appendChild(meta);
    }
  });

  function isIosSafari() {
    var ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|GSA|Gmail/i.test(ua);
  }

  function isInAppBrowser() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      if (/GSA|Gmail|FBIOS|FBAV|FBAN|Instagram|Line\//i.test(ua)) return true;
      if (/AppleWebKit/i.test(ua) && !/Safari/i.test(ua)) return true;
    }
    return false;
  }

  if (!isPwaRoute && isIosSafari() && !isInAppBrowser()) {
    history.replaceState({}, document.title, '/m/' + encodedSlug + '/pwa');
  }

  if (isPwaRoute) {
    var standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
    if (!standalone) {
      window.location.replace('/m/' + encodedSlug);
    }
  }

  function applyManifest(data) {
    if (!data) return;
    if (data.name) document.title = data.name;
    var icons = data.icons || [];
    for (var i = 0; i < icons.length; i++) {
      var src = icons[i] && icons[i].src;
      if (!src) continue;
      if (src.indexOf('//') === 0) src = 'https:' + src;
      var touch = document.createElement('link');
      touch.rel = 'apple-touch-icon';
      touch.href = src;
      document.head.appendChild(touch);
      break;
    }
  }

  fetch(manifestHref)
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(applyManifest)
    .catch(function () {});
})();
