use alr_agent::a2a::{A2APipelineRunner, DiffEngine, DiffPreviewReport};
use alr_agent::background_tasks::BackgroundTaskManager;
use alr_agent::categorizer::{cosine_similarity, ProductCatalogItem, ProductCategorizerEngine};
use alr_agent::context_manager::{ContextCompactor, ToolResultOffloader};
use alr_agent::domain_cases::{
    BrowserActionSupervisor, CustomerWorkflowEngine, DroneTelemetryEvaluator,
    MediaSegmentClassifier, SilentApiFailureDetector,
};
use alr_agent::recipes::{
    AmountExtractor, CitationChecker, CitationVerdict, DateExtractionRecipe, EntityAligner,
    EntityAlignmentReport, ExtractedAmount, FeatureExtractorRecipe, FunctionCallingRecipe,
    HierarchicalClassifier, PhoneValidator, RagFilterRecipe, RerankRecipe, SemanticSearchRecipe,
    SkillSuggestionRecipe, SqlGuardrail, SqlGuardrailVerdict, StructureRecoveryRecipe,
    VerificationGateRecipe, VerifiedPhoneNumber,
};
use alr_agent::systemone::{SystemOneEngine, SystemOneRequest, SystemOneResponse};
use alr_execution::emergency::GlobalEmergencyStop;
use alr_execution::mouse::{MouseController, MouseCoordinates, NativeDesktopMouseController};
use alr_execution::notification::{DesktopNotificationService, ThreatLevel, WindowsToastNotifier};
use alr_memory::{
    QdrantSemanticMemoryStore, SemanticMemory, SemanticMemoryStore, SemanticMemoryType,
    SemanticQuery,
};
use alr_perception::attributes::VisualAttributeExtractor;
use alr_perception::cctv::{CctvSurveillanceEngine, PerimeterZone};
use alr_perception::error_detector::ScreenErrorDetector;
use alr_perception::image::{RawImage, RgbaColor};
use alr_spatial::city_routing::{
    CityOptimizationPlan, CityRouteOptimizer, RouteOptimizationParams,
};
use anyhow::{bail, Context, Result};
use parking_lot::{Mutex, RwLock};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

/// Decodificador Base64 puro em Rust (Zero dependências externas)
pub fn decode_base64(input: &str) -> Option<Vec<u8>> {
    let clean: String = input
        .split(',')
        .next_back()
        .unwrap_or(input)
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect();

    let mut table = [255u8; 256];
    for (i, &b) in b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .iter()
        .enumerate()
    {
        table[b as usize] = i as u8;
    }

    let bytes = clean.as_bytes();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    let mut buf = 0u32;
    let mut bits = 0;

    for &b in bytes {
        if b == b'=' {
            break;
        }
        let val = table[b as usize];
        if val == 255 {
            continue;
        }
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }

    Some(out)
}

/// Motores Reais e Não-Mockados do ALR para o Playground
pub struct PlaygroundRealEngines {
    pub cctv_engine: Arc<Mutex<CctvSurveillanceEngine>>,
    pub attribute_extractor: Arc<VisualAttributeExtractor>,
    pub error_detector: Arc<ScreenErrorDetector>,
    pub categorizer: Arc<RwLock<ProductCategorizerEngine>>,
    pub category_memory: Arc<QdrantSemanticMemoryStore>,
    pub mouse_controller: Arc<NativeDesktopMouseController>,
    pub notifier: Arc<WindowsToastNotifier>,
    pub route_optimizer: Arc<CityRouteOptimizer>,
    pub amount_extractor: Arc<AmountExtractor>,
    pub phone_validator: Arc<PhoneValidator>,
    pub entity_aligner: Arc<EntityAligner>,
    pub citation_checker: Arc<CitationChecker>,
    pub sql_guardrail: Arc<SqlGuardrail>,
    pub a2a_pipeline: Arc<A2APipelineRunner>,
    pub diff_engine: Arc<DiffEngine>,
    pub systemone_engine: Arc<SystemOneEngine>,
    pub rerank_recipe: Arc<RerankRecipe>,
    pub semantic_search_recipe: Arc<SemanticSearchRecipe>,
    pub rag_filter_recipe: Arc<RagFilterRecipe>,
    pub date_extraction_recipe: Arc<DateExtractionRecipe>,
    pub structure_recovery_recipe: Arc<StructureRecoveryRecipe>,
    pub function_calling_recipe: Arc<FunctionCallingRecipe>,
    pub skill_suggestion_recipe: Arc<SkillSuggestionRecipe>,
    pub hierarchical_classifier: Arc<HierarchicalClassifier>,
    pub verification_gate_recipe: Arc<VerificationGateRecipe>,
    pub feature_extractor_recipe: Arc<FeatureExtractorRecipe>,
    pub customer_workflow_engine: Arc<CustomerWorkflowEngine>,
    pub browser_supervisor: Arc<BrowserActionSupervisor>,
    pub drone_evaluator: Arc<DroneTelemetryEvaluator>,
    pub silent_failure_detector: Arc<SilentApiFailureDetector>,
    pub media_segment_classifier: Arc<MediaSegmentClassifier>,
    pub tool_offloader: Arc<ToolResultOffloader>,
    pub context_compactor: Arc<ContextCompactor>,
    pub background_task_manager: Arc<BackgroundTaskManager>,
}

impl Default for PlaygroundRealEngines {
    fn default() -> Self {
        Self::new()
    }
}

impl PlaygroundRealEngines {
    pub fn new() -> Self {
        // Inicializa o CctvSurveillanceEngine com zonas de perímetro reais
        let mut cctv = CctvSurveillanceEngine::new();
        cctv.add_zone(PerimeterZone::new(
            "Docas de Carga (Perímetro Crítico)",
            120,
            80,
            180,
            140,
            true, // is_restricted
        ));
        cctv.add_zone(PerimeterZone::new(
            "Corredor Leste (Acesso Restrito)",
            320,
            60,
            140,
            120,
            true, // is_restricted
        ));
        cctv.set_motion_threshold(15);
        cctv.set_min_blob_area(12);

        Self {
            cctv_engine: Arc::new(Mutex::new(cctv)),
            attribute_extractor: Arc::new(VisualAttributeExtractor::new()),
            error_detector: Arc::new(ScreenErrorDetector::new()),
            categorizer: Arc::new(RwLock::new(ProductCategorizerEngine::new())),
            category_memory: Arc::new(QdrantSemanticMemoryStore::new(
                std::env::var("QDRANT_URL").unwrap_or_else(|_| "http://localhost:6333".to_string()),
                std::env::var("QDRANT_API_KEY").ok(),
                "alr_playground_product_categories",
            )),
            mouse_controller: Arc::new(NativeDesktopMouseController::new(true)),
            notifier: Arc::new(WindowsToastNotifier::new(false)),
            route_optimizer: Arc::new(CityRouteOptimizer::new()),
            amount_extractor: Arc::new(AmountExtractor::new()),
            phone_validator: Arc::new(PhoneValidator::new()),
            entity_aligner: Arc::new(EntityAligner::new()),
            citation_checker: Arc::new(CitationChecker::new()),
            sql_guardrail: Arc::new(SqlGuardrail::new()),
            a2a_pipeline: Arc::new(A2APipelineRunner::new()),
            diff_engine: Arc::new(DiffEngine::new()),
            systemone_engine: Arc::new(SystemOneEngine::new()),
            rerank_recipe: Arc::new(RerankRecipe::new()),
            semantic_search_recipe: Arc::new(SemanticSearchRecipe::new()),
            rag_filter_recipe: Arc::new(RagFilterRecipe::new()),
            date_extraction_recipe: Arc::new(DateExtractionRecipe::new()),
            structure_recovery_recipe: Arc::new(StructureRecoveryRecipe::new()),
            function_calling_recipe: Arc::new(FunctionCallingRecipe::new()),
            skill_suggestion_recipe: Arc::new(SkillSuggestionRecipe::new()),
            hierarchical_classifier: Arc::new(HierarchicalClassifier::new()),
            verification_gate_recipe: Arc::new(VerificationGateRecipe::new()),
            feature_extractor_recipe: Arc::new(FeatureExtractorRecipe::new()),
            customer_workflow_engine: Arc::new(CustomerWorkflowEngine::new()),
            browser_supervisor: Arc::new(BrowserActionSupervisor::new()),
            drone_evaluator: Arc::new(DroneTelemetryEvaluator::new()),
            silent_failure_detector: Arc::new(SilentApiFailureDetector::new()),
            media_segment_classifier: Arc::new(MediaSegmentClassifier::new()),
            tool_offloader: Arc::new(ToolResultOffloader::default()),
            context_compactor: Arc::new(ContextCompactor::default()),
            background_task_manager: Arc::new(BackgroundTaskManager::default()),
        }
    }

    // =========================================================================
    // 1. VISÃO COMPUTACIONAL: ATRIBUTOS E DETECÇÃO DE ERROS EM IMAGEM REAL
    // =========================================================================

    /// Processa uma imagem real (enviada em Base64 ou gerada via preset) usando o VisualAttributeExtractor e ScreenErrorDetector
    pub fn process_image_attributes(
        &self,
        image_base64: Option<&str>,
        preset: Option<&str>,
    ) -> Result<Value> {
        let t0 = Instant::now();
        let raw_img = if let Some(b64) = image_base64 {
            let bytes = decode_base64(b64).context("Base64 inválido para imagem")?;
            let dyn_img = image::load_from_memory(&bytes).context("Formato de imagem inválido")?;
            let rgba = dyn_img.to_rgba8();
            RawImage::new(rgba.width(), rgba.height(), rgba.into_raw())
        } else {
            Self::generate_preset_image(preset.unwrap_or("tenis_nike"))
        };

        // 1. Executa o VisualAttributeExtractor REAL
        let attrs = self.attribute_extractor.extract(&raw_img);

        // 2. Executa o ScreenErrorDetector REAL
        let error_verdict = self.error_detector.detect_image(&raw_img);

        let latency_us = t0.elapsed().as_micros();

        Ok(json!({
            "success": true,
            "latency_micros": latency_us,
            "dimensions": {
                "width": attrs.dimensions.width,
                "height": attrs.dimensions.height,
                "aspect_ratio": attrs.dimensions.aspect_ratio
            },
            "background": {
                "type": format!("{:?}", attrs.background_type),
                "is_clean_background": attrs.is_clean_background,
                "ecommerce_ready": attrs.is_ecommerce_ready()
            },
            "detected_shape": format!("{:?}", attrs.detected_shape),
            "sharpness": (attrs.sharpness * 100.0).round() / 100.0,
            "palette": attrs.palette.iter().map(|s| json!({
                "name_pt": s.name_pt,
                "hex": s.hex,
                "percentage": (s.percentage * 10.0).round() / 10.0,
                "rgba": [s.color.r, s.color.g, s.color.b, s.color.a]
            })).collect::<Vec<_>>(),
            "color_profile": {
                "primary_color_name": attrs.color_profile.primary_color_name,
                "primary_color_hex": attrs.color_profile.primary_color_hex,
                "secondary_color_name": attrs.color_profile.secondary_color_name,
                "secondary_color_hex": attrs.color_profile.secondary_color_hex,
                "coverage_ratio": (attrs.color_profile.coverage_ratio * 100.0).round() / 100.0,
                "brightness": (attrs.color_profile.mean_brightness * 100.0).round() / 100.0,
                "contrast": (attrs.color_profile.contrast * 100.0).round() / 100.0
            },
            "visual_tags": attrs.visual_tags,
            "error_verdict": {
                "is_error": error_verdict.is_error,
                "error_type": error_verdict.error_type.map(|t| format!("{:?}", t)),
                "confidence": error_verdict.confidence,
                "description": error_verdict.description,
                "should_emergency_stop": error_verdict.should_emergency_stop
            }
        }))
    }

    /// Gera imagens de alta fidelidade para os presets de teste
    fn generate_preset_image(preset: &str) -> RawImage {
        match preset {
            "tenis_nike" => {
                // Tênis azul esportivo em fundo branco de estúdio
                let mut img = RawImage::new(400, 300, vec![255; 400 * 300 * 4]);
                // Corpo do tênis azul marinho (#002244)
                img.draw_rect(60, 110, 280, 80, RgbaColor::new(0, 34, 68, 255));
                // Solado branco/cinza claro
                img.draw_rect(50, 190, 300, 25, RgbaColor::new(230, 235, 240, 255));
                // Swoosh / Detalhe neon (#BBFB00)
                img.draw_rect(140, 130, 100, 18, RgbaColor::new(187, 251, 0, 255));
                img
            }
            "iphone_titanio" => {
                // Smartphone vertical preto/cinza grafite (#1E293B) em fundo transparente
                let mut img = RawImage::new(300, 400, vec![0; 300 * 400 * 4]);
                // Corpo do smartphone
                img.draw_rect(75, 40, 150, 320, RgbaColor::new(30, 41, 59, 255));
                // Tela interna preta pura
                img.draw_rect(82, 50, 136, 300, RgbaColor::new(5, 8, 12, 255));
                // Câmeras traseiras
                img.draw_rect(88, 58, 42, 42, RgbaColor::new(15, 23, 42, 255));
                img
            }
            "cadeira_ergonomica" => {
                // Cadeira de escritório ergonômica preta (#111827) em fundo claro
                let mut img = RawImage::new(350, 350, vec![250; 350 * 350 * 4]);
                // Encosto
                img.draw_rect(110, 50, 130, 140, RgbaColor::new(17, 24, 39, 255));
                // Assento
                img.draw_rect(90, 190, 170, 40, RgbaColor::new(31, 41, 55, 255));
                // Pistão e base
                img.draw_rect(165, 230, 20, 70, RgbaColor::new(75, 85, 99, 255));
                img.draw_rect(100, 300, 150, 15, RgbaColor::new(55, 65, 81, 255));
                img
            }
            "tela_erro_500" => {
                // Tela de crash / erro 500 vermelha intensa (#991B1B)
                let mut img = RawImage::new(400, 300, vec![153; 400 * 300 * 4]);
                img.fill(RgbaColor::new(153, 27, 27, 255)); // Vermelho alerta
                                                            // Caixa modal de erro centralizada branca
                img.draw_rect(50, 60, 300, 180, RgbaColor::new(255, 255, 255, 255));
                // Barra de título do diálogo
                img.draw_rect(50, 60, 300, 30, RgbaColor::new(185, 28, 28, 255));
                img
            }
            _ => {
                let mut img = RawImage::new(300, 300, vec![255; 300 * 300 * 4]);
                img.draw_rect(50, 50, 200, 200, RgbaColor::new(56, 189, 248, 255));
                img
            }
        }
    }

    // =========================================================================
    // 2. CÂMERA CCTV: PROCESSAMENTO TEMPORAL & DETECÇÃO REAL DE INVASÃO
    // =========================================================================

    /// Processa um quadro da câmera no CctvSurveillanceEngine com detecção de movimento real
    pub fn process_cctv_frame(
        &self,
        frame_idx: u64,
        simulate_intruder: bool,
        intruder_x: u32,
        intruder_y: u32,
    ) -> Result<Value> {
        let t0 = Instant::now();
        let width = 480;
        let height = 320;

        // Gera quadro base da cena (piso escuro + parede)
        let mut frame = RawImage::new(width, height, vec![30; (width * height * 4) as usize]);
        // Marcação visual da zona de docas A1
        frame.draw_rect(120, 80, 180, 140, RgbaColor::new(45, 55, 72, 255));

        // Se simular intruso, desenha o objeto em movimento no frame atual
        if simulate_intruder {
            // Objeto com proporção de pessoa (alongada verticalmente)
            frame.draw_rect(
                intruder_x,
                intruder_y,
                28,
                54,
                RgbaColor::new(230, 240, 255, 255),
            );
        } else if frame_idx % 2 == 1 {
            // Pequeno ruído ou veículo em movimento fora da zona restrita
            let vx = ((frame_idx * 15) % 400) as u32;
            frame.draw_rect(vx, 240, 48, 24, RgbaColor::new(160, 174, 192, 255));
        }

        let mut engine = self.cctv_engine.lock();
        let events = engine.process_frame(&frame);
        let latency_us = t0.elapsed().as_micros();

        let mut events_json = Vec::new();
        let mut highest_threat = ThreatLevel::Seguro;
        let mut triggered_toast = false;

        for ev in &events {
            if ev.threat_level > highest_threat {
                highest_threat = ev.threat_level;
            }

            // Se for Invasão Crítica, despacha notificação real no Windows!
            if ev.threat_level == ThreatLevel::InvasaoCritica && !triggered_toast {
                let _ = self.notifier.send_notification(
                    "🚨 ALR VIGILÂNCIA: INVASÃO CRÍTICA DETECTADA!",
                    &format!(
                        "Entidade '{}' detectada violando a zona restrita: {}",
                        ev.entity_kind.as_str(),
                        ev.summary
                    ),
                    ThreatLevel::InvasaoCritica,
                );
                triggered_toast = true;
            }

            events_json.push(json!({
                "kind": ev.entity_kind.as_str(),
                "threat_level": ev.threat_level.as_str(),
                "confidence": ev.confidence,
                "bbox": {
                    "x": ev.bbox.x,
                    "y": ev.bbox.y,
                    "width": ev.bbox.width,
                    "height": ev.bbox.height
                },
                "tripwire_breached": ev.tripwire_breached,
                "motion_intensity": ev.motion_intensity,
                "summary": ev.summary
            }));
        }

        Ok(json!({
            "success": true,
            "latency_micros": latency_us,
            "events_count": events.len(),
            "highest_threat": highest_threat.as_str(),
            "events": events_json,
            "zones": [
                { "name": "Docas de Carga (Perímetro Crítico)", "threat": "Invasão Crítica", "bbox": [120, 80, 180, 140] },
                { "name": "Corredor Leste (Acesso Restrito)", "threat": "Alto", "bbox": [320, 60, 140, 120] }
            ],
            "toast_dispatched": triggered_toast
        }))
    }

    // =========================================================================
    // 3. E-COMMERCE: CLASSIFICAÇÃO HIERÁRQUICA E TAXONOMIA EM CPU
    // =========================================================================

    /// Classifica um produto em microssegundos usando o ProductCategorizerEngine
    pub fn categorize_product(
        &self,
        title: &str,
        brand: Option<&str>,
        price: Option<f64>,
        description: Option<&str>,
    ) -> Result<Value> {
        let mut item = ProductCatalogItem::new("item_user", title);
        if let Some(b) = brand {
            item = item.with_brand(b);
        }
        if let Some(p) = price {
            item = item.with_price(p);
        }
        if let Some(d) = description {
            item = item.with_description(d);
        }

        let cat = self.categorizer.read();
        let res = cat.classify_sync(&item);

        Ok(json!({
            "success": true,
            "category_path": res.category_path,
            "confidence": (res.confidence * 1000.0).round() / 10.0,
            "tags": res.tags,
            "method": res.method.as_str(),
            "latency_micros": res.latency_micros,
            "cost_tokens": 0,
            "cost_dollars": "$0.0000000",
            "llm_cost_comparison": "$0.0015000"
        }))
    }

    /// Processa um lote de produtos em CPU demonstrando throughput em sub-milissegundos
    pub fn categorize_batch(&self, products: &[Value]) -> Result<Value> {
        let t0 = Instant::now();
        let items: Vec<ProductCatalogItem> = products
            .iter()
            .enumerate()
            .map(|(idx, p)| {
                let id = format!("item_{}", idx);
                let title = p["title"].as_str().unwrap_or("Produto sem nome");
                let mut item = ProductCatalogItem::new(id, title);
                if let Some(b) = p["brand"].as_str() {
                    item = item.with_brand(b);
                }
                if let Some(pr) = p["price"].as_f64() {
                    item = item.with_price(pr);
                }
                item
            })
            .collect();

        let cat = self.categorizer.read();
        let report = cat.classify_batch_sync(&items);
        let total_micros = t0.elapsed().as_micros();

        Ok(json!({
            "success": true,
            "total_items": report.total_items,
            "classified_count": report.classified_count,
            "total_time_micros": total_micros,
            "throughput_items_per_sec": report.throughput_items_per_sec.round() as u64,
            "method_distribution": report.method_distribution,
            "classifications": report.results.iter().map(|r| json!({
                "category_path": r.category_path,
                "confidence": r.confidence,
                "tags": r.tags,
                "method": r.method.as_str(),
                "latency_micros": r.latency_micros
            })).collect::<Vec<_>>()
        }))
    }

    /// Retorna a árvore de taxonomia cadastrada no ALR
    pub fn get_taxonomy_tree(&self) -> Value {
        let cat = self.categorizer.read();
        let categories = &cat.taxonomy.path_index;
        json!({
            "total_categories": categories.len(),
            "categories": categories.keys().collect::<Vec<_>>()
        })
    }

    /// Cristaliza uma correção humana como skill determinística de categorização
    pub fn learn_correction(&self, title: &str, correct_category: &str) -> Result<Value> {
        let t0 = Instant::now();
        let tags: Vec<String> = correct_category
            .split('>')
            .map(|s| s.trim().to_lowercase().replace(' ', "_"))
            .collect();

        let mut cat = self.categorizer.write();
        let skill = cat.crystallize_skill(title, correct_category, &tags, 1.0);
        let total_skills = cat.crystallized_skills.read().len();
        let latency_us = t0.elapsed().as_micros();

        Ok(json!({
            "success": true,
            "crystallized_pattern": title.to_lowercase(),
            "category_path": correct_category,
            "method": "crystallized_skill",
            "skill_id": skill.id,
            "confidence": skill.confidence,
            "total_skills": total_skills,
            "latency_micros": latency_us
        }))
    }

    /// Persiste a taxonomia do usuário no Qdrant e recupera os três candidatos semânticos.
    /// Se o serviço estiver indisponível, mantém a demonstração operacional com o mesmo
    /// cálculo vetorial local e declara explicitamente o backend de contingência.
    pub async fn categorize_with_custom_categories(
        &self,
        title: &str,
        brand: Option<&str>,
        price: Option<f64>,
        desc: Option<&str>,
        custom_categories: &[String],
    ) -> Result<Value> {
        let t0 = Instant::now();

        let mut item = ProductCatalogItem::new("item_custom", title);
        if let Some(b) = brand {
            item = item.with_brand(b);
        }
        if let Some(p) = price {
            item = item.with_price(p);
        }
        if let Some(d) = desc {
            item = item.with_description(d);
        }

        let (normal_res, embedding_provider) = {
            let cat = self.categorizer.read();
            (cat.classify_sync(&item), cat.embedding_provider.clone())
        };
        let product_text = format!("{} {}", title, item.description);
        let mut embedding_inputs = custom_categories.to_vec();
        embedding_inputs.push(product_text.clone());
        let embeddings = embedding_provider.embed(&embedding_inputs).await?;
        let product_embedding = embeddings
            .last()
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("Embedding do produto não foi gerado"))?;

        let tenant_fingerprint = custom_categories
            .join("\u{1f}")
            .bytes()
            .fold(0xcbf29ce484222325_u64, |hash, byte| {
                (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3)
            });
        let tenant_id = format!("playground-categories-{tenant_fingerprint:016x}");

        let qdrant_result = async {
            self.category_memory
                .ensure_collection(embedding_provider.dimension())
                .await?;
            let memories = custom_categories
                .iter()
                .zip(embeddings.iter())
                .map(|(category, vector)| {
                    let mut memory = SemanticMemory::new(
                        tenant_id.clone(),
                        SemanticMemoryType::SkillContext,
                        category.clone(),
                        category.clone(),
                        "playground_user_taxonomy",
                    )
                    .with_vector(vector.clone());
                    // Identificador determinístico por (tenant, categoria): reindexar a mesma
                    // lista sobrescreve o ponto no Qdrant em vez de acumular duplicatas.
                    let category_hash =
                        category.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |acc, b| {
                            (acc ^ u64::from(b)).wrapping_mul(0x100_0000_01b3)
                        });
                    memory.id = format!(
                        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
                        (category_hash >> 32) as u32,
                        (category_hash >> 16) as u16,
                        (category_hash & 0xffff) as u16,
                        (tenant_fingerprint >> 48) as u16,
                        tenant_fingerprint & 0xffff_ffff_ffff
                    );
                    memory
                })
                .collect();
            self.category_memory.upsert(memories).await?;
            self.category_memory
                .search(
                    SemanticQuery::new(tenant_id.clone(), product_embedding.clone())
                        .with_memory_type(SemanticMemoryType::SkillContext)
                        .with_top_k(3),
                )
                .await
        }
        .await;

        let (mut scored, memory_backend, backend_error): (
            Vec<(String, f32)>,
            &str,
            Option<String>,
        ) = match qdrant_result {
            Ok(results) if !results.is_empty() => (
                results
                    .into_iter()
                    .map(|result| (result.memory.title, result.score))
                    .collect(),
                "qdrant",
                None,
            ),
            Ok(_) => (
                custom_categories
                    .iter()
                    .zip(embeddings.iter())
                    .map(|(category, vector)| {
                        (
                            category.clone(),
                            cosine_similarity(&product_embedding, vector),
                        )
                    })
                    .collect(),
                "local_vector_fallback",
                Some("memória vetorial não retornou candidatos para o tenant".to_string()),
            ),
            Err(error) => (
                custom_categories
                    .iter()
                    .zip(embeddings.iter())
                    .map(|(category, vector)| {
                        (
                            category.clone(),
                            cosine_similarity(&product_embedding, vector),
                        )
                    })
                    .collect(),
                "local_vector_fallback",
                Some(error.to_string()),
            ),
        };
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        // Uma mesma categoria nunca pode ocupar duas posições do ranking.
        let mut seen_categories: Vec<String> = Vec::new();
        scored.retain(|(name, _)| {
            if seen_categories.contains(name) {
                false
            } else {
                seen_categories.push(name.clone());
                true
            }
        });

        // Qdrant retorna similaridades; convertemos o conjunto Top-K em probabilidades
        // relativas calibradas, evitando apresentar o score bruto como confiança.
        if let Some(max_score) = scored.first().map(|(_, score)| *score) {
            let weights: Vec<f32> = scored
                .iter()
                .map(|(_, score)| ((*score - max_score) * 100.0).exp())
                .collect();
            let weight_sum = weights.iter().sum::<f32>().max(f32::EPSILON);
            for ((_, score), weight) in scored.iter_mut().zip(weights) {
                *score = weight / weight_sum;
            }
        }

        let top3: Vec<Value> = scored
            .iter()
            .take(3)
            .map(|(name, score)| {
                json!({
                    "category": name,
                    "score": (*score * 10000.0).round() / 100.0
                })
            })
            .collect();
        let (final_pick, final_score) = scored
            .first()
            .map(|(name, score)| (name.as_str(), *score))
            .unwrap_or(("unknown", 0.0));
        let confidence = (final_score.clamp(0.0, 1.0) * 1000.0).round() / 10.0;

        Ok(json!({
            "success": true,
            "category_path": final_pick,
            "confidence": confidence,
            "method": "semantic_qdrant_retrieval",
            "memory_backend": memory_backend,
            "memory_backend_error": backend_error,
            "tenant_id": tenant_id,
            "indexed_categories": custom_categories.len(),
            "tags": final_pick
                .split('>')
                .map(|part| part.trim().to_lowercase().replace(' ', "_"))
                .collect::<Vec<_>>(),
            "custom_candidates": top3,
            "retrieval_pipeline": [
                "categorias indexadas na memória vetorial",
                "busca semântica top-3 isolada por tenant_id",
                "decisão final calibrada pelo ALR"
            ],
            "normal_classification": {
                "category_path": normal_res.category_path,
                "confidence": (normal_res.confidence * 1000.0).round() / 10.0,
                "method": normal_res.method.as_str()
            },
            "latency_micros": t0.elapsed().as_micros()
        }))
    }

    /// Retorna as skills cristalizadas como array JSON
    pub fn get_learned_skills(&self) -> Value {
        let cat = self.categorizer.read();
        let skills = cat.crystallized_skills.read();
        let entries: Vec<Value> = skills
            .iter()
            .map(|(pattern, entry)| {
                json!({
                    "pattern": pattern,
                    "category_path": entry.category_path,
                    "tags": entry.tags,
                    "confidence": entry.skill.confidence,
                    "status": format!("{:?}", entry.skill.status)
                })
            })
            .collect();
        json!({
            "total_skills": entries.len(),
            "skills": entries
        })
    }

    // =========================================================================
    // 4. CONTROLE FÍSICO DE OS (MOUSE / TECLADO COM SAFE INPUT CONTROLLER)
    // =========================================================================

    pub fn execute_mouse_action(&self, x: i32, y: i32, action: &str, live: bool) -> Result<Value> {
        let t0 = Instant::now();
        let coords = MouseCoordinates { x, y };

        if live {
            match action {
                "move" => self.mouse_controller.move_to(coords)?,
                "click" => self.mouse_controller.click(coords)?,
                "right_click" => self.mouse_controller.right_click(coords)?,
                "double_click" => self.mouse_controller.double_click(coords)?,
                "scroll" => self.mouse_controller.scroll(-120)?,
                _ => bail!("Ação de mouse desconhecida: {}", action),
            }
        }

        let latency_us = t0.elapsed().as_micros();

        Ok(json!({
            "success": true,
            "action": action,
            "coordinates": { "x": x, "y": y },
            "live_execution": live,
            "safe_input_shield": "SafeInputController Ativo • 20 Hz Rate Limit",
            "latency_micros": latency_us
        }))
    }

    pub fn trigger_emergency_stop(&self, reason: &str) -> Value {
        GlobalEmergencyStop::trigger(reason.to_string());
        json!({
            "success": true,
            "is_active": GlobalEmergencyStop::is_active(),
            "status": "🛑 PARADA ATÔMICA GLOBAL ATIVADA • Entradas e Agentes Travados",
            "reason": reason
        })
    }

    // =========================================================================
    // 5. OTIMIZADOR DE ROTAS URBANAS (VRP-TW COM TRÂNSITO DINÂMICO)
    // =========================================================================

    pub fn optimize_delivery_route(
        &self,
        params: &RouteOptimizationParams,
    ) -> Result<CityOptimizationPlan> {
        self.route_optimizer.optimize_delivery_route(params)
    }

    // =========================================================================
    // 6. RECIPES ESPECIALIZADAS (SUPERANDO O JEV)
    // =========================================================================

    pub fn extract_amount(&self, text: &str) -> Result<ExtractedAmount> {
        self.amount_extractor.extract(text)
    }

    pub fn validate_phone(&self, text: &str) -> Result<VerifiedPhoneNumber> {
        self.phone_validator.validate(text)
    }

    pub fn align_schema(&self, fields: &[String]) -> Result<EntityAlignmentReport> {
        self.entity_aligner.align_schema(fields)
    }

    pub fn check_citation(&self, answer: &str, context: &str) -> Result<CitationVerdict> {
        self.citation_checker.verify_citation(answer, context)
    }

    pub fn audit_sql(&self, sql: &str) -> Result<SqlGuardrailVerdict> {
        self.sql_guardrail.audit_sql(sql)
    }

    // =========================================================================
    // 7. A2A PROTOCOL, PIPELINES E DIFF VIEWER (INSPIRADO NO AGENTSCOPE)
    // =========================================================================

    pub fn run_a2a_pipeline(&self, message: &str) -> Result<Value> {
        self.a2a_pipeline.execute_collaborative_pipeline(message)
    }

    pub fn compute_diff(&self, original: &str, proposed: &str) -> DiffPreviewReport {
        self.diff_engine.compute_diff(original, proposed)
    }

    // =========================================================================
    // 8. CSV & BATCH DECISION WORKBENCH
    // =========================================================================

    pub fn process_csv_workbench(
        &self,
        csv_text: &str,
        category_map: &HashMap<String, String>,
    ) -> Result<Value> {
        let t0 = Instant::now();
        let lines: Vec<&str> = csv_text.lines().filter(|l| !l.trim().is_empty()).collect();
        if lines.is_empty() {
            bail!("CSV vazio");
        }

        let header = lines[0];
        let data_rows = &lines[1..];

        let mut processed_rows = Vec::new();

        for (idx, &line) in data_rows.iter().enumerate() {
            let cols: Vec<&str> = line
                .split(',')
                .map(|c| c.trim().trim_matches('"'))
                .collect();
            let row_text = cols.get(1).or_else(|| cols.first()).unwrap_or(&"");

            let mut best_cat = "Outros / Revisão".to_string();
            let mut best_score = 0.0f32;

            for (cat, keywords) in category_map {
                let kw_list: Vec<&str> = keywords
                    .split(',')
                    .map(|k| k.trim().trim_matches('"'))
                    .collect();
                let mut score = 0.0f32;
                for kw in kw_list {
                    if !kw.is_empty() && row_text.to_lowercase().contains(&kw.to_lowercase()) {
                        score += 1.0;
                    }
                }
                if score > best_score {
                    best_score = score;
                    best_cat = cat.clone();
                }
            }

            let confidence = if best_score > 0.0 {
                (0.75 + (best_score * 0.1)).min(0.99)
            } else {
                0.50
            };

            processed_rows.push(json!({
                "row_index": idx + 1,
                "original_line": line,
                "columns": cols,
                "predicted_label": best_cat,
                "confidence": (confidence * 100.0).round() / 100.0,
                "confidence_pct": format!("{:.1}%", confidence * 100.0)
            }));
        }

        let latency_us = t0.elapsed().as_micros();
        let throughput = if latency_us > 0 {
            (data_rows.len() as f64 / (latency_us as f64 / 1_000_000.0)).round() as u64
        } else {
            100_000
        };

        Ok(json!({
            "success": true,
            "total_rows": data_rows.len(),
            "latency_micros": latency_us,
            "throughput_lines_per_sec": throughput,
            "header": header,
            "rows": processed_rows
        }))
    }

    // =========================================================================
    // 9. API /v1/systemone CANÔNICA DO JEV
    // =========================================================================

    pub fn ask_systemone(&self, req: &SystemOneRequest) -> Result<SystemOneResponse> {
        self.systemone_engine.ask(req)
    }

    // =========================================================================
    // 10. RECIPES ESPECIALIZADAS EXPANDIDAS
    // =========================================================================

    pub fn rerank(
        &self,
        query: &str,
        passages: &HashMap<String, String>,
    ) -> Result<alr_agent::recipes::RerankReport> {
        self.rerank_recipe.rerank(query, passages)
    }

    pub fn semantic_search(
        &self,
        query: &str,
        lines: &HashMap<String, String>,
    ) -> Result<alr_agent::recipes::SemanticSearchResult> {
        self.semantic_search_recipe.search(query, lines)
    }

    pub fn rag_filter(
        &self,
        query: &str,
        passages: &HashMap<String, String>,
    ) -> Result<alr_agent::recipes::RagFilterReport> {
        self.rag_filter_recipe.filter_passages(query, passages)
    }

    pub fn extract_dates(
        &self,
        text: &str,
        ref_date: &str,
    ) -> Result<alr_agent::recipes::DateExtractionReport> {
        self.date_extraction_recipe.extract(text, ref_date)
    }

    pub fn recover_markdown(
        &self,
        blocks: &[String],
    ) -> Result<alr_agent::recipes::StructureRecoveryReport> {
        self.structure_recovery_recipe.recover_markdown(blocks)
    }

    pub fn decide_tool(
        &self,
        text: &str,
        tools: &[alr_agent::recipes::FunctionSpec],
    ) -> Result<alr_agent::recipes::FunctionCallingDecision> {
        self.function_calling_recipe.decide(text, tools)
    }

    pub fn suggest_skill(
        &self,
        text: &str,
        catalog: &HashMap<String, String>,
    ) -> Result<alr_agent::recipes::SkillSuggestionReport> {
        self.skill_suggestion_recipe.suggest(text, catalog)
    }

    pub fn classify_hierarchy(
        &self,
        text: &str,
        roots: &[alr_agent::recipes::HierarchyNode],
    ) -> Result<alr_agent::recipes::HierarchicalClassificationReport> {
        self.hierarchical_classifier.classify(text, roots)
    }

    pub fn verify_fields(
        &self,
        text: &str,
        fields: &HashMap<String, String>,
    ) -> Result<alr_agent::recipes::VerificationReport> {
        self.verification_gate_recipe.verify_fields(text, fields)
    }

    pub fn extract_features(
        &self,
        text: &str,
    ) -> Result<alr_agent::recipes::FeatureExtractionReport> {
        self.feature_extractor_recipe.extract_features(text)
    }

    // =========================================================================
    // 11. CONTEXT OFFLOADING & COMPACTOR
    // =========================================================================

    pub fn offload_tool_output(
        &self,
        tool: &str,
        raw: &str,
    ) -> Result<alr_agent::context_manager::ProcessedToolResult> {
        self.tool_offloader.process_tool_output(tool, raw)
    }

    pub fn compact_turns(
        &self,
        turns: &[alr_agent::context_manager::ContextTurn],
    ) -> Result<alr_agent::context_manager::CompactionReport> {
        self.context_compactor.compact_turns(turns)
    }

    // =========================================================================
    // 12. BACKGROUND TASK & WAKEUP DISPATCHER
    // =========================================================================

    pub fn submit_background_task(
        &self,
        agent: &str,
        tool: &str,
        desc: &str,
        delay_ms: u64,
        payload: &str,
    ) -> Result<alr_agent::background_tasks::TaskSubmissionReceipt> {
        self.background_task_manager
            .submit_task(agent, tool, desc, delay_ms, payload)
    }
}
