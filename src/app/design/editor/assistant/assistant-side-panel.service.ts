import { DestroyRef, Injectable, TemplateRef, effect, inject, signal } from '@angular/core';
import { ViewportService } from '../../../_shared/service/viewport.service';

export type AssistantSidePanelTab = 'palette' | 'assistant';

interface PaletteRegistration {
  owner: object;
  template: TemplateRef<unknown>;
}

@Injectable({ providedIn: 'root' })
export class AssistantSidePanelService {
  private readonly viewport = inject(ViewportService);
  private readonly historyStateKey = 'assistantSidePanel';
  private historyEntryActive = false;

  readonly expanded = signal(false);
  readonly activeTab = signal<AssistantSidePanelTab>('assistant');
  readonly palette = signal<PaletteRegistration | null>(null);
  private readonly assistantConfigured = signal<boolean | null>(null);
  private closeWhenAssistantResolved = false;

  constructor() {
    const popStateListener = () => {
      if (!this.viewport.isMobile()) return;

      if (window.history.state?.[this.historyStateKey] === true) {
        this.historyEntryActive = true;
        if (!this.expanded()) this.expanded.set(true);
        return;
      }

      if (this.historyEntryActive) {
        this.historyEntryActive = false;
        this.expanded.set(false);
      }
    };

    window.addEventListener('popstate', popStateListener);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('popstate', popStateListener));

    effect(() => {
      if (this.viewport.isMobile()) this.expanded.set(false);
    });
  }

  registerPalette(owner: object, template: TemplateRef<unknown>): void {
    this.closeWhenAssistantResolved = false;
    this.palette.set({ owner, template });
    this.activeTab.set('palette');
    if (!this.viewport.isMobile()) {
      this.expanded.set(true);
    }
  }

  unregisterPalette(owner: object): void {
    if (this.palette()?.owner !== owner) return;
    this.palette.set(null);
    this.activeTab.set('assistant');
    if (this.assistantConfigured() === false) {
      this.close();
    } else if (this.assistantConfigured() === null) {
      this.closeWhenAssistantResolved = true;
    }
  }

  open(tab: AssistantSidePanelTab): void {
    if (tab === 'palette' && !this.palette()) return;
    this.closeWhenAssistantResolved = false;
    this.activeTab.set(tab);
    this.pushMobileHistoryEntry();
    this.expanded.set(true);
  }

  setAssistantConfigured(configured: boolean): void {
    this.assistantConfigured.set(configured);
    if (!configured && this.closeWhenAssistantResolved && !this.palette()) {
      this.close();
    }
    this.closeWhenAssistantResolved = false;
  }

  close(): void {
    if (this.viewport.isMobile() && this.historyEntryActive
      && window.history.state?.[this.historyStateKey] === true) {
      this.historyEntryActive = false;
      this.expanded.set(false);
      window.history.back();
      return;
    }

    this.expanded.set(false);
  }

  toggle(tab: AssistantSidePanelTab): void {
    if (this.expanded() && this.activeTab() === tab) {
      this.close();
      return;
    }
    this.open(tab);
  }

  collapseForPaletteDrag(): void {
    if (this.viewport.isMobile()) {
      this.close();
    }
  }

  private pushMobileHistoryEntry(): void {
    if (!this.viewport.isMobile() || this.historyEntryActive) return;

    const state = window.history.state;
    window.history.pushState(
      state && typeof state === 'object'
        ? { ...state, [this.historyStateKey]: true }
        : { [this.historyStateKey]: true },
      '',
      window.location.href,
    );
    this.historyEntryActive = true;
  }
}
