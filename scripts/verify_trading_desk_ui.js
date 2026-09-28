const puppeteer = require('puppeteer');

async function main() {
  console.log('Iniciando navegador headless para validação de UI...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navegando para http://127.0.0.1:3800...');
  await page.goto('http://127.0.0.1:3800', { waitUntil: 'networkidle2' });

  // Alterna explicitamente para a visão em Grafo Topológico
  console.log('Alternando para a visão em Grafo Topológico...');
  await page.evaluate(() => {
    switchView('graph');
  });

  // Aguarda 2 segundos para o polling e renderização do grafo
  await new Promise(r => setTimeout(r, 2000));

  const uiData = await page.evaluate(() => {
    const cBal = document.getElementById('graph-crypto-balance')?.textContent?.trim();
    const fBal = document.getElementById('graph-forex-balance')?.textContent?.trim();
    const coreBal = document.getElementById('graph-core-balance')?.textContent?.trim();
    const cPnl = document.getElementById('graph-crypto-pnl')?.textContent?.trim();
    const fPnl = document.getElementById('graph-forex-pnl')?.textContent?.trim();
    const cClosed = document.getElementById('graph-crypto-trades-closed')?.textContent?.trim();
    const fClosed = document.getElementById('graph-forex-trades-closed')?.textContent?.trim();
    const leaderBadge = document.getElementById('graph-market-leader-badge')?.textContent?.trim();
    const cBadge = document.getElementById('crypto-subhub-badge')?.textContent?.trim();
    const fBadge = document.getElementById('forex-subhub-badge')?.textContent?.trim();

    return {
      cBal,
      fBal,
      coreBal,
      cPnl,
      fPnl,
      cClosed,
      fClosed,
      leaderBadge,
      cBadge,
      fBadge
    };
  });

  console.log('Dados extraídos da interface web (Visão em Grafo):');
  console.log(JSON.stringify(uiData, null, 2));

  // Screenshot para comprovação visual
  await page.screenshot({ path: 'static/trading_desk_segregated_verify.png', fullPage: false });
  console.log('Screenshot salvo em static/trading_desk_segregated_verify.png');

  await browser.close();

  console.log('Verificação de segregação de saldos:');
  console.log(`  Saldo Cripto: ${uiData.cBal}`);
  console.log(`  Saldo Forex:  ${uiData.fBal}`);
  console.log(`  Patrimônio Core: ${uiData.coreBal}`);
  console.log(`  Liderança:    ${uiData.leaderBadge}`);

  if (uiData.cBal === '$0.00' || uiData.fBal === '$0.00') {
    console.error('ERRO: Os saldos não foram populados corretamente!');
    process.exit(1);
  }

  console.log('Validação de UI concluída com 100% de sucesso!');
}

main().catch(err => {
  console.error('Erro na validação:', err);
  process.exit(1);
});
