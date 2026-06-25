(function () {
  var EMBED_ATTR = "data-orizen-src";
  var EMBED_INIT_ATTR = "data-orizen-initialized";

  function parseEmbedUrl(value) {
    try {
      return new URL(value, window.location.href);
    } catch {
      return null;
    }
  }

  function shouldUseDynamicHeight(iframe) {
    var raw = iframe.getAttribute(EMBED_ATTR);
    if (!raw) return true;

    var url = parseEmbedUrl(raw);
    if (!url) return true;

    var dynamicHeight = url.searchParams.get("dynamicHeight");
    if (dynamicHeight === "0") return false;

    return true;
  }

  function normalizeIframe(iframe) {
    if (!iframe.style.border) {
      iframe.style.border = "none";
    }

    if (shouldUseDynamicHeight(iframe)) {
      iframe.style.overflow = "hidden";

      if (!iframe.style.transition) {
        iframe.style.transition = "height 0.2s ease-out";
      }
    }
  }

  function initializeIframe(iframe) {
    if (!(iframe instanceof HTMLIFrameElement)) return;
    if (iframe.getAttribute(EMBED_INIT_ATTR) === "1") return;

    var src = iframe.getAttribute(EMBED_ATTR);
    if (!src) return;

    iframe.setAttribute("src", src);
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute(EMBED_INIT_ATTR, "1");
    normalizeIframe(iframe);
  }

  function loadEmbeds() {
    var iframes = document.querySelectorAll("iframe[" + EMBED_ATTR + "]");
    for (var i = 0; i < iframes.length; i++) {
      initializeIframe(iframes[i]);
    }
  }

  function handleHeightMessage(event) {
    var data = event.data;
    if (!data || data.type !== "EMBED_HEIGHT") return;
    if (typeof data.height !== "number") return;

    var iframes = document.querySelectorAll(
      "iframe[" + EMBED_ATTR + "][" + EMBED_INIT_ATTR + '="1"]',
    );

    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i];

      if (!(iframe instanceof HTMLIFrameElement)) continue;
      if (iframe.contentWindow !== event.source) continue;
      if (!shouldUseDynamicHeight(iframe)) continue;

      var nextHeight = Math.max(220, Math.ceil(data.height));
      iframe.style.height = String(nextHeight) + "px";
      iframe.height = String(nextHeight);
      return;
    }
  }

  window.OrizenFlow = window.OrizenFlow || {};
  window.OrizenFlow.loadEmbeds = loadEmbeds;

  window.addEventListener("message", handleHeightMessage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadEmbeds, { once: true });
  } else {
    loadEmbeds();
  }
})();
