import * as vscode from "vscode";

export class SelfUpdateChecker {
  private static readonly MARKETPLACE_URL =
    "https://marketplace.visualstudio.com/items?itemName=spinads.spinads";

  static async check(): Promise<void> {
    const currentVersion = vscode.extensions.getExtension("spinads.spinads")?.packageJSON
      .version as string | undefined;

    if (!currentVersion) return;

    try {
      const response = await fetch(
        "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json;api-version=7.2-preview.1",
          },
          body: JSON.stringify({
            filters: [
              {
                criteria: [
                  { filterType: 7, value: "spinads.spinads" },
                ],
              },
            ],
            flags: 0x200,
          }),
        },
      );

      if (!response.ok) return;

      const data = await response.json() as {
        results?: Array<{
          extensions?: Array<{
            versions?: Array<{ version: string }>;
          }>;
        }>;
      };

      const latestVersion =
        data.results?.[0]?.extensions?.[0]?.versions?.[0]?.version;

      if (latestVersion && latestVersion !== currentVersion) {
        const action = await vscode.window.showInformationMessage(
          `SpinAds v${latestVersion} is available (you have v${currentVersion})`,
          "Update Now",
          "Dismiss",
        );
        if (action === "Update Now") {
          await vscode.env.openExternal(
            vscode.Uri.parse(SelfUpdateChecker.MARKETPLACE_URL),
          );
        }
      }
    } catch {
      // Best-effort update check
    }
  }
}
