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
import { KryptaService } from '../../../service/krypta.service';
import { LambdaService } from '../../../service/lambda.service';
import { KryptaContract } from './krypta-edit-dialog.component';
import { KryptaEditDialogService } from './krypta-edit-dialog.service';

interface KryptaListItem {
  id: number;
  name: string;
  description?: string;
  enabled?: number;
}

@Component({
  selector: 'app-krypta-sidebar',
  templateUrl: './krypta-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KryptaSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly user = input<{ email: string } | null>(null);
  readonly offline = input(false);
  readonly kryptaList = signal<KryptaListItem[]>([]);
  readonly kryptaTotal = signal(0);
  readonly contractList = signal<KryptaListItem[]>([]);
  readonly secretList = signal<{ key: string }[]>([]);
  readonly itemLoading = signal(false);
  readonly contractLoading = signal(false);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly itemsPerPage = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };

  private readonly kryptaService = inject(KryptaService);
  private readonly lambdaService = inject(LambdaService);
  private readonly editDialog = inject(KryptaEditDialogService);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private walletRequest?: Subscription;
  private contractRequest?: Subscription;

  constructor() {
    effect(onCleanup => {
      const appId = this.appId();
      if (!appId) return;
      this.searchText.set('');
      this.contractList.set([]);
      this.secretList.set([]);
      untracked(() => {
        this.loadWalletList(1);
        this.loadContractList(1);
      });
      const secretRequest = this.lambdaService.getSecretList(Number(appId)).subscribe({
        next: (secrets: { key: string }[]) => this.secretList.set(secrets),
        error: () => this.toastService.show('Unable to load secrets', { classname: 'bg-danger text-light' })
      });
      onCleanup(() => {
        this.walletRequest?.unsubscribe();
        this.contractRequest?.unsubscribe();
        secretRequest.unsubscribe();
      });
    });
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if (String(change?.appId) !== String(this.appId())) return;
      if (change?.key === 'krypta-wallet-list-changed') this.loadWalletList(change.page ?? this.pageNumber());
      if (change?.key === 'krypta-contract-list-changed' || change?.key === 'krypta-contract-created') {
        this.loadContractList(change.page ?? this.pageNumber());
      }
    });
  }

  loadWalletList(pageNumber: number) {
    const appId = this.appId();
    if (!appId) return;
    this.walletRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);
    this.walletRequest = this.kryptaService.getWalletList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: KryptaListItem[]; page?: { totalElements: number } }) => {
        this.kryptaList.set(response.content);
        this.kryptaTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemLoading.set(false);
        this.toastService.show('Unable to load wallets', { classname: 'bg-danger text-light' });
      }
    });
  }

  loadContractList(pageNumber: number) {
    const appId = this.appId();
    if (!appId) return;
    this.contractRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.contractLoading.set(true);
    this.contractRequest = this.kryptaService.getContractList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: KryptaListItem[] }) => {
        this.contractList.set(response.content);
        this.contractLoading.set(false);
      },
      error: () => {
        this.contractLoading.set(false);
        this.toastService.show('Unable to load contracts', { classname: 'bg-danger text-light' });
      }
    });
  }

  createWallet() {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline()) return;
    this.editDialog.openWallet({
      wallet: { email: user.email }, contracts: this.contractList(), secrets: this.secretList()
    }).then(data => {
      this.kryptaService.saveWallet(user.email, Number(appId), data).subscribe({
        next: (result: { id: number }) => {
          this.commService.emitChange({ key: 'krypta-wallet-list-changed', appId });
          this.commService.emitChange({ key: 'editor-search-refresh', category: 'kryptaWallet' });
          this.router.navigate(['/design', appId, 'krypta'], { queryParams: { id: result.id } });
          this.toastService.show('Wallet successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.toastService.show('Wallet saving failed', { classname: 'bg-danger text-light' })
      });
    }, () => {});
  }

  createContract() {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline()) return;
    this.editDialog.openContract({}).then(data => {
      this.kryptaService.saveContract(user.email, Number(appId), data).subscribe({
        next: (result: KryptaContract) => {
          this.commService.emitChange({ key: 'krypta-contract-created', appId, contract: result });
          this.commService.emitChange({ key: 'editor-search-refresh', category: 'kryptaContract' });
          this.toastService.show('Contract successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.toastService.show('Contract saving failed', { classname: 'bg-danger text-light' })
      });
    }, () => {});
  }
}
