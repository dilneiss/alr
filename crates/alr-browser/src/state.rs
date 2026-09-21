use crate::driver::DomSnapshot;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserState {
    pub url: String,
    pub title: String,
    pub visible_element_count: usize,
    pub interactive_element_count: usize,
    pub page_hash: String,
    pub dom_snapshot: DomSnapshot,
    pub authenticated: bool,
    pub alert_or_toast_present: Option<String>,
}

impl BrowserState {
    pub fn new(dom: DomSnapshot, authenticated: bool) -> Self {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let visible_count = dom.elements.iter().filter(|e| e.visible).count();
        let interactive_count = dom
            .elements
            .iter()
            .filter(|e| {
                e.visible
                    && e.enabled
                    && ["button", "input", "select", "a", "textarea"].contains(&e.tag.as_str())
            })
            .count();

        let mut hasher = DefaultHasher::new();
        dom.url.hash(&mut hasher);
        dom.title.hash(&mut hasher);
        for el in &dom.elements {
            if el.visible {
                el.tag.hash(&mut hasher);
                el.text.hash(&mut hasher);
                if let Some(ref val) = el.value {
                    val.hash(&mut hasher);
                }
            }
        }
        let page_hash = format!("{:016x}", hasher.finish());

        let alert_or_toast_present = dom.elements.iter().find_map(|el| {
            if el.visible
                && (el.selector.contains("toast")
                    || el.selector.contains("alert")
                    || el.attributes.get("role").is_some_and(|r| r == "alert"))
            {
                Some(el.text.clone())
            } else {
                None
            }
        });

        Self {
            url: dom.url.clone(),
            title: dom.title.clone(),
            visible_element_count: visible_count,
            interactive_element_count: interactive_count,
            page_hash,
            dom_snapshot: dom,
            authenticated,
            alert_or_toast_present,
        }
    }

    pub fn has_element_with_text(&self, text: &str) -> bool {
        self.dom_snapshot
            .elements
            .iter()
            .any(|el| el.visible && el.text.to_lowercase().contains(&text.to_lowercase()))
    }
}
