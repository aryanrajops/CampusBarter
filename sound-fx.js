/**
 * CampusBarter - Procedural Web Audio Sound Effects & Ambient Music Engine
 * 100% Client-side, Zero external audio files, Zero network latency, Offline-Ready
 * Full Browser Autoplay & AudioContext Lifecycle Management
 */

(function (window) {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let compressor = null;

  const SFX_STORAGE_KEY = 'cb_sfx_muted';

  let isMuted = localStorage.getItem(SFX_STORAGE_KEY) === 'true';

  // Purge legacy background music setting so it never runs again
  try {
    localStorage.removeItem('cb_bgm_active');
  } catch (e) {}

  // Ambient Preloader Charging Synth Nodes
  let preloaderNodes = null;

  /**
   * Safely create or return existing AudioContext
   */
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return null;
      audioCtx = new AudioCtxClass();
    }
    return audioCtx;
  }

  /**
   * Ensure master dynamics compressor & gain chain is set up
   */
  function getMasterDestination(ctx) {
    if (!compressor || compressor.context !== ctx) {
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(8, ctx.currentTime);
      compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.2, ctx.currentTime);

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 1.0, ctx.currentTime);

      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);
    }
    return compressor;
  }

  /**
   * Execute audio operations safely. If context is suspended, resume it
   * and execute the callback once the context is actually running.
   */
  function withContext(callback) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'running') {
      try {
        callback(ctx, getMasterDestination(ctx));
      } catch (e) {
        console.warn('[SoundFX] Audio error:', e);
      }
    } else if (ctx.state === 'suspended') {
      // AudioContext is suspended by browser autoplay policy.
      // We only execute callback if resume finishes immediately (within 150ms) during an active user gesture.
      // This prevents stale/unwanted sounds (like preloader audio) from firing minutes later on an unrelated click.
      const requestTime = Date.now();
      ctx.resume().then(() => {
        if (ctx.state === 'running' && (Date.now() - requestTime < 150) && typeof callback === 'function') {
          try {
            callback(ctx, getMasterDestination(ctx));
          } catch (e) {
            console.warn('[SoundFX] Audio error:', e);
          }
        }
      }).catch(() => {});
    }
  }

  const SoundFX = {
    /**
     * Check if sound effects are muted
     */
        /**
     * Unlock / resume AudioContext on explicit user gesture
     * Returns a Promise that resolves when AudioContext is running
     */
    unlock: function () {
      const ctx = getAudioContext();
      if (!ctx) return Promise.resolve(null);
      if (ctx.state === 'suspended') {
        return ctx.resume().then(() => ctx).catch(() => ctx);
      }
      return Promise.resolve(ctx);
    },

    isMuted: function () {
      return isMuted;
    },

    /**
     * Check if background ambient music is active (Always false - BGM removed)
     */
    isBgmActive: function () {
      return false;
    },

    /**
     * Safe stub for removed BGM toggle
     */
    toggleBgm: function () {
      return false;
    },

    /**
     * Toggle sound effects on/off
     */
    toggle: function () {
      isMuted = !isMuted;
      localStorage.setItem(SFX_STORAGE_KEY, isMuted ? 'true' : 'false');
      
      const ctx = getAudioContext();
      if (ctx && masterGain) {
        masterGain.gain.setValueAtTime(isMuted ? 0 : 1.0, ctx.currentTime);
      }

      this.updateBoundToggles();

      if (!isMuted) {
        this.playPop();
      } else {
        this.stopPreloaderAmbience();
      }
      return isMuted;
    },

    /**
     * Set explicit mute state
     */
    setMuted: function (muted) {
      isMuted = Boolean(muted);
      localStorage.setItem(SFX_STORAGE_KEY, isMuted ? 'true' : 'false');
      
      const ctx = getAudioContext();
      if (ctx && masterGain) {
        masterGain.gain.setValueAtTime(isMuted ? 0 : 1.0, ctx.currentTime);
      }
      this.updateBoundToggles();
      if (isMuted) {
        this.stopPreloaderAmbience();
      }
    },

    // =========================================================================
    // 1. TACTILE BUTTON CLICKS & PHYSICAL SWITCHES
    // =========================================================================

    /**
     * Modern Tactile Glass Switch Click
     * High-fidelity physical UI sound engineered with 3 acoustic layers:
     * 1. High-frequency micro-friction contact transient (filtered noise snap)
     * 2. Crystal glass resonance (frequency-swept triangle transient)
     * 3. Sub-haptic bottom-out body (warm acoustic thump for physical weight)
     * Calibrated volume (0.28 peak) for audible clarity across speakers
     */
    playClick: function (variety = 'glass') {
      withContext((ctx, out) => {
        const now = ctx.currentTime;
        const pitchVar = 0.98 + Math.random() * 0.04;

        // Layer 1: Micro-friction contact snap (filtered noise impulse)
        try {
          const sampleCount = Math.floor(ctx.sampleRate * 0.009); // 9ms
          const noiseBuf = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
          const output = noiseBuf.getChannelData(0);
          for (let i = 0; i < sampleCount; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.3));
          }
          const noiseSrc = ctx.createBufferSource();
          noiseSrc.buffer = noiseBuf;

          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(variety === 'primary' ? 2400 : 3400 * pitchVar, now);
          noiseFilter.Q.setValueAtTime(3.2, now);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.22, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.009);

          noiseSrc.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(out);
          noiseSrc.start(now);
        } catch (e) {}

        // Layer 2: Crystal Glass Resonant Transient
        const oscGlass = ctx.createOscillator();
        const gainGlass = ctx.createGain();
        const filterGlass = ctx.createBiquadFilter();

        oscGlass.type = variety === 'primary' ? 'sawtooth' : 'triangle';
        const startFreq = variety === 'primary' ? 1800 : 2200;
        oscGlass.frequency.setValueAtTime(startFreq * pitchVar, now);
        oscGlass.frequency.exponentialRampToValueAtTime(540 * pitchVar, now + 0.016);

        filterGlass.type = 'bandpass';
        filterGlass.frequency.setValueAtTime(1750 * pitchVar, now);
        filterGlass.Q.setValueAtTime(2.2, now);

        gainGlass.gain.setValueAtTime(variety === 'primary' ? 0.25 : 0.22, now);
        gainGlass.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

        oscGlass.connect(filterGlass);
        filterGlass.connect(gainGlass);
        gainGlass.connect(out);

        oscGlass.start(now);
        oscGlass.stop(now + 0.025);

        // Layer 3: Sub-haptic bottom-out body (warm physical punch)
        const oscBody = ctx.createOscillator();
        const gainBody = ctx.createGain();

        oscBody.type = 'sine';
        const baseFreq = variety === 'primary' ? 140 : 185;
        oscBody.frequency.setValueAtTime(baseFreq * pitchVar, now);
        oscBody.frequency.exponentialRampToValueAtTime(40 * pitchVar, now + 0.035);

        gainBody.gain.setValueAtTime(variety === 'primary' ? 0.32 : 0.24, now);
        gainBody.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

        oscBody.connect(gainBody);
        gainBody.connect(out);

        oscBody.start(now);
        oscBody.stop(now + 0.04);
      });
    },

    /**
     * Soft frosted droplet pop for chips, filters, and pill badges
     */
    playPop: function () {
      withContext((ctx, out) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.045);

        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        osc.connect(gain);
        gain.connect(out);

        osc.start(now);
        osc.stop(now + 0.055);
      });
    },

    /**
     * Crisp mechanical toggle switch snap (for eye password toggles & theme switches)
     */
    playSwitch: function () {
      withContext((ctx, out) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.028);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        osc.connect(gain);
        gain.connect(out);

        osc.start(now);
        osc.stop(now + 0.032);
      });
    },

    // =========================================================================
    // 2. FUTURISTIC PRELOADER CHARGING AUDIO SUITE
    // =========================================================================

    /**
     * Active Preloader Sound Engine
     * Zero-drone architecture: Continuous synth loops are disabled so there is NEVER
     * any annoying persistent buzzing, wobbling, or leaking background sound.
     */
    startPreloaderAmbience: function () {
      // Continuous background oscillators are permanently disabled to eliminate buzzing/drone noise.
      // Preloader audio is cleanly delivered via discrete, self-terminating acoustic effects:
      // - playLoaderStart: Initial cyber sweep (0.35s)
      // - playLoaderPulse: Crisp harmonic pips at 28%, 58%, 86% (0.22s)
      // - playLoaderComplete: Grand crystalline arpeggio at 100% (0.85s)
      return;
    },

    /**
     * Dynamically update the preloader progress sound (0% to 100%)
     * Gives crisp acoustic feedback for each milestone.
     */
    updateLoaderProgress: function (pct = 50) {
      this.playLoaderPulse(pct);
    },

    /**
     * Stop and cleanup any preloader audio nodes
     */
    stopPreloaderAmbience: function () {
      if (!preloaderNodes) return;
      const current = preloaderNodes;
      preloaderNodes = null;

      try {
        if (current.osc1) { current.osc1.stop(); current.osc1.disconnect(); }
        if (current.osc2) { current.osc2.stop(); current.osc2.disconnect(); }
        if (current.lfo) { current.lfo.stop(); current.lfo.disconnect(); }
        if (current.noise) { current.noise.stop(); current.noise.disconnect(); }
        if (current.chargeGain) { current.chargeGain.disconnect(); }
      } catch (e) {}
    },

    /**
     * Futuristic Ambient Loader Bootup (Instant Cyber-Ionization Sweep)
     */
    playLoaderStart: function () {
      withContext((ctx, out) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.28);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(390, now);
        osc2.frequency.exponentialRampToValueAtTime(870, now + 0.28);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(2600, now + 0.28);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.38);
        osc2.stop(now + 0.38);
      });
    },

    /**
     * Futuristic Milestone Data Pulse Chime
     * Highly audible, crisp dual-tone pips designed for laptop and phone speakers
     */
    playLoaderPulse: function (progressPct = 50) {
      withContext((ctx, out) => {
        const now = ctx.currentTime;
        
        // Progress-dependent melodic scale: C5 -> E5 -> G5 -> C6
        let freq1 = 523.25; // C5
        let freq2 = 1046.50; // C6
        if (progressPct >= 75) {
          freq1 = 783.99; // G5
          freq2 = 1567.98; // G6
        } else if (progressPct >= 45) {
          freq1 = 659.25; // E5
          freq2 = 1318.50; // E6
        }

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq1, now);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq2, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq2, now);
        filter.Q.setValueAtTime(1.8, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.26, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

        osc1.connect(gain);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.28);
        osc2.stop(now + 0.28);
      });
    },

    /**
     * Grand Celestial Harmonic Chord for Loader Completion & Portal Reveal
     * Euphoric ascending arpeggio with deep physical resonance and stereo warp sweep
     */
    playLoaderComplete: function () {
      this.stopPreloaderAmbience();

      withContext((ctx, out) => {
        const now = ctx.currentTime;

        // Sub-bass physical punch (gives tactile weight on headphones/speakers)
        const punchOsc = ctx.createOscillator();
        const punchGain = ctx.createGain();
        punchOsc.type = 'sine';
        punchOsc.frequency.setValueAtTime(120, now);
        punchOsc.frequency.exponentialRampToValueAtTime(42, now + 0.32);
        punchGain.gain.setValueAtTime(0.35, now);
        punchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        punchOsc.connect(punchGain);
        punchGain.connect(out);
        punchOsc.start(now);
        punchOsc.stop(now + 0.38);

        // Uplifting Crystalline Arpeggio: C5, E5, G5, B5, D6, G6
        const chordNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];

        chordNotes.forEach((freq, idx) => {
          const noteStart = now + idx * 0.045;
          const osc = ctx.createOscillator();
          const oscOvertone = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          oscOvertone.type = 'triangle';
          oscOvertone.frequency.setValueAtTime(freq * 1.5, noteStart);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3600, noteStart);
          filter.frequency.exponentialRampToValueAtTime(900, noteStart + 0.85);

          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.82);

          osc.connect(filter);
          oscOvertone.connect(filter);
          filter.connect(gain);
          gain.connect(out);

          osc.start(noteStart);
          oscOvertone.start(noteStart);
          osc.stop(noteStart + 0.88);
          oscOvertone.stop(noteStart + 0.88);
        });

        // Layered Warp Whoosh
        setTimeout(() => {
          this.playWhoosh();
        }, 120);
      });
    },

    /**
     * Stubs for removed BGM functions to guarantee zero errors
     */
    startCampusStudyMusic: function () {},
    stopCampusStudyMusic: function () {},
    bindBgmBtn: function () {},
    updateBoundBgmButtons: function () {},

    // =========================================================================
    // 4. ACTION & REWARD FEEDBACK
    // =========================================================================

    /**
     * Crystalline harmonic chime for success events (karma bonus, barter accept, upload complete)
     */
    playSuccess: function () {
      withContext((ctx, out) => {
        // C-Major arpeggio: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.5)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        const now = ctx.currentTime;

        notes.forEach((freq, idx) => {
          const noteStart = now + idx * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.linearRampToValueAtTime(0.24, noteStart + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

          osc.connect(gain);
          gain.connect(out);

          osc.start(noteStart);
          osc.stop(noteStart + 0.48);
        });
      });
    },

    /**
     * Aerodynamic whoosh tone for page reveal transitions and modal opens
     */
    playWhoosh: function () {
      withContext((ctx, out) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.16);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.32);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.linearRampToValueAtTime(1200, now + 0.16);
        filter.frequency.linearRampToValueAtTime(350, now + 0.32);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc.start(now);
        osc.stop(now + 0.34);
      });
    },

    /**
     * Subtle low dual-tone for errors, validation warnings, or balance deficiency
     */
    playError: function () {
      withContext((ctx, out) => {
        const now = ctx.currentTime;
        const pulses = [0, 0.09];

        pulses.forEach(offset => {
          const start = now + offset;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(210, start);
          osc.frequency.exponentialRampToValueAtTime(120, start + 0.07);

          gain.gain.setValueAtTime(0.24, start);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);

          osc.connect(gain);
          gain.connect(out);

          osc.start(start);
          osc.stop(start + 0.075);
        });
      });
    },

    // =========================================================================
    // 5. UI BINDINGS & UNIVERSAL CLICK DELEGATION
    // =========================================================================

    boundToggles: [],

    /**
     * Sync all bound SFX toggle buttons and labels with current mute state
     */
    updateBoundToggles: function () {
      const muted = this.isMuted();
      (this.boundToggles || []).forEach(b => {
        const icon = document.querySelector(b.iconSelector);
        const label = document.querySelector(b.labelSelector);
        const btn = document.querySelector(b.btnSelector);
        if (icon) {
          icon.className = muted 
            ? 'fa-solid fa-volume-xmark text-rose-400' 
            : 'fa-solid fa-volume-high text-emerald-400';
        }
        if (label) {
          label.textContent = muted ? 'SFX OFF' : 'SFX ON';
          label.className = muted 
            ? 'hidden sm:inline text-[11px] font-mono text-rose-400' 
            : 'hidden sm:inline text-[11px] font-mono text-slate-300';
        }
        if (btn) {
          btn.setAttribute('aria-label', muted ? 'Turn SFX On' : 'Mute Sound Effects');
          btn.title = muted ? 'Turn SFX On' : 'Mute Sound Effects';
        }
      });
    },

    bindToggleBtn: function (btnSelector, iconSelector, labelSelector) {
      if (!this.boundToggles.some(b => b.btnSelector === btnSelector)) {
        this.boundToggles.push({ btnSelector, iconSelector, labelSelector });
      }
      this.updateBoundToggles();

      if (!this._toggleBound) {
        this._toggleBound = true;
        document.addEventListener('click', (e) => {
          const matched = (this.boundToggles || []).find(b => e.target.closest(b.btnSelector));
          if (matched) {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
          }
        }, true);
      }
    },

    /**
     * Global high-fidelity event listeners for 100% button coverage
     */
    initAutoClickListeners: function () {
      // 1. Proactive AudioContext unlocker on true user gestures
      const activationEvents = ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'keydown', 'click'];

      const unlockAudio = () => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      };

      activationEvents.forEach(evt => {
        window.addEventListener(evt, unlockAudio, { passive: true, capture: true });
      });

      // 2. Universal Click Delegate for all buttons, links, chips, controls
      document.addEventListener('click', (e) => {
        if (isMuted) return;

        // Interactive targets selector: includes buttons, links, chips, pills, inputs, presets
        const target = e.target.closest(
          'button, a, select, input[type="radio"], input[type="checkbox"], [role="button"], ' +
          '.clickable, .tab-btn, .filter-chip, .filter-btn, .preset-loc-btn, .preset-tag, ' +
          '.tag-teach, .tag-learn, [onclick], .toast-item, .preloader-skip'
        );

        if (!target) return;

        // Specific opt-out
        if (target.closest('#sfx-toggle-btn') || target.hasAttribute('data-no-sfx')) return;

        // Custom sound overrides
        const customType = target.getAttribute('data-sfx');
        if (customType === 'success') {
          SoundFX.playSuccess();
          return;
        } else if (customType === 'pop') {
          SoundFX.playPop();
          return;
        } else if (customType === 'error') {
          SoundFX.playError();
          return;
        } else if (customType === 'whoosh') {
          SoundFX.playWhoosh();
          return;
        }

        // Automatic smart audio selection based on element type
        const isPrimary = target.classList.contains('btn-primary') || 
                          target.classList.contains('btn-emerald') || 
                          target.classList.contains('btn-amber') || 
                          target.type === 'submit';

        const isPillOrFilter = target.classList.contains('filter-chip') ||
                               target.classList.contains('filter-btn') ||
                               target.classList.contains('preset-loc-btn') ||
                               target.classList.contains('tab-btn') ||
                               target.tagName === 'SELECT';

        const isToggleOrEye = target.id?.includes('toggle') || 
                              target.classList.contains('preset-tag') ||
                              target.type === 'checkbox' ||
                              target.type === 'radio';

        const isDownloadOrUpload = target.id?.includes('download') || 
                                   target.id?.includes('upload') ||
                                   target.classList.contains('download-pyq-btn');

        if (isDownloadOrUpload) {
          SoundFX.playSuccess();
        } else if (isPillOrFilter) {
          SoundFX.playPop();
        } else if (isToggleOrEye) {
          SoundFX.playSwitch();
        } else if (isPrimary) {
          SoundFX.playClick('primary');
        } else {
          SoundFX.playClick('glass');
        }

        // For links navigating to new pages (e.g. login.html), ensure audio transient completes
        if (target.tagName === 'A' && target.href && !target.target && target.origin === window.location.origin) {
          const targetUrl = target.href;
          // Only delay if actually changing page pathname or target is different page (and left click without modifier keys)
          if (target.pathname !== window.location.pathname && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
            e.preventDefault();
            setTimeout(() => {
              window.location.href = targetUrl;
            }, 85);
          }
        }
      }, true);
    }
  };

  // Auto-init click listeners & sync toggle UI on DOM ready
  const initSoundUI = () => {
    SoundFX.initAutoClickListeners();
    SoundFX.updateBoundToggles();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSoundUI);
  } else {
    initSoundUI();
  }

  window.SoundFX = SoundFX;
})(window);
