(function () {
var root = document.documentElement;
function pad(n) { return ('0' + n).slice(-2); }
function pad3(n) { return ('00' + n).slice(-3); }
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Static setup (works without any library) ----------
document.querySelectorAll('a[href="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) { e.preventDefault(); });
});
// the sideways gallery is a scrollable region when it is not pinned: make it keyboard reachable
var galleryTrack = document.querySelector('.work .track');
galleryTrack.setAttribute('tabindex', '0');
galleryTrack.setAttribute('role', 'region');

// ---------- Loading state ----------
var done = false, announced = false;
function announce() {
  if (announced) return;
  announced = true; window.siteReady = true;
  document.dispatchEvent(new Event('site:ready'));
}
function finish() {
  if (done) return;
  done = true;
  root.classList.remove('is-loading');
  announce();
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}
setTimeout(finish, 8000);   // safety net: never trap the visitor behind the intro

if (!(window.gsap && window.ScrollTrigger)) { finish(); return; }   // page still works without GSAP
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });   // phone address bars must not re-measure the pins

// =====================================================================
//  camera3d: a modern DSLR built from code. Generic, no brand.
// =====================================================================
function camera3d() {
  var canvas = document.querySelector('.cam3d'), hero = document.querySelector('.hero');
  if (!window.THREE || !canvas) return null;
  var T = THREE, renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" }); } catch (e) { return null; }
  var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.5);   // lowered automatically if the machine struggles
  renderer.setPixelRatio(dpr);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new T.Scene();
  var FOV = 28, cam = new T.PerspectiveCamera(FOV, 1, 0.1, 200);

  // studio reflections: soft boxes and colored strips, so chrome and glass have something to reflect
  var pm = new T.PMREMGenerator(renderer), es = new T.Scene();
  es.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: 0x15171c, side: T.BackSide })));
  function panel(w, h, color, k, x, y, z) {
    var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
  }
  panel(10, 5, 0xffffff, 7, 0, 12, 5);
  panel(4, 10, 0xffffff, 4, -12, 3, 3);
  panel(3, 8, 0xffe2c0, 3, 12, 1, 4);
  panel(12, 1.2, 0x5aa0ff, 3, 0, -8, -8);
  panel(2, 8, 0xb06bff, 1.2, 8, 4, -10);
  panel(2, 8, 0x3de0b0, 0.9, -8, 3, -10);
  scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
  scene.add(new T.HemisphereLight(0xffffff, 0x9a9aa8, 0.25));
  var key = new T.DirectionalLight(0xffffff, 0.8); key.position.set(5, 8, 9); scene.add(key);
  var flashLight = new T.PointLight(0xffffff, 0, 30); flashLight.position.set(0, 2, 12); scene.add(flashLight);

  // ---- textures ----
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  var grain = (function () {   // leather-like micro texture
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d');
    g.fillStyle = '#7c7c7c'; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 16000; i++) { var v = 105 + Math.random() * 60; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 3); return t;
  })();
  var lcdTop = canvasTex(256, 112, function (g, w, h) {
    g.fillStyle = '#05090f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7fe8ff'; g.font = '600 38px Manrope, Arial, sans-serif'; g.fillText('1/250', 14, 46); g.fillText('F1.8', 150, 46);
    g.font = '500 24px Manrope, Arial, sans-serif'; g.fillStyle = '#a8f0d0'; g.fillText('ISO 400   [ 1284 ]', 14, 92);
  });
  // ---- the camera's rear screen: a live view of this very page, laid out exactly like the browser window ----
  var SW = window.innerWidth > 900 ? 1440 : 1024, SH = Math.round(SW / 1.584), SECS = 2;          // texture size; two "pages": the hero, then What we capture
  var siteC = document.createElement('canvas'); siteC.width = SW; siteC.height = SH * SECS;
  var lay = { rw: SW, rh: SH, ox: 0, oy: 0, f: 1, VW: 1440, VH: 900 };
  function relayout() {
    var VW = Math.max(320, window.innerWidth), VH = Math.max(320, window.innerHeight), A = VW / VH;
    lay.VW = VW; lay.VH = VH;
    if (A >= SW / SH) { lay.rw = SW; lay.rh = SW / A; } else { lay.rh = SH; lay.rw = SH * A; }
    lay.ox = (SW - lay.rw) / 2; lay.oy = (SH - lay.rh) / 2; lay.f = lay.rw / VW;
  }
  function clampN(a, v, b) { return Math.max(a, Math.min(b, v)); }
  // The real first photo is shown on the screen too, but only when served over http(s). On a file:// page the browser treats the image as foreign and locks the whole screen texture, so we skip it there.
  var artImg = new Image(), artBad = window.location.protocol === 'file:';
  artImg.onload = function () { redrawSite(); };
  if (!artBad) artImg.src = 'images/capture-portraits.jpg';
  function drawSite() {
    relayout();
    var g = siteC.getContext('2d'), serif = 'Fraunces, Georgia, serif', sans = 'Manrope, Arial, sans-serif';
    var VW = lay.VW, VH = lay.VH, pad = clampN(20, VW * 0.04, 56), INK = '#0b0b0b', MUTED = '#3d3a35';
    function sec(i) { g.save(); g.fillStyle = '#efe3c8'; g.fillRect(0, i * SH, SW, SH); g.translate(lay.ox, i * SH + lay.oy); g.scale(lay.f, lay.f); g.beginPath(); g.rect(0, 0, VW, VH); g.clip(); }
    function txt(s, x, y, font, color, align, ls) {
      g.font = font; g.fillStyle = color; g.textAlign = align || 'left';
      if ('letterSpacing' in g) g.letterSpacing = ls || '0px';
      g.fillText(s, x, y);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
    }
    function pill(cx, cy, label, filled) {   // right-aligned pill whose right edge is cx
      g.font = '700 17px ' + sans; var w = g.measureText(label).width + 61, h = 58, x = cx - w, y = cy - h / 2, r = h / 2;
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
      if (filled) { g.fillStyle = INK; g.fill(); } else { g.strokeStyle = 'rgba(11,11,11,0.25)'; g.lineWidth = 1; g.stroke(); }
      txt(label, x + w / 2, cy + 6, '700 17px ' + sans, filled ? '#efe3c8' : INK, 'center');
    }
    function art(x, y, w, h) {   // the first photo on the page (or its gradient while it loads)
      if (artImg.complete && artImg.naturalWidth && !artBad) {
        g.drawImage(artImg, x, y, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; var bm = 19.2, bk = 26, bx = x + bm, by = y + bm, bx2 = x + w - bm, by2 = y + h - bm;
        g.beginPath();
        g.moveTo(bx, by + bk); g.lineTo(bx, by); g.lineTo(bx + bk, by); g.moveTo(bx2 - bk, by); g.lineTo(bx2, by); g.lineTo(bx2, by + bk);
        g.moveTo(bx, by2 - bk); g.lineTo(bx, by2); g.lineTo(bx + bk, by2); g.moveTo(bx2 - bk, by2); g.lineTo(bx2, by2); g.lineTo(bx2, by2 - bk); g.stroke();
        return;
      }
      var a = 155 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = x + w / 2, cy = y + h / 2;
      var lg = g.createLinearGradient(cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L);
      lg.addColorStop(0, '#151515'); lg.addColorStop(0.55, '#4a4a4a'); lg.addColorStop(1, '#0a0a0a'); g.fillStyle = lg; g.fillRect(x, y, w, h);
      function rad(px, py, alpha, stop) {
        var ex = Math.max(px, 1 - px) * w, ey = Math.max(py, 1 - py) * h, R = Math.sqrt(ex * ex + ey * ey) * stop;
        var rg = g.createRadialGradient(x + px * w, y + py * h, 0, x + px * w, y + py * h, R);
        rg.addColorStop(0, 'rgba(255,255,255,' + alpha + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x, y, w, h);
      }
      rad(0.68, 0.34, 0.85, 0.34); rad(0.3, 0.8, 0.18, 0.4);
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; var m = 19.2, k = 26, X = x + m, Y = y + m, X2 = x + w - m, Y2 = y + h - m;
      g.beginPath();
      g.moveTo(X, Y + k); g.lineTo(X, Y); g.lineTo(X + k, Y); g.moveTo(X2 - k, Y); g.lineTo(X2, Y); g.lineTo(X2, Y + k);
      g.moveTo(X, Y2 - k); g.lineTo(X, Y2); g.lineTo(X + k, Y2); g.moveTo(X2 - k, Y2); g.lineTo(X2, Y2); g.lineTo(X2, Y2 - k); g.stroke();
    }

    // page 0: the hero (text left and right, the camera sits in the middle)
    sec(0);
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(pad + 12, 36, 10.5, 0, 7); g.stroke();
    txt('Quiet Aperture', pad + 32, 43, '600 18.4px ' + serif, INK);
    txt('Capture', VW - pad - 440, 42, '500 17px ' + sans, MUTED); txt('Work', VW - pad - 340, 42, '500 17px ' + sans, MUTED);
    txt('Process', VW - pad - 270, 42, '500 17px ' + sans, MUTED); txt('Contact', VW - pad - 190, 42, '500 17px ' + sans, MUTED);
    txt('Booking from November', VW - pad, 42, '500 15px ' + sans, INK, 'right');
    var fs = clampN(28.8, VW * 0.03, 51.2), lh = fs * 1.06, y0 = VH * 0.5 - lh * 0.9;
    txt('PORTRAIT AND FASHION STUDIO, LISBON', pad, y0 - lh - 14, '500 12.5px ' + sans, '#a8552a', 'left', '2px');
    ['We photograph', 'people who would', 'rather not be', 'photographed.'].forEach(function (s, i) { txt(s, pad, y0 + i * lh, '400 ' + fs + 'px ' + serif, INK, 'left', (-0.02 * fs) + 'px'); });
    txt('Natural light, a small crew and', VW - pad, VH * 0.5 - 49, '400 17px ' + sans, MUTED, 'right');
    txt('hand retouching.', VW - pad, VH * 0.5 - 21, '400 17px ' + sans, MUTED, 'right');
    pill(VW - pad, VH * 0.5 + 40, 'See the work', false);
    g.restore();

    // page 1: what we capture, as it appears when the page is pinned
    sec(1);
    var h2 = clampN(32, VW * 0.04, 54.4);
    txt('What we capture', pad, VH * 0.195, '400 ' + h2 + 'px ' + serif, INK, 'left', (-0.02 * h2) + 'px');
    txt('Five kinds of pictures, one way of looking.', pad, VH * 0.267, '400 17px ' + sans, MUTED);
    g.font = '500 14.4px ' + sans; var tail = ' / 05', tw = g.measureText(tail).width;
    txt(tail, VW - pad, VH * 0.247, '400 14.4px ' + sans, MUTED, 'right'); txt('01', VW - pad - tw, VH * 0.247, '500 14.4px ' + sans, INK, 'right');
    g.fillStyle = 'rgba(11,11,11,0.25)'; g.fillRect(VW - pad - 144, VH * 0.278, 144, 2); g.fillStyle = '#a8552a'; g.fillRect(VW - pad - 144, VH * 0.278, 28, 2);
    txt('01', pad, VH * 0.468, '500 12.5px ' + sans, '#a8552a', 'left', '2px');
    var big = clampN(41.6, VW * 0.065, 96);
    txt('Portraits', pad, VH * 0.622, '400 ' + big + 'px ' + serif, INK, 'left', (-0.03 * big) + 'px');
    txt('The moment someone stops performing and', pad, VH * 0.703, '400 18.4px ' + sans, MUTED);
    txt('simply looks back at you.', pad, VH * 0.749, '400 18.4px ' + sans, MUTED);
    var ah = VH * 0.56, aw = ah * 0.8; art(VW - pad - aw, VH * 0.319, aw, ah);
    g.restore();
  }
  drawSite();
  var scrC = document.createElement('canvas'); scrC.width = SW; scrC.height = SH; var sg = scrC.getContext('2d');
  var screenTex = new T.CanvasTexture(scrC); screenTex.encoding = T.sRGBEncoding; screenTex.anisotropy = 8;
  var screenState = { p: 0, hud: 1 }, shownP = -1, shownT = -1, hudDom = null;
  function paintScreen(t) {
    var sy = Math.max(0, Math.min(1, screenState.p)) * SH;
    sg.drawImage(siteC, 0, sy, SW, SH, 0, 0, SW, SH);
    var a = screenState.hud; if (a > 0.01) {   // viewfinder readouts, drawn in the same places as the real overlay
      if (!hudDom) hudDom = { tc: document.querySelector('.vf-tc'), fr: document.querySelector('.vf-frame'), f: document.querySelector('.vf-f'), s: document.querySelector('.vf-s'), i: document.querySelector('.vf-i'), l: document.querySelector('.vf-label') };
      var VW = lay.VW, VH = lay.VH, ink = '#101c37', font = '600 11.84px Manrope, Arial, sans-serif';
      sg.save(); sg.translate(lay.ox, lay.oy); sg.scale(lay.f, lay.f); sg.globalAlpha = a; sg.strokeStyle = ink; sg.fillStyle = ink; sg.lineWidth = 2;
      [[17.6, 17.6, 1, 1], [VW - 17.6, 17.6, -1, 1], [17.6, VH - 17.6, 1, -1], [VW - 17.6, VH - 17.6, -1, -1]].forEach(function (c) {
        sg.beginPath(); sg.moveTo(c[0] + c[2] * 34, c[1]); sg.lineTo(c[0], c[1]); sg.lineTo(c[0], c[1] + c[3] * 34); sg.stroke();
      });
      if (Math.floor(t * 1.4) % 2 === 0) { sg.beginPath(); sg.arc(56, 30, 4.8, 0, 7); sg.fill(); }
      sg.font = font; if ('letterSpacing' in sg) sg.letterSpacing = '1.66px';
      sg.textAlign = 'left'; sg.fillText(('REC ' + hudDom.tc.textContent).toUpperCase(), 72, 34.5);
      sg.textAlign = 'right'; sg.fillText(('RAW · ' + hudDom.fr.textContent).toUpperCase(), VW - 51.2, 34.5);
      var fx = 51.2; sg.textAlign = 'left';
      [hudDom.f, hudDom.s, hudDom.i].forEach(function (el) { var s = el.textContent.toUpperCase(); sg.fillText(s, fx, VH - 25); fx += sg.measureText(s).width + 17.6; });
      sg.textAlign = 'center'; sg.fillText(hudDom.l.textContent.toUpperCase(), VW / 2, VH - 25);
      sg.textAlign = 'right'; sg.fillText('AF-S · 24-70MM', VW - 51.2, VH - 25);
      if ('letterSpacing' in sg) sg.letterSpacing = '0px';
      sg.lineWidth = 1; sg.strokeRect(VW / 2 - 32, VH / 2 - 32, 64, 64);
      sg.globalAlpha = a * 0.5; sg.beginPath(); sg.moveTo(VW / 2, VH / 2 - 40); sg.lineTo(VW / 2, VH / 2 + 40); sg.moveTo(VW / 2 - 40, VH / 2); sg.lineTo(VW / 2 + 40, VH / 2); sg.stroke();
      sg.restore();
    }
    screenTex.needsUpdate = true;
  }
  paintScreen(0);
  var relayoutT;
  function redrawSite() { drawSite(); shownP = -1; }
  var siteW = window.innerWidth, siteH = window.innerHeight;
  window.addEventListener('resize', function () {
    if (window.innerWidth === siteW && Math.abs(window.innerHeight - siteH) < 120) return;
    siteW = window.innerWidth; siteH = window.innerHeight;
    clearTimeout(relayoutT); relayoutT = setTimeout(redrawSite, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawSite);

  // ---- materials ----
  function phys(o) { return new T.MeshPhysicalMaterial(o); }
  var M = {
    rubber: new T.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.48, metalness: 0.15, bumpMap: grain, bumpScale: 0.5 }),
    lensRubber: new T.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.7, metalness: 0.1 }),
    plate:  new T.MeshStandardMaterial({ color: 0x1d1f25, roughness: 0.3, metalness: 0.92 }),
    black:  new T.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.5, metalness: 0.35 }),
    chrome: new T.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.1, metalness: 1 }),
    red:    new T.MeshStandardMaterial({ color: 0xd3202e, roughness: 0.32, metalness: 0.35 }),
    gloss:  phys({ color: 0x050608, roughness: 0.12, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    glass:  phys({ color: 0x03060e, roughness: 0.02, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.5, envMapIntensity: 1.8 }),
    lcd:    new T.MeshBasicMaterial({ map: lcdTop, toneMapped: false }),
    screen: new T.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
    purple: new T.MeshStandardMaterial({ color: 0x7a3dff, emissive: 0x3a1a90, roughness: 0.2, metalness: 0.7 }),
    green:  new T.MeshStandardMaterial({ color: 0x28e0a8, emissive: 0x0a6a50, roughness: 0.2, metalness: 0.7 }),
    blue:   new T.MeshStandardMaterial({ color: 0x3a7bff, emissive: 0x143a90, roughness: 0.2, metalness: 0.7 })
  };

  // ---- geometry helpers ----
  function rrect(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(w, h, d, r, bev, mat) {
    var g = new T.ExtrudeGeometry(rrect(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -d / 2); return new T.Mesh(g, mat);
  }
  function cylZ(rFront, rBack, len, mat, open) {   // cylinder along z, front radius first
    var g = new T.CylinderGeometry(rFront, rBack, len, 48, 1, !!open); g.rotateX(Math.PI / 2);
    var m = new T.Mesh(g, mat); if (open) m.material = mat.clone(), m.material.side = T.DoubleSide; return m;
  }
  function cylY(r, len, mat) { return new T.Mesh(new T.CylinderGeometry(r, r, len, 48), mat); }
  function ridges(count, r, len, mat) {
    var im = new T.InstancedMesh(new T.BoxGeometry(0.07, 0.12, len), mat, count), d = new T.Object3D();
    for (var i = 0; i < count; i++) {
      var a = i / count * Math.PI * 2; d.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); d.rotation.set(0, 0, a); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    }
    return im;
  }
  function grp(z) { var g = new T.Group(); g.position.z = z || 0; return g; }

  // ---- scene graph: journey (scroll) > tilt (cursor) > rig (centering, build-up) > camera ----
  var journey = new T.Group(), tilt = new T.Group(), rig = new T.Group(), cameraG = new T.Group();
  scene.add(journey); journey.add(tilt); tilt.add(rig); rig.add(cameraG);
  rig.position.set(0.25, -0.35, -2.7);

  var LX = 0.45, LY = -0.15;                  // lens axis
  var TOP = 1.87, FZ = 1.12, BZ = -1.12;      // body top, front and back faces

  // body, top plate, grip
  var body = slab(5.6, 3.5, 2.0, 0.4, 0.12, M.rubber);
  var topPlate = slab(5.55, 0.3, 1.95, 0.1, 0.05, M.plate); topPlate.position.set(0, TOP - 0.1, 0);
  var grip = new T.Group();
  var gripM = slab(1.7, 3.5, 2.7, 0.5, 0.12, M.rubber); gripM.position.set(-2.55, 0, 0.35);
  var stripe = new T.Mesh(new T.BoxGeometry(0.07, 2.3, 0.03), M.red); stripe.position.set(-2.25, -0.1, 1.84);
  var af = cylZ(0.1, 0.1, 0.06, M.gloss); af.position.set(-1.95, 1.0, 1.84);
  grip.add(gripM, stripe, af);

  // prism, hot shoe, eyecup, flash window
  var ps = new T.Shape(); ps.moveTo(-1.4, 0); ps.lineTo(1.4, 0); ps.lineTo(0.8, 1.15); ps.lineTo(-0.8, 1.15); ps.closePath();
  var prism = new T.Group();
  var prismM = new T.Mesh((function () { var g = new T.ExtrudeGeometry(ps, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3 }); g.translate(0, 0, -1.1); return g; })(), M.plate);
  var shoe = new T.Mesh(new T.BoxGeometry(0.95, 0.1, 0.6), M.chrome); shoe.position.set(0, 1.27, -0.05);
  var shoeIn = new T.Mesh(new T.BoxGeometry(0.7, 0.12, 0.38), M.black); shoeIn.position.set(0, 1.28, -0.05);
  var winG = new T.Mesh(new T.BoxGeometry(1.0, 0.36, 0.06), M.gloss); winG.position.set(0, 0.62, 1.1);
  var mic1 = cylZ(0.05, 0.05, 0.05, M.black); mic1.position.set(-0.6, 0.25, 1.1);
  var mic2 = cylZ(0.05, 0.05, 0.05, M.black); mic2.position.set(0.6, 0.25, 1.1);
  prism.add(prismM, shoe, shoeIn, winG, mic1, mic2); prism.position.set(LX, TOP, -0.07);

  // top controls
  var topCtl = new T.Group();
  var collar = cylY(0.5, 0.14, M.chrome); collar.position.set(-2.3, TOP + 0.06, 0.45);
  var sbtnBase = cylY(0.34, 0.12, M.plate); sbtnBase.position.set(-2.3, TOP + 0.18, 0.45);
  var sbtn = cylY(0.22, 0.12, M.red); sbtn.position.set(-2.3, TOP + 0.3, 0.45);
  var mode = cylY(0.52, 0.34, M.black); mode.position.set(2.0, TOP + 0.14, 0.3);
  var modeTop = cylY(0.4, 0.04, M.chrome); modeTop.position.set(2.0, TOP + 0.33, 0.3);
  var modeDot = cylY(0.05, 0.05, M.red); modeDot.position.set(2.0, TOP + 0.37, 0.58);
  var lcd = new T.Mesh(new T.PlaneGeometry(1.05, 0.46), M.lcd); lcd.rotation.x = -Math.PI / 2; lcd.position.set(1.95, TOP + 0.01, -0.5);
  var cmd = cylY(0.2, 0.12, M.black); cmd.position.set(-1.7, TOP + 0.06, -0.2);
  topCtl.add(collar, sbtnBase, sbtn, mode, modeTop, modeDot, lcd, cmd);

  // front details: mount, buttons, strap lugs
  var mount = new T.Group();
  var m1 = cylZ(1.68, 1.68, 0.14, M.chrome); m1.position.set(LX, LY, FZ + 0.06);
  var m2 = cylZ(1.32, 1.32, 0.16, M.black); m2.position.set(LX, LY, FZ + 0.08);
  for (var i = 0; i < 3; i++) {
    var a = i / 3 * Math.PI * 2 + 0.5, lug = new T.Mesh(new T.BoxGeometry(0.34, 0.2, 0.1), M.chrome);
    lug.position.set(LX + Math.cos(a) * 1.5, LY + Math.sin(a) * 1.5, FZ + 0.16); lug.rotation.z = a; mount.add(lug);
  }
  var idx = cylZ(0.06, 0.06, 0.06, M.red); idx.position.set(LX - 1.2, LY + 1.2, FZ + 0.18);
  var rel = cylZ(0.15, 0.15, 0.12, M.black); rel.position.set(LX + 1.95, LY + 0.55, FZ + 0.06);
  var dof = cylZ(0.13, 0.13, 0.1, M.plate); dof.position.set(LX + 2.05, LY - 0.35, FZ + 0.05);
  var lugL = new T.Mesh(new T.TorusGeometry(0.13, 0.035, 12, 24), M.chrome); lugL.rotation.y = Math.PI / 2; lugL.position.set(-3.5, 1.1, 0.3);
  var lugR = lugL.clone(); lugR.position.set(3.05, 1.1, 0);
  mount.add(m1, m2, idx, rel, dof, lugL, lugR);

  // rear: screen, controls, eyecup (seen when the camera turns away during the scroll)
  // (the camera's back faces -z; from behind, model +x is on the viewer's left)
  var rear = new T.Group();
  function labelMat(text, w, h, size, bg, fg) {
    var tex = canvasTex(w || 128, h || 128, function (g, W, H) {
      g.fillStyle = bg || '#17181c'; g.fillRect(0, 0, W, H); g.fillStyle = fg || '#eceef2'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 ' + (size || 34) + 'px Manrope, Arial, sans-serif'; g.fillText(text, W / 2, H / 2 + 2);
    });
    return new T.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.15 });
  }
  function faceDisc(r, mat, x, y, dz) { var m = new T.Mesh(new T.CircleGeometry(r, 48), mat); m.rotation.y = Math.PI; m.position.set(x, y, BZ - dz); return m; }
  function printed(text, w, h, x, y, size) {   // white legend printed on the body
    var tex = canvasTex(256, Math.max(32, Math.round(256 * h / w)), function (g, W, H) {
      g.fillStyle = '#e6e6ea'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + size + 'px Manrope, Arial, sans-serif'; g.fillText(text, W / 2, H / 2);
    });
    var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    m.rotation.y = Math.PI; m.position.set(x, y, BZ - 0.01); return m;
  }
  function keyRect(text, w, h, x, y) {   // rounded rectangular button with its label
    var base = slab(w, h, 0.05, h * 0.35, 0.02, M.plate); base.position.set(x, y, BZ - 0.01);
    var lab = new T.Mesh(new T.PlaneGeometry(w * 0.86, h * 0.72), labelMat(text, 256, Math.round(256 * h / w), 54)); lab.rotation.y = Math.PI; lab.position.set(x, y, BZ - 0.075);
    rear.add(base, lab);
  }
  function keyRound(text, r, x, y, size) {
    var ring = cylZ(r * 1.18, r * 1.18, 0.05, M.plate); ring.position.set(x, y, BZ - 0.03);
    rear.add(ring, faceDisc(r, labelMat(text, 128, 128, size || 40), x, y, 0.062));
  }
  var ringTex = canvasTex(512, 512, function (g, W, H) {   // knurled control wheel
    g.fillStyle = '#101114'; g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, 7); g.fill();
    g.strokeStyle = '#4a4c54'; g.lineWidth = 6;
    for (var i = 0; i < 72; i++) { var a = i / 72 * Math.PI * 2; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * W * 0.4, H / 2 + Math.sin(a) * H * 0.4); g.lineTo(W / 2 + Math.cos(a) * W * 0.49, H / 2 + Math.sin(a) * H * 0.49); g.stroke(); }
    g.strokeStyle = '#2a2b31'; g.lineWidth = 8; g.beginPath(); g.arc(W / 2, H / 2, W * 0.37, 0, 7); g.stroke();
  });

  // LCD: dark frame, glossy bezel, the live-view screen and a glass cover
  var lcdX = 0.62, lcdY = -0.45;
  var frameC = slab(3.74, 2.58, 0.06, 0.16, 0.03, M.plate); frameC.position.set(lcdX, lcdY, BZ + 0.01);
  var bezel = new T.Mesh(new T.PlaneGeometry(3.58, 2.42), M.gloss); bezel.rotation.y = Math.PI; bezel.position.set(lcdX, lcdY, BZ - 0.1);
  var scr = new T.Mesh(new T.PlaneGeometry(3.38, 2.13), M.screen); scr.rotation.y = Math.PI; scr.position.set(lcdX, lcdY, BZ - 0.105);
  var cover = new T.Mesh(new T.PlaneGeometry(3.58, 2.42), phys({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.07, clearcoat: 1, envMapIntensity: 2.2 }));
  cover.rotation.y = Math.PI; cover.position.set(lcdX, lcdY, BZ - 0.12);
  rear.add(frameC, bezel, scr, cover);

  // viewfinder: big rubber eyecup, chrome frame, glass window and a diopter wheel
  var eye = slab(1.9, 1.05, 0.5, 0.3, 0.06, M.rubber); eye.position.set(LX, TOP + 0.6, BZ - 0.1);
  var eyeF = new T.Mesh(new T.PlaneGeometry(1.3, 0.68), M.chrome); eyeF.rotation.y = Math.PI; eyeF.position.set(LX, TOP + 0.6, BZ - 0.38);
  var eyeG = new T.Mesh(new T.PlaneGeometry(1.12, 0.54), phys({ color: 0x02040a, roughness: 0.03, metalness: 0.2, clearcoat: 1, envMapIntensity: 2 })); eyeG.rotation.y = Math.PI; eyeG.position.set(LX, TOP + 0.6, BZ - 0.385);
  var diopter = cylY(0.13, 0.22, M.chrome); diopter.rotation.z = Math.PI / 2; diopter.position.set(LX - 1.08, TOP + 0.45, BZ - 0.08);
  rear.add(eye, eyeF, eyeG, diopter);

  // top-left (viewer's left): power switch with its OFF / ON legend
  var pw = cylZ(0.46, 0.46, 0.1, M.black); pw.position.set(2.3, 1.38, BZ - 0.05);
  var pwR = ridges(40, 0.46, 0.1, M.plate); pwR.position.set(2.3, 1.38, BZ - 0.05);
  var pwL = new T.Mesh(new T.BoxGeometry(0.5, 0.14, 0.05), M.chrome); pwL.position.set(2.3, 1.38, BZ - 0.12);
  var pwDot = faceDisc(0.05, new T.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }), 2.05, 1.38, 0.121);
  rear.add(pw, pwR, pwL, pwDot, printed('OFF     ON', 1.0, 0.2, 2.3, 0.9, 44));
  // top-right of the eyecup: live view, AF-ON, AE lock, focus point
  keyRound('LV', 0.18, -0.9, 1.34, 36);
  keyRound('AF-ON', 0.2, -1.5, 1.38, 26);
  rear.add(printed('AF-ON', 0.55, 0.16, -1.5, 1.68, 40));
  keyRound('*', 0.16, -2.05, 1.34, 56);
  keyRound('+', 0.14, -2.5, 1.26, 52);
  rear.add(faceDisc(0.04, new T.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }), -0.2, 1.1, 0.02));

  // right of the screen: MENU / INFO keys, quick-menu key, the big control wheel with SET
  keyRect('MENU', 0.62, 0.34, -1.62, 0.55);
  keyRect('INFO.', 0.62, 0.34, -1.62, 0.12);
  keyRound('Q', 0.19, -1.6, -0.33, 44);
  var wheelBase = cylZ(0.8, 0.8, 0.08, M.plate); wheelBase.position.set(-2.05, -0.82, BZ - 0.04);
  rear.add(wheelBase, faceDisc(0.74, new T.MeshBasicMaterial({ map: ringTex, toneMapped: false }), -2.05, -0.82, 0.095));
  var setRing = cylZ(0.4, 0.4, 0.06, M.chrome); setRing.position.set(-2.05, -0.82, BZ - 0.1);
  rear.add(setRing, faceDisc(0.36, labelMat('SET', 128, 128, 40, '#1d1e23', '#f0f0f4'), -2.05, -0.82, 0.135));
  // bottom: playback and UNLOCK keys, thumb rest
  keyRound('>', 0.14, -1.35, -1.55, 40);
  keyRect('UNLOCK', 0.62, 0.22, -2.1, -1.6);
  var thumb = slab(0.7, 1.1, 0.2, 0.3, 0.06, M.rubber); thumb.position.set(-2.55, 0.62, BZ - 0.04);
  rear.add(thumb);

  // ---- lens: a 24-70 style zoom, built as separate pieces so it can be assembled one by one ----
  var lens = new T.Group(); lens.position.set(LX, LY, FZ - 0.02);
  var seg = [];
  function addSeg(z, build) { var g = grp(z); build(g); lens.add(g); seg.push(g); return g; }
  addSeg(0.09, function (g) { g.add(cylZ(1.5, 1.5, 0.18, M.chrome)); });
  addSeg(0.55, function (g) { g.add(cylZ(1.4, 1.42, 0.7, M.black)); });
  addSeg(1.4, function (g) { g.add(cylZ(1.46, 1.46, 0.95, M.lensRubber)); g.add(ridges(84, 1.47, 0.85, M.black)); });
  addSeg(1.95, function (g) { g.add(cylZ(1.49, 1.49, 0.07, M.red)); });
  addSeg(2.3, function (g) { g.add(cylZ(1.4, 1.4, 0.62, M.black)); var c = cylZ(1.42, 1.42, 0.03, M.chrome); c.position.z = 0.2; g.add(c); });
  addSeg(3.0, function (g) { g.add(cylZ(1.45, 1.45, 0.8, M.lensRubber)); g.add(ridges(68, 1.46, 0.7, M.black)); });
  addSeg(3.65, function (g) { g.add(cylZ(1.25, 1.42, 0.55, M.black)); });
  addSeg(4.0, function (g) { var t = new T.Mesh(new T.TorusGeometry(1.2, 0.06, 16, 80), M.chrome); g.add(t); g.add(cylZ(1.23, 1.23, 0.12, M.black)); });
  var glassSeg = addSeg(3.95, function (g) {
    var R = 1.75, th = Math.asin(1.1 / R);
    var cg = new T.SphereGeometry(R, 56, 20, 0, Math.PI * 2, 0, th); cg.rotateX(Math.PI / 2);
    var cap = new T.Mesh(cg, M.glass); cap.position.z = -R * Math.cos(th); g.add(cap);
    var disc = cylZ(1.08, 1.08, 0.04, M.black); disc.position.z = -0.32; g.add(disc);
    [[0.92, M.purple, -0.2], [0.68, M.green, -0.24], [0.44, M.blue, -0.28]].forEach(function (r) {
      var t = new T.Mesh(new T.TorusGeometry(r[0], 0.045, 12, 64), r[1]); t.position.z = r[2]; g.add(t);
    });
    var ap = new T.Mesh(new T.CircleGeometry(0.28, 9), M.black); ap.position.z = -0.34; g.add(ap);
  });
  addSeg(4.7, function (g) { g.add(cylZ(1.95, 1.5, 1.5, M.lensRubber, true)); var lip = new T.Mesh(new T.TorusGeometry(1.95, 0.04, 12, 80), M.black); lip.position.z = 0.75; g.add(lip); });

  cameraG.add(body, topPlate, grip, prism, topCtl, mount, rear, lens);

  // ---- sizing: keep the camera a steady share of the screen ----
  var staticMode = false, aspect = 1;
  function size() {
    var w = staticMode ? hero.clientWidth : window.innerWidth, h = staticMode ? hero.clientHeight : window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); aspect = w / h; cam.aspect = aspect; cam.updateProjectionMatrix();
    // wide screens: text sits left and right, the camera gets the whole middle
    var Hv = (w >= 900 && aspect >= 1.25) ? Math.max(7.6 / (0.34 * aspect), 4.4 / 0.46) : Math.max(7.6 / (0.78 * aspect), 4.4 / 0.24);
    cam.position.set(0, 0, Hv / (2 * Math.tan(FOV * Math.PI / 360)));
    cam.lookAt(0, 0, 0);
  }
  function placeStatic() {   // reduced motion: the camera lives inside the hero instead of floating over the page
    staticMode = true;
    canvas.style.position = 'absolute'; canvas.style.height = hero.offsetHeight + 'px'; canvas.style.top = hero.offsetTop + 'px'; canvas.style.zIndex = '3';
    size();
  }
  size();
  var lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', function () {   // ignore the phone address bar growing and shrinking while you scroll
    var w = window.innerWidth, h = window.innerHeight;
    if (w === lastW && Math.abs(h - lastH) < 120) return;
    lastW = w; lastH = h;
    if (staticMode) { canvas.style.height = hero.offsetHeight + 'px'; }
    size();
  });

  // ---- pose: a little turned so it reads as 3D, then follows the cursor ----
  var BASE = { y: -0.38, x: 0.14 }, tx = 0, ty = 0, seen = false;
  // where the journey group must sit so the rear screen fills the whole viewport
  function screenTarget() {
    var t = Math.tan(FOV * Math.PI / 360);
    var D = 3.38 * (lay.rw / SW) / (2 * t * aspect);   // the page-shaped part of the screen exactly fills the window
    return { x: 0.7, y: 0.7, z: cam.position.z - D - 3.925 };
  }
  var mouse = { k: 1 };
  function aim(x, y) { seen = true; tx = (x / window.innerWidth - 0.5) * 2; ty = (y / window.innerHeight - 0.5) * 2; }
  window.addEventListener('mousemove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('touchmove', function (e) { if (e.touches[0]) aim(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  // ---- build-up: piece by piece, horizontally along the lens axis ----
  var say = function () {};
  var bodyParts = [
    [body,     0.0,  { y: -7 },  'power3.out'],
    [topPlate, 0.45, { y: 6 },   'power3.out'],
    [grip,     0.7,  { x: -8 },  'back.out(1.5)'],
    [prism,    0.95, { y: 7 },   'back.out(1.4)'],
    [topCtl,   1.2,  { y: 3 },   'power3.out'],
    [rear,     1.3,  { z: -7 },  'power3.out']
  ];
  var build = gsap.timeline({ paused: true, timeScale: 4, defaults: { duration: 0.8, ease: 'power3.out' } });   // about 1.5 seconds
  var all = bodyParts.map(function (p) { return p[0]; }).concat([mount], seg);
  all.forEach(function (o) { o.visible = false; });
  bodyParts.forEach(function (p) {
    var o = p[0], vars = p[2]; vars.duration = 0.8; vars.ease = p[3];
    build.set(o, { visible: true }, p[1]).from(o.position, vars, p[1]);
  });
  build.call(function () { say('Fitting the mount'); }, null, 1.5)
       .set(mount, { visible: true }, 1.6).from(mount.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.5, ease: 'back.out(2)' }, 1.6)
       .call(function () { say('Mounting the lens'); }, null, 2.0);
  seg.forEach(function (s, i) {
    var t = 2.1 + i * 0.3;
    build.set(s, { visible: true }, t)
         .from(s.position, { z: s.position.z + 9, x: 3.5, duration: 0.85, ease: 'power3.out' }, t);
  });
  var lensEnd = 2.1 + (seg.length - 1) * 0.3 + 0.85;
  build.call(function () { say('Seating the glass'); }, null, lensEnd - 0.7)
       .to(lens.rotation, { z: 0.14, duration: 0.12, ease: 'power2.in' }, lensEnd)
       .to(lens.rotation, { z: 0, duration: 0.3, ease: 'back.out(3)' }, lensEnd + 0.12)
       .fromTo(flashLight, { intensity: 0 }, { intensity: 2.4, duration: 0.08, ease: 'none', immediateRender: false }, lensEnd + 0.12)
       .to(flashLight, { intensity: 0, duration: 0.5 }, lensEnd + 0.2)
       .from(rig.scale, { x: 0.94, y: 0.94, z: 0.94, duration: 0.5, ease: 'back.out(2)' }, lensEnd + 0.1)
       .call(function () { say('Ready'); }, null, lensEnd + 0.2)
       .from(rig.rotation, { y: -0.75, duration: lensEnd + 0.4, ease: 'power2.inOut' }, 0);

  if (reduce) { build.progress(1); placeStatic(); }

  // ---- render loop ----
  var clock = new T.Clock(), lastT = performance.now(), sumT = 0, nFrames = 0;
  frame();
  function frame() {
    requestAnimationFrame(frame);
    if (canvas.style.visibility === "hidden" || document.hidden) { lastT = performance.now(); return; }   // nothing is drawn once the camera has flown into the page
    var nowT = performance.now(); sumT += nowT - lastT; lastT = nowT;
    if (++nFrames === 40) {   // too slow? render fewer pixels instead of stuttering the whole page
      if (sumT / 40 > 26 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); size(); }
      sumT = 0; nFrames = 0;
    }
    var t = clock.getElapsedTime();
    var gx = seen ? tx : Math.sin(t * 0.6) * 0.5, gy = seen ? ty : Math.sin(t * 0.45) * 0.3;
    if (reduce) { gx = 0; gy = 0; }
    var k = mouse.k;
    tilt.rotation.y += (BASE.y + gx * 0.7 * k - tilt.rotation.y) * 0.07;
    tilt.rotation.x += (BASE.x + gy * 0.4 * k - tilt.rotation.x) * 0.07;
    tilt.position.y = reduce ? 0 : Math.sin(t * 1.1) * 0.08 * k;
    if (journey.rotation.y < -0.9 && (Math.abs(screenState.p - shownP) > 0.0004 || t - shownT > 0.4)) { shownP = screenState.p; shownT = t; paintScreen(t); }   // the screen only repaints while it can be seen
    renderer.render(scene, cam);
  }
  return {
    build: build, journey: journey, mouse: mouse, screen: screenState, pose: BASE, screenTarget: screenTarget,
    onSay: function (fn) { say = fn; }
  };
}

var cam = camera3d();

// ---------- Loader: runs the build-up, then reveals the page ----------
(function intro() {
  var loader = document.querySelector('.loader');
  if (!cam || !loader || !root.classList.contains('is-loading')) {
    if (cam && !root.classList.contains('is-loading')) { /* reduced motion: already built */ }
    finish(); return;
  }
  var num = loader.querySelector('.ld-num'), label = loader.querySelector('.ld-label');
  cam.onSay(function (text) { label.textContent = text; });
  var build = cam.build;
  build.eventCallback('onUpdate', function () { num.textContent = pad3(Math.round(Math.min(1, build.progress()) * 100)); });
  build.eventCallback('onComplete', function () {
    num.textContent = '100';
    announce();
    gsap.to(loader, { autoAlpha: 0, duration: 0.4, delay: 0.1, ease: 'power2.inOut', onComplete: finish });
  });
  build.play();
  loader.querySelector('.ld-skip').addEventListener('click', function () { build.timeScale(8); });
})();

// ---------- Helpers ----------
function splitWords(el) {
  var text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  text.split(' ').forEach(function (word, idx, arr) {
    var o = document.createElement('span'); o.className = 'wm'; o.setAttribute('aria-hidden', 'true');
    var s = document.createElement('span'); s.className = 'w'; s.textContent = word;
    o.appendChild(s); el.appendChild(o);
    if (idx < arr.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

var mm = gsap.matchMedia();

mm.add({
  motion: '(prefers-reduced-motion: no-preference)',
  wide: '(min-width: 900px)',
  tall: '(min-height: 620px)'
}, function (ctx) {
  var motion = ctx.conditions.motion;
  var pin = ctx.conditions.wide && ctx.conditions.tall;
  var cleanups = [];
  if (!motion) { return function () {}; }

  // ===== Hero text arrives once the camera is built =====
  splitWords(document.getElementById('headline'));
  var intro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  intro.from('.hero .eyebrow', { autoAlpha: 0, y: 12, duration: 0.7 }, 0)
       .from('.wm .w', { yPercent: 110, duration: 0.9, stagger: 0.06 }, 0.1)
       .from('.hero-foot, .scroll-hint', { autoAlpha: 0, y: 16, duration: 0.8, stagger: 0.1 }, 0.5);
  if (window.siteReady) { intro.play(); }
  else {
    var go = function () { intro.play(); };
    document.addEventListener('site:ready', go, { once: true });
    cleanups.push(function () { document.removeEventListener('site:ready', go); });
  }

  // ===== Scroll journey: the camera turns, flies into the screen, and you look through the lens =====
  var hero = document.querySelector('.hero');
  var vf = document.querySelector('.vf'), vig = document.querySelector('.vig');
  if (cam) {
    var jr = cam.journey;
    // ----- the reel: two connected film strips that wind across the background like snakes while the camera turns -----
    var reelEl = hero.querySelector('.reel');
    var reel = (function () {
      var photos = ['work-mask-series', 'capture-fashion', 'work-concrete-silk', 'capture-documentary', 'work-after-hours', 'capture-editorial', 'work-quiet-ones', 'more-laughing', 'work-glass-house', 'capture-portraits', 'more-over-shoulder', 'more-walking-linen'];
      // each frame shows only a glimpse: zoomed in on a different part of its photo
      var glimpse = ['50% 18%', '30% 30%', '68% 22%', '50% 55%', '40% 15%', '62% 40%', '35% 60%', '55% 28%'];
      var strips = [], active = false, built = false, prog = 0, fw = 200, fh = 210, last = performance.now(), timer, builtW = 0;
      function build() {
        reelEl.textContent = ''; strips = [];
        var W = window.innerWidth, small = W < 700, n = 0;
        builtW = W;
        fw = small ? Math.round(W * 0.22) : Math.round(Math.max(150, Math.min(250, W * 0.15))); fh = Math.round(fw * 1.08);
        var step = fw * 0.96, per = Math.ceil((W + fw * 3) / step) + 1;
        for (var s = 0; s < 2; s++) {
          var strip = { dir: s ? 1 : -1, speed: s ? 58 : 76, off: s * 200, phase: s * Math.PI, y: s ? 0.7 : 0.32, step: step, frames: [] };
          for (var i = 0; i < per; i++) {
            var f = document.createElement('div'); f.className = 'fr'; f.style.width = fw + 'px'; f.style.height = fh + 'px';
            f.style.padding = Math.round(fh * 0.13) + 'px 0';
            var pos = glimpse[(n + i * 3) % glimpse.length];
            var im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = 'images/' + photos[n++ % photos.length] + '.jpg';
            im.style.objectPosition = pos; im.style.transformOrigin = pos;
            var box = document.createElement('div'); box.className = 'ph'; box.appendChild(im); f.appendChild(box); reelEl.appendChild(f); strip.frames.push(f);
          }
          strip.total = per * step; strips.push(strip);
        }
        built = true;
      }
      function update() {
        var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!active || !built || document.hidden) return;
        var t = now / 1000, W = window.innerWidth, H = window.innerHeight;
        var amp = H * (0.09 + 0.06 * prog), k = Math.PI * 2 / (W * 2), boost = 1 + prog * 1.4;
        for (var s = 0; s < strips.length; s++) {
          var st = strips[s], cy = st.y * H;
          st.off += st.dir * st.speed * boost * dt;
          for (var i = 0; i < st.frames.length; i++) {
            var x = ((i * st.step + st.off) % st.total + st.total) % st.total - fw * 1.5;
            var a = x * k + t * 0.8 + st.phase;
            var y = cy + Math.sin(a) * amp, rot = Math.atan(Math.cos(a) * amp * k) * 180 / Math.PI;
            st.frames[i].style.transform = 'translate3d(' + (x - fw / 2).toFixed(1) + 'px,' + (y - fh / 2).toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
          }
        }
      }
      gsap.ticker.add(update);
      var onResize = function () { if (window.innerWidth !== builtW) { clearTimeout(timer); timer = setTimeout(build, 250); } };
      window.addEventListener('resize', onResize);
      // load the photos a moment after the intro, so they never compete with it
      var start = function () { setTimeout(function () { if (!built) build(); }, 500); };
      if (window.siteReady) start(); else document.addEventListener('site:ready', start, { once: true });
      cleanups.push(function () { gsap.ticker.remove(update); window.removeEventListener('resize', onResize); document.removeEventListener('site:ready', start); reelEl.textContent = ''; built = false; });
      return { set: function (p) { prog = p; active = p > 0.02 && p < 0.93; } };
    })();
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=330%', pin: true, scrub: 0.7, invalidateOnRefresh: true, onUpdate: function (self) { reel.set(self.progress); } }
    })
      .fromTo('.hero-copy, .hero-foot, .scroll-hint', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, duration: 0.16, immediateRender: false }, 0)
      .to('.reel', { autoAlpha: 0.95, duration: 0.14 }, 0.05)                       // photos start to drift in as the words fade
      .to('.reel', { autoAlpha: 0, duration: 0.1 }, 0.8)                             // and leave before the screen takes over
      .to(cam.mouse, { k: 0, duration: 0.2 }, 0)
      .to(cam.screen, { p: 1, duration: 0.5, ease: "none" }, 0.2)                    // the rear screen scrolls from the hero down to the first section
      .to(jr.rotation, { y: -1.45, duration: 0.3, ease: "power2.inOut" }, 0.02)       // turns to the side of the screen
      .to(jr.position, { x: 1.5, duration: 0.3, ease: "power2.inOut" }, 0.02)
      .to(jr.rotation, { y: -Math.PI, duration: 0.3, ease: "power2.inOut" }, 0.32)    // lens turns away, the screen faces you
      .to(jr.position, { x: 0.7, y: 0.7, duration: 0.3, ease: "power2.inOut" }, 0.32)
      .to(cam.pose, { y: 0, x: 0, duration: 0.22, ease: "power2.inOut" }, 0.4)       // square up to the screen
      .to(jr.position, { z: function () { return cam.screenTarget().z; }, duration: 0.3, ease: "power2.inOut" }, 0.62)   // and zoom in until the screen fills the page
      .to(cam.screen, { hud: 0, duration: 0.07, ease: "none" }, 0.88)                  // the screen's own readouts hand over to the real ones
      .to(vig, { autoAlpha: 1, duration: 0.08 }, 0.9)
      .to(vf, { autoAlpha: 1, duration: 0.08 }, 0.88)                                    // the viewfinder takes over
      .to(".flash", { opacity: 0.25, duration: 0.02 }, 0.955)
      .to(".flash", { opacity: 0, duration: 0.03 }, 0.975)
      .to(".cam3d", { autoAlpha: 0, duration: 0.03 }, 0.97)                            // the zoomed screen dissolves into the real page, same layout
      .fromTo(".hero", { backgroundColor: "rgba(239,227,200,1)" }, { backgroundColor: "rgba(239,227,200,0)", duration: 0.03, immediateRender: false }, 0.97);

    // viewfinder readouts follow the page: timecode from scroll, exposure from the section on screen
    // the bottom row of the viewfinder steps aside when the footer arrives, so the two never overlap
    var hideBottom = gsap.to(vf.querySelectorAll('.bl, .bc, .br, .c3, .c4'), { autoAlpha: 0, duration: 0.3, paused: true });
    ScrollTrigger.create({ trigger: 'footer', start: 'top 94%', onEnter: function () { hideBottom.play(); }, onLeaveBack: function () { hideBottom.reverse(); } });

    // the focus box follows the mouse like an autofocus point (it stays centred on touch screens)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var ret = vf.querySelector('.reticle');
      ret.style.left = '0'; ret.style.top = '0';
      gsap.set(ret, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      var rx = gsap.quickTo(ret, 'x', { duration: 0.3, ease: 'power3' }), ry = gsap.quickTo(ret, 'y', { duration: 0.3, ease: 'power3' });
      var aimBox = function (e) { rx(e.clientX); ry(e.clientY); };
      window.addEventListener('mousemove', aimBox, { passive: true });
      cleanups.push(function () { window.removeEventListener('mousemove', aimBox); });
    }

    var tc = vf.querySelector('.vf-tc'), frameEl = vf.querySelector('.vf-frame'), labelEl = vf.querySelector('.vf-label');
    var fEl = vf.querySelector('.vf-f'), sEl = vf.querySelector('.vf-s'), iEl = vf.querySelector('.vf-i');
    var shots = 1, pulseT;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var secs = self.progress * 180, f = Math.floor((secs % 1) * 24);
        tc.textContent = pad(Math.floor(secs / 3600)) + ':' + pad(Math.floor(secs / 60) % 60) + ':' + pad(Math.floor(secs) % 60) + ':' + pad(f);
      }
    });
    document.querySelectorAll('[data-vf]').forEach(function (sec) {
      var set = function () {
        var p = sec.getAttribute('data-vf').split('|');
        fEl.textContent = p[0]; sEl.textContent = p[1]; iEl.textContent = p[2]; labelEl.textContent = p[3];
        shots++; frameEl.textContent = ('000' + shots).slice(-4);
        vf.classList.remove('pulse'); void vf.offsetWidth; vf.classList.add('pulse');
        clearTimeout(pulseT); pulseT = setTimeout(function () { vf.classList.remove('pulse'); }, 800);
      };
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onEnter: set, onEnterBack: set });
    });
  }

  // ===== Scroll: what we capture, one subject at a time =====
  var cap = document.querySelector('.capture');
  if (pin) {
    var subs = gsap.utils.toArray('.subject');
    var total = subs.length, cur = 0;
    var count = cap.querySelector('.cap-count b'), bar = cap.querySelector('.cap-bar i');
    cap.classList.add('pinned', 'after-hero');
    gsap.set(subs, { autoAlpha: 0 });
    gsap.set(subs[0], { autoAlpha: 1 });
    var show = function (i) {
      var prev = subs[cur], next = subs[i];
      gsap.killTweensOf([prev, next]);
      gsap.to(prev, { autoAlpha: 0, y: -30, duration: 0.35, ease: 'power2.in' });
      gsap.fromTo(next, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
      gsap.fromTo(next.querySelector('.subject-art'), { scale: 1.12, clipPath: 'inset(0 0 100% 0)' }, { scale: 1, clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'power3.out', delay: 0.15 });
      count.textContent = pad(i + 1);
      cur = i;
    };
    ScrollTrigger.create({
      trigger: cap, start: 'top top', end: '+=' + (total * 70) + '%', pin: true,
      onUpdate: function (self) {
        var i = Math.min(total - 1, Math.floor(self.progress * total));
        if (i !== cur) show(i);
        gsap.set(bar, { scaleX: self.progress });
      }
    });
    cleanups.push(function () { cap.classList.remove('pinned', 'after-hero'); });
  }

  // ===== Scroll: gallery slides sideways =====
  var work = document.querySelector('.work');
  if (pin) {
    var track = work.querySelector('.track');
    var counter = work.querySelector('.counter b');
    var n = work.querySelectorAll('.panel:not(.panel-cta)').length;
    work.classList.add('pinned');
    track.removeAttribute('tabindex'); track.removeAttribute('role');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 1); };
    gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: work, start: 'top top', end: function () { return '+=' + dist(); },
        pin: true, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: function (self) { counter.textContent = pad(Math.min(n, Math.floor(self.progress * n) + 1)); }
      }
    });
    cleanups.push(function () {
      work.classList.remove('pinned');
      track.setAttribute('tabindex', '0'); track.setAttribute('role', 'region');
    });
  }

  // ===== Scroll: the frame opens up into the next level =====
  var level = document.querySelector('.level');
  if (pin) {
    level.classList.add('pinned');
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: level, start: 'top top', end: '+=240%', pin: true, scrub: 0.6 }
    })
      .to('.lv-intro', { autoAlpha: 0, y: -30, duration: 0.2 }, 0.05)
      .to('.lv-bg', { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.5 }, 0)
      .from('.lv-head', { autoAlpha: 0, y: 40, duration: 0.2 }, 0.5)
      .from('.lv-item', { autoAlpha: 0, y: 40, stagger: 0.12, duration: 0.2 }, 0.62)
      .to({}, { duration: 0.25 });
    cleanups.push(function () { level.classList.remove('pinned'); });
  }

  // ===== Scroll: the picture cards and tiles rise in one after another =====
  ['.proc-tiles .tile', '.svc-grid .svc'].forEach(function (sel) {
    gsap.from(sel, { y: 50, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: sel.split(' ')[0], start: 'top 82%', once: true } });
  });

  return function () { cleanups.forEach(function (fn) { fn(); }); };
});

if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); }
})();
