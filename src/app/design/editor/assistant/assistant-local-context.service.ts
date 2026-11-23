import { Injectable, signal } from '@angular/core';

export type AssistantLocalContext =
  | { type: 'app' }
  | { type: 'form'; id: number; label?: string }
  | { type: 'dataset'; id: number; label?: string }
  | { type: 'dashboard'; id: number; label?: string }
  | { type: 'screen'; id: number; label?: string }
  | { type: 'lookup'; id: number; label?: string }
  | { type: 'navigation'; label?: string }
  | { type: 'lambda'; id: number; label?: string }
  | { type: 'email-template'; id: number; label?: string };

@Injectable({ providedIn: 'root' })
export class AssistantLocalContextService {
  private readonly registration = signal<{ owner: object; context: AssistantLocalContext } | null>(null);
  readonly context = signal<AssistantLocalContext>({ type: 'app' });

  createRegistration(): AssistantContextRegistration {
    const owner = {};
    return {
      set: (context) => {
        this.registration.set({ owner, context });
        this.context.set(context);
      },
      clear: () => {
        if (this.registration()?.owner !== owner) return;
        this.registration.set(null);
        this.context.set({ type: 'app' });
      },
    };
  }
}

export interface AssistantContextRegistration {
  set(context: AssistantLocalContext): void;
  clear(): void;
}
