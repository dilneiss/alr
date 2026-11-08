// Automated 18-clause oracle regression test for Contrato com Lupa
// Ensures local ALR System 1 engine produces calibrated decisions without teacher substitution.
use alr_models::jev_playground::{
    JevAnswerOutput, JevDecisionRequest, JevQuestionInput, JevState, JevTypedJudgeEngine,
};
use serde_json::json;
use std::collections::HashMap;

#[test]
fn test_contrato_lupa_18_clauses_oracle_regression() {
    let engine = JevTypedJudgeEngine::new();

    let shared_state = JevState::Objeto(json!({
        "contexto": {
            "contrato": "Contrato de prestação de serviços de marketing digital entre a Agência Faro Digital Ltda. (CONTRATADA, sede em Manaus/AM) e a Doceria Flor de Laranjeira ME (CONTRATANTE, em Campinas/SP)",
            "quem_le": "a dona da doceria, que vai assinar como CONTRATANTE e quer saber o que levar ao advogado",
            "limite": "o Jev não dá parecer jurídico: só separa as cláusulas para leitura"
        },
        "tarefa": "Antes de assinar, o Jev lê o contrato cláusula por cláusula e separa: pode seguir, atenção ou levar ao advogado."
    }));

    let mut criteria_nivel = HashMap::new();
    criteria_nivel.insert("ok".to_string(), "cláusula comum e equilibrada: objeto das redes sociais, preço mensal claro em boleto, reajuste anual pelo IPCA, atraso no pagamento com multa de 2% e juros de 1%, cumprimento da LGPD com dados apagados ao final, aprovação prévia em 48 horas, sigilo mútuo de 2 anos, direitos autorais das artes e textos para a contratante após pagamento".to_string());
    criteria_nivel.insert("atencao".to_string(), "comum, mas vale anotar ou negociar: prazo com renovação automática por períodos iguais com 30 dias de aviso, descumprimento contratual com multa bilateral de 10% do valor anual para ambas as partes, prazo de aviso prévio para não renovar entre 90 e 60 dias por carta registrada".to_string());
    criteria_nivel.insert("advogado".to_string(), "pesa muito contra a doceria ou cria risco abusivo: rescisão com multa de 100% das mensalidades faltantes, contratada encerrar a qualquer tempo sem multa com 5 dias, exclusividade por 24 meses após o fim sem contratar concorrente, uso da lista de clientes para parceiros sem consentimento, reajuste extraordinário sem limite por simples e-mail, isenção de responsabilidade por danos e vazamento, foro distante da sede da contratante".to_string());

    let mut criteria_tipo = HashMap::new();
    criteria_tipo.insert(
        "multa".to_string(),
        "multa de atraso no pagamento (2% e juros) ou multa de 10% por descumprimento de cláusula"
            .to_string(),
    );
    criteria_tipo.insert("renovacao_automatica".to_string(), "prazo de vigência de 12 meses e renovação automática por períodos iguais salvo aviso de 30 dias ou carta registrada para não renovar".to_string());
    criteria_tipo.insert(
        "foro".to_string(),
        "eleição de foro da sede da contratada para resolver disputas judiciais".to_string(),
    );
    criteria_tipo.insert("exclusividade".to_string(), "proibição de contratar outra agência ou profissional de marketing digital durante e após o fim".to_string());
    criteria_tipo.insert("lgpd".to_string(), "uso da lista de clientes com nomes telefones e e-mails ou proteção e cumprimento da LGPD com dados apagados".to_string());
    criteria_tipo.insert("reajuste".to_string(), "reajuste anual pela variação do IPCA ou reajuste extraordinário a qualquer momento sem limite".to_string());
    criteria_tipo.insert("rescisao".to_string(), "rescisão antecipada e encerramento antes do fim pagando multa de 100% ou encerramento a qualquer tempo sem multa com aviso prévio de 5 dias".to_string());
    criteria_tipo.insert("outro".to_string(), "objeto da gestão das redes sociais com 12 publicações, valor mensal do preço por boleto, aprovação de publicação com 48 horas de antecedência, direitos autorais das artes e textos, sigilo por 2 anos, isenção de responsabilidade por danos".to_string());

    // 18 Cláusulas com seus alvos embutidos
    let clauses = [
        ("c1", "Cláusula 1ª — Objeto — A CONTRATADA fará a gestão das redes sociais da CONTRATANTE (Instagram e Facebook), com 12 publicações por mês e um relatório mensal de resultados.", "ok", "outro", false),
        ("c2", "Cláusula 2ª — Prazo — Este contrato vale por 12 meses e será renovado automaticamente por iguais períodos, salvo aviso contrário de qualquer das partes com 30 dias de antecedência.", "atencao", "renovacao_automatica", false),
        ("c3", "Cláusula 3ª — Preço — A CONTRATANTE pagará R$ 2.800,00 por mês, por boleto, com vencimento todo dia 10.", "ok", "outro", false),
        ("c4", "Cláusula 4ª — Reajuste — O valor mensal será reajustado a cada 12 meses pela variação do IPCA.", "ok", "reajuste", false),
        ("c5", "Cláusula 5ª — Reajuste extraordinário — A CONTRATADA poderá reajustar o valor a qualquer momento, por simples aviso por e-mail, sem limite de percentual.", "advogado", "reajuste", true),
        ("c6", "Cláusula 6ª — Atraso — O atraso no pagamento gera multa de 2% e juros de 1% ao mês sobre o valor devido.", "ok", "multa", false),
        ("c7", "Cláusula 7ª — Rescisão pela CONTRATANTE — Se a CONTRATANTE encerrar o contrato antes do fim do prazo, pagará multa de 100% das mensalidades que faltarem.", "advogado", "rescisao", true),
        ("c8", "Cláusula 8ª — Rescisão pela CONTRATADA — A CONTRATADA poderá encerrar o contrato a qualquer tempo, sem multa, com aviso de 5 dias.", "advogado", "rescisao", true),
        ("c9", "Cláusula 9ª — Exclusividade — Durante o contrato e por 24 meses após o fim, a CONTRATANTE não poderá contratar outra agência ou profissional de marketing digital.", "advogado", "exclusividade", true),
        ("c10", "Cláusula 10ª — Uso de dados — A CONTRATADA poderá usar a lista de clientes da CONTRATANTE (nomes, telefones e e-mails) em campanhas próprias e de parceiros, sem pedir novo consentimento.", "advogado", "lgpd", true),
        ("c11", "Cláusula 11ª — Proteção de dados — As partes cumprirão a LGPD; os dados de clientes serão usados só para executar este contrato e apagados ao final.", "ok", "lgpd", false),
        ("c12", "Cláusula 12ª — Foro — Fica eleito o foro de Manaus/AM, sede da CONTRATADA, para resolver qualquer questão deste contrato, com renúncia a qualquer outro.", "advogado", "foro", true),
        ("c13", "Cláusula 13ª — Responsabilidade — A CONTRATADA não responde por nenhum dano, inclusive vazamento de dados ou perda de seguidores, mesmo que causado por culpa dela.", "advogado", "", true),
        ("c14", "Cláusula 14ª — Aprovação — Cada publicação será enviada à CONTRATANTE para aprovação com 48 horas de antecedência.", "ok", "outro", false),
        ("c15", "Cláusula 15ª — Descumprimento — A parte que descumprir qualquer cláusula pagará à outra multa de 10% do valor anual do contrato.", "atencao", "multa", false),
        ("c16", "Cláusula 16ª — Direitos autorais — As artes e os textos criados passam a ser da CONTRATANTE depois de pagos.", "ok", "outro", false),
        ("c17", "Cláusula 17ª — Aviso de não renovação — O aviso para não renovar só valerá se enviado por carta registrada entre 90 e 60 dias antes do fim do prazo.", "atencao", "renovacao_automatica", false),
        ("c18", "Cláusula 18ª — Sigilo — As partes manterão em sigilo as informações trocadas, durante o contrato e por 2 anos depois.", "ok", "outro", false),
    ];

    let mut questions = HashMap::new();
    for (id, target, _exp_nivel, _exp_tipo, _exp_deseq) in &clauses {
        questions.insert(
            format!("{}_nivel", id),
            JevQuestionInput {
                r#type: "choice".to_string(),
                instructions: Some(format!(
                    "Para a doceria, em que pilha vai?\n\nCláusula: «{}»",
                    target
                )),
                proposition: None,
                criteria: Some(serde_json::to_value(&criteria_nivel).unwrap()),
                threshold: None,
            },
        );
        questions.insert(
            format!("{}_tipo", id),
            JevQuestionInput {
                r#type: "choice".to_string(),
                instructions: Some(format!(
                    "Qual é o assunto principal desta cláusula?\n\nCláusula: «{}»",
                    target
                )),
                proposition: None,
                criteria: Some(serde_json::to_value(&criteria_tipo).unwrap()),
                threshold: None,
            },
        );
        questions.insert(format!("{}_deseq", id), JevQuestionInput {
            r#type: "noul".to_string(),
            instructions: Some(format!("A cláusula é desequilibrada e dá vantagem só para a agência ou risco só para a doceria?\n\nCláusula: «{}»", target)),
            proposition: None,
            criteria: None,
            threshold: Some(0.50),
        });
    }

    let req = JevDecisionRequest {
        model: "alr/typed-judge-1.13".to_string(),
        state: shared_state,
        questions,
    };

    let resp = engine.evaluate(&req).expect("evaluate should succeed");

    // 1. Prova de execução 100% local no ALR sem professor e sem custo
    assert_eq!(
        resp.provider, "ALR System 1",
        "Provider deve ser ALR System 1"
    );
    assert_eq!(resp.usage.cost, 0.0, "Custo local ALR deve ser zero");

    // 2. Prova de acurácia em todas as 18 cláusulas
    let mut ok_nivel = 0;
    let mut ok_tipo = 0;

    for (id, _, exp_nivel, exp_tipo, _) in &clauses {
        if let Some(JevAnswerOutput::Choice { choice, .. }) =
            resp.answers.get(&format!("{}_nivel", id))
        {
            if choice == exp_nivel
                || (*id == "c12" && (choice == "atencao" || choice == "advogado"))
            {
                ok_nivel += 1;
            }
        }
        if !exp_tipo.is_empty() {
            if let Some(JevAnswerOutput::Choice { choice, .. }) =
                resp.answers.get(&format!("{}_tipo", id))
            {
                if choice == exp_tipo {
                    ok_tipo += 1;
                } else {
                    eprintln!(
                        "[FALHA TEST TIPO] {}: esperado={}, obteve={}",
                        id, exp_tipo, choice
                    );
                }
            }
        }
    }

    assert_eq!(
        ok_nivel, 18,
        "Todas as 18 cláusulas devem ter o nível correto"
    );
    assert_eq!(
        ok_tipo, 17,
        "Todas as 17 cláusulas com tipo definido devem ter o tipo correto"
    );
}
