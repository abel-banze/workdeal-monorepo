import "./load-env.js";
import { Hono } from "hono";
import { env as _envDiag } from "./env.js";
// força validação e log de diagnóstico (o import acima já fez log, mas este garante que o Proxy de env valida e mostra host)
void _envDiag.BETTER_AUTH_URL;
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { auth } from "@workdeal/auth";
import { formatAllowedOrigins } from "@workdeal/shared/lib/env";
import { logger } from "@workdeal/shared/lib/logger";
import { env } from "./env.js";
import { AppError, errorHandler } from "./lib/errors.js";
import { fail } from "./lib/api-response.js";
import { authV1Route } from "./routes/auth.route.js";
import { profilesRoute } from "./routes/profiles.route.js";
import { categoriesRoute } from "./routes/categories.route.js";
import { healthRoute } from "./routes/health.route.js";
import { reviewsRoute } from "./routes/reviews.route.js";
import { followsRoute } from "./routes/follows.route.js";
import { adminRoute } from "./routes/admin.route.js";
import { reportsRoute } from "./routes/reports.route.js";
import { verificationsRoute } from "./routes/verifications.route.js";
import { companyQualificationRoute } from "./routes/company-qualification.route.js";
import { profileLocationsRoute } from "./routes/profile-locations.route.js";
import { tagsRoute } from "./routes/tags.route.js";
import { emailRoute } from "./routes/email.route.js";
import { quotesRoute } from "./routes/quotes.route.js";
import { filesRoute } from "./routes/files.route.js";
import { placesRoute } from "./routes/places.route.js";
import { onboardingRoute } from "./routes/onboarding.route.js";
import { metricsRoute } from "./routes/metrics.route.js";
import { portfolioRoute } from "./routes/portfolio.route.js";
import { servicesRoute } from "./routes/services.route.js";

const app = new Hono();

app.use("*", requestId());
app.use("*", async (c, next) => {
  const start = Date.now();
  // Log de entrada em mutações — se um handler pendurar, vê-se aqui que chegou a iniciar
  if (c.req.method !== "GET") {
    logger.info(`${c.req.method} ${c.req.path} inicio`, { requestId: c.req.header("X-Request-Id"), route: c.req.path, method: c.req.method });
  }
  await next();
  const durationMs = Date.now() - start;
  const requestIdVal = c.req.header("X-Request-Id") ?? (c.get("requestId" as never) as string | undefined) ?? "-";
  const user = c.get("user" as never) as { id?: string } | undefined;
  logger.info(`${c.req.method} ${c.req.path}`, {
    requestId: requestIdVal,
    route: c.req.path,
    method: c.req.method,
    status: c.res.status,
    durationMs,
    userId: user?.id,
  });
});
app.use("*", cors({ origin: formatAllowedOrigins(env.ALLOWED_ORIGINS) }));

app.get("/", (c) => {
  const accept = c.req.header("accept") ?? "";
  if (accept.includes("application/json")) {
    return c.json({
      success: true,
      data: {
        name: "Workdeal API",
        version: "v1",
        status: "ok",
        docs: "https://workdeal.co.mz",
        endpoints: ["/health", "/health/db", "/api/v1/profiles", "/api/v1/categories", "/api/v1/reviews", "/api/v1/services"],
      },
    });
  }
  return c.html(`<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Workdeal API — v1</title>
<meta name="robots" content="noindex" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0B0E14;--panel:#141922;--panel2:#1A2332;--line:#1E2A3A;--muted:#8A94A6;--text:#E6EAF0;--amber:#F59E0B;--teal:#14B8A6;--red:#EF4444}
  *{box-sizing:border-box} html,body{margin:0;background:var(--bg);color:var(--text);font-family:'Space Grotesk',system-ui,sans-serif}
  a{color:inherit}
  .wrap{max-width:1060px;margin:0 auto;padding:24px 20px 48px}
  /* header */
  .top{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01));border-radius:16px;padding:12px 16px;backdrop-filter:blur(8px)}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:36px;height:36px;border-radius:10px;background:var(--amber);display:grid;place-items:center;color:#0B0E14;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:-.04em}
  .brand b{font-size:15px;letter-spacing:-.02em} .brand span{color:var(--muted);font-size:12px;display:block;margin-top:1px}
  .meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
  .pill{display:inline-flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:12px;padding:7px 10px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted)}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--teal);box-shadow:0 0 0 6px rgba(20,184,166,.15);animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 6px rgba(20,184,166,.15)}50%{box-shadow:0 0 0 9px rgba(20,184,166,.08)}}
  /* hero */
  .hero{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;margin-top:20px}
  @media(max-width:860px){.hero{grid-template-columns:1fr}}
  .hero-left{border:1px solid var(--line);background:radial-gradient(600px 300px at 20% 0%,rgba(245,158,11,.14),transparent 60%),linear-gradient(180deg,var(--panel),var(--bg));border-radius:18px;padding:28px;position:relative;overflow:hidden}
  .hero-left::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 48px,rgba(255,255,255,.015) 48px 49px);pointer-events:none}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);display:flex;align-items:center;gap:8px}
  .eyebrow i{width:18px;height:1px;background:var(--amber);display:inline-block}
  h1{font-size:44px;line-height:.95;letter-spacing:-.04em;margin:12px 0 10px;font-weight:700}
  h1 em{font-style:normal;color:var(--amber)} h1 span{color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.28)}
  .sub{color:var(--muted);font-size:15px;line-height:1.6;max-width:48ch}
  .cta{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
  .btn{appearance:none;border:1px solid transparent;border-radius:10px;padding:10px 14px;font-weight:600;font-size:13px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
  .btn-primary{background:var(--amber);color:#0B0E14} .btn-primary:hover{filter:brightness(1.05)}
  .btn-ghost{background:transparent;border-color:var(--line);color:var(--text)} .btn-ghost:hover{background:rgba(255,255,255,.05)}
  /* terminal */
  .term{border:1px solid var(--line);background:var(--panel);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;min-height:100%}
  .term-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.02)}
  .dots{display:flex;gap:6px} .dots i{width:10px;height:10px;border-radius:50%;display:block}
  .d1{background:#FF5F56} .d2{background:#FFBD2E} .d3{background:#27C93F}
  .term-head b{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
  .copy{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);border:1px solid var(--line);background:transparent;border-radius:8px;padding:6px 9px;cursor:pointer}
  .copy:active{transform:scale(.98)}
  .term-body{padding:16px 14px 14px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;flex:1}
  .line{white-space:nowrap;overflow:auto;scrollbar-width:none} .line::-webkit-scrollbar{display:none}
  .dim{color:var(--muted)} .kw{color:var(--amber)} .str{color:var(--teal)} .cm{color:#5B6B83}
  .resp{margin-top:12px;background:#0E121A;border:1px solid var(--line);border-radius:12px;padding:12px;overflow:auto}
  /* grid */
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
  @media(max-width:860px){.grid{grid-template-columns:1fr 1fr}} @media(max-width:560px){.grid{grid-template-columns:1fr}}
  .card{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:14px;position:relative;overflow:hidden}
  .card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--amber),transparent);opacity:.6}
  .card h3{margin:0 0 6px;font-size:13px;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}
  .badge{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;padding:3px 6px;border-radius:6px;border:1px solid var(--line);color:var(--muted);background:rgba(255,255,255,.03)}
  .badge.get{color:var(--teal);border-color:rgba(20,184,166,.3)} .badge.post{color:#F59E0B;border-color:rgba(245,158,11,.3)}
  .card p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
  .card code{font-family:'JetBrains Mono',monospace;font-size:11px;background:rgba(255,255,255,.06);border:1px solid var(--line);padding:2px 6px;border-radius:6px;color:var(--text)}
  .foot{margin-top:18px;border:1px dashed var(--line);border-radius:14px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:12px;font-family:'JetBrains Mono',monospace}
  .foot a{color:var(--text);text-decoration:none;border-bottom:1px dotted rgba(255,255,255,.3)}
  /* status */
  .status{margin-top:14px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border-radius:18px;padding:14px}
  .status-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
  .status-head h2{margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:10px}
  .status-live{display:inline-flex;align-items:center;gap:6px;color:var(--text);background:rgba(20,184,166,.12);border:1px solid rgba(20,184,166,.25);padding:4px 8px;border-radius:999px;font-size:10px}
  .status-live i{width:6px;height:6px;border-radius:50%;background:var(--teal);box-shadow:0 0 0 5px rgba(20,184,166,.18);animation:pulse 2s infinite}
  .status-actions{display:flex;align-items:center;gap:8px}
  .status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  @media(max-width:860px){.status-grid{grid-template-columns:1fr}}
  .s-card{border:1px solid var(--line);background:var(--panel);border-radius:12px;padding:12px;position:relative;overflow:hidden}
  .s-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
  .s-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .s-state{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted)}
  .s-state[data-state="ok"]{color:var(--teal);border-color:rgba(20,184,166,.35);background:rgba(20,184,166,.1)}
  .s-state[data-state="error"]{color:#FCA5A5;border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.1)}
  .s-state[data-state="loading"]{color:var(--muted)}
  .s-val{font-size:14px;font-weight:600;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .s-meta{margin-top:6px;color:var(--muted);font-size:11px;font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .s-card.ok{border-color:rgba(20,184,166,.25)} .s-card.error{border-color:rgba(239,68,68,.25)}
  @media(prefers-reduced-motion:reduce){.dot{animation:none}}
</style>
</head>
<body>
<div class="wrap">
  <nav class="top">
    <div class="brand">
      <div class="logo">W</div>
      <div><b>workdeal — API</b><span>Plataforma de serviços · Moçambique</span></div>
    </div>
    <div class="meta">
      <span class="pill" id="top-status"><span class="dot" id="top-dot"></span> <span id="top-status-text">a verificar…</span></span>
      <span class="pill">v1 · Hono · ${env.NODE_ENV}</span>
      <span class="pill" title="request-id">id: <span id="rid">—</span></span>
    </div>
  </nav>

  <div class="hero">
    <div class="hero-left">
      <div class="eyebrow"><i></i> api-only domain</div>
      <h1>Este domínio<br><em>só</em> <span>responde</span><br>a requisições.</h1>
      <p class="sub">Não há páginas aqui. Se estás a ver isto no browser, está tudo certo — a <b style="color:var(--text)">Workdeal API</b> está no ar. A app vive em <a href="https://workdeal.co.mz" style="color:var(--amber);text-underline-offset:3px">workdeal.co.mz</a>. Usa os endpoints abaixo.</p>
      <div class="cta">
        <a class="btn btn-primary" href="/health">↗ Ver /health</a>
        <a class="btn btn-ghost" href="https://workdeal.co.mz">Ir para a app →</a>
      </div>
    </div>

    <div class="term" role="region" aria-label="Exemplo de requisição">
      <div class="term-head"><span class="dots"><i class="d1"></i><i class="d2"></i><i class="d3"></i></span><b>curl · api.workdeal.co.mz</b><button class="copy" onclick="copyCurl()">copiar</button></div>
      <div class="term-body">
        <div class="line"><span class="dim">$</span> <span class="kw">curl</span> -s https://api.workdeal.co.mz<span class="str">/health</span> | <span class="kw">jq</span></div>
        <div class="resp"><div class="line cm">// 200 OK — application/json</div><div class="line">{ <span class="str">"success"</span>: <span class="kw">true</span>, <span class="str">"data"</span>: { <span class="str">"status"</span>: <span class="str">"ok"</span> } }</div></div>
        <div class="line" style="margin-top:12px"><span class="dim">$</span> <span class="kw">curl</span> -s https://api.workdeal.co.mz<span class="str">/api/v1/categories</span> -H <span class="str">"Accept: application/json"</span></div>
        <div class="line cm" style="margin-top:8px"># → paginado, requer CORS allowlist. Sem browser forms.</div>
      </div>
    </div>
  </div>

  <section class="status" aria-label="Estado do sistema">
    <div class="status-head">
      <h2><span class="status-live"><i></i> live</span> estado do sistema</h2>
      <div class="status-actions">
        <span id="status-time" class="pill" style="font-size:11px">a verificar…</span>
        <button class="copy" id="refresh-status" onclick="checkStatus()" title="Re-validar agora">↻ actualizar</button>
      </div>
    </div>
    <div class="status-grid">
      <div class="s-card" id="s-api">
        <div class="s-top"><span class="s-label">API</span><span class="s-state" data-state="loading">—</span></div>
        <div class="s-val" id="s-api-val">a sondar /health…</div>
        <div class="s-meta"><code>GET /health</code> <span id="s-api-ms">—</span></div>
      </div>
      <div class="s-card" id="s-db">
        <div class="s-top"><span class="s-label">Base de dados</span><span class="s-state" data-state="loading">—</span></div>
        <div class="s-val" id="s-db-val">a sondar /health/db…</div>
        <div class="s-meta"><code>Postgres + PostGIS</code> <span id="s-db-ms">—</span></div>
      </div>
      <div class="s-card" id="s-env">
        <div class="s-top"><span class="s-label">Ambiente</span><span class="pill" style="padding:4px 8px;font-size:10px">${env.NODE_ENV}</span></div>
        <div class="s-val" style="font-size:13px">v1 · <span style="color:var(--text)">${new Date().getFullYear()}</span> · Hono</div>
        <div class="s-meta">CORS: <code style="max-width:18ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom">${formatAllowedOrigins(env.ALLOWED_ORIGINS)[0] ?? "—"}</code></div>
      </div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
      <button class="copy" id="btn-test-db-full" onclick="testDbFull()" title="Testa conexão, leitura e escrita (rollback)">🧪 Testar DB (conexão + leitura + escrita)</button>
      <span id="test-db-full-result" style="font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted)"></span>
    </div>
    <div id="test-db-full-panel" style="display:none; margin-top:12px; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:var(--panel)">
      <div style="display:flex; border-bottom:1px solid var(--line)">
        <button id="tab-btn-ui" onclick="switchDbTab('ui')" style="flex:1; padding:10px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; background:var(--panel2); color:var(--text); border:none; border-right:1px solid var(--line); cursor:pointer">Visão</button>
        <button id="tab-btn-json" onclick="switchDbTab('json')" style="flex:1; padding:10px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; background:transparent; color:var(--muted); border:none; cursor:pointer">JSON</button>
      </div>
      <div id="tab-ui" style="padding:14px; background:var(--panel)"></div>
      <pre id="tab-json" style="display:none; margin:0; padding:12px; background:#0E121A; overflow:auto; font-family:'JetBrains Mono',monospace; font-size:11px; line-height:1.5; white-space:pre-wrap; word-break:break-all; max-height:420px"></pre>
    </div>
  </section>

  <div class="grid">
    <div class="card"><h3><span class="badge get">GET</span> /health</h3><p>Liveness probe. Sem auth.</p><p style="margin-top:8px"><code>/health/db</code> verifica Postgres + PostGIS</p></div>
    <div class="card"><h3><span class="badge get">GET</span> /api/v1/profiles</h3><p>Directório de perfis, filtros geo, paginação por cursor.</p><p style="margin-top:8px"><code>?near=-25.96,32.57&amp;radius=20</code></p></div>
    <div class="card"><h3><span class="badge get">GET</span> /api/v1/categories</h3><p>Taxonomia de categorias e serviços.</p><p style="margin-top:8px"><code>revalidate: 1h</code></p></div>
    <div class="card"><h3><span class="badge post">POST</span> /api/v1/quotes</h3><p>Criação de pedido de orçamento. <span class="badge">auth</span></p><p style="margin-top:8px"><code>zValidator · rateLimit</code></p></div>
    <div class="card"><h3><span class="badge get">ALL</span> /api/auth/*</h3><p>Better Auth — sessões, organizações, RBAC.</p><p style="margin-top:8px"><code>owner / admin / editor / member</code></p></div>
    <div class="card"><h3><span class="badge get">GET</span> /api/v1/services</h3><p>Serviços publicados por perfil.</p><p style="margin-top:8px"><code>portfolio · reviews · follows</code></p></div>
  </div>

  <div class="foot">
    <span>Es a dev? Envia <code>Accept: application/json</code> para receber JSON em <code>/</code>. · <span class="cm">request-id no header X-Request-Id</span></span>
    <span>Feito em Maputo · <a href="mailto:dev@workdeal.co.mz">dev@workdeal.co.mz</a></span>
  </div>
</div>
<script>
function copyCurl(){
  const t = "curl -s https://api.workdeal.co.mz/health | jq";
  navigator.clipboard.writeText(t).then(()=>{
    const b=document.querySelector('.term .copy');
    const prev=b.textContent; b.textContent='copiado!'; setTimeout(()=>b.textContent=prev,1400);
  });
}
document.getElementById('rid').textContent = Math.random().toString(36).slice(2,8);

async function checkStatus(){
  const timeEl=document.getElementById('status-time');
  const topText=document.getElementById('top-status-text');
  const topDot=document.getElementById('top-dot');
  const apiState=document.querySelector('#s-api .s-state');
  const apiVal=document.getElementById('s-api-val');
  const apiMs=document.getElementById('s-api-ms');
  const dbState=document.querySelector('#s-db .s-state');
  const dbVal=document.getElementById('s-db-val');
  const dbMs=document.getElementById('s-db-ms');
  const cardApi=document.getElementById('s-api');
  const cardDb=document.getElementById('s-db');
  const btn=document.getElementById('refresh-status');
  if(btn){btn.disabled=true; btn.textContent='a sondar…';}
  const now=new Date();
  if(timeEl) timeEl.textContent = now.toLocaleString('pt-MZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) + ' · auto a cada 30s';
  let apiOk=false, dbOk=false;
  // API
  try{
    const t0=performance.now();
    const r=await fetch('/health',{headers:{'Accept':'application/json'},cache:'no-store'});
    const ms=Math.round(performance.now()-t0);
    const j=await r.json().catch(()=>null);
    apiOk = r.ok && j && j.success;
    if(apiState){apiState.textContent= apiOk ? 'ok' : 'erro'; apiState.dataset.state= apiOk ? 'ok':'error';}
    if(apiVal) apiVal.textContent = apiOk ? ('API operacional · ' + (j.data?.status||'ok')) : ('falha · HTTP '+r.status);
    if(apiMs) apiMs.textContent='· '+ms+'ms';
    if(cardApi) cardApi.className='s-card '+(apiOk?'ok':'error');
  }catch(e){
    if(apiState){apiState.textContent='offline'; apiState.dataset.state='error';}
    if(apiVal) apiVal.textContent='sem resposta';
    if(cardApi) cardApi.className='s-card error';
  }
  // DB
  try{
    const t0=performance.now();
    const r=await fetch('/health/db',{headers:{'Accept':'application/json'},cache:'no-store'});
    const ms=Math.round(performance.now()-t0);
    const j=await r.json().catch(()=>null);
    dbOk = r.ok && j && (j.data?.dbOk!==false) && j.success!==false;
    const label = j?.data?.dbOk===true ? 'conectada' : j?.data?.status|| (r.ok?'ok':'erro');
    if(dbState){dbState.textContent= dbOk ? 'ok' : 'erro'; dbState.dataset.state= dbOk ? 'ok':'error';}
    if(dbVal) dbVal.textContent = dbOk ? ('Postgres operacional · '+label) : ('indisponível · HTTP '+r.status);
    if(dbMs) dbMs.textContent='· '+ms+'ms';
    if(cardDb) cardDb.className='s-card '+(dbOk?'ok':'error');
  }catch(e){
    if(dbState){dbState.textContent='offline'; dbState.dataset.state='error';}
    if(dbVal) dbVal.textContent='sem resposta — verifica DATABASE_URL';
    if(cardDb) cardDb.className='s-card error';
  }
  const allOk = apiOk && dbOk;
  const degraded = apiOk && !dbOk;
  if(topText) topText.textContent = allOk ? 'operational' : degraded ? 'degraded' : 'offline';
  if(topDot) topDot.style.background = allOk ? 'var(--teal)' : degraded ? 'var(--amber)' : 'var(--red)';
  if(btn){btn.disabled=false; btn.textContent='↻ actualizar';}
}
checkStatus();
setInterval(checkStatus, 30000);

let _dbTab='ui';
function switchDbTab(tab){
  _dbTab=tab;
  const uiBtn=document.getElementById('tab-btn-ui');
  const jsonBtn=document.getElementById('tab-btn-json');
  const ui=document.getElementById('tab-ui');
  const json=document.getElementById('tab-json');
  if(tab==='ui'){
    if(ui) ui.style.display='block';
    if(json) json.style.display='none';
    if(uiBtn){ uiBtn.style.background='var(--panel2)'; uiBtn.style.color='var(--text)'; }
    if(jsonBtn){ jsonBtn.style.background='transparent'; jsonBtn.style.color='var(--muted)'; }
  } else {
    if(ui) ui.style.display='none';
    if(json) json.style.display='block';
    if(jsonBtn){ jsonBtn.style.background='var(--panel2)'; jsonBtn.style.color='var(--text)'; }
    if(uiBtn){ uiBtn.style.background='transparent'; uiBtn.style.color='var(--muted)'; }
  }
}
function renderDbUi(data){
  if(!data) return '<p style="color:var(--muted); font-family:JetBrains Mono,monospace; font-size:11px">Sem dados</p>';
  const ok = data.success ?? data.data?.success;
  const d = data.data ?? data;
  const env = d.env ?? {};
  const tests = d.tests ?? {};
  const summary = d.summary ?? {};
  const esc = (s)=> String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const pill = (okB, label)=> \`<span style="display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; font-family:JetBrains Mono,monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; border:1px solid \${okB ? 'rgba(20,184,166,.35)' : 'rgba(239,68,68,.35)'}; background:\${okB ? 'rgba(20,184,166,.12)' : 'rgba(239,68,68,.12)'}; color:\${okB ? 'var(--teal)' : 'var(--red)'}">\${okB ? '✓' : '✗'} \${esc(label)}</span>\`;
  const row = (title, obj)=>{
    if(!obj) return '';
    const isOk = obj.ok;
    return \`<div style="border:1px solid var(--line); border-radius:10px; padding:10px; background:rgba(255,255,255,.02)">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap">
        <b style="font-size:12px; letter-spacing:-.02em">\${esc(title)}</b>
        \${pill(isOk, isOk ? 'OK' : 'FALHOU')} <span style="font-family:JetBrains Mono,monospace; font-size:11px; color:var(--muted)">\${obj.ms ? obj.ms+'ms' : ''}</span>
      </div>
      \${obj.details ? \`<p style="margin:6px 0 0; color:var(--muted); font-size:11px; line-height:1.5">\${esc(obj.details)}</p>\` : ''}
      \${obj.error ? \`<p style="margin:6px 0 0; color:#FCA5A5; font-family:JetBrains Mono,monospace; font-size:11px; word-break:break-all">\${esc(obj.error)}</p>\` : ''}
      \${obj.code ? \`<p style="margin:4px 0 0; color:var(--muted); font-family:JetBrains Mono,monospace; font-size:10px">code: \${esc(obj.code)}</p>\` : ''}
      \${obj.cause ? \`<p style="margin:4px 0 0; color:#FCA5A5; font-family:JetBrains Mono,monospace; font-size:10px; word-break:break-all">cause: \${esc(obj.cause)}</p>\` : ''}
      \${obj.detail ? \`<p style="margin:4px 0 0; color:var(--muted); font-family:JetBrains Mono,monospace; font-size:10px; word-break:break-all">detail: \${esc(obj.detail)}</p>\` : ''}
      \${obj.stack ? \`<p style="margin:4px 0 0; color:var(--muted); font-family:JetBrains Mono,monospace; font-size:9px; opacity:.7; word-break:break-all">stack: \${esc(obj.stack)}</p>\` : ''}
      \${obj.hint ? \`<p style="margin:6px 0 0; color:var(--amber); font-size:11px; line-height:1.4">💡 \${esc(obj.hint)}</p>\` : ''}
    </div>\`;
  };
  let html = '';
  html += \`<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px">
    \${pill(!!d.summary?.allOk || !!data.success, d.summary?.allOk || data.success ? 'TUDO OK' : 'COM FALHAS')}
    <span style="font-family:JetBrains Mono,monospace; font-size:11px; color:var(--muted)">\${d.totalMs ? d.totalMs+'ms total' : ''} · \${esc(d.startedAt ?? '')}</span>
  </div>\`;
  if(summary.cause && !summary.allOk){
    html += \`<div style="margin-bottom:10px; padding:8px 10px; border-radius:8px; background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.25); color:var(--amber); font-size:11px; line-height:1.4">⚠️ \${esc(summary.cause)}</div>\`;
  }
  // Env string
  const dbUrl = env.DATABASE_URL ?? {};
  html += \`<div style="margin-bottom:10px; padding:10px; border-radius:10px; background:rgba(255,255,255,.03); border:1px solid var(--line)">
    <p style="margin:0 0 6px; font-family:JetBrains Mono,monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted)">String de conexão</p>
    <p style="margin:0; font-family:JetBrains Mono,monospace; font-size:11px; word-break:break-all">
      <span style="color:var(--muted)">DB:</span> <b>\${esc(dbUrl.database ?? '∅')}</b> <span style="color:var(--muted)">· host</span> \${esc(dbUrl.host ?? '∅')}:\${esc(dbUrl.port ?? '')} \${dbUrl.isPgbouncer ? '<span style="padding:2px 6px; border-radius:6px; background:rgba(20,184,166,.15); border:1px solid rgba(20,184,166,.25); font-size:10px">pgbouncer</span>' : ''}
    </p>
    <p style="margin:4px 0 0; font-family:JetBrains Mono,monospace; font-size:11px; color:var(--muted); word-break:break-all">\${esc(dbUrl.masked ?? '')} · user \${esc(dbUrl.user ?? '')} · \${esc(dbUrl.passwordLength ?? '')}</p>
    \${dbUrl.error ? \`<p style="margin:6px 0 0; color:var(--red); font-family:JetBrains Mono,monospace; font-size:11px">\${esc(dbUrl.error)}</p>\` : ''}
    <p style="margin:6px 0 0; font-family:JetBrains Mono,monospace; font-size:10px; color:var(--muted)">BETTER_AUTH_URL: \${esc(env.BETTER_AUTH_URL?.value ?? '∅')} · ALLOWED_ORIGINS: \${esc(env.ALLOWED_ORIGINS?.value ?? env.ALLOWED_ORIGINS?.masked ?? '∅')}</p>
  </div>\`;
  html += \`<div style="display:grid; gap:8px">\`;
  html += row('Conexão', tests.connection);
  html += row('Leitura', tests.read);
  html += row('Escrita', tests.write);
  html += \`</div>\`;
  return html;
}
async function testDbFull(){
  const btn=document.getElementById('btn-test-db-full');
  const resEl=document.getElementById('test-db-full-result');
  const panel=document.getElementById('test-db-full-panel');
  const uiEl=document.getElementById('tab-ui');
  const jsonEl=document.getElementById('tab-json');
  if(btn) { btn.disabled=true; btn.textContent='a testar…'; }
  if(resEl) resEl.textContent='a sondar /health/db/full…';
  if(panel) panel.style.display='none';
  const t0=performance.now();
  try{
    const r=await fetch('/health/db/full', {headers:{'Accept':'application/json'}, cache:'no-store'});
    const ms=Math.round(performance.now()-t0);
    const j=await r.json().catch(()=>null);
    const ok = r.ok && j && j.success;
    if(resEl) {
      resEl.textContent = ok ? '✓ DB OK ('+ms+'ms) — conexão, leitura e escrita' : '✗ DB falhou ('+ms+'ms) — HTTP '+r.status;
      resEl.style.color = ok ? 'var(--teal)' : 'var(--red)';
    }
    if(panel) panel.style.display='block';
    if(jsonEl) jsonEl.textContent = j ? JSON.stringify(j, null, 2) : 'Sem JSON — HTTP '+r.status;
    if(uiEl) uiEl.innerHTML = j ? renderDbUi(j) : '<p style="color:var(--red)">Sem JSON</p>';
    switchDbTab('ui');
  }catch(e){
    const ms=Math.round(performance.now()-t0);
    if(resEl) { resEl.textContent='✗ erro de rede ('+ms+'ms) — '+ (e instanceof Error ? e.message : String(e)); resEl.style.color='var(--red)'; }
    const panel2=document.getElementById('test-db-full-panel');
    const ui2=document.getElementById('tab-ui');
    const json2=document.getElementById('tab-json');
    if(panel2) panel2.style.display='block';
    if(json2) json2.textContent = String(e);
    if(ui2) ui2.innerHTML = '<p style="color:var(--red); font-family:JetBrains Mono,monospace; font-size:11px">'+String(e).replace(/</g,'&lt;')+'</p>';
    if(json2) json2.style.display='none';
    if(ui2) ui2.style.display='block';
    switchDbTab('ui');
  }finally{
    if(btn) { btn.disabled=false; btn.textContent='🧪 Testar DB (conexão + leitura + escrita)'; }
  }
}
</script>
</body>
</html>`);
});

app.get("/health", async (c) => c.json({ success: true, data: { status: "ok" } }));
app.route("/health/db", healthRoute);
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/v1/auth", authV1Route);
app.route("/api/v1/profiles", profilesRoute);
app.route("/api/v1/categories", categoriesRoute);
app.route("/api/v1/reviews", reviewsRoute);
app.route("/api/v1/follows", followsRoute);
app.route("/api/v1/admin", adminRoute);
app.route("/api/v1/reports", reportsRoute);
app.route("/api/v1/verifications", verificationsRoute);
app.route("/api/v1/company-qualification", companyQualificationRoute);
app.route("/api/v1/profile-locations", profileLocationsRoute);
app.route("/api/v1/tags", tagsRoute);
app.route("/api/v1/email", emailRoute);
app.route("/api/v1/quotes", quotesRoute);
app.route("/api/v1/files", filesRoute);
app.route("/api/v1/places", placesRoute);
app.route("/api/v1/onboarding", onboardingRoute);
app.route("/api/v1/metrics", metricsRoute);
app.route("/api/v1/portfolio", portfolioRoute);
app.route("/api/v1/services", servicesRoute);

app.notFound(() => {
  throw new AppError(404, "NOT_FOUND", "Rota não encontrada");
});

app.onError(errorHandler);

// Lê o body em qualquer um dos três formatos que a ponte da Vercel pode entregar:
//  1. Web Request (.arrayBuffer)
//  2. Stream com asyncIterator (r.body ou o próprio req)
//  3. IncomingMessage Node-style (eventos "data"/"end"/"error" no req)
function readBodyWithTimeout(r: {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  body?: unknown;
  headers?: Headers;
  [k: string]: unknown;
}): Promise<ArrayBuffer | undefined> {
  type Stream = AsyncIterable<unknown> & { on?: Function; off?: Function; readableEnded?: boolean };
  const bodyAsStream = r.body as Stream | undefined;
  const selfAsStream = r as unknown as Stream;
  const pick = (s: Stream | undefined): Stream | undefined =>
    s && (typeof s[Symbol.asyncIterator] === "function" || typeof s.on === "function") ? s : undefined;
  const stream = pick(bodyAsStream) ?? pick(selfAsStream);

  if (typeof r.arrayBuffer === "function") return r.arrayBuffer();
  if ((r.headers?.get("content-length") ?? "") === "0") return Promise.resolve(undefined);
  if (!stream || stream.readableEnded) return Promise.resolve(undefined);

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const concat = (): ArrayBuffer => {
      const buf = Buffer.concat(chunks);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new AppError(408, "BODY_TIMEOUT", "Tempo esgotado a ler o corpo do pedido"));
    }, 10_000);
    const onData = (c: unknown) => {
      chunks.push(Buffer.from(c as Uint8Array));
    };
    const onEnd = () => {
      cleanup();
      resolve(concat());
    };
    const onError = (e: unknown) => {
      cleanup();
      reject(e instanceof Error ? e : new Error(String(e)));
    };
    const cleanup = () => {
      clearTimeout(timer);
      stream.off?.("data", onData);
      stream.off?.("end", onEnd);
      stream.off?.("error", onError);
    };

    if (typeof stream[Symbol.asyncIterator] === "function") {
      void (async () => {
        try {
          for await (const chunk of stream) chunks.push(Buffer.from(chunk as Uint8Array));
          cleanup();
          resolve(concat());
        } catch (e) {
          cleanup();
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      })();
      return;
    }
    if (typeof stream.on !== "function") {
      cleanup();
      resolve(new ArrayBuffer(0));
      return;
    }
    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", onError);
  });
}

// Exports Vercel Node.js — converte o pedido da Vercel num Request NATIVO.
// Nenhum dos dois atalhos serve:
//  - getRequestListener (@hono/node-server): os wrappers lazy de Request/Response
//    que instala nos globals penduram POST /api/auth/* no runtime Vercel (504 sem logs)
//  - exportar app.fetch directamente: a ponte da Vercel entrega um objecto Node-style
//    ("this.raw.headers.get is not a function")
// Por isso construímos o Request nós próprios, com buffer de body protegido por timeout.
async function toNativeRequest(req: unknown): Promise<Request> {
  const r = req as {
    method?: string;
    url?: string;
    headers?: unknown;
    [k: string]: unknown;
  };
  const method = (r.method ?? "GET").toUpperCase();
  let headers: Headers;
  try {
    headers = new Headers(r.headers as HeadersInit | undefined);
  } catch {
    headers = new Headers();
  }
  let url = r.url ?? "/";
  if (!url.startsWith("http")) url = `https://${headers.get("host") ?? "localhost"}${url}`;

  const hasBody = method !== "GET" && method !== "HEAD";
  let body: BodyInit | undefined;
  if (hasBody) body = await readBodyWithTimeout({ ...r, headers });
  return new Request(url, { method, headers, ...(hasBody ? { body } : {}) });
}

const vercelHandler = async (req: unknown, res?: unknown) => {
  try {
    const response = await app.fetch(await toNativeRequest(req));
    const rs = res as { writeHead?: Function; end?: Function } | undefined;
    if (rs && typeof rs.writeHead === "function") {
      // modo Node-style: escreve na resposta da Vercel
      const isHead = ((req as { method?: string }).method ?? "").toUpperCase() === "HEAD";
      const buf = isHead ? undefined : new Uint8Array(await response.arrayBuffer());
      const h: Record<string, string | string[]> = {};
      response.headers.forEach((v, k) => {
        h[k] = v;
      });
      const setCookies = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
      if (setCookies.length > 0) h["set-cookie"] = setCookies;
      rs.writeHead!(response.status, h);
      rs.end!(buf);
      return;
    }
    return response;
  } catch (e) {
    logger.error("vercelHandler falhou", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
    return new Response(JSON.stringify(fail("INTERNAL_ERROR", "Erro interno do servidor")), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const GET = vercelHandler;
export const POST = vercelHandler;
export const PUT = vercelHandler;
export const PATCH = vercelHandler;
export const DELETE = vercelHandler;
export const OPTIONS = vercelHandler;
export const HEAD = vercelHandler;
export default vercelHandler;

// Compat Bun dev — mantém `bun run src/index.ts` a funcionar
// @ts-ignore
if (typeof Bun !== "undefined") {
  const _port = Number(env.PORT ?? 4000);
  // @ts-ignore
  Bun.serve({ fetch: app.fetch as never, port: _port });
  console.log(`[api] listening on http://localhost:${_port} — env=${env.NODE_ENV} db=${(() => { try { return new URL(env.DATABASE_URL).host; } catch { return "invalid-url"; } })()}`);
}
