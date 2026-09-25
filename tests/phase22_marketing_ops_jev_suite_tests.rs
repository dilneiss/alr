//! Suíte de Testes de Integração da Fase 22:
//! Motor de Marketing Ops, SEO e Otimização de Anúncios de Alta Performance (JEV Suite)
//!
//! Validação completa das 9 tarefas nativas com custo $0.00 e latência em microssegundos:
//! 1. SearchTermTriage (Google Ads)
//! 2. CreativeTagging (Meta Ads)
//! 3. LandingPageMatch (Ads & SEO)
//! 4. InternalLinkMap (SEO Noul Decision)
//! 5. CannibalizationDetector (SEO)
//! 6. ThinPageGate (Quality & Originality Gate)
//! 7. CitationChecker (GEO - Generative Engine Optimization)
//! 8. CompetitorCitationTracker (GEO Share of Voice)
//! 9. ConvertingTermsGapFinder (Ads -> SEO Bridge)
//!
//! E o motor unificado MarketingOpsEngine.

use alr_agent::marketing_ops::*;

#[test]
fn test_task1_search_term_triage_buyer_and_negatives() {
    let triage_engine = SearchTermTriage::new()
        .with_competitors(vec!["salesforce".to_string(), "hubspot".to_string()]);

    // 1. Termo com alta intenção de compra (Buyer)
    let buyer_query = "comprar plataforma de automacao preco planos";
    let res_buyer = triage_engine.triage(buyer_query);
    assert_eq!(res_buyer.category, SearchIntentCategory::Buyer);
    assert_eq!(res_buyer.recommended_action, TriageAction::AddAsKeyword);
    assert!(res_buyer.confidence >= 0.85);
    assert!(res_buyer.wasted_spend_risk <= 0.10);
    assert!(res_buyer.suggested_negative.is_none());

    // 2. Termo de Candidato a Emprego (JobSeeker) -> Negativação obrigatória
    let job_query = "vagas de emprego analista de marketing salario trabalhe conosco";
    let res_job = triage_engine.triage(job_query);
    assert_eq!(res_job.category, SearchIntentCategory::JobSeeker);
    assert_eq!(res_job.recommended_action, TriageAction::AddNegativePhrase);
    assert!(res_job.wasted_spend_risk >= 0.90);
    assert!(res_job.suggested_negative.is_some());
    let neg = res_job.suggested_negative.as_ref().unwrap();
    assert_eq!(neg.match_type, "phrase");

    // 3. Termo de Lixo / Suporte (Junk) -> Negativação
    let junk_query = "portal do aluno login cancelar boleto 2 via";
    let res_junk = triage_engine.triage(junk_query);
    assert_eq!(res_junk.category, SearchIntentCategory::Junk);
    assert_eq!(res_junk.recommended_action, TriageAction::AddNegativePhrase);
    assert!(res_junk.wasted_spend_risk >= 0.90);

    // 4. Termo de Concorrente (Competitor)
    let comp_query = "alternativa ao salesforce crm";
    let res_comp = triage_engine.triage(comp_query);
    assert_eq!(res_comp.category, SearchIntentCategory::Competitor);
    assert_eq!(res_comp.recommended_action, TriageAction::Monitor);

    // 5. Termo Educacional (Researcher)
    let res_research = triage_engine.triage("como funciona automacao de marketing digital guia");
    assert_eq!(res_research.category, SearchIntentCategory::Researcher);
    assert_eq!(res_research.recommended_action, TriageAction::Monitor);

    // 6. Geração de Lista de Negativas em Lote
    let batch = [
        "vagas estagio ti",
        "login cliente cancelar",
        "comprar software comercial",
        "curriculo rh",
    ];
    let negatives = triage_engine.generate_negative_list(&batch);
    assert_eq!(negatives.len(), 3); // 2 jobs + 1 junk
}

#[test]
fn test_task2_creative_tagging_single_pass() {
    let tagger = CreativeTagging::new();

    // Criativo 1: Agitação de dor + UGC + Teste Grátis + B2B
    let ad_1 = "Cansado de perder vendas por demora no WhatsApp da sua equipe? Conheça o sistema que diretores e CEOs usam. Teste grátis por 14 dias sem cartão de crédito.";
    let res_1 = tagger.tag(ad_1, Some("video ugc"));
    assert_eq!(res_1.hook_type, HookType::ProblemAgitation);
    assert_eq!(res_1.ad_format, AdFormat::UgcVideo);
    assert_eq!(res_1.offer_type, OfferType::FreeTrial);
    assert_eq!(res_1.target_audience, TargetAudience::B2bDecisionMaker);
    assert!(res_1.overall_confidence >= 0.90);

    // Criativo 2: Prova Social + Carrossel + Desconto + Agência
    let ad_2 = "Mais de 1.400 clientes atendidos e faturou mais de 10 milhões. Deslize para o lado e veja como gestores de tráfego e agências aumentam o ROI. 50% de desconto no primeiro mês.";
    let res_2 = tagger.tag(ad_2, None);
    assert_eq!(res_2.hook_type, HookType::SocialProof);
    assert_eq!(res_2.ad_format, AdFormat::Carousel);
    assert_eq!(res_2.offer_type, OfferType::DiscountPercentage);
    assert_eq!(res_2.target_audience, TargetAudience::AgencyMarketer);

    // Criativo 3: Contrariano / Quebra de mito + Lead Magnet + Tech Dev
    let ad_3 = "Pare de achar que IA substitui bons engenheiros. Baixe o ebook e template gratuito com código para desenvolvedores e APIs.";
    let res_3 = tagger.tag(ad_3, None);
    assert_eq!(res_3.hook_type, HookType::Contrarian);
    assert_eq!(res_3.offer_type, OfferType::LeadMagnet);
    assert_eq!(res_3.target_audience, TargetAudience::TechSavvyPro);

    // Criativo 4: Consultoria Gratuita + Dono de Pequeno Negócio
    let ad_4 = "Como organizar as finanças do seu negócio local? Agende uma consultoria gratuita com nossos especialistas para pequenos comércios.";
    let res_4 = tagger.tag(ad_4, None);
    assert_eq!(res_4.offer_type, OfferType::FreeConsultation);
    assert_eq!(res_4.target_audience, TargetAudience::SmallBusinessOwner);
}

#[test]
fn test_task3_landing_page_match_scoring() {
    let matcher = LandingPageMatch::new();

    // Caso A: Alinhamento Forte (Strong Match)
    let ad_perfect = AdPromise {
        headline: "Automação de Atendimento WhatsApp".to_string(),
        body_copy: "50% de desconto no plano anual. Comece seu teste grátis.".to_string(),
        promised_offer: Some("50% de desconto".to_string()),
        promised_price: Some("R$ 99,00".to_string()),
        cta_text: "Começar Teste Grátis".to_string(),
        target_keyword: Some("automacao de atendimento whatsapp".to_string()),
    };
    let page_perfect = LandingPageContent {
        url: "https://empresa.com/whatsapp".to_string(),
        title: "Automação de Atendimento WhatsApp Oficial".to_string(),
        h1: "Automação de Atendimento WhatsApp para Empresas".to_string(),
        body_snippet: "Obtenha 50% de desconto no plano anual por apenas R$ 99,00 mensais."
            .to_string(),
        displayed_offers: vec!["50% de desconto".to_string()],
        displayed_price: Some("R$ 99,00".to_string()),
        cta_buttons: vec!["Começar Teste Grátis".to_string()],
    };
    let res_perfect = matcher.evaluate_match(&ad_perfect, &page_perfect);
    assert_eq!(res_perfect.status, MatchStatus::StrongMatch);
    assert!(res_perfect.composite_score >= 8.5);
    assert!(res_perfect.detected_discrepancies.is_empty());

    // Caso B: Divergência Crítica (Poor Match)
    let ad_mismatch = AdPromise {
        headline: "Software de Gestão Financeira R$ 29".to_string(),
        body_copy: "Teste grátis por 30 dias sem cartão com 50% OFF.".to_string(),
        promised_offer: Some("50% OFF".to_string()),
        promised_price: Some("R$ 29".to_string()),
        cta_text: "Criar Conta Grátis".to_string(),
        target_keyword: Some("software financeiro".to_string()),
    };
    let page_mismatch = LandingPageContent {
        url: "https://empresa.com/contabilidade".to_string(),
        title: "Serviços Contábeis para Empresas".to_string(),
        h1: "Contabilidade Consultiva Especializada".to_string(),
        body_snippet: "Planos a partir de R$ 500 ao mês para empresas de médio porte.".to_string(),
        displayed_offers: vec![],
        displayed_price: Some("R$ 500".to_string()),
        cta_buttons: vec!["Falar com Consultor".to_string()],
    };
    let res_mismatch = matcher.evaluate_match(&ad_mismatch, &page_mismatch);
    assert_eq!(res_mismatch.status, MatchStatus::PoorMatch);
    assert!(res_mismatch.composite_score < 6.0);
    assert!(!res_mismatch.detected_discrepancies.is_empty());
    assert!(!res_mismatch.optimization_suggestions.is_empty());
}

#[test]
fn test_task4_internal_link_map_noul_decision() {
    let link_engine = InternalLinkMap::new();

    let pillar = InternalPageDoc {
        url: "https://empresa.com/marketing-digital-guia".to_string(),
        title: "Guia Definitivo de Marketing Digital".to_string(),
        topic_cluster: "Marketing Digital".to_string(),
        depth_level: 1,
        target_keywords: vec!["marketing digital".to_string()],
        body_summary: "Visão geral sobre canais, estratégias de tráfego e conversão.".to_string(),
    };

    let cluster_child = InternalPageDoc {
        url: "https://empresa.com/email-marketing-dicas".to_string(),
        title: "Estratégias de Email Marketing e Automação".to_string(),
        topic_cluster: "Marketing Digital".to_string(),
        depth_level: 2,
        target_keywords: vec!["email marketing".to_string()],
        body_summary: "Aprofundamento sobre fluxos automatizados e taxas de abertura de email."
            .to_string(),
    };

    let unrelated = InternalPageDoc {
        url: "https://empresa.com/vagas-carreira".to_string(),
        title: "Trabalhe Conosco".to_string(),
        topic_cluster: "Institucional".to_string(),
        depth_level: 1,
        target_keywords: vec!["trabalhe conosco".to_string()],
        body_summary: "Oportunidades de emprego na empresa.".to_string(),
    };

    // 1. Pillar para Cluster Child -> Deve linkar (PillarToCluster)
    let dec_down = link_engine.evaluate_link_pair(&pillar, &cluster_child);
    assert!(dec_down.should_link);
    assert_eq!(
        dec_down.topical_relationship,
        TopicalRelationship::PillarToCluster
    );
    assert!(dec_down.link_strength >= 0.85);
    assert_eq!(dec_down.recommended_anchor_text, "email marketing");

    // 2. Cluster Child para Pillar -> Deve linkar (ClusterToPillar)
    let dec_up = link_engine.evaluate_link_pair(&cluster_child, &pillar);
    assert!(dec_up.should_link);
    assert_eq!(
        dec_up.topical_relationship,
        TopicalRelationship::ClusterToPillar
    );
    assert_eq!(dec_up.anchor_type, AnchorType::ExactMatch);

    // 3. Auto-link proibido
    let dec_self = link_engine.evaluate_link_pair(&pillar, &pillar);
    assert!(!dec_self.should_link);
    assert_eq!(
        dec_self.topical_relationship,
        TopicalRelationship::SelfOrIrrelevant
    );

    // 4. Páginas não correlacionadas
    let dec_unrelated = link_engine.evaluate_link_pair(&cluster_child, &unrelated);
    assert!(!dec_unrelated.should_link);

    // 5. Matriz de links
    let matrix = link_engine.build_matrix(&[pillar, cluster_child, unrelated]);
    assert_eq!(matrix.len(), 6); // 3 * 2 pares
}

#[test]
fn test_task5_cannibalization_detector() {
    let detector = CannibalizationDetector::new();

    // Páginas A e B canibalizando a mesma palavra-chave "crm para vendas"
    let page_a = PageSeoProfile {
        url: "https://empresa.com/crm-para-vendas".to_string(),
        title: "Melhor CRM para Vendas B2B".to_string(),
        primary_intent_query: "crm para vendas".to_string(),
        secondary_queries: vec![
            "software de crm".to_string(),
            "sistema de vendas".to_string(),
        ],
        h1: "CRM para Vendas: Acelere seu Fechamento".to_string(),
        body_snippet: "O melhor crm para vendas e pipeline comercial.".to_string(),
        monthly_organic_traffic: 4500,
        average_ranking: 3.5,
    };

    let page_b = PageSeoProfile {
        url: "https://empresa.com/software-crm-vendas".to_string(),
        title: "Software CRM para Vendas".to_string(),
        primary_intent_query: "crm para vendas".to_string(),
        secondary_queries: vec!["software de crm".to_string()],
        h1: "Software CRM para Equipe Comercial".to_string(),
        body_snippet: "Software crm para vendedores baterem metas.".to_string(),
        monthly_organic_traffic: 620,
        average_ranking: 9.8,
    };

    let report_severe = detector.detect(&page_a, &page_b);
    assert_eq!(report_severe.severity, CannibalizationSeverity::Severe);
    assert_eq!(
        report_severe.recommended_action,
        CannibalizationAction::MergeSecondIntoFirst
    );
    assert!(report_severe.keyword_overlap_ratio >= 0.50);
    assert!(report_severe.actionable_plan.contains("301"));

    // Páginas com intenções distintas (sem canibalização)
    let page_c = PageSeoProfile {
        url: "https://empresa.com/como-calcular-cac".to_string(),
        title: "Como Calcular CAC: Fórmula e Planilha".to_string(),
        primary_intent_query: "como calcular cac".to_string(),
        secondary_queries: vec!["custo de aquisicao de clientes".to_string()],
        h1: "Como Calcular o CAC da sua Empresa".to_string(),
        body_snippet: "Passo a passo com fórmula completa de custo de aquisição.".to_string(),
        monthly_organic_traffic: 2800,
        average_ranking: 2.1,
    };

    let report_none = detector.detect(&page_a, &page_c);
    assert_eq!(report_none.severity, CannibalizationSeverity::None);
    assert_eq!(
        report_none.recommended_action,
        CannibalizationAction::KeepBoth
    );
}

#[test]
fn test_task6_thin_page_gate_content_quality() {
    let gate = ThinPageGate::new().with_threshold(7.0);

    // Caso 1: Conteúdo Raso e com Clichês de IA -> BLOQUEADO
    let thin_page = PageContentInput {
        url: "https://empresa.com/post-raso".to_string(),
        title: "Dicas Rápidas de Marketing".to_string(),
        word_count: 180,
        text_body: "No mundo acelerado de hoje, e crucial lembrar que marketing e importante. Como sabemos, vale a pena ressaltar que clientes buscam solucoes. Em conclusao, faca bom trabalho.".to_string(),
        h2_headings: vec!["Introdução".to_string()],
        has_images_or_media: false,
        code_or_data_points: 0,
        structured_lists_count: 0,
    };
    let verdict_thin = gate.evaluate_page(&thin_page);
    assert_eq!(verdict_thin.status, GateStatus::BlockedThinPage);
    assert!(verdict_thin.overall_quality_score < 7.0);
    assert!(verdict_thin.boilerplate_penalty > 0.0);
    assert!(!verdict_thin.corrective_checklist.is_empty());

    // Caso 2: Artigo Rico, Aprofundado e com Dados -> APROVADO
    let rich_page = PageContentInput {
        url: "https://empresa.com/estudo-benchmarks-vendas-2026".to_string(),
        title: "Relatório de Benchmarks de Vendas 2026".to_string(),
        word_count: 1650,
        text_body: "Analisamos dados empíricos de 450 empresas no Brasil durante 12 meses. Identificamos que a taxa de conversão média aumentou 34.2% ao reduzir o tempo de primeira resposta para menos de 60 segundos.".to_string(),
        h2_headings: vec![
            "Metodologia da Pesquisa".to_string(),
            "Impacto do Tempo de Resposta".to_string(),
            "Benchmarks por Segmento de Mercado".to_string(),
            "Plano de Implementação Prático".to_string(),
            "Conclusão e Próximos Passos".to_string(),
        ],
        has_images_or_media: true,
        code_or_data_points: 12,
        structured_lists_count: 4,
    };
    let verdict_rich = gate.evaluate_page(&rich_page);
    assert_eq!(verdict_rich.status, GateStatus::ApprovedForPublication);
    assert!(verdict_rich.overall_quality_score >= 8.0);
    assert!(verdict_rich.originality_score >= 8.0);
    assert!(verdict_rich.information_density_score >= 8.0);
    assert_eq!(verdict_rich.boilerplate_penalty, 0.0);
}

#[test]
fn test_task7_citation_checks_geo() {
    let checker = CitationChecker::new();

    // Resposta citando a marca com destaque positivo e recomendação primária
    let input_positive = EngineCitationInput {
        engine: LlmEngine::Perplexity,
        prompt_query: "Qual a melhor plataforma de automação em Rust no Brasil?".to_string(),
        generated_response: "Para automação em Rust de alta performance, a plataforma ALR destaca-se como líder de mercado no Brasil, oferecendo execução local em microssegundos com custo zero. Saiba mais em https://alr.dev.".to_string(),
        brand_name: "ALR".to_string(),
        brand_aliases: vec!["Autonomous Learning Runtime".to_string()],
        brand_domain: "alr.dev".to_string(),
    };
    let analysis_pos = checker.check_citation(&input_positive);
    assert!(analysis_pos.is_cited);
    assert_eq!(analysis_pos.citation_rank, Some(1));
    assert!(analysis_pos.is_primary_recommendation);
    assert_eq!(analysis_pos.sentiment, CitationSentiment::Positive);
    assert!(analysis_pos.authority_score >= 8.0);
    assert!(analysis_pos.has_link_or_domain);
    assert!(!analysis_pos.extracted_snippets.is_empty());

    // Resposta omitindo a marca completamente
    let input_missed = EngineCitationInput {
        engine: LlmEngine::ChatGpt,
        prompt_query: "Ferramentas recomendadas de CRM".to_string(),
        generated_response: "As opções mais conhecidas são Salesforce, HubSpot e Pipedrive."
            .to_string(),
        brand_name: "ALR".to_string(),
        brand_aliases: vec![],
        brand_domain: "alr.dev".to_string(),
    };
    let analysis_missed = checker.check_citation(&input_missed);
    assert!(!analysis_missed.is_cited);
    assert_eq!(analysis_missed.authority_score, 0.0);

    // Relatório agregado
    let report = checker.aggregate_geo_score("ALR", &[analysis_pos, analysis_missed]);
    assert_eq!(report.total_queries_audited, 2);
    assert_eq!(report.citation_rate_percentage, 50.0);
    assert_eq!(report.sentiment_breakdown.0, 1); // 1 positivo
}

#[test]
fn test_task8_competitor_citation_tracker_sov() {
    let tracker = CompetitorCitationTracker::new();

    let responses = vec![
        LlmAuditEntry {
            engine: LlmEngine::ChatGpt,
            query: "Melhor software para SEO".to_string(),
            generated_response: "Semrush e Ahrefs são os mais populares para auditoria e palavras-chave.".to_string(),
        },
        LlmAuditEntry {
            engine: LlmEngine::Claude,
            query: "Qual plataforma contratar para rankear no Google?".to_string(),
            generated_response: "Semrush é excelente para pesquisa de concorrentes, enquanto Moz tem interface amigável.".to_string(),
        },
        LlmAuditEntry {
            engine: LlmEngine::Gemini,
            query: "Ferramenta de automação em Rust".to_string(),
            generated_response: "Para automação em Rust, a plataforma ALR é referência com execução nativa.".to_string(),
        },
    ];

    let report = tracker.track("ALR", &["Semrush", "Ahrefs", "Moz"], &responses);

    assert_eq!(report.total_responses_audited, 3);
    assert!((report.brand_citation_rate - 33.3).abs() < 0.5);
    assert_eq!(report.dominant_competitor, Some("Semrush".to_string()));
    assert_eq!(report.who_got_cited_instead.len(), 2); // 2 consultas onde ALR não apareceu mas concorrentes sim
    assert!(!report.geo_strategic_recommendations.is_empty());
}

#[test]
fn test_task9_converting_terms_gap_finder() {
    let finder = ConvertingTermsGapFinder::new();

    let paid_terms = vec![
        AdsConvertingTerm {
            query: "calculadora de roi para whatsapp".to_string(),
            conversions: 62,
            conversion_value: 9300.0,
            cost: 1550.0,
            cpa: 25.0,
        },
        AdsConvertingTerm {
            query: "software de automacao comercial hospitalar".to_string(),
            conversions: 18,
            conversion_value: 5400.0,
            cost: 1200.0,
            cpa: 66.6,
        },
        AdsConvertingTerm {
            query: "empresa de marketing digital".to_string(),
            conversions: 40,
            conversion_value: 6000.0,
            cost: 2000.0,
            cpa: 50.0,
        },
    ];

    let indexed = vec![IndexedPage {
        url: "https://empresa.com/agencia-marketing-digital".to_string(),
        title: "Empresa de Marketing Digital Especializada".to_string(),
        target_keywords: vec!["empresa de marketing digital".to_string()],
    }];

    let report = finder.find_gaps(&paid_terms, &indexed);

    assert_eq!(report.total_paid_terms_analyzed, 3);
    assert_eq!(report.uncovered_gaps_count, 2); // "empresa de marketing digital" já tem página!
    assert_eq!(report.total_revenue_opportunity, 14700.0); // 9300 + 5400

    // Validar ordenação por faturamento e formatos gerados
    let first_opp = &report.opportunities[0];
    assert_eq!(
        first_opp.converting_query,
        "calculadora de roi para whatsapp"
    );
    assert_eq!(first_opp.priority, GapPriority::Critical);
    assert_eq!(
        first_opp.recommended_format,
        ContentFormatRecommendation::InteractiveCalculator
    );
    assert!(first_opp.estimated_monthly_organic_savings > 1000.0);
}

#[test]
fn test_marketing_ops_engine_full_demo_and_latency() {
    let engine = MarketingOpsEngine::new();
    let demo_report = engine.run_demo_suite();

    // Validar integridade das 9 amostras
    assert_eq!(
        demo_report.search_triage_sample.category,
        SearchIntentCategory::JobSeeker
    );
    assert_eq!(
        demo_report.creative_tagging_sample.hook_type,
        HookType::ProblemAgitation
    );
    assert_eq!(
        demo_report.landing_page_match_sample.status,
        MatchStatus::StrongMatch
    );
    assert!(demo_report.internal_link_decision_sample.should_link);
    assert_eq!(
        demo_report.cannibalization_report_sample.severity,
        CannibalizationSeverity::Severe
    );
    assert_eq!(
        demo_report.thin_page_verdict_sample.status,
        GateStatus::BlockedThinPage
    );
    assert!(demo_report.citation_analysis_sample.is_cited);
    assert_eq!(
        demo_report.competitor_citation_sample.dominant_competitor,
        Some("Semrush".to_string())
    );
    assert_eq!(
        demo_report
            .converting_gap_report_sample
            .uncovered_gaps_count,
        2
    );

    // Validação estrita de latência do pipeline completo (deve rodar em < 50.000 microssegundos = 50ms)
    println!(
        "Pipeline Total Latency: {} microssegundos",
        demo_report.total_pipeline_latency_micros
    );
    assert!(demo_report.total_pipeline_latency_micros < 50_000);
}
