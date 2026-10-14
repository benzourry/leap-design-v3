import { Component, Signal, WritableSignal, signal, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'json-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="json-root">
      @if (isExpandable(json())) {
        @for (key of getKeys(json()); track key) {
          @let value = json()[key];
          @let path = key;

          @if (isExpandable(value)) {
            <div class="json-node">
              <div class="toggle" (click)="toggle(path)">
                <span class="arrow">{{ isExpanded(path) ? '⏷' : '⏵' }}</span>
                <span class="json-key">"{{ key }}"</span>:
                <span class="json-bracket">{{ isArray(value) ? '[...]' : '{...}' }}</span>
              </div>
              @if (isExpanded(path)) {
                <div class="json-children">
                  <json-viewer [json]="value" [basePath]="path"></json-viewer>
                </div>
              }
            </div>
          } @else {
            <div class="json-leaf">
              <span class="json-key">"{{ key }}"</span>:

              <!-- ✅ NEW: Handle empty objects/arrays gracefully without arrows -->
              @if (isEmpty(value)) {
                <span class="json-bracket">{{ isArray(value) ? '[]' : '{}' }}</span>
              } @else {
                <span class="json-value" [class.string]="isString(value)">
                  {{ isFormatted(path) ? '"' + formatValue(value) + '"': (isString(value) ? '"' + value + '"' : value)}}
                </span>

                @if (isFormatCandidate(value)){
                  <button class="format-toggle" (click)="toggleFormat(path)" title="Toggle format">
                    🪄
                  </button>
                }
              }
            </div>
          }
        }
      } @else {
        <div class="json-primitive">
          <!-- ✅ NEW: Handle empty objects/arrays at the root level -->
          @if (isEmpty(json())) {
            <span class="json-bracket">{{ isArray(json()) ? '[]' : '{}' }}</span>
          } @else {
            <span class="json-value" [class.string]="isString(json())">
              {{ isFormatted(basePath() || 'root') ? '"' + formatValue(json()) + '"': (isString(json()) ? '"' + json() + '"' : json())}}
            </span>

            @if (isFormatCandidate(json())){
              <button class="format-toggle" (click)="toggleFormat(basePath() || 'root')" title="Toggle format">
                🪄
              </button>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* ... Keep all your previous styles exactly as they were ... */
    .json-root {
      --jv-key-color: brown;
      --jv-value-color: navy;
      --jv-string-color: green;
      --jv-bracket-color: gray;
      
      --jv-btn-bg: #f0f0f0;
      --jv-btn-border: #ccc;
      --jv-btn-text: #333;
      
      --jv-toggle-color: #666;
      --jv-toggle-hover-color: black;

      font-family: var(--bs-font-monospace, monospace);
      font-size: 14px;
      line-height: 1.5;
      color: var(--bs-body-color, inherit); 
    }

    :host-context([data-bs-theme="dark"]) .json-root {
      --jv-key-color: #d19a66;     
      --jv-value-color: #56b6c2;   
      --jv-string-color: #98c379;  
      --jv-bracket-color: #abb2bf; 
      
      --jv-btn-bg: #2b3035;        
      --jv-btn-border: #495057;    
      --jv-btn-text: #f8f9fa;      
      
      --jv-toggle-color: #adb5bd;
      --jv-toggle-hover-color: #fff;
    }

    .controls { margin-bottom: 0.5rem; }
    .json-button { margin-right: 0.5rem; padding: 2px 8px; font-size: 12px; cursor: pointer; background: var(--jv-btn-bg); border: 1px solid var(--jv-btn-border); color: var(--jv-btn-text); border-radius: 4px; }
    .json-key { color: var(--jv-key-color); }
    .json-value { color: var(--jv-value-color); white-space: pre-wrap; word-break: break-word; }
    .json-value.string { color: var(--jv-string-color); }
    .json-bracket { color: var(--jv-bracket-color); }
    .json-leaf, .json-primitive { margin-left: 1rem; }
    .toggle { cursor: pointer; user-select: none; }
    .arrow { display: inline-block; width: 1rem; }
    .json-children { margin-left: 1.5rem; }
    .format-toggle { margin-left: 4px; font-size: 11px; cursor: pointer; background: none; border: none; color: var(--jv-toggle-color); }
    .format-toggle:hover, .format-toggle:active { color: var(--jv-toggle-hover-color); }
  `]
})
export class JsonViewerComponent {
  readonly json: Signal<any> = input();
  readonly basePath: Signal<string> = input('');

  private formatted: WritableSignal<Record<string, boolean>> = signal({});
  private expanded: WritableSignal<Record<string, boolean>> = signal({});

  private getPath(key: string): string {
    const base = this.basePath();
    return base ? `${base}.${key}` : key;
  }

  toggle(key: string): void {
    const path = this.getPath(key);
    this.expanded.update(state => ({
      ...state,
      [path]: !state[path]
    }));
  }

  isExpanded(key: string): boolean {
    return !!this.expanded()[this.getPath(key)];
  }

  expandAll(): void {
    const keys = this.collectExpandableKeys(this.json(), this.basePath());
    const updates: Record<string, boolean> = {};
    for (const key of keys) updates[key] = true;
    this.expanded.set(updates);
  }

  collapseAll(): void {
    this.expanded.set({});
  }

  hasExpandable(obj: any): boolean {
    return this.collectExpandableKeys(obj, this.basePath()).length > 0;
  }

  getKeys(obj: any): string[] {
    return obj && typeof obj === 'object' ? Object.keys(obj) : [];
  }

  // ✅ UPDATED: Only expandable if it actually has keys/children
  isExpandable(value: any): boolean {
    return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
  }

  // ✅ NEW: Helper to identify completely empty objects or arrays
  isEmpty(value: any): boolean {
    return value !== null && typeof value === 'object' && Object.keys(value).length === 0;
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isString(value: any): boolean {
    return typeof value === 'string';
  }

  private collectExpandableKeys(obj: any, base: string): string[] {
    const result: string[] = [];

    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const path = base ? `${base}.${key}` : key;
        if (this.isExpandable(obj[key])) {
          result.push(path);
          result.push(...this.collectExpandableKeys(obj[key], path));
        }
      }
    }

    return result;
  }

  toggleFormat(key: string): void {
    const path = this.getPath(key);
    this.formatted.update(state => ({
      ...state,
      [path]: !state[path]
    }));
  }
  
  isFormatted(key: string): boolean {
    return !!this.formatted()[this.getPath(key)];
  }

  formatValue(value: any): any {
    if (this.isFormatCandidate(value)) {
      const date = new Date(value);
      return date.toISOString();
    }
    return value;
  }

  isFormatCandidate(value: any): boolean {
    return typeof value === 'number' && value > 1000000000 && value < 9999999999999;
  }
}