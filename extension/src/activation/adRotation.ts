import { ApiClient, ApiError } from "../api/client";

export interface AdResponse {
  impression_id: string;
  creative_text: string;
  click_url: string;
  ttl_ms: number;
  campaign_id: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

export class AdRotationManager {
  private _cached: AdResponse | undefined;
  private _cachedAt = 0;

  constructor(private readonly apiClient: ApiClient) {}

  async fetchCurrentAd(): Promise<AdResponse | null> {
    const now = Date.now();
    if (this._cached && now - this._cachedAt < CACHE_TTL_MS) {
      return this._cached;
    }

    try {
      const ad = await this.apiClient.get<AdResponse>("/api/v1/ads/current");
      if (ad) {
        this._cached = ad;
        this._cachedAt = now;
      }
      return ad ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 204) {
        return null;
      }
      // On any other error, return null (graceful degradation)
      return null;
    }
  }

  clearCache(): void {
    this._cached = undefined;
    this._cachedAt = 0;
  }
}
