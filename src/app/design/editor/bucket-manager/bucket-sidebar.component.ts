import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { BucketService } from '../../../service/bucket.service';
import { BucketEditDialogService } from './bucket-edit-dialog.service';

interface BucketListItem {
  id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-bucket-sidebar',
  templateUrl: './bucket-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BucketSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly offline = input(false);
  readonly bucketList = signal<BucketListItem[]>([]);
  readonly bucketTotal = signal(0);
  readonly itemLoading = signal(false);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly itemsPerPage = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };
  private readonly bucketService = inject(BucketService);
  private readonly editDialog = inject(BucketEditDialogService);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;

  constructor() {
    effect(onCleanup => {
      if (!this.appId()) return;
      this.searchText.set('');
      untracked(() => this.loadBucketList(1));
      onCleanup(() => this.listRequest?.unsubscribe());
    });
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if (change?.key === 'bucket-list-changed' && String(change.appId) === String(this.appId())) {
        this.loadBucketList(change.page ?? this.pageNumber());
      }
    });
  }

  loadBucketList(pageNumber: number) {
    const appId = this.appId();
    if (!appId) return;
    this.listRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);
    this.listRequest = this.bucketService.getBucketList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: BucketListItem[]; page?: { totalElements: number } }) => {
        this.bucketList.set(response.content);
        this.bucketTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemLoading.set(false);
        this.toastService.show('Unable to load buckets', { classname: 'bg-danger text-light' });
      }
    });
  }

  openBucket(id: number) {
    const appId = this.appId();
    const target = this.router.createUrlTree(['/design', appId, 'bucket'], { queryParams: { id } });
    if (this.router.isActive(target, this.itemMatchOptions)) {
      this.commService.emitChange({ key: 'bucket-reload-current', appId, id });
    }
  }

  createBucket() {
    const appId = this.appId();
    if (!appId || this.offline()) return;
    this.editDialog.open(Number(appId), {}).then(data => {
      this.bucketService.save(Number(appId), data).subscribe({
        next: (result: { id: number }) => {
          this.commService.emitChange({ key: 'bucket-list-changed', appId });
          this.commService.emitChange({ key: 'editor-search-refresh', category: 'bucket' });
          this.router.navigate(['/design', appId, 'bucket'], { queryParams: { id: result.id } });
          this.toastService.show('Bucket successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.toastService.show('Bucket saving failed', { classname: 'bg-danger text-light' })
      });
    }, () => {});
  }
}
