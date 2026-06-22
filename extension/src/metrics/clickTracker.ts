import { ApiClient } from "../api/client";

export class ClickTracker {
  constructor(private readonly apiClient: ApiClient) {}

  async trackClick(impressionId: string): Promise<{ credited: boolean; click_earning?: number }> {
    try {
      const result = await this.apiClient.post<{
        credited: boolean;
        click_earning?: number;
        reason?: string;
      }>("/api/v1/metrics/click", {
        impression_id: impressionId,
        device_id: this.apiClient.getDeviceId(),
      });
      return result;
    } catch {
      return { credited: false };
    }
  }

  async openAdLink(url: string, impressionId: string): Promise<void> {
    const result = await this.trackClick(impressionId);

    const { env } = await import("vscode");
    await env.openExternal({ toString: () => url } as import("vscode").Uri);
  }
}
