'use strict';
// Sprites em pixel art definidos por texto. '.' = transparente. Cada letra é uma cor da paleta.

const PAL = {
  H: '#4a2a12', h: '#8a5a2b', S: '#f0b47c', K: '#1c1008', R: '#b8322a', C: '#f3dfa8',
  V: '#a5642c', J: '#3f5f86', B: '#33200f', Y: '#ffd23a', N: '#2b2622', W: '#efe6cf',
  O: '#b8651f', D: '#5a3417', L: '#e0a558', G: '#5f8b3a', g: '#86b552', P: '#e88a8a',
  A: '#a83232', F: '#ff8a1e', T: '#c7893a', M: '#7a4a24', Z: '#fff2a0', E: '#8a8a86',
};

function spr(rows, opt = {}) {
  const w = opt.w || 16, h = opt.h || 16, pal = opt.pal || PAL;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const r = rows.slice();
  if (opt.bottom) while (r.length < h) r.unshift('');
  for (let y = 0; y < Math.min(h, r.length); y++) {
    const s = r[y];
    for (let x = 0; x < Math.min(w, s.length); x++) {
      const ch = s[x];
      if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }
    }
  }
  return c;
}

// ---------- Cowboy (jogador) ----------
const SMALL_TOP = [
  '................',
  '.....hhhhhh.....',
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '.....SSSSSSS....',
  '.....SSSKSKS....',
  '.....SSSSSSSS...',
  '....RRRRRRR.....',
  '...CCVVCCVVCC...',
  '...SCVVVVVVCS...',
  '....VVVYVVVV....',
];
const LEGS = {
  idle: ['....JJJ.JJJ.....', '....JJJ.JJJ.....', '....JJJ.JJJ.....', '...BBBB.BBBB....', '...BBBB.BBBB....'],
  run1: ['....JJJJJJ......', '...JJJ..JJJ.....', '..JJJ....JJJ....', '..BBB....BBB....', '..BBB....BBB....'],
  run2: ['....JJJJJJ......', '.....JJJJ.......', '.....JJJJ.......', '....BBBBBB......', '....BBBBBB......'],
  jump: ['...JJJ..JJJJ....', '..JJJ....BBBB...', '..BBB....BBBB...', '..BBB...........', '..BBB...........'],
};
const BIG_TORSO = [
  '...CCVVCCVVCC...',
  '..SCCVVCCVVCCS..',
  '..SCVVVVVVVVCS..',
  '...SCVVVVVVCS...',
  '....VVVYVVVV....',
  '....VVVVVVVV....',
  '....JJJJJJJJ....',
];
const bigLegs = l => [l[0], l[1], l[1], l[1], l[1], l[1], l[2], l[3], l[4]];

function playerSet(pal) {
  const o = { pal };
  const small = {}, big = {};
  for (const k of Object.keys(LEGS)) {
    small[k] = spr(SMALL_TOP.concat(LEGS[k]), { pal });
    big[k] = spr(SMALL_TOP.slice(0, 8).concat(BIG_TORSO, bigLegs(LEGS[k])), { h: 24, pal });
  }
  o.small = small; o.big = big;
  return o;
}

// ---------- Cavalo (o "Yoshi") ----------
const HORSE_ROWS = [
  '....................DD..',
  '...................DOOD.',
  '..................DOOOOO',
  '.................DOKOOOO',
  '................DOOOOOLL',
  '...............DOOOOOOLL',
  '.DD.......OOAAAAAOOOO...',
  'DD.......OOOOOOOOOOOOO..',
  'D.......OOOOOOOOOOOOOO..',
  'D.......OOOOOOOOOOOOO...',
  '........LOOOOOOOOOOOL...',
  '........OO.OO.....OO.OO.',
  '........OO.OO.....OO.OO.',
  '........OO.OO.....OO.OO.',
  '........DD.DD.....DD.DD.',
  '........DD.DD.....DD.DD.',
];
function horseAlt() {
  const rows = HORSE_ROWS.slice(0, 11);
  for (let i = 11; i < 16; i++) {
    const src = HORSE_ROWS[i];
    const back = src.slice(8, 13), front = src.slice(18, 23);
    let r = '.'.repeat(24).split('');
    for (let k = 0; k < 5; k++) { r[6 + k] = back[k]; r[19 + k] = front[k]; }
    rows.push(r.join(''));
  }
  return rows;
}

const SP = {};
function buildSprites() {
  SP.player = playerSet(PAL);
  SP.sheriff = playerSet(Object.assign({}, PAL, {
    H: '#1c1814', h: '#3a332c', R: '#e2b02a', C: '#ead79a', V: '#7b4a26', J: '#5a3417', B: '#22160c', S: '#e0a070',
  }));
  SP.horse = [spr(HORSE_ROWS, { w: 24 }), spr(horseAlt(), { w: 24 })];

  const banditA = [
    '................', '....NNNNNN......', '...NNNNNNNN.....', '..NNNNNNNNNN....', '....SSSSSS......',
    '....SKSSKS......', '....RRRRRR......', '...NNNRRNNN.....', '..SNNNNNNNNS....', '..SNNNYNNNNS....',
    '...NNNNNNNN.....', '...NNNNNNNN.....',
  ];
  SP.bandit = [
    spr(banditA.concat(['....NNN.NNN.....', '....NNN.NNN.....', '...BBBB.BBBB....', '...BBBB.BBBB....'])),
    spr(banditA.concat(['....NNNNNN......', '.....NNNN.......', '....BBBBBB......', '....BBBBBB......'])),
  ];
  SP.banditFlat = spr(['...NNNNNNNN.....', '..NNNRRRRNNN....', '..SNNNNNNNNS....', '..BBBB....BBBB..'], { bottom: true });

  const coyoteTop = [
    '..D.D...........', '..DODOOOO.......', '.KOOOOOOOOOO....', 'KKOOLOOOOOOOOD..',
    '.LLOOOOOOOOOOOD.', '..LLLOOOOOOOOD..', '...LOOOOOOOOD...',
  ];
  SP.coyote = [
    spr(coyoteTop.concat(['...OO.OO.OO.OO..', '...OO.OO.OO.OO..', '...DD.DD.DD.DD..']), { bottom: true }),
    spr(coyoteTop.concat(['....OOOO..OOOO..', '....OOOO..OOOO..', '....DDDD..DDDD..']), { bottom: true }),
  ];

  const tatuTop = [
    '.....DDDDDD.....', '...DDLLDLLDD....', '..DLLDLLDLLDD...', '.DLLDLLDLLDLLD..',
    'SSDDDDDDDDDDDD..', 'SKSDLDLDLDLDDD..', 'SSSDDDDDDDDDD...', '.SS.DDDDDDDD....',
  ];
  SP.tatu = [
    spr(tatuTop.concat(['..OO..OO..OO....', '..OO..OO..OO....']), { bottom: true }),
    spr(tatuTop.concat(['...OO..OO..OO...', '...OO..OO..OO...']), { bottom: true }),
  ];
  SP.shell = spr([
    '....DDDDDDDD....', '..DDLLDLLDLLDD..', '.DLLDLLDLLDLLDD.', '.DDDDDDDDDDDDDD.',
    '.DLLDLLDLLDLLDD.', '..DDDDDDDDDDDD..', '....DDDDDDDD....',
  ], { bottom: true });

  SP.cannon = spr([
    '....NNNNNNNN....', '..NNNNNNNNNNNN..', '.NNNNNNNNNNNNNN.', '.NNWWNNNNNNNNNN.',
    'NNWKWNNNNNNNNNNN', 'NNNNNNNNNNNNNNNN', 'NNRRRRNNNNNNNNNN', 'NNNNNNNNNNNNNNNN',
    '.NNNNNNNNNNNNNN.', '.NNNNNNNNNNNNNN.', '..NNNNNNNNNNNN..', '....NNNNNNNN....',
  ], { bottom: true });

  const moleTop = [
    '....OOOOO.......', '..OOOOOOOOO.....', '.OOKOOOOOOOO....', 'PPOOOOOOOOOOO...',
    '.LLOOOOOOOOOOO..', '..OOOOOOOOOOOO..', '..OOLOOOOOOLO...',
  ];
  SP.mole = [
    spr(moleTop.concat(['..OOO.OOO.OOO...', '..DDD.DDD.DDD...']), { bottom: true }),
    spr(moleTop.concat(['...OOO.OOO.OOO..', '...DDD.DDD.DDD..']), { bottom: true }),
  ];

  SP.cactusEnemy = spr([
    '................', '......GGGG......', '.....GGGGGG.....', '.....GKGGKG.....', '.....GGRRGG.....',
    '.....GGGGGG.....', '..G..GGGGGG..G..', '..GG.GGGGGG.GG..', '..GGGGGGGGGGGG..',
    '...GGGGGGGGGG...', '......GGGG......', '......GGGG......', '......GGGG......',
    '......GGGG......', '......GGGG......', '......GGGG......',
  ]);

  SP.mushroom = spr([
    '....FFFFFFFF....', '..FFWWFFFFWWFF..', '.FFWWWWFFFWWWWF.', '.FFWWWWFFFFWWFF.',
    'FFFFWWFFFFFFFFFF', 'FFFFFFFFFFFFFFFF', '.DDDDDDDDDDDDDD.', '...CCCCCCCCCC...',
    '...CCKCCCCKCC...', '...CCCCCCCCCC...', '....CCCCCCCC....',
  ], { bottom: true });
  SP.oneup = spr([
    '....GGGGGGGG....', '..GGWWGGGGWWGG..', '.GGWWWWGGGWWWWG.', '.GGWWWWGGGGWWGG.',
    'GGGGWWGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', '.DDDDDDDDDDDDDD.', '...CCCCCCCCCC...',
    '...CCKCCCCKCC...', '...CCCCCCCCCC...', '....CCCCCCCC....',
  ], { bottom: true });

  SP.dcoin = spr([
    '....DDDD....', '..DDYYYYDD..', '.DYYYYYYYYD.', '.DYYYOOYYYD.', 'DYYYYOOYYYYD',
    'DYYOOOOOOYYD', 'DYYYOOOOYYYD', 'DYYYOOOOYYYD', 'DYYOOYYOOYYD', 'DYYYYYYYYYYD',
    '.DYYYYYYYYD.', '.DYYYYYYYYD.', '..DDYYYYDD..', '....DDDD....',
  ], { w: 12, h: 14 });

  SP.sign = spr([
    '.MMMMMMMMMMMMMM.', 'MTTTTTTTTTTTTTTM', 'MTDDDDDDDDDDDDTM', 'MTTTTTTTTTTTTTTM',
    'MTDDDDDDDDDDTTTM', 'MTTTTTTTTTTTTTTM', '.MMMMMMMMMMMMMM.', '.......MM.......',
    '.......MM.......', '.......MM.......', '.......MM.......',
  ], { bottom: true });

  SP.cactusDeco = spr([
    '.......GG.......', '......GGGg......', '......GGGg......', '..GG..GGGg......', '..GG..GGGg..GG..',
    '..GG..GGGg..GG..', '..GGGGGGGg..GG..', '..GGGGGGGGGGGG..', '......GGGg......',
    '......GGGg......', '......GGGg......', '......GGGg......', '......GGGg......',
  ], { bottom: true });
  SP.treeDeco = spr([
    '..D.......D.....', '..DD.....DD.....', '...D.....D..D...', '...DD...DD.DD...', '....D...D.DD....',
    '....DD.DD.D.....', '.....DDDDDD.....', '......DDDD......', '......DDDD......',
    '......DDDD......', '.......DD.......', '.......DD.......', '.......DD.......',
  ], { bottom: true });
  SP.skullDeco = spr([
    '..W.........W...', '.WWW.......WWW..', '..WWWWWWWWWWW...', '...WWWWWWWWW....',
    '...WKKWWWKKW....', '...WKKWWWKKW....', '....WWWKWWW.....', '....WWWWWWW.....',
  ], { bottom: true });
}

// ---------- Tiles gerados por código ----------
const T = {
  EMPTY: 0, GROUND: 1, DIRT: 2, BRICK: 3, QUEST: 4, USED: 5, STONE: 6,
  PIPE_TL: 7, PIPE_TR: 8, PIPE_BL: 9, PIPE_BR: 10, PLANK: 11,
};

const THEMES = {
  day: {
    top: '#f2c463', topHi: '#ffe08a', topLo: '#c9922f', dirt: '#b8722f', dirtDk: '#8a4f1f', dirtLt: '#d99550',
    brick: '#c8662a', mortar: '#7d3a16', q: '#f5b02e', qLt: '#ffd24a', qDk: '#8a4a10',
    pipe: '#cc7a30', pipeDk: '#7a3f14', pipeLt: '#f4b06a', plank: '#c08040', plankDk: '#7a4a20', stone: '#c9b083', stoneDk: '#8a7550',
  },
  canyon: {
    top: '#d98a4a', topHi: '#f0aa66', topLo: '#a85f2c', dirt: '#8a4a26', dirtDk: '#5f2f16', dirtLt: '#b0683a',
    brick: '#b5552a', mortar: '#6a2c12', q: '#f0a828', qLt: '#ffcc44', qDk: '#7a3c0c',
    pipe: '#b86a2c', pipeDk: '#6a3410', pipeLt: '#e89c58', plank: '#a86e38', plankDk: '#673a18', stone: '#b59a72', stoneDk: '#7a6444',
  },
  under: {
    top: '#8a5a2b', topHi: '#b07a3e', topLo: '#5a3417', dirt: '#5a3417', dirtDk: '#3a200d', dirtLt: '#7a4a24',
    brick: '#a85428', mortar: '#4a200c', q: '#f0a828', qLt: '#ffcc44', qDk: '#6a340a',
    pipe: '#c47430', pipeDk: '#6a3410', pipeLt: '#ecA85a', plank: '#9a6432', plankDk: '#5a3416', stone: '#8a7550', stoneDk: '#5a4a30',
  },
};

const TILESETS = {};
function buildTileset(name) {
  if (TILESETS[name]) return TILESETS[name];
  const th = THEMES[name], set = {};
  let seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const mk = fn => { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); fn(g); return c; };
  const px = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const speckle = g => {
    for (let i = 0; i < 12; i++) px(g, th.dirtDk, (rnd() * 16) | 0, (rnd() * 16) | 0);
    for (let i = 0; i < 8; i++) px(g, th.dirtLt, (rnd() * 16) | 0, (rnd() * 16) | 0);
  };
  set[T.DIRT] = mk(g => { px(g, th.dirt, 0, 0, 16, 16); speckle(g); });
  set[T.GROUND] = mk(g => {
    px(g, th.dirt, 0, 0, 16, 16); speckle(g);
    px(g, th.top, 0, 0, 16, 5);
    px(g, th.topHi, 0, 0, 16, 1);
    for (let x = 0; x < 16; x++) px(g, th.top, x, 5, 1, rnd() < 0.5 ? 1 : 2);
    for (let i = 0; i < 4; i++) px(g, th.topLo, (rnd() * 16) | 0, 2 + ((rnd() * 2) | 0), 2, 1);
  });
  set[T.BRICK] = mk(g => {
    px(g, th.brick, 0, 0, 16, 16);
    for (let r = 0; r < 4; r++) {
      px(g, th.mortar, 0, r * 4 + 3, 16, 1);
      const off = r % 2 ? 3 : 11;
      px(g, th.mortar, off, r * 4, 1, 3);
      if (r % 2 === 0) px(g, th.mortar, 3, r * 4, 1, 0);
    }
    px(g, th.topHi || '#fff', 0, 0, 16, 0);
  });
  const glyph = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
  for (let f = 0; f < 2; f++) {
    set['q' + f] = mk(g => {
      px(g, th.qDk, 0, 0, 16, 16);
      px(g, f ? th.qLt : th.q, 1, 1, 14, 14);
      px(g, th.qDk, 0, 0, 1, 1); px(g, th.qDk, 15, 0, 1, 1); px(g, th.qDk, 0, 15, 1, 1); px(g, th.qDk, 15, 15, 1, 1);
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px(g, th.qDk, x, y);
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (glyph[y][x] === '#') {
        px(g, th.qDk, 5 + x + 1, 4 + y + 1); px(g, '#fff4c4', 5 + x, 4 + y);
      }
    });
  }
  set[T.USED] = mk(g => {
    px(g, '#5a3417', 0, 0, 16, 16); px(g, '#8a5a2b', 1, 1, 14, 14);
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px(g, '#3a200d', x, y);
  });
  set[T.STONE] = mk(g => {
    px(g, th.stoneDk, 0, 0, 16, 16); px(g, th.stone, 1, 1, 14, 14);
    px(g, th.stoneDk, 4, 5, 5, 1); px(g, th.stoneDk, 8, 6, 1, 4); px(g, th.stoneDk, 3, 11, 4, 1);
  });
  set[T.PLANK] = mk(g => {
    px(g, th.plankDk, 0, 0, 16, 16); px(g, th.plank, 0, 1, 16, 6); px(g, th.plank, 0, 9, 16, 6);
    px(g, th.plankDk, 2, 3); px(g, th.plankDk, 13, 3); px(g, th.plankDk, 2, 11); px(g, th.plankDk, 13, 11);
  });
  const pipePart = (left, cap) => mk(g => {
    if (cap) {
      px(g, th.pipeDk, 0, 0, 16, 16); px(g, th.pipe, left ? 1 : 0, 1, 15, 14);
      if (left) px(g, th.pipeLt, 3, 2, 3, 12); else px(g, th.pipeDk, 9, 2, 4, 12);
    } else {
      const x0 = left ? 2 : 0;
      px(g, th.pipeDk, x0, 0, 14, 16); px(g, th.pipe, left ? 3 : 0, 0, 13, 16);
      if (left) px(g, th.pipeLt, 5, 0, 3, 16); else px(g, th.pipeDk, 8, 0, 4, 16);
    }
  });
  set[T.PIPE_TL] = pipePart(true, true); set[T.PIPE_TR] = pipePart(false, true);
  set[T.PIPE_BL] = pipePart(true, false); set[T.PIPE_BR] = pipePart(false, false);
  TILESETS[name] = set;
  return set;
}
