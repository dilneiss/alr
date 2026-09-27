// Content script para ALR Voz: Injeta comandos na página ativa

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IN_PAGE_SEARCH") {
    const success = performInPageSearch(message.query);
    sendResponse({ success });
    return true;
  }

  if (message.type === "IN_PAGE_SCROLL") {
    const delta = message.direction === "cima" ? -600 : 600;
    window.scrollBy({ top: delta, behavior: "smooth" });
    sendResponse({ success: true });
    return true;
  }
});

// Tenta localizar um campo de busca nativo na página e submeter
function performInPageSearch(query) {
  // Seletores comuns de caixas de pesquisa em grandes plataformas
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
      // Dispara eventos do DOM para frameworks reativos (React, Vue, Angular)
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // Tenta submeter via teclado Enter
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, which: 13, bubbles: true }));

      // Se houver um formulário pai, submete
      if (input.form) {
        input.form.submit();
      }

      return true;
    }
  }

  return false;
}

function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== "hidden";
}
