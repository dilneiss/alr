use alr_agent::categorizer::{ProductCatalogItem, ProductCategorizerEngine};
use alr_execution::emergency::GlobalEmergencyStop;
use alr_execution::mouse::{MouseController, MouseCoordinates, NativeDesktopMouseController};
use alr_execution::notification::{DesktopNotificationService, ThreatLevel, WindowsToastNotifier};
use alr_perception::attributes::VisualAttributeExtractor;
use alr_perception::cctv::{CctvSurveillanceEngine, PerimeterZone};
use alr_perception::error_detector::ScreenErrorDetector;
use alr_perception::image::{RawImage, RgbaColor};
use alr_spatial::city_routing::{
    CityOptimizationPlan, CityRouteOptimizer, RouteOptimizationParams,
};
use anyhow::{bail, Context, Result};
use parking_lot::Mutex;
use serde_json::{json, Value};
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
    pub categorizer: Arc<ProductCategorizerEngine>,
    pub mouse_controller: Arc<NativeDesktopMouseController>,
    pub notifier: Arc<WindowsToastNotifier>,
    pub route_optimizer: Arc<CityRouteOptimizer>,
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
            categorizer: Arc::new(ProductCategorizerEngine::new()),
            mouse_controller: Arc::new(NativeDesktopMouseController::new(true)),
            notifier: Arc::new(WindowsToastNotifier::new(false)),
            route_optimizer: Arc::new(CityRouteOptimizer::new()),
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
    pub async fn categorize_product(
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

        let res = self.categorizer.classify(&item).await;

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
    pub async fn categorize_batch(&self, products: &[Value]) -> Result<Value> {
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

        let report = self.categorizer.classify_batch(&items).await;
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
        let categories = &self.categorizer.taxonomy.path_index;
        json!({
            "total_categories": categories.len(),
            "categories": categories.keys().collect::<Vec<_>>()
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
}
