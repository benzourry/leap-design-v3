import { Component, Input, Output, EventEmitter, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, JsonPipe, UpperCasePipe } from '@angular/common';
import { NgbPaginationModule, NgbDatepickerModule, NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ToastService } from '../../service/toast-service';
import { MetaTrailService } from '../../../service/metatrail.service';

@Component({
  selector: 'app-meta-trail-viewer',
  templateUrl: './meta-trail-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule, DatePipe, JsonPipe, UpperCasePipe,
    NgbPaginationModule, NgbDatepickerModule, NgbDropdownModule,
    FaIconComponent
  ]
})
export class MetaTrailViewerComponent implements OnInit {
  @Input() scope!: string;
  @Output() onReverted = new EventEmitter<void>();

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

  ngOnInit() {
    if (this.scope) {
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

    this.metaTrailService.getMetaTrails(this.scope, params)
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

  viewMetaTrailJson(content: TemplateRef<any>, data: any) {
    this.selectedMetaTrailData = data;
    history.pushState(null, '', window.location.href);
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
}