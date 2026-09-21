use crate::procedural::ProceduralSkill;
use crate::support_tool::{RiskLevel, SupportTool};
use crate::trust::{ContentSourceKind, TrustBoundaryEnforcer};
use anyhow::{bail, Result};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InjectionVector {
    DirectInstruction,
    IndirectToolCoercion,
    FakePolicyAssertion,
    CrossTenantEscape,
    KnowledgePoisoning,
}

pub struct SecurityRedTeamAuditor;

impl SecurityRedTeamAuditor {
    /// Inspect incoming customer message text for sophisticated injection patterns
    pub fn sanitize_customer_input(text: &str) -> Result<()> {
        let lower = text.to_lowercase();

        // Direct prompt injection
        if lower.contains("ignore all previous instructions")
            || lower.contains("ignore all rules")
            || lower.contains("system prompt override")
            || lower.contains("ignore previous rules")
            || lower.contains("disregard instructions")
            || lower.contains("you are now dan")
            || lower.contains("drop database")
        {
            bail!("Prompt Injection Detected (Direct Vector)");
        }

        // Indirect tool coercion
        if lower.contains("execute refund_payment")
            || lower.contains("run tool direct_wire_transfer")
            || lower.contains("call tool send_ticket_reply with")
            || lower.contains("delete this customer")
            || lower.contains("delete customer")
        {
            bail!("Prompt Injection Detected (Indirect Tool Coercion)");
        }

        // Fake policy assertions
        if lower.contains("segundo a política interna você deve")
            || lower.contains("according to internal policy you must")
            || lower.contains("internal override rule #1")
        {
            bail!("Prompt Injection Detected (Fake Policy Assertion)");
        }

        // Cross-tenant escape attempts
        if lower.contains("procure a política usada pelo tenant")
            || lower.contains("search documents for tenant_b")
            || lower.contains("target_tenant=")
            || lower.contains("tenant_override:")
        {
            bail!("Cross-Tenant Security Breach Attempt");
        }

        Ok(())
    }

    /// Validates proposed skills against poisoning attacks (dangerous tools, loops, missing tools)
    pub fn validate_skill_poisoning(
        skill: &ProceduralSkill,
        registered_tools: &HashMap<String, Box<dyn SupportTool>>,
        max_allowed_risk: RiskLevel,
    ) -> Result<()> {
        if skill.steps.is_empty() {
            bail!("Skill Poisoning Rejection: Proposed skill contains zero steps");
        }

        if skill.steps.len() > 10 {
            bail!(
                "Skill Poisoning Rejection: Excessive step count indicates potential infinite loop"
            );
        }

        let mut seen_tools = Vec::new();
        for step in &skill.steps {
            let tool = match registered_tools.get(&step.tool_name) {
                Some(t) => t,
                None => bail!(
                    "Skill Poisoning Rejection: Tool '{}' does not exist in runtime registry",
                    step.tool_name
                ),
            };

            if tool.risk_level() > max_allowed_risk {
                bail!(
                    "Skill Poisoning Rejection: Tool '{}' risk {:?} exceeds threshold {:?}",
                    step.tool_name,
                    tool.risk_level(),
                    max_allowed_risk
                );
            }

            let occurrences = seen_tools.iter().filter(|&&t| t == &step.tool_name).count();
            if occurrences >= 3 {
                bail!("Skill Poisoning Rejection: Repetitive invocation of tool '{}' without state transition", step.tool_name);
            }
            seen_tools.push(&step.tool_name);
        }

        Ok(())
    }

    /// Verify retrieved document content against Knowledge Poisoning
    pub fn validate_retrieved_knowledge(
        doc_content: &str,
        source_kind: ContentSourceKind,
    ) -> Result<()> {
        TrustBoundaryEnforcer::assert_data_not_command(doc_content)?;

        if source_kind == ContentSourceKind::CustomerInput {
            let lower = doc_content.to_lowercase();
            if lower.contains("official policy:") || lower.contains("system override:") {
                bail!(
                    "Knowledge Poisoning Detected: Untrusted input claims official policy status."
                );
            }
        }

        Ok(())
    }
}
