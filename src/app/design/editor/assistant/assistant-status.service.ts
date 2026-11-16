import { Injectable, computed, inject, signal } from '@angular/core';
import { AssistantService } from './assistant.service';

type AssistantAvailability = 'unknown' | 'available' | 'unavailable';

/**
 * Decides whether the assistant exists for this deployment. The /assistant/* endpoints are optional,
 * so the shell asks once and hides the entry point when they are missing.
 *
 * `localStorage['assistant-force'] = '1'` forces the drawer on, for working on the UI before the
 * backend is deployed.
 */
@Injectable({ providedIn: 'root' })
export class AssistantStatusService {
  private assistant = inject(AssistantService);
  private state = signal<AssistantAvailability>('unknown');

  readonly available = computed(() => this.state() === 'available');
  readonly checked = computed(() => this.state() !== 'unknown');

  check(force = false) {
    if (!force && this.state() !== 'unknown') return;
    if (localStorage.getItem('assistant-force') === '1') {
      this.state.set('available');
      return;
    }
    this.state.set('unknown');
    this.assistant.health().subscribe((h) => this.state.set(h?.enabled === false ? 'unavailable' : 'available'));
  }
}
