import { sys } from 'cc';

type EventProperties = Record<string, string | number | boolean>;

/**
 * A local-first analytics seam for the MVP.
 *
 * Keep game code talking to this class; when the Douyin project is registered,
 * replace the storage/console implementation with the platform analytics SDK.
 */
export class GameTelemetry {
  private static readonly storageKey = 'cow-marble-telemetry-v1';
  private static readonly maximumEvents = 200;

  static track(name: string, properties: EventProperties = {}) {
    const event = { name, properties, timestamp: Date.now() };
    const events = this.read();
    events.push(event);
    sys.localStorage.setItem(this.storageKey, JSON.stringify(events.slice(-this.maximumEvents)));
    console.log(`[CowMarble] ${name}`, properties);
  }

  static read(): Array<{ name: string; properties: EventProperties; timestamp: number }> {
    try {
      const raw = sys.localStorage.getItem(this.storageKey);
      const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }
}
