use anyhow::Result;
use chrono::{DateTime, Utc};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

/// Níveis de ameaça para eventos de vigilância e notificações de segurança
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum ThreatLevel {
    Seguro,
    Baixo,
    Medio,
    Alto,
    InvasaoCritica,
}

impl ThreatLevel {
    pub fn is_critical(&self) -> bool {
        matches!(self, ThreatLevel::InvasaoCritica)
    }

    pub fn requires_audible_alert(&self) -> bool {
        matches!(self, ThreatLevel::Alto | ThreatLevel::InvasaoCritica)
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            ThreatLevel::Seguro => "Seguro",
            ThreatLevel::Baixo => "Baixo",
            ThreatLevel::Medio => "Médio",
            ThreatLevel::Alto => "Alto",
            ThreatLevel::InvasaoCritica => "Invasão Crítica",
        }
    }
}

/// Registro in-memory de notificação despachada
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationRecord {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub title: String,
    pub message: String,
    pub threat: ThreatLevel,
    pub delivered: bool,
    pub audible_alert: bool,
}

/// Trait universal para serviço de notificações de desktop
pub trait DesktopNotificationService: Send + Sync {
    fn send_notification(&self, title: &str, message: &str, threat: ThreatLevel) -> Result<()>;
}

// -----------------------------------------------------------------------------
// Windows Native API FFI (Zero-Dependency user32.dll bindings para alertas sonoros)
#[cfg(target_os = "windows")]
#[allow(dead_code)]
mod win_ffi {
    pub const MB_ICONHAND: u32 = 0x0000_0010;
    pub const MB_ICONEXCLAMATION: u32 = 0x0000_0030;
    pub const MB_ICONASTERISK: u32 = 0x0000_0040;
    pub const MB_OK: u32 = 0x0000_0000;

    #[link(name = "user32")]
    extern "system" {
        pub fn MessageBeep(uType: u32) -> i32;
    }
}

/// Notificador de Desktop nativo do Windows (Toast + Alerta Sonoro MessageBeep)
pub struct WindowsToastNotifier {
    pub dry_run: bool,
    history: Arc<Mutex<Vec<NotificationRecord>>>,
}

impl WindowsToastNotifier {
    pub fn new(dry_run: bool) -> Self {
        Self {
            dry_run,
            history: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn with_dry_run(mut self, dry_run: bool) -> Self {
        self.dry_run = dry_run;
        self
    }

    pub fn history(&self) -> Vec<NotificationRecord> {
        self.history.lock().clone()
    }

    pub fn last_notification(&self) -> Option<NotificationRecord> {
        self.history.lock().last().cloned()
    }

    pub fn clear_history(&self) {
        self.history.lock().clear();
    }

    pub fn notification_count(&self) -> usize {
        self.history.lock().len()
    }
}

impl Default for WindowsToastNotifier {
    fn default() -> Self {
        Self::new(false)
    }
}

impl DesktopNotificationService for WindowsToastNotifier {
    fn send_notification(&self, title: &str, message: &str, threat: ThreatLevel) -> Result<()> {
        let audible_alert = threat.requires_audible_alert();
        let record = NotificationRecord {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            title: title.to_string(),
            message: message.to_string(),
            threat,
            delivered: true,
            audible_alert,
        };

        // Grava no histórico auditável in-memory
        self.history.lock().push(record);

        if self.dry_run {
            tracing::info!(
                title = %title,
                message = %message,
                threat = ?threat,
                "WindowsToastNotifier [DRY-RUN] Notificação registrada com sucesso"
            );
            return Ok(());
        }

        // Execução nativa no Windows
        #[cfg(target_os = "windows")]
        {
            // 1. Alerta sonoro síncrono nativo via Win32 MessageBeep
            if audible_alert {
                unsafe {
                    let sound_type = if threat == ThreatLevel::InvasaoCritica {
                        win_ffi::MB_ICONHAND
                    } else if threat == ThreatLevel::Alto {
                        win_ffi::MB_ICONEXCLAMATION
                    } else {
                        win_ffi::MB_ICONASTERISK
                    };
                    let _ = win_ffi::MessageBeep(sound_type);
                }
            }

            // 2. Disparo de Windows Toast Notification de forma não-bloqueante
            let title_owned = title.to_string();
            let msg_owned = message.to_string();
            std::thread::spawn(move || {
                let safe_title = title_owned.replace('"', "`\"");
                let safe_msg = msg_owned.replace('"', "`\"");
                let ps_script = format!(
                    "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null; \
                     $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); \
                     $nodes = $template.GetElementsByTagName('text'); \
                     $nodes.Item(0).AppendChild($template.CreateTextNode(\"{safe_title}\")) > $null; \
                     $nodes.Item(1).AppendChild($template.CreateTextNode(\"{safe_msg}\")) > $null; \
                     $toast = [Windows.UI.Notifications.ToastNotification]::new($template); \
                     [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('ALR Surveillance').Show($toast);"
                );

                #[cfg(target_os = "windows")]
                use std::os::windows::process::CommandExt;
                let mut cmd = std::process::Command::new("powershell");
                cmd.args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    &ps_script,
                ]);
                #[cfg(target_os = "windows")]
                cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW

                let _ = cmd.spawn();
            });
        }

        #[cfg(not(target_os = "windows"))]
        {
            tracing::info!(
                title = %title,
                message = %message,
                threat = ?threat,
                "DesktopNotificationService [NON-WINDOWS] Notificação simulada"
            );
        }

        Ok(())
    }
}
