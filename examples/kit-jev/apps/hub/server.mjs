// Hub do Jev Apps — lista os demos (apps/hub/public/demos.json) e mostra números ao vivo do gateway.
import { createApp } from '../../shared/server/kit.mjs';

const GATEWAY = process.env.JEV_GATEWAY_URL || 'http://127.0.0.1:8787';
const app = createApp({ name: 'hub', publicDir: new URL('./public/', import.meta.url) });

let cache = { at: 0, data: null };
app.get('/api/stats', async () => {
  if (Date.now() - cache.at < 5000 && cache.data) return cache.data;
  try {
    const r = await fetch(`${GATEWAY}/v1/stats`);
    const s = await r.json();
    const apps = {};
    for (const [k, v] of Object.entries(s.apps || {})) apps[k] = { calls: v.calls, questions: v.questions, p50_ms: v.p50_ms };
    cache = { at: Date.now(), data: { ok: true, model: s.model, total: { calls: s.total.calls, questions: s.total.questions, cost: s.total.cost, p50_ms: s.total.p50_ms, p90_ms: s.total.p90_ms }, apps } };
  } catch (e) {
    cache = { at: Date.now(), data: { ok: false } };
  }
  return cache.data;
});

app.start(+(process.env.PORT || 4100));
