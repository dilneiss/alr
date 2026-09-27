// =============================================================================
// Copiloto de Call de Vendas ALR (TypeSafe Jev Decision Engine)
// Servidor HTTP e Proxy Reverso Isolado - Node.js Puro (Sem Dependências)
// =============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 1. Carregador Manual de Arquivo .env (Zero Dependências)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  try {
    const data = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of data.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn('[ENV] Aviso ao carregar .env:', err.message);
  }
}

loadEnv();

const PORT = parseInt(process.env.PORT || '3001', 10);
const ALR_API_URL = process.env.ALR_API_URL || 'http://localhost:3000/v1/systemone';
const ALR_API_KEY = process.env.ALR_API_KEY || '';

// 2. MIME Types suportados para entrega de assets estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// 3. Função de Despacho HTTP / HTTPS para a nossa API do ALR
function forwardToAlr(bodyBuffer, clientReq, clientRes) {
  const targetUrl = new url.URL(ALR_API_URL);
  const isHttps = targetUrl.protocol === 'https:';
  const transport = isHttps ? https : http;

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyBuffer),
    'User-Agent': 'ALR-Sales-Copilot/1.0',
    'Accept': 'application/json',
  };

  // Se houver chave/token configurado no .env, adiciona no header sem jamais expor ao cliente
  if (ALR_API_KEY && ALR_API_KEY.trim() !== '') {
    headers['Authorization'] = ALR_API_KEY.startsWith('Bearer ')
      ? ALR_API_KEY
      : `Bearer ${ALR_API_KEY}`;
  }

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: 'POST',
    headers,
    timeout: 10000,
  };

  const t0 = Date.now();
  const alrReq = transport.request(options, (alrRes) => {
    const elapsedMs = Date.now() - t0;
    const chunks = [];

    alrRes.on('data', (c) => chunks.push(c));
    alrRes.on('end', () => {
      const respBuffer = Buffer.concat(chunks);
      clientRes.writeHead(alrRes.statusCode || 200, {
        'Content-Type': 'application/json',
        'X-ALR-Proxy-Latency-Ms': String(elapsedMs),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      clientRes.end(respBuffer);
    });
  });

  alrReq.on('timeout', () => {
    alrReq.destroy();
    if (!clientRes.headersSent) {
      clientRes.writeHead(504, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        error: 'Timeout de 10s na conexão com o backend ALR',
        target: ALR_API_URL,
      }));
    }
  });

  alrReq.on('error', (err) => {
    console.error(`[ALR PROXY ERROR] Falha ao conectar em ${ALR_API_URL}:`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        error: `Não foi possível conectar ao motor ALR em ${ALR_API_URL}. Certifique-se de que o ALR está rodando (cargo run -p alr-cli -- playground --port 3000).`,
        details: err.message,
      }));
    }
  });

  alrReq.write(bodyBuffer);
  alrReq.end();
}

// 3.5. Gerador de Quebra de Objeção via Professor LLM / Motor Semântico do ALR
async function generateLlmObjection(customerSpeech, conversationContext) {
  const norm = customerSpeech.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Se houver chave LLM (OpenAI ou OpenRouter), pode consultar a API externa
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || (process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
  const model = process.env.LLM_MODEL || (process.env.OPENROUTER_API_KEY ? 'openai/gpt-4o-mini' : 'gpt-4o-mini');

  if (apiKey && apiKey.trim() !== '') {
    try {
      const payload = JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `Você é o Professor Cognitivo do ALR para Vendas de Agentes de IA para PME.
O cliente soltou uma objeção nova que o vendedor não tem cadastrada.
Responda EXCLUSIVAMENTE um objeto JSON válido (sem markdown, sem blocos de código):
{
  "id": "slug_curto_sem_acentos",
  "name": "Nome Curto da Objeção",
  "triggers": "gatilhos, palavras-chave separadas por virgula",
  "argument": "Argumento persuasivo e direto de 2 a 3 frases para o vendedor falar agora na call."
}`
          },
          {
            role: 'user',
            content: `Contexto anterior da call:\n${conversationContext || 'Nenhum'}\n\nFala do cliente:\n"${customerSpeech}"`
          }
        ],
        temperature: 0.3
      });

      const parsedTarget = new url.URL(`${baseUrl}/chat/completions`);
      const transport = parsedTarget.protocol === 'https:' ? https : http;

      const llmResult = await new Promise((resolve, reject) => {
        const req = transport.request({
          hostname: parsedTarget.hostname,
          port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
          path: parsedTarget.pathname + parsedTarget.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 8000
        }, (res) => {
          const chunks = [];
          res.on('data', (d) => chunks.push(d));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              const content = parsed.choices?.[0]?.message?.content || '';
              const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
              resolve(JSON.parse(cleaned));
            } catch (err) {
              reject(err);
            }
          });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout LLM')); });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      if (llmResult && llmResult.name && llmResult.argument) {
        return {
          id: llmResult.id || llmResult.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: llmResult.name,
          triggers: llmResult.triggers || customerSpeech.slice(0, 50),
          argument: llmResult.argument
        };
      }
    } catch (llmErr) {
      console.warn('[LLM TEACHER] Falha na chamada externa, usando motor semântico local do ALR:', llmErr.message);
    }
  }

  // 2. Motor Semântico Local do ALR (Custo zero, offline e resiliente)
  if (norm.includes('lgpd') || norm.includes('sigilo') || norm.includes('privacidade') || norm.includes('nda') || norm.includes('juridico') || norm.includes('vazar')) {
    return {
      id: 'conformidade_lgpd_sigilo',
      name: 'Conformidade Jurídica & LGPD',
      triggers: 'lgpd, sigilo, privacidade, vazamento, termo de confidencialidade, nda, juridico, compliance',
      argument: 'Entendo perfeitamente a sua preocupação com conformidade! Nossos pipelines seguem rigorosamente a LGPD: todos os dados de clientes são criptografados de ponta a ponta e anonimizados. Assinamos termo formal de confidencialidade e NDA antes de qualquer integração, garantindo que nada é compartilhado ou usado para treinar modelos públicos. Quer que eu te envie o nosso documento de compliance agora no WhatsApp?'
    };
  }

  if (norm.includes('erp') || norm.includes('totvs') || norm.includes('protheus') || norm.includes('sap') || norm.includes('legado') || norm.includes('banco local') || norm.includes('sistema antigo')) {
    return {
      id: 'integracao_sistema_legado',
      name: 'Integração com Sistema Legado / ERP',
      triggers: 'erp, sistema legado, totvs, protheus, sap, banco local, integrar, sistema antigo',
      argument: 'Excelente ponto! Sabemos que você não pode parar a operação para trocar de software. Nosso agente se conecta diretamente a sistemas legados e ERPs via webhooks, APIs REST seguras ou agentes de sincronização local em background. Ele consulta o seu estoque e pedidos em tempo real sem alterar uma única linha do seu sistema atual. Posso te mostrar um caso real rodando em ERP similar ao seu?'
    };
  }

  if (norm.includes('presencial') || norm.includes('visita') || norm.includes('cidade') || norm.includes('balcao') || norm.includes('olho no olho') || norm.includes('loja fisica')) {
    return {
      id: 'suporte_presencial_local',
      name: 'Atendimento Presencial vs Digital',
      triggers: 'presencial, visita, minha cidade, suporte local, atendimento no balcao, olho no olho, loja fisica',
      argument: 'Compreendo o valor do contato presencial! No entanto, o atendimento digital é justamente o canal onde 85% dos seus clientes procuram sua empresa primeiro antes de ir até você. O agente de IA resolve 80% das dúvidas imediatas no WhatsApp e já agenda a visita presencial do cliente qualificado na sua loja com dia e hora marcados. Você potencializa seu espaço físico sem ter que ficar preso ao telefone!'
    };
  }

  if (norm.includes('boleto') || norm.includes('parcela') || norm.includes('permuta') || norm.includes('prazo') || norm.includes('fiado') || norm.includes('forma de pagamento')) {
    return {
      id: 'condicoes_pagamento_prazo',
      name: 'Condições de Pagamento e Prazo',
      triggers: 'boleto, parcelamento, prazo, permuta, cartao, entrada, condicoes facilitadas, fiado',
      argument: 'Totalmente compreensível, o fluxo de caixa é sagrado para o negócio! Temos formatos flexíveis de faturamento com parcelamento via cartão corporativo em até 12x ou faturamento quinzenal conforme o agente for gerando os primeiros resultados comprovados. O objetivo é que o próprio incremento de vendas pague as mensalidades seguintes. Qual formato ficaria mais confortável para a sua operação?'
    };
  }

  // Fallback Genérico Estruturado
  const words = norm.split(/\s+/).filter(w => w.length >= 4);
  const mainKeywords = words.slice(0, 4).join(', ');
  const topicName = words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Condição Específica';

  return {
    id: `obj_${Date.now()}`,
    name: `Ajuste de ${topicName}`,
    triggers: mainKeywords || customerSpeech.slice(0, 40),
    argument: `Essa é uma consideração muito importante para o seu negócio! O nosso agente possui flexibilidade total justamente para se moldar a esse tipo de requisito operacional. Podemos configurar essa regra específica no período de onboarding para garantir que a sua operação funcione exatamente do jeito que você precisa antes de qualquer liberação pública.`
  };
}

// 4. Criação do Servidor HTTP
const server = http.createServer((req, res) => {
  const parsedUrl = new url.URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Habilita preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // ROTA 1: Proxy para a nossa API do ALR (/alr ou /api/alr)
  if ((pathname === '/alr' || pathname === '/api/alr') && req.method === 'POST') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const bodyBuffer = Buffer.concat(chunks);
      forwardToAlr(bodyBuffer, req, res);
    });
    return;
  }

  // ROTA 1.5: Auto-Aprendizado por LLM (/alr/auto-learn ou /api/alr/auto-learn)
  if ((pathname === '/alr/auto-learn' || pathname === '/api/alr/auto-learn') && req.method === 'POST') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const customerSpeech = (body.customer_speech || '').trim();
        const conversationContext = body.conversation_context || '';

        if (!customerSpeech) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'customer_speech é obrigatório' }));
        }

        const learned = await generateLlmObjection(customerSpeech, conversationContext);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({
          success: true,
          learned_objection: learned,
          source: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY ? 'llm_teacher' : 'alr_semantic_teacher',
          cost_usd: 0.0
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ROTA 2: Healthcheck e Informações do Backend (sem expor a chave)
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ALR Copiloto de Call de Vendas',
      alr_api_url: ALR_API_URL,
      has_api_key: Boolean(ALR_API_KEY && ALR_API_KEY.trim() !== ''),
      port: PORT,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // ROTA 3: Entrega de Arquivos Estáticos (index.html, etc.)
  if (req.method === 'GET' || req.method === 'HEAD') {
    let filePath = pathname === '/' ? '/index.html' : pathname;

    // Normaliza caminho e previne directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    let fullPath = path.join(__dirname, safePath);

    // Se não existir na raiz, verifica dentro de ./public
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(__dirname, 'public', safePath);
    }

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(fullPath).pipe(res);
      return;
    }

    // Se for rota desconhecida, serve o index.html como fallback SPA
    const indexPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? path.join(__dirname, 'index.html')
      : path.join(__dirname, 'public', 'index.html');

    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('404 Não Encontrado');
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Método não permitido');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 COPILOTO DE CALL DE VENDAS ALR INICIADO`);
  console.log(`======================================================`);
  console.log(`📡 URL Local:      http://localhost:${PORT}`);
  console.log(`⚡ Proxy ALR API:   ${ALR_API_URL}`);
  console.log(`🔒 Autenticação:   ${ALR_API_KEY ? 'Ativada (Protegida no Backend)' : 'Sem chave (Acesso Direto)'}`);
  console.log(`======================================================\n`);
});

// Tratamento de Encerramento Gracioso
process.on('SIGINT', () => {
  console.log('\nEncerrando Copiloto ALR...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
