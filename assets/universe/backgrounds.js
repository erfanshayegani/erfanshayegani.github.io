/* Background themes shared by radial.html and tree.html.
   Adds a 🎨 picker and a 🌓 light/dark toggle to the header.
   Keys: B cycles backgrounds, D toggles light/dark. Draws into <canvas id="stars">. */
(function(){
  const BGS = [
    { id:"paper", name:"Paper",           emoji:"📄",
      swatch:{ light:"radial-gradient(#c9bca6 1px,#f6f1e7 1.5px) 0 0/6px 6px", dark:"radial-gradient(#5a5346 1px,#1c1b18 1.5px) 0 0/6px 6px" } },
    { id:"stars", name:"Starfield",       emoji:"🌌", lightName:"Daylight",
      swatch:{ light:"radial-gradient(circle at 50% 40%,#ffffff,#e9e3ff 70%)", dark:"radial-gradient(circle at 50% 40%,#3a2373,#0a0912 70%)" } },
  ];
  const DEFAULT_BG = "paper", DEFAULT_MODE = "light";

  // Colour tokens per background + mode (stars uses the pages' own light/dark tokens).
  const tokens = {
    "paper-light": "--bg:#f6f1e7;--bg-glow:#fffaf0;--fg:#2a2420;--muted:#6d645a;--card:rgba(255,253,248,.95);--card-solid:#fffdf8;--line:rgba(60,40,20,.16);--accent:#d6336c;--accent2:#6c4ccf;--shadow:0 18px 50px rgba(60,40,20,.16);",
    "paper-dark":  "--bg:#1c1b18;--bg-glow:transparent;--fg:#efe8dc;--muted:#b3a996;--card:rgba(38,36,32,.94);--card-solid:#26241f;--line:rgba(255,240,220,.14);--accent:#ff6b8b;--accent2:#b39cff;--shadow:0 18px 50px rgba(0,0,0,.5);",
  };

  const style = document.createElement("style");
  style.textContent =
    Object.entries(tokens).map(([k, t]) => `html:root[data-bg="${k}"]{${t}}`).join("\n") + `
    #bgMenu{position:fixed;top:66px;right:22px;z-index:9;display:grid;gap:6px;padding:10px;min-width:220px;
      background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);
      backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;transform:translateY(-6px) scale(.98);
      pointer-events:none;transition:opacity .18s,transform .18s}
    #bgMenu.open{opacity:1;transform:none;pointer-events:auto}
    #bgMenu button{display:flex;align-items:center;gap:9px;text-align:left;padding:8px 10px;border-radius:10px}
    #bgMenu button.on{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
    #bgMenu .sw{width:22px;height:22px;border-radius:50%;flex:none;border:1px solid var(--line)}
    #bgMenu .tip{font-size:11.5px;color:var(--muted);text-align:center;padding-top:4px}
    #bgToast{position:fixed;left:50%;top:70px;transform:translate(-50%,-8px);z-index:9;padding:7px 14px;border-radius:99px;
      background:var(--card);border:1px solid var(--line);box-shadow:var(--shadow);font:600 13px "Space Grotesk",sans-serif;
      opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}
    #bgToast.on{opacity:1;transform:translate(-50%,0)}`;
  document.head.appendChild(style);

  /* ---------- canvas ---------- */
  const cv = document.getElementById("stars"), ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, raf = 0, active = null, cur = DEFAULT_BG, mode = DEFAULT_MODE;
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rnd = (a, b) => a + Math.random()*(b - a);
  function size(){
    const d = devicePixelRatio || 1;
    W = innerWidth; H = innerHeight;
    cv.width = W*d; cv.height = H*d; cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  /* ---------- renderers ---------- */
  const RENDER = {
    paper: {
      still: true,
      init(){}, frame(){
        const dark = mode === "dark";
        ctx.fillStyle = dark ? "#1c1b18" : "#f6f1e7"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = dark ? "rgba(255,235,200,.10)" : "rgba(90,70,40,.16)";
        for (let x = 11; x < W; x += 22) for (let y = 11; y < H; y += 22){ ctx.beginPath(); ctx.arc(x, y, 1, 0, 6.283); ctx.fill(); }
      }
    },

    stars: {
      init(){ this.S = Array.from({ length: Math.round(W*H/9000) }, () => ({ x:rnd(0,W), y:rnd(0,H), r:rnd(.3,1.6), p:rnd(0,6.28), s:rnd(.5,2) })); this.c = cssVar("--star") || "#fff"; },
      frame(t){
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = this.c;
        for (const s of this.S){
          ctx.globalAlpha = reduce ? .6 : .35 + .65*Math.abs(Math.sin(s.p + t/1000*s.s*.6));
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
  };

  /* ---------- engine ---------- */
  function loop(t){ if (!active) return; active.frame(t); raf = requestAnimationFrame(loop); }
  let gen = 0;
  async function start(){
    const my = ++gen, r = RENDER[cur];
    cancelAnimationFrame(raf); active = null; size(); ctx.globalAlpha = 1; ctx.setLineDash([]);
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = cssVar("--bg") || "#f6f1e7"; ctx.fillRect(0, 0, W, H);
    if (r.load){
      try { await r.load(); }
      catch(e){ if (my !== gen) return; showToast("Couldn’t load map data (offline?)"); apply("paper", mode); return; }
    }
    if (my !== gen) return;
    r.init(); r.frame(performance.now()); active = r;
    if (!r.still && !reduce) raf = requestAnimationFrame(loop);
  }
  addEventListener("resize", () => start());

  /* ---------- UI ---------- */
  const tools = document.querySelector(".tools");
  const anchor = [...tools.children].find(b => /view/i.test(b.textContent));
  const btn = document.createElement("button");
  btn.id = "bgBtn"; btn.title = "Background (B)"; btn.textContent = "🎨 Background";
  const modeBtn = document.createElement("button");
  modeBtn.id = "modeBtn"; modeBtn.title = "Light / dark (D)";
  tools.insertBefore(btn, anchor || null);
  tools.insertBefore(modeBtn, anchor || null);

  const menu = document.createElement("div"); menu.id = "bgMenu"; document.body.appendChild(menu);
  const toast = document.createElement("div"); toast.id = "bgToast"; document.body.appendChild(toast);
  let toastT;
  function showToast(msg){ toast.textContent = msg; toast.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("on"), 1400); }
  const label = b => mode === "light" && b.lightName ? b.lightName : b.name;
  function renderMenu(){
    menu.innerHTML = BGS.map(b => `<button data-id="${b.id}" class="${b.id === cur ? "on" : ""}"><span class="sw" style="background:${b.swatch[mode]}"></span>${b.emoji} ${label(b)}</button>`).join("")
      + `<div class="tip"><b>B</b> background${siteRoot ? "" : " · <b>D</b> light/dark"}</div>`;
  }

  btn.addEventListener("click", e => { e.stopPropagation(); menu.classList.toggle("open"); });
  modeBtn.addEventListener("click", e => { e.stopPropagation(); apply(cur, mode === "dark" ? "light" : "dark", true); });
  menu.addEventListener("click", e => { e.stopPropagation(); const b = e.target.closest("button[data-id]"); if (b) apply(b.dataset.id, mode, true); });
  document.addEventListener("click", () => menu.classList.remove("open"));
  document.addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "b"){ const i = BGS.findIndex(b => b.id === cur); apply(BGS[(i + 1) % BGS.length].id, mode, true); }
    if (k === "d" && !siteRoot) apply(cur, mode === "dark" ? "light" : "dark", true);
  });

  function apply(id, m, announce){
    const bg = BGS.find(b => b.id === id) || BGS[0];
    cur = bg.id; mode = m === "dark" ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.bg = `${cur}-${mode}`;
    modeBtn.textContent = mode === "dark" ? "☀️ Light" : "🌙 Dark";
    try { localStorage.setItem("ru-bg-v2", cur); if (!siteRoot) localStorage.setItem("ru-mode-v2", mode); } catch(e){}
    renderMenu();
    cancelAnimationFrame(raf); active = null;
    requestAnimationFrame(start);   // let the new CSS tokens apply before reading them
    if (announce) showToast(`${bg.emoji} ${label(bg)} · ${mode}`);
  }

  // Embedded in the website (iframe on /universe/): follow the site's own light/dark toggle.
  let siteRoot = null;
  try { if (window.top !== window.self) siteRoot = window.parent.document.documentElement; } catch(e){}
  const siteMode = () => siteRoot.getAttribute("data-theme") === "dark" ? "dark" : "light";
  if (siteRoot){
    modeBtn.style.display = "none";
    new MutationObserver(() => { if (siteMode() !== mode) apply(cur, siteMode(), false); })
      .observe(siteRoot, { attributes:true, attributeFilter:["data-theme"] });
  }

  let savedBg = null, savedMode = null;
  try { savedBg = localStorage.getItem("ru-bg-v2"); savedMode = localStorage.getItem("ru-mode-v2"); } catch(e){}
  if (!BGS.some(b => b.id === savedBg)) { savedBg = DEFAULT_BG; savedMode = DEFAULT_MODE; }
  apply(savedBg, siteRoot ? siteMode() : (savedMode || DEFAULT_MODE), false);
})();
