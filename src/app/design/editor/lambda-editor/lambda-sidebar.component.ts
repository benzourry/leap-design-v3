import { Clipboard } from '@angular/cdk/clipboard';
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
import { LambdaService } from '../../../service/lambda.service';
import { LambdaEditDialogService } from './lambda-edit-dialog.service';

interface LambdaListItem {
  id: number;
  name: string;
  description?: string;
  email?: string;
}

@Component({
  selector: 'app-lambda-sidebar',
  templateUrl: './lambda-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', './lambda-sidebar.component.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LambdaSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly user = input<{ email: string; manager?: boolean } | null>(null);
  readonly offline = input(false);
  readonly timeWarping = input(false);

  readonly editableLambdas = signal<LambdaListItem[]>([]);
  readonly restrictedLambdas = signal<LambdaListItem[]>([]);
  readonly lambdaTotal = signal(0);
  readonly itemLoading = signal(false);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly showRestrictedLambdas = signal(false);
  readonly itemsPerPage = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };

  private readonly lambdaService = inject(LambdaService);
  private readonly commService = inject(CommService);
  private readonly toastService = inject(ToastService);
  private readonly clipboard = inject(Clipboard);
  private readonly router = inject(Router);
  private readonly editDialog = inject(LambdaEditDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;

  constructor() {
    effect(onCleanup => {
      const appId = this.appId();
      const user = this.user();
      if (!appId || !user) return;

      this.searchText.set('');
      untracked(() => this.loadLambdaList(1));
      onCleanup(() => this.listRequest?.unsubscribe());
    });

    this.commService.changeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(change => {
      if (change?.key === 'assistant-lambda' || change?.key === 'lambda-list-changed') {
        this.loadLambdaList(change.page ?? this.pageNumber());
      }
    });
  }

  loadLambdaList(pageNumber: number) {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user) return;

    this.listRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);
    this.listRequest = this.lambdaService.getLambdaList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: LambdaListItem[]; page?: { totalElements: number } }) => {
        const editable: LambdaListItem[] = [];
        const restricted: LambdaListItem[] = [];
        for (const item of response.content) {
          if (!item.id) continue;
          const emails = item.email?.split(',').map(email => email.trim()) ?? [];
          (!item.email?.trim() || emails.includes(user.email) ? editable : restricted).push(item);
        }
        this.editableLambdas.set(editable);
        this.restrictedLambdas.set(restricted);
        this.lambdaTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemLoading.set(false);
        this.toastService.show('Unable to load lambdas', { classname: 'bg-danger text-light' });
      }
    });
  }

  copyId(event: MouseEvent, id: number) {
    event.preventDefault();
    event.stopPropagation();
    if (this.clipboard.copy(String(id))) {
      this.toastService.show(`Copied ID #${id} to clipboard`, { classname: 'bg-dark text-light', delay: 2000 });
    } else {
      this.toastService.show('Unable to copy ID', { classname: 'bg-danger text-light' });
    }
  }

  createLambda() {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline() || this.timeWarping()) return;

    this.editDialog.open(Number(appId), user.email, { data: {} }).then(data => {
      this.lambdaService.save(data.email, Number(appId), data)
        .subscribe({
          next: (result: { id: number }) => {
            this.commService.emitChange({ key: 'lambda-list-changed' });
            this.router.navigate(['/design', appId, 'lambda'], { queryParams: { id: result.id } });
            this.toastService.show('Lambda successfully saved', { classname: 'bg-success text-light' });
          },
          error: () => this.toastService.show('Lambda saving failed', { classname: 'bg-danger text-light' })
        });
    }, () => {});
  }
}
