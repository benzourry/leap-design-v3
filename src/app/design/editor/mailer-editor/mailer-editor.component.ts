import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { MailerService } from '../../../service/mailer.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, SlicePipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { FormService } from '../../../service/form.service';
import { SchedService } from '../../../service/sched.service';
import { DatasetService } from '../../../service/dataset.service';
import { br2nl, nl2br } from '../../../_shared/utils';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { NotiListComponent } from '../../../_shared/modal/noti-list/noti-list.component';
import { EditMailerComponent } from '../../../_shared/modal/edit-mailer/edit-mailer.component';
import { EditDatasetComponent } from '../../../_shared/modal/edit-dataset/edit-dataset.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MetaTrailViewerComponent } from '../../../_shared/modal/meta-trail-viewer/meta-trail-viewer.component';
import { baseApi } from '../../../_shared/constant.service';
import { LambdaService } from '../../../service/lambda.service';

@Component({
    selector: 'app-mailer-editor',
    templateUrl: './mailer-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './mailer-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast,
        NgClass, FilterPipe, EditMailerComponent, EditDatasetComponent, SlicePipe,
        NotiListComponent, MetaTrailViewerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailerEditorComponent implements OnInit {

    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private mailerService = inject(MailerService);
    private schedService = inject(SchedService);
    private modalService = inject(NgbModal);
    private location = inject(PlatformLocation);
    private router = inject(Router);
    private appService = inject(AppService);
    private formService = inject(FormService);
    private datasetService = inject(DatasetService);
    private toastService = inject(ToastService);
    private utilityService = inject(UtilityService);
    private cdr = inject(ChangeDetectorRef);  
    private destroyRef = inject(DestroyRef);
    private lambdaService = inject(LambdaService);

    offline = false;
    app: any;
    baseApi = baseApi;

    mailerTotal: any;
    loading: boolean;
    allMailerList: any;
    mailerList: any;
    mailerEntryTotal: any;
    mailerEntryList: any;
    totalItems: any;
    mailer: any;
    itemLoading: boolean;
    appId: number;
    
    constructor() {
        this.location.onPopState(() => {
            if (document.querySelector('.cm-fullscreen-mode')) {
                return;
            }
            this.modalService.dismissAll('')
        });
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    }

    ngOnInit() {
        // 1. Fetch User
        this.userService.getCreator()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((user) => {
                this.user = user;
                this.cdr.markForCheck();
            });

        // 2. Listen to Parent Route
        this.route.parent.params
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params: Params) => {
                this.appId = params['appId'];

                if (this.appId) {
                    let appParams = { email: this.user?.email }; 
                    
                    this.appService.getApp(this.appId, appParams)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe(res => {
                            this.app = res;
                            this.cdr.markForCheck();
                        });
                        
                    this.getFormList(this.appId);
                    this.loadSecretList();
                }

                this.loadMailerList(1);
                this.loadAllMailerList();
                this.loadSchedList(1);
                this.getDatasetList();
            });

        // 3. Listen to Query Params
        this.route.queryParams
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params: Params) => {
                const id = params['id'];
                if (id && id !== this.mailerId) { 
                    this.loadMailer(id);
                }
            });
    }

    user: any;
    mailerId = '';
    data = { 'list': [] };
    pageSize = 45;
    currentPage = 1;
    itemsPerPage = 15;
    maxSize = 5;
    startAt = 0;
    searchText: string = "";

    pageNumber: number = 1;
    entryPageNumber: number = 1;

    loadMailerList(pageNumber) {
        this.pageNumber = pageNumber;
        this.itemLoading = true;

        let params = {
            searchText: this.searchText,
            appId: this.appId,
            page: pageNumber - 1,
            size: this.itemsPerPage
        }
        this.mailerService.getMailerList(params)
            .pipe(takeUntilDestroyed(this.destroyRef))  
            .subscribe(res => {
                this.mailerList = res.content;
                this.mailerTotal = res.page?.totalElements;
                this.itemLoading = false;
                this.cdr.detectChanges();
            }, res => {
                this.itemLoading = false;
                this.cdr.detectChanges();
            })
    }

    loadAllMailerList() {
        let params = {
            appId: this.appId,
            page: 0,
            size: 9999
        }
        this.mailerService.getMailerList(params)
            .pipe(takeUntilDestroyed(this.destroyRef))  
            .subscribe(res => {
                this.allMailerList = res.content;
                this.cdr.detectChanges();
            }, res => { })
    }

    secretList: any[] = [];
    
    loadSecretList() {
        this.lambdaService.getSecretList(this.appId)
            .subscribe(res => {
                this.secretList = res;
                this.cdr.detectChanges();
            });
    }

    editMailerData: any;
    editMailer(content, mailer, isNew) {
        if (!mailer.content) mailer.content = '';
        this.editMailerData = mailer;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(data => {
                this.mailerService.save(this.user.email, this.appId, data)
                    .pipe(takeUntilDestroyed(this.destroyRef))  
                    .subscribe(res => {
                        this.loadMailerList(this.pageNumber);
                        this.loadMailer(res.id);
                        this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
                        this.toastService.show("Template successfully saved", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Template saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { })
    }

    editMailerById(content, mailerId){
        this.mailerService.getMailer(mailerId)
        .subscribe(mailer => {
            this.editMailer(content, mailer, false)
            this.cdr.detectChanges();
        })
    }

    // ========== APP SMTP CONFIGURATION ==========
    smtpConfigData: any = {};
    openSmtpConfig(content: any) {
        // Fetch the existing SMTP config for this App from backend via AppService
        this.appService.getSmtpConfig(this.appId).subscribe({
            next: (res: any) => {
                // Initialize default values if no config exists yet
                this.smtpConfigData = res || { 
                    appId: this.appId, 
                    auth: true, 
                    startTls: true, 
                    port: 587, 
                    enabled: true 
                };

                history.pushState(null, '', window.location.href);
                this.modalService.open(content, { backdrop: 'static' }).result.then((data) => {
                    // Save to backend via AppService
                    this.appService.saveSmtpConfig(this.appId, data).subscribe({
                        next: () => {
                            this.toastService.show("App SMTP configuration successfully saved", { classname: 'bg-success text-light' });
                        },
                        error: () => {
                            this.toastService.show("Failed to save App SMTP configuration", { classname: 'bg-danger text-light' });
                        }
                    });
                }, () => {});
            },
            error: () => {
                this.toastService.show("Failed to load SMTP config", { classname: 'bg-danger text-light' });
            }
        });
    }

    deleteSmtpConfig(configId: number, dismissCallback: any) {
        if (confirm('Are you sure you want to permanently delete this SMTP configuration and revert to the system default?')) {
            this.appService.removeSmtpConfig(configId).subscribe({
                next: () => {
                    this.toastService.show("App SMTP configuration removed", { classname: 'bg-success text-light' });
                    dismissCallback(); // Close modal on success
                },
                error: () => {
                    this.toastService.show("Failed to delete App SMTP configuration", { classname: 'bg-danger text-light' });
                }
            });
        }
    }
    // ==========================================

    removeMailerData: any;
    removeMailer(content, mailer) {
        this.removeMailerData = mailer;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.mailerService.deleteMailer(mailer.id, data)
                    .subscribe(res => {
                        this.loadMailerList(1);
                        delete this.mailer;
                        this.toastService.show("Template successfully removed", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Template removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { });
    }

    viewType;
    loadMailer(id) {
        this.mailerId = id;
        this.cdr.markForCheck(); 

        this.mailerService.getMailer(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: mailer => {
                    this.mailer = mailer;
                    this.viewType = 'mailer';
                    this.cdr.markForCheck();
                },
                error: err => {
                    console.error("Failed to load mailer", err);
                    this.cdr.markForCheck();
                }
            });
    }

    schedId: number;
    sched: any;

    schedLoading: boolean;
    schedList;
    loadSchedList(pageNumber) {
        this.pageNumber = pageNumber;
        this.schedLoading = true;

        let params = {
            searchText: this.searchText,
            appId: this.appId
        }
        this.schedService.getSchedList(params)
            .subscribe(res => {
                this.schedList = res;
                this.schedLoading = false;
                this.cdr.detectChanges();
            }, res => {
                this.schedLoading = false;
                this.cdr.detectChanges();
            })
    }


    dayOfWeekList = [
        { name: "Sunday", value: 1 },
        { name: "Monday", value: 2 },
        { name: "Tuesday", value: 3 },
        { name: "Wednesday", value: 4 },
        { name: "Thursday", value: 5 },
        { name: "Friday", value: 6 },
        { name: "Saturday", value: 7 }
    ]
    monthOfYearList = [
        { name: "January", value: 0 },
        { name: "February", value: 1 },
        { name: "March", value: 2 },
        { name: "April", value: 3 },
        { name: "May", value: 4 },
        { name: "June", value: 5 },
        { name: "July", value: 6 },
        { name: "August", value: 7 },
        { name: "September", value: 8 },
        { name: "October", value: 9 },
        { name: "November", value: 10 },
        { name: "Disember", value: 11 }
    ]

    dayOfMonthList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

    loadSched(id) {
        this.schedId = id;
        this.mailerService.getMailer(id)
            .subscribe(sched => {
                this.sched = sched;
                this.viewType = 'sched';
                this.cdr.detectChanges();
            })
    }

    keepMinute00 = (object) => {
        if (object['clock'].length >= 4) {
            object['clock'] = object['clock'].slice(0, -1) + '0';
        }
    }

    editSchedData: any;
    editSched(content, sched, isNew) {
        this.editSchedData = sched;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.schedService.save(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.loadSchedList(this.pageNumber);
                        this.loadSched(res.id);
                        this.toastService.show("Schedule successfully saved", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Schedule saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { })
    }

    tplId:number=null;
    openHistory(content, mailId) {
        this.tplId = mailId;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(data => {
            }, res => { })
    }

    removeSchedData: any;
    removeSched(content, sched) {
        this.removeSchedData = sched;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.schedService.deleteSched(sched.id, data)
                    .subscribe(res => {
                        this.loadSchedList(1);
                        delete this.sched;
                        this.toastService.show("Schedule successfully removed", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Schedule removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { });
    }

    insertTextAtCursor(text, cm) {
        cm.insertText("{{" + text + "}}");
    }

    editDatasetData: any;
    editDataset(content, datasetId) {
        this.datasetService.getDataset(datasetId)
            .subscribe(dataset => {
                this.editDatasetData = dataset;
                history.pushState(null, null, window.location.href);
                this.modalService.open(content, { backdrop: 'static' })
                    .result.then(data => {
                        this.datasetService.saveDataset(this.app.id, data)
                            .subscribe(res => {
                                this.toastService.show("Dataset successfully saved");
                                this.cdr.detectChanges();
                            })
                    }, res => { })

            })
    }

    formList: any[];
    getFormList(appId) {
        let params = { appId: appId }
        this.formService.getListBasic(params)
            .subscribe(res => {
                this.formList = res.content;
                this.cdr.detectChanges();
            });
    }

    datasetList;
    getDatasetList() {
        this.datasetService.getDatasetList(this.appId)
            .subscribe(res => {
                this.datasetList = res;
                this.cdr.detectChanges();
            })
    }

    nl2br = nl2br; 
    br2nl = br2nl; 

  currentMetaTrailScope: string = "";
  currentObj: any = null;

  viewMetaTrails(content: any, scope: string, currentObj: any) {
    this.currentMetaTrailScope = scope;
    this.currentObj = currentObj;
    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' }).result.then(() => {}, () => {});
  }

  onTrailReverted(modalCloseFn: any) {
    this.loadMailer(this.mailer.id); 
  }

}