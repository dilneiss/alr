use anyhow::{Context, Result};
use reqwest::Client;
use std::sync::Arc;
use std::time::Duration;

use crate::connector::{
    AllowedHostPolicy, ConnectorAction, ConnectorCapability, ConnectorContext, ConnectorId,
    ConnectorResult, ExternalConnector,
};
use crate::secrets::{SecretRef, SecretStore};

pub struct RestConnector<S: SecretStore> {
    id: ConnectorId,
    client: Client,
    egress_policy: AllowedHostPolicy,
    secret_store: Arc<S>,
}

impl<S: SecretStore> RestConnector<S> {
    pub fn new(
        id: impl Into<String>,
        egress_policy: AllowedHostPolicy,
        secret_store: Arc<S>,
    ) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .unwrap_or_default();
        Self {
            id: ConnectorId(id.into()),
            client,
            egress_policy,
            secret_store,
        }
    }
}

#[async_trait::async_trait]
impl<S: SecretStore> ExternalConnector for RestConnector<S> {
    fn id(&self) -> ConnectorId {
        self.id.clone()
    }

    async fn capabilities(&self) -> Result<Vec<ConnectorCapability>> {
        Ok(vec![
            ConnectorCapability::Read,
            ConnectorCapability::Write,
            ConnectorCapability::Create,
            ConnectorCapability::Update,
            ConnectorCapability::Delete,
            ConnectorCapability::Search,
        ])
    }

    async fn execute(
        &self,
        action: ConnectorAction,
        context: ConnectorContext,
    ) -> Result<ConnectorResult> {
        let url = action.parameters["url"]
            .as_str()
            .context("Missing url parameter")?;
        self.egress_policy.check_url(url)?;

        let method_str = action.parameters["method"]
            .as_str()
            .unwrap_or("GET")
            .to_uppercase();
        let method = match method_str.as_str() {
            "POST" => reqwest::Method::POST,
            "PUT" => reqwest::Method::PUT,
            "DELETE" => reqwest::Method::DELETE,
            _ => reqwest::Method::GET,
        };

        let mut req = self.client.request(method, url);

        if let Some(ref sref) = context.secret_ref {
            let secret = self.secret_store.get(&SecretRef(sref.clone())).await?;
            req = req.bearer_auth(&secret.0);
        }

        if let Some(ref ikey) = context.idempotency_key {
            req = req.header("Idempotency-Key", ikey);
        }

        if let Some(body) = action.parameters.get("body") {
            req = req.json(body);
        }

        let resp = req.send().await.context("REST request dispatch failed")?;
        let status = resp.status();
        let data: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);

        let verified = status.is_success();

        Ok(ConnectorResult {
            success: status.is_success(),
            status_code: Some(status.as_u16()),
            data,
            verified,
            message: None,
        })
    }

    async fn health(&self) -> Result<bool> {
        Ok(true)
    }
}
