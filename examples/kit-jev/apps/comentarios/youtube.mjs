// YouTube Data API v3 — só o que o app usa: extrair o ID do link, dados do vídeo, comentários e uploads do canal.
// A chave NUNCA vai para o navegador nem para mensagens de erro.
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://www.googleapis.com/youtube/v3/';
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function carregarChave(dir) {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY.trim();
  try { return fs.readFileSync(path.join(dir, '..', '..', '.secrets', 'youtube_key'), 'utf8').trim(); } catch { return ''; }
}

// Aceita: ID puro, youtube.com/watch?v=, youtu.be/, /shorts/, /live/, /embed/, /v/, m./music./www., com ou sem https, com &t= etc.
export function extrairId(entrada) {
  const s = String(entrada ?? '').trim();
  if (!s || s.length > 400) return null;
  if (ID_RE.test(s)) return s;
  let u;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  if (host === 'youtu.be') { const id = u.pathname.split('/')[1] || ''; return ID_RE.test(id) ? id : null; }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v && ID_RE.test(v)) return v;
    const m = u.pathname.match(/^\/(?:shorts|live|embed|v|e)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/);
    if (m) return m[1];
  }
  return null;
}

export class ErroYouTube extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const MOTIVOS = {
  commentsDisabled: ['comentarios_desativados', 'Os comentários deste vídeo estão desativados.'],
  videoNotFound: ['nao_encontrado', 'Não encontrei esse vídeo. Ele pode ser privado, ter sido removido ou o link está incompleto.'],
  quotaExceeded: ['cota', 'A cota diária da API do YouTube acabou. Tente amanhã — ou clique num dos exemplos, que já estão prontos.'],
  dailyLimitExceeded: ['cota', 'A cota diária da API do YouTube acabou. Tente amanhã — ou clique num dos exemplos, que já estão prontos.'],
  rateLimitExceeded: ['cota', 'O YouTube pediu uma pausa. Tente de novo em alguns segundos.'],
  forbidden: ['proibido', 'O YouTube não permite ler os comentários deste vídeo.'],
  processingFailure: ['yt_falhou', 'O YouTube não conseguiu entregar os comentários agora. Tente de novo em instantes.'],
};

export function criarCliente(chave) {
  async function get(endpoint, params) {
    if (!chave) throw new ErroYouTube('sem_chave', 'O servidor está sem a chave da API do YouTube. Os exemplos em cache continuam funcionando.');
    const u = new URL(API + endpoint);
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, v);
    u.searchParams.set('key', chave);
    let r, j;
    try {
      r = await fetch(u, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
      j = await r.json();
    } catch {
      throw new ErroYouTube('yt_indisponivel', 'Não consegui falar com o YouTube agora. Tente de novo em instantes.');
    }
    if (!r.ok) {
      const motivo = j?.error?.errors?.[0]?.reason || '';
      const m = MOTIVOS[motivo];
      if (m) throw new ErroYouTube(m[0], m[1]);
      if (r.status === 400 || r.status === 403) console.error('[comentarios] YouTube recusou:', r.status, motivo || j?.error?.message);
      throw new ErroYouTube('yt_erro', `O YouTube recusou o pedido (código ${r.status}). Tente outro vídeo.`);
    }
    return j;
  }

  async function video(id) {
    const j = await get('videos', { part: 'snippet,statistics,contentDetails', id });
    const v = j.items?.[0];
    if (!v) throw new ErroYouTube(...MOTIVOS.videoNotFound);
    return normalizarVideo(v);
  }

  // até `paginas` páginas de 100 conversas (commentThreads), ordem de relevância, com as respostas que a API devolve junto
  async function comentarios(id, canalId, paginas = 3) {
    const out = []; let token = '';
    for (let p = 0; p < paginas; p++) {
      const j = await get('commentThreads', { part: 'snippet,replies', videoId: id, order: 'relevance', maxResults: 100, textFormat: 'plainText', pageToken: token });
      for (const t of j.items || []) {
        const s = t.snippet?.topLevelComment?.snippet; if (!s) continue;
        const respostas = t.replies?.comments || [];
        out.push({
          id: t.id,
          autor: String(s.authorDisplayName || 'anônimo').slice(0, 80),
          texto: String(s.textOriginal ?? s.textDisplay ?? '').slice(0, 2000),
          likes: +s.likeCount || 0,
          respostas: +t.snippet.totalReplyCount || 0,
          respondido_canal: respostas.some((c) => c.snippet?.authorChannelId?.value === canalId),
          do_canal: s.authorChannelId?.value === canalId,
          publicado: s.publishedAt,
        });
      }
      token = j.nextPageToken;
      if (!token) break;
    }
    return out;
  }

  // vídeos recentes de um canal (playlist de uploads) com estatísticas
  async function uploads(playlistId, maxVideos = 200) {
    const ids = []; let token = '';
    while (ids.length < maxVideos) {
      const j = await get('playlistItems', { part: 'contentDetails', playlistId, maxResults: 50, pageToken: token });
      ids.push(...(j.items || []).map((i) => i.contentDetails.videoId));
      token = j.nextPageToken; if (!token) break;
    }
    const out = [];
    for (let i = 0; i < ids.length; i += 50) {
      const j = await get('videos', { part: 'snippet,statistics,contentDetails', id: ids.slice(i, i + 50).join(',') });
      out.push(...(j.items || []).map(normalizarVideo));
    }
    return out;
  }

  return { video, comentarios, uploads };
}

function duracaoSeg(iso) {
  const m = String(iso || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

function normalizarVideo(v) {
  return {
    id: v.id,
    titulo: v.snippet?.title || '(sem título)',
    canal: v.snippet?.channelTitle || '',
    canal_id: v.snippet?.channelId || '',
    publicado: v.snippet?.publishedAt || null,
    views: +v.statistics?.viewCount || 0,
    likes: +v.statistics?.likeCount || 0,
    n_comentarios: v.statistics?.commentCount != null ? +v.statistics.commentCount : null,
    duracao_s: duracaoSeg(v.contentDetails?.duration),
  };
}
