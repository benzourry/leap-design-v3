import { Directive, OnDestroy, OnInit, TemplateRef, inject } from '@angular/core';
import { AssistantSidePanelService } from './assistant-side-panel.service';

@Directive({
  selector: 'ng-template[assistantPalettePanel]',
})
export class AssistantPaletteDirective implements OnInit, OnDestroy {
  private readonly template = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly panel = inject(AssistantSidePanelService);
  private readonly owner = {};

  ngOnInit(): void {
    this.panel.registerPalette(this.owner, this.template);
  }

  ngOnDestroy(): void {
    this.panel.unregisterPalette(this.owner);
  }
}
