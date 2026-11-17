import { Injectable } from '@angular/core';

export interface AssistantSettings {
  apiBaseUrl: string;
  model: string;
  apiKey: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantSettingsService {
  private readonly storagePrefix = 'leap-assistant-settings:';

  load(email: string): AssistantSettings | null {
    if (!email.trim()) return null;
    const raw = localStorage.getItem(this.storageKey(email));
    if (!raw) return null;

    let settings: unknown;
    try {
      settings = JSON.parse(raw);
    } catch {
      throw new Error('Saved assistant settings could not be read. Please configure them again.');
    }

    if (!isAssistantSettings(settings)) {
      throw new Error('Saved assistant settings are incomplete. Please configure them again.');
    }
    return settings;
  }

  save(email: string, settings: AssistantSettings): void {
    const apiBaseUrl = settings.apiBaseUrl.trim().replace(/\/+$/, '');
    const model = settings.model.trim();
    let savedSettings: AssistantSettings | null = null;
    try {
      savedSettings = this.load(email);
    } catch (e) {
      if (!settings.apiKey.trim()) {
        throw new Error('Enter your API key again to replace the saved settings.');
      }
    }
    const apiKey = settings.apiKey.trim() || savedSettings?.apiKey || '';

    if (!email.trim() || !apiBaseUrl || !model || !apiKey) {
      throw new Error('Enter the API base URL, model, and API key.');
    }

    let url: URL;
    try {
      url = new URL(apiBaseUrl);
    } catch {
      throw new Error('Enter a valid API base URL.');
    }
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.host
      || url.username || url.password || url.search || url.hash) {
      throw new Error('The API base URL must use HTTP or HTTPS.');
    }

    localStorage.setItem(this.storageKey(email), JSON.stringify({ apiBaseUrl, model, apiKey }));
  }

  private storageKey(email: string): string {
    return `${this.storagePrefix}${email.trim().toLowerCase()}`;
  }
}

function isAssistantSettings(value: unknown): value is AssistantSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return typeof settings['apiBaseUrl'] === 'string'
    && typeof settings['model'] === 'string'
    && typeof settings['apiKey'] === 'string'
    && !!settings['apiBaseUrl'].trim()
    && !!settings['model'].trim()
    && !!settings['apiKey'].trim();
}
