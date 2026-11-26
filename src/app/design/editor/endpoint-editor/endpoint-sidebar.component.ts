import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { EndpointService } from '../../../service/endpoint.service';
import { EndpointEditData } from './endpoint-edit-dialog.component';
import { EndpointEditDialogService } from './endpoint-edit-dialog.service';

interface EndpointListItem extends EndpointEditData {
  id: number;
  name: string;
}

@Component({
  selector: 'app-endpoint-sidebar',
  templateUrl: './endpoint-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndpointSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly user = input<{ email: string } | null>(null);
  readonly offline = input(false);
  readonly endpointList = signal<EndpointListItem[]>([]);
  readonly endpointTotal = signal(0);
  readonly itemLoading = signal(false);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly itemsPerPage = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };
  private readonly endpointService = inject(EndpointService);
  private readonly editDialog = inject(EndpointEditDialogService);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;

  constructor() {
    effect(onCleanup => {
      if (!this.appId()) return;
      this.searchText.set('');
      untracked(() => this.loadEndpointList(1));
      onCleanup(() => this.listRequest?.unsubscribe());
    });
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if (change?.key === 'endpoint-list-changed') this.loadEndpointList(change.page ?? this.pageNumber());
    });
  }

  loadEndpointList(pageNumber: number) {
    const appId = this.appId();
    if (!appId) return;
    this.listRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);
    this.listRequest = this.endpointService.getEndpointList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: EndpointListItem[]; page?: { totalElements: number } }) => {
        this.endpointList.set(response.content);
        this.endpointTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemLoading.set(false);
        this.toastService.show('Unable to load endpoints', { classname: 'bg-danger text-light' });
      }
    });
  }

  createEndpoint() {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline()) return;
    const data = { method: 'GET', responseType: 'json', enabled: 1, email: user.email };
    this.editDialog.open(Number(appId), data, this.endpointList()).then(result => {
      this.endpointService.save(user.email, Number(appId), result).subscribe({
        next: (saved: { id: number }) => {
          this.commService.emitChange({ key: 'endpoint-list-changed' });
          this.router.navigate(['/design', appId, 'endpoint'], { queryParams: { id: saved.id } });
          this.toastService.show('Template successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.toastService.show('Template saving failed', { classname: 'bg-danger text-light' })
      });
    }, () => {});
  }
}
