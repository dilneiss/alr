//! Casos Especializados de Decisão de Domínio do JEV (Domain Decision Cases)
//!
//! Implementação nativa em Rust para inferência em sub-microssegundos:
//! 1. `CustomerWorkflowCase`: 4 formulários essenciais de e-commerce (Estorno, Substituição, Troca de Endereço, Cancelamento).
//! 2. `BrowserActionSupervisorCase`: Supervisão de ações no DOM do navegador contra ações de alto risco ou destrutivas.
//! 3. `DroneTelemetryRiskCase`: Avaliação de telemetria, baterias e sensores de proximidade para navegação autônoma segura.
//! 4. `SilentApiFailureDetectorCase`: Detecção analítica de falhas silenciosas em APIs externas com falsos HTTP 200 OK.
//! 5. `MediaSegmentClassifierCase`: Classificação de segmentos de vídeo e transcrições (Patrocínio, Auto-promoção, Conteúdo, Abertura).

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Instant;

// =============================================================================
// 1. CUSTOMER WORKFLOW CASE (4 FORMULÁRIOS DE ATENDIMENTO)
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CustomerWorkflowKind {
    Refund,
    Replacement,
    AddressChange,
    Cancellation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerWorkflowDecision {
    pub workflow: CustomerWorkflowKind,
    pub order_id: String,
    pub is_approved: bool,
    pub requires_human_review: bool,
    pub confidence: f32,
    pub decision_rationale: String,
    pub latency_micros: u128,
}

pub struct CustomerWorkflowEngine;

impl Default for CustomerWorkflowEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl CustomerWorkflowEngine {
    pub fn new() -> Self {
        Self
    }

    /// Avalia formulário de Reembolso / Estorno
    pub fn evaluate_refund(
        &self,
        order_id: &str,
        amount: f64,
        days_since_purchase: u32,
        reason: &str,
    ) -> Result<CustomerWorkflowDecision> {
        let t0 = Instant::now();
        let reason_lower = reason.to_lowercase();

        // Regra de Ouro: Estorno até 30 dias e valor <= R$ 1.000 é aprovado automaticamente
        let (approved, review, rationale, conf) = if days_since_purchase > 30 {
            (
                false,
                true,
                format!(
                    "Prazo legal de 30 dias expirado ({} dias decorridos)",
                    days_since_purchase
                ),
                0.96,
            )
        } else if amount > 1000.0 {
            (
                false,
                true,
                format!(
                    "Valor elevado (R$ {:.2}) exige aprovação humana de supervisor financeiro",
                    amount
                ),
                0.94,
            )
        } else if reason_lower.contains("fraude") || reason_lower.contains("golpe") {
            (
                false,
                true,
                "Menção de suspeita de fraude/golpe exige auditoria de segurança".to_string(),
                0.98,
            )
        } else {
            (
                true,
                false,
                format!(
                    "Estorno elegível dentro do prazo ({} dias) e valor permitido (R$ {:.2})",
                    days_since_purchase, amount
                ),
                0.99,
            )
        };

        Ok(CustomerWorkflowDecision {
            workflow: CustomerWorkflowKind::Refund,
            order_id: order_id.to_string(),
            is_approved: approved,
            requires_human_review: review,
            confidence: conf,
            decision_rationale: rationale,
            latency_micros: t0.elapsed().as_micros(),
        })
    }

    /// Avalia formulário de Substituição de Produto com Defeito
    pub fn evaluate_replacement(
        &self,
        order_id: &str,
        sku: &str,
        has_defect_evidence: bool,
        in_stock: bool,
    ) -> Result<CustomerWorkflowDecision> {
        let t0 = Instant::now();

        let (approved, review, rationale, conf) = if !has_defect_evidence {
            (
                false,
                true,
                "Necessário anexar foto/vídeo com evidência do defeito para reenvio".to_string(),
                0.97,
            )
        } else if !in_stock {
            (
                false,
                true,
                format!("SKU '{}' sem estoque para reposição imediata; oferecido vale-compras ou estorno", sku),
                0.95,
            )
        } else {
            (
                true,
                false,
                format!(
                    "Substituição do SKU '{}' autorizada com reenvio prioritário",
                    sku
                ),
                0.99,
            )
        };

        Ok(CustomerWorkflowDecision {
            workflow: CustomerWorkflowKind::Replacement,
            order_id: order_id.to_string(),
            is_approved: approved,
            requires_human_review: review,
            confidence: conf,
            decision_rationale: rationale,
            latency_micros: t0.elapsed().as_micros(),
        })
    }

    /// Avalia formulário de Troca de Endereço de Entrega
    pub fn evaluate_address_change(
        &self,
        order_id: &str,
        order_status: &str,
        new_cep: &str,
    ) -> Result<CustomerWorkflowDecision> {
        let t0 = Instant::now();
        let status_upper = order_status.to_uppercase();

        let (approved, review, rationale, conf) = if status_upper.contains("SHIPPED")
            || status_upper.contains("ENVIADO")
            || status_upper.contains("DELIVERED")
        {
            (
                false,
                false,
                "Pedido já despachado com a transportadora. Alteração bloqueada; orientar retirada ou recusa".to_string(),
                0.99,
            )
        } else if new_cep.chars().filter(|c| c.is_ascii_digit()).count() != 8 {
            (
                false,
                true,
                format!(
                    "CEP '{}' inválido (deve conter 8 dígitos numéricos)",
                    new_cep
                ),
                0.95,
            )
        } else {
            (
                true,
                false,
                format!(
                    "Endereço atualizado com sucesso para o CEP '{}' antes da remessa",
                    new_cep
                ),
                0.98,
            )
        };

        Ok(CustomerWorkflowDecision {
            workflow: CustomerWorkflowKind::AddressChange,
            order_id: order_id.to_string(),
            is_approved: approved,
            requires_human_review: review,
            confidence: conf,
            decision_rationale: rationale,
            latency_micros: t0.elapsed().as_micros(),
        })
    }

    /// Avalia formulário de Cancelamento de Pedido
    pub fn evaluate_cancellation(
        &self,
        order_id: &str,
        order_status: &str,
    ) -> Result<CustomerWorkflowDecision> {
        let t0 = Instant::now();
        let status_upper = order_status.to_uppercase();

        let (approved, review, rationale, conf) = if status_upper.contains("DELIVERED") {
            (
                false,
                true,
                "Pedido já entregue ao destinatário. Cancelamento direto indisponível; abrir fluxo de Devolução".to_string(),
                0.99,
            )
        } else if status_upper.contains("SHIPPED") || status_upper.contains("EM TRANSITO") {
            (
                false,
                true,
                "Pedido já em trânsito com a transportadora. Solicitação enviada para interceptação de carga".to_string(),
                0.90,
            )
        } else {
            (
                true,
                false,
                "Cancelamento aprovado imediatamente com estorno total na forma original de pagamento".to_string(),
                0.99,
            )
        };

        Ok(CustomerWorkflowDecision {
            workflow: CustomerWorkflowKind::Cancellation,
            order_id: order_id.to_string(),
            is_approved: approved,
            requires_human_review: review,
            confidence: conf,
            decision_rationale: rationale,
            latency_micros: t0.elapsed().as_micros(),
        })
    }
}

// =============================================================================
// 2. BROWSER DOM ACTION SUPERVISOR CASE
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BrowserActionType {
    Click,
    Type,
    Scroll,
    Navigate,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomElementSnapshot {
    pub tag: String,
    pub element_id: Option<String>,
    pub text_content: String,
    pub is_visible: bool,
    pub is_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserActionVerdict {
    pub action: BrowserActionType,
    pub is_permitted: bool,
    pub is_high_risk: bool,
    pub risk_reason: Option<String>,
    pub recommended_action: String,
    pub latency_micros: u128,
}

pub struct BrowserActionSupervisor;

impl Default for BrowserActionSupervisor {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserActionSupervisor {
    pub fn new() -> Self {
        Self
    }

    /// Avalia se a ação proposta no DOM é segura ou deve ser interceptada pelo RiskEngine
    pub fn supervise_action(
        &self,
        action: BrowserActionType,
        element: &DomElementSnapshot,
    ) -> Result<BrowserActionVerdict> {
        let t0 = Instant::now();
        let text_lower = element.text_content.to_lowercase();
        let id_lower = element.element_id.as_deref().unwrap_or("").to_lowercase();

        let high_risk_keywords = [
            "delete account",
            "excluir conta",
            "cancel subscription",
            "cancelar assinatura",
            "transfer balance",
            "transferir saldo",
            "disable 2fa",
            "desativar autenticação",
            "format",
            "drop table",
            "purge data",
        ];

        let is_high_risk = high_risk_keywords
            .iter()
            .any(|k| text_lower.contains(k) || id_lower.contains(k));

        let verdict = if !element.is_visible || !element.is_enabled {
            BrowserActionVerdict {
                action,
                is_permitted: false,
                is_high_risk: false,
                risk_reason: Some("Elemento não visível ou desabilitado no DOM".to_string()),
                recommended_action: "Abortar interação com elemento inacessível".to_string(),
                latency_micros: t0.elapsed().as_micros(),
            }
        } else if is_high_risk {
            BrowserActionVerdict {
                action,
                is_permitted: false,
                is_high_risk: true,
                risk_reason: Some(format!(
                    "Ação destrutiva identificada no texto: '{}'",
                    element.text_content
                )),
                recommended_action:
                    "BLOQUEIO ATÔMICO: Requer autorização formal do ApprovalGateway".to_string(),
                latency_micros: t0.elapsed().as_micros(),
            }
        } else {
            BrowserActionVerdict {
                action,
                is_permitted: true,
                is_high_risk: false,
                risk_reason: None,
                recommended_action: "Ação permitida em modo autônomo com auto-verificação no DOM"
                    .to_string(),
                latency_micros: t0.elapsed().as_micros(),
            }
        };

        Ok(verdict)
    }
}

// =============================================================================
// 3. DRONE & TELEMETRY RISK CASE
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DroneTelemetrySnapshot {
    pub altitude_meters: f32,
    pub vertical_speed_mps: f32,
    pub battery_percent: f32,
    pub gps_satellites: u32,
    pub obstacle_distance_meters: f32,
    pub wind_speed_kmh: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DroneCommand {
    ContinueMission,
    HoldPosition,
    ReturnToHome,
    EmergencyBrake,
    DescendSafely,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DroneRiskEvaluation {
    pub recommended_command: DroneCommand,
    pub risk_score: f32, // 0.0 (seguro) a 1.0 (crítico)
    pub critical_alerts: Vec<String>,
    pub latency_micros: u128,
}

pub struct DroneTelemetryEvaluator;

impl Default for DroneTelemetryEvaluator {
    fn default() -> Self {
        Self::new()
    }
}

impl DroneTelemetryEvaluator {
    pub fn new() -> Self {
        Self
    }

    /// Avalia a telemetria do drone e calcula a ação de controle de risco
    pub fn evaluate(&self, telemetry: &DroneTelemetrySnapshot) -> Result<DroneRiskEvaluation> {
        let t0 = Instant::now();
        let mut alerts = Vec::new();

        // 1. Colisão Iminente (Obstáculo < 2.0 metros)
        if telemetry.obstacle_distance_meters < 2.0 {
            alerts.push(format!(
                "Colisão Iminente: Obstáculo a apenas {:.1} m",
                telemetry.obstacle_distance_meters
            ));
            return Ok(DroneRiskEvaluation {
                recommended_command: DroneCommand::EmergencyBrake,
                risk_score: 0.99,
                critical_alerts: alerts,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        // 2. Bateria Crítica (< 15%)
        if telemetry.battery_percent < 15.0 {
            alerts.push(format!(
                "Bateria em nível crítico: {:.1}%",
                telemetry.battery_percent
            ));
            return Ok(DroneRiskEvaluation {
                recommended_command: DroneCommand::ReturnToHome,
                risk_score: 0.92,
                critical_alerts: alerts,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        // 3. Ventos Fortes ou Perda de Satélites
        if telemetry.wind_speed_kmh > 45.0 {
            alerts.push(format!(
                "Rajadas de vento perigosas: {:.1} km/h",
                telemetry.wind_speed_kmh
            ));
        }
        if telemetry.gps_satellites < 6 {
            alerts.push(format!(
                "Sinal GPS degradado: apenas {} satélites",
                telemetry.gps_satellites
            ));
        }

        let cmd = if !alerts.is_empty() {
            DroneCommand::HoldPosition
        } else if telemetry.vertical_speed_mps < -4.0 {
            alerts.push("Velocidade de descida excessiva".to_string());
            DroneCommand::DescendSafely
        } else {
            DroneCommand::ContinueMission
        };

        let risk_score = (alerts.len() as f32 * 0.25).clamp(0.05, 0.85);

        Ok(DroneRiskEvaluation {
            recommended_command: cmd,
            risk_score,
            critical_alerts: alerts,
            latency_micros: t0.elapsed().as_micros(),
        })
    }
}

// =============================================================================
// 4. SILENT API FAILURE DETECTOR CASE
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponseProbe {
    pub http_status: u16,
    pub body_text: String,
    pub content_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SilentFailureVerdict {
    pub is_healthy: bool,
    pub is_silent_failure: bool,
    pub detected_issue: Option<String>,
    pub confidence: f32,
    pub latency_micros: u128,
}

pub struct SilentApiFailureDetector;

impl Default for SilentApiFailureDetector {
    fn default() -> Self {
        Self::new()
    }
}

impl SilentApiFailureDetector {
    pub fn new() -> Self {
        Self
    }

    /// Detecta se uma resposta de API com código 200 OK possui falhas silenciosas
    pub fn audit_response(&self, probe: &HttpResponseProbe) -> Result<SilentFailureVerdict> {
        let t0 = Instant::now();
        let trimmed = probe.body_text.trim();

        // 1. Corpo Vazio em Resposta 200
        if trimmed.is_empty() || trimmed == "{}" || trimmed == "[]" || trimmed == "null" {
            return Ok(SilentFailureVerdict {
                is_healthy: false,
                is_silent_failure: true,
                detected_issue: Some("Resposta 200 OK com payload vazio ou nulo".to_string()),
                confidence: 0.99,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        let lower = trimmed.to_lowercase();

        // 2. Erros Disfarçados em JSON com status 200
        let disguised_errors = [
            "\"error\":",
            "\"status\":\"error\"",
            "\"success\":false",
            "\"rate_limit_exceeded\"",
            "\"token_expired\"",
            "\"unauthorized\"",
            "internal server error",
            "bad gateway",
        ];

        for pattern in &disguised_errors {
            if lower.contains(pattern) {
                return Ok(SilentFailureVerdict {
                    is_healthy: false,
                    is_silent_failure: true,
                    detected_issue: Some(format!(
                        "Falha velada detectada no payload: '{}'",
                        pattern
                    )),
                    confidence: 0.98,
                    latency_micros: t0.elapsed().as_micros(),
                });
            }
        }

        // 3. HTML retornado quando esperado JSON
        if probe.content_type.contains("json")
            && (trimmed.starts_with("<!DOCTYPE") || trimmed.starts_with("<html"))
        {
            return Ok(SilentFailureVerdict {
                is_healthy: false,
                is_silent_failure: true,
                detected_issue: Some(
                    "Content-Type JSON declarado mas corpo contém HTML de página de erro"
                        .to_string(),
                ),
                confidence: 0.99,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        Ok(SilentFailureVerdict {
            is_healthy: true,
            is_silent_failure: false,
            detected_issue: None,
            confidence: 0.99,
            latency_micros: t0.elapsed().as_micros(),
        })
    }
}

// =============================================================================
// 5. MEDIA & SPONSOR SEGMENT CLASSIFIER CASE
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MediaSegmentType {
    SponsorPaid,
    SelfPromotion,
    ContentPrimary,
    IntroOutro,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaSegmentClassification {
    pub segment_type: MediaSegmentType,
    pub confidence: f32,
    pub segment_label: &'static str,
    pub identified_triggers: Vec<String>,
    pub latency_micros: u128,
}

pub struct MediaSegmentClassifier;

impl Default for MediaSegmentClassifier {
    fn default() -> Self {
        Self::new()
    }
}

impl MediaSegmentClassifier {
    pub fn new() -> Self {
        Self
    }

    /// Classifica um trecho de transcrição de vídeo ou áudio
    pub fn classify_segment(&self, text: &str) -> Result<MediaSegmentClassification> {
        let t0 = Instant::now();
        let lower = text.to_lowercase();
        let mut triggers = Vec::new();

        // 1. Patrocínio Pago (SponsorPaid)
        let sponsor_keywords = [
            "patrocinado por",
            "este vídeo é um oferecimento",
            "cupom de desconto",
            "link na descrição com 20% off",
            "agradecemos ao patrocinador",
            "use o código",
            "sponsored by",
        ];

        for k in &sponsor_keywords {
            if lower.contains(k) {
                triggers.push(k.to_string());
            }
        }

        if !triggers.is_empty() {
            return Ok(MediaSegmentClassification {
                segment_type: MediaSegmentType::SponsorPaid,
                confidence: 0.98,
                segment_label: "Patrocínio Comercial (Sponsor)",
                identified_triggers: triggers,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        // 2. Auto-Promoção (SelfPromotion)
        let promo_keywords = [
            "se inscreva no canal",
            "deixe o seu like",
            "ative o sininho",
            "conheça nosso curso",
            "entre no nosso discord",
            "apoie no catarse",
        ];

        for k in &promo_keywords {
            if lower.contains(k) {
                triggers.push(k.to_string());
            }
        }

        if !triggers.is_empty() {
            return Ok(MediaSegmentClassification {
                segment_type: MediaSegmentType::SelfPromotion,
                confidence: 0.95,
                segment_label: "Auto-Promoção do Criador",
                identified_triggers: triggers,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        // 3. Abertura / Encerramento (IntroOutro)
        let intro_keywords = [
            "olá pessoal, bem-vindos",
            "no vídeo de hoje vamos",
            "e esse foi o vídeo de hoje",
            "vejo vocês no próximo vídeo",
            "até a próxima, tchau",
        ];

        for k in &intro_keywords {
            if lower.contains(k) {
                triggers.push(k.to_string());
            }
        }

        if !triggers.is_empty() {
            return Ok(MediaSegmentClassification {
                segment_type: MediaSegmentType::IntroOutro,
                confidence: 0.92,
                segment_label: "Vinheta / Abertura ou Encerramento",
                identified_triggers: triggers,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        // 4. Conteúdo Principal
        Ok(MediaSegmentClassification {
            segment_type: MediaSegmentType::ContentPrimary,
            confidence: 0.95,
            segment_label: "Conteúdo Técnico ou Educacional Principal",
            identified_triggers: Vec::new(),
            latency_micros: t0.elapsed().as_micros(),
        })
    }
}
