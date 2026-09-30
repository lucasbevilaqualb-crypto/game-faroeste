'use strict';
// Efeitos e música em chiptune via WebAudio (sem arquivos externos).

const Snd = {
  ctx: null, master: null, muted: false, music: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  },

  tone(f, d, type = 'square', v = 0.1, f2 = null, when = null) {
    if (!this.ctx) return;
    const t0 = when == null ? this.ctx.currentTime : when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + d + 0.02);
  },

  seq(list, gap = 0.07, type = 'square', v = 0.1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    list.forEach((f, i) => this.tone(f, gap * 1.4, type, v, null, t + i * gap));
  },

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump': this.tone(280, 0.16, 'square', 0.09, 640); break;
      case 'coin': this.seq([988, 1319], 0.06, 'square', 0.08); break;
      case 'star': this.seq([784, 988, 1175, 1568], 0.07, 'square', 0.09); break;
      case 'stomp': this.tone(220, 0.09, 'square', 0.12, 90); break;
      case 'kick': this.tone(160, 0.08, 'sawtooth', 0.1, 320); break;
      case 'bump': this.tone(120, 0.08, 'square', 0.1, 80); break;
      case 'break': this.tone(200, 0.16, 'sawtooth', 0.1, 50); break;
      case 'power': this.seq([392, 494, 587, 784, 988], 0.07, 'square', 0.09); break;
      case 'appear': this.tone(200, 0.3, 'triangle', 0.14, 700); break;
      case 'mount': this.seq([523, 659, 784, 1047], 0.06, 'triangle', 0.14); break;
      case 'hurt': this.tone(500, 0.3, 'sawtooth', 0.1, 90); break;
      case 'die': this.seq([494, 466, 440, 392, 330, 262, 196], 0.11, 'square', 0.1); break;
      case '1up': this.seq([659, 784, 1319, 1047, 1175, 1568], 0.08, 'square', 0.09); break;
      case 'cannon': this.tone(140, 0.25, 'sawtooth', 0.08, 50); break;
      case 'pipe': this.tone(300, 0.3, 'triangle', 0.12, 80); break;
      case 'check': this.seq([523, 659, 784], 0.08, 'triangle', 0.12); break;
      case 'clear': this.seq([523, 523, 523, 659, 784, 1047, 784, 1047], 0.13, 'square', 0.09); break;
      case 'gameover': this.seq([392, 330, 262, 196], 0.25, 'triangle', 0.14); break;
    }
  },

  // ---- música ----
  startMusic(track) {
    this.stopMusic();
    if (!this.ctx || !track) return;
    this.music = {
      track, step: 0, next: this.ctx.currentTime + 0.1,
      timer: setInterval(() => this.pump(), 30),
    };
  },
  stopMusic() {
    if (this.music) { clearInterval(this.music.timer); this.music = null; }
  },
  pump() {
    const m = this.music;
    if (!m || !this.ctx) return;
    const dur = 60 / m.track.bpm / 2;
    while (m.next < this.ctx.currentTime + 0.2) {
      const s = m.step, tr = m.track;
      const mel = tr.mel[s % tr.mel.length];
      if (mel) this.tone(440 * Math.pow(2, (mel - 69) / 12), dur * 1.6, 'square', 0.035, null, m.next);
      const root = tr.roots[((s / 4) | 0) % tr.roots.length];
      const b = root + (s % 2 ? 7 : 0);
      this.tone(440 * Math.pow(2, (b - 69) / 12), dur * 0.9, 'triangle', 0.09, null, m.next);
      if (s % 4 === 2) this.tone(6000, 0.03, 'square', 0.012, null, m.next);
      m.next += dur; m.step++;
    }
  },
};

const TRACKS = {
  dunas: {
    bpm: 150,
    mel: [64, 0, 67, 0, 69, 71, 69, 67, 64, 0, 62, 0, 64, 0, 0, 0, 64, 0, 67, 0, 69, 71, 72, 71, 69, 67, 64, 62, 64, 0, 0, 0],
    roots: [40, 40, 45, 45, 43, 43, 38, 40],
  },
  canyon: {
    bpm: 160,
    mel: [69, 0, 72, 0, 71, 0, 69, 67, 64, 0, 67, 0, 69, 0, 0, 0, 69, 0, 72, 0, 74, 0, 72, 71, 69, 0, 67, 0, 64, 0, 0, 0],
    roots: [45, 45, 41, 41, 43, 43, 40, 45],
  },
  under: {
    bpm: 110,
    mel: [57, 0, 0, 60, 0, 0, 62, 0, 60, 0, 0, 57, 0, 0, 0, 0],
    roots: [33, 33, 36, 31],
  },
};
