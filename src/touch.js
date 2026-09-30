'use strict';
// Controles de toque + layout responsivo (celular/tablet em modo paisagem).
// Os botões disparam KeyboardEvents sintéticos, então game.js não precisa saber que existe toque.

(() => {
  const qs = new URLSearchParams(location.search);
  const isTouch = qs.get('touch') === '1' ||
    ((matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && qs.get('touch') !== '0');
  window.IS_TOUCH = isTouch;
  document.body.classList.toggle('is-touch', isTouch);

  const stage = document.getElementById('stage');
  const canvas = document.getElementById('game');
  const hint = document.getElementById('rotateHint');
  let rotated = false, locked = false;

  const fire = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const down = code => fire('keydown', code);
  const up = code => fire('keyup', code);

  // ------------------------------------------------ layout / rotação / modo tela larga
  // full = false: jogo em 8:7 centralizado (bordas laterais). full = true: o canvas ocupa a largura toda
  // do dispositivo (mostrando mais cenário nos lados) e os botões ficam sobrepostos à imagem.
  let full = false, weFs = false;

  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    const portrait = h > w;
    // Em retrato (e sem travar a orientação) gira o palco 90° para jogar deitado.
    rotated = isTouch && portrait && !locked;
    let sw = w, sh = h;
    if (rotated) {
      sw = h; sh = w;
      stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
      stage.style.transformOrigin = '0 0';
      stage.style.transform = 'translate(' + w + 'px, 0) rotate(90deg)';
    } else {
      stage.style.width = '100vw'; stage.style.height = '100vh';
      stage.style.transform = 'none';
    }
    let viewW = 256;
    if (full) viewW = Math.max(256, Math.min(480, Math.round(224 * sw / sh)));
    if (window.setViewWidth) window.setViewWidth(viewW); else window.__wantView = viewW;
    const pxW = 2 * viewW;
    const scale = Math.min(sw / pxW, sh / 448);
    let cw = Math.round(pxW * scale), ch = Math.round(448 * scale);
    if (full && Math.abs(cw - sw) < 4) cw = sw;
    if (full && Math.abs(ch - sh) < 4) ch = sh;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.classList.toggle('full', full);
    document.body.classList.toggle('wide', full);
    // reserva espaço no HUD onde os botões pequenos (F / som / pausa) ficam por cima do canvas
    const overlap = isTouch ? Math.max(0, (sw + cw) / 2 - (sw - 176)) : 0;
    window.HUD_PAD = Math.round(overlap * pxW / cw);
    hint.style.display = 'none';
  }
  addEventListener('resize', layout);
  addEventListener('orientationchange', () => setTimeout(layout, 120));
  layout();

  // ------------------------------------------------ tela cheia do navegador + trava paisagem
  async function goFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) { await el.requestFullscreen({ navigationUI: 'hide' }); weFs = true; }
      else if (!document.fullscreenElement && el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); weFs = true; }
    } catch (e) { /* iOS Safari não suporta: segue com a rotação por CSS */ }
    if (isTouch) {
      try {
        if (screen.orientation && screen.orientation.lock) { await screen.orientation.lock('landscape'); locked = true; }
      } catch (e) { locked = false; }
    }
    layout();
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      locked = false; try { screen.orientation.unlock(); } catch (e) {}
      if (weFs) { weFs = false; full = false; }   // Esc / sair da tela cheia volta ao modo normal
    }
    layout();
  });

  // Botão / tecla F: alterna entre tela normal e tela inteira (largura toda)
  function toggleFull() {
    full = !full;
    if (full) goFullscreen();
    else if (document.fullscreenElement) { weFs = false; document.exitFullscreen(); }
    layout();
  }
  addEventListener('keydown', e => {
    if (e.code === 'KeyF' && e.isTrusted && !e.repeat) toggleFull();
  });

  if (!isTouch) return;

  // primeiro toque em qualquer lugar: tenta tela cheia + paisagem
  let asked = false;
  addEventListener('pointerdown', () => { if (!asked) { asked = true; goFullscreen(); } }, { passive: true });
  document.getElementById('bFull').addEventListener('pointerdown', e => { e.preventDefault(); asked = true; toggleFull(); });

  // ------------------------------------------------ botões A / B
  const held = new Map(); // pointerId -> code
  document.querySelectorAll('.btn[data-key]').forEach(el => {
    const code = el.dataset.key;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {}
      held.set(e.pointerId, code); el.classList.add('on'); down(code);
    });
    const release = e => {
      if (!held.has(e.pointerId)) return;
      held.delete(e.pointerId); el.classList.remove('on'); up(code);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  });
  // botões de toque único (pausa / som)
  document.querySelectorAll('.mini[data-tap]').forEach(el => {
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); const c = el.dataset.tap; down(c); up(c);
    });
  });

  // ------------------------------------------------ direcional (arrasta o dedo)
  const dpad = document.getElementById('dpad');
  const knob = dpad.querySelector('.knob');
  const state = { left: false, right: false, down: false };
  let dpId = null;
  function setDir(k, code, on) {
    if (state[k] === on) return;
    state[k] = on; on ? down(code) : up(code);
  }
  function dpUpdate(e) {
    const r = dpad.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (rotated) { const t = dx; dx = dy; dy = -t; }      // palco girado 90°
    const R = (rotated ? r.height : r.width) / 2;
    const nx = dx / R, ny = dy / R;
    setDir('left', 'ArrowLeft', nx < -0.22);
    setDir('right', 'ArrowRight', nx > 0.22);
    setDir('down', 'ArrowDown', ny > 0.5 && Math.abs(nx) < 0.7);
    const m = Math.min(1, Math.hypot(nx, ny)) * 34, a = Math.atan2(ny, nx);
    knob.style.transform = 'translate(' + (Math.cos(a) * m).toFixed(1) + 'px,' + (Math.sin(a) * m).toFixed(1) + 'px)';
  }
  function dpEnd(e) {
    if (e.pointerId !== dpId) return;
    dpId = null;
    setDir('left', 'ArrowLeft', false); setDir('right', 'ArrowRight', false); setDir('down', 'ArrowDown', false);
    knob.style.transform = 'none';
  }
  dpad.addEventListener('pointerdown', e => {
    e.preventDefault(); dpId = e.pointerId; try { dpad.setPointerCapture(e.pointerId); } catch (_) {} dpUpdate(e);
  });
  dpad.addEventListener('pointermove', e => { if (e.pointerId === dpId) dpUpdate(e); });
  dpad.addEventListener('pointerup', dpEnd);
  dpad.addEventListener('pointercancel', dpEnd);
  dpad.addEventListener('lostpointercapture', dpEnd);

  // ------------------------------------------------ toque na tela do jogo = Enter (título / game over / fim)
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); down('Enter'); up('Enter'); });

  // solta tudo se a página perder o foco
  addEventListener('blur', () => { ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ShiftLeft', 'Space'].forEach(up); });
  document.addEventListener('contextmenu', e => e.preventDefault());
})();
