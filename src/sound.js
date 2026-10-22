// Bruitages, ambiance « Tampon » : coups de tampon, papier froissé, petites lames de métal.
// Fabriqués à la volée avec Web Audio, sans aucun fichier son. Coupables depuis l'accueil, réglage retenu sur l'appareil.
import { load, save } from "./storage.js";

let on = load("sound", true);
export const soundEnabled = () => on;
export const enableSound = (v) => save("sound", (on = v));

let ctx, out, noise;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function envelope(g, at, v, a, d) {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + a);
  g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
}
function tone(at, { f, f2, a = 0.003, d = 0.2, v = 0.2 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + a + d);
  envelope(g, at, v, a, d);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + a + d + 0.05);
}
function hiss(at, { a = 0.002, d = 0.05, v = 0.3, type = "bandpass", f = 2000, f2, q = 1 }) {
  const src = ctx.createBufferSource();
  const fl = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noise;
  fl.type = type;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f, at);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + a + d);
  envelope(g, at, v, a, d);
  src.connect(fl).connect(g).connect(out);
  src.start(at, Math.random() * 0.5);
  src.stop(at + a + d + 0.05);
}

// Les gestes de base. Une note : petite lame de métal, avec le « tac » du papier.
function note(at, m, v, long) {
  const f = mtof(m);
  tone(at, { f, a: 0.002, d: long ? 0.55 : 0.3, v });
  tone(at, { f: f * 2, a: 0.002, d: 0.08, v: v * 0.18 });
  if (f < 1800) tone(at, { f: f * 5.4, a: 0.001, d: 0.025, v: v * 0.22 });
  hiss(at, { f: 1800, q: 1.4, d: 0.012, v: v * 0.9 });
}
// Le tampon encreur : bruit sourd, claque du caoutchouc, puis il se décolle du papier.
function hit(at, v) {
  tone(at, { f: 160, f2: 52, a: 0.002, d: 0.14, v });
  hiss(at, { type: "lowpass", f: 900, d: 0.05, v: v * 0.9 });
  hiss(at, { f: 1800, q: 1.2, d: 0.022, v: v * 0.6 });
  hiss(at + 0.085, { type: "highpass", f: 4500, d: 0.008, v: v * 0.18 });
}
const swish = (at, v) => hiss(at, { f: 1100, f2: 4200, q: 1.3, a: 0.04, d: 0.15, v: v * 4 });
const tick = (at, v) => {
  hiss(at, { f: 3400, q: 5, d: 0.01, v: v * 3.5 });
  tone(at, { f: 2100, d: 0.012, v: v * 0.5 });
};
const pop = (at, v) => {
  tone(at, { f: 620, f2: 190, a: 0.001, d: 0.05, v });
  hiss(at, { f: 1400, q: 2, d: 0.012, v: v * 0.8 });
};

// Gamme pentatonique de do (do5, ré5, mi5, sol5, la5, do6…) : la série peut monter, ça ne sonne jamais faux.
const PENTA = [0, 2, 4, 7, 9];
const step = (n) => 72 + 12 * Math.floor(n / 5) + PENTA[n % 5];

const MOMENTS = {
  flash: (t, n) => {
    n = Math.min(n, 6);
    note(t, step(n + 3), 0.2);
    note(t + 0.075, step(n + 5), 0.24, true);
  },
  carre: (t, n) => note(t, step(Math.min(n, 6) + 3), 0.15),
  rate: (t) => {
    note(t, 70, 0.15);
    note(t + 0.14, 67, 0.13, true);
  },
  tic: (t, n) => tick(t, 0.1 + n * 0.03),
  epingle: (t) => pop(t, 0.22),
  depart: (t) => {
    swish(t, 0.09);
    [72, 76, 79, 84].forEach((m, i) => note(t + 0.04 + i * 0.045, m, 0.1 + i * 0.025, i === 3));
  },
  fin: (t) => {
    hit(t, 0.32);
    note(t + 0.02, 84, 0.12, true);
  },
  record: (t) => {
    hit(t, 0.42);
    [79, 84, 88].forEach((m, i) => note(t + 0.1 + i * 0.09, m, 0.16 + i * 0.02));
    note(t + 0.37, 91, 0.22, true);
    note(t + 0.37, 96, 0.1, true);
  },
  niveau: (t) => {
    hit(t, 0.38);
    [72, 74, 76, 79, 81, 84, 86, 88].forEach((m, i) => note(t + 0.06 + i * 0.035, m, 0.06 + i * 0.01));
    note(t + 0.38, 91, 0.18, true);
    note(t + 0.38, 96, 0.1, true);
  },
  // Calé sur l'écran « badge débloqué » : ouverture, le tampon s'écrase (0,3 s), l'onde, puis les confettis.
  badge: (t) => {
    swish(t, 0.07);
    hit(t + 0.3, 0.5);
    swish(t + 0.42, 0.09);
    [84, 88, 91].forEach((m) => note(t + 0.45, m, 0.12, true));
    [96, 100, 103, 98, 105, 100].forEach((m, i) => note(t + 0.58 + i * 0.065, m, 0.05));
  },
  essayer: (t) => swish(t, 0.07),
  acheter: (t) => {
    hit(t, 0.26);
    note(t + 0.07, 91, 0.12);
    note(t + 0.12, 96, 0.16, true);
  },
};

// Joue un bruitage. n : bonnes réponses d'affilée avant celle-ci (flash, carré), ou rang du tic du chrono.
export function sound(id, n = 0) {
  if (!on) return;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      try {
        navigator.audioSession.type = "ambient"; // iPhone : suit le mode silencieux et laisse jouer la musique
      } catch {}
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const comp = ctx.createDynamicsCompressor(); // filet de sécurité quand deux sons se chevauchent
      comp.threshold.value = -12;
      comp.knee.value = 8;
      comp.ratio.value = 4;
      comp.attack.value = 0.002;
      comp.release.value = 0.15;
      out = ctx.createGain();
      out.gain.value = 0.5; // volontairement bas : jamais plus fort qu'une notification
      out.connect(comp).connect(ctx.destination);
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    MOMENTS[id](ctx.currentTime + 0.02, n);
  } catch {} // pas de Web Audio : l'app reste muette, sans erreur
}
