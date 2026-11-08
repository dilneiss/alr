// catalogo-marketing.mjs — Catálogo especializado de marketing e apresentação corporativa.
// Abrange objetos interativos e personagens para Hubiss, CELIT, DataSnap, QualHora e negócios em geral.
// Cada linha: [id, nome, emoji, altura, olha, tipo, ...apelidos]

export const CATALOGO_MARKETING = [
  // ---------- Personagens Corporativos ----------
  ['apresentador', 'Apresentador Comercial', '🎙️', 178, 'frente', 'personagem', 'apresentador', 'apresentadora', 'narrador do negócio', 'speaker', 'consultor comercial'],
  ['tecnico_celular', 'Técnico Especialista em Celular', '🧑‍🔧', 176, 'frente', 'personagem', 'técnico de celular', 'tecnico de celular', 'técnico de bancada', 'especialista em reparo'],
  ['analista_dados', 'Engenheiro de Big Data', '🧑‍💻', 178, 'frente', 'personagem', 'engenheiro de dados', 'analista de logs', 'especialista em clickhouse', 'arquiteto de dados'],
  ['atendente_recepcao', 'Atendente Profissional', '🧑‍💼', 174, 'frente', 'personagem', 'atendente de recepção', 'atendente da clinica', 'recepcionista', 'secretária'],

  // ---------- Hubiss (Dropshipping & Marketplaces) ----------
  ['mkt_esteira_pedidos', 'Esteira de Encomendas', '📦', 150, 'frente', 'objeto', 'esteira de pedidos', 'esteira rolante', 'linha de expedição'],
  ['mkt_caixa_encomenda', 'Pacote de Encomenda Lacrado', '📦', 88, 'frente', 'objeto', 'caixa de encomenda', 'pacote de entrega', 'caixa do produto'],
  ['mkt_etiqueta_frete', 'Impressora de Etiquetas de Frete', '🏷️', 94, 'frente', 'objeto', 'etiqueta de frete', 'impressora de etiqueta', 'etiqueta do marketplace'],
  ['mkt_caminhao_logistica', 'Caminhão de Entrega Rápida', '🚚', 180, 'esq', 'objeto', 'caminhão de entrega', 'caminhao de frete', 'van de entrega'],
  ['mkt_totem_marketplaces', 'Painel Mercado Livre e Shopee', '🛍️', 170, 'frente', 'objeto', 'painel de marketplaces', 'shopee e mercado livre', 'totem de vendas'],
  ['mkt_selo_zero_comissao', 'Selo Zero Comissões', '⭐', 80, 'frente', 'objeto', 'zero comissão', 'sem comissao', 'lucro integral'],

  // ---------- CELIT (Loja de Celular & Assistência Técnica) ----------
  ['mkt_balcao_loja', 'Balcão de Atendimento e Caixa', '🏪', 140, 'frente', 'objeto', 'balcão da loja', 'balcao de atendimento', 'caixa da loja'],
  ['mkt_smartphone_desmontado', 'Smartphone Aberto em Manutenção', '📱', 86, 'frente', 'objeto', 'celular desmontado', 'troca de tela', 'reparo de placa'],
  ['mkt_termo_garantia_os', 'Termo de Garantia de 90 Dias e OS', '📄', 82, 'frente', 'objeto', 'termo de garantia', 'ordem de serviço impressa', 'documento de garantia'],
  ['mkt_lupa_tecnica', 'Microscópio Técnico de Bancada', '🔬', 96, 'frente', 'objeto', 'microscópio de bancada', 'lupa de assistência', 'bancada técnica'],
  ['mkt_pdv_caixa', 'Terminal PDV e Maquininha', '💳', 88, 'frente', 'objeto', 'maquininha de cartão', 'pdv de pagamento', 'terminal de checkout'],
  ['mkt_pilha_seminovos', 'Pilha de Smartphones Seminovos', '📱', 92, 'frente', 'objeto', 'celulares seminovos', 'aparelhos usados no balcão', 'trade in'],

  // ---------- DataSnap (Big Data & Logs ClickHouse) ----------
  ['mkt_servidor_rack', 'Rack de Servidores DataSnap', '🖲️', 200, 'frente', 'objeto', 'servidor de logs', 'rack de dados', 'servidor clickhouse'],
  ['mkt_dashboard_holografico', 'Painel Holográfico de Telemetria', '📊', 160, 'frente', 'objeto', 'painel holográfico', 'gráficos de telemetria', 'dashboard em tempo real'],
  ['mkt_raio_clickhouse', 'Feixe de Consulta Ultrarrápida', '⚡', 120, 'frente', 'objeto', 'consultas em milissegundos', 'velocidade clickhouse', 'raio de consulta'],
  ['mkt_ia_observabilidade', 'IA de Detecção de Anomalias', '🤖', 110, 'frente', 'objeto', 'ia de logs', 'robô de observabilidade', 'alarme de anomalia'],
  ['mkt_moeda_economia', 'Selo 80% Economia em Nuvem', '💰', 80, 'frente', 'objeto', 'economia de nuvem', 'redução de custos', 'custo previsível'],

  // ---------- QualHora (Agendamento Online SaaS) ----------
  ['mkt_calendario_horarios', 'Calendário Interativo de Horários', '🗓️', 150, 'frente', 'objeto', 'calendário de agendamento', 'grade de horários', 'agenda lotada'],
  ['mkt_notificacao_whatsapp', 'Notificação de Lembrete WhatsApp', '💬', 90, 'frente', 'objeto', 'lembrete no whatsapp', 'notificação de consulta', 'aviso de horário'],
  ['mkt_relogio_pontual', 'Relógio de Pontualidade', '⏰', 96, 'frente', 'objeto', 'relógio pontual', 'sem atrasos', 'hora marcada'],
  ['mkt_selo_reducao_faltas', 'Selo 98% Menos Faltas', '🎯', 82, 'frente', 'objeto', 'redução de faltas', '98 por cento menos faltas', 'presença confirmada'],
  ['mkt_poltrona_espera', 'Poltrona Confortável de Recepção', '🛋️', 120, 'frente', 'objeto', 'poltrona de espera', 'recepção da clínica', 'sala de espera'],

  // ---------- Gerais de Negócios & Conversão ----------
  ['mkt_contrato_fechado', 'Contrato Assinado de Sucesso', '🤝', 84, 'frente', 'objeto', 'contrato assinado', 'acordo fechado', 'parceria comercial'],
  ['mkt_grafico_crescimento', 'Gráfico de Vendas Exponencial', '📈', 130, 'frente', 'objeto', 'gráfico de crescimento', 'vendas subindo', 'faturamento em alta'],
  ['mkt_trofeu_sucesso', 'Troféu de Liderança de Mercado', '🏆', 90, 'frente', 'objeto', 'troféu de sucesso', 'campeão de vendas', 'líder do setor'],
];
