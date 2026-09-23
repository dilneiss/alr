use crate::response_learner::KnowledgeArticle;
use serde::{Deserialize, Serialize};

/// 20 Distinct High-Demand Real-World Business Niches for Omnichannel / WhatsApp Support
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BusinessNiche {
    Ecommerce,         // 1. E-commerce & Varejo Online
    Fintech,           // 2. Fintech, Bancos Digitais & Meios de Pagamento
    Saas,              // 3. SaaS & Plataformas B2B
    Healthcare,        // 4. Saúde, Clínicas & Telemedicina
    Edtech,            // 5. Educação, Cursos Online & EdTech
    RealEstate,        // 6. Imobiliárias, Condomínios & Locação
    TelecomIsp,        // 7. Telecom & Provedores de Internet (ISP)
    TravelHospitality, // 8. Turismo, Companhias Aéreas & Hotelaria
    FoodDelivery,      // 9. Delivery, Restaurantes & Dark Kitchens
    Insurance24h,      // 10. Seguros & Assistência 24h
    Logistics,         // 11. Logística, Transportadoras & Fretes
    Automotive,        // 12. Automotivo, Concessionárias & Oficinas
    HumanResources,    // 13. Recursos Humanos & Recrutamento (DP)
    Legal,             // 14. Jurídico & Escritórios de Advocacia
    BeautyWellness,    // 15. Estética, Salões de Beleza & Barbearias
    FitnessGym,        // 16. Academias, Estúdios & Fitness
    PetVeterinary,     // 17. Pets, Clínicas Veterinárias & Pet Shops
    SolarEnergy,       // 18. Energia Solar, Engenharia & Utilities
    EventTicketing,    // 19. Eventos, Shows & Ingressos
    Construction,      // 20. Construção Civil, Reformas & Arquitetura
}

impl BusinessNiche {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ecommerce => "ecommerce",
            Self::Fintech => "fintech",
            Self::Saas => "saas",
            Self::Healthcare => "healthcare",
            Self::Edtech => "edtech",
            Self::RealEstate => "real_estate",
            Self::TelecomIsp => "telecom_isp",
            Self::TravelHospitality => "travel_hospitality",
            Self::FoodDelivery => "food_delivery",
            Self::Insurance24h => "insurance_24h",
            Self::Logistics => "logistics",
            Self::Automotive => "automotive",
            Self::HumanResources => "human_resources",
            Self::Legal => "legal",
            Self::BeautyWellness => "beauty_wellness",
            Self::FitnessGym => "fitness_gym",
            Self::PetVeterinary => "pet_veterinary",
            Self::SolarEnergy => "solar_energy",
            Self::EventTicketing => "event_ticketing",
            Self::Construction => "construction",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Ecommerce => "E-commerce & Varejo",
            Self::Fintech => "Fintech & Bancos Digitais",
            Self::Saas => "SaaS & Plataformas B2B",
            Self::Healthcare => "Saúde & Clínicas",
            Self::Edtech => "Educação & Cursos",
            Self::RealEstate => "Imobiliárias & Locação",
            Self::TelecomIsp => "Telecom & Provedores ISP",
            Self::TravelHospitality => "Turismo & Hotelaria",
            Self::FoodDelivery => "Delivery & Gastronomia",
            Self::Insurance24h => "Seguros & Assistência 24h",
            Self::Logistics => "Logística & Fretes",
            Self::Automotive => "Automotivo & Oficinas",
            Self::HumanResources => "RH & Departamento Pessoal",
            Self::Legal => "Jurídico & Advocacia",
            Self::BeautyWellness => "Estética & Beleza",
            Self::FitnessGym => "Academias & Fitness",
            Self::PetVeterinary => "Pets & Veterinária",
            Self::SolarEnergy => "Energia Solar & Utilities",
            Self::EventTicketing => "Eventos & Ingressos",
            Self::Construction => "Construção & Reformas",
        }
    }

    pub fn icon(&self) -> &'static str {
        match self {
            Self::Ecommerce => "🛒",
            Self::Fintech => "💳",
            Self::Saas => "💻",
            Self::Healthcare => "🏥",
            Self::Edtech => "🎓",
            Self::RealEstate => "🏢",
            Self::TelecomIsp => "📡",
            Self::TravelHospitality => "✈️",
            Self::FoodDelivery => "🍔",
            Self::Insurance24h => "🛡️",
            Self::Logistics => "🚚",
            Self::Automotive => "🚗",
            Self::HumanResources => "👥",
            Self::Legal => "⚖️",
            Self::BeautyWellness => "✂️",
            Self::FitnessGym => "🏋️",
            Self::PetVeterinary => "🐾",
            Self::SolarEnergy => "☀️",
            Self::EventTicketing => "🎟️",
            Self::Construction => "🏗️",
        }
    }

    pub fn all_niches() -> &'static [BusinessNiche] {
        &[
            Self::Ecommerce,
            Self::Fintech,
            Self::Saas,
            Self::Healthcare,
            Self::Edtech,
            Self::RealEstate,
            Self::TelecomIsp,
            Self::TravelHospitality,
            Self::FoodDelivery,
            Self::Insurance24h,
            Self::Logistics,
            Self::Automotive,
            Self::HumanResources,
            Self::Legal,
            Self::BeautyWellness,
            Self::FitnessGym,
            Self::PetVeterinary,
            Self::SolarEnergy,
            Self::EventTicketing,
            Self::Construction,
        ]
    }

    pub fn from_str_loose(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "ecommerce" | "varejo" | "loja" => Self::Ecommerce,
            "fintech" | "banco" | "pix" | "cartao" => Self::Fintech,
            "saas" | "b2b" | "software" => Self::Saas,
            "healthcare" | "saude" | "clinica" | "medico" => Self::Healthcare,
            "edtech" | "educacao" | "curso" | "escola" => Self::Edtech,
            "real_estate" | "imobiliaria" | "aluguel" => Self::RealEstate,
            "telecom_isp" | "telecom" | "provedor" | "internet" => Self::TelecomIsp,
            "travel_hospitality" | "turismo" | "voo" | "hotel" => Self::TravelHospitality,
            "food_delivery" | "delivery" | "restaurante" => Self::FoodDelivery,
            "insurance_24h" | "seguro" | "guincho" | "sinistro" => Self::Insurance24h,
            "logistics" | "logistica" | "transportadora" | "frete" => Self::Logistics,
            "automotive" | "automotivo" | "oficina" | "carro" => Self::Automotive,
            "human_resources" | "rh" | "dp" | "holerite" => Self::HumanResources,
            "legal" | "juridico" | "advogado" | "processo" => Self::Legal,
            "beauty_wellness" | "estetica" | "beleza" | "barbearia" => Self::BeautyWellness,
            "fitness_gym" | "academia" | "fitness" | "treino" => Self::FitnessGym,
            "pet_veterinary" | "pet" | "veterinaria" | "vet" => Self::PetVeterinary,
            "solar_energy" | "energia_solar" | "solar" | "kwh" => Self::SolarEnergy,
            "event_ticketing" | "eventos" | "ingressos" | "show" => Self::EventTicketing,
            "construction" | "construcao" | "obra" | "reforma" => Self::Construction,
            _ => Self::Ecommerce,
        }
    }
}

/// Structured definition of a business niche with canonical knowledge base and templates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NicheDefinition {
    pub niche: BusinessNiche,
    pub name: String,
    pub icon: String,
    pub article: KnowledgeArticle,
    pub default_template: String,
    pub sample_messages: Vec<String>,
}

pub struct NicheRegistry;

impl NicheRegistry {
    pub fn get_definition(niche: BusinessNiche) -> NicheDefinition {
        match niche {
            BusinessNiche::Ecommerce => NicheDefinition {
                niche,
                name: "E-commerce & Varejo".to_string(),
                icon: "🛒".to_string(),
                article: KnowledgeArticle {
                    id: "KB-ECOMM-01".to_string(),
                    title: "Política de Estornos e Rastreamento de Pedidos".to_string(),
                    category: "Varejo Online".to_string(),
                    summary: "Prazos de devolução, estorno bancário e rastreio de mercadorias".to_string(),
                    content: "Compras canceladas têm reembolso estornado em 5 a 10 dias úteis no cartão ou 24h via PIX. Rastreios são ativados em até 24h após despacho.".to_string(),
                    tags: vec!["pedido".into(), "estorno".into(), "rastreio".into(), "entrega".into()],
                },
                default_template: "Olá{{customer_name}}! Localizamos seu pedido {{order_id}}. Confirmamos que sua solicitação referente ao pedido foi processada com sucesso. O código de rastreamento é {{tracking_code}}!".to_string(),
                sample_messages: vec![
                    "Cancelei meu pedido ord_1024 e quero meu reembolso de volta.".into(),
                    "Onde está meu rastreio BR-123456789BR do pedido ord_5521?".into(),
                ],
            },

            BusinessNiche::Fintech => NicheDefinition {
                niche,
                name: "Fintech & Bancos Digitais".to_string(),
                icon: "💳".to_string(),
                article: KnowledgeArticle {
                    id: "KB-FINTECH-01".to_string(),
                    title: "Gestão de Chaves PIX, Contestação de Fatura e Limite".to_string(),
                    category: "Serviços Financeiros".to_string(),
                    summary: "Regras de chargeback, 2ª via de fatura e reemissão de chaves PIX".to_string(),
                    content: "Transações PIX com duplicidade são estornadas em até 1 hora útil pelo Mecanismo Especial de Devolução (MED). Contestações de fatura bloqueiam temporariamente a cobrança sob análise de segurança.".to_string(),
                    tags: vec!["pix".into(), "fatura".into(), "cartao".into(), "limite".into(), "contestacao".into()],
                },
                default_template: "Olá{{customer_name}}! Identificamos a transação {{order_id}}. A contestação da fatura foi acolhida e a cobrança duplicada foi estornada temporariamente sem incidência de encargos.".to_string(),
                sample_messages: vec![
                    "Identifiquei cobrança duplicada no cartão pay_8892 para o pedido ord_2048.".into(),
                    "Meu pix expirou, pode gerar uma segunda via do pagamento tx_pix_9912?".into(),
                ],
            },

            BusinessNiche::Saas => NicheDefinition {
                niche,
                name: "SaaS & Plataformas B2B".to_string(),
                icon: "💻".to_string(),
                article: KnowledgeArticle {
                    id: "KB-SAAS-01".to_string(),
                    title: "Ciclos de Faturamento, Webhooks e Chaves de API".to_string(),
                    category: "Software B2B".to_string(),
                    summary: "Alteração de planos recorrentes, limites de requisições e tokens".to_string(),
                    content: "Planos mensais e anuais podem receber upgrade imediato com faturamento pró-rata. Novas chaves de API secretas são geradas no console de desenvolvedor com rotação sem downtime.".to_string(),
                    tags: vec!["api".into(), "webhook".into(), "plano".into(), "token".into(), "assinatura".into()],
                },
                default_template: "Olá{{customer_name}}! Verificamos a sua assinatura corporativa {{order_id}}. O upgrade de limite foi aplicado imediatamente sem interrupção de serviço. Segue seu novo token seguro!".to_string(),
                sample_messages: vec![
                    "Como funciona o cancelamento da minha assinatura recorrente no plano Pro?".into(),
                    "Nossa API está retornando erro 500 no webhook de pagamentos.".into(),
                ],
            },

            BusinessNiche::Healthcare => NicheDefinition {
                niche,
                name: "Saúde & Clínicas".to_string(),
                icon: "🏥".to_string(),
                article: KnowledgeArticle {
                    id: "KB-HEALTH-01".to_string(),
                    title: "Agendamento de Consultas, Exames e Prescrições".to_string(),
                    category: "Medicina & Diagnóstico".to_string(),
                    summary: "Preparo de exames laboratoriais, receitas digitais e retorno".to_string(),
                    content: "Consultas médicas podem ser reagendadas com até 24h de antecedência. Exames laboratoriais de sangue exigem jejum de 8 a 12 horas. Receitas controladas são assinadas digitalmente com certificado ICP-Brasil.".to_string(),
                    tags: vec!["consulta".into(), "exame".into(), "medico".into(), "receita".into(), "jejum".into()],
                },
                default_template: "Olá{{customer_name}}! Confirmamos o seu agendamento médico com o protocolo {{order_id}}. As orientações de preparo para o seu exame e a confirmação foram enviadas com sucesso.".to_string(),
                sample_messages: vec![
                    "Gostaria de agendar uma consulta com cardiologista para esta semana.".into(),
                    "Preciso da 2ª via da minha receita médica digital assinada.".into(),
                ],
            },

            BusinessNiche::Edtech => NicheDefinition {
                niche,
                name: "Educação & Cursos".to_string(),
                icon: "🎓".to_string(),
                article: KnowledgeArticle {
                    id: "KB-EDTECH-01".to_string(),
                    title: "Certificados de Conclusão, Acesso e Matrículas".to_string(),
                    category: "Ensino & Cursos".to_string(),
                    summary: "Emissão de certificado autenticado e liberação de aulas".to_string(),
                    content: "Certificados digitais com código de autenticidade são liberados automaticamente após a conclusão de 100% da carga horária e aprovação na avaliação final com nota mínima de 7.0.".to_string(),
                    tags: vec!["certificado".into(), "matricula".into(), "portal".into(), "aulas".into()],
                },
                default_template: "Olá{{customer_name}}! Localizamos seu registro acadêmico {{order_id}}. Seu certificado de conclusão do curso foi autenticado e o link de download seguro já está disponível!".to_string(),
                sample_messages: vec![
                    "Concluí as aulas e gostaria de emitir meu certificado autenticado.".into(),
                    "Esqueci minha senha de acesso ao portal do aluno, me envie o link.".into(),
                ],
            },

            BusinessNiche::RealEstate => NicheDefinition {
                niche,
                name: "Imobiliárias & Locação".to_string(),
                icon: "🏢".to_string(),
                article: KnowledgeArticle {
                    id: "KB-IMOB-01".to_string(),
                    title: "Contratos de Locação, 2ª Via de Aluguel e Vistorias".to_string(),
                    category: "Imóveis & Condomínios".to_string(),
                    summary: "Emissão de boletos de locação, reparos e termos de vistoria".to_string(),
                    content: "Boletos de aluguel têm vencimento prorrogado sem encargos caso a data coincida com feriados bancários. Solicitações de reparo estrutural são atendidas pela assistência técnica em até 48 horas úteis.".to_string(),
                    tags: vec!["aluguel".into(), "vistoria".into(), "imovel".into(), "contrato".into()],
                },
                default_template: "Olá{{customer_name}}! Referente ao imóvel do contrato {{order_id}}, emitimos a 2ª via atualizada do boleto de aluguel e confirmamos o agendamento da visita técnica!".to_string(),
                sample_messages: vec![
                    "Preciso da 2ª via do boleto de aluguel deste mês do imóvel contrato ord_3311.".into(),
                    "Gostaria de agendar uma vistoria de entrada com o corretor responsável.".into(),
                ],
            },

            BusinessNiche::TelecomIsp => NicheDefinition {
                niche,
                name: "Telecom & Provedores ISP".to_string(),
                icon: "📡".to_string(),
                article: KnowledgeArticle {
                    id: "KB-ISP-01".to_string(),
                    title: "Suporte Técnico de Fibra Óptica, Sinal e Visitas".to_string(),
                    category: "Telecomunicações".to_string(),
                    summary: "Diagnóstico de ONU/roteador, sinal óptico e agendamento de técnico".to_string(),
                    content: "Testes automatizados de linha reinicializam a porta do switch na OLT em 60 segundos. Se o sinal óptico estiver atenuado abaixo de -27 dBm, é despachada uma equipe de campo prioritária.".to_string(),
                    tags: vec!["internet".into(), "fibra".into(), "sem sinal".into(), "roteador".into(), "visita tecnica".into()],
                },
                default_template: "Olá{{customer_name}}! Abrimos o chamado de suporte técnico {{order_id}}. Realizamos o teste de sinal da sua fibra e a visita técnica foi confirmada para reparo da sua conexão.".to_string(),
                sample_messages: vec![
                    "Minha internet fibra está sem conexão desde cedo, a luz PON está piscando.".into(),
                    "Preciso da 2ª via da fatura do meu plano de internet residencial.".into(),
                ],
            },

            BusinessNiche::TravelHospitality => NicheDefinition {
                niche,
                name: "Turismo & Hotelaria".to_string(),
                icon: "✈️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-TRAVEL-01".to_string(),
                    title: "Remarcação de Passagens, Check-in e Reservas".to_string(),
                    category: "Aviação & Viagens".to_string(),
                    summary: "Políticas tarifárias de remarcação e vouchers de hospedagem".to_string(),
                    content: "Voos cancelados pela companhia dão direito a reacomodação gratuita no próximo voo disponível ou reembolso integral em até 7 dias úteis. O check-in online abre 48 horas antes da decolagem.".to_string(),
                    tags: vec!["voo".into(), "reserva".into(), "checkin".into(), "hotel".into(), "passagem".into()],
                },
                default_template: "Olá{{customer_name}}! Localizamos seu localizador de reserva {{order_id}}. Confirmamos a alteração solicitada para o seu voo e os novos vouchers de embarque já foram emitidos!".to_string(),
                sample_messages: vec![
                    "Meu voo foi cancelado e preciso remarcar para o próximo horário disponível.".into(),
                    "Gostaria de solicitar o cancelamento da reserva de hotel e estorno.".into(),
                ],
            },

            BusinessNiche::FoodDelivery => NicheDefinition {
                niche,
                name: "Delivery & Gastronomia".to_string(),
                icon: "🍔".to_string(),
                article: KnowledgeArticle {
                    id: "KB-FOOD-01".to_string(),
                    title: "Atrasos em Pedidos, Itens Faltantes e Devoluções".to_string(),
                    category: "Alimentação & Entregas".to_string(),
                    summary: "Compensação instantânea para problemas com refeições".to_string(),
                    content: "Caso o pedido atrase mais de 30 minutos além do horário estimado ou falte itens, o valor correspondente é creditado instantaneamente na carteira digital do cliente sem burocracia.".to_string(),
                    tags: vec!["comida".into(), "atrasado".into(), "pedido".into(), "item faltando".into()],
                },
                default_template: "Olá{{customer_name}}! Sentimos muito pelo ocorrido no pedido {{order_id}}. Acionamos o restaurante e o estorno referente ao item foi creditado de imediato na sua conta!".to_string(),
                sample_messages: vec![
                    "Meu pedido de almoço ord_4401 está atrasado há mais de 40 minutos.".into(),
                    "O entregador chegou mas faltou o refrigerante e a sobremesa no pacote.".into(),
                ],
            },

            BusinessNiche::Insurance24h => NicheDefinition {
                niche,
                name: "Seguros & Assistência 24h".to_string(),
                icon: "🛡️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-INSUR-01".to_string(),
                    title: "Abertura de Sinistro, Guincho e Assistência Auto".to_string(),
                    category: "Seguridade & Apólice".to_string(),
                    summary: "Despacho de socorro mecânico e regulação de sinistros".to_string(),
                    content: "O acionamento de guincho 24h é confirmado via geolocalização com chegada estimada em até 45 minutos. Sinistros de colisão exigem envio do boletim de ocorrência para perícia.".to_string(),
                    tags: vec!["guincho".into(), "sinistro".into(), "seguro".into(), "socorro".into(), "apolice".into()],
                },
                default_template: "Olá{{customer_name}}! Registramos o chamado de assistência emergencial {{order_id}}. O guincho parceiro mais próximo já foi despachado para a sua localização com previsão de 35 minutos!".to_string(),
                sample_messages: vec![
                    "Meu carro quebrou na rodovia e preciso acionar o guincho 24 horas urgente.".into(),
                    "Sofri uma colisão traseira e preciso abrir um sinistro para a franquia.".into(),
                ],
            },

            BusinessNiche::Logistics => NicheDefinition {
                niche,
                name: "Logística & Fretes".to_string(),
                icon: "🚚".to_string(),
                article: KnowledgeArticle {
                    id: "KB-LOG-01".to_string(),
                    title: "Conhecimento de Transporte (CT-e) e Ocorrências".to_string(),
                    category: "Transporte de Cargas".to_string(),
                    summary: "Acompanhamento de romaneios, fretes B2B e canhotos digitais".to_string(),
                    content: "A comprovação de entrega digital com foto e assinatura do recebedor é sincronizada em tempo real no portal B2B. Avarias de carga devem ser ressalvadas no ato do recebimento.".to_string(),
                    tags: vec!["cte".into(), "frete".into(), "carga".into(), "romaneio".into(), "canhoto".into()],
                },
                default_template: "Olá{{customer_name}}! Consultamos o CT-e {{order_id}}. A carga encontra-se liberada no centro de distribuição com previsão de entrega mantida dentro da janela agendada!".to_string(),
                sample_messages: vec![
                    "Gostaria de rastrear o status da carga do conhecimento CT-e ord_5521.".into(),
                    "Preciso do comprovante assinado de entrega da nota fiscal ord_6610.".into(),
                ],
            },

            BusinessNiche::Automotive => NicheDefinition {
                niche,
                name: "Automotivo & Oficinas".to_string(),
                icon: "🚗".to_string(),
                article: KnowledgeArticle {
                    id: "KB-AUTO-01".to_string(),
                    title: "Revisões Programadas, Orçamento de Peças e Recall".to_string(),
                    category: "Serviços Mecânicos".to_string(),
                    summary: "Agendamento de manutenções de quilometragem e peças originais".to_string(),
                    content: "Revisões de garantia seguem o checklist oficial da montadora. Peças substituídas têm garantia de 12 meses. O status do veículo em serviço pode ser acompanhado online.".to_string(),
                    tags: vec!["revisao".into(), "pecas".into(), "oficina".into(), "carro".into(), "recall".into()],
                },
                default_template: "Olá{{customer_name}}! Confirmamos o agendamento da revisão do veículo na ordem de serviço {{order_id}}. As peças genuínas já foram reservadas na nossa oficina parceira!".to_string(),
                sample_messages: vec![
                    "Quero agendar a revisão de 30.000 km do meu veículo nesta semana.".into(),
                    "Gostaria de saber o status do reparo da ordem de serviço ord_4401.".into(),
                ],
            },

            BusinessNiche::HumanResources => NicheDefinition {
                niche,
                name: "RH & Departamento Pessoal".to_string(),
                icon: "👥".to_string(),
                article: KnowledgeArticle {
                    id: "KB-RH-01".to_string(),
                    title: "Holerites, Espelho de Ponto e Benefícios Corporativos".to_string(),
                    category: "Gestão de Pessoas".to_string(),
                    summary: "Dúvidas trabalhistas, férias e comprovantes de rendimento".to_string(),
                    content: "Holerites mensais e informes de rendimentos para IRPF ficam disponíveis no autoatendimento até o 5º dia útil. Solicitações de férias devem ser protocoladas com 30 dias de antecedência.".to_string(),
                    tags: vec!["holerite".into(), "ponto".into(), "beneficios".into(), "ferias".into(), "irpf".into()],
                },
                default_template: "Olá{{customer_name}}! Localizamos seu registro funcional {{order_id}}. O espelho de ponto ajustado e a 2ª via do holerite foram liberados com segurança no seu portal do colaborador!".to_string(),
                sample_messages: vec![
                    "Preciso da 2ª via do meu holerite do mês passado para comprovação de renda.".into(),
                    "Identifiquei uma inconsistência no meu espelho de ponto do dia 15.".into(),
                ],
            },

            BusinessNiche::Legal => NicheDefinition {
                niche,
                name: "Jurídico & Advocacia".to_string(),
                icon: "⚖️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-LEGAL-01".to_string(),
                    title: "Andamento de Processos, Prazos e Consultas Jurídicas".to_string(),
                    category: "Direito & Contratos".to_string(),
                    summary: "Acompanhamento processual, publicações em diário oficial e petições".to_string(),
                    content: "Atualizações processuais são compiladas semanalmente a partir das publicações nos diários de justiça. Consultas com advogados especialistas são agendadas de forma presencial ou remota.".to_string(),
                    tags: vec!["processo".into(), "advogado".into(), "andamento".into(), "audiencia".into(), "justica".into()],
                },
                default_template: "Olá{{customer_name}}! Consultamos o processo {{order_id}}. Uma nova movimentação de deferimento foi registrada no tribunal e nosso advogado já protocolou a petição devida!".to_string(),
                sample_messages: vec![
                    "Gostaria de saber o andamento atualizado do meu processo judicial ord_5521.".into(),
                    "Preciso agendar um horário com o advogado para sanar dúvidas contratuais.".into(),
                ],
            },

            BusinessNiche::BeautyWellness => NicheDefinition {
                niche,
                name: "Estética & Beleza".to_string(),
                icon: "✂️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-BEAUTY-01".to_string(),
                    title: "Agendamentos de Procedimentos, Cuidados e Pacotes".to_string(),
                    category: "Estética & Spa".to_string(),
                    summary: "Marcação de horários para cabelo, depilação e estética avançada".to_string(),
                    content: "Procedimentos estéticos requerem ficha de anamnese prévia. Reagendamentos são aceitos sem custo adicional com até 4 horas de antecedência ao horário reservado.".to_string(),
                    tags: vec!["corte".into(), "cabelo".into(), "procedimento".into(), "horario".into(), "barbearia".into()],
                },
                default_template: "Olá{{customer_name}}! Confirmamos sua reserva de horário com protocolo {{order_id}}. Seu especialista já está escalado para o atendimento com todos os protocolos de biossegurança!".to_string(),
                sample_messages: vec![
                    "Gostaria de agendar um horário para corte e barba nesta sexta-feira às 15h.".into(),
                    "Preciso reagendar minha sessão de procedimento estético para a próxima semana.".into(),
                ],
            },

            BusinessNiche::FitnessGym => NicheDefinition {
                niche,
                name: "Academias & Fitness".to_string(),
                icon: "🏋️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-GYM-01".to_string(),
                    title: "Trancamento de Matrícula, Avaliação Física e Horários".to_string(),
                    category: "Saúde & Treinamento".to_string(),
                    summary: "Regras de biometria, cancelamento de planos e treinos personalizados".to_string(),
                    content: "Planos anuais permitem trancamento temporário de até 30 dias por ano sem ônus. Avaliações físicas com bioimpedância são agendadas diretamente pelo app da academia.".to_string(),
                    tags: vec!["academia".into(), "treino".into(), "plano".into(), "trancamento".into(), "bioimpedancia".into()],
                },
                default_template: "Olá{{customer_name}}! Localizamos seu plano fitness {{order_id}}. A solicitação de trancamento temporário da matrícula foi aprovada com sucesso sem cobranças no período!".to_string(),
                sample_messages: vec![
                    "Vou viajar a trabalho e preciso trancar minha matrícula da academia por 20 dias.".into(),
                    "Gostaria de agendar uma reavaliação física com o instrutor da musculação.".into(),
                ],
            },

            BusinessNiche::PetVeterinary => NicheDefinition {
                niche,
                name: "Pets & Veterinária".to_string(),
                icon: "🐾".to_string(),
                article: KnowledgeArticle {
                    id: "KB-PET-01".to_string(),
                    title: "Vacinação Pet, Consultas Veterinárias e Banho/Tosa".to_string(),
                    category: "Cuidado Animal".to_string(),
                    summary: "Carteirinha de vacinação, agendamento de banho e tosa e pronto-socorro".to_string(),
                    content: "Filhotes devem seguir o calendário vacinal V10 e antirrábica antes do primeiro passeio. Banhos medicinais exigem apresentação de receita médica veterinária.".to_string(),
                    tags: vec!["pet".into(), "vacina".into(), "veterinario".into(), "banho".into(), "tosa".into(), "cachorro".into()],
                },
                default_template: "Olá{{customer_name}}! Confirmamos o agendamento pet com o código {{order_id}}. A carteirinha de vacinação do seu pet foi atualizada e o horário de atendimento está reservado com carinho!".to_string(),
                sample_messages: vec![
                    "Quero agendar a vacina anual V10 e antirrábica para o meu cachorro.".into(),
                    "Preciso agendar banho e tosa higiênica para amanhã pela manhã.".into(),
                ],
            },

            BusinessNiche::SolarEnergy => NicheDefinition {
                niche,
                name: "Energia Solar & Utilities".to_string(),
                icon: "☀️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-SOLAR-01".to_string(),
                    title: "Geração Fotovoltaica, Homologação e Créditos de KWh".to_string(),
                    category: "Energia Sustentável".to_string(),
                    summary: "Acompanhamento do parecer de acesso e faturas de compensação".to_string(),
                    content: "A vistoria e troca do medidor bidirecional pela concessionária ocorre em até 7 dias úteis após emissão do parecer. Os créditos de energia excedentes têm validade de 60 meses.".to_string(),
                    tags: vec!["solar".into(), "energia".into(), "kwh".into(), "homologacao".into(), "fatura".into(), "inversor".into()],
                },
                default_template: "Olá{{customer_name}}! Verificamos o projeto solar da unidade consumidora {{order_id}}. A homologação junto à distribuidora foi protocolada e a geração estimada está ativa e gerando créditos!".to_string(),
                sample_messages: vec![
                    "Gostaria de saber o status da homologação do meu sistema de energia solar junto à concessionária.".into(),
                    "Como faço para conferir os créditos de kWh gerados pelo meu inversor fotovoltaico?".into(),
                ],
            },

            BusinessNiche::EventTicketing => NicheDefinition {
                niche,
                name: "Eventos & Ingressos".to_string(),
                icon: "🎟️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-EVENT-01".to_string(),
                    title: "Ingressos Digitais, Meia-Entrada e Reembolso de Shows".to_string(),
                    category: "Entretenimento & Festivais".to_string(),
                    summary: "QR Code de entrada, transferência de titularidade e cancelamento".to_string(),
                    content: "Ingressos digitais com QR Code dinâmico ficam disponíveis na carteira do aplicativo. Em caso de adiamento ou cancelamento do evento, o reembolso integral é garantido sem taxas em até 30 dias.".to_string(),
                    tags: vec!["ingresso".into(), "show".into(), "evento".into(), "qr code".into(), "meia entrada".into()],
                },
                default_template: "Olá{{customer_name}}! Localizamos sua compra de ingressos {{order_id}}. O QR Code de acesso ao evento foi reemitido e a transferência de titularidade foi confirmada com sucesso!".to_string(),
                sample_messages: vec![
                    "Não recebi o e-mail com o QR Code do ingresso para o show deste sábado.".into(),
                    "O evento foi adiado para o próximo mês, como faço para solicitar o estorno do valor?".into(),
                ],
            },

            BusinessNiche::Construction => NicheDefinition {
                niche,
                name: "Construção & Reformas".to_string(),
                icon: "🏗️".to_string(),
                article: KnowledgeArticle {
                    id: "KB-CONST-01".to_string(),
                    title: "Cronograma de Obra, Orçamento de Materiais e Garantia".to_string(),
                    category: "Engenharia & Obras".to_string(),
                    summary: "Acompanhamento de medição, entrega de materiais e assistência pós-obra".to_string(),
                    content: "Entregas de materiais brutos seguem o agendamento da expedição com descarregamento em horário comercial. A assistência técnica estrutural cobre fundações e alvenarias por 5 anos conforme NBR.".to_string(),
                    tags: vec!["obra".into(), "reforma".into(), "material".into(), "orcamento".into(), "cronograma".into()],
                },
                default_template: "Olá{{customer_name}}! Referente ao projeto de obra {{order_id}}, confirmamos que a entrega dos materiais foi programada e a medição técnica foi aprovada pelo engenheiro responsável!".to_string(),
                sample_messages: vec![
                    "Gostaria de saber a previsão de entrega do pedido de materiais de construção ord_4401.".into(),
                    "Preciso solicitar um orçamento para reforma estrutural do projeto ord_3311.".into(),
                ],
            },
        }
    }

    pub fn detect_niche(text: &str) -> BusinessNiche {
        let t = text.to_lowercase();
        if t.contains("guincho")
            || t.contains("sinistro")
            || t.contains("seguradora")
            || t.contains("apólice")
            || t.contains("franquia")
        {
            BusinessNiche::Insurance24h
        } else if t.contains("oficina")
            || (t.contains("revisão") && !t.contains("previsão"))
            || t.contains("veículo")
            || t.contains("concessionária")
            || t.contains("recall")
        {
            BusinessNiche::Automotive
        } else if t.contains("cachorro")
            || t.contains("pet")
            || t.contains("veterinár")
            || t.contains("vacina")
            || t.contains("banho e tosa")
        {
            BusinessNiche::PetVeterinary
        } else if t.contains("academia")
            || t.contains("musculação")
            || t.contains("bioimpedância")
            || (t.contains("treino") && !t.contains("treinamento"))
        {
            BusinessNiche::FitnessGym
        } else if t.contains("médic")
            || t.contains("consulta")
            || t.contains("exame")
            || t.contains("receita médica")
            || t.contains("clínica")
        {
            BusinessNiche::Healthcare
        } else if t.contains("voo")
            || t.contains("hotel")
            || t.contains("passagem aérea")
            || t.contains("hospedagem")
            || t.contains("check-in")
        {
            BusinessNiche::TravelHospitality
        } else if t.contains("almoço")
            || t.contains("lanche")
            || t.contains("restaurante")
            || t.contains("refeição")
            || t.contains("food")
        {
            BusinessNiche::FoodDelivery
        } else if t.contains("internet")
            || t.contains("fibra")
            || t.contains("sem sinal")
            || t.contains("roteador")
            || t.contains("provedor")
        {
            BusinessNiche::TelecomIsp
        } else if t.contains("aluguel")
            || t.contains("imóvel")
            || t.contains("corretor")
            || t.contains("locação")
            || t.contains("vistoria")
        {
            BusinessNiche::RealEstate
        } else if t.contains("solar")
            || t.contains("fotovoltaic")
            || t.contains("inversor")
            || t.contains("kwh")
        {
            BusinessNiche::SolarEnergy
        } else if t.contains("show")
            || t.contains("ingresso")
            || t.contains("festival")
            || t.contains("evento")
        {
            BusinessNiche::EventTicketing
        } else if t.contains("processo judicial")
            || t.contains("advogado")
            || t.contains("petição")
            || t.contains("tribunal")
            || t.contains("jurídic")
        {
            BusinessNiche::Legal
        } else if t.contains("holerite")
            || t.contains("espelho de ponto")
            || t.contains("departamento pessoal")
            || t.contains("férias")
            || t.contains("recursos humanos")
        {
            BusinessNiche::HumanResources
        } else if t.contains("corte e barba")
            || t.contains("estética")
            || t.contains("barbearia")
            || t.contains("salão")
            || t.contains("procedimento estético")
        {
            BusinessNiche::BeautyWellness
        } else if t.contains("material de construção")
            || t.contains("reforma")
            || (t.contains("obra") && !t.contains("cobrança"))
        {
            BusinessNiche::Construction
        } else if t.contains("carga")
            || t.contains("transportadora")
            || t.contains("ct-e")
            || t.contains("romaneio")
            || t.contains("frete")
        {
            BusinessNiche::Logistics
        } else if t.contains("curso")
            || t.contains("certificado")
            || t.contains("aluno")
            || t.contains("faculdade")
            || t.contains("ead")
        {
            BusinessNiche::Edtech
        } else if t.contains("saas")
            || t.contains("software")
            || t.contains("api")
            || t.contains("webhook")
        {
            BusinessNiche::Saas
        } else if t.contains("pix")
            || t.contains("banco digital")
            || t.contains("cartão")
            || t.contains("fatura")
            || (t.contains("cobrança") && !t.contains("obra"))
        {
            BusinessNiche::Fintech
        } else {
            BusinessNiche::Ecommerce
        }
    }
}
