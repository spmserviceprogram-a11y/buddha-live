import * as THREE from 'three';

// ---------------------------------------------------------------------
// 1. Audio Synthesizer (High-Fidelity Zen & Tibetan Temple Soundscape)
// ---------------------------------------------------------------------
class TempleAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ambientPlaying = false;
    this.masterGain = null;
    this.droneGain = null;
    this.filterNode = null;
    this.ambientOscs = [];
    this.chimeTimer = null;
    this.bowlTimer = null;
    this.volume = 0.85;
    this.bgmAudio = null;
    this.bgmSourceNode = null;
    this.bgmBuffer = null;
    this.bgmBufferLoading = false;
    this.bgmBufferSource = null;
    this.bgmBufferGain = null;
    this.userMuted = false;
    this.isStartingBgm = false;
    this.soundMode = 'chanting_file'; // 'chanting_file' (Authentic Sacred Da Bei Zhou MP3)
    try {
      localStorage.setItem('buddha_sound_mode', 'chanting_file');
    } catch (_) { }
    this.zenMasterGain = null;
    this.zenOscs = [];
    this.zenTimer = null;
    this.zenBreathInterval = null;
    this._currentZenVol = this.volume;
    this._isDucked = false;

    // Sacred Zen Pentatonic Scale (Hz) based on 432Hz tuning
    this.scale = [216, 256.8, 288, 324, 384, 432, 513.6, 576, 648];
  }

  syncUIState(isPlaying) {
    const btn = document.getElementById('btn-audio-toggle');
    if (btn) btn.textContent = isPlaying ? '🎵' : '🔇';
    const chk = document.getElementById('chk-ambient');
    if (chk) chk.checked = isPlaying;
    const unlockPill = document.getElementById('audio-unlock-pill');
    if (unlockPill) {
      unlockPill.style.display = (isPlaying || this.userMuted) ? 'none' : 'flex';
    }
    const btnToggleBgm = document.getElementById('btn-toggle-chrome-bgm');
    if (btnToggleBgm) {
      btnToggleBgm.textContent = isPlaying ? '🔇 ปิดเสียงเพลงในหน้านี้ (กันเสียงซ้อนเมื่อเปิดคู่กับ TikTok)' : '🎵 เปิดเสียงเพลงในหน้านี้';
      btnToggleBgm.style.background = isPlaying ? '#b26a00' : '#1b5e20';
      btnToggleBgm.style.borderColor = isPlaying ? '#ffcc00' : '#4caf50';
    }
  }

  init() {
    // Request server to ensure Original Zen Soundscape is generated and ready on disk
    try {
      if (!this._bgmRegenRequested) {
        this._bgmRegenRequested = true;
        fetch('/api/regenerate-zen-bgm').catch(() => { });
      }
    } catch (_) { }

    if (!this.bgmAudio) {
      this.bgmAudio = document.getElementById('bgm-audio');
      if (!this.bgmAudio) {
        this.bgmAudio = document.createElement('audio');
        this.bgmAudio.id = 'bgm-audio';
        this.bgmAudio.loop = true;
        this.bgmAudio.preload = 'auto';
        this.bgmAudio.setAttribute('playsinline', '');
        const src1 = document.createElement('source');
        src1.src = '/bgm.m4a';
        src1.type = 'audio/mp4';
        const src2 = document.createElement('source');
        src2.src = '/bgm.mp3';
        src2.type = 'audio/mpeg';
        this.bgmAudio.appendChild(src1);
        this.bgmAudio.appendChild(src2);
        try { document.body.appendChild(this.bgmAudio); } catch (_) { }
      }
      this.bgmAudio.volume = this.volume;

      this.bgmAudio.addEventListener('playing', () => {
        if (!this.bgmAudio.muted) {
          this.stopWebAudioBgmBuffer();
          this.ambientPlaying = true;
          this.isStartingBgm = false;
          this.syncUIState(true);
        }
      });

      this.bgmAudio.addEventListener('pause', () => {
        if (this.bgmAudio.paused && !this.bgmBufferSource) {
          this.ambientPlaying = false;
          this.isStartingBgm = false;
          this.syncUIState(false);
        }
      });

      this.bgmAudio.addEventListener('ended', () => {
        if (!this.userMuted && this.enabled) {
          this.bgmAudio.currentTime = 0;
          this.bgmAudio.play().catch(() => { });
        }
      });

      this.bgmAudio.addEventListener('error', () => {
        this.ambientPlaying = false;
        this.isStartingBgm = false;
        this.syncUIState(false);
      });
    }

    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output filter (Velvety warm lowpass to remove harsh digital highs)
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.0, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
  }

  // Authentic Tibetan Singing Bowl with acoustic overtones & metallic shimmer
  playBell(baseFreq = 432, duration = 5.5) {
    if (!this.enabled) return;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
    const now = this.ctx.currentTime;

    const harmonics = [
      { f: baseFreq, g: 0.35, d: duration },
      { f: baseFreq * 1.503, g: 0.18, d: duration * 0.8 },
      { f: baseFreq * 2.002, g: 0.12, d: duration * 0.7 },
      { f: baseFreq * 2.76, g: 0.08, d: duration * 0.5 },
      { f: baseFreq * 4.12, g: 0.04, d: duration * 0.35 }
    ];

    harmonics.forEach(h => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.f, now);
      osc.frequency.linearRampToValueAtTime(h.f * 0.998, now + h.d);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(h.g * this.volume, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + h.d);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(now);
      osc.stop(now + h.d);
    });
  }

  // Buddhist Wooden Fish (Mõ Chùa / ระฆังไม้อบอุ่น)
  playWoodblock() {
    if (!this.enabled) return;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.085);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1160, now);
    osc2.frequency.exponentialRampToValueAtTime(320, now + 0.05);

    const maxGain = 0.32 * this.volume;
    gain.gain.setValueAtTime(maxGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.filterNode);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.1);
    osc2.stop(now + 0.1);
  }

  // Wind Chime Arpeggio (กระดิ่งลมทิพย์พลิ้วไหว)
  playLotusChime() {
    if (!this.enabled) return;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
    const chord = [432, 513.6, 648, 864, 1027.2];
    chord.forEach((freq, idx) => {
      setTimeout(() => this.playBell(freq, 3.2), idx * 80);
    });
  }

  // Sacred Bamboo Fortune Stick Cylinder Shake (เสียงเขย่ากระบอกเซียมซีไม้ไผ่ทิพย์ + กระดิ่งทอง)
  playSeamSiShake() {
    if (!this.enabled) return;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
    const rattleTimes = [0, 95, 185, 285, 375, 480, 575, 675, 780, 890];
    rattleTimes.forEach((delayMs, i) => {
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const baseF = 520 + ((i * 73) % 240);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseF, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.055);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseF * 2.15, now);
        osc2.frequency.exponentialRampToValueAtTime(340, now + 0.04);

        const maxG = (0.22 + (i % 2) * 0.06) * this.volume;
        gain.gain.setValueAtTime(maxG, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.filterNode);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.07);
        osc2.stop(now + 0.07);
      }, delayMs);
    });

    // Celestial golden chime when the winning fortune stick shoots upward
    setTimeout(() => {
      if (this.enabled) this.playLotusChime();
    }, 960);
  }

  // Gentle Japanese Zen Temple Breeze Chime
  playGentleChimePattern() {
    if (!this.enabled || !this.ambientPlaying) return;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
    const notes = [this.scale[2], this.scale[4], this.scale[5], this.scale[7]];
    const shuffled = [...notes].sort(() => Math.random() - 0.5);
    shuffled.forEach((f, i) => {
      setTimeout(() => {
        if (this.ambientPlaying) this.playBell(f, 3.5);
      }, i * 280);
    });
  }

  // Helper to cleanly stop synthesized drone oscillators and interval timers
  stopSynthesizedDrone() {
    if (this.zenOscs && this.zenOscs.length > 0) {
      this.zenOscs.forEach(o => {
        try { o.stop(); o.disconnect(); } catch (_) { }
      });
      this.zenOscs = [];
    }
    if (this.zenBreathInterval) {
      clearInterval(this.zenBreathInterval);
      this.zenBreathInterval = null;
    }
    if (this.zenTimer) {
      clearInterval(this.zenTimer);
      this.zenTimer = null;
    }
    if (this.zenMasterGain) {
      try { this.zenMasterGain.disconnect(); } catch (_) { }
      this.zenMasterGain = null;
    }
    if (this.ambientOscs && this.ambientOscs.length > 0) {
      this.ambientOscs.forEach(o => {
        try { o.stop(); o.disconnect(); } catch (_) { }
      });
      this.ambientOscs = [];
    }
    if (this.droneGain) {
      try { this.droneGain.disconnect(); } catch (_) { }
      this.droneGain = null;
    }
    if (this.bowlTimer) {
      clearInterval(this.bowlTimer);
      this.bowlTimer = null;
    }
    if (this.chimeTimer) {
      clearInterval(this.chimeTimer);
      this.chimeTimer = null;
    }
  }

  stopWebAudioBgmBuffer() {
    if (this.bgmBufferSource) {
      try {
        this.bgmBufferSource.stop();
        this.bgmBufferSource.disconnect();
      } catch (_) { }
      this.bgmBufferSource = null;
    }
    if (this.bgmBufferGain) {
      try { this.bgmBufferGain.disconnect(); } catch (_) { }
      this.bgmBufferGain = null;
    }
  }

  async startWebAudioBgmFallback() {
    if (this.userMuted || !this.enabled) return false;
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (_) { }
    }
    if (this.ctx.state !== 'running') return false;
    if (this.bgmBufferSource) return true;
    if (this.bgmAudio && !this.bgmAudio.paused && !this.bgmAudio.muted) return true;

    try {
      if (!this.bgmBuffer && !this.bgmBufferLoading) {
        this.bgmBufferLoading = true;
        let resp = null;
        try {
          resp = await fetch('/bgm.m4a');
          if (!resp.ok) resp = null;
        } catch (_) {}
        if (!resp) {
          try {
            resp = await fetch('/bgm.mp3');
          } catch (_) {}
        }
        if (resp && resp.ok) {
          const arr = await resp.arrayBuffer();
          this.bgmBuffer = await this.ctx.decodeAudioData(arr);
        }
        this.bgmBufferLoading = false;
      }
      if (!this.bgmBuffer || this.userMuted || !this.enabled) return false;
      if (this.bgmAudio && !this.bgmAudio.paused && !this.bgmAudio.muted) return true;

      this.stopWebAudioBgmBuffer();
      const src = this.ctx.createBufferSource();
      src.buffer = this.bgmBuffer;
      src.loop = true;
      try { src.playbackRate.value = 1.018; } catch (_) { }

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(0, 0.8);

      this.bgmBufferSource = src;
      this.bgmBufferGain = gain;
      this.ambientPlaying = true;
      this.isStartingBgm = false;
      this.syncUIState(true);
      console.log('[TempleAudio] WebAudio AudioBuffer BGM active (TikTok LIVE Studio CEF fallback)');
      return true;
    } catch (err) {
      this.bgmBufferLoading = false;
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // 100% Original 432Hz Zen Buddhist Meditation Soundscape (Web Audio API)
  // Synthesizes a mathematically unique acoustic environment in real-time.
  // Completely eliminates commercial song Content ID audio fingerprint matching on TikTok LIVE!
  // ---------------------------------------------------------------------
  startOriginalZenSoundscape(withBell = false) {
    if (this.userMuted || !this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (_) { }
    }

    this.stopSynthesizedDrone();
    this.stopWebAudioBgmBuffer();
    if (this.bgmAudio && !this.bgmAudio.paused) {
      try { this.bgmAudio.pause(); } catch (_) { }
    }

    if (withBell) {
      try { this.playBell(432, 4.5); } catch (_) { }
    }

    const now = this.ctx.currentTime;
    this.zenMasterGain = this.ctx.createGain();
    this._currentZenVol = this.volume;
    this.zenMasterGain.gain.setValueAtTime(0.0001, now);
    this.zenMasterGain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.35 * this.volume), now + 2.5);

    // 1. Sacred 432Hz Pentatonic Drone Bed (Multi-harmonic Solfeggio cluster)
    // 108Hz (Deep root), 216Hz (Warm earth), 324Hz (Serene fifth), 432Hz (Heart chakra), 648Hz (Celestial aura)
    const harmonics = [
      { f: 108, g: 0.28, pan: 0 },
      { f: 216, g: 0.24, pan: -0.42 },
      { f: 324, g: 0.16, pan: 0.42 },
      { f: 432, g: 0.20, pan: 0 },
      { f: 648, g: 0.08, pan: -0.25 }
    ];

    this.zenOscs = harmonics.map(h => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = (h.f >= 432) ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(h.f, now);
      gain.gain.setValueAtTime(h.g, now);

      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(h.pan, now);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.zenMasterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.zenMasterGain);
      }
      osc.start(now);
      return osc;
    });

    // 2. Slow 12-second Respiratory Meditation Wave (Gently breathes drone gain)
    let breathPhase = 0;
    this.zenBreathInterval = setInterval(() => {
      if (!this.zenMasterGain || !this.ambientPlaying || !this.ctx) return;
      breathPhase += 0.08;
      const breathFactor = 0.82 + 0.18 * Math.sin(breathPhase);
      const curTarget = (this._isDucked ? (this.volume * 0.18) : this.volume) * 0.35 * breathFactor;
      try {
        this.zenMasterGain.gain.setTargetAtTime(Math.max(0.0001, curTarget), this.ctx.currentTime, 0.4);
      } catch (_) { }
    }, 400);

    // 3. Periodic Tibetan Singing Bowl Strikes & Wooden Fish (Mõ Chùa) Knocking
    this.zenTimer = setInterval(() => {
      if (!this.ambientPlaying || this.userMuted || !this.enabled) return;

      // Strike a Tibetan Singing Bowl (every 18-24s)
      const bowlFreqs = [432, 528, 384, 513.6];
      const bf = bowlFreqs[Math.floor(Math.random() * bowlFreqs.length)];
      try { this.playBell(bf, 5.5); } catch (_) { }

      // Traditional Buddhist Wooden Fish (Mõ Chùa) gentle meditative knocks
      if (Math.random() < 0.85) {
        setTimeout(() => {
          try { this.playWoodblock(); } catch (_) { }
        }, 1200 + Math.random() * 800);

        if (Math.random() < 0.6) {
          setTimeout(() => {
            try { this.playWoodblock(); } catch (_) { }
          }, 2600 + Math.random() * 600);
        }
      }
    }, 18000);

    // Initial strike for immediate serene ambiance
    try { this.playBell(432, 5.0); } catch (_) { }

    this.zenMasterGain.connect(this.filterNode);
    this.ambientPlaying = true;
    this.isStartingBgm = false;
    this.syncUIState(true);
    console.log('[TempleAudio] 100% Original 432Hz Zen Buddhist Meditation Soundscape ACTIVE (Zero Copyright / Defeats Content ID)');
  }

  // Sacred Temple Ambient Sound Controller (Switches cleanly between 432Hz Zen Original & Chanting File)
  startAmbient(withBell = false) {
    if (this.userMuted || !this.enabled) return;
    this.init();

    // Resume AudioContext if suspended by browser
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }

    if (this.zenMasterGain || (this.bgmAudio && !this.bgmAudio.paused && !this.bgmAudio.muted) || this.bgmBufferSource) {
      this.ambientPlaying = true;
      this.syncUIState(true);
      return;
    }
    if (this.isStartingBgm) return; // In-flight start mutex guard
    this.isStartingBgm = true;

    // Clean up any stale oscillators and timers to guarantee ZERO acoustic overlapping
    this.stopSynthesizedDrone();

    // Claim exclusive playback across all browser tabs / TikTok LIVE Studio sources
    if (typeof audioCoordinator !== 'undefined' && audioCoordinator.claimMaster) {
      audioCoordinator.claimMaster();
    }

    if (this.soundMode === 'zen_original') {
      this.startOriginalZenSoundscape(withBell);
      return;
    }

    if (withBell) {
      try { this.playBell(432, 4.0); } catch (_) { }
    }

    const startHarmonicTimer = () => {
      if (!this._antiLoopHarmonicTimer) {
        this._antiLoopHarmonicTimer = setInterval(() => {
          if (!this.userMuted && this.enabled && this.ambientPlaying) {
            const sacredFreqs = [432, 513.6, 528, 639, 741, 852];
            const chosenF = sacredFreqs[Math.floor(Math.random() * sacredFreqs.length)];
            try { this.playBell(chosenF, 4.8); } catch (_) { }

            if (Math.random() < 0.75) {
              setTimeout(() => { try { this.playWoodblock(); } catch (_) { } }, 1100);
              if (Math.random() < 0.45) {
                setTimeout(() => { try { this.playWoodblock(); } catch (_) { } }, 2200);
              }
            }

            const rateJitter = 1.043 + (Math.random() - 0.5) * 0.022;
            try {
              if (this.bgmAudio) this.bgmAudio.playbackRate = rateJitter;
              if (this.bgmBufferSource) this.bgmBufferSource.playbackRate.value = rateJitter;
            } catch (_) { }
          }
        }, 11000);
      }
    };

    // Play BGM Audio with fallback to Zen Original Soundscape
    if (this.bgmAudio) {
      this.bgmAudio.muted = false;
      this.bgmAudio.volume = this.volume;
      try { this.bgmAudio.playbackRate = 1.042; } catch (_) { }

      if (this.bgmAudio.readyState >= 2 && this.bgmAudio.currentTime < 0.5) {
        try { this.bgmAudio.currentTime = 0.8; } catch (_) { }
      }
      const playPromise = this.bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.stopWebAudioBgmBuffer();
            this.ambientPlaying = true;
            this.isStartingBgm = false;
            this.syncUIState(true);
            startHarmonicTimer();
          })
          .catch(async (playErr) => {
            console.warn('[TempleAudio] bgmAudio.play() rejected:', playErr?.message);
            const webAudioStarted = await this.startWebAudioBgmFallback();
            if (webAudioStarted) {
              startHarmonicTimer();
              return;
            }
            // CRITICAL: If file playback cannot start, smoothly fall back to 100% Original Zen Soundscape
            // Guarantees the live stream NEVER encounters dead silence!
            console.log('[TempleAudio] File playback unavailable; activating 100% Original Zen Soundscape fallback');
            this.isStartingBgm = false;
            this.startOriginalZenSoundscape(false);
          });
      } else {
        this.isStartingBgm = false;
      }
    } else {
      this.startOriginalZenSoundscape(false);
    }
  }

  // Procedural Zen Drone Fallback (Used when custom soundscape needed)
  startProceduralDroneFallback() {
    this.startOriginalZenSoundscape(false);
  }

  stopAmbient() {
    this.isStartingBgm = false;
    if (this.bgmAudio) {
      try { this.bgmAudio.pause(); } catch (_) { }
    }
    this.stopWebAudioBgmBuffer();
    if (this._antiLoopHarmonicTimer) {
      clearInterval(this._antiLoopHarmonicTimer);
      this._antiLoopHarmonicTimer = null;
    }
    this.stopSynthesizedDrone();
    this.ambientPlaying = false;
    this.syncUIState(false);
    if (typeof audioCoordinator !== 'undefined' && audioCoordinator.releaseMaster) {
      audioCoordinator.releaseMaster();
    }
  }

  // Called when another tab/window claims playback
  pauseBgmForOtherTab() {
    this.isStartingBgm = false;
    if (this.bgmAudio && !this.bgmAudio.paused) {
      try { this.bgmAudio.pause(); } catch (_) { }
    }
    this.stopWebAudioBgmBuffer();
    this.stopSynthesizedDrone();
    this.ambientPlaying = false;
    this.syncUIState(false);
    if (typeof showToast === 'function') {
      showToast('ระบบเสียงสมาธิ 🎵', 'หน้าต่าง/แท็บอื่นกำลังเปิดเพลงอยู่ ระบบปิดเสียงหน้านี้เพื่อไม่ให้เล่นซ้อนกัน');
    }
  }

  duckBgm(duck = true, durationMs = 350) {
    this._isDucked = duck;
    if (!this.bgmAudio && !this.bgmBufferGain && !this.zenMasterGain && !this.droneGain) return;
    if (this._duckTimer) {
      clearInterval(this._duckTimer);
      this._duckTimer = null;
    }
    const targetVolume = duck ? (this.volume * 0.18) : this.volume;
    const startVolume = this.bgmAudio ? this.bgmAudio.volume : (this._currentZenVol || this.volume);
    const steps = 14;
    const stepInterval = Math.max(10, Math.floor(durationMs / steps));
    let currentStep = 0;

    this._duckTimer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const factor = (1 - Math.cos(progress * Math.PI)) / 2;
      const v = startVolume + (targetVolume - startVolume) * factor;
      const clampedV = Math.max(0, Math.min(1, v));
      this._currentZenVol = clampedV;
      try {
        if (this.bgmAudio) this.bgmAudio.volume = clampedV;
        if (this.bgmBufferGain && this.ctx) {
          this.bgmBufferGain.gain.setValueAtTime(clampedV, this.ctx.currentTime);
        }
        if (this.zenMasterGain && this.ctx) {
          this.zenMasterGain.gain.setValueAtTime(clampedV * 0.35, this.ctx.currentTime);
        }
        if (this.droneGain && this.ctx) {
          this.droneGain.gain.setValueAtTime(clampedV * 0.04, this.ctx.currentTime);
        }
      } catch (_) { }
      if (currentStep >= steps) {
        clearInterval(this._duckTimer);
        this._duckTimer = null;
        try {
          if (this.bgmAudio) this.bgmAudio.volume = targetVolume;
          if (this.bgmBufferGain && this.ctx) {
            this.bgmBufferGain.gain.setValueAtTime(targetVolume, this.ctx.currentTime);
          }
          if (this.zenMasterGain && this.ctx) {
            this.zenMasterGain.gain.setValueAtTime(targetVolume * 0.35, this.ctx.currentTime);
          }
          if (this.droneGain && this.ctx) {
            this.droneGain.gain.setValueAtTime(targetVolume * 0.04, this.ctx.currentTime);
          }
        } catch (_) { }
      }
    }, stepInterval);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this._currentZenVol = this.volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.zenMasterGain && this.ctx) {
      this.zenMasterGain.gain.setValueAtTime(this.volume * 0.35, this.ctx.currentTime);
    }
    if (this.bgmBufferGain && this.ctx) {
      this.bgmBufferGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.volume;
    }
  }

  toggleAmbient() {
    const isPlaying = Boolean(this.zenMasterGain) || (this.bgmAudio && !this.bgmAudio.paused && !this.bgmAudio.muted) || Boolean(this.bgmBufferSource) || this.ambientPlaying;
    if (isPlaying) {
      this.userMuted = true;
      this.stopAmbient();
      return false;
    } else {
      this.userMuted = false;
      this.startAmbient(true);
      return true;
    }
  }
}

// ---------------------------------------------------------------------
// 1.2 Cross-Tab & Multi-Process Audio Coordinator
// Guarantees that only ONE tab/window across the entire computer can play BGM at any time!
// ---------------------------------------------------------------------
class BuddhaAudioCoordinator {
  constructor(audioEngine) {
    this.audio = audioEngine;
    this.tabId = 'buddha_tab_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('buddha_bgm_coordinator') : null;
    this.isMaster = false;

    this.init();
  }

  init() {
    if (this.channel) {
      this.channel.onmessage = (e) => {
        const msg = e.data;
        if (!msg || msg.tabId === this.tabId) return;

        if (msg.type === 'CLAIM_BGM') {
          const enforceSingleTab = window.__ENFORCE_SINGLE_AUDIO_TAB__ || (new URLSearchParams(window.location.search).get('single_audio') === '1');
          if (enforceSingleTab) {
            console.log('[AudioCoordinator] Another tab claimed BGM and single_audio enabled. Pausing this tab.');
            this.isMaster = false;
            if (this.audio.ambientPlaying || (this.audio.bgmAudio && !this.audio.bgmAudio.paused)) {
              this.audio.pauseBgmForOtherTab();
            }
          }
        }
      };
    }

    // Storage event fallback (for browsers/CEF across different contexts)
    window.addEventListener('storage', (e) => {
      if (e.key === 'buddha_active_audio_tab' && e.newValue && e.newValue !== this.tabId) {
        const enforceSingleTab = window.__ENFORCE_SINGLE_AUDIO_TAB__ || (new URLSearchParams(window.location.search).get('single_audio') === '1');
        if (enforceSingleTab && (this.isMaster || this.audio.ambientPlaying)) {
          console.log('[AudioCoordinator] Storage lock claimed by another tab. Pausing this tab.');
          this.isMaster = false;
          this.audio.pauseBgmForOtherTab();
        }
      }
    });

    // Check if query parameter requests silent mode: ?mute=1 or ?audio=0 or ?bgm=0
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mute') === '1' || params.get('audio') === '0' || params.get('bgm') === '0') {
        console.log('[AudioCoordinator] URL parameter requested silent mode. Muting this tab.');
        this.audio.userMuted = true;
        this.audio.stopAmbient();
      }
    } catch (_) { }
  }

  claimMaster() {
    this.isMaster = true;
    try {
      localStorage.setItem('buddha_active_audio_tab', this.tabId);
      localStorage.setItem('buddha_active_audio_time', Date.now().toString());
    } catch (_) { }

    if (this.channel) {
      this.channel.postMessage({ type: 'CLAIM_BGM', tabId: this.tabId });
    }
  }

  releaseMaster() {
    if (this.isMaster) {
      this.isMaster = false;
      try {
        if (localStorage.getItem('buddha_active_audio_tab') === this.tabId) {
          localStorage.removeItem('buddha_active_audio_tab');
        }
      } catch (_) { }
    }
  }
}

const templeAudio = new TempleAudio();
const audioCoordinator = new BuddhaAudioCoordinator(templeAudio);
window.templeAudio = templeAudio;
window.audioCoordinator = audioCoordinator;

// ---------------------------------------------------------------------
// 1.5 Bodhisattva Guan Yin AI Divine Voice System (เสียงพระแม่กวนอิม ทักทาย & ให้พร)
// ---------------------------------------------------------------------
// Canonical 10-Tier Devotional Effect Names (Single Source of Truth for AI Voice & Rituals)
const GIFT_EFFECT_NAMES = {
  dragon: 'มังกรทองเหิน',
  castle: 'เปิดวิมานทิพย์',
  fireworks: 'พลุเพลิงบุญ',
  royal_carriage: 'ขบวนราชรถ',
  crystal_fountain: 'ธารน้ำพุมณี',
  golden_bell: 'สั่นระฆังทอง',
  flowers: 'โปรยบุปผามงคล',
  lotus_rain: 'โปรยบุปผามงคล',
  lotus: 'สระดอกบัวทิพย์',
  lotus_bloom: 'สระดอกบัวทิพย์',
  incense: 'จุดประทีปบูชาธูปทอง',
  seamsi: 'เสี่ยงเซียมซีมหาโชค',
  kowtow: 'กราบเบญจางคประดิษฐ์'
};

function getGiftEffectName(effectType = '', giftName = '', coins = 1) {
  if (effectType && GIFT_EFFECT_NAMES[effectType]) return GIFT_EFFECT_NAMES[effectType];
  const name = String(giftName || '').toLowerCase().trim();
  for (const effVal of Object.values(GIFT_EFFECT_NAMES)) {
    if (name === effVal.toLowerCase()) return effVal;
  }
  if (name.includes('รักนะมากๆ') || name.includes('รักนะมาก ๆ') || name.includes('รักนะ') || name.includes('กอดหัวใจ') || name.includes('love you') || name.includes('heart hug') || name.includes('hug heart') || name.includes('hug') || name.includes('เซียมซี') || name.includes('ซองเขียว') || name.includes('ซองมงคล') || name.includes('hari raya') || name.includes('selamat') || name.includes('aidilfitri') || name.includes('sampul') || name.includes('envelope') || name.includes('seamsi') || name.includes('siamsi')) return GIFT_EFFECT_NAMES.seamsi;
  if (name.includes('มังกร') || name.includes('dragon') || name.includes('alebrije') || coins >= 299) return GIFT_EFFECT_NAMES.dragon;
  if (name.includes('ประตู') || name.includes('portal') || name.includes('gate') || name.includes('วิมาน') || name.includes('ประทัด') || coins >= 100) return GIFT_EFFECT_NAMES.castle;
  if (name.includes('หัวใจ') || name.includes('heart') || name.includes('พลุ') || name.includes('ปิดทอง') || coins >= 99) return GIFT_EFFECT_NAMES.fireworks;
  if (name.includes('โดนัท') || name.includes('donut') || name.includes('doughnut') || name.includes('ราชรถ') || name.includes('นางรำ') || coins >= 30) return GIFT_EFFECT_NAMES.royal_carriage;
  if (name.includes('โคโลญจน์') || name.includes('cologne') || name.includes('น้ำหอม') || name.includes('น้ำพุ') || name.includes('ฆ้อง') || coins >= 20) return GIFT_EFFECT_NAMES.crystal_fountain;
  if (name.includes('พวงมาลัย') || name.includes('garland') || name.includes('ระฆัง') || coins >= 15) return GIFT_EFFECT_NAMES.golden_bell;
  if (name.includes('กุหลาบ ๙๙') || name.includes('กุหลาบ99') || name.includes('rose 99') || name.includes('rose99') || name.includes('บุปผา') || (name.includes('กุหลาบ') && coins >= 10) || coins >= 10) return GIFT_EFFECT_NAMES.flowers;
  if (name.includes('lucky') || name.includes('9') || name.includes('บัว') || name.includes('lotus') || coins >= 9) return GIFT_EFFECT_NAMES.lotus;
  if (name.includes('เครื่องราง') || name.includes('omamori') || name.includes('amulet') || name.includes('ธูป') || name.includes('ประทีป') || coins >= 5) return GIFT_EFFECT_NAMES.incense;
  return GIFT_EFFECT_NAMES.kowtow;
}

// Universal Devotee Name Sanitizer & Slang/Profanity Filter
// Protects the live stream from automated TikTok bans due to inappropriate viewer names or vulgar words
const INAPPROPRIATE_WORDS_REGEX = /(กู|มึง|เย็ด|ควย|เหี้ย|สัส|สัด|จวย|หำ|ห่า|เงี่ยน|แตด|ดอกทอง|ชิบหาย|ชาติชั่ว|หมาบ้า|fuck|shit|bitch|cunt|dick|pussy|porn|sex)/gi;

function sanitizeDisplayName(rawName, fallback = 'ผู้มีจิตศรัทธา') {
  if (!rawName || typeof rawName !== 'string') return fallback;
  let clean = rawName.trim().replace(/^@+/, '');
  // Strip emojis & special pictograms
  clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, ' ').trim();
  // Filter/replace crude pronouns smoothly without ruining viewer identity
  clean = clean.replace(/กู/g, 'เรา').replace(/มึง/g, 'เธอ');
  // Filter vulgarity
  if (INAPPROPRIATE_WORDS_REGEX.test(clean)) {
    clean = clean.replace(INAPPROPRIATE_WORDS_REGEX, '*').trim();
  }
  // Replace auto-generated IDs (e.g. user84729184) with respectful Buddhist title
  if (/^user[_.]?\d{4,}/i.test(clean) || /^u_\d+/i.test(clean) || /^\d{5,}$/.test(clean)) {
    return fallback;
  }
  // Remove trailing numbers (e.g. Somchai8899 -> Somchai)
  clean = clean.replace(/[\d._-]+$/, '').trim();
  // Strip special punctuation
  clean = clean.replace(/[@#$_^&*~+=|\\/<>(){}\[\]"':;!?,.]+/g, ' ').trim();
  if (!clean || clean.length < 2 || clean.includes('*')) {
    const lettersOnly = clean ? clean.replace(/[*.\s]/g, '') : '';
    if (lettersOnly.length < 2) return fallback;
  }
  if (clean.length > 20) clean = clean.slice(0, 20).trim();
  return clean || fallback;
}

class GuanYinDivineVoice {
  constructor() {
    this.enabled = true;
    this.chatVoiceEnabled = true;
    this.volume = 0.95;
    this.synth = (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null;
    this.thaiVoice = null;
    this.queue = [];
    this.isSpeaking = false;
    this.isProcessing = false;
    this.isGenerating = false;
    this._currentPlaybackResolver = null;
    this.currentAudio = null;
    this.currentTask = null;
    this.currentAbortController = null;
    this.lastSpokenText = '';
    this.lastSpokenAt = 0;
    this.lastDonorSpoken = new Map(); // key: cleanName, value: timestamp (streak debounce)
    this.lastWelcomeAt = 0;
    this.welcomedUsers = new Map(); // key: userKey, value: timestamp (prevents repeating welcome to same user for 20 mins)
    this.lastGenericWelcomeAt = 0; // Throttle generic "กัลยาณมิตร" welcomes to at most once per 60s
    this.lastChatBlessingAt = 0;
    this.lastGreetingAt = 0;
    this.lastSadhuAt = 0;

    // Restore saved chat voice toggle from localStorage
    try {
      const savedChatVoice = localStorage.getItem('buddha_chat_voice');
      if (savedChatVoice !== null) {
        this.chatVoiceEnabled = (savedChatVoice === 'true');
      }
    } catch (_) { }

    // Check if query parameter requests voice disable: ?voice=0 or ?no_voice=1
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('voice') === '0' || params.get('no_voice') === '1') {
        this.enabled = false;
        console.log('[GuanYin Voice] URL parameter ?voice=0 requested. AI Voice generation disabled on this tab.');
      }
    } catch (_) { }

    this.initVoice();
  }

  initVoice() {
    if (!this.synth) return;
    const loadVoices = () => {
      try {
        const voices = this.synth.getVoices() || [];
        this.thaiVoice = voices.find(v => (v.lang || '').toLowerCase().includes('th') &&
          ((v.name || '').includes('Premwadee') || (v.name || '').includes('Kanya') || (v.name || '').includes('Female') || (v.name || '').includes('ภาษาไทย')))
          || voices.find(v => (v.lang || '').toLowerCase().includes('th'))
          || voices.find(v => (v.lang || '').toLowerCase().startsWith('th'))
          || (voices.length > 0 ? voices[0] : null);
      } catch (_) { }
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  cancelWelcomeForUser(name, userKey = '') {
    const clean = this.cleanViewerName(name, '');
    const cleanKey = String(userKey || '').trim().toLowerCase();

    // 1. Purge any pending welcome from this.queue
    this.queue = this.queue.filter(item => {
      const isWelcome = item.payload?.action === 'เข้าร่วมรับฟังธรรม' || item.payload?.action?.includes('ต้อนรับ');
      if (!isWelcome) return true;
      if (cleanKey && item.payload?.userKey && item.payload.userKey === cleanKey) return false;
      if (clean && item.payload?.name && (item.payload.name === clean || item.payload.name.includes(clean))) return false;
      return true;
    });

    // 2. If the current running task is a welcome task for this donor, abort it immediately!
    if (this.currentTask && (this.currentTask.payload?.action === 'เข้าร่วมรับฟังธรรม' || this.currentTask.payload?.action?.includes('ต้อนรับ'))) {
      const taskName = this.currentTask.payload?.name || '';
      const taskKey = this.currentTask.payload?.userKey || '';
      const isMatch = (cleanKey && taskKey === cleanKey) || (clean && (taskName === clean || taskName.includes(clean)));
      if (isMatch) {
        console.log(`[GuanYin Voice] Donor ${name} sent gift while welcome was in-flight. Aborting welcome speech!`);
        this.abortCurrentTask();
      }
    }
  }

  _safeTeardownCurrentAudio() {
    if (this.currentAudio) {
      const a = this.currentAudio;
      a._aborted = true;
      a.onerror = null;
      a.onended = null;
      a.onplay = null;
      a.onplaying = null;
      try {
        a.pause();
        a.currentTime = 0;
        a.removeAttribute('src');
        a.load();
      } catch (_) { }
      this.currentAudio = null;
    }
  }

  abortCurrentTask() {
    if (this.currentAbortController) {
      try { this.currentAbortController.abort(); } catch (_) { }
      this.currentAbortController = null;
    }
    this._safeTeardownCurrentAudio();
    if (this.synth) {
      try { this.synth.cancel(); } catch (_) { }
    }
    if (this._currentPlaybackResolver) {
      const r = this._currentPlaybackResolver;
      this._currentPlaybackResolver = null;
      try { r(); } catch (_) { }
    }
    this.isSpeaking = false;
    this.isGenerating = false;
    if (typeof templeAudio !== 'undefined' && templeAudio.duckBgm) {
      templeAudio.duckBgm(false, 300);
    }
  }

  enqueue(item) {
    if (!this.enabled) return;
    if (typeof speechCoordinator !== 'undefined' && speechCoordinator && !speechCoordinator.canSpeak()) {
      return;
    }

    // High Priority Preemption:
    // When a Gift Blessing arrives (priority: 1), immediately abort any lower-priority in-flight task
    // (such as long welcome greetings, keep-alive watchdogs, or casual chat replies)
    // and purge lower-priority tasks so the donor's blessing speaks immediately without overlap!
    if (item.priority === 1) {
      if (this.currentTask && (this.currentTask.priority || 3) > 1) {
        console.log(`[GuanYin Voice] Preempting lower-priority speech (${this.currentTask.payload?.action || 'speech'}) for gift blessing!`);
        this.abortCurrentTask();
      }
      this.queue = this.queue.filter(q => (q.priority || 3) <= 1);
    }

    this.queue.push(item);
    // Sort so Priority 1 (gifts) always play first, while keeping arrival order
    this.queue.sort((a, b) => (a.priority || 3) - (b.priority || 3));
    if (this.queue.length > 8) {
      const lowIdx = this.queue.findLastIndex(i => (i.priority || 3) >= 3);
      if (lowIdx !== -1) this.queue.splice(lowIdx, 1);
    }
    this.processQueue();
  }

  async processQueue() {
    // Atomic Mutex Guard: Only ONE sequential processQueue loop can EVER run at any time!
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        try { if (typeof task.onStart === 'function') task.onStart(); } catch (_) { }
        await this.executeVoiceTask(task);
        try { if (typeof task.onDone === 'function') task.onDone(); } catch (_) { }
        // Guaranteed peaceful 700ms gap between blessings - speeches NEVER overlap!
        await new Promise(r => setTimeout(r, 700));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async executeVoiceTask(task) {
    if (typeof speechCoordinator !== 'undefined' && speechCoordinator && !speechCoordinator.canSpeak()) {
      return;
    }
    this.currentTask = task;
    this.currentAbortController = new AbortController();
    const abortSignal = this.currentAbortController.signal;
    this.isSpeaking = true;
    this.isGenerating = true;
    this.lastSpokenAt = Date.now();
    if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
      smartMicRouter.onVoiceStart();
    }

    try {
      if (abortSignal.aborted) return;
      let audioUrl = null;
      let textToDisplay = '';

      if (task.type === 'gemini') {
        const cleanSpeakerName = (task.payload?.name || 'กัลยาณมิตร').replace(/^@+/, '').trim();
        const action = task.payload?.action || '';
        const wish = task.payload?.wish || '';

        // Immediate high-quality Thai fallback text containing viewer's name, warm thank you & personable blessing
        const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
        let fallbackText = '';
        if (action.includes('เข้าร่วม') || action.includes('ต้อนรับ') || action.includes('join')) {
          const isGeneric = (cleanSpeakerName === 'กัลยาณมิตร' || cleanSpeakerName === 'ผู้เจริญสติ' || cleanSpeakerName === 'ผู้มีจิตศรัทธา');
          const welcomes = isGeneric ? [
            `ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหารสวรรค์ ขอให้จิตใจสงบร่มเย็นนะคะ`,
            `ยินดีต้อนรับทุกท่านมาร่วมบุญในฉากจำลองนี้ ขอให้มีแต่ความสุขนะคะ`,
            `ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหาร ขอให้พบเจอแต่สิ่งมงคลนะคะ`,
            `ยินดีต้อนรับสู่ฉากจำลองแดนธรรม ขอให้จิตใจผ่องใส สุขกายสบายใจนะคะ`,
            `ยินดีต้อนรับทุกท่านเข้ามารับพลังบุญในฉากจำลองวิหารนี้นะคะ`
          ] : [
            `ยินดีต้อนรับคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหารสวรรค์ ขอให้มีความสุขนะคะ`,
            `ยินดีต้อนรับคุณ ${cleanSpeakerName} มาร่วมทำบุญในฉากจำลองนี้ ขอให้โชคดีนะคะ`,
            `สวัสดีและยินดีต้อนรับคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้สุขใจนะคะ`,
            `ยินดีต้อนรับคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้พบแต่ความสุขนะคะ`,
            `ยินดีต้อนรับคุณ ${cleanSpeakerName} สู่ฉากจำลองแดนธรรม ขอให้ร่ำรวยเงินทองนะคะ`,
            `ยินดีต้อนรับคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้มีวันที่สดใสนะคะ`,
            `ยินดีต้อนรับคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหารบุญ ขอให้สมหวังนะคะ`,
            `ยินดีต้อนรับคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้แคล้วคลาดปลอดภัยนะคะ`
          ];
          fallbackText = pickRandom(welcomes);
        } else if (action.includes('ถวาย') || action.includes('ร่วมบุญ') || task.payload?.isGift) {
          const effName = task.payload?.effectName || getGiftEffectName(task.payload?.effectType, task.payload?.giftName || action.replace(/^(ถวาย|ร่วมบุญ)/, ''), task.payload?.coins || 1);
          const giftPhrases = [
            `ขอบคุณคุณ ${cleanSpeakerName} ที่ร่วมถวาย${effName} ในฉากจำลองนี้นะคะ`,
            `อนุโมทนาบุญคุณ ${cleanSpeakerName} ร่วมถวาย${effName} ในฉากจำลอง ขอให้ร่ำรวยนะคะ`,
            `ขอบคุณคุณ ${cleanSpeakerName} ถวาย${effName} ในฉากจำลองนี้ ขอให้เงินทองไหลมาเทมานะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${cleanSpeakerName} ถวาย${effName} มีสุขภาพแข็งแรงนะคะ`,
            `สาธุบุญคุณ ${cleanSpeakerName} ร่วมถวาย${effName} ในฉากจำลองนี้ การงานก้าวหน้านะคะ`,
            `ขอบคุณคุณ ${cleanSpeakerName} ถวาย${effName} ในฉากจำลองนี้ ขอให้ร่มเย็นเป็นสุขนะคะ`,
            `อนุโมทนาบุญคุณ ${cleanSpeakerName} ถวาย${effName} ในฉากจำลองนี้ ขอให้รับทรัพย์ใหญ่นะคะ`,
            `ขอบคุณคุณ ${cleanSpeakerName} ร่วมถวาย${effName} ในฉากจำลองวิหารนี้นะคะ`,
            `สาธุกับคุณ ${cleanSpeakerName} ถวาย${effName} ในฉากจำลองนี้ ขอให้โชคดีนะคะ`,
            `ขอบคุณคุณ ${cleanSpeakerName} ในฉากจำลองวิหารนี้ ขอให้มั่งคั่งร่ำรวยยั่งยืนนะคะ`
          ];
          fallbackText = pickRandom(giftPhrases);
        } else if (action.includes('ทักทาย') || wish.includes('สวัสดี') || wish.includes('กราบ') || wish.includes('หวัดดี') || /^(hello|hi|ดีครับ|ดีค่ะ)/i.test(wish)) {
          const greetPhrases = [
            `สวัสดีคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหารสวรรค์ ขอให้โชคดีมีสุขนะคะ`,
            `สวัสดีคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้ราบรื่นและสุขใจนะคะ`,
            `สวัสดีคุณ ${cleanSpeakerName} ดีใจที่ได้พบกันในฉากจำลองวิหาร ขอให้โชคดีนะคะ`,
            `กราบสวัสดีคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้สุขภาพแข็งแรงนะคะ`,
            `สวัสดีคุณ ${cleanSpeakerName} ในฉากจำลองวิหาร ขอให้แคล้วคลาดปลอดภัยนะคะ`,
            `สวัสดีคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้การงานราบรื่นนะคะ`,
            `สวัสดีคุณ ${cleanSpeakerName} มารับพลังบวกในฉากจำลองวิหารไปด้วยกันนะคะ`,
            `สวัสดีคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหารสวรรค์ ขอให้มีโชคตลอดวันนะคะ`
          ];
          fallbackText = pickRandom(greetPhrases);
        } else if (action.includes('สาธุ') || action.includes('อนุโมทนา') || /(สาธุ|สาทุ|sadhu|sathu)/i.test(wish)) {
          const sadhuPhrases = [
            `สาธุอนุโมทนาบุญคุณ ${cleanSpeakerName} ในฉากจำลองนี้ ขอให้พบแต่สิ่งมงคลนะคะ`,
            `สาธุการกับคุณ ${cleanSpeakerName} ในฉากจำลองวิหาร บุญรักษาเทวดาคุ้มครองนะคะ`,
            `สาธุคุณ ${cleanSpeakerName} ร่วมบุญในฉากจำลองนี้ ขอให้ร่ำรวยเงินทองนะคะ`,
            `อนุโมทนาสาธุคุณ ${cleanSpeakerName} ในฉากจำลองนี้ ขอให้จิตใจเบิกบานนะคะ`,
            `สาธุบุญคุณ ${cleanSpeakerName} ในฉากจำลองนี้ ขอให้มีโชคลาภบารมีนะคะ`,
            `สาธุคุณ ${cleanSpeakerName} ร่วมบุญในฉากจำลองนี้ ขอให้ปลอดภัยและมีความสุขนะคะ`
          ];
          fallbackText = pickRandom(sadhuPhrases);
        } else if (wish) {
          const wishPhrases = [
            `ขอพรในฉากจำลองนี้ให้คุณ ${cleanSpeakerName} สมความปรารถนาและมีสุขนะคะ`,
            `ขอพรในฉากจำลองนี้ให้คำอธิษฐานคุณ ${cleanSpeakerName} สัมฤทธิผลทุกประการนะคะ`,
            `ขออวยพรคุณ ${cleanSpeakerName} ในฉากจำลองนี้ ผ่านพ้นทุกอุปสรรคราบรื่นนะคะ`,
            `ขอพระแม่ในฉากจำลองนี้คุ้มครองคุณ ${cleanSpeakerName} ให้พบเจอแต่สิ่งดีงามนะคะ`
          ];
          fallbackText = pickRandom(wishPhrases);
        } else if (action.includes('ติดตาม') || action.includes('follow')) {
          const followPhrases = [
            `อนุโมทนาบุญคุณ ${cleanSpeakerName} กดติดตามในฉากจำลองนี้นะคะ`,
            `ขอบคุณคุณ ${cleanSpeakerName} กดติดตามร่วมบุญในฉากจำลองนี้นะคะ`,
            `ยินดีและขอบคุณคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอให้เฮงๆ รวยๆ นะคะ`,
            `อนุโมทนาคุณ ${cleanSpeakerName} ที่ติดตามในฉากจำลองนี้ ขอให้สมหวังนะคะ`
          ];
          fallbackText = pickRandom(followPhrases);
        } else {
          fallbackText = `ขอบคุณคุณ ${cleanSpeakerName} สู่ฉากจำลองวิหาร ขอพระแม่ประทานพรให้โชคดีนะคะ`;
        }

        const fetchPromise = fetch('/api/gemini/bless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.payload),
          signal: abortSignal
        }).then(r => r.json()).catch(() => null);

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 6500));
        const res = await Promise.race([fetchPromise, timeoutPromise]);

        if (abortSignal.aborted) return;

        if (res && res.success) {
          audioUrl = res.audioUrl;
          textToDisplay = res.blessingText || fallbackText;
        } else {
          textToDisplay = fallbackText;
        }

        // If audioUrl was not generated by /api/gemini/bless, synthesize via /api/tts immediately
        if (!audioUrl && textToDisplay && !abortSignal.aborted) {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToDisplay }),
            signal: abortSignal
          }).then(r => r.json()).catch(() => null);
          if (ttsRes && ttsRes.success && ttsRes.url) {
            audioUrl = ttsRes.url;
          }
        }
      } else if (task.type === 'tts') {
        textToDisplay = task.text;
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: task.text }),
          signal: abortSignal
        }).then(r => r.json()).catch(() => null);

        if (abortSignal.aborted) return;

        if (res && res.success) {
          audioUrl = res.url;
        }
      }

      if (abortSignal.aborted) return;

      this.lastSpokenText = textToDisplay || '';
      if (textToDisplay && typeof showToast === 'function') {
        showToast('พระแม่กวนอิมประสาทพร 🙏', textToDisplay);
      }

      // 1. Primary: Studio-grade neural female voice (Dynamic MP3 speaking viewer name)
      const maxMs = task.maxMs || 0;
      if (audioUrl && !audioUrl.includes('default_')) {
        await this.playAudioUrl(audioUrl, maxMs || 12000, textToDisplay);
      } else if (this.thaiVoice && textToDisplay && this.synth) {
        // 2. Fallback: Speak text containing viewer name via client SpeechSynthesis
        await this.playBrowserTTS(textToDisplay, maxMs || 8000);
      } else if (audioUrl) {
        // 3. Fallback: Pre-rendered cloud MP3 audio
        await this.playAudioUrl(audioUrl, maxMs || 12000, textToDisplay);
      } else {
        await this.playAudioUrl('/audio_cache/default_blessing.mp3', maxMs || 12000, textToDisplay);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.warn('[GuanYin Voice] Error processing voice task:', e);
      }
    } finally {
      this.currentTask = null;
      this.currentAbortController = null;
      this.isGenerating = false;
    }
  }

  // Pure name extractor: strips emojis, symbols, crude slang & auto-generated IDs so TTS reads viewers' names smoothly
  cleanViewerName(rawName, fallback = 'กัลยาณมิตร') {
    return sanitizeDisplayName(rawName, fallback);
  }

  playAudioUrl(url, maxMs = 12000, fallbackText = '') {
    return new Promise(resolve => {
      // 1. Immediately cancel any running Web Speech API synthesis to guarantee zero voice overlap
      if (this.synth) {
        try { this.synth.cancel(); } catch (_) { }
      }

      // 2. Cleanly and safely teardown any existing playing audio
      this._safeTeardownCurrentAudio();

      // Smoothly duck BGM when Bodhisattva Guan Yin speaks
      if (typeof templeAudio !== 'undefined' && templeAudio.duckBgm) {
        templeAudio.duckBgm(true, 300);
      }

      if (typeof templeAudio !== 'undefined' && templeAudio.playBell) {
        templeAudio.playBell(513.6, 2.8);
      }

      const audio = new Audio(url);
      audio.playbackRate = 1.05; // Calm, fluid, dignified natural pace (พูดช้าลงอย่างสง่างาม ชัดเจน)
      audio.volume = Math.min(1.0, this.volume * 1.15);
      this.currentAudio = audio;
      this.isSpeaking = true;
      this.isGenerating = false;
      this.lastSpokenAt = Date.now();

      let hasEnded = false;
      const endPlayback = () => {
        if (hasEnded) return;
        hasEnded = true;
        this._currentPlaybackResolver = null;
        clearTimeout(timeout);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        this.isSpeaking = false;
        this.lastSpokenAt = Date.now();
        if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
          smartMicRouter.onVoiceEnd();
        }
        // Smoothly restore BGM when speech finishes
        if (typeof templeAudio !== 'undefined' && templeAudio.duckBgm) {
          templeAudio.duckBgm(false, 400);
        }
        resolve();
      };

      this._currentPlaybackResolver = endPlayback;
      const timeout = setTimeout(endPlayback, maxMs);

      audio.onended = () => {
        if (audio._aborted || hasEnded) return;
        endPlayback();
      };

      audio.onerror = (err) => {
        if (audio._aborted || hasEnded || this.currentAudio !== audio) return;
        console.warn('[GuanYin Voice] Audio file load error:', err, url);
        if (fallbackText && this.synth && !audio._aborted && !hasEnded) {
          this.playBrowserTTS(fallbackText, maxMs).then(endPlayback).catch(endPlayback);
          return;
        }
        endPlayback();
      };

      (async () => {
        if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
          await smartMicRouter.prepareVoiceAudio(audio, url);
        }
        if (audio._aborted || hasEnded || this.currentAudio !== audio) return;
        audio.play().catch(err => {
          if (audio._aborted || hasEnded || this.currentAudio !== audio) return;
          console.warn('[GuanYin Voice] Audio autoplay waiting or blocked:', err?.message);
          if (fallbackText && this.synth && !audio._aborted && !hasEnded) {
            this.playBrowserTTS(fallbackText, maxMs).then(endPlayback).catch(endPlayback);
            return;
          }
          endPlayback();
        });
      })();
    });
  }

  playBrowserTTS(text, maxMs = 8000) {
    return new Promise(resolve => {
      if (!this.synth || !this.thaiVoice) return resolve();

      // 1. Cleanly and safely teardown any existing playing audio to guarantee zero overlap
      this._safeTeardownCurrentAudio();

      try {
        this.synth.cancel(); // Stop any pending utterances
      } catch (_) { }

      // Smoothly duck BGM
      if (typeof templeAudio !== 'undefined' && templeAudio.duckBgm) {
        templeAudio.duckBgm(true, 300);
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = this.thaiVoice;
      utter.lang = 'th-TH';
      utter.rate = 1.08; // Calm, clear, natural Thai speech synthesis pace (พูดช้าลง นุ่มนวล ชัดถ้อยชัดคำ)
      utter.pitch = 1.0; // Natural warm pitch
      utter.volume = this.volume;

      if (typeof templeAudio !== 'undefined' && templeAudio.playBell) {
        templeAudio.playBell(513.6, 2.8);
      }

      this.isSpeaking = true;
      this.isGenerating = false;
      this.lastSpokenAt = Date.now();
      if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
        smartMicRouter.onVoiceStart();
      }

      let done = false;
      const endTTS = () => {
        if (done) return;
        done = true;
        this._currentPlaybackResolver = null;
        clearTimeout(timeout);
        this.isSpeaking = false;
        this.lastSpokenAt = Date.now();
        if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
          smartMicRouter.onVoiceEnd();
        }
        // Smoothly restore BGM
        if (typeof templeAudio !== 'undefined' && templeAudio.duckBgm) {
          templeAudio.duckBgm(false, 400);
        }
        resolve();
      };
      this._currentPlaybackResolver = endTTS;
      const timeout = setTimeout(endTTS, maxMs);

      utter.onend = endTTS;
      utter.onerror = endTTS;

      this.synth.speak(utter);
    });
  }

  // Priority 1: Gift Offering Blessing (AI speaks viewer's name and the devotional EFFECT name, never raw gift name)
  speakGiftBlessing(name, giftInfo = null, wish = '') {
    if (!this.enabled) return;
    const clean = this.cleanViewerName(name, 'ผู้มีจิตศรัทธา');
    const coins = giftInfo?.coins || 1;
    const count = giftInfo?.count || 1;
    const effectType = giftInfo?.effectType || '';
    const effectName = giftInfo?.effectName || getGiftEffectName(effectType, giftInfo?.name, coins);

    // Smart combo pacing: If same donor taps repeatedly within 3s, update their queued blessing
    const now = Date.now();
    const lastSpoken = this.lastDonorSpoken.get(clean) || 0;
    if (now - lastSpoken < 3000) {
      // Find and update existing pending gift blessing for this donor in queue
      const pending = this.queue.find(item => item.payload?.name === clean && item.payload?.isGift);
      if (pending) {
        pending.payload.count = (pending.payload.count || 1) + count;
        pending.payload.coins = (pending.payload.coins || 0) + coins;
        pending.payload.effectType = effectType || pending.payload.effectType;
        pending.payload.effectName = effectName || pending.payload.effectName;
        pending.payload.giftName = effectName || pending.payload.giftName;
        pending.payload.action = `ร่วมบุญ${effectName}`;
        return;
      }
    }
    this.lastDonorSpoken.set(clean, now);

    // Special Royal Seam-Si Divination: the AI reads the oracle content in sync with the unfurling scroll.
    // Voice is triggered ONCE from showSeamSiFortuneScroll() -> speakSeamSiFortune(), not at gift arrival,
    // so the speech lines up with the scroll actually appearing on screen (and never double-thanks the donor).
    if (effectType === 'seamsi' && giftInfo?.seamsiFortune) {
      return;
    }

    this.enqueue({
      type: 'gemini',
      priority: 1, // Highest priority
      payload: {
        name: clean,
        action: `ร่วมบุญ${effectName}`,
        effectType,
        effectName,
        giftName: effectName,
        coins,
        count,
        wish: wish || '',
        isGift: true
      }
    });
  }

  // Backwards-compatible aliases delegating directly to unified speakGiftBlessing
  // Seam-Si oracle reading: name + stick number + verse + wealth outlook, paced for the scroll on screen.
  // Returns the estimated speech duration (ms) so the UI can keep the scroll up until speech ends.
  speakSeamSiFortune(name, f, { onStart, onDone } = {}) {
    if (!this.enabled || !f) return 0;
    const clean = this.cleanViewerName(name, 'ผู้มีจิตศรัทธา');
    const spokenText = `คุณ ${clean} เสี่ยงเซียมซีในฉากจำลองนี้ได้${f.stickTitle} ${f.voiceBlessing || f.wealth} ขอให้ร่ำรวยสมหวังนะคะ`.slice(0, 160);
    const estMs = Math.min(10000, Math.max(4500, Math.round(spokenText.length * 70) + 1200));
    this.enqueue({
      type: 'tts',
      priority: 1,
      text: spokenText,
      maxMs: estMs + 2000,
      onStart,
      onDone,
      payload: { name: clean, effectType: 'seamsi', isGift: true }
    });
    return estMs;
  }

  speakKowtowBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakIncenseBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakLotusBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakFlowersBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakGoldenBellBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakCrystalFountainBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakRoyalCarriageBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakFireworksBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakCastleBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }
  speakDragonBlessing(name, giftInfo = null, wish = '') { this.speakGiftBlessing(name, giftInfo, wish); }

  // Priority 2: Follower Event
  speakFollowBlessing(name) {
    const clean = this.cleanViewerName(name, 'ผู้มีจิตศรัทธา');
    this.enqueue({
      type: 'gemini',
      priority: 2,
      payload: { name: clean, action: 'กดติดตาม' }
    });
  }

  // Priority 3: Devotee Welcome (AI Dynamic Voice Greeting, paced to avoid spam while welcoming viewers)
  speakWelcome(name, uniqueKey = '') {
    if (!this.enabled) return false;
    const clean = this.cleanViewerName(name, 'ผู้เจริญสติ');

    // Never use generic strings as keys for individual debounce
    const isGeneric = (clean === 'กัลยาณมิตร' || clean === 'ผู้เจริญสติ' || clean === 'ผู้มีจิตศรัทธา');
    const rawKey = String(uniqueKey || '').trim().toLowerCase();
    const userKey = (rawKey && !rawKey.includes('ผู้เจริญสติ') && !rawKey.includes('กัลยาณมิตร') && !rawKey.includes('ผู้มีจิตศรัทธา'))
      ? rawKey
      : (isGeneric ? '' : clean.toLowerCase());

    const now = Date.now();

    // 1. Per-User Long Cooldown: NEVER welcome the exact same distinct user more than once within 2.5 minutes
    if (userKey && this.welcomedUsers.has(userKey)) {
      const lastTime = this.welcomedUsers.get(userKey) || 0;
      if (now - lastTime < 150000) {
        return false; // Already welcomed recently, skip!
      }
    }

    // 2. Generic Name Pacing: If the name is generic, throttle to at most once per 15 seconds
    if (isGeneric && (now - this.lastGenericWelcomeAt < 15000)) {
      return false;
    }

    // 3. Keep at most 2 pending welcome tasks in voice queue to avoid backlog
    const pendingWelcomes = this.queue.filter(i => i.payload?.action === 'เข้าร่วมรับฟังธรรม').length;
    if (pendingWelcomes >= 2) {
      return false;
    }

    this.lastWelcomeAt = now;
    if (isGeneric) this.lastGenericWelcomeAt = now;
    if (userKey) this.welcomedUsers.set(userKey, now);

    // Prune old entries from welcomedUsers if it exceeds 500 users
    if (this.welcomedUsers.size > 500) {
      const cutoff = now - 10 * 60 * 1000;
      for (const [k, v] of this.welcomedUsers.entries()) {
        if (v < cutoff) this.welcomedUsers.delete(k);
      }
    }

    this.enqueue({
      type: 'gemini',
      priority: 3,
      payload: { name: clean, userKey, action: 'เข้าร่วมรับฟังธรรม' }
    });
    return true;
  }

  // Priority 3: Viewer Greeting (เมื่อผู้ชมทักทาย สวัสดี กราบ ฯลฯ)
  speakGreeting(name, comment) {
    if (!this.enabled || !this.chatVoiceEnabled) return;
    const now = Date.now();
    if (now - this.lastGreetingAt < 3000 || this.queue.length >= 3) return;
    this.lastGreetingAt = now;
    const clean = this.cleanViewerName(name, 'ผู้มีจิตศรัทธา');
    this.enqueue({
      type: 'gemini',
      priority: 3,
      payload: {
        name: clean,
        action: 'ทักทายและกราบสักการะ',
        wish: comment || 'สวัสดี'
      }
    });
  }

  // Priority 3: Viewer Sadhu Affirmation (เมื่อผู้ชมพิมพ์ สาธุ ร่วมสะสมแต้มบุญ)
  speakSadhuBlessing(name) {
    if (!this.enabled || !this.chatVoiceEnabled) return;
    const now = Date.now();
    if (now - this.lastSadhuAt < 6000 || this.queue.length >= 3) return;
    this.lastSadhuAt = now;
    const clean = this.cleanViewerName(name, 'ผู้มีจิตศรัทธา');
    this.enqueue({
      type: 'gemini',
      priority: 3,
      payload: {
        name: clean,
        action: 'ร่วมอนุโมทนาสาธุ'
      }
    });
  }

  // Priority 4: Viewer Chat Prayer Blessing (Intelligent filtering & natural voice reading)
  speakChatBlessing(name, comment) {
    if (!this.enabled || !this.chatVoiceEnabled) return;
    const clean = this.cleanViewerName(name, 'ผู้มีจิตศรัทธา');
    const wish = String(comment || '').trim();
    if (!wish) return;

    if (/(สาธุ|สาทุ|สาดุ|sadhu|sathu|อนุโมทนา|โมทนา)/i.test(wish)) {
      return this.speakSadhuBlessing(clean);
    }
    if (/(สวัสดี|หวัดดี|กราบ|นมัสการ|ทักทาย|hello|hi|ดีครับ|ดีค่ะ)/i.test(wish)) {
      return this.speakGreeting(clean, wish);
    }

    const stripped = wish.replace(/[\s\d.!?🙏ครับค่ะจร้าจ้าขอบคุณขอบใจna]+/gi, '');
    const isMeaningfulWish = stripped.length >= 3 || wish.includes('ขอ') || wish.includes('ให้') || wish.includes('รวย') || wish.includes('งาน') || wish.includes('สุขภาพ') || wish.includes('สุข') || wish.includes('รัก') || wish.includes('สำเร็จ') || wish.includes('โชค') || wish.includes('ปลดหนี้');

    if (!isMeaningfulWish) return;

    const now = Date.now();
    // Paced queue: ~5s to keep sanctuary serene while responsively answering viewer prayers
    if (now - this.lastChatBlessingAt < 5000 || this.queue.length >= 3) return;

    this.lastChatBlessingAt = now;

    this.enqueue({
      type: 'gemini',
      priority: 4,
      payload: {
        name: clean,
        action: 'ขอพรในแชท',
        wish
      }
    });
  }

  stopAll() {
    this.queue = [];
    if (this.currentAbortController) {
      try { this.currentAbortController.abort(); } catch (_) { }
      this.currentAbortController = null;
    }
    this._safeTeardownCurrentAudio();
    if (this.synth) {
      try { this.synth.cancel(); } catch (_) { }
    }
    if (this._currentPlaybackResolver) {
      const r = this._currentPlaybackResolver;
      this._currentPlaybackResolver = null;
      try { r(); } catch (_) { }
    }
    if (typeof templeAudio !== 'undefined' && templeAudio.duckBgm) {
      templeAudio.duckBgm(false, 200);
    }
    this.isSpeaking = false;
    this.isGenerating = false;
    this.isProcessing = false;
    if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
      smartMicRouter.onVoiceEnd();
    }
  }

  // Generic direct speech
  speak(text, priority = 3) {
    if (!text) return;
    this.enqueue({
      type: 'tts',
      priority,
      text
    });
  }
}
const guanYinVoice = new GuanYinDivineVoice();
window.guanYinVoice = guanYinVoice;

// ---------------------------------------------------------------------
// 1.7 Universal Cross-Tab & Multi-Process Speech Master Coordinator
// GUARANTEES that ONLY ONE tab/window across the entire machine can EVER speak AI blessings or trigger Keep-Alive!
// Eliminates duplicate / overlapping / conflicting speeches across multiple open tabs 100%!
// ---------------------------------------------------------------------
class BuddhaSpeechCoordinator {
  constructor(voiceEngine) {
    this.voice = voiceEngine;
    this.tabId = 'speech_tab_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('buddha_speech_coordinator') : null;
    this.isMaster = false;
    this.socket = null;
    this.serverMasterSocketId = null;
    this.heartbeatTimer = null;
    this.watchdogTimer = null;

    this.init();
  }

  init() {
    // Check if explicitly disabled via URL: ?voice=0 or ?no_voice=1 or ?display=1
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('voice') === '0' || params.get('no_voice') === '1' || params.get('display') === '1') {
        console.log('[SpeechCoordinator] URL explicitly disabled voice on this tab.');
        this.isMaster = false;
        if (this.voice) this.voice.enabled = false;
        return;
      }
    } catch (_) { }

    if (this.channel) {
      this.channel.onmessage = (e) => {
        const msg = e.data;
        if (!msg || msg.tabId === this.tabId) return;

        if (msg.type === 'CLAIM_SPEECH_MASTER') {
          if (this.isMaster) {
            console.log('[SpeechCoordinator] Another tab claimed Speech Master. Yielding leadership.');
            this.yieldMaster(false);
          }
        } else if (msg.type === 'SPEECH_HEARTBEAT') {
          if (this.isMaster && msg.tabId !== this.tabId) {
            // Tie-break: older tabId wins
            if (msg.tabId < this.tabId) {
              console.log('[SpeechCoordinator] Resolving split-brain: yielding to older tab:', msg.tabId);
              this.yieldMaster(false);
            }
          }
        }
      };
    }

    // Try to claim master immediately if no valid master exists
    this.evaluateLeadership();

    // Check leadership every 1500ms
    this.watchdogTimer = setInterval(() => {
      this.evaluateLeadership();
    }, 1500);

    // Release master on unload
    window.addEventListener('beforeunload', () => {
      this.releaseMaster();
    });
  }

  bindSocket(sock) {
    if (!sock) return;
    this.socket = sock;

    sock.on('initial_state', (data) => {
      if (data && data.speechMasterSocketId !== undefined) {
        this.updateMasterFromServer(data.speechMasterSocketId === sock.id, data.speechMasterSocketId);
      }
    });

    sock.on('speech_master_update', (data) => {
      if (data && data.masterSocketId !== undefined) {
        this.updateMasterFromServer(data.masterSocketId === sock.id, data.masterSocketId);
      }
    });

    // Check URL override: ?master=1 or ?voice=1 forces this tab to claim master
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('master') === '1' || params.get('voice') === '1') {
        setTimeout(() => this.claimMaster(), 600);
      }
    } catch (_) { }

    setInterval(() => {
      if (this.isMaster && this.socket && this.socket.connected) {
        this.socket.emit('speech_master_heartbeat', { tabId: this.tabId });
      }
    }, 2500);
  }

  updateMasterFromServer(isMaster, masterSocketId) {
    this.serverMasterSocketId = masterSocketId;
    if (isMaster) {
      if (!this.isMaster) {
        this.isMaster = true;
        if (this.voice) this.voice.enabled = true;
        try {
          localStorage.setItem('buddha_speech_master_tab', this.tabId);
          localStorage.setItem('buddha_speech_master_time', Date.now().toString());
        } catch (_) { }
        console.log('[SpeechCoordinator] Central Server appointed this tab as ACTIVE SPEECH MASTER 🎙️');
        if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
          smartMicRouter.updateStatusText();
        }
      }
    } else {
      if (this.isMaster) {
        this.isMaster = false;
        if (this.voice) {
          this.voice.stopAll();
        }
        console.log('[SpeechCoordinator] Another tab/process is Speech Master. Voice silenced on this tab 🔒');
        if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
          smartMicRouter.updateStatusText();
        }
      }
    }
  }

  evaluateLeadership() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('voice') === '0' || params.get('no_voice') === '1' || params.get('display') === '1') {
        this.isMaster = false;
        if (this.voice) this.voice.enabled = false;
        return;
      }

      // If connected to server, server has final authority across OBS, Studio, and browsers
      if (this.socket && this.socket.connected && this.serverMasterSocketId) {
        const isServerMaster = (this.socket.id === this.serverMasterSocketId);
        if (this.isMaster !== isServerMaster) {
          this.updateMasterFromServer(isServerMaster, this.serverMasterSocketId);
        }
        return;
      }

      const activeMaster = localStorage.getItem('buddha_speech_master_tab');
      const activeTime = parseInt(localStorage.getItem('buddha_speech_master_time') || '0', 10);
      const now = Date.now();

      // If active master is this tab
      if (activeMaster === this.tabId) {
        this.isMaster = true;
        this.sendHeartbeat();
        return;
      }

      // If active master exists and is fresh (< 2800ms old)
      if (activeMaster && (now - activeTime < 2800)) {
        if (this.isMaster) {
          this.yieldMaster(false);
        }
        return;
      }

      // Master is dead or non-existent -> Claim master!
      this.claimMaster();
    } catch (e) {
      this.isMaster = true; // Fallback if localStorage blocked
    }
  }

  claimMaster() {
    this.isMaster = true;
    try {
      localStorage.setItem('buddha_speech_master_tab', this.tabId);
      localStorage.setItem('buddha_speech_master_time', Date.now().toString());
    } catch (_) { }

    if (this.channel) {
      this.channel.postMessage({ type: 'CLAIM_SPEECH_MASTER', tabId: this.tabId });
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit('claim_speech_master', { tabId: this.tabId });
    }

    if (this.voice) {
      this.voice.enabled = true;
    }

    this.sendHeartbeat();
    console.log('[SpeechCoordinator] This tab is now the ACTIVE SPEECH MASTER 🎙️');
    if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
      smartMicRouter.updateStatusText();
    }
  }

  sendHeartbeat() {
    try {
      localStorage.setItem('buddha_speech_master_time', Date.now().toString());
    } catch (_) { }
    if (this.channel) {
      this.channel.postMessage({ type: 'SPEECH_HEARTBEAT', tabId: this.tabId });
    }
  }

  yieldMaster(notifyServer = true) {
    this.isMaster = false;
    if (this.voice) {
      this.voice.stopAll();
      this.voice.enabled = false;
    }
    if (notifyServer && this.socket && this.socket.connected) {
      this.socket.emit('yield_speech_master');
    }
    console.log('[SpeechCoordinator] Yielded Speech Master. Voice disabled on this secondary tab to prevent speech overlap.');
    if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
      smartMicRouter.updateStatusText();
    }
  }

  releaseMaster() {
    if (this.isMaster) {
      this.isMaster = false;
      try {
        if (localStorage.getItem('buddha_speech_master_tab') === this.tabId) {
          localStorage.removeItem('buddha_speech_master_tab');
        }
      } catch (_) { }
      if (this.socket && this.socket.connected) {
        this.socket.emit('yield_speech_master');
      }
    }
  }

  canSpeak() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('voice') === '0' || params.get('no_voice') === '1' || params.get('display') === '1') {
        return false;
      }
    } catch (_) { }

    if (this.socket && this.socket.connected && this.serverMasterSocketId) {
      return (this.socket.id === this.serverMasterSocketId);
    }
    return Boolean(this.isMaster);
  }
}

const speechCoordinator = new BuddhaSpeechCoordinator(guanYinVoice);
window.speechCoordinator = speechCoordinator;

// ---------------------------------------------------------------------
// 1.8 Smart Live Mic Router & Natural Condenser-Mic Acoustics Engine
// Routes AI Voice & Natural Room-Tone Presence into TikTok LIVE Studio Mic Input
// ---------------------------------------------------------------------
class SmartLiveMicRouter {
  constructor(audioEngine, voiceEngine) {
    this.templeAudio = audioEngine;
    this.voiceEngine = voiceEngine;
    this.mode = 'stereo_mix'; // 'stereo_mix' | 'voice_split' | 'all_to_mic'
    this.sinkId = 'default';
    this.acousticsEnabled = true;
    this.keepAliveEnabled = true;
    this.dualMonitorEnabled = true; // Enabled so broadcaster always hears AI voice on PC speakers/headphones
    this.isTransmittingSpeech = false;
    this.monitorAudio = null;
    this.micCtx = null;
    this.roomToneSource = null;
    this.roomToneGain = null;
    this.lastKeepAliveIdx = -1;
    this.nextKeepAliveMs = 10000 + Math.floor(Math.random() * 4000); // 10s - 14s initial presence on stream start

    this.keepAlivePhrases = [
      'ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหารสวรรค์ ขอให้จิตใจสงบร่มเย็นและมีความสุขนะคะ',
      'ขอพระแม่กวนอิมประทานพรในฉากจำลองนี้ ให้ทุกท่านมีโชคลาภเงินทองไหลมาเทมานะคะ',
      'อนุโมทนาบุญกับทุกท่านที่มาร่วมเจริญสติในฉากจำลองวิหารนี้นะคะ',
      'ขอพรในฉากจำลองนี้ ให้วันนี้เป็นวันที่ราบรื่นและพบเจอแต่สิ่งดีงามนะคะ',
      'ท่านที่เพิ่งเข้ามา สามารถร่วมอนุโมทนาบุญในฉากจำลองวิหารนี้ได้เลยนะคะ',
      'ขอเมตตาบารมีในฉากจำลองนี้ คุ้มครองทุกท่านให้แคล้วคลาดปลอดภัย ร่ำรวยนะคะ',
      'ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหาร ขอให้บทสวดนำพาความร่มเย็นมาให้นะคะ',
      'ขอให้ทุกท่านที่ร่วมรับฟังในฉากจำลองนี้ มีจิตใจผ่องใส การเงินคล่องตัวนะคะ',
      'น้อมจิตสักการะในฉากจำลองวิหารนี้ ขอให้ทุกท่านพบเจอแต่ความสว่างไสวนะคะ',
      'ขอพรในฉากจำลองนี้คุ้มครองทุกท่าน ให้ผ่านพ้นทุกอุปสรรคและร่ำรวยนะคะ',
      'อนุโมทนาสาธุกับทุกท่านในฉากจำลองวิหาร ขอให้มีแต่ความสุขใจนะคะ',
      'ขอให้ทรัพย์สินเงินทองไหลมาเทมา ในฉากจำลองบุญบารมีนี้นะคะ',
      'เจริญจิตภาวนาในฉากจำลองวิหาร ขอให้ทุกท่านมีสุขภาพแข็งแรงสมบูรณ์นะคะ',
      'ขอพรในฉากจำลองนี้ ให้ครอบครัวร่มเย็นเป็นสุข ปราศจากโรคภัยนะคะ',
      'ขอเมตตาธรรมในฉากจำลองวิหาร นำพาความสงบสุขและความเจริญมาสู่ทุกท่านนะคะ',
      'สาธุบุญกับทุกท่านในฉากจำลองนี้ ขอให้มีโชคมีลาภ เฮงๆ รวยๆ นะคะ'
    ];

    this.restoreSettings();
    this.fetchServerConfig();
    this.init();
  }

  async fetchServerConfig() {
    try {
      const res = await fetch('/api/mic-router/config');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.config) {
          const cfg = json.config;
          if (cfg.mode) this.mode = cfg.mode;
          if (typeof cfg.acousticsEnabled === 'boolean') this.acousticsEnabled = cfg.acousticsEnabled;
          if (typeof cfg.keepAliveEnabled === 'boolean') this.keepAliveEnabled = cfg.keepAliveEnabled;
          if (typeof cfg.dualMonitorEnabled === 'boolean') this.dualMonitorEnabled = cfg.dualMonitorEnabled;
          this.saveLocalSettings();
          const modeEl = document.getElementById('select-mic-mode');
          if (modeEl) modeEl.value = this.mode;
          await this.refreshDeviceList(false);
        }
      }
    } catch (_) { }
  }

  restoreSettings() {
    try {
      const savedMode = localStorage.getItem('buddha_mic_mode');
      if (savedMode && ['stereo_mix', 'voice_split', 'all_to_mic'].includes(savedMode)) {
        this.mode = savedMode;
      }
      const savedSink = localStorage.getItem('buddha_mic_sink_id');
      if (savedSink) this.sinkId = savedSink;
      const savedAcoustics = localStorage.getItem('buddha_mic_acoustics');
      if (savedAcoustics !== null) this.acousticsEnabled = (savedAcoustics !== 'false');
      const savedKeepAlive = localStorage.getItem('buddha_mic_keepalive');
      if (savedKeepAlive !== null) this.keepAliveEnabled = (savedKeepAlive !== 'false');
      const savedMonitor = localStorage.getItem('buddha_mic_dual_monitor');
      if (savedMonitor !== null) this.dualMonitorEnabled = (savedMonitor !== 'false');
    } catch (_) { }
  }

  saveLocalSettings() {
    try {
      localStorage.setItem('buddha_mic_mode', this.mode);
      localStorage.setItem('buddha_mic_sink_id', this.sinkId);
      localStorage.setItem('buddha_mic_acoustics', this.acousticsEnabled ? 'true' : 'false');
      localStorage.setItem('buddha_mic_keepalive', this.keepAliveEnabled ? 'true' : 'false');
      localStorage.setItem('buddha_mic_dual_monitor', this.dualMonitorEnabled ? 'true' : 'false');
    } catch (_) { }
  }

  pushServerConfig() {
    this.saveLocalSettings();
    try {
      fetch('/api/mic-router/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: this.mode,
          sinkId: this.sinkId,
          acousticsEnabled: this.acousticsEnabled,
          keepAliveEnabled: this.keepAliveEnabled,
          dualMonitorEnabled: this.dualMonitorEnabled
        })
      }).catch(() => { });
    } catch (_) { }
  }

  init() {
    this.startVuMeterLoop();
    this.startKeepAliveWatchdog();
    setTimeout(() => {
      this.bindUIControls();
      this.refreshDeviceList(false);
    }, 350);

    // Unlock Mic Acoustics AudioContext on any user interaction or automatic audio start
    const unlockMicCtx = () => {
      this.ensureMicAcousticsContext();
    };
    window.addEventListener('pointerdown', unlockMicCtx, { once: true, passive: true });
    window.addEventListener('mousemove', unlockMicCtx, { once: true, passive: true });
    setTimeout(unlockMicCtx, 1800);
  }

  ensureMicAcousticsContext() {
    try {
      if (!this.micCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.micCtx = new AudioCtx();
        this.applySinkToContext(this.micCtx);
        this.startRoomToneEngine();
      }
      if (this.micCtx && this.micCtx.state === 'suspended') {
        this.micCtx.resume().catch(() => { });
      }
    } catch (_) { }
  }

  // Creates an authentic condenser-microphone room tone floor (-48 dB warm filtered pink noise + slow breathing LFO)
  // Prevents 0.0000 digital silence that TikTok's automated stream detector flags as pre-recorded/bot audio
  startRoomToneEngine() {
    if (!this.micCtx || this.roomToneSource) return;
    try {
      const sampleRate = this.micCtx.sampleRate || 44100;
      const durationSec = 5;
      const bufferSize = sampleRate * durationSec;
      const noiseBuffer = this.micCtx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Paul Kellet's Pink/Warm Room Noise Approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
        b6 = white * 0.115926;
      }

      const source = this.micCtx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      // Condenser microphone vocal bandpass (120 Hz - 1900 Hz)
      const bandpass = this.micCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(420, this.micCtx.currentTime);
      bandpass.Q.setValueAtTime(0.7, this.micCtx.currentTime);

      const gain = this.micCtx.createGain();
      const baseFloor = this.acousticsEnabled ? 0.0042 : 0.0001;
      gain.gain.setValueAtTime(baseFloor, this.micCtx.currentTime);

      source.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.micCtx.destination);
      source.start(0);

      this.roomToneSource = source;
      this.roomToneGain = gain;
    } catch (_) { }
  }

  // Subtle 130ms condenser-mic inhale & chest warmth before AI speaks
  triggerPreSpeechBreath() {
    if (!this.acousticsEnabled) return;
    this.ensureMicAcousticsContext();
    if (!this.micCtx || this.micCtx.state !== 'running') return;

    try {
      const now = this.micCtx.currentTime;
      if (this.roomToneGain) {
        this.roomToneGain.gain.cancelScheduledValues(now);
        this.roomToneGain.gain.setValueAtTime(0.0042, now);
        this.roomToneGain.gain.linearRampToValueAtTime(0.011, now + 0.09);
        this.roomToneGain.gain.linearRampToValueAtTime(0.0055, now + 0.22);
      }
    } catch (_) { }
  }

  async applySinkToContext(ctx) {
    if (!ctx || typeof ctx.setSinkId !== 'function') return;
    const targetSink = (this.mode === 'stereo_mix' || !this.sinkId || this.sinkId === 'default') ? '' : this.sinkId;
    try {
      await ctx.setSinkId(targetSink);
    } catch (err) {
      console.warn('[SmartMicRouter] AudioContext.setSinkId fallback to default:', err?.message);
    }
  }

  async applyGlobalRouting() {
    this.ensureMicAcousticsContext();
    await this.applySinkToContext(this.micCtx);

    // If mode is 'all_to_mic', also route BGM and TempleAudio to the selected virtual mic cable
    const bgmTargetSink = (this.mode === 'all_to_mic' && this.sinkId && this.sinkId !== 'default') ? this.sinkId : '';
    if (this.templeAudio?.bgmAudio && typeof this.templeAudio.bgmAudio.setSinkId === 'function') {
      try {
        await this.templeAudio.bgmAudio.setSinkId(bgmTargetSink);
      } catch (_) { }
    }
    if (this.templeAudio?.ctx && typeof this.templeAudio.ctx.setSinkId === 'function') {
      try {
        await this.templeAudio.ctx.setSinkId(bgmTargetSink);
      } catch (_) { }
    }
    this.updateStatusText();
  }

  async prepareVoiceAudio(audioEl, url) {
    this.isTransmittingSpeech = true;
    this.triggerPreSpeechBreath();
    this.stopMonitorAudio();

    const useCustomSink = (this.mode === 'voice_split' || this.mode === 'all_to_mic') && this.sinkId && this.sinkId !== 'default';
    if (useCustomSink && audioEl && typeof audioEl.setSinkId === 'function') {
      try {
        await audioEl.setSinkId(this.sinkId);
      } catch (err) {
        console.warn('[SmartMicRouter] HTMLAudioElement.setSinkId fallback:', err?.message);
      }

      // Dual Monitor: play a synchronized copy on default speakers so the user also hears the voice locally
      if (this.mode === 'voice_split' && this.dualMonitorEnabled && url) {
        try {
          const mon = new Audio(url);
          mon.playbackRate = audioEl.playbackRate || 1.0;
          mon.volume = Math.min(1.0, (audioEl.volume || 0.95) * 0.85);
          this.monitorAudio = mon;
          mon.play().catch(() => { });
        } catch (_) { }
      }
    }
    this.updateStatusText();
  }

  stopMonitorAudio() {
    if (this.monitorAudio) {
      try {
        this.monitorAudio.pause();
        this.monitorAudio.src = '';
      } catch (_) { }
      this.monitorAudio = null;
    }
  }

  onVoiceStart() {
    this.isTransmittingSpeech = true;
    this.triggerPreSpeechBreath();
    this.updateStatusText();
  }

  onVoiceEnd() {
    this.isTransmittingSpeech = false;
    this.stopMonitorAudio();
    if (this.roomToneGain && this.micCtx && this.micCtx.state === 'running') {
      try {
        const now = this.micCtx.currentTime;
        this.roomToneGain.gain.cancelScheduledValues(now);
        this.roomToneGain.gain.linearRampToValueAtTime(this.acousticsEnabled ? 0.0042 : 0.0001, now + 0.35);
      } catch (_) { }
    }
    this.updateStatusText();
  }

  startVuMeterLoop() {
    setInterval(() => {
      const fillEl = document.getElementById('mic-vu-fill');
      const dotEl = document.getElementById('mic-router-dot');
      if (!fillEl) return;

      if (this.isTransmittingSpeech) {
        // Dynamic human speech syllable envelope (45% - 94%)
        const pct = 48 + Math.floor(Math.random() * 46);
        fillEl.style.width = `${pct}%`;
        if (dotEl) dotEl.classList.add('speaking');
      } else {
        // Subtle organic room tone floor (8% - 15% when acoustics enabled, 3% when disabled)
        const basePct = this.acousticsEnabled ? (8 + Math.floor(Math.random() * 7)) : 3;
        fillEl.style.width = `${basePct}%`;
        if (dotEl) dotEl.classList.remove('speaking');
      }
    }, 130);
  }

  // Ensures TikTok Microphone VAD continuously detects active human-like speech presence (every 15-21s)
  startKeepAliveWatchdog() {
    setInterval(() => {
      if (!this.keepAliveEnabled) return;
      if (typeof speechCoordinator !== 'undefined' && speechCoordinator && !speechCoordinator.canSpeak()) return;
      if (!this.voiceEngine || !this.voiceEngine.enabled) return;
      if (this.voiceEngine.isSpeaking || this.voiceEngine.isProcessing || this.voiceEngine.isGenerating || this.voiceEngine.queue.length > 0) return;

      const lastSpoken = this.voiceEngine.lastSpokenAt || 0;
      const idleMs = Date.now() - lastSpoken;
      if (idleMs >= this.nextKeepAliveMs) {
        this.voiceEngine.lastSpokenAt = Date.now();
        // High-frequency 15s - 21s cadence: guarantees TikTok microphone meter stays active & never triggers dead-air unengaged flags
        this.nextKeepAliveMs = 15000 + Math.floor(Math.random() * 6000);

        let idx = Math.floor(Math.random() * this.keepAlivePhrases.length);
        if (idx === this.lastKeepAliveIdx) {
          idx = (idx + 1) % this.keepAlivePhrases.length;
        }
        this.lastKeepAliveIdx = idx;
        const phrase = this.keepAlivePhrases[idx];
        this.voiceEngine.speak(phrase, 4);
      }
    }, 2000);
  }

  async refreshDeviceList(requestPermission = false) {
    const selectEl = document.getElementById('select-mic-device');
    if (!selectEl || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

    if (requestPermission && navigator.mediaDevices.getUserMedia) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
      } catch (_) { }
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter(d => d.kind === 'audiooutput');

      selectEl.innerHTML = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = 'default';
      defaultOpt.textContent = '🔊 อุปกรณ์เสียงหลักของเครื่อง (Default / Stereo Mix)';
      selectEl.appendChild(defaultOpt);

      let autoDetectedVirtualId = null;

      outputs.forEach((dev, i) => {
        if (!dev.deviceId || dev.deviceId === 'default' || dev.deviceId === 'communications') return;
        const label = dev.label || `ช่องสัญญาณเสียง #${i + 1}`;
        const lower = label.toLowerCase();
        const isVirtualMic = lower.includes('cable') || lower.includes('vb-audio') || lower.includes('voicemeeter') || lower.includes('virtual') || lower.includes('stereo mix');

        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = isVirtualMic ? `🎙️ [สายไมค์จำลอง] ${label}` : `🔊 ${label}`;
        selectEl.appendChild(opt);

        if (isVirtualMic && !autoDetectedVirtualId) {
          autoDetectedVirtualId = dev.deviceId;
        }
      });

      // Auto-bind to VB-Cable if found and in voice_split or all_to_mic mode
      if (autoDetectedVirtualId && (this.mode === 'voice_split' || this.mode === 'all_to_mic')) {
        this.sinkId = autoDetectedVirtualId;
      }

      this.hasDetectedVirtualCable = Boolean(autoDetectedVirtualId);

      if ([...selectEl.options].some(o => o.value === this.sinkId)) {
        selectEl.value = this.sinkId;
      } else {
        this.sinkId = 'default';
        selectEl.value = 'default';
      }
      await this.applyGlobalRouting();
    } catch (err) {
      console.warn('[SmartMicRouter] Could not enumerate audio devices:', err?.message);
    }
  }

  updateStatusText() {
    const statusEl = document.getElementById('mic-router-status-text');
    const guideBox = document.getElementById('mic-diagnostic-guide');
    const guideTitle = document.getElementById('mic-diag-title');
    const guideBody = document.getElementById('mic-diag-body');
    const selectEl = document.getElementById('select-mic-device');
    const selectedLabel = selectEl && selectEl.options[selectEl.selectedIndex]
      ? selectEl.options[selectEl.selectedIndex].textContent
      : 'Default';

    if (guideBox && guideTitle && guideBody) {
      if ((this.mode === 'voice_split' || this.mode === 'all_to_mic') && (!this.sinkId || this.sinkId === 'default')) {
        guideBox.classList.add('warn');
        guideTitle.textContent = '⚠️ โหมดแยกสายไมค์ ต้องเลือกช่องสายไมค์จำลอง (VB-Cable):';
        guideBody.innerHTML =
          'ขณะนี้ช่อง Output Sink ยังเป็น <b>ลำโพงหลัก (Default)</b> แถบไมค์ใน TikTok จึงยังไม่ขยับแยกต่างหาก<br>' +
          '• <b>วิธีที่ 1 (ไม่ต้องลงโปรแกรม):</b> เปลี่ยนเป็น <b>โหมด 1 (Stereo Mix)</b> แล้วตั้งค่าไมค์ใน TikTok LIVE Studio เป็น <b>Stereo Mix</b><br>' +
          '• <b>วิธีที่ 2 (แยกเฉพาะเสียงพูด):</b> ติดตั้งไดรเวอร์ฟรี <b>VB-CABLE</b> แล้วกดปุ่ม <b>🔍 สแกนหาช่องไมค์</b> เพื่อเลือก <b>CABLE Input</b> และตั้งค่าไมค์ใน TikTok เป็น <b>CABLE Output</b>';
      } else if (this.mode === 'voice_split' || this.mode === 'all_to_mic') {
        guideBox.classList.remove('warn');
        guideTitle.textContent = '✅ กำลังส่งสัญญาณเข้าสายไมค์จำลอง:';
        guideBody.innerHTML =
          `ส่งสัญญาณไปที่: <b>${selectedLabel}</b><br>` +
          '👉 ในโปรแกรม <b>TikTok LIVE Studio</b> กดรูปเฟืองที่แถบ <b>ไมโครโฟน (Mic)</b> แล้วเลือกเป็น <b>CABLE Output (VB-Audio Virtual Cable)</b> แถบไมค์จะขยับทันทีที่พระแม่พูด!';
      } else {
        guideBox.classList.remove('warn');
        guideTitle.textContent = '📌 วิธีตั้งค่าให้แถบไมค์ใน TikTok LIVE Studio ขยับ (โหมด 1):';
        guideBody.innerHTML =
          '1. เปิด <b>Stereo Mix (สเตอริโอมิกซ์)</b> ในตั้งค่าเสียง Windows (แท็บ Recording)<br>' +
          '2. ในโปรแกรม <b>TikTok LIVE Studio</b> กดรูปเฟืองที่แถบ <b>ไมโครโฟน (Mic)</b> แล้วเลือกเป็น <b>Stereo Mix</b>';
      }
    }

    if (!statusEl) return;

    const isMasterTab = typeof speechCoordinator !== 'undefined' && speechCoordinator ? speechCoordinator.canSpeak() : true;
    if (!isMasterTab) {
      statusEl.innerHTML = '🔒 ควบคุมเสียงอยู่ที่หน้าหลัก (ปิดเสียงหน้านี้เพื่อกันเสียงซ้อน 100%) <button id="btn-claim-mic-master" style="margin-left:6px;padding:2px 8px;font-size:11px;background:#eab308;color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">🎙️ ถือไมค์พูดหน้านี้</button>';
      statusEl.style.color = '#93c5fd';
      const claimBtn = document.getElementById('btn-claim-mic-master');
      if (claimBtn && !claimBtn._bound) {
        claimBtn._bound = true;
        claimBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof speechCoordinator !== 'undefined' && speechCoordinator) {
            speechCoordinator.claimMaster();
          }
        });
      }
      return;
    }

    if (this.isTransmittingSpeech) {
      statusEl.textContent = '🎙️ กำลังส่งคลื่นเสียงพูดพระแม่เข้าช่องไมค์ (Speaking)';
      statusEl.style.color = '#fde047';
      return;
    }

    if (this.mode === 'voice_split') {
      if (!this.sinkId || this.sinkId === 'default') {
        statusEl.textContent = '⚠️ กรุณากด "🔍 สแกนหาช่องไมค์" หรือเลือกสาย VB-Cable';
        statusEl.style.color = '#fca5a5';
      } else {
        statusEl.textContent = '🟢 แยกเฉพาะเสียงพูด AI ➔ ช่องไมค์จำลอง (พร้อมทำงาน)';
        statusEl.style.color = '#bbf7d0';
      }
    } else if (this.mode === 'all_to_mic') {
      statusEl.textContent = '🟢 ส่งเสียงทั้งหมด (เพลง+เสียงพูด) ➔ ช่องไมค์';
      statusEl.style.color = '#bbf7d0';
    } else {
      statusEl.textContent = '🟢 โหมด Stereo Mix + คลื่นไมค์คนพูดจริง (Active)';
      statusEl.style.color = '#bbf7d0';
    }
  }

  broadcastSync() {
    if (typeof socket !== 'undefined' && socket && socket.connected) {
      socket.emit('mic_router_sync', {
        mode: this.mode,
        sinkId: this.sinkId,
        acousticsEnabled: this.acousticsEnabled,
        keepAliveEnabled: this.keepAliveEnabled,
        dualMonitorEnabled: this.dualMonitorEnabled
      });
    }
  }

  bindUIControls() {
    const modeSelect = document.getElementById('select-mic-mode');
    const deviceSelect = document.getElementById('select-mic-device');
    const scanBtn = document.getElementById('btn-scan-mic-devices');
    const chkAcoustics = document.getElementById('chk-mic-acoustics');
    const chkKeepAlive = document.getElementById('chk-mic-keepalive');
    const chkMonitor = document.getElementById('chk-mic-dual-monitor');
    const testBtn = document.getElementById('btn-test-mic-router');

    if (modeSelect) {
      modeSelect.value = this.mode;
      modeSelect.addEventListener('change', async (e) => {
        this.mode = e.target.value;
        this.pushServerConfig();
        if (this.mode !== 'stereo_mix' && (!this.sinkId || this.sinkId === 'default')) {
          await this.refreshDeviceList(true);
        } else {
          await this.applyGlobalRouting();
        }
        this.broadcastSync();
      });
    }

    if (deviceSelect) {
      deviceSelect.addEventListener('change', async (e) => {
        this.sinkId = e.target.value;
        this.pushServerConfig();
        await this.applyGlobalRouting();
        this.broadcastSync();
      });
    }

    if (scanBtn) {
      scanBtn.addEventListener('click', async () => {
        scanBtn.textContent = '⏳ กำลังสแกน...';
        await this.refreshDeviceList(true);
        this.pushServerConfig();
        this.broadcastSync();
        scanBtn.textContent = '✅ สแกนสำเร็จ';
        setTimeout(() => {
          scanBtn.textContent = '🔍 สแกนหาช่องไมค์';
        }, 2000);
      });
    }

    if (chkAcoustics) {
      chkAcoustics.checked = this.acousticsEnabled;
      chkAcoustics.addEventListener('change', (e) => {
        this.acousticsEnabled = e.target.checked;
        this.pushServerConfig();
        this.ensureMicAcousticsContext();
        if (this.roomToneGain && this.micCtx) {
          try {
            this.roomToneGain.gain.setValueAtTime(this.acousticsEnabled ? 0.0042 : 0.0001, this.micCtx.currentTime);
          } catch (_) { }
        }
        this.broadcastSync();
      });
    }

    if (chkKeepAlive) {
      chkKeepAlive.checked = this.keepAliveEnabled;
      chkKeepAlive.addEventListener('change', (e) => {
        this.keepAliveEnabled = e.target.checked;
        this.pushServerConfig();
        this.broadcastSync();
      });
    }

    if (chkMonitor) {
      chkMonitor.checked = this.dualMonitorEnabled;
      chkMonitor.addEventListener('change', (e) => {
        this.dualMonitorEnabled = e.target.checked;
        this.pushServerConfig();
        this.broadcastSync();
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.ensureMicAcousticsContext();
        if (typeof socket !== 'undefined' && socket && socket.connected) {
          socket.emit('mic_router_test', { timestamp: Date.now() });
        } else if (this.voiceEngine) {
          this.voiceEngine.enabled = true;
          this.voiceEngine.speak('ทดสอบสัญญาณไมโครโฟน ขอพระแม่กวนอิมประทานพรให้ทุกท่านโชคดีมีสุข ร่ำรวยเงินทองนะคะ', 1);
        }
      });
    }

    const toggleChromeBgmBtn = document.getElementById('btn-toggle-chrome-bgm');
    if (toggleChromeBgmBtn) {
      toggleChromeBgmBtn.addEventListener('click', () => {
        const isPlaying = this.templeAudio.toggleAmbient();
        if (typeof showToast === 'function') {
          if (!isPlaying) {
            showToast('ปิดเพลงในหน้านี้แล้ว 🔇', 'ระบบจะส่งเฉพาะเสียงพูด AI เข้าสายไมค์ TikTok โดยไม่มีเสียงเพลงซ้อน 100%');
          } else {
            showToast('เปิดเพลงสวดมนต์แล้ว 🎵', 'เปิดเสียงบทสวดมนต์ในหน้านี้เรียบร้อย');
          }
        }
      });
    }

    const soundModeSelect = document.getElementById('select-sound-mode');
    if (soundModeSelect) {
      soundModeSelect.value = this.templeAudio.soundMode || 'zen_original';
      soundModeSelect.addEventListener('change', (e) => {
        const newMode = e.target.value;
        this.templeAudio.soundMode = newMode;
        try { localStorage.setItem('buddha_sound_mode', newMode); } catch (_) { }
        if (this.templeAudio.ambientPlaying) {
          this.templeAudio.stopAmbient();
          setTimeout(() => {
            this.templeAudio.startAmbient(true);
          }, 300);
        }
        if (typeof showToast === 'function') {
          if (newMode === 'zen_original') {
            showToast('โหมดเสียงเซน 432Hz ✨', 'เปิดใช้งานเสียงสมาธิเซนบริสุทธิ์ สดใหม่ ปลอดภัยจากการตรวจจับลิขสิทธิ์ 100%');
          } else {
            showToast('โหมดไฟล์เสียงสวดมนต์ 📜', 'เปลี่ยนเป็นไฟล์เสียงสวดมนต์ไต่ปุยจิ่ว');
          }
        }
      });
    }

    this.updateStatusText();
  }
}

const smartMicRouter = new SmartLiveMicRouter(templeAudio, guanYinVoice);
window.smartMicRouter = smartMicRouter;

// 2. Three.js Scene Setup (Static Calm Meditative Sanctuary Overview)
// ---------------------------------------------------------------------
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// Dignified static camera looking straight down the red carpet aisle toward Guan Yin
const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 5.2, 15.5);
camera.lookAt(0, -0.3, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(container.clientWidth, container.clientHeight);
// Lock to native 1.0 pixel ratio for OBS & TikTok LIVE Studio CEF Browser Sources
// (Prevents 4K over-rendering on high-DPI Windows scaling, saving 75% GPU bandwidth)
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Dynamic Responsive Viewport & Three.js Resizer for OBS Studio & High-DPI Canvases
function handleSanctuaryResize() {
  const streamCont = document.getElementById('stream-container');
  if (streamCont) {
    const w = streamCont.clientWidth;
    if (w >= 500) {
      const s = (w / 440).toFixed(3);
      document.documentElement.style.setProperty('--ui-scale', s);
      streamCont.style.setProperty('--ui-scale', s);
    } else {
      document.documentElement.style.setProperty('--ui-scale', '1');
      streamCont.style.setProperty('--ui-scale', '1');
    }
  }
  if (container && renderer && camera) {
    const cw = container.clientWidth || 1080;
    const ch = container.clientHeight || 1920;
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    renderer.setSize(cw, ch);
  }
}
window.addEventListener('resize', handleSanctuaryResize);
window.addEventListener('orientationchange', handleSanctuaryResize);
handleSanctuaryResize();

// Lighting: Celestial Daylight & Heavenly Garden Warmth
const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.45);
scene.add(ambientLight);

const carpetLight = new THREE.PointLight(0xffe4a0, 3.5, 22);
carpetLight.position.set(0, 4.0, 5.5);
scene.add(carpetLight);

const altarGlow = new THREE.PointLight(0xffa028, 3.0, 16);
altarGlow.position.set(0, 2.2, 1.8);
scene.add(altarGlow);

// ---------------------------------------------------------------------
// 2.1 Dynamic Temple Warm Ambiance & Twin Lotus Pond Radiance
// ---------------------------------------------------------------------
const altarSoftLight = new THREE.PointLight(0xfff3a8, 2.0, 14);
altarSoftLight.position.set(0, 3.8, 1.2);
scene.add(altarSoftLight);

// Subtle Jade Radiance (Guan Yin Sacred Willow Water Vase)
const jadeWillowLight = new THREE.PointLight(0x6ee7b7, 0.95, 8);
jadeWillowLight.position.set(0, 3.6, 1.0);
scene.add(jadeWillowLight);

// Twin Lotus Pond Ambient Glow (แสงเรืองรองสระบัวทิพย์สีชมพูสองฝั่งสะพานหยกขาว)
const leftLotusLight = new THREE.PointLight(0xff69b4, 1.25, 14);
leftLotusLight.position.set(-4.8, 2.2, 4.0);
scene.add(leftLotusLight);

const rightLotusLight = new THREE.PointLight(0xff69b4, 1.25, 14);
rightLotusLight.position.set(4.8, 2.2, 4.0);
scene.add(rightLotusLight);

// Marble Bridge Lotus Lanterns Glow (โคมไฟบัวหยกขาว ซ้าย-ขวา)
const leftLanternLight = new THREE.PointLight(0xffb347, 1.6, 12);
leftLanternLight.position.set(-4.5, 4.8, 3.5);
scene.add(leftLanternLight);

const rightLanternLight = new THREE.PointLight(0xffb347, 1.6, 12);
rightLanternLight.position.set(4.5, 4.8, 3.5);
scene.add(rightLanternLight);

// ---------------------------------------------------------------------
// 2.2 Bodhisattva Guan Yin Majestic Divine Halo & Celestial Light System
// ---------------------------------------------------------------------

function createMandorlaSunburstTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256, cy = 256;

  // Soft radiant core
  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 250);
  grad.addColorStop(0.0, 'rgba(255, 255, 240, 0.95)');
  grad.addColorStop(0.25, 'rgba(255, 225, 90, 0.75)');
  grad.addColorStop(0.55, 'rgba(245, 160, 30, 0.38)');
  grad.addColorStop(0.82, 'rgba(220, 100, 10, 0.12)');
  grad.addColorStop(1.0, 'rgba(180, 60, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 250, 0, Math.PI * 2);
  ctx.fill();

  // 32 Sacred Radiating Sunburst Rays
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 32; i++) {
    ctx.rotate((Math.PI * 2) / 32);
    const rayGrad = ctx.createLinearGradient(0, 0, 0, 248);
    rayGrad.addColorStop(0, 'rgba(255, 255, 230, 0.90)');
    rayGrad.addColorStop(0.35, 'rgba(255, 215, 60, 0.65)');
    rayGrad.addColorStop(0.80, 'rgba(245, 140, 20, 0.20)');
    rayGrad.addColorStop(1, 'rgba(220, 90, 0, 0)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(-7, 36);
    ctx.lineTo(0, 248);
    ctx.lineTo(7, 36);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Holy Concentric Golden Nimbus Rings
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255, 245, 180, 0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, 142, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 215, 80, 0.70)';
  ctx.beginPath();
  ctx.arc(cx, cy, 172, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function createInnerHaloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256, cy = 256;

  // 16 Petaled Sacred Golden Lotus Mandala
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    const petalGrad = ctx.createRadialGradient(0, 80, 5, 0, 80, 80);
    petalGrad.addColorStop(0, 'rgba(255, 240, 160, 0.85)');
    petalGrad.addColorStop(0.6, 'rgba(255, 180, 40, 0.45)');
    petalGrad.addColorStop(1, 'rgba(230, 120, 0, 0)');
    ctx.fillStyle = petalGrad;
    ctx.beginPath();
    ctx.ellipse(0, 80, 28, 70, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function createGodRayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(64, 0, 64, 512);
  grad.addColorStop(0.0, 'rgba(255, 255, 240, 0.75)');
  grad.addColorStop(0.2, 'rgba(255, 230, 120, 0.50)');
  grad.addColorStop(0.6, 'rgba(245, 180, 40, 0.22)');
  grad.addColorStop(1.0, 'rgba(220, 120, 10, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// 1. Dual Rotating Mandorla Halo Planes
const mandorlaGroup = new THREE.Group();
mandorlaGroup.position.set(0, 5.15, 0.45); // Aligns precisely with Guan Yin's golden nimbus

const mandorlaOuterMat = new THREE.MeshBasicMaterial({
  map: createMandorlaSunburstTexture(),
  transparent: true,
  opacity: 0.65,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const mandorlaOuter = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), mandorlaOuterMat);
mandorlaGroup.add(mandorlaOuter);

const mandorlaInnerMat = new THREE.MeshBasicMaterial({
  map: createInnerHaloTexture(),
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const mandorlaInner = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), mandorlaInnerMat);
mandorlaGroup.add(mandorlaInner);

mandorlaGroup.visible = false; // Disabled to let background video's authentic halo shine cleanly without moire
scene.add(mandorlaGroup);

// 2. Celestial God Rays (ลำแสงสวรรค์สีทองสาดส่อง)
const godRaysGroup = new THREE.Group();
const godRayTex = createGodRayTexture();
const godRayGeo = new THREE.PlaneGeometry(1.6, 7.8);
const godRays = [];

const rayAngles = [-0.18, -0.06, 0.06, 0.18];
const rayXOffsets = [-1.4, -0.5, 0.5, 1.4];

for (let i = 0; i < 4; i++) {
  const rMat = new THREE.MeshBasicMaterial({
    map: godRayTex,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const rayMesh = new THREE.Mesh(godRayGeo, rMat);
  rayMesh.position.set(rayXOffsets[i], 6.2, 0.9);
  rayMesh.rotation.z = rayAngles[i];
  rayMesh.userData = {
    baseOpacity: 0.18 + Math.random() * 0.08,
    speed: 0.7 + i * 0.25,
    phase: i * 1.5,
    baseRot: rayAngles[i]
  };
  godRaysGroup.add(rayMesh);
  godRays.push(rayMesh);
}
godRaysGroup.visible = false; // Disabled to eliminate background overlay shaking/flicker
scene.add(godRaysGroup);

// 3. Sacred Jade Willow Ambrosia Droplets (ละอองน้ำทิพย์แจกันหยก)
const jadeDropletsGroup = new THREE.Group();
const jadeGeo = new THREE.SphereGeometry(0.038, 6, 6);
const jadeDroplets = [];

for (let i = 0; i < 22; i++) {
  const isEmerald = Math.random() > 0.45;
  const jMat = new THREE.MeshBasicMaterial({
    color: isEmerald ? 0x6ee7b7 : 0xfde047,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const drop = new THREE.Mesh(jadeGeo, jMat);
  const ang = Math.random() * Math.PI * 2;
  const rad = 0.08 + Math.random() * 0.32;
  drop.position.set(
    Math.cos(ang) * rad,
    3.45 + Math.random() * 0.5,
    0.95 + Math.sin(ang) * rad
  );
  drop.userData = {
    angle: ang,
    radius: rad,
    spiralSpeed: (0.8 + Math.random() * 1.2) * (Math.random() > 0.5 ? 1 : -1),
    vy: 0.006 + Math.random() * 0.008,
    baseY: 3.40,
    maxHeight: 1.1 + Math.random() * 0.4,
    life: Math.random()
  };
  jadeDropletsGroup.add(drop);
  jadeDroplets.push(drop);
}
scene.add(jadeDropletsGroup);

// Divine Radiance Burst Trigger
let guanYinBurstIntensity = 0.0;
function triggerGuanYinDivineRadiance() {
  guanYinBurstIntensity = 1.0;
  altarGlow.intensity = 5.2;
  if (altarSoftLight) altarSoftLight.intensity = 3.2;
}

// Atmospheric Floating Temple Dust Particles (ละอองทองคำทิพย์ลอยวนตลอดเวลา - Optimized to 24 particles)
const templeDustGroup = new THREE.Group();
const dustGeo = new THREE.SphereGeometry(0.045, 6, 6);
const dustParticles = [];

for (let i = 0; i < 24; i++) {
  const dustMat = new THREE.MeshBasicMaterial({
    color: Math.random() > 0.35 ? 0xffea70 : 0xffffff,
    transparent: true,
    opacity: 0.35 + Math.random() * 0.45,
    blending: THREE.AdditiveBlending
  });
  const p = new THREE.Mesh(dustGeo, dustMat);
  p.position.set(
    (Math.random() - 0.5) * 14,
    0.5 + Math.random() * 9.5,
    -1 + Math.random() * 16
  );
  p.userData = {
    vy: 0.005 + Math.random() * 0.008,
    vx: (Math.random() - 0.5) * 0.003,
    vz: (Math.random() - 0.5) * 0.003,
    wobbleSpeed: 0.8 + Math.random() * 1.5,
    wobblePhase: Math.random() * Math.PI * 2,
    baseOpacity: dustMat.opacity
  };
  templeDustGroup.add(p);
  dustParticles.push(p);
}
scene.add(templeDustGroup);

// Golden Carpet Ripple Rings (วงคลื่นแสงสีทองแผ่ตอนกราบ)
const rippleRings = [];
const rippleGeo = new THREE.RingGeometry(0.12, 0.25, 32);

function createCarpetRipple(x, y, z, color = 0xffd700) {
  const rMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ring = new THREE.Mesh(rippleGeo, rMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y + 0.02, z);
  scene.add(ring);
  rippleRings.push({
    mesh: ring,
    scale: 0.25,
    opacity: 0.85,
    growSpeed: 0.07,
    fadeSpeed: 0.022
  });
}

// Character Divine Golden Aura Burst (ออร่าทองคำเรืองรองรอบตัวละคร)
let activeCharacterAura = null;
function triggerCharacterGoldenAura(targetGroup) {
  if (activeCharacterAura) {
    try { targetGroup.remove(activeCharacterAura); } catch (_) { }
    activeCharacterAura = null;
  }
  const auraGroup = new THREE.Group();
  const auraLight = new THREE.PointLight(0xffdf70, 2.6, 5.0);
  auraLight.position.set(0, 0.8, 0);
  auraGroup.add(auraLight);

  const auraRingGeo = new THREE.RingGeometry(0.4, 0.75, 32);
  const auraRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.60,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const auraRing = new THREE.Mesh(auraRingGeo, auraRingMat);
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.08;
  auraGroup.add(auraRing);

  targetGroup.add(auraGroup);
  activeCharacterAura = auraGroup;

  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed += 0.035;
    auraRing.rotation.z += 0.08;
    auraRing.scale.setScalar(1.0 + Math.sin(elapsed * 6) * 0.25);
    auraLight.intensity = Math.max(0, 2.6 * (1.0 - elapsed / 4.2));
    auraRingMat.opacity = Math.max(0, 0.60 * (1.0 - elapsed / 4.2));

    if (elapsed >= 4.2) {
      clearInterval(interval);
      try { targetGroup.remove(auraGroup); } catch (_) { }
      activeCharacterAura = null;
    }
  }, 20);
}

// Cached 512x512 Sacred 16-Petal Golden-Lotus Dharma Mandala Texture
let cachedLotusDecalTex = null;
function getLotusDecalTexture() {
  if (cachedLotusDecalTex) return cachedLotusDecalTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256, cy = 256;

  // Soft golden radial aura
  const bgGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 248);
  bgGrad.addColorStop(0.0, 'rgba(255, 250, 210, 0.95)');
  bgGrad.addColorStop(0.35, 'rgba(255, 200, 60, 0.65)');
  bgGrad.addColorStop(0.72, 'rgba(255, 130, 180, 0.28)');
  bgGrad.addColorStop(1.0, 'rgba(255, 180, 0, 0.0)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 248, 0, Math.PI * 2);
  ctx.fill();

  // Outer Filigree Dharma Rings
  ctx.strokeStyle = 'rgba(255, 232, 120, 0.92)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 224, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 195, 70, 0.75)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(cx, cy, 208, 0, Math.PI * 2);
  ctx.stroke();

  // 24 Golden Pearl Studs around Outer Rim
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const px = cx + Math.cos(a) * 216;
    const py = cy + Math.sin(a) * 216;
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(px, py, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 16 Outer Sacred Lotus Petals (Gold-Rimmed Rose & Amber Gradient)
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 16) * Math.PI * 2);

    const pGrad = ctx.createLinearGradient(0, -60, 0, -202);
    pGrad.addColorStop(0.0, 'rgba(255, 230, 110, 0.95)');
    pGrad.addColorStop(0.55, 'rgba(255, 135, 175, 0.88)');
    pGrad.addColorStop(1.0, 'rgba(255, 245, 200, 0.98)');

    ctx.fillStyle = pGrad;
    ctx.strokeStyle = '#ffea88';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.bezierCurveTo(36, -95, 42, -162, 0, -202);
    ctx.bezierCurveTo(-42, -162, -36, -95, 0, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central vein on each petal
    ctx.strokeStyle = 'rgba(255, 248, 210, 0.7)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -64);
    ctx.lineTo(0, -188);
    ctx.stroke();
    ctx.restore();
  }

  // 8 Inner Golden Vajra Lotus Petals
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((i + 0.5) / 8) * Math.PI * 2);

    const inGrad = ctx.createLinearGradient(0, -28, 0, -135);
    inGrad.addColorStop(0.0, 'rgba(255, 255, 220, 0.98)');
    inGrad.addColorStop(0.6, 'rgba(255, 195, 45, 0.92)');
    inGrad.addColorStop(1.0, 'rgba(255, 245, 170, 1.0)');

    ctx.fillStyle = inGrad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.bezierCurveTo(28, -62, 30, -108, 0, -138);
    ctx.bezierCurveTo(-30, -108, -28, -62, 0, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Center Seed Pod & Dharma Wheel Hub
  ctx.fillStyle = '#fff5b8';
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  cachedLotusDecalTex = new THREE.CanvasTexture(canvas);
  cachedLotusDecalTex.minFilter = THREE.LinearFilter;
  return cachedLotusDecalTex;
}

// Sacred Lotus Mandala Bloom Decal on Carpet Floor (บัวทิพย์พันกลีบผุดบานบนพรมแดงตอนกราบ)
function createLotusBloomDecal(x, y, z, color = 0xffd700) {
  const decalGroup = new THREE.Group();
  decalGroup.position.set(x, y + 0.018, z);

  const mandalaTex = getLotusDecalTexture();

  // Layer 1: Primary 16-Petal Sacred Lotus Mandala
  const outerPlaneGeo = new THREE.PlaneGeometry(1.38, 1.38);
  const outerPlaneMat = new THREE.MeshBasicMaterial({
    map: mandalaTex,
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const outerMandala = new THREE.Mesh(outerPlaneGeo, outerPlaneMat);
  outerMandala.rotation.x = -Math.PI / 2;
  decalGroup.add(outerMandala);

  // Layer 2: Counter-Rotating Inner Golden Dharma Lotus
  const innerPlaneGeo = new THREE.PlaneGeometry(0.88, 0.88);
  const innerPlaneMat = new THREE.MeshBasicMaterial({
    map: mandalaTex,
    color: 0xfff0aa,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const innerMandala = new THREE.Mesh(innerPlaneGeo, innerPlaneMat);
  innerMandala.rotation.x = -Math.PI / 2;
  innerMandala.position.y = 0.004;
  decalGroup.add(innerMandala);

  // Layer 3: 10 3D Cupped Lotus Petals Unfurling Outward
  const petalMat = new THREE.MeshBasicMaterial({
    color: 0xffb8d8,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const petalGeo = new THREE.SphereGeometry(0.095, 10, 8);
  const petals3D = [];
  for (let p = 0; p < 10; p++) {
    const ang = (p / 10) * Math.PI * 2;
    const pet = new THREE.Mesh(petalGeo, petalMat);
    pet.scale.set(0.62, 0.22, 1.55);
    pet.position.set(Math.cos(ang) * 0.28, 0.035, Math.sin(ang) * 0.28);
    pet.rotation.y = -ang + Math.PI / 2;
    pet.rotation.x = 0.32;
    decalGroup.add(pet);
    petals3D.push({ mesh: pet, ang });
  }

  // Layer 4: Rising Golden Halo Wave Ring
  const haloGeo = new THREE.RingGeometry(0.28, 0.36, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffe878,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const haloRing = new THREE.Mesh(haloGeo, haloMat);
  haloRing.rotation.x = -Math.PI / 2;
  haloRing.position.y = 0.02;
  decalGroup.add(haloRing);

  scene.add(decalGroup);

  let scale = 0.26;
  let op = 0.94;
  const decalInt = setInterval(() => {
    scale += 0.058;
    op -= 0.026;
    decalGroup.scale.set(scale, 1, scale);
    outerMandala.rotation.z += 0.028;
    innerMandala.rotation.z -= 0.042;
    haloRing.position.y += 0.014;
    haloRing.scale.setScalar(1 + (1 - op) * 0.65);

    for (const p of petals3D) {
      p.mesh.rotation.x = Math.max(0.05, p.mesh.rotation.x - 0.008);
    }

    outerPlaneMat.opacity = Math.max(0, op);
    innerPlaneMat.opacity = Math.max(0, op * 0.9);
    petalMat.opacity = Math.max(0, op * 0.8);
    haloMat.opacity = Math.max(0, op * 0.75);

    if (op <= 0.03) {
      clearInterval(decalInt);
      scene.remove(decalGroup);
    }
  }, 30);
}

// Ascending Divine Golden Blessing Sparks (ละอองดาวทองสวรรค์ลอยขึ้นตอนกราบ)
function spawnBlessingSparks(x, y, z, count = 14, color = 0xffe066) {
  const sparkGeo = new THREE.SphereGeometry(0.032, 6, 6);
  for (let i = 0; i < count; i++) {
    const sMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const s = new THREE.Mesh(sparkGeo, sMat);
    s.position.set(
      x + (Math.random() - 0.5) * 0.45,
      y + 0.08 + Math.random() * 0.22,
      z + (Math.random() - 0.5) * 0.45
    );
    scene.add(s);

    let life = 1.0;
    const sInt = setInterval(() => {
      life -= 0.032;
      s.position.y += 0.022 + Math.random() * 0.016;
      s.position.x += (Math.random() - 0.5) * 0.012;
      s.position.z += (Math.random() - 0.5) * 0.012;
      s.material.opacity = Math.max(0, life);

      if (life <= 0.03) {
        clearInterval(sInt);
        scene.remove(s);
      }
    }, 30);
  }
}

// ---------------------------------------------------------------------
// 3. Disciples Seated on Carpet (Animated Buddhist Congregation)
// ---------------------------------------------------------------------
const disciplesGroup = new THREE.Group();
scene.add(disciplesGroup);

const disciplesMap = new Map(); // seatId -> disciple state object

// ── 3D Stylized Anime Humanoid System ──────────────────────────────────
// Authentic Japanese Anime 3D aesthetics with PBR Cel-Shading
// 3 Canonical uniform types: Monk, Layman, Laywoman

// ── 3D Stylized Anime Chibi Congregation System (ตรงตามรูปต้นฉบับ 100%) ──
// 6 Authentic Chibi Devotee Archetypes matching Reference Live Stream:
// 1. female_buns: Twin hair buns with gold pins + warm gold/orange Thai sabai
// 2. female_long: Long cascading black hair + jasmine garland + ruby red Thai sabai
// 3. female_ponytail: High ponytail with gold band + emerald jade Thai sabai
// 4. elder_grandpa: Bald crown + silver/white hair ring + pristine white merit polo shirt
// 5. male_short: Neat modern dark haircut + crisp white merit shirt + slate trousers
// 6. monk: Shaved head with sacred Unalome + radiant saffron Buddhist robe & sanghati

// ---------------------------------------------------------------------
// 2. 2D Authentic Chibi Devotee Sprite System (ตรงตามสตรีมต้นฉบับ 100%)
// ---------------------------------------------------------------------
const devoteeTypes = [
  'female_buns',
  'female_long',
  'male_short',
  'elder_grandpa',
  'monk',
  // colour variants (blue / pink / green Thai sabai) for a lively, varied crowd
  'female_buns_blue',
  'female_buns_pink',
  'female_long_blue',
  'female_long_green'
];

// Weighted crowd mix: mostly lay people, a few elders, only a couple of monks (like the reference)
const devoteeMixPool = [
  'female_buns', 'female_long_blue', 'male_short', 'elder_grandpa', 'female_long', 'female_buns_pink',
  'male_short', 'female_buns_blue', 'female_long_green', 'male_short', 'female_buns', 'elder_grandpa',
  'female_long', 'female_buns_blue', 'male_short', 'monk', 'female_long_blue', 'female_buns_pink'
];
function crowdTypeForSeat(i) { return devoteeMixPool[(i * 7 + 2) % devoteeMixPool.length]; }

function normalizeDevoteeType(typeKey) {
  if (!typeKey) return 'female_buns';
  if (typeKey === 'laywoman' || typeKey === 'female_ponytail') return 'female_buns';
  if (typeKey === 'layman') return 'male_short';
  if (devoteeTypes.includes(typeKey)) return typeKey;
  return 'female_buns';
}

const defaultPrayerWishes = [
  'ขอให้สมหวังทุกประการ ✨',
  'ขอให้รวยๆ ปลดหนี้ มีโชคลาภ 💰',
  'ขอให้สุขภาพแข็งแรง ปราศจากโรคภัย 🌿',
  'ขอให้การงานราบรื่น ก้าวหน้า 💼',
  'ขอให้เรียนจบสำเร็จ ได้เกรดดี 📚',
  'ขอให้พบเจอแต่คนดี กัลยาณมิตร 💖',
  'สาธุ สมปรารถนา 🙏',
  'ขอให้ครอบครัวร่มเย็นเป็นสุข 🌸'
];

// Exact aspect ratios measured directly from high-detail transparent PNG sprite files:
const spriteRatios = {
  elder_grandpa: { walk: 0.418, kneel: 0.686, kowtow: 0.986 },
  female_buns: { walk: 0.464, kneel: 0.792, kowtow: 1.126 },
  female_long: { walk: 0.514, kneel: 0.588, kowtow: 0.846 },
  male_short: { walk: 0.371, kneel: 0.538, kowtow: 0.774 },
  monk: { walk: 0.450, kneel: 0.682, kowtow: 0.980 },
  female_buns_blue: { walk: 0.464, kneel: 0.792, kowtow: 1.126 },
  female_buns_pink: { walk: 0.464, kneel: 0.792, kowtow: 1.126 },
  female_long_blue: { walk: 0.514, kneel: 0.588, kowtow: 0.846 },
  female_long_green: { walk: 0.514, kneel: 0.588, kowtow: 0.846 }
};

// Chibi crowd at 78% scale — clearly visible on 9:16 TikTok live stream
const CHIBI_SCALE = 0.78;
const POSE_H = { walk: 0.98, kneel: 0.80, kowtow: 0.56 };

// Preload all 2D transparent PNG textures
const spriteTextures = {};
const texLoader = new THREE.TextureLoader();
devoteeTypes.forEach(type => {
  spriteTextures[type] = {};
  ['walk', 'kneel', 'kowtow'].forEach(pose => {
    const tex = texLoader.load(`sprites/${type}_${pose}.png?v=hd40`);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    spriteTextures[type][pose] = tex;
  });
});

// Soft Oval Floor Drop Shadow Texture (Clean polished floor, ZERO brass cushion plates!)
function buildShadowTex() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 32, 2, 64, 32, 60);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  g.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(64, 32, 58, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}
const globalShadowTex = buildShadowTex();

// Personal Sacred Aura
const AURA_PALETTES = {
  female_buns: { a: 'rgba(255,185,80,0.76)', b: 'rgba(255,130,0,0)' },
  female_long: { a: 'rgba(255,120,160,0.76)', b: 'rgba(255,60,100,0)' },
  male_short: { a: 'rgba(210,235,255,0.72)', b: 'rgba(120,160,255,0)' },
  elder_grandpa: { a: 'rgba(240,240,255,0.75)', b: 'rgba(160,180,220,0)' },
  monk: { a: 'rgba(255,228,80,0.80)', b: 'rgba(255,160,0,0)' },
  female_buns_blue: { a: 'rgba(120,190,255,0.76)', b: 'rgba(60,120,255,0)' },
  female_buns_pink: { a: 'rgba(255,140,200,0.76)', b: 'rgba(255,60,160,0)' },
  female_long_blue: { a: 'rgba(120,190,255,0.76)', b: 'rgba(60,120,255,0)' },
  female_long_green: { a: 'rgba(150,235,170,0.76)', b: 'rgba(60,200,110,0)' }
};

const auraTexCache = {};
function buildAuraTex(typeKey) {
  const normKey = normalizeDevoteeType(typeKey);
  if (auraTexCache[normKey]) return auraTexCache[normKey];
  const c = document.createElement('canvas');
  c.width = 192; c.height = 192;
  const ctx = c.getContext('2d');
  const pal = AURA_PALETTES[normKey] || AURA_PALETTES.female_buns;
  const g = ctx.createRadialGradient(96, 96, 10, 96, 96, 92);
  g.addColorStop(0, pal.a);
  g.addColorStop(0.5, pal.a.replace(/[\d.]+\)$/, '0.3)'));
  g.addColorStop(1, pal.b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 192, 192);
  return (auraTexCache[normKey] = new THREE.CanvasTexture(c));
}

// ---------------------------------------------------------------------
// 3. Create Authentic 2D Devotee Billboard Instance
// ---------------------------------------------------------------------
function createDiscipleModel(seatIndex = 0, chosenType = null, isStanding = false, isVip = false) {
  const discipleRoot = new THREE.Group();
  const typeKey = normalizeDevoteeType(chosenType || crowdTypeForSeat(seatIndex));
  const initialPose = isStanding ? 'walk' : 'kneel';
  const ratios = spriteRatios[typeKey] || spriteRatios.female_buns;
  const ratio = ratios[initialPose];

  const baseH = (isStanding ? POSE_H.walk : POSE_H.kneel) * CHIBI_SCALE;
  const baseW = baseH * ratio;

  // 1. Soft Oval Drop Shadow on Clean Teak Floor (NO brass plates!)
  const shadowMat = new THREE.SpriteMaterial({
    map: globalShadowTex,
    transparent: true,
    opacity: isVip ? 0.62 : 0.46,
    depthWrite: false
  });
  const shadowSprite = new THREE.Sprite(shadowMat);
  shadowSprite.scale.set(baseW * 1.30, 0.22 * CHIBI_SCALE, 1);
  shadowSprite.position.set(0, 0.01, 0);
  discipleRoot.add(shadowSprite);

  // 2. Personal Holy Aura
  const auraMat = new THREE.SpriteMaterial({
    map: buildAuraTex(typeKey),
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: isVip ? 0.35 : 0.18,
    depthWrite: false
  });
  const auraSprite = new THREE.Sprite(auraMat);
  auraSprite.scale.set(baseH * 1.5, baseH * 1.5, 1);
  auraSprite.position.set(0, baseH * 0.52, -0.05);
  discipleRoot.add(auraSprite);

  // 3. Event Holy Aura Burst
  const eventAuraMat = new THREE.SpriteMaterial({
    map: buildAuraTex(typeKey),
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    depthWrite: false
  });
  const eventAuraSprite = new THREE.Sprite(eventAuraMat);
  eventAuraSprite.scale.set(baseH * 2.1, baseH * 2.1, 1);
  eventAuraSprite.position.set(0, baseH * 0.55, -0.08);
  discipleRoot.add(eventAuraSprite);

  // 4. Authentic 2D Chibi Devotee Billboard Sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: spriteTextures[typeKey][initialPose],
    transparent: true,
    depthWrite: false,
    toneMapped: false   // keep authored colours: deep black hair, vivid sabai (no washed-out grey)
  });
  const charSprite = new THREE.Sprite(spriteMat);
  charSprite.center.set(0.5, 0.0); // Anchor at base of feet!
  charSprite.scale.set(baseW, baseH, 1);
  charSprite.position.set(0, 0.05, 0);
  discipleRoot.add(charSprite);

  return {
    root: discipleRoot,
    charSprite,
    shadowSprite,
    auraSprite,
    eventAuraSprite,
    typeKey,
    currentPose: initialPose,
    baseH,
    baseW,
    isStanding,
    setPose(pose) {
      this.currentPose = pose;
      const r = (spriteRatios[this.typeKey] || spriteRatios.female_buns)[pose] || 0.45;
      const newH = (POSE_H[pose] || POSE_H.kneel) * CHIBI_SCALE;
      const newW = newH * r;
      this.baseH = newH;
      this.baseW = newW;
      this.charSprite.material.map = spriteTextures[this.typeKey][pose];
      this.charSprite.material.needsUpdate = true;
      this.charSprite.scale.set(newW, newH, 1);
      this.shadowSprite.scale.set(newW * 1.30, 0.22 * CHIBI_SCALE, 1);
      this.auraSprite.position.y = newH * 0.52;
    }
  };
}
function d_h(d) { return (d && d.baseH) ? d.baseH : 0.5; }
// ── Viewer Profile Avatar Image Cache (CORS-Safe for WebGL CanvasTexture) ──
const avatarImageCache = new Map();

function getOrCreateAvatarImage(avatarUrl, onLoaded) {
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return null;
  }
  const isHttp = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');
  const isLocalOrData = avatarUrl.startsWith('/') || avatarUrl.startsWith('data:');
  if (!isHttp && !isLocalOrData) {
    return null;
  }
  // Filter out any known invalid placeholder avatar URLs
  if (avatarUrl.includes('tos-maliva-avt-0068/7311181283626287110')) {
    return null;
  }

  if (avatarImageCache.has(avatarUrl)) {
    const entry = avatarImageCache.get(avatarUrl);
    if (entry.loaded && entry.img) return entry.img;
    if (onLoaded && entry.callbacks) entry.callbacks.push(onLoaded);
    return null;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  const entry = { img, loaded: false, callbacks: onLoaded ? [onLoaded] : [] };
  avatarImageCache.set(avatarUrl, entry);

  img.onload = () => {
    entry.loaded = true;
    entry.callbacks.forEach(cb => {
      try { cb(img); } catch (_) { }
    });
    entry.callbacks = [];
  };

  img.onerror = () => {
    entry.loaded = false;
    entry.callbacks = [];
  };

  // Route external URLs through /api/avatar-proxy for clean CORS headers in Three.js WebGL canvas textures
  img.src = isHttp ? `/api/avatar-proxy?url=${encodeURIComponent(avatarUrl)}` : avatarUrl;
  return null;
}

function createNameplateSprite(nickname, isVip = false, z = 5.0, isOuterRow = false, avatar = null) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const cleanName = sanitizeDisplayName(nickname, isVip ? 'ผู้มีจิตศรัทธา' : 'ผู้เจริญสติ');

  // Enlarged Standardized Geometry: Prominent, perfectly balanced nameplate without gold borders
  const canvasWidth = 320;
  const canvasHeight = 84;
  const rx = 4, ry = 4;
  const rw = canvasWidth - 8; // 312px
  const rh = canvasHeight - 8; // 76px
  const radius = rh / 2; // 38px pill corner radius

  // Circular avatar on left
  const avatarDiameter = 64;
  const avatarRadius = avatarDiameter / 2; // 32px
  const avatarCx = rx + 6 + avatarRadius; // 42px
  const avatarCy = ry + rh / 2; // 42px

  // Text layout: starts to the right of avatar with a clean gap
  const textX = avatarCx + avatarRadius + 12; // 86px
  const maxTextW = canvasWidth - textX - 16; // 218px

  const fontSize = 36;
  const fontStyle = `700 ${fontSize}px "Kanit", "Sarabun", "Segoe UI", sans-serif`;
  ctx.font = fontStyle;

  // Fit the name within maxTextW with ellipsis
  const chars = Array.from(cleanName);
  let displayName = cleanName;
  if (ctx.measureText(displayName).width > maxTextW) {
    let n = chars.length;
    while (n > 1 && ctx.measureText(chars.slice(0, n).join('') + '…').width > maxTextW) n--;
    displayName = chars.slice(0, n).join('') + '…';
  }
  const label = isVip ? `👑 ${displayName}` : displayName;

  // 2x supersampled canvas for razor-sharp text
  const SS = 2;
  canvas.width = canvasWidth * SS;
  canvas.height = canvasHeight * SS;
  ctx.setTransform(SS, 0, 0, SS, 0, 0);

  // Texture creation
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  function renderPill(avatarImg = null) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Background: Clean, elegant translucent soft glass pill (ไร้กรอบสีทอง)
    const bgGrad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    bgGrad.addColorStop(0, 'rgba(14, 7, 4, 0.40)');
    bgGrad.addColorStop(1, 'rgba(24, 10, 6, 0.40)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, radius);
    ctx.fill();

    // 2. Circular Profile Avatar on Left
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCx, avatarCy, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
      ctx.drawImage(avatarImg, avatarCx - avatarRadius, avatarCy - avatarRadius, avatarDiameter, avatarDiameter);
    } else {
      const colorPalettes = [
        ['#0d9488', '#0f766e'], // Teal Jade
        ['#059669', '#047857'], // Emerald
        ['#2563eb', '#1d4ed8'], // Royal Blue
        ['#7c3aed', '#6d28d9'], // Lotus Purple
        ['#d97706', '#b45309'], // Saffron Amber
        ['#e11d48', '#be123c'], // Rose Ruby
        ['#475569', '#334155'], // Slate
        ['#ca8a04', '#a16207']  // Golden
      ];
      let hash = 0;
      for (let i = 0; i < cleanName.length; i++) hash = (hash * 31 + cleanName.charCodeAt(i)) & 0xffff;
      const palette = colorPalettes[Math.abs(hash) % colorPalettes.length];

      const avGrad = ctx.createRadialGradient(avatarCx, avatarCy, 4, avatarCx, avatarCy, avatarRadius);
      if (isVip) {
        avGrad.addColorStop(0, '#ffea79');
        avGrad.addColorStop(0.7, '#d4af37');
        avGrad.addColorStop(1, '#8b6508');
      } else {
        avGrad.addColorStop(0, palette[0]);
        avGrad.addColorStop(1, palette[1]);
      }
      ctx.fillStyle = avGrad;
      ctx.fill();

      // Stylized Initial Character / Icon
      ctx.font = `700 ${isVip ? 30 : 28}px "Kanit", "Sarabun", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isVip ? '#2a0e06' : '#ffffff';
      const initialChar = isVip ? '👑' : (cleanName.charAt(0) || '🙏');
      ctx.fillText(initialChar, avatarCx, avatarCy + 1);
    }
    ctx.restore();

    // 3. Razor-Sharp Typography on Right (ข้อความสีขาว 100% พร้อมเงาคมชัด Contrast สูง ไม่ใช้กรอบทอง)
    ctx.save();
    ctx.font = fontStyle;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = '#ffffff'; // Pure white text as requested
    ctx.fillText(label, textX, avatarCy);
    ctx.restore();
  }

  // Initial render (uses cached avatar if already available, else fallback)
  const cachedImg = getOrCreateAvatarImage(avatar, (loadedImg) => {
    renderPill(loadedImg);
    texture.needsUpdate = true;
  });
  renderPill(cachedImg);

  // 4. Three.js Sprite Setup: Standardized Uniform World-Space Scaling (Enlarged Proportional Scale)
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.center.set(0.5, 0.0);

  const safeZ = (z !== undefined && z !== null) ? Number(z) : 5.0;
  sprite.renderOrder = 95000 + Math.round(safeZ * 1000);

  // Prominently enlarged scale: ~38% larger for clear readability across mobile & live stream
  const baseSpriteH = isVip ? 0.188 : 0.172;
  const spriteW = baseSpriteH * (canvasWidth / canvasHeight);
  sprite.scale.set(spriteW, baseSpriteH, 1);
  sprite.position.set(0, 0.50, 0);

  sprite.userData = {
    baseScale: { x: spriteW, y: baseSpriteH },
    z: safeZ,
    isOuterRow
  };

  return sprite;
}

// ── Floating 3D Dialogue Speech Bubble (กรอบข้อความหัวตัวละคร คมชัดระดับ High-DPI พื้นหลังขาวหรูหรา ขอบทอง ป้ายชื่อทับทิม ตัวหนังสือคมชัด) ────────
function createPrayerSpeechBubble(name, wish) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const cleanName = (typeof name === 'string' && name.trim()) ? name.trim() : '';
  const actualWish = (typeof wish === 'string' && wish.trim())
    ? wish.trim()
    : 'ขอให้สมหวังทุกประการ 🙏';
  const cleanWish = actualWish || 'ขอให้สมหวังทุกประการ 🙏';

  const fontSize = 32;
  const fontStyle = `700 ${fontSize}px "Kanit", "Sarabun", "Segoe UI", sans-serif`;
  ctx.font = fontStyle;

  // Wrap text into 1 or 2 compact lines based on actual measured width
  const MAX_LINE_W = 420;
  let lines = [];
  if (ctx.measureText(cleanWish).width <= MAX_LINE_W) {
    lines = [cleanWish];
  } else {
    let line1 = '';
    let line2 = '';
    const words = cleanWish.split(' ');
    if (words.length > 1) {
      for (let i = 0; i < words.length; i++) {
        const test = (line1 ? line1 + ' ' : '') + words[i];
        if (ctx.measureText(test).width <= MAX_LINE_W || !line1) {
          line1 = test;
        } else {
          line2 = words.slice(i).join(' ');
          break;
        }
      }
    }
    if (!line1 || !line2) {
      const chars = Array.from(cleanWish);
      let splitIdx = Math.ceil(chars.length / 2);
      while (splitIdx > 1 && ctx.measureText(chars.slice(0, splitIdx).join('')).width > MAX_LINE_W) {
        splitIdx--;
      }
      line1 = chars.slice(0, splitIdx).join('');
      line2 = chars.slice(splitIdx).join('');
    }
    const l2Chars = Array.from(line2);
    if (ctx.measureText(line2).width > MAX_LINE_W) {
      let n = l2Chars.length;
      while (n > 1 && ctx.measureText(l2Chars.slice(0, n).join('') + '…').width > MAX_LINE_W) n--;
      line2 = l2Chars.slice(0, n).join('') + '…';
    }
    lines = [line1, line2];
  }

  // Header tag pill: "🙏 คุณ [name]" or "🙏 สวดมนต์ขอพร"
  const headerFont = '700 20px "Kanit", "Sarabun", sans-serif';
  ctx.font = headerFont;
  const headerText = cleanName ? `🙏 คุณ ${cleanName}` : '🙏 สวดมนต์ขอพร';
  const headerW = ctx.measureText(headerText).width + 26;

  ctx.font = fontStyle;
  const measuredMaxW = Math.max(headerW, ...lines.map(l => Math.ceil(ctx.measureText(l).width || 120)));
  const padX = 22;
  const padY = 16;
  const lineHeight = 42;
  const bx = 10;
  const by = 18; // Room for top header pill overflow
  const bw = Math.max(190, Math.min(480, measuredMaxW + padX * 2));
  const bh = lines.length === 1 ? 72 : (padY * 2 + lines.length * lineHeight - 4);
  const br = 20;
  const tailH = 14;
  const tailHalfW = 12;

  const canvasWidth = bw + bx * 2;
  const canvasHeight = bh + by + tailH + 6;
  const cx = canvasWidth / 2;

  // 2x supersampled canvas for razor-sharp high-DPI clarity
  const SS = 2;
  canvas.width = canvasWidth * SS;
  canvas.height = canvasHeight * SS;
  ctx.setTransform(SS, 0, 0, SS, 0, 0);

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Clean Modern Borderless Card Body + Pointer Tail (นำกรอบสีทองออกตามคำขอ)
  const r = Math.min(br, bw / 2, bh / 2);
  const bRight = bx + bw;
  const bBottom = by + bh;

  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bRight - r, by);
  ctx.quadraticCurveTo(bRight, by, bRight, by + r);
  ctx.lineTo(bRight, bBottom - r);
  ctx.quadraticCurveTo(bRight, bBottom, bRight - r, bBottom);
  ctx.lineTo(cx + tailHalfW, bBottom);
  ctx.lineTo(cx, bBottom + tailH);
  ctx.lineTo(cx - tailHalfW, bBottom);
  ctx.lineTo(bx + r, bBottom);
  ctx.quadraticCurveTo(bx, bBottom, bx, bBottom - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();

  // Dark Translucent Glass Body (ไร้กรอบสีทอง สะอาดตา คมชัด)
  const cardGrad = ctx.createLinearGradient(bx, by, bx, bBottom);
  cardGrad.addColorStop(0.0, 'rgba(18, 9, 6, 0.75)');
  cardGrad.addColorStop(0.85, 'rgba(28, 12, 8, 0.75)');
  cardGrad.addColorStop(1.0, 'rgba(14, 6, 4, 0.75)');
  ctx.fillStyle = cardGrad;
  ctx.fill();

  // 2. Ruby Red Header Pill at Top (Borderless)
  const pillW = Math.min(bw - 20, headerW);
  const pillH = 22;
  const pillX = cx - pillW / 2;
  const pillY = by - pillH / 2;
  const pillR = pillH / 2;

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
  } else {
    ctx.rect(pillX, pillY, pillW, pillH);
  }
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
  pillGrad.addColorStop(0.0, 'rgba(219, 39, 119, 0.85)');
  pillGrad.addColorStop(1.0, 'rgba(157, 23, 77, 0.85)');
  ctx.fillStyle = pillGrad;
  ctx.fill();

  ctx.font = headerFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(headerText, cx, pillY + pillH / 2 + 1);
  ctx.restore();

  // 5. Razor-Sharp Crisp White Typography with Drop Shadow for Maximum Contrast
  ctx.save();
  ctx.font = fontStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffffff';

  if (lines.length === 1) {
    ctx.fillText(lines[0], cx, by + bh / 2 + 5);
  } else {
    const startY = by + bh / 2 - (lineHeight * 0.42) + 5;
    ctx.fillText(lines[0], cx, startY);
    ctx.fillText(lines[1], cx, startY + lineHeight);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 140000;
  sprite.center.set(0.5, 0.0);

  // Scaled for comfortable viewing in 9:16 layout
  const baseScaleY = lines.length === 1 ? 0.32 : 0.42;
  const baseScaleX = baseScaleY * (canvasWidth / canvasHeight);
  sprite.scale.set(baseScaleX, baseScaleY, 1);
  sprite.userData = {
    baseScale: { x: baseScaleX, y: baseScaleY }
  };
  sprite.isSpeechBubble = true;
  return sprite;
}

// Central Mapping of authentic TikTok gifts to visual PNG assets from e:\Buddha\ของขวัญ\
const GIFT_TIER_IMAGES = {
  dragon: '/dragon.png',
  castle: '/portal.png',
  fireworks: '/four_hearts.png',
  royal_carriage: '/donut.png',
  crystal_fountain: '/cologne.png',
  golden_bell: '/garland.png',
  flowers: '/rose_99.png',
  lotus: '/lucky_9.png',
  incense: '/omamori.png',
  seamsi: '/seamsi.png',
  kowtow: '/rose.png'
};

function getGiftImageUrl(giftName, coins = 1, effectType = '') {
  if (effectType && GIFT_TIER_IMAGES[effectType]) return GIFT_TIER_IMAGES[effectType];
  const name = String(giftName || '').toLowerCase().trim();
  if (name.includes('รักนะมากๆ') || name.includes('รักนะมาก ๆ') || name.includes('รักนะ') || name.includes('กอดหัวใจ') || name.includes('love you') || name.includes('heart hug') || name.includes('hug heart') || name.includes('hug') || name.includes('เซียมซี') || name.includes('ซองเขียว') || name.includes('ซองมงคล') || name.includes('hari raya') || name.includes('selamat') || name.includes('aidilfitri') || name.includes('sampul') || name.includes('envelope') || name.includes('seamsi') || name.includes('siamsi')) return '/seamsi.png';
  if (name.includes('มังกร') || name.includes('dragon') || name.includes('alebrije') || coins >= 299) return '/dragon.png';
  if (name.includes('ประตู') || name.includes('portal') || name.includes('gate') || name.includes('วิมาน') || coins >= 100) return '/portal.png';
  if (name.includes('หัวใจ') || name.includes('heart') || name.includes('พลุ') || coins >= 99) return '/four_hearts.png';
  if (name.includes('โดนัท') || name.includes('donut') || name.includes('doughnut') || name.includes('ราชรถ') || coins >= 30) return '/donut.png';
  if (name.includes('โคโลญจน์') || name.includes('cologne') || name.includes('น้ำหอม') || name.includes('น้ำพุ') || coins >= 20) return '/cologne.png';
  if (name.includes('พวงมาลัย') || name.includes('garland') || name.includes('ระฆัง') || coins >= 15) return '/garland.png';
  if (name.includes('กุหลาบ ๙๙') || name.includes('กุหลาบ99') || name.includes('rose 99') || name.includes('rose99') || name.includes('บุปผา') || (name.includes('กุหลาบ') && coins >= 10) || coins >= 10) return '/rose_99.png';
  if (name.includes('lucky') || name.includes('9') || name.includes('บัว') || name.includes('lotus') || coins >= 9) return '/lucky_9.png';
  if (name.includes('เครื่องราง') || name.includes('omamori') || name.includes('amulet') || name.includes('ธูป') || name.includes('ประทีป') || coins >= 5) return '/omamori.png';
  return '/rose.png';
}

const giftImageCache = new Map();
function getOrCreateGiftImage(src, onLoaded = null) {
  if (!src) return null;
  if (giftImageCache.has(src)) {
    const cached = giftImageCache.get(src);
    // If image is still loading and a new callback is provided, attach it safely.
    // NEVER call onLoaded synchronously if already complete (prevents infinite call-stack recursion)
    if (!cached.complete && onLoaded) {
      const prevOnload = cached.onload;
      cached.onload = () => {
        if (typeof prevOnload === 'function') prevOnload();
        onLoaded(cached);
      };
    }
    return cached;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  if (onLoaded) {
    img.onload = () => {
      onLoaded(img);
    };
  }
  img.src = src;
  giftImageCache.set(src, img);
  return img;
}

// ── Floating Gift Badge (ป้ายของขวัญลอยตัว วิจิตรตระการตา สีทองคำแท้ & มุกทับทิมหลวง) ────────
// ── Floating Gift Badge (ป้ายของขวัญลอยตัว วิจิตรตระการตา สีทองคำแท้ 24K & กระจกแก้วทับทิมหลวง) ────────
function updateFloatingGiftBadge(sprite, icon = '🌹', giftName = 'กุหลาบ', count = 1, image = null) {
  if (!sprite || !sprite.userData || !sprite.userData.canvas) return;
  const { canvas, ctx, tex } = sprite.userData;

  const W = 440;
  const H = 124;
  ctx.clearRect(0, 0, W, H);

  const bx = 16, by = 14, bw = 408, bh = 96, br = 48;

  // 1. Ethereal Soft Celestial Golden Lotus Aura (ไร้ขอบดำและขอบกล่องทึบ 100%)
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx - 6, by - 6, bw + 12, bh + 12, br + 6);
  } else {
    ctx.rect(bx - 6, by - 6, bw + 12, bh + 12);
  }
  const auraGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
  auraGrad.addColorStop(0.0, 'rgba(255, 240, 150, 0.42)');
  auraGrad.addColorStop(0.45, 'rgba(255, 195, 60, 0.24)');
  auraGrad.addColorStop(1.0, 'rgba(255, 140, 20, 0.0)');
  ctx.fillStyle = auraGrad;
  ctx.fill();
  ctx.restore();

  // 2. Radiant Imperial Lotus Crimson & Velvet Glassmorphic Body (สวยงาม เข้ากับธีมศาลเจ้าแม่กวนอิม)
  ctx.save();
  ctx.shadowColor = 'rgba(255, 215, 0, 0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 1;
  const bodyGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
  bodyGrad.addColorStop(0.0, 'rgba(152, 20, 52, 0.65)');   // Radiant Imperial Lotus Crimson
  bodyGrad.addColorStop(0.48, 'rgba(102, 12, 36, 0.58)');  // Velvet Burgundy Rose
  bodyGrad.addColorStop(1.0, 'rgba(50, 6, 20, 0.68)');    // Deep Lotus Plum Wine
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, bw, bh, br);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.fill();
  ctx.restore();

  // 3. Top Specular Crystal Glass Sheen & Diagonal Highlight (แสงเงากระจกคริสตัลเงาวาว)
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, bw, bh, br);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.clip();

  // Curved upper sheen
  const sheenGrad = ctx.createLinearGradient(bx, by, bx, by + bh * 0.52);
  sheenGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.42)');
  sheenGrad.addColorStop(0.28, 'rgba(255, 245, 210, 0.22)');
  sheenGrad.addColorStop(0.70, 'rgba(255, 235, 190, 0.05)');
  sheenGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sheenGrad;
  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by + 6, bw * 0.49, bh * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fine diagonal light sweep across the glass
  const sweepGrad = ctx.createLinearGradient(bx + 40, by, bx + 180, by + bh);
  sweepGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  sweepGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0.08)');
  sweepGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.26)');
  sweepGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.08)');
  sweepGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();

  // 4. Triple 24K Gold Filigree Bevel Border (ขอบทองคำแท้ 3 มิติ ลายฉลุวิจิตร)
  const goldBorder = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  goldBorder.addColorStop(0.0, '#ffffff');
  goldBorder.addColorStop(0.18, '#fff6b3');
  goldBorder.addColorStop(0.35, '#ffd700');
  goldBorder.addColorStop(0.60, '#d4af37');
  goldBorder.addColorStop(0.82, '#fff4a3');
  goldBorder.addColorStop(1.0, '#8c6708');

  // Outer 24K Gold Bevel
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = goldBorder;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, bw, bh, br);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.stroke();

  // Inner warm gold hairline with champagne tone (ไร้ขอบดำทึบ)
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = 'rgba(255, 248, 195, 0.50)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx + 2.2, by + 2.2, bw - 4.4, bh - 4.4, br - 2.2);
  } else {
    ctx.rect(bx + 2.2, by + 2.2, bw - 4.4, bh - 4.4);
  }
  ctx.stroke();

  // 5. Sacred Reliquary Medal Pedestal on Left (เหรียญตราทองคำประดิษฐานของขวัญ)
  const medalCx = 64;
  const medalCy = 62;
  const medalRad = 36;

  // Sunburst radiant glow behind emblem
  const sunburst = ctx.createRadialGradient(medalCx, medalCy, 6, medalCx, medalCy, medalRad + 10);
  sunburst.addColorStop(0.0, 'rgba(255, 245, 160, 0.75)');
  sunburst.addColorStop(0.55, 'rgba(255, 195, 55, 0.32)');
  sunburst.addColorStop(1.0, 'rgba(255, 150, 0, 0.0)');
  ctx.fillStyle = sunburst;
  ctx.beginPath();
  ctx.arc(medalCx, medalCy, medalRad + 10, 0, Math.PI * 2);
  ctx.fill();

  // Outer gold embossed ring
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = goldBorder;
  ctx.beginPath();
  ctx.arc(medalCx, medalCy, medalRad, 0, Math.PI * 2);
  ctx.stroke();

  // Jewel ruby medallion base (ไร้สีดำทึบ สีทับทิมดอกบัวสว่างสง่างาม)
  const medalBase = ctx.createRadialGradient(medalCx, medalCy, 3, medalCx, medalCy, medalRad - 2);
  medalBase.addColorStop(0.0, '#c21844');
  medalBase.addColorStop(0.65, '#880e2a');
  medalBase.addColorStop(1.0, '#4a0614');
  ctx.fillStyle = medalBase;
  ctx.beginPath();
  ctx.arc(medalCx, medalCy, medalRad - 2, 0, Math.PI * 2);
  ctx.fill();

  // Inner gold beaded ring
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = 'rgba(255, 248, 190, 0.75)';
  ctx.beginPath();
  ctx.arc(medalCx, medalCy, medalRad - 4.5, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Draw Gift Image or Fallback Icon
  const giftImgUrl = image || getGiftImageUrl(giftName, 1);
  const giftImg = getOrCreateGiftImage(giftImgUrl, () => {
    if (sprite.userData && sprite.userData.canvas && sprite.userData._lastDrawnImg !== giftImgUrl) {
      updateFloatingGiftBadge(sprite, icon, giftName, count, giftImgUrl);
    }
  });

  if (giftImg && giftImg.complete && giftImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(medalCx, medalCy, medalRad - 5.5, 0, Math.PI * 2);
    ctx.clip();
    try {
      ctx.drawImage(giftImg, medalCx - 31, medalCy - 31, 62, 62);
      sprite.userData._lastDrawnImg = giftImgUrl;
    } catch (_) { }
    ctx.restore();
  } else {
    ctx.save();
    ctx.font = '38px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(icon || '🌹', medalCx, medalCy + 2);
    ctx.restore();
  }

  // 7. Auspicious Royal Typography (ริบบิ้นหัวข้อถวายสักการะมงคล & ชื่อของขวัญ)
  // Header Ribbon Pill: ✨ ถวายสักการะมงคล ✨
  const pillHeaderX = 114;
  const pillHeaderY = 24;
  const pillHeaderW = 142;
  const pillHeaderH = 21;
  const pillHeaderR = 10.5;

  ctx.save();
  ctx.fillStyle = 'rgba(60, 10, 24, 0.62)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(pillHeaderX, pillHeaderY, pillHeaderW, pillHeaderH, pillHeaderR);
  } else {
    ctx.rect(pillHeaderX, pillHeaderY, pillHeaderW, pillHeaderH);
  }
  ctx.fill();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = 'rgba(255, 220, 80, 0.85)';
  ctx.stroke();

  ctx.font = '800 12.5px "Kanit", "Sarabun", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff299';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 3;
  ctx.fillText('✨ ถวายสักการะมงคล ✨', pillHeaderX + pillHeaderW / 2, pillHeaderY + pillHeaderH / 2 + 0.5);
  ctx.restore();

  // Main Gift Name
  ctx.save();
  ctx.font = '800 25px "Kanit", "Sarabun", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let displayGiftName = giftName || 'ดอกกุหลาบ';
  if (displayGiftName.length > 9) displayGiftName = displayGiftName.slice(0, 8) + '…';

  // Dual-Stroke 3D Lettering
  ctx.lineWidth = 3.8;
  ctx.strokeStyle = 'rgba(18, 2, 8, 0.95)';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.55)';
  ctx.shadowBlur = 8;
  ctx.strokeText(displayGiftName, 116, 75);

  const textGrad = ctx.createLinearGradient(116, 60, 116, 88);
  textGrad.addColorStop(0.0, '#ffffff');
  textGrad.addColorStop(0.48, '#fffbe0');
  textGrad.addColorStop(0.80, '#ffe885');
  textGrad.addColorStop(1.0, '#ffd54f');
  ctx.fillStyle = textGrad;
  ctx.fillText(displayGiftName, 116, 75);
  ctx.restore();

  // 8. Dynamic Golden Sunset / Ruby Flame Combo Capsule (ป้ายคอมโบ x{count} หรือ +1 ทางขวา)
  const isCombo = count > 1;
  const pillW = count > 99 ? 100 : (count > 9 ? 92 : (isCombo ? 84 : 80));
  const pillH = 38;
  const pillX = (bx + bw - 14) - pillW;
  const pillY = 62 - pillH / 2;
  const pillR = pillH / 2;

  ctx.save();
  ctx.shadowColor = isCombo ? 'rgba(255, 42, 109, 0.85)' : 'rgba(255, 215, 0, 0.75)';
  ctx.shadowBlur = isCombo ? 12 : 9;

  const comboGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
  if (isCombo) {
    comboGrad.addColorStop(0.0, '#ff1744');
    comboGrad.addColorStop(0.45, '#d50000');
    comboGrad.addColorStop(1.0, '#6a001a');
  } else {
    comboGrad.addColorStop(0.0, '#ffe066');
    comboGrad.addColorStop(0.48, '#f59e0b');
    comboGrad.addColorStop(1.0, '#92400e');
  }
  ctx.fillStyle = comboGrad;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
  } else {
    ctx.rect(pillX, pillY, pillW, pillH);
  }
  ctx.fill();

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = isCombo ? '#ffccd5' : '#fffcdb';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = `800 ${isCombo ? (count > 99 ? 19 : 22) : 17}px "Kanit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 4;
  const countLabel = isCombo ? `🔥 x${count}` : `✨ ถวาย +1`;
  ctx.fillText(countLabel, pillX + pillW / 2, pillY + pillH / 2 + 1);
  ctx.restore();

  // 9. Auspicious 4-Point Starlight Sparkles (✦ ดาวประกายเพชรทองมงคล)
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 8;
  ctx.font = '16px sans-serif';
  ctx.fillText('✦', 396, 26);

  ctx.fillStyle = '#ffe57f';
  ctx.shadowBlur = 5;
  ctx.font = '12px sans-serif';
  ctx.fillText('✦', 266, 29);
  ctx.fillText('✦', 110, 31);
  ctx.fillText('✦', medalCx + 26, medalCy - 26);
  ctx.restore();

  tex.needsUpdate = true;
}

function createFloatingGiftBadge(icon = '🌹', giftName = 'กุหลาบ', count = 1, image = null) {
  try {
    const canvas = document.createElement('canvas');
    const SS = 2;
    const W = 440;
    const H = 124;
    canvas.width = W * SS;
    canvas.height = H * SS;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(SS, 0, 0, SS, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 135000;
    sprite.center.set(0.5, 0.0);

    const baseW = 0.96;
    const baseH = 0.27;
    sprite.scale.set(0.01, 0.01, 1); // Start small for pop-in entrance
    const giftImgUrl = image || getGiftImageUrl(giftName, 1);
    sprite.userData = { canvas, ctx, tex, icon, giftName, count, image: giftImgUrl, baseW, baseH, isPopping: true, punchScale: 1.0 };

    updateFloatingGiftBadge(sprite, icon, giftName, count, giftImgUrl);

    // Spring pop-in entrance animation
    let popT = 0;
    const popTimer = setInterval(() => {
      popT += 0.08;
      if (popT >= 1.0) {
        clearInterval(popTimer);
        sprite._popTimer = null;
        sprite.scale.set(baseW, baseH, 1);
        if (sprite.userData) sprite.userData.isPopping = false;
        return;
      }
      const p = popT;
      // Elastic spring ease-out overshoot (Smooth sin-based landing at exactly 1.0)
      const s = Math.sin(p * Math.PI * 0.5) * (1.0 + Math.sin(p * Math.PI) * 0.20);
      sprite.scale.set(baseW * s, baseH * s, 1);
    }, 16);
    sprite._popTimer = popTimer;

    return sprite;
  } catch (err) {
    console.error('[createFloatingGiftBadge] Failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------
// Orderly 22-Seat Devotee Layout (ฝั่งละ 2 แถว ฝั่งละ 11 คน รวม 22 ที่นั่ง)
// Center red carpet aisle (|x| <= 0.50): ทางเดินตรงกลางโล่ง 100% สำหรับผู้ถวายของขวัญ
// Left Flank (11 คน): แถวใน 6 ที่นั่ง, แถวนอก 5 ที่นั่ง (สลับฟันปลาแกน Z)
// Right Flank (11 คน): แถวใน 6 ที่นั่ง, แถวนอก 5 ที่นั่ง (สลับฟันปลาแกน Z)
// TOP 5 VIP (ที่นั่ง 0..4): ประจำบนอาสนะพรมทองคำแท้ แถวหน้าติดริมพรมแดงทั้งสองฝั่ง
// ---------------------------------------------------------------------
const TOTAL_SEATS = 22;            // keep in sync with MAX_SEATS in server.js
const CROWD_Z_FAR = 3.2;           // just in front of the altar table
const CROWD_Z_NEAR = 9.2;          // bottom edge of the 9:16 frame
const CROWD_AISLE_HALF = 0.50;     // centre carpet aisle is properly proportioned and unobstructed

const congregationLayout = [
  // ── แถวใน (INNER COLUMN 1: Seats 0..11) ชิดริมพรมแดง ฝั่งละ 6 คน นั่งคุกเข่าสง่างาม ──
  // TOP 5 VIP FRONT ROWS (Seats 0..4 on Golden Mats / อาสนะพรมทอง)
  { x: -0.58, y: 0.05, z: 4.20, standing: false, isVip: true, vipRank: 1 }, // Seat 0: Left Inner Row 1 (VIP 1)
  { x: 0.58, y: 0.05, z: 4.20, standing: false, isVip: true, vipRank: 2 }, // Seat 1: Right Inner Row 1 (VIP 2)
  { x: -0.60, y: 0.05, z: 5.10, standing: false, isVip: true, vipRank: 3 }, // Seat 2: Left Inner Row 2 (VIP 3)
  { x: 0.60, y: 0.05, z: 5.10, standing: false, isVip: true, vipRank: 4 }, // Seat 3: Right Inner Row 2 (VIP 4)
  { x: -0.62, y: 0.05, z: 6.00, standing: false, isVip: true, vipRank: 5 }, // Seat 4: Left Inner Row 3 (VIP 5)
  { x: 0.62, y: 0.05, z: 6.00, standing: false, isVip: false },             // Seat 5: Right Inner Row 3 (Reserve VIP)

  // Inner Column Remaining Rows (All Kneeling Reverently)
  { x: -0.63, y: 0.05, z: 6.90, standing: false, isVip: false },             // Seat 6: Left Inner Row 4
  { x: 0.63, y: 0.05, z: 6.90, standing: false, isVip: false },             // Seat 7: Right Inner Row 4
  { x: -0.64, y: 0.05, z: 7.80, standing: false, isVip: false },             // Seat 8: Left Inner Row 5
  { x: 0.64, y: 0.05, z: 7.80, standing: false, isVip: false },             // Seat 9: Right Inner Row 5
  { x: -0.65, y: 0.05, z: 8.70, standing: false, isVip: false },             // Seat 10: Left Inner Row 6
  { x: 0.65, y: 0.05, z: 8.70, standing: false, isVip: false },             // Seat 11: Right Inner Row 6

  // ── แถวนอก (OUTER COLUMN 2: Seats 12..21) ชิดเข้าหาพรมแดง ไม่ติดขอบราวสะพาน สลับฟันปลาแกน Z ฝั่งละ 5 คน ──
  { x: -0.96, y: 0.05, z: 4.65, standing: true, isVip: false },             // Seat 12: Left Outer Row 1
  { x: 0.96, y: 0.05, z: 4.65, standing: true, isVip: false },             // Seat 13: Right Outer Row 1
  { x: -0.98, y: 0.05, z: 5.55, standing: false, isVip: false },             // Seat 14: Left Outer Row 2
  { x: 0.98, y: 0.05, z: 5.55, standing: false, isVip: false },             // Seat 15: Right Outer Row 2
  { x: -1.00, y: 0.05, z: 6.45, standing: true, isVip: false },             // Seat 16: Left Outer Row 3
  { x: 1.00, y: 0.05, z: 6.45, standing: true, isVip: false },             // Seat 17: Right Outer Row 3
  { x: -1.02, y: 0.05, z: 7.35, standing: false, isVip: false },             // Seat 18: Left Outer Row 4
  { x: 1.02, y: 0.05, z: 7.35, standing: false, isVip: false },             // Seat 19: Right Outer Row 4
  { x: -1.04, y: 0.05, z: 8.25, standing: true, isVip: false },             // Seat 20: Left Outer Row 5
  { x: 1.04, y: 0.05, z: 8.25, standing: true, isVip: false }              // Seat 21: Right Outer Row 5
];


function getCarpetPosition(seatIndex) {
  const safeSeat = Math.abs(seatIndex) % congregationLayout.length;
  const layout = congregationLayout[safeSeat];
  return { x: layout.x, y: layout.y, z: layout.z, standing: layout.standing, isVip: layout.isVip };
}

// ── 3D Golden Lotus Meditation Mats (อาสนะพรมทองคำ TOP 5 ผู้ส่งของขวัญ) ──
const goldenMatsGroup = new THREE.Group();
const goldenMatMeshes = [];

function createGoldenMatTexture(rank) {
  const S = 512, C = S / 2;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  // 1. Soft golden aura halo
  const halo = ctx.createRadialGradient(C, C, 190, C, C, 256);
  halo.addColorStop(0, 'rgba(255, 215, 0, 0.55)');
  halo.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, S, S);

  // 2. Royal crimson woven rug base with metallic gold rim
  const rim = ctx.createLinearGradient(0, 40, 0, 472);
  rim.addColorStop(0, '#fff2a8');
  rim.addColorStop(0.5, '#e0b53a');
  rim.addColorStop(1, '#8b6508');
  ctx.fillStyle = rim;
  ctx.beginPath(); ctx.arc(C, C, 214, 0, Math.PI * 2); ctx.fill();

  const rug = ctx.createRadialGradient(C, C - 20, 20, C, C, 200);
  rug.addColorStop(0, '#b3202a');
  rug.addColorStop(0.65, '#8a1018');
  rug.addColorStop(1, '#4a0509');
  ctx.fillStyle = rug;
  ctx.beginPath(); ctx.arc(C, C, 200, 0, Math.PI * 2); ctx.fill();

  // 3. Woven fabric texture (fine crosshatch clipped to the rug)
  ctx.save();
  ctx.beginPath(); ctx.arc(C, C, 200, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255, 200, 120, 0.07)';
  ctx.lineWidth = 1;
  for (let i = -S; i < S * 2; i += 6) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, S); ctx.lineTo(i + S, 0); ctx.stroke();
  }
  ctx.restore();

  // 4. Gold bead ring + inner thread border
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? '#ffe680' : '#d4a017';
    ctx.beginPath(); ctx.arc(C + Math.cos(a) * 184, C + Math.sin(a) * 184, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#ffd95a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(C, C, 166, 0, Math.PI * 2); ctx.stroke();

  // 5. 16-petal lotus mandala (outer gold petals + inner pink petals)
  const petal = (len, wid, fill, stroke) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.35, wid * 0.6, -len * 0.85, 0, -len);
    ctx.bezierCurveTo(-wid * 0.6, -len * 0.85, -wid, -len * 0.35, 0, 0);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke();
  };
  for (let ring = 0; ring < 2; ring++) {
    const count = 16, len = ring ? 96 : 150, wid = ring ? 26 : 34;
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.translate(C, C);
      ctx.rotate((i / count) * Math.PI * 2 + (ring ? Math.PI / count : 0));
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      if (ring) { g.addColorStop(0, '#ffd6e8'); g.addColorStop(1, '#ff7fb5'); }
      else { g.addColorStop(0, '#a8741a'); g.addColorStop(1, '#ffe27a'); }
      petal(len, wid, g, ring ? '#fff0f6' : '#fff4b0');
      ctx.restore();
    }
  }

  // 6. Glowing golden cushion centre
  const core = ctx.createRadialGradient(C - 14, C - 18, 6, C, C, 70);
  core.addColorStop(0, '#fffbe0');
  core.addColorStop(0.55, '#ffd84a');
  core.addColorStop(1, '#b8860b');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(C, C, 66, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff6c0';
  ctx.stroke();

  // 7. Clear rank numeral
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 76px "Kanit", sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255, 240, 170, 0.9)';
  ctx.strokeText(String(rank), C, C + 4);
  ctx.fillStyle = '#6b1000';
  ctx.fillText(String(rank), C, C + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function initGoldenMats() {
  for (let s = 0; s < 5; s++) {
    const seatPos = congregationLayout[s];
    const group = new THREE.Group();

    // 1. Cushion Disc Mesh (Refined 0.55m scale prevents visual foreshortening overlap)
    const matGeo = new THREE.PlaneGeometry(0.62, 0.62);
    const matTex = createGoldenMatTexture(s + 1);
    const matMaterial = new THREE.MeshBasicMaterial({
      map: matTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const discMesh = new THREE.Mesh(matGeo, matMaterial);
    discMesh.rotation.x = -Math.PI / 2;
    discMesh.position.y = 0.012;
    group.add(discMesh);

    // 2. Pulsating Golden Ring Glow (Inner: 0.24, Outer: 0.32 - clean clearance between consecutive rows)
    const ringGeo = new THREE.RingGeometry(0.24, 0.32, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.014;
    group.add(ringMesh);

    group.position.set(seatPos.x, seatPos.y, seatPos.z);
    group.userData = { ringMesh, seatIndex: s };
    goldenMatsGroup.add(group);
    goldenMatMeshes.push(group);
  }
  scene.add(goldenMatsGroup);
}
initGoldenMats();

// Floating Rose Gift Particles gliding along the Red Carpet (Optimized Texture Cache + Pool)
const giftTrailParticles = [];
let cachedRoseTrailTex = null;

function getRoseTrailTexture() {
  if (cachedRoseTrailTex) return cachedRoseTrailTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const cx = 128, cy = 128;

  // Golden celestial aura glow behind the rose
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 118);
  glow.addColorStop(0.0, 'rgba(255, 240, 170, 0.95)');
  glow.addColorStop(0.45, 'rgba(255, 80, 130, 0.52)');
  glow.addColorStop(0.78, 'rgba(255, 195, 50, 0.22)');
  glow.addColorStop(1.0, 'rgba(255, 180, 0, 0.0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 118, 0, Math.PI * 2);
  ctx.fill();

  // 2 Emerald & Gold Leaves at the base
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + side * 26, cy + 34);
    ctx.rotate(side * 0.65);
    const leafGrad = ctx.createLinearGradient(0, 0, side * 44, 24);
    leafGrad.addColorStop(0, '#189e52');
    leafGrad.addColorStop(1, '#58e88c');
    ctx.fillStyle = leafGrad;
    ctx.strokeStyle = '#ffd866';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * 28, -16, side * 48, 12);
    ctx.quadraticCurveTo(side * 22, 24, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Multi-layered Ruby-Crimson & Gold-Edged Rose Petals
  const layers = [
    { count: 7, radius: 56, size: 34, c0: '#9e0b32', c1: '#ff2e63' },
    { count: 6, radius: 38, size: 28, c0: '#c71142', c1: '#ff5c8a' },
    { count: 5, radius: 20, size: 20, c0: '#e01b52', c1: '#ff94b4' }
  ];
  layers.forEach((layer, lIdx) => {
    for (let i = 0; i < layer.count; i++) {
      const a = (i / layer.count) * Math.PI * 2 + lIdx * 0.45;
      const px = cx + Math.cos(a) * layer.radius * 0.62;
      const py = cy - 6 + Math.sin(a) * layer.radius * 0.56;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI / 2);
      const pGrad = ctx.createRadialGradient(0, -4, 2, 0, 0, layer.size);
      pGrad.addColorStop(0, layer.c1);
      pGrad.addColorStop(1, layer.c0);
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#ffe588';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, layer.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });

  // Golden spiral heart & 4-point star sparkles
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 9, 0, Math.PI * 2);
  ctx.fill();

  const sparks = [[-64, -52], [68, -46], [-56, 54], [62, 50]];
  for (const [sx, sy] of sparks) {
    ctx.fillStyle = '#fff9d6';
    ctx.beginPath();
    ctx.arc(cx + sx, cy + sy, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedRoseTrailTex = new THREE.CanvasTexture(canvas);
  cachedRoseTrailTex.minFilter = THREE.LinearFilter;
  return cachedRoseTrailTex;
}

function spawnGiftTrailRose() {
  // Cap max active trail particles to 16 to keep GPU 60 FPS smooth even during rapid gift streaks
  if (giftTrailParticles.length >= 16) {
    const oldest = giftTrailParticles.shift();
    if (oldest && oldest.parent) oldest.parent.remove(oldest);
  }

  const tex = getRoseTrailTexture();
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.90 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.48, 0.48, 1);
  sprite.position.set(
    (Math.random() - 0.5) * 0.6,
    0.65 + Math.random() * 0.35,
    CROWD_Z_NEAR - 0.3
  );
  sprite.userData = {
    vz: 0.08 + Math.random() * 0.03,
    targetZ: 2.1,
    wobbleSpeed: 3.2 + Math.random() * 2.0,
    wobblePhase: Math.random() * Math.PI * 2
  };
  scene.add(sprite);
  giftTrailParticles.push(sprite);
}

// Welcome Highlight for New Viewers (Lightweight, Serene & Butter-Smooth)
function triggerViewerWelcomeHighlight(devotee) {
  if (!devotee) return;

  // 1. Subtle, gentle golden aura fade (uses existing aura sprite, zero GPU reallocation)
  if (devotee.auraSprite && devotee.auraSprite.material) {
    devotee.auraSprite.material.opacity = 0.85;
    let elapsed = 0;
    const fade = setInterval(() => {
      elapsed += 0.08;
      if (devotee.auraSprite && devotee.auraSprite.material) {
        devotee.auraSprite.material.opacity = Math.max(0, 0.85 * (1.0 - elapsed / 1.5));
      }
      if (elapsed >= 1.5) {
        clearInterval(fade);
        if (devotee.auraSprite && devotee.auraSprite.material) {
          devotee.auraSprite.material.opacity = 0;
        }
      }
    }, 40);
  }

  // 2. Gentle nameplate pulse (1.0 -> 1.14 -> 1.0)
  if (devotee.nameplate && devotee.nameplate.userData && devotee.nameplate.userData.baseScale) {
    const bs = devotee.nameplate.userData.baseScale;
    devotee.nameplate.scale.set(bs.x * 1.14, bs.y * 1.14, 1);
    setTimeout(() => {
      if (devotee.nameplate && devotee.nameplate.userData && devotee.nameplate.userData.baseScale) {
        devotee.nameplate.scale.set(bs.x, bs.y, 1);
      }
    }, 700);
  }
}

// Seat Real TikTok Live Viewer: Replaces placeholder bot/initial devotees with real viewer
function seatRealViewer(userData) {
  const name = (userData.nickname || userData.uniqueId || 'ผู้ร่วมบุญ').trim();

  // 1. Check if user already holds an assigned seat
  let existingSeatId = null;
  disciplesMap.forEach((d, sId) => {
    if (d.userData && (
      (userData.uniqueId && d.userData.uniqueId === userData.uniqueId) ||
      (d.userData.nickname && (d.userData.nickname === name || d.userData.nickname === userData.nickname))
    )) {
      existingSeatId = sId;
    }
  });

  if (existingSeatId !== null) {
    const devotee = disciplesMap.get(existingSeatId);
    devotee.userData = { ...devotee.userData, ...userData, seatId: existingSeatId, lastActiveAt: Date.now() };
    const isOuter = (existingSeatId >= 12);
    if (!devotee.nameplate || devotee.userData.nickname !== name) {
      if (devotee.nameplate) {
        safeDisposeSprite(devotee.nameplate);
        devotee.nameplate = null;
      }
      devotee.nameplate = createNameplateSprite(name, existingSeatId < 5, devotee.root.position.z, isOuter, devotee.userData?.avatar);
      devotee.nameplate.position.y = (devotee.baseH || 0.45) + (isOuter ? 0.07 : 0.04);
      devotee.root.add(devotee.nameplate);
    }
    return devotee;
  }

  // 2. Find placeholder or unassigned seat (prefer general seats 5..21, keep VIP seats 0..4 reserved for TOP donors)
  let targetSeatId = null;

  if (userData.seatId !== undefined && userData.seatId !== null) {
    const preferredSeat = Number(userData.seatId) % TOTAL_SEATS;
    const occ = disciplesMap.get(preferredSeat);
    if (!occ || (occ.userData?.isInitial && occ !== activeStageActor && !occ.isPerformingAltarRitual)) {
      targetSeatId = preferredSeat;
    }
  }

  // 2a. Unassigned general seat first
  if (targetSeatId === null) {
    for (let s = 5; s < TOTAL_SEATS; s++) {
      if (!disciplesMap.has(s)) { targetSeatId = s; break; }
    }
  }
  // Unassigned VIP seat if empty
  if (targetSeatId === null) {
    for (let s = 0; s < 5; s++) {
      if (!disciplesMap.has(s)) { targetSeatId = s; break; }
    }
  }

  // 2b. Placeholder initial bot in general seats
  if (targetSeatId === null) {
    for (let s = 5; s < TOTAL_SEATS; s++) {
      const d = disciplesMap.get(s);
      if (d && d.userData && d.userData.isInitial && d !== activeStageActor && !d.isPerformingAltarRitual) {
        targetSeatId = s;
        break;
      }
    }
  }

  // 2c. If all 22 seats are real viewers: rotate out LRU non-donor from general seats 5..21 ONLY
  // NEVER evict seats 0..4 (VIP Golden Mats), and NEVER evict someone performing an altar ritual!
  if (targetSeatId === null) {
    let oldestTime = Infinity;
    let fallbackSeat = null;

    for (let s = 5; s < TOTAL_SEATS; s++) {
      const d = disciplesMap.get(s);
      if (!d) { targetSeatId = s; break; }
      if (d === activeStageActor || d.isPerformingAltarRitual) continue; // Skip active ritual actor

      const t = d.userData?.lastActiveAt || 0;
      const coins = d.userData?.coins || 0;
      if (coins === 0 && t < oldestTime) {
        oldestTime = t;
        targetSeatId = s;
      } else if (fallbackSeat === null || t < oldestTime) {
        fallbackSeat = s;
      }
    }
    if (targetSeatId === null) {
      targetSeatId = fallbackSeat !== null ? fallbackSeat : 5;
    }
  }

  // Evict placeholder/old occupant safely (NEVER evict anyone currently performing an altar ritual!)
  if (disciplesMap.has(targetSeatId)) {
    const old = disciplesMap.get(targetSeatId);
    if (old === activeStageActor || old.isPerformingAltarRitual) {
      return old; // Preserve active actor!
    }
    if (old.stopAllMovement) old.stopAllMovement();
    safeDisposeSprite(old.nameplate);
    cleanAllBubblesFromDisciple(old);
    safeDisposeSprite(old.giftBadgeSprite);
    disciplesGroup.remove(old.root);
    disciplesMap.delete(targetSeatId);
  }

  const devotee = addOrUpdateDiscipleInScene({
    seatId: targetSeatId,
    uniqueId: userData.uniqueId || `viewer_${Date.now()}`,
    nickname: name,
    avatar: userData.avatar,
    isRealViewer: true,
    lastActiveAt: Date.now()
  }, false);

  return devotee;
}

function addOrUpdateDiscipleInScene(userData, autoWalk = false) {
  const { seatId, nickname, avatar, type, uniqueId } = userData;
  const sId = (seatId !== undefined && seatId !== null) ? (seatId % TOTAL_SEATS) : (disciplesMap.size % TOTAL_SEATS);

  if (disciplesMap.has(sId)) {
    const existing = disciplesMap.get(sId);
    if (!existing.userData || existing.userData.uniqueId === uniqueId || existing.userData.nickname === nickname) {
      if (autoWalk && !existing.isWalking && !existing.isPerformingAltarRitual) {
        existing.walkToAltarAndKowtow('kowtow');
      }
      return existing;
    } else {
      if (existing === activeStageActor || existing.isWalking || existing.isPerformingAltarRitual) {
        return existing; // Preserve active stage actor!
      }
      if (existing.stopAllMovement) existing.stopAllMovement();
      cleanAllBubblesFromDisciple(existing);
      disciplesGroup.remove(existing.root);
      disciplesMap.delete(sId);
    }
  }

  const isVip = (sId < 5);
  const finalPos = getCarpetPosition(sId);

  // Standing on outer flank, kneeling on inner flank (creates authentic lively temple crowd)
  const isStanding = (finalPos.standing !== undefined) ? finalPos.standing : (sId % 2 === 1);

  // Sacred angle facing forward toward Guan Yin Lotus Altar
  const dx = 0 - finalPos.x;
  const dz = 1.6 - finalPos.z;
  const targetAngle = Math.atan2(dx, dz);

  const isOuter = (sId >= 12);
  const modelParts = createDiscipleModel(sId, type, isStanding, isVip);
  const nameplate = createNameplateSprite(nickname || `ผู้เจริญสติ #${sId + 1}`, isVip, finalPos.z, isOuter, avatar);
  nameplate.position.set(0, (modelParts.baseH || 0.45) + (isOuter ? 0.07 : 0.04), 0);
  modelParts.root.add(nameplate);

  disciplesGroup.add(modelParts.root);

  const discipleObj = {
    root: modelParts.root,
    charSprite: modelParts.charSprite,
    shadowSprite: modelParts.shadowSprite,
    auraSprite: modelParts.auraSprite,
    eventAuraSprite: modelParts.eventAuraSprite,
    typeKey: modelParts.typeKey,
    get baseH() { return modelParts.baseH; },
    get baseW() { return modelParts.baseW; },
    nameplate,
    userData: { ...userData, seatId: sId, lastActiveAt: Date.now() },
    finalPos,
    targetAngle,
    breathSpeed: 1.15 + ((sId * 3) % 5) * 0.1,
    breathPhase: (sId * 1.35) % (Math.PI * 2),
    cyclePhase: (sId * 0.72) % (Math.PI * 2),
    nextBubbleTime: 3.0 + (sId * 7.3) % 45,
    isBowing: false,
    isWalking: false,
    isMovingSeat: false,
    isPerformingAltarRitual: false,
    bubbleSprite: null,
    giftBadgeSprite: null,
    walkPhaseTime: 0,
    _walkTimer: null,
    _returnTimer: null,
    _moveTimer: null,
    _poseTimer: null,
    _ritualTimers: [],
    _ritualIntervals: [],
    _ritualRunId: 0,
    _pendingEvict: false,

    addRitualTimeout(fn, delayMs) {
      const expectedRunId = this._ritualRunId;
      const tid = setTimeout(() => {
        const idx = this._ritualTimers.indexOf(tid);
        if (idx !== -1) this._ritualTimers.splice(idx, 1);
        if (this._ritualRunId !== expectedRunId) return;
        if (typeof fn === 'function') {
          try {
            fn();
          } catch (err) {
            console.error('[addRitualTimeout] Execution error:', err);
          }
        }
      }, delayMs);
      this._ritualTimers.push(tid);
      return tid;
    },

    addRitualInterval(fn, intervalMs) {
      const expectedRunId = this._ritualRunId;
      const iid = setInterval(() => {
        if (this._ritualRunId !== expectedRunId) {
          clearInterval(iid);
          return;
        }
        if (typeof fn === 'function') {
          try {
            fn(iid);
          } catch (err) {
            console.error('[addRitualInterval] Execution error:', err);
            clearInterval(iid);
          }
        }
      }, intervalMs);
      this._ritualIntervals.push(iid);
      return iid;
    },

    clearRitualTimers() {
      if (this._ritualTimers && this._ritualTimers.length > 0) {
        this._ritualTimers.forEach(tid => clearTimeout(tid));
        this._ritualTimers = [];
      }
      if (this._ritualIntervals && this._ritualIntervals.length > 0) {
        this._ritualIntervals.forEach(iid => clearInterval(iid));
        this._ritualIntervals = [];
      }
    },

    stopAllMovement(force = false) {
      if (!force && this === activeStageActor && this.isPerformingAltarRitual) {
        // Guard active runway actor against external sweeps/ambient resets
        return;
      }
      this._ritualRunId = (this._ritualRunId || 0) + 1;
      this.clearRitualTimers();
      if (this._walkTimer) { clearInterval(this._walkTimer); this._walkTimer = null; }
      if (this._returnTimer) { clearInterval(this._returnTimer); this._returnTimer = null; }
      if (this._moveTimer) { clearInterval(this._moveTimer); this._moveTimer = null; }
      if (this._poseTimer) { clearInterval(this._poseTimer); this._poseTimer = null; }
      this._lastStepZ = null;
      this.isWalking = false;
      this.isMovingSeat = false;
      this.isPerformingAltarRitual = false;
      this.isBowing = false;
      this.bowProgress = 0;
      const restPose = (this.finalPos && this.finalPos.standing) ? 'walk' : 'kneel';
      this.setPose(restPose);
      if (this.charSprite) {
        this.charSprite.material.rotation = 0;
        this.charSprite.position.y = 0.05;
      }
      if (this.giftBadgeSprite) {
        safeDisposeSprite(this.giftBadgeSprite);
        if (this.giftBadgeSprite.parent) this.giftBadgeSprite.parent.remove(this.giftBadgeSprite);
        this.giftBadgeSprite = null;
      }
      cleanAllBubblesFromDisciple(this);
    },

    get currentPose() { return modelParts.currentPose; },
    setPose(pose) {
      modelParts.setPose(pose);
      if (this.nameplate) {
        this.nameplate.position.y = (modelParts.baseH || 0.45) + 0.05;
      }
    },

    // ── Smooth Organic Pose Morph (Realistic human weight transfer between walk, kneel, and kowtow) ──
    smoothPoseTransition(targetPose, durationMs = 300, onComplete = null) {
      this.isBowing = false;
      this.bowProgress = 0;
      if (this._poseTimer) {
        clearInterval(this._poseTimer);
        this._poseTimer = null;
      }
      const fromPose = modelParts.currentPose;
      if (fromPose === targetPose) {
        this.setPose(targetPose);
        if (this.charSprite) {
          this.charSprite.position.y = 0.05;
          this.charSprite.material.rotation = 0;
        }
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      const expectedRunId = this._ritualRunId;
      const fromH = this.baseH;
      const fromW = this.baseW;

      const ratios = spriteRatios[this.typeKey] || spriteRatios.female_buns;
      const targetR = ratios[targetPose] || 0.55;
      const targetH = (POSE_H[targetPose] || POSE_H.kneel) * CHIBI_SCALE;
      const targetW = targetH * targetR;

      let elapsed = 0;
      const durSec = Math.max(0.10, durationMs / 1000);
      let swappedTex = false;

      this._poseTimer = setInterval(() => {
        if (this._ritualRunId !== expectedRunId) {
          clearInterval(this._poseTimer);
          this._poseTimer = null;
          return;
        }
        elapsed += 0.016;
        const progress = Math.min(1.0, elapsed / durSec);
        // Quintic smoothstep for lifelike human joint acceleration & soft cushion settle
        const ease = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
        const midArc = Math.sin(progress * Math.PI);

        // Subtle anticipation & cloth follow-through during posture change
        const widthArc = (targetPose === 'kowtow' || fromPose === 'kowtow')
          ? midArc * 0.025 * CHIBI_SCALE
          : -midArc * 0.012 * CHIBI_SCALE;

        const curH = THREE.MathUtils.lerp(fromH, targetH, ease);
        const curW = THREE.MathUtils.lerp(fromW, targetW, ease) + widthArc;

        this.charSprite.scale.set(curW, curH, 1);
        // Anchor feet/mat firmly on floor with subtle cushion compression when bowing into kowtow
        const yDip = (targetPose === 'kowtow') ? (-midArc * 0.008) : 0;
        this.charSprite.position.y = 0.05 + yDip;
        this.charSprite.material.rotation = 0;

        if (this.shadowSprite) {
          const shGrow = (targetPose === 'kowtow') ? (1.30 + ease * 0.12) : 1.30;
          this.shadowSprite.scale.set(curW * shGrow, 0.22 * CHIBI_SCALE, 1);
        }
        if (this.nameplate) {
          this.nameplate.position.y = curH + 0.05;
        }

        if (progress >= 0.46 && !swappedTex) {
          swappedTex = true;
          const texSet = spriteTextures[this.typeKey] || spriteTextures.female_buns;
          const nextTex = texSet ? texSet[targetPose] : null;
          if (nextTex && this.charSprite && this.charSprite.material) {
            this.charSprite.material.map = nextTex;
            this.charSprite.material.needsUpdate = true;
          }
          this.charSprite.scale.set(curW, curH, 1);
        }

        if (progress >= 1.0) {
          clearInterval(this._poseTimer);
          this._poseTimer = null;
          this.charSprite.position.y = 0.05;
          this.charSprite.material.rotation = 0;
          this.setPose(targetPose);
          if (typeof onComplete === 'function') onComplete();
        }
      }, 16);
    },

    triggerBow() {
      if (this.isBowing || !this.charSprite) return;
      this.isBowing = true;
      this.bowProgress = 0;
    },

    // ── 2D Dignified Human Walking Stride down the Red Carpet towards Golden Altar ──
    walkToAltarAndKowtow(ritualType = 'kowtow', onFinish, wishText = null, giftInfo = null, speedMultiplier = 1.0, explicitDonorName = null) {
      // Signature flexibility & defense against argument misordering
      if (typeof ritualType === 'function') {
        explicitDonorName = speedMultiplier;
        speedMultiplier = giftInfo || 1.0;
        giftInfo = wishText;
        wishText = onFinish;
        onFinish = ritualType;
        ritualType = 'kowtow';
      } else if (typeof onFinish !== 'function') {
        if (typeof wishText === 'function') {
          const tempCb = wishText;
          wishText = typeof onFinish === 'string' ? onFinish : null;
          onFinish = tempCb;
        } else {
          if (typeof onFinish === 'string') {
            wishText = onFinish;
          }
          onFinish = null;
        }
      }

      if (this.isPerformingAltarRitual) {
        // In-flight combo booster: update gift badge count & trigger sparkles
        if (giftInfo && this.giftBadgeSprite) {
          this.userData.giftCount = (this.userData.giftCount || 1) + (giftInfo.count || 1);
          const giftImg = giftInfo.image || getGiftImageUrl(giftInfo.name, giftInfo.coins);
          updateFloatingGiftBadge(this.giftBadgeSprite, giftInfo.icon, giftInfo.name, this.userData.giftCount, giftImg);
          spawnBlessingSparks(this.root.position.x, 0.25, this.root.position.z, 8, 0xffea70);
          createCarpetRipple(this.root.position.x, 0.05, this.root.position.z, 0xffd700);
        }
        if (typeof onFinish === 'function') onFinish();
        return;
      }

      this.stopAllMovement(true);
      const myRunId = this._ritualRunId;
      this.isPerformingAltarRitual = true;
      this.isWalking = true;
      this.isMovingSeat = false;
      this.isBowing = false;
      this.walkPhaseTime = 0;
      this.userData.giftCount = giftInfo?.count || 1;
      this.setPose('walk');

      const startX = 0;
      const startY = 0.05;
      const startZ = CROWD_Z_NEAR - 0.1; // Enters gracefully from bottom edge up red carpet
      const altarZ = 2.05;

      this.root.position.set(startX, startY, startZ);
      if (this.shadowSprite) this.shadowSprite.material.opacity = 0.55;

      // ── Clean prior bubbles & Attach Floating Gift Badge ─────
      cleanAllBubblesFromDisciple(this);
      if (this.giftBadgeSprite) {
        safeDisposeSprite(this.giftBadgeSprite);
        if (this.giftBadgeSprite.parent) this.root.remove(this.giftBadgeSprite);
        this.giftBadgeSprite = null;
      }
      const donorName = explicitDonorName || this.userData?.nickname || 'ผู้มีจิตศรัทธา';

      let giftBadge = null;
      try {
        if (giftInfo) {
          const giftImg = giftInfo.image || getGiftImageUrl(giftInfo.name, giftInfo.coins);
          giftBadge = createFloatingGiftBadge(giftInfo.icon, giftInfo.name, this.userData.giftCount, giftImg);
          if (giftBadge) {
            giftBadge.position.set(0, 1.12, 0);
            this.root.add(giftBadge);
            this.giftBadgeSprite = giftBadge;
          }
        }
      } catch (badgeErr) {
        console.error('[walkToAltarAndKowtow] Gift badge creation error:', badgeErr);
      }

      let walkT = 0;
      // Unique randomized parameters per walk so TikTok AI never classifies it as repeating loop
      const randWalkCurve = (Math.random() - 0.5) * 0.16;
      const randWalkCadence = 7.6 + (Math.random() - 0.5) * 1.2;
      const randWalkSpeedVar = (Math.random() - 0.5) * 0.25;

      this._walkTimer = setInterval(() => {
        try {
          if (this._ritualRunId !== myRunId) {
            clearInterval(this._walkTimer);
            this._walkTimer = null;
            return;
          }
          const dt = 0.016;
          // Dynamically accelerate if more gifts arrive in stageActionQueue while walking
          const liveQ = stageActionQueue.length;
          const liveBoost = liveQ > 3 ? 2.2 : (liveQ > 1 ? 1.75 : (liveQ > 0 ? 1.4 : 1.0));
          const safeSpeedMult = Math.max(0.5, Number(speedMultiplier) || 1.0);
          const effSpeed = Math.max(safeSpeedMult, liveBoost);
          // Agile & lively walk: 1.55s - 1.85s (down from 3.1s)
          const walkDuration = Math.max(0.95, (1.68 + randWalkSpeedVar) / effSpeed);

          walkT += dt / walkDuration;
          this.walkPhaseTime += dt * Math.min(1.6, Math.sqrt(effSpeed));
          const p = Math.min(walkT, 1.0);
          // Smooth ease-in-out for natural human acceleration from rest & gentle deceleration at altar
          const ease = p * p * (3 - 2 * p);
          const strideEnv = Math.sin(p * Math.PI); // tapers stride amplitude at start and stop

          // Crisp, agile human walking cadence with natural non-repeating trajectory
          const stridePhase = this.walkPhaseTime * randWalkCadence;
          const stepCycle = 0.5 - 0.5 * Math.cos(stridePhase * 2.0); // 0 -> 1 -> 0 per footstep
          const stepBob = stepCycle * 0.016 * (0.35 + 0.65 * strideEnv);
          const stepTilt = Math.sin(stridePhase) * 0.020 * strideEnv;
          const stepSwayX = Math.sin(stridePhase) * 0.012 * strideEnv + Math.sin(p * Math.PI) * randWalkCurve;

          this.charSprite.position.y = 0.05 + stepBob;
          this.charSprite.material.rotation = stepTilt;

          // Perspective depth scaling + subtle natural garment flow
          const curH = THREE.MathUtils.lerp(1.03, 0.89, ease) * CHIBI_SCALE;
          const r = (spriteRatios[this.typeKey] || spriteRatios.female_buns).walk || 0.45;
          const clothStretch = 1.0 + (stepCycle - 0.5) * 0.022 * strideEnv;
          const curW = curH * r * (2.0 - clothStretch);
          this.charSprite.scale.set(curW, curH * clothStretch, 1);
          if (this.shadowSprite) {
            const shContact = 1.30 * (1.0 - stepCycle * 0.05 * strideEnv);
            this.shadowSprite.scale.set(curW * shContact, 0.22 * CHIBI_SCALE, 1);
          }

          if (this.nameplate) this.nameplate.position.y = curH + 0.05;
          if (giftBadge) {
            giftBadge.position.y = curH + 0.28 + Math.sin(this.walkPhaseTime * 3.4 + 0.8) * 0.012;
          }
          if (this.bubbleSprite) {
            const topY = giftBadge ? (giftBadge.position.y + 0.23) : (this.nameplate ? this.nameplate.position.y + 0.25 : curH + 0.35);
            this.bubbleSprite.position.y = topY;
          }

          const curZ = THREE.MathUtils.lerp(startZ, altarZ, ease);
          this.root.position.x = startX + stepSwayX;
          this.root.position.z = curZ;

          // Golden Sacred Lotus Footstep Ripples along Red Carpet
          if (!this._lastStepZ || Math.abs(this._lastStepZ - curZ) > 1.25) {
            this._lastStepZ = curZ;
            createCarpetRipple(0, 0.05, curZ, 0xffd700);
          }

          if (p >= 1.0) {
            clearInterval(this._walkTimer);
            this._walkTimer = null;
            this._lastStepZ = null;
            this.root.position.x = startX;
            this.charSprite.material.rotation = 0;
            this.charSprite.position.y = 0.05;

            // Smoothly settle into kneel before commencing the altar ritual
            const kneelDuration = Math.round(160 / effSpeed);
            this.smoothPoseTransition('kneel', kneelDuration, () => {
              if (this._ritualRunId !== myRunId) return;
              executeStageRitual(this, ritualType, donorName, giftInfo, () => {
                if (this._ritualRunId !== myRunId) return;
                // Fade & clean up gift badge and any lingering bubble
                if (this.giftBadgeSprite) {
                  safeDisposeSprite(this.giftBadgeSprite);
                  if (this.giftBadgeSprite.parent) this.root.remove(this.giftBadgeSprite);
                  this.giftBadgeSprite = null;
                }
                cleanAllBubblesFromDisciple(this);

                // Smoothly stand up before walking back to seat
                const returnBoost = stageActionQueue.length > 2 ? 2.2 : (stageActionQueue.length > 0 ? 1.6 : safeSpeedMult);
                const standDuration = Math.round(150 / Math.max(1.0, returnBoost));
                this.smoothPoseTransition('walk', standDuration, () => {
                  if (this._ritualRunId !== myRunId) return;
                  let seatT = 0;
                  this.walkPhaseTime = 0;
                  const rWalk = (spriteRatios[this.typeKey] || spriteRatios.female_buns).walk || 0.45;
                  const baseWalkH = POSE_H.walk * CHIBI_SCALE;
                  const randRetArc = (Math.random() - 0.5) * 0.15;
                  const randRetCadence = 7.8 + (Math.random() - 0.5) * 1.2;
                  const randRetSpeedVar = (Math.random() - 0.5) * 0.2;

                  this._returnTimer = setInterval(() => {
                    try {
                      if (this._ritualRunId !== myRunId) {
                        clearInterval(this._returnTimer);
                        this._returnTimer = null;
                        return;
                      }
                      const dt2 = 0.016;
                      const curQ = stageActionQueue.length;
                      const curRetSpeed = Math.max(safeSpeedMult, curQ > 2 ? 2.3 : (curQ > 0 ? 1.75 : 1.0));
                      // Fast return: 1.1s - 1.3s (down from 2.0s)
                      const returnDuration = Math.max(0.65, (1.18 + randRetSpeedVar) / curRetSpeed);

                      seatT += dt2 / returnDuration;
                      this.walkPhaseTime += dt2 * Math.min(1.6, Math.sqrt(curRetSpeed));
                      const sp = Math.min(seatT, 1.0);
                      const sEase = sp * sp * (3 - 2 * sp);
                      const sEnv = Math.sin(sp * Math.PI);

                      const sPhase = this.walkPhaseTime * randRetCadence;
                      const sCycle = 0.5 - 0.5 * Math.cos(sPhase * 2.0);
                      const sBob = sCycle * 0.015 * (0.3 + 0.7 * sEnv);
                      this.charSprite.position.y = 0.05 + sBob;
                      this.charSprite.material.rotation = Math.sin(sPhase) * 0.018 * sEnv;

                      const stretch = 1.0 + (sCycle - 0.5) * 0.020 * sEnv;
                      const wScale = baseWalkH * rWalk * (2.0 - stretch);
                      this.charSprite.scale.set(wScale, baseWalkH * stretch, 1);

                      const targetFinalX = (this.finalPos && typeof this.finalPos.x === 'number') ? this.finalPos.x : 0;
                      const targetFinalZ = (this.finalPos && typeof this.finalPos.z === 'number') ? this.finalPos.z : 6.0;

                      this.root.position.x = THREE.MathUtils.lerp(0, targetFinalX, sEase) + Math.sin(sp * Math.PI) * randRetArc;
                      this.root.position.z = THREE.MathUtils.lerp(altarZ, targetFinalZ, sEase);

                      if (sp >= 1.0) {
                        clearInterval(this._returnTimer);
                        this._returnTimer = null;
                        this.charSprite.material.rotation = 0;
                        this.charSprite.position.y = 0.05;
                        this.root.position.set(targetFinalX, (this.finalPos?.y || 0.05), targetFinalZ);
                        const finalTargetPose = (this.finalPos && this.finalPos.standing) ? 'walk' : 'kneel';
                        this.smoothPoseTransition(finalTargetPose, 140, () => {
                          if (this._ritualRunId !== myRunId) return;
                          this.isWalking = false;
                          this.isPerformingAltarRitual = false;
                          cleanAllBubblesFromDisciple(this);
                          if (this._pendingEvict) {
                            if (this.nameplate && this.nameplate.parent) this.root.remove(this.nameplate);
                            cleanAllBubblesFromDisciple(this);
                            if (this.root.parent) disciplesGroup.remove(this.root);
                            disciplesMap.delete(this.userData?.seatId);
                          }
                          if (typeof onFinish === 'function') onFinish();
                        });
                      }
                    } catch (retErr) {
                      console.error('[returnTimer] Error:', retErr);
                      clearInterval(this._returnTimer);
                      this._returnTimer = null;
                      this.isWalking = false;
                      this.isPerformingAltarRitual = false;
                      if (typeof onFinish === 'function') onFinish();
                    }
                  }, 16);
                });
              });
            });
          }
        } catch (walkErr) {
          console.error('[walkTimer] Error:', walkErr);
          clearInterval(this._walkTimer);
          this._walkTimer = null;
          this.isWalking = false;
          this.isPerformingAltarRitual = false;
          if (typeof onFinish === 'function') onFinish();
        }
      }, 16);
    },

    // ── Smooth Glide/Walk to New Seat (e.g. Promoted to Front Golden Mats) ──
    moveToNewSeat(newSeatId, onComplete) {
      const targetLayout = congregationLayout[newSeatId % TOTAL_SEATS];
      if (!targetLayout) return;

      const targetX = targetLayout.x;
      const targetZ = targetLayout.z;

      this.finalPos = { x: targetX, y: targetLayout.y, z: targetZ, standing: targetLayout.standing, isVip: targetLayout.isVip };
      if (this.userData) this.userData.seatId = newSeatId;

      // Update nameplate VIP styling only when VIP status actually changes
      const isVip = (newSeatId < 5);
      const wasVip = Boolean(this.userData && this.userData.seatId !== undefined && this.userData.seatId < 5);
      if (this.nameplate && this.userData && (isVip !== wasVip)) {
        if (this.nameplate.parent) {
          try { this.nameplate.parent.remove(this.nameplate); } catch (_) { }
        }
        safeDisposeSprite(this.nameplate);
        this.nameplate = createNameplateSprite(this.userData.nickname || 'ผู้เจริญสติ', isVip, targetZ, false, this.userData.avatar);
        this.nameplate.position.y = (this.baseH || 0.45) + (isVip ? 0.04 : 0.07);
        this.root.add(this.nameplate);
      } else if (this.nameplate) {
        const isOuter = (newSeatId >= 12);
        this.nameplate.position.y = (this.baseH || 0.45) + (isOuter ? 0.07 : 0.04);
      }

      // If actor is currently in the middle of walkToAltarAndKowtow ritual, DO NOT interrupt their walking or altar ritual!
      // They will smoothly return to this.finalPos when their ritual completes!
      if (this.isPerformingAltarRitual) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      // Clear any prior seat move timer to prevent interval collision
      if (this._moveTimer) {
        clearInterval(this._moveTimer);
        this._moveTimer = null;
      }

      const startX = this.root.position.x;
      const startZ = this.root.position.z;

      // If already at position, update pose and return
      if (Math.hypot(startX - targetX, startZ - targetZ) < 0.1) {
        this.root.position.set(targetX, targetLayout.y, targetZ);
        const finalPose = targetLayout.standing ? 'walk' : 'kneel';
        this.smoothPoseTransition(finalPose, 110, () => {
          this.isWalking = false;
          this.isMovingSeat = false;
          if (typeof onComplete === 'function') onComplete();
        });
        return;
      }

      // Fast, Agile & Randomized Walk Transition to new seat (สลับที่นั่งไวและไม่ซ้ำเส้นทาง)
      this.isWalking = true;
      this.isMovingSeat = true;
      this._hasCrossedCenterCarpet = false;
      this.smoothPoseTransition('walk', 90, () => {
        let t = 0;
        const dur = 0.75 + Math.random() * 0.35; // Brisk 0.75s - 1.10s agile seat crossing!
        const crossArc = (Math.random() - 0.5) * 0.22; // Random organic arc across aisle
        const crossCadence = 11.6 + (Math.random() - 0.5) * 1.5;
        this.walkPhaseTime = 0;
        const rWalk = (spriteRatios[this.typeKey] || spriteRatios.female_buns).walk || 0.45;
        const baseWalkH = POSE_H.walk * CHIBI_SCALE;
        this._moveTimer = setInterval(() => {
          t += 0.016 / dur;
          this.walkPhaseTime += 0.016;
          const p = Math.min(t, 1.0);
          const ease = p * p * (3 - 2 * p);
          const env = Math.sin(p * Math.PI);

          const phase = this.walkPhaseTime * crossCadence; // Rapid, agile stride cadence
          const cycle = 0.5 - 0.5 * Math.cos(phase * 2.0);
          this.charSprite.position.y = 0.05 + cycle * 0.017 * (0.3 + 0.7 * env);
          this.charSprite.material.rotation = Math.sin(phase) * 0.020 * env;

          const stretch = 1.0 + (cycle - 0.5) * 0.024 * env;
          this.charSprite.scale.set(baseWalkH * rWalk * (2.0 - stretch), baseWalkH * stretch, 1);

          const curX = THREE.MathUtils.lerp(startX, targetX, ease) + Math.sin(p * Math.PI) * crossArc;
          const curZ = THREE.MathUtils.lerp(startZ, targetZ, ease);
          this.root.position.x = curX;
          this.root.position.z = curZ;

          // Subtle ripple when stepping across central red carpet aisle
          if (!this._hasCrossedCenterCarpet && Math.abs(curX) < 0.25) {
            this._hasCrossedCenterCarpet = true;
            if (typeof createCarpetRipple === 'function') {
              createCarpetRipple(curX, 0.05, curZ, 0xffd700);
            }
          }

          if (p >= 1.0) {
            clearInterval(this._moveTimer);
            this._moveTimer = null;
            this.charSprite.material.rotation = 0;
            this.charSprite.position.y = 0.05;
            this.root.position.set(targetX, targetLayout.y, targetZ);
            const finalPose = targetLayout.standing ? 'walk' : 'kneel';
            this.smoothPoseTransition(finalPose, 100, () => {
              this.isWalking = false;
              this.isMovingSeat = false;
              if (typeof onComplete === 'function') onComplete();
            });
          }
        }, 16);
      });
    }
  };
  disciplesMap.set(sId, discipleObj);
  if (typeof updateViewerCount === 'function') updateViewerCount();

  if (autoWalk) {
    discipleObj.walkToAltarAndKowtow('kowtow');
  } else {
    modelParts.root.position.set(finalPos.x, finalPos.y, finalPos.z);
    modelParts.root.rotation.y = targetAngle; // Respectfully faces Guan Yin Altar

  }

  return discipleObj;
}

// WebGL VRAM & Texture Garbage Collection Guard (24/7 Leak Prevention)
function safeDisposeSprite(sprite) {
  if (!sprite) return;
  if (sprite._popTimer) {
    clearInterval(sprite._popTimer);
    sprite._popTimer = null;
  }
  if (sprite.material) {
    if (sprite.material.map) {
      try { sprite.material.map.dispose(); } catch (_) { }
    }
    try { sprite.material.dispose(); } catch (_) { }
  }
  if (sprite.parent) {
    sprite.parent.remove(sprite);
  }
}

// Global Speech Bubble Manager: Clean sanctuary with dynamically managed bubbles
const activeSpeechBubbles = [];
function getMaxActiveBubbles() {
  return 4; // Allow up to 4 concurrent speech bubbles so multiple devotees can share prayers smoothly
}

function cleanAllBubblesFromDisciple(disciple) {
  if (!disciple || !disciple.root) return;
  // Scan all children of disciple.root and cleanly purge any speech bubble
  for (let i = disciple.root.children.length - 1; i >= 0; i--) {
    const child = disciple.root.children[i];
    if (child && (child.isSpeechBubble || child.isBubble || child === disciple.bubbleSprite)) {
      if (child._popInterval) { clearInterval(child._popInterval); child._popInterval = null; }
      if (child._fadeTimer) { clearTimeout(child._fadeTimer); child._fadeTimer = null; }
      if (child._fadeInterval) { clearInterval(child._fadeInterval); child._fadeInterval = null; }
      safeDisposeSprite(child);
      disciple.root.remove(child);
    }
  }
  disciple.bubbleSprite = null;
  const idx = activeSpeechBubbles.indexOf(disciple);
  if (idx !== -1) activeSpeechBubbles.splice(idx, 1);
}

function removeDiscipleBubble(disciple) {
  cleanAllBubblesFromDisciple(disciple);
}

function showDiscipleComment(target, comment, isHuman = true) {
  if (!comment || typeof comment !== 'string' || !comment.trim()) return;
  let disciple = null;
  if (target && typeof target === 'object' && target.root) {
    disciple = target;
  } else if (typeof target === 'number' || typeof target === 'string') {
    const sId = Number(target);
    disciple = disciplesMap.get(sId) || disciplesMap.get(sId % TOTAL_SEATS);
  }
  if (!disciple && disciplesMap.size > 0) {
    // Fallback: pick any seated devotee in scene
    disciple = disciplesMap.values().next().value;
  }
  if (!disciple || !disciple.root) return;

  // 1. Thoroughly purge any previous bubble on this disciple
  cleanAllBubblesFromDisciple(disciple);

  // 2. Global Concurrency Limiter:
  // Allow up to 4 concurrent speech bubbles. If over capacity, evict bot bubbles first before real human bubbles.
  const maxBubbles = getMaxActiveBubbles();
  while (activeSpeechBubbles.length >= maxBubbles) {
    const botIdx = activeSpeechBubbles.findIndex(d => d.userData?.isInitial || !d.userData?.isRealViewer);
    if (botIdx !== -1) {
      const botD = activeSpeechBubbles.splice(botIdx, 1)[0];
      cleanAllBubblesFromDisciple(botD);
    } else {
      const oldest = activeSpeechBubbles.shift();
      cleanAllBubblesFromDisciple(oldest);
    }
  }

  const name = disciple.userData?.nickname || '';
  const bubble = createPrayerSpeechBubble(name, comment.trim());
  if (!bubble) return;
  bubble.isSpeechBubble = true;
  bubble.userData.isHuman = isHuman;

  // Calculate bubbleY strictly above nameplate (and above gift badge if visible) so it NEVER collides
  const plateY = (disciple.nameplate && disciple.nameplate.position)
    ? disciple.nameplate.position.y
    : ((disciple.baseH || 0.45) + 0.05);
  const plateH = disciple.nameplate?.userData?.baseScale?.y || 0.22;

  let bubbleY = plateY + plateH + 0.05;
  if (disciple.giftBadgeSprite && disciple.giftBadgeSprite.visible) {
    const badgeH = disciple.giftBadgeSprite.userData?.baseH || 0.185;
    bubbleY = Math.max(bubbleY, disciple.giftBadgeSprite.position.y + badgeH + 0.05);
  }
  bubble.position.set(0, bubbleY, 0);

  disciple.root.add(bubble);
  disciple.bubbleSprite = bubble;
  activeSpeechBubbles.push(disciple);

  // Smooth elastic pop-in animation using dynamic baseScale
  const targetScaleX = bubble.userData?.baseScale?.x || 0.85;
  const targetScaleY = bubble.userData?.baseScale?.y || 0.32;
  bubble.scale.set(0.01, 0.01, 1);
  let popT = 0;
  bubble._popInterval = setInterval(() => {
    popT += 0.12;
    const s = Math.min(popT, 1.0);
    const ease = 1 + 2.70158 * Math.pow(s - 1, 3) + 1.70158 * Math.pow(s - 1, 2);
    if (bubble.parent) {
      bubble.scale.set(targetScaleX * ease, targetScaleY * ease, 1);
    }
    if (s >= 1.0) {
      clearInterval(bubble._popInterval);
      bubble._popInterval = null;
      if (bubble.parent) bubble.scale.set(targetScaleX, targetScaleY, 1);
    }
  }, 16);

  // Generous 4.5 seconds display time, then smooth fade-out and absolute self-disposal
  bubble._fadeTimer = setTimeout(() => {
    let fadeT = 1.0;
    bubble._fadeInterval = setInterval(() => {
      fadeT -= 0.12;
      if (fadeT <= 0) {
        clearInterval(bubble._fadeInterval);
        bubble._fadeInterval = null;
        if (bubble.parent) bubble.parent.remove(bubble);
        safeDisposeSprite(bubble);
        if (disciple.bubbleSprite === bubble) disciple.bubbleSprite = null;
        const bIdx = activeSpeechBubbles.indexOf(disciple);
        if (bIdx !== -1) activeSpeechBubbles.splice(bIdx, 1);
      } else if (bubble.material) {
        bubble.material.opacity = Math.max(0, fadeT);
      }
    }, 30);
  }, 4500);
}

// ---------------------------------------------------------------------
// 4. Visual Effects (Incense & Holy Smoke, Sacred Blooming Lotus, Divine Petal Rain)
// ---------------------------------------------------------------------

// ── Tier 1.5: Royal Seam-Si Divination Cylinder & Imperial Fortune Cards (🎋 / รักนะมากๆ 1 เหรียญ) ──
const SEAMSI_FORTUNES = [
  {
    id: 1,
    stickTitle: 'เลขที่ 1',
    verse: 'ใบที่หนึ่งดั่งอรุณเบิกฟ้า\nส่องสว่างนำพาสิริมงคล\nคิดการใดสำเร็จทุกแห่งหน\nทรัพย์หลั่งไหลบันดาลดลสุขเปรมปรีดิ์\nมีผู้ใหญ่เมตตาเอ็นดูช่วย\nชีวิตรวยราบรื่นชื่นชีวา',
    wealth: 'มหาโชคลาภใหญ่ รับทรัพย์ก้อนโต',
    voiceBlessing: 'มหาโชคลาภใหญ่ รับทรัพย์ก้อนโตนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 1 มหาโชคลาภสูงสุด เงินทองไหลมาเทมา ✨'
  },
  {
    id: 2,
    stickTitle: 'เลขที่ 2',
    verse: 'ใบที่สองจันทร์เพ็ญกระจ่างฟ้า\nวาสนานำพากัลยาณมิตร\nร่วมเดินทางร่วมสร้างตามดวงจิต\nไร้ผองภัยชีวิตสุดรื่นรมย์\nการค้าขายเงินทองมีงอกเงย\nเหมือนดั่งเคยหวังไว้ได้ชื่นชม',
    wealth: 'โชคลาภไหลเข้าสองทาง ค้าขายดี',
    voiceBlessing: 'โชคลาภไหลเข้าสองทาง ค้าขายดีนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 2 โชคลาภทวีคูณ กัลยาณมิตรหนุนนำ ✨'
  },
  {
    id: 3,
    stickTitle: 'เลขที่ 3',
    verse: 'ใบที่สามงามเด่นเหนือดั่งแก้ว\nทุกข์ผ่านแคล้วคลาดพ้นอันตราย\nที่ติดขัดคลี่คลายสบายกาย\nมีโชคใหญ่ทักทายในเร็ววัน\nปลดเปลื้องหนี้มีทรัพย์รับเงินทอง\nสมดั่งปองตามจิตนิมิตฝัน',
    wealth: 'มีเกณฑ์รับลาภลอย ปลดหนี้มีกำไร',
    voiceBlessing: 'รับลาภลอย ปลดหนี้มีกำไรนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 3 รับลาภลอยมงคล ปลดหนี้มีกำไร ✨'
  },
  {
    id: 4,
    stickTitle: 'เลขที่ 4',
    verse: 'ใบที่สี่ปัญญาดุจดั่งแสง\nพลังแห่งความดีช่วยเกื้อหนุน\nทำการใดรุ่งเรืองด้วยผลบุญ\nมีผู้การุณย์คอยพยุงค้ำจุน\nเรื่องการเรียนการงานผ่านฉลุย\nสิ่งมืดมัวหายลุยพบทางสว่าง',
    wealth: 'การงานราบรื่น สำเร็จสมหวัง',
    voiceBlessing: 'การงานราบรื่น ผู้ใหญ่เมตตาหนุนนำนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 4 การงานก้าวหน้า ปัญญาสว่างไสว ✨'
  },
  {
    id: 5,
    stickTitle: 'เลขที่ 5',
    verse: 'ใบที่ห้าเบญจทรัพย์มหาศาล\nบันดาลผ่านความมั่งคั่งมั่งมี\nเปิดคลังทองรับลาภบารมี\nการเงินดีไหลคล่องมิขาดสาย\nสุขภาพแข็งแรงไร้โรคา\nเทวดาคุ้มเกล้าเฝ้าดูแล',
    wealth: 'เปิดคลังทรัพย์ หยิบจับเป็นเงินทอง',
    voiceBlessing: 'เปิดคลังทรัพย์ หยิบจับเป็นเงินทองนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 5 เปิดคลังทรัพย์มหาเศรษฐี มั่งคั่งยั่งยืน ✨'
  },
  {
    id: 6,
    stickTitle: 'เลขที่ 6',
    verse: 'ใบที่หกดั่งธารน้ำเย็นฉ่ำ\nธรรมะนำดวงจิตชิดความสุข\nหมดสิ้นเรื่องหม่นหมองผองความทุกข์\nเริ่มสนุกกับงานที่ทำไป\nครอบครัวรักใคร่ปรองดองดี\nนับแต่นี้สุขล้ำสำราญใจ',
    wealth: 'ครอบครัวร่มเย็น การเงินมั่นคง',
    voiceBlessing: 'ครอบครัวร่มเย็น การเงินมั่นคงนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 6 ร่มเย็นเป็นสุข ปราศจากทุกข์โศก ✨'
  },
  {
    id: 7,
    stickTitle: 'เลขที่ 7',
    verse: 'ใบที่เจ็ดเพชรงามเรืองประกาย\nเรื่องร้ายกลายกลับเป็นเรื่องมงคล\nความอดทนสร้างฐานะมั่นคง\nได้ผลตรงดั่งหวังตั้งใจเพียร\nลูกค้าหลั่งไหลมารุมซื้อ\nชื่อเสียงลือเลื่องไกลกำไรงาม',
    wealth: 'ค้าขายรุ่งเรือง กำไรงอกเงย',
    voiceBlessing: 'ค้าขายรุ่งเรือง กำไรงอกเงยนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 7 กิจการรุ่งเรือง ลูกค้าหลั่งไหล ✨'
  },
  {
    id: 8,
    stickTitle: 'เลขที่ 8',
    verse: 'หากชีวิตเจอคลื่นลม\nขอให้ใจมั่นไม่หวั่นไหว\nอดทนอีกเพียงสักนิด\nฟ้าหลังฝนจะสดใส\nมีคนดีช่วยประคอง\nขอพบฝั่งแห่งสุข',
    wealth: 'ฟ้าหลังฝนสดใส พ้นอุปสรรครับโชคใหญ่',
    voiceBlessing: 'ฟ้าหลังฝนสดใส มีคนดีช่วยประคองพบสุขนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 8 ฟ้าหลังฝนสดใส ข้ามพบฝั่งแห่งสุข ✨'
  },
  {
    id: 9,
    stickTitle: 'เลขที่ 9',
    verse: 'ใบที่เก้านพเก้ามิ่งมงคล\nบันดาลดลเลื่อนยศตำแหน่งใหญ่\nก้าวหน้าล้ำเลิศเกินใครๆ\nชื่อเสียงไกลก้องหล้าเกียรติขจร\nบริวารจงรักภักดียิ่ง\nสำเร็จจริงดั่งใจในคำพร',
    wealth: 'ดวงการงานพุ่งทะยาน รับโชคก้อนโต',
    voiceBlessing: 'ดวงการงานพุ่งรุ่งโรจน์ รับทรัพย์ใหญ่นะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 9 นพเก้ามงคล ก้าวหน้าสูงสุด ✨'
  },
  {
    id: 10,
    stickTitle: 'เลขที่ 10',
    verse: 'ใบที่สิบดอกรักบานสะพรั่ง\nใจเปี่ยมพลังพบเนื้อคู่แท้\nคนรักดีอบอุ่นคอยดูแล\nรักแน่วแน่มั่นคงนิรันดร\nช่วยกันสร้างหลักฐานและเงินทอง\nสมดั่งปองครอบครัวสุขสถาพร',
    wealth: 'ความรักสมหวัง การเงินหนุนเนื่อง',
    voiceBlessing: 'ความรักสมหวัง เงินทองหนุนเนื่องนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 10 พบรักแท้สมหวัง ครอบครัวอบอุ่น ✨'
  },
  {
    id: 11,
    stickTitle: 'เลขที่ 11',
    verse: 'ใบสิบเอ็ดดั่งนาวาข้ามสมุทร\nลมหนุนฉุดถึงฝั่งอย่างปลอดภัย\nสิ่งศักดิ์สิทธิ์ปกป้องคุ้มครองใจ\nพ้นโพยภัยทั้งหลายในโลกา\nคิดลงทุนสิ่งใดได้ดอกผล\nเกิดมงคลร่ำรวยไม่รู้คลาย',
    wealth: 'การลงทุนสัมฤทธิ์ผล กำไรพูนทวี',
    voiceBlessing: 'การลงทุนสัมฤทธิ์ผล กำไรพูนทวีนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 11 แคล้วคลาดปลอดภัย ลงทุนได้กำไร ✨'
  },
  {
    id: 12,
    stickTitle: 'เลขที่ 12',
    verse: 'ใบสิบสองทองคำส่องอำไพ\nเปิดทางใหญ่รับทรัพย์อันโอฬาร\nจักรพรรดิประทานพรตระการ\nบันดาลผ่านความสุขทุกคืนวัน\nเงินทองมีใช้ไม่ขัดสน\nสุขล้นพ้นดั่งใจหมายจำนรรจ์',
    wealth: 'ดวงการเงินพุ่ง รับทรัพย์ใหญ่ทันใจ',
    voiceBlessing: 'ดวงการเงินพุ่ง รับทรัพย์ใหญ่ทันใจนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 12 จักรพรรดิประทานพร ร่ำรวยมหาศาล ✨'
  },
  {
    id: 13,
    stickTitle: 'เลขที่ 13',
    verse: 'ใบสิบสามบัวแก้วผุดพ้นน้ำ\nบุญชักนำจิตผ่องไม่ด่างพร้อย\nลาภก้อนโตที่ตั้งตารอคอย\nไม่ลอยคล้อยเคลื่อนหลุดหล่นหายไป\nพบคนดีชี้ช่องทางทำกิน\nหมดมลทินสุขเกษมเปรมปรีดา',
    wealth: 'รับลาภก้อนโต พบช่องทางเศรษฐี',
    voiceBlessing: 'รับลาภก้อนโต พบช่องทางเศรษฐีนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 13 บัวแก้วผุดพ้นน้ำ รับลาภก้อนโต ✨'
  },
  {
    id: 14,
    stickTitle: 'เลขที่ 14',
    verse: 'ใบสิบสี่เมฆหมอกสลายสิ้น\nได้ยินยินแต่ข่าวดีมีโชค\nคลายกังวลพ้นผ่านเรื่องเศร้าโศก\nรับโชคลอยเข้ามาถึงหน้าเรือน\nมีผู้หลักผู้ใหญ่คอยหนุนนำ\nสิ่งดีล้ำไม่ร้างไม่ห่างเลือน',
    wealth: 'ได้รับข่าวดี มีลาภลอยถึงบ้าน',
    voiceBlessing: 'ได้รับข่าวดี มีโชคลาภถึงบ้านนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 14 ข่าวดีนำโชค เมฆหมอกสลายสิ้น ✨'
  },
  {
    id: 15,
    stickTitle: 'เลขที่ 15',
    verse: 'ใบสิบห้าพระจันทร์เต็มดวงเด่น\nร่มเย็นทั้งกายใจไร้ปัญหา\nมีลาภผลหลั่งไหลจากทิศา\nวาสนานำพาสู่รวยล้น\nความซื่อสัตย์กตัญญูพาเฟื่องฟู\nเชิดชูวงศ์ตระกูลอุดมทรัพย์',
    wealth: 'เงินทองไหลเข้าทุกทิศ ร่ำรวยไม่ขาดสาย',
    voiceBlessing: 'เงินทองไหลเข้าทุกทิศ ร่ำรวยไม่ขาดสายนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 15 ดวงจันทร์เพ็ญเต็มดวง ร่ำรวยร่มเย็น ✨'
  },
  {
    id: 16,
    stickTitle: 'เลขที่ 16',
    verse: 'ใบสิบหกเดินทางไกลได้ลาภ\nสิ่งราบรื่นตามรอยคอยประสิทธิ์\nพบปะใครเป็นมิตรสนิทจิต\nช่วยชุบชีวิตให้รุ่งเรืองรอง\nมีเกียรติยศชื่อเสียงดังไกล\nหยิบสิ่งใดสำเร็จดั่งใจปอง',
    wealth: 'เดินทางราบรื่น ได้ลาภจากแดนไกล',
    voiceBlessing: 'เดินทางราบรื่น ได้ลาภจากแดนไกลนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 16 เดินทางปลอดภัย ได้ลาภต่างแดน ✨'
  },
  {
    id: 17,
    stickTitle: 'เลขที่ 17',
    verse: 'ใบสิบเจ็ดดั่งทองแท้ผ่านไฟ\nสุกใสยิ่งกว่าเก่าเท่าทวี\nผ่านอุปสรรคพบสิ่งดี\nบารมีนำพาสู่ชัยชนะ\nศัตรูพ่ายแพ้ภัยตนเอง\nหมดสิ่งเกรงใจมั่นไม่หวั่นกลัว',
    wealth: 'ชนะอุปสรรค มั่งคั่งมั่นคงยิ่งขึ้น',
    voiceBlessing: 'ชนะอุปสรรค มั่งคั่งมั่นคงยิ่งขึ้นนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 17 ทองแท้ไม่กลัวไฟ มีชัยเหนืออุปสรรค ✨'
  },
  {
    id: 18,
    stickTitle: 'เลขที่ 18',
    verse: 'ใบสิบแปดแปดทิศประสิทธิ์ผล\nความทุกข์ทนจางหายกลายเป็นสุข\nหมดเคราะห์โศกพ้นผ่านทุกข์\nรับโชครุกเข้าหาทุกนาที\nค้าขายคล่องเงินทองเข้าเต็มเป๋า\nชีวิตเบาไร้กังวลทุกเรื่องราว',
    wealth: 'เงินไหลเข้าแปดทิศ หมดเคราะห์รับโชค',
    voiceBlessing: 'เงินไหลเข้าแปดทิศ หมดเคราะห์รับโชคนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 18 โชคลาภแปดทิศ ค้าขายเงินทองเต็มเป๋า ✨'
  },
  {
    id: 19,
    stickTitle: 'เลขที่ 19',
    verse: 'ใบสิบเก้าหงส์ทองคู่มังกร\nสถิตพรสง่างามอร่ามศรี\nทั้งอำนาจวาสนาบารมี\nนับแต่นี้พรั่งพร้อมด้วยเงินตรา\nคนรักใคร่เมตตาอุปถัมภ์\nสุขดื่มด่ำดั่งหมายในอุรา',
    wealth: 'วาสนาเศรษฐี โชคใหญ่หลั่งไหล',
    voiceBlessing: 'วาสนาเศรษฐี โชคใหญ่หลั่งไหลนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 19 หงส์ทองคู่มังกร วาสนาเศรษฐี ✨'
  },
  {
    id: 20,
    stickTitle: 'เลขที่ 20',
    verse: 'ใบยี่สิบต้นไม้ใหญ่ใบหนา\nแผ่ร่มเงาบังแดดลมฝนหนาว\nชีวิตนิ่งสงบดั่งดวงดาว\nผ่านเรื่องราวร้ายๆ ได้งดงาม\nมีหลักแหล่งมั่นคงไม่โยกคลอน\nพักผ่อนกายใจได้แสนสบาย',
    wealth: 'ฐานะมั่นคง มีบ้านเรือนหลักแหล่ง',
    voiceBlessing: 'ฐานะมั่นคง สุขสบายร่มเย็นนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 20 ร่มเย็นเป็นสุข ฐานะมั่นคงถาวร ✨'
  },
  {
    id: 21,
    stickTitle: 'เลขที่ 21',
    verse: 'ใบยี่สิบเอ็ดดั่งแก้วสารพัดนึก\nจิตสำนึกคิดดีพาเลิศล้ำ\nมีเทวดาคอยช่วยชี้นำ\nบุญกุศลหนุนเนื่องเรืองอร่าม\nรับลาภลอยก้อนใหญ่ในเร็ววัน\nสุขอนันต์เงินทองไม่ขาดมือ',
    wealth: 'รับลาภก้อนใหญ่ เงินทองไม่ขาดมือ',
    voiceBlessing: 'รับลาภก้อนใหญ่ เงินทองไม่ขาดมือนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 21 แก้วสารพัดนึก สมปรารถนาทุกสิ่ง ✨'
  },
  {
    id: 22,
    stickTitle: 'เลขที่ 22',
    verse: 'ใบยี่สิบสองนกคู่บินเคียงฟ้า\nเสน่หาเมตตามหานิยม\nพูดจาหวานใครฟังก็ชื่นชม\nสุขสมปรารถนาในความรัก\nการเจรจาราบรื่นได้ผลดี\nสร้างไมตรีมีแต่คนคอยหนุน',
    wealth: 'เมตตามหานิยม เจรจาค้าขายสำเร็จ',
    voiceBlessing: 'เมตตามหานิยม เจรจาค้าขายสำเร็จนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 22 เจรจาสำเร็จ เมตตามหานิยม ✨'
  },
  {
    id: 23,
    stickTitle: 'เลขที่ 23',
    verse: 'ใบยี่สิบสามลมหนุนส่งใบเรือ\nเอื้อเฟื้อเผื่อแผ่ช่วยค้ำจุน\nได้รับผลตอบแทนด้วยใบบุญ\nใจอบอุ่นเงินทองงอกเงยงาม\nอุปสรรคที่เคยมีคลี่คลายหมด\nฟ้ากำหนดให้พบแต่ความเจริญ',
    wealth: 'มีคนคอยค้ำจุน อุปสรรคคลี่คลาย',
    voiceBlessing: 'มีคนคอยค้ำจุน อุปสรรคคลี่คลายนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 23 ลมหนุนส่งเรือ อุปสรรคผ่านพ้น ✨'
  },
  {
    id: 24,
    stickTitle: 'เลขที่ 24',
    verse: 'ใบยี่สิบสี่ฤดูใบไม้ผลิ\nเริ่มผลิบานความหวังครั้งใหม่\nสิ่งสดชื่นรื่นรมย์สมดั่งใจ\nโรคร้ายใดถอยห่างไม่รังควาน\nการลงทุนครั้งใหม่ได้งอกงาม\nผลผลิตตามเป้าหมายได้เกินคาด',
    wealth: 'การลงทุนงอกงาม ได้ผลเกินคาด',
    voiceBlessing: 'การลงทุนงอกงาม ได้ผลเกินคาดนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 24 เริ่มต้นสิ่งใหม่ สำเร็จงอกงามเกินคาด ✨'
  },
  {
    id: 25,
    stickTitle: 'เลขที่ 25',
    verse: 'ใบยี่สิบห้าพระแม่กวนอิมโปรด\nประทานโชคแก่ผู้มีจิตใส\nความซื่อตรงจักนำพาโชคใหญ่\nเงินทองไหลมาดั่งสายวารี\nครอบครัวอยู่เย็นเป็นสุขสันต์\nร่วมสร้างฝันก้าวหน้าเจริญรุ่ง',
    wealth: 'พระแม่ประทานพร เงินทองไหลมาเทมา',
    voiceBlessing: 'พระแม่ประทานพร เงินทองไหลมาเทมานะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 25 พระแม่กวนอิมโปรด มั่งคั่งร่มเย็น ✨'
  },
  {
    id: 26,
    stickTitle: 'เลขที่ 26',
    verse: 'ใบยี่สิบหกสายรุ้งหลังสายฝน\nมงคลฉายแสงทองส่องสว่าง\nที่เคยติดเคยขัดเห็นหนทาง\nความอ้างว้างมลายกลายชื่นบาน\nมีคนดีคอยยื่นมือเข้าช่วย\nพาให้รวยพ้นทุกข์สุขสำราญ',
    wealth: 'พ้นเคราะห์รับทรัพย์ มีคนช่วยชี้ทางรวย',
    voiceBlessing: 'พ้นเคราะห์รับทรัพย์ มีคนช่วยชี้ทางรวยนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 26 สายรุ้งนำโชค พ้นทุกข์รับความสุข ✨'
  },
  {
    id: 27,
    stickTitle: 'เลขที่ 27',
    verse: 'ใบยี่สิบเจ็ดดั่งดวงประทีปแก้ว\nส่องสว่างแน่วแน่ไม่ริบหรี่\nนำชีวิตก้าวหน้าในความดี\nพบสิ่งมีค่าเลิศประเสริฐผล\nการเสี่ยงโชคมีลาภไม่คาดคิด\nเพื่อนสนิทนำพาข่าวดีมา',
    wealth: 'มีโชคลาภไม่คาดคิด ได้รับข่าวดี',
    voiceBlessing: 'มีโชคลาภไม่คาดคิด ได้รับข่าวดีนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 27 ดวงประทีปสว่างไสว ลาภลอยไม่คาดคิด ✨'
  },
  {
    id: 28,
    stickTitle: 'เลขที่ 28',
    verse: 'ใบยี่สิบแปดเสียงพิณสวรรค์\nขับกล่อมขวัญให้จิตใจสงบเย็น\nที่เคยเหนื่อยเคยล้าที่เคยเป็น\nจะมองเห็นทางออกอันสดใส\nหนี้สินหมดมีเงินเก็บก้อนโต\nสุขไฮโซมั่งคั่งดั่งราชา',
    wealth: 'หมดหนี้หมดสิน มีเงินเก็บก้อนโต',
    voiceBlessing: 'หมดหนี้หมดสิน มีเงินเก็บก้อนโตนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 28 ปลดเปลื้องหนี้สิน มีเงินเก็บก้อนใหญ่ ✨'
  },
  {
    id: 29,
    stickTitle: 'เลขที่ 29',
    verse: 'ใบยี่สิบเก้าบัวทองชูช่อช้อย\nเกสรลอยหอมฟุ้งจรุงจิต\nสิ่งที่หวังตั้งใจไว้ในชีวิต\nเนรมิตสัมฤทธิ์ผลดั่งมนตรา\nสุขภาพแข็งแรงไร้โรคา\nมีเทวาคอยเฝ้าคุ้มครองกาย',
    wealth: 'สมหวังทุกประการ สุขภาพแข็งแรง',
    voiceBlessing: 'สมหวังทุกประการ สุขภาพแข็งแรงนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 29 บัวทองชูช่อ สมปรารถนาดั่งมนตรา ✨'
  },
  {
    id: 30,
    stickTitle: 'เลขที่ 30',
    verse: 'ใบสามสิบคู่เคียงบารมีเสริม\nบุญเก่าเติมบุญใหม่ให้สดใส\nทำสิ่งใดราบรื่นคล่องว่องไว\nเปิดหัวใจรับความสุขอุดม\nมีบ้านเรือนมั่นคงร่มรื่นเย็น\nไม่ลำเค็ญเงินทองไหลมาเท',
    wealth: 'บารมีหนุนนำ เงินทองไหลมาเทมา',
    voiceBlessing: 'บารมีหนุนนำ เงินทองไหลมาเทมานะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 30 บารมีเสริมส่ง ครอบครัวร่มเย็นเป็นสุข ✨'
  },
  {
    id: 31,
    stickTitle: 'เลขที่ 31',
    verse: 'ใบสามสิบเอ็ดดั่งแก้วมณีรัตน์\nโชติช่วงชัชวาลย์สะท้านหล้า\nมีผู้หลักผู้ใหญ่โปรดเมตตา\nยกย่องหน้าตาให้มีเกียรติยศ\nการค้าการขายกำไรท่วมท้น\nสุขเหลือล้นไม่มีความทุกข์ใจ',
    wealth: 'กำไรท่วมท้น ผู้ใหญ่ยกย่องสรรเสริญ',
    voiceBlessing: 'กำไรท่วมท้น ผู้ใหญ่ยกย่องสรรเสริญนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 31 มณีรัตน์โชติช่วง ค้าขายกำไรท่วมท้น ✨'
  },
  {
    id: 32,
    stickTitle: 'เลขที่ 32',
    verse: 'ใบสามสิบสองฟ้าเปิดสว่างจ้า\nแสงสุริยาฉายส่องลงตรงนี้\nความขยันมั่นเพียรสร้างสิ่งดี\nนับแต่นี้รับทรัพย์นับไม่ทัน\nเรื่องวุ่นวายหายไปดั่งปลิดทิ้ง\nพบสุขจริงสมหวังตามใฝ่ฝัน',
    wealth: 'ฟ้าเปิดรับทรัพย์ นับเงินไม่ทัน',
    voiceBlessing: 'ฟ้าเปิดรับทรัพย์ นับเงินไม่ทันนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 32 ฟ้าเปิดทางสว่าง รับทรัพย์นับไม่ทัน ✨'
  },
  {
    id: 33,
    stickTitle: 'เลขที่ 33',
    verse: 'ใบสามสิบสามเสียงฆ้องระฆังแก้ว\nดังก้องแจ้วบอกบุญบันดาลดล\nสิ่งอธิษฐานเกิดผลทุกตำบล\nไม่มีจนอีกต่อไปในชาตินี้\nจิตแจ่มใสกายาไร้โรคา\nอายุยืนยาวนานนับร้อยปี',
    wealth: 'พ้นความยากจน มีโชคมีชัยตลอดไป',
    voiceBlessing: 'พ้นความยากจน มีโชคมีชัยตลอดไปนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 33 ระฆังแก้วนำชัย พ้นจนอายุยืนยาว ✨'
  },
  {
    id: 34,
    stickTitle: 'เลขที่ 34',
    verse: 'ใบสามสิบสี่ขุมทรัพย์แห่งความเพียร\nจุดเทียนนำส่องทางสว่างไสว\nมุ่งหน้าเดินไปข้างหน้าไร้กังวล\nผลตอบแทนยิ่งใหญ่รออยู่หน้า\nได้บ้านใหม่รถใหม่ดั่งใจหมาย\nสุขสบายร่ำรวยทั้งชีวี',
    wealth: 'ได้บ้านใหม่รถใหม่ ร่ำรวยสุขสบาย',
    voiceBlessing: 'ได้บ้านใหม่รถใหม่ ร่ำรวยสุขสบายนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 34 ขุมทรัพย์ความเพียร ได้บ้านใหม่รถใหม่ ✨'
  },
  {
    id: 35,
    stickTitle: 'เลขที่ 35',
    verse: 'ใบสามสิบห้ากัลยาณมิตรดี\nดั่งมีแก้วสารพัดนึกข้างกายา\nคอยช่วยเหลือยามยากทุกเพลา\nพ้นปัญหาพ้นทุกข์ได้อย่างไว\nมีโชคลาภจากการเสี่ยงมงคล\nสัมฤทธิ์ผลร่ำรวยสุขสมใจ',
    wealth: 'มีโชคลาภมงคล กัลยาณมิตรคอยช่วย',
    voiceBlessing: 'มีโชคลาภมงคล กัลยาณมิตรคอยช่วยเหลือนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 35 มิตรแท้ค้ำจุน โชคลาภมงคลสมใจ ✨'
  },
  {
    id: 36,
    stickTitle: 'เลขที่ 36',
    verse: 'ใบสามสิบหกสุดยอดใบมงคลเอก\nดั่งฟ้าเสกพรประเสริฐให้เลิศล้ำ\nพระแม่กวนอิมทรงโปรดค้ำชูธรรม\nให้พบความรุ่งเรืองไร้เทียมทาน\nทรัพย์สินหลั่งไหลทั้งแปดทิศ\nเนรมิตความสุขชั่วนิรันดร์',
    wealth: 'สุดยอดมหาโชคลาภ ร่ำรวยมหาศาลตลอดกาล',
    voiceBlessing: 'สุดยอดมหาโชคลาภ ร่ำรวยมหาศาลตลอดกาลนะคะ',
    bannerBlessing: 'ได้เซียมซีเลขที่ 36 สุดยอดใบเอก พรพระแม่สัมฤทธิ์ผล ✨'
  }
];

let lastSeamSiIndex = -1;
function drawSeamSiFortune() {
  let idx = Math.floor(Math.random() * SEAMSI_FORTUNES.length);
  if (idx === lastSeamSiIndex && SEAMSI_FORTUNES.length > 1) {
    idx = (idx + 1 + Math.floor(Math.random() * (SEAMSI_FORTUNES.length - 1))) % SEAMSI_FORTUNES.length;
  }
  lastSeamSiIndex = idx;
  const baseFortune = SEAMSI_FORTUNES[idx];

  // Fresh 3-digit random lucky numbers every draw!
  const d1 = Math.floor(Math.random() * 10);
  const d2 = Math.floor(Math.random() * 10);
  const d3 = Math.floor(Math.random() * 10);

  return {
    ...baseFortune,
    lucky3: [d1, d2, d3],
    luckyNumbers: [d1, d2, d3]
  };
}

let seamSiScrollHideTimer = null;
let seamSiScrollToken = 0;
let seamSiTransitionTimer = null;
let luckyNumbersHideTimer = null;
let luckyRollIntervals = [null, null, null];

// Centralized Mutual Exclusion Engine for Ceremony Modals
function hideCeremonyModals({ except = null } = {}) {
  if (seamSiScrollHideTimer) {
    clearTimeout(seamSiScrollHideTimer);
    seamSiScrollHideTimer = null;
  }
  if (seamSiTransitionTimer) {
    clearTimeout(seamSiTransitionTimer);
    seamSiTransitionTimer = null;
  }
  if (luckyNumbersHideTimer) {
    clearTimeout(luckyNumbersHideTimer);
    luckyNumbersHideTimer = null;
  }
  luckyRollIntervals.forEach((t, i) => {
    if (t) clearTimeout(t);
    luckyRollIntervals[i] = null;
  });

  if (except !== 'mvp') {
    const mvpModal = document.getElementById('round-mvp-modal');
    if (mvpModal) {
      mvpModal.classList.remove('active');
      mvpModal.classList.add('hidden');
      mvpModal.style.display = 'none';
    }
  }

  if (except !== 'fortune') {
    const fortuneCard = document.getElementById('seamsi-fortune-card');
    if (fortuneCard) {
      fortuneCard.classList.remove('active');
      fortuneCard.classList.add('hidden');
      fortuneCard.style.display = 'none';
    }
  }

  if (except !== 'lucky') {
    const luckyCard = document.getElementById('seamsi-lucky-card');
    if (luckyCard) {
      luckyCard.classList.remove('active');
      luckyCard.classList.add('hidden');
      luckyCard.style.display = 'none';
      const d1El = document.getElementById('lucky-d1');
      const d2El = document.getElementById('lucky-d2');
      const d3El = document.getElementById('lucky-d3');
      [d1El, d2El, d3El].forEach(el => {
        if (el) {
          el.textContent = '✦';
          el.style.opacity = '0.35';
          el.parentElement?.classList.remove('digit-locked');
        }
      });
    }
  }
}
window.hideCeremonyModals = hideCeremonyModals;

function spawnSeamSiCardSparkles() {
  const layer = document.getElementById('seamsi-sparkle-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const count = 28;
  const symbols = ['✦', '✨', '🪷', '🌟', '🎋', '💛'];
  for (let i = 0; i < count; i++) {
    const sp = document.createElement('span');
    if (i % 3 === 0) {
      sp.className = 'banner-sparkle-particle';
      sp.textContent = symbols[i % symbols.length];
      const angle = (Math.PI * 2 * i) / count;
      const dist = 65 + Math.random() * 95;
      const tx = Math.round(Math.cos(angle) * dist);
      const ty = Math.round(Math.sin(angle) * (dist * 0.85));
      sp.style.setProperty('--sx', '50%');
      sp.style.setProperty('--sy', '50%');
      sp.style.setProperty('--tx', `${tx}px`);
      sp.style.setProperty('--ty', `${ty}px`);
      sp.style.setProperty('--size', `${10 + Math.floor(Math.random() * 6)}px`);
      sp.style.setProperty('--dur', `${(1.1 + Math.random() * 0.6).toFixed(2)}s`);
      sp.style.setProperty('--delay', `${(Math.random() * 0.25).toFixed(2)}s`);
      sp.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 180)}deg`);
      sp.style.setProperty('--sc', '1.2');
    } else {
      sp.className = 'seamsi-sparkle-dot';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const dist = 70 + Math.random() * 155;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * (dist * 0.85);
      const size = 5 + Math.random() * 7;
      const dur = 0.95 + Math.random() * 0.95;
      const delay = Math.random() * 0.35;
      sp.style.left = `${30 + Math.random() * 40}%`;
      sp.style.top = `${25 + Math.random() * 50}%`;
      sp.style.width = `${size}px`;
      sp.style.height = `${size}px`;
      sp.style.setProperty('--sx', `${tx.toFixed(1)}px`);
      sp.style.setProperty('--sy', `${ty.toFixed(1)}px`);
      sp.style.setProperty('--sdur', `${dur.toFixed(2)}s`);
      sp.style.setProperty('--sdelay', `${delay.toFixed(2)}s`);
    }
    layer.appendChild(sp);
  }
}

function spawnLuckySparkles() {
  const layer = document.getElementById('seamsi-lucky-sparkles');
  if (!layer) return;
  layer.innerHTML = '';
  const count = 24;
  const symbols = ['✦', '✨', '🪷', '💰', '🌟', '💛'];
  for (let i = 0; i < count; i++) {
    const sp = document.createElement('span');
    if (i % 2 === 0) {
      sp.className = 'banner-sparkle-particle';
      sp.textContent = symbols[i % symbols.length];
      const angle = (Math.PI * 2 * i) / count;
      const dist = 60 + Math.random() * 95;
      sp.style.setProperty('--sx', '50%');
      sp.style.setProperty('--sy', '50%');
      sp.style.setProperty('--tx', `${Math.round(Math.cos(angle) * dist)}px`);
      sp.style.setProperty('--ty', `${Math.round(Math.sin(angle) * dist)}px`);
      sp.style.setProperty('--size', `${10 + Math.floor(Math.random() * 6)}px`);
      sp.style.setProperty('--dur', `${(1.1 + Math.random() * 0.5).toFixed(2)}s`);
      sp.style.setProperty('--delay', `${(Math.random() * 0.2).toFixed(2)}s`);
      sp.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 160)}deg`);
      sp.style.setProperty('--sc', '1.15');
    } else {
      sp.className = 'seamsi-sparkle-dot';
      const angle = (Math.PI * 2 * i) / count;
      const dist = 65 + Math.random() * 125;
      sp.style.left = '50%';
      sp.style.top = '50%';
      const sz = 5 + Math.random() * 6;
      sp.style.width = `${sz}px`;
      sp.style.height = `${sz}px`;
      sp.style.setProperty('--sx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
      sp.style.setProperty('--sy', `${(Math.sin(angle) * dist).toFixed(1)}px`);
      sp.style.setProperty('--sdur', `${(0.9 + Math.random() * 0.8).toFixed(2)}s`);
      sp.style.setProperty('--sdelay', `${(Math.random() * 0.3).toFixed(2)}s`);
    }
    layer.appendChild(sp);
  }
}

// ── Phase 2 Modal: Royal 3-Digit Lucky Numbers (ตำหนักขุมทรัพย์สวรรค์ - รหัสมงคลประจำวัน) ──
function showLuckyNumbersModal(donorName = 'ผู้มีจิตศรัทธา', fortune = null) {
  // CRITICAL: Immediately hide all other ceremony modals (Fortune card, MVP modal)
  hideCeremonyModals({ except: 'lucky' });

  const luckyCard = document.getElementById('seamsi-lucky-card');
  if (!luckyCard) return;

  const f = fortune || drawSeamSiFortune();
  const cleanDonor = sanitizeDisplayName(donorName, 'ผู้มีจิตศรัทธา');
  const donorEl = document.getElementById('seamsi-lucky-donor-name');
  if (donorEl) donorEl.textContent = `🌿 ${cleanDonor} 🌿`;

  const d1El = document.getElementById('lucky-d1');
  const d2El = document.getElementById('lucky-d2');
  const d3El = document.getElementById('lucky-d3');
  const digits = Array.isArray(f.lucky3) ? f.lucky3 : [Math.floor(Math.random() * 10), Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)];

  // Reset elements with sacred star emblem (avoids slot-machine spinning OCR detection)
  [d1El, d2El, d3El].forEach(el => {
    if (el) {
      el.textContent = '✦';
      el.style.opacity = '0.35';
      el.parentElement?.classList.remove('digit-locked');
    }
  });

  // Display card cleanly
  luckyCard.style.display = 'flex';
  luckyCard.classList.remove('hidden');
  luckyCard.classList.remove('active');
  void luckyCard.offsetWidth;
  luckyCard.classList.add('active');
  spawnLuckySparkles();

  const hideLucky = () => {
    if (luckyNumbersHideTimer) {
      clearTimeout(luckyNumbersHideTimer);
      luckyNumbersHideTimer = null;
    }
    luckyRollIntervals.forEach((t, i) => {
      if (t) clearTimeout(t);
      luckyRollIntervals[i] = null;
    });
    luckyCard.classList.remove('active');
    luckyCard.classList.add('hidden');
    setTimeout(() => {
      if (luckyCard.classList.contains('hidden')) {
        luckyCard.style.display = 'none';
      }
    }, 350);
  };

  const closeBtn = document.getElementById('btn-lucky-close');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      hideLucky();
    };
  }

  // Serene Lotus Glow Reveal for the 3 golden blocks (Zero slot-machine spin -> 100% TikTok AI Safe)
  const revealDigit = (el, finalDigit, revealDelay, isLast = false) => {
    if (!el) return null;
    return setTimeout(() => {
      el.textContent = finalDigit;
      el.style.opacity = '1';
      if (el.parentElement) {
        el.parentElement.classList.remove('digit-locked');
        void el.parentElement.offsetWidth;
        el.parentElement.classList.add('digit-locked');
      }
      if (typeof templeAudio !== 'undefined') {
        if (isLast) {
          templeAudio.playBell(1027, 4.0);
          spawnBannerSparkleBurst('tier-dragon');
          spawnLuckySparkles();
        } else {
          templeAudio.playWoodblock();
        }
      }
    }, revealDelay);
  };

  luckyRollIntervals[0] = revealDigit(d1El, digits[0], 380, false);
  luckyRollIntervals[1] = revealDigit(d2El, digits[1], 760, false);
  luckyRollIntervals[2] = revealDigit(d3El, digits[2], 1140, true);

  // Auto-hide after 5.5s
  luckyNumbersHideTimer = setTimeout(hideLucky, 5500);
}

// ── Phase 1 Modal: Royal Seam-Si Fortune Scroll (ตรงตามแบบรูปที่ 2 — ผู้เล่นอ่านกลอนคำทำนายด้วยตัวเอง) ──
function showSeamSiFortuneScroll(donorName = 'ผู้มีจิตศรัทธา', fortune = null, autoShowLucky = true) {
  // CRITICAL: Immediately hide all other ceremony modals (Lucky card, MVP modal)
  // This guarantees #seamsi-lucky-card is 100% CLOSED and CANNOT block the fortune card!
  hideCeremonyModals({ except: 'fortune' });

  const card = document.getElementById('seamsi-fortune-card');
  if (!card) return;
  const f = fortune || drawSeamSiFortune();

  const stickNumEl = document.getElementById('seamsi-stick-number');
  const verseTextEl = document.getElementById('seamsi-verse-text');
  const cleanDonor = sanitizeDisplayName(donorName, 'ผู้มีจิตศรัทธา');

  if (stickNumEl) stickNumEl.textContent = f.stickTitle;
  if (verseTextEl) verseTextEl.innerHTML = escapeHtml(f.verse).replace(/\n/g, '<br />');

  // Transition to Phase 2 (Lucky 3-digit number card)
  let transitioned = false;
  const transitionToLucky = () => {
    if (transitioned) return;
    transitioned = true;
    if (seamSiScrollHideTimer) {
      clearTimeout(seamSiScrollHideTimer);
      seamSiScrollHideTimer = null;
    }
    card.classList.remove('active');
    card.classList.add('hidden');
    if (seamSiTransitionTimer) clearTimeout(seamSiTransitionTimer);
    seamSiTransitionTimer = setTimeout(() => {
      seamSiTransitionTimer = null;
      card.style.display = 'none';
      // Pop in Phase 2: Lucky Numbers Modal!
      showLuckyNumbersModal(cleanDonor, f);
    }, 280);
  };

  // Wire dismiss button: Only clicking the button explicitly transitions to the lucky numbers card!
  const closeBtn = document.getElementById('btn-seamsi-close');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      transitionToLucky();
    };
  }

  // Guarantee card is display:flex and trigger animation
  card.style.display = 'flex';
  card.classList.remove('hidden');
  card.classList.remove('active');
  void card.offsetWidth;
  card.classList.add('active');
  spawnSeamSiCardSparkles();

  // Auspicious temple chime & bell when fortune scroll unfolds
  if (typeof templeAudio !== 'undefined') {
    if (templeAudio.playBell) templeAudio.playBell(513.6, 3.2);
    if (templeAudio.playLotusChime) templeAudio.playLotusChime();
  }

  // AI Divine Voice: Speak viewer name + stick title + wealth blessing in sync with the unfurling scroll
  if (typeof guanYinVoice !== 'undefined' && guanYinVoice && guanYinVoice.enabled) {
    guanYinVoice.speakSeamSiFortune(cleanDonor, f);
  }

  // Auto-dismiss safety: In unattended live streams, ensure fortune scroll does not stay stuck indefinitely!
  if (seamSiScrollHideTimer) {
    clearTimeout(seamSiScrollHideTimer);
    seamSiScrollHideTimer = null;
  }
  if (autoShowLucky) {
    ++seamSiScrollToken;
    seamSiScrollHideTimer = setTimeout(transitionToLucky, 5500);
  } else {
    // Unattended fallback: Smoothly hide after 8.5 seconds so it never collides with next round
    seamSiScrollHideTimer = setTimeout(() => {
      card.classList.remove('active');
      card.classList.add('hidden');
      setTimeout(() => {
        if (card.classList.contains('hidden')) {
          card.style.display = 'none';
        }
      }, 300);
    }, 8500);
  }
}

let activeSeamSiGroup = null;

// Soft radial golden glow (transparent edges) — used for floor halo & stick aura.
// NOTE: previously referenced but never defined -> SpriteMaterial got map:null -> solid yellow square.
let cachedRadialGlowTex = null;
function getRadialGlowTexture() {
  if (cachedRadialGlowTex) return cachedRadialGlowTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0.0, 'rgba(255, 244, 190, 0.95)');
  g.addColorStop(0.22, 'rgba(255, 215, 90, 0.55)');
  g.addColorStop(0.55, 'rgba(245, 158, 11, 0.18)');
  g.addColorStop(0.82, 'rgba(217, 119, 6, 0.04)');
  g.addColorStop(1.0, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  cachedRadialGlowTex = new THREE.CanvasTexture(canvas);
  cachedRadialGlowTex.minFilter = THREE.LinearFilter;
  return cachedRadialGlowTex;
}

// Multi-pointed Twinkling Starburst Diamond Texture
let cachedCrystalSparkTex = null;
function getCrystalSparkTexture() {
  if (cachedCrystalSparkTex) return cachedCrystalSparkTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  // Center radial glow
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.75);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.18, 'rgba(255, 240, 180, 0.9)');
  g.addColorStop(0.45, 'rgba(0, 245, 212, 0.45)');
  g.addColorStop(0.75, 'rgba(255, 105, 180, 0.15)');
  g.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // 8-Point Diamond Starburst Rays
  ctx.save();
  ctx.translate(c, c);
  for (let r = 0; r < 4; r++) {
    ctx.rotate(Math.PI / 4);
    const isMajor = (r % 2 === 0);
    const rayLen = isMajor ? c * 0.95 : c * 0.58;
    const rayW = isMajor ? 5 : 3;
    const rayGrad = ctx.createLinearGradient(0, -rayLen, 0, rayLen);
    rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rayGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rayGrad;
    ctx.fillRect(-rayW / 2, -rayLen, rayW, rayLen * 2);
  }
  ctx.restore();

  cachedCrystalSparkTex = new THREE.CanvasTexture(canvas);
  cachedCrystalSparkTex.minFilter = THREE.LinearFilter;
  return cachedCrystalSparkTex;
}

// Iridescent Rainbow Lotus Petal Texture
let cachedRainbowLotusTex = null;
function getRainbowLotusPetalTexture() {
  if (cachedRainbowLotusTex) return cachedRainbowLotusTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const grad = ctx.createLinearGradient(cx, 16, cx, 240);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
  grad.addColorStop(0.25, 'rgba(255, 130, 190, 0.92)');
  grad.addColorStop(0.60, 'rgba(150, 255, 240, 0.82)');
  grad.addColorStop(0.85, 'rgba(255, 220, 90, 0.75)');
  grad.addColorStop(1.0, 'rgba(255, 240, 160, 0.3)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, 20);
  ctx.bezierCurveTo(cx + 90, 60, cx + 80, 180, cx, 236);
  ctx.bezierCurveTo(cx - 80, 180, cx - 90, 60, cx, 20);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 235, 140, 0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, 30);
  ctx.lineTo(cx, 220);
  ctx.stroke();

  cachedRainbowLotusTex = new THREE.CanvasTexture(canvas);
  cachedRainbowLotusTex.minFilter = THREE.LinearFilter;
  return cachedRainbowLotusTex;
}

// Sacred Thai Numeral "๙" (Nine) Radiant Glyph Texture for Tier 3 Lucky 9
let cachedNumeralNineTex = null;
function getSacredNumeralNineTexture() {
  if (cachedNumeralNineTex) return cachedNumeralNineTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const halo = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  halo.addColorStop(0.0, 'rgba(255, 245, 180, 0.95)');
  halo.addColorStop(0.45, 'rgba(255, 200, 50, 0.65)');
  halo.addColorStop(0.80, 'rgba(255, 140, 0, 0.22)');
  halo.addColorStop(1.0, 'rgba(255, 140, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 148px "Kanit", "Sarabun", sans-serif';

  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('๙', cx, cy + 6);

  const txtGrad = ctx.createLinearGradient(0, 40, 0, 200);
  txtGrad.addColorStop(0.0, '#ffffff');
  txtGrad.addColorStop(0.4, '#fff2a8');
  txtGrad.addColorStop(0.7, '#ffc72c');
  txtGrad.addColorStop(1.0, '#e68a00');
  ctx.fillStyle = txtGrad;
  ctx.fillText('๙', cx, cy + 6);

  ctx.strokeStyle = '#fff8db';
  ctx.lineWidth = 3;
  ctx.strokeText('๙', cx, cy + 6);

  cachedNumeralNineTex = new THREE.CanvasTexture(canvas);
  cachedNumeralNineTex.minFilter = THREE.LinearFilter;
  return cachedNumeralNineTex;
}

// Floating Lotus Water Lantern Texture (for Twin Lotus Ponds)
let cachedFloatingLanternTex = null;
function getFloatingLanternTexture() {
  if (cachedFloatingLanternTex) return cachedFloatingLanternTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 58);
  g.addColorStop(0.0, 'rgba(255, 255, 230, 1.0)');
  g.addColorStop(0.28, 'rgba(255, 200, 60, 0.85)');
  g.addColorStop(0.65, 'rgba(255, 100, 20, 0.45)');
  g.addColorStop(1.0, 'rgba(255, 100, 20, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 58, 0, Math.PI * 2);
  ctx.fill();

  cachedFloatingLanternTex = new THREE.CanvasTexture(canvas);
  cachedFloatingLanternTex.minFilter = THREE.LinearFilter;
  return cachedFloatingLanternTex;
}

function createSeamSiStickPlaqueTexture(stickTitle = 'ใบที่ ๙') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Golden-tipped crimson bamboo fortune stick texture
  const grad = ctx.createLinearGradient(0, 0, 128, 512);
  grad.addColorStop(0.0, '#ffe066');
  grad.addColorStop(0.18, '#d91e36');
  grad.addColorStop(0.55, '#9e0b1c');
  grad.addColorStop(1.0, '#e3b464');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  // Imperial Double-Gold Lacquer Frame (Zero white stroke)
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 500);

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(10, 10, 108, 492);

  // Auspicious Chinese/Thai emblem at top
  ctx.fillStyle = '#ffe066';
  ctx.font = 'bold 42px "Noto Serif Thai", "Sarabun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('吉', 64, 62);

  // Vertical Thai label
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.font = 'bold 34px "Kanit", "Sarabun", sans-serif';
  ctx.fillText('เซียมซี', 64, 150);
  ctx.fillStyle = '#ffe566';
  ctx.font = 'bold 38px "Kanit", "Sarabun", sans-serif';
  ctx.fillText(stickTitle, 64, 220);
  ctx.fillStyle = '#fff5b8';
  ctx.font = 'bold 30px "Kanit", "Sarabun", sans-serif';
  ctx.fillText('มหาโชค', 64, 290);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function triggerSeamSiEffect(donorName = 'ผู้มีจิตศรัทธา', fortune = null, showScrollImmediately = true) {
  const f = fortune || drawSeamSiFortune();

  if (activeSeamSiGroup) {
    scene.remove(activeSeamSiGroup);
    activeSeamSiGroup = null;
  }

  const rootGroup = new THREE.Group();
  rootGroup.position.set(0, 1.12, 2.35);

  // 1. Radiant Golden Mandala Floor Halo beneath the Seam-Si cylinder
  const baseGlowMat = new THREE.SpriteMaterial({
    map: typeof getRadialGlowTexture === 'function' ? getRadialGlowTexture() : null,
    color: 0xffd24a,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const baseGlow = new THREE.Sprite(baseGlowMat);
  baseGlow.scale.set(2.2, 2.2, 1);
  baseGlow.position.set(0, -0.35, 0);
  rootGroup.add(baseGlow);

  // 2. Cylinder Shaker Pivot Group (tilts and shakes rhythmically)
  const shakerPivot = new THREE.Group();
  rootGroup.add(shakerPivot);

  const lacquerMat = new THREE.MeshStandardMaterial({
    color: 0xa80c1e,
    emissive: 0x45030b,
    roughness: 0.25,
    metalness: 0.35
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0x7a5200,
    roughness: 0.18,
    metalness: 0.92
  });
  const innerDarkMat = new THREE.MeshBasicMaterial({ color: 0x260408 });

  // Outer Crimson-Gold Bamboo Cylinder
  const cylBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.30, 0.90, 28), lacquerMat);
  shakerPivot.add(cylBody);

  // Hollow Top Interior Disc
  const innerTop = new THREE.Mesh(new THREE.CircleGeometry(0.33, 24), innerDarkMat);
  innerTop.rotation.x = -Math.PI / 2;
  innerTop.position.y = 0.451;
  shakerPivot.add(innerTop);

  // 3 Imperial Gold Filigree Rings around Cylinder
  [-0.38, 0.0, 0.42].forEach(ry => {
    const rRadius = ry > 0.2 ? 0.365 : (ry < -0.2 ? 0.31 : 0.335);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rRadius, 0.028, 12, 32), goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    shakerPivot.add(ring);
  });

  // Pedestal Base Foot
  const footMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.12, 24), goldMat);
  footMesh.position.y = -0.46;
  shakerPivot.add(footMesh);

  // 3. Bundle of 24 Bamboo Fortune Sticks inside Cylinder
  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0xefc97b,
    emissive: 0x3b2706,
    roughness: 0.42,
    metalness: 0.15
  });
  const crimsonTipMat = new THREE.MeshBasicMaterial({ color: 0xe6192e });
  const stickGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.96, 8);
  const tipGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.16, 8);

  const sticks = [];
  for (let i = 0; i < 24; i++) {
    const sGroup = new THREE.Group();
    const sMesh = new THREE.Mesh(stickGeo, bambooMat);
    const tMesh = new THREE.Mesh(tipGeo, crimsonTipMat);
    tMesh.position.y = 0.42;
    sGroup.add(sMesh);
    sGroup.add(tMesh);

    const ringLayer = i < 8 ? 0.09 : 0.20;
    const angle = (i / (i < 8 ? 8 : 16)) * Math.PI * 2 + (i * 0.2);
    const bx = Math.cos(angle) * ringLayer;
    const bz = Math.sin(angle) * ringLayer;
    const by = 0.16 + (i % 4) * 0.04;
    sGroup.position.set(bx, by, bz);
    sGroup.rotation.z = -bx * 0.55;
    sGroup.rotation.x = bz * 0.55;
    shakerPivot.add(sGroup);
    sticks.push({
      group: sGroup,
      baseY: by,
      baseRotX: sGroup.rotation.x,
      baseRotZ: sGroup.rotation.z,
      phase: i * 0.65
    });
  }

  // 4. Hero Winning Fortune Stick (Shoots upward with Golden Halo & Stick Number Plaque)
  const heroStickGroup = new THREE.Group();
  heroStickGroup.position.set(0, 0.18, 0);
  const plaqueTex = createSeamSiStickPlaqueTexture(f.stickTitle);
  const heroPlaqueMat = new THREE.MeshBasicMaterial({
    map: plaqueTex,
    side: THREE.DoubleSide
  });
  const heroPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.035), heroPlaqueMat);
  heroStickGroup.add(heroPlaque);

  const heroHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.36, 0.385, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffc928,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    })
  );
  heroHalo.position.set(0, 0.1, -0.03);
  heroStickGroup.add(heroHalo);

  const heroAuraMat = new THREE.SpriteMaterial({
    map: getRadialGlowTexture(),
    color: 0xffd24a,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const heroAura = new THREE.Sprite(heroAuraMat);
  heroAura.scale.set(1.5, 1.9, 1);
  heroAura.position.set(0, 0.05, -0.05);
  heroStickGroup.add(heroAura);
  rootGroup.add(heroStickGroup);

  scene.add(rootGroup);
  activeSeamSiGroup = rootGroup;

  // Play authentic bamboo stick shaking sound + golden chime
  if (typeof templeAudio !== 'undefined' && templeAudio.playSeamSiShake) {
    templeAudio.playSeamSiShake();
  }

  createCarpetRipple(0, 0.05, 2.35, 0xffd700);
  createLotusBloomDecal(0, 0.05, 2.35, 0xffd700);
  spawnBlessingSparks(0, 1.2, 2.35, 22, 0xffea70);

  let elapsed = 0;
  let scrollShown = false;
  let burstTriggered = false;

  const sInterval = setInterval(() => {
    elapsed += 0.03;
    if (activeSeamSiGroup !== rootGroup) {
      clearInterval(sInterval);
      return;
    }

    if (elapsed < 1.02) {
      // Phase 1: Vigorous Sacred Shaking of the Bamboo Cylinder & 24 Fortune Sticks
      const shakeAngle = Math.sin(elapsed * 32.0) * 0.24;
      const shakePitch = Math.cos(elapsed * 26.0) * 0.14;
      const shakeBounce = Math.abs(Math.sin(elapsed * 28.0)) * 0.14;
      shakerPivot.rotation.z = shakeAngle;
      shakerPivot.rotation.x = shakePitch;
      shakerPivot.position.y = shakeBounce;

      sticks.forEach(st => {
        st.group.position.y = st.baseY + Math.abs(Math.sin(elapsed * 36.0 + st.phase)) * 0.18;
        st.group.rotation.z = st.baseRotZ + Math.sin(elapsed * 28.0 + st.phase) * 0.12;
      });

      if (Math.random() < 0.45) {
        spawnBlessingSparks(
          (Math.random() - 0.5) * 0.5,
          1.45 + Math.random() * 0.3,
          2.35 + (Math.random() - 0.5) * 0.3,
          4,
          0xffd700
        );
      }
    } else {
      // Phase 2: Cylinder Steadies & Winning Stick Shoots Upward in Golden Light
      shakerPivot.rotation.z *= 0.78;
      shakerPivot.rotation.x *= 0.78;
      shakerPivot.position.y *= 0.80;

      if (!burstTriggered) {
        burstTriggered = true;
        if (typeof templeAudio !== 'undefined' && templeAudio.playBell) {
          templeAudio.playBell(513.6, 3.5);
        }
        createCarpetRipple(0, 0.05, 2.35, 0xffd700);
        spawnBlessingSparks(0, 1.65, 2.35, 36, 0xfff088);
      }

      const riseProgress = Math.min(1.0, (elapsed - 1.02) / 0.65);
      const easeOutBack = 1 + 1.8 * Math.pow(riseProgress - 1, 3) + 0.8 * Math.pow(riseProgress - 1, 2);
      heroStickGroup.position.y = 0.18 + easeOutBack * 1.18;
      heroStickGroup.rotation.y = (1.0 - riseProgress) * Math.PI * 2.0 + Math.sin(elapsed * 2.5) * 0.10;
      const hScale = 0.75 + riseProgress * 0.45;
      heroStickGroup.scale.set(hScale, hScale, hScale);

      heroHalo.material.opacity = Math.min(0.88, riseProgress * 0.9);
      heroHalo.rotation.z += 0.08;

      if (!scrollShown && elapsed >= 1.70) {
        scrollShown = true;
        if (showScrollImmediately) {
          showSeamSiFortuneScroll(donorName, f, true);
        }
      }
    }

    // Phase 3: Cleanly clear 3D shaker right after fortune paper modal opens so no dark 3D shadow lingers behind the card
    if (elapsed > 2.35) {
      clearInterval(sInterval);
      if (activeSeamSiGroup === rootGroup) {
        scene.remove(rootGroup);
        activeSeamSiGroup = null;
      }
      plaqueTex.dispose();
    }
  }, 30);
}

// ── Tier 1: Rose Offering & 3-Phase Benjangkhapradit Kowtow Celestial Effect (🌹) ──
function triggerKowtowEffect() {
  templeAudio.playWoodblock();
  templeAudio.playBell(432, 4.0);
  triggerGuanYinDivineRadiance();
  createCarpetRipple(0, 0.05, 2.05, 0xffd700);
  createLotusBloomDecal(0, 0.05, 2.05, 0xffd700);
  spawnBlessingSparks(0, 0.5, 2.05, 28, 0xffea70);
  spawnGiftTrailRose();
  setTimeout(() => spawnGiftTrailRose(), 220);
}

// ── Tier 2: Sacred Golden Censer, Dragon Candles & Omamori Offering (🪔 / 🕯️) ──
const incenseParticles = [];
const incenseGeo = new THREE.SphereGeometry(0.09, 8, 8);
const emberGeo = new THREE.SphereGeometry(0.032, 8, 8);
let activeCenserGroup = null;
let cachedIncenseSmokeTex = null;
let cachedOmamoriTex = null;

function getIncenseSmokeTexture() {
  if (cachedIncenseSmokeTex) return cachedIncenseSmokeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const puffs = [
    { x: 128, y: 128, r: 96, a: 0.42 },
    { x: 102, y: 112, r: 72, a: 0.32 },
    { x: 154, y: 118, r: 68, a: 0.30 },
    { x: 124, y: 152, r: 74, a: 0.28 }
  ];
  for (const pf of puffs) {
    const g = ctx.createRadialGradient(pf.x, pf.y, 4, pf.x, pf.y, pf.r);
    g.addColorStop(0.0, `rgba(255, 250, 232, ${pf.a})`);
    g.addColorStop(0.45, `rgba(255, 234, 188, ${pf.a * 0.55})`);
    g.addColorStop(1.0, 'rgba(255, 220, 150, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2);
    ctx.fill();
  }
  cachedIncenseSmokeTex = new THREE.CanvasTexture(canvas);
  cachedIncenseSmokeTex.minFilter = THREE.LinearFilter;
  return cachedIncenseSmokeTex;
}

function getOmamoriPlaqueTexture() {
  if (cachedOmamoriTex) return cachedOmamoriTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 384);

  // Crimson-and-Gold Imperial Brocade Amulet Pouch
  const bg = ctx.createLinearGradient(0, 0, 256, 384);
  bg.addColorStop(0.0, '#b31228');
  bg.addColorStop(0.5, '#d91e36');
  bg.addColorStop(1.0, '#800a19');
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(48, 28);
  ctx.lineTo(208, 28);
  ctx.lineTo(232, 82);
  ctx.lineTo(232, 348);
  ctx.lineTo(24, 348);
  ctx.lineTo(24, 82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden Filigree Inner Border
  ctx.strokeStyle = 'rgba(255, 230, 128, 0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 88, 172, 240);

  // Sacred Lotus & Blessing Medallion
  const rad = ctx.createRadialGradient(128, 204, 8, 128, 204, 72);
  rad.addColorStop(0, '#fff7cc');
  rad.addColorStop(0.65, '#ffcc33');
  rad.addColorStop(1, 'rgba(255, 180, 0, 0)');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(128, 204, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff5c0';
  ctx.font = 'bold 46px "Sarabun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('มหาสิริมงคล', 128, 185);
  ctx.font = 'bold 34px "Sarabun", serif';
  ctx.fillText('สมปรารถนา', 128, 236);

  cachedOmamoriTex = new THREE.CanvasTexture(canvas);
  cachedOmamoriTex.minFilter = THREE.LinearFilter;
  return cachedOmamoriTex;
}

function triggerIncenseEffect() {
  templeAudio.playWoodblock();
  templeAudio.playBell(513.6, 4.0);
  triggerGuanYinDivineRadiance();

  if (activeCenserGroup) {
    scene.remove(activeCenserGroup);
    activeCenserGroup = null;
  }

  // 1. Ornate 3D Imperial Bronze-Gold Dragon Tripod Censer, Lotus Lamps & Omamori Plaque
  const censer = new THREE.Group();
  censer.position.set(0, 1.15, 2.0);

  // Twin Lotus Pond Floating Water Lanterns (โคมประทีปบัวลอยน้ำในสระสวรรค์ 2 ฝั่ง)
  const pondLanterns = [];
  const lanternTex = getFloatingLanternTexture();
  const lanternMat = new THREE.SpriteMaterial({
    map: lanternTex,
    color: 0xffb703,
    transparent: true,
    opacity: 0.90,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const pondCoords = [
    { x: -4.5, y: 0.18, z: 3.2, phase: 0 },
    { x: -3.8, y: 0.18, z: 4.8, phase: 1.2 },
    { x: -4.8, y: 0.18, z: 6.2, phase: 2.4 },
    { x: 4.5, y: 0.18, z: 3.2, phase: 0.8 },
    { x: 3.8, y: 0.18, z: 4.8, phase: 2.0 },
    { x: 4.8, y: 0.18, z: 6.2, phase: 3.1 }
  ];
  pondCoords.forEach(pc => {
    const lGroup = new THREE.Group();
    lGroup.position.set(pc.x, pc.y, pc.z);

    // Glowing flame sprite
    const lSprite = new THREE.Sprite(lanternMat.clone());
    lSprite.scale.set(0.95, 0.95, 1);
    lSprite.position.y = 0.15;
    lGroup.add(lSprite);

    // Water ripple ring beneath lantern (ไร้ขอบดำ depthWrite: false)
    const rRing = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.38, 24),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    rRing.rotation.x = -Math.PI / 2;
    rRing.position.y = -0.05;
    lGroup.add(rRing);

    scene.add(lGroup);
    pondLanterns.push({ group: lGroup, baseY: pc.y, phase: pc.phase, sprite: lSprite });
  });

  const bronzeGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffd24c,
    metalness: 0.94,
    roughness: 0.14,
    emissive: 0x996b08,
    emissiveIntensity: 0.42
  });
  const whiteJadeMat = new THREE.MeshStandardMaterial({
    color: 0xf4fff9,
    metalness: 0.25,
    roughness: 0.15,
    emissive: 0x1b6652,
    emissiveIntensity: 0.25
  });
  const rubyLacquerMat = new THREE.MeshStandardMaterial({
    color: 0xb81428,
    metalness: 0.45,
    roughness: 0.22,
    emissive: 0x550610,
    emissiveIntensity: 0.30
  });

  // Carved Octagonal White Jade & Gold Altar Base beneath Censer
  const jadePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.07, 8), whiteJadeMat);
  jadePlinth.position.y = -0.25;
  censer.add(jadePlinth);
  const plinthRim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.018, 8, 16), bronzeGoldMat);
  plinthRim.rotation.x = Math.PI / 2;
  plinthRim.position.y = -0.22;
  censer.add(plinthRim);

  // Bulbous Sculpted Censer Belly + Flanged Neck Collar
  const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), bronzeGoldMat);
  bellyMesh.scale.set(1.0, 0.72, 1.0);
  bellyMesh.position.y = -0.02;
  censer.add(bellyMesh);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.10, 24), bronzeGoldMat);
  neckMesh.position.y = 0.11;
  censer.add(neckMesh);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.026, 10, 24), bronzeGoldMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.155;
  censer.add(rim);

  // 12 Carved Lotus Petals & Golden Relief Bosses around the Censer Belly
  for (let b = 0; b < 12; b++) {
    const bang = (b / 12) * Math.PI * 2;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), bronzeGoldMat);
    boss.position.set(Math.cos(bang) * 0.275, 0.0, Math.sin(bang) * 0.275);
    censer.add(boss);

    const lotusPetal = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.11, 5), bronzeGoldMat);
    lotusPetal.position.set(Math.cos(bang) * 0.24, -0.10, Math.sin(bang) * 0.24);
    lotusPetal.rotation.z = Math.cos(bang) * 0.45;
    lotusPetal.rotation.x = -Math.sin(bang) * 0.45;
    censer.add(lotusPetal);
  }

  // Twin Sculpted Dragon Handles with Hanging Jade Rings (หูมังกรทองคำคู่คล้องห่วงหยก)
  const jadeRingNodes = [];
  [-1, 1].forEach(side => {
    const dHandleGroup = new THREE.Group();
    dHandleGroup.position.set(side * 0.28, 0.04, 0);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.024, 10, 18, Math.PI * 1.35), bronzeGoldMat);
    arch.rotation.z = side * Math.PI * 0.35;
    dHandleGroup.add(arch);

    // Sculpted Dragon Head Crest at top of handle
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), bronzeGoldMat);
    dHead.position.set(side * 0.05, 0.09, 0);
    dHandleGroup.add(dHead);

    // Hanging Jade & Gold Ring swinging gently below dragon jaw
    const jRing = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 18), whiteJadeMat);
    jRing.position.set(side * 0.075, -0.05, 0);
    jRing.rotation.y = Math.PI / 2;
    dHandleGroup.add(jRing);
    jadeRingNodes.push(jRing);

    censer.add(dHandleGroup);
  });

  // Triple Sculpted Lion-Head Tripod Legs (ขาตั้งสิงห์คาบแก้ว 3 ขา)
  for (let l = 0; l < 3; l++) {
    const legAng = (l / 3) * Math.PI * 2 + Math.PI / 6;
    const lx = Math.cos(legAng) * 0.175;
    const lz = Math.sin(legAng) * 0.175;

    // Lion Shoulder Mask
    const lionShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), bronzeGoldMat);
    lionShoulder.position.set(lx, -0.11, lz);
    censer.add(lionShoulder);

    // Leg Column
    const legCol = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.13, 10), bronzeGoldMat);
    legCol.position.set(lx * 1.06, -0.17, lz * 1.06);
    censer.add(legCol);

    // Clawed Lion Paw Foot
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), bronzeGoldMat);
    paw.scale.set(1.2, 0.55, 1.2);
    paw.position.set(lx * 1.10, -0.22, lz * 1.10);
    censer.add(paw);
  }

  // Golden Incense Ash Mound inside Bowl
  const ash = new THREE.Mesh(
    new THREE.SphereGeometry(0.245, 20, 12),
    new THREE.MeshStandardMaterial({ color: 0xf4ebd0, roughness: 0.85, metalness: 0.05 })
  );
  ash.scale.set(1.0, 0.25, 1.0);
  ash.position.y = 0.13;
  censer.add(ash);

  // 9 Sacred Golden Incense Sticks in a 2-Row Fan with Pulsing Ember Tips (ธูปมงคล 9 ดอก)
  const stickHandleGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.22, 8);
  const stickBodyGeo = new THREE.CylinderGeometry(0.011, 0.010, 0.42, 8);
  const sandalwoodMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.65 });
  const emberTips = [];

  for (let s = 0; s < 9; s++) {
    const frac = (s - 4) / 4; // -1 to +1
    const rowZ = (s % 2 === 0) ? -0.025 : 0.025;
    const tiltZ = -frac * 0.22;
    const tiltX = (s % 2 === 0) ? -0.05 : 0.05;

    const stickGroup = new THREE.Group();
    stickGroup.position.set(frac * 0.11, 0.14, rowZ);
    stickGroup.rotation.z = tiltZ;
    stickGroup.rotation.x = tiltX;

    const handle = new THREE.Mesh(stickHandleGeo, rubyLacquerMat);
    handle.position.y = 0.08;
    stickGroup.add(handle);

    const body = new THREE.Mesh(stickBodyGeo, sandalwoodMat);
    body.position.y = 0.34;
    stickGroup.add(body);

    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    const emberTip = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), emberMat);
    emberTip.position.y = 0.55;
    stickGroup.add(emberTip);

    const emberHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9900, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    emberHalo.position.y = 0.55;
    stickGroup.add(emberHalo);
    emberTips.push({ tip: emberTip, halo: emberHalo, phase: s * 0.7 });

    censer.add(stickGroup);
  }

  // Floating Sacred Golden Omamori / Blessing Talisman hovering above Censer (ไร้ขอบดำและขอบกล่องทึบ 100%)
  const omamoriGroup = new THREE.Group();
  omamoriGroup.position.set(0, 1.05, -0.08);

  // Luminous Golden Aura Halo behind Omamori Plaque (ประกายรัศมีมงคลฉัพพรรณรังสี)
  const omamoriHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.60),
    new THREE.MeshBasicMaterial({
      map: getCrystalSparkTexture(),
      color: 0xffd700,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  omamoriHalo.position.z = -0.005;
  omamoriGroup.add(omamoriHalo);

  // Omamori Plaque Plane with Crystal-Clear Transparency (ลบขอบดำทึบและมุมกล่องออก 100%)
  const omamoriPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.48),
    new THREE.MeshBasicMaterial({
      map: getOmamoriPlaqueTexture(),
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  omamoriGroup.add(omamoriPlaque);

  // Golden Tassel hanging under the Omamori Plaque
  const tasselCord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.018, 0.16, 8), rubyLacquerMat);
  tasselCord.position.y = -0.32;
  omamoriGroup.add(tasselCord);
  censer.add(omamoriGroup);

  // Twin Sculpted Golden Lotus Candlesticks & Dragon-Relief Pillar Candles (เทียนชัยมังกรทองคำคู่)
  const candleFlames = [];
  [-0.56, 0.56].forEach((cx, cIdx) => {
    const cStandGroup = new THREE.Group();
    cStandGroup.position.set(cx, -0.22, 0);

    // Tiered Lotus Pedestal Foot
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.10, 16), bronzeGoldMat);
    foot.position.y = 0.05;
    cStandGroup.add(foot);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 0.18, 12), bronzeGoldMat);
    stem.position.y = 0.18;
    cStandGroup.add(stem);

    // Lotus Drip Bowl with 8 Sculpted Golden Petals
    const dripDish = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.05, 16), bronzeGoldMat);
    dripDish.position.y = 0.28;
    cStandGroup.add(dripDish);
    for (let lp = 0; lp < 8; lp++) {
      const lang = (lp / 8) * Math.PI * 2;
      const lPet = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 4), bronzeGoldMat);
      lPet.position.set(Math.cos(lang) * 0.095, 0.29, Math.sin(lang) * 0.095);
      lPet.rotation.z = -Math.cos(lang) * 0.6;
      lPet.rotation.x = Math.sin(lang) * 0.6;
      cStandGroup.add(lPet);
    }

    // Crimson-Red & Gold Pillar Candle with Coiling Golden Dragon Relief
    const candlePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.050, 0.46, 16), rubyLacquerMat);
    candlePillar.position.y = 0.52;
    cStandGroup.add(candlePillar);

    for (let sp = 0; sp < 10; sp++) {
      const sang = (sp / 10) * Math.PI * 3.2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), bronzeGoldMat);
      bead.position.set(Math.cos(sang) * 0.049, 0.34 + sp * 0.036, Math.sin(sang) * 0.049);
      cStandGroup.add(bead);
    }

    // Layered Inner White-Gold & Outer Amber Tear-Drop Flame
    const flamePivot = new THREE.Group();
    flamePivot.position.set(0, 0.78, 0);

    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.022, 0.09, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    innerFlame.position.y = 0.03;
    flamePivot.add(innerFlame);

    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.038, 0.15, 12),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    outerFlame.position.y = 0.045;
    flamePivot.add(outerFlame);

    const fGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    fGlow.position.y = 0.04;
    flamePivot.add(fGlow);

    cStandGroup.add(flamePivot);
    candleFlames.push({ pivot: flamePivot, phase: cIdx * 1.7 });
    censer.add(cStandGroup);
  });

  const censerLight = new THREE.PointLight(0xff8800, 3.2, 4.8);
  censerLight.position.set(0, 0.68, 0.1);
  censer.add(censerLight);

  scene.add(censer);
  activeCenserGroup = censer;

  // 2. Silky Volumetric Incense Smoke Sprites (ควันธูปทิพย์อ่อนช้อยสมจริง)
  const smokeTex = getIncenseSmokeTexture();
  for (let i = 0; i < 36; i++) {
    const smokeMat = new THREE.SpriteMaterial({
      map: smokeTex,
      color: (i % 3 === 0) ? 0xfff5d6 : 0xffe4b5,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const p = new THREE.Sprite(smokeMat);
    const initScale = 0.24 + Math.random() * 0.16;
    p.scale.set(initScale, initScale, 1);
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.18;
    p.position.set(
      Math.cos(angle) * r,
      2.02 + Math.random() * 0.25,
      1.05 + Math.sin(angle) * r
    );
    p.userData = {
      isEmber: false,
      vy: 0.022 + Math.random() * 0.024,
      angle: angle,
      spiralSpeed: (Math.random() - 0.5) * 0.045,
      radius: r,
      life: 1.0,
      decay: 0.0065 + Math.random() * 0.005,
      grow: 1.012
    };
    scene.add(p);
    incenseParticles.push(p);
  }

  // 3. Floating Golden Holy Sparks & Stardust Embers
  for (let i = 0; i < 28; i++) {
    const sMat = new THREE.MeshBasicMaterial({
      color: (i % 2 === 0) ? 0xffea70 : 0xffaa00,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ember = new THREE.Mesh(emberGeo, sMat);
    ember.position.set(
      (Math.random() - 0.5) * 0.52,
      2.02 + Math.random() * 0.35,
      1.05 + (Math.random() - 0.5) * 0.32
    );
    ember.userData = {
      isEmber: true,
      vy: 0.036 + Math.random() * 0.032,
      vx: (Math.random() - 0.5) * 0.018,
      vz: (Math.random() - 0.5) * 0.018,
      life: 1.0,
      decay: 0.013 + Math.random() * 0.009
    };
    scene.add(ember);
    incenseParticles.push(ember);
  }

  // Candle flame flicker, ember pulse & floating Omamori animation
  let cTime = 0;
  const flickerTimer = setInterval(() => {
    cTime += 0.08;
    if (activeCenserGroup === censer) {
      censerLight.intensity = 2.9 + Math.sin(cTime * 7.5) * 0.35 + (Math.random() - 0.5) * 0.18;
      candleFlames.forEach(cf => {
        cf.pivot.scale.y = 1.0 + Math.sin(cTime * 11 + cf.phase) * 0.16;
        cf.pivot.rotation.z = Math.sin(cTime * 6.5 + cf.phase) * 0.09;
      });
      emberTips.forEach(et => {
        const pulse = 0.65 + Math.sin(cTime * 9 + et.phase) * 0.30;
        et.halo.material.opacity = pulse;
        et.halo.scale.setScalar(0.9 + pulse * 0.35);
      });
      jadeRingNodes.forEach((jr, idx) => {
        jr.rotation.x = Math.sin(cTime * 3.5 + idx) * 0.15;
      });
      omamoriGroup.position.y = 1.05 + Math.sin(cTime * 2.6) * 0.055;
      omamoriGroup.rotation.y = Math.sin(cTime * 1.8) * 0.28;

      // Animate floating pond lanterns bobbing on water
      pondLanterns.forEach(pl => {
        pl.group.position.y = pl.baseY + Math.sin(cTime * 2.5 + pl.phase) * 0.035;
        const pPulse = 0.8 + Math.sin(cTime * 4.0 + pl.phase) * 0.2;
        pl.sprite.scale.set(0.95 * pPulse, 0.95 * pPulse, 1);
      });
    } else {
      clearInterval(flickerTimer);
    }
  }, 40);

  setTimeout(() => {
    if (activeCenserGroup === censer) {
      clearInterval(flickerTimer);
      let alpha = 1.0;
      const cFade = setInterval(() => {
        alpha -= 0.08;
        censer.scale.multiplyScalar(0.95);
        censerLight.intensity = alpha * 3.0;
        pondLanterns.forEach(pl => {
          if (pl.sprite.material) pl.sprite.material.opacity = Math.max(0, alpha * 0.9);
        });
        if (alpha <= 0.05) {
          clearInterval(cFade);
          scene.remove(censer);
          pondLanterns.forEach(pl => {
            scene.remove(pl.group);
          });
          activeCenserGroup = null;
        }
      }, 30);
    }
  }, 5200);
}

// ── Tier 3: 7-Color Celestial Lotus Pool & Sovereign Thousand-Petal Lotus (🪷 / 🦢 / 👑) ──
let activeLotusBloom = null;
let cachedLotusPondTex = null;

function getLotusPondTexture() {
  if (cachedLotusPondTex) return cachedLotusPondTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256, cy = 256;

  // Emerald-Turquoise Sacred Pond Gradient
  const bg = ctx.createRadialGradient(cx, cy, 18, cx, cy, 250);
  bg.addColorStop(0.0, 'rgba(255, 248, 190, 0.90)');
  bg.addColorStop(0.28, 'rgba(0, 245, 212, 0.72)');
  bg.addColorStop(0.68, 'rgba(14, 174, 148, 0.52)');
  bg.addColorStop(0.92, 'rgba(255, 215, 0, 0.45)');
  bg.addColorStop(1.0, 'rgba(0, 245, 212, 0.0)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, 250, 0, Math.PI * 2);
  ctx.fill();

  // Golden Caustic Water Ripples & Sacred Geometry Rings
  for (let r = 48; r <= 232; r += 26) {
    ctx.strokeStyle = (r % 52 === 0) ? 'rgba(255, 230, 120, 0.65)' : 'rgba(150, 255, 242, 0.45)';
    ctx.lineWidth = (r % 52 === 0) ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 16 Radial Golden Lotus Mandala Rays in the Water
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(255, 225, 110, 0.48)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 45, cy + Math.sin(a) * 45);
    ctx.lineTo(cx + Math.cos(a) * 228, cy + Math.sin(a) * 228);
    ctx.stroke();
  }

  cachedLotusPondTex = new THREE.CanvasTexture(canvas);
  cachedLotusPondTex.minFilter = THREE.LinearFilter;
  return cachedLotusPondTex;
}

function triggerLotusBloomEffect() {
  templeAudio.playLotusChime();
  templeAudio.playBell(528, 5.0);

  if (activeLotusBloom) {
    scene.remove(activeLotusBloom);
    activeLotusBloom = null;
  }

  const bloomGroup = new THREE.Group();
  bloomGroup.position.set(0, 0.22, 2.35);

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.94,
    roughness: 0.12,
    emissive: 0xaa7700,
    emissiveIntensity: 0.45
  });

  // 1. Shimmering Turquoise & Golden Caustic Pond Surface (สระบัวทิพย์มรกต)
  const pondGeo = new THREE.CircleGeometry(1.78, 48);
  const pondMat = new THREE.MeshBasicMaterial({
    map: getLotusPondTexture(),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const pondSurface = new THREE.Mesh(pondGeo, pondMat);
  pondSurface.rotation.x = -Math.PI / 2;
  pondSurface.position.y = -0.045;
  bloomGroup.add(pondSurface);

  // Carved Golden Lotus Rim framing the Sacred Pool
  const poolRim = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.032, 10, 48), goldTrimMat);
  poolRim.rotation.x = Math.PI / 2;
  poolRim.position.y = -0.035;
  bloomGroup.add(poolRim);

  const haloDisc = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 1.70, 48),
    new THREE.MeshBasicMaterial({
      map: getLotusDecalTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  haloDisc.rotation.x = -Math.PI / 2;
  haloDisc.position.y = -0.038;
  bloomGroup.add(haloDisc);

  // 12 Sculpted Emerald Jade Lotus Leaves with Golden Veins & Crystal Dewdrops (ใบบัวหยกแกะสลัก 12 ทิศ)
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x1ca86e,
    emissive: 0x0b5e3c,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.18
  });
  const pearlDewMat = new THREE.MeshBasicMaterial({ color: 0xe0ffff });
  for (let l = 0; l < 12; l++) {
    const lang = (l / 12) * Math.PI * 2;
    const lr = (l % 2 === 0) ? 1.34 : 1.12;
    const leafGroup = new THREE.Group();
    leafGroup.position.set(Math.cos(lang) * lr, -0.025, Math.sin(lang) * lr);
    leafGroup.rotation.y = -lang;

    const leafDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.022, 16), leafMat);
    leafDisc.scale.set(1.0, 1.0, 0.88);
    leafGroup.add(leafDisc);

    const leafRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.008, 6, 16), goldTrimMat);
    leafRim.rotation.x = Math.PI / 2;
    leafRim.scale.set(1.0, 0.88, 1.0);
    leafRim.position.y = 0.012;
    leafGroup.add(leafRim);

    // Glistening Pearl Water Droplet on each Lotus Leaf
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), pearlDewMat);
    drop.scale.set(1.0, 0.65, 1.0);
    drop.position.set(0.06, 0.022, 0.04);
    leafGroup.add(drop);

    bloomGroup.add(leafGroup);
  }

  // 2. Center Sovereign Thousand-Petal Lotus (พญาบัวสวรรค์ 4 ชั้น 44 กลีบ พร้อมฝักบัวทองและเกสรทิพย์)
  const lotusLayers = [
    { count: 14, r: 0.72, y: 0.08, sx: 0.56, sy: 1.42, sz: 0.18, rx: 1.08, targetRx: 0.92, color: 0xff1e78, emissive: 0xd40055 },
    { count: 12, r: 0.52, y: 0.17, sx: 0.52, sy: 1.28, sz: 0.18, rx: 0.82, targetRx: 0.64, color: 0xff66b2, emissive: 0xff1493 },
    { count: 10, r: 0.34, y: 0.26, sx: 0.48, sy: 1.15, sz: 0.16, rx: 0.56, targetRx: 0.40, color: 0xffb8e0, emissive: 0xff69b4 },
    { count: 8, r: 0.20, y: 0.34, sx: 0.42, sy: 0.98, sz: 0.15, rx: 0.35, targetRx: 0.22, color: 0xfff5fa, emissive: 0xffcce6 }
  ];
  const animatedPetals = [];

  lotusLayers.forEach((cfg, lIdx) => {
    const pMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: 0.58,
      roughness: 0.16,
      metalness: 0.20
    });
    for (let i = 0; i < cfg.count; i++) {
      const angle = (i / cfg.count) * Math.PI * 2 + lIdx * 0.24;
      const pGeo = new THREE.SphereGeometry(0.36, 12, 10);
      pGeo.scale(cfg.sx, cfg.sy, cfg.sz);
      const p = new THREE.Mesh(pGeo, pMat);
      p.rotation.y = -angle;
      p.rotation.x = cfg.rx * 0.45; // Starts more closed and unfurls!
      p.position.set(Math.cos(angle) * cfg.r, cfg.y, Math.sin(angle) * cfg.r);
      bloomGroup.add(p);
      animatedPetals.push({ mesh: p, targetRx: cfg.targetRx });
    }
  });

  // Sacred Golden Lotus Seed Pod (ฝักบัวทองคำแท้พร้อมเมล็ดมุกเรืองแสง)
  const seedPod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.18, 20), goldTrimMat);
  seedPod.position.y = 0.34;
  bloomGroup.add(seedPod);

  for (let s = 0; s < 8; s++) {
    const sang = (s / 8) * Math.PI * 2;
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfffac2 }));
    seed.position.set(Math.cos(sang) * 0.12, 0.435, Math.sin(sang) * 0.12);
    bloomGroup.add(seed);
  }

  // 24 Golden Filigree Stamens with Glowing Pearl Tips (เกสรบัวทองคำ 24 เส้น)
  const stamenStemGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6);
  const stamenTipGeo = new THREE.SphereGeometry(0.018, 6, 6);
  const stamenTipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let st = 0; st < 24; st++) {
    const stAng = (st / 24) * Math.PI * 2;
    const stGroup = new THREE.Group();
    stGroup.position.set(Math.cos(stAng) * 0.21, 0.36, Math.sin(stAng) * 0.21);
    stGroup.rotation.y = -stAng;
    stGroup.rotation.x = 0.38;

    const stem = new THREE.Mesh(stamenStemGeo, goldTrimMat);
    stem.position.y = 0.10;
    stGroup.add(stem);

    const tip = new THREE.Mesh(stamenTipGeo, stamenTipMat);
    tip.position.y = 0.21;
    stGroup.add(tip);
    bloomGroup.add(stGroup);
  }

  // Floating Radiant Dharma Mani Pearl above Seed Pod (ดวงแก้วมณีโชติรส)
  const maniPearl = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff8b0 })
  );
  maniPearl.position.y = 0.58;
  bloomGroup.add(maniPearl);

  const pearlHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.014, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  pearlHalo.position.y = 0.58;
  bloomGroup.add(pearlHalo);

  // 3. 7 Celestial Rainbow Gem Lotuses (สระบัวแก้ว 7 สีมงคล 2 ชั้นกลีบ)
  const gemColors = [
    { c: 0xff1744, e: 0xb30024 }, // Ruby Red
    { c: 0xff9100, e: 0xc45500 }, // Topaz Orange
    { c: 0xffd700, e: 0xffaa00 }, // Golden Yellow
    { c: 0x00e676, e: 0x00b34d }, // Emerald Green
    { c: 0x00f5d4, e: 0x00c4a7 }, // Turquoise Cyan
    { c: 0x0088ff, e: 0x0044cc }, // Sapphire Blue
    { c: 0xbb00ff, e: 0x7700cc }  // Amethyst Violet
  ];
  const miniLotuses = [];
  gemColors.forEach((gc, idx) => {
    const ang = (idx / 7) * Math.PI * 2;
    const mini = new THREE.Group();
    const miniMat = new THREE.MeshStandardMaterial({
      color: gc.c,
      emissive: gc.e,
      emissiveIntensity: 0.72,
      roughness: 0.14,
      metalness: 0.30
    });
    for (let p = 0; p < 8; p++) {
      const pang = (p / 8) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 8), miniMat);
      pet.scale.set(0.52, 1.18, 0.16);
      pet.rotation.y = -pang;
      pet.rotation.x = 0.62;
      pet.position.set(Math.cos(pang) * 0.14, 0.04, Math.sin(pang) * 0.14);
      mini.add(pet);
    }
    for (let p = 0; p < 6; p++) {
      const pang = (p / 6) * Math.PI * 2 + 0.3;
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), miniMat);
      pet.scale.set(0.48, 1.05, 0.15);
      pet.rotation.y = -pang;
      pet.rotation.x = 0.35;
      pet.position.set(Math.cos(pang) * 0.08, 0.08, Math.sin(pang) * 0.08);
      mini.add(pet);
    }
    const mCore = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), goldTrimMat);
    mCore.position.y = 0.09;
    mini.add(mCore);

    mini.position.set(Math.cos(ang) * 1.08, 0.04, Math.sin(ang) * 1.08);
    mini.userData = { baseAng: ang, r: 1.08 };
    bloomGroup.add(mini);
    miniLotuses.push(mini);
  });

  // 4. 6 Golden Koi Spirit Fish Swimming in the Lotus Pool (ปลาคาร์ปทองคำทิพย์แหวกว่ายรอบสระ)
  const koiSpirits = [];
  const koiGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const koiTailMat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (let k = 0; k < 6; k++) {
    const kang = (k / 6) * Math.PI * 2;
    const koi = new THREE.Group();
    const kBody = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), koiGoldMat);
    kBody.scale.set(0.65, 0.55, 2.1);
    koi.add(kBody);

    const kTail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), koiTailMat);
    kTail.rotation.x = Math.PI / 2;
    kTail.position.z = -0.13;
    koi.add(kTail);

    koi.userData = { ang: kang, r: 0.82 + (k % 2) * 0.45, tail: kTail };
    bloomGroup.add(koi);
    koiSpirits.push(koi);
  }

  // 5. 24 Rising Iridescent Dewdrops (ละอองน้ำค้างทิพย์เรืองแสง)
  const dewdrops = [];
  const dewMat = new THREE.MeshBasicMaterial({ color: 0x96fff2, blending: THREE.AdditiveBlending });
  for (let d = 0; d < 24; d++) {
    const dew = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), dewMat);
    const dang = Math.random() * Math.PI * 2;
    const dr = 0.2 + Math.random() * 1.25;
    dew.position.set(Math.cos(dang) * dr, 0.12 + Math.random() * 0.45, Math.sin(dang) * dr);
    dew.userData = { vy: 0.018 + Math.random() * 0.016, ang: dang, r: dr };
    bloomGroup.add(dew);
    dewdrops.push(dew);
  }

  // 6. Sacred Lucky 9 (เก้ามงคล): 8 Blooming Sacred Lotuses in Twin Ponds + Ascending Golden Numeral "๙"
  const pondLotusesGroup = new THREE.Group();
  const pondLotusNodes = [];
  const pondSpots = [
    { x: -4.6, y: 0.16, z: 2.5 },
    { x: -3.6, y: 0.16, z: 4.2 },
    { x: -4.8, y: 0.16, z: 5.8 },
    { x: -3.8, y: 0.16, z: 7.4 },
    { x: 4.6, y: 0.16, z: 2.5 },
    { x: 3.6, y: 0.16, z: 4.2 },
    { x: 4.8, y: 0.16, z: 5.8 },
    { x: 3.8, y: 0.16, z: 7.4 }
  ];

  const pondPetalTex = getRainbowLotusPetalTexture();
  const pLotusMat = new THREE.MeshStandardMaterial({
    map: pondPetalTex,
    color: 0xff69b4,
    emissive: 0xff1493,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.15,
    side: THREE.DoubleSide
  });

  pondSpots.forEach((ps, pIdx) => {
    const pl = new THREE.Group();
    pl.position.set(ps.x, ps.y, ps.z);
    pl.scale.set(0.01, 0.01, 0.01);

    // Expanding water ripple ring at base
    const wRipple = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.72, 32),
      new THREE.MeshBasicMaterial({ color: 0x96fff2, side: THREE.DoubleSide, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending })
    );
    wRipple.rotation.x = -Math.PI / 2;
    pl.add(wRipple);

    // 8 Petals
    for (let p = 0; p < 8; p++) {
      const pang = (p / 8) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), pLotusMat);
      pet.scale.set(0.55, 1.25, 0.18);
      pet.rotation.y = -pang;
      pet.rotation.x = 0.55;
      pet.position.set(Math.cos(pang) * 0.18, 0.08, Math.sin(pang) * 0.18);
      pl.add(pet);
    }
    // Inner 6 Petals
    for (let p = 0; p < 6; p++) {
      const pang = (p / 6) * Math.PI * 2 + 0.35;
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), pLotusMat);
      pet.scale.set(0.5, 1.1, 0.18);
      pet.rotation.y = -pang;
      pet.rotation.x = 0.32;
      pet.position.set(Math.cos(pang) * 0.11, 0.12, Math.sin(pang) * 0.11);
      pl.add(pet);
    }
    // Golden Stamen
    const plCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), goldTrimMat);
    plCore.position.y = 0.14;
    pl.add(plCore);

    // Rainbow Light Beam shooting into clouds
    const beamGeo = new THREE.PlaneGeometry(0.28, 6.2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: (pIdx % 2 === 0) ? 0x00f5d4 : 0xffea00,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 3.1;
    pl.add(beam);

    pondLotusesGroup.add(pl);
    pondLotusNodes.push({ group: pl, ripple: wRipple, beam, delay: pIdx * 0.08 });
  });
  scene.add(pondLotusesGroup);

  // Radiant Golden Numeral "๙" (Ascending to Guan Yin)
  const nineTex = getSacredNumeralNineTexture();
  const nineMat = new THREE.SpriteMaterial({
    map: nineTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const nineSprite = new THREE.Sprite(nineMat);
  nineSprite.scale.set(1.6, 1.6, 1);
  nineSprite.position.set(0, 0.95, 2.35);
  bloomGroup.add(nineSprite);

  const bloomLight = new THREE.PointLight(0xff99e6, 3.8, 8.5);
  bloomLight.position.y = 0.65;
  bloomGroup.add(bloomLight);

  scene.add(bloomGroup);
  activeLotusBloom = bloomGroup;
  createCarpetRipple(0, 0.05, 2.35, 0xffd700);

  // Smooth Blooming Expansion & Dynamic Petal Unfurling on Altar Floor
  let progress = 0;
  const bloomInterval = setInterval(() => {
    progress += 0.035;
    const s = Math.sin(Math.min(progress, Math.PI / 2)) * 1.15;
    bloomGroup.scale.set(s, s, s);
    bloomGroup.rotation.y += 0.012;
    haloDisc.rotation.z -= 0.022;
    pondSurface.rotation.z += 0.008;
    bloomGroup.position.y = 0.26 + Math.sin(progress) * 0.04;

    // Animate 8 pond lotuses in Left and Right ponds
    pondLotusNodes.forEach(pn => {
      const pProg = Math.max(0, Math.min(1.0, (progress - pn.delay) * 1.35));
      const pScale = Math.sin(pProg * Math.PI / 2);
      pn.group.scale.set(pScale, pScale, pScale);
      pn.group.rotation.y += 0.015;
      pn.ripple.scale.setScalar(1.0 + Math.sin(progress * 3.5) * 0.22);
      pn.beam.rotation.y += 0.02;
    });

    // Ascend radiant Thai Numeral "๙" toward Guan Yin's celestial halo
    if (progress > 0.3) {
      const nineProg = Math.min(1.0, (progress - 0.3) * 1.25);
      nineMat.opacity = Math.min(1.0, nineProg * 1.4);
      nineSprite.position.y = 0.95 + nineProg * 1.85;
      const pulseS = 1.6 + Math.sin(progress * 8.0) * 0.18;
      nineSprite.scale.set(pulseS, pulseS, 1);
    }

    // Unfurl lotus petals smoothly
    animatedPetals.forEach(ap => {
      ap.mesh.rotation.x = THREE.MathUtils.lerp(ap.mesh.rotation.x, ap.targetRx, 0.08);
    });

    maniPearl.position.y = 0.58 + Math.sin(progress * 4.0) * 0.05;
    pearlHalo.position.y = maniPearl.position.y;
    pearlHalo.rotation.x += 0.06;
    pearlHalo.rotation.y += 0.04;

    miniLotuses.forEach(m => {
      const curAng = m.userData.baseAng + progress * 0.35;
      m.position.x = Math.cos(curAng) * m.userData.r;
      m.position.z = Math.sin(curAng) * m.userData.r;
      m.rotation.y += 0.025;
    });

    koiSpirits.forEach((koi, kIdx) => {
      koi.userData.ang += 0.032;
      const ka = koi.userData.ang;
      const kr = koi.userData.r;
      koi.position.set(Math.cos(ka) * kr, -0.01, Math.sin(ka) * kr);
      koi.rotation.y = -ka;
      koi.userData.tail.rotation.y = Math.sin(progress * 14 + kIdx) * 0.45;
    });

    dewdrops.forEach(dw => {
      dw.position.y += dw.userData.vy;
      dw.position.x += Math.sin(progress * 4 + dw.userData.ang) * 0.005;
    });

    if (progress >= Math.PI / 2) {
      clearInterval(bloomInterval);
      setTimeout(() => {
        let fadeOutProgress = 1.0;
        const fadeInterval = setInterval(() => {
          fadeOutProgress -= 0.05;
          if (activeLotusBloom === bloomGroup) {
            bloomGroup.scale.multiplyScalar(0.96);
            pondLotusesGroup.scale.multiplyScalar(0.96);
            bloomLight.intensity = fadeOutProgress * 3.8;
            if (fadeOutProgress <= 0.05) {
              clearInterval(fadeInterval);
              scene.remove(bloomGroup);
              scene.remove(pondLotusesGroup);
              activeLotusBloom = null;
            }
          } else {
            clearInterval(fadeInterval);
            scene.remove(pondLotusesGroup);
          }
        }, 30);
      }, 4200);
    }
  }, 30);
}

// ── Tier 4: Celestial Flower Shower, Mandala Canopy & Golden Silk Ribbons (🍩 / 🌸) ──
const petalRainParticles = [];
const rainPetalColors = [
  { color: 0xff2a85, emissive: 0xff1493 }, // Vibrant Sacred Lotus Ruby
  { color: 0xff85c0, emissive: 0xff3385 }, // Vibrant Lotus Pink
  { color: 0xffb7c5, emissive: 0xff69b4 }, // Soft Sakura Blossom
  { color: 0xffd700, emissive: 0xffaa00 }, // Sacred Auspicious Gold
  { color: 0xffffff, emissive: 0xffe6f2 }, // Pure White Lotus
  { color: 0x00f5d4, emissive: 0x00b89f }  // Turquoise Celestial Dewdrop
];

function triggerLotusRainEffect() {
  templeAudio.playBell(330, 4.5);
  templeAudio.playLotusChime();

  carpetLight.intensity = 4.6;
  altarGlow.intensity = 4.2;
  createCarpetRipple(0, 0.05, 5.5, 0xffd700);
  createLotusBloomDecal(0, 0.05, 5.5, 0xffd700);

  // 1. Overhead Celestial Mandala Canopy Ring casting Golden Rays (ซุ้มมณฑลสวรรค์โปรยบุปผชาติ)
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(0, 6.8, 3.8);
  const canopyDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({
      map: getLotusDecalTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  canopyDisc.rotation.x = Math.PI / 2;
  canopyGroup.add(canopyDisc);
  scene.add(canopyGroup);

  let canT = 0;
  const canTimer = setInterval(() => {
    canT += 0.04;
    canopyDisc.rotation.z += 0.025;
    if (canT > 3.8) {
      canopyDisc.material.opacity = Math.max(0, canopyDisc.material.opacity - 0.045);
      if (canopyDisc.material.opacity <= 0.02) {
        clearInterval(canTimer);
        scene.remove(canopyGroup);
      }
    }
  }, 30);

  // 2. 56 Cupped 3D Sacred Petals + 16 Full 5-Petal Blooming Lotus Florets
  for (let i = 0; i < 72; i++) {
    const col = rainPetalColors[i % rainPetalColors.length];
    const pMat = new THREE.MeshStandardMaterial({
      color: col.color,
      emissive: col.emissive,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      roughness: 0.18,
      metalness: 0.18
    });

    let particleMesh;
    if (i < 16) {
      // Full 5-Petal 3D Blooming Flower Head with Golden Stamen Core
      const flower = new THREE.Group();
      const fPetGeo = new THREE.SphereGeometry(0.11, 8, 8);
      fPetGeo.scale(0.65, 1.25, 0.20);
      for (let fp = 0; fp < 5; fp++) {
        const fang = (fp / 5) * Math.PI * 2;
        const pm = new THREE.Mesh(fPetGeo, pMat);
        pm.rotation.z = fang;
        pm.position.set(Math.cos(fang) * 0.09, Math.sin(fang) * 0.09, 0);
        flower.add(pm);
      }
      const fCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff088 })
      );
      flower.add(fCore);
      particleMesh = flower;
      particleMesh.material = pMat; // Reference for fade-out on landing
    } else {
      const rainGeo = new THREE.SphereGeometry(0.18, 10, 8);
      rainGeo.scale(0.54, 1.22, 0.14);
      particleMesh = new THREE.Mesh(rainGeo, pMat);
    }

    particleMesh.position.set(
      (Math.random() - 0.5) * 3.2, // Channeled within marble bridge balustrades
      7.0 + Math.random() * 4.2,
      1.6 + Math.random() * 6.2
    );
    particleMesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    particleMesh.userData = {
      vy: 0.020 + Math.random() * 0.018,
      driftX: (Math.random() - 0.5) * 0.008,
      driftZ: (Math.random() - 0.5) * 0.008,
      wobbleSpeed: 2.2 + Math.random() * 2.5,
      wobbleOffset: Math.random() * Math.PI * 2,
      rotX: (Math.random() - 0.5) * 0.032,
      rotY: (Math.random() - 0.5) * 0.032,
      rotZ: (Math.random() - 0.5) * 0.032,
      restTime: 0
    };

    scene.add(particleMesh);
    petalRainParticles.push(particleMesh);
  }

  // 3. 14 Undulating Golden & Rose-Gold Celestial Silk Ribbons (แถบแพรทิพย์สวรรค์พริ้วไหว)
  for (let r = 0; r < 14; r++) {
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: (r % 2 === 0) ? 0xffd700 : 0xff99cc,
      emissive: (r % 2 === 0) ? 0xffaa00 : 0xff3385,
      emissiveIntensity: 0.55,
      metalness: 0.85,
      roughness: 0.18,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.90
    });
    const rGeo = new THREE.PlaneGeometry(0.13, 1.35, 2, 14);
    const posAttr = rGeo.attributes.position;
    for (let vi = 0; vi < posAttr.count; vi++) {
      const vy = posAttr.getY(vi);
      posAttr.setZ(vi, Math.sin(vy * 5.5) * 0.08);
    }
    rGeo.computeVertexNormals();

    const ribbon = new THREE.Mesh(rGeo, ribbonMat);
    ribbon.position.set(
      (Math.random() - 0.5) * 3.0,
      7.4 + Math.random() * 3.5,
      2.0 + Math.random() * 5.0
    );
    ribbon.userData = {
      vy: 0.014 + Math.random() * 0.011,
      driftX: (Math.random() - 0.5) * 0.008,
      driftZ: (Math.random() - 0.5) * 0.008,
      wobbleSpeed: 1.6 + Math.random() * 1.4,
      wobbleOffset: Math.random() * Math.PI * 2,
      rotX: 0.016,
      rotY: 0.022,
      rotZ: 0.016,
      restTime: 0
    };
    scene.add(ribbon);
    petalRainParticles.push(ribbon);
  }

  // 4. Twin Soaring Celestial White Cranes (นกกระเรียนขาวมงคลสวรรค์บินร่อนผ่านน้ำตก)
  const cranesGroup = new THREE.Group();
  const craneConfigs = [
    { startX: -8.0, startY: 7.2, startZ: 2.5, destX: 8.5, destY: 5.8, destZ: 4.2, speed: 0.052, dir: 1 },
    { startX: 8.5, startY: 6.5, startZ: 3.5, destX: -8.0, destY: 7.5, destZ: 1.8, speed: 0.046, dir: -1 }
  ];
  const craneNodes = [];
  const craneBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
  const craneCrownMat = new THREE.MeshBasicMaterial({ color: 0xff1e40 });
  const craneBeakMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

  craneConfigs.forEach(cfg => {
    const crane = new THREE.Group();
    crane.position.set(cfg.startX, cfg.startY, cfg.startZ);

    const cBody = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.72, 8), craneBodyMat);
    cBody.rotation.x = Math.PI / 2;
    crane.add(cBody);

    const cNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.42, 8), craneBodyMat);
    cNeck.position.set(0, 0.16, 0.38);
    cNeck.rotation.x = 0.55;
    crane.add(cNeck);

    const cCrown = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), craneCrownMat);
    cCrown.position.set(0, 0.32, 0.50);
    crane.add(cCrown);

    const cBeak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 5), craneBeakMat);
    cBeak.position.set(0, 0.28, 0.62);
    cBeak.rotation.x = Math.PI / 2;
    crane.add(cBeak);

    const wingGeo = new THREE.PlaneGeometry(0.72, 0.32);
    wingGeo.translate(0.36, 0, 0);
    const wingL = new THREE.Mesh(wingGeo, craneBodyMat);
    wingL.position.set(0.08, 0.05, 0.1);
    const wingR = new THREE.Mesh(wingGeo.clone().scale(-1, 1, 1), craneBodyMat);
    wingR.position.set(-0.08, 0.05, 0.1);
    crane.add(wingL);
    crane.add(wingR);

    crane.rotation.y = cfg.dir > 0 ? -Math.PI / 2 + 0.12 : Math.PI / 2 - 0.12;

    cranesGroup.add(crane);
    craneNodes.push({ mesh: crane, wingL, wingR, cfg, t: 0 });
  });
  scene.add(cranesGroup);

  let craneT = 0;
  const craneTimer = setInterval(() => {
    craneT += 0.035;
    craneNodes.forEach(cn => {
      cn.t = Math.min(1.0, cn.t + cn.cfg.speed * 0.25);
      cn.mesh.position.x = THREE.MathUtils.lerp(cn.cfg.startX, cn.cfg.destX, cn.t);
      cn.mesh.position.y = THREE.MathUtils.lerp(cn.cfg.startY, cn.cfg.destY, cn.t) + Math.sin(craneT * 3.5) * 0.15;
      cn.mesh.position.z = THREE.MathUtils.lerp(cn.cfg.startZ, cn.cfg.destZ, cn.t);

      // Flap wings smoothly
      const flap = Math.sin(craneT * 9.5) * 0.42;
      cn.wingL.rotation.z = flap;
      cn.wingR.rotation.z = -flap;
    });

    if (craneT > 5.5) {
      clearInterval(craneTimer);
      scene.remove(cranesGroup);
    }
  }, 30);
}

// ── Tier 5: Sacred Imperial Golden Temple Bell, Pavilion Arch & 6-Color Divine Halo (🔔 / 🍊) ──
let activeGoldenBell = null;
let cachedBellHaloTex = null;

function getBellHaloTexture() {
  if (cachedBellHaloTex) return cachedBellHaloTex;
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 512;
  haloCanvas.height = 512;
  const hCtx = haloCanvas.getContext('2d');
  const cx = 256, cy = 256;

  const hGrad = hCtx.createRadialGradient(cx, cy, 24, cx, cy, 248);
  hGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
  hGrad.addColorStop(0.18, 'rgba(255, 220, 40, 0.90)');
  hGrad.addColorStop(0.36, 'rgba(255, 85, 20, 0.78)');
  hGrad.addColorStop(0.55, 'rgba(0, 225, 255, 0.72)');
  hGrad.addColorStop(0.75, 'rgba(168, 40, 235, 0.58)');
  hGrad.addColorStop(1.0, 'rgba(255, 215, 0, 0.0)');
  hCtx.fillStyle = hGrad;
  hCtx.beginPath();
  hCtx.arc(cx, cy, 248, 0, Math.PI * 2);
  hCtx.fill();

  // Concentric Dharma Wheel Soundwave Rings
  for (let r = 64; r <= 232; r += 42) {
    hCtx.strokeStyle = 'rgba(255, 245, 180, 0.82)';
    hCtx.lineWidth = 3.0;
    hCtx.beginPath();
    hCtx.arc(cx, cy, r, 0, Math.PI * 2);
    hCtx.stroke();
  }

  // 16 Radial Dharma Resonance Spokes
  for (let s = 0; s < 16; s++) {
    const a = (s / 16) * Math.PI * 2;
    hCtx.strokeStyle = 'rgba(255, 240, 150, 0.55)';
    hCtx.lineWidth = 2.2;
    hCtx.beginPath();
    hCtx.moveTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52);
    hCtx.lineTo(cx + Math.cos(a) * 236, cy + Math.sin(a) * 236);
    hCtx.stroke();
  }

  cachedBellHaloTex = new THREE.CanvasTexture(haloCanvas);
  cachedBellHaloTex.minFilter = THREE.LinearFilter;
  return cachedBellHaloTex;
}

function triggerGoldenBellEffect() {
  templeAudio.playBell(108, 6.5);
  templeAudio.playBell(216, 5.8);
  templeAudio.playBell(432, 5.5);

  if (activeGoldenBell) {
    scene.remove(activeGoldenBell);
    activeGoldenBell = null;
  }

  const bellGroup = new THREE.Group();
  bellGroup.position.set(0, 3.85, 2.1);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.11,
    emissive: 0xaa7700,
    emissiveIntensity: 0.48
  });
  const antiqueGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd99b16,
    metalness: 0.90,
    roughness: 0.20,
    emissive: 0x6e4700,
    emissiveIntensity: 0.35
  });
  const crimsonTimberMat = new THREE.MeshStandardMaterial({
    color: 0x9e1422,
    metalness: 0.35,
    roughness: 0.30,
    emissive: 0x45060c,
    emissiveIntensity: 0.28
  });

  // 1. Ornate Red-and-Gold Temple Bell Pavilion Crossbeam (ซุ้มคานไม้สักทองแกะสลักแขวนระฆัง)
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0.92, 0);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.13, 0.18), crimsonTimberMat);
  archGroup.add(topBeam);
  const topGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.04, 0.20), goldMat);
  topGoldTrim.position.y = 0.07;
  archGroup.add(topGoldTrim);

  // Upturned Flying Eave Horns on Arch Beam
  [-1, 1].forEach(side => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), goldMat);
    horn.position.set(side * 1.12, 0.11, 0);
    horn.rotation.z = -side * 0.65;
    archGroup.add(horn);

    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.16), goldMat);
    bracket.position.set(side * 0.78, -0.14, 0);
    archGroup.add(bracket);
  });
  bellGroup.add(archGroup);

  // 2. Articulated Swinging Imperial Bell Assembly (pivoted at top suspension point y = 0.82)
  const bellSwingGroup = new THREE.Group();
  bellSwingGroup.position.set(0, 0.82, 0);
  bellGroup.add(bellSwingGroup);

  // Twin-Dragon Pulao Suspension Crown & Vajra Finial (ห่วงมังกรคู่คาบแก้วหัวระฆัง)
  const crownLoop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.036, 10, 20), goldMat);
  crownLoop.position.y = -0.14;
  bellSwingGroup.add(crownLoop);

  [-1, 1].forEach(side => {
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), antiqueGoldMat);
    dHead.position.set(side * 0.14, -0.22, 0);
    bellSwingGroup.add(dHead);
  });

  // Sculpted Bell Shoulder Dome + Tapered Barrel + Flared Lip
  const shoulderDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    goldMat
  );
  shoulderDome.position.y = -0.52;
  shoulderDome.scale.set(1.0, 0.75, 1.0);
  bellSwingGroup.add(shoulderDome);

  const bellBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.52, 0.78, 32), goldMat);
  bellBarrel.position.y = -0.78;
  bellSwingGroup.add(bellBarrel);

  const bellFlaredLip = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.64, 0.22, 32), goldMat);
  bellFlaredLip.position.y = -1.24;
  bellSwingGroup.add(bellFlaredLip);

  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.045, 10, 32), antiqueGoldMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = -1.34;
  bellSwingGroup.add(rimMesh);

  // 3 Horizontal Embossed Dharma Relief Bands & 36 Golden Boss Studs (ปุ่มนมระฆัง 36 ปุ่ม)
  [-0.50, -0.78, -1.06].forEach(by => {
    const rRadius = 0.33 + ((-0.45 - by) * 0.28);
    const band = new THREE.Mesh(new THREE.TorusGeometry(rRadius, 0.016, 8, 32), antiqueGoldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = by;
    bellSwingGroup.add(band);
  });

  const bossGeo = new THREE.SphereGeometry(0.024, 8, 8);
  for (let row = 0; row < 3; row++) {
    const by = -0.57 - row * 0.10;
    const br = 0.36 + row * 0.032;
    for (let col = 0; col < 12; col++) {
      const bang = (col / 12) * Math.PI * 2;
      const boss = new THREE.Mesh(bossGeo, antiqueGoldMat);
      boss.position.set(Math.cos(bang) * br, by, Math.sin(bang) * br);
      bellSwingGroup.add(boss);
    }
  }

  // Raised Golden Lotus Striking Medallion on Right & Front Flanks (วงเดือนดอกบัวจุดตีระฆัง)
  [0, Math.PI / 2].forEach(mang => {
    const med = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 16), antiqueGoldMat);
    med.rotation.z = Math.PI / 2;
    med.rotation.y = mang;
    med.position.set(Math.cos(mang) * 0.49, -0.98, Math.sin(mang) * 0.49);
    bellSwingGroup.add(med);
  });

  // Internal Golden Clapper & Crimson Silk Tassel
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), goldMat);
  clapper.position.y = -1.25;
  bellSwingGroup.add(clapper);

  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 10), crimsonTimberMat);
  tassel.position.y = -1.48;
  bellSwingGroup.add(tassel);

  // 3. Animated Golden Lotus Striker Beam on Right Side (ท่อนไม้สักหุ้มทองตีระฆัง)
  const strikerGroup = new THREE.Group();
  strikerGroup.position.set(0.95, -0.16, 0);
  const strikerLog = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.62, 12), crimsonTimberMat);
  strikerLog.rotation.z = Math.PI / 2;
  strikerGroup.add(strikerLog);
  const strikerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 16), goldMat);
  strikerHead.rotation.z = Math.PI / 2;
  strikerHead.position.x = -0.31;
  strikerGroup.add(strikerHead);
  bellGroup.add(strikerGroup);

  // 4. Triple Concentric 3D Expanding Dharma Shockwave Rings (คลื่นฉัพพรรณรังสี 3 มิติ แสงนวลสบายตา ไม่บังพระแม่)
  const haloTex = getBellHaloTexture();
  const haloMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 2.65, 48),
    new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  haloMesh.position.set(0, -0.15, -0.25);
  bellGroup.add(haloMesh);

  const waveRing2 = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 3.05, 48),
    new THREE.MeshBasicMaterial({ color: 0x00f5d4, side: THREE.DoubleSide, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  waveRing2.position.set(0, -0.20, -0.30);
  bellGroup.add(waveRing2);

  const waveRing3 = new THREE.Mesh(
    new THREE.RingGeometry(0.60, 3.85, 48),
    new THREE.MeshBasicMaterial({ color: 0xff66b2, side: THREE.DoubleSide, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  waveRing3.position.set(0, -0.22, -0.35);
  bellGroup.add(waveRing3);

  // Horizontal Acoustic Shockwave Ring expanding outward from Bell Lip
  const sonicRing = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe875, side: THREE.DoubleSide, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sonicRing.rotation.x = Math.PI / 2;
  sonicRing.position.set(0, -0.42, 0);
  bellGroup.add(sonicRing);

  // 5. 28 Swirling Harmonic Resonance Sparks (ละอองคลื่นเสียงมงคล)
  const bellSparks = [];
  const bSparkGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const bSparkMat = new THREE.MeshBasicMaterial({
    color: 0xfff4b8,
    transparent: true,
    opacity: 0.90,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  for (let s = 0; s < 28; s++) {
    const spk = new THREE.Mesh(bSparkGeo, bSparkMat);
    const sAng = (s / 28) * Math.PI * 2;
    const sR = 0.8 + Math.random() * 1.3;
    spk.position.set(Math.cos(sAng) * sR, -0.25 + (Math.random() - 0.5) * 0.9, Math.sin(sAng) * sR);
    spk.userData = { ang: sAng, r: sR, speed: 1.5 + Math.random() * 1.5, vy: (Math.random() - 0.5) * 0.02 };
    bellGroup.add(spk);
    bellSparks.push(spk);
  }

  // แสงนวลทองละมุนตา สบายตา ไม่สว่างจ้ากลบองค์พระแม่กวนอิม
  const bellLight = new THREE.PointLight(0xffea00, 1.2, 5.0);
  bellLight.position.set(0, -0.2, 0.3);
  bellGroup.add(bellLight);

  scene.add(bellGroup);
  activeGoldenBell = bellGroup;
  createCarpetRipple(0, 0.05, 2.1, 0xffd700);

  let t = 0;
  const swingInterval = setInterval(() => {
    t += 0.045;
    if (activeGoldenBell === bellGroup) {
      // Striker beam strikes at t ~ 0.15, sending bell swinging to the left
      const strikeOffset = (t < 0.22)
        ? Math.sin((t / 0.22) * Math.PI) * -0.22
        : Math.min(0.32, (t - 0.22) * 0.35);
      strikerGroup.position.x = 0.95 + strikeOffset;

      const swing = -Math.sin(Math.max(0, t - 0.12) * 4.6) * Math.exp(-t * 0.34) * 0.30;
      bellSwingGroup.rotation.z = swing;
      clapper.position.x = -swing * 0.38;
      tassel.rotation.z = -swing * 1.35;

      haloMesh.rotation.z += 0.024;
      haloMesh.scale.setScalar(1.0 + Math.sin(t * 3.4) * 0.24);
      waveRing2.rotation.z -= 0.030;
      waveRing2.scale.setScalar(1.0 + Math.sin(t * 3.0 + 0.5) * 0.30);
      waveRing3.rotation.z += 0.018;
      waveRing3.scale.setScalar(1.0 + Math.sin(t * 2.6 + 1.0) * 0.35);

      // Pulse horizontal acoustic ring outward every cycle
      const sonicPhase = (t * 0.85) % 1.0;
      sonicRing.scale.setScalar(1.0 + sonicPhase * 3.4);
      sonicRing.material.opacity = (1.0 - sonicPhase) * 0.35;

      bellSparks.forEach(sp => {
        sp.userData.ang += sp.userData.speed * 0.03;
        sp.position.x = Math.cos(sp.userData.ang) * sp.userData.r;
        sp.position.z = Math.sin(sp.userData.ang) * sp.userData.r;
        sp.position.y += sp.userData.vy;
      });

      if (t > 5.4) {
        clearInterval(swingInterval);
        scene.remove(bellGroup);
        activeGoldenBell = null;
      }
    } else {
      clearInterval(swingInterval);
    }
  }, 30);
}

// ── Tier 6: 3-Tier Jade & Gold Lotus Chalice Fountain, Guanyin Ambrosia Vase & Swallowtail Butterflies (💰 / 🦢) ─
let activeCrystalFountain = null;
let cachedButterflyWingTex = null;

function getButterflyWingTexture() {
  if (cachedButterflyWingTex) return cachedButterflyWingTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Upper Forewing & Lower Swallowtail Hindwing (Right Wing facing +X from x=0 hinge)
  const grad = ctx.createRadialGradient(36, 118, 10, 140, 128, 185);
  grad.addColorStop(0.0, 'rgba(255, 255, 220, 0.98)');
  grad.addColorStop(0.45, 'rgba(255, 220, 90, 0.92)');
  grad.addColorStop(0.82, 'rgba(0, 245, 212, 0.88)');
  grad.addColorStop(1.0, 'rgba(255, 105, 180, 0.95)');

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#fff5b8';
  ctx.lineWidth = 4;

  // Upper Forewing
  ctx.beginPath();
  ctx.moveTo(8, 120);
  ctx.bezierCurveTo(60, 18, 225, 12, 240, 78);
  ctx.bezierCurveTo(248, 122, 165, 148, 12, 136);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower Swallowtail Hindwing
  ctx.beginPath();
  ctx.moveTo(10, 134);
  ctx.bezierCurveTo(155, 142, 212, 184, 182, 226);
  ctx.bezierCurveTo(158, 250, 132, 228, 118, 248);
  ctx.bezierCurveTo(72, 228, 24, 188, 10, 134);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden Filigree Wing Veins & Pearl Marginal Spots
  ctx.strokeStyle = 'rgba(255, 248, 200, 0.78)';
  ctx.lineWidth = 2.2;
  const veins = [[210, 68], [198, 108], [164, 178], [122, 214]];
  for (const [vx, vy] of veins) {
    ctx.beginPath();
    ctx.moveTo(14, 128);
    ctx.lineTo(vx, vy);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(vx - 8, vy, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedButterflyWingTex = new THREE.CanvasTexture(canvas);
  cachedButterflyWingTex.minFilter = THREE.LinearFilter;
  return cachedButterflyWingTex;
}

function triggerCrystalFountainEffect() {
  templeAudio.playLotusChime();
  templeAudio.playBell(528, 5.0);

  if (activeCrystalFountain) {
    scene.remove(activeCrystalFountain);
    activeCrystalFountain = null;
  }

  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0.1, 2.3);

  const marbleGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf6fffb,
    metalness: 0.45,
    roughness: 0.14,
    emissive: 0x165c52,
    emissiveIntensity: 0.32
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.11,
    emissive: 0xaa7700,
    emissiveIntensity: 0.48
  });

  // 1. 3-Tier Carved White Jade & Gold Lotus Chalice Fountain (น้ำพุหยกขาว 3 ชั้นทรงพานดอกบัว)
  const tiers = [
    { rTop: 0.96, rBot: 0.68, h: 0.22, y: 0.08, petals: 16 },
    { rTop: 0.62, rBot: 0.36, h: 0.18, y: 0.52, petals: 12 },
    { rTop: 0.36, rBot: 0.20, h: 0.15, y: 0.94, petals: 8 }
  ];

  tiers.forEach((tr) => {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(tr.rTop, tr.rBot, tr.h, 24), marbleGoldMat);
    basin.position.y = tr.y;
    fountainGroup.add(basin);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(tr.rTop, 0.028, 10, 28), goldTrimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = tr.y + tr.h * 0.5;
    fountainGroup.add(rim);

    // Shimmering Turquoise Water Surface inside each Basin
    const waterDisc = new THREE.Mesh(
      new THREE.CircleGeometry(tr.rTop - 0.02, 28),
      new THREE.MeshBasicMaterial({
        map: getLotusPondTexture(),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = tr.y + tr.h * 0.48;
    fountainGroup.add(waterDisc);

    // Sculpted Golden Lotus Petals hugging each Basin Rim
    for (let p = 0; p < tr.petals; p++) {
      const pang = (p / tr.petals) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 5), goldTrimMat);
      pet.position.set(Math.cos(pang) * (tr.rTop - 0.02), tr.y + 0.02, Math.sin(pang) * (tr.rTop - 0.02));
      pet.rotation.z = -Math.cos(pang) * 0.42;
      pet.rotation.x = Math.sin(pang) * 0.42;
      fountainGroup.add(pet);
    }
  });

  // Carved Central Pedestal Column supporting the 3 Tiers
  const centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.92, 16), goldTrimMat);
  centerPillar.position.y = 0.50;
  fountainGroup.add(centerPillar);

  // 2. Tilted Sacred White-Jade Guanyin Ambrosia Vase Crown (แจกันหยกขาวน้ำทิพย์พระแม่กวนอิมรินน้ำอมฤต)
  const vaseGroup = new THREE.Group();
  vaseGroup.position.set(0, 1.48, 0);
  vaseGroup.rotation.z = 0.42; // Gracefully tilted pouring ambrosia water

  const vaseBelly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 16), marbleGoldMat);
  vaseBelly.scale.set(1.0, 1.28, 1.0);
  vaseGroup.add(vaseBelly);

  const vaseNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.068, 0.20, 14), marbleGoldMat);
  vaseNeck.position.y = 0.22;
  vaseGroup.add(vaseNeck);

  const vaseLip = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.014, 8, 16), goldTrimMat);
  vaseLip.rotation.x = Math.PI / 2;
  vaseLip.position.y = 0.31;
  vaseGroup.add(vaseLip);

  // Sacred Emerald Willow Branch sticking out of Vase (กิ่งหลิวทิพย์)
  const willowBranch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.012, 0.28, 6),
    new THREE.MeshBasicMaterial({ color: 0x2ef58a })
  );
  willowBranch.position.set(-0.04, 0.38, 0);
  willowBranch.rotation.z = -0.55;
  vaseGroup.add(willowBranch);

  fountainGroup.add(vaseGroup);

  // Central Glowing Ambrosia Column & 8 Animated Parabolic Cascading Water Streams (สายน้ำพุโค้ง 8 ทิศ)
  const coreStream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.16, 0.62, 16),
    new THREE.MeshBasicMaterial({ color: 0x96fff2, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  coreStream.position.set(0.08, 1.18, 0);
  fountainGroup.add(coreStream);

  const waterBeads = [];
  const beadGeo = new THREE.SphereGeometry(0.036, 8, 8);
  const beadMat = new THREE.MeshBasicMaterial({
    color: 0x96fff2,
    transparent: true,
    opacity: 0.90,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  for (let dir = 0; dir < 8; dir++) {
    const dirAng = (dir / 8) * Math.PI * 2;
    for (let step = 0; step < 7; step++) {
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.userData = {
        dirAng,
        phase: step / 7,
        speed: 0.025 + (dir % 2) * 0.004
      };
      fountainGroup.add(bead);
      waterBeads.push(bead);
    }
  }

  // 3. 12 Rotating Multi-Cut Floating Jewels + 8 Authentic Boat-Shaped Golden Yuanbao Ingots
  const gemPalette = [0xff1744, 0x00e676, 0xffd700, 0x0099ff, 0xffffff, 0xbb00ff];
  const gems = [];
  for (let g = 0; g < 12; g++) {
    const gang = (g / 12) * Math.PI * 2;
    const gMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.115),
      new THREE.MeshStandardMaterial({
        color: gemPalette[g % gemPalette.length],
        emissive: gemPalette[g % gemPalette.length],
        emissiveIntensity: 0.72,
        roughness: 0.08,
        metalness: 0.95
      })
    );
    gMesh.position.set(Math.cos(gang) * 0.72, 0.65 + (g % 3) * 0.22, Math.sin(gang) * 0.72);
    gMesh.userData = { angle: gang, r: 0.72, speed: 0.042 };
    fountainGroup.add(gMesh);
    gems.push(gMesh);
  }

  // 8 Sculpted Boat-Shaped Chinese Gold Yuanbao Ingots (ก้อนทองคำหยวนเป่าทรงเรือสำเภา)
  for (let sy = 0; sy < 8; sy++) {
    const syAng = (sy / 8) * Math.PI * 2 + 0.25;
    const ingotGroup = new THREE.Group();

    const boatHull = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.065, 0.065, 12), goldTrimMat);
    boatHull.scale.set(1.55, 0.85, 0.88);
    ingotGroup.add(boatHull);

    const centerBump = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), goldTrimMat);
    centerBump.scale.set(1.15, 0.75, 0.85);
    centerBump.position.y = 0.032;
    ingotGroup.add(centerBump);

    ingotGroup.position.set(Math.cos(syAng) * 1.04, 0.42 + (sy % 2) * 0.22, Math.sin(syAng) * 1.04);
    ingotGroup.userData = { angle: syAng, r: 1.04, speed: -0.034 };
    fountainGroup.add(ingotGroup);
    gems.push(ingotGroup);
  }

  // 4. 18 Glowing Swallowtail Butterflies with Painted Filigree Wings (ผีเสื้อทิพย์หางติ่งกระพือปีก 3 มิติ)
  const bflies = [];
  const wingTex = getButterflyWingTexture();
  const wingGeoR = new THREE.PlaneGeometry(0.16, 0.22);
  wingGeoR.translate(0.08, 0, 0); // Hinge at x = 0
  const wingGeoL = new THREE.PlaneGeometry(0.16, 0.22);
  wingGeoL.scale(-1, 1, 1);
  wingGeoL.translate(-0.08, 0, 0); // Hinge at x = 0

  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const bGroup = new THREE.Group();
    const bColor = (i % 3 === 0) ? 0xffe866 : (i % 3 === 1) ? 0x80fff2 : 0xff99d6;
    const bMat = new THREE.MeshBasicMaterial({
      map: wingTex,
      color: bColor,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const wingL = new THREE.Mesh(wingGeoL, bMat);
    const wingR = new THREE.Mesh(wingGeoR, bMat);
    bGroup.add(wingL);
    bGroup.add(wingR);

    bGroup.position.set(Math.cos(angle) * 0.45, 0.48 + (i % 3) * 0.15, Math.sin(angle) * 0.45);
    bGroup.userData = {
      angle,
      r: 0.45 + Math.random() * 0.55,
      speed: 1.35 + Math.random() * 0.75,
      vy: 0.020 + Math.random() * 0.015,
      wingL,
      wingR
    };
    fountainGroup.add(bGroup);
    bflies.push(bGroup);
  }

  // 5. Twin Crystal Water Geysers & Arched Rainbow Water Bridge (น้ำพุคู่จากสระสองฝั่งเชื่อมสะพานรุ้ง)
  const rainbowBridgeGroup = new THREE.Group();
  const rainbowGeo = new THREE.TorusGeometry(4.2, 0.12, 12, 48, Math.PI);
  const rainbowMat = new THREE.MeshBasicMaterial({
    color: 0x96fff2,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const rainbowArc = new THREE.Mesh(rainbowGeo, rainbowMat);
  rainbowArc.position.set(0, 0.15, 3.5);
  rainbowBridgeGroup.add(rainbowArc);

  const rainbowInnerMat = new THREE.MeshBasicMaterial({
    color: 0xff66b2,
    transparent: true,
    opacity: 0.50,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const rainbowInner = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.08, 10, 48, Math.PI), rainbowInnerMat);
  rainbowInner.position.set(0, 0.15, 3.5);
  rainbowBridgeGroup.add(rainbowInner);

  [-4.2, 4.2].forEach(gx => {
    const pRipple = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 1.25, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    pRipple.rotation.x = -Math.PI / 2;
    pRipple.position.set(gx, 0.16, 3.5);
    rainbowBridgeGroup.add(pRipple);
  });
  fountainGroup.add(rainbowBridgeGroup);

  const fLight = new THREE.PointLight(0x00f5d4, 4.0, 8.5);
  fLight.position.y = 1.35;
  fountainGroup.add(fLight);

  scene.add(fountainGroup);
  activeCrystalFountain = fountainGroup;
  createCarpetRipple(0, 0.05, 2.3, 0x00f5d4);
  createLotusBloomDecal(0, 0.05, 2.3, 0x00f5d4);

  let ft = 0;
  const fInterval = setInterval(() => {
    ft += 0.04;
    if (activeCrystalFountain === fountainGroup) {
      vaseGroup.position.y = 1.48 + Math.sin(ft * 3.5) * 0.04;
      coreStream.scale.x = 0.9 + Math.sin(ft * 9.0) * 0.15;
      coreStream.scale.z = 0.9 + Math.cos(ft * 9.0) * 0.15;

      rainbowArc.rotation.z = Math.sin(ft * 2.5) * 0.02;
      rainbowInner.rotation.z = -Math.sin(ft * 2.5) * 0.02;

      // Animate parabolic cascading water streams from top bowl to bottom pool
      waterBeads.forEach(wb => {
        wb.userData.phase = (wb.userData.phase + wb.userData.speed) % 1.0;
        const p = wb.userData.phase;
        const rad = 0.18 + p * 0.76;
        const height = 1.08 + Math.sin(p * Math.PI) * 0.32 - p * 0.92;
        wb.position.set(
          Math.cos(wb.userData.dirAng) * rad,
          height,
          Math.sin(wb.userData.dirAng) * rad
        );
        const s = 0.7 + Math.sin(p * Math.PI) * 0.6;
        wb.scale.setScalar(s);
      });

      gems.forEach(gm => {
        gm.userData.angle += gm.userData.speed;
        gm.position.x = Math.cos(gm.userData.angle) * gm.userData.r;
        gm.position.z = Math.sin(gm.userData.angle) * gm.userData.r;
        gm.rotation.y += 0.05;
        gm.rotation.x += 0.025;
      });

      bflies.forEach(b => {
        b.userData.angle += b.userData.speed * 0.045;
        b.position.x = Math.cos(b.userData.angle) * b.userData.r;
        b.position.z = Math.sin(b.userData.angle) * b.userData.r;
        b.position.y += b.userData.vy;
        b.rotation.y = -b.userData.angle + Math.PI / 2;

        const flap = Math.sin(ft * 16.0 + b.userData.angle) * 0.82;
        b.userData.wingL.rotation.y = flap;
        b.userData.wingR.rotation.y = -flap;
      });

      if (ft > 5.6) {
        clearInterval(fInterval);
        scene.remove(fountainGroup);
        activeCrystalFountain = null;
      }
    } else {
      clearInterval(fInterval);
    }
  }, 30);
}

// ── Tier 7: Grand Royal Busabok Chariot, Twin Winged Qilin Steeds & Golden Robe Procession (🏎️ / 🎵) ──
let activeRoyalCarriage = null;
function triggerRoyalCarriageEffect() {
  templeAudio.playBell(330, 5.0);
  templeAudio.playBell(660, 4.0);
  templeAudio.playBell(990, 3.5);

  if (activeRoyalCarriage) {
    scene.remove(activeRoyalCarriage);
    activeRoyalCarriage = null;
  }

  const carriageGroup = new THREE.Group();
  carriageGroup.position.set(0, 0.20, 8.5);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.11,
    emissive: 0xaa7700,
    emissiveIntensity: 0.48
  });
  const darkGoldMat = new THREE.MeshStandardMaterial({
    color: 0xb87700,
    metalness: 0.90,
    roughness: 0.20,
    emissive: 0x553300,
    emissiveIntensity: 0.30
  });
  const crimsonVelvetMat = new THREE.MeshStandardMaterial({
    color: 0xa81024,
    metalness: 0.35,
    roughness: 0.28,
    emissive: 0x4a040d,
    emissiveIntensity: 0.32
  });
  const hubMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });

  // 1. 3-Tier Carved Singha & Lotus Palanquin Base (ฐานสิงห์ย่อมุมไม้สิบสอง 3 ชั้น)
  const baseLower = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.06, 0.11, 12), goldMat);
  baseLower.position.y = 0.06;
  carriageGroup.add(baseLower);

  const baseMid = new THREE.Mesh(new THREE.CylinderGeometry(0.80, 0.90, 0.10, 12), crimsonVelvetMat);
  baseMid.position.y = 0.16;
  carriageGroup.add(baseMid);

  const baseUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.82, 0.09, 12), goldMat);
  baseUpper.position.y = 0.25;
  carriageGroup.add(baseUpper);

  // Carved Golden Lotus Petals around Chariot Base
  for (let lp = 0; lp < 16; lp++) {
    const lang = (lp / 16) * Math.PI * 2;
    const lPet = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 5), goldMat);
    lPet.position.set(Math.cos(lang) * 0.84, 0.26, Math.sin(lang) * 0.84);
    lPet.rotation.z = -Math.cos(lang) * 0.4;
    lPet.rotation.x = Math.sin(lang) * 0.4;
    carriageGroup.add(lPet);
  }

  // Twin Curved Golden Naga / Swan Prows at Front of Chariot (หัวราชรถพญานาคคู่ชูคอ)
  [-0.34, 0.34].forEach(px => {
    const prowGroup = new THREE.Group();
    prowGroup.position.set(px, 0.22, -0.82);
    const prowArch = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.036, 10, 20, Math.PI * 0.85), goldMat);
    prowArch.rotation.y = Math.PI / 2;
    prowArch.rotation.z = -Math.PI * 0.25;
    prowGroup.add(prowArch);

    const nagaCrest = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), goldMat);
    nagaCrest.position.set(0, 0.28, -0.18);
    nagaCrest.rotation.x = -0.35;
    prowGroup.add(nagaCrest);
    carriageGroup.add(prowGroup);
  });

  // 2. 4 Ornate 12-Spoke Filigree Golden Wheels with Lotus Hubcaps (ล้อราชรถทองคำ 12 ซี่)
  const wheelOuterGeo = new THREE.TorusGeometry(0.27, 0.036, 10, 28);
  const wheelInnerGeo = new THREE.TorusGeometry(0.18, 0.018, 8, 24);
  const wheels = [];
  const wheelOffsets = [
    { x: -0.78, z: -0.48 }, { x: 0.78, z: -0.48 },
    { x: -0.78, z: 0.48 }, { x: 0.78, z: 0.48 }
  ];
  wheelOffsets.forEach(pos => {
    const wGroup = new THREE.Group();
    wGroup.position.set(pos.x, 0.07, pos.z);

    const spinNode = new THREE.Group();
    const rim = new THREE.Mesh(wheelOuterGeo, goldMat);
    rim.rotation.y = Math.PI / 2;
    spinNode.add(rim);

    const innerRim = new THREE.Mesh(wheelInnerGeo, darkGoldMat);
    innerRim.rotation.y = Math.PI / 2;
    spinNode.add(innerRim);

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), hubMat);
    spinNode.add(hub);

    for (let sp = 0; sp < 6; sp++) {
      const spMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.52, 6), goldMat);
      spMesh.rotation.z = (sp / 6) * Math.PI;
      spMesh.rotation.y = Math.PI / 2;
      spinNode.add(spMesh);
    }

    wGroup.add(spinNode);
    wGroup.userData = { spinNode };
    carriageGroup.add(wGroup);
    wheels.push(wGroup);
  });

  // 3. 4 Carved Busabok Pillars with Golden Naga Brackets (เสาบุษบกพร้อมคันทวยพญานาค)
  const pillarGeo = new THREE.CylinderGeometry(0.038, 0.048, 1.12, 10);
  const pillarOffsets = [
    { x: -0.44, z: -0.34 }, { x: 0.44, z: -0.34 },
    { x: -0.44, z: 0.34 }, { x: 0.44, z: 0.34 }
  ];
  pillarOffsets.forEach(po => {
    const pMesh = new THREE.Mesh(pillarGeo, goldMat);
    pMesh.position.set(po.x, 0.80, po.z);
    carriageGroup.add(pMesh);

    const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 6, 12, Math.PI * 0.7), goldMat);
    bracket.position.set(po.x * 1.15, 1.18, po.z);
    bracket.rotation.z = (po.x > 0) ? -0.4 : 0.4;
    carriageGroup.add(bracket);
  });

  // 4. 7-Tier Royal Busabok Spire Roof + 2 Flanking 5-Tier Royal Chhatra Parasols (ยอดบุษบก 7 ชั้น และฉัตรทองคู่)
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(0, 1.32, 0);
  for (let lvl = 0; lvl < 7; lvl++) {
    const rad = 0.62 - lvl * 0.075;
    const tierMesh = new THREE.Mesh(new THREE.ConeGeometry(rad, 0.10, 12), (lvl % 2 === 0) ? goldMat : darkGoldMat);
    tierMesh.position.y = lvl * 0.10;
    canopyGroup.add(tierMesh);

    if (lvl === 0) {
      for (let b = 0; b < 8; b++) {
        const bAng = (b / 8) * Math.PI * 2;
        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 8), hubMat);
        bell.position.set(Math.cos(bAng) * (rad - 0.02), -0.05, Math.sin(bAng) * (rad - 0.02));
        canopyGroup.add(bell);
      }
    }
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 8), hubMat);
  spire.position.y = 0.82;
  canopyGroup.add(spire);
  carriageGroup.add(canopyGroup);

  // Twin Flanking 5-Tier Royal Chhatra Parasols
  [-0.68, 0.68].forEach(cx => {
    const chhatra = new THREE.Group();
    chhatra.position.set(cx, 0.30, 0.25);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 1.15, 8), goldMat);
    pole.position.y = 0.55;
    chhatra.add(pole);
    for (let cl = 0; cl < 5; cl++) {
      const cDisc = new THREE.Mesh(new THREE.ConeGeometry(0.22 - cl * 0.032, 0.05, 12), goldMat);
      cDisc.position.y = 0.72 + cl * 0.08;
      chhatra.add(cDisc);
    }
    carriageGroup.add(chhatra);
  });

  // 5. Sacred Diamond-Gold Relic Urn & Flowing Kasaya Brocade (พระโกศเพชรทองคำและผ้าไตรจีวรทิพย์)
  const casket = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffea55,
      emissive: 0xffaa00,
      emissiveIntensity: 0.78,
      metalness: 0.96,
      roughness: 0.08
    })
  );
  casket.scale.set(0.85, 1.35, 0.85);
  casket.position.set(0, 0.52, 0);
  carriageGroup.add(casket);

  const robeGeo = new THREE.PlaneGeometry(1.25, 0.90, 14, 14);
  const robeMat = new THREE.MeshStandardMaterial({
    color: 0xffb300,
    emissive: 0xff8800,
    emissiveIntensity: 0.52,
    metalness: 0.55,
    roughness: 0.26,
    side: THREE.DoubleSide
  });
  const robeMesh = new THREE.Mesh(robeGeo, robeMat);
  robeMesh.rotation.x = -Math.PI / 3;
  robeMesh.position.set(0, 0.36, 0.22);
  carriageGroup.add(robeMesh);

  // 6. Descending Vertical Sunbeam Light Column (เสาฉัพพรรณรังสีส่องตรงจากสวรรค์)
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.75, 6.2, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffea88,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  beam.position.set(0, 3.2, 0);
  carriageGroup.add(beam);

  // 7. Twin Sculpted Winged Celestial Qilin / Pegasus Steeds with 4 Animated Legs & Golden Reins (คู่กิเลนสวรรค์มีปีก 2 ตัวเคียงกัน)
  const qilinSteeds = [];
  const qilinMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xffd24c,
    emissiveIntensity: 0.58,
    metalness: 0.45,
    roughness: 0.18
  });
  const wingTex = getButterflyWingTexture();
  const qWingMat = new THREE.MeshBasicMaterial({
    map: wingTex,
    color: 0x96fff2,
    transparent: true,
    opacity: 0.90,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  [-0.36, 0.36].forEach((qx, qIdx) => {
    const qilin = new THREE.Group();
    qilin.position.set(qx, 0.44, -1.48);

    // Muscular Torso
    const qBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), qilinMat);
    qBody.scale.set(0.78, 0.82, 1.55);
    qilin.add(qBody);

    // Arched Neck & Sculpted Head + Snout + Branched Golden Antlers
    const qNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.26, 10), qilinMat);
    qNeck.position.set(0, 0.15, -0.22);
    qNeck.rotation.x = 0.45;
    qilin.add(qNeck);

    const qHead = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 10), qilinMat);
    qHead.scale.set(0.85, 0.90, 1.25);
    qHead.position.set(0, 0.26, -0.32);
    qilin.add(qHead);

    [-0.04, 0.04].forEach(hx => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.20, 6), goldMat);
      horn.position.set(hx, 0.38, -0.28);
      horn.rotation.x = -0.45;
      horn.rotation.z = hx * 2.5;
      qilin.add(horn);
    });

    // Flowing Golden Flame Tail
    const qTail = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.32, 8), goldMat);
    qTail.position.set(0, 0.08, 0.34);
    qTail.rotation.x = 1.15;
    qilin.add(qTail);

    // 4 Articulated Galloping Legs
    const qLegs = [];
    const legPos = [
      { x: -0.09, z: -0.16, phase: 0 },
      { x: 0.09, z: -0.16, phase: Math.PI },
      { x: -0.09, z: 0.16, phase: Math.PI },
      { x: 0.09, z: 0.16, phase: 0 }
    ];
    legPos.forEach(lp => {
      const legPivot = new THREE.Group();
      legPivot.position.set(lp.x, -0.06, lp.z);
      const legCol = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.28, 8), qilinMat);
      legCol.position.y = -0.14;
      legPivot.add(legCol);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.04, 8), goldMat);
      hoof.position.y = -0.28;
      legPivot.add(hoof);
      legPivot.userData = { phase: lp.phase + qIdx * 1.2 };
      qilin.add(legPivot);
      qLegs.push(legPivot);
    });

    // Twin Feathered Celestial Wings
    const qWingL = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.34), qWingMat);
    const qWingR = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.34), qWingMat);
    qWingL.position.set(-0.22, 0.14, -0.04);
    qWingR.position.set(0.22, 0.14, -0.04);
    qWingL.rotation.y = Math.PI / 5;
    qWingR.rotation.y = -Math.PI / 5;
    qilin.add(qWingL);
    qilin.add(qWingR);

    // Golden Silk Rein connecting Qilin to Chariot Prow
    const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.68, 6), goldMat);
    rein.rotation.x = Math.PI / 2;
    rein.position.set(0, 0.06, 0.36);
    qilin.add(rein);

    qilin.userData = { wingL: qWingL, wingR: qWingR, legs: qLegs, tail: qTail, phase: qIdx * 1.5 };
    carriageGroup.add(qilin);
    qilinSteeds.push(qilin);
  });

  const cLight = new THREE.PointLight(0xffd700, 3.8, 7.5);
  cLight.position.set(0, 0.95, 0);
  carriageGroup.add(cLight);

  scene.add(carriageGroup);
  activeRoyalCarriage = carriageGroup;

  let ct = 0;
  let lastRippleZ = 8.5;
  const cInterval = setInterval(() => {
    ct += 0.035;
    if (activeRoyalCarriage === carriageGroup) {
      const currentZ = THREE.MathUtils.lerp(8.5, 2.2, Math.min(1.0, ct * 0.65));
      carriageGroup.position.z = currentZ;

      // Realistic 12-spoke wheel rotation
      wheels.forEach(w => {
        w.userData.spinNode.rotation.x -= 0.18;
      });

      casket.rotation.y += 0.04;
      casket.position.y = 0.52 + Math.sin(ct * 4.0) * 0.04;
      robeMesh.rotation.z = Math.sin(ct * 4.2) * 0.08;
      beam.rotation.y += 0.02;
      beam.material.opacity = 0.20 + Math.sin(ct * 5.0) * 0.10;

      // Animate Twin Winged Qilin Steeds Galloping & Flapping
      qilinSteeds.forEach(q => {
        const qp = q.userData.phase;
        q.position.y = 0.44 + Math.sin(ct * 9.0 + qp) * 0.055;
        q.rotation.x = Math.cos(ct * 9.0 + qp) * 0.08;
        const wingFlap = Math.sin(ct * 15.0 + qp) * 0.68;
        q.userData.wingL.rotation.z = wingFlap;
        q.userData.wingR.rotation.z = -wingFlap;
        q.userData.tail.rotation.y = Math.sin(ct * 10.0 + qp) * 0.25;
        q.userData.legs.forEach(leg => {
          leg.rotation.x = Math.sin(ct * 12.0 + leg.userData.phase) * 0.52;
        });
      });

      if (Math.abs(lastRippleZ - currentZ) > 1.1) {
        lastRippleZ = currentZ;
        createCarpetRipple(0, 0.05, currentZ, 0xffd700);
        createLotusBloomDecal(0, 0.05, currentZ, 0xffd700);
        spawnBlessingSparks(0, 0.3, currentZ, 6, 0xffea70);
      }

      if (ct > 5.8) {
        clearInterval(cInterval);
        createCarpetRipple(0, 0.05, 2.2, 0xffaa00);
        createLotusBloomDecal(0, 0.05, 2.2, 0xffaa00);
        scene.remove(carriageGroup);
        activeRoyalCarriage = null;
      }
    } else {
      clearInterval(cInterval);
    }
  }, 30);
}

// ── Tier 8: Merit Cosmic Fireworks, Royal White Elephant & Square-Hole Gold Coins (🐘 / 🎆) ─
let activeFireworks = null;
let cachedAncientCoinTex = null;

function getAncientGoldCoinTexture() {
  if (cachedAncientCoinTex) return cachedAncientCoinTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const cx = 64, cy = 64;

  // Fill square background with metallic gold so cylinder sides & corners have zero black artifacts
  ctx.fillStyle = '#b87700';
  ctx.fillRect(0, 0, 128, 128);

  // Metallic Gold Disc with Raised Rim
  const g = ctx.createRadialGradient(cx - 12, cy - 12, 6, cx, cy, 60);
  g.addColorStop(0.0, '#fffac2');
  g.addColorStop(0.55, '#ffd700');
  g.addColorStop(1.0, '#b87700');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fff5b0';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 55, 0, Math.PI * 2);
  ctx.stroke();

  // Center Square Hole Rim (เหรียญทองโบราณรูสี่เหลี่ยม)
  ctx.fillStyle = '#5c3800';
  ctx.strokeStyle = '#fff5b0';
  ctx.lineWidth = 3.5;
  ctx.fillRect(cx - 16, cy - 16, 32, 32);
  ctx.strokeRect(cx - 16, cy - 16, 32, 32);

  cachedAncientCoinTex = new THREE.CanvasTexture(canvas);
  cachedAncientCoinTex.minFilter = THREE.LinearFilter;
  return cachedAncientCoinTex;
}

function disposeFireworksGroup(group) {
  if (!group) return;
  try {
    scene.remove(group);
    group.traverse(obj => {
      if (obj.geometry) {
        try { obj.geometry.dispose(); } catch (e) { }
      }
      if (obj.material) {
        try {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        } catch (e) { }
      }
    });
  } catch (err) {
    console.warn('[Fireworks Disposal]', err);
  }
}

function triggerFireworksEffect() {
  templeAudio.playBell(216, 6.0);
  templeAudio.playBell(432, 6.0);
  templeAudio.playBell(864, 4.5);
  templeAudio.playBell(1296, 3.5);

  if (activeFireworks) {
    disposeFireworksGroup(activeFireworks);
    activeFireworks = null;
  }

  const fwGroup = new THREE.Group();
  fwGroup.position.set(0, 0, 0);

  if (altarGlow) altarGlow.intensity = 5.4;
  if (carpetLight) carpetLight.intensity = 5.6;

  // 1. 5 Multi-Stage Cosmic Peony & Golden Willow Fireworks Bursts + Sky Lotus Rings
  const sparkGeo = new THREE.SphereGeometry(0.058, 6, 6);
  const sparks = [];
  const sparkColors = [0xffd700, 0xff1744, 0x00f5d4, 0xffffff, 0xff9100, 0xb388ff, 0x76ff03];
  const burstHubs = [
    { x: 0, y: 5.7, z: 2.2 },
    { x: -2.3, y: 4.9, z: 3.1 },
    { x: 2.3, y: 4.9, z: 3.1 },
    { x: -1.3, y: 5.3, z: 4.1 },
    { x: 1.3, y: 5.3, z: 4.1 }
  ];

  const shockwaves = [];
  const lotusTex = getLotusDecalTexture();
  burstHubs.forEach((hub, hIdx) => {
    // Expanding Golden Lotus Mandala Ring in the Sky at each Burst Hub
    const sw = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({
        map: lotusTex,
        color: (hIdx % 2 === 0) ? 0xffe866 : 0x96fff2,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    sw.position.set(hub.x, hub.y, hub.z);
    fwGroup.add(sw);
    shockwaves.push(sw);

    // 54 Dual-Shell Sparks per Burst Hub (Inner Core + Outer Golden Willow)
    for (let i = 0; i < 54; i++) {
      const isInner = i < 20;
      const sMat = new THREE.MeshBasicMaterial({
        color: isInner ? 0xfff6b0 : sparkColors[i % sparkColors.length],
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const s = new THREE.Mesh(sparkGeo, sMat);
      s.position.set(hub.x, hub.y, hub.z);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = isInner ? (0.028 + Math.random() * 0.032) : (0.055 + Math.random() * 0.075);
      s.userData = {
        vx: Math.cos(theta) * Math.cos(phi) * speed,
        vy: Math.sin(phi) * speed + 0.022,
        vz: Math.sin(theta) * Math.cos(phi) * speed,
        gravity: 0.0015
      };
      fwGroup.add(s);
      sparks.push(s);
    }
  });

  // 2. Sculpted Royal White Elephant of Merit with Full Anatomy & Golden Howdah (พระยาช้างเผือกทรงเครื่องคชสารมงคล)
  const elephantGroup = new THREE.Group();
  elephantGroup.position.set(0, 4.35, 2.0);

  const eleMat = new THREE.MeshStandardMaterial({
    color: 0xfffaf0,
    emissive: 0xffbf33,
    emissiveIntensity: 0.58,
    metalness: 0.35,
    roughness: 0.20,
    transparent: true,
    opacity: 0.96
  });
  const goldOrnamentMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.12,
    emissive: 0xaa7700,
    emissiveIntensity: 0.50
  });
  const crimsonClothMat = new THREE.MeshStandardMaterial({
    color: 0xb81428,
    metalness: 0.45,
    roughness: 0.25,
    emissive: 0x550610,
    emissiveIntensity: 0.35
  });
  const tuskMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffe880,
    emissiveIntensity: 0.55,
    metalness: 0.75,
    roughness: 0.10
  });

  // Elephant Muscular Torso & Crimson-Gold Royal Saddle Blanket (ผ้าปกหลังตาดทอง)
  const eleBody = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), eleMat);
  eleBody.scale.set(0.92, 0.88, 1.36);
  elephantGroup.add(eleBody);

  const saddleCloth = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.52, 16, 1, false, -Math.PI * 0.38, Math.PI * 0.76), crimsonClothMat);
  saddleCloth.rotation.z = Math.PI / 2;
  saddleCloth.rotation.y = Math.PI / 2;
  saddleCloth.position.set(0, 0.04, 0);
  elephantGroup.add(saddleCloth);

  // 4 Articulated Pillar Legs with Golden Anklets (ขาช้าง 4 ขาพร้อมกำไลข้อเท้าทองคำ)
  const eleLegs = [];
  const eleLegOffsets = [
    { x: -0.24, z: -0.34, phase: 0 },
    { x: 0.24, z: -0.34, phase: Math.PI },
    { x: -0.24, z: 0.34, phase: Math.PI },
    { x: 0.24, z: 0.34, phase: 0 }
  ];
  eleLegOffsets.forEach(lp => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lp.x, -0.22, lp.z);
    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.48, 12), eleMat);
    legMesh.position.y = -0.20;
    legPivot.add(legMesh);

    const anklet = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.020, 8, 16), goldOrnamentMat);
    anklet.rotation.x = Math.PI / 2;
    anklet.position.y = -0.38;
    legPivot.add(anklet);

    legPivot.userData = { phase: lp.phase };
    elephantGroup.add(legPivot);
    eleLegs.push(legPivot);
  });

  // Sculpted Head, Forehead Golden Plaque & Flapping Ears (กะบังหน้าทองคำและใบหูช้างคู่)
  const eleHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), eleMat);
  eleHead.position.set(0, 0.26, -0.48);
  elephantGroup.add(eleHead);

  const foreheadCrown = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.24, 8), goldOrnamentMat);
  foreheadCrown.position.set(0, 0.56, -0.52);
  elephantGroup.add(foreheadCrown);

  const eleEars = [];
  [-1, 1].forEach(side => {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.28, 0.26, -0.44);
    const earMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), eleMat);
    earMesh.scale.set(0.95, 1.15, 0.22);
    earMesh.position.x = side * 0.12;
    earPivot.add(earMesh);
    earPivot.userData = { side };
    elephantGroup.add(earPivot);
    eleEars.push(earPivot);
  });

  // Curved Upward Trumpeting Trunk holding a Glowing Sacred Lotus (งวงชูดอกบัวทิพย์)
  const trunkMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.072, 10, 20, Math.PI * 0.85),
    eleMat
  );
  trunkMesh.rotation.x = -Math.PI / 2;
  trunkMesh.rotation.y = Math.PI / 2;
  trunkMesh.position.set(0, 0.34, -0.72);
  elephantGroup.add(trunkMesh);

  const trunkLotus = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff66b2 })
  );
  trunkLotus.position.set(0, 0.58, -0.88);
  elephantGroup.add(trunkLotus);

  // Twin Ivory Tusks ringed with Golden Bands (งาคู่รัดปลอกทองคำ)
  [-0.16, 0.16].forEach((tx, idx) => {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.44, 10), tuskMat);
    tusk.rotation.x = -1.12;
    tusk.rotation.y = (idx === 0) ? -0.22 : 0.22;
    tusk.position.set(tx, 0.14, -0.70);
    elephantGroup.add(tusk);
  });

  // 5-Tier Royal Golden Busabok Howdah Pavilion on Elephant Back (สัปคับบุษบกทองคำ 5 ชั้น)
  const howdahBase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.58), goldOrnamentMat);
  howdahBase.position.set(0, 0.44, 0);
  elephantGroup.add(howdahBase);

  for (let cl = 0; cl < 5; cl++) {
    const cp = new THREE.Mesh(
      new THREE.ConeGeometry(0.38 - cl * 0.06, 0.08, 12),
      goldOrnamentMat
    );
    cp.position.set(0, 0.62 + cl * 0.09, 0);
    elephantGroup.add(cp);
  }

  // Golden Mandala Halo behind Royal White Elephant
  const eleHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.1),
    new THREE.MeshBasicMaterial({
      map: lotusTex,
      color: 0xffea70,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  eleHalo.position.set(0, 0.35, 0.35);
  elephantGroup.add(eleHalo);
  fwGroup.add(elephantGroup);

  // 3. 4 Sparkling Ruby Crystal Hearts in the Heavenly Sky (หัวใจมณีทิพย์ 4 ดวงเปล่งประกาย)
  const rubyHeartMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    emissive: 0xd50000,
    emissiveIntensity: 0.65,
    roughness: 0.12,
    metalness: 0.90
  });
  const sparkTex = getCrystalSparkTexture();
  const heartPositions = [
    { x: -1.8, y: 5.8, z: 2.5 },
    { x: 1.8, y: 5.8, z: 2.5 },
    { x: -0.9, y: 6.8, z: 2.0 },
    { x: 0.9, y: 6.8, z: 2.0 }
  ];
  const crystalHearts = [];

  heartPositions.forEach((hp, idx) => {
    const hGroup = new THREE.Group();
    hGroup.position.set(hp.x, hp.y, hp.z);

    const lobeGeo = new THREE.SphereGeometry(0.16, 12, 10);
    const coneGeo = new THREE.ConeGeometry(0.24, 0.44, 12);

    const lobeL = new THREE.Mesh(lobeGeo, rubyHeartMat);
    lobeL.position.set(-0.10, 0.10, 0);
    hGroup.add(lobeL);

    const lobeR = new THREE.Mesh(lobeGeo, rubyHeartMat);
    lobeR.position.set(0.10, 0.10, 0);
    hGroup.add(lobeR);

    const cone = new THREE.Mesh(coneGeo, rubyHeartMat);
    cone.rotation.z = Math.PI;
    cone.position.set(0, -0.10, 0);
    hGroup.add(cone);

    const sparkSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sparkTex,
      color: 0xffe066,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    sparkSprite.scale.set(1.4, 1.4, 1);
    hGroup.add(sparkSprite);

    hGroup.scale.set(0.01, 0.01, 0.01);
    fwGroup.add(hGroup);
    crystalHearts.push({ group: hGroup, sprite: sparkSprite, phase: idx * 1.5 });
  });

  // 4. 16 Ascending Glowing Sky Lanterns (โคมลอยบุญบารมี 16 ดวงลอยสู่สวรรค์)
  const skyLanterns = [];
  const lanternCylGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.26, 12);
  const lanternPaperMat = new THREE.MeshStandardMaterial({
    color: 0xffb703,
    emissive: 0xff7b00,
    emissiveIntensity: 0.85,
    roughness: 0.35,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92
  });
  for (let l = 0; l < 16; l++) {
    const lMesh = new THREE.Mesh(lanternCylGeo, lanternPaperMat);
    const lx = (Math.random() - 0.5) * 6.5;
    const lz = 1.0 + Math.random() * 6.0;
    const ly = 3.2 + Math.random() * 2.0;
    lMesh.position.set(lx, ly, lz);
    lMesh.userData = {
      vy: 0.024 + Math.random() * 0.018,
      wobbleSpeed: 1.5 + Math.random() * 2.0,
      wobblePhase: Math.random() * Math.PI * 2,
      baseX: lx
    };
    fwGroup.add(lMesh);
    skyLanterns.push(lMesh);
  }

  // 5. 64 Authentic Square-Hole Ancient Gold Coins + 18 Boat-Shaped Yuanbao Gold Ingots
  const coinGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.024, 20);
  const coinMat = new THREE.MeshStandardMaterial({
    map: getAncientGoldCoinTexture(),
    color: 0xffe866,
    metalness: 0.94,
    roughness: 0.12,
    emissive: 0xbb7700,
    emissiveIntensity: 0.48
  });

  const fallingItems = [];
  for (let i = 0; i < 64; i++) {
    const c = new THREE.Mesh(coinGeo, coinMat);
    c.position.set(
      (Math.random() - 0.5) * 5.2,
      5.8 + Math.random() * 4.2,
      1.5 + Math.random() * 6.0
    );
    c.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    c.userData = {
      vy: 0.042 + Math.random() * 0.038,
      rx: (Math.random() - 0.5) * 0.22,
      ry: (Math.random() - 0.5) * 0.22,
      rz: (Math.random() - 0.5) * 0.22,
      landed: false
    };
    fwGroup.add(c);
    fallingItems.push(c);
  }

  // 18 Boat-Shaped Golden Yuanbao Ingots
  for (let i = 0; i < 18; i++) {
    const ing = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.07, 0.07, 12), goldOrnamentMat);
    hull.scale.set(1.5, 0.85, 0.88);
    ing.add(hull);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), goldOrnamentMat);
    dome.scale.set(1.15, 0.75, 0.85);
    dome.position.y = 0.035;
    ing.add(dome);

    ing.position.set(
      (Math.random() - 0.5) * 4.5,
      6.4 + Math.random() * 3.6,
      1.8 + Math.random() * 5.0
    );
    ing.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    ing.userData = {
      vy: 0.046 + Math.random() * 0.034,
      rx: (Math.random() - 0.5) * 0.18,
      ry: (Math.random() - 0.5) * 0.18,
      rz: (Math.random() - 0.5) * 0.18,
      landed: false,
      isIngot: true
    };
    fwGroup.add(ing);
    fallingItems.push(ing);
  }

  scene.add(fwGroup);
  activeFireworks = fwGroup;

  let fwt = 0;
  let isCleanedUp = false;

  function cleanupFireworks() {
    if (isCleanedUp) return;
    isCleanedUp = true;
    clearInterval(fwInterval);
    clearTimeout(safetyTimeout);
    disposeFireworksGroup(fwGroup);
    if (activeFireworks === fwGroup) {
      activeFireworks = null;
    }
  }

  // Safety watchdog timer: guarantees removal even in anomalous network/browser delays
  const safetyTimeout = setTimeout(() => {
    if (activeFireworks === fwGroup) {
      cleanupFireworks();
    }
  }, 7500);

  const fwInterval = setInterval(() => {
    try {
      fwt += 0.035;
      if (activeFireworks === fwGroup) {
        shockwaves.forEach((sw, idx) => {
          sw.scale.addScalar(0.055);
          sw.rotation.z += (idx % 2 === 0 ? 0.03 : -0.03);
          sw.material.opacity = Math.max(0, sw.material.opacity - 0.020);
        });

        sparks.forEach(s => {
          s.position.x += s.userData.vx;
          s.position.y += s.userData.vy;
          s.position.z += s.userData.vz;
          s.userData.vy -= s.userData.gravity;
          s.material.opacity = Math.max(0, s.material.opacity - 0.009);
        });

        // Animate 4 Sparkling Ruby Crystal Hearts (Fixed: Sprite.material.rotation prevents TypeError)
        crystalHearts.forEach(ch => {
          const hProg = Math.min(1.0, fwt * 1.8);
          const easeScale = 0.95 + Math.sin(fwt * 5.0 + ch.phase) * 0.18;
          ch.group.scale.set(hProg * easeScale, hProg * easeScale, hProg * easeScale);
          ch.group.rotation.y += 0.024;
          if (ch.sprite && ch.sprite.material) {
            ch.sprite.material.rotation += 0.035;
          }
        });

        // Animate 16 Ascending Sky Lanterns
        skyLanterns.forEach(sl => {
          sl.position.y += sl.userData.vy;
          sl.position.x = sl.userData.baseX + Math.sin(fwt * sl.userData.wobbleSpeed + sl.userData.wobblePhase) * 0.15;
          sl.rotation.y += 0.015;
        });

        // Animate Royal White Elephant Walking, Ear Flapping & Halo Rotation
        elephantGroup.position.y = 4.35 + Math.sin(fwt * 2.8) * 0.14;
        eleHalo.rotation.z += 0.022;
        eleLegs.forEach(leg => {
          leg.rotation.x = Math.sin(fwt * 6.5 + leg.userData.phase) * 0.28;
        });
        eleEars.forEach(ear => {
          ear.rotation.y = ear.userData.side * (0.25 + Math.sin(fwt * 8.0) * 0.22);
        });

        fallingItems.forEach(item => {
          if (!item.userData.landed) {
            item.position.y -= item.userData.vy;
            item.rotation.x += item.userData.rx;
            item.rotation.y += item.userData.ry;
            item.rotation.z += item.userData.rz;

            if (item.position.y <= 0.06) {
              item.position.y = 0.06;
              item.rotation.set(0, item.rotation.y, 0);
              item.userData.landed = true;
              spawnBlessingSparks(item.position.x, 0.1, item.position.z, 2, 0xffd700);
            }
          }
        });

        // Smooth graceful fade-out before final disposal
        if (fwt > 5.2) {
          const fadeRatio = Math.max(0, (6.5 - fwt) / 1.3);
          crystalHearts.forEach(ch => {
            ch.group.scale.multiplyScalar(0.97);
            if (ch.sprite && ch.sprite.material) {
              ch.sprite.material.opacity = fadeRatio * 0.90;
            }
          });
          skyLanterns.forEach(sl => {
            if (sl.material) sl.material.opacity = fadeRatio * 0.92;
          });
          if (eleHalo && eleHalo.material) {
            eleHalo.material.opacity = fadeRatio * 0.85;
          }
        }

        if (fwt >= 6.5) {
          cleanupFireworks();
        }
      } else {
        cleanupFireworks();
      }
    } catch (err) {
      console.error('[Fireworks Loop Exception]', err);
      cleanupFireworks();
    }
  }, 30);
}

// ── Tier 9: Grand Sukhavati Celestial Palace Gateway, Dragon Columns, Foo Lions & Jade Bridge (🏰 / 🦁) ─
let activeHeavenlyPortal = null;
function triggerHeavenlyPortalEffect() {
  templeAudio.playBell(144, 7.0);
  templeAudio.playBell(288, 6.0);
  templeAudio.playBell(576, 5.5);
  templeAudio.playBell(864, 5.0);

  if (activeHeavenlyPortal) {
    scene.remove(activeHeavenlyPortal);
    activeHeavenlyPortal = null;
  }

  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 3.2, 1.8);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.11,
    emissive: 0xaa7700,
    emissiveIntensity: 0.48
  });
  const crimsonPalaceMat = new THREE.MeshStandardMaterial({
    color: 0x991220,
    metalness: 0.40,
    roughness: 0.28,
    emissive: 0x45050b,
    emissiveIntensity: 0.32
  });
  const jadeMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    emissive: 0x0d9488,
    emissiveIntensity: 0.38,
    metalness: 0.30,
    roughness: 0.22
  });
  const spireMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  // 1. Triple-Tier Sweeping Sukhavati Palace Roof with Flying Eaves & Hanging Red-Gold Lanterns
  const roofGroup = new THREE.Group();
  const roofTiers = [
    { w: 4.8, d: 0.78, y: 1.45, h: 0.16 },
    { w: 3.8, d: 0.66, y: 1.82, h: 0.15 },
    { w: 2.8, d: 0.54, y: 2.16, h: 0.14 }
  ];
  const hangingLanterns = [];

  roofTiers.forEach((rt, tIdx) => {
    // Crimson Bracket Beam under Eaves
    const underBeam = new THREE.Mesh(new THREE.BoxGeometry(rt.w - 0.25, rt.h * 0.85, rt.d - 0.1), crimsonPalaceMat);
    underBeam.position.y = rt.y - 0.08;
    roofGroup.add(underBeam);

    // Golden Palace Tile Roof Deck
    const rBeam = new THREE.Mesh(new THREE.BoxGeometry(rt.w, rt.h, rt.d), goldMat);
    rBeam.position.y = rt.y;
    roofGroup.add(rBeam);

    // Sweeping Upturned Flying Eave Horns & Dragon Ridge Finials at Both Ends
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.44, 5), goldMat);
      ear.rotation.z = -side * 0.68;
      ear.position.set(side * (rt.w * 0.5 + 0.08), rt.y + 0.12, 0);
      roofGroup.add(ear);

      // Hanging Red-and-Gold Palace Lantern under each Eave Corner
      const lanternPivot = new THREE.Group();
      lanternPivot.position.set(side * (rt.w * 0.46), rt.y - 0.10, 0.22);
      const lBody = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), crimsonPalaceMat);
      lBody.scale.set(1.0, 1.25, 1.0);
      lBody.position.y = -0.12;
      lanternPivot.add(lBody);
      const lCap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), goldMat);
      lCap.position.y = -0.02;
      lanternPivot.add(lCap);
      const lTassel = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 6), goldMat);
      lTassel.position.y = -0.28;
      lanternPivot.add(lTassel);
      lanternPivot.userData = { phase: tIdx + side };
      roofGroup.add(lanternPivot);
      hangingLanterns.push(lanternPivot);
    });
  });

  // Sacred Lotus & Flame Cintamani Spire at Roof Apex (ยอดพระมหาวิมานมณีโชติรส)
  const spireBase = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), goldMat);
  spireBase.scale.set(1.2, 0.6, 1.2);
  spireBase.position.y = 2.32;
  roofGroup.add(spireBase);

  const spireMesh = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.65, 12), spireMat);
  spireMesh.position.y = 2.68;
  roofGroup.add(spireMesh);
  portalGroup.add(roofGroup);

  // 2. Twin Crimson-and-Gold Columns Wrapped in Coiling 3D Golden Dragons (เสามังกรทองคำพันเสาคู่)
  [-1.88, 1.88].forEach((px, pIdx) => {
    const colGroup = new THREE.Group();
    colGroup.position.set(px, -0.2, 0);

    // Carved White-Jade Lotus Drum Plinth at Base of Column
    const drumPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.32, 16), jadeMat);
    drumPlinth.position.y = -1.62;
    colGroup.add(drumPlinth);

    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.20, 3.4, 20), crimsonPalaceMat);
    colGroup.add(colShaft);

    // Coiling Golden Dragon Body Spiraling 2.5 Turns up the Column
    const dir = (pIdx === 0) ? 1 : -1;
    for (let s = 0; s < 22; s++) {
      const frac = s / 21;
      const sang = frac * Math.PI * 5.0 * dir;
      const sy = -1.35 + frac * 2.65;
      const coilSeg = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), goldMat);
      coilSeg.scale.set(1.2, 0.9, 1.2);
      coilSeg.position.set(Math.cos(sang) * 0.20, sy, Math.sin(sang) * 0.20 + 0.02);
      colGroup.add(coilSeg);
    }

    // Projecting Sculpted Dragon Head near Capital of Column
    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), goldMat);
    dHead.scale.set(0.9, 0.9, 1.35);
    dHead.position.set(0, 1.28, 0.24);
    colGroup.add(dHead);

    portalGroup.add(colGroup);
  });

  // 3. Cosmic Nirvana Mandala Vortex & 12-Spoke Spinning Golden Wheel of Dharma (ห้วงจักรวาลทิพย์นิพพาน แสงละมุนนวลตา)
  const cosmicPortal = new THREE.Mesh(
    new THREE.CircleGeometry(1.75, 48),
    new THREE.MeshBasicMaterial({
      map: getLotusPondTexture(),
      color: 0x96fff2,
      transparent: true,
      opacity: 0.30,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  cosmicPortal.position.set(0, -0.15, -0.15);
  portalGroup.add(cosmicPortal);

  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(0, 0.20, -0.05);
  wheelGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 12, 32), goldMat));
  wheelGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.032, 10, 28), goldMat));
  wheelGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 14), spireMat));
  for (let sp = 0; sp < 12; sp++) {
    const spAng = (sp / 12) * Math.PI * 2;
    const spMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.22, 8), goldMat);
    spMesh.rotation.z = spAng;
    wheelGroup.add(spMesh);
  }
  portalGroup.add(wheelGroup);

  // 4. 16 Volumetric Radiant God-Rays (ลำแสงฉัพพรรณรังสีสวรรค์ 16 แฉก แสงโปร่งตา)
  const rayGroup = new THREE.Group();
  rayGroup.position.set(0, 0.20, -0.10);
  for (let r = 0; r < 16; r++) {
    const angle = (r / 16) * Math.PI * 2;
    const rMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 5.4),
      new THREE.MeshBasicMaterial({
        color: (r % 2 === 0) ? 0xffb700 : 0xf59e0b,
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    rMesh.rotation.z = angle;
    rayGroup.add(rMesh);
  }
  portalGroup.add(rayGroup);

  // 5. Studded Imperial Palace Double Doors with 36 Golden Bosses & Lion Knockers (บานประตูวิมานตอกหมุดทองคำ)
  function createPalaceDoorPanel(offsetX) {
    const dContainer = new THREE.Group();
    dContainer.position.x = offsetX;

    // Crimson Panel Core + Heavy Golden Outer Frame
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.66, 2.82, 0.06), crimsonPalaceMat);
    dContainer.add(core);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.14, 0.08), goldMat);
    topRail.position.y = 1.35;
    dContainer.add(topRail);
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.12, 0.08), goldMat);
    midRail.position.y = -0.10;
    dContainer.add(midRail);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.16, 0.08), goldMat);
    botRail.position.y = -1.35;
    dContainer.add(botRail);

    // 4 Rows x 4 Columns of Golden Door Stud Bosses (หมุดทองคำหน้าบานประตู)
    const studGeo = new THREE.SphereGeometry(0.028, 8, 8);
    [-0.55, -0.18, 0.18, 0.55].forEach(sx => {
      [1.05, 0.72, 0.38, -0.55, -0.95].forEach(sy => {
        const stud = new THREE.Mesh(studGeo, goldMat);
        stud.position.set(sx, sy, 0.04);
        dContainer.add(stud);
      });
    });

    // Golden Lion-Mask Knocker & Ring near Center Edge
    const knockerX = (offsetX > 0) ? 0.58 : -0.58;
    const lionBoss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), goldMat);
    lionBoss.scale.set(1.0, 1.0, 0.5);
    lionBoss.position.set(knockerX, -0.10, 0.05);
    dContainer.add(lionBoss);

    const knockerRing = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 8, 18), goldMat);
    knockerRing.position.set(knockerX, -0.18, 0.07);
    dContainer.add(knockerRing);

    return dContainer;
  }

  const doorPivotL = new THREE.Group();
  doorPivotL.position.set(-1.70, -0.2, 0);
  doorPivotL.add(createPalaceDoorPanel(0.84));
  portalGroup.add(doorPivotL);

  const doorPivotR = new THREE.Group();
  doorPivotR.position.set(1.70, -0.2, 0);
  doorPivotR.add(createPalaceDoorPanel(-0.84));
  portalGroup.add(doorPivotR);

  // 6. Sculpted White-Jade Guardian Foo Lions with Curly Mane, 4 Legs & Brocade Ball (คู่สิงโตหยกขาวพิทักษ์ทวาร)
  [-1.92, 1.92].forEach((lx, lIdx) => {
    const lionGroup = new THREE.Group();
    lionGroup.position.set(lx, -1.9, 0.42);
    lionGroup.rotation.y = (lIdx === 0) ? 0.22 : -0.22;

    // Tiered Carved Plinth Pedestal (ฐานสิงโตทองคำและหยกขาวสวรรค์ ไร้กล่องดำทึบ 100%)
    const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.66), jadeMat);
    lionGroup.add(plinthBase);
    const plinthTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.72), goldMat);
    plinthTop.position.y = 0.10;
    lionGroup.add(plinthTop);

    // Muscular Seated Haunches & Chest
    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), jadeMat);
    haunch.scale.set(0.95, 1.15, 1.05);
    haunch.position.set(0, 0.42, -0.06);
    lionGroup.add(haunch);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), jadeMat);
    chest.scale.set(1.05, 1.15, 0.95);
    chest.position.set(0, 0.58, 0.06);
    lionGroup.add(chest);

    // Golden Collar & Bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.024, 8, 18), goldMat);
    collar.rotation.x = Math.PI / 2 - 0.2;
    collar.position.set(0, 0.72, 0.08);
    lionGroup.add(collar);

    // 4 Sculpted Legs & Paws + Golden Brocade Ball under Inner Front Paw
    [-0.14, 0.14].forEach(px => {
      const fLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.38, 10), jadeMat);
      fLeg.position.set(px, 0.40, 0.18);
      lionGroup.add(fLeg);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), jadeMat);
      paw.scale.set(1.1, 0.6, 1.3);
      paw.position.set(px, 0.24, 0.22);
      lionGroup.add(paw);
    });
    const brocadeBall = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), goldMat);
    brocadeBall.position.set((lIdx === 0) ? 0.14 : -0.14, 0.30, 0.26);
    lionGroup.add(brocadeBall);

    // Lion Head, Broad Snout, Curly Mane Curls & Glowing Emerald Eyes
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 12), jadeMat);
    head.position.set(0, 0.86, 0.10);
    lionGroup.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.16), jadeMat);
    snout.position.set(0, 0.82, 0.24);
    lionGroup.add(snout);

    // 10 Curly Mane Spheres framing Lion Head
    for (let m = 0; m < 10; m++) {
      const mang = (m / 10) * Math.PI * 1.4 - Math.PI * 0.2;
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), jadeMat);
      curl.position.set(Math.cos(mang) * 0.21, 0.86 + Math.sin(mang) * 0.21, 0.02);
      lionGroup.add(curl);
    }

    const gemEyeMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    [-0.08, 0.08].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), gemEyeMat);
      eye.position.set(ex, 0.90, 0.28);
      lionGroup.add(eye);
    });

    portalGroup.add(lionGroup);
  });

  // 7. Colossal Vertical Divine Light Pillar (เสาแสงสวรรค์สีทองสาดส่อง นวลตาละมุน ไม่บังพระพักตร์พระแม่)
  const lightPillarGeo = new THREE.CylinderGeometry(1.6, 2.8, 8.5, 32, 1, true);
  const lightPillarMat = new THREE.MeshBasicMaterial({
    color: 0xfff6c2,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const lightPillar = new THREE.Mesh(lightPillarGeo, lightPillarMat);
  lightPillar.position.set(0, -2.4, 0.4);
  portalGroup.add(lightPillar);

  const innerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.2, 8.5, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffea70, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
  );
  innerBeam.position.set(0, -2.4, 0.4);
  portalGroup.add(innerBeam);

  // แสงนวลทองละมุนตา สบายตา ไม่จ้ากลบองค์พระแม่กวนอิม
  const pLight = new THREE.PointLight(0xffb700, 1.2, 6.0);
  pLight.position.set(0, 0.2, 0.6);
  portalGroup.add(pLight);

  scene.add(portalGroup);
  activeHeavenlyPortal = portalGroup;

  createCarpetRipple(0, 0.05, 2.0, 0xffd700);
  createLotusBloomDecal(0, 0.05, 2.0, 0xffd700);

  let pt = 0;
  const pInterval = setInterval(() => {
    pt += 0.035;
    if (activeHeavenlyPortal === portalGroup) {
      // Smoothly swing open studded palace double doors (0 to 86 degrees)
      const openProgress = Math.min(1.0, pt * 0.45);
      const openAngle = openProgress * (Math.PI * 0.48);
      doorPivotL.rotation.y = -openAngle;
      doorPivotR.rotation.y = openAngle;

      wheelGroup.rotation.z += 0.024;
      rayGroup.rotation.z += 0.006;
      cosmicPortal.rotation.z -= 0.014;

      // Pulse and rotate colossal vertical divine light pillar (ละมุนตา ไม่สว่างกลบพระแม่)
      lightPillar.rotation.y += 0.015;
      lightPillar.material.opacity = 0.12 + Math.sin(pt * 4.0) * 0.04;
      innerBeam.rotation.y -= 0.022;
      innerBeam.material.opacity = 0.10 + Math.sin(pt * 5.0) * 0.03;

      hangingLanterns.forEach(lan => {
        lan.rotation.z = Math.sin(pt * 3.2 + lan.userData.phase) * 0.14;
      });

      rayGroup.children.forEach((rm, idx) => {
        rm.material.opacity = 0.04 + Math.sin(pt * 3.5 + idx) * 0.02;
      });

      if (Math.random() < 0.45) {
        spawnBlessingSparks(
          (Math.random() - 0.5) * 1.6,
          3.2 + (Math.random() - 0.5) * 1.0,
          1.8 + Math.random() * 0.8,
          3,
          0xffea70
        );
      }

      if (pt > 6.8) {
        clearInterval(pInterval);
        scene.remove(portalGroup);
        activeHeavenlyPortal = null;
      }
    } else {
      clearInterval(pInterval);
    }
  }, 30);
}

// ── Tier 10: Supreme Eastern Imperial Golden Dragon & Flaming Pearl (🐉 / 🌌) ─
let activeGoldenDragon = null;
let cachedDragonScaleTex = null;
let cachedDragonCloudTex = null;

function getDragonScaleTexture() {
  if (cachedDragonScaleTex) return cachedDragonScaleTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  // Rich metallic gold base
  const baseGrad = ctx.createLinearGradient(0, 0, 256, 256);
  baseGrad.addColorStop(0, '#ffd700');
  baseGrad.addColorStop(0.5, '#e5a910');
  baseGrad.addColorStop(1, '#b87800');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 256, 256);

  // Overlapping crescent Imperial dragon scales
  const rows = 8;
  const cols = 6;
  const cellW = 256 / cols;
  const cellH = 256 / rows;
  for (let r = -1; r <= rows; r++) {
    for (let col = -1; col <= cols; col++) {
      const cx = col * cellW + ((r % 2) ? cellW * 0.5 : 0);
      const cy = r * cellH;
      const rad = cellW * 0.56;

      const sg = ctx.createRadialGradient(cx, cy - rad * 0.25, rad * 0.1, cx, cy, rad);
      sg.addColorStop(0, '#fff8c4');
      sg.addColorStop(0.45, '#ffd700');
      sg.addColorStop(0.82, '#c88200');
      sg.addColorStop(1, '#5a3000');

      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(70, 32, 0, 0.75)';
      ctx.stroke();

      // Inner specular ridge
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.72, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(255, 250, 200, 0.65)';
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  cachedDragonScaleTex = tex;
  return tex;
}

function getDragonCloudTexture() {
  if (cachedDragonCloudTex) return cachedDragonCloudTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  g.addColorStop(0, 'rgba(255, 242, 175, 0.75)');
  g.addColorStop(0.45, 'rgba(255, 195, 60, 0.38)');
  g.addColorStop(1, 'rgba(255, 140, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  cachedDragonCloudTex = new THREE.CanvasTexture(c);
  return cachedDragonCloudTex;
}

function triggerDragonDescentEffect() {
  templeAudio.playBell(108, 9.0);
  templeAudio.playBell(216, 8.5);
  templeAudio.playBell(432, 8.0);
  templeAudio.playBell(864, 7.0);
  templeAudio.playBell(1296, 6.0);

  if (activeGoldenDragon) {
    scene.remove(activeGoldenDragon);
    activeGoldenDragon = null;
  }

  const dragonGroup = new THREE.Group();
  dragonGroup.position.set(0, 0, 0);

  // Temple-wide Divine Golden Lighting Resonance
  if (altarGlow) altarGlow.intensity = 5.8;
  if (carpetLight) carpetLight.intensity = 6.2;

  const scaleTex = getDragonScaleTexture();

  // ── Materials for Imperial Golden Dragon ──
  const scaleArmorMat = new THREE.MeshStandardMaterial({
    map: scaleTex,
    bumpMap: scaleTex,
    bumpScale: 0.035,
    color: 0xffd700,
    emissive: 0xd46a00,
    emissiveIntensity: 0.52,
    metalness: 0.92,
    roughness: 0.16
  });

  const bellyScuteMat = new THREE.MeshStandardMaterial({
    color: 0xfff0a8,
    emissive: 0xaa6600,
    emissiveIntensity: 0.45,
    metalness: 0.88,
    roughness: 0.20
  });

  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xfff3b0,
    metalness: 0.96,
    roughness: 0.10,
    emissive: 0xb87800,
    emissiveIntensity: 0.55
  });

  const maneFlameMat = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff8800,
    emissiveIntensity: 0.85,
    metalness: 0.65,
    roughness: 0.25,
    side: THREE.DoubleSide
  });

  const fangMat = new THREE.MeshStandardMaterial({
    color: 0xfffff0,
    emissive: 0xffe699,
    emissiveIntensity: 0.35,
    metalness: 0.3,
    roughness: 0.15
  });

  const mouthInnerMat = new THREE.MeshBasicMaterial({
    color: 0xff2200
  });

  // ── 1. Sculpted Anatomical Eastern Imperial Dragon Head (`headGroup`, +Z = forward) ──
  const headGroup = new THREE.Group();
  dragonGroup.add(headGroup);

  // 1a. Upper Cranium Dome & Sculpted Cheek Jowls
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), scaleArmorMat);
  cranium.scale.set(1.05, 0.88, 1.25);
  cranium.position.set(0, 0.06, -0.05);
  headGroup.add(cranium);

  [-1, 1].forEach(side => {
    // Muscular dragon cheek jowls
    const jowl = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), scaleArmorMat);
    jowl.scale.set(0.85, 0.80, 1.20);
    jowl.position.set(side * 0.24, -0.02, 0.02);
    headGroup.add(jowl);

    // Fierce overarching golden brow ridges
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.28), hornMat);
    brow.position.set(side * 0.20, 0.19, 0.16);
    brow.rotation.set(0.22, side * 0.25, -side * 0.32);
    headGroup.add(brow);
  });

  // 1b. Elongated Imperial Upper Snout & Flared Nose Bridge (+Z forward)
  const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.56), scaleArmorMat);
  upperSnout.position.set(0, 0.02, 0.34);
  headGroup.add(upperSnout);

  const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.54, 8), hornMat);
  noseBridge.rotation.x = Math.PI / 2;
  noseBridge.position.set(0, 0.11, 0.34);
  headGroup.add(noseBridge);

  // Flared Imperial Snout Tip & Nostrils
  const snoutTip = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), scaleArmorMat);
  snoutTip.scale.set(1.15, 0.65, 0.75);
  snoutTip.position.set(0, 0.04, 0.60);
  headGroup.add(snoutTip);

  [-1, 1].forEach(side => {
    const nostrilRim = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.018, 8, 12), hornMat);
    nostrilRim.position.set(side * 0.11, 0.09, 0.62);
    nostrilRim.rotation.x = Math.PI * 0.35;
    headGroup.add(nostrilRim);

    // Upper Canine Fangs + Side Teeth
    const fangU = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.16, 6), fangMat);
    fangU.rotation.x = Math.PI; // points downward
    fangU.position.set(side * 0.14, -0.09, 0.52);
    headGroup.add(fangU);

    for (let t = 0; t < 3; t++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 5), fangMat);
      tooth.rotation.x = Math.PI;
      tooth.position.set(side * 0.15, -0.07, 0.22 + t * 0.09);
      headGroup.add(tooth);
    }
  });

  // 1c. Articulated Roaring Lower Jaw (`jawPivot`)
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.08, 0.06);
  headGroup.add(jawPivot);

  const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.50), bellyScuteMat);
  lowerJaw.position.set(0, -0.04, 0.24);
  jawPivot.add(lowerJaw);

  const chinTip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), hornMat);
  chinTip.scale.set(1.05, 0.55, 0.80);
  chinTip.position.set(0, -0.04, 0.48);
  jawPivot.add(chinTip);

  // Fiery glowing palate/tongue inside mouth
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.42), mouthInnerMat);
  tongue.position.set(0, 0.02, 0.24);
  jawPivot.add(tongue);

  // Lower fangs & Imperial Chin Beard Tuft
  [-1, 1].forEach(side => {
    const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.13, 6), fangMat);
    fangL.position.set(side * 0.12, 0.05, 0.44);
    jawPivot.add(fangL);
  });
  for (let b = -2; b <= 2; b++) {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.28, 5), hornMat);
    beard.rotation.x = -Math.PI * 0.72;
    beard.position.set(b * 0.05, -0.10, 0.44);
    jawPivot.add(beard);
  }

  // 1d. Blazing Eyes with Glowing Slit Pupils
  const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
  [-1, 1].forEach(side => {
    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 10), eyeGlowMat);
    eyeBall.position.set(side * 0.22, 0.11, 0.18);
    headGroup.add(eyeBall);

    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.04), pupilMat);
    pupil.position.set(side * 0.27, 0.11, 0.21);
    headGroup.add(pupil);
  });

  // 1e. Multi-Branched Imperial Stag Antlers (เขามังกรกิ่งก้านทองคำ)
  [-1, 1].forEach(side => {
    const antlerGroup = new THREE.Group();
    antlerGroup.position.set(side * 0.16, 0.24, -0.05);
    antlerGroup.rotation.set(-0.55, -side * 0.28, -side * 0.22);

    // Main curved antler beam sweeping backward
    const mainBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.065, 0.82, 8), hornMat);
    mainBeam.position.set(0, 0.38, -0.10);
    mainBeam.rotation.x = -0.35;
    antlerGroup.add(mainBeam);

    // 3 branched tines along the antler
    const tineConfigs = [
      { y: 0.25, z: -0.02, len: 0.32, rx: 0.45, rz: side * 0.35 },
      { y: 0.48, z: -0.14, len: 0.36, rx: 0.25, rz: -side * 0.40 },
      { y: 0.66, z: -0.22, len: 0.28, rx: -0.65, rz: side * 0.25 }
    ];
    tineConfigs.forEach(tc => {
      const tine = new THREE.Mesh(new THREE.ConeGeometry(0.028, tc.len, 6), hornMat);
      tine.position.set(0, tc.y, tc.z);
      tine.rotation.set(tc.rx, 0, tc.rz);
      antlerGroup.add(tine);
    });
    headGroup.add(antlerGroup);
  });

  // 1f. Radiant Crown of 14 Swept-Back Flame Mane Plumes (แผงคอเปลวเพลิงจักรพรรดิ)
  const manePlumes = [];
  for (let m = 0; m < 14; m++) {
    const ang = (m / 14) * Math.PI * 1.5 - Math.PI * 0.75; // fan around top and cheeks
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.48, 5),
      (m % 2 === 0) ? maneFlameMat : hornMat
    );
    const rad = 0.28;
    plume.position.set(Math.sin(ang) * rad, Math.cos(ang) * rad * 0.85, -0.22);
    plume.rotation.x = -Math.PI * 0.62;
    plume.rotation.z = -ang * 0.65;
    headGroup.add(plume);
    manePlumes.push({ mesh: plume, baseRotX: plume.rotation.x, idx: m });
  }

  // 1g. Articulated Sinuous Dragon Whiskers (หนวดมังกรทองยาวพลิ้วไหว)
  const whiskerPivots = [];
  [-1, 1].forEach(side => {
    const wPivot = new THREE.Group();
    wPivot.position.set(side * 0.18, 0.02, 0.52);
    headGroup.add(wPivot);

    // 3 linked curved whisker segments per side
    let parentNode = wPivot;
    const segNodes = [];
    for (let ws = 0; ws < 3; ws++) {
      const node = new THREE.Group();
      node.position.set(ws === 0 ? 0 : side * 0.26, 0, ws === 0 ? 0 : -0.12);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018 * (1 - ws * 0.28), 0.024 * (1 - ws * 0.25), 0.34, 6),
        hornMat
      );
      bar.rotation.z = -side * Math.PI * 0.42;
      bar.position.set(side * 0.15, -0.03, -0.05);
      node.add(bar);
      parentNode.add(node);
      parentNode = node;
      segNodes.push(node);
    }
    whiskerPivots.push({ side, segNodes });
  });

  // Head PointLight for dramatic golden facial illumination
  const headLight = new THREE.PointLight(0xffaa00, 3.8, 6.0);
  headLight.position.set(0, 0.2, 0.5);
  headGroup.add(headLight);

  // ── 2. Continuous 44-Segment Overlapping Serpentine Body, Belly Scutes, Dorsal Fins & Tail Fan ──
  const segCount = 44;
  const segments = [];
  const dorsalFins = [];
  const segSphereGeo = new THREE.SphereGeometry(1, 14, 12);
  const scuteGeo = new THREE.BoxGeometry(1.1, 0.28, 1.35);

  for (let i = 0; i < segCount; i++) {
    const u = i / (segCount - 1);
    // Realistic anatomical dragon taper: muscular neck/chest (u=0.1..0.3), long body, whip tail
    const chestBulge = Math.sin(Math.min(1.0, u * 3.2) * Math.PI) * 0.05;
    const radius = Math.max(0.065, (0.29 * Math.pow(1.0 - u * 0.82, 0.85)) + chestBulge);

    const segNode = new THREE.Group();

    // Main scaled body segment (elongated along local Z so segments overlap seamlessly with zero gaps)
    const bodyMesh = new THREE.Mesh(segSphereGeo, scaleArmorMat);
    bodyMesh.scale.set(radius * 1.02, radius * 0.96, radius * 1.65);
    segNode.add(bodyMesh);

    // Ribbed Golden-Ivory Belly Scute Plate on underside (-Y)
    const scuteMesh = new THREE.Mesh(scuteGeo, bellyScuteMat);
    scuteMesh.scale.set(radius * 0.72, radius * 0.45, radius * 1.15);
    scuteMesh.position.set(0, -radius * 0.78, 0);
    segNode.add(scuteMesh);

    // Swept-back Fiery Golden Dorsal Spine Fin on top (+Y)
    if (i < segCount - 1) {
      const finH = radius * (1.45 + (i % 2) * 0.22);
      const finGeo = new THREE.ConeGeometry(radius * 0.26, finH, 4);
      const finMesh = new THREE.Mesh(finGeo, (i % 2 === 0) ? maneFlameMat : hornMat);
      finMesh.position.set(0, radius * 0.88 + finH * 0.30, -radius * 0.15);
      finMesh.rotation.x = -0.52; // swept gracefully backward toward tail
      segNode.add(finMesh);
      dorsalFins.push({ mesh: finMesh, idx: i });
    }

    // Ornate 7-Plume Imperial Flame Tail Fan on final segment
    if (i === segCount - 1) {
      const tailFanGroup = new THREE.Group();
      for (let tf = -3; tf <= 3; tf++) {
        const len = 0.62 - Math.abs(tf) * 0.08;
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.05, len, 5),
          (tf % 2 === 0) ? maneFlameMat : hornMat
        );
        plume.rotation.x = -Math.PI * 0.52;
        plume.rotation.z = tf * 0.22;
        plume.position.set(tf * 0.04, 0, -len * 0.45);
        tailFanGroup.add(plume);
      }
      segNode.add(tailFanGroup);
    }

    dragonGroup.add(segNode);
    segments.push({ node: segNode, radius });
  }

  // ── 3. Four Muscular 3-Jointed 5-Clawed Imperial Dragon Legs (ขาและกรงเล็บมังกร 5 เล็บ) ──
  const legs = [];
  const legConfigs = [
    { segIdx: 7, side: -1, scale: 1.05 }, // Front Left Leg
    { segIdx: 7, side: 1, scale: 1.05 }, // Front Right Leg
    { segIdx: 24, side: -1, scale: 0.92 }, // Hind Left Leg
    { segIdx: 24, side: 1, scale: 0.92 }  // Hind Right Leg
  ];

  legConfigs.forEach(lc => {
    const legRoot = new THREE.Group();
    const s = lc.scale;
    legRoot.position.set(lc.side * 0.22 * s, -0.10 * s, 0);

    // Upper Muscular Thigh
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085 * s, 0.115 * s, 0.36 * s, 10), scaleArmorMat);
    thigh.position.set(lc.side * 0.12 * s, -0.14 * s, 0.02 * s);
    thigh.rotation.z = lc.side * 0.58;
    thigh.rotation.x = -0.25;
    legRoot.add(thigh);

    // Fiery Elbow Spur Fin
    const elbowSpur = new THREE.Mesh(new THREE.ConeGeometry(0.045 * s, 0.22 * s, 4), maneFlameMat);
    elbowSpur.position.set(lc.side * 0.24 * s, -0.24 * s, -0.08 * s);
    elbowSpur.rotation.x = -0.85;
    legRoot.add(elbowSpur);

    // Forearm reaching forward & down
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.080 * s, 0.32 * s, 8), scaleArmorMat);
    forearm.position.set(lc.side * 0.22 * s, -0.36 * s, 0.10 * s);
    forearm.rotation.x = 0.48;
    forearm.rotation.z = lc.side * 0.18;
    legRoot.add(forearm);

    // 5 Curved Imperial Golden Talons (กรงเล็บมังกรจักรพรรดิ 5 เล็บ)
    const pawGroup = new THREE.Group();
    pawGroup.position.set(lc.side * 0.25 * s, -0.50 * s, 0.20 * s);
    for (let t = 0; t < 5; t++) {
      const talon = new THREE.Group();
      const ang = (t - 2) * 0.34;
      const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * s, 0.022 * s, 0.11 * s, 6), hornMat);
      knuckle.rotation.x = Math.PI * 0.35;
      const clawTip = new THREE.Mesh(new THREE.ConeGeometry(0.020 * s, 0.13 * s, 6), fangMat);
      clawTip.position.set(0, -0.05 * s, 0.07 * s);
      clawTip.rotation.x = Math.PI * 0.68;
      talon.add(knuckle);
      talon.add(clawTip);
      talon.rotation.y = ang;
      pawGroup.add(talon);
    }
    legRoot.add(pawGroup);

    // Attach directly to the host body segment so it moves & banks naturally with the spine!
    segments[lc.segIdx].node.add(legRoot);
    legs.push({ root: legRoot, paw: pawGroup, side: lc.side, segIdx: lc.segIdx });
  });

  // ── 4. Radiant Flaming Celestial Pearl of Wisdom (ลูกแก้วมณีโชติช่วง) ──
  const pearlGroup = new THREE.Group();
  const pearlCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.20, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff8d0 })
  );
  const pearlAura = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const flameRing1 = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.44, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const flameRing2 = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.40, 28),
    new THREE.MeshBasicMaterial({ color: 0xff5500, side: THREE.DoubleSide, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flameRing2.rotation.x = Math.PI / 2;
  pearlGroup.add(pearlCore);
  pearlGroup.add(pearlAura);
  pearlGroup.add(flameRing1);
  pearlGroup.add(flameRing2);
  dragonGroup.add(pearlGroup);

  // ── 5. Swirling Auspicious Golden Clouds & Celestial Stardust (เมฆมงคลและละอองดาวทอง) ──
  const cloudTex = getDragonCloudTexture();
  const cloudSprites = [];
  for (let c = 0; c < 18; c++) {
    const cMat = new THREE.SpriteMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sp = new THREE.Sprite(cMat);
    const s = 0.85 + (c % 4) * 0.25;
    sp.scale.set(s, s * 0.65, 1);
    dragonGroup.add(sp);
    cloudSprites.push({ sprite: sp, segIdx: Math.min(segCount - 1, c * 2 + 2), phase: c * 0.9 });
  }

  const stardustMat = new THREE.MeshBasicMaterial({ color: 0xfff099, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const stardustGeo = new THREE.SphereGeometry(0.042, 6, 6);
  const stardusts = [];
  for (let i = 0; i < 44; i++) {
    const sd = new THREE.Mesh(stardustGeo, stardustMat);
    dragonGroup.add(sd);
    stardusts.push(sd);
  }

  scene.add(dragonGroup);
  activeGoldenDragon = dragonGroup;

  // ── Parametric 3D Serpentine Flight Path Evaluator (Exact Spine Curve, Zero Bunching) ──
  function evalDragonSpinePoint(tau, segIndex = 0) {
    const progress = THREE.MathUtils.clamp(tau / 8.0, 0.0, 1.0);
    // Serpentine figure-8 trajectory calibrated to the white marble bridge and twin ponds
    const angle = tau * 1.95;
    const orbitR = 2.45 + Math.sin(tau * 1.4) * 0.85;

    // Travelling serpentine S-wave undulation along the body (increases from neck to tail)
    const waveAmp = Math.min(1.0, segIndex / 8.0) * (0.24 + (segIndex / segCount) * 0.18);
    const lateralWave = Math.sin(tau * 7.2 - segIndex * 0.12) * waveAmp;
    const verticalWave = Math.cos(tau * 7.2 - segIndex * 0.12) * (waveAmp * 0.65);

    const tangentX = -Math.sin(angle);
    const tangentZ = Math.cos(angle);
    const perpX = tangentZ;
    const perpZ = -tangentX;

    // High celestial waterfall entrance (tau < 1.0) and ascent exit (tau > 7.0)
    const entryLift = Math.max(0, 1.0 - tau / 1.0) * 3.2;
    const exitLift = Math.max(0, (tau - 6.8) / 1.4) * 4.2;

    const x = Math.cos(angle) * orbitR + perpX * lateralWave;
    const z = THREE.MathUtils.lerp(8.5, 1.8, progress) + Math.sin(tau * 1.4) * 1.6 + perpZ * lateralWave;
    const y = 3.6 + Math.sin(tau * 2.6) * 1.25 + verticalWave + entryLift + exitLift;
    return new THREE.Vector3(x, y, z);
  }

  let dt = 0;
  let lastShockwaveZ = 5.0;
  const segTimeLag = 0.044; // Fixed arc-length spacing along the parametric curve

  const dInterval = setInterval(() => {
    dt += 0.032;
    if (activeGoldenDragon === dragonGroup) {
      // 1. Position & Orient Sculpted Dragon Head along exact flight tangent
      const headPos = evalDragonSpinePoint(dt, 0);
      const lookAheadPos = evalDragonSpinePoint(dt + 0.05, 0);
      headGroup.position.copy(headPos);
      headGroup.lookAt(lookAheadPos);
      // Natural banking roll into turns
      headGroup.rotateZ(Math.sin(dt * 2.15) * 0.24);

      // Animate roaring lower jaw, flame mane, and sinuous whiskers
      jawPivot.rotation.x = 0.18 + Math.max(0, Math.sin(dt * 4.8)) * 0.34;
      manePlumes.forEach(mp => {
        mp.mesh.rotation.x = mp.baseRotX + Math.sin(dt * 9.0 + mp.idx * 0.5) * 0.12;
      });
      whiskerPivots.forEach(wp => {
        wp.segNodes.forEach((node, idx) => {
          node.rotation.y = Math.sin(dt * 7.5 - idx * 0.9) * 0.28 * wp.side;
          node.rotation.z = Math.cos(dt * 6.5 - idx * 0.8) * 0.18;
        });
      });

      // 2. Position Flaming Celestial Pearl dancing just ahead of the Dragon's snout
      const pearlPos = evalDragonSpinePoint(dt + 0.26, 0);
      pearlPos.y += Math.sin(dt * 5.0) * 0.18;
      pearlGroup.position.copy(pearlPos);
      flameRing1.rotation.z += 0.11;
      flameRing2.rotation.y += 0.09;
      const pPulse = 1.0 + Math.sin(dt * 8.0) * 0.12;
      pearlAura.scale.set(pPulse, pPulse, pPulse);

      // 3. Position & Orient all 44 overlapping body segments along the exact spine curve
      for (let i = 0; i < segCount; i++) {
        const segTau = dt - (i + 1) * segTimeLag;
        const pos = evalDragonSpinePoint(segTau, i + 1);
        const targetPos = (i === 0) ? headPos : segments[i - 1].node.position;
        const segNode = segments[i].node;
        segNode.position.copy(pos);
        segNode.lookAt(targetPos);
        // Subtle body roll along the serpentine wave
        segNode.rotateZ(Math.sin(dt * 5.2 - i * 0.25) * 0.18);
      }

      // 4. Animate 4 Imperial Legs & 5-Clawed Paws
      legs.forEach(lg => {
        const stride = Math.sin(dt * 5.5 + lg.segIdx * 0.4 + (lg.side > 0 ? Math.PI : 0));
        lg.root.rotation.x = stride * 0.22;
        lg.paw.rotation.x = 0.25 + stride * 0.28;
      });

      // 5. Update Auspicious Golden Cloud Billows & Stardust along the dragon's coils
      cloudSprites.forEach(cs => {
        const host = segments[cs.segIdx].node.position;
        const ang = dt * 2.5 + cs.phase;
        cs.sprite.position.set(
          host.x + Math.cos(ang) * 0.38,
          host.y - 0.18 + Math.sin(ang * 1.3) * 0.15,
          host.z + Math.sin(ang) * 0.38
        );
        cs.sprite.material.rotation = ang * 0.3;
      });

      stardusts.forEach((sd, idx) => {
        const host = segments[idx % segCount].node.position;
        const orbit = dt * 4.5 + idx * 0.7;
        const rad = 0.28 + (idx % 3) * 0.14;
        sd.position.set(
          host.x + Math.cos(orbit) * rad,
          host.y + Math.sin(orbit * 1.4) * rad,
          host.z + Math.sin(orbit) * rad
        );
      });

      // Golden Blessing Sparks & Dragon Breath Embers
      if (Math.random() < 0.50) {
        spawnBlessingSparks(headPos.x, headPos.y, headPos.z, 4, 0xffd700);
      }

      // Carpet Light Shockwaves & Lotus Mandala Decals when swooping near floor
      if (headPos.y < 2.85 && Math.abs(lastShockwaveZ - headPos.z) > 1.3) {
        lastShockwaveZ = headPos.z;
        createCarpetRipple(headPos.x, 0.05, headPos.z, 0xffd700);
        createLotusBloomDecal(headPos.x, 0.05, headPos.z, 0xffd700);
      }

      if (dt > 8.4) {
        clearInterval(dInterval);
        createCarpetRipple(0, 0.05, 2.0, 0xffd700);
        createLotusBloomDecal(0, 0.05, 2.0, 0xffd700);
        scene.remove(dragonGroup);
        activeGoldenDragon = null;
      }
    } else {
      clearInterval(dInterval);
    }
  }, 30);
}

// Continuous Ambient Sacred Petals (Disabled per user request to keep screen clear & maximize 60 FPS)
const AMBIENT_PETAL_COUNT = 0;
const ambientPetals = [];

function initAmbientPetals() {
  // Ambient background petals completely removed per user request (Zero petals added)
  for (let i = 0; i < AMBIENT_PETAL_COUNT; i++) {
    // Intentionally empty
  }
}
initAmbientPetals();

// ---------------------------------------------------------------------
// 5. UI Elements & Event Handling
// ---------------------------------------------------------------------
const toastContainer = document.getElementById('toast-container');
const chatStream = document.getElementById('chat-stream');
const effectBanner = document.getElementById('effect-banner');
const effectTitle = document.getElementById('effect-title');
const effectSubtitle = document.getElementById('effect-subtitle');
const effectIcon = document.getElementById('effect-icon');
const discipleCountEl = document.getElementById('disciple-count');
const viewerCountEl = document.getElementById('viewer-count');
let currentLiveViewers = 0;

function updateViewerCount(count) {
  if (typeof count === 'number' && !isNaN(count)) {
    currentLiveViewers = count;
  }
  // When live viewers > 0 from TikTok, show actual live viewers; otherwise reflect devotees present in hall
  const displayCount = currentLiveViewers > 0 ? currentLiveViewers : disciplesMap.size;
  if (viewerCountEl) viewerCountEl.textContent = displayCount;
  if (discipleCountEl) discipleCountEl.textContent = disciplesMap.size;
}
const leaderboardList = document.getElementById('leaderboard-list');
const drawerArrow = document.getElementById('drawer-arrow');
const btnToggleLeaderboard = document.getElementById('btn-toggle-leaderboard');
const connStatus = document.getElementById('conn-status');

// ── Security Sanitization Helper (XSS Prevention) ──────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(title, message) {
  // Disabled: Rely on native TikTok gift & interaction alert system
}

const tributeGuideText = document.getElementById('tribute-guide-text');
const tributeGuideTips = [
  '🌹 ถวายกุหลาบมงคล = เดินเข้ามากราบพระแม่กวนอิม',
  '🪷 ถวายดอกบัวทิพย์ = ดอกบัวทิพย์ผุดบานหน้าแท่น',
  '🌸 โปรยบุปผามงคล = บุปผาทิพย์โปรยปรายทั่ววิหาร',
  '🙏 กดติดตาม = รับพรอภิวาทน์และรัศมีทองคำ',
  '💬 ร่วมสวดมนต์ = เปล่งเสียงสาธุและเจริญสติ'
];
let tributeGuideIdx = 0;
if (tributeGuideText) {
  setInterval(() => {
    tributeGuideIdx = (tributeGuideIdx + 1) % tributeGuideTips.length;
    tributeGuideText.style.opacity = '0';
    setTimeout(() => {
      tributeGuideText.textContent = tributeGuideTips[tributeGuideIdx];
      tributeGuideText.style.opacity = '1';
    }, 280);
  }, 4200);
}

function appendChatMessage(user, text, isSystem = false) {
  if (!chatStream) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isSystem ? 'system' : ''}`;
  bubble.innerHTML = `<span class="user">${escapeHtml(user)}:</span> ${escapeHtml(text)}`;
  chatStream.appendChild(bubble);

  // Maximum 3 chat bubbles to ensure lower-left screen stays clear
  while (chatStream.children.length > 3) {
    chatStream.removeChild(chatStream.firstChild);
  }

  // Auto fade-out after 8s so old chats cleanly disappear
  setTimeout(() => {
    if (bubble.parentNode === chatStream) {
      bubble.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      bubble.style.opacity = '0';
      bubble.style.transform = 'translateY(-8px)';
      setTimeout(() => bubble.remove(), 600);
    }
  }, 8000);
}

let giftBannerTimer = null;
let giftBannerFadeTimer = null;

function getBannerTierInfo(giftInfo = null, fallbackTitle = '') {
  const coins = Number(giftInfo?.coins || giftInfo?.diamondCount || 1);
  const eff = giftInfo?.effectType || (
    coins >= 299 ? 'dragon' :
      coins >= 100 ? 'castle' :
        coins >= 99 ? 'fireworks' :
          coins >= 30 ? 'royal_carriage' :
            coins >= 20 ? 'crystal_fountain' :
              coins >= 15 ? 'golden_bell' :
                coins >= 10 ? 'flowers' :
                  coins >= 9 ? 'lotus' :
                    coins >= 5 ? 'incense' : 'kowtow'
  );

  const effectName = giftInfo?.effectName || (typeof getGiftEffectName === 'function' ? getGiftEffectName(eff, giftInfo?.name || fallbackTitle, coins) : (fallbackTitle || 'กราบเบญจางคประดิษฐ์'));

  if (eff === 'seamsi') {
    return {
      tierClass: 'tier-seamsi',
      crownIcon: '🎋',
      effectName: 'เสี่ยงเซียมซีมหาโชค',
      blessing: 'ขอพรสิ่งศักดิ์สิทธิ์ รับคำทำนายมงคล ✨'
    };
  }
  if (eff === 'dragon' || coins >= 299) {
    return {
      tierClass: 'tier-dragon',
      crownIcon: '🐉',
      effectName,
      blessing: 'บารมีมังกรทองคุ้มครอง มั่งคั่งร่ำรวยมหาศาล ✨'
    };
  }
  if (eff === 'castle' || coins >= 100) {
    return {
      tierClass: 'tier-legend',
      crownIcon: '👑',
      effectName,
      blessing: 'เปิดวิมานทิพย์รับทรัพย์ใหญ่ สมปรารถนาทุกประการ ✨'
    };
  }
  if (eff === 'fireworks' || coins >= 99) {
    return {
      tierClass: 'tier-legend',
      crownIcon: '👑',
      effectName,
      blessing: 'บุญบารมีสว่างไสว โชคลาภรุ่งโรจน์ตลอดปี ✨'
    };
  }
  if (eff === 'royal_carriage' || coins >= 30) {
    return {
      tierClass: 'tier-royal',
      crownIcon: '☸️',
      effectName,
      blessing: 'บุญหนุนนำชีวิตก้าวหน้า การงานการเงินรุ่งเรือง ✨'
    };
  }
  if (eff === 'crystal_fountain' || coins >= 20) {
    return {
      tierClass: 'tier-royal',
      crownIcon: '🪷',
      effectName,
      blessing: 'เงินทองไหลมาเทมา ร่มเย็นเป็นสุขไม่ขาดสาย ✨'
    };
  }
  if (eff === 'golden_bell' || coins >= 15) {
    return {
      tierClass: 'tier-royal',
      crownIcon: '🔔',
      effectName,
      blessing: 'ชื่อเสียงเกียรติยศก้องไกล โชคลาภไหลมาเทมา ✨'
    };
  }
  if (eff === 'flowers' || coins >= 10) {
    return {
      tierClass: 'tier-royal',
      crownIcon: '🌸',
      effectName,
      blessing: 'ชีวิตสดใสสมหวัง มีแต่กัลยาณมิตรและโชคลาภ ✨'
    };
  }
  if (eff === 'lotus' || coins >= 9) {
    return {
      tierClass: 'tier-standard',
      crownIcon: '🪷',
      effectName,
      blessing: 'จิตใจผ่องใส ปัญญาสว่างไสว การงานราบรื่น ✨'
    };
  }
  if (eff === 'incense' || coins >= 5) {
    return {
      tierClass: 'tier-standard',
      crownIcon: '🪔',
      effectName,
      blessing: 'แสงธรรมนำทาง สุขภาพแข็งแรง ร่ำรวยเงินทอง ✨'
    };
  }
  if (eff === 'seamsi') {
    return {
      tierClass: 'tier-seamsi',
      crownIcon: '🎋',
      effectName: 'เสี่ยงเซียมซีมหาโชค',
      blessing: 'ขอพรสิ่งศักดิ์สิทธิ์ รับคำทำนายมงคล ✨'
    };
  }
  return {
    tierClass: 'tier-standard',
    crownIcon: '☸️',
    effectName,
    blessing: 'ขอให้ร่ำรวย โชคลาภเงินทอง สมปรารถนา ✨'
  };
}

function spawnBannerSparkleBurst(tierClass = 'tier-standard') {
  const layer = document.getElementById('effect-sparkle-layer');
  if (!layer) return;
  layer.innerHTML = '';

  const symbols = tierClass === 'tier-dragon'
    ? ['✨', '🌟', '🐉', '✦', '🪷', '💛']
    : tierClass === 'tier-legend'
      ? ['✨', '🌟', '🪷', '✦', '💖', '💛']
      : tierClass === 'tier-seamsi'
        ? ['🎋', '✨', '🌟', '🪷', '✦', '💛']
        : ['✨', '✦', '🪷', '🌟', '💛'];

  const count = tierClass === 'tier-dragon' ? 20 : ((tierClass === 'tier-legend' || tierClass === 'tier-seamsi') ? 16 : 12);

  for (let i = 0; i < count; i++) {
    const sp = document.createElement('span');
    sp.className = 'banner-sparkle-particle';
    sp.textContent = symbols[i % symbols.length];

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const startX = 50 + Math.cos(angle) * (32 + Math.random() * 14);
    const startY = 50 + Math.sin(angle) * (26 + Math.random() * 14);
    const dist = 18 + Math.random() * 28;
    const tx = Math.round(Math.cos(angle) * dist);
    const ty = Math.round(Math.sin(angle) * dist - 8);
    const rot = Math.round((Math.random() - 0.5) * 160);
    const size = Math.round(10 + Math.random() * 6);
    const dur = (1.05 + Math.random() * 0.55).toFixed(2);
    const delay = (Math.random() * 0.18).toFixed(2);
    const sc = (0.9 + Math.random() * 0.5).toFixed(2);

    sp.style.setProperty('--sx', `${startX}%`);
    sp.style.setProperty('--sy', `${startY}%`);
    sp.style.setProperty('--tx', `${tx}px`);
    sp.style.setProperty('--ty', `${ty}px`);
    sp.style.setProperty('--rot', `${rot}deg`);
    sp.style.setProperty('--size', `${size}px`);
    sp.style.setProperty('--dur', `${dur}s`);
    sp.style.setProperty('--delay', `${delay}s`);
    sp.style.setProperty('--sc', sc);

    layer.appendChild(sp);
  }
}

// =====================================================================
// UNIFIED BOTTOM BANNER COORDINATOR (ระบบจัดคิวป้ายล่าง ไม่ให้ซ้อนทับกัน)
// Priority: Gift (P1) > Share (P2) > Follower (P3)
// All 3 banners share the bottom center space. Only ONE can be visible.
// =====================================================================
let _activeBottomBanner = null; // 'gift' | 'share' | 'follower' | null

function hideBottomFollowerBanner(immediate = true) {
  const banner = document.getElementById('follower-banner');
  if (!banner) return;
  if (banner._timer) {
    clearTimeout(banner._timer);
    banner._timer = null;
  }
  banner.classList.remove('pulse');
  banner.classList.add('hidden');
  if (immediate) {
    banner.style.display = 'none';
  } else {
    setTimeout(() => { if (banner.classList.contains('hidden')) banner.style.display = 'none'; }, 300);
  }
  if (_activeBottomBanner === 'follower') _activeBottomBanner = null;
}

function hideBottomShareToast(immediate = true) {
  const banner = document.getElementById('share-toast-banner');
  if (!banner) return;
  if (typeof shareToastHideTimer !== 'undefined' && shareToastHideTimer) {
    clearTimeout(shareToastHideTimer);
    shareToastHideTimer = null;
  }
  banner.classList.remove('active');
  banner.classList.add('hidden');
  if (immediate) {
    banner.style.display = 'none';
  } else {
    setTimeout(() => { if (banner.classList.contains('hidden')) banner.style.display = 'none'; }, 300);
  }
  if (_activeBottomBanner === 'share') _activeBottomBanner = null;
}

function hideBottomEffectBanner(immediate = true) {
  const banner = document.getElementById('effect-banner');
  if (!banner) return;
  if (typeof giftBannerTimer !== 'undefined' && giftBannerTimer) {
    clearTimeout(giftBannerTimer);
    giftBannerTimer = null;
  }
  if (typeof giftBannerFadeTimer !== 'undefined' && giftBannerFadeTimer) {
    clearTimeout(giftBannerFadeTimer);
    giftBannerFadeTimer = null;
  }
  banner.classList.remove('active');
  banner.classList.add('hidden');
  if (immediate) {
    banner.style.display = 'none';
  } else {
    setTimeout(() => { if (banner.classList.contains('hidden')) banner.style.display = 'none'; }, 300);
  }
  if (_activeBottomBanner === 'gift') _activeBottomBanner = null;
}

function isBottomEffectBannerActive() {
  const banner = document.getElementById('effect-banner');
  return !!(banner && banner.style.display !== 'none' && !banner.classList.contains('hidden'));
}

function isBottomShareToastActive() {
  const banner = document.getElementById('share-toast-banner');
  return !!(banner && banner.style.display !== 'none' && !banner.classList.contains('hidden'));
}

window.hideBottomFollowerBanner = hideBottomFollowerBanner;
window.hideBottomShareToast = hideBottomShareToast;
window.hideBottomEffectBanner = hideBottomEffectBanner;
window.isBottomEffectBannerActive = isBottomEffectBannerActive;
window.isBottomShareToastActive = isBottomShareToastActive;

function triggerGiftAnnouncementBanner(donor, giftInfo = null) {
  const banner = document.getElementById('effect-banner');
  if (!banner) return;

  // Mutual Exclusion: Dismiss lower priority banners immediately (P1 overrides P2 and P3)
  hideBottomFollowerBanner(true);
  hideBottomShareToast(true);
  _activeBottomBanner = 'gift';

  const iconImgEl = document.getElementById('effect-icon-img');
  const iconEl = document.getElementById('effect-icon');
  const titleEl = document.getElementById('effect-title');
  const subtitleEl = document.getElementById('effect-subtitle');
  const comboEl = document.getElementById('effect-combo');
  const crownEl = banner.querySelector('.effect-crown-ornament');

  const cleanName = sanitizeDisplayName(donor, 'ผู้มีจิตศรัทธา');
  const giftName = giftInfo?.name || 'ของขวัญมงคล';
  const giftIcon = giftInfo?.icon || '🪷';
  const giftImage = giftInfo?.image || getGiftImageUrl(giftName, giftInfo?.coins, giftInfo?.effectType);
  const count = giftInfo?.count || 1;

  const tierInfo = getBannerTierInfo(giftInfo, giftName);

  banner.classList.remove('tier-standard', 'tier-royal', 'tier-legend', 'tier-dragon', 'tier-seamsi');
  banner.classList.add(tierInfo.tierClass);
  if (crownEl) crownEl.textContent = tierInfo.crownIcon;

  if (iconImgEl && giftImage) {
    iconImgEl.src = giftImage;
    iconImgEl.alt = tierInfo.effectName;
    iconImgEl.style.display = 'block';
    if (iconEl) iconEl.style.display = 'none';
  } else if (iconEl) {
    iconEl.textContent = giftIcon;
    iconEl.style.display = 'inline-block';
    if (iconImgEl) iconImgEl.style.display = 'none';
  }

  if (titleEl) {
    titleEl.innerHTML = `<span class="blessing-tag">🙏 อนุโมทนาบุญ</span><span class="blessing-donor-highlight">คุณ ${escapeHtml(cleanName)}</span>`;
  }
  if (subtitleEl) {
    subtitleEl.innerHTML = `<span class="blessing-effect-pill">✨ ${escapeHtml(tierInfo.effectName)}</span><span class="blessing-wish-text">${escapeHtml(tierInfo.blessing)}</span>`;
  }

  if (comboEl) {
    if (count > 1) {
      comboEl.textContent = `x${count}`;
      comboEl.style.display = 'inline-block';
    } else {
      comboEl.style.display = 'none';
    }
  }

  if (giftBannerFadeTimer) clearTimeout(giftBannerFadeTimer);
  if (giftBannerTimer) clearTimeout(giftBannerTimer);

  banner.style.display = 'flex';
  banner.classList.remove('hidden');
  banner.classList.remove('active');
  void banner.offsetWidth; // force re-flow for animation restart
  banner.classList.add('active');
  spawnBannerSparkleBurst(tierInfo.tierClass);

  giftBannerTimer = setTimeout(() => {
    banner.classList.remove('active');
    banner.classList.add('hidden');
    giftBannerFadeTimer = setTimeout(() => {
      banner.style.display = 'none';
      if (_activeBottomBanner === 'gift') _activeBottomBanner = null;
    }, 450);
  }, 5200);
}

function showBigEffectBanner(icon, title, subtitle, giftInfo = null) {
  const banner = document.getElementById('effect-banner');
  if (!banner) return;

  hideBottomFollowerBanner(true);
  hideBottomShareToast(true);
  _activeBottomBanner = 'gift';

  const iconImgEl = document.getElementById('effect-icon-img');
  const iconEl = document.getElementById('effect-icon');
  const titleEl = document.getElementById('effect-title');
  const subtitleEl = document.getElementById('effect-subtitle');
  const comboEl = document.getElementById('effect-combo');
  const crownEl = banner.querySelector('.effect-crown-ornament');

  const giftImage = giftInfo?.image || (typeof icon === 'string' && icon.startsWith('/') ? icon : getGiftImageUrl(title, giftInfo?.coins || 1));
  const tierInfo = getBannerTierInfo(giftInfo, title);

  banner.classList.remove('tier-standard', 'tier-royal', 'tier-legend', 'tier-dragon', 'tier-seamsi');
  banner.classList.add(tierInfo.tierClass);
  if (crownEl) crownEl.textContent = tierInfo.crownIcon;

  if (iconImgEl && giftImage) {
    iconImgEl.src = giftImage;
    iconImgEl.alt = title || 'ของขวัญ';
    iconImgEl.style.display = 'block';
    if (iconEl) iconEl.style.display = 'none';
  } else if (iconEl) {
    iconEl.textContent = icon || '🪷';
    iconEl.style.display = 'inline-block';
    if (iconImgEl) iconImgEl.style.display = 'none';
  }

  // Extract donor name cleanly if subtitle starts with donor name, else display rich ritual title & blessing
  const ritualTitle = title || tierInfo.effectName || 'อนุโมทนาบุญ';
  const count = giftInfo?.count || 1;

  if (titleEl) {
    titleEl.innerHTML = `<span class="blessing-tag">🪷 พิธีมงคล</span><span class="blessing-donor-highlight">${escapeHtml(ritualTitle)}</span>`;
  }
  if (subtitleEl) {
    subtitleEl.innerHTML = `<span class="blessing-wish-text">${escapeHtml(subtitle || tierInfo.blessing)}</span>`;
  }
  if (comboEl) {
    if (count > 1) {
      comboEl.textContent = `x${count}`;
      comboEl.style.display = 'inline-block';
    } else {
      comboEl.style.display = 'none';
    }
  }

  if (giftBannerFadeTimer) clearTimeout(giftBannerFadeTimer);
  if (giftBannerTimer) clearTimeout(giftBannerTimer);

  banner.style.display = 'flex';
  banner.classList.remove('hidden');
  banner.classList.remove('active');
  void banner.offsetWidth;
  banner.classList.add('active');
  spawnBannerSparkleBurst(tierInfo.tierClass);

  giftBannerTimer = setTimeout(() => {
    banner.classList.remove('active');
    banner.classList.add('hidden');
    giftBannerFadeTimer = setTimeout(() => {
      banner.style.display = 'none';
      if (_activeBottomBanner === 'gift') _activeBottomBanner = null;
    }, 450);
  }, 5200);
}

window.triggerGiftAnnouncementBanner = triggerGiftAnnouncementBanner;
window.showBigEffectBanner = showBigEffectBanner;

function triggerLiveGiftFloat(donor, icon = '🌹', giftName = 'กุหลาบ', count = 1) {
  // Coordinated with top announcement banner
}

let tributeQueuePopupTimer = null;
function triggerTributeQueuePopup(duration = 7500) {
  const panel = document.getElementById('panel-tribute-queue');
  if (!panel) return;
  panel.classList.add('popup-active');
  if (tributeQueuePopupTimer) clearTimeout(tributeQueuePopupTimer);
  tributeQueuePopupTimer = setTimeout(() => {
    panel.classList.remove('popup-active');
  }, duration);
}
window.triggerTributeQueuePopup = triggerTributeQueuePopup;

let recentWishesPopupTimer = null;
function triggerRecentWishesPopup(duration = 7000) {
  const panel = document.getElementById('panel-recent-wishes');
  if (!panel) return;
  panel.classList.add('popup-active');
  if (recentWishesPopupTimer) clearTimeout(recentWishesPopupTimer);
  recentWishesPopupTimer = setTimeout(() => {
    panel.classList.remove('popup-active');
  }, duration);
}
window.triggerRecentWishesPopup = triggerRecentWishesPopup;

let meritBoardPopupTimer = null;
function triggerMeritBoardPopup(duration = 8000) {
  const panel = document.getElementById('panel-merit-board');
  if (!panel) return;
  panel.classList.add('popup-active');
  if (meritBoardPopupTimer) clearTimeout(meritBoardPopupTimer);
  meritBoardPopupTimer = setTimeout(() => {
    panel.classList.remove('popup-active');
  }, duration);
}
window.triggerMeritBoardPopup = triggerMeritBoardPopup;

let clientTributeQueue = [];

function updateTributeQueue(queueOrData) {
  const el = document.getElementById('tribute-queue-list');
  if (!el) return;
  const list = Array.isArray(queueOrData) ? queueOrData : (queueOrData?.tributeQueue || []);
  if (list && Array.isArray(list)) {
    // Keep up to 12 items in memory so active index 0 and queued devotees stay 1:1 with stageActionQueue
    clientTributeQueue = list.slice(0, 12);
  }
  if (!clientTributeQueue || clientTributeQueue.length === 0) {
    el.innerHTML = '<div class="queue-empty">ยังไม่มีคิวถวาย (ร่วมบุญเป็นท่านแรก)</div>';
    return;
  }
  // Render top 3 queue rows so it fits compactly in HUD without overflow or vertical squishing
  el.innerHTML = clientTributeQueue.slice(0, 3).map((item, idx) => {
    const combo = item.comboCount || item.repeatCount || (item.diamondCount > 1 ? item.diamondCount : 0);
    const comboHtml = combo > 1 ? `<span class="q-combo">x${combo}</span>` : '';
    const isActive = idx === 0;
    const statusTag = isActive
      ? `<span class="q-status-active">กำลังถวาย</span>`
      : `<span class="q-status-waiting">คิวที่ ${idx + 1}</span>`;

    // Filter out stale stranger avatar URL
    const rawAvatar = (item.avatar && !item.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) ? item.avatar : '';
    const avatarHtml = rawAvatar
      ? `<img src="${escapeHtml(rawAvatar)}" referrerpolicy="no-referrer" alt="" loading="lazy" onerror="this.outerHTML='🪷'" />`
      : '🪷';

    const displayName = escapeHtml(sanitizeDisplayName(item.nickname || item.uniqueId || 'ผู้มีจิตศรัทธา'));
    const giftIcon = escapeHtml(item.giftIcon || '🌹');
    const giftImgUrl = item.giftImage || getGiftImageUrl(item.giftName, item.diamondCount);
    const giftBadgeContent = giftImgUrl
      ? `<img src="${giftImgUrl}" class="q-gift-img" width="14" height="14" alt="" onerror="this.outerHTML='${giftIcon}'" />`
      : giftIcon;

    return `
      <div class="queue-row ${isActive ? 'active' : ''}">
        <div class="q-avatar">${avatarHtml}</div>
        <div class="q-info">
          <div class="q-name" title="${displayName}">${displayName}</div>
          ${statusTag}
        </div>
        <div class="q-badge">${giftBadgeContent}${comboHtml}</div>
      </div>
    `;
  }).join('');
}

function pushTributeQueueClient(giftData) {
  if (!giftData) return;
  const donorName = giftData.nickname || giftData.uniqueId || 'ผู้มีจิตศรัทธา';
  const isStreakCombo = Boolean(giftData.isStreakCombo);
  const existingIdx = isStreakCombo
    ? clientTributeQueue.findIndex(q =>
      (q.uniqueId && giftData.uniqueId && !giftData.uniqueId.startsWith('user_') && q.uniqueId === giftData.uniqueId) ||
      (q.nickname && donorName !== 'ผู้เจริญสติ' && donorName !== 'ผู้มีจิตศรัทธา' && q.nickname === donorName)
    )
    : -1;

  if (existingIdx !== -1) {
    clientTributeQueue[existingIdx].comboCount = (clientTributeQueue[existingIdx].comboCount || 1) + (giftData.comboCount || 1);
    clientTributeQueue[existingIdx].giftIcon = giftData.giftIcon || clientTributeQueue[existingIdx].giftIcon;
    clientTributeQueue[existingIdx].giftImage = giftData.giftImage || clientTributeQueue[existingIdx].giftImage;
    clientTributeQueue[existingIdx].timestamp = Date.now();
  } else {
    clientTributeQueue.push({
      nickname: donorName,
      uniqueId: giftData.uniqueId,
      avatar: giftData.avatar,
      giftIcon: giftData.giftIcon,
      giftImage: giftData.giftImage || getGiftImageUrl(giftData.giftName, giftData.diamondCount),
      giftName: giftData.giftName,
      comboCount: giftData.comboCount || 1,
      timestamp: Date.now()
    });
    // Never shift index 0 (the currently active donor 'กำลังถวาย'); remove oldest waiting entry at index 1 if over cap
    while (clientTributeQueue.length > 12) {
      clientTributeQueue.splice(1, 1);
    }
  }
  updateTributeQueue(clientTributeQueue);
  triggerTributeQueuePopup(7500); // Pop up Tribute Queue when viewer sends gift
}

function advanceTributeQueue(finishedName) {
  if (clientTributeQueue && clientTributeQueue.length > 0) {
    if (finishedName) {
      const idx = clientTributeQueue.findIndex(q => q.nickname === finishedName || q.uniqueId === finishedName);
      if (idx !== -1) {
        clientTributeQueue.splice(idx, 1);
        updateTributeQueue(clientTributeQueue);
      }
    } else {
      clientTributeQueue.shift();
      updateTributeQueue(clientTributeQueue);
    }
  }
  if (typeof socket !== 'undefined' && socket && finishedName) {
    socket.emit('tribute_complete', { nickname: finishedName });
  }
}

let clientRecentWishesList = [];

function pushRecentWishClient(nickname, wishText) {
  if (!wishText || !wishText.trim()) return;
  const cleanWish = wishText.trim();
  const cleanNick = sanitizeDisplayName(nickname, 'ผู้เจริญสติ');
  clientRecentWishesList.unshift({
    nickname: cleanNick,
    wish: cleanWish
  });
  if (clientRecentWishesList.length > 8) {
    clientRecentWishesList = clientRecentWishesList.slice(0, 8);
  }
  updateRecentWishes(clientRecentWishesList);
  triggerRecentWishesPopup(7000); // Pop up Recent Wishes card when viewer submits prayer wish
}

function updateRecentWishes(wishes) {
  const el = document.getElementById('recent-wishes-stream');
  if (!el) return;
  const list = Array.isArray(wishes) ? wishes : (wishes?.recentWishes || []);
  if (list && list.length > 0) {
    clientRecentWishesList = list.slice(0, 8);
  }
  if (!clientRecentWishesList || clientRecentWishesList.length === 0) {
    el.innerHTML = '<div class="wish-empty">รอรับคำขอพร (ร่วมส่งใจขอพร) ✨</div>';
    return;
  }
  // Render up to 3-4 clean items with star icon to fit HUD card without vertical squishing
  el.innerHTML = clientRecentWishesList.slice(0, 3).map(w => `
    <div class="wish-item">
      <span class="w-icon">✨</span>
      <span class="w-name">${escapeHtml(sanitizeDisplayName(w.nickname || 'ผู้เจริญสติ'))}:</span>
      <span class="w-text">${escapeHtml(w.wish)}</span>
    </div>
  `).join('');
}

let clientMeritList = [];
try {
  const savedMerit = localStorage.getItem('buddha_top_merit');
  if (savedMerit) {
    const parsed = JSON.parse(savedMerit);
    if (Array.isArray(parsed) && parsed.length > 0) clientMeritList = parsed;
  }
} catch (_) { }

function updateMeritBoard(list) {
  const el = document.getElementById('merit-board-list');
  if (!el) return;
  const validList = Array.isArray(list) ? list.filter(item => item && (item.coins > 0 || item.diamondCount > 0)) : [];

  // Update client cache and persist if valid list received
  if (validList.length > 0) {
    clientMeritList = validList.slice(0, 5);
    try {
      localStorage.setItem('buddha_top_merit', JSON.stringify(clientMeritList));
    } catch (_) { }
    triggerMeritBoardPopup(8000); // Pop up TOP 5 Merit Board on new donation/leaderboard update
  } else if (clientMeritList.length === 0) {
    el.innerHTML = '<div class="merit-empty">เจริญพรผู้ร่วมอนุโมทนาบุญ ✨</div>';
    el._lastSignature = '';
    return;
  }

  // Prevent flicker/blink: If DOM already displays this exact state, skip re-render
  const listToRender = (validList.length > 0 ? validList : clientMeritList).slice(0, 5);
  const signature = listToRender.map(i => `${i.nickname}_${i.coins || i.diamondCount}_${i.lastGiftName}_${i.avatar || ''}`).join('|');
  if (el._lastSignature === signature) return; // Prevent DOM re-renders & image flickering
  el._lastSignature = signature;

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const badgeClasses = ['gold', 'silver', 'bronze', 'regular', 'regular'];
  el.innerHTML = listToRender.map((item, idx) => {
    const giftImgUrl = item.lastGiftImage || getGiftImageUrl(item.lastGiftName, item.coins);
    const giftBadge = giftImgUrl
      ? `<img src="${giftImgUrl}" class="merit-gift-img" width="14" height="14" alt="" onerror="this.outerHTML='${item.lastGiftIcon || '✨'}'" />`
      : (item.lastGiftIcon || '✨');
    // Donor profile picture (same filtering as the Sadhu board; stale placeholder avatars fall back to 🪷)
    const rawAvatar = (item.avatar && !item.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) ? item.avatar : '';
    const avatarHtml = rawAvatar
      ? `<img src="${escapeHtml(rawAvatar)}" referrerpolicy="no-referrer" alt="" loading="lazy" onerror="this.outerHTML='🪷'" />`
      : '🪷';
    const name = escapeHtml(sanitizeDisplayName(item.nickname || item.uniqueId || 'ผู้มีจิตศรัทธา'));
    return `
      <div class="merit-row rank-${idx + 1}">
        <div class="merit-row-left">
          <span class="rank-badge-circle ${badgeClasses[idx] || 'regular'}">${medals[idx] || (idx + 1)}</span>
          <div class="merit-avatar">${avatarHtml}</div>
          <span class="merit-name" title="${name}">${name}</span>
        </div>
        <span class="merit-pts" title="${escapeHtml(item.lastGiftName || 'ของขวัญ')}">${giftBadge} ${item.coins || item.diamondCount || 1}</span>
      </div>
    `;
  }).join('');
}

// Initial hydration from persistent cache so TOP 5 is immediately visible
if (clientMeritList.length > 0) {
  setTimeout(() => updateMeritBoard(clientMeritList), 50);
}

let clientSadhuScores = [];
try {
  const cachedSadhu = localStorage.getItem('buddha_top_sadhu');
  if (cachedSadhu) {
    const parsed = JSON.parse(cachedSadhu);
    if (Array.isArray(parsed) && parsed.length > 0) {
      clientSadhuScores = parsed;
    }
  }
} catch (_) { }

function updateSadhuTicker(nickname, count = 1) {
  const tickerEl = document.getElementById('sadhu-recent-ticker');
  const textEl = document.getElementById('sadhu-ticker-text');
  if (!textEl) return;
  const cleanName = sanitizeDisplayName(nickname || 'ผู้มีจิตศรัทธา');
  textEl.innerHTML = `✨ คุณ <strong>${escapeHtml(cleanName)}</strong> ร่วมอนุโมทนาบุญ (สะสมบารมี ${count}) 🙏`;
  if (tickerEl) {
    tickerEl.classList.remove('ticker-active');
    void tickerEl.offsetWidth; // re-flow
    tickerEl.classList.add('ticker-active');
    if (tickerEl._timer) clearTimeout(tickerEl._timer);
    tickerEl._timer = setTimeout(() => {
      tickerEl.classList.remove('ticker-active');
    }, 4500);
  }
}

function updateSadhuBoard(list, flashNickname = '') {
  const el = document.getElementById('sadhu-board-list');
  if (!el) return;
  const validList = Array.isArray(list) ? list.filter(item => item && (item.count > 0 || item.points > 0)) : [];
  if (validList.length === 0) {
    el.innerHTML = '<div class="sadhu-empty">ร่วมอนุโมทนาบุญสาธุ 🙏</div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const badgeClasses = ['gold', 'silver', 'bronze', 'rank-4', 'rank-5'];
  const topList = validList.slice(0, 5);

  try {
    localStorage.setItem('buddha_top_sadhu', JSON.stringify(topList));
  } catch (_) { }

  el.innerHTML = topList.map((item, idx) => {
    const rawAvatar = (item.avatar && !item.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) ? item.avatar : '';
    const avatarHtml = rawAvatar
      ? `<img src="${escapeHtml(rawAvatar)}" referrerpolicy="no-referrer" alt="" loading="lazy" onerror="this.outerHTML='🪷'" />`
      : '🪷';
    const name = escapeHtml(sanitizeDisplayName(item.nickname || item.uniqueId || 'ผู้มีจิตศรัทธา'));
    const pts = item.count || item.points || 1;
    const isFlash = flashNickname && (item.nickname === flashNickname || item.uniqueId === flashNickname);
    const flashClass = isFlash ? ' sadhu-row-flash' : '';
    return `
      <div class="sadhu-row rank-${idx + 1}${flashClass}">
        <div class="sadhu-row-left">
          <span class="rank-badge-circle ${badgeClasses[idx] || 'bronze'}">${medals[idx] || (idx + 1)}</span>
          <div class="sadhu-avatar">${avatarHtml}</div>
          <span class="sadhu-name" title="${name}">${name}</span>
        </div>
        <div class="sadhu-points">
          <span class="sadhu-pts-num">${pts}</span>
          <span class="sadhu-pts-unit">สาธุ</span>
        </div>
      </div>
    `;
  }).join('');
}

// Initial hydration from persistent cache so TOP 5 Sadhu is immediately visible on boot
if (clientSadhuScores.length > 0) {
  setTimeout(() => updateSadhuBoard(clientSadhuScores), 60);
}

function recordClientSadhu(user, avatar = '', customCount = null) {
  if (!user) return;
  const cleanName = (user || '').trim();
  let existing = clientSadhuScores.find(s => s.nickname === cleanName || s.uniqueId === cleanName);
  if (!existing) {
    existing = { nickname: cleanName, uniqueId: cleanName, avatar: avatar || '', count: 0, lastAt: Date.now() };
    clientSadhuScores.push(existing);
  }
  if (avatar && !existing.avatar) existing.avatar = avatar;
  if (customCount !== null && customCount !== undefined) {
    existing.count = Math.max(existing.count, customCount);
  } else {
    existing.count++;
  }
  existing.lastAt = Date.now();
  clientSadhuScores.sort((a, b) => (b.count - a.count) || (b.lastAt - a.lastAt));
  updateSadhuBoard(clientSadhuScores.slice(0, 5), cleanName);
  updateSadhuTicker(cleanName, existing.count);
}

function updatePrayerCategories(cats) {
  if (!cats) return;
  const keys = ['work', 'wealth', 'love', 'health', 'study'];
  const total = keys.reduce((sum, k) => sum + (cats[k] || 0), 0);
  keys.forEach(k => {
    const countEl = document.getElementById(`count-${k}`);
    const barEl = document.getElementById(`bar-${k}`);
    const val = cats[k] || 0;
    if (countEl) countEl.textContent = val;
    if (barEl) {
      if (total > 0 && val > 0) {
        const pct = Math.min(100, Math.max(8, Math.round((val / total) * 100)));
        barEl.style.width = `${pct}%`;
      } else {
        barEl.style.width = '0%';
      }
    }
  });
}

function spawnFollowerSparkleBurst() {
  const layer = document.getElementById('follower-sparkle-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const symbols = ['✨', '🌟', '✦', '🪷', '💛'];
  const count = 12;
  for (let i = 0; i < count; i++) {
    const sp = document.createElement('span');
    sp.className = 'banner-sparkle-particle';
    sp.textContent = symbols[i % symbols.length];
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const startX = 50 + Math.cos(angle) * 35;
    const startY = 50 + Math.sin(angle) * 25;
    const dist = 16 + Math.random() * 24;
    const tx = Math.round(Math.cos(angle) * dist);
    const ty = Math.round(Math.sin(angle) * dist - 6);
    const rot = Math.round((Math.random() - 0.5) * 140);
    const size = Math.round(9 + Math.random() * 5);
    const dur = (0.95 + Math.random() * 0.45).toFixed(2);
    const delay = (Math.random() * 0.15).toFixed(2);

    sp.style.setProperty('--sx', `${startX}%`);
    sp.style.setProperty('--sy', `${startY}%`);
    sp.style.setProperty('--tx', `${tx}px`);
    sp.style.setProperty('--ty', `${ty}px`);
    sp.style.setProperty('--rot', `${rot}deg`);
    sp.style.setProperty('--size', `${size}px`);
    sp.style.setProperty('--dur', `${dur}s`);
    sp.style.setProperty('--delay', `${delay}s`);
    sp.style.setProperty('--sc', '1.1');
    layer.appendChild(sp);
  }
}

function triggerFollowerBanner(name) {
  // P3 Priority: Do not display or clash if higher-priority Gift (P1) or Share (P2) banner is active
  if (typeof isBottomEffectBannerActive === 'function' && isBottomEffectBannerActive()) {
    return;
  }
  if (typeof isBottomShareToastActive === 'function' && isBottomShareToastActive()) {
    return;
  }

  const banner = document.getElementById('follower-banner');
  const nameEl = document.getElementById('follower-banner-name');
  if (nameEl) nameEl.textContent = name || 'ผู้มีจิตศรัทธา';
  if (banner) {
    _activeBottomBanner = 'follower';
    banner.style.display = 'flex';
    banner.classList.remove('hidden');
    banner.classList.remove('pulse');
    void banner.offsetWidth; // re-flow
    banner.classList.add('pulse');
    spawnFollowerSparkleBurst();
    if (typeof templeAudio !== 'undefined' && templeAudio.playLotusChime) {
      templeAudio.playLotusChime();
    }
    if (banner._timer) clearTimeout(banner._timer);
    banner._timer = setTimeout(() => {
      banner.classList.add('hidden');
      setTimeout(() => {
        if (banner.classList.contains('hidden')) {
          banner.style.display = 'none';
        }
        if (_activeBottomBanner === 'follower') _activeBottomBanner = null;
      }, 600);
    }, 7000);
  }
}

// ── Global Testing Hooks for Live Preview (Banners, Seam-Si Cards, Lucky Modals) ──
window.testBigBanner = function (tier = 'standard') {
  const dummyGifts = {
    standard: { name: 'กุหลาบ', icon: '🌹', coins: 1, effectType: 'kowtow', count: 1 },
    incense: { name: 'เครื่องราง', icon: '🪔', coins: 5, effectType: 'incense', count: 1 },
    royal: { name: 'ขบวนราชรถ', icon: '☸️', coins: 30, effectType: 'royal_carriage', count: 1 },
    seamsi: { name: 'รักนะมากๆ', icon: '🎋', coins: 1, effectType: 'seamsi', count: 1 },
    legend: { name: 'เปิดวิมานทิพย์', icon: '👑', coins: 100, effectType: 'castle', count: 1 },
    dragon: { name: 'มังกรทองเหิน', icon: '🐉', coins: 299, effectType: 'dragon', count: 1 }
  };
  const g = dummyGifts[tier] || dummyGifts.standard;
  triggerGiftAnnouncementBanner('กัลยาณมิตร', g);
};

window.testFollowerBanner = function (name = 'ผู้มีจิตศรัทธา') {
  triggerFollowerBanner(name);
};

window.testSeamSiCard = function (donor = 'ผู้มีจิตศรัทธา') {
  showSeamSiFortuneScroll(donor);
};

window.testLuckyCard = function (donor = 'ผู้มีจิตศรัทธา') {
  showLuckyNumbersModal(donor);
};

function updateLeaderboard(list) {
  if (!leaderboardList) return;
  if (!list || list.length === 0) {
    leaderboardList.innerHTML = '<div class="empty-hint">ร่วมเป็นผู้ถวายสักการะอันดับ 1 ในไลฟ์นี้ ✨</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const classes = ['gold', 'silver', 'bronze', '', ''];

  leaderboardList.innerHTML = list.map((item, idx) => `
    <div class="rank-row ${classes[idx]}">
      <span class="rank-idx ${classes[idx]}">${medals[idx]}</span>
      <span class="rank-name">${escapeHtml(item.nickname)}</span>
      <span class="rank-coin">${item.coins} แต้มบุญ</span>
    </div>
  `).join('');
}

// Toggle Leaderboard Drawer
if (btnToggleLeaderboard) {
  btnToggleLeaderboard.addEventListener('click', () => {
    leaderboardList.classList.toggle('hidden');
    drawerArrow.textContent = leaderboardList.classList.contains('hidden') ? '▲' : '▼';
  });
}

// ---------------------------------------------------------------------
// 5.1 Center Stage Character Ritual Engine (เดินตามรันเวย์พรมแดงไปกราบ/ถวายหน้าแท่นบูชา)
// ---------------------------------------------------------------------
let lastRitualActivityTime = 0; // Initialized to 0 so startup has zero lockout delay
const stageActionQueue = [];
let isStageActionRunning = false;
let stageActionWatchdogTimer = null;
let nextStageProcessTimer = null;
let stageActionRunId = 0;
let activeStageActor = null;
let activeStageAction = null;

function performStageAction(type, name = 'ผู้มีจิตศรัทธา', wish = null, giftInfo = null) {
  const isAmbient = Boolean(giftInfo?.isAmbient);
  // Ambient bot safety clamp: bots are strictly limited to kowtow and incense only
  if (isAmbient && type !== 'kowtow' && type !== 'incense') {
    type = 'kowtow';
  }
  const isStreakCombo = Boolean(giftInfo?.isStreakCombo);
  if (!isAmbient) {
    lastRitualActivityTime = Date.now();
  }

  if (!isAmbient) {
    // Real viewer gift: freeze ambient bots for at least 60 seconds
    if (typeof scheduleNextAmbientDevotion === 'function') {
      scheduleNextAmbientDevotion(60000);
    }
    // Purge any pending ambient bot offerings so real gifts have immediate priority
    for (let i = stageActionQueue.length - 1; i >= 0; i--) {
      if (stageActionQueue[i].giftInfo?.isAmbient) {
        stageActionQueue.splice(i, 1);
      }
    }
    // Preempt running ambient bot immediately so real viewer takes the stage without delay
    if (isStageActionRunning && activeStageAction?.giftInfo?.isAmbient) {
      if (activeStageActor) {
        activeStageActor.stopAllMovement();
        if (activeStageActor.finalPos) {
          activeStageActor.root.position.set(activeStageActor.finalPos.x, activeStageActor.finalPos.y, activeStageActor.finalPos.z);
        }
      }
      if (stageActionWatchdogTimer) {
        clearTimeout(stageActionWatchdogTimer);
        stageActionWatchdogTimer = null;
      }
      activeStageActor = null;
      activeStageAction = null;
      isStageActionRunning = false;
    }
  }

  const giftCoins = giftInfo?.coins || 1;
  const giftCount = giftInfo?.count || 1;

  // 1. Combo Booster: Only absorb into active actor when this is an in-flight TikTok streak packet (isStreakCombo)
  // and the actor is actively at the altar with their badge visible
  if (isStreakCombo && isStageActionRunning && activeStageActor && activeStageActor.userData?.nickname === name && activeStageAction?.type === type) {
    if (activeStageActor.isPerformingAltarRitual && activeStageActor.giftBadgeSprite && giftInfo) {
      activeStageActor.userData.giftCount = (activeStageActor.userData.giftCount || 1) + giftCount;
      updateFloatingGiftBadge(activeStageActor.giftBadgeSprite, giftInfo.icon, giftInfo.name, activeStageActor.userData.giftCount);
      if (activeStageActor.giftBadgeSprite.userData) {
        activeStageActor.giftBadgeSprite.userData.punchScale = 1.30;
      }
      spawnGiftTrailRose();
      createCarpetRipple(activeStageActor.root.position.x, 0.05, activeStageActor.root.position.z, 0xffd700);
      createLotusBloomDecal(activeStageActor.root.position.x, 0.05, activeStageActor.root.position.z, 0xffd700);
      spawnBlessingSparks(activeStageActor.root.position.x, 0.25, activeStageActor.root.position.z, 14, 0xffea70);
      return;
    }
  }

  // 2. Combo Aggregation: Only aggregate into queued item when this is an in-flight TikTok streak packet (isStreakCombo)
  if (isStreakCombo) {
    const existingQueued = stageActionQueue.find(item => item.name === name && item.type === type);
    if (existingQueued) {
      if (existingQueued.giftInfo) {
        existingQueued.giftInfo.coins = (existingQueued.giftInfo.coins || 1) + giftCoins;
        existingQueued.giftInfo.count = (existingQueued.giftInfo.count || 1) + giftCount;
      }
      if (wish) existingQueued.wish = wish;
      return;
    }
  }

  // Immediate visual feedback on every incoming gift even while another devotee is on stage
  if (!isAmbient && isStageActionRunning) {
    spawnGiftTrailRose();
    if (activeStageActor && activeStageActor.root) {
      spawnBlessingSparks(activeStageActor.root.position.x, 0.25, activeStageActor.root.position.z, 8, 0xffea70);
    }
  }

  // 3. Queue Placement: Real VIP Tier 8, 9, 10 immediately unshifts to front of queue
  const newItem = { type, name, wish, giftInfo: { ...giftInfo, count: giftCount, coins: giftCoins } };
  if (!isAmbient && (type === 'dragon' || type === 'castle' || type === 'fireworks')) {
    stageActionQueue.unshift(newItem);
  } else {
    stageActionQueue.push(newItem);
  }

  // 4. Cap queue length: maximum 12 items to prevent queue latency backlog
  while (stageActionQueue.length > 12) {
    const idxToRemove = stageActionQueue.findIndex(a => !a.giftInfo?.isLegend);
    if (idxToRemove !== -1) {
      stageActionQueue.splice(idxToRemove, 1);
    } else {
      stageActionQueue.pop();
    }
  }

  processStageActionQueue();
}

function processStageActionQueue() {
  if (nextStageProcessTimer) {
    clearTimeout(nextStageProcessTimer);
    nextStageProcessTimer = null;
  }
  if (isStageActionRunning || stageActionQueue.length === 0) return;
  isStageActionRunning = true;
  const currentRunId = ++stageActionRunId;

  if (stageActionWatchdogTimer) {
    clearTimeout(stageActionWatchdogTimer);
    stageActionWatchdogTimer = null;
  }

  const currentAction = stageActionQueue.shift();
  const { type, name, wish, giftInfo } = currentAction;
  activeStageAction = currentAction;

  // Safety Watchdog: 18s generous ceiling (longest ritual + walk is ~12.5s) with full state & pose recovery
  stageActionWatchdogTimer = setTimeout(() => {
    if (currentRunId !== stageActionRunId) return;
    console.warn('[StageActionWatchdog] Gift action timed out after 18s. Resetting lock and restoring poses.');
    stageActionWatchdogTimer = null;
    disciplesMap.forEach(d => {
      if (d === activeStageActor || d.isWalking || d.isPerformingAltarRitual) {
        d.stopAllMovement();
        if (d.finalPos) {
          d.root.position.set(d.finalPos.x, d.finalPos.y, d.finalPos.z);
        }
      }
    });
    activeStageActor = null;
    activeStageAction = null;
    isStageActionRunning = false;
    advanceTributeQueue(name);
    processStageActionQueue();
  }, 18000);

  // 1. ปล่อยละอองดอกกุหลาบ/เกสรทองลอยตามแนวพรมแดงมุ่งสู่แท่นบูชาอย่างนุ่มนวล
  spawnGiftTrailRose();
  setTimeout(() => spawnGiftTrailRose(), 220);

  // 2. เลือกตัวละครเพื่อเดินก้าวทอดน่องตามพรมแดงไปประกอบพิธี
  let actor = null;
  // 2a. Priority 1: Match the donor by uniqueId or nickname (as long as they are not currently the active stage actor and not currently performing altar ritual)
  disciplesMap.forEach(d => {
    if (!actor && d !== activeStageActor && !d.isPerformingAltarRitual) {
      const matchNick = d.userData?.nickname && d.userData.nickname === name;
      const matchUid = giftInfo?.uniqueId && d.userData?.uniqueId && d.userData.uniqueId === giftInfo.uniqueId;
      if (matchNick || matchUid) {
        actor = d;
      }
    }
  });

  // 2b. Priority 2: Pick first general seat (seats 5..TOTAL_SEATS) that is idle
  if (!actor) {
    for (let s = 5; s < TOTAL_SEATS; s++) {
      const d = disciplesMap.get(s);
      if (d && !d.isWalking && !d.isPerformingAltarRitual && d !== activeStageActor) {
        actor = d;
        break;
      }
    }
  }

  // 2c. Priority 3: Pick any seated devotee not performing altar ritual
  if (!actor) {
    disciplesMap.forEach(d => {
      if (!actor && !d.isWalking && !d.isPerformingAltarRitual && d !== activeStageActor) {
        actor = d;
      }
    });
  }

  // 2d. Safety Guarantee: If every single devotee is flagged busy or moving seat, pick a general seat and stop movement
  if (!actor) {
    for (let s = 5; s < TOTAL_SEATS; s++) {
      const d = disciplesMap.get(s);
      if (d && d !== activeStageActor && !d.isPerformingAltarRitual) {
        d.stopAllMovement();
        if (d.finalPos) d.root.position.set(d.finalPos.x, d.finalPos.y, d.finalPos.z);
        actor = d;
        break;
      }
    }
  }
  if (!actor && disciplesMap.size > 0) {
    for (const d of disciplesMap.values()) {
      if (d !== activeStageActor && !d.isPerformingAltarRitual) {
        d.stopAllMovement();
        if (d.finalPos) d.root.position.set(d.finalPos.x, d.finalPos.y, d.finalPos.z);
        actor = d;
        break;
      }
    }
  }

  // 2e. If scene has no devotees at all (e.g. initial count was 0), automatically seat the viewer!
  if (!actor) {
    actor = seatRealViewer({
      nickname: name,
      uniqueId: giftInfo?.uniqueId,
      avatar: giftInfo?.avatar
    });
  }

  if (actor) {
    actor.stopAllMovement(true);
    activeStageActor = actor;
    if (name) {
      if (actor.nameplate) {
        safeDisposeSprite(actor.nameplate);
        const isVip = Boolean(actor.userData && actor.userData.seatId !== undefined && actor.userData.seatId < 5);
        actor.nameplate = createNameplateSprite(name, isVip, actor.root.position.z, false, giftInfo?.avatar || actor.userData?.avatar);
        actor.nameplate.position.y = (actor.baseH || 0.45) + 0.04;
        actor.root.add(actor.nameplate);
      }
    }

    // Adaptive speed calculation based on queue backlog and audience surge
    const qLen = stageActionQueue.length;
    const isCrowded = (typeof currentLiveViewers === 'number' && currentLiveViewers > 15);
    const speedMult = qLen > 3 ? 2.2 : (qLen > 1 ? 1.75 : (qLen > 0 ? 1.4 : (isCrowded ? 1.35 : 1.0)));

    // ตัวละครเริ่มเดินจากปลายพรมแดงสู่หน้าพระพักตร์พระแม่กวนอิมอย่างสง่างาม
    actor.walkToAltarAndKowtow(type, () => {
      if (currentRunId !== stageActionRunId) return;
      if (stageActionWatchdogTimer) {
        clearTimeout(stageActionWatchdogTimer);
        stageActionWatchdogTimer = null;
      }
      // Restore seat owner's nameplate if this seat was temporarily borrowed
      if (actor.userData?.nickname && actor.userData.nickname !== name && actor.nameplate) {
        safeDisposeSprite(actor.nameplate);
        const isVip = Boolean(actor.userData.seatId !== undefined && actor.userData.seatId < 5);
        actor.nameplate = createNameplateSprite(actor.userData.nickname, isVip, actor.root.position.z, false, actor.userData?.avatar);
        actor.nameplate.position.y = (actor.baseH || 0.45) + 0.04;
        actor.root.add(actor.nameplate);
      }
      activeStageActor = null;
      activeStageAction = null;
      isStageActionRunning = false;
      advanceTributeQueue(name);
      const nextDelay = stageActionQueue.length > 1 ? 120 : 260;
      nextStageProcessTimer = setTimeout(() => processStageActionQueue(), nextDelay);
    }, wish, giftInfo, speedMult, name);
  } else {
    // If all actors are busy, put action back at head of queue and retry shortly so the viewer's gift is NEVER lost
    stageActionQueue.unshift(currentAction);
    if (stageActionWatchdogTimer) {
      clearTimeout(stageActionWatchdogTimer);
      stageActionWatchdogTimer = null;
    }
    activeStageActor = null;
    activeStageAction = null;
    isStageActionRunning = false;
    nextStageProcessTimer = setTimeout(() => processStageActionQueue(), 350);
  }
}

function executeStageRitual(actor, type, name, giftInfo, onComplete) {
  if (typeof giftInfo === 'function') {
    onComplete = giftInfo;
    giftInfo = null;
  }
  try {
    const isAmbient = giftInfo?.isAmbient === true;
  const giftIcon = giftInfo?.icon || (type === 'flowers' ? '🌸' : type === 'lotus' ? '🪷' : type === 'incense' ? '🪔' : '🌹');
  const giftName = giftInfo?.name || (type === 'flowers' ? 'บุปผามงคล' : type === 'lotus' ? 'ดอกบัวทิพย์' : type === 'incense' ? 'ประทีปธูปหอม' : 'ดอกกุหลาบ');
  const giftImg = giftInfo?.image || giftInfo?.giftImage || getGiftImageUrl(giftName, giftInfo?.coins, type);
  const activeGiftInfo = { ...(giftInfo || {}), icon: giftIcon, name: giftName, image: giftImg };
  const qLen = stageActionQueue.length;

  // Trigger Celestial Heavenly FX Screen & Particle Layer
  try {
    if (window.heavenlyFX && typeof window.heavenlyFX.play === 'function') {
      window.heavenlyFX.play(type);
    }
  } catch (hfxErr) {
    console.warn('[HeavenlyFX Trigger]', type, hfxErr);
  }

  if (type === 'kowtow') {
    // Authentic 3-Phase Benjangkhapradit Prostrations in 2D Chibi with dynamic queue pacing
    if (!isAmbient) {
      templeAudio.playBell(432, 4.0);
    } else {
      templeAudio.playBell(432, 3.0);
    }
    triggerKowtowEffect();

    let bowCycle = 0;
    function doOneBenjangkhapradit() {
      const liveQ = stageActionQueue.length;
      const maxBows = liveQ > 3 ? 2 : 3;
      const bowDownMs = liveQ > 1 ? 240 : 340;
      const bowUpMs = liveQ > 1 ? 250 : 350;
      const bowHoldMs = liveQ > 1 ? 280 : 480;
      const bowCycleDelay = liveQ > 1 ? 180 : 340;

      // Phase 1: Wanthana (ยกมือพนมขึ้นจรดหน้าผาก ยืดตัวนอบน้อมเล็กน้อยก่อนหมอบกราบ)
      if (actor.charSprite) {
        actor.charSprite.scale.set(actor.baseW * 0.985, actor.baseH * 1.03, 1);
      }
      actor.addRitualTimeout(() => {
        // Phase 2: Aphitsawat (ค่อยๆ หมอบกราบเบญจางคประดิษฐ์ลงแตะอาสนะอย่างนุ่มนวล)
        actor.smoothPoseTransition('kowtow', bowDownMs, () => {
          createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
          createLotusBloomDecal(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
          spawnBlessingSparks(actor.root.position.x, 0.05, actor.root.position.z, 14, 0xffea70);
          triggerCharacterGoldenAura(actor.root);
          templeAudio.playWoodblock();

          actor.addRitualTimeout(() => {
            // Phase 3: Rise back to Anjali Kneel (ค่อยๆ เงยขึ้นนั่งพนมมือนิ่งสงบ นอบน้อม)
            actor.smoothPoseTransition('kneel', bowUpMs, () => {
              actor.triggerBow();
              bowCycle++;
              const targetBows = stageActionQueue.length > 3 ? 2 : maxBows;
              if (bowCycle < targetBows) {
                actor.addRitualTimeout(doOneBenjangkhapradit, bowCycleDelay);
              } else {
                actor.addRitualTimeout(onComplete, stageActionQueue.length > 1 ? 280 : 500);
              }
            });
          }, bowHoldMs);
        });
      }, liveQ > 1 ? 75 : 120);
    }
    doOneBenjangkhapradit();

  } else if (type === 'seamsi') {
    if (isAmbient) {
      actor.smoothPoseTransition('kneel', 260, () => {
        actor.triggerBow();
        actor.addRitualTimeout(onComplete, 1200);
      });
      return;
    }
    const seamFortune = activeGiftInfo.seamsiFortune || drawSeamSiFortune();
    activeGiftInfo.seamsiFortune = seamFortune;
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerSeamSiEffect(name, seamFortune, true);
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
      createLotusBloomDecal(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 4000 : 5500);
    });

  } else if (type === 'incense') {
    if (!isAmbient) {
      templeAudio.playBell(432, 3.5);
    } else {
      templeAudio.playBell(432, 3.0);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerIncenseEffect();
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffaa00);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 2200 : 3200);
    });

  } else if (type === 'lotus') {
    if (!isAmbient) {
      templeAudio.playBell(513.6, 4.0);
    } else {
      templeAudio.playBell(513.6, 3.0);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerLotusBloomEffect();
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xff69b4);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 2500 : 3600);
    });

  } else if (type === 'flowers') {
    if (!isAmbient) {
      templeAudio.playBell(513.6, 4.5);
    } else {
      templeAudio.playBell(513.6, 3.0);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerLotusRainEffect();
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);

      if (actor.auraSprite) actor.auraSprite.material.opacity = 0.70;
      actor.triggerBow();
      actor.addRitualTimeout(() => {
        if (actor.auraSprite) {
          actor.addRitualInterval((iid) => {
            actor.auraSprite.material.opacity -= 0.05;
            if (actor.auraSprite.material.opacity <= 0) {
              actor.auraSprite.material.opacity = 0;
              clearInterval(iid);
            }
          }, 50);
        }
        actor.addRitualTimeout(onComplete, qLen > 1 ? 700 : 1000);
      }, qLen > 1 ? 2000 : 2800);
    });

  } else if (type === 'golden_bell') {
    if (!isAmbient) {
      templeAudio.playBell(108, 6.0);
    } else {
      templeAudio.playBell(108, 4.5);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerGoldenBellEffect();
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 2800 : 3800);
    });

  } else if (type === 'crystal_fountain') {
    if (!isAmbient) {
      templeAudio.playLotusChime();
    } else {
      templeAudio.playLotusChime();
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerCrystalFountainEffect();
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0x00f5d4);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 2800 : 3800);
    });

  } else if (type === 'royal_carriage') {
    if (!isAmbient) {
      templeAudio.playBell(432, 6.0);
    } else {
      templeAudio.playBell(432, 4.5);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerRoyalCarriageEffect();
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 3000 : 4200);
    });

  } else if (type === 'fireworks') {
    if (!isAmbient) {
      templeAudio.playBell(639, 6.0);
    } else {
      templeAudio.playBell(639, 4.5);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerFireworksEffect();
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffa500);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 3200 : 4500);
    });

  } else if (type === 'castle') {
    if (!isAmbient) {
      templeAudio.playBell(741, 7.0);
    } else {
      templeAudio.playBell(741, 5.0);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerHeavenlyPortalEffect();
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 3200 : 4500);
    });

  } else if (type === 'dragon') {
    if (!isAmbient) {
      templeAudio.playBell(852, 8.0);
    } else {
      templeAudio.playBell(852, 6.0);
    }
    actor.smoothPoseTransition('kneel', 260, () => {
      triggerDragonDescentEffect();
      triggerCharacterGoldenAura(actor.root);
      createCarpetRipple(actor.root.position.x, 0.05, actor.root.position.z, 0xffd700);
      actor.triggerBow();
      actor.addRitualTimeout(onComplete, qLen > 1 ? 3500 : 4800);
    });

  } else {
    // Graceful fallback for any unknown ritual type so queue NEVER freezes
    if (typeof onComplete === 'function') {
      actor.addRitualTimeout(onComplete, 800);
    }
  }
} catch (err) {
  console.error('[executeStageRitual] Unexpected error during stage ritual:', err);
  if (typeof onComplete === 'function') {
    try {
      onComplete();
    } catch (cbErr) {
      console.error('[executeStageRitual] onComplete fallback failed:', cbErr);
    }
  }
}
}

// Quick Merit Buttons at Bottom Dock
document.querySelectorAll('.merit-action-grid .gift-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const donorName = (typeof getNextSimDonor === 'function') ? getNextSimDonor() : 'ผู้มีจิตศรัทธา';
    if (action === 'follow') {
      onFollowEvent({ nickname: donorName });
    } else if (action === 'gift-1') {
      onGiftEvent({ nickname: donorName, giftName: 'ดอกกุหลาบ', giftIcon: '🌹', coins: 1, totalDiamonds: 1, giftImage: '/rose.png', effectType: 'kowtow' });
    } else if (action === 'gift-5') {
      onGiftEvent({ nickname: donorName, giftName: 'เครื่องราง', giftIcon: '🫰', coins: 5, totalDiamonds: 5, giftImage: '/omamori.png', effectType: 'incense' });
    } else if (action === 'gift-10') {
      onGiftEvent({ nickname: donorName, giftName: 'กุหลาบ ๙๙', giftIcon: '🌹', coins: 10, totalDiamonds: 10, giftImage: '/rose_99.png', effectType: 'flowers' });
    }
  });
});

// Audio & Guan Yin AI Voice Controls
const btnAudioToggle = document.getElementById('btn-audio-toggle');
const chkVoice = document.getElementById('chk-voice');
const chkChatVoice = document.getElementById('chk-chat-voice');
const chkAudio = document.getElementById('chk-audio');
const chkAmbient = document.getElementById('chk-ambient');
const volumeSlider = document.getElementById('volume-slider');

if (chkVoice) {
  chkVoice.addEventListener('change', e => {
    guanYinVoice.enabled = e.target.checked;
    if (!e.target.checked) {
      guanYinVoice.stopAll();
    }
  });
}

if (chkChatVoice) {
  // Sync initial state
  chkChatVoice.checked = guanYinVoice.chatVoiceEnabled;
  chkChatVoice.addEventListener('change', e => {
    guanYinVoice.chatVoiceEnabled = e.target.checked;
    try {
      localStorage.setItem('buddha_chat_voice', e.target.checked ? 'true' : 'false');
    } catch (_) { }
    if (typeof showToast === 'function') {
      showToast('ตั้งค่าเสียง AI 🗣️', e.target.checked ? 'เปิดระบบ AI อ่านคำขอพร & ให้พรผู้ชมในแชท' : 'ปิดระบบเสียงอ่านแชท');
    }
  });
}

btnAudioToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isPlaying = templeAudio.toggleAmbient();
  btnAudioToggle.textContent = isPlaying ? '🎵' : '🔇';
  chkAmbient.checked = isPlaying;
});

chkAudio.addEventListener('change', e => {
  templeAudio.enabled = e.target.checked;
  if (!e.target.checked) {
    templeAudio.userMuted = true;
    templeAudio.stopAmbient();
    btnAudioToggle.textContent = '🔇';
    chkAmbient.checked = false;
  }
});

chkAmbient.addEventListener('change', e => {
  if (e.target.checked) {
    templeAudio.userMuted = false;
    templeAudio.startAmbient(true);
    btnAudioToggle.textContent = '🎵';
  } else {
    templeAudio.userMuted = true;
    templeAudio.stopAmbient();
    btnAudioToggle.textContent = '🔇';
  }
});

const volValEl = document.getElementById('volume-val');
if (volumeSlider) {
  if (volValEl) {
    volValEl.textContent = `${volumeSlider.value}%`;
  }
  volumeSlider.addEventListener('input', e => {
    if (volValEl) volValEl.textContent = `${e.target.value}%`;
    templeAudio.setVolume(parseFloat(e.target.value) / 100);
  });
}

// Direct Instant AI Voice Test Button
const btnTestAiVoice = document.getElementById('btn-test-ai-voice');
if (btnTestAiVoice) {
  btnTestAiVoice.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof guanYinVoice !== 'undefined' && guanYinVoice) {
      guanYinVoice.enabled = true;
      if (chkVoice) chkVoice.checked = true;
      guanYinVoice.speak('เจริญพรคุณโยม ระบบเสียง AI พระแม่กวนอิมพร้อมทำงานในไลฟ์สดแล้วนะคะ', 1);
    }
  });
}

// Channel Preset Pill (@suphat.060841)
const btnPresetSuphat = document.getElementById('btn-preset-suphat');
if (btnPresetSuphat) {
  btnPresetSuphat.addEventListener('click', (e) => {
    e.stopPropagation();
    const inp = document.getElementById('tiktok-user-input');
    if (inp) {
      inp.value = 'suphat.060841';
      inp.focus();
    }
  });
}

// Audio Re-Sync Button
const btnUnlockAudioResync = document.getElementById('btn-unlock-audio-resync');
if (btnUnlockAudioResync) {
  btnUnlockAudioResync.addEventListener('click', (e) => {
    e.stopPropagation();
    templeAudio.userMuted = false;
    unlockAndStartAudio(true);
    btnUnlockAudioResync.textContent = '✅ ปลดล็อกเสียงแล้ว';
    setTimeout(() => {
      btnUnlockAudioResync.textContent = '🎵 ปลดล็อก & รีเฟรชเสียงเพลงสมาธิ';
    }, 2200);
  });
}

// Auto-start and unlock audio automatically (Supports Headless OBS / TikTok LIVE Studio Browser Sources)
const unlockAndStartAudio = (withFeedback = false) => {
  if (templeAudio.userMuted || !templeAudio.enabled) return;

  templeAudio.init();
  if (templeAudio.ctx && templeAudio.ctx.state === 'suspended') {
    templeAudio.ctx.resume().catch(() => { });
  }
  templeAudio.startAmbient(withFeedback);
};

const unlockEvents = ['click', 'touchstart', 'pointerdown', 'keydown'];
const handleUnlockGesture = (e) => {
  if (e && e.target) {
    if (e.target.id === 'btn-audio-toggle' || (e.target.closest && e.target.closest('#control-panel'))) return;
  }
  if (!templeAudio.userMuted) {
    const isClickOrKey = e && (e.type === 'click' || e.type === 'touchstart' || e.type === 'pointerdown' || e.type === 'keydown');
    unlockAndStartAudio(isClickOrKey);
    if (templeAudio.ambientPlaying) {
      detachUnlockListeners();
    }
  }
};

function attachUnlockListeners() {
  unlockEvents.forEach(evt => {
    window.addEventListener(evt, handleUnlockGesture, { passive: true, capture: true });
    document.addEventListener(evt, handleUnlockGesture, { passive: true, capture: true });
  });
}

function detachUnlockListeners() {
  unlockEvents.forEach(evt => {
    window.removeEventListener(evt, handleUnlockGesture, { capture: true });
    document.removeEventListener(evt, handleUnlockGesture, { capture: true });
  });
}

// Start listening for initial gesture unlock
attachUnlockListeners();

// Immediate start on boot + continuous watchdog for TikTok LIVE Studio / OBS CEF
unlockAndStartAudio(false);
setTimeout(() => unlockAndStartAudio(false), 300);
setTimeout(() => unlockAndStartAudio(false), 800);
setTimeout(() => unlockAndStartAudio(false), 2000);
setTimeout(() => unlockAndStartAudio(false), 4000);
setInterval(() => {
  if (!templeAudio.userMuted && templeAudio.enabled && !templeAudio.ambientPlaying) {
    unlockAndStartAudio(false);
  }
}, 3000);

const unlockPill = document.getElementById('audio-unlock-pill');
if (unlockPill) {
  unlockPill.addEventListener('click', (e) => {
    e.stopPropagation();
    templeAudio.userMuted = false;
    unlockAndStartAudio(true);
    unlockPill.style.display = 'none';
    detachUnlockListeners();
  });
}

// Control Panel Toggle & 4-Pane Navigation
const controlPanel = document.getElementById('control-panel');
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const btnClosePanel = document.getElementById('btn-close-panel');

function updateControlPanelQuickStatus(isConnected, roundNum) {
  const miniStatus = document.getElementById('conn-status-mini');
  if (miniStatus) {
    if (isConnected) {
      miniStatus.className = 'status-pill status-mini-online';
      miniStatus.textContent = '🟢 ออนไลน์';
    } else {
      miniStatus.className = 'status-pill status-mini-offline';
      miniStatus.textContent = '🔴 ออฟไลน์';
    }
  }
  const roundIndicator = document.getElementById('panel-round-indicator');
  if (roundIndicator) {
    const rNum = roundNum || (window.roundManager ? window.roundManager.roundNum : 1);
    roundIndicator.textContent = `🌿 รอบ ${rNum}`;
  }
}
window.updateControlPanelQuickStatus = updateControlPanelQuickStatus;

function initControlPanelTabs() {
  const tabButtons = document.querySelectorAll('#control-panel-tabs .tab-btn');
  const tabPanes = document.querySelectorAll('.panel-tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(`pane-${targetTab}`);
      if (activePane) activePane.classList.add('active');
    });
  });

  // Quick Mute BGM button in drawer header
  const btnQuickMute = document.getElementById('btn-quick-mute-bgm');
  if (btnQuickMute) {
    btnQuickMute.addEventListener('click', () => {
      if (typeof templeAudio !== 'undefined' && templeAudio) {
        const isPlaying = templeAudio.toggleAmbient();
        btnQuickMute.textContent = isPlaying ? '🎵' : '🔇';
        btnQuickMute.title = isPlaying ? 'กดเพื่อปิดเสียงเพลง (Mute)' : 'กดเพื่อเปิดเสียงเพลง (Unmute)';
      }
    });
  }

  const syncStatus = () => {
    const isConn = connStatus && connStatus.classList.contains('status-online');
    const round = (window.roundManager && window.roundManager.roundNum) || 1;
    updateControlPanelQuickStatus(isConn, round);
  };

  if (btnTogglePanel) {
    btnTogglePanel.addEventListener('click', () => {
      controlPanel.classList.toggle('open');
      syncStatus();
    });
  }
  if (btnClosePanel) {
    btnClosePanel.addEventListener('click', () => controlPanel.classList.remove('open'));
  }
}

initControlPanelTabs();

// Click / Tap LIVE Clock Badge to toggle control panel seamlessly
const liveClockBadge = document.querySelector('.live-clock-pill');
if (liveClockBadge) {
  liveClockBadge.title = 'แตะเพื่อเปิด/ปิดแผงควบคุม (หรือกด H / Tab)';
  liveClockBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    controlPanel.classList.toggle('open');
    const isConn = connStatus && connStatus.classList.contains('status-online');
    const round = (window.roundManager && window.roundManager.roundNum) || 1;
    updateControlPanelQuickStatus(isConn, round);
  });
}

window.addEventListener('keydown', e => {
  if (e.key === 'h' || e.key === 'H' || e.key === 'Tab') {
    e.preventDefault();
    controlPanel.classList.toggle('open');
  } else if (e.key === 'm' || e.key === 'M') {
    // Hotkey 'M': toggle ambient music
    const isPlaying = templeAudio.toggleAmbient();
    if (btnAudioToggle) btnAudioToggle.textContent = isPlaying ? '🎵' : '🔇';
    if (chkAmbient) chkAmbient.checked = isPlaying;
    if (typeof showToast === 'function') {
      showToast(isPlaying ? 'เปิดเสียงสมาธิ 🎵' : 'ปิดเสียงสมาธิ 🔇', 'กด M เพื่อสลับเสียง / กด H เพื่อตั้งค่า');
    }
  }
});

// Simulation Panel Buttons
document.getElementById('sim-follow').addEventListener('click', () => {
  const testNames = ['กัลยาณมิตร', 'โยมบารมี', 'โยมธันวา', 'ผู้มีจิตศรัทธา'];
  const testName = testNames[Math.floor(Math.random() * testNames.length)];
  onFollowEvent({ nickname: testName });
});

document.getElementById('sim-multi-disciples').addEventListener('click', () => {
  const seat = disciplesMap.size % TOTAL_SEATS;
  const testNames = ['โยมสมศักดิ์', 'โยมกัญญา', 'โยมส้มโอ', 'โยมธันวา', 'โยมมงคล', 'ผู้เจริญสติ'];
  const name = `${testNames[seat % testNames.length]} #${seat + 1}`;
  const devotee = addOrUpdateDiscipleInScene({ seatId: seat, nickname: name }, false);
  if (devotee) {
    triggerViewerWelcomeHighlight(devotee);
  }
  guanYinVoice.speakWelcome(name);
  templeAudio.playWoodblock();
  discipleCountEl.textContent = disciplesMap.size;
});

const simDevoteeNames = [
  'โยมสมศักดิ์', 'โยมบารมี', 'โยมกัญญา', 'โยมส้มโอ',
  'โยมธันวา', 'โยมมงคล', 'โยมพิมพรรณ', 'โยมณัฐพล',
  'โยมศิริพร', 'โยมกิตติ', 'โยมวรรณา', 'โยมประเสริฐ',
  'โยมสุพรรณี', 'โยมชัยวัฒน์'
];
let simDevoteeIdx = 0;
function getNextSimDonor() {
  return simDevoteeNames[(simDevoteeIdx++) % simDevoteeNames.length];
}

const btnSimGiftSeamSi = document.getElementById('sim-gift-seamsi');
if (btnSimGiftSeamSi) {
  btnSimGiftSeamSi.addEventListener('click', () => {
    onGiftEvent({
      nickname: getNextSimDonor(),
      giftName: 'รักนะมากๆ (เซียมซี)',
      giftIcon: '🎋',
      coins: 1,
      totalDiamonds: 1,
      giftImage: '/seamsi.png',
      effectType: 'seamsi',
      effectName: 'เสี่ยงเซียมซีมหาโชค'
    });
  });
}

const btnSimGift1 = document.getElementById('sim-gift-1');
if (btnSimGift1) {
  btnSimGift1.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'ดอกกุหลาบ', giftIcon: '🌹', coins: 1, totalDiamonds: 1, giftImage: '/rose.png', effectType: 'kowtow' });
  });
}

const btnSimGift5 = document.getElementById('sim-gift-5');
if (btnSimGift5) {
  btnSimGift5.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'เครื่องราง', giftIcon: '🫰', coins: 5, totalDiamonds: 5, giftImage: '/omamori.png', effectType: 'incense' });
  });
}

const btnSimGift9 = document.getElementById('sim-gift-9');
if (btnSimGift9) {
  btnSimGift9.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'Lucky 9', giftIcon: '9️⃣', coins: 9, totalDiamonds: 9, giftImage: '/lucky_9.png', effectType: 'lotus' });
  });
}

const btnSimGift10 = document.getElementById('sim-gift-10');
if (btnSimGift10) {
  btnSimGift10.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'กุหลาบ ๙๙', giftIcon: '🌹', coins: 10, totalDiamonds: 10, giftImage: '/rose_99.png', effectType: 'flowers' });
  });
}

const btnSimGift15 = document.getElementById('sim-gift-15') || document.getElementById('sim-gift-50');
if (btnSimGift15) {
  btnSimGift15.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'พวงมาลัย', giftIcon: '📿', coins: 15, totalDiamonds: 15, giftImage: '/garland.png', effectType: 'golden_bell' });
  });
}

const btnSimGift20 = document.getElementById('sim-gift-20') || document.getElementById('sim-gift-100');
if (btnSimGift20) {
  btnSimGift20.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'โคโลญจน์', giftIcon: '🎁', coins: 20, totalDiamonds: 20, giftImage: '/cologne.png', effectType: 'crystal_fountain' });
  });
}

const btnSimGift30 = document.getElementById('sim-gift-30') || document.getElementById('sim-gift-200');
if (btnSimGift30) {
  btnSimGift30.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'โดนัท', giftIcon: '🍩', coins: 30, totalDiamonds: 30, giftImage: '/donut.png', effectType: 'royal_carriage' });
  });
}

const btnSimGift99 = document.getElementById('sim-gift-99') || document.getElementById('sim-gift-500');
if (btnSimGift99) {
  btnSimGift99.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'หัวใจ 4 ดวง', giftIcon: '🕊️', coins: 99, totalDiamonds: 99, isLegend: true, giftImage: '/four_hearts.png', effectType: 'fireworks' });
  });
}

const btnSimGift100 = document.getElementById('sim-gift-100') || document.getElementById('sim-gift-1000');
if (btnSimGift100) {
  btnSimGift100.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'ประตูมิติ', giftIcon: '🧨', coins: 100, totalDiamonds: 100, isLegend: true, giftImage: '/portal.png', effectType: 'castle' });
  });
}

const btnSimGift299 = document.getElementById('sim-gift-299') || document.getElementById('sim-gift-5000');
if (btnSimGift299) {
  btnSimGift299.addEventListener('click', () => {
    onGiftEvent({ nickname: getNextSimDonor(), giftName: 'มังกรแฟนตาซี', giftIcon: '🐉', coins: 299, totalDiamonds: 299, isLegend: true, giftImage: '/dragon.png', effectType: 'dragon' });
  });
}

document.getElementById('sim-chat').addEventListener('click', () => {
  const wishes = [
    'สวัสดีค่ะพระแม่กวนอิม 🙏 ขอให้ครอบครัวมีความสุข',
    'กราบสักการะพระแม่กวนอิมมหาโพธิสัตว์ค่ะ สาธุ 🙏',
    'สวัสดีรอบห้องค่ะ ขอให้ทุกคนเฮงๆ รวยๆ',
    'สาธุ 🙏',
    'สาธุๆๆ ขอให้ครอบครัวร่มเย็นเป็นสุข มีโชคลาภเงินทอง 💰',
    'ขอให้การงานก้าวหน้า ค้าขายร่ำรวย ลูกค้าเข้าเยอะๆ สาธุ 🙏',
    'ขอให้สุขภาพแข็งแรง ปราศจากโรคภัยทั้งปวงนะคะ 🌿',
    'ขอให้สอบผ่าน ได้เกรดดี สมความปรารถนาค่ะ 📚',
    'ขอให้ปลดหนี้ปลดสิน มีเงินทองเหลือกินเหลือใช้ เฮงๆ ปังๆ สาธุ ✨'
  ];
  const chosenWish = wishes[Math.floor(Math.random() * wishes.length)];
  const dummyNames = ['โยมกัญญา', 'โยมสมศักดิ์', 'โยมธันวา', 'โยมส้มโอ', 'โยมบารมี'];
  const dummyName = dummyNames[Math.floor(Math.random() * dummyNames.length)];
  const simUid = 'sim_user_' + dummyName;

  onChatMessage({
    nickname: dummyName,
    uniqueId: simUid,
    comment: chosenWish
  });

  // Also broadcast to server simulator so server-side sadhuScores updates in real-time
  fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'chat',
      payload: {
        nickname: dummyName,
        uniqueId: simUid,
        comment: chosenWish
      }
    })
  }).catch(() => { });

  const cats = ['wealth', 'work', 'health', 'love', 'study'];
  const randomCat = cats[Math.floor(Math.random() * cats.length)];
  const countEl = document.getElementById(`count-${randomCat}`);
  if (countEl) {
    const nextVal = (parseInt(countEl.textContent, 10) || 0) + 1;
    countEl.textContent = nextVal;
    const barEl = document.getElementById(`bar-${randomCat}`);
    if (barEl) {
      const pct = Math.min(100, Math.round((nextVal / 60) * 100));
      barEl.style.width = `${pct}%`;
    }
  }
});

const btnSimShare = document.getElementById('sim-share');
if (btnSimShare) {
  btnSimShare.addEventListener('click', () => {
    const sharerNames = ['คุณกัญญา', 'คุณสมศักดิ์', 'คุณพิมพ์ใจ', 'คุณธันวา', 'คุณเมตตา'];
    const pickName = sharerNames[Math.floor(Math.random() * sharerNames.length)];
    if (typeof onShareEvent === 'function') {
      onShareEvent({
        uniqueId: 'sim_sharer_' + Date.now(),
        nickname: pickName,
        avatar: '/rose.png',
        meritDelta: 5
      });
    }
  });
}

const btnSimRoundCycle = document.getElementById('sim-round-cycle');
if (btnSimRoundCycle) {
  btnSimRoundCycle.addEventListener('click', () => {
    if (typeof window.testRoundCycle === 'function') {
      window.testRoundCycle(true);
    }
  });
}

const btnSimSeamSiFull = document.getElementById('sim-test-seamsi-full');
if (btnSimSeamSiFull) {
  btnSimSeamSiFull.addEventListener('click', () => {
    if (typeof window.testGiftEffect === 'function') {
      window.testGiftEffect('seamsi');
    } else if (btnSimGiftSeamSi) {
      btnSimGiftSeamSi.click();
    }
  });
}

const btnSimFollowerBanner = document.getElementById('sim-test-follower-banner');
if (btnSimFollowerBanner) {
  btnSimFollowerBanner.addEventListener('click', () => {
    if (typeof onFollowEvent === 'function') {
      onFollowEvent({ nickname: 'โยมผู้มีจิตศรัทธา' });
    } else if (typeof triggerFollowerBanner === 'function') {
      triggerFollowerBanner('โยมผู้มีจิตศรัทธา');
    }
  });
}

const btnSimVideoTier1 = document.getElementById('sim-video-tier1');
if (btnSimVideoTier1) {
  btnSimVideoTier1.addEventListener('click', () => {
    if (typeof window.testMiracleVideo === 'function') {
      window.testMiracleVideo('tier1');
    }
  });
}

const btnSimVideoTier2 = document.getElementById('sim-video-tier2');
if (btnSimVideoTier2) {
  btnSimVideoTier2.addEventListener('click', () => {
    if (typeof window.testMiracleVideo === 'function') {
      window.testMiracleVideo('tier2');
    }
  });
}

const btnSimVideoClimax = document.getElementById('sim-video-climax');
if (btnSimVideoClimax) {
  btnSimVideoClimax.addEventListener('click', () => {
    if (typeof window.testMiracleVideo === 'function') {
      const clim = (Math.random() < 0.5) ? 'climax_a' : 'climax_b';
      window.testMiracleVideo(clim);
    }
  });
}

document.getElementById('btn-reset-scene').addEventListener('click', () => {
  if (typeof hideCeremonyModals === 'function') hideCeremonyModals();
  disciplesMap.forEach(d => disciplesGroup.remove(d.root));
  disciplesMap.clear();
  activeSpeechBubbles.length = 0;
  clientSadhuScores = [];
  try { localStorage.removeItem('buddha_top_sadhu'); } catch (_) { }
  updateSadhuBoard([]);
  const textEl = document.getElementById('sadhu-ticker-text');
  if (textEl) textEl.textContent = 'อนุโมทนาบุญบารมีสะสม ✨';
  updateViewerCount(0);
  const resetBtn = document.getElementById('btn-reset-scene');
  if (resetBtn) {
    const orig = resetBtn.textContent;
    resetBtn.textContent = '✅ รีเซ็ตเรียบร้อยแล้ว';
    setTimeout(() => { resetBtn.textContent = orig; }, 2000);
  }
});

// Copy ?voice=0 Link for TikTok LIVE Studio
const btnCopyVoiceZero = document.getElementById('btn-copy-voice-zero');
if (btnCopyVoiceZero) {
  btnCopyVoiceZero.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = window.location.origin + window.location.pathname + '?voice=0';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        btnCopyVoiceZero.textContent = '✅ คัดลอกสำเร็จแล้ว!';
        setTimeout(() => {
          btnCopyVoiceZero.textContent = '📋 คัดลอกลิงก์ ?voice=0 สำหรับ TikTok LIVE Studio';
        }, 2500);
      }).catch(() => {
        prompt('คัดลอกลิงก์นี้ไปใส่ใน TikTok LIVE Studio:', url);
      });
    } else {
      prompt('คัดลอกลิงก์นี้ไปใส่ใน TikTok LIVE Studio:', url);
    }
  });
}

// ---------------------------------------------------------------------
// 6. Socket.IO Real-Time Engine (Real TikTok Live Stream Events)
// ---------------------------------------------------------------------
const socket = io({
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  query: {
    tabId: typeof speechCoordinator !== 'undefined' ? speechCoordinator.tabId : 'tab_' + Date.now(),
    voice: new URLSearchParams(window.location.search).get('voice') || ''
  }
});

if (typeof speechCoordinator !== 'undefined' && speechCoordinator) {
  speechCoordinator.bindSocket(socket);
}

socket.on('state_reset', () => {
  if (typeof hideCeremonyModals === 'function') hideCeremonyModals();
  clientSadhuScores = [];
  try { localStorage.removeItem('buddha_top_sadhu'); } catch (_) { }
  updateSadhuBoard([]);
  const textEl = document.getElementById('sadhu-ticker-text');
  if (textEl) textEl.textContent = 'อนุโมทนาบุญบารมีสะสม ✨';
  clientMeritList = [];
  try { localStorage.removeItem('buddha_top_merit'); } catch (_) { }
  const el = document.getElementById('merit-board-list');
  if (el) {
    el.innerHTML = '<div class="merit-empty">เจริญพรผู้ร่วมอนุโมทนาบุญ ✨</div>';
    el._lastSignature = '';
  }
});

socket.on('mic_router_sync', (data) => {
  if (!data || typeof smartMicRouter === 'undefined' || !smartMicRouter) return;
  if (data.mode) smartMicRouter.mode = data.mode;
  if (data.sinkId) smartMicRouter.sinkId = data.sinkId;
  if (typeof data.acousticsEnabled === 'boolean') smartMicRouter.acousticsEnabled = data.acousticsEnabled;
  if (typeof data.keepAliveEnabled === 'boolean') smartMicRouter.keepAliveEnabled = data.keepAliveEnabled;
  if (typeof data.dualMonitorEnabled === 'boolean') smartMicRouter.dualMonitorEnabled = data.dualMonitorEnabled;
  smartMicRouter.saveLocalSettings();
  const modeEl = document.getElementById('select-mic-mode');
  if (modeEl) modeEl.value = smartMicRouter.mode;
  smartMicRouter.applyGlobalRouting();
});

socket.on('mic_router_test', () => {
  if (typeof smartMicRouter !== 'undefined' && smartMicRouter) {
    smartMicRouter.ensureMicAcousticsContext();
  }
  if (typeof speechCoordinator !== 'undefined' && speechCoordinator && !speechCoordinator.canSpeak()) {
    return;
  }
  if (typeof guanYinVoice !== 'undefined' && guanYinVoice) {
    guanYinVoice.enabled = true;
    guanYinVoice.speak('ทดสอบสัญญาณไมโครโฟน ขอพระแม่กวนอิมประทานพรให้ทุกท่านโชคดีมีสุข ร่ำรวยเงินทองนะคะ', 1);
  }
});

// Restore EulerStream API Key
const savedEulerKey = localStorage.getItem('buddha_euler_key');
const eulerInputEl = document.getElementById('euler-api-key-input');
if (savedEulerKey && eulerInputEl) {
  eulerInputEl.value = savedEulerKey;
}

document.getElementById('btn-connect').addEventListener('click', async () => {
  let user = document.getElementById('tiktok-user-input').value.trim();
  if (!user) {
    alert('กรุณาพิมพ์ชื่อ TikTok ของผู้จัด (เช่น @username หรือ username)');
    return;
  }
  user = user.replace(/^@+/, '');
  const enteredKey = document.getElementById('euler-api-key-input') ? document.getElementById('euler-api-key-input').value.trim() : '';
  if (enteredKey) localStorage.setItem('buddha_euler_key', enteredKey);

  connStatus.className = 'conn-status status-offline';
  connStatus.textContent = `กำลังค้นหาและเชื่อมต่อกับ TikTok @${user}...`;

  try {
    const res = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user,
        apiKey: document.getElementById('euler-api-key-input') ? document.getElementById('euler-api-key-input').value.trim() : ''
      })
    });
    const result = await res.json();
    if (!result.success) {
      connStatus.className = 'conn-status status-offline';
      connStatus.textContent = `ข้อผิดพลาด: ${result.error || 'ไม่สามารถเชื่อมต่อได้'}`;
      showToast('เชื่อมต่อไม่สำเร็จ', result.error || 'ตรวจสอบชื่อช่องและการเปิด Live');
    }
  } catch (err) {
    connStatus.className = 'conn-status status-offline';
    connStatus.textContent = `เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ${err.message}`;
  }

  // Backup socket emit
  socket.emit('connect-tiktok', { uniqueId: user });
});

document.getElementById('btn-disconnect').addEventListener('click', async () => {
  try {
    await fetch('/api/disconnect', { method: 'POST' });
  } catch (_) { }
  socket.emit('disconnect-tiktok');
  connStatus.className = 'conn-status status-offline';
  connStatus.textContent = 'ตัดการเชื่อมต่อแล้ว';
});

function handleInitialState(data) {
  if (!data) return;
  if (data.tiktokUsername) {
    document.getElementById('tiktok-user-input').value = data.tiktokUsername;
  }
  if (data.isConnected) {
    connStatus.className = 'conn-status status-online';
    connStatus.textContent = `เชื่อมต่อกับ @${data.tiktokUsername} สำเร็จ (LIVE เรียลไทม์)`;
    updateControlPanelQuickStatus(true, window.roundManager?.roundNum);
  } else {
    updateControlPanelQuickStatus(false, window.roundManager?.roundNum);
  }
  if (data.viewersCount !== undefined) {
    updateViewerCount(data.viewersCount);
  }
  if (data.disciples && Array.isArray(data.disciples)) {
    data.disciples.forEach(d => addOrUpdateDiscipleInScene(d, false));
    discipleCountEl.textContent = disciplesMap.size;
  }
  if (data.leaderboard && Array.isArray(data.leaderboard)) {
    updateLeaderboard(data.leaderboard);
  }
  if (data.topSadhu && Array.isArray(data.topSadhu)) {
    clientSadhuScores = data.topSadhu;
    updateSadhuBoard(data.topSadhu);
  }
  if (data.tributeQueue) updateTributeQueue(data.tributeQueue);
  if (data.recentWishes) updateRecentWishes(data.recentWishes);
  if (data.prayerCategories) updatePrayerCategories(data.prayerCategories);
  if (data.micRouterConfig && typeof smartMicRouter !== 'undefined' && smartMicRouter) {
    const cfg = data.micRouterConfig;
    if (cfg.mode) smartMicRouter.mode = cfg.mode;
    if (typeof cfg.acousticsEnabled === 'boolean') smartMicRouter.acousticsEnabled = cfg.acousticsEnabled;
    if (typeof cfg.keepAliveEnabled === 'boolean') smartMicRouter.keepAliveEnabled = cfg.keepAliveEnabled;
    if (typeof cfg.dualMonitorEnabled === 'boolean') smartMicRouter.dualMonitorEnabled = cfg.dualMonitorEnabled;
    smartMicRouter.saveLocalSettings();
    const modeEl = document.getElementById('select-mic-mode');
    if (modeEl) modeEl.value = smartMicRouter.mode;
    smartMicRouter.applyGlobalRouting();
  }
}

socket.on('initial_state', handleInitialState);
socket.on('init_state', handleInitialState);
socket.on('state', handleInitialState);

// Status change listener from server.js
socket.on('status_change', (data) => {
  console.log('[Socket] status_change:', data);
  if (data && data.isConnected) {
    connStatus.className = 'conn-status status-online';
    const roomTxt = data.roomId ? ` (ห้อง ${data.roomId})` : '';
    connStatus.textContent = `เชื่อมต่อกับ @${data.username} สำเร็จ${roomTxt}`;
    if (data.username) {
      document.getElementById('streamer-name').textContent = data.username;
    }
    updateControlPanelQuickStatus(true, window.roundManager?.roundNum);
    showToast('เชื่อมต่อสำเร็จ ✨', `เชื่อมต่อกับห้อง LIVE ของ @${data.username} เรียบร้อยแล้ว`);
  } else {
    connStatus.className = 'conn-status status-offline';
    const errMsg = data?.error || 'ตัดการเชื่อมต่อ หรือช่องยังไม่ได้เปิด Live';
    connStatus.textContent = errMsg;
    updateControlPanelQuickStatus(false, window.roundManager?.roundNum);
    showToast('สถานะการเชื่อมต่อ', errMsg);
  }
});

const onConnected = (data) => {
  connStatus.className = 'conn-status status-online';
  const name = (data && (data.uniqueId || data.username)) || 'TikTok';
  connStatus.textContent = `เชื่อมต่อกับ @${name} แล้ว (LIVE เรียลไทม์)`;
  if (data && data.streamerName) {
    document.getElementById('streamer-name').textContent = data.streamerName;
  }
  updateControlPanelQuickStatus(true, window.roundManager?.roundNum);
};
socket.on('tiktok-connected', onConnected);
socket.on('tiktok_connected', onConnected);

const onError = (err) => {
  connStatus.className = 'conn-status status-offline';
  connStatus.textContent = `เกิดข้อผิดพลาด: ${err ? (err.message || err) : 'ไม่สามารถเชื่อมต่อได้'}`;
  updateControlPanelQuickStatus(false, window.roundManager?.roundNum);
};
socket.on('tiktok-error', onError);
socket.on('tiktok_error', onError);

function extractNumber(val, defaultVal = 0) {
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (typeof val === 'string') {
    const num = parseInt(val, 10);
    return isNaN(num) ? defaultVal : num;
  }
  if (val && typeof val === 'object') {
    if (typeof val.count === 'number') return val.count;
    if (typeof val.viewerCount === 'number') return val.viewerCount;
    if (typeof val.viewersCount === 'number') return val.viewersCount;
    if (typeof val.totalLikeCount === 'number') return val.totalLikeCount;
    if (typeof val.totalLikes === 'number') return val.totalLikes;
    if (typeof val.likeCount === 'number') return val.likeCount;
    if (val.count !== undefined) return extractNumber(val.count, defaultVal);
    if (val.viewerCount !== undefined) return extractNumber(val.viewerCount, defaultVal);
    if (val.viewersCount !== undefined) return extractNumber(val.viewersCount, defaultVal);
    if (val.totalLikes !== undefined) return extractNumber(val.totalLikes, defaultVal);
    if (val.totalLikeCount !== undefined) return extractNumber(val.totalLikeCount, defaultVal);
  }
  return defaultVal;
}

const onStatsUpdate = (stats) => {
  if (!stats) return;
  const viewers = extractNumber(stats.viewerCount ?? stats.viewersCount ?? stats.count, null);
  if (viewers !== null) {
    updateViewerCount(viewers);
  }
  const likes = extractNumber(stats.totalLikes ?? stats.totalLikeCount ?? stats.likeCount, null);
  if (likes !== null) {
    document.getElementById('like-count').textContent = likes;
  }
};
socket.on('live-stats', onStatsUpdate);
socket.on('live_stats', onStatsUpdate);
socket.on('viewer_count', (data) => {
  updateViewerCount(extractNumber(data, 0));
});
socket.on('roomUser', (data) => {
  updateViewerCount(extractNumber(data, 0));
});
socket.on('action_like', (data) => {
  document.getElementById('like-count').textContent = extractNumber(data?.totalLikes ?? data, 0);
});
socket.on('like', (data) => {
  document.getElementById('like-count').textContent = extractNumber(data?.totalLikeCount ?? data, 0);
});

const clientSeenEventKeys = new Map();
function isDuplicateClientEvent(key, ttlMs = 2000) {
  if (!key) return false;
  const now = Date.now();
  if (clientSeenEventKeys.has(key)) {
    const prev = clientSeenEventKeys.get(key);
    if (now - prev < ttlMs) return true;
  }
  clientSeenEventKeys.set(key, now);
  if (clientSeenEventKeys.size > 400) {
    for (const [k, v] of clientSeenEventKeys.entries()) {
      if (now - v > 15000) clientSeenEventKeys.delete(k);
    }
  }
  return false;
}

const recentJoinedViewers = new Map();

const onNewDisciple = (discipleData) => {
  const d = (discipleData && discipleData.disciple) ? discipleData.disciple : discipleData;
  if (!d) return;

  const dedupKey = `join_${d.userId || d.uniqueId || d.nickname || ''}`;
  if (isDuplicateClientEvent(dedupKey, 2000)) return;

  unlockAndStartAudio(); // Guarantee audio context is active for new arrivals!

  const isSyncOnly = Boolean(discipleData?.isSync || d?.isSync);
  const rawKey = String(d.userId || d.uniqueId || d.nickname || '').trim().toLowerCase();
  const isGeneric = (!d.nickname || d.nickname === 'ผู้เจริญสติ' || d.nickname === 'กัลยาณมิตร' || d.nickname === 'ผู้มีจิตศรัทธา');
  const userKey = (rawKey && !rawKey.includes('ผู้เจริญสติ') && !rawKey.includes('กัลยาณมิตร') && !rawKey.includes('ผู้มีจิตศรัทธา'))
    ? rawKey
    : (isGeneric ? '' : d.nickname?.trim().toLowerCase());

  const now = Date.now();

  // 2.5-minute debounce on join events: prevents repeated welcomes if TikTok re-fires member packets
  if (userKey && recentJoinedViewers.has(userKey) && (now - recentJoinedViewers.get(userKey) < 150000)) {
    // If already recorded recently, ensure devotee is seated silently without repeating welcome
    seatRealViewer(d);
    return;
  }

  // New viewer joins: seated peacefully with high-visibility nameplate and welcome spotlight
  const devotee = seatRealViewer(d);
  if (!isSyncOnly) {
    if (devotee) {
      triggerViewerWelcomeHighlight(devotee);
    }
    const cleanSpokenName = d.nickname || d.uniqueId || 'ผู้เจริญสติ';
    const queued = guanYinVoice.speakWelcome(cleanSpokenName, userKey || d.userId || d.uniqueId);
    if (queued && userKey) {
      recentJoinedViewers.set(userKey, now);
      if (recentJoinedViewers.size > 500) {
        const cutoff = now - 10 * 60 * 1000;
        for (const [k, v] of recentJoinedViewers.entries()) {
          if (v < cutoff) recentJoinedViewers.delete(k);
        }
      }
    }
    templeAudio.playWoodblock();
  }
  discipleCountEl.textContent = disciplesMap.size;
};
socket.on('disciple_joined', onNewDisciple);
socket.on('action_join', onNewDisciple);
socket.on('new-disciple', onNewDisciple);
socket.on('new_disciple', onNewDisciple);
socket.on('member', (data) => {
  if (data) {
    onNewDisciple({
      nickname: data.nickname || data.uniqueId,
      userId: data.userId || data.uniqueId,
      uniqueId: data.uniqueId
    });
  }
});
// NOTE: socket.on('roomUser') is strictly reserved for live viewer counts and rankings.
// NEVER route roomUser into onNewDisciple to guarantee top viewers are not repeatedly welcomed!

// Follow Event: Graceful Devotional Bow + Radiant Aura + Banner + Guan Yin Voice
const onFollowEvent = (followData) => {
  const d = (followData && followData.disciple) ? followData.disciple : followData;
  const name = d?.nickname || d?.uniqueId || 'ผู้มีจิตศรัทธา';

  const followKey = `follow_${d?.userId || d?.uniqueId || name}`;
  if (isDuplicateClientEvent(followKey, 4000)) return;
  unlockAndStartAudio();

  triggerFollowerBanner(name);

  // Ensure real viewer is prominently seated
  let devotee = seatRealViewer(d || { nickname: name });

  if (devotee) {
    devotee.triggerBow();
    triggerCharacterGoldenAura(devotee.root);
    if (devotee.auraSprite) {
      devotee.auraSprite.material.opacity = 0.95;
      setTimeout(() => {
        let f = setInterval(() => {
          if (!devotee.auraSprite) return clearInterval(f);
          devotee.auraSprite.material.opacity -= 0.05;
          if (devotee.auraSprite.material.opacity <= 0) {
            devotee.auraSprite.material.opacity = 0;
            clearInterval(f);
          }
        }, 50);
      }, 2500);
    }
    guanYinVoice.speakFollowBlessing(name);
  }

  templeAudio.playLotusChime();
  showToast('พรอภิวาทน์มงคล ✨', `${name} กดติดตาม ได้รับพรอภิวาทน์`);
};
socket.on('action_follow', onFollowEvent);
socket.on('follow', onFollowEvent);

// =====================================================================
// UNIFIED DIVINE BRIDGE SHARE SYSTEM (ระบบสะพานบุญรวมใจ)
// Approaches 1, 2, and 3 integrated seamlessly:
// 1. +5 Merit Points directly into active round game gauge per share
// 2. VIP Front-Row Golden Mat elevation (Seats 0..4) with 🕊️ สะพานบุญ title & spinning golden halo
// 3. Personalized AI Host Voice Blessing calling sharer's name (Rule 10: 8-10 words, ~1.5s, ends with "นะคะ")
// 4. Sanctuary-Wide Milestone Celebration every 20 total community shares
// =====================================================================
let shareToastHideTimer = null;
let rawStoredShares = parseInt(localStorage.getItem('buddha_total_shares') || '0', 10);
let totalCommunityShares = (isNaN(rawStoredShares) || rawStoredShares < 0) ? 0 : rawStoredShares;

function updateShareCounterUI(count) {
  const safeCount = (isNaN(count) || count < 0) ? 0 : count;
  const el = document.getElementById('share-count-val');
  if (el) el.textContent = String(safeCount);
}

function showShareToast(sharerName = 'ผู้มีจิตศรัทธา', avatar = '') {
  // P2 Priority: Do not clobber higher-priority Gift (P1) announcement banner
  if (typeof isBottomEffectBannerActive === 'function' && isBottomEffectBannerActive()) {
    return;
  }

  // Dismiss P3 Follower banner immediately
  if (typeof hideBottomFollowerBanner === 'function') {
    hideBottomFollowerBanner(true);
  }

  const banner = document.getElementById('share-toast-banner');
  if (!banner) return;
  const nameEl = document.getElementById('share-toast-name');
  const cleanName = sanitizeDisplayName(sharerName, 'ผู้มีจิตศรัทธา');
  if (nameEl) nameEl.textContent = cleanName;

  if (shareToastHideTimer) {
    clearTimeout(shareToastHideTimer);
    shareToastHideTimer = null;
  }

  _activeBottomBanner = 'share';
  banner.style.display = 'flex';
  banner.classList.remove('hidden');
  banner.classList.remove('active');
  void banner.offsetWidth; // re-flow
  banner.classList.add('active');

  try {
    if (typeof templeAudio !== 'undefined') {
      if (templeAudio.playLotusChime) templeAudio.playLotusChime();
      if (templeAudio.playWoodblock) templeAudio.playWoodblock();
    }
  } catch (_) { }

  shareToastHideTimer = setTimeout(() => {
    banner.classList.remove('active');
    banner.classList.add('hidden');
    setTimeout(() => {
      if (banner.classList.contains('hidden')) {
        banner.style.display = 'none';
      }
      if (_activeBottomBanner === 'share') _activeBottomBanner = null;
    }, 400);
  }, 4500);
}

function promoteSharerToVIP(user) {
  const rawName = user.nickname || user.uniqueId || 'ผู้มีจิตศรัทธา';
  let devotee = seatRealViewer(user);
  if (!devotee) return null;

  // Elevate to Front-Row Golden Mats (Seats 0..4)
  const curSeat = (devotee.userData && devotee.userData.seatId !== undefined) ? devotee.userData.seatId : null;
  let targetVipSeat = (curSeat !== null && curSeat < 5) ? curSeat : null;

  if (targetVipSeat === null) {
    for (let s = 0; s < 5; s++) {
      const occ = disciplesMap.get(s);
      if (!occ || occ.userData?.isInitial || occ === devotee) {
        targetVipSeat = s;
        break;
      }
    }
    if (targetVipSeat === null) targetVipSeat = 0;
  }

  if (curSeat !== targetVipSeat && typeof devotee.moveToNewSeat === 'function') {
    const otherDevotee = disciplesMap.get(targetVipSeat);
    if (otherDevotee && otherDevotee !== devotee && curSeat !== null) {
      disciplesMap.set(curSeat, otherDevotee);
      disciplesMap.set(targetVipSeat, devotee);
      otherDevotee.moveToNewSeat(curSeat);
      devotee.moveToNewSeat(targetVipSeat);
    } else {
      if (curSeat !== null) disciplesMap.delete(curSeat);
      disciplesMap.set(targetVipSeat, devotee);
      devotee.moveToNewSeat(targetVipSeat);
    }
  }

  // Attach Divine Bridge Title to Nameplate
  devotee.userData.isSharer = true;
  const cleanShortName = (rawName || 'ผู้มีจิตศรัทธา').slice(0, 18);
  const sharerTitle = `🕊️ สะพานบุญ ${cleanShortName}`;

  if (devotee.nameplate) {
    safeDisposeSprite(devotee.nameplate);
    if (devotee.nameplate.parent) devotee.root.remove(devotee.nameplate);
    devotee.nameplate = null;
  }
  devotee.nameplate = createNameplateSprite(sharerTitle, true, devotee.root.position.z, false, devotee.userData?.avatar);
  devotee.nameplate.position.y = (devotee.baseH || 0.45) + 0.04;
  devotee.root.add(devotee.nameplate);

  // Trigger Golden Aura & Devotional Bow
  try {
    if (typeof triggerCharacterGoldenAura === 'function') {
      triggerCharacterGoldenAura(devotee.root);
    }
    if (devotee.auraSprite) {
      devotee.auraSprite.material.opacity = 0.95;
      setTimeout(() => {
        let f = setInterval(() => {
          if (!devotee.auraSprite) return clearInterval(f);
          devotee.auraSprite.material.opacity -= 0.05;
          if (devotee.auraSprite.material.opacity <= 0) {
            devotee.auraSprite.material.opacity = 0;
            clearInterval(f);
          }
        }, 50);
      }, 3000);
    }
    if (typeof devotee.triggerBow === 'function') {
      devotee.triggerBow();
    }
  } catch (_) { }

  return devotee;
}

const onShareEvent = (data) => {
  if (!data) return;
  const user = data.nickname || data.uniqueId || 'ผู้มีจิตศรัทธา';
  const shareKey = `share_${data.userId || data.uniqueId || user}`;
  if (isDuplicateClientEvent(shareKey, 1500)) return;

  unlockAndStartAudio();

  // 1. Approach 1: Merit Points into active round gauge (ปิดการบวกแต้มรอบจากแชร์อัตโนมัติ เพื่อให้แต้มรอบขึ้นจากการพิมพ์ "สาธุ" เท่านั้น)
  if (window.roundManager && window.ENABLE_SHARE_MERIT_POINTS) {
    window.roundManager.addMerit({
      uniqueId: data.uniqueId,
      nickname: user,
      avatar: data.avatar
    }, data.meritDelta || 5, 'เปิดสะพานบุญ 🕊️');
  }

  // 2. Cumulative Share Counter increment & UI sync
  if (isNaN(totalCommunityShares) || totalCommunityShares < 0) totalCommunityShares = 0;
  totalCommunityShares++;
  try {
    localStorage.setItem('buddha_total_shares', String(totalCommunityShares));
  } catch (_) { }
  updateShareCounterUI(totalCommunityShares);

  // 3. Show radiant Divine Bridge Toast Notification
  showShareToast(user, data.avatar);

  // 4. Approach 2: Promote sharer avatar to front-row VIP Golden Mats (Seats 0..4) with 🕊️ สะพานบุญ title & spinning golden halo
  promoteSharerToVIP(data);

  // 5. Approach 3: Instant personalized AI Host voice blessing calling their name
  // Follows Rule 10: Maternal brisk cadence, 8-10 words, ~1.5s, ends with "นะคะ"
  if (guanYinVoice && guanYinVoice.enabled) {
    const cleanSpokenName = guanYinVoice.cleanViewerName(user, 'ผู้มีจิตศรัทธา');
    const shareBlessingText = `อนุโมทนาคุณ ${cleanSpokenName} ร่วมเปิดสะพานบุญแชร์ไลฟ์นี้นะคะ ขอให้มีโชคใหญ่นะคะ`;
    guanYinVoice.speak(shareBlessingText, 2);
  }

  // 6. Community Milestone Celebration: Every 20 total shares triggers sanctuary-wide golden rain & temple bell chimes
  if (totalCommunityShares > 0 && totalCommunityShares % 20 === 0) {
    setTimeout(() => {
      try {
        if (typeof triggerGoldenBellEffect === 'function') triggerGoldenBellEffect();
        if (typeof triggerLotusRainEffect === 'function') triggerLotusRainEffect();
        if (typeof templeAudio !== 'undefined' && templeAudio.playBell) templeAudio.playBell(1027, 4.0);
        if (guanYinVoice && guanYinVoice.enabled) {
          guanYinVoice.speak(`สาธุบารมี รวมพลังเปิดสะพานบุญครบ ${totalCommunityShares} ครั้ง พระแม่ประทานพรใหญ่รอบวิหารนะคะ`, 1);
        }
      } catch (_) { }
    }, 2800);
  }
};

window.onShareEvent = onShareEvent;
socket.on('action_share', onShareEvent);
socket.on('share', onShareEvent);
socket.on('round_action_share', onShareEvent);
updateShareCounterUI(totalCommunityShares);

socket.on('disciple_left', (data) => {
  if (data && data.seatId !== undefined && disciplesMap.has(data.seatId)) {
    const d = disciplesMap.get(data.seatId);
    // CRITICAL: If devotee is currently walking or performing an altar ritual, defer removal until they return
    if (d === activeStageActor || d.isPerformingAltarRitual || d.isWalking) {
      d._pendingEvict = true;
      return;
    }
    if (d._fadeTimer) clearInterval(d._fadeTimer);
    let op = 1.0;
    d._fadeTimer = setInterval(() => {
      op -= 0.08;
      if (d.charSprite && d.charSprite.material) d.charSprite.material.opacity = Math.max(0, op);
      if (d.shadowSprite && d.shadowSprite.material) d.shadowSprite.material.opacity = Math.max(0, op * 0.5);
      if (d.nameplate && d.nameplate.material) d.nameplate.material.opacity = Math.max(0, op);
      if (op <= 0) {
        clearInterval(d._fadeTimer);
        d._fadeTimer = null;
        cleanAllBubblesFromDisciple(d);
        if (d.stopAllMovement) d.stopAllMovement();
        if (d.root && d.root.parent) disciplesGroup.remove(d.root);
        if (disciplesMap.get(data.seatId) === d) {
          disciplesMap.delete(data.seatId);
        }
        discipleCountEl.textContent = disciplesMap.size;
      }
    }, 30);
  }
});

socket.on('disciple_swapped', (data) => {
  if (!data) return;
  const dA = disciplesMap.get(data.seatA);
  const dB = disciplesMap.get(data.seatB);
  if (dA && dB) {
    disciplesMap.set(data.seatA, dB);
    disciplesMap.set(data.seatB, dA);
    if (dA.moveToNewSeat) dA.moveToNewSeat(data.seatB);
    if (dB.moveToNewSeat) dB.moveToNewSeat(data.seatA);
  } else if (dA) {
    disciplesMap.delete(data.seatA);
    disciplesMap.set(data.seatB, dA);
    if (dA.moveToNewSeat) dA.moveToNewSeat(data.seatB);
  } else if (dB) {
    disciplesMap.delete(data.seatB);
    disciplesMap.set(data.seatA, dB);
    if (dB.moveToNewSeat) dB.moveToNewSeat(data.seatA);
  }
});

const userLastGreetingAt = new Map();

const onChatMessage = (chat) => {
  if (!chat) return;
  const user = chat.nickname || chat.uniqueId || 'ผู้เจริญสติ';
  const text = chat.comment || chat.message || '';

  const chatKey = `chat_${chat.userId || chat.uniqueId || user}_${text}`;
  if (isDuplicateClientEvent(chatKey, 1500)) return;
  unlockAndStartAudio();
  appendChatMessage(user, text);
  if (text && text.trim()) {
    pushRecentWishClient(user, text.trim());
  }

  // +1 Sadhu point when comment contains "สาธุ" or Buddhist blessings
  const hasSadhu = /(สาธุ|สาทุ|สาดุ|sadhu|sathu|อนุโมทนา|โมทนา)/i.test(text);
  if (hasSadhu) {
    recordClientSadhu(user, chat.avatar);
    try { templeAudio.playWoodblock(); } catch (_) { }
  }

  // Guarantee real viewer is seated in the scene with prominent nameplate
  const devotee = seatRealViewer({
    nickname: user,
    uniqueId: chat.uniqueId,
    avatar: chat.avatar,
    seatId: chat.seatId
  });

  const targetSeat = (chat.seatId !== undefined && disciplesMap.has(chat.seatId))
    ? chat.seatId
    : ((devotee && devotee.userData && devotee.userData.seatId !== undefined) ? devotee.userData.seatId : null);

  if (devotee) {
    showDiscipleComment(devotee, text, true);
  } else if (targetSeat !== null) {
    showDiscipleComment(targetSeat, text, true);
  } else if (disciplesMap.size > 0) {
    let matchedSeat = null;
    disciplesMap.forEach((d, sId) => {
      if (d.userData && (d.userData.uniqueId === chat.uniqueId || d.userData.nickname === chat.nickname)) {
        matchedSeat = sId;
      }
    });
    if (matchedSeat !== null) {
      showDiscipleComment(matchedSeat, text, true);
    } else {
      const seats = Array.from(disciplesMap.keys());
      const randomSeat = seats[Math.floor(Math.random() * seats.length)];
      showDiscipleComment(randomSeat, text, true);
    }
  }

  // Trigger AI Divine Voice to greet chatter by name, or acknowledge Sadhu, or bless prayer
  if (guanYinVoice && text && text.trim()) {
    const isGreetingChat = /(สวัสดี|หวัดดี|กราบ|นมัสการ|ทักทาย|hello|hi|ดีครับ|ดีค่ะ)/i.test(text);
    const userKey = String(user).toLowerCase().trim();
    const now = Date.now();
    const lastUserGreet = userLastGreetingAt.get(userKey) || 0;

    if (isGreetingChat && (now - lastUserGreet > 45000)) {
      userLastGreetingAt.set(userKey, now);
      guanYinVoice.speakGreeting(user, text.trim());
    } else if (hasSadhu) {
      guanYinVoice.speakSadhuBlessing(user);
    } else {
      guanYinVoice.speakChatBlessing(user, text.trim());
    }
  }

  // Note: Round merit points are credited authoritatively via socket event 'round_action_chat' below
};
socket.on('action_chat', onChatMessage);
socket.on('chat-message', onChatMessage);
socket.on('chat_message', onChatMessage);
socket.on('chat', onChatMessage);

socket.on('round_action_chat', (data) => {
  if (!data) return;
  if (window.roundManager) {
    window.roundManager.addMerit(data, data.meritDelta || 1, data.comment);
  }
});

socket.on('round_action_like', (data) => {
  if (!data) return;
  if (window.roundManager) {
    window.roundManager.addMerit(data, 0.2, 'like');
  }
});

socket.on('round_state_sync', (data) => {
  if (!data) return;
  if (window.roundManager && data.roundNum) {
    window.roundManager.syncFromRemote(data);
  }
});

const onGiftEvent = (gift) => {
  if (!gift) return;
  const coins = gift.totalDiamonds || gift.diamondCount || gift.repeatCount || gift.coins || 1;
  const giftCount = gift.repeatCount || (gift.isStreakable ? 1 : 1);
  const donor = gift.nickname || gift.uniqueId || 'ผู้มีจิตศรัทธา';
  const giftName = gift.giftName || (coins >= 30 ? 'บุปผามงคล' : (coins >= 10 ? 'ดอกบัวทิพย์' : (coins >= 5 ? 'ประทีปธูปหอม' : 'ดอกกุหลาบ')));

  // Credit round merit boost from live gifts
  if (window.roundManager) {
    window.roundManager.addMerit({
      uniqueId: gift.uniqueId,
      userId: gift.userId,
      nickname: donor,
      avatar: gift.avatar
    }, gift.meritDelta || Math.max(10, Math.floor(coins * 10)), giftName);
  }

  const streakTag = gift.isStreakable ? `_s${giftCount}_c${coins}` : `_c${coins}`;
  const giftKey = `gift_${gift.userId || gift.uniqueId || donor}_${giftName}${streakTag}`;
  if (isDuplicateClientEvent(giftKey, 800)) return;
  unlockAndStartAudio();
  const giftIcon = gift.giftIcon || (coins >= 30 ? '🌸' : (coins >= 10 ? '🪷' : (coins >= 5 ? '🪔' : '🌹')));

  // Derive effectType & canonical effectName FIRST so AI voice and banner have the exact ritual effect
  const lowerGiftName = String(giftName || '').toLowerCase();
  const isSeamSiGift = gift.effectType === 'seamsi' ||
    lowerGiftName.includes('รักนะมากๆ') ||
    lowerGiftName.includes('รักนะมาก ๆ') ||
    lowerGiftName.includes('รักนะ') ||
    lowerGiftName.includes('กอดหัวใจ') ||
    lowerGiftName.includes('love you') ||
    lowerGiftName.includes('heart hug') ||
    lowerGiftName.includes('hug heart') ||
    lowerGiftName.includes('hug') ||
    lowerGiftName.includes('เซียมซี') ||
    lowerGiftName.includes('ซองเขียว') ||
    lowerGiftName.includes('ซองมงคล') ||
    lowerGiftName.includes('hari raya') ||
    lowerGiftName.includes('selamat') ||
    lowerGiftName.includes('aidilfitri') ||
    lowerGiftName.includes('sampul') ||
    lowerGiftName.includes('envelope') ||
    lowerGiftName.includes('seamsi') ||
    lowerGiftName.includes('siamsi');

  const eff = isSeamSiGift ? 'seamsi' : (gift.effectType || (
    coins >= 299 ? 'dragon' :
      coins >= 100 ? 'castle' :
        coins >= 99 ? 'fireworks' :
          coins >= 30 ? 'royal_carriage' :
            coins >= 20 ? 'crystal_fountain' :
              coins >= 15 ? 'golden_bell' :
                coins >= 10 ? 'flowers' :
                  coins >= 9 ? 'lotus' :
                    coins >= 5 ? 'incense' : 'kowtow'
  ));
  const effectName = gift.effectName || getGiftEffectName(eff, giftName, coins);
  const giftImage = gift.giftImage || gift.image || getGiftImageUrl(giftName, coins, eff);
  const isStreakCombo = Boolean(gift.isStreakable && Number(gift.repeatCount) > 1);
  const seamsiFortune = (eff === 'seamsi') ? (gift.seamsiFortune || drawSeamSiFortune()) : null;

  const giftInfo = {
    icon: eff === 'seamsi' ? '🎋' : giftIcon,
    name: giftName,
    effectType: eff,
    effectName,
    image: giftImage,
    coins,
    count: giftCount,
    isStreakCombo,
    seamsiFortune,
    uniqueId: gift.uniqueId,
    avatar: gift.avatar
  };

  if (seamsiFortune && typeof pushRecentWishClient === 'function') {
    pushRecentWishClient(
      donor,
      `🎋 เสี่ยงเซียมซีมหาโชค: รับคำทำนายมงคล ✨`
    );
  }

  // 1. Instantly trigger the beautiful royal announcement banner
  triggerGiftAnnouncementBanner(donor, giftInfo);

  // Purge any in-flight or pending welcome messages for this donor so gift blessing plays strictly by itself!
  const donorClean = guanYinVoice.cleanViewerName(donor, 'ผู้มีจิตศรัทธา');
  const donorKey = String(gift.userId || gift.uniqueId || donor || '').trim().toLowerCase();
  guanYinVoice.cancelWelcomeForUser(donor, donorKey);
  if (donorKey) {
    guanYinVoice.welcomedUsers.set(donorKey, Date.now());
    recentJoinedViewers.set(donorKey, Date.now());
  }
  if (donorClean) {
    guanYinVoice.welcomedUsers.set(donorClean.toLowerCase(), Date.now());
    recentJoinedViewers.set(donorClean.toLowerCase(), Date.now());
  }

  // 2. Instantly queue AI divine voice to speak viewer name + effectName (never raw gift name)
  guanYinVoice.speakGiftBlessing(donor, giftInfo, gift.wish);

  // 3. Guarantee real donor is seated prominently
  seatRealViewer({
    nickname: donor,
    uniqueId: gift.uniqueId,
    avatar: gift.avatar,
    seatId: gift.seatId
  });

  // 4. Instant real-time update of tribute queue on client HUD
  pushTributeQueueClient({
    nickname: donor,
    uniqueId: gift.uniqueId,
    avatar: gift.avatar,
    giftIcon: giftInfo.icon,
    giftName: giftName,
    giftImage: giftImage,
    comboCount: giftCount,
    diamondCount: coins,
    isStreakCombo
  });

  // 1. Lower left floating live gift toast disabled (relying on native TikTok alerts)
  // triggerLiveGiftFloat(donor, giftIcon, giftName, giftCount);

  // 2. Walker on red carpet aisle with floating speech bubble & gift badge (10 authentic tiers + Seam-Si)
  if (eff === 'dragon') {
    performStageAction('dragon', donor, gift.wish, { ...giftInfo, isLegend: true });
  } else if (eff === 'castle') {
    performStageAction('castle', donor, gift.wish, { ...giftInfo, isLegend: true });
  } else if (eff === 'fireworks') {
    performStageAction('fireworks', donor, gift.wish, { ...giftInfo, isLegend: true });
  } else if (eff === 'royal_carriage') {
    performStageAction('royal_carriage', donor, gift.wish, giftInfo);
  } else if (eff === 'crystal_fountain') {
    performStageAction('crystal_fountain', donor, gift.wish, giftInfo);
  } else if (eff === 'golden_bell') {
    performStageAction('golden_bell', donor, gift.wish, giftInfo);
  } else if (eff === 'flowers' || eff === 'lotus_rain') {
    performStageAction('flowers', donor, gift.wish, giftInfo);
  } else if (eff === 'lotus' || eff === 'lotus_bloom') {
    performStageAction('lotus', donor, gift.wish, giftInfo);
  } else if (eff === 'incense') {
    performStageAction('incense', donor, gift.wish, giftInfo);
  } else if (eff === 'seamsi') {
    const seamWish = seamsiFortune ? `🎋 เสี่ยงเซียมซีมหาโชค • รับคำทำนายมงคล` : gift.wish;
    performStageAction('seamsi', donor, seamWish, giftInfo);
  } else {
    performStageAction('kowtow', donor, gift.wish, giftInfo);
  }
};
window.onGiftEvent = onGiftEvent;
socket.on('action_gift', onGiftEvent);
socket.on('gift-event', onGiftEvent);
socket.on('gift_event', onGiftEvent);
socket.on('gift', onGiftEvent);

// Click-to-Test / Preview on all 11 items in the Bottom Offering Deck
const bottomOfferingSpecs = [
  { name: 'กุหลาบ', icon: '🌹', coins: 1, type: 'kowtow', effectName: 'กราบเบญจางคประดิษฐ์' },
  { name: 'รักนะมากๆ', icon: '🎋', coins: 1, type: 'seamsi', effectName: 'เสี่ยงเซียมซีมหาโชค' },
  { name: 'เครื่องราง', icon: '🫰', coins: 5, type: 'incense', effectName: 'จุดประทีปบูชาธูปทอง' },
  { name: 'Lucky 9', icon: '9️⃣', coins: 9, type: 'lotus', effectName: 'สระดอกบัวทิพย์' },
  { name: 'กุหลาบ ๙๙', icon: '🌹', coins: 10, type: 'flowers', effectName: 'โปรยบุปผามงคล' },
  { name: 'พวงมาลัย', icon: '📿', coins: 15, type: 'golden_bell', effectName: 'สั่นระฆังทอง' },
  { name: 'โคโลญจน์', icon: '🎁', coins: 20, type: 'crystal_fountain', effectName: 'ธารน้ำพุมณี' },
  { name: 'โดนัท', icon: '🍩', coins: 30, type: 'royal_carriage', effectName: 'ขบวนราชรถ' },
  { name: 'หัวใจ 4 ดวง', icon: '🕊️', coins: 99, type: 'fireworks', effectName: 'พลุเพลิงบุญ' },
  { name: 'ประตูมิติ', icon: '🧨', coins: 100, type: 'castle', effectName: 'เปิดวิมานทิพย์' },
  { name: 'มังกรแฟนตาซี', icon: '🐉', coins: 299, type: 'dragon', effectName: 'มังกรทองเหิน' }
];

document.querySelectorAll('.bottom-gift-deck .bgc-card, .gift-guide-list .guide-item').forEach((itemEl) => {
  itemEl.style.cursor = 'pointer';
  itemEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const rawIdx = itemEl.getAttribute('data-index');
    const idx = (rawIdx !== null && rawIdx !== undefined && rawIdx !== '') ? parseInt(rawIdx, 10) : 0;
    const spec = (!isNaN(idx) && bottomOfferingSpecs[idx]) ? bottomOfferingSpecs[idx] : bottomOfferingSpecs[0];
    onGiftEvent({
      nickname: 'ผู้มีจิตศรัทธา',
      uniqueId: `deck_test_${spec.type}_${Date.now() % 1000}`,
      giftName: spec.name,
      giftIcon: spec.icon,
      effectType: spec.type,
      effectName: spec.effectName,
      totalDiamonds: spec.coins,
      diamondCount: spec.coins,
      repeatCount: 1
    });
  });
});

const onLeaderboard = (list) => {
  updateLeaderboard(list);
  updateMeritBoard(list);

  // Synchronize TOP 5 donors into Front Golden Mats (Seats 0..4)
  if (Array.isArray(list)) {
    list.slice(0, 5).forEach((donor, idx) => {
      const targetSeat = idx;
      let devotee = null;
      let devoteeSeatId = null;
      disciplesMap.forEach((d, sId) => {
        if (d.userData && (d.userData.uniqueId === donor.uniqueId || d.userData.nickname === donor.nickname)) {
          devotee = d;
          devoteeSeatId = sId;
        }
      });
      const oldSeat = (devotee && devotee.userData && devotee.userData.seatId !== undefined) ? devotee.userData.seatId : devoteeSeatId;
      if (devotee && oldSeat !== targetSeat && oldSeat !== null && oldSeat !== undefined) {
        if (devotee === activeStageActor || devotee.isPerformingAltarRitual) {
          // Devotee is currently on stage walking or performing altar ritual;
          // safely update target return seat so they return to this VIP golden mat upon completion
          devotee.finalPos = getCarpetPosition(targetSeat);
          if (devotee.userData) devotee.userData.seatId = targetSeat;
          return;
        }
        const currentOccupant = disciplesMap.get(targetSeat);
        if (currentOccupant && (currentOccupant === activeStageActor || currentOccupant.isPerformingAltarRitual)) {
          // Do not disturb occupant while they are on stage
          return;
        }
        if (currentOccupant && currentOccupant !== devotee) {
          disciplesMap.set(oldSeat, currentOccupant);
          disciplesMap.set(targetSeat, devotee);
          currentOccupant.userData = { ...currentOccupant.userData, seatId: oldSeat };
          devotee.userData = { ...devotee.userData, seatId: targetSeat };
          if (currentOccupant.moveToNewSeat) currentOccupant.moveToNewSeat(oldSeat);
        } else {
          disciplesMap.delete(oldSeat);
          disciplesMap.set(targetSeat, devotee);
          devotee.userData = { ...devotee.userData, seatId: targetSeat };
        }
        if (devotee.moveToNewSeat) devotee.moveToNewSeat(targetSeat);
      }
    });
  }
};
socket.on('leaderboard-update', onLeaderboard);
socket.on('leaderboard_update', onLeaderboard);

// Socket listener for TOP 5 Sadhu points (+1 on "สาธุ")
socket.on('sadhu_update', (data) => {
  if (!data) return;
  const list = Array.isArray(data) ? data : (data.topSadhu || []);
  const latest = data.latest || null;
  clientSadhuScores = Array.isArray(list) ? list : [];
  updateSadhuBoard(clientSadhuScores, latest?.nickname);
  if (latest && latest.nickname) {
    updateSadhuTicker(latest.nickname, latest.count);
  }
});

// Socket Listeners for Queue & Prayer Categories
socket.on('queue_update', (data) => {
  if (!data) return;
  const serverQueue = data.tributeQueue || (Array.isArray(data) ? data : null);
  // Do not clobber active client stage queue while characters are actively walking/performing rituals
  if (serverQueue && !isStageActionRunning && stageActionQueue.length === 0) {
    updateTributeQueue(serverQueue);
  }
  if (data.prayerCategories) updatePrayerCategories(data.prayerCategories);
});

socket.on('prayer_update', (data) => {
  if (!data) return;
  if (data.recentWishes) updateRecentWishes(data.recentWishes);
  if (data.prayerCategories || data.categories) updatePrayerCategories(data.prayerCategories || data.categories);
});

// Fetch Initial State from /api/status on page boot
fetch('/api/status')
  .then(res => res.json())
  .then(st => {
    const d = st.data || st;
    if (d.tributeQueue) updateTributeQueue(d.tributeQueue);
    if (d.recentWishes) updateRecentWishes(d.recentWishes);
    if (d.prayerCategories) updatePrayerCategories(d.prayerCategories);
    if (d.leaderboard || d.topDonors) updateMeritBoard(d.leaderboard || d.topDonors);
    if (d.topSadhu) {
      clientSadhuScores = d.topSadhu;
      updateSadhuBoard(d.topSadhu);
    }
  })
  .catch(() => { });

// ---------------------------------------------------------------------
// 7. Render Animation Loop (Three.js WebGL Engine)
// ---------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  // Cap delta at 50ms (20fps minimum) to prevent animation/physics spikes during encoder load
  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();



  disciplesMap.forEach((d, sId) => {
    if (!d.charSprite) return;



    // Shadow breathing scale
    if (d.shadowSprite && !d.isWalking) {
      const breathScale = 1.0 + Math.sin(time * d.breathSpeed + d.breathPhase) * 0.022;
      d.shadowSprite.scale.set(d.baseW * 1.30 * breathScale, 0.22 * CHIBI_SCALE, 1);
    }

    // Personal aura gentle pulse
    if (d.auraSprite) {
      d.auraSprite.material.opacity = 0.18 + Math.sin(time * 1.1 + d.breathPhase) * 0.06;
    }

    // Event aura burst fade-out
    if (d.eventAuraSprite && d.eventAuraSprite.material.opacity > 0) {
      d.eventAuraSprite.material.opacity = Math.max(0, d.eventAuraSprite.material.opacity - 0.007);
      const s = d.eventAuraSprite.scale;
      d.eventAuraSprite.scale.set(s.x + 0.006, s.y + 0.006, 1);
    }

    if (d.isBowing && !d.isWalking && !d._poseTimer) {
      // Realistic Respectful Forward Bow (ค้อมศีรษะและลำตัวน้อมไหว้ มีจังหวะค้างทำความเคารพอย่างสมจริง)
      d.bowProgress = (d.bowProgress || 0) + delta * 0.95; // ~1.05s natural human bow cycle
      const bp = Math.min(d.bowProgress, 1.0);

      // Three-phase bow curve: smooth incline (0..0.40) -> reverent hold at nadir (0.40..0.62) -> smooth rise (0.62..1.0)
      let bowCurve = 0;
      if (bp < 0.40) {
        const u = bp / 0.40;
        bowCurve = u * u * (3 - 2 * u);
      } else if (bp < 0.62) {
        bowCurve = 1.0;
      } else {
        const u = (bp - 0.62) / 0.38;
        bowCurve = 1.0 - u * u * (3 - 2 * u);
      }

      d.charSprite.scale.y = d.baseH * (1.0 - bowCurve * 0.13);
      d.charSprite.scale.x = d.baseW * (1.0 + bowCurve * 0.045);
      d.charSprite.position.y = 0.05 - bowCurve * 0.007;
      d.charSprite.material.rotation = 0;

      if (bp >= 1.0) {
        d.isBowing = false;
        d.bowProgress = 0;
        d.charSprite.scale.set(d.baseW, d.baseH, 1);
        d.charSprite.position.y = 0.05;
        d.charSprite.material.rotation = 0;
      }
    } else if (!d.isWalking && !d._poseTimer) {
      // Dynamic Living Devotee Movement: Natural diaphragmatic breathing, posture micro-shifts & reverent bows
      const ph = time * d.breathSpeed + d.breathPhase;
      const breath = Math.sin(ph) + 0.18 * Math.sin(ph * 2.0);
      d.charSprite.position.y = 0.05;

      // Unique non-repeating micro-sway and organic posture shifts (defeats TikTok static classifiers)
      if (!d._livingInit) {
        d._livingInit = true;
        d._livingSwaySpeed = 0.55 + Math.random() * 0.45;
        d._livingSwayAmp = 0.007 + Math.random() * 0.006;
        d._nextMicroShift = time + 2.5 + Math.random() * 5.0;
        d._shiftOffset = 0;
      }

      if (time >= d._nextMicroShift) {
        d._shiftOffset = (Math.random() - 0.5) * 0.009;
        d._nextMicroShift = time + 3.5 + Math.random() * 5.5;
      }

      if (d.finalPos && d.finalPos.standing) {
        // Standing: Organic breathing + lively posture adjustments & weight shift
        const standBreath = breath * 0.016;
        const microSway = Math.sin(time * d._livingSwaySpeed + d.breathPhase) * d._livingSwayAmp + d._shiftOffset;
        d.charSprite.material.rotation = microSway;
        d.charSprite.scale.set(d.baseW * (1.0 + standBreath * 0.35), d.baseH * (1.0 + standBreath), 1);
      } else {
        // Kneeling on Lotus Mat: Gentle chest expansion + delicate spontaneous praying hands tilt
        const kneelBreath = breath * 0.018;
        const microTilt = Math.sin(time * d._livingSwaySpeed + d.breathPhase) * d._livingSwayAmp + d._shiftOffset;
        d.charSprite.material.rotation = microTilt;
        d.charSprite.scale.set(d.baseW * (1.0 + kneelBreath * 0.40), d.baseH * (1.0 + kneelBreath), 1);
      }

      // Spontaneous natural bowing across congregation (Every 9-22s for continuous scene vitality)
      if (d.nextBowTime && time >= d.nextBowTime) {
        d.triggerBow();
        d.nextBowTime = time + 9 + Math.random() * 14;
      }
    }

    // ── Floating Gift Badge Serene Levitation, Breathing Scale & Golden Sparks ──
    if (d.giftBadgeSprite && d.giftBadgeSprite.visible) {
      const bPhase = d._badgePhase || (d._badgePhase = sId * 0.73);
      const floatHover = Math.sin(time * 3.2 + bPhase) * 0.015;
      const floatTilt = Math.sin(time * 2.2 + bPhase) * 0.016;
      d.giftBadgeSprite.material.rotation = floatTilt;

      const baseW = d.giftBadgeSprite.userData?.baseW || 0.70;
      const baseH = d.giftBadgeSprite.userData?.baseH || 0.195;
      const breathe = 1.0 + Math.sin(time * 3.6 + bPhase) * 0.020;
      const punch = d.giftBadgeSprite.userData?.punchScale || 1.0;
      if (d.giftBadgeSprite.userData && d.giftBadgeSprite.userData.punchScale > 1.0) {
        d.giftBadgeSprite.userData.punchScale = Math.max(1.0, d.giftBadgeSprite.userData.punchScale - delta * 1.8);
      }

      if (!d.giftBadgeSprite.userData?.isPopping) {
        d.giftBadgeSprite.scale.set(baseW * breathe * punch, baseH * breathe * punch, 1);
      }

      // Elevate gracefully above the nameplate whether walking or kneeling
      const plateY = d.nameplate ? d.nameplate.position.y : (d.baseH || 0.45);
      d.giftBadgeSprite.position.y = plateY + 0.22 + floatHover;

      // Celestial golden stardust trail (1-2 soft sparks every ~0.35s)
      if (!d._lastBadgeSpark || time - d._lastBadgeSpark > 0.35) {
        d._lastBadgeSpark = time;
        if (typeof spawnBlessingSparks === 'function' && d.root) {
          spawnBlessingSparks(
            d.root.position.x + (Math.random() - 0.5) * 0.32,
            d.root.position.y + plateY + 0.28,
            d.root.position.z,
            2,
            0xffea70
          );
        }
      }
    }
  });

  // Animate Subtle Shimmering Golden Mat Rings for TOP 5
  if (typeof goldenMatMeshes !== 'undefined') {
    for (let i = 0; i < goldenMatMeshes.length; i++) {
      const g = goldenMatMeshes[i];
      if (g && g.userData && g.userData.ringMesh && g.userData.ringMesh.material) {
        g.userData.ringMesh.material.opacity = 0.35 + Math.sin(time * 2.8 + i * 1.2) * 0.18;
      }
    }
  }

  // Smooth Divine Light Pulse Decay
  if (carpetLight.intensity > 3.0) {
    carpetLight.intensity = THREE.MathUtils.lerp(carpetLight.intensity, 3.0, 0.03);
  }
  if (altarGlow.intensity > 2.5) {
    altarGlow.intensity = THREE.MathUtils.lerp(altarGlow.intensity, 2.5, 0.03);
  }

  // Animate Subtle Altar Ambient Candlelight & Jade Radiance
  if (altarSoftLight) {
    altarSoftLight.intensity = 1.8 + Math.sin(time * 1.8) * 0.25;
  }
  if (typeof jadeWillowLight !== 'undefined' && jadeWillowLight) {
    jadeWillowLight.intensity = 0.85 + Math.sin(time * 2.2) * 0.15;
  }

  // Animate Guan Yin Sacred Mandorla Halo
  if (typeof mandorlaGroup !== 'undefined' && mandorlaGroup) {
    mandorlaOuter.rotation.z += 0.0022;
    mandorlaInner.rotation.z -= 0.0036;

    const breathe = Math.sin(time * 1.5) * 0.035;
    const burstScale = 1.0 + guanYinBurstIntensity * 0.16;
    mandorlaOuter.scale.set(burstScale + breathe, burstScale + breathe, 1);
    mandorlaInner.scale.set(burstScale - breathe * 0.6, burstScale - breathe * 0.6, 1);

    const burstOp = guanYinBurstIntensity * 0.35;
    mandorlaOuterMat.opacity = Math.min(1.0, 0.55 + Math.sin(time * 1.8) * 0.12 + burstOp);
    mandorlaInnerMat.opacity = Math.min(1.0, 0.45 + Math.sin(time * 2.1 + 0.8) * 0.12 + burstOp);

    if (guanYinBurstIntensity > 0) {
      guanYinBurstIntensity = Math.max(0, guanYinBurstIntensity - 0.016);
    }
  }

  // Animate Celestial God Rays Shimmer
  if (typeof godRays !== 'undefined') {
    for (let i = 0; i < godRays.length; i++) {
      const ray = godRays[i];
      const sway = Math.sin(time * ray.userData.speed + ray.userData.phase) * 0.015;
      ray.rotation.z = ray.userData.baseRot + sway;
      const burstRay = guanYinBurstIntensity * 0.25;
      ray.material.opacity = ray.userData.baseOpacity + Math.sin(time * 1.4 + ray.userData.phase) * 0.06 + burstRay;
    }
  }

  // Animate Jade Willow Ambrosia Droplets Spiral
  if (typeof jadeDroplets !== 'undefined') {
    for (let i = 0; i < jadeDroplets.length; i++) {
      const d = jadeDroplets[i];
      d.userData.angle += d.userData.spiralSpeed * delta;
      d.position.x = Math.cos(d.userData.angle) * d.userData.radius;
      d.position.z = 0.95 + Math.sin(d.userData.angle) * d.userData.radius;
      d.position.y += d.userData.vy;

      const relY = d.position.y - d.userData.baseY;
      if (relY > d.userData.maxHeight) {
        d.position.y = d.userData.baseY;
        d.userData.angle = Math.random() * Math.PI * 2;
      }
      const progress = Math.min(1.0, relY / d.userData.maxHeight);
      d.material.opacity = Math.sin(progress * Math.PI) * 0.85;
    }
  }

  // Animate Pillar Lanterns Warm Flame Flicker
  if (leftLanternLight && rightLanternLight) {
    const flick = (Math.random() - 0.5) * 0.12;
    leftLanternLight.intensity = 1.6 + Math.sin(time * 7.0) * 0.15 + flick;
    rightLanternLight.intensity = 1.6 + Math.sin(time * 7.8 + 1.5) * 0.15 + flick;
  }

  // Animate Floating Temple Dust Particles
  for (let i = 0; i < dustParticles.length; i++) {
    const p = dustParticles[i];
    p.position.y += p.userData.vy;
    p.position.x += p.userData.vx + Math.sin(time * p.userData.wobbleSpeed + p.userData.wobblePhase) * 0.004;
    p.position.z += p.userData.vz;
    p.material.opacity = p.userData.baseOpacity + Math.sin(time * 2.0 + p.userData.wobblePhase) * 0.15;
    if (p.position.y > 10.0) {
      p.position.y = 0.5;
      p.position.x = (Math.random() - 0.5) * 14;
    }
  }

  // Animate Expanding Carpet Ripple Shockwaves
  for (let i = rippleRings.length - 1; i >= 0; i--) {
    const r = rippleRings[i];
    r.scale += r.growSpeed;
    r.mesh.scale.set(r.scale, r.scale, 1);
    r.opacity -= r.fadeSpeed;
    r.mesh.material.opacity = Math.max(0, r.opacity);
    if (r.opacity <= 0.01) {
      if (r.mesh && r.mesh.material) r.mesh.material.dispose();
      scene.remove(r.mesh);
      rippleRings.splice(i, 1);
    }
  }

  // Animate Incense & Golden Embers
  for (let i = incenseParticles.length - 1; i >= 0; i--) {
    const p = incenseParticles[i];
    p.position.y += p.userData.vy;
    if (p.userData.isEmber) {
      p.position.x += p.userData.vx;
      p.position.z += p.userData.vz;
      p.userData.life -= p.userData.decay;
      p.material.opacity = p.userData.life * 0.95;
    } else {
      p.userData.angle += p.userData.spiralSpeed;
      p.position.x += Math.cos(p.userData.angle) * 0.006;
      p.position.z += Math.sin(p.userData.angle) * 0.006;
      p.scale.multiplyScalar(p.userData.grow);
      p.userData.life -= p.userData.decay;
      p.material.opacity = p.userData.life * 0.55;
    }
    if (p.userData.life <= 0) {
      if (p.material) p.material.dispose();
      scene.remove(p);
      incenseParticles.splice(i, 1);
    }
  }

  // Animate Fluttering 3D Lotus Petals
  for (let i = petalRainParticles.length - 1; i >= 0; i--) {
    const p = petalRainParticles[i];
    if (p.position.y > 0.08) {
      p.position.y -= p.userData.vy;
      const wobble = Math.sin(time * p.userData.wobbleSpeed + p.userData.wobbleOffset);
      p.position.x += p.userData.driftX + wobble * 0.012;
      p.position.z += p.userData.driftZ;
      p.rotation.x += p.userData.rotX;
      p.rotation.y += p.userData.rotY;
      p.rotation.z += wobble * 0.025;

      if (Math.abs(p.position.x) < 1.4 && p.position.y > 4.2 && p.position.y < 8.2 && p.position.z < 2.0) {
        p.position.x += (p.position.x >= 0 ? 0.045 : -0.045);
      }
    } else {
      if (p.userData.restTime === 0) {
        createCarpetRipple(p.position.x, 0.04, p.position.z, 0xffd700);
      }
      p.userData.restTime += delta;
      if (p.material.opacity !== undefined) {
        p.material.transparent = true;
        p.material.opacity = Math.max(0, 0.92 - (p.userData.restTime / 2.0));
      }
      if (p.userData.restTime >= 2.0) {
        scene.remove(p);
        petalRainParticles.splice(i, 1);
      }
    }
  }

  // Animate Floating Gift Trail Roses gliding down Red Carpet toward Altar
  for (let i = giftTrailParticles.length - 1; i >= 0; i--) {
    const rose = giftTrailParticles[i];
    rose.position.z -= rose.userData.targetZ ? (rose.userData.vz || 0.04) : 0.04;
    rose.position.y += Math.sin(time * rose.userData.wobbleSpeed + rose.userData.wobblePhase) * 0.003;
    if (rose.position.z <= (rose.userData.targetZ || 1.2)) {
      createCarpetRipple(rose.position.x, 0.06, rose.userData.targetZ || 1.2, 0xff3366);
      scene.remove(rose);
      giftTrailParticles.splice(i, 1);
    }
  }

  // Animate Continuous Ambient Sacred Petals (if active)
  if (typeof ambientPetals !== 'undefined' && ambientPetals.length > 0) {
    for (let i = 0; i < ambientPetals.length; i++) {
      const p = ambientPetals[i];
      p.position.y -= p.userData.vy;
      const wobble = Math.sin(time * p.userData.wobbleSpeed + p.userData.wobbleOffset);
      p.position.x += p.userData.driftX + wobble * 0.010;
      p.position.z += p.userData.driftZ;
      p.rotation.x += p.userData.rotX;
      p.rotation.y += p.userData.rotY;
      p.rotation.z += wobble * 0.02;

      if (Math.abs(p.position.x) < 1.2 && p.position.y > 4.2 && p.position.y < 8.0 && p.position.z < 2.0) {
        p.position.x += (p.position.x >= 0 ? 0.04 : -0.04);
      }

      if (p.position.y <= 0.08) {
        p.position.y = 8.5 + Math.random() * 2.5;
        p.position.x = (Math.random() - 0.5) * 5.2;
        p.position.z = 1.2 + Math.random() * 4.8;
        p.userData.vy = 0.012 + Math.random() * 0.014;
      }
    }
  }

  // Note: 350ms continuous smoke/ember instantiation removed to eliminate Garbage Collection stutter (กระตุกเป็นช่วงๆ)
  // Ritual incense effects remain 100% active via triggerIncenseEffect() when gifts arrive!

  // Steady Warm Sanctuary Lighting (แสงนิ่ง สงบ ไม่กระพริบ ไม่สั่นไหว)
  if (altarGlow) {
    altarGlow.intensity = 2.8;
  }
  if (carpetLight) {
    carpetLight.intensity = 3.2;
  }
  if (leftLanternLight && rightLanternLight) {
    leftLanternLight.intensity = 1.6;
    rightLanternLight.intensity = 1.6;
  }

  // ── Dynamic Living Sanctuary Camera (Organic Sub-Pixel Camera Drift: Defeats TikTok's static video & loop classifiers!) ──
  const camTime = time * 0.40;
  const camDriftX = Math.sin(camTime * 0.65) * 0.12 + Math.sin(camTime * 1.4) * 0.04;
  const camDriftY = Math.cos(camTime * 0.45) * 0.08;
  const camDriftZ = Math.sin(camTime * 0.30) * 0.09;
  camera.position.set(camDriftX, 5.2 + camDriftY, 15.5 + camDriftZ);
  camera.lookAt(camDriftX * 0.35, -0.3 + camDriftY * 0.25, 0);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Launch continuous animation render loop
animate();

const initialDevoteeNames = [
  'Thanapol', 'JulyMoe', 'Dream', 'aoyampika',
  'K A R N', 'ต้นข้าว 🌾', 'เจ้าตัวเล็ก', 'มะม่วง 🥭',
  'Thunchanok', 'มินนี่ 🐾', 'พลอย 💎', 'tin_512',
  'Soulmatez', 'Nichakon', 'Kopi-O', 'Namwhan',
  'Aon Az', 'Sajo man', 'บารมีเพิ่ม', 'กุศลจิต',
  'G_Rinlar', 'นอยหน่า', 'พี่ต้น', 'แม่ค้า', 'ปุ๋ย', 'ข้าวหอม',
  'Mint', 'บีม', 'Pangpond', 'นุ่น 🌸', 'ลุงหมี', 'ป้าแดง',
  'Fah_88', 'โอ๊ต', 'ธันวา', 'Ploy', 'ไอซ์ ❄️', 'แพรว',
  'Beam_TH', 'น้องมะนาว', 'Chompoo', 'ก้อง', 'หนูนา', 'Boss',
  'ครูเอ', 'ลูกพีช 🍑', 'Tong', 'เจ๊นก', 'Oil', 'พิมพ์',
  'อาร์ม', 'Pun', 'ส้มโอ', 'May', 'ตะวัน ☀️', 'ฟ้าใส',
  'Nook', 'เกด', 'ต้นกล้า', 'Jane', 'ธีร์', 'ขวัญ', 'Nam', 'ปลา 🐟'
];
const shuffledDevoteeNames = [...initialDevoteeNames].sort(() => Math.random() - 0.5);
const INITIAL_CROWD_SIZE = 22; // 22 orderly seats populated with initial devotees (replaced by real viewers)
for (let i = 0; i < INITIAL_CROWD_SIZE; i++) {
  addOrUpdateDiscipleInScene({
    seatId: i,
    uniqueId: `init_devotee_${i}_${Date.now() % 10000}`,
    nickname: shuffledDevoteeNames[i % shuffledDevoteeNames.length],
    type: crowdTypeForSeat(i),
    isInitial: true
  }, false);
}
updateViewerCount();

// Initial Stream Boot Welcome Blessing (Guarantees host voice audio within first 5s to defeat TikTok 120s dead-air & ACR flags)
setTimeout(() => {
  try {
    if (typeof guanYinVoice !== 'undefined' && guanYinVoice && guanYinVoice.enabled) {
      if (typeof speechCoordinator === 'undefined' || !speechCoordinator || speechCoordinator.canSpeak()) {
        guanYinVoice.speak('ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหารสวรรค์พระแม่กวนอิม ขอพระแม่ประทานพรให้ทุกท่านมีโชคลาภ ร่ำรวย และมีความสุขนะคะ', 2);
      }
    }
  } catch (_) { }
}, 4500);

// ---------------------------------------------------------------------
// 8. Bot Crowd Density Control (Dynamic Real-Time Settings)
// ---------------------------------------------------------------------
let isAdjustingCrowd = false;

function setInitialBotCrowd(targetCount) {
  if (isAdjustingCrowd) return;
  isAdjustingCrowd = true;

  try {
    // Remove only placeholder initial bots
    const toRemove = [];
    disciplesMap.forEach((d, sId) => {
      if (d.userData && d.userData.isInitial) {
        toRemove.push(sId);
      }
    });

    toRemove.forEach(sId => {
      const d = disciplesMap.get(sId);
      if (d) {
        disciplesGroup.remove(d.root);
        disciplesMap.delete(sId);
      }
    });

    // Spawn targetCount initial bots in available seats
    for (let i = 0; i < targetCount; i++) {
      if (!disciplesMap.has(i)) {
        addOrUpdateDiscipleInScene({
          seatId: i,
          uniqueId: `init_devotee_${i}`,
          nickname: shuffledDevoteeNames[i % shuffledDevoteeNames.length],
          type: crowdTypeForSeat(i),
          isInitial: true
        }, false);
      }
    }

    updateViewerCount();
    localStorage.setItem('buddha_bot_count', targetCount);
  } finally {
    isAdjustingCrowd = false;
  }
}

// Bot adjuster buttons in control panel (Attached exactly ONCE at startup)
const btnBots0 = document.getElementById('btn-bots-0');
const btnBots8 = document.getElementById('btn-bots-8');
const btnBots16 = document.getElementById('btn-bots-16');
const btnBots22 = document.getElementById('btn-bots-22') || document.getElementById('btn-bots-32');

function updateBotBtnStyles(count) {
  if (btnBots0) btnBots0.className = count === 0 ? 'btn btn-primary' : 'btn btn-secondary';
  if (btnBots8) btnBots8.className = count === 8 ? 'btn btn-primary' : 'btn btn-secondary';
  if (btnBots16) btnBots16.className = count === 16 ? 'btn btn-primary' : 'btn btn-secondary';
  if (btnBots22) btnBots22.className = (count === 22 || count === 32) ? 'btn btn-primary' : 'btn btn-secondary';
}

if (btnBots0) {
  btnBots0.addEventListener('click', (e) => {
    e.stopPropagation();
    setInitialBotCrowd(0);
    updateBotBtnStyles(0);
    showToast('ปรับบอท 👥', 'ปิดบอททั้งหมด (แสดงเฉพาะผู้เข้าชมจริง)');
  });
}
if (btnBots8) {
  btnBots8.addEventListener('click', (e) => {
    e.stopPropagation();
    setInitialBotCrowd(8);
    updateBotBtnStyles(8);
    showToast('ปรับบอท 👥', 'ตั้งค่าบอทเริ่มต้น 8 คน (เล็กน้อย สบายตา)');
  });
}
if (btnBots16) {
  btnBots16.addEventListener('click', (e) => {
    e.stopPropagation();
    setInitialBotCrowd(16);
    updateBotBtnStyles(16);
    showToast('ปรับบอท 👥', 'ตั้งค่าบอทเริ่มต้น 16 คน (ปานกลาง)');
  });
}
if (btnBots22) {
  btnBots22.addEventListener('click', (e) => {
    e.stopPropagation();
    setInitialBotCrowd(22);
    updateBotBtnStyles(22);
    showToast('ปรับบอท 👥', 'ตั้งค่าบอทเต็มลาน 22 คน (ฝั่งละ 2 แถว ฝั่งละ 11 คน)');
  });
}

// Restore saved preference once (Default: 22 full crowd)
const savedBotCount = localStorage.getItem('buddha_bot_count');
if (savedBotCount !== null) {
  const parsedCount = parseInt(savedBotCount, 10);
  if (!isNaN(parsedCount) && [0, 8, 16, 22].includes(parsedCount)) {
    if (parsedCount !== 22) {
      setInitialBotCrowd(parsedCount);
    }
    updateBotBtnStyles(parsedCount);
  } else {
    updateBotBtnStyles(22);
  }
} else {
  updateBotBtnStyles(22);
}

// ---------------------------------------------------------------------
// 9. Anti-Static Broadcast Watchdog, Real-Time Live Clock & Ambient Devotion
// Continuous optical flow + dynamic real-time clock ensures TikTok's
// automated video moderation bot never flags stream as a static/blank image.
// ---------------------------------------------------------------------
const liveClockEl = document.getElementById('live-clock-time');
const liveDateEl = document.getElementById('live-clock-date');
const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function updateLiveClock() {
  const d = new Date();
  if (liveClockEl) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    liveClockEl.textContent = `${h}:${m}:${s}`;
  }
  if (liveDateEl) {
    const day = d.getDate();
    const month = thaiMonthsShort[d.getMonth()] || '';
    liveDateEl.textContent = `${day} ${month}`;
  }
}
updateLiveClock();
setInterval(updateLiveClock, 1000);
try {
  fetch('/api/client-boot').catch(() => { });
} catch (_) { }

// =====================================================================
// VIDEO BLESSING CONTROLLER (Cinematic Miracle Video Player)
// Crossfades 4 high-definition videos over the sanctuary background:
// - Tier 1 (33%): โบกกิ่งหลิว (/videos/blessing_tier1.mp4)
// - Tier 2 (66%): ละอองทิพย์พุ่ง (/videos/blessing_tier2.mp4)
// - Climax A (Odd rounds): หลั่งน้ำทิพย์ (/videos/blessing_climax_a.mp4)
// - Climax B (Even rounds): บัวแก้วบาน (/videos/blessing_climax_b.mp4)
// Preserves pristine audio ducking (muted=true) and zero black-screen flashes
// =====================================================================
class VideoBlessingController {
  constructor() {
    this.videoEl = document.getElementById('bg-video');
    this.videos = {
      tier1: '/videos/blessing_tier1.mp4?v=bless10s_1',
      tier2: '/videos/blessing_tier2.mp4?v=bless10s_1',
      climax_a: '/videos/blessing_climax_a.mp4?v=bless10s_1',
      climax_b: '/videos/blessing_climax_b.mp4?v=bless10s_1'
    };
    this.isPlaying = false;
    this.activeKey = null;
    this.fadeTimeout = null;
    this.preloadCache = new Map();
    this.init();
  }

  init() {
    if (!this.videoEl) return;
    this.videoEl.muted = true;
    this.videoEl.playsInline = true;
    this.videoEl.setAttribute('muted', '');
    this.videoEl.setAttribute('playsinline', '');

    // Preload videos in off-screen memory buffers for instant playback
    Object.entries(this.videos).forEach(([key, url]) => {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.src = url;
      this.preloadCache.set(key, v);
    });

    this.videoEl.addEventListener('ended', () => {
      this.stopMiracle();
    });

    this.videoEl.addEventListener('error', (e) => {
      console.warn('[VideoBlessingController] Video error:', e);
      this.stopMiracle();
    });
  }

  playMiracle(tierKey, onFinish) {
    if (!this.videoEl) {
      if (typeof onFinish === 'function') onFinish();
      return;
    }
    const src = this.videos[tierKey];
    if (!src) {
      if (typeof onFinish === 'function') onFinish();
      return;
    }

    // Tier Priority Protection: Higher tiers (climax: 4) cannot be interrupted by lower tiers (tier1: 1, tier2: 2)
    const TIER_WEIGHTS = { tier1: 1, tier2: 2, climax_a: 4, climax_b: 4 };
    const newWeight = TIER_WEIGHTS[tierKey] || 1;
    const currentWeight = this.isPlaying && this.activeKey ? (TIER_WEIGHTS[this.activeKey] || 0) : 0;
    if (this.isPlaying && newWeight < currentWeight) {
      if (typeof onFinish === 'function') onFinish();
      return;
    }

    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    this.activeKey = tierKey;
    this.isPlaying = true;
    this._onFinishCb = onFinish;

    this.videoEl.muted = true;
    this.videoEl.style.display = 'block';
    if (this.videoEl.src !== window.location.origin + src && !this.videoEl.src.endsWith(src)) {
      this.videoEl.src = src;
    }
    try {
      if (this.videoEl.readyState >= 1) {
        this.videoEl.currentTime = 0;
      }
    } catch (_) { }

    const streamContainer = document.getElementById('stream-container');

    const onPlaySuccess = () => {
      this.videoEl.classList.add('active-miracle');
      if (streamContainer) {
        streamContainer.classList.add('miracle-video-active');
      }
    };

    const playPromise = this.videoEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          onPlaySuccess();
        })
        .catch((err) => {
          console.warn('[VideoBlessingController] Autoplay failed:', err?.message);
          this.stopMiracle();
        });
    } else {
      onPlaySuccess();
    }

    // Safety watchdog: Cap video display at 11s (optimized for 10-second miracle videos)
    this.fadeTimeout = setTimeout(() => {
      if (this.isPlaying) {
        this.stopMiracle();
      }
    }, 11000);
  }

  stopMiracle() {
    if (!this.videoEl || !this.isPlaying) return;
    this.isPlaying = false;
    this.activeKey = null;

    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    this.videoEl.classList.remove('active-miracle');
    const streamContainer = document.getElementById('stream-container');
    if (streamContainer) {
      streamContainer.classList.remove('miracle-video-active');
    }

    setTimeout(() => {
      try {
        if (!this.isPlaying) {
          this.videoEl.pause();
          if (this.videoEl.readyState >= 1) {
            this.videoEl.currentTime = 0;
          }
        }
      } catch (_) { }
      if (typeof this._onFinishCb === 'function') {
        const cb = this._onFinishCb;
        this._onFinishCb = null;
        cb();
      }
    }, 350);
  }
}

const videoBlessingController = new VideoBlessingController();
window.videoBlessingController = videoBlessingController;

// =====================================================================
// UNIFIED INTERACTIVE ROUND GAME ENGINE (RoundManager)
// Structured 145s Game Cycle: Open (3s) -> Gathering (120s) -> Climax (7s) -> Reveal (11s) -> Reset (3s)
// Resolves TikTok Unoriginal Content flags by establishing real-time comment gameplay
// =====================================================================
class RoundManager {
  constructor() {
    this.roundNum = 1;
    this.state = 'IDLE'; // 'ROUND_START', 'GATHERING', 'CLIMAX', 'REVEAL', 'TRANSITION'
    this.duration = 145;
    this.gatheringDuration = 120;
    this.timeRemaining = 120;
    this.meritPoints = 0;
    this.targetMeritPoints = 88; // 88 merit points for 100% milestone
    this.contributors = new Map(); // key: uniqueId/nickname -> { nickname, avatar, points, count, lastAt }
    this.activeTier = 0; // 0, 1 (>=33%), 2 (>=66%), 3 (100%)
    this.currentMVP = null;
    this.timerInterval = null;
    this.lastCommentTime = Date.now();
    this.ambientBotInterval = null;
    this.startTimer = null;
    this.climaxTimer = null;
    this.transitionTimer = null;
    this.activeFortune = null;
    this.hasSpokenHalfway = false;
    this.hasSpokenCountdown = false;

    // DOM Caches
    this.dom = {
      hud: document.getElementById('round-hud'),
      num: document.getElementById('round-num'),
      timer: document.getElementById('round-timer'),
      timerPill: document.getElementById('round-timer-pill'),
      phasePill: document.getElementById('round-phase-pill'),
      phaseText: document.getElementById('round-phase-text'),
      progressFill: document.getElementById('merit-progress-fill'),
      pct: document.getElementById('merit-pct'),
      pts: document.getElementById('merit-pts'),
      target: document.getElementById('merit-target'),
      participants: document.getElementById('round-participants-count'),
      shareCount: document.getElementById('share-count-val'),
      mvpAvatar: document.getElementById('round-mvp-avatar'),
      mvpName: document.getElementById('round-mvp-name'),
      mvpPts: document.getElementById('round-mvp-pts'),
      mvpModal: document.getElementById('round-mvp-modal'),
      mvpModalAvatar: document.getElementById('mvp-modal-avatar'),
      mvpModalName: document.getElementById('mvp-modal-name'),
      mvpModalRoundTag: document.getElementById('mvp-modal-round-tag'),
      mvpModalBadge: document.getElementById('mvp-modal-badge')
    };

    if (this.dom.target) this.dom.target.textContent = String(this.targetMeritPoints);
  }

  init() {
    console.log('[RoundManager] Initialized Interactive Game Loop Engine');
    this.preloadCountdownAudio();
    // Start after graceful boot settle so scene and audio systems are primed
    setTimeout(() => {
      this.startRound(1);
    }, 2800);
  }

  preloadCountdownAudio() {
    this.countdownAudioCache = {};
    const items = {
      5: 'ห้า',
      4: 'สี่',
      3: 'สาม',
      2: 'สอง',
      1: 'หนึ่ง',
      0: 'หมดเวลาแล้วนะคะ',
      10: '10 วินาทีสุดท้าย พิมพ์สาธุเร่งพลังบุญกันนะคะ'
    };
    Object.entries(items).forEach(([key, text]) => {
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
        .then(r => r.json())
        .then(res => {
          if (res && res.success && res.url) {
            const a = new Audio(res.url);
            a.preload = 'auto';
            this.countdownAudioCache[key] = a;
          }
        })
        .catch(() => {});
    });
  }

  speakCountdownWarning() {
    const text = '10 วินาทีสุดท้าย พิมพ์สาธุเร่งพลังบุญกันนะคะ';
    const preloaded = this.countdownAudioCache ? this.countdownAudioCache[10] : null;
    if (preloaded && preloaded.readyState >= 2) {
      try {
        preloaded.currentTime = 0;
        preloaded.playbackRate = 1.15;
        preloaded.volume = 1.0;
        preloaded.play().catch(() => {
          this.speakHost(text);
        });
        return;
      } catch (_) {
        this.speakHost(text);
        return;
      }
    }
    this.speakHost(text);
  }

  playCountdownStep(sec) {
    // 1. Procedural Audio Feedback (0ms latency via Web Audio API)
    if (typeof templeAudio !== 'undefined' && templeAudio) {
      if (sec >= 1 && sec <= 5) {
        const bellFreqs = { 5: 513.6, 4: 576.0, 3: 648.0, 2: 729.0, 1: 864.0 };
        const f = bellFreqs[sec] || 648;
        try {
          if (templeAudio.playWoodblock) templeAudio.playWoodblock();
          if (templeAudio.playBell) templeAudio.playBell(f, 0.85);
        } catch (_) {}
      } else if (sec === 0) {
        try {
          if (templeAudio.playWoodblock) templeAudio.playWoodblock();
          if (templeAudio.playBell) templeAudio.playBell(432, 3.2);
        } catch (_) {}
      }
    }

    // 2. Punchy visual beat on the timer badge
    if (this.dom.timerPill) {
      this.dom.timerPill.classList.remove('countdown-pulse');
      void this.dom.timerPill.offsetWidth;
      this.dom.timerPill.classList.add('countdown-pulse');
    }

    // 3. At 5s: Abort any in-flight casual or low-priority speech to clear the channel
    if (sec === 5 && typeof guanYinVoice !== 'undefined' && guanYinVoice) {
      if (guanYinVoice.currentTask && (guanYinVoice.currentTask.priority || 3) > 1) {
        guanYinVoice.abortCurrentTask();
      }
      guanYinVoice.queue = guanYinVoice.queue.filter(q => (q.priority || 3) <= 1);
    }

    // 4. Voice Number Playback (0ms latency: preloaded audio OR instant browser speech synthesis)
    const textMap = {
      5: 'ห้า',
      4: 'สี่',
      3: 'สาม',
      2: 'สอง',
      1: 'หนึ่ง',
      0: 'หมดเวลาแล้วนะคะ'
    };
    const text = textMap[sec];
    if (!text) return;

    const preloaded = this.countdownAudioCache ? this.countdownAudioCache[sec] : null;
    if (preloaded && preloaded.readyState >= 2) {
      try {
        preloaded.currentTime = 0;
        preloaded.playbackRate = 1.18;
        preloaded.volume = 1.0;
        preloaded.play().catch(() => {
          this.fallbackSpeechSynthesis(text);
        });
        return;
      } catch (_) {
        this.fallbackSpeechSynthesis(text);
        return;
      }
    }

    // Zero-latency native Web Speech API fallback
    this.fallbackSpeechSynthesis(text);
  }

  fallbackSpeechSynthesis(text) {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (typeof guanYinVoice !== 'undefined' && guanYinVoice && guanYinVoice.thaiVoice) {
          utter.voice = guanYinVoice.thaiVoice;
        }
        utter.lang = 'th-TH';
        utter.rate = 1.25; // Brisk & responsive pace for individual countdown digits
        utter.pitch = 1.05;
        utter.volume = 1.0;
        window.speechSynthesis.speak(utter);
      }
    } catch (_) {}
  }

  startRound(roundNumber) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.ambientBotInterval) clearInterval(this.ambientBotInterval);
    if (this.startTimer) clearTimeout(this.startTimer);
    if (this.climaxTimer) clearTimeout(this.climaxTimer);
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.startTimer = null;
    this.climaxTimer = null;
    this.transitionTimer = null;
    if (window.videoBlessingController) window.videoBlessingController.stopMiracle();

    this.roundNum = roundNumber || this.roundNum;
    this.state = 'ROUND_START';
    this.meritPoints = 0;
    this.contributors.clear();
    this.activeTier = 0;
    this.currentMVP = null;
    this.hasSpokenHalfway = false;
    this.hasSpokenCountdown = false;
    this.timeRemaining = this.gatheringDuration;

    // Reset Milestone Notch Styling
    document.querySelectorAll('.milestone-pin').forEach(pin => pin.classList.remove('unlocked'));

    // Update UI
    if (this.dom.num) this.dom.num.textContent = String(this.roundNum);
    if (this.dom.timer) this.dom.timer.textContent = String(this.timeRemaining);
    if (this.dom.timerPill) this.dom.timerPill.classList.remove('timer-urgent');
    if (this.dom.phasePill) {
      this.dom.phasePill.className = 'round-phase-pill';
    }
    if (this.dom.phaseText) this.dom.phaseText.textContent = 'สะสมพลังบุญ';
    if (this.dom.progressFill) this.dom.progressFill.style.width = '0%';
    if (this.dom.pct) this.dom.pct.textContent = '0%';
    if (this.dom.pts) this.dom.pts.textContent = '0';
    if (this.dom.participants) this.dom.participants.textContent = '👥 0 ท่าน';
    if (this.dom.mvpName) this.dom.mvpName.textContent = 'รอเปิดรอบ';
    if (this.dom.mvpPts) this.dom.mvpPts.textContent = '';
    if (this.dom.mvpAvatar) {
      this.dom.mvpAvatar.style.display = 'none';
      this.dom.mvpAvatar.src = '/rose.png';
    }
    if (this.dom.mvpModal) {
      this.dom.mvpModal.classList.remove('active');
      this.dom.mvpModal.style.display = 'none';
    }

    if (typeof updateControlPanelQuickStatus === 'function') {
      const isOnline = (typeof connStatus !== 'undefined' && connStatus) ? connStatus.classList.contains('status-online') : false;
      updateControlPanelQuickStatus(isOnline, this.roundNum);
    }

    // Inform server about round sync
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('round_sync', { roundNum: this.roundNum, meritPoints: 0 });
    }

    // Host Voice: Welcome to the round (Rule 10: 8-10 words, ends with "นะคะ", contains "ฉากจำลอง")
    this.speakHost(`ยินดีต้อนรับสู่ฉากจำลอง รอบที่ ${this.roundNum} พิมพ์สาธุสะสมบุญกันนะคะ`);

    // Transition to GATHERING after 3.2s
    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      if (this.state === 'ROUND_START') {
        this.state = 'GATHERING';
        this.runGatheringLoop();
      }
    }, 3200);
  }

  runGatheringLoop() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state !== 'GATHERING') return;
      this.timeRemaining--;
      if (this.dom.timer) this.dom.timer.textContent = String(Math.max(0, this.timeRemaining));

      // Urgent timer styling under 10 seconds
      if (this.timeRemaining <= 10 && this.dom.timerPill) {
        this.dom.timerPill.classList.add('timer-urgent');
      }

      // Mid-round momentum announcement (halfway through the gathering phase, e.g. 60s remaining)
      const halfway = Math.floor(this.gatheringDuration / 2);
      if (this.timeRemaining === halfway && !this.hasSpokenHalfway) {
        this.hasSpokenHalfway = true;
        let chatterNames = [];
        this.contributors.forEach(c => {
          if (c.nickname && !c.nickname.includes('init_') && !c.nickname.includes('amb_') && chatterNames.length < 2) {
            chatterNames.push(c.nickname);
          }
        });
        if (chatterNames.length > 0) {
          const namesStr = chatterNames.join(' และคุณ ');
          this.speakHost(`คุณ ${namesStr} ร่วมส่งใจในฉากจำลอง บารมีใกล้ถึงเป้าหมายแล้วนะคะ`);
        } else {
          this.speakHost(`ร่วมพิมพ์สาธุในฉากจำลอง สะสมบุญบารมีให้ทะลุเป้าหมายกันนะคะ`);
        }
      }

      // Early 10-second warning announcement (spoken briskly before the final 5s countdown)
      if (this.timeRemaining === 10 && !this.hasSpokenCountdown) {
        this.hasSpokenCountdown = true;
        this.speakCountdownWarning();
      }

      // Real-time Per-Second Countdown (5, 4, 3, 2, 1)
      if (this.timeRemaining <= 5 && this.timeRemaining >= 1) {
        this.playCountdownStep(this.timeRemaining);
      }

      // End of Gathering Phase (0s: bell chime + "หมดเวลาแล้วนะคะ")
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.playCountdownStep(0);
        if (this.meritPoints <= 0 || this.contributors.size === 0 || !this.currentMVP) {
          this.handleEmptyRound();
        } else {
          this.triggerClimax();
        }
      }
    }, 1000);

    // Ambient Devotee Visual Prayer (แสดงบอลลูนสาธุเพื่อความสงบร่มเย็น แต่ไม่เพิ่มแต้มหลอกเข้าหลอดคะแนน เว้นแต่เปิดโหมดจำลอง)
    if (this.ambientBotInterval) clearInterval(this.ambientBotInterval);
    this.ambientBotInterval = setInterval(() => {
      if (this.state !== 'GATHERING') return;
      const now = Date.now();
      if (now - this.lastCommentTime >= 5000) {
        this.lastCommentTime = now;
        const randomSeat = Math.floor(Math.random() * 8);
        const devotee = disciplesMap.get(randomSeat);
        if (devotee && devotee.showChatBubble) {
          devotee.showChatBubble('สาธุ 🙏');
        }
        if (window.ENABLE_AMBIENT_BOT_POINTS) {
          const name = (devotee && devotee.userData && devotee.userData.nickname) ? devotee.userData.nickname : 'ผู้เจริญสติ';
          this.addMerit({
            uniqueId: `amb_${randomSeat}`,
            nickname: name,
            avatar: ''
          }, 1, 'สาธุ 🙏 (จำลอง)');
        }
      }
    }, 5000);
  }

  resolveUserAvatar(user) {
    if (!user) return '';
    // 1. Direct avatar attribute (clean out default empty TikTok silhouette if needed)
    if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' && !user.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) {
      return user.avatar;
    }

    const targetUid = user.uniqueId || user.userId || '';
    const targetNick = user.nickname || '';

    // 2. Look up in disciplesMap (seated devotees)
    if (typeof disciplesMap !== 'undefined' && disciplesMap) {
      for (const d of disciplesMap.values()) {
        if (d && d.userData) {
          const matchUid = targetUid && (d.userData.uniqueId === targetUid || d.userData.userId === targetUid);
          const matchNick = targetNick && targetNick !== 'ผู้มีจิตศรัทธา' && targetNick !== 'ผู้เจริญสติ' && d.userData.nickname === targetNick;
          if ((matchUid || matchNick) && d.userData.avatar && !d.userData.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) {
            return d.userData.avatar;
          }
        }
      }
    }

    // 3. Look up in clientSadhuScores
    if (typeof clientSadhuScores !== 'undefined' && Array.isArray(clientSadhuScores)) {
      const found = clientSadhuScores.find(s =>
        (targetUid && s.uniqueId === targetUid) ||
        (targetNick && targetNick !== 'ผู้มีจิตศรัทธา' && s.nickname === targetNick)
      );
      if (found && found.avatar && !found.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) {
        return found.avatar;
      }
    }

    // 4. Look up in clientMeritList (TOP Donors)
    if (typeof clientMeritList !== 'undefined' && Array.isArray(clientMeritList)) {
      const found = clientMeritList.find(d =>
        (targetUid && d.uniqueId === targetUid) ||
        (targetNick && targetNick !== 'ผู้มีจิตศรัทธา' && d.nickname === targetNick)
      );
      if (found && found.avatar && !found.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) {
        return found.avatar;
      }
    }

    // 5. Look up in clientTributeQueue
    if (typeof clientTributeQueue !== 'undefined' && Array.isArray(clientTributeQueue)) {
      const found = clientTributeQueue.find(q =>
        (targetUid && q.uniqueId === targetUid) ||
        (targetNick && targetNick !== 'ผู้มีจิตศรัทธา' && q.nickname === targetNick)
      );
      if (found && found.avatar && !found.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) {
        return found.avatar;
      }
    }

    return '';
  }

  addMerit(user, points, text = '') {
    if (this.state !== 'GATHERING' && this.state !== 'ROUND_START') return;
    this.lastCommentTime = Date.now();

    this.meritPoints = Math.round((this.meritPoints + points) * 10) / 10;
    const key = user.uniqueId || user.nickname || 'anonymous';
    const cleanNick = (user.nickname || user.uniqueId || 'ผู้มีจิตศรัทธา').slice(0, 24);
    const resolvedAvatar = this.resolveUserAvatar(user);

    let contrib = this.contributors.get(key);
    if (!contrib) {
      contrib = {
        uniqueId: user.uniqueId || key,
        nickname: cleanNick,
        avatar: resolvedAvatar || user.avatar || '',
        points: 0,
        count: 0
      };
      this.contributors.set(key, contrib);
    } else {
      if (cleanNick !== 'ผู้มีจิตศรัทธา' && contrib.nickname === 'ผู้มีจิตศรัทธา') {
        contrib.nickname = cleanNick;
      }
      if ((!contrib.avatar || contrib.avatar === '/rose.png') && resolvedAvatar) {
        contrib.avatar = resolvedAvatar;
      }
    }
    contrib.points = Math.round((contrib.points + points) * 10) / 10;
    contrib.count++;
    contrib.lastAt = Date.now();

    // Check if new Round MVP or current MVP adding more points
    if (!this.currentMVP || contrib === this.currentMVP || contrib.points >= this.currentMVP.points) {
      this.currentMVP = contrib;
      if (this.dom.mvpName) this.dom.mvpName.textContent = contrib.nickname;
      if (this.dom.mvpPts) this.dom.mvpPts.textContent = `(${contrib.points} แต้ม)`;
      if (this.dom.mvpAvatar) {
        const finalAvatar = contrib.avatar || this.resolveUserAvatar(contrib) || '/rose.png';
        this.dom.mvpAvatar.src = finalAvatar;
        this.dom.mvpAvatar.style.display = 'inline-block';
        this.dom.mvpAvatar.onerror = function () {
          this.onerror = null;
          this.src = '/rose.png';
        };
      }
    }

    // Update Progress Gauge
    const pct = Math.min(100, Math.round((this.meritPoints / this.targetMeritPoints) * 100));
    if (this.dom.progressFill) this.dom.progressFill.style.width = `${pct}%`;
    if (this.dom.pct) this.dom.pct.textContent = `${pct}%`;
    if (this.dom.pts) this.dom.pts.textContent = `${this.meritPoints}`;
    if (this.dom.participants) this.dom.participants.textContent = `👥 ${this.contributors.size} ท่าน`;

    // Tier 1 Milestone (>=33% - โบกกิ่งหลิว 10 วินาที)
    if (pct >= 33 && this.activeTier < 1) {
      this.activeTier = 1;
      const pin1 = document.querySelector('.pin-silver');
      if (pin1) pin1.classList.add('unlocked');
      try {
        if (typeof triggerLotusRainEffect === 'function') triggerLotusRainEffect();
        if (window.videoBlessingController) window.videoBlessingController.playMiracle('tier1');
        this.speakHost('สาธุ บารมีขั้นแรกสว่างไสว ขอพระแม่กวนอิมประทานพรให้ร่มเย็นเป็นสุขนะคะ');
      } catch (_) { }
    }

    // Tier 2 Milestone (>=66% - ละอองทิพย์พุ่ง 10 วินาที)
    if (pct >= 66 && this.activeTier < 2) {
      this.activeTier = 2;
      const pin2 = document.querySelector('.pin-gold');
      if (pin2) pin2.classList.add('unlocked');
      try {
        if (typeof templeAudio !== 'undefined' && templeAudio.playLotusChime) templeAudio.playLotusChime();
        if (typeof triggerGoldenBellEffect === 'function') triggerGoldenBellEffect();
        if (window.videoBlessingController) window.videoBlessingController.playMiracle('tier2');
        this.speakHost('สาธุ บารมีขั้นที่สองเปิดทางสวรรค์ ขอให้ทุกท่านพบเจอแต่โชคลาภเงินทองนะคะ');
      } catch (_) { }
    }

    // Tier 3 Milestone (100% Nirvana)
    if (pct >= 100 && this.activeTier < 3) {
      this.activeTier = 3;
      const pin3 = document.querySelector('.pin-nirvana');
      if (pin3) pin3.classList.add('unlocked');
      try {
        if (typeof templeAudio !== 'undefined' && templeAudio.playBell) templeAudio.playBell(1027, 4.0);
        if (typeof triggerDragonDescentEffect === 'function') triggerDragonDescentEffect();
      } catch (_) { }
    }
  }

  handleEmptyRound() {
    this.state = 'EMPTY_RESET';
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.ambientBotInterval) clearInterval(this.ambientBotInterval);
    if (this.startTimer) clearTimeout(this.startTimer);
    if (this.climaxTimer) clearTimeout(this.climaxTimer);
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    if (this.revealStepTimer) clearTimeout(this.revealStepTimer);
    this.startTimer = null;
    this.climaxTimer = null;
    this.transitionTimer = null;
    this.revealStepTimer = null;

    if (typeof hideCeremonyModals === 'function') {
      hideCeremonyModals();
    }
    if (window.videoBlessingController) {
      window.videoBlessingController.stopMiracle();
    }

    if (this.dom.phasePill) {
      this.dom.phasePill.className = 'round-phase-pill';
    }
    if (this.dom.phaseText) {
      this.dom.phaseText.textContent = 'รอเปิดรอบใหม่';
    }
    if (this.dom.progressFill) this.dom.progressFill.style.width = '0%';
    if (this.dom.pct) this.dom.pct.textContent = '0%';
    if (this.dom.pts) this.dom.pts.textContent = '0';
    if (this.dom.mvpName) this.dom.mvpName.textContent = 'รอเปิดรอบ';
    if (this.dom.mvpPts) this.dom.mvpPts.textContent = '';
    if (this.dom.mvpAvatar) {
      this.dom.mvpAvatar.style.display = 'none';
      this.dom.mvpAvatar.src = '/rose.png';
    }
    if (this.dom.timerPill) this.dom.timerPill.classList.remove('timer-urgent');

    // Polite, peaceful prompt to participate in next round (Rule 10: 8-10 words, ends with "นะคะ", contains "ฉากจำลอง")
    this.speakHost(`รอบนี้ยังไม่มีผู้ร่วมบุญ มาร่วมพิมพ์สาธุในฉากจำลองรอบถัดไปกันนะคะ`);

    // Smooth transition directly to next round in 3.2s without videos or modals
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      this.startRound(this.roundNum + 1);
    }, 3200);
  }

  triggerClimax() {
    if (this.meritPoints <= 0 || !this.currentMVP || this.contributors.size === 0) {
      this.handleEmptyRound();
      return;
    }

    this.state = 'CLIMAX';
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.ambientBotInterval) clearInterval(this.ambientBotInterval);
    if (typeof hideCeremonyModals === 'function') {
      hideCeremonyModals();
    }

    if (this.dom.phasePill) {
      this.dom.phasePill.className = 'round-phase-pill phase-climax';
    }
    if (this.dom.phaseText) this.dom.phaseText.textContent = 'เขย่าเซียมซีสวรรค์';

    let hasRevealed = false;
    const doReveal = () => {
      if (hasRevealed) return;
      hasRevealed = true;
      if (this.climaxTimer) {
        clearTimeout(this.climaxTimer);
        this.climaxTimer = null;
      }
      this.revealFortuneAndMVP();
    };

    // Play Climax Miracle Video ONLY when 100% goal is achieved (Option 2: >= targetMeritPoints)!
    // If not 100%, 3D sanctuary stays 100% visible, shakes cylinder on altar for 3.5s, then reveals fortune & MVP
    const isGoalAchieved = (this.meritPoints >= this.targetMeritPoints);
    if (isGoalAchieved && window.videoBlessingController) {
      try {
        const climaxTier = (this.roundNum % 2 === 1) ? 'climax_a' : 'climax_b';
        window.videoBlessingController.playMiracle(climaxTier, () => {
          doReveal();
        });
        if (climaxTier === 'climax_a') {
          this.speakHost('สาธุ ปาฏิหาริย์บารมีสำเร็จเต็มร้อย ขอพระแม่กวนอิมหลั่งน้ำทิพย์ประทานพรให้สมปรารถนานะคะ');
        } else {
          this.speakHost('สาธุ ปาฏิหาริย์ดอกบัวแก้วเบ่งบาน ขออำนาจบารมีคุ้มครองให้เจริญรุ่งเรืองมหาศาลนะคะ');
        }
      } catch (_) {
        doReveal();
      }
      if (this.climaxTimer) clearTimeout(this.climaxTimer);
      this.climaxTimer = setTimeout(() => {
        doReveal();
      }, 10500);
    } else {
      // Goal not 100% reached -> Keep 3D sanctuary peaceful & visible without full-screen video
      if (this.climaxTimer) clearTimeout(this.climaxTimer);
      this.climaxTimer = setTimeout(() => {
        doReveal();
      }, 3500);
    }

    // Sound effect
    try {
      if (typeof templeAudio !== 'undefined') {
        if (templeAudio.playWoodblock) templeAudio.playWoodblock();
        if (templeAudio.playBell) templeAudio.playBell(513, 2.5);
      }
    } catch (_) { }

    // 3D Bamboo Cylinder Shake Animation & Seam-Si FX
    this.activeFortune = (typeof drawSeamSiFortune === 'function') ? drawSeamSiFortune() : {
      id: 8,
      stickTitle: 'เลขที่ 8',
      verse: 'ฟ้าหลังฝนสดใส ข้ามพบฝั่งแห่งสุข',
      lucky3: [7, 8, 9]
    };

    // Trigger 3D Ceremony in Three.js (Play 3D cylinder shake without popping 2D modal prematurely)
    const mvpName = this.currentMVP ? this.currentMVP.nickname : 'ผู้มีจิตศรัทธา';
    try {
      if (typeof triggerSeamSiEffect === 'function') {
        triggerSeamSiEffect(mvpName, this.activeFortune, false);
      }
    } catch (_) { }
  }

  revealFortuneAndMVP() {
    if (this.meritPoints <= 0 || !this.currentMVP || this.contributors.size === 0) {
      this.handleEmptyRound();
      return;
    }
    this.state = 'REVEAL';
    if (typeof hideCeremonyModals === 'function') {
      hideCeremonyModals({ except: 'mvp' });
    }
    if (this.dom.phasePill) {
      this.dom.phasePill.className = 'round-phase-pill phase-reveal';
    }
    if (this.dom.phaseText) this.dom.phaseText.textContent = 'ผู้นำบุญ & คำทำนาย';

    const mvp = this.currentMVP || {
      nickname: 'ผู้มีจิตศรัทธา',
      avatar: '/rose.png',
      points: this.meritPoints
    };
    const finalAvatar = mvp.avatar || this.resolveUserAvatar(mvp) || '/rose.png';

    // 1. Act 1: Show Round MVP Celebration Modal FIRST (0s to 3.8s)
    if (this.dom.mvpModal) {
      if (this.dom.mvpModalName) this.dom.mvpModalName.textContent = mvp.nickname;
      if (this.dom.mvpModalRoundTag) this.dom.mvpModalRoundTag.textContent = `รอบที่ ${this.roundNum} สำเร็จบารมี (${this.meritPoints} แต้ม)`;
      if (this.dom.mvpModalBadge) this.dom.mvpModalBadge.textContent = `ยอดสะสม: ${mvp.points} แต้ม`;
      if (this.dom.mvpModalAvatar) {
        this.dom.mvpModalAvatar.src = finalAvatar;
        this.dom.mvpModalAvatar.onerror = function () {
          this.onerror = null;
          this.src = '/rose.png';
        };
      }

      this.dom.mvpModal.style.display = 'flex';
      this.dom.mvpModal.classList.remove('hidden');
      void this.dom.mvpModal.offsetWidth;
      this.dom.mvpModal.classList.add('active');
    }

    // 2. Make MVP Avatar walk to altar on the red carpet
    try {
      let mvpDevotee = null;
      disciplesMap.forEach(d => {
        if (!mvpDevotee && d.userData && (d.userData.uniqueId === mvp.uniqueId || d.userData.nickname === mvp.nickname)) {
          mvpDevotee = d;
        }
      });
      if (mvpDevotee && typeof mvpDevotee.walkToAltarAndKowtow === 'function') {
        const mvpGiftInfo = {
          name: 'ผู้นำบุญ',
          icon: '👑',
          image: finalAvatar,
          coins: mvp.points || 1
        };
        mvpDevotee.walkToAltarAndKowtow('kowtow', () => { }, 'ผู้นำบุญ', mvpGiftInfo, 1.0, mvp.nickname);
      }
    } catch (_) { }

    // 3. MC Voice: Announce MVP and congratulate chat (Distinguish between 100% full victory vs standard round MVP)
    if (this.meritPoints >= this.targetMeritPoints) {
      this.speakHost(`สาธุ บารมีรอบที่ ${this.roundNum} สำเร็จเต็มร้อย ยินดีกับคุณ ${mvp.nickname} ผู้นำบุญนะคะ`);
    } else {
      this.speakHost(`ยินดีกับคุณ ${mvp.nickname} ผู้นำบุญรอบนี้ ขออนุโมทนาบุญด้วยนะคะ`);
    }

    // 4. Act 2: After 3.8s, smoothly fade out MVP Modal and Unveil Fortune Scroll!
    if (this.revealStepTimer) clearTimeout(this.revealStepTimer);
    this.revealStepTimer = setTimeout(() => {
      this.revealStepTimer = null;
      if (this.dom.mvpModal) {
        this.dom.mvpModal.classList.remove('active');
        this.dom.mvpModal.classList.add('hidden');
        this.dom.mvpModal.style.display = 'none'; // Force hide synchronously: 100% immune to overlap
      }

      // Now open Fortune Scroll with zero overlapping modals (autoShowLucky = false)!
      if (this.dom.phaseText) this.dom.phaseText.textContent = 'คำทำนายเซียมซี';
      if (typeof showSeamSiFortuneScroll === 'function') {
        showSeamSiFortuneScroll(mvp.nickname, this.activeFortune, false);
      }
    }, 3800);

    // 5. Transition to next round after 10.5 seconds total
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      this.transitionToNextRound();
    }, 10500);
  }

  transitionToNextRound() {
    this.state = 'TRANSITION';
    this.gatheringDuration = 120; // Restore standard 120s gathering duration for live broadcast
    if (this.revealStepTimer) {
      clearTimeout(this.revealStepTimer);
      this.revealStepTimer = null;
    }
    if (window.videoBlessingController) window.videoBlessingController.stopMiracle();
    if (typeof hideCeremonyModals === 'function') {
      hideCeremonyModals();
    }

    // Start next round
    this.startRound(this.roundNum + 1);
  }

  syncFromRemote(data) {
    if (data?.roundNum && data.roundNum !== this.roundNum) {
      this.roundNum = data.roundNum;
      if (this.dom.num) this.dom.num.textContent = String(this.roundNum);
    }
  }

  speakHost(text) {
    try {
      if (typeof guanYinVoice !== 'undefined' && guanYinVoice && guanYinVoice.enabled) {
        if (typeof speechCoordinator === 'undefined' || !speechCoordinator || speechCoordinator.canSpeak()) {
          guanYinVoice.speak(text, 2);
        }
      }
    } catch (err) {
      console.warn('[RoundManager Speech Warning]:', err.message);
    }
  }
}

// Instantiate global RoundManager
const roundManager = new RoundManager();
window.roundManager = roundManager;
roundManager.init();

// Developer / Streamer Manual Test Helper
let _testCycleTimers = [];
window.testRoundCycle = function (fast = true) {
  if (!window.roundManager) return;
  console.log('[TestRoundCycle] Triggering test round simulation...');
  _testCycleTimers.forEach(t => clearTimeout(t));
  _testCycleTimers = [];
  if (fast) {
    window.roundManager.gatheringDuration = 14;
    window.roundManager.timeRemaining = 14;
  } else {
    window.roundManager.gatheringDuration = 120;
    window.roundManager.timeRemaining = 120;
  }
  window.roundManager.startRound(window.roundManager.roundNum);
  _testCycleTimers.push(setTimeout(() => {
    window.roundManager.addMerit({ uniqueId: 'test_user_1', nickname: 'ผู้ร่วมบุญใจดี', avatar: '/rose.png' }, 35, 'สาธุ');
  }, 2000));
  _testCycleTimers.push(setTimeout(() => {
    window.roundManager.addMerit({ uniqueId: 'test_user_2', nickname: 'มหาเศรษฐีใจบุญ', avatar: '/lucky_9.png' }, 55, 'สาธุ รวยๆ');
  }, 4500));
};

window.testShareEvent = function (name = 'ผู้เปิดสะพานบุญ') {
  if (typeof onShareEvent === 'function') {
    onShareEvent({
      uniqueId: 'sim_sharer_' + Date.now(),
      nickname: name,
      avatar: '/rose.png',
      meritDelta: 5
    });
  }
};

window.testMiracleVideo = function (tier = 'tier1') {
  if (window.videoBlessingController) {
    console.log('[TestMiracleVideo] Triggering miracle video:', tier);
    window.videoBlessingController.playMiracle(tier, () => {
      console.log('[TestMiracleVideo] Video completed:', tier);
    });
  } else {
    console.warn('[TestMiracleVideo] VideoBlessingController not initialized');
  }
};

// ── Organic Ambient Devotion & Performance Auto-Tuning Engine ────────
// Dynamically balances bot behavior, stage pacing, and render load based on real-time audience size:
// - 0-3 Viewers:  Lively mode (frequent natural bot actions & peaceful prayer bubbles to keep stream alive)
// - 4-10 Viewers: Audience-First mode (subdued bot actions, AI prioritizes real humans)
// - 11-20 Viewers: Crowded mode (rare bot devotions, strictly yielding to human devotees)
// - 20+ Viewers:  Serene Live mode (gentle ambient actions only when room is quiet, zero static screen)

function getAdaptiveAmbientConfig() {
  const viewers = (typeof currentLiveViewers === 'number' && currentLiveViewers > 0)
    ? currentLiveViewers
    : 0;

  if (viewers <= 3) {
    return {
      mode: 'lively',
      enabled: true,
      minDelay: 11000,
      randomRange: 8000, // 11s - 19s: Continuous subtle organic motion ensures TikTok AI never detects a static video loop
      allowMicroBubbles: true,
      bubbleIntervalMin: 45000,
      bubbleIntervalRange: 30000,
      quietRequired: 9000
    };
  } else if (viewers <= 10) {
    return {
      mode: 'audience_first',
      enabled: true,
      minDelay: 15000,
      randomRange: 9000, // 15s - 24s
      allowMicroBubbles: false, // 100% OFF for bot bubbles, real chatters only
      quietRequired: 14000
    };
  } else if (viewers <= 25) {
    return {
      mode: 'crowded',
      enabled: true,
      minDelay: 20000,
      randomRange: 12000, // 20s - 32s
      allowMicroBubbles: false,
      quietRequired: 18000
    };
  } else {
    // High-audience mode: Keep stage naturally alive when audience is watching quietly
    return {
      mode: 'surge',
      enabled: true,
      minDelay: 26000,
      randomRange: 14000, // 26s - 40s
      allowMicroBubbles: false,
      quietRequired: 22000
    };
  }
}

const recentAmbientDevoteeSeats = [];
let nextAmbientSeatSwapTime = Date.now() + 2000; // First brisk seat swap begins immediately after load!
let nextAmbientDevotionTime = Date.now() + 14000 + Math.random() * 6000;
let nextAmbientMicroActionTime = Date.now() + 5000;

function scheduleNextAmbientSeatSwap(extraDelayMs = 0) {
  // Fast, active 3.5s - 6.5s cadence: Keeps the congregation lively, agile & dynamic
  const baseDelay = 3500 + Math.random() * 3000;
  nextAmbientSeatSwapTime = Date.now() + baseDelay + extraDelayMs;
}

function scheduleNextAmbientDevotion(extraDelayMs = 0) {
  const cfg = getAdaptiveAmbientConfig();
  if (!cfg.enabled) {
    nextAmbientDevotionTime = Date.now() + 180000 + extraDelayMs;
    return;
  }
  const baseDelay = cfg.minDelay + Math.random() * cfg.randomRange;
  nextAmbientDevotionTime = Date.now() + baseDelay + extraDelayMs;
}

// ── Organic Congregation Seat Walk & Swap (การเดินสลับที่นั่งข้ามทางเดินพรมแดงอย่างเป็นธรรมชาติ) ──
// Causes idle devotees to stand up, walk across the central red carpet aisle, and settle into new seats.
// Generates rich, continuous 3D optical flow vectors that defeat TikTok's static video/loop classifiers.
function triggerAmbientSeatSwap() {
  // 1. Never interrupt active stage actions or donor rituals
  if (isStageActionRunning || stageActionQueue.length > 0) {
    scheduleNextAmbientSeatSwap(10000);
    return false;
  }
  // 2. Yield briefly if a live viewer gift occurred recently
  if (Date.now() - lastRitualActivityTime < 10000) {
    scheduleNextAmbientSeatSwap(8000);
    return false;
  }

  // 3. Collect idle devotees in general seats (seats 5..TOTAL_SEATS - 1)
  // NEVER touch VIP golden mats (seats 0..4)
  const candidates = [];
  for (let s = 5; s < TOTAL_SEATS; s++) {
    const d = disciplesMap.get(s);
    if (
      d &&
      !d.isWalking &&
      !d.isPerformingAltarRitual &&
      !d.isMovingSeat &&
      !d.isBowing &&
      !d._poseTimer
    ) {
      candidates.push({ seatId: s, devotee: d });
    }
  }

  if (candidates.length < 2) {
    scheduleNextAmbientSeatSwap(10000);
    return false;
  }

  // 4. Partition candidates into Left Flank (x < -0.3) and Right Flank (x > 0.3)
  // This guarantees devotees traverse the entire width of the central aisle in front of the camera!
  const leftCandidates = candidates.filter(c => {
    const layout = congregationLayout[c.seatId];
    return layout && layout.x < -0.3;
  });
  const rightCandidates = candidates.filter(c => {
    const layout = congregationLayout[c.seatId];
    return layout && layout.x > 0.3;
  });

  let candA = null;
  let candB = null;

  // Randomized pairing strategy: 65% cross-aisle, 20% diagonal depth, 15% free shuffle
  const stratRoll = Math.random();
  if (stratRoll < 0.65 && leftCandidates.length > 0 && rightCandidates.length > 0) {
    // Cross-Aisle Pairing: Traverse center aisle in front of camera
    candA = leftCandidates[Math.floor(Math.random() * leftCandidates.length)];
    candB = rightCandidates[Math.floor(Math.random() * rightCandidates.length)];
  } else if (stratRoll < 0.85 && candidates.length >= 2) {
    // Diagonal depth pairing: Sort candidates by depth/Z and pick from different rows
    const sorted = [...candidates].sort((a, b) => {
      const az = congregationLayout[a.seatId]?.z || 0;
      const bz = congregationLayout[b.seatId]?.z || 0;
      return az - bz;
    });
    const half = Math.max(1, Math.floor(sorted.length / 2));
    candA = sorted[Math.floor(Math.random() * half)];
    candB = sorted[half + Math.floor(Math.random() * (sorted.length - half))];
  } else {
    // Fallback: Pick any two distinct candidates
    const idxA = Math.floor(Math.random() * candidates.length);
    let idxB = Math.floor(Math.random() * (candidates.length - 1));
    if (idxB >= idxA) idxB++;
    candA = candidates[idxA];
    candB = candidates[idxB];
  }

  if (!candA || !candB) {
    scheduleNextAmbientSeatSwap(8000);
    return false;
  }

  const seatA = candA.seatId;
  const seatB = candB.seatId;
  const dA = candA.devotee;
  const dB = candB.devotee;

  console.log(`[Ambient] Devotees swapping seats across aisles: #${seatA} <-> #${seatB}`);

  // Atomically update seat mappings in disciplesMap
  disciplesMap.set(seatA, dB);
  disciplesMap.set(seatB, dA);

  // Devotee A stands up and begins walking across the congregation floor
  if (dA.moveToNewSeat) {
    dA.moveToNewSeat(seatB);
  }

  // Devotee B starts slightly staggered (70ms - 120ms) for an organic, human-like cadence
  const staggerMs = 70 + Math.floor(Math.random() * 50);
  setTimeout(() => {
    if (dB && dB.moveToNewSeat && !dB.isPerformingAltarRitual) {
      dB.moveToNewSeat(seatA, () => {
        scheduleNextAmbientSeatSwap();
      });
    } else {
      scheduleNextAmbientSeatSwap();
    }
  }, staggerMs);

  return true;
}

// ── Organic Ambient Devotion: Pilgrimage Walk to Altar ──
function triggerAmbientDevotion() {
  const cfg = getAdaptiveAmbientConfig();
  if (!cfg.enabled || disciplesMap.size === 0) {
    scheduleNextAmbientDevotion();
    return;
  }

  // 1. Strict Mutex & Live Gift Exclusivity:
  if (isStageActionRunning || stageActionQueue.length > 0) {
    scheduleNextAmbientDevotion(20000);
    return;
  }

  // Defer if a live gift ran recently to guarantee live gifts have 100% priority
  if (Date.now() - lastRitualActivityTime < cfg.quietRequired) {
    scheduleNextAmbientDevotion(15000);
    return;
  }

  // 2. Altar Pilgrimage Walk: A devotee walks down the red carpet to offer incense or kowtow
  const idleCandidates = [];
  disciplesMap.forEach((devotee, sId) => {
    if (
      devotee &&
      !devotee.isWalking &&
      !devotee.isBowing &&
      !devotee.isPerformingAltarRitual &&
      !devotee.isMovingSeat &&
      !devotee._poseTimer
    ) {
      idleCandidates.push({ seatId: sId, devotee });
    }
  });

  if (idleCandidates.length === 0) {
    scheduleNextAmbientDevotion(12000);
    return;
  }

  // Filter out recent performers to prevent picking the same character
  let pool = idleCandidates.filter(c => !recentAmbientDevoteeSeats.includes(c.seatId));
  if (pool.length === 0) {
    recentAmbientDevoteeSeats.splice(0, Math.ceil(recentAmbientDevoteeSeats.length / 2));
    pool = idleCandidates.filter(c => !recentAmbientDevoteeSeats.includes(c.seatId));
    if (pool.length === 0) pool = idleCandidates;
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const idleDevotee = chosen?.devotee;
  if (!idleDevotee) {
    scheduleNextAmbientDevotion(10000);
    return;
  }

  recentAmbientDevoteeSeats.push(chosen.seatId);
  if (recentAmbientDevoteeSeats.length > 12) {
    recentAmbientDevoteeSeats.shift();
  }

  // 3. Low-tier humble offerings ONLY for ambient bots (กราบเบญจางคประดิษฐ์ 1 เหรียญ และ บูชาธูปทอง 5 เหรียญ เท่านั้น - ห้ามบอทเล่นเซียมซีหรือของขวัญอื่น)
  const AMBIENT_RITUALS = [
    { type: 'kowtow', icon: '🌹', name: 'กราบเบญจางคประดิษฐ์', coins: 1 },
    { type: 'incense', icon: '🪔', name: 'บูชาธูปทอง', coins: 5 }
  ];

  const picked = AMBIENT_RITUALS[Math.floor(Math.random() * AMBIENT_RITUALS.length)];
  const donorName = idleDevotee.userData?.nickname || 'ผู้มีจิตศรัทธา';

  performStageAction(picked.type, donorName, null, {
    icon: picked.icon,
    name: picked.name,
    coins: picked.coins,
    count: 1,
    isAmbient: true
  });

  scheduleNextAmbientDevotion();
}

// ── Organic Ambient Micro-Actions (Seated Devotees Bowing & Prayer Bubbles) ──
const AMBIENT_PRAYER_BUBBLES = [
  'สาธุค่ะ 🙏',
  'กราบพระแม่กวนอิม ขอให้ครอบครัวร่มเย็นเป็นสุข ✨',
  'ขอพรให้สุขภาพแข็งแรง การงานราบรื่นนะคะ 🌿',
  'สาธุ ขอให้มีโชคลาภ เงินทองไหลมาเทมา 💰',
  'นมัสการพระแม่กวนอิม ขอให้จิตใจสงบร่มเย็นค่ะ',
  'สาธุๆๆ ขอให้ชีวิตมีแต่ความเจริญรุ่งเรืองนะคะ ✨',
  'ขอให้พบเจอแต่กัลยาณมิตรที่ดี มีความสุขค่ะ 🌸',
  'กราบสักการะ ขอให้แคล้วคลาดปลอดภัย ร่ำรวยเงินทอง 🙏'
];

function triggerAmbientMicroAction() {
  const cfg = getAdaptiveAmbientConfig();
  if (disciplesMap.size === 0) {
    nextAmbientMicroActionTime = Date.now() + 15000;
    return;
  }
  if (isStageActionRunning || stageActionQueue.length > 0) {
    nextAmbientMicroActionTime = Date.now() + 8000;
    return;
  }

  const idle = [];
  disciplesMap.forEach((d) => {
    if (d && !d.isWalking && !d.isPerformingAltarRitual && !d.isBowing && !d._poseTimer) {
      idle.push(d);
    }
  });

  if (idle.length === 0) {
    nextAmbientMicroActionTime = Date.now() + 8000;
    return;
  }

  // Pick 1 or 2 devotees to perform organic micro-actions simultaneously (lively congregation)
  const actionCount = (idle.length >= 2 && Math.random() < 0.40) ? 2 : 1;
  const pickedDevotees = [];
  for (let k = 0; k < actionCount; k++) {
    const remaining = idle.filter(d => !pickedDevotees.includes(d));
    if (remaining.length === 0) break;
    const chosen = remaining[Math.floor(Math.random() * remaining.length)];
    pickedDevotees.push(chosen);

    const isBow = !cfg.allowMicroBubbles || Math.random() < 0.88;
    if (isBow) {
      chosen.triggerBow();
      if (Math.random() < 0.35 && typeof templeAudio !== 'undefined' && templeAudio.playWoodblock) {
        templeAudio.playWoodblock();
      }
    } else if (cfg.allowMicroBubbles) {
      const text = AMBIENT_PRAYER_BUBBLES[Math.floor(Math.random() * AMBIENT_PRAYER_BUBBLES.length)];
      showDiscipleComment(chosen, text, false);
      if (Math.random() < 0.30 && typeof templeAudio !== 'undefined' && templeAudio.playLotusChime) {
        templeAudio.playLotusChime();
      }
    }
  }

  const delay = 3500 + Math.random() * 3500;
  nextAmbientMicroActionTime = Date.now() + delay;
}

// Expose testing hooks for DevTools verification
window.triggerAmbientSeatSwap = triggerAmbientSeatSwap;
window.triggerAmbientDevotion = triggerAmbientDevotion;

setInterval(() => {
  // 1. Live Clock Precision Second Tick (Guarantees macroblock change every 1s)
  updateLiveClock();

  // 2. Organic Cross-Aisle Devotee Walking & Seat Swapping (Every 14-22s, initial 4.5s)
  if (Date.now() >= nextAmbientSeatSwapTime) {
    triggerAmbientSeatSwap();
  }

  // 3. Organic Ambient Altar Pilgrimage (Every 35-50s)
  if (Date.now() >= nextAmbientDevotionTime) {
    triggerAmbientDevotion();
  }

  // 4. Ambient Micro Actions (Gentle bowing & prayer bubbles when room is quiet)
  if (Date.now() >= nextAmbientMicroActionTime) {
    triggerAmbientMicroAction();
  }
}, 1000);

// ---------------------------------------------------------------------
// Background Video Autoplay & Seamless Loop Watchdog
// Guarantees continuous 60FPS playback across OBS / TikTok LIVE Studio
// ---------------------------------------------------------------------
const bgVideoEl = document.getElementById('bg-video');
const bgParadiseImg = document.getElementById('bg-paradise-img');

// Trigger background video sync on server & tts_worker
try {
  fetch('/api/sync-bg-video').catch(() => { });
  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'ซิงค์สวรรค์' + Date.now() })
  }).catch(() => { });
} catch (_) { }

// Celestial Paradise Sanctuary Background Image Engine
if (bgParadiseImg) {
  bgParadiseImg.style.display = 'block';
}
if (bgVideoEl) {
  bgVideoEl.style.display = 'block';
  try { bgVideoEl.pause(); } catch (_) { }
}

// ---------------------------------------------------------------------
// Heavenly Paradise Sanctuary Lotus Petals & Golden Stardust Engine
// ---------------------------------------------------------------------
function initCelestialPetalsAndStardust() {
  const container = document.getElementById('celestial-petals-container');
  if (!container) return;

  const MAX_PETALS = 18;
  const MAX_STARDUST = 14;

  function spawnPetal() {
    if (!container || container.childElementCount >= (MAX_PETALS + MAX_STARDUST)) return;
    const petal = document.createElement('div');
    petal.className = 'celestial-petal';
    const startX = Math.random() * 95;
    const size = 9 + Math.random() * 11;
    const duration = 14 + Math.random() * 16;
    const delay = Math.random() * 3;

    petal.style.left = `${startX}%`;
    petal.style.top = `-25px`;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 0.7}px`;
    petal.style.animationDuration = `${duration}s`;
    petal.style.animationDelay = `${delay}s`;

    container.appendChild(petal);
    setTimeout(() => {
      if (petal.parentNode) petal.parentNode.removeChild(petal);
    }, (duration + delay + 1) * 1000);
  }

  function spawnStardust() {
    if (!container || container.childElementCount >= (MAX_PETALS + MAX_STARDUST)) return;
    const star = document.createElement('div');
    star.className = 'celestial-stardust';
    const startX = Math.random() * 95;
    const size = 3 + Math.random() * 5;
    const duration = 12 + Math.random() * 14;
    const delay = Math.random() * 2;

    star.style.left = `${startX}%`;
    star.style.top = `102%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.animationDuration = `${duration}s`;
    star.style.animationDelay = `${delay}s`;

    container.appendChild(star);
    setTimeout(() => {
      if (star.parentNode) star.parentNode.removeChild(star);
    }, (duration + delay + 1) * 1000);
  }

  // Seed initial particles
  for (let i = 0; i < 8; i++) {
    spawnPetal();
    spawnStardust();
  }

  // Continuous gentle breeze replenishment
  setInterval(() => {
    if (document.hidden) return;
    if (Math.random() < 0.75) spawnPetal();
    if (Math.random() < 0.65) spawnStardust();
  }, 1600);
}
initCelestialPetalsAndStardust();

// Ensure Heavenly Paradise background is synced from server
try {
  fetch('/api/sync-paradise-bg').catch(() => { });
} catch (_) { }

// =====================================================================
// 9. HEAVENLY GIFT FX LAYER — เลเยอร์เอฟเฟคดินแดนสวรรค์สำหรับของขวัญทั้ง 10 ระดับ
//    (เสริมทับเอฟเฟคเดิม ไม่แก้ตรรกะเดิม: แสงเทพ, มณฑลธรรม, ละอองบุปผา, เมฆทิพย์, โคมลอย,
//     เหรียญทอง, นกกระเรียน, รุ้งทิพย์, อักขระมงคล ฯลฯ)
//    ทดสอบจาก console ได้ด้วย: heavenlyFX.play('dragon')
//    ระดับ: incense lotus flowers golden_bell crystal_fountain royal_carriage
//           fireworks castle dragon seamsi
// =====================================================================
function createHeavenlyFX(THREE, scene, camera, opts = {}) {
  const ADD = THREE.AdditiveBlending;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const TAU = Math.PI * 2;

  const PAL = {
    gold: 0xffd25a, amber: 0xffb347, white: 0xffffff, cream: 0xfff2c4,
    pink: 0xff8fc4, rose: 0xff5d8f, red: 0xff4d4d, jade: 0x6ee7b7,
    sky: 0x9fd8ff, violet: 0xc4a1ff, orange: 0xff8a2a
  };
  const RAINBOW = [0xff6b6b, 0xffb347, 0xffe66d, 0x7be495, 0x6ec6ff, 0x9d8cff, 0xff8fe0];

  // ------------------------------------------------------------------
  // Procedural textures (cached, shared)
  // ------------------------------------------------------------------
  const cache = {};
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }
  const T = {
    glow() {
      return cache.glow || (cache.glow = canvasTex(128, 128, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.22, 'rgba(255,255,255,0.55)');
        gr.addColorStop(0.55, 'rgba(255,255,255,0.14)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }));
    },
    spark() {
      return cache.spark || (cache.spark = canvasTex(128, 128, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 30);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        [[0, 1.0, 0.07], [Math.PI / 2, 1.0, 0.07], [Math.PI / 4, 0.55, 0.05], [-Math.PI / 4, 0.55, 0.05]].forEach(([ang, len, th]) => {
          g.save(); g.translate(cx, cy); g.rotate(ang); g.scale(1, th);
          const sg = g.createRadialGradient(0, 0, 0, 0, 0, 62 * len);
          sg.addColorStop(0, 'rgba(255,255,255,1)');
          sg.addColorStop(0.5, 'rgba(255,255,255,0.5)');
          sg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 62 * len, 0, TAU); g.fill();
          g.restore();
        });
      }));
    },
    ring() {
      return cache.ring || (cache.ring = canvasTex(256, 256, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,0.05)');
        gr.addColorStop(0.72, 'rgba(255,255,255,0.08)');
        gr.addColorStop(0.86, 'rgba(255,255,255,0.95)');
        gr.addColorStop(0.93, 'rgba(255,255,255,0.35)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }));
    },
    beam() {
      return cache.beam || (cache.beam = canvasTex(64, 256, (g, w, h) => {
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          const v = y / (h - 1); // 0 top .. 1 bottom
          const av = Math.pow(v, 1.15) * Math.min(1, (1 - v) / 0.04 + 0.0);
          for (let x = 0; x < w; x++) {
            const hx = 1 - Math.abs((x / (w - 1)) * 2 - 1);
            const a = Math.pow(hx, 1.6) * Math.min(1, av);
            const i = (y * w + x) * 4;
            img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
            img.data[i + 3] = Math.round(255 * a);
          }
        }
        g.putImageData(img, 0, 0);
      }));
    },
    petal() {
      return cache.petal || (cache.petal = canvasTex(96, 144, (g, w, h) => {
        const gr = g.createLinearGradient(0, h, 0, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)');
        gr.addColorStop(0.55, 'rgba(255,240,245,0.95)');
        gr.addColorStop(1, 'rgba(255,200,220,0.9)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(w / 2, h * 0.96);
        g.bezierCurveTo(w * 0.02, h * 0.7, w * 0.0, h * 0.25, w / 2, h * 0.03);
        g.bezierCurveTo(w * 1.0, h * 0.25, w * 0.98, h * 0.7, w / 2, h * 0.96);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(w / 2, h * 0.92); g.lineTo(w / 2, h * 0.14); g.stroke();
      }));
    },
    mandala() {
      return cache.mandala || (cache.mandala = canvasTex(512, 512, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 8;
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.fillStyle = 'rgba(255,255,255,0.9)';
        [248, 240, 205, 199, 122, 117, 56].forEach((r, i) => { g.lineWidth = i % 2 ? 1.5 : 3; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); });
        for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; g.beginPath(); g.arc(cx + Math.cos(a) * 222, cy + Math.sin(a) * 222, 3.4, 0, TAU); g.fill(); }
        const petals = (n, r0, r1, wid, lw) => {
          g.lineWidth = lw;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            g.save(); g.translate(cx, cy); g.rotate(a);
            g.beginPath(); g.moveTo(r0, 0);
            g.bezierCurveTo(r0 + (r1 - r0) * 0.35, -wid, r0 + (r1 - r0) * 0.8, -wid * 0.6, r1, 0);
            g.bezierCurveTo(r0 + (r1 - r0) * 0.8, wid * 0.6, r0 + (r1 - r0) * 0.35, wid, r0, 0);
            g.stroke(); g.restore();
          }
        };
        petals(16, 128, 196, 22, 2.4);
        petals(8, 62, 120, 28, 3);
        petals(24, 206, 244, 9, 1.8);
        // 12-point star polygon {12/5}
        g.lineWidth = 1.4; g.beginPath();
        for (let i = 0; i <= 12; i++) { const a = ((i * 5) % 12) / 12 * TAU; const x = cx + Math.cos(a) * 112, y = cy + Math.sin(a) * 112; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        const cg = g.createRadialGradient(cx, cy, 0, cx, cy, 56);
        cg.addColorStop(0, 'rgba(255,255,255,0.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        g.shadowBlur = 0; g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, 56, 0, TAU); g.fill();
      }));
    },
    rays() {
      return cache.rays || (cache.rays = canvasTex(512, 512, (g, w, h) => {
        const cx = w / 2, cy = h / 2, R = w / 2;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)');
        gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        gr.addColorStop(0.8, 'rgba(255,255,255,0.12)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        const N = 28;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * TAU, half = (i % 2 ? 0.045 : 0.075);
          g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a - half, a + half); g.closePath(); g.fill();
        }
      }));
    },
    rainbow() {
      return cache.rainbow || (cache.rainbow = canvasTex(512, 290, (g, w, h) => {
        const cx = w / 2, cy = h - 4;
        RAINBOW.forEach((c, i) => {
          const col = '#' + c.toString(16).padStart(6, '0');
          g.strokeStyle = col; g.globalAlpha = 0.62; g.lineWidth = 15;
          g.shadowColor = col; g.shadowBlur = 14;
          g.beginPath(); g.arc(cx, cy, 236 - i * 14.5, Math.PI, TAU); g.stroke();
        });
        g.globalAlpha = 1;
      }));
    },
    bird(up) {
      const k = up ? 'birdUp' : 'birdDn';
      return cache[k] || (cache[k] = canvasTex(256, 128, (g, w, h) => {
        g.shadowColor = 'rgba(255,225,140,0.95)'; g.shadowBlur = 10;
        g.fillStyle = 'rgba(255,255,255,0.97)';
        const dir = up ? -1 : 1;
        g.beginPath(); g.ellipse(128, 70, 30, 8, 0, 0, TAU); g.fill(); // body
        g.beginPath(); g.moveTo(150, 68); g.quadraticCurveTo(178, 62, 190, 52); g.lineTo(194, 55); g.quadraticCurveTo(180, 70, 152, 74); g.fill(); // neck
        g.beginPath(); g.ellipse(192, 52, 6, 4.5, -0.3, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,200,90,0.95)'; g.beginPath(); g.moveTo(197, 51); g.lineTo(212, 54); g.lineTo(197, 55); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.97)';
        [-1, 1].forEach((sd) => { // wings
          g.beginPath(); g.moveTo(128, 68);
          g.quadraticCurveTo(128 + sd * 40, 68 + dir * 44, 128 + sd * 98, 68 + dir * 28 + (up ? 6 : -4));
          g.quadraticCurveTo(128 + sd * 52, 68 + dir * 10, 128, 76); g.fill();
        });
        g.beginPath(); g.moveTo(100, 70); g.lineTo(58, 84); g.lineTo(100, 76); g.fill(); // tail legs
      }));
    },
    coin() {
      return cache.coin || (cache.coin = canvasTex(96, 96, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        const gr = g.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, 44);
        gr.addColorStop(0, '#fff7c2'); gr.addColorStop(0.55, '#ffd34d'); gr.addColorStop(1, '#c98a0c');
        g.shadowColor = 'rgba(255,220,110,0.9)'; g.shadowBlur = 8;
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 40, 0, TAU); g.fill();
        g.shadowBlur = 0; g.strokeStyle = '#8a5a00'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 39, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,248,200,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 31, 0, TAU); g.stroke();
        g.globalCompositeOperation = 'destination-out'; g.fillRect(cx - 9, cy - 9, 18, 18);
        g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#8a5a00'; g.lineWidth = 2; g.strokeRect(cx - 9, cy - 9, 18, 18);
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 24, Math.PI * 1.1, Math.PI * 1.55); g.stroke();
      }));
    },
    lantern() {
      return cache.lantern || (cache.lantern = canvasTex(128, 192, (g, w, h) => {
        const cx = w / 2;
        const gl = g.createRadialGradient(cx, 112, 4, cx, 112, 70);
        gl.addColorStop(0, 'rgba(255,190,80,0.75)'); gl.addColorStop(1, 'rgba(255,150,40,0)');
        g.fillStyle = gl; g.fillRect(0, 30, w, h);
        const body = g.createLinearGradient(0, 40, 0, 160);
        body.addColorStop(0, '#ffe9a0'); body.addColorStop(0.5, '#ffb347'); body.addColorStop(1, '#ff8a1f');
        g.fillStyle = body; g.beginPath();
        g.moveTo(34, 42); g.lineTo(94, 42); g.lineTo(106, 152); g.quadraticCurveTo(cx, 164, 22, 152); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(160,70,0,0.55)'; g.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 10, 42); g.lineTo(cx + i * 17, 156); g.stroke(); }
        g.fillStyle = '#b3541a'; g.beginPath(); g.ellipse(cx, 42, 30, 6, 0, 0, TAU); g.fill();
        const fl = g.createRadialGradient(cx, 150, 0, cx, 150, 22);
        fl.addColorStop(0, 'rgba(255,255,230,1)'); fl.addColorStop(1, 'rgba(255,200,80,0)');
        g.fillStyle = fl; g.beginPath(); g.arc(cx, 150, 22, 0, TAU); g.fill();
      }));
    },
    heart() {
      return cache.heart || (cache.heart = canvasTex(128, 128, (g, w, h) => {
        g.shadowColor = 'rgba(255,170,200,1)'; g.shadowBlur = 16;
        const gr = g.createRadialGradient(64, 54, 4, 64, 64, 56);
        gr.addColorStop(0, '#fff3f7'); gr.addColorStop(0.5, '#ff9cc2'); gr.addColorStop(1, '#ff5d8f');
        g.fillStyle = gr; g.beginPath(); g.moveTo(64, 108);
        g.bezierCurveTo(8, 70, 14, 22, 46, 22); g.bezierCurveTo(58, 22, 64, 32, 64, 38);
        g.bezierCurveTo(64, 32, 70, 22, 82, 22); g.bezierCurveTo(114, 22, 120, 70, 64, 108); g.fill();
        g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3;
        g.beginPath(); g.arc(44, 44, 14, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
      }));
    },
    cloud(variant = 0) {
      const k = 'cloud' + (variant % 3);
      return cache[k] || (cache[k] = canvasTex(256, 160, (g, w, h) => {
        let seed = 17 + variant * 31;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 22; i++) {
          const x = w / 2 + (rnd() - 0.5) * 150, y = h / 2 + (rnd() - 0.5) * 50, r = 24 + rnd() * 34;
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, 'rgba(255,255,255,0.30)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        }
      }));
    },
    glyph(text, hue = '#ffe27a') {
      const k = 'glyph:' + text + hue;
      return cache[k] || (cache[k] = canvasTex(384, 160, (g, w, h) => {
        g.textAlign = 'center'; g.textBaseline = 'middle';
        let fs = 84;
        const fam = "Sarabun,'Noto Serif Thai','Noto Sans Thai',Loma,Garuda,Tahoma,sans-serif";
        g.font = '700 ' + fs + 'px ' + fam;
        while (g.measureText(text).width > w - 56 && fs > 30) { fs -= 4; g.font = '700 ' + fs + 'px ' + fam; }
        g.shadowColor = hue; g.shadowBlur = 26;
        g.lineWidth = 8; g.strokeStyle = 'rgba(120,20,10,0.85)'; g.strokeText(text, w / 2, h / 2 + 4);
        const gr = g.createLinearGradient(0, 40, 0, 120);
        gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.5, hue); gr.addColorStop(1, '#ff9d2e');
        g.fillStyle = gr; g.fillText(text, w / 2, h / 2 + 4);
      }));
    }
  };

  // ------------------------------------------------------------------
  // Engine: pooled-by-lifetime sprites / meshes + timers
  // ------------------------------------------------------------------
  const MAX_ITEMS = 1200;
  const items = [];
  const timers = [];
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const planeBottomGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  let running = false;
  let manual = !!opts.manual;
  let lastT = 0;

  const env = (u, fi, fo) => (u < fi ? u / Math.max(fi, 1e-4) : (u > 1 - fo ? Math.max(0, (1 - u) / Math.max(fo, 1e-4)) : 1));

  function later(sec, fn) { timers.push({ t: sec, fn }); kick(); }

  function addSprite(o) {
    if (items.length >= MAX_ITEMS) return null;
    const mat = new THREE.SpriteMaterial({
      map: o.tex, color: o.color == null ? 0xffffff : o.color, transparent: true, opacity: 0,
      blending: o.normal ? THREE.NormalBlending : ADD, depthWrite: false,
      depthTest: o.depthTest == null ? true : o.depthTest, toneMapped: false, rotation: o.rot || 0
    });
    const s = new THREE.Sprite(mat);
    s.renderOrder = o.order == null ? 50 : o.order;
    s.visible = !(o.delay > 0);
    s.position.set(o.x || 0, o.y || 0, o.z || 0);
    const s0 = o.s0 == null ? 1 : o.s0;
    s.scale.set(s0 * (o.aspect || 1), s0, 1);
    scene.add(s);
    const p = {
      kind: 's', obj: s, mat, t: 0, life: o.life || 2, delay: o.delay || 0,
      x: o.x || 0, y: o.y || 0, z: o.z || 0,
      vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, ax: o.ax || 0, ay: o.ay || 0, az: o.az || 0,
      drag: o.drag || 0, s0, s1: o.s1 == null ? s0 : o.s1, aspect: o.aspect || 1,
      a: o.a == null ? 1 : o.a, fi: o.fi == null ? 0.15 : o.fi, fo: o.fo == null ? 0.4 : o.fo,
      rot: o.rot || 0, vrot: o.vrot || 0, tw: o.tw || 0, ph: Math.random() * TAU,
      sw: o.sw ? Object.assign({ ang: 0, w: 1, r: 1, dr: 0, cx: 0, cy: 0, cz: 0, rise: 0, plane: 'xz', squash: 0.55 }, o.sw) : null,
      fl: o.fl || null, spin: o.spin || 0, flap: o.flap || 0, flapTex: o.flapTex || null, _fm: -1
    };
    items.push(p); kick();
    return p;
  }

  function addPlane(o) {
    if (items.length >= MAX_ITEMS) return null;
    const mat = new THREE.MeshBasicMaterial({
      map: o.tex, color: o.color == null ? 0xffffff : o.color, transparent: true, opacity: 0,
      blending: ADD, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      depthTest: o.depthTest == null ? true : o.depthTest
    });
    const m = new THREE.Mesh(o.bottom ? planeBottomGeo : planeGeo, mat);
    m.renderOrder = o.order == null ? 40 : o.order;
    m.position.set(o.x || 0, o.y || 0, o.z || 0);
    m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    m.visible = !(o.delay > 0);
    scene.add(m);
    const p = {
      kind: 'm', obj: m, mat, t: 0, life: o.life || 2, delay: o.delay || 0,
      w0: o.w0 == null ? 1 : o.w0, w1: o.w1 == null ? (o.w0 == null ? 1 : o.w0) : o.w1,
      h0: o.h0 == null ? (o.w0 == null ? 1 : o.w0) : o.h0, h1: o.h1 == null ? (o.h0 == null ? (o.w1 == null ? (o.w0 == null ? 1 : o.w0) : o.w1) : o.h0) : o.h1,
      a: o.a == null ? 1 : o.a, fi: o.fi == null ? 0.15 : o.fi, fo: o.fo == null ? 0.4 : o.fo,
      spin: o.spin || 0, rz: o.rz || 0, tw: o.tw || 0, ph: Math.random() * TAU, vy: o.vy || 0, y: o.y || 0
    };
    m.scale.set(p.w0, p.h0, 1);
    items.push(p); kick();
    return p;
  }

  function stepItem(p, dt) {
    if (p.delay > 0) {
      p.delay -= dt;
      if (p.delay > 0) return true;
      p.obj.visible = true;
    }
    p.t += dt;
    const u = p.t / p.life;
    if (u >= 1) return false;
    const e = ease(u);
    let a = env(u, p.fi, p.fo) * p.a;
    if (p.tw) a *= 0.65 + 0.35 * Math.sin(p.t * p.tw + p.ph);
    if (p.kind === 's') {
      p.vx += p.ax * dt; p.vy += p.ay * dt; p.vz += p.az * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      let X = p.x, Y = p.y, Z = p.z;
      if (p.sw) {
        const w = p.sw;
        w.ang += w.w * dt; w.r += w.dr * dt; w.cy += w.rise * dt;
        if (w.plane === 'xy') { X = w.cx + Math.cos(w.ang) * w.r; Y = w.cy + Math.sin(w.ang) * w.r; Z = w.cz; }
        else { X = w.cx + Math.cos(w.ang) * w.r; Z = w.cz + Math.sin(w.ang) * w.r * w.squash; Y = w.cy; }
      }
      if (p.fl) { X += Math.sin(p.t * p.fl.f + p.ph) * p.fl.a; Z += Math.cos(p.t * p.fl.f * 0.7 + p.ph) * p.fl.a * 0.4; }
      p.obj.position.set(X, Y, Z);
      const sc = lerp(p.s0, p.s1, e);
      const sx = p.spin ? Math.max(0.12, Math.abs(Math.cos(p.t * p.spin + p.ph))) : 1;
      p.obj.scale.set(sc * p.aspect * sx, sc, 1);
      if (p.vrot) p.mat.rotation = p.rot + p.vrot * p.t;
      if (p.flap && p.flapTex) {
        const fm = (Math.floor(p.t * p.flap + p.ph) & 1);
        if (fm !== p._fm) { p._fm = fm; p.mat.map = p.flapTex[fm]; }
      }
    } else {
      p.obj.scale.set(lerp(p.w0, p.w1, e), lerp(p.h0, p.h1, e), 1);
      if (p.spin) p.obj.rotation.z = p.rz + p.spin * p.t;
      if (p.vy) p.obj.position.y = p.y + p.vy * p.t;
    }
    p.mat.opacity = a;
    return true;
  }

  function disposeItem(p) {
    scene.remove(p.obj);
    p.mat.dispose();
  }

  function tick(dt) {
    for (let i = timers.length - 1; i >= 0; i--) {
      timers[i].t -= dt;
      if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); try { f(); } catch (err) { console.warn('[HeavenlyFX]', err); } }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      if (!stepItem(items[i], dt)) { disposeItem(items[i]); items.splice(i, 1); }
    }
  }

  function loop(now) {
    if (manual) { running = false; return; }
    const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000 || 0.016));
    lastT = now;
    tick(dt);
    if (items.length || timers.length) requestAnimationFrame(loop); else running = false;
  }
  function kick() {
    if (running || manual) return;
    running = true; lastT = performance.now();
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------
  // Screen anchors (derived from the live camera → always aligned with the 9:16 backdrop)
  // ------------------------------------------------------------------
  const _v = new THREE.Vector3(), _d = new THREE.Vector3();
  function A(nx, ny, z = 0) {
    camera.updateMatrixWorld(true);
    _v.set(nx, ny, 0.5).unproject(camera);
    _d.copy(_v).sub(camera.position).normalize();
    const k = (z - camera.position.z) / _d.z;
    return { x: camera.position.x + _d.x * k, y: camera.position.y + _d.y * k, z };
  }
  const anchors = () => ({
    halo: A(0, 0.74, -1.2),   // เศียรพระแม่กวนอิม / วงรัศมี
    chest: A(0, 0.50, -0.6),  // องค์พระ
    lotus: A(0, 0.12, 0.2),   // ฐานบัวทอง
    sky: (nx, ny, z = 0.5) => A(nx, ny, z)
  });

  // ------------------------------------------------------------------
  // Reusable heavenly building blocks
  // ------------------------------------------------------------------
  function flash(p, color, size, life = 1.1, a = 0.95, delay = 0) {
    addSprite({ tex: T.glow(), color, x: p.x, y: p.y, z: p.z, s0: size * 0.35, s1: size, life, a: a * 0.55, fi: 0.08, fo: 0.9, delay, order: 70 });
  }
  function starburst(p, color, size, life = 1.4, delay = 0) {
    addSprite({ tex: T.spark(), color, x: p.x, y: p.y, z: p.z, s0: size * 0.2, s1: size, life, a: 1, fi: 0.1, fo: 0.7, vrot: 0.6, delay, order: 72 });
    addSprite({ tex: T.spark(), color: PAL.white, x: p.x, y: p.y, z: p.z + 0.01, s0: size * 0.1, s1: size * 0.55, life: life * 0.8, a: 1, fi: 0.1, fo: 0.7, vrot: -0.9, delay, order: 73 });
  }
  function raysHalo(p, color, size, life, a = 0.5, spin = 0.28, delay = 0) {
    addSprite({ tex: T.rays(), color, x: p.x, y: p.y, z: p.z, s0: size * 0.75, s1: size, life, a, fi: 0.2, fo: 0.4, vrot: spin, delay, order: 20 });
    addSprite({ tex: T.rays(), color: PAL.white, x: p.x, y: p.y, z: p.z + 0.02, s0: size * 0.5, s1: size * 0.7, life, a: a * 0.35, fi: 0.2, fo: 0.4, vrot: -spin * 1.6, delay, order: 21 });
  }
  function ringWave(p, color, size, life, a = 0.9, flat = false, delay = 0) {
    if (flat) {
      addPlane({ tex: T.ring(), color, x: p.x, y: p.y + 0.03, z: p.z, rx: -Math.PI / 2, w0: size * 0.12, w1: size, life, a, fi: 0.06, fo: 0.8, delay, order: 30 });
    } else {
      addSprite({ tex: T.ring(), color, x: p.x, y: p.y, z: p.z, s0: size * 0.12, s1: size, life, a, fi: 0.06, fo: 0.8, delay, order: 60 });
    }
  }
  function mandalaFloor(p, color, size, life, spin = 0.35, a = 0.85, delay = 0) {
    addPlane({ tex: T.mandala(), color, x: p.x, y: p.y + 0.04, z: p.z, rx: -Math.PI / 2, w0: size * 0.6, w1: size, life, a, fi: 0.18, fo: 0.35, spin, delay, order: 31 });
    addPlane({ tex: T.glow(), color, x: p.x, y: p.y + 0.035, z: p.z, rx: -Math.PI / 2, w0: size * 1.1, w1: size * 1.35, life, a: a * 0.55, fi: 0.2, fo: 0.4, delay, order: 29 });
  }
  function pillar(p, color, h, w, life, a = 0.7, delay = 0) {
    a *= 0.55;
    [-0.55, 0.55].forEach((ry) => addPlane({ tex: T.beam(), color, x: p.x, y: p.y, z: p.z, ry, bottom: true, w0: w * 0.55, w1: w, h0: h * 0.3, h1: h, life, a, fi: 0.18, fo: 0.45, delay, tw: 2.6, order: 25 }));
  }
  function sparkles(p, n, o = {}) {
    const cols = o.colors || [PAL.gold, PAL.cream, PAL.white];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * TAU, sp = rand(o.v0 || 0.2, o.v1 || 1.2), up = rand(o.up0 == null ? 0.2 : o.up0, o.up1 == null ? 1.4 : o.up1);
      const sz = rand(o.s0 || 0.12, o.s1 || 0.3);
      addSprite({
        tex: T.spark(), color: pick(cols),
        x: p.x + rand(-(o.spread || 0.3), o.spread || 0.3), y: p.y + rand(-(o.spreadY || 0.1), o.spreadY || 0.1), z: p.z + rand(-(o.spread || 0.3), o.spread || 0.3),
        vx: Math.cos(ang) * sp, vy: up, vz: Math.sin(ang) * sp * 0.5, ay: o.g == null ? -0.2 : o.g, drag: o.drag || 0,
        s0: sz, s1: sz * 0.4, life: rand(o.l0 || 1.4, o.l1 || 2.8), a: 1, fi: 0.08, fo: 0.55, tw: rand(6, 14),
        delay: o.delay ? rand(0, o.delay) : 0, order: 65
      });
    }
  }
  function petals(n, o = {}) {
    const cols = o.colors || [PAL.pink, PAL.white, PAL.rose, PAL.gold];
    for (let i = 0; i < n; i++) {
      const sz = rand(o.s0 || 0.16, o.s1 || 0.3);
      const sw = o.swirl ? { cx: o.swirl.x, cy: o.swirl.y + rand(0, 0.3), cz: o.swirl.z, ang: rand(0, TAU), w: rand(0.9, 1.7) * (Math.random() < 0.5 ? 1 : -1) * (o.swirl.dir || 1), r: o.swirl.r * rand(0.7, 1.1), dr: o.swirl.dr || 0, rise: rand(o.swirl.rise0 || 0.4, o.swirl.rise1 || 0.9) } : null;
      addSprite({
        tex: T.petal(), color: pick(cols), normal: true, aspect: 0.66,
        x: sw ? 0 : rand(o.x0, o.x1), y: sw ? 0 : rand(o.y0, o.y1), z: sw ? 0 : rand(o.z0, o.z1),
        vx: rand(-0.15, 0.15), vy: sw ? 0 : -rand(o.fall0 || 0.8, o.fall1 || 1.6), vz: 0, sw,
        s0: sz, s1: sz * 0.9, rot: rand(0, TAU), vrot: rand(-2.4, 2.4), fl: { f: rand(1.6, 3.2), a: o.flutter == null ? 0.16 : o.flutter },
        life: rand(o.l0 || 3, o.l1 || 5), a: 0.95, fi: 0.12, fo: 0.3, delay: o.delay ? rand(0, o.delay) : 0, order: 55
      });
    }
  }
  function coins(n, o) {
    for (let i = 0; i < n; i++) {
      const sz = rand(0.17, 0.28);
      addSprite({
        tex: T.coin(), normal: true, x: rand(o.x0, o.x1), y: rand(o.y0, o.y1), z: rand(o.z0, o.z1),
        vx: rand(-0.2, 0.2), vy: -rand(2.2, 3.8), s0: sz, s1: sz, spin: rand(5, 11),
        life: rand(o.l0 || 2.4, o.l1 || 3.8), a: 1, fi: 0.05, fo: 0.18, delay: rand(0, o.delay || 3), order: 58
      });
    }
  }
  function birds(n, from, to, y, z, life, delay = 0) {
    for (let i = 0; i < n; i++) {
      const row = i === 0 ? 0 : Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      const dir = Math.sign(to - from);
      const sz = rand(0.55, 0.75);
      addSprite({
        tex: T.bird(true), flapTex: [T.bird(true), T.bird(false)], flap: rand(3.4, 4.4),
        x: from - dir * row * 0.55, y: y + row * 0.18 * side + rand(-0.05, 0.05), z: z + row * 0.1 * side,
        vx: (to - from) / life, vy: 0.05, s0: sz, s1: sz * 0.9, aspect: dir < 0 ? -2 : 2,
        life, a: 0.95, fi: 0.15, fo: 0.2, delay: delay + row * 0.08, normal: true, order: 52
      });
    }
  }
  function lanterns(n, o) {
    for (let i = 0; i < n; i++) {
      const sz = rand(0.38, 0.62);
      addSprite({
        tex: T.lantern(), aspect: 0.66, x: rand(o.x0, o.x1), y: rand(o.y0, o.y1), z: rand(o.z0, o.z1),
        vx: rand(-0.1, 0.25), vy: rand(0.55, 1.05), s0: sz, s1: sz * 0.7, life: rand(o.l0 || 5, o.l1 || 7.5),
        a: 1, fi: 0.15, fo: 0.35, tw: rand(2.5, 4.5), fl: { f: rand(0.8, 1.6), a: 0.14 }, delay: rand(0, o.delay || 2.5), order: 54
      });
    }
  }
  function hearts(n, o) {
    for (let i = 0; i < n; i++) {
      const sz = rand(0.2, 0.42);
      addSprite({
        tex: T.heart(), x: rand(o.x0, o.x1), y: rand(o.y0, o.y1), z: rand(o.z0, o.z1),
        vx: rand(-0.12, 0.12), vy: rand(0.5, 1.1), s0: sz * 0.5, s1: sz, rot: rand(-0.4, 0.4), vrot: rand(-0.6, 0.6),
        fl: { f: rand(1.4, 2.6), a: 0.18 }, life: rand(3.4, 5), a: 0.95, fi: 0.2, fo: 0.35, delay: rand(0, o.delay || 2), order: 56
      });
    }
  }
  function glyph(text, p, rise, size, life, hue = '#ffe27a', delay = 0) {
    addSprite({ tex: T.glyph(text, hue), aspect: 2.4, x: p.x, y: p.y, z: p.z, vy: rise, s0: size * 0.7, s1: size, life, a: 1, fi: 0.2, fo: 0.4, delay, order: 80, depthTest: false });
  }
  function mist(p, n, color, spread, life, size = 2.6, a = 0.5, delay = 0) {
    for (let i = 0; i < n; i++) {
      addSprite({
        tex: T.cloud(i), color, x: p.x + rand(-spread, spread), y: p.y + rand(-0.15, 0.25), z: p.z + rand(-0.8, 0.8),
        vx: rand(-0.25, 0.25), vy: rand(0.02, 0.12), s0: size * rand(0.7, 1), s1: size * rand(1.2, 1.6), aspect: 1.6,
        life: life * rand(0.85, 1.1), a: a * 0.42 * rand(0.7, 1), fi: 0.3, fo: 0.4, delay: delay + rand(0, 0.8), order: 22
      });
    }
  }
  function fireflies(p, n, color, spread, life) {
    for (let i = 0; i < n; i++) {
      const sz = rand(0.1, 0.2);
      addSprite({
        tex: T.glow(), color: pick([color, PAL.gold, PAL.white]), x: p.x + rand(-spread, spread), y: p.y + rand(0, 2.0), z: p.z + rand(-spread * 0.6, spread * 0.6),
        vx: rand(-0.3, 0.3), vy: rand(0.0, 0.3), s0: sz, s1: sz, life: life * rand(0.7, 1), a: 1, fi: 0.2, fo: 0.3, tw: rand(3, 7), fl: { f: rand(1, 2.4), a: 0.3 }, delay: rand(0, 1.5), order: 62
      });
    }
  }
  function rainbow(p, size, life, a = 0.75, delay = 0) {
    addSprite({ tex: T.rainbow(), x: p.x, y: p.y, z: p.z, aspect: 1.77, s0: size * 0.85, s1: size, life, a, fi: 0.3, fo: 0.4, delay, order: 18 });
  }
  function peony(p, n, colors, life = 2.6, power = 3.4, delay = 0) {
    flash(p, colors[0], 3.2, 1.0, 0.8, delay);
    ringWave(p, colors[1] || PAL.white, 3.6, 1.1, 0.9, false, delay);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + rand(-0.04, 0.04), ring = i % 3, sp = power * (0.55 + ring * 0.25);
      const col = colors[i % colors.length];
      const common = { x: p.x, y: p.y, z: p.z, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vz: 0, ay: -0.8, drag: 0.95, life: life * rand(0.85, 1.1), delay };
      // แกนสีสด (blend ปกติ → เห็นชัดบนท้องฟ้าสีทอง) + ประกายดาวสว่างซ้อนบน
      addSprite(Object.assign({ tex: T.glow(), color: col, normal: true, s0: 0.55, s1: 0.16, a: 1, fi: 0.04, fo: 0.6, order: 67 }, common));
      if (i % 2 === 0) addSprite(Object.assign({ tex: T.spark(), color: PAL.white, s0: 0.4, s1: 0.12, a: 1, fi: 0.04, fo: 0.6, tw: 12, order: 68 }, common));
    }
  }

  // Screen-space (CSS) overlay → subtle god-ray veil + coloured bloom around the whole frame
  function screenFx(tier, dur) {
    try {
      const host = document.getElementById('stream-container') || document.body;
      const el = document.createElement('div');
      el.className = 'hfx-screen hfx-' + tier;
      el.style.setProperty('--hfx-dur', dur + 's');
      el.innerHTML = '<i class="hfx-glow"></i><i class="hfx-rays"></i><i class="hfx-edge"></i><i class="hfx-shine"></i>';
      host.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch (_) { } }, dur * 1000 + 400);
    } catch (_) { }
  }

  const gp = () => A(0, -0.14, 2.6);

  // Common "Heavenly halo" that every tier shares: rays behind Guan Yin + soft flash + mist at the lotus throne
  function heavenBase(an, color, strength, life) {
    raysHalo(an.halo, color, 7.5 * strength, life, 0.30 * Math.min(1.2, strength));
    flash(an.chest, color, 4.6 * strength, 1.4, 0.4);
    mist(an.lotus, Math.round(2 + strength * 2), PAL.cream, 3.2, life * 0.8, 2.8, 0.4);
  }

  // ------------------------------------------------------------------
  // 10 TIER RECIPES
  // ------------------------------------------------------------------
  const recipes = {
    // ── 0. กุหลาบมงคล / กราบเบญจางคประดิษฐ์ (1 เหรียญ) ──
    kowtow() {
      const an = anchors(), c = { x: 0, y: 0.1, z: 2.05 };
      heavenBase(an, PAL.rose, 0.75, 5.5);
      mandalaFloor(c, PAL.gold, 3.2, 5.8, 0.25);
      ringWave(c, PAL.gold, 4.2, 2.0, 0.8, true);
      ringWave(c, PAL.white, 5.0, 2.4, 0.5, true, 0.5);
      petals(48, { x0: -2.2, x1: 2.2, y0: 6.0, y1: 8.0, z0: 0.5, z1: 4.0, colors: [PAL.red, PAL.rose, PAL.gold, PAL.white], fall0: 0.8, fall1: 1.4, flutter: 0.25, l0: 4.5, l1: 6.5, delay: 2.5 });
      sparkles(c, 36, { spread: 1.2, v0: 0.1, v1: 0.6, up0: 0.4, up1: 1.2, g: 0.02, colors: [PAL.gold, PAL.rose, PAL.white], delay: 2.2, l0: 1.8, l1: 3.2 });
      glyph('สาธุ', gp(), 0.26, 0.88, 4.2, '#ff9ebb', 0.4);
      screenFx('kowtow', 5.0);
    },

    // ── 1. เครื่องรางศักดิ์สิทธิ์ / จุดประทีปบูชาธูปทอง ──
    incense() {
      const an = anchors(), c = { x: 0, y: 0, z: 1.05 };
      heavenBase(an, PAL.amber, 0.8, 6);
      mandalaFloor(c, PAL.gold, 3.4, 6.2, 0.3);
      pillar({ x: 0, y: 0, z: 0.9 }, PAL.amber, 8, 1.1, 6, 0.55);
      ringWave(c, PAL.gold, 4.6, 2.2, 0.8, true);
      ringWave(c, PAL.white, 5.4, 2.6, 0.5, true, 0.7);
      // ประทีปลอยโคจร 8 ดวงรอบกระถางธูป
      for (let i = 0; i < 8; i++) {
        addSprite({
          tex: T.glow(), color: PAL.amber, s0: 0.5, s1: 0.4, life: 5.6, a: 0.9, fi: 0.2, fo: 0.3, tw: 5, order: 62,
          sw: { cx: 0, cy: 1.7 + (i % 2) * 0.5, cz: 1.05, ang: (i / 8) * TAU, w: 1.0, r: 0.95, dr: 0.04, rise: 0.12, squash: 0.45 }
        });
        addSprite({
          tex: T.spark(), color: PAL.white, s0: 0.22, s1: 0.16, life: 5.6, a: 1, fi: 0.2, fo: 0.3, tw: 9, order: 63,
          sw: { cx: 0, cy: 1.7 + (i % 2) * 0.5, cz: 1.05, ang: (i / 8) * TAU, w: 1.0, r: 0.95, dr: 0.04, rise: 0.12, squash: 0.45 }
        });
      }
      sparkles({ x: 0, y: 2.0, z: 1.05 }, 34, { spread: 0.35, v0: 0.05, v1: 0.45, up0: 0.4, up1: 1.2, g: 0.05, colors: [PAL.gold, PAL.amber, PAL.white], delay: 2.5, l0: 2.2, l1: 3.6 });
      petals(10, { x0: -1.8, x1: 1.8, y0: 6.5, y1: 8, z0: 0.5, z1: 3, colors: [PAL.white, PAL.pink], fall0: 0.5, fall1: 0.9, l0: 5, l1: 7, delay: 3 });
      glyph('สาธุ', gp(), 0.30, 0.87, 4.4, '#ffd77a', 0.4);
      screenFx('incense', 5.5);
    },

    // ── 2. ดอกบัวมงคล / สระดอกบัวทิพย์ ──
    lotus() {
      const an = anchors(), c = { x: 0, y: 0.22, z: 2.35 };
      heavenBase(an, PAL.pink, 0.9, 6.5);
      mandalaFloor(c, PAL.pink, 4.4, 6.8, -0.28);
      ringWave(c, PAL.pink, 4.6, 2.4, 0.9, true);
      ringWave(c, PAL.white, 5.2, 2.6, 0.7, true, 0.6);
      ringWave(c, PAL.gold, 5.8, 2.8, 0.7, true, 1.3);
      petals(44, { swirl: { x: 0, y: 0.5, z: 2.35, r: 1.9, dr: -0.12, rise0: 0.45, rise1: 0.85 }, colors: [PAL.pink, PAL.white, PAL.rose, PAL.gold], l0: 3.8, l1: 5.4, s0: 0.17, s1: 0.3, delay: 1.5 });
      rainbow(A(0, 0.28, -0.6), 9.5, 6, 0.7, 0.3);
      [-1.7, 0, 1.7].forEach((x, i) => pillar({ x, y: 0.2, z: 2.2 }, i === 1 ? PAL.white : PAL.pink, 5.4, 0.9, 5.4, 0.45, 0.2 * i));
      fireflies({ x: 0, y: 0.3, z: 2.4 }, 24, PAL.jade, 2.3, 6);
      sparkles({ x: 0, y: 0.8, z: 2.35 }, 30, { spread: 1.8, v0: 0.05, v1: 0.3, up0: 0.5, up1: 1.4, g: 0.08, colors: [PAL.white, PAL.pink, PAL.gold], delay: 3, l0: 2, l1: 3.2 });
      glyph('ศรัทธา', gp(), 0.25, 0.93, 4.6, '#ffc2de', 0.6);
      screenFx('lotus', 6);
    },

    // ── 3. กุหลาบ 99 / โปรยบุปผามงคล ──
    flowers() {
      const an = anchors();
      heavenBase(an, PAL.pink, 1.0, 6.5);
      petals(96, { x0: -3.6, x1: 3.6, y0: 7.2, y1: 9, z0: -0.5, z1: 6, colors: [PAL.pink, PAL.rose, PAL.white, PAL.gold, PAL.red], fall0: 1.0, fall1: 1.9, flutter: 0.28, l0: 4.4, l1: 6.4, delay: 3.8 });
      // ช่อมาลัยบุปผารอบวงรัศมี
      const hp = an.halo;
      for (let i = 0; i < 18; i++) {
        addSprite({
          tex: T.petal(), color: pick([PAL.pink, PAL.white, PAL.gold]), normal: true, aspect: 0.66, s0: 0.3, s1: 0.28, rot: rand(0, TAU), vrot: 0.5, life: 5.6, a: 0.95, fi: 0.2, fo: 0.3, order: 57,
          sw: { plane: 'xy', cx: hp.x, cy: hp.y, cz: hp.z + 0.5, ang: (i / 18) * TAU, w: 0.32, r: 2.6 + (i % 2) * 0.28, dr: 0 }
        });
      }
      [-2.5, 2.5].forEach((x, i) => pillar({ x, y: -0.5, z: 1.0 }, PAL.gold, 9, 2.0, 5.6, 0.35, 0.3 * i));
      sparkles(A(0, 0.2, 1.4), 54, { spread: 3.2, v0: 0.1, v1: 0.7, up0: 0.2, up1: 1.4, g: 0.0, colors: [PAL.gold, PAL.pink, PAL.white], delay: 4, l0: 2, l1: 3.4 });
      starburst(an.chest, PAL.pink, 4.2, 1.6, 0.1);
      glyph('มงคล', gp(), 0.28, 0.99, 4.4, '#ffb3d4', 0.5);
      screenFx('flowers', 6.2);
    },

    // ── 4. พวงมาลัย / สั่นระฆังทอง ──
    golden_bell() {
      const an = anchors(), b = { x: 0, y: 3.85, z: 2.1 };
      heavenBase(an, PAL.gold, 0.40, 6);
      raysHalo({ x: 0, y: 3.85, z: 1.5 }, PAL.gold, 3.8, 5.6, 0.15, 0.4);
      // คลื่นเสียงระฆัง 3 ครั้ง สอดคล้องกับการสั่นระฆัง (แสงนวลละมุน ไม่บังพระพักตร์พระแม่)
      [0.25, 1.45, 2.65].forEach((d, i) => {
        ringWave(b, PAL.cream, 5.2 + i * 0.4, 2.3, 0.35, false, d);
        ringWave(b, PAL.white, 3.8 + i * 0.3, 1.8, 0.30, false, d + 0.18);
        ringWave(b, PAL.amber, 6.0 + i * 0.4, 2.6, 0.22, false, d + 0.35);
        flash(b, PAL.cream, 1.5, 0.9, 0.15, d);
        sparkles(b, 16, { spread: 0.2, v0: 1.0, v1: 2.0, up0: -0.4, up1: 1.1, g: -0.2, drag: 1.2, colors: [PAL.gold, PAL.white, PAL.amber], l0: 1.2, l1: 2.0, s0: 0.12, s1: 0.22, delay: 0.01 });
      });
      pillar({ x: 0, y: 0, z: 2.1 }, PAL.gold, 3.8, 0.65, 5.4, 0.25);
      ringWave({ x: 0, y: 0, z: 2.1 }, PAL.gold, 4.2, 2.0, 0.35, true, 0.3);
      ringWave({ x: 0, y: 0, z: 2.1 }, PAL.gold, 5.0, 2.2, 0.25, true, 1.5);
      sparkles(A(0, 0.75, 1.0), 32, { spread: 2.2, spreadY: 0.4, v0: 0.05, v1: 0.18, up0: -0.7, up1: -0.2, g: 0.0, colors: [PAL.gold, PAL.amber, PAL.cream], delay: 3.2, l0: 2.2, l1: 3.4 });
      glyph('เมตตา', gp(), 0.25, 0.87, 4.4, '#ffe27a', 0.5);
      screenFx('golden_bell', 5.6);
    },

    // ── 5. น้ำหอมโคโลญจน์ / ธารน้ำพุมณี ──
    crystal_fountain() {
      const an = anchors(), c = { x: 0, y: 0.1, z: 2.3 };
      heavenBase(an, PAL.sky, 0.8, 6.4);
      rainbow(A(0, 0.3, -0.8), 10.5, 6.6, 0.85, 0.2);
      mandalaFloor(c, PAL.sky, 4.6, 6.6, 0.3);
      ringWave(c, PAL.sky, 4.8, 2.4, 0.9, true);
      ringWave(c, PAL.white, 5.6, 2.6, 0.7, true, 0.7);
      ringWave(c, PAL.violet, 6.2, 2.8, 0.6, true, 1.4);
      // ประกายอัญมณี 7 สีพุ่งเป็นสายน้ำ
      for (let i = 0; i < 84; i++) {
        const ang = Math.random() * TAU, sp = rand(0.3, 1.5);
        const sz = rand(0.14, 0.3);
        addSprite({
          tex: T.spark(), color: RAINBOW[i % RAINBOW.length], x: 0, y: 1.0, z: 2.3, vx: Math.cos(ang) * sp, vy: rand(3.4, 5.6), vz: Math.sin(ang) * sp * 0.5,
          ay: -5.2, s0: sz, s1: sz * 0.5, life: rand(1.6, 2.4), a: 1, fi: 0.05, fo: 0.4, tw: 10, delay: rand(0, 3.4), order: 66
        });
      }
      mist({ x: 0, y: 0.4, z: 2.6 }, 4, PAL.white, 1.8, 5.4, 2.0, 0.3, 0.2);
      pillar({ x: 0, y: 0, z: 2.2 }, PAL.white, 7, 0.9, 5.6, 0.35);
      fireflies({ x: 0, y: 0.5, z: 2.3 }, 14, PAL.sky, 2.0, 5.5);
      glyph('มณีทิพย์', gp(), 0.22, 0.93, 4.6, '#bfe6ff', 0.6);
      screenFx('crystal_fountain', 6.2);
    },

    // ── 6. โดนัท / ขบวนราชรถ ──
    royal_carriage() {
      const an = anchors();
      heavenBase(an, PAL.gold, 1.05, 7);
      mandalaFloor({ x: 0, y: 0, z: 6.0 }, PAL.gold, 4.0, 7, -0.25, 0.6);
      mandalaFloor({ x: 0, y: 0, z: 3.2 }, PAL.red, 3.0, 6, 0.3, 0.5, 0.8);
      birds(7, 4.6, -4.6, 6.2, 0.6, 6.2, 0.2);
      birds(5, -4.6, 4.6, 5.0, 1.2, 6.6, 1.6);
      coins(54, { x0: -1.5, x1: 1.5, y0: 7, y1: 8.5, z0: 2.5, z1: 8.5, delay: 4.2 });
      [-1.35, 1.35].forEach((x, i) => [3.2, 5.4, 7.6].forEach((z, j) => pillar({ x, y: 0, z }, PAL.gold, 3.6, 0.55, 5.8, 0.38, 0.15 * (i + j))));
      petals(34, { x0: -2.4, x1: 2.4, y0: 6.5, y1: 8, z0: 1, z1: 8, colors: [PAL.gold, PAL.red, PAL.pink, PAL.white], fall0: 0.9, fall1: 1.5, l0: 4.4, l1: 6, delay: 4 });
      sparkles({ x: 0, y: 0.3, z: 6 }, 44, { spread: 1.1, spreadY: 0.1, v0: 0.1, v1: 0.5, up0: 0.5, up1: 1.7, g: -0.1, colors: [PAL.gold, PAL.white, PAL.amber], delay: 4.4, l0: 1.8, l1: 3, s0: 0.14, s1: 0.28 });
      starburst(an.chest, PAL.gold, 4.4, 1.6, 0.2);
      glyph('บารมี', gp(), 0.25, 0.99, 4.8, '#ffd24a', 0.6);
      screenFx('royal_carriage', 6.8);
    },

    // ── 7. หัวใจ 4 ดวง / พลุเพลิงบุญ ──
    fireworks() {
      const an = anchors();
      heavenBase(an, PAL.rose, 1.0, 7);
      const cols = [[0xff2d6f, 0xffd24a, 0xff7a3d], [0x2f9bff, 0x7be495, 0xb9e6ff], [0xa13dff, 0xff8fe0, 0xffd24a], [0xff4a1f, 0xffd24a, 0xff8fa8]];
      [[-0.45, 0.62, 0.55], [0.5, 0.74, 1.4], [0.0, 0.86, 2.3], [-0.55, 0.88, 3.2], [0.58, 0.58, 3.9]].forEach(([nx, ny, d], i) => {
        peony(A(nx, ny, -0.4), 54, cols[i % cols.length], 3.0, 4.4 + (i % 2) * 0.7, d);
      });
      lanterns(26, { x0: -3.3, x1: 3.3, y0: 0.2, y1: 2.4, z0: -0.2, z1: 5, delay: 3 });
      hearts(16, { x0: -1.6, x1: 1.6, y0: 0.4, y1: 1.8, z0: 3, z1: 7, delay: 3.2 });
      // ท้องฟ้าดาวระยิบ
      for (let i = 0; i < 46; i++) {
        const p = A(rand(-0.95, 0.95), rand(0.2, 0.98), -1.6);
        addSprite({ tex: T.spark(), color: pick([PAL.white, PAL.gold, PAL.cream]), x: p.x, y: p.y, z: p.z, s0: rand(0.1, 0.28), s1: rand(0.1, 0.28), life: rand(3.4, 6), a: 0.9, fi: 0.25, fo: 0.3, tw: rand(4, 9), delay: rand(0, 3), order: 17 });
      }
      glyph('บุญ', gp(), 0.28, 1.10, 4.6, '#ffb8d0', 0.6);
      screenFx('fireworks', 6.8);
    },

    // ── 8. ประตูวิมาน / เปิดวิมานทิพย์ ──
    castle() {
      const an = anchors(), pt = { x: 0, y: 3.2, z: 1.8 };
      heavenBase(an, PAL.gold, 0.45, 7.5);
      raysHalo({ x: 0, y: 3.2, z: 0.4 }, PAL.gold, 5.5, 7, 0.20, 0.22, 0.2);
      starburst(pt, PAL.cream, 2.5, 1.4, 0.1);
      ringWave(pt, PAL.gold, 6.5, 2.4, 0.35, false, 0.2);
      ringWave(pt, PAL.white, 4.8, 2.0, 0.25, false, 0.5);
      ringWave(pt, PAL.cream, 7.8, 2.8, 0.20, false, 1.0);
      // ธารแสงทิพย์ไหลลงจากประตูสวรรค์ (แสงนวลโปร่ง ไม่สว่างจ้ากลบพระแม่)
      pillar({ x: 0, y: 0, z: 1.8 }, PAL.cream, 5.2, 1.8, 6.4, 0.22, 0.4);
      [-1.7, 1.7].forEach((x, i) => pillar({ x, y: 0, z: 1.8 }, PAL.gold, 5, 0.9, 5.6, 0.25, 0.8 + i * 0.2));
      // ทะเลเมฆใต้ประตู
      mist({ x: 0, y: 0.6, z: 2.8 }, 5, PAL.white, 3.2, 6.6, 2.6, 0.25, 0.3);
      mist({ x: 0, y: 1.8, z: 1.0 }, 2, PAL.cream, 2.8, 6, 2.5, 0.20, 0.8);
      birds(7, -4.6, 4.6, 6.0, 0.4, 6.4, 0.5);
      birds(5, 4.6, -4.6, 4.7, 0.9, 6.6, 2.2);
      petals(30, { x0: -3, x1: 3, y0: 6.8, y1: 8.5, z0: 0, z1: 5, colors: [PAL.gold, PAL.white, PAL.cream, PAL.pink], fall0: 0.7, fall1: 1.3, l0: 5, l1: 7, delay: 3.4 });
      sparkles(pt, 45, { spread: 0.8, v0: 0.5, v1: 1.8, up0: -0.8, up1: 1.3, g: -0.2, drag: 0.7, colors: [PAL.gold, PAL.white, PAL.cream], l0: 2.0, l1: 3.6, s0: 0.12, s1: 0.25, delay: 1.2 });
      glyph('วิมานทิพย์', gp(), 0.22, 1.10, 5, '#fff0b0', 0.7);
      screenFx('castle', 7.2);
    },

    // ── 9. มังกรทอง / มังกรทองเหิน ──
    dragon() {
      const an = anchors(), c = an.chest;
      heavenBase(an, PAL.orange, 1.5, 8.5);
      raysHalo({ x: 0, y: 3.8, z: -0.4 }, PAL.gold, 14, 8.5, 0.62, 0.2);
      flash(c, PAL.white, 9, 1.4, 0.9);
      starburst(c, PAL.gold, 7, 2.0, 0.05);
      starburst(A(0, 0.5, 0.2), PAL.cream, 8, 1.8, 2.0);
      starburst(A(0, 0.5, 0.2), PAL.amber, 9, 1.8, 4.2);
      [0, 0.5, 1.1].forEach((d, i) => {
        ringWave({ x: 0, y: 0, z: 4.0 }, [PAL.gold, PAL.orange, PAL.white][i], 9 + i * 1.6, 2.6, 0.9, true, d);
        ringWave({ x: 0, y: 0, z: 4.0 }, PAL.gold, 9 + i * 1.8, 2.8, 0.7, true, d + 2.2);
      });
      mandalaFloor({ x: 0, y: 0, z: 4.2 }, PAL.gold, 7.0, 8.2, 0.22, 0.7);
      [-3.0, -1.5, 0, 1.5, 3.0].forEach((x, i) => pillar({ x, y: -0.5, z: 1.0 + (i % 2) * 0.8 }, i % 2 ? PAL.orange : PAL.gold, 10, 1.4, 7, 0.5, 0.15 * i));
      coins(96, { x0: -3.4, x1: 3.4, y0: 7, y1: 9, z0: -0.5, z1: 8, delay: 5.6, l0: 2.6, l1: 4 });
      // เมฆมงคลโคจรรอบองค์มังกร
      for (let i = 0; i < 16; i++) {
        addSprite({
          tex: T.cloud(i), color: pick([PAL.cream, PAL.gold, PAL.white]), aspect: 1.6, s0: 2.0, s1: 2.8, life: 7.4, a: 0.5, fi: 0.2, fo: 0.3, order: 21, delay: rand(0, 0.8),
          sw: { plane: 'xy', cx: 0, cy: 3.6, cz: 0.2, ang: (i / 16) * TAU, w: 0.34, r: 3.6 + (i % 3) * 0.5, dr: 0 }
        });
      }
      sparkles(A(0, 0.45, 1.0), 96, { spread: 2.8, spreadY: 2.4, v0: 0.2, v1: 1.1, up0: -0.5, up1: 1.2, g: 0.0, colors: [PAL.gold, PAL.white, PAL.amber, PAL.cream], delay: 6, l0: 2.2, l1: 3.8, s0: 0.14, s1: 0.34 });
      glyph('มังกรทอง', gp(), 0.28, 1.33, 5.6, '#ffd24a', 0.4);
      glyph('มั่งคั่ง ร่ำรวย', gp(), 0.22, 1.04, 5, '#ffe9a8', 2.0);
      screenFx('dragon', 8.6);
    },

    // ── 10. ซองมงคล / เสี่ยงเซียมซีมหาโชค ──
    seamsi() {
      const an = anchors(), c = { x: 0, y: 1.12, z: 2.35 };
      heavenBase(an, PAL.jade, 0.9, 6);
      raysHalo({ x: 0, y: 1.5, z: 1.4 }, PAL.gold, 5.2, 5.6, 0.5, 0.35);
      mandalaFloor({ x: 0, y: 0, z: 2.35 }, PAL.jade, 3.6, 6.2, 0.32, 0.8);
      mandalaFloor({ x: 0, y: 0, z: 2.35 }, PAL.gold, 2.6, 6.0, -0.45, 0.7);
      pillar({ x: 0, y: 0, z: 2.3 }, PAL.gold, 6.5, 1.0, 5.4, 0.5);
      ringWave(c, PAL.gold, 4.2, 2.0, 0.9, false);
      ringWave({ x: 0, y: 0, z: 2.35 }, PAL.jade, 4.6, 2.2, 0.8, true, 0.3);
      // เกลียวประกายรอบกระบอกเซียมซี
      for (let i = 0; i < 34; i++) {
        addSprite({
          tex: T.spark(), color: pick([PAL.gold, PAL.jade, PAL.white, PAL.cream]), s0: rand(0.14, 0.28), s1: 0.1, life: 4.6, a: 1, fi: 0.15, fo: 0.35, tw: rand(6, 12), order: 66, delay: (i / 34) * 1.6,
          sw: { cx: 0, cy: 0.3, cz: 2.35, ang: rand(0, TAU), w: 2.2, r: 1.1, dr: -0.12, rise: 0.55, squash: 0.5 }
        });
      }
      petals(36, { x0: -1.8, x1: 1.8, y0: 6.4, y1: 8, z0: 0.8, z1: 4.5, colors: [PAL.red, PAL.gold, PAL.rose, PAL.white], fall0: 0.8, fall1: 1.4, l0: 4.4, l1: 6, delay: 2.4 });
      coins(24, { x0: -1.2, x1: 1.2, y0: 6.5, y1: 8, z0: 1.5, z1: 4, delay: 2.6, l0: 2.4, l1: 3.4 });
      glyph('มหาโชค', gp(), 0.28, 1.10, 4.6, '#b6ffd2', 0.7);
      screenFx('seamsi', 5.8);
    }
  };

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  const lastPlay = {};
  function play(tier) {
    const r = recipes[tier];
    if (!r) return false;
    const now = performance.now();
    if (lastPlay[tier] && now - lastPlay[tier] < 900) return false; // กัน combo รัวซ้อนเกินจำเป็น
    lastPlay[tier] = now;
    if (items.length > MAX_ITEMS * 0.8) return false;             // ป้องกันโหลดหนักบนสตรีม
    r();
    return true;
  }
  return {
    play, tiers: Object.keys(recipes), recipes,
    // test helpers
    tick, setManual(v) { manual = !!v; }, count: () => items.length,
    clear() { while (items.length) disposeItem(items.pop()); timers.length = 0; Object.keys(lastPlay).forEach((k) => delete lastPlay[k]); document.querySelectorAll('.hfx-screen').forEach((e) => e.remove()); }
  };
}


// ---------------------------------------------------------------------
// 9.1 Wiring: Heavenly FX Screen & Particle Layer
// ---------------------------------------------------------------------
const heavenlyFX = createHeavenlyFX(THREE, scene, camera);
window.heavenlyFX = heavenlyFX; // ทดสอบ: heavenlyFX.play('dragon')

// Expose effect triggers on window for test harness and global availability
window.triggerKowtowEffect = triggerKowtowEffect;
window.triggerIncenseEffect = triggerIncenseEffect;
window.triggerLotusBloomEffect = triggerLotusBloomEffect;
window.triggerLotusRainEffect = triggerLotusRainEffect;
window.triggerGoldenBellEffect = triggerGoldenBellEffect;
window.triggerCrystalFountainEffect = triggerCrystalFountainEffect;
window.triggerRoyalCarriageEffect = triggerRoyalCarriageEffect;
window.triggerFireworksEffect = triggerFireworksEffect;
window.triggerHeavenlyPortalEffect = triggerHeavenlyPortalEffect;
window.triggerDragonDescentEffect = triggerDragonDescentEffect;
window.triggerSeamSiEffect = triggerSeamSiEffect;

// Universal Test Harness for Live Stream Gifts (ทดสอบเอฟเฟกต์ของขวัญทั้ง 10 ระดับ)
window.testGiftEffect = function (tier) {
  const map = {
    1: 'kowtow', 'kowtow': 'kowtow',
    1.5: 'seamsi', 'seamsi': 'seamsi',
    2: 'incense', 'incense': 'incense',
    3: 'lotus', 'lotus': 'lotus',
    4: 'flowers', 'flowers': 'flowers',
    5: 'golden_bell', 'golden_bell': 'golden_bell', 'bell': 'golden_bell',
    6: 'crystal_fountain', 'crystal_fountain': 'crystal_fountain', 'fountain': 'crystal_fountain',
    7: 'royal_carriage', 'royal_carriage': 'royal_carriage', 'carriage': 'royal_carriage',
    8: 'fireworks', 'fireworks': 'fireworks',
    9: 'castle', 'castle': 'castle', 'portal': 'castle',
    10: 'dragon', 'dragon': 'dragon'
  };
  const target = map[tier] || tier;
  console.log(`[TestGiftEffect] Testing celestial gift effect: ${target}`);
  try {
    if (window.heavenlyFX) window.heavenlyFX.play(target);
  } catch (e) { }

  if (target === 'kowtow') {
    triggerKowtowEffect();
  } else if (target === 'seamsi') {
    triggerSeamSiEffect('ผู้มีจิตศรัทธา', null, true);
  } else if (target === 'incense') {
    triggerIncenseEffect();
  } else if (target === 'lotus') {
    triggerLotusBloomEffect();
  } else if (target === 'flowers') {
    triggerLotusRainEffect();
  } else if (target === 'golden_bell') {
    triggerGoldenBellEffect();
  } else if (target === 'crystal_fountain') {
    triggerCrystalFountainEffect();
  } else if (target === 'royal_carriage') {
    triggerRoyalCarriageEffect();
  } else if (target === 'fireworks') {
    triggerFireworksEffect();
  } else if (target === 'castle') {
    triggerHeavenlyPortalEffect();
  } else if (target === 'dragon') {
    triggerDragonDescentEffect();
  } else {
    console.warn(`[TestGiftEffect] Unknown tier: ${tier}`);
  }
};

// Test Helper for 10-Second Miracle Blessing Videos
window.testMiracleVideo = function (tier = 'tier1') {
  if (!window.videoBlessingController) {
    console.warn('[testMiracleVideo] videoBlessingController not found');
    return;
  }
  console.log(`[testMiracleVideo] Testing 10s miracle video tier: ${tier}`);
  window.videoBlessingController.playMiracle(tier, () => {
    console.log(`[testMiracleVideo] Completed playback for tier: ${tier}`);
  });
  if (typeof roundManager !== 'undefined' && roundManager && roundManager.speakHost) {
    const speeches = {
      tier1: 'สาธุ บารมีขั้นแรกสว่างไสว ขอพระแม่กวนอิมประทานพรให้ร่มเย็นเป็นสุขนะคะ',
      tier2: 'สาธุ บารมีขั้นที่สองเปิดทางสวรรค์ ขอให้ทุกท่านพบเจอแต่โชคลาภเงินทองนะคะ',
      climax_a: 'สาธุ ปาฏิหาริย์บารมีสำเร็จเต็มร้อย ขอพระแม่กวนอิมหลั่งน้ำทิพย์ประทานพรให้สมปรารถนานะคะ',
      climax_b: 'สาธุ ปาฏิหาริย์ดอกบัวแก้วเบ่งบาน ขออำนาจบารมีคุ้มครองให้เจริญรุ่งเรืองมหาศาลนะคะ'
    };
    if (speeches[tier]) {
      roundManager.speakHost(speeches[tier]);
    }
  }
};
