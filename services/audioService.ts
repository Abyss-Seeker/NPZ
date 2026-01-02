
const MENU_TRACKS = [
  'music/chrome_bloom.mp3',
  'music/chrome_bloom_2.mp3'
];

const BATTLE_TRACKS = [
  'music/neon_siege_protocol.mp3',
  'music/internet_fame.mp3',
  'music/cyber_calculation.mp3',
  'music/cyber_base_memewave.mp3',
  'music/cyber_base_memewave_2.mp3',
  'music/skyline_overclock.mp3'
];

class AudioService {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  // Volume State (0.0 to 1.0 scale generally, but SFX can go higher)
  // User requested Music lowered by 40% (so 60% remaining)
  // User requested SFX increased by 20% (so 120%)
  private _masterVolume: number = 1.0;
  private _musicVolume: number = 0.6; 
  private _sfxVolume: number = 1.2;

  // BGM State
  private currentBgm: HTMLAudioElement | null = null;
  private nextBgm: HTMLAudioElement | null = null;
  private currentMode: 'MENU' | 'BATTLE' | 'NONE' = 'NONE';
  private currentPlaylist: string[] = [];
  private fading: boolean = false;
  private checkInterval: any = null;
  private BASE_BGM_GAIN: number = 0.4; // The original base gain
  private CROSSFADE_DURATION = 3000; // 3 seconds

  constructor() {
    // Lazy init
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.updateMasterGain();
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        // If we have an active BGM but it's paused due to policy, try playing it again
        if (this.currentBgm && this.currentBgm.paused) {
           this.currentBgm.play().catch(e => console.warn("Still blocked", e));
        }
      });
    }
  }

  // --- VOLUME CONTROLS ---

  get masterVolume() { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = v;
    this.updateMasterGain();
    this.updateCurrentBgmVolume();
  }

  get musicVolume() { return this._musicVolume; }
  set musicVolume(v: number) {
    this._musicVolume = v;
    this.updateCurrentBgmVolume();
  }

  get sfxVolume() { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = v;
  }

  private updateMasterGain() {
    if (this.gainNode && this.ctx) {
      // Master volume affects the GainNode which SFX goes through
      // It also mathematically affects BGM via getEffectiveBgmVolume
      // We keep the GainNode at 1.0 usually and control sfx via math, 
      // OR we control GainNode. Let's control GainNode for SFX master.
      // BGM elements are separate HTMLAudioElements, they don't go through this context GainNode usually unless connected.
      // In this implementation, BGM is simple Audio tags, SFX is WebAudio.
      
      // We will leave GainNode at 1.0 and apply master volume in the SFX creation
      // Actually, let's use the gainNode for Master * SFX
      this.gainNode.gain.setValueAtTime(this._masterVolume, this.ctx.currentTime);
    }
  }

  private getEffectiveBgmVolume() {
    return this.BASE_BGM_GAIN * this._musicVolume * this._masterVolume;
  }

  private updateCurrentBgmVolume() {
    if (this.currentBgm && !this.fading) {
      this.currentBgm.volume = this.getEffectiveBgmVolume();
    }
  }

  // --- BGM LOGIC ---

  playMenuBGM() {
    this.resume(); // Try to resume context
    if (this.currentMode === 'MENU') return;
    this.startPlaylist('MENU', MENU_TRACKS);
  }

  playBattleBGM() {
    this.resume();
    if (this.currentMode === 'BATTLE') return;
    this.startPlaylist('BATTLE', BATTLE_TRACKS);
  }

  private startPlaylist(mode: 'MENU' | 'BATTLE', tracks: string[]) {
    this.currentMode = mode;
    this.currentPlaylist = tracks;
    
    // Stop previous music immediately when switching modes
    this.stopBGM();
    
    this.fading = false;
    this.playNextTrack(false); // Initial track starts immediately without fade-in

    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => this.monitorTrack(), 500);
  }

  private stopBGM() {
    if (this.currentBgm) {
        this.currentBgm.pause();
        this.currentBgm.currentTime = 0;
        this.currentBgm = null;
    }
    if (this.nextBgm) {
        this.nextBgm.pause();
        this.nextBgm.currentTime = 0;
        this.nextBgm = null;
    }
  }

  private pickNextSong(): string {
     if (this.currentPlaylist.length === 0) return '';
     const idx = Math.floor(Math.random() * this.currentPlaylist.length);
     return this.currentPlaylist[idx];
  }

  private playNextTrack(isCrossfade: boolean) {
      const src = this.pickNextSong();
      if (!src) return;

      const audio = new Audio(src);
      const targetVol = this.getEffectiveBgmVolume();
      audio.volume = isCrossfade ? 0 : targetVol;
      audio.loop = false; // We handle looping manually via queue

      const playPromise = audio.play();
      if (playPromise !== undefined) {
          playPromise.catch(error => {
              // Auto-play policy might block this until user interaction
              console.warn("BGM Autoplay prevented:", error);
          });
      }

      if (isCrossfade) {
          this.nextBgm = audio;
          this.performCrossfade();
      } else {
          this.currentBgm = audio;
      }
  }

  private monitorTrack() {
      if (!this.currentBgm || this.fading) return;
      if (this.currentBgm.paused) {
        // If paused but supposed to be playing (and not fading), try to play (resume fix)
        this.currentBgm.play().catch(() => {});
        return; 
      }
      
      // Trigger crossfade 3 seconds before end
      if (this.currentBgm.duration && !isNaN(this.currentBgm.duration)) {
          const timeLeft = this.currentBgm.duration - this.currentBgm.currentTime;
          if (timeLeft <= (this.CROSSFADE_DURATION / 1000)) {
              this.fading = true;
              this.playNextTrack(true);
          }
      }
  }

  private performCrossfade() {
      if (!this.currentBgm || !this.nextBgm) return;

      const stepTime = 100; // ms per update
      const steps = this.CROSSFADE_DURATION / stepTime;
      const targetVol = this.getEffectiveBgmVolume();
      const volStep = targetVol / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
          currentStep++;
          
          // Re-calc target in case volume changed during fade
          const dynamicTarget = this.getEffectiveBgmVolume();
          const dynamicStep = dynamicTarget / steps;

          // Fade Out Current
          if (this.currentBgm) {
              const newVol = Math.max(0, dynamicTarget - (dynamicStep * currentStep));
              this.currentBgm.volume = newVol;
          }
          
          // Fade In Next
          if (this.nextBgm) {
              const newVol = Math.min(dynamicTarget, 0 + (dynamicStep * currentStep));
              this.nextBgm.volume = newVol;
          }

          if (currentStep >= steps) {
              clearInterval(fadeInterval);
              
              // Swap tracks
              if (this.currentBgm) this.currentBgm.pause();
              this.currentBgm = this.nextBgm;
              this.nextBgm = null;
              this.fading = false;
              
              // Ensure volume is fully set on the active track
              if (this.currentBgm) this.currentBgm.volume = this.getEffectiveBgmVolume();
          }
      }, stepTime);
  }

  // --- SFX METHODS ---
  // Note: SFX volume is Master * SfxMultiplier. 
  // Base volume for each sound is preserved (e.g., 0.1 for shoot) and multiplied.

  playShoot() {
    this.init();
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    const vol = 0.1 * this._sfxVolume;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playExplosion() {
    this.init();
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    const vol = 0.2 * this._sfxVolume;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playSpell() {
    this.init();
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.5);
    
    const vol = 0.3 * this._sfxVolume;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  playUiHover() {
    this.init();
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.05);

    const vol = 0.05 * this._sfxVolume;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playBattleStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;
    
    // Low drone
    const oscLow = this.ctx.createOscillator();
    const gainLow = this.ctx.createGain();
    oscLow.connect(gainLow);
    gainLow.connect(this.gainNode);
    oscLow.type = 'sawtooth';
    oscLow.frequency.setValueAtTime(100, this.ctx.currentTime);
    oscLow.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 2);
    
    const volLow = 0.5 * this._sfxVolume;
    gainLow.gain.setValueAtTime(volLow, this.ctx.currentTime);
    gainLow.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);

    // High tech sweep
    const oscHigh = this.ctx.createOscillator();
    const gainHigh = this.ctx.createGain();
    oscHigh.connect(gainHigh);
    gainHigh.connect(this.gainNode);
    oscHigh.type = 'square';
    oscHigh.frequency.setValueAtTime(400, this.ctx.currentTime);
    oscHigh.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.5);
    
    const volHigh = 0.1 * this._sfxVolume;
    gainHigh.gain.setValueAtTime(volHigh, this.ctx.currentTime);
    gainHigh.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

    oscLow.start();
    oscLow.stop(this.ctx.currentTime + 2);
    oscHigh.start();
    oscHigh.stop(this.ctx.currentTime + 0.5);
  }
}

export const audioService = new AudioService();
