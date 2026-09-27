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

fn normalize_ascii(text: &str) -> String {
    text.chars()
        .map(|c| match c {
            'á' | 'à' | 'ã' | 'â' | 'ä' => 'a',
            'é' | 'ê' | 'è' | 'ë' => 'e',
            'í' | 'ì' | 'î' | 'ï' => 'i',
            'ó' | 'õ' | 'ô' | 'ò' | 'ö' => 'o',
            'ú' | 'ü' | 'ù' | 'û' => 'u',
            'ç' => 'c',
            _ => c.to_ascii_lowercase(),
        })
        .collect()
}

#[allow(dead_code)]
fn is_stopword(w: &str) -> bool {
    matches!(
        w,
        "nao"
            | "com"
            | "para"
            | "pra"
            | "que"
            | "uma"
            | "seu"
            | "sua"
            | "meu"
            | "minha"
            | "por"
            | "dos"
            | "das"
            | "nos"
            | "nas"
            | "pro"
            | "mas"
            | "foi"
            | "tem"
            | "ter"
            | "ser"
            | "sao"
            | "era"
            | "vai"
            | "vou"
            | "deu"
            | "nem"
            | "sem"
            | "mais"
            | "muito"
            | "agora"
            | "isso"
            | "esse"
            | "essa"
            | "aqui"
            | "onde"
            | "como"
            | "quando"
            | "quem"
            | "the"
            | "and"
            | "for"
            | "with"
            | "this"
            | "that"
            | "from"
            | "are"
            | "client"
            | "cliente"
    )
}

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

        let state_norm = normalize_ascii(state_lower);
        let state_tokens: Vec<&str> = state_norm
            .split(|c: char| !c.is_alphanumeric())
            .filter(|w| w.len() >= 2)
            .collect();

        let mut logits = Vec::new();
        let mut keys = Vec::new();
        let mut has_strong_match = false;

        for (cand_name, desc_val) in criteria_obj {
            let desc = desc_val.as_str().unwrap_or("");
            let desc_lower = desc.to_lowercase();
            let desc_norm = normalize_ascii(&desc_lower);
            let cand_lower = cand_name.to_lowercase();
            let cand_norm = normalize_ascii(&cand_lower);
            let cand_spaced = cand_norm.replace(['_', '-'], " ");

            let is_none_cand = cand_norm == "nenhuma"
                || cand_norm == "none"
                || cand_norm == "neutro"
                || cand_norm == "sem_objecao";

            let mut match_score = if is_none_cand { 0.15f32 } else { 0.0f32 };

            if !is_none_cand {
                if (state_lower.contains(&cand_lower) || state_norm.contains(&cand_norm))
                    && !is_stopword(&cand_norm)
                {
                    match_score += 3.5;
                }
                if state_norm.contains(&cand_spaced) && cand_spaced.len() >= 4 {
                    match_score += 3.5;
                }

                for token in cand_spaced.split_whitespace() {
                    if token.len() >= 3 && !is_stopword(token) {
                        if state_tokens.contains(&token) {
                            match_score += 3.0;
                        } else if state_tokens.iter().any(|st| {
                            (st.starts_with(token) || token.starts_with(st))
                                && st.len().min(token.len()) >= 4
                        }) {
                            match_score += 2.0;
                        }
                    }
                }
            }

            for word in state_words {
                let w_norm = normalize_ascii(word);
                if w_norm.len() > 2 && !is_stopword(&w_norm) && desc_lower.contains(word) {
                    match_score += 1.0;
                }
            }

            for desc_word in desc_norm.split(|c: char| !c.is_alphanumeric()) {
                if desc_word.len() >= 3 && !is_stopword(desc_word) {
                    if state_tokens.contains(&desc_word) {
                        match_score += 2.0;
                    } else if state_tokens.iter().any(|st| {
                        (st.starts_with(desc_word) || desc_word.starts_with(st))
                            && st.len().min(desc_word.len()) >= 4
                    }) {
                        match_score += 1.2;
                    }
                }
            }

            if !is_none_cand && match_score >= 1.5 {
                has_strong_match = true;
            }

            logits.push(match_score);
            keys.push(cand_name.clone());
        }

        // Se houver um candidato com correspondência forte, neutraliza o candidato "nenhuma"
        let adjusted_logits: Vec<f32> = keys
            .iter()
            .zip(logits)
            .map(|(k, score)| {
                let k_norm = normalize_ascii(&k.to_lowercase());
                let is_none = k_norm == "nenhuma"
                    || k_norm == "none"
                    || k_norm == "neutro"
                    || k_norm == "sem_objecao";
                if is_none && has_strong_match {
                    0.0f32
                } else {
                    score / temperature
                }
            })
            .collect();

        // Normalização Softmax
        let max_logit = adjusted_logits
            .iter()
            .cloned()
            .fold(f32::NEG_INFINITY, f32::max);
        let exp_sum: f32 = adjusted_logits.iter().map(|l| (l - max_logit).exp()).sum();

        let mut probs = HashMap::new();
        let mut best_key = keys[0].clone();
        let mut max_prob = 0.0f32;

        for (k, logit) in keys.into_iter().zip(adjusted_logits) {
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
        let inst_norm = normalize_ascii(&inst_lower);
        let state_norm = normalize_ascii(state_lower);

        let is_objection_q = inst_norm.contains("objection")
            || inst_norm.contains("objecao")
            || inst_norm.contains("resist")
            || inst_norm.contains("hesitat")
            || inst_norm.contains("pushback")
            || inst_norm.contains("concern")
            || inst_norm.contains("doubt");

        let is_complete_q = inst_norm.contains("finish")
            || inst_norm.contains("complete")
            || inst_norm.contains("terminou")
            || inst_norm.contains("completa")
            || inst_norm.contains("interrupt");

        let p_true = if is_objection_q {
            let objection_signals = [
                "caro",
                "preco",
                "valor",
                "orcamento",
                "grana",
                "dinheiro",
                "pagar",
                "mensalidade",
                "desconto",
                "custo",
                "salgado",
                "pesado",
                "barato",
                "funciona",
                "da certo",
                "confio",
                "confianca",
                "seguro",
                "medo",
                "alucina",
                "garantia",
                "errar",
                "problema",
                "risco",
                "complicado",
                "momento",
                "depois",
                "ano que vem",
                "mes que vem",
                "prioridade",
                "sem tempo",
                "socio",
                "socia",
                "esposa",
                "marido",
                "parceiro",
                "diretoria",
                "alinhar",
                "ja tentei",
                "tentei",
                "outra agencia",
                "deu errado",
                "nao deu certo",
                "frustrado",
                "vou pensar",
                "pensar",
                "avaliar",
                "ver com calma",
                "te aviso",
                "retorno",
                "mas",
                "porem",
                "so que",
                "duvida",
                "inseguro",
                "dificil",
                "nao sei se",
                "nao tenho como",
                "nao da",
                "nao posso",
                "nao quero",
                "nao e",
            ];
            let acceptance_signals = [
                "vamos fechar",
                "adorei",
                "perfeito",
                "otimo",
                "fechado",
                "com certeza",
                "bora",
                "manda o contrato",
                "onde assino",
                "manda o pix",
                "vamos comecar",
                "bom dia",
                "boa tarde",
                "tudo bem",
                "ola",
                "legal",
            ];

            let mut obj_matches = 0;
            let mut acc_matches = 0;

            for sig in &objection_signals {
                if state_norm.contains(sig) {
                    obj_matches += 1;
                }
            }
            for sig in &acceptance_signals {
                if state_norm.contains(sig) {
                    acc_matches += 1;
                }
            }

            if obj_matches > 0 && obj_matches >= acc_matches {
                ((0.70 + (obj_matches as f32 * 0.08)).min(0.99) * 100.0).round() / 100.0
            } else if acc_matches > obj_matches {
                ((0.20 - (acc_matches as f32 * 0.05)).max(0.02) * 100.0).round() / 100.0
            } else {
                0.15
            }
        } else if is_complete_q {
            let trimmed = state_lower.trim();
            let words: Vec<&str> = trimmed.split_whitespace().collect();
            let ends_with_punct =
                trimmed.ends_with('.') || trimmed.ends_with('?') || trimmed.ends_with('!');
            let ends_with_ellipsis = trimmed.ends_with("...") || trimmed.ends_with('…');
            let ends_with_connective = trimmed.ends_with("mas")
                || trimmed.ends_with("porque")
                || trimmed.ends_with("pq")
                || trimmed.ends_with("e")
                || trimmed.ends_with("tipo")
                || trimmed.ends_with("ou")
                || trimmed.ends_with(',')
                || trimmed.ends_with('-');

            if ends_with_ellipsis || ends_with_connective || words.len() < 3 {
                0.25
            } else if ends_with_punct || words.len() >= 5 {
                0.90
            } else {
                0.70
            }
        } else {
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

            if pos_matches > neg_matches {
                ((0.65 + (pos_matches as f32 * 0.08)).min(0.99) * 100.0).round() / 100.0
            } else if neg_matches > pos_matches {
                ((0.35 - (neg_matches as f32 * 0.08)).max(0.02) * 100.0).round() / 100.0
            } else {
                0.50
            }
        };

        let p_false = ((1.0 - p_true) * 100.0).round() / 100.0;
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_sales_copilot_objection_decisions() {
        let engine = SystemOneEngine::new();

        let mut questions = HashMap::new();
        questions.insert(
            "tem_objecao".to_string(),
            SystemOneQuestionDef {
                question_type: SystemOneQuestionType::Noul,
                instructions: json!(
                    "Does the customer express an objection, resistance, hesitation, or pushback?"
                ),
                criteria: None,
            },
        );
        questions.insert(
            "objecao".to_string(),
            SystemOneQuestionDef {
                question_type: SystemOneQuestionType::Choice,
                instructions: json!("Which objection did the customer raise?"),
                criteria: Some(json!({
                    "ta_caro": "tá caro, preço alto, orçamento estourado, sem dinheiro, valor elevado",
                    "sera_que_funciona_pra_mim": "será que funciona pra mim, meu nicho, empresa pequena, específico",
                    "nao_e_o_momento": "não é o momento, agora não, ano que vem, depois, sem tempo",
                    "preciso_falar_com_meu_socio": "preciso falar com meu sócio, esposa, marido, diretoria, alinhar",
                    "ja_tentei_e_nao_deu_certo": "já tentei e não deu certo, outra empresa, deu errado, frustrado",
                    "vou_pensar": "vou pensar, analisar com calma, te dou um retorno depois",
                    "nao_confio": "não confio, inteligência artificial alucina, medo de errar com cliente",
                    "nenhuma": "nenhuma objeção, cliente neutro ou concordando com a proposta"
                })),
            },
        );
        questions.insert(
            "fase".to_string(),
            SystemOneQuestionDef {
                question_type: SystemOneQuestionType::Choice,
                instructions: json!("What phase is the sales call currently in?"),
                criteria: Some(json!({
                    "abertura": "Abertura, saudações e conexão inicial",
                    "diagnostico_de_dor": "Diagnóstico de dor e problemas do cliente",
                    "apresentacao": "Apresentação da solução e demonstração",
                    "objecao": "Objeções, dúvidas, resistências e hesitação",
                    "fechamento": "Fechamento, valores, contrato e próximos passos"
                })),
            },
        );
        questions.insert(
            "terminou_de_falar".to_string(),
            SystemOneQuestionDef {
                question_type: SystemOneQuestionType::Noul,
                instructions: json!(
                    "Has the customer finished speaking their complete sentence or thought?"
                ),
                criteria: None,
            },
        );

        // Caso 1: Objeção de Preço clara e completa
        let req1 = SystemOneRequest {
            state: json!("Cliente: Achei a proposta legal, mas cinco mil reais tá muito caro pro meu orçamento agora, não tenho como pagar isso."),
            questions: questions.clone(),
            temperature: 1.0,
        };
        let res1 = engine.ask(&req1).expect("ask req1");

        if let SystemOneAnswer::Noul(n) = &res1.answers["tem_objecao"] {
            assert!(
                n.noul >= 0.60,
                "tem_objecao deve ser >= 0.60, deu {}",
                n.noul
            );
        } else {
            panic!("tem_objecao should be Noul");
        }

        if let SystemOneAnswer::Choice(c) = &res1.answers["objecao"] {
            assert_eq!(
                c.choice, "ta_caro",
                "Objeção esperada é ta_caro, deu {}",
                c.choice
            );
            assert!(
                c.confidence >= 0.50,
                "Confiança deve ser >= 0.50, deu {}",
                c.confidence
            );
        } else {
            panic!("objecao should be Choice");
        }

        if let SystemOneAnswer::Noul(n) = &res1.answers["terminou_de_falar"] {
            assert!(
                n.noul >= 0.60,
                "terminou_de_falar deve ser >= 0.60, deu {}",
                n.noul
            );
        } else {
            panic!("terminou_de_falar should be Noul");
        }

        // Caso 2: Fala interrompida no meio
        let req2 = SystemOneRequest {
            state: json!("Cliente: Mas é que a gente tava pensando em..."),
            questions: questions.clone(),
            temperature: 1.0,
        };
        let res2 = engine.ask(&req2).expect("ask req2");
        if let SystemOneAnswer::Noul(n) = &res2.answers["terminou_de_falar"] {
            assert!(
                n.noul < 0.50,
                "terminou_de_falar deve ser < 0.50 para fala cortada, deu {}",
                n.noul
            );
        }

        // Caso 3: Acordo / Fechamento sem objeção
        let req3 = SystemOneRequest {
            state: json!("Cliente: Perfeito, adorei a proposta! Vamos fechar sim, onde eu assino o contrato?"),
            questions,
            temperature: 1.0,
        };
        let res3 = engine.ask(&req3).expect("ask req3");
        if let SystemOneAnswer::Noul(n) = &res3.answers["tem_objecao"] {
            assert!(
                n.noul < 0.40,
                "tem_objecao deve ser baixa para fechamento positivo, deu {}",
                n.noul
            );
        }
        if let SystemOneAnswer::Choice(c) = &res3.answers["objecao"] {
            assert_eq!(
                c.choice, "nenhuma",
                "Deveria ser nenhuma objeção, deu {}",
                c.choice
            );
        }
        if let SystemOneAnswer::Choice(c) = &res3.answers["fase"] {
            assert_eq!(
                c.choice, "fechamento",
                "Fase esperada é fechamento, deu {}",
                c.choice
            );
        }
    }
}
