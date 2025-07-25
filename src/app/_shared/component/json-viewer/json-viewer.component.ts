import { Component, Signal, WritableSignal, signal, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'json-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="json-root">

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

            <span class="json-value" [ngClass]="{ 'string': isString(value) }">
              {{ isFormatted(path) ? '"' + formatValue(value) + '"': (isString(value) ? '"' + value + '"' : value)}}
            </span>

            @if (isFormatCandidate(value)){
              <button class="format-toggle" (click)="toggleFormat(path)" title="Toggle format">
                🪄
              </button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .json-root {
      font-family: monospace;
      font-size: 14px;
      line-height: 1.5;
    }

    .controls {
      margin-bottom: 0.5rem;
    }

    .json-button {
      margin-right: 0.5rem;
      padding: 2px 8px;
      font-size: 12px;
      cursor: pointer;
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .json-key {
      color: brown;
    }

    .json-value {
      color: navy; 
    }

    .json-value.string {
      color: green;
    }

    .json-bracket {
      color: gray;
    }

    // .json-node, 
    .json-leaf {
      margin-left: 1rem;
    }

    .toggle {
      cursor: pointer;
      user-select: none;
    }

    .arrow {
      display: inline-block;
      width: 1rem;
    }

    .json-children {
      margin-left: 1.5rem;
    }
    .format-toggle {
      margin-left: 4px;
      font-size: 11px;
      cursor: pointer;
      background: none;
      border: none;
      color: #666;
    }
    .format-toggle:hover,
    .format-toggle:active {
      color: black;
    }
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
    return obj ? Object.keys(obj) : [];
  }

  isExpandable(value: any): boolean {
    return value !== null && typeof value === 'object';
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
    // Example: Unix timestamp formatting
    if (this.isFormatCandidate(value)) {
      const date = new Date(value); // assume seconds
      return date.toISOString();
    }
    return value;
  }

  isFormatCandidate(value: any): boolean {
    return typeof value === 'number' && value > 1000000000 && value < 9999999999999;
  }
}
