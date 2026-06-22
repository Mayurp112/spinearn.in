import * as vscode from "vscode";

const SERVICE_ID = "spinads";
const TOKEN_KEY = "access_token";

export class KeychainVault {
  private readonly secrets: vscode.SecretStorage;

  constructor(context: vscode.ExtensionContext) {
    this.secrets = context.secrets;
  }

  async storeToken(token: string): Promise<void> {
    await this.secrets.store(`${SERVICE_ID}.${TOKEN_KEY}`, token);
  }

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(`${SERVICE_ID}.${TOKEN_KEY}`);
  }

  async deleteToken(): Promise<void> {
    await this.secrets.delete(`${SERVICE_ID}.${TOKEN_KEY}`);
  }
}
