/**
 * Retro sound effects generator using Web Audio API.
 * Provides terminal hums, typing clicks, drive seek sounds, error beeps, and modem handshakes.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.humOsc = null;
    this.humGain = null;
    this.isHumming = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Setup background hum (low-frequency CRT hum)
    this.setupHum();
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound(forceState) {
    if (forceState !== undefined) {
      this.enabled = forceState;
    } else {
      this.enabled = !this.enabled;
    }

    if (this.enabled) {
      this.resume();
      this.startHum();
    } else {
      this.stopHum();
    }
    return this.enabled;
  }

  setupHum() {
    if (!this.ctx) return;

    // Low frequency hum + subtle higher frequency buzz to simulate CRT screen
    this.humOsc = this.ctx.createOscillator();
    this.humOsc2 = this.ctx.createOscillator();
    this.humGain = this.ctx.createGain();

    this.humOsc.type = 'sine';
    this.humOsc.frequency.value = 60; // 60 Hz hum

    this.humOsc2.type = 'triangle';
    this.humOsc2.frequency.value = 120; // Harmonic buzz

    this.humGain.gain.value = 0.003; // Very quiet background hum

    this.humOsc.connect(this.humGain);
    this.humOsc2.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);

    this.humOsc.start(0);
    this.humOsc2.start(0);
  }

  startHum() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    if (this.humGain && !this.isHumming) {
      this.humGain.gain.setValueAtTime(0.003, this.ctx.currentTime);
      this.isHumming = true;
    }
  }

  stopHum() {
    if (this.humGain && this.isHumming) {
      this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.isHumming = false;
    }
  }

  // Quick mechanical key click
  playKeyClick() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;

    // Keypresses have a tiny high-pass click and a low-frequency woody bounce
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Randomize slightly for a natural feel
    osc.frequency.setValueAtTime(150 + Math.random() * 80, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.03);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.03);

    // High frequency transient
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1200 + Math.random() * 500, t);
    clickOsc.frequency.exponentialRampToValueAtTime(800, t + 0.008);

    clickGain.gain.setValueAtTime(0.015, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.008);

    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);

    clickOsc.start(t);
    clickOsc.stop(t + 0.01);
  }

  // Play standard retro error beep
  playErrorBeep() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square'; // Harsh, retro PC speaker square wave
    osc.frequency.setValueAtTime(800, t); // 800 Hz MS-DOS beep

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.setValueAtTime(0.12, t + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.21);
  }

  // Play bios check or success sound
  playBootSound() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // Major chord arpeggio

    notes.forEach((freq, i) => {
      const noteTime = t + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.06, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
    });
  }

  // Simulates old floppy/hard drive head stepping (e.g. read/write seek clicks)
  playDiskSeek() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const clickCount = 4 + Math.floor(Math.random() * 6);
    const interval = 0.05; // speed of seek

    for (let i = 0; i < clickCount; i++) {
      const clickTime = t + i * interval;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80 + Math.random() * 40, clickTime);
      osc.frequency.exponentialRampToValueAtTime(10, clickTime + 0.015);

      gain.gain.setValueAtTime(0.2, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.012);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.02);
    }
  }

  // Synthesizes a dial-up modem handshake!
  playDialUp(onComplete) {
    if (!this.enabled || !this.ctx) {
      if (onComplete) setTimeout(onComplete, 1000);
      return;
    }
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    let time = t;

    // 1. Dial tone (continuous dual tone, here simulated with single 350+440Hz average or just 400Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, time);
    gain.gain.setValueAtTime(0.03, time);
    time += 1.0;

    // 2. DTMF Tones (dialing numbers)
    const dtmfFreqs = [
      [941, 1336], // 0
      [697, 1209], // 1
      [770, 1477], // 6
      [852, 1477], // 9
      [941, 1477]  // #
    ];

    dtmfFreqs.forEach((freqPair) => {
      // For simplicity, we alternate two frequencies or warp the oscillator
      const toneTime = time;
      osc.frequency.setValueAtTime(freqPair[0], toneTime);
      osc.frequency.setValueAtTime(freqPair[1], toneTime + 0.07);
      gain.gain.setValueAtTime(0.04, toneTime);
      gain.gain.setValueAtTime(0, toneTime + 0.15);
      time += 0.2;
    });

    // Ringing sound (simulate 2 rings)
    for (let r = 0; r < 2; r++) {
      const ringTime = time + 0.2;
      osc.frequency.setValueAtTime(440, ringTime); // average ringing frequency
      gain.gain.setValueAtTime(0.03, ringTime);
      gain.gain.setValueAtTime(0, ringTime + 1.2);
      time += 2.0;
    }

    // 3. Handshake screaming (screeching static and piezo tones)
    const screechTime = time;
    osc.type = 'square';
    osc.frequency.setValueAtTime(2225, screechTime); // Answer tone
    gain.gain.setValueAtTime(0.04, screechTime);

    // modulate frequency rapidly to simulate white noise static
    const modulationInterval = 0.02;
    const screechDuration = 3.0;
    const steps = screechDuration / modulationInterval;

    for (let step = 0; step < steps; step++) {
      const stepTime = screechTime + 1.0 + (step * modulationInterval);
      // Random frequencies representing connection handshake negotiation
      const randFreq = step % 4 === 0
        ? 600 + Math.random() * 1000
        : 2000 + Math.random() * 2000;
      osc.frequency.setValueAtTime(randFreq, stepTime);
    }

    gain.gain.setValueAtTime(0.04, screechTime + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, screechTime + screechDuration + 1.0);

    time += screechDuration + 1.2;

    osc.start(t);
    osc.stop(time);

    // Call back once done
    if (onComplete) {
      setTimeout(() => {
        if (this.enabled) this.startHum();
        onComplete();
      }, (time - t) * 1000);
    }
  }
}

export const sound = new SoundManager();
export default sound;
