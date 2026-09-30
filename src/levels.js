'use strict';
// Definição das fases. Coordenadas em tiles (16px). Chão padrão: linha 12 (topo), mapa com 14 linhas.
// Fase 1 = "Yoshi's Island 1" (tutorial, coiote, bandidos, canhão, chefe no portão)
// Fase 2 = "Yoshi's Island 2" (casco, cavalo, toupeiras, nuvens/plataformas, 2 xerifes)

const ROWS = 14;

function mkArea(cols, theme) {
  return {
    cols, theme, tiles: new Uint8Array(cols * ROWS), contents: {}, specs: [], pipes: [],
    decor: [], spawners: [], bumps: {}, ents: [],
  };
}
const setT = (a, x, y, t) => { if (x >= 0 && x < a.cols && y >= 0 && y < ROWS) a.tiles[y * a.cols + x] = t; };
function terrain(a, x0, x1, top) {
  for (let x = x0; x < x1; x++) for (let y = top; y < ROWS; y++) setT(a, x, y, y === top ? T.GROUND : T.DIRT);
}
function pipe(a, x, groundTop, h) {
  const top = groundTop - h;
  setT(a, x, top, T.PIPE_TL); setT(a, x + 1, top, T.PIPE_TR);
  for (let y = top + 1; y < groundTop; y++) { setT(a, x, y, T.PIPE_BL); setT(a, x + 1, y, T.PIPE_BR); }
  return top;
}
function blk(a, x, y, t, content) {
  setT(a, x, y, t);
  if (content) a.contents[y * a.cols + x] = content;
}
function planks(a, x0, x1, y) { for (let x = x0; x < x1; x++) setT(a, x, y, T.PLANK); }
function ent(a, kind, tx, ty, extra) { a.specs.push(Object.assign({ kind, tx, ty }, extra || {})); }
function coins(a, x, y, n) { for (let i = 0; i < n; i++) ent(a, 'coin', x + i, y); }
function arc(a, x, y, n) {
  for (let i = 0; i < n; i++) {
    const dy = Math.round(-Math.sin((i / (n - 1)) * Math.PI) * 2);
    ent(a, 'coin', x + i, y + dy);
  }
}
function decor(a, kind, tx, top) { a.decor.push({ kind, x: tx * 16, y: top * 16 }); }

// ------------------------------------------------------------------ FASE 1
function level1() {
  const a = mkArea(200, 'day');
  terrain(a, 0, 64, 12); terrain(a, 66, 130, 12); terrain(a, 133, 200, 12);

  // colina inicial de onde o coiote vem deslizando
  terrain(a, 10, 20, 11);
  ent(a, 'coyote', 17, 10);
  ent(a, 'sign', 5, 11, { text: ['SETAS ou A/D: andar', 'Z, ESPACO ou CIMA: pular', 'X ou SHIFT: correr  |  Pise nos inimigos!'] });
  ent(a, 'dcoin', 24, 8);
  ent(a, 'bandit', 30, 11); ent(a, 'bandit', 36, 11);
  coins(a, 33, 8, 3);

  blk(a, 44, 8, T.BRICK); blk(a, 45, 8, T.QUEST, 'mushroom'); blk(a, 46, 8, T.BRICK);
  a.spawners.push({ x0: 47, x1: 62, ty: 11, every: 200, t: 30, alt: 0 });
  arc(a, 62, 9, 6);

  const pt = pipe(a, 72, 12, 2);
  a.pipes.push({ tx: 72, ty: pt, to: 1, spawn: { tx: 2, ty: 9, mode: 'drop' } });
  ent(a, 'bandit', 77, 11); ent(a, 'bandit', 80, 11);
  terrain(a, 84, 94, 11);
  ent(a, 'bandit', 88, 10);
  ent(a, 'dcoin', 89, 7);
  blk(a, 98, 8, T.BRICK, 'coins'); blk(a, 99, 8, T.QUEST, 'coin'); blk(a, 100, 8, T.BRICK);
  ent(a, 'bandit', 96, 11);

  // portão do meio (checkpoint)
  const mid = { tx: 106 };
  planks(a, 111, 115, 8);
  ent(a, 'dcoin', 113, 5);
  blk(a, 109, 10, T.BRICK); blk(a, 108, 11, T.BRICK);
  a.spawners.push({ x0: 110, x1: 138, ty: 11, every: 190, t: 60, alt: 0 });

  const p2 = pipe(a, 122, 12, 2);
  ent(a, 'cactus', 122, p2);
  ent(a, 'bandit', 117, 11); ent(a, 'bandit', 127, 11);
  arc(a, 130, 9, 6);

  ent(a, 'bandit', 140, 11); ent(a, 'bandit', 145, 11); ent(a, 'bandit', 150, 11);
  blk(a, 142, 8, T.BRICK); blk(a, 143, 8, T.QUEST, 'coin'); blk(a, 144, 8, T.BRICK, 'oneup'); blk(a, 145, 8, T.BRICK);
  ent(a, 'dcoin', 152, 7);

  terrain(a, 156, 160, 11); terrain(a, 160, 172, 10); terrain(a, 172, 176, 11);
  ent(a, 'dcoin', 166, 7);
  coins(a, 162, 8, 3);
  ent(a, 'bandit', 168, 9);
  ent(a, 'sheriff', 182, 11);

  decor(a, 'cactus', 3, 12); decor(a, 'cactus', 26, 12); decor(a, 'cactus', 41, 12); decor(a, 'skull', 55, 12);
  decor(a, 'cactus', 70, 12); decor(a, 'cactus', 101, 12); decor(a, 'skull', 118, 12); decor(a, 'cactus', 137, 12);
  decor(a, 'cactus', 148, 12); decor(a, 'cactus', 177, 12);

  // sala secreta (cano)
  const b = mkArea(26, 'under');
  terrain(b, 0, 26, 12);
  for (let x = 0; x < 26; x++) { setT(b, x, 0, T.STONE); setT(b, x, 1, T.STONE); }
  coins(b, 5, 10, 8); coins(b, 6, 8, 6); coins(b, 7, 6, 4); coins(b, 13, 10, 5);
  blk(b, 10, 8, T.QUEST, 'coin'); blk(b, 11, 8, T.BRICK, 'coins');
  const bp = pipe(b, 22, 12, 2);
  b.pipes.push({ tx: 22, ty: bp, to: 0, spawn: { pipe: { tx: 72, ty: pt }, mode: 'pipe' } });

  return {
    id: 1, name: 'DUNAS DO COIOTE', time: 300, track: 'dunas', bg: 'day',
    areas: [a, b], start: { tx: 3, ty: 11 }, mid, goal: { tx: 190 },
  };
}

// ------------------------------------------------------------------ FASE 2
function level2() {
  const a = mkArea(200, 'canyon');
  terrain(a, 0, 146, 12); terrain(a, 150, 158, 12); terrain(a, 161, 200, 12);
  planks(a, 148, 149, 11);

  ent(a, 'sign', 5, 11, { text: ['Chute o casco do tatu:', 'ele derruba todo mundo no caminho!', '5 inimigos seguidos = vida extra'] });
  ent(a, 'shell', 9, 11);
  for (let i = 0; i < 5; i++) ent(a, 'tatu', 17 + i * 2, 11);

  blk(a, 29, 8, T.BRICK); blk(a, 30, 8, T.QUEST, 'mushroom'); blk(a, 31, 8, T.BRICK);
  blk(a, 37, 8, T.BRICK); blk(a, 38, 8, T.QUEST, 'horse'); blk(a, 39, 8, T.BRICK);
  ent(a, 'sign', 44, 11, { text: ['O cavalo aguenta um golpe por voce!', 'Ele corre mais e pula mais alto.'] });

  ent(a, 'dcoin', 52, 8);
  ent(a, 'bandit', 54, 11); ent(a, 'bandit', 60, 11);
  planks(a, 56, 59, 9); ent(a, 'dcoin', 57, 6);
  ent(a, 'sheriff', 66, 11); ent(a, 'dcoin', 68, 8);
  coins(a, 62, 9, 3);

  const mid = { tx: 74 };

  const p1 = pipe(a, 80, 12, 2); const p1b = pipe(a, 86, 12, 3);
  for (const x of [83, 84, 90, 92, 94]) ent(a, 'mole', x, 11);
  ent(a, 'bandit', 98, 11);
  planks(a, 100, 103, 9); planks(a, 105, 108, 7); planks(a, 110, 113, 5);
  coins(a, 100, 8, 3); coins(a, 105, 6, 3);
  ent(a, 'dcoin', 111, 2);

  terrain(a, 116, 124, 11);
  ent(a, 'dcoin', 120, 8);
  ent(a, 'tatu', 118, 10); ent(a, 'tatu', 121, 10);

  const pt = pipe(a, 128, 12, 2);
  a.pipes.push({ tx: 128, ty: pt, to: 1, spawn: { tx: 2, ty: 9, mode: 'drop' } });
  const p3 = pipe(a, 138, 12, 3);
  ent(a, 'cactus', 138, p3);
  ent(a, 'bandit', 132, 11); ent(a, 'tatu', 134, 11);
  arc(a, 142, 9, 6);

  a.spawners.push({ x0: 150, x1: 175, ty: 11, every: 220, t: 60, alt: 0 });
  blk(a, 152, 8, T.QUEST, 'coin'); blk(a, 153, 8, T.BRICK, 'coins');
  ent(a, 'bandit', 165, 11); ent(a, 'bandit', 168, 11); ent(a, 'tatu', 171, 11);
  ent(a, 'sheriff', 178, 11);
  coins(a, 182, 10, 6);
  ent(a, 'sign', 186, 11, { text: ['A porteira do rancho esta logo ali!'] });

  decor(a, 'tree', 12, 12); decor(a, 'tree', 33, 12); decor(a, 'cactus', 48, 12); decor(a, 'tree', 64, 12);
  decor(a, 'skull', 78, 12); decor(a, 'tree', 96, 12); decor(a, 'cactus', 114, 12); decor(a, 'tree', 126, 12);
  decor(a, 'tree', 144, 12); decor(a, 'skull', 162, 12); decor(a, 'tree', 174, 12);

  const b = mkArea(32, 'under');
  terrain(b, 0, 32, 12);
  for (let x = 0; x < 32; x++) { setT(b, x, 0, T.STONE); setT(b, x, 1, T.STONE); }
  for (let x = 5; x < 15; x++) blk(b, x, 8, T.QUEST, x === 9 ? 'oneup' : 'coin');
  coins(b, 5, 6, 10); coins(b, 17, 10, 8); arc(b, 17, 8, 8);
  const bp = pipe(b, 28, 12, 2);
  b.pipes.push({ tx: 28, ty: bp, to: 0, spawn: { pipe: { tx: 128, ty: pt }, mode: 'pipe' } });

  return {
    id: 2, name: 'DESFILADEIRO DO CAVALO', time: 400, track: 'canyon', bg: 'canyon',
    areas: [a, b], start: { tx: 3, ty: 11 }, mid, goal: { tx: 192 },
  };
}

const LEVELS = { 1: level1, 2: level2 };
const LEVEL_COUNT = 2;
