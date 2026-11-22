import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AssistantChanged } from './assistant.types';
import { AssistantDrawerComponent } from './assistant-drawer.component';
import { AssistantLocalContextService } from './assistant-local-context.service';
import { AssistantSidePanelService } from './assistant-side-panel.service';

@Component({
  selector: 'app-assistant-side-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assistant-side-panel.component.html',
  styleUrl: './assistant-side-panel.component.scss',
  imports: [NgTemplateOutlet, FaIconComponent, AssistantDrawerComponent],
})
export class AssistantSidePanelComponent {
  private readonly minWidth = 240;
  private readonly maxWidth = 512;
  private readonly defaultWidth = 240;
  private readonly storageKey = 'leap-assistant-panel-width';

  readonly panel = inject(AssistantSidePanelService);
  readonly localContext = inject(AssistantLocalContextService);
  readonly panelWidth = signal(this.loadPanelWidth());
  readonly resizing = signal(false);
  readonly tabCount = computed(() =>
    Number(this.panel.palette() !== null) + Number(this.assistantAvailable())
  );

  appId = input.required<number>();
  app = input.required<{ id: number; title?: string; description?: string }>();
  email = input.required<string>();
  assistantAvailable = input(true);
  changed = output<AssistantChanged>();

  startResize(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.resizing.set(true);
  }

  @HostListener('window:pointermove', ['$event'])
  resize(event: PointerEvent): void {
    if (!this.resizing()) return;
    const width = Math.min(this.maxWidth, Math.max(this.minWidth, window.innerWidth - event.clientX));
    this.panelWidth.set(width);
  }

  @HostListener('window:pointerup')
  finishResize(): void {
    if (!this.resizing()) return;
    this.resizing.set(false);
    localStorage.setItem(this.storageKey, String(this.panelWidth()));
  }

  @HostListener('window:pointercancel')
  cancelResize(): void {
    this.resizing.set(false);
  }

  resetWidth(event: MouseEvent): void {
    event.preventDefault();
    this.panelWidth.set(this.defaultWidth);
    localStorage.removeItem(this.storageKey);
  }

  private loadPanelWidth(): number {
    const storedWidth = Number(localStorage.getItem(this.storageKey));
    return Number.isFinite(storedWidth) && storedWidth >= this.minWidth && storedWidth <= this.maxWidth
      ? storedWidth
      : this.defaultWidth;
  }

}
