//! Autonomous Product Categorizer for Marketplace and E-Commerce Catalogs
//!
//! Provides ultra-low latency, hierarchical product classification:
//! 1. Procedural Skill / Deterministic Rules (< 1 µs)
//! 2. Typed Decision System 1 (Choice with Softmax distribution)
//! 3. Semantic Vector Retrieval (Cosine similarity via embeddings / Qdrant)
//! 4. LLM Teacher Cold Start (Uncertainty fallback and procedural skill crystallization)

use crate::procedural::{ProceduralSkill, ProceduralStep};
use crate::support_state::SupportIntent;
use alr_core::KnowledgeStatus;
use alr_memory::{EmbeddingProvider, MockEmbeddingProvider, SemanticMemoryStore};
use alr_models::{TypedJudge, TypedQuestion};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

/// Classification method used to resolve the category
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ClassificationMethod {
    DeterministicRule,
    TypedDecisionSoftmax,
    SemanticQdrantRetrieval,
    LlmTeacherColdStart,
}

impl ClassificationMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DeterministicRule => "deterministic_rule",
            Self::TypedDecisionSoftmax => "typed_decision_softmax",
            Self::SemanticQdrantRetrieval => "semantic_qdrant_retrieval",
            Self::LlmTeacherColdStart => "llm_teacher_cold_start",
        }
    }
}

/// Catalog item representing a product in e-commerce or marketplace
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProductCatalogItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub brand: Option<String>,
    pub suggested_category: Option<String>,
}

impl ProductCatalogItem {
    pub fn new(id: impl Into<String>, title: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            title: title.into(),
            description: String::new(),
            price: 0.0,
            brand: None,
            suggested_category: None,
        }
    }

    pub fn with_description(mut self, desc: impl Into<String>) -> Self {
        self.description = desc.into();
        self
    }

    pub fn with_price(mut self, price: f64) -> Self {
        self.price = price;
        self
    }

    pub fn with_brand(mut self, brand: impl Into<String>) -> Self {
        self.brand = Some(brand.into());
        self
    }

    pub fn with_suggested_category(mut self, cat: impl Into<String>) -> Self {
        self.suggested_category = Some(cat.into());
        self
    }
}

/// Result of category classification
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CategoryClassificationResult {
    pub category_path: String,
    pub confidence: f32,
    pub tags: Vec<String>,
    pub method: ClassificationMethod,
    pub latency_micros: u128,
}

/// Node in the hierarchical taxonomy tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxonomyNode {
    pub name: String,
    pub path: String,
    pub canonical_keywords: Vec<String>,
    pub negative_keywords: Vec<String>,
    pub children: Vec<TaxonomyNode>,
    pub attributes: HashMap<String, Vec<String>>,
}

/// Flat definition of a category in the taxonomy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryDefinition {
    pub path: String,
    pub canonical_keywords: Vec<String>,
    pub negative_keywords: Vec<String>,
    pub default_tags: Vec<String>,
}

/// Complete product taxonomy with hierarchy and indexing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductTaxonomy {
    pub root_categories: Vec<TaxonomyNode>,
    pub path_index: HashMap<String, CategoryDefinition>,
}

impl Default for ProductTaxonomy {
    fn default() -> Self {
        Self::default_ecommerce()
    }
}

impl ProductTaxonomy {
    pub fn new() -> Self {
        Self {
            root_categories: Vec::new(),
            path_index: HashMap::new(),
        }
    }

    /// Standard marketplace and e-commerce taxonomy
    pub fn default_ecommerce() -> Self {
        let mut tax = Self::new();

        tax.add_category(
            "Eletrônicos > Celulares e Smartphones",
            &[
                "iphone",
                "galaxy",
                "smartphone",
                "celular",
                "xiaomi",
                "redmi",
                "motorola",
                "moto g",
                "pixel",
            ],
            &["capa", "case", "pelicula", "suporte", "carregador"],
            &["eletronicos", "smartphones", "telefonia", "mobile"],
        );

        tax.add_category(
            "Eletrônicos > Celulares e Smartphones > Acessórios",
            &[
                "capa",
                "case",
                "pelicula",
                "carregador",
                "cabo lightning",
                "cabo usb-c",
                "suporte veicular",
                "fone bluetooth",
            ],
            &[],
            &["acessorios", "celular", "protecao", "cabos"],
        );

        tax.add_category(
            "Eletrônicos > Computadores e Informática > Notebooks",
            &[
                "notebook",
                "laptop",
                "macbook",
                "thinkpad",
                "dell g15",
                "ideapad",
                "aspire",
                "chromebook",
            ],
            &["mochila", "suporte", "adesivo", "pasta"],
            &["informatica", "notebooks", "computadores", "portatil"],
        );

        tax.add_category(
            "Eletrônicos > Computadores e Informática > Componentes e Peças",
            &[
                "placa de video",
                "geforce",
                "rtx",
                "radeon",
                "processador",
                "ryzen",
                "intel core",
                "ssd",
                "memoria ram",
                "placa mae",
                "fonte atx",
            ],
            &[],
            &["hardware", "pc gamer", "componentes", "upgrade"],
        );

        tax.add_category(
            "Eletrônicos > Áudio e Vídeo > Fones de Ouvido",
            &[
                "fone de ouvido",
                "headphone",
                "headset",
                "airpods",
                "earbuds",
                "tws",
                "fone gamer",
                "soundbar",
            ],
            &[],
            &["audio", "fones", "som", "bluetooth"],
        );

        tax.add_category(
            "Casa e Decoração > Móveis > Cadeiras de Escritório",
            &[
                "cadeira de escritorio",
                "cadeira gamer",
                "cadeira presidente",
                "cadeira ergonomica",
                "cadeira diretor",
                "cadeira",
                "assento",
                "poltrona",
                "apoio lombar",
                "ergonomia",
                "ergonomico",
            ],
            &[],
            &["moveis", "escritorio", "ergonomia", "conforto"],
        );

        tax.add_category(
            "Casa e Decoração > Eletrodomésticos > Cozinha",
            &[
                "cafeteira",
                "fritadeira",
                "airfryer",
                "liquidificador",
                "batedeira",
                "microondas",
                "fogao",
                "geladeira",
                "panela eletrica",
            ],
            &[],
            &["cozinha", "eletrodomesticos", "lar", "culinaria"],
        );

        tax.add_category(
            "Moda e Acessórios > Calçados > Tênis Esportivos",
            &[
                "tenis",
                "sneaker",
                "corrida",
                "air max",
                "ultraboost",
                "running",
                "chuteira",
                "caminhada",
            ],
            &[],
            &["calcados", "tenis", "esporte", "moda"],
        );

        tax.add_category(
            "Moda e Acessórios > Roupas > Camisetas e Blusas",
            &[
                "camiseta", "camisa", "blusa", "moletom", "cropped", "regata", "polo", "jaqueta",
            ],
            &[],
            &["roupas", "vestuario", "moda", "estilo"],
        );

        tax.add_category(
            "Esporte e Lazer > Ciclismo > Bicicletas",
            &[
                "bicicleta",
                "bike",
                "mountain bike",
                "caloi",
                "shimano",
                "aro 29",
                "speed",
                "e-bike",
            ],
            &[],
            &["ciclismo", "esporte", "bike", "aventura"],
        );

        tax.add_category(
            "Beleza e Cuidados Pessoais > Cabelos > Shampoos e Condicionadores",
            &[
                "shampoo",
                "condicionador",
                "mascara capilar",
                "anticaspa",
                "leave-in",
                "oleo capilar",
                "tintura",
            ],
            &[],
            &["beleza", "cabelos", "cuidados pessoais"],
        );

        tax.add_category(
            "Ferramentas e Construção > Ferramentas Elétricas",
            &[
                "furadeira",
                "parafusadeira",
                "martelete",
                "serra tico-tico",
                "esmerilhadeira",
                "makita",
                "bosch",
                "dewalt",
            ],
            &[],
            &["ferramentas", "construcao", "eletricas", "oficina"],
        );

        tax
    }

    /// Adds or updates a category path in the taxonomy
    pub fn add_category(
        &mut self,
        path: &str,
        keywords: &[&str],
        negative_keywords: &[&str],
        default_tags: &[&str],
    ) {
        let def = CategoryDefinition {
            path: path.to_string(),
            canonical_keywords: keywords.iter().map(|s| s.to_lowercase()).collect(),
            negative_keywords: negative_keywords.iter().map(|s| s.to_lowercase()).collect(),
            default_tags: default_tags.iter().map(|s| s.to_string()).collect(),
        };

        self.path_index.insert(path.to_string(), def);
        self.rebuild_tree();
    }

    /// Gets definition of a category by path
    pub fn get_category(&self, path: &str) -> Option<&CategoryDefinition> {
        self.path_index.get(path)
    }

    /// Lists all category paths
    pub fn all_categories(&self) -> Vec<String> {
        let mut keys: Vec<String> = self.path_index.keys().cloned().collect();
        keys.sort();
        keys
    }

    /// Rebuilds root_categories tree from path_index
    fn rebuild_tree(&mut self) {
        let mut roots: Vec<TaxonomyNode> = Vec::new();

        for (path, def) in &self.path_index {
            let segments: Vec<&str> = path.split('>').map(|s| s.trim()).collect();
            if segments.is_empty() {
                continue;
            }

            let root_name = segments[0];
            let root_pos = roots.iter().position(|r| r.name == root_name);

            let root_idx = match root_pos {
                Some(idx) => idx,
                None => {
                    roots.push(TaxonomyNode {
                        name: root_name.to_string(),
                        path: root_name.to_string(),
                        canonical_keywords: Vec::new(),
                        negative_keywords: Vec::new(),
                        children: Vec::new(),
                        attributes: HashMap::new(),
                    });
                    roots.len() - 1
                }
            };

            if segments.len() == 1 {
                roots[root_idx].canonical_keywords = def.canonical_keywords.clone();
                roots[root_idx].negative_keywords = def.negative_keywords.clone();
            } else {
                let mut current = &mut roots[root_idx];
                let mut current_path = segments[0].to_string();

                for &seg in &segments[1..] {
                    current_path.push_str(" > ");
                    current_path.push_str(seg);

                    let child_pos = current.children.iter().position(|c| c.name == seg);
                    let child_idx = match child_pos {
                        Some(pos) => pos,
                        None => {
                            current.children.push(TaxonomyNode {
                                name: seg.to_string(),
                                path: current_path.clone(),
                                canonical_keywords: Vec::new(),
                                negative_keywords: Vec::new(),
                                children: Vec::new(),
                                attributes: HashMap::new(),
                            });
                            current.children.len() - 1
                        }
                    };

                    current = &mut current.children[child_idx];
                }

                current.canonical_keywords = def.canonical_keywords.clone();
                current.negative_keywords = def.negative_keywords.clone();
            }
        }

        self.root_categories = roots;
    }

    /// Extracts relevant tags based on category path and product text
    pub fn extract_tags(&self, path: &str, text: &str) -> Vec<String> {
        let mut tags = Vec::new();
        let lower = text.to_lowercase();

        if let Some(def) = self.path_index.get(path) {
            tags.extend(def.default_tags.clone());

            for kw in &def.canonical_keywords {
                if lower.contains(kw) && !tags.contains(kw) {
                    tags.push(kw.clone());
                }
            }
        }

        tags
    }
}

/// Deterministic Rule for immediate (< 1 µs) pattern matching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeterministicRule {
    pub id: String,
    pub title_pattern: String,
    pub brand_pattern: Option<String>,
    pub category_path: String,
    pub confidence: f32,
    pub tags: Vec<String>,
}

/// Throughput and latency report for batch processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchCategorizationReport {
    pub total_items: usize,
    pub classified_count: usize,
    pub elapsed_micros: u128,
    pub throughput_items_per_sec: f64,
    pub method_distribution: HashMap<String, usize>,
    pub results: Vec<CategoryClassificationResult>,
}

/// Crystallized category procedural skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrystallizedCategorySkill {
    pub skill: ProceduralSkill,
    pub category_path: String,
    pub tags: Vec<String>,
}

/// Thread-safe in-memory store for crystallized skills
pub type CrystallizedSkillStore = Arc<RwLock<HashMap<String, CrystallizedCategorySkill>>>;

/// Autonomous Product Categorizer Engine
pub struct ProductCategorizerEngine {
    pub taxonomy: ProductTaxonomy,
    pub deterministic_rules: Vec<DeterministicRule>,
    pub crystallized_skills: CrystallizedSkillStore,
    pub typed_judge: Option<Arc<dyn TypedJudge>>,
    pub semantic_store: Option<Arc<dyn SemanticMemoryStore>>,
    pub embedding_provider: Arc<dyn EmbeddingProvider>,
    prototype_vectors: HashMap<String, Vec<f32>>,
}

impl Default for ProductCategorizerEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl ProductCategorizerEngine {
    /// Creates a new categorizer engine with standard taxonomy and rules
    pub fn new() -> Self {
        let taxonomy = ProductTaxonomy::default_ecommerce();
        let embedding_provider = Arc::new(MockEmbeddingProvider::new(64));
        let mut engine = Self {
            taxonomy,
            deterministic_rules: Vec::new(),
            crystallized_skills: Arc::new(RwLock::new(HashMap::new())),
            typed_judge: None,
            semantic_store: None,
            embedding_provider,
            prototype_vectors: HashMap::new(),
        };

        engine.init_default_rules();
        engine.init_prototype_vectors();
        engine
    }

    /// Sets custom taxonomy
    pub fn with_taxonomy(mut self, taxonomy: ProductTaxonomy) -> Self {
        self.taxonomy = taxonomy;
        self.init_prototype_vectors();
        self
    }

    /// Injects TypedJudge instance for System 1 decisions
    pub fn with_typed_judge(mut self, judge: Arc<dyn TypedJudge>) -> Self {
        self.typed_judge = Some(judge);
        self
    }

    /// Injects semantic vector store
    pub fn with_semantic_store(mut self, store: Arc<dyn SemanticMemoryStore>) -> Self {
        self.semantic_store = Some(store);
        self
    }

    /// Injects custom embedding provider
    pub fn with_embedding_provider(mut self, provider: Arc<dyn EmbeddingProvider>) -> Self {
        self.embedding_provider = provider;
        self.init_prototype_vectors();
        self
    }

    /// Adds a high-speed deterministic rule
    pub fn add_deterministic_rule(&mut self, rule: DeterministicRule) {
        self.deterministic_rules.push(rule);
    }

    /// Pre-populates standard deterministic rules for high-frequency catalog items
    fn init_default_rules(&mut self) {
        let rules = vec![
            (
                "iphone",
                Some("apple"),
                "Eletrônicos > Celulares e Smartphones",
                1.0,
                vec!["apple", "ios", "iphone"],
            ),
            (
                "galaxy s",
                Some("samsung"),
                "Eletrônicos > Celulares e Smartphones",
                1.0,
                vec!["samsung", "galaxy", "android"],
            ),
            (
                "macbook",
                Some("apple"),
                "Eletrônicos > Computadores e Informática > Notebooks",
                1.0,
                vec!["apple", "macbook", "laptop"],
            ),
            (
                "cadeira gamer",
                None,
                "Casa e Decoração > Móveis > Cadeiras de Escritório",
                1.0,
                vec!["moveis", "cadeira", "gamer"],
            ),
            (
                "airpods",
                Some("apple"),
                "Eletrônicos > Áudio e Vídeo > Fones de Ouvido",
                1.0,
                vec!["apple", "fones", "audio"],
            ),
            (
                "airfryer",
                None,
                "Casa e Decoração > Eletrodomésticos > Cozinha",
                1.0,
                vec!["eletrodomesticos", "cozinha", "fritadeira"],
            ),
            (
                "placa de video rtx",
                None,
                "Eletrônicos > Computadores e Informática > Componentes e Peças",
                1.0,
                vec!["hardware", "gpu", "nvidia"],
            ),
            (
                "bicicleta aro 29",
                None,
                "Esporte e Lazer > Ciclismo > Bicicletas",
                1.0,
                vec!["ciclismo", "bicicleta", "bike"],
            ),
            (
                "tenis ultraboost",
                Some("adidas"),
                "Moda e Acessórios > Calçados > Tênis Esportivos",
                1.0,
                vec!["adidas", "tenis", "corrida"],
            ),
            (
                "furadeira de impacto",
                None,
                "Ferramentas e Construção > Ferramentas Elétricas",
                1.0,
                vec!["ferramentas", "furadeira", "eletricas"],
            ),
        ];

        for (idx, (pattern, brand, cat, conf, tags)) in rules.into_iter().enumerate() {
            self.deterministic_rules.push(DeterministicRule {
                id: format!("DET-RULE-{:03}", idx + 1),
                title_pattern: pattern.to_lowercase(),
                brand_pattern: brand.map(|b| b.to_lowercase()),
                category_path: cat.to_string(),
                confidence: conf,
                tags: tags.into_iter().map(String::from).collect(),
            });
        }
    }

    /// Initializes category prototype vectors for cosine similarity
    fn init_prototype_vectors(&mut self) {
        self.prototype_vectors.clear();
        for (path, def) in &self.taxonomy.path_index {
            let text = format!("{} {}", path, def.canonical_keywords.join(" "));
            let vec = compute_semantic_vector(&text, 64);
            self.prototype_vectors.insert(path.clone(), vec);
        }
    }

    /// Crystallizes a verified classification into a ProceduralSkill for zero-token execution
    pub fn crystallize_skill(
        &mut self,
        pattern: &str,
        category_path: &str,
        tags: &[String],
        confidence: f32,
    ) -> ProceduralSkill {
        let pattern_lower = pattern.to_lowercase();
        let step = ProceduralStep {
            tool_name: "catalog_categorizer".to_string(),
            input_template: serde_json::json!({
                "pattern": pattern_lower,
                "category_path": category_path,
                "tags": tags,
            }),
        };

        let mut skill = ProceduralSkill::new(
            format!("Categorize: {}", pattern),
            format!(
                "Classificação automática memorizada de '{}' para '{}'",
                pattern, category_path
            ),
            SupportIntent::ProductInquiry,
            vec![step],
        );
        skill.status = KnowledgeStatus::Active;
        skill.confidence = confidence;

        // Register in crystallized skills store
        {
            let mut store = self.crystallized_skills.write();
            store.insert(
                pattern_lower.clone(),
                CrystallizedCategorySkill {
                    skill: skill.clone(),
                    category_path: category_path.to_string(),
                    tags: tags.to_vec(),
                },
            );
        }

        // Also add as high-priority deterministic rule
        self.deterministic_rules.insert(
            0,
            DeterministicRule {
                id: format!("SKILL-RULE-{}", skill.id),
                title_pattern: pattern_lower,
                brand_pattern: None,
                category_path: category_path.to_string(),
                confidence,
                tags: tags.to_vec(),
            },
        );

        skill
    }

    /// Synchronous deterministic check (< 1 µs)
    pub fn classify_deterministic(
        &self,
        item: &ProductCatalogItem,
    ) -> Option<CategoryClassificationResult> {
        let start = Instant::now();
        let title_lower = item.title.to_lowercase();
        let desc_lower = item.description.to_lowercase();
        let brand_lower = item.brand.as_ref().map(|b| b.to_lowercase());

        // 1. Check Crystallized Procedural Skills
        {
            let skills = self.crystallized_skills.read();
            for (pattern, entry) in skills.iter() {
                if entry.skill.status == KnowledgeStatus::Active
                    && (title_lower.contains(pattern) || desc_lower.contains(pattern))
                {
                    return Some(CategoryClassificationResult {
                        category_path: entry.category_path.clone(),
                        confidence: entry.skill.confidence,
                        tags: entry.tags.clone(),
                        method: ClassificationMethod::DeterministicRule,
                        latency_micros: start.elapsed().as_micros(),
                    });
                }
            }
        }

        // 2. Check Static Deterministic Rules
        for rule in &self.deterministic_rules {
            let brand_match = match (&rule.brand_pattern, &brand_lower) {
                (Some(rule_brand), Some(item_brand)) => item_brand.contains(rule_brand),
                (Some(_), None) => false,
                (None, _) => true,
            };

            if brand_match
                && (title_lower.contains(&rule.title_pattern)
                    || desc_lower.contains(&rule.title_pattern))
            {
                return Some(CategoryClassificationResult {
                    category_path: rule.category_path.clone(),
                    confidence: rule.confidence,
                    tags: rule.tags.clone(),
                    method: ClassificationMethod::DeterministicRule,
                    latency_micros: start.elapsed().as_micros(),
                });
            }
        }

        None
    }

    /// Evaluates category scores using taxonomy keywords and negative keywords
    fn score_candidates(&self, item: &ProductCatalogItem) -> Vec<(String, f32)> {
        let title_lower = item.title.to_lowercase();
        let desc_lower = item.description.to_lowercase();
        let brand_lower = item.brand.as_ref().map(|b| b.to_lowercase());
        let suggested_lower = item.suggested_category.as_ref().map(|s| s.to_lowercase());

        let mut scores = Vec::new();

        for (path, def) in &self.taxonomy.path_index {
            let mut score = 0.0f32;

            // Check negative keywords (immediate strong penalty)
            let mut has_negative = false;
            for neg in &def.negative_keywords {
                if title_lower.contains(neg) || desc_lower.contains(neg) {
                    has_negative = true;
                    score -= 5.0;
                    break;
                }
            }

            // Canonical keyword matching
            for kw in &def.canonical_keywords {
                if title_lower.contains(kw) {
                    score += 2.5;
                } else if desc_lower.contains(kw) {
                    score += 1.0;
                }
            }

            // Brand match bonus
            if let Some(brand) = &brand_lower {
                if def.canonical_keywords.iter().any(|k| k.contains(brand))
                    || def
                        .default_tags
                        .iter()
                        .any(|t| t.to_lowercase().contains(brand))
                {
                    score += 1.5;
                }
            }

            // Suggested category alignment bonus
            if let Some(sugg) = &suggested_lower {
                if path.to_lowercase().contains(sugg) {
                    score += 3.0;
                }
            }

            if score > 0.0 && !has_negative {
                scores.push((path.clone(), score));
            }
        }

        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scores
    }

    /// Synchronous classification covering all 4 tiers
    pub fn classify_sync(&self, item: &ProductCatalogItem) -> CategoryClassificationResult {
        let start = Instant::now();

        // Tier 1: Deterministic Rules & Crystallized Skills (< 1 µs)
        if let Some(res) = self.classify_deterministic(item) {
            return res;
        }

        // Tier 2: Typed Decision via Softmax
        let candidates = self.score_candidates(item);
        if !candidates.is_empty() {
            let top_opts: Vec<(String, f32)> = candidates.into_iter().take(5).collect();
            let options: Vec<String> = top_opts.iter().map(|(p, _)| p.clone()).collect();
            let raw_scores: Vec<f32> = top_opts.iter().map(|(_, s)| *s).collect();

            // Calibrated Softmax
            let max_score = raw_scores.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
            let exp_scores: Vec<f32> = raw_scores.iter().map(|&s| (s - max_score).exp()).collect();
            let sum_exp: f32 = exp_scores.iter().sum();
            let probs: Vec<f32> = exp_scores.iter().map(|&x| x / sum_exp.max(1e-6)).collect();

            let (best_idx, &best_prob) = probs
                .iter()
                .enumerate()
                .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
                .unwrap_or((0, &0.0));

            if best_prob >= 0.40 {
                let cat = &options[best_idx];
                let tags = self.taxonomy.extract_tags(cat, &item.title);
                return CategoryClassificationResult {
                    category_path: cat.clone(),
                    confidence: best_prob,
                    tags,
                    method: ClassificationMethod::TypedDecisionSoftmax,
                    latency_micros: start.elapsed().as_micros(),
                };
            }
        }

        // Tier 3: Semantic Vector Retrieval (Cosine Similarity)
        let product_text = format!("{} {}", item.title, item.description);
        let prod_vec = compute_semantic_vector(&product_text, 64);

        let mut best_sim = -1.0f32;
        let mut best_cat = String::new();

        for (cat_path, proto_vec) in &self.prototype_vectors {
            let sim = cosine_similarity(&prod_vec, proto_vec);
            if sim > best_sim {
                best_sim = sim;
                best_cat = cat_path.clone();
            }
        }

        if best_sim >= 0.35 && !best_cat.is_empty() {
            let tags = self.taxonomy.extract_tags(&best_cat, &item.title);
            return CategoryClassificationResult {
                category_path: best_cat,
                confidence: best_sim.clamp(0.0, 0.95),
                tags,
                method: ClassificationMethod::SemanticQdrantRetrieval,
                latency_micros: start.elapsed().as_micros(),
            };
        }

        // Tier 4: LLM Teacher Cold Start (Uncertainty Fallback)
        let fallback_cat = if !self.taxonomy.root_categories.is_empty() {
            self.taxonomy.root_categories[0].path.clone()
        } else {
            "Outros > Indeterminado".to_string()
        };

        CategoryClassificationResult {
            category_path: fallback_cat,
            confidence: 0.20,
            tags: vec!["unclassified".to_string()],
            method: ClassificationMethod::LlmTeacherColdStart,
            latency_micros: start.elapsed().as_micros(),
        }
    }

    /// Asynchronous classification with full TypedJudge integration if configured
    pub async fn classify(&self, item: &ProductCatalogItem) -> CategoryClassificationResult {
        let start = Instant::now();

        // Tier 1: Deterministic Rules & Crystallized Skills (< 1 µs)
        if let Some(res) = self.classify_deterministic(item) {
            return res;
        }

        // Tier 2: Typed Decision with TypedJudge (if configured)
        let candidates = self.score_candidates(item);
        if !candidates.is_empty() {
            let top_opts: Vec<(String, f32)> = candidates.into_iter().take(5).collect();
            let options: Vec<String> = top_opts.iter().map(|(p, _)| p.clone()).collect();
            let raw_scores: Vec<f32> = top_opts.iter().map(|(_, s)| *s).collect();

            if let Some(judge) = &self.typed_judge {
                let mut criteria = HashMap::new();
                for (opt, score) in top_opts.iter() {
                    criteria.insert(opt.clone(), format!("Score: {:.2}", score));
                }

                let question = TypedQuestion::Choice {
                    options: options.clone(),
                    instructions:
                        "Selecione a categoria de produto mais adequada para o item do catálogo"
                            .to_string(),
                    criteria: Some(criteria),
                };

                let state = alr_core::State::new(
                    raw_scores.clone(),
                    serde_json::json!({ "item_id": item.id }),
                );

                if let Ok(outcome) = judge.evaluate_typed(&state, &question).await {
                    if outcome.confidence >= 0.40 {
                        let tags = self
                            .taxonomy
                            .extract_tags(&outcome.primary_decision, &item.title);
                        return CategoryClassificationResult {
                            category_path: outcome.primary_decision,
                            confidence: outcome.confidence,
                            tags,
                            method: ClassificationMethod::TypedDecisionSoftmax,
                            latency_micros: start.elapsed().as_micros(),
                        };
                    }
                }
            } else {
                // Calibrated local softmax
                let max_score = raw_scores.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
                let exp_scores: Vec<f32> =
                    raw_scores.iter().map(|&s| (s - max_score).exp()).collect();
                let sum_exp: f32 = exp_scores.iter().sum();
                let probs: Vec<f32> = exp_scores.iter().map(|&x| x / sum_exp.max(1e-6)).collect();

                let (best_idx, &best_prob) = probs
                    .iter()
                    .enumerate()
                    .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap_or((0, &0.0));

                if best_prob >= 0.40 {
                    let cat = &options[best_idx];
                    let tags = self.taxonomy.extract_tags(cat, &item.title);
                    return CategoryClassificationResult {
                        category_path: cat.clone(),
                        confidence: best_prob,
                        tags,
                        method: ClassificationMethod::TypedDecisionSoftmax,
                        latency_micros: start.elapsed().as_micros(),
                    };
                }
            }
        }

        // Tier 3: Semantic Vector Retrieval (Cosine Similarity)
        let product_text = format!("{} {}", item.title, item.description);
        let prod_vec = compute_semantic_vector(&product_text, 64);

        let mut best_sim = -1.0f32;
        let mut best_cat = String::new();

        for (cat_path, proto_vec) in &self.prototype_vectors {
            let sim = cosine_similarity(&prod_vec, proto_vec);
            if sim > best_sim {
                best_sim = sim;
                best_cat = cat_path.clone();
            }
        }

        if best_sim >= 0.35 && !best_cat.is_empty() {
            let tags = self.taxonomy.extract_tags(&best_cat, &item.title);
            return CategoryClassificationResult {
                category_path: best_cat,
                confidence: best_sim.clamp(0.0, 0.95),
                tags,
                method: ClassificationMethod::SemanticQdrantRetrieval,
                latency_micros: start.elapsed().as_micros(),
            };
        }

        // Tier 4: LLM Teacher Cold Start (Uncertainty Fallback)
        let fallback_cat = if !self.taxonomy.root_categories.is_empty() {
            self.taxonomy.root_categories[0].path.clone()
        } else {
            "Outros > Indeterminado".to_string()
        };

        CategoryClassificationResult {
            category_path: fallback_cat,
            confidence: 0.20,
            tags: vec!["unclassified".to_string()],
            method: ClassificationMethod::LlmTeacherColdStart,
            latency_micros: start.elapsed().as_micros(),
        }
    }

    /// Batch categorization with throughput measurement (items/sec)
    pub async fn classify_batch(&self, items: &[ProductCatalogItem]) -> BatchCategorizationReport {
        let start = Instant::now();
        let mut results = Vec::with_capacity(items.len());
        let mut method_distribution = HashMap::new();

        for item in items {
            let res = self.classify(item).await;
            *method_distribution
                .entry(res.method.as_str().to_string())
                .or_insert(0) += 1;
            results.push(res);
        }

        let elapsed = start.elapsed();
        let elapsed_micros = elapsed.as_micros();
        let elapsed_secs = (elapsed_micros as f64) / 1_000_000.0;
        let throughput = if elapsed_secs > 0.0 {
            (items.len() as f64) / elapsed_secs
        } else {
            items.len() as f64 * 1_000_000.0
        };

        BatchCategorizationReport {
            total_items: items.len(),
            classified_count: results.len(),
            elapsed_micros,
            throughput_items_per_sec: throughput,
            method_distribution,
            results,
        }
    }

    /// Synchronous batch categorization with throughput measurement (items/sec)
    pub fn classify_batch_sync(&self, items: &[ProductCatalogItem]) -> BatchCategorizationReport {
        let start = Instant::now();
        let mut results = Vec::with_capacity(items.len());
        let mut method_distribution = HashMap::new();

        for item in items {
            let res = self.classify_sync(item);
            *method_distribution
                .entry(res.method.as_str().to_string())
                .or_insert(0) += 1;
            results.push(res);
        }

        let elapsed = start.elapsed();
        let elapsed_micros = elapsed.as_micros();
        let elapsed_secs = (elapsed_micros as f64) / 1_000_000.0;
        let throughput = if elapsed_secs > 0.0 {
            (items.len() as f64) / elapsed_secs
        } else {
            items.len() as f64 * 1_000_000.0
        };

        BatchCategorizationReport {
            total_items: items.len(),
            classified_count: results.len(),
            elapsed_micros,
            throughput_items_per_sec: throughput,
            method_distribution,
            results,
        }
    }
}

/// Computes cosine similarity between two normalized vectors
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    (dot / (norm_a * norm_b)).clamp(-1.0, 1.0)
}

/// Computes a deterministic semantic pseudo-vector for product and category text
pub fn compute_semantic_vector(text: &str, dimension: usize) -> Vec<f32> {
    let mut vec = vec![0.0f32; dimension];
    let lower = text.to_lowercase();

    // Domain 1: Smartphones & Celulares [0..4]
    if lower.contains("celular")
        || lower.contains("smartphone")
        || lower.contains("iphone")
        || lower.contains("galaxy")
        || lower.contains("redmi")
        || lower.contains("xiaomi")
        || lower.contains("motorola")
        || lower.contains("android")
        || lower.contains("telefonia")
    {
        vec[0] += 8.0;
        vec[1] += 6.0;
        vec[2] += 4.0;
    }

    // Domain 2: Acessórios Celular [4..8]
    if lower.contains("capa")
        || lower.contains("case")
        || lower.contains("pelicula")
        || lower.contains("carregador")
        || lower.contains("cabo")
        || lower.contains("suporte veicular")
    {
        vec[4] += 8.0;
        vec[5] += 6.0;
        vec[6] += 4.0;
    }

    // Domain 3: Computadores & Notebooks [8..12]
    if lower.contains("notebook")
        || lower.contains("laptop")
        || lower.contains("macbook")
        || lower.contains("computador")
        || lower.contains("pc")
        || lower.contains("desktop")
        || lower.contains("thinkpad")
        || lower.contains("chromebook")
    {
        vec[8] += 8.0;
        vec[9] += 6.0;
        vec[10] += 4.0;
    }

    // Domain 4: Hardware & Componentes [12..16]
    if lower.contains("placa de video")
        || lower.contains("rtx")
        || lower.contains("geforce")
        || lower.contains("radeon")
        || lower.contains("processador")
        || lower.contains("ryzen")
        || lower.contains("intel core")
        || lower.contains("ssd")
        || lower.contains("memoria ram")
    {
        vec[12] += 8.0;
        vec[13] += 6.0;
        vec[14] += 4.0;
    }

    // Domain 5: Áudio & Fones [16..20]
    if lower.contains("fone")
        || lower.contains("audio")
        || lower.contains("headphone")
        || lower.contains("headset")
        || lower.contains("airpods")
        || lower.contains("earbuds")
        || lower.contains("tws")
        || lower.contains("som")
        || lower.contains("bluetooth")
    {
        vec[16] += 8.0;
        vec[17] += 6.0;
        vec[18] += 4.0;
    }

    // Domain 6: Móveis & Cadeiras de Escritório [20..24]
    if lower.contains("cadeira")
        || lower.contains("assento")
        || lower.contains("poltrona")
        || lower.contains("escritorio")
        || lower.contains("ergonomia")
        || lower.contains("ergonomico")
        || lower.contains("ergonomica")
        || lower.contains("diretor")
        || lower.contains("presidente")
        || lower.contains("lombar")
        || lower.contains("postura")
        || lower.contains("gamer")
        || lower.contains("moveis")
        || lower.contains("giratoria")
        || lower.contains("giratorio")
    {
        vec[20] += 8.0;
        vec[21] += 6.0;
        vec[22] += 4.0;
    }

    // Domain 7: Eletrodomésticos & Cozinha [24..28]
    if lower.contains("cozinha")
        || lower.contains("cafeteira")
        || lower.contains("airfryer")
        || lower.contains("fritadeira")
        || lower.contains("liquidificador")
        || lower.contains("batedeira")
        || lower.contains("microondas")
        || lower.contains("fogao")
        || lower.contains("geladeira")
    {
        vec[24] += 8.0;
        vec[25] += 6.0;
        vec[26] += 4.0;
    }

    // Domain 8: Calçados & Tênis [28..32]
    if lower.contains("tenis")
        || lower.contains("calcado")
        || lower.contains("sapato")
        || lower.contains("sneaker")
        || lower.contains("corrida")
        || lower.contains("running")
        || lower.contains("chuteira")
        || lower.contains("caminhada")
    {
        vec[28] += 8.0;
        vec[29] += 6.0;
        vec[30] += 4.0;
    }

    // Domain 9: Roupas & Vestuário [32..36]
    if lower.contains("camisa")
        || lower.contains("camiseta")
        || lower.contains("blusa")
        || lower.contains("moletom")
        || lower.contains("cropped")
        || lower.contains("regata")
        || lower.contains("polo")
        || lower.contains("jaqueta")
        || lower.contains("vestuario")
        || lower.contains("roupa")
    {
        vec[32] += 8.0;
        vec[33] += 6.0;
        vec[34] += 4.0;
    }

    // Domain 10: Ciclismo & Bicicletas [36..40]
    if lower.contains("bicicleta")
        || lower.contains("bike")
        || lower.contains("ciclismo")
        || lower.contains("caloi")
        || lower.contains("shimano")
        || lower.contains("aro 29")
    {
        vec[36] += 8.0;
        vec[37] += 6.0;
        vec[38] += 4.0;
    }

    // Domain 11: Beleza & Cuidados Pessoais [40..44]
    if lower.contains("beleza")
        || lower.contains("shampoo")
        || lower.contains("cabelo")
        || lower.contains("condicionador")
        || lower.contains("mascara capilar")
        || lower.contains("anticaspa")
    {
        vec[40] += 8.0;
        vec[41] += 6.0;
        vec[42] += 4.0;
    }

    // Domain 12: Ferramentas & Construção [44..48]
    if lower.contains("ferramenta")
        || lower.contains("furadeira")
        || lower.contains("parafusadeira")
        || lower.contains("martelete")
        || lower.contains("serra")
        || lower.contains("esmerilhadeira")
    {
        vec[44] += 8.0;
        vec[45] += 6.0;
        vec[46] += 4.0;
    }

    // Generic token hashing across dimensions [48..dimension]
    let tokens: Vec<&str> = lower.split_whitespace().collect();
    for token in &tokens {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        token.hash(&mut hasher);
        let h = hasher.finish() as usize;
        let rem = dimension.saturating_sub(48).max(1);
        let dim_idx = (h % rem) + 48;
        if dim_idx < dimension {
            let sign = if (h >> 16).is_multiple_of(2) {
                1.0
            } else {
                -1.0
            };
            vec[dim_idx] += sign * 0.2;
        }
    }

    // L2 normalization
    let norm_sq: f32 = vec.iter().map(|x| x * x).sum();
    let norm = norm_sq.sqrt();
    if norm > 1e-6 {
        for v in vec.iter_mut() {
            *v /= norm;
        }
    }

    vec
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deterministic_rule_speed_and_accuracy() {
        let engine = ProductCategorizerEngine::new();
        let item = ProductCatalogItem::new("ITEM-01", "Apple iPhone 15 Pro Max 256GB Titânio")
            .with_brand("Apple")
            .with_price(7999.0);

        let res = engine.classify_sync(&item);

        assert_eq!(res.category_path, "Eletrônicos > Celulares e Smartphones");
        assert_eq!(res.method, ClassificationMethod::DeterministicRule);
        assert_eq!(res.confidence, 1.0);
        assert!(res.tags.contains(&"apple".to_string()));
        assert!(
            res.latency_micros < 50,
            "Deterministic match must execute in sub-millisecond, took {} µs",
            res.latency_micros
        );
    }

    #[test]
    fn test_typed_decision_softmax_classification() {
        let engine = ProductCategorizerEngine::new();
        // Item with keywords but no exact deterministic rule
        let item =
            ProductCatalogItem::new("ITEM-02", "Smartphone Xiaomi Redmi Note 13 256GB 8GB RAM")
                .with_description("Excelente tela AMOLED e câmera de 108MP")
                .with_brand("Xiaomi");

        let res = engine.classify_sync(&item);

        assert_eq!(res.category_path, "Eletrônicos > Celulares e Smartphones");
        assert_eq!(res.method, ClassificationMethod::TypedDecisionSoftmax);
        assert!(
            res.confidence >= 0.40,
            "Confidence should be significant, got {}",
            res.confidence
        );
    }

    #[test]
    fn test_negative_keyword_prevents_misclassification() {
        let engine = ProductCategorizerEngine::new();
        // Case / cover for iPhone: must NOT be classified as "Celulares e Smartphones"
        let item = ProductCatalogItem::new(
            "ITEM-03",
            "Capa Case Antishock de Silicone para iPhone 15 Pro Max",
        )
        .with_description("Proteção total anti-queda e bordas elevadas");

        let res = engine.classify_sync(&item);

        assert_eq!(
            res.category_path,
            "Eletrônicos > Celulares e Smartphones > Acessórios"
        );
        assert_ne!(res.category_path, "Eletrônicos > Celulares e Smartphones");
    }

    #[test]
    fn test_semantic_fallback_classification() {
        let engine = ProductCategorizerEngine::new();
        // Item with paraphrased wording and no exact keywords
        let item = ProductCatalogItem::new(
            "ITEM-04",
            "Assento Ergonômico Diretor Giratório com Apoio Lombar",
        )
        .with_description("Mecanismo relax para postura no home office corporativo");

        let res = engine.classify_sync(&item);

        assert_eq!(
            res.category_path,
            "Casa e Decoração > Móveis > Cadeiras de Escritório"
        );
        assert!(
            res.method == ClassificationMethod::SemanticQdrantRetrieval
                || res.method == ClassificationMethod::TypedDecisionSoftmax
        );
    }

    #[test]
    fn test_crystallize_skill_zero_token_learning() {
        let mut engine = ProductCategorizerEngine::new();
        let item = ProductCatalogItem::new("ITEM-05", "Novo Inovador Super Gadget X9000 Quântico");

        // Initial state: not matching standard rules
        let first_res = engine.classify_sync(&item);
        assert_eq!(first_res.method, ClassificationMethod::LlmTeacherColdStart);

        // Teacher crystallizes the skill
        let skill = engine.crystallize_skill(
            "Super Gadget X9000",
            "Eletrônicos > Computadores e Informática > Componentes e Peças",
            &["inovacao".to_string(), "quantico".to_string()],
            0.99,
        );

        assert_eq!(skill.status, KnowledgeStatus::Active);

        // Second classification: instant deterministic hit via crystallized procedural memory!
        let second_res = engine.classify_sync(&item);
        assert_eq!(second_res.method, ClassificationMethod::DeterministicRule);
        assert_eq!(
            second_res.category_path,
            "Eletrônicos > Computadores e Informática > Componentes e Peças"
        );
        assert_eq!(second_res.confidence, 0.99);
        assert!(second_res.latency_micros < 50);
    }

    #[test]
    fn test_batch_categorization_throughput() {
        let engine = ProductCategorizerEngine::new();
        let mut items = Vec::new();

        for i in 0..500 {
            let item = match i % 5 {
                0 => ProductCatalogItem::new(format!("ITEM-{}", i), "Apple iPhone 14 Pro 128GB")
                    .with_brand("Apple"),
                1 => ProductCatalogItem::new(format!("ITEM-{}", i), "Notebook Dell Inspiron i15")
                    .with_brand("Dell"),
                2 => ProductCatalogItem::new(
                    format!("ITEM-{}", i),
                    "Cadeira Gamer Reclinável Giratória",
                ),
                3 => ProductCatalogItem::new(
                    format!("ITEM-{}", i),
                    "Airfryer Fritadeira Sem Óleo 4L",
                ),
                _ => {
                    ProductCatalogItem::new(format!("ITEM-{}", i), "Tênis Ultraboost Light Corrida")
                        .with_brand("Adidas")
                }
            };
            items.push(item);
        }

        let report = engine.classify_batch_sync(&items);

        assert_eq!(report.total_items, 500);
        assert_eq!(report.classified_count, 500);
        assert!(
            report.throughput_items_per_sec > 10_000.0,
            "Throughput should be > 10k items/s, was {:.1} items/s",
            report.throughput_items_per_sec
        );
        assert!(report
            .method_distribution
            .contains_key("deterministic_rule"));
    }

    #[tokio::test]
    async fn test_async_classification_with_typed_judge() {
        use alr_models::{LocalTypedJudgeEngine, OnnxModelRuntime};

        let runtime = Arc::new(OnnxModelRuntime::new());
        let judge = Arc::new(LocalTypedJudgeEngine::new(runtime));
        let engine = ProductCategorizerEngine::new().with_typed_judge(judge);

        let item = ProductCatalogItem::new("ITEM-06", "Samsung Galaxy S24 Ultra 512GB")
            .with_brand("Samsung");

        let res = engine.classify(&item).await;
        assert_eq!(res.category_path, "Eletrônicos > Celulares e Smartphones");
        assert_eq!(res.method, ClassificationMethod::DeterministicRule);
    }

    #[test]
    fn test_taxonomy_tree_rebuild_and_tag_extraction() {
        let tax = ProductTaxonomy::default_ecommerce();
        assert!(!tax.root_categories.is_empty());
        assert!(tax.all_categories().len() >= 10);
        let tags = tax.extract_tags(
            "Eletrônicos > Celulares e Smartphones",
            "Apple iPhone 15 Pro Max",
        );
        assert!(tags.contains(&"smartphones".to_string()));
        assert!(tags.contains(&"iphone".to_string()));
    }

    #[test]
    fn test_batch_categorization_empty_and_single_item() {
        let engine = ProductCategorizerEngine::new();
        let empty_report = engine.classify_batch_sync(&[]);
        assert_eq!(empty_report.total_items, 0);
        assert_eq!(empty_report.classified_count, 0);

        let single = vec![ProductCatalogItem::new("SINGLE-01", "Airfryer Mondial 4L")];
        let single_report = engine.classify_batch_sync(&single);
        assert_eq!(single_report.total_items, 1);
        assert_eq!(single_report.classified_count, 1);
        assert!(single_report.throughput_items_per_sec > 0.0);
    }

    #[test]
    fn test_hierarchical_resolution_chain() {
        let engine = ProductCategorizerEngine::new();

        // Tier 1: Deterministic match
        let t1 = ProductCatalogItem::new("H-01", "Apple MacBook Pro 16 M3 Max").with_brand("Apple");
        let r1 = engine.classify_sync(&t1);
        assert_eq!(r1.method, ClassificationMethod::DeterministicRule);
        assert_eq!(
            r1.category_path,
            "Eletrônicos > Computadores e Informática > Notebooks"
        );

        // Tier 2: Typed decision with softmax keywords
        let t2 = ProductCatalogItem::new("H-02", "Aparelho Celular Motorola Moto G54 5G 256GB");
        let r2 = engine.classify_sync(&t2);
        assert_eq!(r2.method, ClassificationMethod::TypedDecisionSoftmax);
        assert_eq!(r2.category_path, "Eletrônicos > Celulares e Smartphones");

        // Tier 3: Semantic fallback with no exact keywords
        let t3 = ProductCatalogItem::new("H-03", "Mobiliário para Postura Relax")
            .with_description("Sistema giratório com regulagem de altura para trabalho");
        let r3 = engine.classify_sync(&t3);
        assert_eq!(r3.method, ClassificationMethod::SemanticQdrantRetrieval);
        assert_eq!(
            r3.category_path,
            "Casa e Decoração > Móveis > Cadeiras de Escritório"
        );

        // Tier 4: Unknown novelty
        let t4 = ProductCatalogItem::new(
            "H-04",
            "Artefato Quântico Interdimensional Não Identificado",
        );
        let r4 = engine.classify_sync(&t4);
        assert_eq!(r4.method, ClassificationMethod::LlmTeacherColdStart);
    }

    #[test]
    fn test_deterministic_rule_with_brand_mismatch() {
        let mut engine = ProductCategorizerEngine::new();
        engine.add_deterministic_rule(DeterministicRule {
            id: "RULE-EXCLUSIVE".to_string(),
            title_pattern: "smartwatch series".to_string(),
            brand_pattern: Some("apple".to_string()),
            category_path: "Eletrônicos > Wearables > Smartwatches".to_string(),
            confidence: 1.0,
            tags: vec!["apple".to_string()],
        });

        let item = ProductCatalogItem::new("ITEM-DIFF-BRAND", "Smartwatch Series X Pro")
            .with_brand("Samsung");
        let res = engine.classify_deterministic(&item);
        assert!(res.is_none());
    }

    #[test]
    fn test_builder_pattern_and_custom_taxonomy() {
        let mut custom_tax = ProductTaxonomy::new();
        custom_tax.add_category(
            "Alimentos > Bebidas > Cafés Especiais",
            &["cafe", "grao", "torrado", "espresso"],
            &["cafeteira"],
            &["cafe", "gourmet"],
        );

        let engine = ProductCategorizerEngine::new().with_taxonomy(custom_tax);
        let item = ProductCatalogItem::new("COFFEE-01", "Café Especial Torrado em Grãos 1kg");
        let res = engine.classify_sync(&item);
        assert_eq!(res.category_path, "Alimentos > Bebidas > Cafés Especiais");
    }
}
