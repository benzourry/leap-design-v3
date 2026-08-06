import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, OnDestroy, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormService } from '../../../service/form.service';
import { MailerService } from '../../../service/mailer.service';
import { NgbModal, NgbAccordionDirective, NgbAccordionItem, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router, RouterLinkActive, RouterLink, RouterOutlet } from '@angular/router';
import { AppService } from '../../../service/app.service';
import { UtilityService } from '../../../_shared/service/utility.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { PlatformLocation } from '@angular/common';
import { AppEditComponent } from '../../../_shared/modal/app-edit/app-edit.component';
import { CommService } from '../../../_shared/service/comm.service';
import { domainBase } from '../../../_shared/constant.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { GroupService } from '../../../service/group.service';
import { BucketService } from '../../../service/bucket.service';
import { LambdaService } from '../../../service/lambda.service';
import { cleanText } from '../../../_shared/utils';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { EditScreenComponent } from '../../../_shared/modal/edit-screen/edit-screen.component';
import { EditDashboardComponent } from '../../../_shared/modal/edit-dashboard/edit-dashboard.component';
import { EditDatasetComponent } from '../../../_shared/modal/edit-dataset/edit-dataset.component';
import { CloneDatasetComponent } from '../../../_shared/modal/clone-dataset/clone-dataset.component';
import { CloneScreenComponent } from '../../../_shared/modal/clone-screen/clone-screen.component';
import { CloneFormComponent } from '../../../_shared/modal/clone-form/clone-form.component';
import { EditFormComponent } from '../../../_shared/modal/edit-form/edit-form.component';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { CognaService } from '../../../service/cogna.service';
import { LookupService } from '../../../run/_service/lookup.service';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { GroupByPipe } from '../../../_shared/pipe/group-by.pipe';
import { CloneDashboardComponent } from '../../../_shared/modal/clone-dashboard/clone-dashboard.component';
import { KryptaService } from '../../../service/krypta.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-ui-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './ui-editor.component.html',
    styleUrls: ['./ui-editor.component.scss', '../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css'],
    imports: [SplitPaneComponent, NgbAccordionDirective, NgbAccordionItem, NgbAccordionToggle, NgbAccordionButton, RouterLinkActive, NgbCollapse,
        NgbAccordionCollapse, NgbAccordionBody, CdkDropList, CdkDrag, CdkDragHandle, RouterLink, FaIconComponent, RouterOutlet, FormsModule,
        EditFormComponent, CloneFormComponent, CloneDatasetComponent, CloneScreenComponent, EditDatasetComponent,
        EditDashboardComponent, CloneDashboardComponent, EditScreenComponent, FilterPipe, GroupByPipe]
})
export class UiEditorComponent implements OnInit, OnDestroy {

    user: any;
    app: any;
    path: string = "";
    offline: boolean = false;
    counts = signal<any>({});
    searchText: string = "";

    private formService = inject(FormService);
    private datasetService = inject(DatasetService);
    private dashboardService = inject(DashboardService);
    private screenService = inject(ScreenService);
    private cognaService = inject(CognaService);
    private kryptaService = inject(KryptaService);
    private lookupService = inject(LookupService);
    private mailerService = inject(MailerService);
    private groupService = inject(GroupService);
    private modalService = inject(NgbModal);
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private appService = inject(AppService);
    private bucketService = inject(BucketService);
    private lambdaService = inject(LambdaService);
    private utilityService = inject(UtilityService);
    private toastService = inject(ToastService);
    private commService = inject(CommService);
    private router = inject(Router);
    private location = inject(PlatformLocation);
    private cdr = inject(ChangeDetectorRef);
    
    constructor() {
        this.location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    }

    otherAppList: any[] = [];
    currentPath: string = "form";
    excelImportIsNext: boolean = false;

    editableForms: any[] = []; restrictedForms: any[] = []; showRestrictedForms: boolean = false;
    editableDatasets: any[] = []; restrictedDatasets: any[] = []; showRestrictedDatasets: boolean = false;
    editableScreens: any[] = []; restrictedScreens: any[] = []; showRestrictedScreens: boolean = false;

    formLoading: boolean = false; formSearchText: string = ""; formList: any[] = []; formTotal: number = 0;
    datasetList: any[] = []; datasetGroupBy: string = null;
    screenLoading: boolean = false; screenList: any[] = []; screenGroupBy: string = null;
    dashboardList: any[] = [];
    
    accessList: any[] = []; mailerList: any[] = []; lookupList: any[] = []; 
    bucketList: any[] = []; lambdaList: any[] = []; cognaList: any[] = []; walletList: any[] = [];

    // Tpl Refs
    @ViewChild("editFormTpl") editFormTpl: TemplateRef<any>;
    @ViewChild("editDatasetTpl") editDatasetTpl: TemplateRef<any>;
    @ViewChild("editDashboardTpl") editDashboardTpl: TemplateRef<any>;
    @ViewChild("editScreenTpl") editScreenTpl: TemplateRef<any>;

    ngOnInit() {
        this.commService.changeEmitted$.subscribe(data => {
            this.counts.update(c=>({...c, [data.key]: data.value}));
            if (this.app?.id){
                if (data.key === 'form') this.getFormList();
                if (data.key === 'dataset') this.getDatasetList();
                if (data.key === 'screen') this.getScreenList();
                if (data.key === 'dashboard') this.getDashboardList();
            }
        });

        this.route.parent.url.subscribe(() => this.currentPath = this.route.firstChild.routeConfig.path);

        this.userService.getCreator().subscribe((user) => {
            this.user = user;
            this.cdr.detectChanges();

            this.route.parent.parent.params.subscribe((params: Params) => {
                const appId = params['appId'];
                localStorage.setItem("debugAppId", appId);
                if (appId) this.loadApp(appId);
            });

            this.appService.getAppMyList({ email: this.user.email, size: 999, sort: 'id,desc' }).subscribe(res => {
                this.otherAppList = res.content;
                this.cdr.detectChanges();
            });
        });
    }

    private loadApp(appId: number) {
        this.appService.getApp(appId, { email: this.user.email }).subscribe(res => {
            this.appService.searchInApp.clear();
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
            .subscribe({
                next: res => {
                    this.editableForms = []; this.restrictedForms = [];
                    res.content.forEach((f: any) => {
                        if (!f?.id) return;
                        this.canEdit(f) ? this.editableForms.push(f) : this.restrictedForms.push(f);
                        this.registerSearch('form', f.id, 'Form: ' + f.title, ['far', 'plus-square']);
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
        this.datasetService.getDatasetList(this.app.id).subscribe(res => {
            this.editableDatasets = []; this.restrictedDatasets = [];
            res.forEach((f: any) => {
                this.canEditDataset(f) ? this.editableDatasets.push(f) : this.restrictedDatasets.push(f);
                this.registerSearch('dataset', f.id, 'Dataset: ' + f.title, ['fas', 'list']);
            });
            this.datasetList = res;
            this.counts.update(c=>({...c, dataset: res.length}));
            this.cdr.detectChanges();
        });
    }

    getScreenList() {
        this.screenLoading = true;
        this.screenService.getScreenList(this.app.id).subscribe(res => {
            this.editableScreens = []; this.restrictedScreens = [];
            res.forEach((f: any) => {
                this.canEditScreen(f) ? this.editableScreens.push(f) : this.restrictedScreens.push(f);
                this.registerSearch('screen', f.id, 'Screen: ' + f.title, ['fas', 'file']);
            });
            this.screenList = res;
            this.screenLoading = false;
            this.counts.update(c=>({...c, screen: res.length}));
            this.cdr.detectChanges();
        });
    }

    getDashboardList() {
        this.dashboardService.getDashboardList(this.app.id).subscribe(res => {
            this.dashboardList = res;
            this.counts.update(c=>({...c, dashboard: res.length}));
            this.dashboardList.forEach(f => this.registerSearch('dashboard', f.id, 'Dashboard: ' + f.title, ['fas', 'tachometer-alt']));
            this.cdr.detectChanges();
        });
    }

    private loadSecondaryLists(appId: string) {
        this.fetchSecondaryData(appId, this.groupService.getGroupList.bind(this.groupService), 'accessList', 'access', 'Access Group', ['fas', 'users-cog'], 'user');
        this.fetchSecondaryData(appId, this.mailerService.getMailerList.bind(this.mailerService), 'mailerList', 'mailer', 'Mailer', ['fas', 'mail-bulk']);
        this.fetchSecondaryData(appId, this.lookupService.getLookupList.bind(this.lookupService), 'lookupList', 'lookup', 'Lookup', ['far', 'caret-square-down']);
        this.fetchSecondaryData(appId, this.bucketService.getBucketList.bind(this.bucketService), 'bucketList', 'bucket', 'Bucket', ['fas', 'box']);
        this.fetchSecondaryData(appId, this.lambdaService.getLambdaList.bind(this.lambdaService), 'lambdaList', 'lambda', 'Lambda', ['fas', 'rocket']);
        this.fetchSecondaryData(appId, this.cognaService.getCognaList.bind(this.cognaService), 'cognaList', 'cogna', 'Cogna', ['fas', 'robot']);
        this.kryptaService.getWalletList({ appId: appId, size: 9999 }).subscribe(res => { this.walletList = res.content; this.cdr.detectChanges(); });
    }

    private fetchSecondaryData(appId: string, serviceMethod: any, targetProp: string, type: string, label: string, icon: [string, string], customRoute?: string) {
        serviceMethod({ appId, size: 9999 }).subscribe((res: any) => {
            this[targetProp] = res.content;
            if (res.page) this.counts.update(c=>({...c, [type]: res.page.totalElements}));
            res.content.forEach((f: any) => this.registerSearch(type, f.id, `${label}: ${f.name}`, icon, customRoute || type));
            this.cdr.detectChanges();
        });
    }

    private registerSearch(type: string, id: string, name: string, icon: [string, string], routeName?: string) {
        this.appService.searchInApp.set(type + id, { 
            icon, name, route: routeName === 'user' ? ['user'] : ['ui', routeName || type], opt: { queryParams: { id } } 
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

    private openEditModal(tpl: TemplateRef<any>, data: any, saveMethod: (appId: number, payload: any) => Observable<any>, routeName: string, refreshFn: () => void, modalSize?: string) {
        data.appId = this.app.id;
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static', size: modalSize }).result.then(res => {
            saveMethod(this.app.id, res).subscribe(savedRes => {
                refreshFn();
                this.router.navigate([routeName], { relativeTo: this.route, queryParams: { id: savedRes.id } });
                this.cdr.detectChanges();
            });
        }, () => {});
    }

    private openCloneModal(tpl: TemplateRef<any>, cloneMethod: (sourceId: string, destAppId: string) => Observable<any>, entityName: string, idProp: string, refreshFn: () => void, editFn: (tpl: any, data: any) => void, editTpl: TemplateRef<any>) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' }).result.then(cloneData => {
            cloneMethod(cloneData[idProp], this.app.id).subscribe({
                next: (res: any) => {
                    refreshFn();
                    res.title += " (cloned)";
                    editFn(editTpl, res);
                    this.toastService.show(`${entityName} cloned successfully`, { classname: 'bg-success text-light' });
                }, 
                error: () => this.toastService.show(`${entityName} cloning failed`, { classname: 'bg-danger text-light' })
            });
        }, () => {});
    }

    newForm: any = { nav: 'simple', type: 'db', sections: [{ sortOrder: 0, size: 'col-sm-12', type: 'section', title: 'Section 1', code: 'section1' }], canEdit: true, canRetract: true, canSave: true, canSubmit: true, validateSave: true, x: { facet: 'add,edit,view', restrictAccess: true, accessByUser: true, accessByApprover: true, autoSync: true } };
    editFormData: any = {};
    editForm(tpl: any, data: any) { this.editFormData = data; this.openEditModal(tpl, data, (id, d) => this.formService.saveForm(id, d), 'form', () => this.getFormList(), 'lg'); }
    cloneForm(tpl: any) { this.openCloneModal(tpl, (src, dest) => this.formService.cloneForm(src, dest), 'Form', 'formId', () => this.getFormList(), (t,d) => this.editForm(t,d), this.editFormTpl); }

    newDataset: any = { items: [], filters: [], next: {}, screen: {}, presetFilters: {}, showAction: true, actions:[{label:'View', action:'view',type:'dropdown',inpop:true,icon:'fas:file',style:'btn-secondary'},{label:'Edit', action:'edit',type:'dropdown',inpop:true,icon:'fas:pencil-alt',style:'btn-secondary'},{label:'Delete', action:'delete',type:'dropdown',inpop:true,icon:'fas:trash',style:'btn-secondary'}], x: {tblcard:true, showSummary: true}, wide: true };
    editDatasetData: any = {};
    editDataset(tpl: any, data: any) { this.editDatasetData = data; this.openEditModal(tpl, data, (id, d) => this.datasetService.saveDataset(id, d), 'dataset', () => this.getDatasetList()); }
    cloneDataset(tpl: any) { this.openCloneModal(tpl, (src, dest) => this.datasetService.cloneDataset(src, dest), 'Dataset', 'datasetId', () => this.getDatasetList(), (t,d) => this.editDataset(t,d), this.editDatasetTpl); }

    newDashboard: any = { items: [], filters: [], next: {}, screen: {}, presetFilters: {}, showAction: true, canView: true, canEdit: true, canDelete: true };
    editDashboardData: any = {};
    editDashboard(tpl: any, data: any) { this.editDashboardData = data; this.openEditModal(tpl, data, (id, d) => this.dashboardService.saveDashboard(id, d), 'dashboard', () => this.getDashboardList()); }
    cloneDashboard(tpl: any) { this.openCloneModal(tpl, (src, dest) => this.dashboardService.cloneDashboard(src, dest), 'Dashboard', 'dashboardId', () => this.getDashboardList(), (t,d) => this.editDashboard(t,d), this.editDashboardTpl); }

    newScreen: any = { data: {}, canPrint: false };
    editScreenData: any = {};
    editScreen(tpl: any, data: any) { this.editScreenData = data; this.openEditModal(tpl, data, (id, d) => this.screenService.saveScreen(id, d), 'screen', () => this.getScreenList()); }
    cloneScreen(tpl: any) { this.openCloneModal(tpl, (src, dest) => this.screenService.cloneScreen(src, dest), 'Screen', 'screenId', () => this.getScreenList(), (t,d) => this.editScreen(t,d), this.editScreenTpl); }

    // =========================================================================
    // 5. REMAINING UTILS & IMPORT LOGIC
    // =========================================================================

    cleanText = cleanText;

    setPath(str: string) { this.path = str; }

    getCounts(appId: string) {
        this.appService.getCount(appId).subscribe(res => { this.counts.set(res); this.cdr.detectChanges(); });
    }

    editApp(data: any) {
        history.pushState(null, null, window.location.href);
        const modalRef = this.modalService.open(AppEditComponent, { backdrop: 'static' });
        modalRef.componentInstance.user = this.user;
        modalRef.componentInstance.offline = this.offline;
        modalRef.componentInstance.data = data;
        modalRef.result.then(rItem => {
            this.appService.save(rItem, this.user.email).subscribe(res => {
                this.loadApp(res.id);
                this.toastService.show("App properties saved successfully", { classname: 'bg-success text-light' });
            }, () => this.toastService.show("App properties saving failed", { classname: 'bg-danger text-light' }));
        }, () => { });
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

    ngOnDestroy() {
        this.location.onPopState(null);
        this.editFormTpl = null; this.editDatasetTpl = null; this.editDashboardTpl = null; this.editScreenTpl = null;
        this.counts.set({});
    }
}