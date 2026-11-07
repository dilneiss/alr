// POST com resposta em SSE (o EventSource só faz GET). handlers: { nomeDoEvento(dados), falha(erro) }.
// Todo evento com _jev é registrado no inspetor do kit ("Ver o que o Jev vê") e na topbar.
export function postSSE(url, body, handlers) {
  const ctrl = new AbortController();
  const pronto = (async () => {
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    } catch {
      if (!ctrl.signal.aborted && handlers.falha) handlers.falha({ mensagem: 'Sem conexão com o servidor. Tente de novo.', code: 'rede' });
      return;
    }
    if (!(res.headers.get('content-type') || '').includes('text/event-stream')) {
      let j = {};
      try { j = await res.json(); } catch { /* corpo vazio */ }
      if (res.ok && j.ok && j.pulado) { if (handlers.pulado) handlers.pulado(j); return; }   // análise parcial dispensada pelo servidor
      if (handlers.falha) handlers.falha({ mensagem: j.error || `Erro ${res.status}`, code: j.code || 'http', status: res.status });
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const bloco = buf.slice(0, i); buf = buf.slice(i + 2);
          let ev = 'message', data = '';
          for (const l of bloco.split('\n')) {
            if (l.startsWith('event:')) ev = l.slice(6).trim();
            else if (l.startsWith('data:')) data += l.slice(5).trim();
          }
          if (!data) continue;
          let d;
          try { d = JSON.parse(data); } catch { continue; }
          if (d && d._jev && window.JevKit) window.JevKit.record(d._jev, handlers.rotulo);
          // erro dentro de um handler não pode derrubar o stream nem sumir calado
          if (handlers[ev]) { try { handlers[ev](d); } catch (err) { console.error(`[sse ${ev}]`, err); } }
        }
      }
    } catch {
      if (!ctrl.signal.aborted && handlers.falha) handlers.falha({ mensagem: 'A conexão caiu no meio da resposta.', code: 'rede' });
    }
  })();
  return { cancelar: () => ctrl.abort(), pronto };
}
