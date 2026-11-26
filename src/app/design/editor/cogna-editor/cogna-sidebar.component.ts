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
import { CognaService } from '../../../service/cogna.service';
import { CognaEditDialogService } from './cogna-edit-dialog.service';

interface CognaListItem {
  id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-cogna-sidebar',
  templateUrl: './cogna-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CognaSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly user = input<{ email: string } | null>(null);
  readonly offline = input(false);
  readonly timeWarping = input(false);
  readonly cognaList = signal<CognaListItem[]>([]);
  readonly cognaTotal = signal(0);
  readonly itemLoading = signal(false);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly itemsPerPage = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };
  private readonly cognaService = inject(CognaService);
  private readonly editDialog = inject(CognaEditDialogService);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly router = inject(Router);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;

  constructor() {
    effect(onCleanup => {
      if (!this.appId()) return;
      this.searchText.set('');
      untracked(() => this.loadCognaList(1));
      onCleanup(() => this.listRequest?.unsubscribe());
    });
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if (change?.key === 'cogna-list-changed' && String(change.appId) === String(this.appId())) {
        this.loadCognaList(change.page ?? this.pageNumber());
      }
    });
  }

  loadCognaList(pageNumber: number) {
    const appId = this.appId();
    if (!appId) return;
    this.listRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);
    this.listRequest = this.cognaService.getCognaList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: CognaListItem[]; page?: { totalElements: number } }) => {
        this.cognaList.set(response.content);
        this.cognaTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
        this.commService.emitChange({ key: 'cogna-sidebar-list-loaded', appId, page: pageNumber, list: response.content });
      },
      error: () => {
        this.itemLoading.set(false);
        this.toastService.show('Unable to load Cognas', { classname: 'bg-danger text-light' });
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

  createCogna() {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline() || this.timeWarping()) return;
    const cogna = {
      type: 'txtgen', embedModelType: 'e5small', embedModelName: '', embedModelApiKey: '',
      chunkLength: 100, chunkOverlap: 10, embedMaxResult: 5, inferModelType: 'openai',
      inferModelName: 'gpt-5.4-mini', inferModelApiKey: 'demo', temperature: 0,
      maxChatMemory: 5, vectorStoreType: 'inmemory', email: user.email,
      systemMessage: "STRICTLY do not answer questions which are not related and just say \"Sorry, I don't have the answer\"",
      data: {}
    };
    this.editDialog.open({ appId: Number(appId), cogna, cognas: this.cognaList() }).then(data => {
      this.cognaService.save(data.email, Number(appId), data).subscribe({
        next: (result: { id: number }) => {
          this.commService.emitChange({ key: 'cogna-list-changed', appId });
          this.commService.emitChange({ key: 'editor-search-refresh', category: 'cogna' });
          this.router.navigate(['/design', appId, 'cogna'], { queryParams: { id: result.id } });
          this.toastService.show('Cogna successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.toastService.show('Cogna saving failed', { classname: 'bg-danger text-light' })
      });
    }, () => {});
  }
}
