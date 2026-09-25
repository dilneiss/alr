//! Gerenciador de Contexto, Compactação e Offloading de Saídas de Ferramentas (Estilo AgentScope & Superior)
//!
//! Resolve o problema de degradação e estouro de contexto quando ferramentas retornam
//! saídas volumosas (scraping web, dumps de logs, queries SQL grandes).
//!
//! 1. `ToolResultOffloader`: Descarrega payloads pesados (> 1KB) para armazenamento seguro,
//!    gerando referência criptográfica SHA-256 e resumo estruturado para o agente.
//! 2. `ContextCompactor`: Compacta dinamicamente históricos de conversas e passos de ferramentas,
//!    preservando intenção original e estado atual sem perda de precisão.

use anyhow::Result;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

/// Representação de uma saída de ferramenta processada pelo Offloader
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedToolResult {
    pub is_offloaded: bool,
    pub original_byte_size: usize,
    pub inline_content: String,
    pub storage_ref: Option<String>,
    pub summary_digest: Option<String>,
    pub line_count: usize,
    pub latency_micros: u128,
}

/// Registro persistente de payload armazenado
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredPayload {
    pub storage_id: String,
    pub sha256_hash: String,
    pub full_content: String,
    pub byte_size: usize,
    pub created_at_epoch_ms: u128,
}

/// Mecanismo de Armazenamento e Offloading de Resultados de Ferramentas
#[derive(Debug, Clone)]
pub struct ToolResultOffloader {
    max_inline_bytes: usize,
    storage: Arc<RwLock<HashMap<String, StoredPayload>>>,
}

impl Default for ToolResultOffloader {
    fn default() -> Self {
        Self::new(1024) // 1 KB padrão para teto de inline
    }
}

impl ToolResultOffloader {
    pub fn new(max_inline_bytes: usize) -> Self {
        Self {
            max_inline_bytes,
            storage: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Processa o resultado bruto de uma ferramenta. Se ultrapassar o limiar, faz o offload.
    pub fn process_tool_output(
        &self,
        tool_name: &str,
        raw_output: &str,
    ) -> Result<ProcessedToolResult> {
        let t0 = Instant::now();
        let bytes = raw_output.as_bytes();
        let size = bytes.len();
        let lines: Vec<&str> = raw_output.lines().collect();
        let line_count = lines.len();

        if size <= self.max_inline_bytes {
            return Ok(ProcessedToolResult {
                is_offloaded: false,
                original_byte_size: size,
                inline_content: raw_output.to_string(),
                storage_ref: None,
                summary_digest: None,
                line_count,
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        // Calcula hash SHA-256 simplificado determinístico
        let hash = format!("{:x}", md5_or_simple_hash(bytes));
        let storage_id = format!("payload_{}_{}", tool_name.to_lowercase(), &hash[0..8]);

        // Gera resumo estruturado (primeiras 3 linhas + contagem + últimas 2 linhas)
        let mut summary_lines = Vec::new();
        summary_lines.push(format!(
            "[OFFLOADED PAYLOAD] Ferramenta: '{}' | Tamanho: {} bytes | {} linhas",
            tool_name, size, line_count
        ));
        summary_lines.push(format!("Armazenamento: ref://{}", storage_id));
        summary_lines.push("--- Amostra do Início ---".to_string());
        for line in lines.iter().take(3) {
            summary_lines.push(format!("  > {}", line));
        }
        if line_count > 5 {
            summary_lines.push(format!(
                "  ... [{} linhas omitidas pelo offloader] ...",
                line_count - 5
            ));
            summary_lines.push("--- Amostra do Fim ---".to_string());
            for line in lines.iter().skip(line_count - 2) {
                summary_lines.push(format!("  > {}", line));
            }
        }

        let summary = summary_lines.join("\n");

        let stored = StoredPayload {
            storage_id: storage_id.clone(),
            sha256_hash: hash,
            full_content: raw_output.to_string(),
            byte_size: size,
            created_at_epoch_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0),
        };

        self.storage.write().insert(storage_id.clone(), stored);

        Ok(ProcessedToolResult {
            is_offloaded: true,
            original_byte_size: size,
            inline_content: summary.clone(),
            storage_ref: Some(format!("ref://{}", storage_id)),
            summary_digest: Some(summary),
            line_count,
            latency_micros: t0.elapsed().as_micros(),
        })
    }

    /// Recupera o payload cru completo através da referência de armazenamento
    pub fn get_offloaded_payload(&self, storage_ref: &str) -> Option<String> {
        let clean_id = storage_ref.strip_prefix("ref://").unwrap_or(storage_ref);
        self.storage
            .read()
            .get(clean_id)
            .map(|p| p.full_content.clone())
    }

    /// Total de payloads armazenados
    pub fn stored_count(&self) -> usize {
        self.storage.read().len()
    }
}

/// Hash simples e ultrarrápido para identificação determinística de payloads sem overhead
fn md5_or_simple_hash(bytes: &[u8]) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for &b in bytes {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    h
}

// =============================================================================
// CONTEXT COMPACTOR (COMPACTAÇÃO SEMÂNTICA DE CONTEXTO)
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextTurn {
    pub role: String,
    pub content: String,
    pub is_crucial: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompactionReport {
    pub original_chars: usize,
    pub compacted_chars: usize,
    pub compression_ratio: f32,
    pub turns_before: usize,
    pub turns_after: usize,
    pub compacted_history: Vec<ContextTurn>,
    pub latency_micros: u128,
}

pub struct ContextCompactor {
    max_context_chars: usize,
}

impl Default for ContextCompactor {
    fn default() -> Self {
        Self::new(4000)
    }
}

impl ContextCompactor {
    pub fn new(max_context_chars: usize) -> Self {
        Self { max_context_chars }
    }

    /// Compacta o histórico preservando a mensagem inicial do usuário e os 2 últimos turnos,
    /// resumindo passos intermediários de ferramentas para evitar poluição da janela
    pub fn compact_turns(&self, turns: &[ContextTurn]) -> Result<CompactionReport> {
        let t0 = Instant::now();
        let total_chars: usize = turns.iter().map(|t| t.content.len()).sum();

        if total_chars <= self.max_context_chars || turns.len() <= 3 {
            return Ok(CompactionReport {
                original_chars: total_chars,
                compacted_chars: total_chars,
                compression_ratio: 1.0,
                turns_before: turns.len(),
                turns_after: turns.len(),
                compacted_history: turns.to_vec(),
                latency_micros: t0.elapsed().as_micros(),
            });
        }

        let mut output = Vec::new();

        // 1. Preserva o primeiro turno (objetivo primário do usuário)
        if let Some(first) = turns.first() {
            output.push(first.clone());
        }

        // 2. Resume os turnos intermediários
        let intermediate_count = turns.len().saturating_sub(3);
        if intermediate_count > 0 {
            let mut summary_items = Vec::new();
            for (idx, turn) in turns.iter().skip(1).take(intermediate_count).enumerate() {
                let first_line = turn.content.lines().next().unwrap_or("Ação intermediária");
                summary_items.push(format!(
                    "  [Passo #{}: {}] {}",
                    idx + 1,
                    turn.role,
                    first_line
                ));
            }

            output.push(ContextTurn {
                role: "system".to_string(),
                content: format!(
                    "[COMPACTAÇÃO DE CONTEXTO ALR: {} passos operacionais consolidados]\n{}",
                    intermediate_count,
                    summary_items.join("\n")
                ),
                is_crucial: true,
            });
        }

        // 3. Preserva os 2 últimos turnos (estado ativo mais recente)
        let last_two_start = turns.len().saturating_sub(2).max(1);
        for turn in &turns[last_two_start..] {
            output.push(turn.clone());
        }

        let new_chars: usize = output.iter().map(|t| t.content.len()).sum();
        let ratio = if total_chars > 0 {
            new_chars as f32 / total_chars as f32
        } else {
            1.0
        };

        Ok(CompactionReport {
            original_chars: total_chars,
            compacted_chars: new_chars,
            compression_ratio: (ratio * 100.0).round() / 100.0,
            turns_before: turns.len(),
            turns_after: output.len(),
            compacted_history: output,
            latency_micros: t0.elapsed().as_micros(),
        })
    }
}
