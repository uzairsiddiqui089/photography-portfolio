/* Extra motion layer. Sits on top of the existing site; nothing here touches the 3D camera or the scroll journey. */
(function () {
'use strict';
var D = document, root = D.documentElement;
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
function small() { return window.innerWidth < 900; }
function on(el, ev, fn, o) { el.addEventListener(ev, fn, o || false); }
function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('fx:', e); } }
function mk(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
var IRIS_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/><path d="M16 3l6 10.4M29 16H17M22 28.4L16 18M10 28.4l6-10.4M3 16h12M10 3.6L16 14"/></svg>';

/* ---------- 1. Iris page transition ---------- */
safe(function () {
  if (reduce) { root.classList.remove('fx-cover'); try { sessionStorage.removeItem('fxiris'); } catch (e) {} return; }
  var iris = mk('div', 'fx-iris', IRIS_SVG); iris.setAttribute('aria-hidden', 'true'); D.body.appendChild(iris);
  var entering = root.classList.contains('fx-cover');
  if (entering) {
    iris.style.clipPath = 'circle(150% at 50% 50%)'; root.classList.remove('fx-cover');
    try { sessionStorage.removeItem('fxiris'); } catch (e) {}
    var done = function () { iris.getAnimations().forEach(function (a) { a.cancel(); }); iris.style.clipPath = 'circle(0% at 50% 50%)'; iris.classList.remove('on'); };
    var open = function () { iris.classList.add('on'); iris.animate([{ clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }], { duration: 750, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' }).onfinish = done; setTimeout(done, 1800); };
    if (window.requestAnimationFrame) requestAnimationFrame(function () { setTimeout(open, 80); }); else open();
  }
  on(window, 'pageshow', function (e) { if (e.persisted) { iris.getAnimations().forEach(function (a) { a.cancel(); }); iris.style.clipPath = 'circle(0% at 50% 50%)'; iris.classList.remove('on'); } });
  on(D, 'click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self' || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin || !/\.html?$|\/$/.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search) return;   // same page: the browser scrolls
    e.preventDefault();
    var x = e.clientX || innerWidth / 2, y = e.clientY || innerHeight / 2;
    iris.classList.add('on');
    iris.animate([{ clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)' }, { clipPath: 'circle(150% at ' + x + 'px ' + y + 'px)' }], { duration: 650, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' });
    try { sessionStorage.setItem('fxiris', '1'); } catch (err) {}
    setTimeout(function () { location.href = a.href; }, 680);
  });
});

/* ---------- 2. Film grain and warm light leak ---------- */
safe(function () {
  if (reduce) return;
  var c = D.createElement('canvas'); c.width = c.height = 160; var g = c.getContext('2d'), im = g.createImageData(160, 160);
  for (var i = 0; i < im.data.length; i += 4) { var v = Math.random() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0);
  var gr = mk('div', 'fx-grain'); gr.setAttribute('aria-hidden', 'true'); gr.style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
  var lk = mk('div', 'fx-leak'); lk.setAttribute('aria-hidden', 'true');
  D.body.appendChild(lk); D.body.appendChild(gr);
});

/* ---------- 3. Bokeh behind the hero ---------- */
safe(function () {
  var hero = D.querySelector('.hero'); if (!hero || reduce) return;
  var cv = mk('canvas', 'fx-bokeh'); cv.setAttribute('aria-hidden', 'true'); hero.insertBefore(cv, hero.firstChild);
  var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5), discs = [], mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0;
  var pal = ['255,160,70', '235,110,70', '255,200,120', '215,140,70', '255,225,170', '200,100,60'];
  function build() {
    var r = hero.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * dpr | 0; cv.height = H * dpr | 0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = small() ? 10 : 22; discs = [];
    for (var i = 0; i < n; i++) {
      var z = Math.random();   // depth: far ones are small and slow
      discs.push({ x: Math.random() * W, y: Math.random() * H, r: (14 + Math.random() * 46) * (0.55 + z), z: z, sx: (Math.random() - 0.5) * 8, sy: -4 - Math.random() * 9, c: pal[i % pal.length], a: 0.16 + Math.random() * 0.26, ph: Math.random() * 6.28, hex: Math.random() > 0.35 });
    }
  }
  function hexPath(x, y, r, rot) { ctx.beginPath(); for (var k = 0; k < 6; k++) { var a = rot + k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  var last = 0;
  function frame(t) {
    raf = 0; if (!visible || D.hidden) return;
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < discs.length; i++) {
      var d = discs[i]; d.x += d.sx * dt * (0.4 + d.z); d.y += d.sy * dt * (0.4 + d.z); d.ph += dt * 0.6;
      if (d.y < -d.r * 2) { d.y = H + d.r * 2; d.x = Math.random() * W; } if (d.x < -d.r * 2) d.x = W + d.r; if (d.x > W + d.r * 2) d.x = -d.r;
      var px = d.x + mx * 60 * d.z, py = d.y + my * 40 * d.z, pulse = 0.75 + Math.sin(d.ph) * 0.25;
      var g = ctx.createRadialGradient(px, py, d.r * 0.2, px, py, d.r);
      g.addColorStop(0, 'rgba(' + d.c + ',' + (d.a * 0.55 * pulse) + ')'); g.addColorStop(0.85, 'rgba(' + d.c + ',' + (d.a * 0.85 * pulse) + ')'); g.addColorStop(1, 'rgba(' + d.c + ',' + (d.a * 1.4 * pulse) + ')');
      ctx.fillStyle = g;
      if (d.hex) hexPath(px, py, d.r, d.ph * 0.05); else { ctx.beginPath(); ctx.arc(px, py, d.r, 0, 6.2832); }
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !D.hidden) raf = requestAnimationFrame(frame); }
  build();
  if ('ResizeObserver' in window) new ResizeObserver(function () { build(); }).observe(hero); else on(window, 'resize', build);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(hero);
  on(D, 'visibilitychange', kick);
  on(window, 'pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  on(window, 'deviceorientation', function (e) { if (e.gamma != null) { tx = Math.max(-0.5, Math.min(0.5, e.gamma / 60)); ty = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 90)); } }, { passive: true });
  kick();
});

/* ---------- 4. Marquee ribbon (home) ---------- */
safe(function () {
  var before = D.getElementById('services'); if (!before || reduce) return;
  var words = ['Portrait', 'Fashion', 'Editorial', 'Documentary', 'Spaces'];
  var imgs = ['colour/portrait-lilac.webp', 'work-mask-series.jpg', 'colour/fashion-camel-coat.webp', 'work-concrete-silk.jpg', 'colour/editorial-teal-magenta.webp', 'capture-documentary.jpg', 'colour/beauty-gold.webp', 'work-quiet-ones.jpg', 'more-laughing.jpg', 'work-glass-house.jpg'];
  function row(html) { var r = mk('div', 'fx-row'), t = mk('div', 'fx-track', html + html); r.appendChild(t); return { r: r, t: t }; }
  var w = words.map(function (x, i) { return '<span class="fx-word' + (i % 2 ? ' o' : '') + '">' + x + '</span><span class="fx-star" aria-hidden="true">✶</span>'; }).join('');
  var th = imgs.map(function (p) { return '<span class="fx-th" data-m="images/' + p + '"></span>'; }).join('');
  var m = mk('div', 'fx-marquee'); m.setAttribute('aria-hidden', 'true');
  var a = row(w), b = row(th); m.appendChild(a.r); m.appendChild(b.r);
  before.parentNode.insertBefore(m, before);
  var lazy = false;
  function loadThumbs() { if (lazy) return; lazy = true; m.querySelectorAll('.fx-th').forEach(function (e) { e.style.backgroundImage = 'url(' + e.dataset.m + ')'; }); }
  var A = [a, b].map(function (o, i) { return o.t.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: i ? 46000 : 38000, iterations: Infinity, direction: i ? 'reverse' : 'normal' }); });
  var vis = false, lastY = scrollY, lastT = performance.now(), vel = 0, raf = 0;
  function tick(t) {
    raf = 0; var dt = Math.max(1, t - lastT), v = (scrollY - lastY) / dt * 1000; lastY = scrollY; lastT = t;
    vel += (v - vel) * 0.12;
    var s = Math.min(1, Math.abs(vel) / 2600), dir = vel < 0 ? -1 : 1;
    A.forEach(function (an, i) { an.playbackRate = (1 + s * 9) * (dir < 0 && s > 0.05 ? -1 : 1) * (i ? 1 : 1); });
    var sk = Math.max(-8, Math.min(8, vel / 260));
    a.r.style.transform = 'skewX(' + (-sk) + 'deg)'; b.r.style.transform = 'skewX(' + sk + 'deg)';
    if (vis) raf = requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
    vis = e[0].isIntersecting; if (vis) { loadThumbs(); A.forEach(function (x) { x.play(); }); lastY = scrollY; lastT = performance.now(); if (!raf) raf = requestAnimationFrame(tick); } else A.forEach(function (x) { x.pause(); });
  }, { rootMargin: '200px' }).observe(m); else loadThumbs();
});

/* ---------- 5. Headings rise word by word; work-page pictures rise in ---------- */
safe(function () {
  if (reduce || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); } }); }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  ['#services-h', '#process-h', '#contact-h', '#work-h', '#cap-h', 'main > .intro h1', '.cta .big'].forEach(function (sel) {
    var h = D.querySelector(sel); if (!h || h.querySelector('.wm')) return;
    var text = h.textContent.trim(); h.setAttribute('aria-label', text); h.textContent = ''; h.classList.add('fx-split');
    text.split(' ').forEach(function (wd, i, arr) { var o = mk('span', 'fxw'); o.setAttribute('aria-hidden', 'true'); var s = mk('i'); s.textContent = wd; s.style.setProperty('--i', i); o.appendChild(s); h.appendChild(o); if (i < arr.length - 1) h.appendChild(D.createTextNode(' ')); });
    io.observe(h);
    var lead = h.parentNode.querySelector('.lead'); if (lead) { lead.classList.add('fx-fadeup'); io.observe(lead); }
  });
  var figs = D.querySelectorAll('.grid figure');
  figs.forEach(function (f, i) { f.classList.add('fx-up'); f.style.setProperty('--d', (i % 3) * 90 + 'ms'); io.observe(f); });
  D.querySelectorAll('.filters button').forEach(function (b) {
    on(b, 'click', function () {
      var n = 0; figs.forEach(function (f) { f.classList.add('fx-in'); f.classList.remove('fx-pop'); if (!f.hidden) { void f.offsetWidth; f.style.setProperty('--d', (n++ * 55) + 'ms'); f.classList.add('fx-pop'); } });
    });
  });
});

/* ---------- 6. Scroll progress iris ---------- */
safe(function () {
  if (reduce) return;
  var b = mk('button', 'fx-prog'); b.type = 'button'; b.setAttribute('aria-label', 'Back to top');
  b.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="base" cx="22" cy="22" r="19"/><circle class="ring" cx="22" cy="22" r="19" stroke-dasharray="119.4" stroke-dashoffset="119.4"/><g class="blades"><path d="M22 10l4.4 7.6M34 22H25M30.5 30.5L24 24M22 34l-4.4-7.6M10 22H19M13.5 13.5L20 20"/></g></svg>';
  D.body.appendChild(b);
  var ring = b.querySelector('.ring'), bl = b.querySelector('.blades'), tk = false;
  function upd() { tk = false; var h = root.scrollHeight - innerHeight, p = h > 0 ? Math.max(0, Math.min(1, scrollY / h)) : 0; ring.style.strokeDashoffset = 119.4 * (1 - p); bl.style.transform = 'rotate(' + (p * 540) + 'deg)'; b.classList.toggle('on', scrollY > 120 && !root.classList.contains('is-loading')); }
  on(window, 'scroll', function () { if (!tk) { tk = true; requestAnimationFrame(upd); } }, { passive: true }); on(window, 'resize', upd); upd();
  on(b, 'click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
});

/* ---------- mouse-only extras: cursor, tilt, magnetic buttons ---------- */
if (fine && !reduce) {
  /* cursor ring that turns into a label over pictures and links */
  safe(function () {
    var ring = mk('div', 'fx-cur', '<span></span>'), dot = mk('div', 'fx-dot'), lab = ring.firstChild;
    ring.setAttribute('aria-hidden', 'true'); dot.setAttribute('aria-hidden', 'true'); D.body.appendChild(ring); D.body.appendChild(dot);
    var x = 0, y = 0, rx = 0, ry = 0, moved = false;
    on(window, 'pointermove', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; x = e.clientX; y = e.clientY; if (!moved) { moved = true; rx = x; ry = y; root.classList.add('fx-mouse'); } }, { passive: true });
    on(D, 'mouseleave', function () { root.classList.remove('fx-mouse'); moved = false; });
    (function loop() { rx += (x - rx) * 0.2; ry += (y - ry) * 0.2; ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)'; dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; requestAnimationFrame(loop); })();
    var map = [['.ph, .subject-art, .shot, .panel:not(.panel-cta)', 'View'], ['.svc', 'Book'], ['.tile', 'Look'], ['.cta-card, .btn, .nav-cta, .big', 'Go']];
    on(D, 'mouseover', function (e) { var t = e.target, txt = ''; if (!t.closest) return; map.some(function (m) { if (t.closest(m[0])) { txt = m[1]; return true; } }); lab.textContent = txt; ring.classList.toggle('big', !!txt); });
    on(D, 'mousedown', function () { ring.classList.remove('click'); void ring.offsetWidth; ring.classList.add('click'); });
  });
  /* 3D tilt and shine on pictures */
  safe(function () {
    var pairs = [];
    D.querySelectorAll('.svc-img, .tile-img').forEach(function (e) { pairs.push([e, e.parentNode, 1.1]); });   // the card text sits on top, so the whole card listens
    D.querySelectorAll('.shot, .grid .ph').forEach(function (e) { pairs.push([e, e, 1.02]); });
    pairs.forEach(function (p) {
      var el = p[0], trig = p[1], sc = p[2];
      var gl = mk('i', 'fx-glare'); gl.setAttribute('aria-hidden', 'true'); el.appendChild(gl); el.classList.add('fx-tilt');
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      if (trig !== el) trig.classList.add('fx-hov');
      on(trig, 'pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var r = trig.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        el.classList.remove('fx-reset'); el.style.transform = 'perspective(900px) rotateX(' + (-ny * 9) + 'deg) rotateY(' + (nx * 11) + 'deg) scale(' + sc + ')';
        el.style.setProperty('--gx', (nx + 0.5) * 100 + '%'); el.style.setProperty('--gy', (ny + 0.5) * 100 + '%');
      });
      on(trig, 'pointerleave', function () { el.classList.add('fx-reset'); el.style.transform = ''; });
    });
  });
  /* magnetic buttons */
  safe(function () {
    D.querySelectorAll('.btn, .nav-cta, .big').forEach(function (b) {
      on(window, 'pointermove', function (e) {
        var r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy, near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9;
        b.style.translate = near ? (dx * 0.22) + 'px ' + (dy * 0.32) + 'px' : '';
      }, { passive: true });
    });
  });
}
})();
