'use strict';
(() => {
const VW = 256, VH = 224, TS = 16;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const TOUCH = !!window.IS_TOUCH;
const FONT = '"Press Start 2P", "Courier New", monospace';

// ---------------------------------------------------------------- input
const keys = {}; let pressed = {};
const BLOCK = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
addEventListener('keydown', e => {
  if (BLOCK.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  Snd.init();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const any = (...c) => c.some(k => keys[k]);
const anyP = (...c) => c.some(k => pressed[k]);
const K = {
  left: () => any('ArrowLeft', 'KeyA'), right: () => any('ArrowRight', 'KeyD'), down: () => any('ArrowDown', 'KeyS'),
  run: () => any('ShiftLeft', 'ShiftRight', 'KeyX', 'KeyK'),
  jumpHeld: () => any('Space', 'KeyZ', 'ArrowUp', 'KeyW', 'KeyJ'),
  jumpPress: () => anyP('Space', 'KeyZ', 'ArrowUp', 'KeyW', 'KeyJ'),
  start: () => anyP('Enter'),
};

// ---------------------------------------------------------------- estado
const G = {
  state: 'title', t: 0, level: 1, lives: 3, score: 0, coins: 0, dragon: 0, dragonTotal: 0, time: 300, tick: 0,
  L: null, ai: 0, A: null, cam: { x: 0 }, popups: [], parts: [], msg: null, paused: false,
  checkpoint: {}, fade: 0, shake: 0, timer: 0, clearInfo: null, stompChain: 0,
};
window.__G = G;
let P = null;

const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const cx = e => e.x + e.w / 2;

// ---------------------------------------------------------------- tiles / colisão
function tileAt(a, tx, ty) {
  if (tx < 0 || tx >= a.cols) return 1;
  if (ty < 0 || ty >= ROWS) return 0;
  return a.tiles[ty * a.cols + tx];
}
const solid = (a, tx, ty) => tileAt(a, tx, ty) !== 0;

function collideX(e, a) {
  const top = Math.floor(e.y / TS), bot = Math.floor((e.y + e.h - 0.01) / TS);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / TS);
    for (let ty = top; ty <= bot; ty++) if (solid(a, tx, ty)) { e.x = tx * TS - e.w; e.vx = 0; return true; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TS);
    for (let ty = top; ty <= bot; ty++) if (solid(a, tx, ty)) { e.x = (tx + 1) * TS; e.vx = 0; return true; }
  }
  return false;
}
function collideY(e, a) {
  const l = Math.floor(e.x / TS), r = Math.floor((e.x + e.w - 0.01) / TS);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / TS);
    for (let tx = l; tx <= r; tx++) if (solid(a, tx, ty)) { e.y = ty * TS - e.h; e.vy = 0; return 1; }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TS);
    let best = null, bd = 1e9;
    for (let tx = l; tx <= r; tx++) if (solid(a, tx, ty)) {
      const d = Math.abs(tx * TS + 8 - (e.x + e.w / 2));
      if (d < bd) { bd = d; best = tx; }
    }
    if (best !== null) { e.y = (ty + 1) * TS; e.vy = 0; return { ceil: { tx: best, ty } }; }
  }
  return 0;
}
function moveE(e, a) {
  const r = { x: false, gnd: false, ceil: null };
  e.x += e.vx;
  if (e.vx !== 0 && collideX(e, a)) r.x = true;
  e.y += e.vy;
  const c = collideY(e, a);
  if (c === 1) r.gnd = true; else if (c && c.ceil) r.ceil = c.ceil;
  e.onGround = r.gnd;
  return r;
}

// ---------------------------------------------------------------- utilidades de jogo
function addScore(n, x, y) {
  G.score += n;
  if (x !== undefined) G.popups.push({ x, y, txt: String(n), t: 0 });
}
function popup(txt, x, y) { G.popups.push({ x, y, txt, t: 0 }); }
function addLife(x, y) { G.lives++; Snd.play('1up'); if (x !== undefined) popup('1UP', x, y); }
function addCoin() {
  G.coins++; G.score += 10; Snd.play('coin');
  if (G.coins >= 100) { G.coins -= 100; addLife(); }
}

const SIZES = {
  bandit: [12, 14], coyote: [14, 10], tatu: [12, 14], shell: [12, 11], cannon: [14, 12], sheriff: [12, 23],
  mole: [12, 12], cactus: [10, 16], mushroom: [12, 12], oneup: [12, 12], horse: [20, 16], coin: [8, 14],
  dcoin: [12, 14], sign: [16, 16], popcoin: [8, 14],
};
function mkEnt(kind, x, y, extra) {
  const [w, h] = SIZES[kind];
  return Object.assign({ kind, x, y, w, h, vx: 0, vy: 0, dir: -1, active: false, dead: false, t: 0, onGround: false }, extra || {});
}
function spawn(a, s) {
  const [w, h] = SIZES[s.kind];
  const x = s.tx * TS + (TS - w) / 2, y = (s.ty + 1) * TS - h;
  const e = mkEnt(s.kind, x, y);
  switch (s.kind) {
    case 'bandit': e.dir = -1; e.hp = 1; break;
    case 'tatu': e.dir = -1; break;
    case 'shell': e.state = 'still'; e.active = true; break;
    case 'sheriff': e.hp = 3; e.stun = 0; e.jt = 60 + ((Math.random() * 60) | 0); break;
    case 'mole': e.state = 'wait'; e.y = (s.ty + 1) * TS; e.groundY = (s.ty + 1) * TS; e.vis = false; break;
    case 'cactus': e.baseY = s.ty * TS; e.x = s.tx * TS + 11; e.y = e.baseY + 2; e.phase = 0; e.t = (Math.random() * 90) | 0; break;
    case 'coin': case 'dcoin': e.active = true; e.x = s.tx * TS + (TS - w) / 2; break;
    case 'sign': e.text = s.text; e.active = true; break;
    case 'coyote': e.dir = -1; break;
  }
  return e;
}

// ---------------------------------------------------------------- carregar fase
function loadLevel(n, useCheckpoint) {
  const L = LEVELS[n]();
  G.L = L; G.level = n;
  for (const a of L.areas) a.ents = a.specs.map(s => spawn(a, s));
  G.ai = 0; G.A = L.areas[0];
  G.time = L.time; G.tick = 0; G.dragon = 0;
  G.popups = []; G.parts = []; G.msg = null; G.clearInfo = null; G.stompChain = 0;
  L.midPassed = false; L.goalT = 0;
  const cp = useCheckpoint && G.checkpoint[n];
  const st = cp ? { tx: cp.tx, ty: 11 } : L.start;
  P = {
    x: st.tx * TS + 3, y: (st.ty + 1) * TS - 15, w: 10, h: 15, vx: 0, vy: 0, dir: 1, onGround: false,
    big: false, mounted: false, coyote: 0, jumpBuf: 0, inv: 0, anim: 0, jumping: false, kick: 0,
  };
  if (cp) L.midPassed = true;
  G.cam.x = Math.max(0, Math.min(P.x - 100, G.A.cols * TS - VW));
  G.P = P;
}
function setPlayerSize() {
  const w = P.mounted ? 14 : 10, h = (P.big ? 23 : 15) + (P.mounted ? 10 : 0);
  const bottom = P.y + P.h, c = P.x + P.w / 2;
  P.w = w; P.h = h; P.x = c - w / 2; P.y = bottom - h;
}

function startGame() {
  G.lives = 3; G.score = 0; G.coins = 0; G.dragonTotal = 0; G.checkpoint = {};
  const m = /[?&]level=(\d)/.exec(location.search);
  beginLevel(m ? Math.min(LEVEL_COUNT, +m[1]) : 1, false);
}
function beginLevel(n, cp) {
  loadLevel(n, cp);
  G.state = 'intro'; G.timer = 110;
  Snd.stopMusic();
}
function playMusic() { Snd.startMusic(TRACKS[G.A.theme === 'under' ? 'under' : G.L.track]); }

// ---------------------------------------------------------------- jogador
function hurtPlayer() {
  if (P.inv > 0 || G.state !== 'play') return;
  if (P.mounted) {
    P.mounted = false; setPlayerSize(); P.inv = 100; Snd.play('hurt'); P.vy = -3;
    const h = mkEnt('horse', P.x, P.y + P.h - 16, { state: 'flee', dir: -P.dir, vx: -P.dir * 2.2, active: true, vy: -2 });
    G.A.ents.push(h);
  } else if (P.big) {
    P.big = false; setPlayerSize(); P.inv = 100; Snd.play('hurt');
  } else killPlayer();
}
function killPlayer() {
  if (G.state !== 'play') return;
  G.state = 'dying'; G.timer = 0; P.dead = true; P.vx = 0; P.vy = 0; P.mounted = false;
  Snd.stopMusic(); Snd.play('die');
}
function powerUp() {
  if (!P.big) { P.big = true; setPlayerSize(); Snd.play('power'); addScore(1000, P.x, P.y - 8); }
  else { addScore(1000, P.x, P.y - 8); Snd.play('coin'); }
}
function mount(h) {
  h.dead = true; h.remove = true;
  P.mounted = true; setPlayerSize(); P.inv = 0;
  Snd.play('mount'); addScore(1000, P.x, P.y - 12);
}

function updatePlayer() {
  const p = P, a = G.A;
  const l = K.left(), r = K.right(), run = K.run();
  const maxv = (run ? 2.1 : 1.25) + (p.mounted ? 0.25 : 0);
  const acc = run ? 0.1 : 0.075;
  let ax = 0;
  if (l && !r) ax = -1; else if (r && !l) ax = 1;
  if (ax) {
    if (Math.sign(p.vx) === -ax && Math.abs(p.vx) > 0.3) p.vx += ax * 0.2;
    else if (Math.abs(p.vx) < maxv) p.vx += ax * acc * (p.onGround ? 1 : 0.85);
    else if (p.onGround) p.vx -= Math.sign(p.vx) * 0.04;
    if (Math.abs(p.vx) > maxv + 0.5) p.vx = Math.sign(p.vx) * (maxv + 0.5);
    p.dir = ax;
  } else if (p.onGround) {
    const f = 0.08;
    p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
  }

  if (K.jumpPress()) p.jumpBuf = 6; else if (p.jumpBuf > 0) p.jumpBuf--;
  if (p.onGround) p.coyote = 5; else if (p.coyote > 0) p.coyote--;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = -(6.0 + Math.abs(p.vx) * 0.25 + (p.mounted ? 0.5 : 0));
    p.jumpBuf = 0; p.coyote = 0; p.jumping = true; Snd.play('jump');
  }
  const held = K.jumpHeld();
  const g = (p.vy < 0 && held) ? 0.3 : 0.62;
  p.vy = Math.min(p.vy + g, 5.8);

  // entrar no cano
  if (K.down() && p.onGround && !G.pipe) {
    for (const pi of a.pipes) {
      if (Math.abs(p.y + p.h - pi.ty * TS) < 1.5 && Math.abs(cx(p) - (pi.tx * TS + 16)) < 9) {
        G.pipe = { pi, phase: 'in', t: 0 }; G.state = 'pipe'; Snd.play('pipe'); p.vx = 0;
        return;
      }
    }
  }

  const res = moveE(p, a);
  if (res.ceil) hitBlock(a, res.ceil.tx, res.ceil.ty, true);
  if (p.onGround) { G.stompChain = 0; p.jumping = false; }
  if (p.x < G.cam.x) { p.x = G.cam.x; p.vx = Math.max(p.vx, 0); }
  if (p.x + p.w > a.cols * TS) { p.x = a.cols * TS - p.w; p.vx = 0; }
  if (p.inv > 0) p.inv--;
  if (p.kick > 0) p.kick--;

  p.anim += Math.abs(p.vx) * 0.12 + 0.02;
  if (p.y > VH + 20) killPlayer();
}

// ---------------------------------------------------------------- blocos
function bump(a, key) { a.bumps[key] = 10; }
function hitBlock(a, tx, ty, byPlayer) {
  const t = tileAt(a, tx, ty), key = ty * a.cols + tx;
  if (t === T.QUEST) {
    const c = a.contents[key] || 'coin';
    delete a.contents[key];
    setT(a, tx, ty, T.USED); bump(a, key); giveContent(a, c, tx, ty);
  } else if (t === T.BRICK) {
    const c = a.contents[key];
    if (c === 'coins') {
      a.multi = a.multi || {};
      a.multi[key] = (a.multi[key] || 0) + 1;
      bump(a, key); giveContent(a, 'coin', tx, ty);
      if (a.multi[key] >= 8) { setT(a, tx, ty, T.USED); delete a.contents[key]; }
    } else if (c) {
      delete a.contents[key]; setT(a, tx, ty, T.USED); bump(a, key); giveContent(a, c, tx, ty);
    } else if (P.big) {
      setT(a, tx, ty, T.EMPTY); Snd.play('break'); addScore(50);
      for (let i = 0; i < 4; i++) G.parts.push({ x: tx * TS + (i % 2) * 8, y: ty * TS + (i >> 1) * 8, vx: (i % 2 ? 1 : -1) * rnd(0.8, 1.6), vy: rnd(-4.5, -3), c: i });
    } else { bump(a, key); Snd.play('bump'); }
  } else { Snd.play('bump'); return; }
  // derruba quem está em cima do bloco
  for (const e of a.ents) {
    if (e.dead || !e.active || e.kind === 'coin' || e.kind === 'dcoin' || e.kind === 'sign') continue;
    if (e.x < tx * TS + TS && e.x + e.w > tx * TS && Math.abs(e.y + e.h - ty * TS) < 3) {
      if (e.kind === 'mushroom' || e.kind === 'oneup' || e.kind === 'horse') { e.vy = -2.5; continue; }
      knock(e, e.x < tx * TS + 8 ? -1 : 1); addScore(100, e.x, e.y);
    }
  }
}
function giveContent(a, c, tx, ty) {
  switch (c) {
    case 'coin':
      addCoin();
      a.ents.push(mkEnt('popcoin', tx * TS + 4, ty * TS - 12, { vy: -4.5, active: true }));
      break;
    case 'mushroom': case 'oneup': case 'horse': {
      const [w, h] = SIZES[c];
      a.ents.push(mkEnt(c, tx * TS + (TS - w) / 2, ty * TS, { state: 'emerge', dir: 1, active: true, by: ty * TS }));
      Snd.play('appear');
      break;
    }
  }
}

// ---------------------------------------------------------------- inimigos
function knock(e, dir) {
  e.dead = true; e.active = true; e.knock = true; e.vy = -3.2; e.vx = dir * 1.2; e.t = 0;
  Snd.play('kick');
}
const CHAIN = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
function stompScore(e) {
  const n = G.stompChain++;
  if (n >= CHAIN.length) { addLife(e.x, e.y - 8); return; }
  addScore(CHAIN[n], e.x, e.y - 6);
}
function bounce() { P.vy = K.jumpHeld() ? -5.4 : -3.6; }

function stompEnemy(e) {
  switch (e.kind) {
    case 'bandit': case 'coyote': case 'mole':
      e.dead = true; e.squash = true; e.t = 0; e.vx = 0; stompScore(e); Snd.play('stomp'); bounce(); break;
    case 'tatu': {
      const bottom = e.y + e.h;
      e.kind = 'shell'; e.w = 12; e.h = 11; e.y = bottom - 11; e.state = 'still'; e.vx = 0; e.grace = 10;
      stompScore(e); Snd.play('stomp'); bounce(); break;
    }
    case 'shell':
      if (e.state === 'move') { e.state = 'still'; e.vx = 0; e.grace = 10; Snd.play('stomp'); addScore(100, e.x, e.y - 6); }
      else kickShell(e, cx(P) < cx(e) ? 1 : -1);
      bounce(); break;
    case 'cannon':
      knock(e, -1); e.vx = 0; stompScore(e); Snd.play('stomp'); bounce(); break;
    case 'sheriff':
      Snd.play('stomp'); bounce(); P.vy = -4.4;
      e.hp--; e.stun = 60;
      if (e.hp <= 0) { knock(e, cx(P) < cx(e) ? 1 : -1); addScore(2000, e.x, e.y - 6); e.big = true; }
      else addScore(200, e.x, e.y - 6);
      break;
  }
}
function kickShell(e, dir) {
  e.state = 'move'; e.dir = dir; e.grace = 12; e.chain = 0; P.kick = 8;
  Snd.play('kick'); addScore(100, e.x, e.y - 6);
}

function playerVsEnemy(e) {
  if (e.dead || !e.active || !overlap(P, e)) return;
  switch (e.kind) {
    case 'coin': e.dead = e.remove = true; addCoin(); return;
    case 'dcoin':
      e.dead = e.remove = true; G.dragon++; G.dragonTotal++; addScore(1000, e.x, e.y - 8); Snd.play('star');
      if (G.dragon === 5) { addLife(P.x, P.y - 20); }
      return;
    case 'sign': return;
    case 'mushroom': if (e.state === 'emerge') return; e.remove = true; powerUp(); return;
    case 'oneup': if (e.state === 'emerge') return; e.remove = true; addLife(e.x, e.y - 8); return;
    case 'horse':
      if (e.state === 'emerge' || e.state === 'flee') return;
      if (!P.mounted) mount(e); else { e.remove = true; addScore(1000, e.x, e.y - 8); Snd.play('coin'); }
      return;
    case 'popcoin': return;
    case 'mole': if (e.state !== 'chase') return; break;
    case 'shell':
      if (e.grace > 0) return;
      if (e.state === 'still') {
        const stomping = P.vy > 0 && (P.y + P.h - P.vy) <= e.y + 6;
        if (stomping) stompEnemy(e); else kickShell(e, cx(P) < cx(e) ? 1 : -1);
        return;
      }
      break;
    case 'cactus': hurtPlayer(); return;
    case 'sheriff': if (e.stun > 0) { if (P.vy > 0) return; return; } break;
  }
  const stomping = P.vy > 0 && (P.y + P.h - P.vy) <= e.y + 7;
  if (stomping) stompEnemy(e); else hurtPlayer();
}

function updateEnt(e, a) {
  if (e.remove) return;
  const cam = G.cam;
  if (!e.active) {
    if (e.x < cam.x + VW + 24 && e.x + e.w > cam.x - 40) e.active = true; else return;
  }
  e.t++;
  if (e.dead) {
    if (e.knock) { e.vy = Math.min(e.vy + 0.25, 5); e.x += e.vx; e.y += e.vy; if (e.y > VH + 60) e.remove = true; }
    else if (e.t > 24) e.remove = true;
    return;
  }
  switch (e.kind) {
    case 'bandit': case 'tatu': case 'coyote': {
      const sp = e.kind === 'coyote' ? 1.1 : e.kind === 'tatu' ? 0.35 : 0.5;
      if (e.kind === 'coyote' && e.t % 30 === 0 && e.onGround) e.dir = cx(P) < cx(e) ? -1 : 1;
      e.vx = e.dir * sp; e.vy = Math.min(e.vy + 0.25, 4);
      const r = moveE(e, a);
      if (r.x) e.dir = -e.dir;
      if (e.y > VH + 40) e.remove = true;
      break;
    }
    case 'shell': {
      if (e.grace > 0) e.grace--;
      e.vy = Math.min(e.vy + 0.25, 4);
      e.vx = e.state === 'move' ? e.dir * 3.6 : 0;
      const r = moveE(e, a);
      if (r.x && e.state === 'move') { e.dir = -e.dir; Snd.play('bump'); }
      if (e.y > VH + 40) e.remove = true;
      if (e.state === 'move') {
        for (const o of a.ents) {
          if (o === e || o.dead) continue;
          if (!['bandit', 'tatu', 'coyote', 'mole', 'cannon', 'shell'].includes(o.kind)) continue;
          if (o.kind === 'mole' && o.state !== 'chase') continue;
          if (overlap(e, o)) {
            knock(o, e.dir);
            const n = e.chain++;
            if (n >= 4) addLife(o.x, o.y - 8); else addScore(CHAIN[n + 1] || 1000, o.x, o.y - 8);
          }
        }
        if (e.grace <= 0 && P.kick <= 0 && overlap(e, P)) {
          const stomping = P.vy > 0 && (P.y + P.h - P.vy) <= e.y + 6;
          if (!stomping) hurtPlayer();
        }
      }
      break;
    }
    case 'cannon':
      e.x += e.vx;
      if (e.x + e.w < cam.x - 40) e.remove = true;
      break;
    case 'sheriff':
      e.dir = cx(P) < cx(e) ? -1 : 1;
      if (e.stun > 0) e.stun--;
      else { e.jt--; if (e.jt <= 0 && e.onGround) { e.vy = -3.6; e.jt = 60 + ((Math.random() * 50) | 0); } }
      e.vx = 0; e.vy = Math.min(e.vy + 0.25, 4); moveE(e, a);
      break;
    case 'mole': {
      if (e.state === 'wait') {
        if (Math.abs(cx(P) - cx(e)) < 100) { e.state = 'rise'; e.vis = true; Snd.play('bump'); }
      } else if (e.state === 'rise') {
        e.y -= 0.6;
        if (e.y + e.h <= e.groundY) { e.y = e.groundY - e.h; e.state = 'chase'; }
      } else {
        if (e.t % 40 === 0) e.dir = cx(P) < cx(e) ? -1 : 1;
        e.vx = e.dir * 0.85; e.vy = Math.min(e.vy + 0.25, 4);
        const r = moveE(e, a);
        if (r.x && e.onGround) e.vy = -3.8;
        if (e.y > VH + 40) e.remove = true;
      }
      break;
    }
    case 'cactus': {
      const near = Math.abs(cx(P) - (e.x + 5)) < 26;
      const up = e.baseY - 14, down = e.baseY + 2;
      e.t++;
      if (e.phase === 0) { if (e.t > 80 && !near) { e.phase = 1; e.t = 0; } }
      else if (e.phase === 1) { e.y -= 0.4; if (e.y <= up) { e.y = up; e.phase = 2; e.t = 0; } }
      else if (e.phase === 2) { if (e.t > 120) { e.phase = 3; e.t = 0; } }
      else { e.y += 0.4; if (e.y >= down) { e.y = down; e.phase = 0; e.t = 0; } }
      break;
    }
    case 'mushroom': case 'oneup': case 'horse': {
      if (e.state === 'emerge') {
        e.y -= 0.5;
        if (e.y + e.h <= e.by) { e.y = e.by - e.h; e.state = 'walk'; e.vy = 0; }
        break;
      }
      const sp = e.kind === 'horse' ? (e.state === 'flee' ? 2.2 : 0.7) : 0.8;
      if (e.state !== 'flee') e.vx = e.dir * sp; else e.vx = e.dir * sp;
      e.vy = Math.min(e.vy + 0.25, 4);
      const r = moveE(e, a);
      if (r.x) e.dir = -e.dir;
      if (e.state === 'flee' && e.t > 120) e.remove = true;
      if (e.y > VH + 40) e.remove = true;
      break;
    }
    case 'popcoin':
      e.vy += 0.3; e.y += e.vy;
      if (e.vy > 3 || e.t > 30) { e.remove = true; popup('200', e.x, e.y); G.score += 200; }
      break;
  }
  playerVsEnemy(e);
}

// ---------------------------------------------------------------- loop de atualização
function updateSpawners(a) {
  for (const s of a.spawners) {
    if (P.x < s.x0 * TS || P.x > s.x1 * TS) continue;
    s.t--;
    if (s.t <= 0) {
      s.t = s.every; s.alt ^= 1;
      const ty = s.alt ? s.ty - 1 : s.ty;
      const e = mkEnt('cannon', G.cam.x + VW + 16, (ty + 1) * TS - 12, { vx: -1.35, active: true });
      a.ents.push(e); Snd.play('cannon');
    }
  }
}

function updatePlay() {
  if (anyP('KeyP')) G.paused = !G.paused;
  if (anyP('KeyM')) Snd.toggleMute();
  if (G.paused) return;
  const a = G.A, L = G.L;
  if (++G.tick % 24 === 0) {
    G.time--;
    if (G.time <= 0) { G.time = 0; killPlayer(); return; }
  }
  updatePlayer();
  if (G.state !== 'play') return;
  updateSpawners(a);
  G.msg = null;
  for (const e of a.ents.slice()) {
    updateEnt(e, a);
    if (e.kind === 'sign' && Math.abs(cx(P) - cx(e)) < 20) G.msg = e.text;
  }
  a.ents = a.ents.filter(e => !e.remove);
  for (const k in a.bumps) if (--a.bumps[k] <= 0) delete a.bumps[k];
  updateFx();

  // checkpoint e portão final (só na área principal)
  if (G.ai === 0) {
    if (L.mid && !L.midPassed && P.x > L.mid.tx * TS) {
      L.midPassed = true; G.checkpoint[L.id] = { tx: L.mid.tx + 1 }; Snd.play('check'); popup('CHECKPOINT', L.mid.tx * TS - 24, 140);
    }
    L.goalT++;
    const gx = L.goal.tx * TS;
    if (P.x + P.w > gx + 6) reachGoal(gx);
  }
  camFollow();
}
function goalBar(L) {
  const frac = (Math.sin(L.goalT * 0.035) + 1) / 2;
  return { frac, y: 12 * TS - 10 - frac * 64 };
}
function reachGoal(gx) {
  const bar = goalBar(G.L);
  const hit = P.y < bar.y + 6 && P.y + P.h > bar.y - 4;
  const bonus = hit ? 1000 + Math.round(bar.frac * 10) * 500 : 0;
  G.state = 'clear'; G.timer = 0;
  G.clearInfo = { bonus, hit, phase: 0, timeLeft: G.time, tb: 0 };
  G.score += bonus;
  if (hit) popup(String(bonus), gx - 4, bar.y - 8);
  Snd.stopMusic(); Snd.play('clear');
  if (P.mounted) { /* cavalo comemora junto */ }
}

function updateFx() {
  for (const p of G.popups) p.t++;
  G.popups = G.popups.filter(p => p.t < 60);
  for (const p of G.parts) { p.vy += 0.3; p.x += p.vx; p.y += p.vy; }
  G.parts = G.parts.filter(p => p.y < VH + 20);
}
function camFollow() {
  const a = G.A;
  const target = cx(P) - VW / 2 + P.dir * 14;
  G.cam.x += (target - G.cam.x) * 0.14;
  G.cam.x = Math.max(0, Math.min(G.cam.x, a.cols * TS - VW));
}

function updatePipe() {
  const pp = G.pipe, p = P;
  if (pp.phase === 'in') {
    p.y += 0.6; pp.t++;
    if (pp.t > 28) { pp.phase = 'fade'; pp.t = 0; }
  } else if (pp.phase === 'fade') {
    pp.t++; G.fade = Math.min(1, pp.t / 14);
    if (pp.t === 14) {
      const sp = pp.pi.spawn;
      G.ai = pp.pi.to; G.A = G.L.areas[G.ai]; G.popups = []; G.parts = [];
      p.vx = p.vy = 0;
      if (sp.mode === 'pipe') {
        p.x = sp.pipe.tx * TS + 16 - p.w / 2; p.y = sp.pipe.ty * TS + 28 - p.h + 0; pp.phase2 = 'out'; pp.startY = p.y;
      } else {
        p.x = sp.tx * TS + 3; p.y = (sp.ty + 1) * TS - p.h; pp.phase2 = 'drop';
      }
      G.cam.x = Math.max(0, Math.min(cx(p) - VW / 2, G.A.cols * TS - VW));
      playMusic();
    }
    if (pp.t > 14) {
      G.fade = Math.max(0, 1 - (pp.t - 14) / 14);
      if (pp.t >= 28) { G.fade = 0; pp.phase = pp.phase2 === 'out' ? 'out' : 'done'; pp.t = 0; if (pp.phase === 'out') Snd.play('pipe'); }
    }
  } else if (pp.phase === 'out') {
    p.y -= 0.6; pp.t++;
    if (pp.t > 40) pp.phase = 'done';
  }
  if (pp.phase === 'done') { G.pipe = null; G.state = 'play'; p.vy = 0; p.onGround = false; }
}

function updateClear() {
  const ci = G.clearInfo, a = G.A;
  G.timer++;
  if (ci.phase === 0) {
    // corre para dentro do rancho
    P.vx = 1.0; P.dir = 1; P.vy = Math.min(P.vy + 0.5, 5.8);
    moveE(P, a);
    P.anim += 0.15;
    if (G.timer > 90) { ci.phase = 1; }
  } else if (ci.phase === 1) {
    if (G.time > 0) {
      const d = Math.min(G.time, 2);
      G.time -= d; G.score += d * 50; ci.tb += d;
      if (G.timer % 4 === 0) Snd.play('coin');
    } else { ci.phase = 2; G.timer = 0; }
  } else if (ci.phase === 2) {
    if (G.timer > 90) {
      if (G.level >= LEVEL_COUNT) { G.state = 'end'; G.timer = 0; }
      else beginLevel(G.level + 1, false);
    }
  }
  updateFx();
  for (const e of a.ents) if (e.kind === 'popcoin') e.remove = true;
}

function updateDying() {
  G.timer++;
  if (G.timer < 40) return;
  if (G.timer === 40) P.vy = -6;
  P.vy += 0.32; P.y += P.vy;
  if (G.timer > 40 && P.y > VH + 60 && G.timer > 140) {
    G.lives--;
    if (G.lives <= 0) { G.state = 'gameover'; G.timer = 0; Snd.play('gameover'); }
    else beginLevel(G.level, true);
  }
}

// ---------------------------------------------------------------- render: fundo
const bgCache = {};
function mesaSet(seed, hMin, hMax) {
  let s = seed; const r = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const list = []; let x = 0;
  while (x < 512) { const w = 30 + r() * 60, h = hMin + r() * (hMax - hMin), gap = 10 + r() * 50; list.push({ x, w, h }); x += w + gap; }
  return list;
}
function drawBG(name, camx) {
  if (name === 'under') {
    ctx.fillStyle = '#2a170b'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#3a2110';
    for (let y = 0; y < VH; y += 16) for (let x = -((camx * 0.5) % 32); x < VW; x += 32) ctx.fillRect(x + ((y / 16) % 2 ? 16 : 0), y, 30, 14);
    return;
  }
  const canyon = name === 'canyon';
  const bands = canyon ? ['#c8552e', '#e07a3c', '#f2a25a', '#fbc678', '#ffdf9c']
                       : ['#f4a94a', '#f8c060', '#fcd678', '#ffe6a0', '#fff0c0'];
  const bh = 192 / bands.length;
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, VW, bh + 1); });
  ctx.fillStyle = canyon ? '#ffd28a' : '#fff6cf';
  ctx.beginPath(); ctx.arc(190 - camx * 0.02, 62, 24, 0, 7); ctx.fill();
  ctx.fillStyle = canyon ? 'rgba(255,210,140,.35)' : 'rgba(255,246,207,.4)';
  ctx.beginPath(); ctx.arc(190 - camx * 0.02, 62, 34, 0, 7); ctx.fill();
  // nuvens
  ctx.fillStyle = canyon ? 'rgba(255,225,170,.55)' : 'rgba(255,250,230,.7)';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 130 - camx * 0.1) % 780 + 780) % 780 - 120;
    ctx.fillRect(x, 30 + (i % 3) * 22, 46, 5); ctx.fillRect(x + 8, 26 + (i % 3) * 22, 28, 5);
  }
  const far = bgCache[name + 'f'] || (bgCache[name + 'f'] = mesaSet(3, 40, canyon ? 120 : 80));
  const near = bgCache[name + 'n'] || (bgCache[name + 'n'] = mesaSet(9, 22, canyon ? 70 : 44));
  const layer = (list, par, col, cap) => {
    const off = (camx * par) % 512;
    for (let k = -1; k < 2; k++) for (const m of list) {
      const x = Math.round(m.x + k * 512 - off);
      if (x > VW || x + m.w < 0) continue;
      ctx.fillStyle = col; ctx.fillRect(x, 192 - m.h, m.w, m.h + 40);
      ctx.fillRect(x - 4, 192 - m.h + 12, m.w + 8, m.h);
      ctx.fillStyle = cap; ctx.fillRect(x, 192 - m.h, m.w, 3);
    }
  };
  layer(far, 0.2, canyon ? '#9a4a26' : '#d99358', canyon ? '#b86338' : '#e8ad72');
  layer(near, 0.4, canyon ? '#7a3a1c' : '#c47a3e', canyon ? '#96502a' : '#d89654');
  // dunas / cristas
  const c1 = canyon ? '#6a3018' : '#b8692f';
  ctx.fillStyle = c1;
  for (let x = 0; x < VW; x += 2) {
    const wx = x + camx * 0.6;
    const y = 172 + Math.sin(wx * 0.03) * 8 + Math.sin(wx * 0.011) * 6;
    ctx.fillRect(x, y, 2, 30);
  }
}

// ---------------------------------------------------------------- render: mundo
function drawSpr(img, x, y, flip) {
  x = Math.round(x); y = Math.round(y);
  if (flip) {
    ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
  } else ctx.drawImage(img, x, y);
}
function drawEnt(e, camx) {
  if (e.remove) return;
  const x = e.x - camx, fl = e.dir > 0;
  const cxs = x + e.w / 2, bot = e.y + e.h;
  const fr = ((e.t / 10) | 0) % 2;
  switch (e.kind) {
    case 'bandit':
      if (e.squash) drawSpr(SP.banditFlat, cxs - 8, bot - 16);
      else if (e.knock) { ctx.save(); ctx.translate(cxs, e.y + 7); ctx.scale(1, -1); drawSpr(SP.bandit[0], -8, -8); ctx.restore(); }
      else drawSpr(SP.bandit[fr], cxs - 8, bot - 16, fl);
      break;
    case 'coyote':
      if (e.squash) { ctx.save(); ctx.translate(cxs, bot); ctx.scale(1, 0.35); drawSpr(SP.coyote[0], -8, -16, !fl); ctx.restore(); }
      else if (e.knock) { ctx.save(); ctx.translate(cxs, e.y + 5); ctx.scale(1, -1); drawSpr(SP.coyote[0], -8, -12, !fl); ctx.restore(); }
      else drawSpr(SP.coyote[fr], cxs - 8, bot - 16, !fl);
      break;
    case 'tatu':
      if (e.knock) { ctx.save(); ctx.translate(cxs, e.y + 7); ctx.scale(1, -1); drawSpr(SP.tatu[0], -8, -8); ctx.restore(); }
      else drawSpr(SP.tatu[fr], cxs - 8, bot - 16, !fl);
      break;
    case 'shell':
      if (e.knock) { ctx.save(); ctx.translate(cxs, e.y + 5); ctx.scale(1, -1); drawSpr(SP.shell, -8, -11); ctx.restore(); }
      else drawSpr(SP.shell, cxs - 8, bot - 16 + 0, false);
      break;
    case 'cannon': drawSpr(SP.cannon, cxs - 8, bot - 14, false); break;
    case 'sheriff': {
      const img = e.stun > 0 || !e.onGround ? SP.sheriff.big.jump : SP.sheriff.big.idle;
      if (e.knock) { ctx.save(); ctx.translate(cxs, e.y + 12); ctx.scale(1, -1); drawSpr(img, -8, -12); ctx.restore(); }
      else if (!(e.stun > 0 && ((e.stun >> 2) & 1))) drawSpr(img, cxs - 8, bot - 24, e.dir < 0);
      break;
    }
    case 'mole':
      if (!e.vis) break;
      if (e.squash) { ctx.save(); ctx.translate(cxs, bot); ctx.scale(1, 0.35); drawSpr(SP.mole[0], -8, -16, !fl); ctx.restore(); }
      else drawSpr(SP.mole[fr], cxs - 8, bot - 16, !fl);
      break;
    case 'cactus': drawSpr(SP.cactusEnemy, cxs - 8, e.y, false); break;
    case 'mushroom': drawSpr(SP.mushroom, cxs - 8, bot - 16); break;
    case 'oneup': drawSpr(SP.oneup, cxs - 8, bot - 16); break;
    case 'horse': drawSpr(SP.horse[e.state === 'flee' ? fr : 0], cxs - 12, bot - 16, e.dir < 0); break;
    case 'coin': case 'popcoin': {
      const wv = Math.abs(Math.cos(G.t * 0.12 + e.x * 0.05)) * 6 + 2;
      ctx.fillStyle = '#b8801a'; ctx.fillRect(Math.round(cxs - wv / 2 - 1), Math.round(e.y), Math.round(wv + 2), 14);
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(Math.round(cxs - wv / 2), Math.round(e.y + 1), Math.round(wv), 12);
      ctx.fillStyle = '#fff2a0'; ctx.fillRect(Math.round(cxs - wv / 2), Math.round(e.y + 2), Math.max(1, Math.round(wv / 3)), 8);
      break;
    }
    case 'dcoin': {
      const s = Math.abs(Math.cos(G.t * 0.07 + e.x));
      const wv = Math.max(2, Math.round(12 * (0.35 + 0.65 * s)));
      ctx.drawImage(SP.dcoin, Math.round(cxs - wv / 2), Math.round(e.y), wv, 14);
      break;
    }
    case 'sign': drawSpr(SP.sign, cxs - 8, bot - 16); break;
  }
}

function drawDecor(a, camx) {
  for (const d of a.decor) {
    const x = d.x - camx;
    if (x < -24 || x > VW + 8) continue;
    const img = d.kind === 'cactus' ? SP.cactusDeco : d.kind === 'tree' ? SP.treeDeco : SP.skullDeco;
    drawSpr(img, x, d.y - 16);
  }
}

function drawTiles(a, camx, theme) {
  const set = buildTileset(theme);
  const c0 = Math.max(0, Math.floor(camx / TS)), c1 = Math.min(a.cols - 1, Math.floor((camx + VW) / TS));
  const qf = ((G.t / 14) | 0) % 2;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = c0; tx <= c1; tx++) {
    const t = a.tiles[ty * a.cols + tx];
    if (!t) continue;
    const key = ty * a.cols + tx;
    let by = 0;
    if (a.bumps[key]) by = -Math.round(Math.sin((a.bumps[key] / 10) * Math.PI) * 5);
    const img = t === T.QUEST ? set['q' + qf] : set[t];
    ctx.drawImage(img, Math.round(tx * TS - camx), ty * TS + by);
  }
}

function drawGoal(camx) {
  const L = G.L, gx = L.goal.tx * TS - camx;
  if (gx > VW + 40 || gx < -60) return;
  const post = (x) => {
    ctx.fillStyle = '#5a3417'; ctx.fillRect(x, 192 - 84, 6, 84);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 1, 192 - 84, 3, 84);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(x - 1, 192 - 88, 8, 5);
  };
  post(gx - 2); post(gx + 26);
  const bar = goalBar(L);
  ctx.fillStyle = '#3a200d'; ctx.fillRect(gx + 4, Math.round(bar.y), 22, 5);
  ctx.fillStyle = '#e0a558'; ctx.fillRect(gx + 4, Math.round(bar.y) + 1, 22, 3);
  ctx.fillStyle = '#b8322a'; ctx.fillRect(gx + 8, Math.round(bar.y) + 1, 4, 3); ctx.fillRect(gx + 18, Math.round(bar.y) + 1, 4, 3);
  // placa do rancho
  ctx.fillStyle = '#5a3417'; ctx.fillRect(gx - 2, 192 - 104, 34, 12);
  ctx.fillStyle = '#e0a558'; ctx.fillRect(gx - 1, 192 - 103, 32, 10);
}
function drawMid(camx) {
  const L = G.L; if (!L.mid) return;
  const x = L.mid.tx * TS - camx;
  if (x > VW + 20 || x < -40) return;
  ctx.fillStyle = '#5a3417'; ctx.fillRect(x, 192 - 48, 5, 48); ctx.fillRect(x + 27, 192 - 48, 5, 48);
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 1, 192 - 48, 2, 48); ctx.fillRect(x + 28, 192 - 48, 2, 48);
  if (!L.midPassed) {
    ctx.fillStyle = '#e8c860'; ctx.fillRect(x + 5, 192 - 40, 22, 4);
    ctx.fillStyle = '#b8322a'; ctx.fillRect(x + 5, 192 - 40, 5, 4); ctx.fillRect(x + 17, 192 - 40, 5, 4);
  } else {
    ctx.fillStyle = '#e8c860'; ctx.fillRect(x + 5, 192 - 8, 8, 3); ctx.fillRect(x + 17, 192 - 12, 8, 3);
  }
}

function drawPlayer(camx) {
  const p = P;
  if (p.inv > 0 && ((p.inv >> 2) & 1) && G.state === 'play') return;
  const set = SP.player[p.big ? 'big' : 'small'];
  let img;
  if (p.dead) img = SP.player.small.jump;
  else if (!p.onGround) img = set.jump;
  else if (Math.abs(p.vx) > 0.15) img = (((p.anim | 0) % 2) ? set.run1 : set.run2);
  else img = set.idle;
  const flip = p.dir < 0;
  const x = p.x - camx + p.w / 2;
  const bot = p.y + p.h;
  const bounce = p.mounted && p.onGround && Math.abs(p.vx) > 0.3 ? (((p.anim * 2) | 0) % 2) : 0;
  if (p.mounted) {
    drawSpr(SP.horse[p.onGround && Math.abs(p.vx) > 0.3 ? ((p.anim | 0) % 2) : 0], x - 12 + (flip ? 0 : 0), bot - 16, flip);
    drawSpr(img, x - 8 - p.dir * 1, bot - 10 - img.height + bounce, flip);
  } else drawSpr(img, x - 8, bot - img.height, flip);
}

function drawWorld() {
  const a = G.A, cam = G.cam;
  const camx = Math.round(cam.x);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawBG(a.theme, camx);
  drawDecor(a, camx);
  if (G.ai === 0) { drawMid(camx); drawGoal(camx); }
  for (const e of a.ents) if (e.kind !== 'sign' || true) if (e.active) drawEnt(e, camx);
  const inPipe = G.state === 'pipe';
  if (inPipe) drawPlayer(camx);
  drawTiles(a, camx, a.theme);
  if (!inPipe && !(G.state === 'dying' && G.timer < 1)) drawPlayer(camx);
  for (const p of G.parts) {
    ctx.fillStyle = '#c8662a'; ctx.fillRect(Math.round(p.x - camx), Math.round(p.y), 8, 8);
    ctx.fillStyle = '#7d3a16'; ctx.fillRect(Math.round(p.x - camx), Math.round(p.y) + 6, 8, 2);
  }
}

// ---------------------------------------------------------------- render: HUD e telas
function text(str, x, y, size = 8, col = '#fff', align = 'left', shadow = '#3a200d') {
  ctx.font = size + 'px ' + FONT; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(str, x + 2, y + 2); }
  ctx.fillStyle = col; ctx.fillText(str, x, y);
}
function drawHUD() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const Y = 10;
  text('VIDAS x' + G.lives, 14, Y, 8, '#fff2a0');
  text('$ ' + String(G.coins).padStart(2, '0'), 14, Y + 16, 8, '#ffd23a');
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = i < G.dragon ? 1 : 0.28;
    ctx.drawImage(SP.dcoin, 150 + i * 20, Y - 2, 15, 18);
  }
  ctx.globalAlpha = 1;
  text('TEMPO', 372, Y, 8, '#fff2a0');
  text(String(G.time).padStart(3, '0'), 372, Y + 16, 8, G.time <= 60 && (G.t >> 3) & 1 ? '#ff6a3a' : '#fff');
  text(String(G.score).padStart(7, '0'), 498, Y + 16, 8, '#fff', 'right');
  text(G.L ? 'FASE ' + G.level : '', 498, Y, 8, '#ffd23a', 'right');
  if (G.msg && G.state === 'play') {
    ctx.fillStyle = 'rgba(30,16,6,.88)'; ctx.fillRect(40, 340, 432, 22 + G.msg.length * 18);
    ctx.strokeStyle = '#e0a558'; ctx.lineWidth = 3; ctx.strokeRect(41, 341, 430, 20 + G.msg.length * 18);
    G.msg.forEach((ln, i) => text(ln, 256, 352 + i * 18, 8, '#fff2a0', 'center', null));
  }
}
function drawPopups() {
  const camx = Math.round(G.cam.x);
  for (const p of G.popups) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    text(p.txt, (p.x - camx) * 2, (p.y - p.t * 0.4) * 2, 8, '#fff', 'left', '#3a200d');
  }
}
function drawIntro() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1a0e06'; ctx.fillRect(0, 0, 512, 448);
  text('FASE ' + G.level, 256, 150, 20, '#ffd23a', 'center');
  text(G.L.name, 256, 200, 12, '#f0b47c', 'center');
  text('VIDAS x' + G.lives, 256, 270, 12, '#fff', 'center');
  ctx.setTransform(4, 0, 0, 4, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(SP.player.small.idle, 56, 82);
}
function drawTitle() {
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.imageSmoothingEnabled = false;
  drawBG('day', G.t * 0.6);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const set = buildTileset('day');
  for (let x = 0; x < 17; x++) { ctx.drawImage(set[T.GROUND], x * 16 - ((G.t * 0.6) % 16), 192); ctx.drawImage(set[T.DIRT], x * 16 - ((G.t * 0.6) % 16), 208); }
  drawSpr(SP.horse[((G.t / 8) | 0) % 2], 60, 176);
  drawSpr(SP.player.small[((G.t / 8) | 0) % 2 ? 'run1' : 'run2'], 66, 166 - 4);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(30,16,6,.35)'; ctx.fillRect(0, 60, 512, 130);
  text('FAROESTE', 256, 84, 34, '#ffd23a', 'center', '#5a2a0a');
  text('WORLD', 256, 132, 34, '#ff8a1e', 'center', '#5a2a0a');
  if ((G.t >> 5) & 1) text(TOUCH ? 'TOQUE PARA JOGAR' : 'APERTE ENTER', 256, 232, 14, '#fff', 'center');
  if (TOUCH) {
    text('DIRECIONAL mover   A pular   B correr', 256, 330, 8, '#fff2a0', 'center');
    text('BAIXO no cano = entrar', 256, 350, 8, '#fff2a0', 'center');
  } else {
    text('SETAS/AD mover   Z/ESPACO pular   X/SHIFT correr', 256, 330, 8, '#fff2a0', 'center');
    text('BAIXO no cano = entrar   P pausa   M som', 256, 350, 8, '#fff2a0', 'center');
  }
  text('Pise nos bandidos, monte no cavalo, chegue na porteira!', 256, 384, 8, '#f0b47c', 'center');
}
function drawCenterCard(lines, sub) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(20,10,4,.82)'; ctx.fillRect(0, 130, 512, 190);
  lines.forEach((l, i) => text(l, 256, 160 + i * 34, 18, i ? '#fff' : '#ffd23a', 'center'));
  if (sub) text(sub, 256, 280, 9, '#f0b47c', 'center');
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 448);
  switch (G.state) {
    case 'title': drawTitle(); break;
    case 'intro': drawIntro(); break;
    case 'gameover': drawWorld(); drawHUD(); drawCenterCard(['FIM DE JOGO', 'Score ' + G.score], (TOUCH ? 'Toque para voltar ao inicio' : 'ENTER para voltar ao inicio')); break;
    case 'end': {
      ctx.setTransform(2, 0, 0, 2, 0, 0); drawBG('day', G.t * 0.5); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(20,10,4,.6)'; ctx.fillRect(0, 60, 512, 300);
      text('PARABENS, XERIFE!', 256, 90, 20, '#ffd23a', 'center');
      text('Voce cruzou as 2 primeiras fases.', 256, 150, 10, '#fff', 'center');
      text('Score: ' + G.score, 256, 190, 12, '#fff2a0', 'center');
      text('Estrelas: ' + G.dragonTotal + ' / 10', 256, 220, 12, '#fff2a0', 'center');
      text('Fim do prototipo - mais fases em breve', 256, 280, 9, '#f0b47c', 'center');
      if ((G.t >> 5) & 1) text((TOUCH ? 'Toque para jogar de novo' : 'ENTER para jogar de novo'), 256, 320, 10, '#fff', 'center');
      break;
    }
    default: {
      drawWorld(); drawPopups(); drawHUD();
      if (G.paused) drawCenterCard(['PAUSADO'], 'P para continuar');
      if (G.state === 'clear') {
        const ci = G.clearInfo;
        if (ci.phase >= 1) drawCenterCard(['FASE COMPLETA!', ci.hit ? 'Bonus da porteira ' + ci.bonus : 'Sem bonus da porteira'], 'Bonus de tempo +' + ci.tb * 50);
      }
      if (G.fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(0,0,0,' + G.fade + ')'; ctx.fillRect(0, 0, 512, 448); }
    }
  }
}

// ---------------------------------------------------------------- main loop
function step() {
  G.t++;
  switch (G.state) {
    case 'title': if (K.start()) { Snd.init(); startGame(); } break;
    case 'intro':
      if (--G.timer <= 0) { G.state = 'play'; playMusic(); }
      break;
    case 'play': updatePlay(); break;
    case 'pipe': updatePipe(); updateFx(); break;
    case 'clear': updateClear(); break;
    case 'dying': updateDying(); break;
    case 'gameover': case 'end':
      G.timer++;
      if (K.start() && G.timer > 30) { G.state = 'title'; Snd.stopMusic(); }
      break;
  }
  pressed = {};
}

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  while (acc >= 1 / 60) { step(); acc -= 1 / 60; }
  render();
  requestAnimationFrame(frame);
}

window.__dbg = { step, render, keys, press: c => { pressed[c] = true; }, getP: () => P, setP: o => Object.assign(P, o) };
buildSprites();
buildTileset('day'); buildTileset('canyon'); buildTileset('under');
requestAnimationFrame(frame);
})();
