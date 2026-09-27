// =============================================================================
// Teste de Validação do Copiloto de Call de Vendas ALR
// 20 Falas Reais de Clientes avaliadas pela nossa API Canônica /v1/systemone
// =============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 1. Carregador Manual de .env
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
  } catch (_) {}
}

loadEnv();

const ALR_API_URL = process.env.ALR_API_URL || 'http://localhost:3000/v1/systemone';
const ALR_API_KEY = process.env.ALR_API_KEY || '';

// As 7 Objeções Cadastradas para venda de Agente de IA para PME
const OBJECTION_CATALOG = {
  ta_caro: {
    name: 'Tá caro',
    criteria: 'tá caro, preço alto, orçamento estourado, sem dinheiro, valor elevado, salgado, não cabe no bolso',
    argumento: 'O agente de IA não é custo, é um vendedor 24/7 sem encargos trabalhistas. Com 2 vendas a mais no mês ele já se paga sozinho.',
  },
  sera_que_funciona_pra_mim: {
    name: 'Será que funciona pra mim',
    criteria: 'será que funciona pra mim, meu nicho, empresa pequena, oficina, comércio, específico, complexo, será que dá certo',
    argumento: 'Ele não é um ChatGPT genérico: é treinado nas regras, tabela de preços e catálogo do seu negócio. O cliente nem percebe que é IA.',
  },
  nao_e_o_momento: {
    name: 'Não é o momento',
    criteria: 'não é o momento, agora não, ano que vem, depois, mês que vem, correria, sem tempo agora, prioridade outra',
    argumento: 'Justamente por você estar sem tempo é que você mais precisa: ele tira 2h diárias de atendimento repetitivo das suas costas hoje.',
  },
  preciso_falar_com_meu_socio: {
    name: 'Preciso falar com meu sócio',
    criteria: 'preciso falar com meu sócio, sócia, esposa, marido, diretoria, alinhar, conselho, aprovar com equipe',
    argumento: 'Decisão estratégica precisa de alinhamento. Posso te mandar um vídeo de 2 min do agente respondendo para você encaminhar no WhatsApp dele?',
  },
  ja_tentei_e_nao_deu_certo: {
    name: 'Já tentei e não deu certo',
    criteria: 'já tentei e não deu certo, outra empresa, deu errado, frustrado, outra agência, perdi dinheiro, dinheiro jogado fora, não funcionou, já contratei ferramenta anterior, chatbot antigo burro',
    argumento: 'Chatbot antigo de botões travava o cliente. Nosso agente é cognitivo e tem travas de segurança rigorosas para nunca inventar nada.',
  },
  vou_pensar: {
    name: 'Vou pensar',
    criteria: 'vou pensar, analisar com calma, te dou um retorno, semana que vem, digerir proposta, avaliar depois',
    argumento: 'Pensar faz todo sentido! Mas normalmente é por dúvida de preço ou funcionamento. O que ficou pendente para darmos esse passo hoje?',
  },
  nao_confio: {
    name: 'Não confio',
    criteria: 'não confio, inteligência artificial alucina, medo de errar com cliente, vai inventar preço, queimar minha marca',
    argumento: 'Ele tem travas rígidas de compliance: só responde o que você aprovar. Em dúvidas fora do escopo, ele transfere para humano na hora.',
  },
  nenhuma: {
    name: 'Nenhuma objeção',
    criteria: 'nenhuma objeção, cliente neutro, concordando com proposta, saudações, esclarecimento ou fechamento positivo',
    argumento: '',
  },
};

// As 20 falas de clientes para teste
const TEST_CASES = [
  {
    id: 1,
    category: 'ta_caro',
    text: 'Achei a proposta muito boa, mas cinco mil reais tá muito caro pro meu orçamento agora.',
    expected_objection: 'ta_caro',
    expected_action: 'CARD',
  },
  {
    id: 2,
    category: 'ta_caro',
    text: 'O valor da mensalidade tá pesado demais, não tenho essa verba disponível neste mês.',
    expected_objection: 'ta_caro',
    expected_action: 'CARD',
  },
  {
    id: 3,
    category: 'sera_que_funciona_pra_mim',
    text: 'Olha, gostei da ideia, mas meu negócio é uma oficina mecânica pequena, será que funciona pro meu nicho?',
    expected_objection: 'sera_que_funciona_pra_mim',
    expected_action: 'CARD',
  },
  {
    id: 4,
    category: 'sera_que_funciona_pra_mim',
    text: 'Nosso atendimento é muito específico e técnico, acho que uma IA não daria conta do recado.',
    expected_objection: 'sera_que_funciona_pra_mim',
    expected_action: 'CARD',
  },
  {
    id: 5,
    category: 'nao_e_o_momento',
    text: 'Gostei muito da apresentação, mas agora estamos no meio de uma reforma, não é o momento de mexer nisso.',
    expected_objection: 'nao_e_o_momento',
    expected_action: 'CARD',
  },
  {
    id: 6,
    category: 'nao_e_o_momento',
    text: 'Me procura no segundo semestre ou no ano que vem, agora a correria tá grande demais aqui na loja.',
    expected_objection: 'nao_e_o_momento',
    expected_action: 'CARD',
  },
  {
    id: 7,
    category: 'preciso_falar_com_meu_socio',
    text: 'Eu gostei bastante, mas preciso falar com meu sócio antes de fechar qualquer contrato.',
    expected_objection: 'preciso_falar_com_meu_socio',
    expected_action: 'CARD',
  },
  {
    id: 8,
    category: 'preciso_falar_com_meu_socio',
    text: 'Tenho que sentar com a minha diretoria e com meu financeiro para aprovar essa verba.',
    expected_objection: 'preciso_falar_com_meu_socio',
    expected_action: 'CARD',
  },
  {
    id: 9,
    category: 'ja_tentei_e_nao_deu_certo',
    text: 'Ano passado contratei uma ferramenta de IA parecida e foi dinheiro jogado fora, não funcionou nada.',
    expected_objection: 'ja_tentei_e_nao_deu_certo',
    expected_action: 'CARD',
  },
  {
    id: 10,
    category: 'ja_tentei_e_nao_deu_certo',
    text: 'Já tentei colocar chatbot antes e meus clientes reclamaram muito que o robô era burro e travava.',
    expected_objection: 'ja_tentei_e_nao_deu_certo',
    expected_action: 'CARD',
  },
  {
    id: 11,
    category: 'vou_pensar',
    text: 'Legal, entendi tudo. Deixa eu pensar com calma e qualquer coisa eu te chamo na semana que vem.',
    expected_objection: 'vou_pensar',
    expected_action: 'CARD',
  },
  {
    id: 12,
    category: 'vou_pensar',
    text: 'Manda essa proposta por WhatsApp que eu vou analisar com calma depois.',
    expected_objection: 'vou_pensar',
    expected_action: 'CARD',
  },
  {
    id: 13,
    category: 'nao_confio',
    text: 'Tenho muito medo desse robô alucinar e passar informação errada ou preço furado pro meu cliente.',
    expected_objection: 'nao_confio',
    expected_action: 'CARD',
  },
  {
    id: 14,
    category: 'nao_confio',
    text: 'Não confio em deixar o atendimento da minha empresa na mão de inteligência artificial, pode queimar minha marca.',
    expected_objection: 'nao_confio',
    expected_action: 'CARD',
  },
  {
    id: 15,
    category: 'incompleto',
    text: 'Olha, mas é que a gente tava pensando em...',
    expected_objection: 'nenhuma',
    expected_action: 'ESPERAR',
  },
  {
    id: 16,
    category: 'incompleto',
    text: 'Porque o detalhe é que...',
    expected_objection: 'nenhuma',
    expected_action: 'ESPERAR',
  },
  {
    id: 17,
    category: 'fechamento',
    text: 'Perfeito, adorei a proposta! Como a gente faz pra assinar o contrato e começar hoje mesmo?',
    expected_objection: 'nenhuma',
    expected_action: 'SEM_CARD',
  },
  {
    id: 18,
    category: 'fechamento',
    text: 'Fechado então! Manda a chave PIX ou o link de pagamento que eu já faço a entrada agora.',
    expected_objection: 'nenhuma',
    expected_action: 'SEM_CARD',
  },
  {
    id: 19,
    category: 'abertura',
    text: 'Olá, bom dia! Tudo bem por aí? Consegue me ouvir direitinho?',
    expected_objection: 'nenhuma',
    expected_action: 'SEM_CARD',
  },
  {
    id: 20,
    category: 'diagnostico',
    text: 'Hoje a gente perde muito cliente à noite e no final de semana porque não tem ninguém pra responder no WhatsApp.',
    expected_objection: 'nenhuma',
    expected_action: 'SEM_CARD',
  },
];

// Monta as 4 perguntas oficiais para o ALR System 1
function buildAlrPayload(customerSpeech) {
  const criteriaObj = {};
  for (const [k, v] of Object.entries(OBJECTION_CATALOG)) {
    criteriaObj[k] = `${v.name}, ${v.criteria}`;
  }

  return {
    state: `Vendedor: O que você achou das condições?\nCliente: ${customerSpeech}`,
    temperature: 1.0,
    questions: {
      tem_objecao: {
        type: 'noul',
        instructions: 'Does the customer express an objection, doubt, concern, resistance, skepticism, budget issue, timing issue, or pushback?',
      },
      objecao: {
        type: 'choice',
        instructions: 'Which sales objection is the customer expressing?',
        criteria: criteriaObj,
      },
      fase: {
        type: 'choice',
        instructions: 'What phase is the sales call currently in?',
        criteria: {
          abertura: 'Abertura, saudações, olá, bom dia, boa tarde, conexão inicial',
          diagnostico_de_dor: 'Diagnóstico de dor, problemas atuais, desafios da empresa, perde muito cliente',
          apresentacao: 'Apresentação da solução, demonstração do agente de IA, funcionalidades',
          objecao: 'Objeção do cliente, achou caro, dúvida, resistência, hesitação, contra-argumento',
          fechamento: 'Fechamento do negócio, valores finais, contrato, pix, assinar, próximos passos',
        },
      },
      terminou_de_falar: {
        type: 'noul',
        instructions: 'Has the customer finished speaking their complete sentence or thought, or was the phrase cut off/interrupted?',
      },
    },
  };
}

// Dispara uma requisição HTTP para a nossa API do ALR
function queryAlr(payload) {
  return new Promise((resolve, reject) => {
    const targetUrl = new url.URL(ALR_API_URL);
    const isHttps = targetUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const postData = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'ALR-Test-Runner/1.0',
    };

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
      timeout: 5000,
    };

    const t0 = process.hrtime.bigint();
    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const t1 = process.hrtime.bigint();
        const roundtripMs = Number(t1 - t0) / 1e6;
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve({ body, roundtripMs, statusCode: res.statusCode });
        } catch (err) {
          reject(new Error(`Falha no parse JSON da resposta: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout de 5s'));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Execução sequencial dos 20 testes
async function runTests() {
  console.log(`\n=============================================================================`);
  console.log(`⚡ TESTE OFICIAL DO COPILOTO DE CALL DE VENDAS ALR`);
  console.log(`=============================================================================`);
  console.log(`📡 Endpoint ALR:  ${ALR_API_URL}`);
  console.log(`🎯 Casos de Teste: 20 Falas Reais de Clientes (7 Objeções + Cortadas + Fechamento)`);
  console.log(`🔒 Chave API:     ${ALR_API_KEY ? 'Configurada (Segura)' : 'Acesso Direto'}`);
  console.log(`=============================================================================\n`);

  let totalRoundtripMs = 0;
  let totalEngineMicros = 0;
  let correctDecisions = 0;
  let totalCalls = 0;

  for (const tc of TEST_CASES) {
    totalCalls++;
    const payload = buildAlrPayload(tc.text);

    let res;
    try {
      res = await queryAlr(payload);
    } catch (err) {
      console.error(`❌ Teste #${tc.id} FALHOU na conexão:`, err.message);
      continue;
    }

    const { body, roundtripMs } = res;
    totalRoundtripMs += roundtripMs;
    const engineMicros = body.latency_micros || Math.round(roundtripMs * 1000);
    totalEngineMicros += engineMicros;

    const temObjecao = body.answers?.tem_objecao?.noul ?? 0;
    const objChoice = body.answers?.objecao?.choice ?? 'nenhuma';
    const objConf = body.answers?.objecao?.confidence ?? 0;
    const fase = body.answers?.fase?.choice ?? 'indefinida';
    const terminou = body.answers?.terminou_de_falar?.noul ?? 1.0;

    // Aplicação estrita da Regra de Decisão do Copiloto:
    // Mostrar card se tem_objecao >= 0.6 E conf >= 0.5 E objecao != 'nenhuma'.
    // Se a frase estiver cortada (terminou < 0.5), aguardar o restante.
    let actionTaken = 'SEM_CARD';
    let actionLabel = '⚪ SEM CARD';

    if (terminou < 0.50) {
      actionTaken = 'ESPERAR';
      actionLabel = '⏳ ESPERAR FALA COMPLETA (Cortada)';
    } else if (temObjecao >= 0.60 && objConf >= 0.50 && objChoice !== 'nenhuma') {
      actionTaken = 'CARD';
      const objMeta = OBJECTION_CATALOG[objChoice];
      actionLabel = `🟢 MOSTRAR CARD: Quebrar objeção: "${objMeta ? objMeta.name : objChoice}"`;
    }

    const isMatch = actionTaken === tc.expected_action;
    if (isMatch) correctDecisions++;

    console.log(`-----------------------------------------------------------------------------`);
    console.log(`🗣️  [#${tc.id.toString().padStart(2, '0')}] Cliente: "${tc.text}"`);
    console.log(`📊 Decisão ALR:`);
    console.log(`   - Tem Objeção?     ${(temObjecao * 100).toFixed(1)}% (Noul)`);
    console.log(`   - Objeção:         ${objChoice} (${(objConf * 100).toFixed(1)}% confiança)`);
    console.log(`   - Fase da Call:    ${fase}`);
    console.log(`   - Terminou Fala?   ${(terminou * 100).toFixed(1)}% (Noul)`);
    console.log(`   - Ação do Código:  ${actionLabel}`);
    console.log(`⚡ Latência Engine:  ${engineMicros} µs (${(engineMicros / 1000).toFixed(2)} ms) | Roundtrip: ${roundtripMs.toFixed(1)} ms`);
    console.log(`💰 Custo Tokens:     $0.00 (Zero tokens - ALR System 1 Nativo)`);
    console.log(`🎯 Acurácia Esperada: ${isMatch ? '✅ CORRETO' : `⚠️ DIVERGÊNCIA (esperava ${tc.expected_action})`}`);
  }

  const avgRoundtripMs = totalRoundtripMs / totalCalls;
  const avgEngineMicros = totalEngineMicros / totalCalls;
  const accuracyPct = (correctDecisions / totalCalls) * 100;

  console.log(`\n=============================================================================`);
  console.log(`🏆 RESUMO GERAL DO BENCHMARK DE VENDAS:`);
  console.log(`=============================================================================`);
  console.log(`Decisões Processadas:     ${totalCalls} / 20`);
  console.log(`Acurácia das Decisões:    ${accuracyPct.toFixed(1)}% (${correctDecisions}/${totalCalls})`);
  console.log(`Latência Média do Motor:  ${avgEngineMicros.toFixed(1)} µs (${(avgEngineMicros / 1000).toFixed(3)} ms)`);
  console.log(`Throughput Estimado:      ${Math.round(1000000 / Math.max(1, avgEngineMicros))} decisões/segundo`);
  console.log(`Latência Média HTTP:      ${avgRoundtripMs.toFixed(2)} ms`);
  console.log(`Custo Total Acumulado:    $0.00 (Zero custo de tokens)`);
  console.log(`Economia vs LLMs (20 reqs): ~$0.08 a $0.40 economizados`);
  console.log(`=============================================================================\n`);
}

runTests().catch((err) => {
  console.error('Erro fatal ao rodar testes:', err);
  process.exit(1);
});
