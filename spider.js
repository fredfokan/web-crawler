// Web crawler /[•]\ — a wireframe spider that walks on the page's links
// and tears pieces off. Run the bookmarklet again (or press Esc) to stop it.
(() => {
  if (window.__webCrawler) { window.__webCrawler.stop(); return; }

  const COLORS = ['#ff2e88', '#39ff88', '#3aa0ff', '#ffd400', '#ffffff'];
  const pick = a => a[(Math.random() * a.length) | 0];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------- layers ----------
  const root = document.documentElement;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646';
  const fx = document.createElement('div');
  fx.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483647';
  const css = document.createElement('style');
  css.textContent = `
.__wc-grab{outline:1.5px solid var(--wc,#3aa0ff)!important;outline-offset:2px!important}
.__wc-torn{background:var(--wc,#ff2e88)!important;color:transparent!important;text-decoration:none!important}
.__wc-torn *{color:transparent!important}
.__wc-frag{position:fixed;white-space:nowrap;line-height:1.1;padding:.08em .25em;transform-origin:0 50%;
 animation:__wc-fly var(--d,3.5s) cubic-bezier(.2,.7,.3,1) forwards,__wc-glitch .9s steps(2) infinite}
.__wc-frag.mono{font-family:ui-monospace,Menlo,Consolas,monospace!important;letter-spacing:.04em}
@keyframes __wc-fly{
 0%{transform:translate(0,0) scale(1) rotate(0);opacity:1}
 12%{transform:translate(var(--jx),var(--jy)) scale(var(--s)) rotate(var(--r));opacity:1}
 75%{opacity:1}
 100%{transform:translate(var(--tx),var(--ty)) scale(var(--s)) rotate(var(--r2));opacity:0}}
@keyframes __wc-glitch{
 0%{clip-path:inset(0 0 0 0)}
 20%{clip-path:inset(0 0 55% 0);margin-left:3px}
 40%{clip-path:inset(40% 0 0 0);margin-left:-2px}
 60%{clip-path:inset(0 0 0 0);margin-left:0}
 100%{clip-path:inset(0 0 0 0)}}`;
  root.append(css, cv, fx);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
  };
  resize();

  // ---------- holds (grab points on links, in page coordinates) ----------
  let holds = [];
  const scan = () => {
    const sx = scrollX, sy = scrollY, out = [];
    for (const el of document.querySelectorAll('a[href], cite, code, button')) {
      if (el.closest('.__wc-frag')) continue;
      for (const r of el.getClientRects()) {
        if (r.width < 4 || r.height < 4 || r.bottom < -H || r.top > 2 * H) continue;
        const n = Math.max(1, Math.round(r.width / 70));
        for (let i = 0; i < n; i++) {
          out.push({ x: r.left + sx + r.width * (i + .5) / n, y: r.top + sy + r.height / 2, el });
        }
      }
    }
    holds = out;
  };
  scan();

  // ---------- spider ----------
  const S = Math.max(.7, Math.min(1.3, Math.min(innerWidth, innerHeight) / 700)); // scale
  const THIGH = 46 * S, SHIN = 58 * S, REACH = THIGH + SHIN;
  const body = { x: W * .5, y: H * .45, vx: 0, vy: 0, a: -Math.PI / 2 };
  let goal = { x: body.x, y: body.y }, pause = 0;

  // 8 legs: rest angle (relative to heading) and rest length
  const legs = [];
  const angs = [0.45, 1.05, 1.75, 2.45];
  [1, -1].forEach(side => angs.forEach((a, i) => legs.push({
    side, rest: side * a, len: REACH * (i === 0 || i === 3 ? .82 : .7),
    group: (i + (side > 0 ? 0 : 1)) % 2,
    foot: null, from: null, to: null, t: 1, hold: null, col: pick(COLORS)
  })));

  const toView = p => ({ x: p.x - scrollX, y: p.y - scrollY });
  const toPage = p => ({ x: p.x + scrollX, y: p.y + scrollY });
  const hip = leg => {
    const a = body.a + leg.rest * .35;
    return { x: body.x + Math.cos(a) * 9 * S, y: body.y + Math.sin(a) * 9 * S };
  };
  const ideal = leg => {
    const a = body.a + leg.rest;
    return toPage({ x: body.x + Math.cos(a) * leg.len, y: body.y + Math.sin(a) * leg.len });
  };
  legs.forEach(l => { l.foot = ideal(l); });

  const grabbed = new Map(); // element -> highlight end time
  const grab = (el, col) => {
    if (!el || !el.isConnected) return;
    el.style.setProperty('--wc', col);
    el.classList.add('__wc-grab');
    grabbed.set(el, performance.now() + rnd(1500, 4000));
  };

  const nearestHold = (p, r) => {
    let best = null, bd = r;
    for (const h of holds) {
      const d = Math.abs(h.x - p.x) + Math.abs(h.y - p.y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  };

  const chooseGoal = () => {
    const vis = holds.filter(h => {
      const v = toView(h);
      return v.x > 40 && v.x < W - 40 && v.y > 60 && v.y < H - 60;
    });
    const g = vis.length ? toView(pick(vis)) : { x: rnd(60, W - 60), y: rnd(80, H - 80) };
    goal = { x: g.x, y: g.y };
  };
  chooseGoal();

  // ---------- torn fragments ----------
  const frags = new Set();
  const tear = el => {
    if (!el || !el.isConnected || frags.size > 7 || el.classList.contains('__wc-torn')) return;
    const r = el.getBoundingClientRect();
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!txt || r.width < 6 || r.bottom < 0 || r.top > H) return;
    const col = pick(COLORS), cs = getComputedStyle(el);
    const f = document.createElement('div');
    f.className = '__wc-frag' + (Math.random() < .5 ? ' mono' : '');
    f.textContent = txt;
    const inverted = Math.random() < .5;
    f.style.cssText += `left:${r.left}px;top:${r.top}px;font-size:${cs.fontSize};font-family:${cs.fontFamily};` +
      (inverted ? `background:${col};color:#000;` : `color:${col};border:1px solid ${col};background:rgba(0,0,0,.55);`);
    const s = rnd(1.6, 3.2), dir = r.left > W / 2 ? -1 : 1;
    const props = {
      '--s': s, '--jx': rnd(-30, 30) + 'px', '--jy': rnd(-30, 10) + 'px',
      '--r': (Math.random() < .3 ? rnd(-70, 70) : rnd(-6, 6)) + 'deg', '--r2': rnd(-20, 20) + 'deg',
      '--tx': dir * rnd(20, 160) + 'px', '--ty': rnd(80, 320) + 'px', '--d': rnd(2.8, 4.5) + 's'
    };
    for (const k in props) f.style.setProperty(k, props[k]);
    fx.appendChild(f); frags.add(f);
    el.style.setProperty('--wc', col);
    el.classList.add('__wc-torn');
    f.addEventListener('animationend', e => {
      if (e.animationName !== '__wc-fly') return;
      f.remove(); frags.delete(f);
      setTimeout(() => el.classList.remove('__wc-torn'), 1200);
    });
  };

  // temporary silk threads between the body and a distant element
  const threads = [];

  // ---------- two-segment IK ----------
  const knee = (h, f, side) => {
    let dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy) || 1;
    const dd = Math.min(d, REACH - .01);
    const base = Math.atan2(dy, dx);
    const c = (THIGH * THIGH + dd * dd - SHIN * SHIN) / (2 * THIGH * dd);
    const a = base - side * Math.acos(Math.max(-1, Math.min(1, c)));
    return { x: h.x + Math.cos(a) * THIGH, y: h.y + Math.sin(a) * THIGH };
  };

  // ---------- loop ----------
  let last = performance.now(), nextScan = 0, nextTear = last + 1500, nextThread = last + 800, raf;
  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (now > nextScan) { scan(); nextScan = now + 900; }

    // move the body toward the goal
    if (pause > 0) pause -= dt;
    else {
      const dx = goal.x - body.x, dy = goal.y - body.y, d = Math.hypot(dx, dy);
      if (d < 12) { pause = rnd(.2, 1.2); chooseGoal(); }
      const sp = 110 * S * Math.min(1, d / 80);
      body.vx += ((dx / (d || 1)) * sp - body.vx) * Math.min(1, dt * 3);
      body.vy += ((dy / (d || 1)) * sp - body.vy) * Math.min(1, dt * 3);
    }
    if (pause > 0) { body.vx *= .9; body.vy *= .9; }
    body.x += body.vx * dt; body.y += body.vy * dt;
    const spd = Math.hypot(body.vx, body.vy);
    if (spd > 5) {
      let da = Math.atan2(body.vy, body.vx) - body.a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      body.a += da * Math.min(1, dt * 4);
    }

    // leg steps (alternating gait by groups)
    const stepping = [0, 0];
    legs.forEach(l => { if (l.t < 1) stepping[l.group]++; });
    const lead = { x: body.vx * .25, y: body.vy * .25 };
    for (const l of legs) {
      if (l.t < 1) {
        l.t = Math.min(1, l.t + dt / .16);
        const e = l.t * l.t * (3 - 2 * l.t);
        l.foot = { x: l.from.x + (l.to.x - l.from.x) * e, y: l.from.y + (l.to.y - l.from.y) * e };
        l.lift = Math.sin(l.t * Math.PI);
        if (l.t === 1) { l.lift = 0; if (l.hold) grab(l.hold.el, l.col); }
        continue;
      }
      const id = ideal(l), h = toPage(hip(l));
      const tooFar = dist(l.foot, id) > REACH * .45 || dist(l.foot, h) > REACH * .98;
      if (tooFar && stepping[l.group] < 4 && stepping[1 - l.group] === 0) {
        const tgt = { x: id.x + lead.x, y: id.y + lead.y };
        const hd = nearestHold(tgt, REACH * .55);
        l.hold = hd;
        l.from = l.foot; l.to = hd ? { x: hd.x, y: hd.y } : tgt; l.t = 0;
        stepping[l.group]++;
      }
    }

    // effects
    if (now > nextTear) {
      const els = [...grabbed.keys()];
      if (els.length) tear(pick(els));
      nextTear = now + rnd(900, 2600);
    }
    if (now > nextThread) {
      const vis = holds.filter(h => { const v = toView(h); return v.y > 0 && v.y < H; });
      if (vis.length) {
        const h = pick(vis);
        threads.push({ h, col: pick(COLORS), until: now + rnd(600, 1600) });
        grab(h.el, threads[threads.length - 1].col);
      }
      nextThread = now + rnd(700, 2000);
    }
    for (const [el, t] of grabbed) if (now > t) { el.classList.remove('__wc-grab'); grabbed.delete(el); }

    // ---------- drawing ----------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';

    for (let i = threads.length - 1; i >= 0; i--) {
      const th = threads[i];
      if (now > th.until) { threads.splice(i, 1); continue; }
      const v = toView(th.h);
      ctx.strokeStyle = th.col; ctx.globalAlpha = .8; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(body.x, body.y); ctx.lineTo(v.x, v.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const joints = [];
    for (const l of legs) {
      const h = hip(l), f = toView(l.foot);
      // while stepping, the foot "lifts": pull it slightly toward the body
      const lf = l.lift || 0;
      const fv = { x: f.x + (h.x - f.x) * lf * .18, y: f.y + (h.y - f.y) * lf * .18 - lf * 10 * S };
      const k = knee(h, fv, l.side);
      ctx.strokeStyle = l.t < 1 ? l.col : 'rgba(150,170,255,.95)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(k.x, k.y); ctx.lineTo(fv.x, fv.y); ctx.stroke();
      joints.push([k, '#ff2e88', 2.6], [fv, l.hold ? '#39ff88' : '#ff2e88', 2.2]);
    }

    // body /[•]\
    ctx.save();
    ctx.translate(body.x, body.y); ctx.rotate(body.a + Math.PI / 2);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(10,10,30,.75)';
    ctx.beginPath(); ctx.rect(-7 * S, -9 * S, 14 * S, 18 * S); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3aa0ff';
    ctx.beginPath(); ctx.rect(-4 * S, 9 * S, 8 * S, 14 * S); ctx.stroke(); // abdomen
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath(); ctx.arc(0, -2 * S, 3 * S, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd400';
    ctx.beginPath(); ctx.moveTo(-3 * S, -9 * S); ctx.lineTo(-5 * S, -15 * S);
    ctx.moveTo(3 * S, -9 * S); ctx.lineTo(5 * S, -15 * S); ctx.stroke(); // chelicerae
    ctx.restore();

    for (const [p, c, r] of joints) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, r * S, 0, 7); ctx.fill();
    }
  };
  raf = requestAnimationFrame(frame);

  // ---------- control ----------
  const onKey = e => { if (e.key === 'Escape') api.stop(); };
  const api = {
    stop() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('keydown', onKey);
      document.querySelectorAll('.__wc-grab,.__wc-torn').forEach(el => {
        el.classList.remove('__wc-grab', '__wc-torn');
        el.style.removeProperty('--wc');
      });
      cv.remove(); fx.remove(); css.remove();
      delete window.__webCrawler;
    }
  };
  addEventListener('resize', resize);
  addEventListener('keydown', onKey);
  window.__webCrawler = api;
})();
