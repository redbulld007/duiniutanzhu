type PegSoundKind = 'green' | 'blue' | 'gray' | 'reset' | 'bomb';

/** Lightweight synthesized effects: no external audio files or loading delay. */
export class PegSound {
  private static context?: AudioContext;
  private static lastPlayedAt = 0;

  static unlock() {
    const context = this.getContext();
    if (context?.state === 'suspended') void context.resume();
  }

  static play(kind: PegSoundKind) {
    const context = this.getContext();
    if (!context) return;
    const now = context.currentTime;
    if (now - this.lastPlayedAt < 0.035) return;
    this.lastPlayedAt = now;

    // Normal pegs use a short, inharmonic double-tone: closer to a real cowbell
    // than a single electronic beep. The three peg states retain clear pitch cues.
    if (kind === 'green') { this.playCowbell(context, now, 880, 1235, .42, .10); return; }
    if (kind === 'blue') { this.playCowbell(context, now, 690, 965, .38, .085); return; }
    if (kind === 'gray') { this.playCowbell(context, now, 505, 715, .34, .07); return; }

    const config: Record<'reset' | 'bomb', { frequency: number; endFrequency: number; duration: number; wave: OscillatorType }> = {
      reset: { frequency: 520, endFrequency: 1040, duration: .22, wave: 'sine' },
      bomb: { frequency: 150, endFrequency: 75, duration: .28, wave: 'sawtooth' },
    };
    const sound = config[kind];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = sound.wave;
    oscillator.frequency.setValueAtTime(sound.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(sound.endFrequency, now + sound.duration);
    gain.gain.setValueAtTime(kind === 'bomb' ? .11 : .075, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + sound.duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(now); oscillator.stop(now + sound.duration);
  }

  private static playCowbell(context: AudioContext, now: number, lower: number, upper: number, duration: number, volume: number) {
    const master = context.createGain();
    const tone = context.createBiquadFilter();
    tone.type = 'bandpass'; tone.frequency.setValueAtTime((lower + upper) * .62, now); tone.Q.setValueAtTime(1.4, now);
    master.gain.setValueAtTime(volume, now); master.gain.exponentialRampToValueAtTime(.001, now + duration);
    master.connect(tone); tone.connect(context.destination);
    [lower, upper].forEach((frequency, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = index === 0 ? 'square' : 'triangle'; oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(index === 0 ? .72 : .48, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration * (index === 0 ? .78 : 1));
      oscillator.connect(gain); gain.connect(master); oscillator.start(now); oscillator.stop(now + duration);
    });
  }

  private static getContext(): AudioContext | undefined {
    try {
      if (this.context) return this.context;
      const AudioContextConstructor = globalThis.AudioContext || (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.context = AudioContextConstructor ? new AudioContextConstructor() : undefined;
      return this.context;
    } catch {
      return undefined;
    }
  }
}
