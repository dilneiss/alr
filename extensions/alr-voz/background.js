// Service Worker em Background para ALR Voz (Manifest V3)

// Cache de Idempotência para evitar qualquer disparo duplicado
const recentActions = new Map();

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
    // Trava de Idempotência: impede execução duplicada (2x) do mesmo comando em menos de 1800ms
    const actionKey = `${message.action}:${JSON.stringify(message.params)}`;
    const now = Date.now();
    const lastTime = recentActions.get(actionKey) || 0;

    if (now - lastTime < 1800) {
      console.log("[ALR Anti-Duplication] Descartando disparo repetido em janela de 1.8s:", actionKey);
      sendResponse({ success: true, deduplicated: true, status: "ignored_duplicate" });
      return true;
    }
    recentActions.set(actionKey, now);

    handleBrowserAction(message.action, message.params)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true; // Resposta assíncrona
  }

  if (message.type === "CAPTURE_AND_ANALYZE_SCREEN") {
    captureAndAnalyzeScreen(message.backendUrl || "http://localhost:3000")
      .then((report) => sendResponse({ success: true, report }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true;
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

      // Se a aba ativa já for exatamente o site solicitado, apenas foca sem abrir abas duplicadas
      if (activeTab && activeTab.url && isSameDomain(activeTab.url, targetUrl)) {
        return { updated: true, current_tab: activeTab.id, note: "Site já ativo nesta aba" };
      }

      // Se a aba ativa estiver em branco ou página inicial, atualiza ela mesma
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
        // Tenta primeiro preencher a busca na página ativa sem recarregar tudo
        if (activeTab && activeTab.id && currentUrl.includes("youtube.com")) {
          try {
            const inPageResp = await chrome.tabs.sendMessage(activeTab.id, {
              type: "IN_PAGE_SEARCH",
              query: params.query || ""
            });
            if (inPageResp && inPageResp.success) {
              return { in_page_search: true, platform: "youtube" };
            }
          } catch (e) {
            // Continua para navegação direta caso a injeção falhe
          }
        }
        searchUrl = `https://www.youtube.com/results?search_query=${query}`;
      } else if (currentUrl.includes("mercadolivre.com") || params.platform === "mercadolivre") {
        searchUrl = `https://lista.mercadolivre.com.br/${query}`;
      } else {
        searchUrl = `https://www.google.com/search?q=${query}`;
      }

      if (activeTab && activeTab.id) {
        return await chrome.tabs.update(activeTab.id, { url: searchUrl });
      } else {
        return await chrome.tabs.create({ url: searchUrl });
      }
    }

    case "clicar_elemento": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) return { success: false, reason: "Nenhuma aba ativa" };

      if (params.mode === "ordinal") {
        return await chrome.tabs.sendMessage(activeTab.id, {
          type: "CLICK_ORDINAL",
          targetType: params.targetType || "link",
          index: params.index || 0
        });
      } else {
        return await chrome.tabs.sendMessage(activeTab.id, {
          type: "CLICK_BY_TEXT",
          text: params.text || ""
        });
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
        return await chrome.tabs.sendMessage(activeTab.id, {
          type: "IN_PAGE_SCROLL",
          direction: params.direction || "baixo"
        });
      }
      break;
    }

    default:
      console.log("Ação não reconhecida:", action);
      return { status: "ignored" };
  }
}

// Captura a tela ativa do Chrome e envia para o motor de visão do ALR
async function captureAndAnalyzeScreen(backendUrl) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !activeTab.id) throw new Error("Nenhuma aba ativa");

  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });

  const resp = await fetch(`${backendUrl}/api/v1/vision/attributes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: dataUrl }),
  });

  if (!resp.ok) throw new Error(`Falha no servidor ALR: ${resp.status}`);
  return await resp.json();
}

function isSameDomain(u1, u2) {
  try {
    const host1 = new URL(u1).hostname.replace("www.", "");
    const host2 = new URL(u2).hostname.replace("www.", "");
    return host1 === host2;
  } catch (e) {
    return false;
  }
}
