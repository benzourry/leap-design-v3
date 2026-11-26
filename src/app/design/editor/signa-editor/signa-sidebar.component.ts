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
import { nl2br } from '../../../_shared/utils';
import { SignaService } from '../../../service/signa.service';
import { SignaEditDialogService } from './signa-edit-dialog.service';

interface SignaListItem {
  id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-signa-sidebar',
  templateUrl: './signa-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignaSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly user = input<{ email: string } | null>(null);
  readonly offline = input(false);
  readonly signaList = signal<SignaListItem[]>([]);
  readonly signaTotal = signal(0);
  readonly itemLoading = signal(false);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly itemsPerPage = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };

  private readonly signaService = inject(SignaService);
  private readonly editDialog = inject(SignaEditDialogService);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;

  constructor() {
    effect(onCleanup => {
      if (!this.appId()) return;
      this.searchText.set('');
      untracked(() => this.loadSignaList(1));
      onCleanup(() => this.listRequest?.unsubscribe());
    });
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if (change?.key === 'signa-list-changed') this.loadSignaList(change.page ?? this.pageNumber());
    });
  }

  loadSignaList(pageNumber: number) {
    const appId = this.appId();
    if (!appId) return;
    this.listRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);
    this.listRequest = this.signaService.getSignaList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: SignaListItem[]; page?: { totalElements: number } }) => {
        this.signaList.set(response.content);
        this.signaTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemLoading.set(false);
        this.toastService.show('Unable to load signatures', { classname: 'bg-danger text-light' });
      }
    });
  }

  createSigna() {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline()) return;
    this.editDialog.open({ hashAlg: 'SHA256', keyAlg: 'RSA', keystoreType: 'PKCS12', email: user.email }).then(data => {
      data.content = nl2br(data.content);
      this.signaService.saveSigna(user.email, Number(appId), data).subscribe({
        next: (result: { id: number }) => {
          this.commService.emitChange({ key: 'signa-list-changed' });
          this.router.navigate(['/design', appId, 'signa'], { queryParams: { id: result.id } });
          this.toastService.show('Signa successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.toastService.show('Signa saving failed', { classname: 'bg-danger text-light' })
      });
    }, () => {});
  }
}
