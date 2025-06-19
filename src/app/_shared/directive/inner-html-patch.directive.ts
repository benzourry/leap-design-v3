import {
    Directive,
    ElementRef,
    Input,
    effect,
    signal,
    inject,
    ChangeDetectorRef,SecurityContext
  } from '@angular/core';
  import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
  import morphdom from 'morphdom';
  
  @Directive({
    selector: '[htmlPatch]',
    standalone: true,
  })
  export class HtmlPatchDirective {
    private el = inject(ElementRef<HTMLElement>);
    private domSanitizer = inject(DomSanitizer);
    private cdr = inject(ChangeDetectorRef);
  
    private htmlSignal = signal<string>('');
    private modeSignal = signal<'inner' | 'outer'>('inner');
  
    @Input({ required: true })
    set htmlPatch(value: string | SafeHtml) {
      const html = this.unwrapSafeHtml(value);
      this.htmlSignal.set(html);
    }
  
    @Input()
    set patchMode(value: 'inner' | 'outer') {
      this.modeSignal.set(value || 'inner');
    }
  
    constructor() {
      effect(() => {
        const html = this.htmlSignal();
        const mode = this.modeSignal();
  
        // Defer the actual DOM patch until after the current CD cycle:
        // queueMicrotask(() => {
          if (mode === 'inner') {
            this.patchInner(html);
          } else {
            this.patchOuter(html);
          }
          // After patching, trigger change detection so Angular sees the updated DOM if needed
          this.cdr.detectChanges();
        // });
      });
    }
  
    private unwrapSafeHtml(value: string | SafeHtml): string {
      if (typeof value === 'string') return value;
      // Properly unwrap SafeHtml:
      return this.domSanitizer.sanitize(SecurityContext.HTML, value) ?? '';
    }
  
    private patchInner(html: string) {
      const host = this.el.nativeElement;
      morphdom(
        host,
        `<${host.tagName.toLowerCase()}>${html}</${host.tagName.toLowerCase()}>`,
        { childrenOnly: true, 
            onBeforeElUpdated: function(fromEl, toEl) {
                // spec - https://dom.spec.whatwg.org/#concept-node-equals
                if (fromEl.isEqualNode(toEl)) {
                    return false
                }
        
                return true
            }
         }
      );
    }
  
    private patchOuter(html: string) {
      const host = this.el.nativeElement;
      morphdom(host, html, {
        childrenOnly: false,
        onBeforeElUpdated: (fromEl, toEl) => fromEl.isSameNode(host),
      });
    }
  }
  