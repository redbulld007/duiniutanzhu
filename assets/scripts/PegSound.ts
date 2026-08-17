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

    const config: Record<PegSoundKind, { frequency: number; endFrequency: number; duration: number; wave: OscillatorType }> = {
      green: { frequency: 760, endFrequency: 960, duration: .075, wave: 'sine' },
      blue: { frequency: 560, endFrequency: 670, duration: .09, wave: 'triangle' },
      gray: { frequency: 360, endFrequency: 300, duration: .08, wave: 'square' },
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
