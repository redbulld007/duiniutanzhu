import { GameTelemetry } from './GameTelemetry';

type RewardedAd = {
  load: () => Promise<void>;
  show: () => Promise<void>;
  onClose: (callback: (result: { isEnded?: boolean }) => void) => void;
  onError: (callback: () => void) => void;
};

type DouyinApi = {
  createRewardedVideoAd: (options: { adUnitId: string }) => RewardedAd;
};

/**
 * Single integration point for Douyin rewarded video.
 * Leave the ID empty during Creator/browser preview: calls safely resolve false.
 */
export class RewardedAdBridge {
  // Replace this value with the rewarded-video adUnitId from the Douyin mini-game console.
  static rewardedVideoAdUnitId = '';

  static get isConfigured() {
    return Boolean(this.rewardedVideoAdUnitId && this.getDouyinApi());
  }

  static async show(placement: string): Promise<boolean> {
    const tt = this.getDouyinApi();
    if (!tt || !this.rewardedVideoAdUnitId) {
      GameTelemetry.track('reward_ad_unavailable', { placement });
      return false;
    }

    const ad = tt.createRewardedVideoAd({ adUnitId: this.rewardedVideoAdUnitId });
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (rewarded: boolean) => {
        if (settled) return;
        settled = true;
        GameTelemetry.track(rewarded ? 'reward_ad_complete' : 'reward_ad_skip_or_error', { placement });
        resolve(rewarded);
      };
      ad.onClose((result) => finish(result.isEnded === true));
      ad.onError(() => finish(false));
      ad.load().then(() => ad.show()).catch(() => finish(false));
    });
  }

  private static getDouyinApi(): DouyinApi | undefined {
    return (globalThis as typeof globalThis & { tt?: DouyinApi }).tt;
  }
}
