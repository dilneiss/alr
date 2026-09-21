pub mod action;
pub mod cdp;
pub mod driver;
pub mod state;
pub mod target;
pub mod web_app;

pub use action::{BrowserAction, BrowserActionKind, BrowserActionResult};
pub use cdp::ChromiumCdpDriver;
pub use driver::{BrowserDriver, BrowserSession, DomElement, DomSnapshot};
pub use state::BrowserState;
pub use target::{BrowserTarget, ByRole, VisualTarget};
pub use web_app::{CustomerSupportWebApp, WebAppVersion};
