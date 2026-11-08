(function () {
  if (window.__DARK_ALISE_LOADED__) return;
  window.__DARK_ALISE_LOADED__ = true;
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injector.js');
  s.dataset.loadingGif = chrome.runtime.getURL('loading.gif');
  s.dataset.headerGif  = chrome.runtime.getURL('header.gif');
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
})();
