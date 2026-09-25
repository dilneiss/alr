//! Sistema Unificado de Logs e Diagnóstico em Arquivo para o Trading Desk
//!
//! Grava logs estruturados em `logs/trading_desk.log` e mantém um buffer circular em memória
//! para inspeção em tempo real através do dashboard web e APIs REST.

use anyhow::Result;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// Entrada estruturada de log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub module: String,
    pub message: String,
    pub details: Option<String>,
}

/// Gerenciador de logs do Trading Desk com gravação persistente em arquivo
#[derive(Clone)]
pub struct TradingDeskLogger {
    file_path: PathBuf,
    file_handle: Arc<Mutex<Option<File>>>,
    recent_buffer: Arc<Mutex<VecDeque<LogEntry>>>,
    max_memory_entries: usize,
}

impl Default for TradingDeskLogger {
    fn default() -> Self {
        Self::new("logs/trading_desk.log")
    }
}

impl TradingDeskLogger {
    pub fn new<P: AsRef<Path>>(path: P) -> Self {
        let file_path = path.as_ref().to_path_buf();

        if let Some(parent) = file_path.parent() {
            if !parent.as_os_str().is_empty() {
                let _ = std::fs::create_dir_all(parent);
            }
        }

        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)
            .ok();

        let logger = Self {
            file_path,
            file_handle: Arc::new(Mutex::new(file)),
            recent_buffer: Arc::new(Mutex::new(VecDeque::with_capacity(300))),
            max_memory_entries: 250,
        };

        logger.log(
            "INFO",
            "LOGGER",
            "Trading Desk Logger inicializado com persistência em disco.",
            None,
        );

        logger
    }

    /// Registra uma mensagem nos logs com nível de severidade e detalhes opcionais
    pub fn log(&self, level: &str, module: &str, message: &str, details: Option<&str>) {
        let now_str = chrono::Local::now()
            .format("%Y-%m-%d %H:%M:%S%.3f")
            .to_string();

        let entry = LogEntry {
            timestamp: now_str.clone(),
            level: level.to_uppercase(),
            module: module.to_uppercase(),
            message: message.to_string(),
            details: details.map(|s| s.to_string()),
        };

        // Formata linha para gravação em arquivo
        let log_line = if let Some(d) = details {
            format!(
                "[{}] [{}] [{}] {} | Detalhes: {}\n",
                now_str,
                level.to_uppercase(),
                module.to_uppercase(),
                message,
                d
            )
        } else {
            format!(
                "[{}] [{}] [{}] {}\n",
                now_str,
                level.to_uppercase(),
                module.to_uppercase(),
                message
            )
        };

        // 1. Gravação no arquivo
        let mut handle_guard = self.file_handle.lock();
        if handle_guard.is_none() {
            if let Some(parent) = self.file_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            *handle_guard = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.file_path)
                .ok();
        }

        if let Some(ref mut file) = *handle_guard {
            let _ = file.write_all(log_line.as_bytes());
            let _ = file.flush();
        }

        // 2. Armazena no buffer de memória para consulta imediata na UI
        let mut buf = self.recent_buffer.lock();
        if buf.len() >= self.max_memory_entries {
            buf.pop_front();
        }
        buf.push_back(entry);
    }

    pub fn info(&self, module: &str, message: &str) {
        self.log("INFO", module, message, None);
    }

    pub fn warn(&self, module: &str, message: &str) {
        self.log("WARN", module, message, None);
    }

    pub fn error(&self, module: &str, message: &str, details: Option<&str>) {
        self.log("ERROR", module, message, details);
    }

    pub fn trade(&self, asset: &str, message: &str) {
        self.log("TRADE", asset, message, None);
    }

    /// Retorna os logs mais recentes armazenados em memória
    pub fn get_recent_logs(&self) -> Vec<LogEntry> {
        let buf = self.recent_buffer.lock();
        buf.iter().cloned().collect()
    }

    /// Retorna o caminho absoluto ou relativo do arquivo de log
    pub fn log_file_path(&self) -> PathBuf {
        self.file_path.clone()
    }

    /// Lê todo o conteúdo textual do arquivo de log do disco
    pub fn read_entire_log_file(&self) -> Result<String> {
        Ok(std::fs::read_to_string(&self.file_path)?)
    }
}
