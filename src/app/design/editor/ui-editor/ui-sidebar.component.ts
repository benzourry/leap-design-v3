import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormService } from '../../../service/form.service';
import { NgbModal, NgbAccordionDirective, NgbAccordionItem, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, IsActiveMatchOptions, NavigationEnd, Params, Router, RouterLinkActive, RouterLink } from '@angular/router';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { PlatformLocation } from '@angular/common';
import { CommService } from '../../../_shared/service/comm.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { GroupService } from '../../../service/group.service';
import { BucketService } from '../../../service/bucket.service';
import { cleanText } from '../../../_shared/utils';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { CognaService } from '../../../service/cogna.service';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { GroupByPipe } from '../../../_shared/pipe/group-by.pipe';
import { Clipboard } from '@angular/cdk/clipboard';
import { filter, Observable } from 'rxjs';
import { UiEntityKind, UiSidebarDialogContext, UiSidebarDialogService } from './ui-sidebar-dialog.service';

@Component({
    selector: 'app-ui-sidebar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './ui-sidebar.component.html',
    styleUrls: ['../_workspace-sidebar.scss', './ui-editor.component.scss', '../../../../assets/css/element-action.css'],
    imports: [NgbAccordionDirective, NgbAccordionItem, NgbAccordionToggle, NgbAccordionButton, RouterLinkActive, NgbCollapse,
        NgbAccordionCollapse, NgbAccordionBody, CdkDropList, CdkDrag, CdkDragHandle, RouterLink, FaIconComponent, FormsModule,
        FilterPipe, GroupByPipe]
})
export class UiSidebarComponent implements OnInit, OnDestroy {

    user: any;
    app: any;
    counts = signal<any>({});
    searchText: string = "";

    private formService = inject(FormService);
    private datasetService = inject(DatasetService);
    private dashboardService = inject(DashboardService);
    private screenService = inject(ScreenService);
    private cognaService = inject(CognaService);
    private groupService = inject(GroupService);
    private modalService = inject(NgbModal);
    private sidebarDialog = inject(UiSidebarDialogService);
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private appService = inject(AppService);
    private bucketService = inject(BucketService);
    private toastService = inject(ToastService);
    private commService = inject(CommService);
    private router = inject(Router);
    private location = inject(PlatformLocation);
    private cdr = inject(ChangeDetectorRef);
    private destroyRef = inject(DestroyRef);
    private removePopStateListener: VoidFunction;
    
    constructor() {
        this.removePopStateListener = this.location.onPopState(() => {
            if (document.querySelector('.cm-fullscreen-mode')) {
                return;
            }
            this.modalService.dismissAll('')
        });
    }

    otherAppList: any[] = [];
    readonly sameReorderList = (drag: CdkDrag<unknown>, drop: CdkDropList<unknown>) =>
        drag.dropContainer === drop;
    currentPath: string = "form";
    readonly itemMatchOptions: IsActiveMatchOptions = {
        paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
    };
    excelImportIsNext: boolean = false;

    editableForms: any[] = []; restrictedForms: any[] = []; showRestrictedForms: boolean = false;
    editableDatasets: any[] = []; restrictedDatasets: any[] = []; showRestrictedDatasets: boolean = false;
    editableScreens: any[] = []; restrictedScreens: any[] = []; showRestrictedScreens: boolean = false;

    formLoading: boolean = false; formSearchText: string = ""; formList: any[] = []; formTotal: number = 0;
    datasetList: any[] = []; datasetGroupBy: string = null;
    screenLoading: boolean = false; screenList: any[] = []; screenGroupBy: string = null;
    dashboardList: any[] = [];
    
    accessList: any[] = []; bucketList: any[] = []; cognaList: any[] = []; walletList: any[] = [];

    @ViewChild(NgbAccordionDirective) private accordion?: NgbAccordionDirective;

    private syncCurrentPath() {
        const segments = this.router.parseUrl(this.router.url).root.children['primary']?.segments ?? [];
        this.currentPath = segments[0]?.path === 'design' && segments[2]?.path === 'ui'
            ? segments[3]?.path ?? '' : '';
    }

    ngOnInit() {
        this.commService.changeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
            this.counts.update(c=>({...c, [data.key]: data.value}));
            if (this.app?.id){
                if (data.key === 'form') this.getFormList();
                if (data.key === 'dataset') this.getDatasetList();
                if (data.key === 'screen') this.getScreenList();
                if (data.key === 'dashboard') this.getDashboardList();
            }
        });

        this.syncCurrentPath();
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.syncCurrentPath();
            if (['form', 'dataset', 'dashboard', 'screen'].includes(this.currentPath)) {
                this.accordion?.expand('ui-' + this.currentPath);
            }
            this.cdr.markForCheck();
        });

        this.userService.getCreator().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
            this.user = user;
            this.cdr.detectChanges();

            this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
                const appId = params['appId'];
                localStorage.setItem("debugAppId", appId);
                if (appId) this.loadApp(appId);
            });

            this.appService.getAppMyList({ email: this.user.email, size: 999, sort: 'id,desc' })
                .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
                this.otherAppList = res.content;
                this.cdr.detectChanges();
            });
        });
    }

    private loadApp(appId: number) {
        this.appService.getApp(appId, { email: this.user.email }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
            this.app = res;
            this.getCounts(res.id);
            this.refreshPrimaryLists();
            this.loadSecondaryLists(res.id);
            this.cdr.detectChanges();
        });
    }

    private refreshPrimaryLists() {
        this.getFormList();
        this.getDatasetList();
        this.getDashboardList();
        this.getScreenList();
    }

    // =========================================================================
    // 1. DRY LIST FETCHING
    // =========================================================================

    getFormList() {
        this.formLoading = true;
        this.formService.getListBasic({ appId: this.app.id, size: 9999, page: 0, searchText: this.formSearchText, sort: ['sortOrder,asc','id,asc'] })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    this.editableForms = []; this.restrictedForms = [];
                    res.content.forEach((f: any) => {
                        if (!f?.id) return;
                        this.canEdit(f) ? this.editableForms.push(f) : this.restrictedForms.push(f);
                    });
                    this.formList = res.content;
                    this.formTotal = res.page?.totalElements;
                    this.formLoading = false;
                    this.counts.update(c=>({...c, form: res.page?.totalElements}));
                    this.cdr.detectChanges();
                }, 
                error: () => { this.formLoading = false; this.cdr.detectChanges(); }
            });
    }

    getDatasetList() {
        this.datasetService.getDatasetList(this.app.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
            this.editableDatasets = []; this.restrictedDatasets = [];
            res.forEach((f: any) => {
                this.canEditDataset(f) ? this.editableDatasets.push(f) : this.restrictedDatasets.push(f);
            });
            this.datasetList = res;
            this.counts.update(c=>({...c, dataset: res.length}));
            this.cdr.detectChanges();
        });
    }

    getScreenList() {
        this.screenLoading = true;
        this.screenService.getScreenList(this.app.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
            this.editableScreens = []; this.restrictedScreens = [];
            res.forEach((f: any) => {
                this.canEditScreen(f) ? this.editableScreens.push(f) : this.restrictedScreens.push(f);
            });
            this.screenList = res;
            this.screenLoading = false;
            this.counts.update(c=>({...c, screen: res.length}));
            this.cdr.detectChanges();
        });
    }

    getDashboardList() {
        this.dashboardService.getDashboardList(this.app.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
            this.dashboardList = res;
            this.counts.update(c=>({...c, dashboard: res.length}));
            this.cdr.detectChanges();
        });
    }

    private loadSecondaryLists(appId: string) {
        this.fetchSecondaryData(appId, this.groupService.getGroupList.bind(this.groupService), 'accessList', 'access');
        this.fetchSecondaryData(appId, this.bucketService.getBucketList.bind(this.bucketService), 'bucketList', 'bucket');
        this.fetchSecondaryData(appId, this.cognaService.getCognaList.bind(this.cognaService), 'cognaList', 'cogna');
    }

    private fetchSecondaryData(
        appId: string,
        serviceMethod: (params: { appId: string; size: number }) => Observable<{ content: any[]; page?: { totalElements: number } }>,
        targetProp: 'accessList' | 'bucketList' | 'cognaList',
        type: 'access' | 'bucket' | 'cogna'
    ) {
        serviceMethod({ appId, size: 9999 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
            this[targetProp] = res.content;
            if (res.page) this.counts.update(c=>({...c, [type]: res.page.totalElements}));
            
            this.cdr.detectChanges();
        });
    }

    // =========================================================================
    // 2. DRY PERMISSIONS
    // =========================================================================
    
    private hasAccess(emailStr?: string): boolean {
        if (!emailStr || emailStr.trim() === '') return true;
        const userEmail = typeof this.user === 'function' ? this.user()?.email : this.user?.email;
        const allowedEmails = emailStr.split(',').map((e: string) => e.trim());
        return allowedEmails.includes(userEmail);
    }

    canEdit(item: any): boolean { return this.hasAccess(item?.email); }
    canEditDataset(item: any): boolean { return this.hasAccess(item?.form?.email); }
    canEditScreen(item: any): boolean { return this.hasAccess(item?.email); }

    // =========================================================================
    // 3. DRY DRAG & DROP REORDERING
    // =========================================================================

    private handleReorder(event: CdkDragDrop<any[]>, targetArray: any[], saveServiceMethod: (data: any[]) => Observable<any>) {
        moveItemInArray(targetArray, event.previousIndex, event.currentIndex);
        const mappedList = targetArray.map((val, index) => ({ id: val.id, sortOrder: index }));
        saveServiceMethod(mappedList).subscribe();
        return [...targetArray];
    }

    reorderForm(event: CdkDragDrop<number[]>, parent: any[]) { this.editableForms = this.handleReorder(event, parent, data => this.formService.saveFormOrder(data)); }
    reorderScreen(event: CdkDragDrop<number[]>, parent: any[]) { this.editableScreens = this.handleReorder(event, parent, data => this.screenService.saveScreenOrder(data)); }
    reorderDashboard(event: CdkDragDrop<number[]>, parent: any[]) { this.dashboardList = this.handleReorder(event, parent, data => this.dashboardService.saveDashboardOrder(data)); }
    reorderDataset(event: CdkDragDrop<number[]>, parent: any[]) { this.editableDatasets = this.handleReorder(event, parent, data => this.datasetService.saveDatasetOrder(data)); }

    // =========================================================================
    // 4. DRY MODAL HANDLING (EDIT & CLONE)
    // =========================================================================

    private dialogContext(): UiSidebarDialogContext {
        return {
            appId: this.app.id, app: this.app, user: this.user, otherAppList: this.otherAppList,
            formList: this.formList, datasetList: this.datasetList, walletList: this.walletList,
            accessList: this.accessList, cognaList: this.cognaList, bucketList: this.bucketList
        };
    }

    private refreshAfterDialog(kind: UiEntityKind, context: UiSidebarDialogContext, refreshFn: () => void) {
        if (!this.destroyRef.destroyed && this.app?.id === context.appId) {
            refreshFn();
        } else {
            this.commService.emitChange({ key: kind, value: 0 });
        }
        this.commService.emitChange({ key: 'editor-search-refresh', category: kind });
    }

    private openEditModal(data: any, saveMethod: (appId: number, payload: any) => Observable<any>, kind: UiEntityKind,
        refreshFn: () => void, context = this.dialogContext()) {
        data.appId = context.appId;
        this.sidebarDialog.openEdit(kind, context, data).then(res => {
            saveMethod(context.appId, res).subscribe({
                next: savedRes => {
                    this.refreshAfterDialog(kind, context, refreshFn);
                    this.router.navigate(['/design', context.appId, 'ui', kind], { queryParams: { id: savedRes.id } });
                    if (!this.destroyRef.destroyed) this.cdr.detectChanges();
                },
                error: () => this.toastService.show(`Unable to save ${kind}`, { classname: 'bg-danger text-light' })
            });
        }, () => {});
    }

    private openCloneModal(kind: UiEntityKind, cloneMethod: (sourceId: string | number, destAppId: number) => Observable<any>,
        idProp: string, refreshFn: () => void, saveMethod: (appId: number, payload: any) => Observable<any>) {
        const context = this.dialogContext();
        const entityName = kind[0].toUpperCase() + kind.slice(1);
        this.sidebarDialog.openClone(kind, context).then(cloneData => {
            cloneMethod(cloneData[idProp], context.appId).subscribe({
                next: (res: any) => {
                    this.refreshAfterDialog(kind, context, refreshFn);
                    res.title += " (cloned)";
                    this.openEditModal(res, saveMethod, kind, refreshFn, context);
                    this.toastService.show(`${entityName} cloned successfully`, { classname: 'bg-success text-light' });
                },
                error: () => this.toastService.show(`${entityName} cloning failed`, { classname: 'bg-danger text-light' })
            });
        }, () => {});
    }

    newForm: any = { nav: 'simple', type: 'db', sections: [{ sortOrder: 0, size: 'col-sm-12', type: 'section', title: 'Section 1', code: 'section1' }], canEdit: true, canRetract: true, canSave: true, canSubmit: true, validateSave: true, x: { facet: 'add,edit,view', restrictAccess: true, accessByUser: true, accessByApprover: true, autoSync: true } };
    editForm(data: any) { this.openEditModal(data, (id, d) => this.formService.saveForm(id, d), 'form', () => this.getFormList()); }
    cloneForm() { this.openCloneModal('form', (src, dest) => this.formService.cloneForm(src, dest), 'formId', () => this.getFormList(), (id, d) => this.formService.saveForm(id, d)); }

    newDataset: any = { items: [], filters: [], next: {}, screen: {}, presetFilters: {}, showAction: true, actions:[{label:'View', action:'view',type:'dropdown',inpop:true,icon:'fas:file',style:'btn-secondary'},{label:'Edit', action:'edit',type:'dropdown',inpop:true,icon:'fas:pencil-alt',style:'btn-secondary'},{label:'Delete', action:'delete',type:'dropdown',inpop:true,icon:'fas:trash',style:'btn-secondary'}], x: {tblcard:true, showSummary: true}, wide: true };
    editDataset(data: any) { this.openEditModal(data, (id, d) => this.datasetService.saveDataset(id, d), 'dataset', () => this.getDatasetList()); }
    cloneDataset() { this.openCloneModal('dataset', (src, dest) => this.datasetService.cloneDataset(src, dest), 'datasetId', () => this.getDatasetList(), (id, d) => this.datasetService.saveDataset(id, d)); }

    newDashboard: any = { items: [], filters: [], next: {}, screen: {}, presetFilters: {}, showAction: true, canView: true, canEdit: true, canDelete: true };
    editDashboard(data: any) { this.openEditModal(data, (id, d) => this.dashboardService.saveDashboard(id, d), 'dashboard', () => this.getDashboardList()); }
    cloneDashboard() { this.openCloneModal('dashboard', (src, dest) => this.dashboardService.cloneDashboard(src, dest), 'dashboardId', () => this.getDashboardList(), (id, d) => this.dashboardService.saveDashboard(id, d)); }

    newScreen: any = { data: {}, canPrint: false };
    editScreen(data: any) { this.openEditModal(data, (id, d) => this.screenService.saveScreen(id, d), 'screen', () => this.getScreenList()); }
    cloneScreen() { this.openCloneModal('screen', (src, dest) => this.screenService.cloneScreen(src, dest), 'screenId', () => this.getScreenList(), (id, d) => this.screenService.saveScreen(id, d)); }

    // =========================================================================
    // 5. REMAINING UTILS & IMPORT LOGIC
    // =========================================================================

    cleanText = cleanText;

    getCounts(appId: string) {
        this.appService.getCount(appId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => { this.counts.set(res); this.cdr.detectChanges(); });
    }

    // --- Import Excel & Meta Logic untouched ---
    createDataset: boolean; createDashboard: boolean; importToLive: boolean; importLoading: boolean = false;
    importExcelData: any; importMetadataData: any; importMetadataLoading: boolean = false;

    importMetadata(content: any) { this.importMetadataData = null; history.pushState(null, null, window.location.href); this.modalService.open(content, { backdrop: 'static' }).result.then(() => {}, () => {}); }
    importExcel(content: any) { this.importExcelData = null; history.pushState(null, null, window.location.href); this.modalService.open(content, { backdrop: 'static' }).result.then(() => {}, () => {}); }

    uploadMetadata($event: any) {
        if ($event.target.files && $event.target.files.length) {
            this.importMetadataLoading = true;
            this.appService.uploadMetadata(this.app.id, $event.target.files[0], this.user.email).subscribe({
                next: (res: any) => {
                    this.importMetadataData = res; this.importMetadataLoading = false;
                    this.app = res.app;
                    this.getCounts(this.app.id);
                    this.refreshPrimaryLists();
                    this.loadSecondaryLists(this.app.id);
                    this.commService.emitChange({ key: 'editor-search-refresh' });
                    this.toastService.show("Metadata successfully imported", { classname: 'bg-success text-light' });
                },
                error: (error: any) => { this.importMetadataData = { success: false, message: error.message }; this.importMetadataLoading = false; }
            });
        }
    }

    uploadExcel($event: any, createDataset: boolean, createDashboard: boolean, importToLive: boolean) {
        if ($event.target.files && $event.target.files.length) {
            this.importLoading = true;
            this.appService.uploadExcel(this.app.id, $event.target.files[0], this.user.email, createDataset, createDashboard, importToLive).subscribe({
                next: (res: any) => {
                    this.importExcelData = res; this.importLoading = false;
                    this.getCounts(this.app.id);
                    this.commService.emitChange({ key: 'form', value: "import" });
                    this.toastService.show("Excel successfully imported", { classname: 'bg-success text-light' });
                },
                error: (error: any) => { this.importExcelData = { success: false, message: error.message }; this.importLoading = false; }
            });
        }
    }

    // 2. Inject it inside UiEditorComponent
    private clipboard = inject(Clipboard);

    // 3. Add this helper method to the class
    copyId(event: MouseEvent, id: string | number) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!id) return;

        this.clipboard.copy(String(id));
        this.toastService.show(`Copied ID #${id} to clipboard`, { 
            classname: 'bg-dark text-light', 
            delay: 2000 
        });
    }

    ngOnDestroy() {
        this.removePopStateListener();
        this.counts.set({});
    }
}