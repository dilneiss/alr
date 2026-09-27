// Service Worker em Background para ALR Voz (Manifest V3)

// Configura o painel lateral (Side Panel) para abrir diretamente ao clicar no ícone
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn("Falha ao configurar comportamento do sidePanel:", err);
    });
  }
});

// Listener para mensagens vindas do painel lateral ou content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_BROWSER_ACTION") {
    handleBrowserAction(message.action, message.params)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true; // Resposta assíncrona
  }
});

// Executa as ações reais de controle de navegador
async function handleBrowserAction(action, params = {}) {
  switch (action) {
    case "abrir_site": {
      let targetUrl = params.url || "https://www.youtube.com";
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && (!activeTab.url || activeTab.url.startsWith("chrome://") || activeTab.url === "about:blank")) {
        return await chrome.tabs.update(activeTab.id, { url: targetUrl });
      } else {
        return await chrome.tabs.create({ url: targetUrl });
      }
    }

    case "pesquisar": {
      const query = encodeURIComponent(params.query || "");
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = activeTab && activeTab.url ? activeTab.url : "";

      let searchUrl = "";
      if (currentUrl.includes("youtube.com") || (params.platform && params.platform.toLowerCase() === "youtube")) {
        searchUrl = `https://www.youtube.com/results?search_query=${query}`;
      } else if (currentUrl.includes("google.com")) {
        searchUrl = `https://www.google.com/search?q=${query}`;
      } else if (params.platform && params.platform.toLowerCase() === "google") {
        searchUrl = `https://www.google.com/search?q=${query}`;
      } else if (currentUrl.includes("mercadolivre.com")) {
        searchUrl = `https://lista.mercadolivre.com.br/${query}`;
      } else {
        // Padrão inteligente: busca no YouTube se a fala mencionar ou estiver no YouTube, senão Google
        searchUrl = `https://www.google.com/search?q=${query}`;
      }

      if (activeTab && activeTab.id) {
        return await chrome.tabs.update(activeTab.id, { url: searchUrl });
      } else {
        return await chrome.tabs.create({ url: searchUrl });
      }
    }

    case "trocar_aba": {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length <= 1) return { notice: "Apenas uma aba aberta" };

      const activeIndex = tabs.findIndex((t) => t.active);
      let targetIndex = 0;

      if (params.direction === "anterior") {
        targetIndex = activeIndex > 0 ? activeIndex - 1 : tabs.length - 1;
      } else {
        // Próxima aba por padrão
        targetIndex = (activeIndex + 1) % tabs.length;
      }

      const targetTab = tabs[targetIndex];
      if (targetTab && targetTab.id) {
        await chrome.tabs.update(targetTab.id, { active: true });
        return { switched_to: targetTab.title, index: targetIndex };
      }
      break;
    }

    case "nova_aba": {
      return await chrome.tabs.create({ url: params.url || "chrome://newtab" });
    }

    case "fechar_aba": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        await chrome.tabs.remove(activeTab.id);
        return { closed: true };
      }
      break;
    }

    case "voltar": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        await chrome.tabs.goBack(activeTab.id);
        return { navigated: "back" };
      }
      break;
    }

    case "avancar": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        await chrome.tabs.goForward(activeTab.id);
        return { navigated: "forward" };
      }
      break;
    }

    case "recarregar": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        await chrome.tabs.reload(activeTab.id);
        return { reloaded: true };
      }
      break;
    }

    case "rolar_pagina": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        const direction = params.direction || "baixo";
        const delta = direction === "cima" ? -600 : 600;
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: (d) => {
            window.scrollBy({ top: d, behavior: "smooth" });
          },
          args: [delta],
        });
        return { scrolled: direction };
      }
      break;
    }

    default:
      console.log("Ação não reconhecida:", action);
      return { status: "ignored" };
  }
}
