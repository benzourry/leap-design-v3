import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, OnInit, signal, TemplateRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { EditLookupComponent } from '../../../_shared/modal/edit-lookup/edit-lookup.component';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { LookupService } from '../../../run/_service/lookup.service';
import { GroupService } from '../../../service/group.service';

interface LookupListItem {
    id: number;
    name: string;
    description?: string;
}

@Component({
    selector: 'app-lookup-sidebar',
    templateUrl: './lookup-sidebar.component.html',
    styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
    imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
        NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, EditLookupComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupSidebarComponent implements OnInit {
    readonly appId = input<number | string | null>(null);
    readonly user = input<{ email: string } | null>(null);
    readonly offline = input(false);

    readonly lookupList = signal<LookupListItem[]>([]);
    readonly lookupTotal = signal(0);
    readonly itemLoading = signal(false);
    readonly pageNumber = signal(1);
    readonly searchText = signal('');
    readonly accessList = signal<unknown[]>([]);
    readonly editLookupData = signal<object>({});
    readonly itemsPerPage = 15;
    readonly itemMatchOptions: IsActiveMatchOptions = {
        paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
    };

    private readonly lookupService = inject(LookupService);
    private readonly groupService = inject(GroupService);
    private readonly modalService = inject(NgbModal);
    private readonly toastService = inject(ToastService);
    private readonly commService = inject(CommService);
    private readonly router = inject(Router);
    private readonly clipboard = inject(Clipboard);
    private readonly destroyRef = inject(DestroyRef);
    private listRequest?: Subscription;

    constructor() {
        effect(onCleanup => {
            const appId = this.appId();
            if (!appId) return;

            this.searchText.set('');
            untracked(() => this.loadLookupList(1));
            const accessRequest = this.groupService.getGroupList({ appId, size: 999 })
                .subscribe({
                    next: response => this.accessList.set(response.content),
                    error: () => this.toastService.show('Unable to load access groups', { classname: 'bg-danger text-light' })
                });
            onCleanup(() => {
                this.listRequest?.unsubscribe();
                accessRequest.unsubscribe();
            });
        });
    }

    ngOnInit() {
        this.commService.changeEmitted$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(change => {
                if (change?.key === 'assistant-lookup' || change?.key === 'lookup-list-changed') {
                    this.loadLookupList(this.pageNumber());
                }
            });
    }

    loadLookupList(pageNumber: number) {
        const appId = this.appId();
        if (!appId) return;

        this.listRequest?.unsubscribe();
        this.itemLoading.set(true);
        this.pageNumber.set(pageNumber);
        this.listRequest = this.lookupService.getLookupList({
            searchText: this.searchText(),
            appId,
            page: pageNumber - 1,
            size: this.itemsPerPage
        }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: response => {
                this.lookupList.set(response.content);
                this.lookupTotal.set(response.page?.totalElements ?? 0);
                this.itemLoading.set(false);
            },
            error: () => {
                this.itemLoading.set(false);
                this.toastService.show('Unable to load lookups', { classname: 'bg-danger text-light' });
            }
        });
    }

    createLookup(content: TemplateRef<unknown>) {
        const appId = this.appId();
        const user = this.user();
        if (!appId || !user || this.offline()) return;

        this.editLookupData.set({});
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' }).result.then(data => {
            this.lookupService.save(user.email, Number(appId), data)
                .subscribe({
                    next: response => {
                        this.commService.emitChange({ key: 'lookup-list-changed' });
                        this.router.navigate(['/design', appId, 'lookup'], { queryParams: { id: response.id } });
                        this.toastService.show('Lookup successfully saved', { classname: 'bg-success text-light' });
                    },
                    error: () => this.toastService.show('Lookup saving failed', { classname: 'bg-danger text-light' })
                });
        }, () => {});
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
}
