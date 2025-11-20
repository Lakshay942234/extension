// captions_inject.js
(function() {
  let overlay;
  let visible = false;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = '__asl_captions_overlay__';
    overlay.style.position = 'fixed';
    overlay.style.left = '50%';
    overlay.style.bottom = '5%';
    overlay.style.transform = 'translateX(-50%)';
    overlay.style.maxWidth = '80%';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.color = '#fff';
    overlay.style.padding = '8px 12px';
    overlay.style.borderRadius = '6px';
    overlay.style.fontSize = '16px';
    overlay.style.lineHeight = '1.4';
    overlay.style.zIndex = '2147483647';
    overlay.style.pointerEvents = 'none';
    overlay.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    overlay.style.display = 'none';
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function show(text) {
    const el = ensureOverlay();
    el.textContent = text || '';
    el.style.display = 'block';
    visible = true;
  }

  function hide() {
    if (!overlay) return;
    overlay.style.display = 'none';
    visible = false;
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'captions_update') {
      const content = (msg.text || '').trim();
      if (content) show(content);
    } else if (msg.type === 'captions_hide') {
      hide();
    } else if (msg.type === 'captions_show') {
      show(msg.text || '');
    }
  });
})();
