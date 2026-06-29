class AudioEngine {
  constructor() {
    this.ctx = null;
    this.currentSource = null;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.analyser = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playStartup() {
    this.init();
    const now = this.ctx.currentTime;
    const freqs = [155.56, 233.08, 311.13, 392.00, 466.16, 698.46];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.01, now + 1.5);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 4.5);
    });
  }

  playShutdown() {
    this.init();
    const now = this.ctx.currentTime;
    const freqs = [466.16, 392.00, 311.13, 233.08];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.15);
      gainNode.gain.setValueAtTime(0, now + idx * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.1, now + idx * 0.15 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.2);
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 1.2);
    });
  }

  playError() {
    this.init();
    const now = this.ctx.currentTime;
    const freqs = [150, 175];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  playClick() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    gainNode.gain.setValueAtTime(0.02, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playProceduralMusic(trackIndex, onNoteCallback) {
    this.init();
    this.stopMusic();
    this.isPlayingMusic = true;
    const bpm = 120;
    const beatDuration = 60 / bpm;
    const noteFreq = {
      'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63,
      'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00,
      'A#': 466.16, 'B': 493.88
    };
    const getFreq = (note, octave) => {
      const base = noteFreq[note];
      if (!base) return 0;
      return base * Math.pow(2, octave - 4);
    };

    const tracks = [
      [
        ['E', 4, 1], ['G', 4, 1], ['C', 5, 1], ['E', 5, 1],
        ['D', 5, 1], ['B', 4, 1], ['G', 4, 1], ['D', 4, 1],
        ['C', 4, 1], ['E', 4, 1], ['A', 4, 1], ['C', 5, 1],
        ['B', 4, 1], ['G#', 4, 1], ['E', 4, 1], ['B', 3, 1],
        ['A', 4, 1], ['C', 5, 1], ['E', 5, 1], ['A', 5, 1],
        ['G', 5, 1], ['E', 5, 1], ['C', 5, 1], ['G', 4, 1],
        ['F', 4, 1], ['A', 4, 1], ['C', 5, 1], ['F', 5, 1],
        ['E', 5, 2], ['D', 5, 2]
      ],
      [
        ['A', 3, 2], ['C', 4, 2], ['E', 4, 2], ['G', 4, 2],
        ['F', 3, 2], ['A', 3, 2], ['C', 4, 2], ['E', 4, 2],
        ['D', 3, 2], ['F', 3, 2], ['A', 3, 2], ['C', 4, 2],
        ['E', 3, 2], ['G#', 3, 2], ['B', 3, 2], ['E', 4, 2]
      ],
      [
        ['C', 4, 0.5], ['C', 4, 0.5], ['E', 4, 0.5], ['C', 4, 0.5],
        ['G', 4, 0.5], ['G', 3, 0.5], ['C', 4, 0.5], ['G', 4, 0.5],
        ['F', 4, 0.5], ['F', 4, 0.5], ['A', 4, 0.5], ['F', 4, 0.5],
        ['C', 5, 0.5], ['C', 4, 0.5], ['F', 4, 0.5], ['C', 5, 0.5],
        ['G', 4, 0.5], ['G', 4, 0.5], ['B', 4, 0.5], ['G', 4, 0.5],
        ['D', 5, 0.5], ['D', 4, 0.5], ['G', 4, 0.5], ['D', 5, 0.5]
      ]
    ];

    const currentTrack = tracks[trackIndex] || tracks[0];
    let noteIdx = 0;
    const playNextNote = () => {
      if (!this.isPlayingMusic) return;
      const [note, octave, dur] = currentTrack[noteIdx];
      const freq = getFreq(note, octave);
      const seconds = dur * beatDuration;
      if (freq > 0) {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = trackIndex === 2 ? 'square' : (trackIndex === 1 ? 'triangle' : 'sawtooth');
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + seconds - 0.02);
        osc.connect(gainNode);
        gainNode.connect(this.analyser);
        osc.start();
        osc.stop(this.ctx.currentTime + seconds);
        if (onNoteCallback) {
          onNoteCallback(note + octave);
        }
      }
      noteIdx = (noteIdx + 1) % currentTrack.length;
      this.musicTimer = setTimeout(playNextNote, seconds * 1000);
    };
    playNextNote();
  }
  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
  getVisualizerData() {
    if (!this.analyser) return new Uint8Array(0);
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const audio = new AudioEngine();
export default audio;