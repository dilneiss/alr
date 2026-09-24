use crate::image::RawImage;
use alr_execution::emergency::{EmergencyStopReason, GlobalEmergencyStop};
use serde::{Deserialize, Serialize};

/// Categories of detected on-screen error conditions
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorScreenType {
    HttpError { code: u16, message: String },
    ApplicationCrash { signature: String },
    Disconnected { reason: String },
    FatalModal { title: String, message: String },
    BlueScreenOfDeath,
    RedCriticalAlert,
    DimmedModalError { dialog_text: Option<String> },
    GenericError(String),
}

/// Verdict detailing whether an error screen was recognized and required safety actions
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScreenErrorVerdict {
    pub is_error: bool,
    pub error_type: Option<ErrorScreenType>,
    pub confidence: f32, // 0.0 to 1.0
    pub description: String,
    pub should_emergency_stop: bool,
}

impl ScreenErrorVerdict {
    pub fn no_error() -> Self {
        Self {
            is_error: false,
            error_type: None,
            confidence: 0.0,
            description: "No error screen detected. Normal execution allowed.".to_string(),
            should_emergency_stop: false,
        }
    }
}

/// Detector identifying error screens, crashes, disconnects, BSODs, and fatal dialogs
#[derive(Debug, Clone)]
pub struct ScreenErrorDetector {
    pub min_confidence_threshold: f32,
}

impl Default for ScreenErrorDetector {
    fn default() -> Self {
        Self::new()
    }
}

impl ScreenErrorDetector {
    pub fn new() -> Self {
        Self {
            min_confidence_threshold: 0.70,
        }
    }

    pub fn with_threshold(min_confidence_threshold: f32) -> Self {
        Self {
            min_confidence_threshold,
        }
    }

    /// Evaluates text extracted from OCR, DOM, or error logs
    pub fn detect_text(&self, text: &str) -> ScreenErrorVerdict {
        let lower = text.to_lowercase();

        // 1. Crash and Fatal System Errors
        let crash_keywords = [
            "fatal error",
            "application crash",
            "crashed unexpectedly",
            "kernel panic",
            "blue screen",
            "bsod",
            "your pc ran into a problem",
            "segmentation fault",
            "access violation at address",
            "unhandled exception",
            "stack overflow",
            "out of memory",
            "system failure",
            "erro fatal",
            "o aplicativo travou",
            "falha catastrófica",
            "falha catastrofica",
        ];

        for kw in crash_keywords {
            if lower.contains(kw) {
                return ScreenErrorVerdict {
                    is_error: true,
                    error_type: Some(ErrorScreenType::ApplicationCrash {
                        signature: kw.to_string(),
                    }),
                    confidence: 0.98,
                    description: format!(
                        "Application crash or fatal error detected in text: '{kw}'"
                    ),
                    should_emergency_stop: true,
                };
            }
        }

        // 2. Disconnect & Network Lost Errors
        let disconnect_keywords = [
            "disconnected from server",
            "connection lost",
            "connection timed out",
            "failed to connect to server",
            "server offline",
            "connection closed by peer",
            "network connection lost",
            "desconectado do servidor",
            "conexão perdida",
            "conexao perdida",
            "servidor indisponível",
            "servidor indisponivel",
        ];

        for kw in disconnect_keywords {
            if lower.contains(kw) {
                return ScreenErrorVerdict {
                    is_error: true,
                    error_type: Some(ErrorScreenType::Disconnected {
                        reason: kw.to_string(),
                    }),
                    confidence: 0.95,
                    description: format!("Network disconnection or server loss detected: '{kw}'"),
                    should_emergency_stop: true,
                };
            }
        }

        // 3. HTTP status codes inside text
        if lower.contains("500 internal server error") || lower.contains("500 erro interno") {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::HttpError {
                    code: 500,
                    message: "Internal Server Error".to_string(),
                }),
                confidence: 0.99,
                description: "HTTP 500 Internal Server Error detected in text".to_string(),
                should_emergency_stop: true,
            };
        }
        if lower.contains("502 bad gateway") {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::HttpError {
                    code: 502,
                    message: "Bad Gateway".to_string(),
                }),
                confidence: 0.99,
                description: "HTTP 502 Bad Gateway detected in text".to_string(),
                should_emergency_stop: true,
            };
        }
        if lower.contains("503 service unavailable") || lower.contains("serviço indisponível") {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::HttpError {
                    code: 503,
                    message: "Service Unavailable".to_string(),
                }),
                confidence: 0.99,
                description: "HTTP 503 Service Unavailable detected in text".to_string(),
                should_emergency_stop: true,
            };
        }
        if lower.contains("404 not found") || lower.contains("404 não encontrado") {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::HttpError {
                    code: 404,
                    message: "Not Found".to_string(),
                }),
                confidence: 0.92,
                description: "HTTP 404 Not Found error screen detected in text".to_string(),
                should_emergency_stop: true,
            };
        }
        if lower.contains("403 forbidden")
            || lower.contains("401 unauthorized")
            || lower.contains("access denied")
        {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::HttpError {
                    code: 403,
                    message: "Access Denied / Forbidden".to_string(),
                }),
                confidence: 0.94,
                description: "HTTP 401/403 Access Denied error screen detected in text".to_string(),
                should_emergency_stop: true,
            };
        }

        // 4. Fatal Modal Dialogs
        let modal_keywords = [
            "error: ",
            "fatal:",
            "an unexpected error has occurred",
            "oops! something went wrong",
            "algo deu errado",
            "ocorreu um erro inesperado",
        ];

        for kw in modal_keywords {
            if lower.contains(kw) {
                return ScreenErrorVerdict {
                    is_error: true,
                    error_type: Some(ErrorScreenType::FatalModal {
                        title: "Blocking Error Modal".to_string(),
                        message: kw.to_string(),
                    }),
                    confidence: 0.88,
                    description: format!("Blocking error modal dialog detected: '{kw}'"),
                    should_emergency_stop: true,
                };
            }
        }

        ScreenErrorVerdict::no_error()
    }

    /// Evaluates direct HTTP response code
    pub fn detect_http_status(&self, status_code: u16, body: Option<&str>) -> ScreenErrorVerdict {
        if status_code >= 500 {
            let msg = body.unwrap_or("Server Error");
            ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::HttpError {
                    code: status_code,
                    message: msg.to_string(),
                }),
                confidence: 1.0,
                description: format!("Critical Server Error HTTP {status_code}: {msg}"),
                should_emergency_stop: true,
            }
        } else if status_code >= 400 {
            let msg = body.unwrap_or("Client Error");
            ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::HttpError {
                    code: status_code,
                    message: msg.to_string(),
                }),
                confidence: 0.90,
                description: format!("Client Error HTTP {status_code}: {msg}"),
                should_emergency_stop: true,
            }
        } else {
            ScreenErrorVerdict::no_error()
        }
    }

    /// Evaluates visual image color and pattern distributions (e.g. BSOD, Red Alert, Dimmed Modal)
    pub fn detect_image(&self, image: &RawImage) -> ScreenErrorVerdict {
        let total_pixels = (image.width * image.height) as usize;
        if total_pixels == 0 || image.data.len() < total_pixels * 4 {
            return ScreenErrorVerdict::no_error();
        }

        let mut bsod_blue_count = 0usize;
        let mut red_alert_count = 0usize;
        let mut dark_dimmed_count = 0usize;

        let (chunks, _) = image.data.as_chunks::<4>();
        for chunk in chunks {
            let r = chunk[0];
            let g = chunk[1];
            let b = chunk[2];
            let a = chunk[3];

            if a < 200 {
                continue;
            }

            // BSOD blue: Deep Windows Blue (#0078D7 or similar)
            if b >= 140 && r <= 70 && g <= 140 && b > r.saturating_add(g) / 2 + 30 {
                bsod_blue_count += 1;
            }

            // Red Critical Alert
            if r >= 160 && g <= 60 && b <= 60 {
                red_alert_count += 1;
            }

            // Dark/dimmed backdrop (common in modal dialog overlays)
            if r <= 40 && g <= 40 && b <= 40 {
                dark_dimmed_count += 1;
            }
        }

        let bsod_ratio = bsod_blue_count as f32 / total_pixels as f32;
        let red_ratio = red_alert_count as f32 / total_pixels as f32;
        let dark_ratio = dark_dimmed_count as f32 / total_pixels as f32;

        if bsod_ratio >= 0.40 {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::BlueScreenOfDeath),
                confidence: (bsod_ratio * 1.5).min(1.0),
                description: format!(
                    "Blue Screen of Death (BSOD) recognized! Dominant deep blue ratio: {:.1}%",
                    bsod_ratio * 100.0
                ),
                should_emergency_stop: true,
            };
        }

        if red_ratio >= 0.25 {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::RedCriticalAlert),
                confidence: (red_ratio * 2.0).min(1.0),
                description: format!(
                    "Red Critical Alert recognized! Dominant red screen ratio: {:.1}%",
                    red_ratio * 100.0
                ),
                should_emergency_stop: true,
            };
        }

        if dark_ratio >= 0.60 {
            return ScreenErrorVerdict {
                is_error: true,
                error_type: Some(ErrorScreenType::DimmedModalError { dialog_text: None }),
                confidence: 0.75,
                description: format!(
                    "Dimmed modal dialog overlay detected! Dimmed backdrop ratio: {:.1}%",
                    dark_ratio * 100.0
                ),
                should_emergency_stop: true,
            };
        }

        ScreenErrorVerdict::no_error()
    }

    /// Multimodal detector combining visual frame, textual cues, and optional HTTP status code
    pub fn detect_multimodal(
        &self,
        image: Option<&RawImage>,
        text: Option<&str>,
        http_code: Option<u16>,
    ) -> ScreenErrorVerdict {
        // 1. Check HTTP status if present
        if let Some(code) = http_code {
            let http_verdict = self.detect_http_status(code, text);
            if http_verdict.is_error && http_verdict.should_emergency_stop {
                return http_verdict;
            }
        }

        // 2. Check text OCR/DOM cues
        if let Some(txt) = text {
            let text_verdict = self.detect_text(txt);
            if text_verdict.is_error && text_verdict.confidence >= self.min_confidence_threshold {
                return text_verdict;
            }
        }

        // 3. Check visual frame
        if let Some(img) = image {
            let img_verdict = self.detect_image(img);
            if img_verdict.is_error && img_verdict.confidence >= self.min_confidence_threshold {
                return img_verdict;
            }
        }

        ScreenErrorVerdict::no_error()
    }

    /// Evaluates multimodal inputs and triggers GlobalEmergencyStop if an error is detected
    pub fn check_and_halt_if_error(
        &self,
        image: Option<&RawImage>,
        text: Option<&str>,
        http_code: Option<u16>,
    ) -> ScreenErrorVerdict {
        let verdict = self.detect_multimodal(image, text, http_code);
        if verdict.should_emergency_stop {
            GlobalEmergencyStop::trigger_with_reason(EmergencyStopReason::ScreenError(
                verdict.description.clone(),
            ));
        }
        verdict
    }
}
