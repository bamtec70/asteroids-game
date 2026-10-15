/* ASTEROIDS - original-style browser tribute. All graphics drawn and all sound synthesized in code. */
(() => {
"use strict";
const W = 1024, H = 768;
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const wrap = (o) => { if (o.x < 0) o.x += W; else if (o.x >= W) o.x -= W; if (o.y < 0) o.y += H; else if (o.y >= H) o.y -= H; };

/* ---------- Vector font (stroke glyphs on a 4x6 grid) ---------- */
const G = {
 "0":[[0,0,4,0,4,6,0,6,0,0]], "1":[[2,0,2,6]], "2":[[0,0,4,0,4,3,0,3,0,6,4,6]], "3":[[0,0,4,0,4,6,0,6],[0,3,4,3]],
 "4":[[0,0,0,3,4,3],[4,0,4,6]], "5":[[4,0,0,0,0,3,4,3,4,6,0,6]], "6":[[0,0,0,6,4,6,4,3,0,3]], "7":[[0,0,4,0,4,6]],
 "8":[[0,0,4,0,4,6,0,6,0,0],[0,3,4,3]], "9":[[4,3,0,3,0,0,4,0,4,6]],
 A:[[0,6,0,2,2,0,4,2,4,6],[0,4,4,4]], B:[[0,0,0,6,3,6,4,5,4,4,3,3,0,3],[0,0,3,0,4,1,4,2,3,3]], C:[[4,0,0,0,0,6,4,6]],
 D:[[0,0,0,6,2,6,4,4,4,2,2,0,0,0]], E:[[4,0,0,0,0,6,4,6],[0,3,3,3]], F:[[4,0,0,0,0,6],[0,3,3,3]], G:[[4,2,4,0,0,0,0,6,4,6,4,4,2,4]],
 H:[[0,0,0,6],[4,0,4,6],[0,3,4,3]], I:[[0,0,4,0],[2,0,2,6],[0,6,4,6]], J:[[4,0,4,6,2,6,0,4]], K:[[0,0,0,6],[4,0,0,3,4,6]],
 L:[[0,0,0,6,4,6]], M:[[0,6,0,0,2,2,4,0,4,6]], N:[[0,6,0,0,4,6,4,0]], O:[[0,0,4,0,4,6,0,6,0,0]], P:[[0,6,0,0,4,0,4,3,0,3]],
 Q:[[0,0,4,0,4,4,2,6,0,6,0,0],[2,4,4,6]], R:[[0,6,0,0,4,0,4,3,0,3],[1,3,4,6]], S:[[4,0,0,0,0,3,4,3,4,6,0,6]], T:[[0,0,4,0],[2,0,2,6]],
 U:[[0,0,0,6,4,6,4,0]], V:[[0,0,2,6,4,0]], W:[[0,0,0,6,2,4,4,6,4,0]], X:[[0,0,4,6],[4,0,0,6]], Y:[[0,0,2,2,4,0],[2,2,2,6]],
 Z:[[0,0,4,0,0,6,4,6]], "-":[[1,3,3,3]], ".":[[2,5.6,2,6]], "/":[[4,0,0,6]], "!":[[2,0,2,4],[2,5.6,2,6]], "©":[[4,1,4,0,0,0,0,6,4,6,4,5]], ":":[[2,1,2,1.5],[2,4.5,2,5]]
};
function text(s, x, y, size, align = "left") {
 const sc = size / 6, adv = 6 * sc, w = s.length * adv - 2 * sc;
 if (align === "center") x -= w / 2; else if (align === "right") x -= w;
 ctx.beginPath();
 for (const ch of s) {
  const g = G[ch];
  if (g) for (const p of g) { ctx.moveTo(x + p[0] * sc, y + p[1] * sc); for (let i = 2; i < p.length; i += 2) ctx.lineTo(x + p[i] * sc, y + p[i + 1] * sc); }
  x += adv;
 }
 ctx.stroke();
}

/* ---------- Audio (Web Audio synthesis) ---------- */
let AC = null, master = null, muted = localStorage.getItem("asteroids_muted") === "1", noiseBuf = null;
function audio() {
 if (!AC) {
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
  AC = new C(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
 }
 if (AC.state === "suspended") AC.resume();
 return AC;
}
function setMute(m) { muted = m; localStorage.setItem("asteroids_muted", m ? "1" : "0"); if (master) master.gain.value = m ? 0 : 0.5; muteBtn.textContent = m ? "SOUND OFF" : "SOUND ON"; }
function tone(type, f0, f1, dur, vol) {
 if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
 o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
 g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
 o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, q = 0.7) {
 if (!AC) return; const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
 s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(60, t + dur); f.Q.value = q;
 g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
 s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
const sfx = {
 fire: () => tone("square", 1800, 180, 0.16, 0.12),
 saucerFire: () => tone("square", 1200, 300, 0.12, 0.08),
 bang: (sz) => sz === 0 ? noise(1.0, 0.9, 1400) : sz === 1 ? noise(0.6, 0.7, 2200) : noise(0.35, 0.6, 3500),
 beat: (hi) => tone("triangle", hi ? 62 : 55, hi ? 58 : 50, 0.11, 0.9),
 extra: () => { if (!AC) return; [0, 0.09, 0.18, 0.27, 0.36, 0.45].forEach((d, i) => setTimeout(() => tone("square", i % 2 ? 1400 : 1050, i % 2 ? 1400 : 1050, 0.07, 0.06), d * 1000)); },
 hyper: () => tone("sine", 200, 2000, 0.25, 0.1)
};
let thrustNode = null;
function thrustSound(on) {
 if (!AC) return;
 if (on && !thrustNode) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = "lowpass"; f.frequency.value = 380; g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.55, AC.currentTime + 0.05);
  s.connect(f); f.connect(g); g.connect(master); s.start(); thrustNode = { s, g };
 } else if (!on && thrustNode) {
  const n = thrustNode; thrustNode = null; n.g.gain.cancelScheduledValues(AC.currentTime);
  n.g.gain.setValueAtTime(n.g.gain.value, AC.currentTime); n.g.gain.linearRampToValueAtTime(0, AC.currentTime + 0.08); n.s.stop(AC.currentTime + 0.1);
 }
}
let saucerNode = null;
function saucerSound(kind) { // kind: null | 0 big | 1 small
 if (!AC) return;
 if (saucerNode && saucerNode.kind !== kind) { saucerNode.o.stop(); saucerNode.l.stop(); saucerNode = null; }
 if (kind === null || saucerNode) return;
 const o = AC.createOscillator(), l = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain();
 o.type = "square"; o.frequency.value = kind ? 1000 : 600; l.type = "square"; l.frequency.value = kind ? 8 : 5; lg.gain.value = kind ? 160 : 110;
 l.connect(lg); lg.connect(o.frequency); g.gain.value = 0.05; o.connect(g); g.connect(master); o.start(); l.start();
 saucerNode = { o, l, kind };
}

/* ---------- Shapes ---------- */
const SHIP = [[16, 0], [-10, -9], [-6, -6], [-6, 6], [-10, 9]]; // nose, left wing, notch, notch, right wing (closed)
const FLAME = [[-6, -4], [-17, 0], [-6, 4]];
const ROCK_SHAPES = [
 [[0,-4],[2,-4],[4,-2],[4,0],[3,2],[1,4],[-2,4],[-1,2],[-4,2],[-4,-1],[-2,-2],[-2,-4]].map(([x,y])=>[x,y]),
 [[-1,-4],[2,-4],[4,-1],[4,1],[2,4],[0,4],[0,1],[-2,4],[-4,1],[-2,0],[-4,-1],[-2,-4]],
 [[-2,-4],[0,-3],[2,-4],[4,-2],[3,0],[4,2],[1,4],[-2,4],[-4,2],[-4,-2]],
 [[-1,-4],[2,-4],[4,-2],[4,1],[1,4],[-2,4],[-1,1],[-4,1],[-4,-2],[-1,-2]]
];
const ROCK_R = [40, 20, 10], ROCK_SCALE = [10, 5, 2.5], ROCK_PTS = [20, 50, 100];
const SAUCER = [[-1,-2],[1,-2],[2,-1],[5,0.5],[2,2],[-2,2],[-5,0.5],[-2,-1]];

function poly(pts, x, y, a, sc, closed = true) {
 const c = Math.cos(a), s = Math.sin(a);
 ctx.beginPath();
 pts.forEach(([px, py], i) => { const X = x + (px * c - py * s) * sc, Y = y + (px * s + py * c) * sc; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
 if (closed) ctx.closePath(); ctx.stroke();
}
function drawWrapped(fn, x, y, r) { // draw at wrapped positions near edges
 fn(x, y);
 const xs = [0], ys = [0]; if (x < r) xs.push(W); if (x > W - r) xs.push(-W); if (y < r) ys.push(H); if (y > H - r) ys.push(-H);
 for (const dx of xs) for (const dy of ys) if (dx || dy) fn(x + dx, y + dy);
}

/* ---------- State ---------- */
let high = +localStorage.getItem("asteroids_high") || 0;
let state = "attract"; // attract | play | gameover | paused
let score, lives, nextExtra, wave, ship, bullets, sBullets, rocks, debris, saucer, saucerTimer, respawnTimer, beatTimer, beatInterval, beatHi, waveTimer, overTimer, blink = 0;
const keys = {};

function newRocks(n) {
 for (let i = 0; i < n; i++) {
  let x, y;
  if (Math.random() < 0.5) { x = rnd(0, W); y = Math.random() < 0.5 ? 0 : H - 1; } else { x = Math.random() < 0.5 ? 0 : W - 1; y = rnd(0, H); }
  rocks.push(makeRock(x, y, 0));
 }
}
function makeRock(x, y, size, speedBoost = 1) {
 const a = rnd(0, TAU), sp = rnd(40, 90) * (1 + size * 0.45) * speedBoost;
 return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, shape: (Math.random() * 4) | 0, rot: Math.random() < 0.5 ? 0 : Math.PI };
}
function resetShip() { ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, thrust: false, alive: true, inv: 0, hyper: 0 }; }
function startGame() {
 audio();
 score = 0; lives = 3; nextExtra = 10000; wave = 0; bullets = []; sBullets = []; rocks = []; debris = [];
 saucer = null; saucerTimer = rnd(10, 15); respawnTimer = 0; beatTimer = 1; beatInterval = 1; beatHi = false; waveTimer = 0;
 resetShip(); nextWave(); state = "play";
}
function nextWave() { wave++; newRocks(Math.min(4 + (wave - 1) * 2, 11)); beatInterval = 1; }
function initAttract() { rocks = []; bullets = []; sBullets = []; debris = []; saucer = null; ship = null; newRocks(6); saucerTimer = 6; }
initAttract();

function addScore(p) {
 score += p;
 if (score >= nextExtra) { lives++; nextExtra += 10000; sfx.extra(); }
 if (score > high) { high = score; localStorage.setItem("asteroids_high", String(high)); }
}
function explode(x, y, n, spd = 120) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(20, spd); debris.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(0.5, 1.1) }); } }
function shipDebris() { // wireframe pieces of the ship drifting apart
 const pts = SHIP.map(([px, py]) => { const c = Math.cos(ship.a), s = Math.sin(ship.a); return [ship.x + px * c - py * s, ship.y + px * s + py * c]; });
 for (let i = 0; i < pts.length; i++) {
  const p = pts[i], q = pts[(i + 1) % pts.length], a = rnd(0, TAU), s = rnd(15, 50);
  debris.push({ line: true, x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, dx: (q[0] - p[0]) / 2, dy: (q[1] - p[1]) / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, spin: rnd(-3, 3), t: rnd(1.5, 2.5) });
 }
}
function killShip() {
 if (!ship.alive) return;
 sfx.bang(0); shipDebris(); explode(ship.x, ship.y, 8); ship.alive = false; thrustSound(false); lives--; respawnTimer = 2.5;
}
function splitRock(i, viaPlayer) {
 const r = rocks[i]; rocks.splice(i, 1); sfx.bang(r.size); explode(r.x, r.y, 6 + (2 - r.size) * 3);
 if (viaPlayer) addScore(ROCK_PTS[r.size]);
 if (r.size < 2) for (let k = 0; k < 2; k++) rocks.push(makeRock(r.x, r.y, r.size + 1, 1 + wave * 0.03));
}
function spawnSaucer() {
 const small = state === "play" && (score >= 40000 || Math.random() < Math.min(0.15 + score / 20000, 0.85));
 const dir = Math.random() < 0.5 ? 1 : -1;
 saucer = { x: dir > 0 ? 0 : W - 1, y: rnd(H * 0.1, H * 0.9), vx: dir * (small ? 170 : 120), vy: 0, small, fire: 1, turn: rnd(1, 2.5), r: small ? 10 : 20 };
}
function dist2(a, b) { let dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y); return dx * dx + dy * dy; }

/* ---------- Update ---------- */
function update(dt) {
 blink += dt;
 const playing = state === "play";
 // ship
 if (playing && ship) {
  if (ship.alive) {
   const L = keys.left, R = keys.right;
   if (L) ship.a -= 4.4 * dt; if (R) ship.a += 4.4 * dt;
   ship.thrust = !!keys.thrust;
   if (ship.thrust) { ship.vx += Math.cos(ship.a) * 340 * dt; ship.vy += Math.sin(ship.a) * 340 * dt; }
   const sp = Math.hypot(ship.vx, ship.vy), max = 520; if (sp > max) { ship.vx *= max / sp; ship.vy *= max / sp; }
   const fr = Math.pow(0.55, dt); ship.vx *= fr; ship.vy *= fr;
   thrustSound(ship.thrust);
   ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
   if (ship.inv > 0) ship.inv -= dt;
   if (keys.fireEdge) { keys.fireEdge = false; if (bullets.length < 4) {
    bullets.push({ x: ship.x + Math.cos(ship.a) * 16, y: ship.y + Math.sin(ship.a) * 16, vx: ship.vx + Math.cos(ship.a) * 620, vy: ship.vy + Math.sin(ship.a) * 620, t: 0.95 }); sfx.fire(); } }
   if (keys.hyperEdge) { keys.hyperEdge = false; sfx.hyper(); ship.alive = false; ship.hyper = 0.6; thrustSound(false); }
  } else if (ship.hyper > 0) {
   ship.hyper -= dt;
   if (ship.hyper <= 0) { ship.x = rnd(40, W - 40); ship.y = rnd(40, H - 40); ship.vx = ship.vy = 0; ship.alive = true;
    if (Math.random() < 0.2 + rocks.length / 120) { ship.alive = true; killShip(); } } // original: hyperspace can kill you
  } else if (respawnTimer > 0) {
   respawnTimer -= dt;
   if (respawnTimer <= 0) {
    if (lives <= 0) { state = "gameover"; overTimer = 5; saucerSound(null); }
    else { // wait for a clear center like the original
     const c = { x: W / 2, y: H / 2 };
     if (rocks.some(r => dist2(r, c) < 130 * 130) || (saucer && dist2(saucer, c) < 150 * 150)) respawnTimer = 0.1;
     else { resetShip(); ship.inv = 0; }
    }
   }
  }
 }
 keys.fireEdge = keys.hyperEdge = false;
 // bullets
 for (const arr of [bullets, sBullets]) for (let i = arr.length - 1; i >= 0; i--) { const b = arr[i]; b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.t -= dt; if (b.t <= 0) arr.splice(i, 1); }
 // rocks
 for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; wrap(r); }
 // debris
 for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.x += d.vx * dt; d.y += d.vy * dt; if (d.spin) { const c = Math.cos(d.spin * dt), s = Math.sin(d.spin * dt), dx = d.dx; d.dx = dx * c - d.dy * s; d.dy = dx * s + d.dy * c; } d.t -= dt; if (d.t <= 0) debris.splice(i, 1); }
 // saucer
 if (!saucer) { saucerTimer -= dt; if (saucerTimer <= 0 && (state !== "play" || ship)) spawnSaucer(); }
 if (saucer) {
  const s = saucer; s.x += s.vx * dt; s.y += s.vy * dt; if (s.y < 0) s.y += H; if (s.y >= H) s.y -= H;
  s.turn -= dt; if (s.turn <= 0) { s.turn = rnd(0.8, 2); s.vy = [0, 1, -1][(Math.random() * 3) | 0] * Math.abs(s.vx) * 0.7; }
  s.fire -= dt;
  if (s.fire <= 0) {
   s.fire = s.small ? 0.8 : 1.1; let a = rnd(0, TAU);
   if (s.small && ship && ship.alive) { const err = Math.max(0.05, 0.35 - score / 100000); a = Math.atan2(ship.y - s.y, ship.x - s.x) + rnd(-err, err); }
   if (sBullets.length < 2) { sBullets.push({ x: s.x, y: s.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, t: 1.0 }); if (playing) sfx.saucerFire(); }
  }
  if (s.x < -30 || s.x > W + 30) { saucer = null; saucerTimer = rnd(7, 12) * Math.max(0.5, 1 - wave * 0.05); }
 }
 if (playing) saucerSound(saucer ? (saucer.small ? 1 : 0) : null);
 // collisions: player bullets
 for (let i = bullets.length - 1; i >= 0; i--) {
  const b = bullets[i]; let hit = false;
  for (let j = rocks.length - 1; j >= 0; j--) if (dist2(b, rocks[j]) < ROCK_R[rocks[j].size] ** 2) { splitRock(j, playing); hit = true; break; }
  if (!hit && saucer && dist2(b, saucer) < (saucer.r + 2) ** 2) { if (playing) addScore(saucer.small ? 990 : 200); sfx.bang(saucer.small ? 1 : 0); explode(saucer.x, saucer.y, 14); saucer = null; saucerTimer = rnd(7, 12); hit = true; }
  if (hit) bullets.splice(i, 1);
 }
 // saucer bullets vs rocks / ship
 for (let i = sBullets.length - 1; i >= 0; i--) {
  const b = sBullets[i]; let hit = false;
  for (let j = rocks.length - 1; j >= 0; j--) if (dist2(b, rocks[j]) < ROCK_R[rocks[j].size] ** 2) { splitRock(j, false); hit = true; break; }
  if (!hit && playing && ship && ship.alive && dist2(b, ship) < 13 * 13) { killShip(); hit = true; }
  if (hit) sBullets.splice(i, 1);
 }
 // saucer vs rocks
 if (saucer) for (let j = rocks.length - 1; j >= 0; j--) if (dist2(saucer, rocks[j]) < (ROCK_R[rocks[j].size] + saucer.r * 0.7) ** 2) { splitRock(j, false); explode(saucer.x, saucer.y, 14); sfx.bang(1); saucer = null; saucerTimer = rnd(7, 12); break; }
 // ship vs rocks / saucer
 if (playing && ship && ship.alive) {
  for (let j = rocks.length - 1; j >= 0; j--) if (dist2(ship, rocks[j]) < (ROCK_R[rocks[j].size] + 10) ** 2) { splitRock(j, true); killShip(); break; }
  if (ship.alive && saucer && dist2(ship, saucer) < (saucer.r + 10) ** 2) { addScore(saucer.small ? 990 : 200); explode(saucer.x, saucer.y, 14); saucer = null; saucerTimer = rnd(7, 12); killShip(); }
 }
 // waves + heartbeat
 if (playing) {
  if (!rocks.length) { if (waveTimer <= 0) waveTimer = 2; waveTimer -= dt; if (waveTimer <= 0) nextWave(); }
  if (ship && (ship.alive || ship.hyper > 0)) {
   beatTimer -= dt;
   if (beatTimer <= 0) { beatHi = !beatHi; sfx.beat(beatHi); beatInterval = Math.max(0.18, beatInterval - 0.012);
    const n = rocks.length; beatTimer = Math.max(0.18, Math.min(beatInterval, 0.2 + n * 0.035)); }
  }
 } else if (state === "attract" && !rocks.length) newRocks(6);
 if (state === "gameover") { overTimer -= dt; if (overTimer <= 0) { state = "attract"; } }
 if (state !== "play") { thrustSound(false); if (state !== "paused") saucerSound(null); }
}

/* ---------- Render ---------- */
function render() {
 ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
 ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.lineCap = "round";
 ctx.shadowColor = "rgba(255,255,255,0.8)"; ctx.shadowBlur = 4;
 for (const r of rocks) drawWrapped((x, y) => poly(ROCK_SHAPES[r.shape], x, y, r.rot, ROCK_SCALE[r.size]), r.x, r.y, ROCK_R[r.size] + 2);
 if (saucer) { const s = saucer, sc = s.small ? 2.2 : 4.4; poly(SAUCER, s.x, s.y, 0, sc); ctx.beginPath(); ctx.moveTo(s.x - 2 * sc, s.y - sc); ctx.lineTo(s.x + 2 * sc, s.y - sc); ctx.moveTo(s.x - 5 * sc, s.y + 0.5 * sc); ctx.lineTo(s.x + 5 * sc, s.y + 0.5 * sc); ctx.stroke(); }
 if (ship && ship.alive && (state === "play" || state === "paused")) {
  drawWrapped((x, y) => { poly(SHIP, x, y, ship.a, 1); if (ship.thrust && (blink * 30 | 0) % 2) poly(FLAME, x, y, ship.a, 1, false); }, ship.x, ship.y, 20);
 }
 for (const b of bullets.concat(sBullets)) ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
 for (const d of debris) { if (d.line) { ctx.beginPath(); ctx.moveTo(d.x - d.dx, d.y - d.dy); ctx.lineTo(d.x + d.dx, d.y + d.dy); ctx.stroke(); } else ctx.fillRect(d.x - 1, d.y - 1, 2, 2); }
 // HUD
 ctx.lineWidth = 2;
 const sc = state === "attract" ? "00" : String(score).padStart(2, "0");
 text(sc, 200, 24, 30, "right");
 text(String(high).padStart(2, "0"), W / 2, 30, 18, "center");
 if (state !== "attract") for (let i = 0; i < Math.min(lives, 10); i++) poly(SHIP, 186 - i * 22, 76, -Math.PI / 2, 0.85);
 text("© 1979 TRIBUTE", W / 2, H - 28, 14, "center");
 if (state === "attract") {
  ctx.lineWidth = 3; text("ASTEROIDS", W / 2, 230, 64, "center"); ctx.lineWidth = 2;
  if ((blink * 1.6 | 0) % 2 === 0) text("INSERT COIN", W / 2, 360, 26, "center");
  text("PRESS START", W / 2, 410, 22, "center");
  text("SPACE OR TAP TO PLAY", W / 2, 450, 14, "center");
  text("1 COIN 1 PLAY", W / 2, 540, 16, "center");
  text("HIGH SCORE " + high, W / 2, 580, 16, "center");
  text("BONUS SHIP EVERY 10000", W / 2, 620, 14, "center");
 } else if (state === "gameover") {
  text("GAME OVER", W / 2, 320, 36, "center");
  if (score >= high && score > 0) text("NEW HIGH SCORE", W / 2, 390, 20, "center");
 } else if (state === "paused") text("PAUSED", W / 2, 340, 32, "center");
 else if (ship && !ship.alive && ship.hyper <= 0 && respawnTimer > 0 && lives > 0 && respawnTimer < 1.5) text("PLAYER 1", W / 2, 320, 24, "center");
 if (state === "play" && score === 0 && wave === 1 && ship && ship.alive && blink < 2.5) text("PLAYER 1", W / 2, 260, 24, "center");
 ctx.shadowBlur = 0;
}

/* ---------- Input ---------- */
function pressStart() { if (state === "attract" || (state === "gameover" && overTimer < 3.5)) { blink = 0; startGame(); return true; } return false; }
const KMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "thrust", KeyW: "thrust" };
addEventListener("keydown", (e) => {
 audio();
 if (KMAP[e.code]) { keys[KMAP[e.code]] = true; e.preventDefault(); }
 if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); if (e.repeat) return; if (!pressStart() && state === "play") keys.fireEdge = true; }
 if ((e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "ArrowDown" || e.code === "KeyS") && !e.repeat && state === "play") { keys.hyperEdge = true; e.preventDefault(); }
 if (e.code === "KeyP" || e.code === "Escape") togglePause();
 if (e.code === "KeyM") setMute(!muted);
});
addEventListener("keyup", (e) => { if (KMAP[e.code]) keys[KMAP[e.code]] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; if (state === "play") togglePause(); });
function togglePause() { if (state === "play") state = "paused"; else if (state === "paused") state = "play"; }
const muteBtn = document.getElementById("btn-mute");
muteBtn.addEventListener("click", () => { audio(); setMute(!muted); muteBtn.blur(); });
setMute(muted);
cv.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); if (!pressStart() && state === "paused") togglePause(); });
const isTouch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || "ontouchstart" in window;
if (isTouch) document.body.classList.add("touch");
document.querySelectorAll(".tbtn").forEach((el) => {
 const k = el.dataset.k;
 const down = (e) => { e.preventDefault(); audio(); el.setPointerCapture?.(e.pointerId); el.classList.add("active");
  if (pressStart()) return; if (state === "paused") togglePause();
  if (k === "fire") keys.fireEdge = true; else if (k === "hyper") keys.hyperEdge = true; else keys[k] = true; };
 const up = (e) => { e.preventDefault(); el.classList.remove("active"); if (k !== "fire" && k !== "hyper") keys[k] = false; };
 el.addEventListener("pointerdown", down); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("pointerleave", up);
 el.addEventListener("contextmenu", (e) => e.preventDefault());
});
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

/* ---------- Loop ---------- */
let last = performance.now();
function frame(t) {
 const dt = Math.min(0.05, (t - last) / 1000); last = t;
 if (state !== "paused") update(dt);
 render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
