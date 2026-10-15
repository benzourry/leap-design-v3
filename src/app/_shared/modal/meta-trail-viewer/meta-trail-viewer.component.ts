import { Component, Input, Output, EventEmitter, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, JsonPipe, UpperCasePipe } from '@angular/common';
import { NgbPaginationModule, NgbDatepickerModule, NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ToastService } from '../../service/toast-service';
import { MetaTrailService } from '../../../service/metatrail.service';
import { JsonViewerComponent } from '../../component/json-viewer/json-viewer.component';
import { GroupByPipe } from '../../pipe/group-by.pipe';

@Component({
  selector: 'app-meta-trail-viewer',
  templateUrl: './meta-trail-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule, DatePipe, UpperCasePipe,
    NgbPaginationModule, NgbDatepickerModule, NgbDropdownModule,
    FaIconComponent,
    JsonViewerComponent, GroupByPipe, JsonPipe
]
})
export class MetaTrailViewerComponent implements OnInit {
  @Input() scope!: string;
  @Input() appId?: number;
  @Input() canRevert?: boolean = false;
  @Output() onReverted = new EventEmitter<void>();
  @Input() current: any;
  @Input() currentScope?: string;

  private metaTrailService = inject(MetaTrailService);
  private toastService = inject(ToastService);
  private modalService = inject(NgbModal);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  metaTrailsSearchText: string = "";
  metaTrails: any[] = [];
  metaTrailsTotal: number = 0;
  metaTrailsPageSize: number = 25;
  metaTrailsPageNumber: number = 1;
  metaTrailFrom: any;
  metaTrailTo: any;
  selectedMetaTrailData: any;
  selectedMetaTrailScope: string;

  diffResults: any[] = [];

  ngOnInit() {
    if (this.scope || this.appId) {
      this.loadMetaTrails(1);
    }
  }

  loadMetaTrails(pageNumber: number, pageSize?: number) {
    this.metaTrailsPageNumber = pageNumber;
    if (pageSize) {
      this.metaTrailsPageSize = pageSize;
    }

    const params: any = {
      page: pageNumber - 1,
      size: this.metaTrailsPageSize,
      sort: 'timestamp,desc'
    };

    if (this.metaTrailsSearchText) params.searchText = this.metaTrailsSearchText;
    if (this.metaTrailFrom) params.dateFrom = this.metaTrailFrom;
    if (this.metaTrailTo) params.dateTo = this.metaTrailTo;

    // 3. Dynamically choose the correct endpoint
    const request$ = this.appId 
      ? this.metaTrailService.getMetaTrailsByAppId(this.appId, params)
      : this.metaTrailService.getMetaTrails(this.scope, params);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.metaTrails = res.content || [];
          this.metaTrailsTotal = res.page?.totalElements || res.totalElements || 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.toastService.show("Failed to load audit trails.", { classname: 'bg-danger text-light' });
        }
      });
  }

  // viewMetaTrailJson(content: TemplateRef<any>, data: any) {
  //   this.selectedMetaTrailData = data;
  //   history.pushState(null, '', window.location.href);
  //   this.modalService.open(content, { backdrop: 'static', size: 'lg', scrollable: true })
  //     .result.then(() => {}, () => {});
  // }

  viewMetaTrailJson(content: any, data: any, scope: string) {
    this.selectedMetaTrailData = data;
    this.selectedMetaTrailScope = scope; // <-- Save the scope
    
    this.modalService.open(content, { backdrop: 'static', size: 'lg', scrollable: true })
        .result.then(() => {}, () => {});
  }

  revertMetaTrail(trailId: string) {
    if (confirm("Are you sure you want to revert to this exact snapshot? This will overwrite current configurations.")) {
      this.metaTrailService.revertMetaTrail(trailId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.toastService.show(res.message || "Reverted successfully", { classname: 'bg-success text-light' });
            this.loadMetaTrails(1); // Refresh the table
            this.onReverted.emit(); // Tell parent to refresh its data
          },
          error: (err) => {
            this.toastService.show("Failed to revert: " + (err.error?.message || err.message), { classname: 'bg-danger text-light' });
          }
        });
    }
  }

  copyToClipboard(data: any) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      this.toastService.show("JSON copied to clipboard", { classname: 'bg-success text-light' });
    });
  }

  getEntityName(trail: any): string {
    if (!trail?.data) return 'N/A';

    switch (trail.module) {
      // Modules that use 'title'
      case 'form':
      case 'form_section':
      case 'screen':
      case 'dataset':
        return trail.data.title || 'N/A';

      // Modules that use 'name'
      case 'lambda':
      case 'emailTemplate':
        return trail.data.name || 'N/A';

      // Modules that use 'label'
      case 'form_item':
        return trail.data.label || 'N/A';

      // Fallback for unknown modules
      default:
        return 'N/A';
    }
  }

  formatEmail(email: string): string {
    if (!email) return 'Unknown';
    
    const parts = email.split('@');
    // If it's a valid email with an '@' symbol
    if (parts.length === 2) {
      return `${parts[0]}@${parts[1].charAt(0)}...`;
    }
    
    // Fallback if the string doesn't contain an '@'
    return email; 
  }

  hoveredTrailId: string | null = null;


  viewDiff(content: TemplateRef<any>, snapshotData: any) {
    this.diffResults = this.generateDiff(this.current, snapshotData);
    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'xl', scrollable: true })
      .result.then(() => {}, () => {});
  }

  generateDiff(current: any, snapshot: any, path: string = ''): any[] {
    let changes: any[] = [];
    
    const currIsObj = current !== null && typeof current === 'object';
    const snapIsObj = snapshot !== null && typeof snapshot === 'object';

    if (currIsObj && snapIsObj) {
      const keys = new Set([...Object.keys(current || {}), ...Object.keys(snapshot || {})]);
      
      keys.forEach(key => {
        // 1. Ignore computed fields (e.g., _f, _pre, _onSave)
        if (key.startsWith('_')) return;
        
        // 2. Ignore the heavy 'app' object at the root level
        if (path === '' && key === 'app') return;

        const p = path ? `${path}.${key}` : key;
        const cVal = current[key];
        const sVal = snapshot[key];

        // 3. Handle Stubbed References 
        // (If snapshot only has {id: 123}, we only compare the IDs and ignore the rest of the live object's data)
        const sIsStub = sVal && typeof sVal === 'object' && Object.keys(sVal).length === 1 && sVal.hasOwnProperty('id');
        const cHasId = cVal && typeof cVal === 'object' && cVal.hasOwnProperty('id');
        
        if (sIsStub && cHasId) {
          if (sVal.id !== cVal.id) {
            changes.push({ path: p + '.id', type: 'changed', oldValue: sVal.id, newValue: cVal.id });
          }
          return; // Skip deeper comparison since the relationship IDs match
        }

        if (sVal === undefined && cVal !== undefined) {
          changes.push({ path: p, type: 'added', oldValue: undefined, newValue: cVal });
        } else if (cVal === undefined && sVal !== undefined) {
          changes.push({ path: p, type: 'removed', oldValue: sVal, newValue: undefined });
        } else if (typeof cVal === 'object' && typeof sVal === 'object' && cVal !== null && sVal !== null) {
          // Recursively compare nested objects/arrays
          changes = changes.concat(this.generateDiff(cVal, sVal, p));
        } else if (cVal !== sVal) {
          changes.push({ path: p, type: 'changed', oldValue: sVal, newValue: cVal });
        }
      });
    } else if (current !== snapshot) {
      changes.push({ path: path || 'root', type: 'changed', oldValue: snapshot, newValue: current });
    }
    
    return changes;
  }
}