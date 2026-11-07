// Confere para onde um nome aponta. Pergunta a dois resolvedores públicos (DNS sobre HTTPS) além do sistema:
// o resolvedor do computador guarda "não existe" em cache por até 1 hora depois que o registro é criado.
import dns from 'node:dns/promises';

async function viaDoh(nome) {
  const fontes = [
    `https://dns.google/resolve?name=${encodeURIComponent(nome)}&type=A`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nome)}&type=A`,
  ];
  const ips = new Set();
  await Promise.all(fontes.map(async (u) => {
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(u, { headers: { Accept: 'application/dns-json' }, signal: ctrl.signal });
      clearTimeout(t);
      const j = await r.json();
      for (const a of j.Answer || []) if (a.type === 1) ips.add(a.data);
    } catch { /* um resolvedor fora do ar não decide nada */ }
  }));
  return [...ips];
}

export async function resolver(nome) {
  const publicos = await viaDoh(nome);
  let local = [];
  try { local = await dns.resolve4(nome); } catch { /* sem resposta local */ }
  return { publicos, local };
}

export async function apontaPara(nome, ip) {
  const r = await resolver(nome);
  return { ok: r.publicos.includes(ip), ...r };
}
