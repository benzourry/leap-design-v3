import { Injectable, TemplateRef, effect, inject, signal } from '@angular/core';
import { ViewportService } from '../../../_shared/service/viewport.service';

export type AssistantSidePanelTab = 'palette' | 'assistant';

interface PaletteRegistration {
  owner: object;
  template: TemplateRef<unknown>;
}

@Injectable({ providedIn: 'root' })
export class AssistantSidePanelService {
  private readonly viewport = inject(ViewportService);

  readonly expanded = signal(false);
  readonly activeTab = signal<AssistantSidePanelTab>('assistant');
  readonly palette = signal<PaletteRegistration | null>(null);

  constructor() {
    effect(() => {
      if (this.viewport.isMobile()) this.expanded.set(false);
    });
  }

  registerPalette(owner: object, template: TemplateRef<unknown>): void {
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
  }

  open(tab: AssistantSidePanelTab): void {
    if (tab === 'palette' && !this.palette()) return;
    this.activeTab.set(tab);
    this.expanded.set(true);
  }

  close(): void {
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
}
