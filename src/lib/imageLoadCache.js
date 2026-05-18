/** Session cache: URLs that successfully decoded in the browser. */
const loadedUrls = new Set();

export function isMediaUrlCached(url) {
  return Boolean(url && loadedUrls.has(url));
}

export function markMediaUrlCached(url) {
  if (url) loadedUrls.add(url);
}

export function clearMediaUrlCache() {
  loadedUrls.clear();
}
