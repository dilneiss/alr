use alr_perception::RawImage;
use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserSession {
    pub id: String,
    pub endpoint: String,
    pub target_id: Option<String>,
    pub current_url: String,
    pub is_headless: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomElement {
    pub node_id: u64,
    pub tag: String,
    pub role: Option<String>,
    pub name: Option<String>,
    pub text: String,
    pub value: Option<String>,
    pub visible: bool,
    pub enabled: bool,
    pub selector: String,
    pub attributes: std::collections::HashMap<String, String>,
    pub bounding_box: Option<(f32, f32, f32, f32)>, // x, y, width, height
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomSnapshot {
    pub url: String,
    pub title: String,
    pub elements: Vec<DomElement>,
    pub raw_html: Option<String>,
}

#[async_trait]
pub trait BrowserDriver: Send + Sync {
    async fn launch(&self, headless: bool) -> Result<BrowserSession>;

    async fn navigate(&self, session: &mut BrowserSession, url: &str) -> Result<()>;

    async fn click(
        &self,
        session: &BrowserSession,
        target: &super::target::BrowserTarget,
    ) -> Result<()>;

    async fn type_text(
        &self,
        session: &BrowserSession,
        target: &super::target::BrowserTarget,
        text: &str,
    ) -> Result<()>;

    async fn select(
        &self,
        session: &BrowserSession,
        target: &super::target::BrowserTarget,
        value: &str,
    ) -> Result<()>;

    async fn screenshot(&self, session: &BrowserSession) -> Result<RawImage>;

    async fn get_dom(&self, session: &BrowserSession) -> Result<DomSnapshot>;

    async fn evaluate_js(
        &self,
        session: &BrowserSession,
        expression: &str,
    ) -> Result<serde_json::Value>;

    async fn current_url(&self, session: &BrowserSession) -> Result<String>;

    async fn close(&self, session: &BrowserSession) -> Result<()>;
}
