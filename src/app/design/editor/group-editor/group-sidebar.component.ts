import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, TemplateRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { EditRoleComponent } from '../../../_shared/modal/edit-role/edit-role.component';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { LookupService } from '../../../run/_service/lookup.service';
import { GroupService } from '../../../service/group.service';

interface GroupListItem {
  id: number;
  appId: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-group-sidebar',
  templateUrl: './group-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, EditRoleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroupSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly app = input<{ x?: { userFromApp?: unknown } } | null>(null);
  readonly offline = input(false);
  readonly groupList = signal<GroupListItem[]>([]);
  readonly groupTotal = signal(0);
  readonly itemLoading = signal(false);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly lookupList = signal<unknown[]>([]);
  readonly editGroupData = signal<object>({});
  readonly pageSize = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };

  private readonly groupService = inject(GroupService);
  private readonly lookupService = inject(LookupService);
  private readonly modalService = inject(NgbModal);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;
  private lookupRequest?: Subscription;

  constructor() {
    effect(onCleanup => {
      const appId = this.appId();
      if (!appId) return;
      this.searchText.set('');
      untracked(() => this.loadGroupList(1));
      this.loadLookups(appId);
      onCleanup(() => { this.listRequest?.unsubscribe(); this.lookupRequest?.unsubscribe(); });
    });
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if (change?.key === 'group-list-changed') this.loadGroupList(change.page ?? this.pageNumber());
      if (change?.key === 'lookup-list-changed' || change?.key === 'assistant-lookup') {
        const appId = this.appId();
        if (appId) this.loadLookups(appId);
      }
    });
  }

  private loadLookups(appId: number | string) {
    this.lookupRequest?.unsubscribe();
    this.lookupRequest = this.lookupService.getFullLookupList({ appId })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: response => this.lookupList.set(response.content),
        error: () => this.toastService.show('Unable to load lookups', { classname: 'bg-danger text-light' })
      });
  }

  loadGroupList(pageNumber: number) {
    const appId = this.appId();
    if (!appId) return;
    this.listRequest?.unsubscribe();
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);
    this.listRequest = this.groupService.getGroupList({
      searchText: this.searchText(), appId, page: pageNumber - 1, size: this.pageSize
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: GroupListItem[]; page?: { totalElements: number } }) => {
        this.groupList.set(response.content);
        this.groupTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemLoading.set(false);
        this.toastService.show('Unable to load groups', { classname: 'bg-danger text-light' });
      }
    });
  }

  createGroup(content: TemplateRef<unknown>) {
    const appId = this.appId();
    if (!appId || this.offline()) return;
    this.editGroupData.set({});
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' }).result.then(data => {
      this.groupService.save(Number(appId), data).subscribe({
        next: (result: { id: number }) => {
          this.commService.emitChange({ key: 'group-list-changed' });
          this.commService.emitChange({ key: 'editor-search-refresh', category: 'access' });
          this.router.navigate(['/design', appId, 'user'], { queryParams: { id: result.id } });
          this.toastService.show('Group successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.toastService.show('Group saving failed', { classname: 'bg-danger text-light' })
      });
    }, () => {});
  }
}
