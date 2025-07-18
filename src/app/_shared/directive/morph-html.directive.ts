import {
    Directive,
    ElementRef,
    inject,
    OnChanges,
    SimpleChanges,
    SecurityContext,
    input,
    ChangeDetectorRef
  } from '@angular/core';
  import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
  import nanomorph from 'nanomorph';
  
  @Directive({
    selector: '[morphHtml]',
    standalone: true,
  })
  export class MorphHtmlDirective implements OnChanges {
    // Input for HTML string, alias 'morphHtml'
    // readonly htmlContent = input<string>('', { alias: 'morphHtml' });
    readonly htmlContent = input<string | SafeHtml>('', { alias: 'morphHtml' });
    // Input for mode: 'inner' or 'outer'
    readonly morphMode = input<'inner' | 'outer'>('inner');
  
    private elRef = inject(ElementRef<HTMLElement>);
    private sanitizer = inject(DomSanitizer);
  
    // Cache last sanitized HTML to skip redundant morphs
    private lastSanitized = '';
    // Reusable temp container for parsing HTML strings
    private tmp = document.createElement('div');

    private cdr = inject(ChangeDetectorRef);
  
    ngOnChanges(changes: SimpleChanges) {
      // Only attempt patch when htmlContent or morphMode changes
      if ('htmlContent' in changes || 'morphMode' in changes) {
        this.tryPatch();
      }
    }
  
    private tryPatch() {
      const raw = this.htmlContent() ?? '';
      // Sanitize the raw HTML
      const s = this.sanitizer.sanitize(SecurityContext.HTML, raw) ?? '';
      // If sanitized content unchanged from last time, skip
      if (s === this.lastSanitized) return;
      this.lastSanitized = s;
      // Proceed to actual patch
      this.doPatch(s);
    }
  
    private doPatch(sanitized: string) {
      const host = this.elRef.nativeElement;
      const mode = this.morphMode();
  
      // Parse sanitized HTML into tmp container
      this.tmp.innerHTML = sanitized;
      const first = this.tmp.firstElementChild as HTMLElement | null;      
      const hasOnlyText = !first && this.tmp.textContent?.trim();

      const hasMultipleChildren = this.tmp.childNodes.length > 1;

      if (hasOnlyText) {
        this.preserveAndMorph(host, () => {
          if (mode === 'outer') {
            for (const a of Array.from(host.attributes) as Attr[]) {
              host.removeAttribute(a.name);
            }
          }
          host.textContent = this.tmp.textContent;
        });
        this.tmp.innerHTML = '';
        return;
      }
  
      if (mode === 'inner' || (mode === 'outer' && hasMultipleChildren)) {
        // INNER MODE: only update children, keep host element & its attributes
        // Early exit: if no parsed children and host already empty, nothing to do
        if (!first && host.childNodes.length === 0) {
          this.tmp.innerHTML = '';
          return;
        }
  
        // Create a wrapper with same tagName to morph against
        const wrapper = document.createElement(host.tagName.toLowerCase());
        // Copy host attributes so nanomorph won't remove them
        for (const a of Array.from(host.attributes) as Attr[]) {
          wrapper.setAttribute(a.name, a.value);
        }
        // Append cloned child nodes from parsed HTML
        for (const node of Array.from(this.tmp.childNodes)) {
          wrapper.appendChild(node.cloneNode(true));
        }
  
        // Preserve data-nomorph nodes during morph
        this.preserveAndMorph(host, () => {
          // Morph host → wrapper: since attributes match, only children update
          nanomorph(host, wrapper);
        });
      }
      else { // OUTER MODE: update attributes + children, but keep host element
        if (!first) {
          // If parsed HTML is empty: clear host attributes & children
          for (const a of Array.from(host.attributes) as Attr[]) {
            host.removeAttribute(a.name);
          }
          host.innerHTML = '';
          this.tmp.innerHTML = '';
          return;
        }
        // If tag names differ, warn but still proceed to simulate updating
        if (first.tagName.toLowerCase() !== host.tagName.toLowerCase()) {
          console.warn(
            '[morphHtml] Tag mismatch in outer mode — host:',
            host.tagName,
            'new:', first.tagName,
            '— preserving host node.'
          );
        }
        // Preserve data-nomorph nodes, then apply attribute and child updates in one go
        this.preserveAndMorph(host, () => {
          // Replace host attributes with those from parsed first child
          for (const a of Array.from(host.attributes) as Attr[]) {
            host.removeAttribute(a.name);
          }
          for (const a of Array.from(first.attributes) as Attr[]) {
            host.setAttribute(a.name, a.value);
          }
          // Morph children
          nanomorph(host, first);
        });
      }
  
      // console.debug('[morphHtml] Morph applied:')

      this.cdr.detectChanges(); // Ensure change detection runs after morph
      // Clear tmp for next parse
      this.tmp.innerHTML = '';
    }
  
    /**
     * Cache and restore elements marked with [data-nomorph][id].
     * We clone them before morph, run fn(), then re-merge attributes & innerHTML.
     */
    private preserveAndMorph(host: HTMLElement, fn: () => void) {
      // Step 1: cache preserved nodes
      const preserved: [string, HTMLElement][] = [];
      host.querySelectorAll('[data-nomorph][id]').forEach(el => {
        preserved.push([el.id, el.cloneNode(true) as HTMLElement]);
      });
  
      // Step 2: perform the provided morph operation
      fn();
  
      // Step 3: restore preserved nodes by merging into current DOM
      for (const [id, clone] of preserved) {
        const cur = host.querySelector(`#${CSS.escape(id)}`);
        if (cur instanceof HTMLElement && cur.hasAttribute('data-nomorph')) {
          // Merge cloned attributes
          for (const a of Array.from(clone.attributes) as Attr[]) {
            cur.setAttribute(a.name, a.value);
          }
          // Merge innerHTML
          cur.innerHTML = clone.innerHTML;
        }
      }
    }
  }
  
  /*

import {
  Directive,
  ElementRef,
  inject,
  OnInit, // 🔧 changed
  OnDestroy, // 🔧 changed
  SecurityContext,
  input
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs'; // 🔧 changed
import { debounceTime } from 'rxjs/operators'; // 🔧 changed
import nanomorph from 'nanomorph';

@Directive({
  selector: '[morphHtml]',
  standalone: true,
})
export class HtmlMorphDirective implements OnInit, OnDestroy { // 🔧 changed
  readonly htmlContent = input<string>('', { alias: 'morphHtml' });
  readonly morphMode = input<'inner' | 'outer'>('inner');

  private el = inject(ElementRef<HTMLElement>);
  private sanitizer = inject(DomSanitizer);

  // 🔧 NEW: debounce stream and subscription
  private htmlStream = new Subject<string>();
  private sub?: Subscription;

  // 🔧 Replaces ngOnChanges
  ngOnInit() {
    this.sub = this.htmlStream.pipe(debounceTime(200)).subscribe((html) => {
      setTimeout(() => this.patchHTML(html), 0);
    });
  }

  // 🔧 unsubscribe to avoid memory leak
  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // 🔧 new trigger when htmlContent input changes
  ngDoCheck() {
    this.htmlStream.next(this.htmlContent());
  }

  // 🔧 accepts the debounced html
  private patchHTML(rawHtml: string) {
    const host = this.el.nativeElement;
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) ?? '';
    const morphMode = this.morphMode();

    if (morphMode === 'inner') {
      const temp = document.createElement('div');
      temp.innerHTML = sanitized;

      const wrapper = document.createElement(host.tagName.toLowerCase());

      for (const attr of Array.from(host.attributes) as Attr[]) {
        wrapper.setAttribute(attr.name, attr.value);
      }

      for (const node of Array.from(temp.childNodes)) {
        wrapper.appendChild(node.cloneNode(true));
      }

      nanomorph(host, wrapper);
    } else if (morphMode === 'outer') {
      const temp = document.createElement('div');
      temp.innerHTML = sanitized;

      const newNode = temp.firstElementChild;
      if (!newNode || !(newNode instanceof HTMLElement)) return;

      if (newNode.tagName.toLowerCase() !== host.tagName.toLowerCase()) {
        console.warn(
          '[morphHtml] Tag mismatch in outer mode — host:',
          host.tagName,
          'new:',
          newNode.tagName,
          '— preserving host node.'
        );
      }

      for (const attr of Array.from(host.attributes) as Attr[]) {
        host.removeAttribute(attr.name);
      }
      for (const attr of Array.from(newNode.attributes) as Attr[]) {
        host.setAttribute(attr.name, attr.value);
      }

      nanomorph(host, newNode);
    }
  }
}

*/
