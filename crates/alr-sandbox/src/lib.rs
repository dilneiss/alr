use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

/// Errors arising within the WASM Skill Sandbox
#[derive(Debug, Error, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum WasmSandboxError {
    #[error("Linear memory limit exceeded: requested {requested} bytes, maximum allowed is {limit} bytes")]
    MemoryExceeded { requested: usize, limit: usize },

    #[error("Execution gas exhausted: consumed {consumed} units, limit is {limit} units (prevented infinite loop)")]
    GasExhausted { consumed: u64, limit: u64 },

    #[error("Unauthorized capability violation: tool or syscall '{capability}' is forbidden by sandbox policy")]
    UnauthorizedCapability { capability: String },

    #[error("Execution trap in WebAssembly runtime: {message}")]
    Trap { message: String },

    #[error("Sandboxed execution failed: {reason}")]
    ExecutionFailed { reason: String },
}

/// Configuration parameters for WebAssembly Skill Sandboxing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmSandboxConfig {
    /// Maximum linear memory allowed (Default: 32 MB)
    pub max_memory_bytes: usize,
    /// Maximum computational gas units allowed (Prevents infinite loops)
    pub max_execution_gas: u64,
    /// Maximum execution timeout in milliseconds
    pub timeout_millis: u64,
    /// Whitelist of allowed tool capabilities
    pub allowed_capabilities: Vec<String>,
}

impl Default for WasmSandboxConfig {
    fn default() -> Self {
        Self {
            max_memory_bytes: 32 * 1024 * 1024, // 32 MB
            max_execution_gas: 100_000,         // 100k gas units
            timeout_millis: 50,                 // 50ms deterministic timeout
            allowed_capabilities: vec![
                "get_order".to_string(),
                "get_payment".to_string(),
                "get_refund_policy".to_string(),
                "send_ticket_reply".to_string(),
                "search_knowledge".to_string(),
                "search_similar_tickets".to_string(),
            ],
        }
    }
}

/// Outcome of a sandboxed skill execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmExecutionOutcome {
    pub skill_id: String,
    pub success: bool,
    pub gas_consumed: u64,
    pub memory_used_bytes: usize,
    pub result: serde_json::Value,
    pub executed_steps: usize,
    pub sha256_hash: String,
}

/// Deterministic WebAssembly Skill Sandbox Runtime
pub struct WasmSkillSandbox {
    pub config: WasmSandboxConfig,
    pub gas_consumed: u64,
    pub allocated_memory: usize,
    memory_buffer: Vec<u8>,
}

impl Default for WasmSkillSandbox {
    fn default() -> Self {
        Self::new(WasmSandboxConfig::default())
    }
}

impl WasmSkillSandbox {
    pub fn new(config: WasmSandboxConfig) -> Self {
        let initial_alloc = 64 * 1024; // 64 KB initial page
        Self {
            config,
            gas_consumed: 0,
            allocated_memory: initial_alloc,
            memory_buffer: vec![0u8; initial_alloc],
        }
    }

    pub fn default_restricted() -> Self {
        Self::new(WasmSandboxConfig {
            max_memory_bytes: 16 * 1024 * 1024, // 16 MB restricted
            max_execution_gas: 50_000,
            timeout_millis: 25,
            allowed_capabilities: vec!["send_ticket_reply".to_string()],
        })
    }

    /// Verifies that a memory access lies strictly within the linear memory boundary
    pub fn verify_memory_bounds(&self, pointer: usize, len: usize) -> Result<(), WasmSandboxError> {
        let end = pointer.saturating_add(len);
        if end > self.config.max_memory_bytes {
            return Err(WasmSandboxError::MemoryExceeded {
                requested: end,
                limit: self.config.max_memory_bytes,
            });
        }
        Ok(())
    }

    /// Allocates additional linear memory up to the configured boundary
    pub fn allocate_memory(&mut self, bytes: usize) -> Result<usize, WasmSandboxError> {
        let new_total = self.allocated_memory.saturating_add(bytes);
        if new_total > self.config.max_memory_bytes {
            return Err(WasmSandboxError::MemoryExceeded {
                requested: new_total,
                limit: self.config.max_memory_bytes,
            });
        }
        self.allocated_memory = new_total;
        self.memory_buffer.resize(new_total, 0);
        Ok(new_total)
    }

    /// Consumes computational gas, checking against the maximum execution quota
    pub fn consume_gas(&mut self, amount: u64) -> Result<(), WasmSandboxError> {
        self.gas_consumed = self.gas_consumed.saturating_add(amount);
        if self.gas_consumed > self.config.max_execution_gas {
            return Err(WasmSandboxError::GasExhausted {
                consumed: self.gas_consumed,
                limit: self.config.max_execution_gas,
            });
        }
        Ok(())
    }

    pub fn remaining_gas(&self) -> u64 {
        self.config
            .max_execution_gas
            .saturating_sub(self.gas_consumed)
    }

    pub fn reset_gas(&mut self) {
        self.gas_consumed = 0;
    }

    /// Executes a procedural skill within the sandboxed environment with strict capability and gas checks
    pub fn execute_sandboxed_skill(
        &mut self,
        skill_id: &str,
        steps: &[serde_json::Value],
        available_tools: &[String],
    ) -> Result<WasmExecutionOutcome, WasmSandboxError> {
        self.reset_gas();
        let mut executed = 0;
        let mut results = Vec::new();

        // Compute deterministic SHA-256 hash of the skill payload
        let mut hasher = Sha256::new();
        hasher.update(skill_id.as_bytes());

        for step in steps {
            // Cost per instruction / step execution
            self.consume_gas(1_500)?;

            let tool_name = step
                .get("tool_name")
                .and_then(|t| t.as_str())
                .unwrap_or("unknown_tool");

            hasher.update(tool_name.as_bytes());

            // 1. Capability Permission Check: Is the tool in the allowed capability whitelist?
            if !self
                .config
                .allowed_capabilities
                .iter()
                .any(|c| c == tool_name)
            {
                return Err(WasmSandboxError::UnauthorizedCapability {
                    capability: tool_name.to_string(),
                });
            }

            // 2. Host Availability Check: Is the tool currently provided by the host environment?
            if !available_tools.iter().any(|t| t == tool_name) {
                return Err(WasmSandboxError::ExecutionFailed {
                    reason: format!(
                        "Tool '{}' authorized by sandbox but absent in host catalog",
                        tool_name
                    ),
                });
            }

            // 3. Memory Linear Access Check: allocate working memory for tool I/O
            let payload_size = serde_json::to_vec(step).map(|v| v.len()).unwrap_or(256);
            self.allocate_memory(payload_size)?;
            self.consume_gas(payload_size as u64)?;

            results.push(serde_json::json!({
                "step": executed,
                "tool": tool_name,
                "status": "SANDBOX_OK",
            }));

            executed += 1;
        }

        let sha256_hash = hex::encode(hasher.finalize());

        Ok(WasmExecutionOutcome {
            skill_id: skill_id.to_string(),
            success: true,
            gas_consumed: self.gas_consumed,
            memory_used_bytes: self.allocated_memory,
            result: serde_json::Value::Array(results),
            executed_steps: executed,
            sha256_hash,
        })
    }
}
