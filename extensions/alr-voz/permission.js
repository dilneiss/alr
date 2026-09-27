// permission.js - Solicitação de Permissão de Microfone para o ALR Voz

const btn = document.getElementById("btn-request-permission");
const statusEl = document.getElementById("status-msg");

async function askPermission() {
  statusEl.textContent = "Aguardando confirmação do microfone no Chrome...";
  statusEl.className = "status-msg";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Fecha os tracks para liberar o microfone para o speech recognition
    stream.getTracks().forEach((track) => track.stop());

    statusEl.textContent = "✓ Microfone Autorizado com Sucesso! Fechando aba...";
    statusEl.className = "status-msg success";

    if (chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ micPermissionGranted: true });
    }

    // Avisa o painel lateral para iniciar o reconhecimento de fala imediatamente
    chrome.runtime.sendMessage({ type: "MIC_PERMITTED" });

    setTimeout(() => {
      window.close();
    }, 900);
  } catch (err) {
    console.error("Erro ao solicitar microfone:", err);
    statusEl.textContent = "⚠️ Acesso ao microfone foi negado ou bloqueado no navegador.";
    statusEl.className = "status-msg";
  }
}

btn.addEventListener("click", askPermission);

// Tenta acionar automaticamente ao abrir a aba
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    askPermission();
  }, 250);
});
