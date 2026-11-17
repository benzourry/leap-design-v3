import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap, tap } from 'rxjs';
import { ASSISTANT_API } from './assistant-api.contract';

export interface AssistantProfile {
  id: number;
  name: string;
  apiBaseUrl: string;
  model: string;
  additionalInstructions: string;
  maxActions: number;
  selected: boolean;
  apiKeyConfigured: boolean;
}

export interface AssistantProfileDraft {
  name: string;
  apiBaseUrl: string;
  model: string;
  apiKey: string;
  additionalInstructions: string;
  maxActions: number;
}

@Injectable({ providedIn: 'root' })
export class AssistantSettingsService {
  private readonly http = inject(HttpClient);

  list(email: string): Observable<AssistantProfile[]> {
    return this.http.get<AssistantProfile[]>(ASSISTANT_API.profiles()).pipe(
      switchMap((profiles) => {
        const legacyKey = this.legacyStorageKey(email);
        const legacy = profiles.length ? null : this.loadLegacy(legacyKey);
        if (!legacy) return of(profiles);

        return this.create(legacy).pipe(
          tap(() => localStorage.removeItem(legacyKey)),
          switchMap(() => this.http.get<AssistantProfile[]>(ASSISTANT_API.profiles())),
        );
      }),
    );
  }

  create(profile: AssistantProfileDraft): Observable<AssistantProfile> {
    return this.http.post<AssistantProfile>(ASSISTANT_API.profiles(), profile);
  }

  update(id: number, profile: AssistantProfileDraft): Observable<AssistantProfile> {
    return this.http.put<AssistantProfile>(ASSISTANT_API.profile(id), profile);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(ASSISTANT_API.profile(id));
  }

  select(id: number): Observable<AssistantProfile> {
    return this.http.put<AssistantProfile>(ASSISTANT_API.selectProfile(id), {});
  }

  private loadLegacy(storageKey: string): AssistantProfileDraft | null {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error('Your previous assistant settings could not be read. Reconfigure them in your developer profile.');
    }

    if (!value || typeof value !== 'object') return null;
    const settings = value as Record<string, unknown>;
    if (typeof settings['apiBaseUrl'] !== 'string'
      || typeof settings['model'] !== 'string'
      || typeof settings['apiKey'] !== 'string'
      || !settings['apiBaseUrl'].trim()
      || !settings['model'].trim()
      || !settings['apiKey'].trim()) {
      throw new Error('Your previous assistant settings are incomplete. Reconfigure them in your developer profile.');
    }

    return {
      name: 'Migrated assistant',
      apiBaseUrl: settings['apiBaseUrl'],
      model: settings['model'],
      apiKey: settings['apiKey'],
      additionalInstructions: '',
      maxActions: 60,
    };
  }

  private legacyStorageKey(email: string): string {
    return `leap-assistant-settings:${email.trim().toLowerCase()}`;
  }
}
