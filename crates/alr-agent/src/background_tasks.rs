//! Gerenciador de Tarefas em Segundo Plano e Despachante de Wakeup (Estilo AgentScope & Superior)
//!
//! Permite que ferramentas de execução demorada (treinamento, compilação, benchmarking massivo,
//! web scraping extensivo) sejam descarregadas para threads em background.
//! Ao concluir, o `WakeupDispatcher` dispara um evento estruturado que acorda o agente
//! para prosseguir autonomamente com a resolução da tarefa.

use anyhow::{bail, Result};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::mpsc;

/// Estado do ciclo de vida da tarefa em segundo plano
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BackgroundTaskState {
    Running,
    Completed,
    Failed,
    Canceled,
}

impl BackgroundTaskState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Running => "Em Execução",
            Self::Completed => "Concluída com Sucesso",
            Self::Failed => "Falha na Execução",
            Self::Canceled => "Cancelada",
        }
    }
}

/// Registro estruturado de uma tarefa em segundo plano
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundTaskRecord {
    pub task_id: String,
    pub agent_id: String,
    pub tool_name: String,
    pub description: String,
    pub state: BackgroundTaskState,
    pub created_at_ms: u128,
    pub completed_at_ms: Option<u128>,
    pub result_summary: Option<String>,
    pub error_message: Option<String>,
}

/// Evento de Wakeup emitido ao término de uma tarefa
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WakeupNotification {
    pub notification_id: String,
    pub task_id: String,
    pub agent_id: String,
    pub state: BackgroundTaskState,
    pub result_summary: String,
    pub elapsed_ms: u128,
    pub emitted_at_epoch_ms: u128,
}

/// Recibo imediato devolvido ao agente ao despachar a tarefa
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskSubmissionReceipt {
    pub task_id: String,
    pub tool_name: String,
    pub state: BackgroundTaskState,
    pub ack_message: String,
    pub latency_micros: u128,
}

/// Gerenciador de Tarefas em Segundo Plano e Despachante de Wakeup
#[derive(Clone)]
pub struct BackgroundTaskManager {
    tasks: Arc<RwLock<HashMap<String, BackgroundTaskRecord>>>,
    wakeup_sender: mpsc::Sender<WakeupNotification>,
    wakeup_receiver: Arc<tokio::sync::Mutex<mpsc::Receiver<WakeupNotification>>>,
}

impl Default for BackgroundTaskManager {
    fn default() -> Self {
        Self::new(100)
    }
}

impl BackgroundTaskManager {
    pub fn new(channel_capacity: usize) -> Self {
        let (tx, rx) = mpsc::channel(channel_capacity);
        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
            wakeup_sender: tx,
            wakeup_receiver: Arc::new(tokio::sync::Mutex::new(rx)),
        }
    }

    /// Submete uma tarefa em segundo plano com execução assíncrona simulada ou real
    pub fn submit_task(
        &self,
        agent_id: &str,
        tool_name: &str,
        description: &str,
        simulated_workload_ms: u64,
        payload_result: &str,
    ) -> Result<TaskSubmissionReceipt> {
        let t0 = Instant::now();
        let task_id = format!(
            "task_{}_{}",
            tool_name.to_lowercase(),
            uuid::Uuid::new_v4().simple()
        );
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);

        let record = BackgroundTaskRecord {
            task_id: task_id.clone(),
            agent_id: agent_id.to_string(),
            tool_name: tool_name.to_string(),
            description: description.to_string(),
            state: BackgroundTaskState::Running,
            created_at_ms: now_ms,
            completed_at_ms: None,
            result_summary: None,
            error_message: None,
        };

        self.tasks.write().insert(task_id.clone(), record);

        // Dispara worker assíncrono em background
        let tasks_arc = self.tasks.clone();
        let tx = self.wakeup_sender.clone();
        let tid = task_id.clone();
        let aid = agent_id.to_string();
        let payload = payload_result.to_string();

        tokio::spawn(async move {
            if simulated_workload_ms > 0 {
                tokio::time::sleep(tokio::time::Duration::from_millis(simulated_workload_ms)).await;
            }

            let comp_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0);

            // Atualiza registro de conclusão
            {
                let mut map = tasks_arc.write();
                if let Some(task) = map.get_mut(&tid) {
                    task.state = BackgroundTaskState::Completed;
                    task.completed_at_ms = Some(comp_ms);
                    task.result_summary = Some(payload.clone());
                }
            }

            // Emite notificação de Wakeup no canal
            let notif = WakeupNotification {
                notification_id: format!("notif_{}", uuid::Uuid::new_v4().simple()),
                task_id: tid,
                agent_id: aid,
                state: BackgroundTaskState::Completed,
                result_summary: payload,
                elapsed_ms: simulated_workload_ms as u128,
                emitted_at_epoch_ms: comp_ms,
            };

            let _ = tx.send(notif).await;
        });

        let ack = format!(
            "Tarefa '{}' (#{description}) delegada para execução assíncrona em background.",
            tool_name
        );

        Ok(TaskSubmissionReceipt {
            task_id,
            tool_name: tool_name.to_string(),
            state: BackgroundTaskState::Running,
            ack_message: ack,
            latency_micros: t0.elapsed().as_micros(),
        })
    }

    /// Consulta o estado atual de uma tarefa
    pub fn get_task_status(&self, task_id: &str) -> Option<BackgroundTaskRecord> {
        self.tasks.read().get(task_id).cloned()
    }

    /// Tenta receber uma notificação de wakeup disponível (não-bloqueante)
    pub fn try_recv_wakeup(&self) -> Option<WakeupNotification> {
        let mut rx = self.wakeup_receiver.try_lock().ok()?;
        rx.try_recv().ok()
    }

    /// Aguarda a próxima notificação de wakeup (bloqueante assíncrono)
    pub async fn wait_for_wakeup(&self) -> Option<WakeupNotification> {
        let mut rx = self.wakeup_receiver.lock().await;
        rx.recv().await
    }

    /// Cancela uma tarefa em execução
    pub fn cancel_task(&self, task_id: &str) -> Result<()> {
        let mut map = self.tasks.write();
        let Some(task) = map.get_mut(task_id) else {
            bail!("Tarefa '{}' não encontrada para cancelamento", task_id);
        };

        if task.state == BackgroundTaskState::Running {
            task.state = BackgroundTaskState::Canceled;
            task.error_message =
                Some("Cancelada por instrução explícita do supervisor".to_string());
        }
        Ok(())
    }

    /// Lista todas as tarefas registradas
    pub fn list_tasks(&self) -> Vec<BackgroundTaskRecord> {
        self.tasks.read().values().cloned().collect()
    }
}
