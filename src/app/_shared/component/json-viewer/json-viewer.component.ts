import { Component, WritableSignal, signal, input, computed, ChangeDetectionStrategy, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'json-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  template: `
    @if (diffMode() && !basePath()) {
      <div class="p-2 px-3 bg-body-secondary text-body-secondary small mb-2">
        Comparing Snapshot vs. Current 
          <span class="text-muted">
            (<span class="text-danger fw-bold text-decoration-line-through">Old</span>
            <span class="text-success fw-bold ms-1">New</span>)
          </span>
      </div>
    }
    <div class="json-root">
      @if (isExp(json()) || isExp(diffWith())) {
        @for (key of getKeys(); track key) {
          @let oV = getVal(json(), key);
          @let nV = diffMode() ? getResolvedDiff(oV, getVal(diffWith(), key)) : getVal(diffWith(), key);
          @let path = getPath(key);
          @let st = getStatus(oV, nV);
          @let txtCls = st === 'add' ? 'text-success fw-bold' : st === 'rem' ? 'text-danger text-decoration-line-through' : '';
          @let bgCls = st === 'add' ? 'diff-added' : st === 'rem' ? 'diff-removed' : st === 'chg' ? 'diff-changed' : '';

          @if (isExp(oV) || isExp(nV)) {
            <div class="json-node" [ngClass]="bgCls">
              <div class="toggle" (click)="toggle(path)">
                @if (diffMode()) { <span class="diff-marker" [ngClass]="txtCls">{{ st === 'add' ? '+' : st === 'rem' ? '-' : (st === 'chg' ? '~' : '') }}</span> }
                <!-- <span class="arrow">{{ expanded()[path] ? '⏷' : '⏵' }}</span> -->
                <!-- <span class="arrow ps-1" [style.font-size]="expanded()[path] ? '0.9em' : '0.7em'">{{ expanded()[path] ? '▼' : '▶' }}</span> -->
                <span class="arrow" style="font-size:0.9em">
                  <fa-icon [icon]="expanded()[path] ? ['fas', 'angle-down'] : ['fas', 'angle-right']" [fixedWidth]="true"></fa-icon>
                </span>
                <span class="json-key" [ngClass]="txtCls">"{{ key }}"</span>:
                <span class="json-bracket">{{ isArr(diffMode() && st !== 'rem' ? nV : oV) ? '[...]' : '{...}' }}</span>
              </div>
              @if (expanded()[path]) {
                <!-- Recursively pass the ignoreArrayOrder setting down the tree -->
                <div class="json-children"><json-viewer [json]="oV" [diffWith]="nV" [diffMode]="diffMode()" [ignoreArrayOrder]="ignoreArrayOrder()" [basePath]="path"></json-viewer></div>
              }
            </div>
          } @else {
            <div class="json-leaf" [ngClass]="bgCls">
              @if (diffMode()) { <span class="diff-marker" [ngClass]="txtCls">{{ st === 'add' ? '+' : st === 'rem' ? '-' : (st === 'chg' ? '~' : '') }}</span> }
              <span class="json-key" [ngClass]="txtCls">"{{ key }}"</span>:

              @if (st === 'chg') {
                @if (isStr(oV) && isStr(nV)) {
                  <!-- Inline Word Diff for Strings -->
                  <span class="json-value string" [innerHTML]="getWordDiff(oV, nV)"></span>
                } @else {
                  <span class="json-value text-danger text-decoration-line-through me-2" [class.string]="isStr(oV)">{{ fmt(oV, path) }}</span>
                  <span class="json-value text-success fw-bold" [class.string]="isStr(nV)">{{ fmt(nV, path) }}</span>
                }
              } @else {
                @let pV = diffMode() ? (st === 'rem' ? oV : nV) : oV;
                @if (isObj(pV) && !isExp(pV)) { <span class="json-bracket">{{ isArr(pV) ? '[]' : '{}' }}</span> } 
                @else {
                  <span class="json-value" [class.string]="isStr(pV)" [ngClass]="txtCls">{{ fmt(pV, path) }}</span>
                  @if (isFmtCand(pV)) { <button class="format-toggle" (click)="toggleFmt(path)" title="Toggle format">🪄</button> }
                }
              }
            </div>
          }
        }
      } @else {
        <div class="json-primitive">
          @let stR = getStatus(json(), diffWith());
          @if (isObj(json()) && !isExp(json()) && !diffMode()) { <span class="json-bracket">{{ isArr(json()) ? '[]' : '{}' }}</span> } 
          @else if (stR === 'chg') {
             @if (isStr(json()) && isStr(diffWith())) {
               <!-- Inline Word Diff for Strings -->
               <span class="json-value string" [innerHTML]="getWordDiff(json(), diffWith())"></span>
             } @else {
               <span class="json-value text-danger text-decoration-line-through me-2" [class.string]="isStr(json())">{{ fmt(json(), basePath() || 'root') }}</span>
               <span class="json-value text-success fw-bold" [class.string]="isStr(diffWith())">{{ fmt(diffWith(), basePath() || 'root') }}</span>
             }
          } @else {
            @let rV = diffMode() ? (stR === 'rem' ? json() : diffWith()) : json();
            <span class="json-value" [class.string]="isStr(rV)" [ngClass]="stR === 'add' ? 'text-success fw-bold' : stR === 'rem' ? 'text-danger text-decoration-line-through' : ''">{{ fmt(rV, basePath() || 'root') }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .json-root { --jv-key-color: brown; --jv-value-color: navy; --jv-string-color: green; --jv-bracket-color: gray; --jv-toggle-color: #666; --jv-toggle-hover-color: black; font-family: var(--bs-font-monospace, monospace); font-size: 14px; line-height: 1.5; color: var(--bs-body-color, inherit); }
    :host-context([data-bs-theme="dark"]) .json-root { --jv-key-color: #d19a66; --jv-value-color: #56b6c2; --jv-string-color: #98c379; --jv-bracket-color: #abb2bf; --jv-toggle-color: #adb5bd; --jv-toggle-hover-color: #fff; }
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
    
    .diff-marker { display: inline-block; width: 1.2rem; font-weight: bold; user-select: none; }
    .diff-added { background-color: rgba(40, 167, 69, 0.12); display: block; border-radius: 2px;}
    .diff-removed { background-color: rgba(220, 53, 69, 0.12); display: block; border-radius: 2px;}
    .diff-changed { background-color: rgba(255, 193, 7, 0.12); display: block; border-radius: 2px;}

    /* Inline Word Diff Styles */
    ::ng-deep .diff-added-inline { background-color: rgba(40, 167, 69, 0.25); color: var(--bs-success, #28a745); font-weight: bold; border-radius: 2px; }
    ::ng-deep .diff-removed-inline { background-color: rgba(220, 53, 69, 0.25); color: var(--bs-danger, #dc3545); text-decoration: line-through; border-radius: 2px; }
  `]
})
export class JsonViewerComponent {
  // 1. Aliased inputs to intercept bindings from the parent component safely
  readonly jsonInput = input<any>(undefined, { alias: 'json' });
  readonly diffWithInput = input<any>(undefined, { alias: 'diffWith' });
  
  readonly diffMode = input<boolean>(false);
  readonly ignoreArrayOrder = input<boolean>(true); // NEW: Configurable flag, defaults to true
  readonly basePath = input<string>('');

  // 2. Computed signals replace standard inputs inside the template
  json = computed(() => this.sortIfArray(this.jsonInput()));
  diffWith = computed(() => this.sortIfArray(this.diffWithInput()));

  formatted: WritableSignal<Record<string, boolean>> = signal({});
  expanded: WritableSignal<Record<string, boolean>> = signal({});
  private sanitizer = inject(DomSanitizer);

  constructor() {
    effect(() => {
      if (!this.diffMode()) return;
      const existingState = untracked(() => this.expanded()); 
      const updates: Record<string, boolean> = { ...existingState }; 
      
      for (const k of this.getKeys()) {
        const o = this.getVal(this.json(), k);
        const n = this.getResolvedDiff(o, this.getVal(this.diffWith(), k));
        
        if ((this.isExp(o) || this.isExp(n)) && this.hasDeepChanges(o, n)) {
          if (updates[this.getPath(k)] === undefined) { 
             updates[this.getPath(k)] = true;
          }
        }
      }
      this.expanded.set(updates);
    }); 
  }

  // --- NEW: Array Alignment Pre-Processor ---
  sortIfArray(val: any): any {
    // If it isn't an array, or if order matters, exit early
    if (!this.ignoreArrayOrder() || !Array.isArray(val)) return val;
    
    // Using Schwartzian transform for extreme high-performance sorting
    return val
      .map(item => {
        let key = item;
        // Identifies the best property to align array elements by
        if (item !== null && typeof item === 'object') {
          key = item.id ?? item.code ?? item.name ?? JSON.stringify(item);
        }
        return { key, item };
      })
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
      .map(wrapper => wrapper.item);
  }

  // --- COMPACT HELPERS ---
  isObj = (v: any) => v !== null && typeof v === 'object';
  isExp = (v: any) => this.isObj(v) && Object.keys(v).length > 0;
  isArr = Array.isArray;
  isStr = (v: any) => typeof v === 'string';
  isFmtCand = (v: any) => typeof v === 'number' && v > 1000000000 && v < 9999999999999;
  
  isStub = (o: any, n: any) => this.isObj(o) && this.isObj(n) && Object.keys(o).length === 1 && o.hasOwnProperty('id') && n.hasOwnProperty('id');
  isEmp = (v: any) => v === undefined || v === null || (this.isObj(v) && Object.keys(v).length === 0);
  
  getPath = (k: string) => this.basePath() ? `${this.basePath()}.${k}` : k;
  getVal = (obj: any, k: string) => this.isObj(obj) ? obj[k] : undefined;
  getResolvedDiff = (o: any, n: any) => this.isStub(o, n) ? { id: n.id } : n;

  toggle = (k: string) => this.expanded.update(s => ({ ...s, [k]: !s[k] }));
  toggleFmt = (p: string) => this.formatted.update(s => ({ ...s, [p]: !s[p] }));

  fmt(v: any, p: string) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (this.isObj(v)) return JSON.stringify(v); 
    return this.formatted()[p] && this.isFmtCand(v) ? `"${new Date(v).toISOString()}"` : (this.isStr(v) ? `"${v}"` : v);
  }

  getKeys(): string[] {
    const k1 = this.isObj(this.json()) ? Object.keys(this.json()) : [];
    const isArrData = this.isArr(this.json()) || this.isArr(this.diffWith());

    if (!this.diffMode()) return isArrData ? k1 : k1.sort();
    
    const k2 = this.isObj(this.diffWith()) ? Object.keys(this.diffWith()) : [];
    const keys = Array.from(new Set([...k1, ...k2]))
      .filter(k => !k.startsWith('_') && !(this.basePath() === '' && k === 'app'));

    return isArrData ? keys.sort((a, b) => Number(a) - Number(b)) : keys.sort();
  }

  getStatus(o: any, n: any) {
    if (!this.diffMode() || o === n || this.isStub(o, n)) return '';
    if (this.isEmp(o) && this.isEmp(n)) return ''; 
    if (o === undefined || o === null) return 'add';
    if (n === undefined || n === null) return 'rem';
    return (this.isObj(o) && this.isObj(n)) ? '' : 'chg';
  }

  hasDeepChanges(o: any, n: any): boolean {
    if (o === n) return false;
    if (this.isStub(o, n)) return String(o.id) !== String(n.id); 
    if (this.isEmp(o) && this.isEmp(n)) return false; 
    if (!this.isObj(o) || !this.isObj(n)) return String(o) !== String(n); 
    
    return Array.from(new Set([...Object.keys(o), ...Object.keys(n)]))
      .filter(k => !k.startsWith('_'))
      .some(k => this.hasDeepChanges(o[k], n[k]));
  }

  // --- INLINE WORD DIFF ENGINE ---
  getWordDiff(oStr: string, nStr: string) {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const o = oStr.match(/([^\s]+|\s+)/g) || [];
    const n = nStr.match(/([^\s]+|\s+)/g) || [];
    
    if (o.length * n.length > 4000000) {
      return this.sanitizer.bypassSecurityTrustHtml(`<span class="diff-removed-inline">"${esc(oStr)}"</span> <span class="diff-added-inline">"${esc(nStr)}"</span>`);
    }

    const m = Array(o.length + 1).fill(0).map(() => new Int32Array(n.length + 1));
    for (let i = 1; i <= o.length; i++) {
      for (let j = 1; j <= n.length; j++) {
        m[i][j] = o[i - 1] === n[j - 1] ? m[i - 1][j - 1] + 1 : Math.max(m[i - 1][j], m[i][j - 1]);
      }
    }

    let i = o.length, j = n.length;
    const stack = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && o[i - 1] === n[j - 1]) {
        stack.unshift(esc(o[i - 1]));
        i--; j--;
      } else if (j > 0 && (i === 0 || m[i][j - 1] >= m[i - 1][j])) {
        stack.unshift(`<span class="diff-added-inline">${esc(n[j - 1])}</span>`);
        j--;
      } else if (i > 0 && (j === 0 || m[i][j - 1] < m[i - 1][j])) {
        stack.unshift(`<span class="diff-removed-inline">${esc(o[i - 1])}</span>`);
        i--;
      }
    }
    return this.sanitizer.bypassSecurityTrustHtml(`"${stack.join('')}"`);
  }
}