use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ByRole {
    pub role: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualTarget {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub label: Option<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BrowserTarget {
    Css(String),
    DomId(String),
    Text(String),
    Role(ByRole),
    Visual(VisualTarget),
    Composite {
        primary: Box<BrowserTarget>,
        fallback: Box<BrowserTarget>,
    },
}

impl BrowserTarget {
    pub fn css(selector: impl Into<String>) -> Self {
        Self::Css(selector.into())
    }

    pub fn id(id: impl Into<String>) -> Self {
        Self::DomId(id.into())
    }

    pub fn text(text: impl Into<String>) -> Self {
        Self::Text(text.into())
    }

    pub fn role(role: impl Into<String>, name: impl Into<String>) -> Self {
        Self::Role(ByRole {
            role: role.into(),
            name: name.into(),
        })
    }

    pub fn with_fallback(self, fallback: BrowserTarget) -> Self {
        Self::Composite {
            primary: Box::new(self),
            fallback: Box::new(fallback),
        }
    }

    /// Resolve effective selector string for CDP querySelector / DOM evaluation
    pub fn resolve_query_expression(&self) -> String {
        match self {
            Self::Css(css) => format!("document.querySelector('{}')", css.replace('\'', "\\'")),
            Self::DomId(id) => format!("document.getElementById('{}')", id.replace('\'', "\\'")),
            Self::Text(txt) => format!(
                "Array.from(document.querySelectorAll('*')).find(el => el.children.length === 0 && el.textContent.trim().includes('{}'))",
                txt.replace('\'', "\\'")
            ),
            Self::Role(r) => format!(
                "Array.from(document.querySelectorAll('*')).find(el => (el.getAttribute('role') === '{0}' || el.tagName.toLowerCase() === '{0}') && (el.getAttribute('aria-label') === '{1}' || el.textContent.trim() === '{1}'))",
                r.role.to_lowercase().replace('\'', "\\'"),
                r.name.replace('\'', "\\'")
            ),
            Self::Visual(v) => format!("document.elementFromPoint({}, {})", v.x + v.width / 2.0, v.y + v.height / 2.0),
            Self::Composite { primary, fallback } => {
                let p = primary.resolve_query_expression();
                let f = fallback.resolve_query_expression();
                format!("({} || {})", p, f)
            }
        }
    }
}
