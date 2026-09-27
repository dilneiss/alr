// Content script para ALR Voz: Automação Total em Página, Cliques Semânticos & Ordinais

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CLICK_ORDINAL") {
    const result = performOrdinalClick(message.targetType || "link", message.index || 0);
    sendResponse(result);
    return true;
  }

  if (message.type === "CLICK_BY_TEXT") {
    const result = performClickByText(message.text || "");
    sendResponse(result);
    return true;
  }

  if (message.type === "IN_PAGE_SEARCH") {
    const success = performInPageSearch(message.query);
    sendResponse({ success });
    return true;
  }

  if (message.type === "IN_PAGE_SCROLL") {
    let delta = 600;
    if (message.direction === "cima") delta = -600;
    else if (message.direction === "topo") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      sendResponse({ success: true, scrolled: "topo" });
      return true;
    } else if (message.direction === "fim") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      sendResponse({ success: true, scrolled: "fim" });
      return true;
    }
    window.scrollBy({ top: delta, behavior: "smooth" });
    sendResponse({ success: true, delta });
    return true;
  }
});

// Executa clique no N-ésimo elemento visível (ordinal: 1º, 2º, 3º, etc.)
function performOrdinalClick(targetType, index) {
  let candidates = [];

  if (targetType === "video" || window.location.hostname.includes("youtube.com")) {
    // Alvos específicos do YouTube para vídeos e miniaturas
    candidates = Array.from(document.querySelectorAll(
      "ytd-rich-item-renderer a#thumbnail, ytd-video-renderer a#thumbnail, ytd-video-renderer a#video-title, a#thumbnail, ytd-grid-video-renderer a#thumbnail"
    ));
    if (candidates.length === 0) {
      candidates = Array.from(document.querySelectorAll("a[href*='/watch']"));
    }
  }

  if (candidates.length === 0 && targetType === "button") {
    candidates = Array.from(document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']"));
  }

  if (candidates.length === 0) {
    // Busca geral por links visíveis com href
    candidates = Array.from(document.querySelectorAll("a[href]")).filter(a => {
      const href = a.getAttribute("href") || "";
      return href && !href.startsWith("#") && !href.startsWith("javascript:");
    });
  }

  // Filtra apenas os que estão visíveis no DOM
  const visible = candidates.filter(isElementVisible);

  if (visible.length === 0) {
    return { success: false, reason: "Nenhum elemento visível encontrado na página" };
  }

  const targetIndex = Math.min(Math.max(0, index), visible.length - 1);
  const targetElement = visible[targetIndex];

  return triggerElementClick(targetElement, `elemento ordinal #${targetIndex + 1}`);
}

// Clica em botão ou link procurando pelo texto visível
function performClickByText(text) {
  if (!text || text.length < 2) return { success: false, reason: "Texto de busca vazio" };
  const targetNorm = normalizeText(text);

  // Seleciona botões, links e elementos com role button
  const elements = Array.from(document.querySelectorAll(
    "button, a, [role='button'], input[type='button'], input[type='submit'], [tabindex='0']"
  )).filter(isElementVisible);

  let bestMatch = null;
  let bestScore = 0;

  for (const el of elements) {
    const elText = normalizeText(el.innerText || el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "");
    if (!elText) continue;

    if (elText === targetNorm) {
      bestMatch = el;
      bestScore = 100;
      break;
    }

    if (elText.includes(targetNorm)) {
      const score = targetNorm.length / elText.length * 80;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = el;
      }
    }
  }

  if (bestMatch) {
    return triggerElementClick(bestMatch, `texto: "${text}"`);
  }

  return { success: false, reason: `Nenhum elemento visível com o texto "${text}" foi encontrado.` };
}

// Dispara eventos reais de clique com animação de destaque visual
function triggerElementClick(element, description) {
  if (!element) return { success: false };

  // Rola suavemente até o elemento
  element.scrollIntoView({ behavior: "smooth", block: "center" });

  // Destaque visual temporário (halo verde) para o usuário enxergar onde o ALR clicou
  highlightElement(element);

  // Dispara sequência completa de eventos do mouse
  const mouseOpts = { bubbles: true, cancelable: true, view: window };
  element.dispatchEvent(new MouseEvent("mouseenter", mouseOpts));
  element.dispatchEvent(new MouseEvent("mouseover", mouseOpts));
  element.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
  element.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
  element.click();

  const titleOrText = (element.innerText || element.getAttribute("title") || element.getAttribute("aria-label") || description).trim().slice(0, 50);

  return {
    success: true,
    clicked_text: titleOrText,
    href: element.getAttribute("href") || null,
  };
}

// Efeito visual de destaque (Feedback imediato do ALR)
function highlightElement(el) {
  const origOutline = el.style.outline;
  const origBoxShadow = el.style.boxShadow;
  const origTransition = el.style.transition;

  el.style.transition = "all 0.2s ease";
  el.style.outline = "3px solid #10b981";
  el.style.boxShadow = "0 0 16px rgba(16, 185, 129, 0.8)";

  setTimeout(() => {
    el.style.outline = origOutline;
    el.style.boxShadow = origBoxShadow;
    el.style.transition = origTransition;
  }, 1200);
}

// Localiza um campo de busca nativo na página e submete
function performInPageSearch(query) {
  const searchSelectors = [
    'input[name="search_query"]', // YouTube
    'input#search',               // YouTube
    'textarea[name="q"]',         // Google
    'input[name="q"]',            // Google
    'input[type="search"]',       // Genérico HTML5
    'input[placeholder*="pesquisar" i]',
    'input[placeholder*="buscar" i]',
    'input[placeholder*="search" i]',
    'input[name*="search" i]',
  ];

  for (const selector of searchSelectors) {
    const input = document.querySelector(selector);
    if (input && isElementVisible(input)) {
      input.focus();
      input.value = query;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // Tenta Enter
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));

      if (input.form) {
        input.form.submit();
      }

      return true;
    }
  }

  return false;
}

function isElementVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
