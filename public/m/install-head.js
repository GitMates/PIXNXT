/**
 * Runs before React on /m/:slug install & pwa routes.
 * Registers manifest, icons, and service worker early so Android Chrome can install.
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
  var icon192 = '/m/' + encodedSlug + '/icon-192.png';
  var icon512 = '/m/' + encodedSlug + '/icon-512.png';
  var pwaPath = '/m/' + encodedSlug + '/pwa';
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

  function isMobile() {
    var ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  }

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
    if (/Android/i.test(ua) && /(wv|Instagram|FBAV|FBAN)/i.test(ua)) return true;
    return false;
  }

  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  }

  // Email link lands on /m/:slug — send mobile users to gallery + install surface.
  if (!isPwaRoute && isMobile() && !isInAppBrowser() && !isStandalone()) {
    sessionStorage.setItem('mg-pending-install:' + slug, '1');
    location.replace(pwaPath);
    return;
  }

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

  var favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/png';
  favicon.href = icon192;
  document.head.appendChild(favicon);

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

  if (!document.querySelector('meta[name="theme-color"]')) {
    var theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#20a398';
    document.head.appendChild(theme);
  }

  if (isIosSafari() && !isInAppBrowser() && isPwaRoute && !isStandalone()) {
    history.replaceState({}, document.title, pwaPath);
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

  if ('serviceWorker' in navigator && window === window.top) {
    var swScope = '/m/' + encodedSlug + '/';
    navigator.serviceWorker
      .register('/m/sw.js', { scope: swScope })
      .catch(function () {});
  }
})();
