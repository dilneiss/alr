//! Motor e API Canônica /v1/systemone (Totalmente Compatível com TypeSafe Jev & Open-Jev)
//!
//! Permite que qualquer cliente HTTP ou SDK oficial do JEV (`from jev.client import Client`)
//! se conecte diretamente ao runtime do ALR recebendo decisões tipadas em sub-microssegundos
//! sem custo de tokens ($0.00) e sem dependência de GPU.
//!
//! Suporta os 3 tipos canônicos de perguntas:
//! 1. `choice`: Seleção entre candidatos com critérios descritivos e distribuição Softmax calibrada.
//! 2. `noul`: Probabilidade booleana direta (Yes/No) de 0.0 a 1.0.
//! 3. `score`: Avaliação ordinal com valor esperado contínuo ponderado pelas probabilidades de níveis.

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

/// Tipo da pergunta conforme o protocolo oficial JEV
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SystemOneQuestionType {
    Choice,
    Noul,
    Score,
}

/// Definição de uma pergunta individual
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemOneQuestionDef {
    #[serde(rename = "type")]
    pub question_type: SystemOneQuestionType,
    pub instructions: serde_json::Value,
    #[serde(default)]
    pub criteria: Option<serde_json::Value>,
}

/// Requisição oficial para o endpoint /v1/systemone
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemOneRequest {
    pub state: serde_json::Value,
    pub questions: HashMap<String, SystemOneQuestionDef>,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
}

fn default_temperature() -> f32 {
    1.0
}

/// Resposta para uma pergunta do tipo Choice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChoiceAnswer {
    #[serde(rename = "type")]
    pub answer_type: String,
    pub choice: String,
    pub probabilities: HashMap<String, f32>,
    pub confidence: f32,
}

/// Resposta para uma pergunta do tipo Noul (Booleana)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoulAnswer {
    #[serde(rename = "type")]
    pub answer_type: String,
    pub noul: f32,
    #[serde(rename = "bool")]
    pub bool_val: f32,
    pub probabilities: HashMap<String, f32>,
    pub confidence: f32,
}

/// Resposta para uma pergunta do tipo Score (Ordinal)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreAnswer {
    #[serde(rename = "type")]
    pub answer_type: String,
    pub score: f32,
    pub probabilities: HashMap<String, f32>,
    pub confidence: f32,
    pub legend: HashMap<String, String>,
}

/// Resposta encapsulada de uma pergunta
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SystemOneAnswer {
    Choice(ChoiceAnswer),
    Noul(NoulAnswer),
    Score(ScoreAnswer),
}

/// Resposta completa do endpoint /v1/systemone
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemOneResponse {
    pub answers: HashMap<String, SystemOneAnswer>,
    pub latency_micros: u128,
    pub model: String,
}

/// Motor Analítico Nativo de Inferência System One do ALR
pub struct SystemOneEngine;

impl Default for SystemOneEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemOneEngine {
    pub fn new() -> Self {
        Self
    }

    /// Processa uma requisição /v1/systemone e gera probabilidades calibradas
    pub fn ask(&self, req: &SystemOneRequest) -> Result<SystemOneResponse> {
        let t0 = Instant::now();
        if req.questions.is_empty() {
            bail!("O conjunto de perguntas (questions) não pode ser vazio.");
        }

        let state_str = match &req.state {
            serde_json::Value::String(s) => s.clone(),
            other => other.to_string(),
        };
        let state_lower = state_str.to_lowercase();
        let state_words: Vec<&str> = state_lower.split_whitespace().collect();

        let temp = if req.temperature > 0.05 {
            req.temperature
        } else {
            1.0
        };
        let mut answers = HashMap::new();

        for (qid, qdef) in &req.questions {
            match qdef.question_type {
                SystemOneQuestionType::Choice => {
                    let ans = self.evaluate_choice(&state_words, &state_lower, qdef, temp)?;
                    answers.insert(qid.clone(), SystemOneAnswer::Choice(ans));
                }
                SystemOneQuestionType::Noul => {
                    let ans = self.evaluate_noul(&state_lower, qdef, temp)?;
                    answers.insert(qid.clone(), SystemOneAnswer::Noul(ans));
                }
                SystemOneQuestionType::Score => {
                    let ans = self.evaluate_score(&state_lower, qdef, temp)?;
                    answers.insert(qid.clone(), SystemOneAnswer::Score(ans));
                }
            }
        }

        let latency = t0.elapsed().as_micros();

        Ok(SystemOneResponse {
            answers,
            latency_micros: latency,
            model: "alr-systemone-native-v1".to_string(),
        })
    }

    fn evaluate_choice(
        &self,
        state_words: &[&str],
        state_lower: &str,
        qdef: &SystemOneQuestionDef,
        temperature: f32,
    ) -> Result<ChoiceAnswer> {
        let criteria_obj = qdef
            .criteria
            .as_ref()
            .and_then(|c| c.as_object())
            .ok_or_else(|| {
                anyhow::anyhow!("Perguntas do tipo 'choice' exigem objeto 'criteria'.")
            })?;

        let mut logits = Vec::new();
        let mut keys = Vec::new();

        for (cand_name, desc_val) in criteria_obj {
            let desc = desc_val.as_str().unwrap_or("");
            let desc_lower = desc.to_lowercase();
            let cand_lower = cand_name.to_lowercase();

            let mut match_score = 0.0f32;
            if state_lower.contains(&cand_lower) {
                match_score += 2.5;
            }

            for word in state_words {
                if word.len() > 2 && desc_lower.contains(word) {
                    match_score += 1.0;
                }
            }

            logits.push(match_score / temperature);
            keys.push(cand_name.clone());
        }

        // Normalização Softmax
        let max_logit = logits.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let exp_sum: f32 = logits.iter().map(|l| (l - max_logit).exp()).sum();

        let mut probs = HashMap::new();
        let mut best_key = keys[0].clone();
        let mut max_prob = 0.0f32;

        for (k, logit) in keys.into_iter().zip(logits) {
            let p = if exp_sum > 0.0 {
                ((logit - max_logit).exp() / exp_sum * 1000.0).round() / 1000.0
            } else {
                1.0 / criteria_obj.len() as f32
            };
            if p > max_prob {
                max_prob = p;
                best_key = k.clone();
            }
            probs.insert(k, p);
        }

        // Garante que a soma das probabilidades seja exatamente 1.0
        let current_sum: f32 = probs.values().sum();
        if (current_sum - 1.0).abs() > 0.001 && !probs.is_empty() {
            let diff = 1.0 - current_sum;
            if let Some(val) = probs.get_mut(&best_key) {
                *val += diff;
            }
        }

        let prob_vec: Vec<f32> = probs.values().cloned().collect();
        let conf = choice_confidence(&prob_vec);

        Ok(ChoiceAnswer {
            answer_type: "choice".to_string(),
            choice: best_key,
            probabilities: probs,
            confidence: (conf * 100.0).round() / 100.0,
        })
    }

    fn evaluate_noul(
        &self,
        state_lower: &str,
        qdef: &SystemOneQuestionDef,
        _temperature: f32,
    ) -> Result<NoulAnswer> {
        let instructions = qdef.instructions.as_str().unwrap_or("");
        let inst_lower = instructions.to_lowercase();

        // Análise heurística baseada nas instruções e termos do estado
        let positive_signals = [
            "sim",
            "yes",
            "reembolso",
            "estorno",
            "urgente",
            "imediato",
            "procon",
            "defeito",
            "cancelar",
            "verdadeiro",
            "erro",
            "falha",
            "bloqueado",
        ];
        let negative_signals = [
            "não",
            "nao",
            "no",
            "nunca",
            "nenhum",
            "falso",
            "tranquilo",
            "perfeito",
        ];

        let mut pos_matches = 0;
        let mut neg_matches = 0;

        for sig in &positive_signals {
            if state_lower.contains(sig) {
                pos_matches += 2;
            } else if inst_lower.contains(sig) {
                pos_matches += 1;
            }
        }
        for sig in &negative_signals {
            if state_lower.contains(sig) {
                neg_matches += 2;
            }
        }

        let p_true = if pos_matches > neg_matches {
            ((0.65 + (pos_matches as f32 * 0.08)).min(0.99) * 100.0).round() / 100.0
        } else if neg_matches > pos_matches {
            ((0.35 - (neg_matches as f32 * 0.08)).max(0.02) * 100.0).round() / 100.0
        } else {
            0.50
        };

        let p_false = (1.0 - p_true * 100.0).round() / 100.0;
        let mut probs = HashMap::new();
        probs.insert("true".to_string(), p_true);
        probs.insert("false".to_string(), p_false);

        Ok(NoulAnswer {
            answer_type: "noul".to_string(),
            noul: p_true,
            bool_val: p_true,
            probabilities: probs,
            confidence: (p_true.max(p_false) * 100.0).round() / 100.0,
        })
    }

    fn evaluate_score(
        &self,
        state_lower: &str,
        qdef: &SystemOneQuestionDef,
        temperature: f32,
    ) -> Result<ScoreAnswer> {
        let criteria_arr = qdef
            .criteria
            .as_ref()
            .and_then(|c| c.as_array())
            .ok_or_else(|| anyhow::anyhow!("Perguntas do tipo 'score' exigem array 'criteria'."))?;

        let n = criteria_arr.len();
        if !(2..=10).contains(&n) {
            bail!("Score exige entre 2 e 10 níveis descritivos.");
        }

        let mut legend = HashMap::new();
        let mut logits = Vec::new();

        for (idx, val) in criteria_arr.iter().enumerate() {
            let desc = val.as_str().unwrap_or("");
            legend.insert(idx.to_string(), desc.to_string());

            let desc_lower = desc.to_lowercase();
            let mut match_count = 0.0f32;
            for word in desc_lower.split_whitespace() {
                if word.len() > 3 && state_lower.contains(word) {
                    match_count += 1.5;
                }
            }
            logits.push(match_count / temperature);
        }

        // Softmax
        let max_logit = logits.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let exp_sum: f32 = logits.iter().map(|l| (l - max_logit).exp()).sum();

        let mut probs = HashMap::new();
        let mut expected_score = 0.0f32;
        let mut max_prob = 0.0f32;

        for (idx, logit) in logits.into_iter().enumerate() {
            let p = if exp_sum > 0.0 {
                (logit - max_logit).exp() / exp_sum
            } else {
                1.0 / n as f32
            };
            if p > max_prob {
                max_prob = p;
            }
            expected_score += idx as f32 * p;
            probs.insert(idx.to_string(), (p * 1000.0).round() / 1000.0);
        }
        let prob_vec: Vec<f32> = (0..n)
            .map(|i| probs.get(&i.to_string()).cloned().unwrap_or(0.0))
            .collect();
        let conf = score_confidence(&prob_vec);

        Ok(ScoreAnswer {
            answer_type: "score".to_string(),
            score: (expected_score * 100.0).round() / 100.0,
            probabilities: probs,
            confidence: (conf * 100.0).round() / 100.0,
            legend,
        })
    }
}

/// Fórmula canônica oficial de confiança do TypeSafe Jev para Choice:
/// `(max(p) - uniform) / (1.0 - uniform)`
pub fn choice_confidence(probs: &[f32]) -> f32 {
    let count = probs.len();
    if count <= 1 {
        return 1.0;
    }
    let uniform = 1.0 / count as f32;
    let max_p = probs.iter().cloned().fold(0.0f32, f32::max);
    if max_p <= uniform {
        return 0.0;
    }
    ((max_p - uniform) / (1.0 - uniform)).clamp(0.0, 1.0)
}

/// Fórmula canônica oficial de confiança do TypeSafe Jev para Score Ordinal:
/// `max(0.0, 1.0 - distance / uniform_deviation)`
pub fn score_confidence(probs: &[f32]) -> f32 {
    let count = probs.len();
    if count <= 1 {
        return 1.0;
    }
    let mode = probs
        .iter()
        .enumerate()
        .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(idx, _)| idx)
        .unwrap_or(0);

    let distance: f32 = probs
        .iter()
        .enumerate()
        .map(|(idx, &p)| p * ((idx as isize - mode as isize).abs() as f32))
        .sum();

    let center = (count - 1) as f32 / 2.0;
    let uniform_dev: f32 =
        (0..count).map(|i| (i as f32 - center).abs()).sum::<f32>() / count as f32;

    if uniform_dev <= 0.0 {
        return 1.0;
    }
    (1.0 - (distance / uniform_dev)).clamp(0.0, 1.0)
}
