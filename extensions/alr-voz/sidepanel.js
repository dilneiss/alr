// ALR Voz - Controlador de Navegador por Voz Autônomo (sidepanel.js)

// Estado Global da Aplicação
const state = {
  isListening: false,
  recognition: null,
  backendUrl: "http://localhost:3000",
  language: "pt-BR",
  confidenceThreshold: 0.75,
  modelName: "alr-systemone-native-v1",

  // Métricas
  totalCalls: 0,
  canceledCalls: 0,
  totalActions: 0,
  latencies: [],

  // Trava de Idempotência e Anti-Duplicação
  lastExecutedText: "",
  lastExecutedTimestamp: 0,
  isActionExecuting: false,
  lastCompletedPhrase: "",
  // Debounce & Fala
  speechDebounceTimer: null,
  currentTranscript: "",
  recentTranscripts: [],

  // Histórico de Ações Executadas
  actionsLog: [],
};

// Elementos do DOM
const els = {
  statusDot: document.getElementById("header-status-dot"),
  btnToggleMic: document.getElementById("btn-toggle-mic"),
  micBtnLabel: document.getElementById("mic-btn-label"),
  transcriptBubbles: document.getElementById("transcript-bubbles"),

  // Dashboard
  valModelName: document.getElementById("val-model-name"),
  valLastDecision: document.getElementById("val-last-decision"),
  valP50: document.getElementById("val-p50"),
  valCallsCount: document.getElementById("val-calls-count"),
  valCanceledCalls: document.getElementById("val-canceled-calls"),
  valActionsCount: document.getElementById("val-actions-count"),

  // Decisão
  decisionCard: document.getElementById("decision-card"),
  decisionTimeBadge: document.getElementById("decision-time-badge"),
  decisionStatusTitle: document.getElementById("decision-status-title"),
  decisionActionDesc: document.getElementById("decision-action-desc"),
  decisionSpeechQuote: document.getElementById("decision-speech-quote"),
  intentionBarsSection: document.getElementById("intention-bars-section"),
  intentionBarsList: document.getElementById("intention-bars-list"),

  // Log de Ações
  actionsLogList: document.getElementById("actions-log-list"),
  logCountChip: document.getElementById("log-count-chip"),
  btnClearLog: document.getElementById("btn-clear-log"),

  // Settings Modal
  settingsModal: document.getElementById("settings-modal"),
  btnOpenSettings: document.getElementById("btn-open-settings"),
  btnCloseSettings: document.getElementById("btn-close-settings"),
  btnSaveSettings: document.getElementById("btn-save-settings"),
  cfgBackendUrl: document.getElementById("cfg-backend-url"),
  cfgLanguage: document.getElementById("cfg-language"),
  cfgThreshold: document.getElementById("cfg-threshold"),
  cfgThresholdVal: document.getElementById("cfg-threshold-val"),
  cfgModelAlias: document.getElementById("cfg-model-alias"),
};

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  await loadSavedSettings();
  setupEventListeners();
  initSpeechRecognition();
  renderActionsLog();
  // Inicia em modo pronto para clique do usuário (evita bloqueio de permissão de áudio no Chrome)
  updateMicButtonUI(false);
  updateLiveSpeechBubble("Clique em \"Ouvir\" e fale um comando (ex: \"abre o YouTube\", \"pesquisa bolo de cenoura\")...", true);
});

// Carrega configurações e log persistidos
async function loadSavedSettings() {
  if (chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get([
      "backendUrl",
      "language",
      "confidenceThreshold",
      "modelName",
      "totalCalls",
      "totalActions",
      "actionsLog",
    ]);
    if (data.backendUrl) state.backendUrl = data.backendUrl;
    if (data.language) state.language = data.language;
    if (data.confidenceThreshold) state.confidenceThreshold = data.confidenceThreshold;
    if (data.modelName) state.modelName = data.modelName;
    if (data.totalCalls) state.totalCalls = data.totalCalls;
    if (data.totalActions) state.totalActions = data.totalActions;
    if (Array.isArray(data.actionsLog)) state.actionsLog = data.actionsLog;

    // Atualiza campos
    els.cfgBackendUrl.value = state.backendUrl;
    els.cfgLanguage.value = state.language;
    els.cfgThreshold.value = Math.round(state.confidenceThreshold * 100);
    els.cfgThresholdVal.textContent = `${Math.round(state.confidenceThreshold * 100)}%`;
    els.cfgModelAlias.value = state.modelName;
    els.valModelName.textContent = state.modelName;
    updateMetricsUI();
  }
}

// Configura eventos da interface
function setupEventListeners() {
  els.btnToggleMic.addEventListener("click", () => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  els.btnOpenSettings.addEventListener("click", () => {
    els.settingsModal.style.display = "flex";
  });

  els.btnCloseSettings.addEventListener("click", () => {
    els.settingsModal.style.display = "none";
  });

  els.cfgThreshold.addEventListener("input", (e) => {
    els.cfgThresholdVal.textContent = `${e.target.value}%`;
  });

  els.btnClearLog.addEventListener("click", async () => {
    state.actionsLog = [];
    if (chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ actionsLog: [] });
    }
    renderActionsLog();
  });

  els.btnSaveSettings.addEventListener("click", async () => {
    state.backendUrl = els.cfgBackendUrl.value.trim() || "http://localhost:3000";
    state.language = els.cfgLanguage.value;
    state.confidenceThreshold = parseInt(els.cfgThreshold.value, 10) / 100.0;
    state.modelName = els.cfgModelAlias.value.trim() || "alr-systemone-native-v1";
    els.valModelName.textContent = state.modelName;

    if (chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        backendUrl: state.backendUrl,
        language: state.language,
        confidenceThreshold: state.confidenceThreshold,
        modelName: state.modelName,
      });
    }

    els.settingsModal.style.display = "none";
    if (state.recognition) {
      state.recognition.lang = state.language;
    }
  });
}

// Inicializa o reconhecimento de fala contínuo (Web Speech API)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Reconhecimento de fala não suportado neste navegador. Utilize o Google Chrome.");
    return;
  }

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = state.language;

  rec.onstart = () => {
    state.isListening = true;
    updateMicButtonUI(true);
  };

  rec.onend = () => {
    if (state.isListening) {
      try {
        rec.start();
      } catch (err) {
        console.warn("Erro ao reiniciar reconhecimento de fala:", err);
      }
    } else {
      updateMicButtonUI(false);
    }
  };

  rec.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      state.isListening = false;
      updateMicButtonUI(false);
      promptMicrophonePermissionTab();
    } else if (event.error !== "no-speech") {
      console.warn("Speech recognition error:", event.error);
    }
  };

  rec.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }

    const liveText = (final || interim).trim();
    if (!liveText) return;

    state.currentTranscript = liveText;
    updateLiveSpeechBubble(liveText, !final);

    // Debounce inteligente para envio ao ALR
    if (state.speechDebounceTimer) {
      clearTimeout(state.speechDebounceTimer);
      state.canceledCalls += 1;
      els.valCanceledCalls.textContent = `${state.canceledCalls} canceladas por fala nova`;
    }

    // Espera pausa de 550ms na fala para despachar a decisão
    state.speechDebounceTimer = setTimeout(() => {
      dispatchVoiceDecision(state.currentTranscript);
    }, 550);
  };

  state.recognition = rec;
}
async function startListening() {
  if (!state.recognition) initSpeechRecognition();
  state.isListening = true;

  try {
    state.recognition.start();
    updateMicButtonUI(true);
    updateLiveSpeechBubble("🎙️ Ouvindo... Fale um comando agora (ex: 'abre o YouTube', 'pesquisa bolo de cenoura')...", true);
  } catch (err) {
    console.warn("Erro ao iniciar reconhecimento, solicitando permissão:", err);
    promptMicrophonePermissionTab();
  }
}

function promptMicrophonePermissionTab() {
  updateLiveSpeechBubble("⚠️ Autorizando microfone... Uma aba foi aberta no seu Chrome. Clique em 'Permitir Microfone' nela para liberar.", true);
  updateMicButtonUI(false);
  if (chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
  } else {
    window.open("permission.html", "_blank");
  }
}

// Ouve notificação da aba de permissão quando o microfone for autorizado
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "MIC_PERMITTED") {
      if (!state.recognition) initSpeechRecognition();
      state.isListening = true;
      try {
        state.recognition.start();
        updateMicButtonUI(true);
        updateLiveSpeechBubble("🎙️ Microfone autorizado! Ouvindo... Fale um comando agora...", true);
      } catch (err) {
        console.log("Reconhecimento já em execução:", err);
      }
    }
  });
}

function stopListening() {
  state.isListening = false;
  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (e) {}
  }
  updateMicButtonUI(false);
}

function updateMicButtonUI(isActive) {
  if (isActive) {
    els.btnToggleMic.className = "main-mic-btn active";
    els.micBtnLabel.textContent = "Parar";
    els.statusDot.style.backgroundColor = "var(--accent-orange)";
    els.statusDot.style.boxShadow = "0 0 8px rgba(249, 115, 22, 0.7)";
  } else {
    els.btnToggleMic.className = "main-mic-btn idle";
    els.micBtnLabel.textContent = "Ouvir";
    els.statusDot.style.backgroundColor = "var(--text-muted)";
    els.statusDot.style.boxShadow = "none";
  }
}

// Gerenciador Reativo de Bolhas de Fala (Sem repetição da mesma palavra)
function updateLiveSpeechBubble(text, isInterim) {
  if (!els.transcriptBubbles) return;
  const cleanText = (text || "").trim();
  if (!cleanText) return;

  let html = "";

  // Se houver uma frase anterior e for DIFERENTE da atual, exibe acima em cinza
  if (state.lastCompletedPhrase && state.lastCompletedPhrase.toLowerCase() !== cleanText.toLowerCase()) {
    html += `<div class="transcript-bubble" style="color: #64748b; font-size: 13px; margin-bottom: 4px;">${escapeHtml(state.lastCompletedPhrase)}</div>`;
  }

  // Frase ativa atual (branca, exatamente uma linha)
  const interimClass = isInterim ? "interim" : "";
  html += `<div class="transcript-bubble active-live ${interimClass}" id="current-live-bubble">${escapeHtml(cleanText)}</div>`;

  els.transcriptBubbles.innerHTML = html;

  const container = document.getElementById("transcript-container");
  if (container) container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Filtro estrito de ruído: rejeita palavras soltas (ex: "teste", "oi", "bom dia") e sons sem comando claro
function isActionableSpeech(text) {
  const clean = text.trim().toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  // Comandos únicos autorizados explicitamente
  const singleWordCommands = ["voltar", "avançar", "avancar", "recarregar"];
  if (words.length === 1) {
    return singleWordCommands.includes(words[0]);
  }

  // Para 2 ou mais palavras, exige verbo ou expressão imperativa clara de ação de navegador
  const hasActionTrigger = /\b(abre|abrir|acessa|acessar|entra no|entra na|ir para|pesquisa|pesquisar|busca|buscar|procura|procurar|clica|clicar|clique|seleciona|selecionar|aperta|apertar|analisa|analisar|trocar de aba|mudar de aba|muda de aba|próxima aba|aba anterior|fechar aba|fecha a aba|fecha essa aba|nova aba|nova guia|rola para|rolar para|desce a página|sobe a página|volta|voltar|avança|avançar|recarrega|recarregar|atualiza|atualizar|o que tem na tela)\b/i.test(clean);

  return hasActionTrigger;
}

// Envia a fala para o motor System 1 do ALR (/v1/systemone)
async function dispatchVoiceDecision(spokenText) {
  if (!spokenText || spokenText.trim().length < 2) return;

  const cleanCmd = spokenText.trim().toLowerCase();
  const now = Date.now();

  // Trava de Idempotência: impede reexecução da mesma frase falada em menos de 2.000 ms
  if (cleanCmd === state.lastExecutedText && (now - state.lastExecutedTimestamp) < 2000) {
    console.log("[ALR Anti-Duplication] Comando idêntico descartado por idempotência:", cleanCmd);
    return;
  }

  // Impede reentrância de ações enquanto outra está em trânsito
  if (state.isActionExecuting) {
    console.log("[ALR Anti-Duplication] Ação em andamento, descartando disparo concorrente:", cleanCmd);
    return;
  }

  state.totalCalls += 1;
  const t0 = performance.now();


  // Gate Anti-Ruído: se a fala for apenas uma palavra solta (ex: "teste") ou conversa de fundo de vídeo
  if (!isActionableSpeech(spokenText)) {
    const elapsedMs = performance.now() - t0;
    state.latencies.push(elapsedMs);
    updateMetricsTelemetry(elapsedMs);

    els.decisionCard.className = "decision-card state-waiting";
    els.decisionTimeBadge.textContent = `${Math.round(elapsedMs)} ms`;
    els.decisionStatusTitle.textContent = "AGUARDANDO";
    els.decisionActionDesc.textContent = "Fala detectada sem comando claro de ação.";
    els.decisionSpeechQuote.style.display = "block";
    els.decisionSpeechQuote.textContent = `"${spokenText}"`;
    renderIntentionBars({ nenhum: 1.0, abrir_site: 0.0, pesquisar: 0.0 }, "nenhum");
    return;
  }

  state.lastExecutedText = cleanCmd;
  state.lastExecutedTimestamp = now;
  state.isActionExecuting = true;

  // Pergunta tipada de escolha de intenção aberta e universal
  const payload = {
    state: spokenText,
    temperature: 1.0,
    questions: {
      action: {
        type: "choice",
        instructions: "Qual comando explícito de navegador o usuário solicitou?",
        criteria: {
          abrir_site: "Comando verbal explícito para abrir um site ou serviço web (ex: 'abre o YouTube', 'acessa o GitHub')",
          pesquisar: "Comando verbal explícito para pesquisar um termo (ex: 'pesquisa bolo de cenoura', 'busca notícias')",
          clicar_elemento: "Comando para clicar em um link, botão, vídeo ou elemento por ordem ordinal ou por texto (ex: 'clica no terceiro link', 'clica em Entrar')",
          analisar_tela: "Comando para analisar visualmente a tela ativa ou imagem via visão computacional do ALR (ex: 'analisa a tela')",
          trocar_aba: "Comando para mudar de aba (ex: 'trocar de aba', 'próxima aba')",
          fechar_aba: "Comando para encerrar a aba ativa (ex: 'fecha essa aba')",
          nova_aba: "Comando para criar nova guia (ex: 'abre nova aba')",
          rolar_pagina: "Comando de rolagem de página (ex: 'rola para baixo', 'sobe')",
          voltar: "Comando de recuo no histórico (ex: 'volta para a página anterior')",
          avancar: "Comando de avanço no histórico (ex: 'avança para a próxima página')",
          recarregar: "Comando de recarregamento (ex: 'atualiza a página', 'recarregar')",
          nenhum: "Palavras soltas, conversas paralelas, sons de fundo ou falas sem comando explícito de ação"
        }
      }
    }
  };

  let decisionResult = null;
  let elapsedMs = 0;

  try {
    const resp = await fetch(`${state.backendUrl}/v1/systemone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      const data = await resp.json();
      elapsedMs = data.latency_micros ? (data.latency_micros / 1000.0) : (performance.now() - t0);
      decisionResult = parseAlrSystemOneResponse(data, spokenText);
    } else {
      throw new Error(`Status ${resp.status}`);
    }
  } catch (err) {
    elapsedMs = performance.now() - t0;
    decisionResult = evaluateUniversalVoiceCommand(spokenText);
  }

  state.latencies.push(elapsedMs);
  updateMetricsTelemetry(elapsedMs);

  if (decisionResult) {
    await executeAndRenderDecision(decisionResult, spokenText, elapsedMs);
  }
}
// Interpreta a resposta do /v1/systemone do ALR
function parseAlrSystemOneResponse(data, spokenText) {
  const ans = data.answers && data.answers.action;
  if (!ans) return evaluateUniversalVoiceCommand(spokenText);

  const selectedAction = ans.choice || "nenhum";
  const probs = ans.probabilities || {};
  const confidence = ans.confidence || 0.95;

  const executionDetails = resolveUniversalActionParameters(selectedAction, spokenText);

  return {
    action: selectedAction,
    confidence: confidence,
    probabilities: probs,
    displayAction: executionDetails.displayText,
    browserCommand: executionDetails.command,
    params: executionDetails.params,
  };
}

// Avaliador Universal Aberto de Comandos (Sem mapa pré-definido rígido)
// Avaliador de Fallback Calibrado
function evaluateUniversalVoiceCommand(text) {
  const lower = text.toLowerCase();
  let action = "nenhum";
  let probs = {
    abrir_site: 0.0,
    pesquisar: 0.0,
    trocar_aba: 0.0,
    fechar_aba: 0.0,
    voltar: 0.0,
    nenhum: 1.0,
  };

  const hasOpenVerb = /\b(abre|abrir|acessa|acessar|entra no|entra na|ir para)\b/i.test(lower);
  const hasSearchVerb = /\b(pesquisa|pesquisar|busca|buscar|procura|procurar)\b/i.test(lower);
  const hasClickVerb = /\b(clica|clicar|clique|seleciona|selecionar|aperta|apertar)\b/i.test(lower);
  const hasVisionVerb = lower.includes("analisa a tela") || lower.includes("analisar tela") || lower.includes("o que tem na tela") || lower.includes("analisa essa imagem") || lower.includes("extrair cores");

  if (hasVisionVerb) {
    action = "analisar_tela";
    probs.analisar_tela = 1.0;
    probs.nenhum = 0.0;
  } else if (hasClickVerb) {
    action = "clicar_elemento";
    probs.clicar_elemento = 1.0;
    probs.nenhum = 0.0;
  } else if (hasOpenVerb) {
    action = "abrir_site";
    probs.abrir_site = 1.0;
    probs.nenhum = 0.0;
  } else if (hasSearchVerb) {
    action = "pesquisar";
    probs.pesquisar = 1.0;
    probs.nenhum = 0.0;
  } else if (lower.includes("trocar de aba") || lower.includes("mudar de aba") || lower.includes("muda de aba") || lower.includes("próxima aba") || lower.includes("aba anterior")) {
    action = "trocar_aba";
    probs.trocar_aba = 1.0;
    probs.nenhum = 0.0;
  } else if (lower.includes("fecha a aba") || lower.includes("fechar aba") || lower.includes("fecha essa aba")) {
    action = "fechar_aba";
    probs.fechar_aba = 1.0;
    probs.nenhum = 0.0;
  } else if (lower.includes("nova aba") || lower.includes("nova guia")) {
    action = "nova_aba";
    probs.nova_aba = 1.0;
    probs.nenhum = 0.0;
  } else if (lower.includes("volta") || lower.includes("voltar") || lower.includes("página anterior")) {
    action = "voltar";
    probs.voltar = 1.0;
    probs.nenhum = 0.0;
  } else if (lower.includes("avança") || lower.includes("avançar")) {
    action = "avancar";
    probs.avancar = 1.0;
    probs.nenhum = 0.0;
  } else if (lower.includes("recarrega") || lower.includes("atualiza a página") || lower.includes("dar f5")) {
    action = "recarregar";
    probs.recarregar = 1.0;
    probs.nenhum = 0.0;
  } else if (lower.includes("rola para") || lower.includes("rolar para") || lower.includes("desce a página") || lower.includes("sobe a página")) {
    action = "rolar_pagina";
    probs.rolar_pagina = 1.0;
    probs.nenhum = 0.0;
  }
  const executionDetails = resolveUniversalActionParameters(action, text);

  return {
    action,
    confidence: action === "nenhum" ? 0.99 : 0.96,
    probabilities: probs,
    displayAction: executionDetails.displayText,
    browserCommand: executionDetails.command,
    params: executionDetails.params,
  };
}

// Resolução Dinâmica e Aberta de Parâmetros (Qualquer URL, Qualquer Termo)
function resolveUniversalActionParameters(action, text) {
  const lower = text.toLowerCase();

  switch (action) {
    case "abrir_site": {
      // Remove gatilhos verbais estritos
      let target = text.replace(/^(por favor\s+)?(abre o site do|abre o site da|abre o portal do|abre o portal da|abre a página do|abre a página da|abre o|abre a|abrir o|abrir a|acessa o|acessa a|acessar o|acessar a|entra no|entra na|ir para o|ir para a|ir para|abre|abrir|acessa|acessar)\s+/gi, "").trim();
      target = target.replace(/(\s+para mim|\s+por favor|\s+agora)$/gi, "").trim();

      if (!target || target.length < 2) {
        return { command: "none", params: {}, displayText: "aguardando nome do site" };
      }

      // Exige verbo imperativo na fala original
      const hasNavigationVerb = /\b(abre|abrir|acessa|acessar|entra no|entra na|ir para)\b/i.test(text);
      if (!hasNavigationVerb) {
        return { command: "none", params: {}, displayText: "comando incompleto (falta verbo de navegação)" };
      }

      const tLower = target.toLowerCase();

      // Serviços canônicos conhecidos
      if (tLower.includes("youtube")) {
        return { command: "abrir_site", params: { url: "https://www.youtube.com" }, displayText: "abriu YouTube" };
      }
      if (tLower === "google" || tLower === "o google") {
        return { command: "abrir_site", params: { url: "https://www.google.com" }, displayText: "abriu Google" };
      }
      if (tLower.includes("trading desk") || tLower.includes("mesa de trading") || tLower.includes("cockpit")) {
        return { command: "abrir_site", params: { url: "http://localhost:3800" }, displayText: "abriu Trading Desk (Porta 3800)" };
      }
      if (tLower.includes("playground") || tLower.includes("alr web")) {
        return { command: "abrir_site", params: { url: "http://localhost:3000" }, displayText: "abriu Playground ALR (Porta 3000)" };
      }
      if (tLower.includes("mercado livre")) {
        return { command: "abrir_site", params: { url: "https://www.mercadolivre.com.br" }, displayText: "abriu Mercado Livre" };
      }
      if (tLower.includes("github")) {
        return { command: "abrir_site", params: { url: "https://github.com" }, displayText: "abriu GitHub" };
      }
      if (tLower.includes("binance")) {
        return { command: "abrir_site", params: { url: "https://www.binance.com" }, displayText: "abriu Binance" };
      }
      if (tLower.includes("wikipedia") || tLower.includes("wikipédia")) {
        return { command: "abrir_site", params: { url: "https://pt.wikipedia.org" }, displayText: "abriu Wikipédia" };
      }
      if (tLower.includes("g1") || tLower.includes("globo")) {
        return { command: "abrir_site", params: { url: "https://g1.globo.com" }, displayText: "abriu G1 Notícias" };
      }
      if (tLower.includes("netflix")) {
        return { command: "abrir_site", params: { url: "https://www.netflix.com" }, displayText: "abriu Netflix" };
      }
      if (tLower.includes("chatgpt") || tLower.includes("openai")) {
        return { command: "abrir_site", params: { url: "https://chatgpt.com" }, displayText: "abriu ChatGPT" };
      }
      if (tLower.includes("banco central") || tLower.includes("bcb")) {
        return { command: "abrir_site", params: { url: "https://www.bcb.gov.br" }, displayText: "abriu Banco Central do Brasil" };
      }

      // Se for domínio explícito com TLD válido
      if (target.includes(".") && !target.endsWith(".") && !target.includes(" ")) {
        const url = target.startsWith("http") ? target : `https://${target}`;
        return { command: "abrir_site", params: { url }, displayText: `abriu ${target}` };
      }

      // Para qualquer outro termo de site/serviço que não possui domínio com ponto:
      // Em vez de inventar um domínio fake com .com.br, pesquisa no Google!
      return {
        command: "pesquisar",
        params: { query: target, platform: "google" },
        displayText: `pesquisou "${target}" no Google`,
      };
    }

    case "clicar_elemento": {
      const ordinalsMap = {
        "primeiro": 0, "1º": 0, "1o": 0, "primeira": 0,
        "segundo": 1, "2º": 1, "2o": 1, "segunda": 1,
        "terceiro": 2, "3º": 2, "3o": 2, "terceira": 2,
        "quarto": 3, "4º": 3, "4o": 3, "quarta": 3,
        "quinto": 4, "5º": 4, "5o": 4, "quinta": 4,
        "sexto": 5, "6º": 5, "6o": 5,
        "setimo": 6, "sétimo": 6, "7º": 6,
        "oitavo": 7, "8º": 7,
        "nono": 8, "9º": 8,
        "decimo": 9, "décimo": 9, "10º": 9,
        "ultimo": 999, "último": 999,
      };

      let matchedOrdinal = null;
      let ordinalIndex = 0;

      for (const [ordWord, idx] of Object.entries(ordinalsMap)) {
        const reg = new RegExp(`\\b${ordWord}\\b`, "i");
        if (reg.test(lower)) {
          matchedOrdinal = ordWord;
          ordinalIndex = idx;
          break;
        }
      }

      if (matchedOrdinal !== null) {
        let targetType = "link";
        if (lower.includes("video") || lower.includes("vídeo")) targetType = "video";
        else if (lower.includes("botao") || lower.includes("botão")) targetType = "button";

        return {
          command: "clicar_elemento",
          params: { mode: "ordinal", index: ordinalIndex, targetType },
          displayText: `clicou no ${matchedOrdinal} ${targetType}`,
        };
      }

      let cleanTarget = text.replace(/^(por favor\s+)?(clica no botão|clica no|clica na|clica em|clicar no|clicar na|clicar em|clique no|clique na|clique em|clica|clicar|clique|seleciona|selecionar)\s+/gi, "").trim();
      cleanTarget = cleanTarget.replace(/(\s+para mim|\s+por favor)$/gi, "").trim();

      if (cleanTarget.length >= 2) {
        return {
          command: "clicar_elemento",
          params: { mode: "text", text: cleanTarget },
          displayText: `clicou em "${cleanTarget}"`,
        };
      }

      return { command: "none", params: {}, displayText: "aguardando elemento para clicar" };
    }

    case "analisar_tela": {
      return {
        command: "analisar_tela",
        params: { backendUrl: state.backendUrl },
        displayText: "analisou a tela via ALR Vision",
      };
    }

    case "pesquisar": {
      // Extrai qualquer termo livre removendo gatilhos
      let query = text.replace(/agora pesquisa|pesquisa por|pesquisar por|pesquisa|pesquisar|busca por|buscar por|busca|buscar|procura por|procurar por|procura|procurar/gi, "").trim();
      query = query.replace(/para mim|por favor/gi, "").trim();

      let platform = "web";
      if (lower.includes("no youtube") || lower.includes("pelo youtube")) {
        query = query.replace(/no youtube|pelo youtube/gi, "").trim();
        platform = "youtube";
      } else if (lower.includes("no mercado livre") || lower.includes("pelo mercado livre")) {
        query = query.replace(/no mercado livre|pelo mercado livre/gi, "").trim();
        platform = "mercadolivre";
      }

      const cleanQuery = query.replace(/^por\s+/i, "").trim();
      let display = `pesquisou "${cleanQuery}"`;
      if (platform === "youtube") display = `pesquisou "${cleanQuery}" no YouTube`;
      if (platform === "mercadolivre") display = `pesquisou "${cleanQuery}" no Mercado Livre`;

      return {
        command: "pesquisar",
        params: { query: cleanQuery, platform },
        displayText: display,
      };
    }

    case "trocar_aba": {
      const dir = (lower.includes("anterior") || lower.includes("voltar aba")) ? "anterior" : "proxima";
      return { command: "trocar_aba", params: { direction: dir }, displayText: "trocou de aba" };
    }

    case "fechar_aba": {
      return { command: "fechar_aba", params: {}, displayText: "fechou a aba ativa" };
    }

    case "nova_aba": {
      return { command: "nova_aba", params: {}, displayText: "abriu uma nova aba" };
    }

    case "voltar": {
      return { command: "voltar", params: {}, displayText: "voltou para a página anterior" };
    }

    case "avancar": {
      return { command: "avancar", params: {}, displayText: "avançou para a próxima página" };
    }

    case "recarregar": {
      return { command: "recarregar", params: {}, displayText: "recarregou a página" };
    }

    case "rolar_pagina": {
      const dir = (lower.includes("cima") || lower.includes("sobe")) ? "cima" : "baixo";
      return { command: "rolar_pagina", params: { direction: dir }, displayText: `rolou a página para ${dir}` };
    }

    default:
      return { command: "none", params: {}, displayText: "aguardando comando" };
  }
}

// Executa o comando via Background e Atualiza a Interface
async function executeAndRenderDecision(dec, spokenText, elapsedMs) {
  try {
    const isLegitimateAction = dec.action !== "nenhum" && dec.browserCommand !== "none" && dec.confidence >= state.confidenceThreshold;

    if (isLegitimateAction) {
      state.totalActions += 1;

      if (dec.action === "analisar_tela") {
        chrome.runtime.sendMessage({
          type: "CAPTURE_AND_ANALYZE_SCREEN",
          backendUrl: state.backendUrl,
        }, (response) => {
          if (response && response.success && response.report) {
            const rep = response.report;
            const colorInfo = rep.colors ? (rep.colors.dominant_color_name_pt || "analisada") : "analisada";
            const displayReport = `✓ Tela analisada: cor dominante ${colorInfo} (${rep.brightness_desc || "luminosidade normal"})`;
            els.decisionActionDesc.textContent = displayReport;

            addLogEntry({
              heard: spokenText,
              executed: displayReport,
              actionType: "analisar_tela",
              latencyMs: elapsedMs,
              timestamp: formatCurrentTime(),
            });
          }
        });
      } else {
        chrome.runtime.sendMessage({
          type: "EXECUTE_BROWSER_ACTION",
          action: dec.browserCommand,
          params: dec.params,
        });

        addLogEntry({
          heard: spokenText,
          executed: dec.displayAction,
          actionType: dec.action,
          latencyMs: elapsedMs,
          timestamp: formatCurrentTime(),
        });
      }
      archiveCurrentSpeechBubble(spokenText);

      els.decisionCard.className = "decision-card state-acted";
      els.decisionTimeBadge.textContent = `decidido em ${Math.round(elapsedMs)} ms`;
      els.decisionStatusTitle.textContent = "AGIU";
      els.decisionActionDesc.textContent = dec.displayAction;
    } else {
      els.decisionCard.className = "decision-card state-waiting";
      els.decisionTimeBadge.textContent = `${Math.round(elapsedMs)} ms`;
      els.decisionStatusTitle.textContent = "AGUARDANDO";
      els.decisionActionDesc.textContent = "Comando não executado (certeza insuficiente ou sem ação clara).";
    }

    els.decisionSpeechQuote.style.display = "block";
    els.decisionSpeechQuote.textContent = `"${spokenText}"`;

    renderIntentionBars(dec.probabilities, dec.action);
    updateMetricsUI();
  } finally {
    state.isActionExecuting = false;
  }
}

// Renderiza as barras horizontais no Card
function renderIntentionBars(probabilities, winningAction) {
  els.intentionBarsSection.style.display = "flex";
  els.intentionBarsList.innerHTML = "";

  const entries = Object.entries(probabilities || {});
  entries.sort((a, b) => b[1] - a[1]);

  const topItems = entries.slice(0, 3);
  if (topItems.length === 0) {
    topItems.push([winningAction, 1.0]);
  }

  topItems.forEach(([actionName, probVal]) => {
    const isWinner = actionName === winningAction;
    const formattedLabel = formatIntentionLabel(actionName);
    const formattedProb = probVal.toFixed(2).replace(".", ",");

    const row = document.createElement("div");
    row.className = `intention-bar-row ${isWinner ? "winner" : ""}`;
    row.innerHTML = `
      <span class="intention-label">${formattedLabel}</span>
      <span class="intention-prob-val">${formattedProb}</span>
    `;
    els.intentionBarsList.appendChild(row);
  });
}

function formatIntentionLabel(raw) {
  const map = {
    abrir_site: "abrir site",
    pesquisar: "pesquisar",
    trocar_aba: "trocar de aba",
    fechar_aba: "fechar aba",
    nova_aba: "nova aba",
    voltar: "voltar",
    avancar: "avançar",
    rolar_pagina: "rolar página",
    nenhum: "nenhum"
  };
  return map[raw] || raw.replace("_", " ");
}

// Arquiva balão de fala anterior
function archiveCurrentSpeechBubble(text) {
  const existing = document.getElementById("current-live-bubble");
  if (existing) {
    existing.id = "";
    existing.className = "transcript-bubble";
    existing.textContent = text;
  }
}

// Adiciona um item ao Log de Ações Executadas
function addLogEntry(entry) {
  state.actionsLog.unshift(entry);
  if (state.actionsLog.length > 50) {
    state.actionsLog.pop();
  }

  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ actionsLog: state.actionsLog }).catch(() => {});
  }

  renderActionsLog();
}

// Renderiza a lista visual de histórico de ações
function renderActionsLog() {
  if (!els.actionsLogList) return;

  els.logCountChip.textContent = state.actionsLog.length;

  if (state.actionsLog.length === 0) {
    els.actionsLogList.innerHTML = `<div class="log-empty-msg">Nenhuma ação realizada nesta sessão. Fale um comando para iniciar.</div>`;
    return;
  }

  let html = "";
  state.actionsLog.forEach((item) => {
    const badgeLabel = formatIntentionLabel(item.actionType).toUpperCase();
    const latText = item.latencyMs < 1 ? `${Math.round(item.latencyMs * 1000)} µs` : `${Math.round(item.latencyMs)} ms`;

    html += `
      <div class="log-card-item">
        <div class="log-card-top">
          <span class="log-action-badge">${badgeLabel}</span>
          <span class="log-time-stamp">${item.timestamp}</span>
        </div>
        <div class="log-card-heard">"${item.heard}"</div>
        <div class="log-card-executed">✓ ${item.executed}</div>
        <div class="log-card-meta">
          <span>Latência: ${latText}</span>
          <span style="color: var(--accent-green);">Custo: $0.00</span>
        </div>
      </div>
    `;
  });

  els.actionsLogList.innerHTML = html;
}

function formatCurrentTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Atualiza o painel de métricas no dashboard
function updateMetricsTelemetry(lastMs) {
  els.valLastDecision.textContent = lastMs < 1 ? `${Math.round(lastMs * 1000)} µs` : `${Math.round(lastMs)} ms`;

  if (state.latencies.length > 0) {
    const sorted = [...state.latencies].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    els.valP50.textContent = mid < 1 ? `${Math.round(mid * 1000)} µs` : `${Math.round(mid)} ms`;
  }

  updateMetricsUI();
}

function updateMetricsUI() {
  els.valCallsCount.textContent = state.totalCalls;
  els.valActionsCount.textContent = state.totalActions;
}
