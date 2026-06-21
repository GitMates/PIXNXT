/**
 * Runs before React on /m/:slug install & pwa routes.
 * iOS reads apple-touch-icon from same-origin URL at Add to Home Screen time.
 */
(function () {
  var path = location.pathname;
  var match = path.match(/^\/m\/([^/]+)(?:\/(pwa))?\/?$/);
  if (!match) return;

  var slug = decodeURIComponent(match[1]);
  var isPwaRoute = match[2] === 'pwa';
  var encodedSlug = encodeURIComponent(slug);
  var manifestHref = '/m/' + encodedSlug + '/manifest.json';
  var iconHref = '/m/' + encodedSlug + '/apple-touch-icon.png';
  var iconSizes = [
    '57x57',
    '60x60',
    '72x72',
    '76x76',
    '114x114',
    '120x120',
    '144x144',
    '152x152',
    '167x167',
    '180x180',
    '192x192',
    '256x256',
    '512x512',
  ];

  document.documentElement.classList.add('mg-public-route');

  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (node) {
    node.parentNode.removeChild(node);
  });

  iconSizes.forEach(function (size) {
    var sized = document.createElement('link');
    sized.rel = 'apple-touch-icon';
    sized.sizes = size;
    sized.href = iconHref;
    document.head.appendChild(sized);
  });

  var defaultIcon = document.createElement('link');
  defaultIcon.rel = 'apple-touch-icon';
  defaultIcon.href = iconHref;
  document.head.appendChild(defaultIcon);

  var preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'image';
  preload.href = iconHref;
  document.head.appendChild(preload);

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
    var appName = data.short_name || data.name;
    if (data.name) document.title = data.name;
    if (appName) {
      var appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (!appTitle) {
        appTitle = document.createElement('meta');
        appTitle.name = 'apple-mobile-web-app-title';
        document.head.appendChild(appTitle);
      }
      appTitle.content = appName;
    }
  }

  fetch(manifestHref)
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(applyManifest)
    .catch(function () {});
})();
