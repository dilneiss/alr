use crate::traits::LlmTeacher;
use alr_core::{Action, KnowledgeProposal, KnowledgeRequest};
use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::Duration;

pub struct OpenAiCompatibleLlmTeacher {
    client: Client,
    base_url: String,
    api_key: Option<String>,
    model: String,
    calls: AtomicU32,
}

impl OpenAiCompatibleLlmTeacher {
    pub fn new(base_url: String, api_key: Option<String>, model: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_default();
        Self {
            client,
            base_url,
            api_key,
            model,
            calls: AtomicU32::new(0),
        }
    }

    pub fn from_env() -> Self {
        let base_url = std::env::var("LLM_BASE_URL")
            .unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
        let api_key = std::env::var("LLM_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty());
        let model = std::env::var("LLM_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string());
        Self::new(base_url, api_key, model)
    }
}

#[async_trait]
impl LlmTeacher for OpenAiCompatibleLlmTeacher {
    async fn propose_knowledge(&self, req: KnowledgeRequest) -> Result<KnowledgeProposal> {
        self.calls.fetch_add(1, Ordering::SeqCst);

        let endpoint = format!("{}/chat/completions", self.base_url.trim_end_matches('/'));

        let system_prompt = r#"You are the Teacher Oracle for an Autonomous Learning Runtime (ALR).
Analyze the environment state and output a structured knowledge proposal JSON with EXACTLY this schema:
{
  "knowledge_type": "policy",
  "state_conditions": { ... },
  "action": { "type": "UP" | "DOWN" | "LEFT" | "RIGHT" },
  "reason": "explanation string",
  "confidence": 0.0 to 1.0
}
Output only valid JSON."#;

        let user_content = json!({
            "features": req.state.features,
            "metadata": req.state.metadata,
            "context": req.context_description,
            "candidate_actions": req.candidate_actions,
            "failure_history": req.failure_history,
        });

        let body = json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_content.to_string() }
            ],
            "temperature": 0.1,
            "response_format": { "type": "json_object" }
        });

        let mut request = self.client.post(&endpoint).json(&body);
        if let Some(key) = &self.api_key {
            request = request.bearer_auth(key);
        }

        let resp = request
            .send()
            .await
            .context("Failed to contact LLM endpoint")?;
        if !resp.status().is_success() {
            let error_text = resp.text().await.unwrap_or_default();
            anyhow::bail!("LLM API returned error: {}", error_text);
        }

        let resp_json: serde_json::Value = resp
            .json()
            .await
            .context("Failed to parse LLM response JSON")?;
        let content_str = resp_json["choices"][0]["message"]["content"]
            .as_str()
            .context("Missing content string in choices")?;

        let parsed: serde_json::Value = serde_json::from_str(content_str)
            .context("LLM content was not valid JSON matching proposal schema")?;

        let action_val = &parsed["action"];
        let action_id = action_val["type"]
            .as_str()
            .or_else(|| action_val["id"].as_str())
            .unwrap_or("UNKNOWN")
            .to_string();

        let confidence = parsed["confidence"].as_f64().unwrap_or(0.8) as f32;
        let reason = parsed["reason"]
            .as_str()
            .unwrap_or("LLM guidance")
            .to_string();

        Ok(KnowledgeProposal {
            knowledge_type: parsed["knowledge_type"]
                .as_str()
                .unwrap_or("policy")
                .to_string(),
            state_conditions: parsed["state_conditions"].clone(),
            action: Action::new(action_id, action_val.clone()),
            reason,
            confidence: confidence.clamp(0.0, 1.0),
        })
    }

    fn call_count(&self) -> u32 {
        self.calls.load(Ordering::SeqCst)
    }

    fn reset_counter(&self) {
        self.calls.store(0, Ordering::SeqCst);
    }
}
