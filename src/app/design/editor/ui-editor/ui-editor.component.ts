import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, OnInit, OnDestroy, signal, TemplateRef, ViewChild } from '@angular/core';
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
import { EntryService } from '../../../run/_service/entry.service';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { GroupByPipe } from '../../../_shared/pipe/group-by.pipe';
import { CloneDashboardComponent } from '../../../_shared/modal/clone-dashboard/clone-dashboard.component';
import { KryptaService } from '../../../service/krypta.service';

@Component({
    selector: 'app-ui-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './ui-editor.component.html',
    styleUrls: ['./ui-editor.component.scss', '../../../../assets/css/side-menu.css',
        '../../../../assets/css/element-action.css'],
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
    designPane: boolean = false;
    counts = signal<any>({});
    searchText: string = "";

    helpLink = "https://unimas-my.sharepoint.com/:w:/g/personal/blmrazif_unimas_my/EcX9YxrT4o5NtXnyF-j2dQgBR0rw7rgL8ab7sw3i9SgdyA?e=msJJtB";


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

    excelImportIsNext:boolean=false;

    ngOnInit() {

        this.commService.changeEmitted$.subscribe(data => {
            this.counts.update(c=>({...c, [data.key]: data.value}));
            if (this.app?.id){
                if (data.key == 'form') {
                    this.getFormList();
                }
                if (data.key == 'dataset') {
                    this.getDatasetList();
                }
                if (data.key == 'screen') {
                    this.getScreenList();
                }
                if (data.key == 'dashboard') {
                    this.getDashboardList();
                }                
            }

        });

        this.route.parent.url.subscribe(e => {
            this.currentPath = this.route.firstChild.routeConfig.path;
        })

        this.userService.getCreator().subscribe((user) => {

            this.user = user;
            this.cdr.detectChanges();

            this.route.parent.parent.params
                // NOTE: I do not use switchMap here, but subscribe directly
                .subscribe((params: Params) => {


                    const appId = params['appId'];
                    localStorage.setItem("debugAppId",appId);
                    
                    if (appId) {
                        let params = { email: user.email }

                        this.appService.getApp(appId, params)
                            .subscribe(res => {
                                this.appService.searchInApp.clear();
                                this.app = res;
                                this.getCounts(res.id);

                                this.getFormList();
                                this.getDatasetList();
                                this.getDashboardList();
                                this.getScreenList();

                                this.getCognaList(res.id);
                                this.getWalletList(res.id);
                                this.getMailerList(res.id);
                                this.getAccessList(res.id);
                                this.getLookupList(res.id);
                                this.getBucketList(res.id);
                                this.getLambdaList(res.id);
                                this.cdr.detectChanges();
                            });
                    }

                });

            this.appService.getAppMyList({
                email: this.user.email,
                size: 999,
                sort: 'id,desc'
            }).subscribe(res => {
                this.otherAppList = res.content;
                this.cdr.detectChanges();
            })

        });
    }


    // formPageNo:number=1;
    formLoading: boolean = false;
    // formPageSize: number = 9999;
    formSearchText: string = "";
    formList: any[] = [];
    formTotal: number = 0;
    getFormList() {
        this.formLoading = true;

        let params = {
            appId: this.app.id,
            size: 9999,
            page: 0,
            searchText: this.formSearchText,
            sort: ['sortOrder,asc','id,asc']
        }

        this.formService.getListBasic(params)
            .subscribe(res => {
                this.formList = res.content;
                this.formTotal = res.page?.totalElements;
                this.formLoading = false;
                // this.commService.emitChange({ key: 'form', value: this.formTotal });
                // this.counts['form'] = res.page?.totalElements;
                this.counts.update(c=>({...c, form: res.page?.totalElements}));
                this.formList.forEach(f => this.appService.searchInApp.set('form' + f.id, { icon: ['far', 'plus-square'], name: 'Form: ' + f.title, route: ['ui', 'form'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            }, res => {
                this.formLoading = false;
                this.cdr.detectChanges();
            });

    }

    datasetList: any[] =[];
    datasetGroupBy: string = null;
    getDatasetList() {
        this.datasetService.getDatasetList(this.app.id)
            .subscribe(res => {
                this.datasetList = res;
                // this.commService.emitChange({ key: 'dataset', value: res.length });
                // this.counts['dataset'] = res.length;
                this.counts.update(c=>({...c, dataset: res.length}));
                this.datasetList.forEach(f => this.appService.searchInApp.set('dataset' + f.id, { icon: ['fas', 'list'], name: 'Dataset: ' + f.title, route: ['ui', 'dataset'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            })
    }

    screenLoading: boolean;
    screenList: any[] = [];
    screenGroupBy: string = null;
    getScreenList() {
        this.screenLoading = true;
        this.screenService.getScreenList(this.app.id)
            .subscribe(res => {
                this.screenList = res;
                this.screenLoading = false;
                // this.commService.emitChange({ key: 'screen', value: res.length });   
                // this.counts['screen'] = res.length;
                this.counts.update(c=>({...c, screen: res.length}));
                this.screenList.forEach(f => this.appService.searchInApp.set('screen' + f.id, { icon: ['fas', 'file'], name: 'Screen: ' + f.title, route: ['ui', 'screen'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();

            })
    }

    dashboardList: any[] = [];
    getDashboardList() {
        this.dashboardService.getDashboardList(this.app.id)
            .subscribe(res => {
                this.dashboardList = res;
                // this.commService.emitChange({ key: 'dashboard', value: res.length });
                // this.counts['dashboard'] = res.length;
                this.counts.update(c=>({...c, dashboard: res.length}));
                this.dashboardList.forEach(f => this.appService.searchInApp.set('dashboard' + f.id, { icon: ['fas', 'tachometer-alt'], name: 'Dashboard: ' + f.title, route: ['ui', 'dashboard'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();

            })
    }

    accessList: any[] = [];
    getAccessList(appId) {
        this.groupService.getGroupList({ appId: appId, size: 9999 })
            .subscribe(res => {
                this.accessList = res.content;
                // this.commService.emitChange({ key: 'access', value: res.length });
                // this.counts['access'] = res.page?.totalElements;
                this.counts.update(c=>({...c, access: res.page?.totalElements}));
                this.accessList.forEach(f => this.appService.searchInApp.set('access' + f.id, { icon: ['fas', 'users-cog'], name: 'Access Group: ' + f.name, route: ['user'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            })
    }

    mailerList: any[] = [];
    getMailerList(appId) {
        this.mailerService.getMailerList({ appId: appId, size: 9999 })
            .subscribe(res => {
                this.mailerList = res.content;
                // this.commService.emitChange({ key: 'access', value: res.length });
                // this.counts[]
                this.mailerList.forEach(f => this.appService.searchInApp.set('mailer' + f.id, { icon: ['fas', 'mail-bulk'], name: 'Mailer: ' + f.name, route: ['mailer'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            })
    }

    lookupList: any[] = [];
    getLookupList(appId) {
        this.lookupService.getLookupList({ appId: appId, size: 9999 })
            .subscribe(res => {
                this.lookupList = res.content;
                // this.counts['lookup'] = res.page?.totalElements;
                this.counts.update(c=>({...c, lookup: res.page?.totalElements}));
                this.lookupList.forEach(f => this.appService.searchInApp.set('lookup' + f.id, { icon: ['far', 'caret-square-down'], name: 'Lookup: ' + f.name, route: ['lookup'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            })
    }

    bucketList: any[] = [];
    getBucketList(appId) {
        this.bucketService.getBucketList({ appId: appId, size: 9999 })
            .subscribe(res => {
                this.bucketList = res.content;
                this.bucketList.forEach(f => this.appService.searchInApp.set('bucket' + f.id, { icon: ['fas', 'box'], name: 'Bucket: ' + f.name, route: ['bucket'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            })
    }

    lambdaList: any[] = [];
    getLambdaList(appId) {
        this.lambdaService.getLambdaList({ appId: appId, size: 9999 })
            .subscribe(res => {
                this.lambdaList = res.content;
                this.lambdaList.forEach(f => this.appService.searchInApp.set('lambda' + f.id, { icon: ['fas', 'rocket'], name: 'Lambda: ' + f.name, route: ['lambda'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            })
    }

    cognaList: any[] = [];
    getCognaList(appId) {
        this.cognaService.getCognaList({ appId: appId, size: 9999 })
            .subscribe(res => {
                this.cognaList = res.content;
                this.cognaList.forEach(f => this.appService.searchInApp.set('cogna' + f.id, { icon: ['fas', 'robot'], name: 'Cogna: ' + f.name, route: ['cogna'], opt: { queryParams: { id: f.id } } }));
                this.cdr.detectChanges();
            })
    }

    walletList: any[] = [];
    getWalletList(appId) {
        this.kryptaService.getWalletList({ appId: appId, size: 9999 })
            .subscribe(res => {
                this.walletList = res.content;
                this.cdr.detectChanges(); // <--- Add here
            });
    }


    setPath(str: string) {
        this.path = str;
    }

    popShare(id) {
        let url = this.app.appPath ? this.app.appPath + '.' + domainBase : domainBase + "/#/run/" + id;
        prompt('App URL (Press Ctrl+C to copy)', url);
    }

    lookupIds = [];
    lookupKey = {};
    lookup = {};
    mod = {};

    // copyRequestList: any = [];
    // getCopyRequestList() {
    //     this.appService.getCopyRequestList(this.app.id)
    //         .subscribe(res => {
    //             this.copyRequestList = res.content;
    //         })
    // }

    getCounts(appId) {
        this.appService.getCount(appId)
            .subscribe(res => {
                this.counts.set(res);
                this.cdr.detectChanges();
            })
    }

    viewCopyRequest(content) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(res => { }, err => { });
    }

    // activateCp(id, action) {
    //     this.appService.activateCp(id, action)
    //         .subscribe(res => {
    //             this.getCopyRequestList();
    //         })
    // }

    editApp(data) {

        history.pushState(null, null, window.location.href);

        const modalRef = this.modalService.open(AppEditComponent, { backdrop: 'static' })
        modalRef.componentInstance.user = this.user;
        modalRef.componentInstance.offline = this.offline;
        modalRef.componentInstance.data = data;

        modalRef.result.then(rItem => {
            // console.log(rItem);
            this.appService.save(rItem, this.user.email)
                .subscribe(res => {
                    let params = { email: this.user.email }
                    // new HttpParams()
                    //     .set("email", this.user.email);

                    this.appService.getApp(res.id, params)
                        .subscribe(res => {
                            this.app = res;
                            // this.getCopyRequestList();
                            this.cdr.detectChanges();
                        });
                    this.toastService.show("App properties saved successfully", { classname: 'bg-success text-light' });
                }, error => {
                    this.toastService.show("App properties saving failed", { classname: 'bg-danger text-light' });
                });
        }, res => { });
    }

    importMetadataData: any;
    importMetadata(content) {
        this.importMetadataData = null;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {

            }, res => { })
    }

    // createField:boolean;
    // createDataset: boolean;
    // createDashboard: boolean;
    // importToLive: boolean;
    metadataFile: any;
    importMetadataLoading: boolean = false;
    uploadMetadata($event) {
        if ($event.target.files && $event.target.files.length) {
            this.importMetadataLoading = true;
            this.appService.uploadMetadata(this.app.id, $event.target.files[0], this.user.email)
                .subscribe({
                    next: (res) => {
                        // let app = res.app;

                        this.importMetadataData = res;
                        this.importMetadataLoading = false;
                        // this.getCounts(this.app.id);
                        // this.commService.emitChange({ key: 'form', value: "import" });


                        this.app = res.app;
                        this.getCounts(this.app.id);
                        // this.getCopyRequestList();

                        this.getFormList();
                        this.getDatasetList();
                        this.getDashboardList();
                        this.getScreenList();

                        this.getCognaList(this.app.id);
                        this.getMailerList(this.app.id);
                        this.getAccessList(this.app.id);
                        this.getLookupList(this.app.id);
                        this.getBucketList(this.app.id);
                        this.getLambdaList(this.app.id);
                        this.cdr.detectChanges();


                        this.toastService.show("Metadata successfully imported", { classname: 'bg-success text-light' });
                    },
                    error: (error) => {
                        this.importMetadataData = {
                            success: false,
                            message: error.message
                        }
                        this.importMetadataLoading = false;
                    }
                })

        }

    }

    importExcelData: any;
    importExcel(content) {
        this.importExcelData = null;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {

            }, res => { })
    }

    // createField:boolean;
    createDataset: boolean;
    createDashboard: boolean;
    importToLive: boolean;
    file: any;
    importLoading: boolean = false;
    uploadExcel($event, createDataset, createDashboard, importToLive) {
        if ($event.target.files && $event.target.files.length) {
            this.importLoading = true;
            this.appService.uploadExcel(this.app.id, $event.target.files[0], this.user.email, createDataset, createDashboard, importToLive)
                .subscribe({
                    next: (res) => {
                        this.importExcelData = res;
                        this.importLoading = false;
                        this.getCounts(this.app.id);
                        this.commService.emitChange({ key: 'form', value: "import" });
                        this.toastService.show("Excel successfully imported", { classname: 'bg-success text-light' });
                    },
                    error: (error) => {
                        this.importExcelData = {
                            success: false,
                            message: error.message
                        }
                        this.importLoading = false;
                    }
                })

        }

    }

    // formEditData:any={}
    newForm: any = { nav: 'simple', type: 'db', sections: [{ sortOrder: 0, size: 'col-sm-12', type: 'section', title: 'Section 1', code: 'section1' }], canEdit: true, canRetract: true, canSave: true, canSubmit: true, validateSave: true, 
    x: { facet: 'add,edit,view', restrictAccess: true, accessByUser: true, accessByApprover: true, autoSync: true } }

    editFormData: any = {}
    editForm(tpl, data) {
        this.editFormData = data;
        // this.formEditData = {x:{}}
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static', size: 'lg' })
            .result.then(res => {
                this.formService.saveForm(this.app.id, res)
                    .subscribe(res => {
                        this.getFormList();
                        this.router.navigate(['form'], { relativeTo: this.route, queryParams: { id: res.id } });
                        this.cdr.detectChanges();
                    })
            }, dismiss => { })
    }

    @ViewChild("editFormTpl") editFormTpl: TemplateRef<any>;
    cloneForm(tpl) {
        // this.formEditData = {x:{}}
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(cloneFormData => {
                this.formService.cloneForm(cloneFormData.formId, this.app.id)
                    .subscribe({
                        next: (res) => {
                            this.getFormList();
                            res.title = res.title + " (cloned)";
                            this.editForm(this.editFormTpl, res);
                            // delete this.curForm;
                            this.toastService.show("Form cloned successfully", { classname: 'bg-success text-light' });
                        }, error: (err) => {
                            this.toastService.show("Form cloning failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, dismiss => { })
    }

    newDataset: any = { items: [], filters: [], next: {}, screen: {}, presetFilters: {}, showAction: true, 
                        actions:[{label:'View', action:'view',type:'dropdown',inpop:true,icon:'fas:file',style:'btn-secondary'},{label:'Edit', action:'edit',type:'dropdown',inpop:true,icon:'fas:pencil-alt',style:'btn-secondary'},{label:'Delete', action:'delete',type:'dropdown',inpop:true,icon:'fas:trash',style:'btn-secondary'}],
                        x: {tblcard:true, showSummary: true}, wide: true
                      };

    editDatasetData: any = {};
    // editDatasetFormHolder:any={};
    editDataset(tpl, data) {
        this.editDatasetData = data;
        this.editDatasetData.appId = this.app.id;
        // this.editDatasetFormHolder = holder;
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(res => {
                this.datasetService.saveDataset(this.app.id, res)
                    .subscribe(res => {
                        this.getDatasetList();
                        this.router.navigate(['dataset'], { relativeTo: this.route, queryParams: { id: res.id } });
                        this.cdr.detectChanges();
                    })
            }, dismiss => { })
    }

    @ViewChild("editDatasetTpl") editDatasetTpl: TemplateRef<any>;
    cloneDataset(tpl) {
        // this.formEditData = {x:{}}
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(cloneDatasetData => {
                this.datasetService.cloneDataset(cloneDatasetData.datasetId, this.app.id)
                    .subscribe({
                        next: (res) => {
                            this.getDatasetList();
                            res.title = res.title + " (cloned)";
                            // this.editDatasetFormHolder = {data:res.form, prev: res.form?.prev}
                            this.editDataset(this.editDatasetTpl, res);
                            // delete this.curForm;
                            this.toastService.show("Dataset cloned successfully", { classname: 'bg-success text-light' });
                        }, error: (err) => {
                            this.toastService.show("Dataset cloning failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, dismiss => { })
    }

    @ViewChild("editDashboardTpl") editDashboardTpl: TemplateRef<any>;
    cloneDashboard(tpl) {
        // this.formEditData = {x:{}}
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(cloneDashboardData => {
                this.dashboardService.cloneDashboard(cloneDashboardData.dashboardId, this.app.id)
                    .subscribe({
                        next: (res) => {
                            this.getDashboardList();
                            res.title = res.title + " (cloned)";
                            // this.editDatasetFormHolder = {data:res.form, prev: res.form?.prev}
                            this.editDashboard(this.editDashboardTpl, res);
                            // delete this.curForm;
                            this.toastService.show("Dashboard cloned successfully", { classname: 'bg-success text-light' });
                        }, error: (err) => {
                            this.toastService.show("Dashboard cloning failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, dismiss => { })
    }

    newDashboard: any = { items: [], filters: [], next: {}, screen: {}, presetFilters: {}, showAction: true, canView: true, canEdit: true, canDelete: true };
    editDashboardData: any = {};
    editDashboard(tpl, data) {
        this.editDashboardData = data;
        this.editDashboardData.appId = this.app.id;
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(res => {
                this.dashboardService.saveDashboard(this.app.id, res)
                    .subscribe(res => {
                        this.getDashboardList();
                        this.router.navigate(['dashboard'], { relativeTo: this.route, queryParams: { id: res.id } });
                        this.cdr.detectChanges();
                    })
            }, dismiss => { })
    }

    newScreen: any = { data: {}, canPrint: false };
        
    editScreenData: any = {};

    editScreen(tpl, data) {
        // console.log(data);
        this.editScreenData = data;
        this.editScreenData.appId = this.app.id;
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(res => {
                this.screenService.saveScreen(this.app.id, res)
                    .subscribe(res => {
                        this.getScreenList();
                        this.router.navigate(['screen'], { relativeTo: this.route, queryParams: { id: res.id } });
                        this.cdr.detectChanges();
                    })
            }, dismiss => { })
    }

    
    @ViewChild("editScreenTpl") editScreenTpl: TemplateRef<any>;
    cloneScreen(tpl) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(cloneScreenData => {
                this.screenService.cloneScreen(cloneScreenData.screenId, this.app.id)
                    .subscribe({
                        next: (res) => {
                            this.getScreenList();
                            res.title = res.title + " (cloned)";
                            // this.editScreenFormHolder = {data:res.form, prev: res.form?.prev}
                            this.editScreen(this.editScreenTpl, res);
                            // delete this.curForm;
                            this.toastService.show("Screen cloned successfully", { classname: 'bg-success text-light' });
                        }, error: (err) => {
                            this.toastService.show("Screen cloning failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, dismiss => { })
    }

    cleanText = cleanText;

    // dragPosition = { x: 0, y: 0 };
    // sidebarWidth: number = 240;
    // sidebarResize($event, sidebarMenu) {
    //     // console.log($event);
    //     let x = $event.event.clientX ?? $event.event.changedTouches[0].clientX;
    //     let half = ($event.event.view.innerWidth / 2) - 23;
    //     if (x - 46 >= half) {
    //         this.dragPosition = { x: half - 240, y: 0 };
    //         this.sidebarWidth = half;
    //     } else if (x <= 46) {
    //         this.dragPosition = { x: 0 - 240, y: 0 };
    //         this.sidebarWidth = 0;
    //     } else {
    //         this.dragPosition = { x: x - 240 - 46, y: 0 };
    //         this.sidebarWidth = x - 46;
    //     }
    //     sidebarMenu.style.maxWidth = this.sidebarWidth + 'px';
    // }

    reorderForm(event: CdkDragDrop<number[]>, parent){
        moveItemInArray(parent, event.previousIndex, event.currentIndex);
        let formList = parent.map((val, $index)=>({id: val.id, sortOrder: $index}));
        this.formService.saveFormOrder(formList)
        .subscribe();
    }
    reorderScreen(event: CdkDragDrop<number[]>, parent){
        moveItemInArray(parent, event.previousIndex, event.currentIndex);
        let screenList = parent.map((val, $index)=>({id: val.id, sortOrder: $index}));
        this.screenList = [...parent];
        this.screenService.saveScreenOrder(screenList)
        .subscribe();
    }

    reorderDashboard(event: CdkDragDrop<number[]>, parent){
        moveItemInArray(parent, event.previousIndex, event.currentIndex);
        let dashboardList = parent.map((val, $index)=>({id: val.id, sortOrder: $index}));
        this.dashboardList = [...parent];
        this.dashboardService.saveDashboardOrder(dashboardList)
        .subscribe();
    }

    reorderDataset(event: CdkDragDrop<number[]>, parent){
        moveItemInArray(parent, event.previousIndex, event.currentIndex);
        let datasetList = parent.map((val, $index)=>({id: val.id, sortOrder: $index}));
        this.datasetList = [...parent];
        this.datasetService.saveDatasetOrder(datasetList)
        .subscribe();
    }

    ngOnDestroy() {
        // Remove popstate listener
        this.location.onPopState(null);

        // Nullify ViewChild references
        this.editFormTpl = null;
        this.editDatasetTpl = null;
        this.editDashboardTpl = null;
        this.editScreenTpl = null;

        // Reset signals
        this.counts.set({});
        // this.datasetList.set([]);

        // Optionally clear searchInApp map if needed
        // this.appService.searchInApp.clear();
    }


}
