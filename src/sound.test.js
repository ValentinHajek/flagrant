import assert from "node:assert/strict";

// Un faux Web Audio qui compte les sons programmés.
let started = 0;
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({
  connect: (n) => n,
  start: () => started++,
  stop() {},
  ...Object.fromEntries(["frequency", "gain", "Q", "threshold", "knee", "ratio", "attack", "release"].map((k) => [k, param()])),
});
globalThis.window = {
  AudioContext: class {
    state = "running";
    currentTime = 0;
    sampleRate = 8000;
    destination = node();
    createOscillator = node;
    createGain = node;
    createBiquadFilter = node;
    createBufferSource = node;
    createDynamicsCompressor = node;
    createBuffer = (_, n) => ({ getChannelData: () => new Float32Array(n) });
  },
};
const { enableSound, sound, soundEnabled } = await import("./sound.js");

assert.equal(soundEnabled(), true, "son activé par défaut");
for (const id of ["flash", "carre", "rate", "tic", "epingle", "depart", "fin", "record", "niveau", "badge", "essayer", "acheter"]) {
  const before = started;
  sound(id, 3);
  assert.ok(started > before, `le bruitage « ${id} » existe et joue`);
}
assert.doesNotThrow(() => sound("inconnu"), "un bruitage inconnu ne casse jamais l'app");

enableSound(false);
const before = started;
sound("record");
assert.equal(started, before, "son coupé : plus rien ne joue");

console.log("sound OK");
