import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MailerService } from '../../../service/mailer.service';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, SlicePipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { FormService } from '../../../service/form.service';
import { nl2br } from '../../../_shared/utils';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NotiListComponent } from '../../../_shared/modal/noti-list/noti-list.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MetaTrailViewerComponent } from '../../../_shared/modal/meta-trail-viewer/meta-trail-viewer.component';
import { baseApi } from '../../../_shared/constant.service';
import { CommService } from '../../../_shared/service/comm.service';
import { AssistantLocalContextService } from '../assistant/assistant-local-context.service';
import { EditorIdChipComponent } from '../ui-editor/editor-id-chip.component';
import { MailerEditDialogService } from './mailer-edit-dialog.service';

@Component({
    selector: 'app-mailer-editor',
    templateUrl: './mailer-editor.component.html',
    styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css', './mailer-editor.component.scss'],
    imports: [FaIconComponent, SlicePipe, NotiListComponent, MetaTrailViewerComponent, EditorIdChipComponent,
        NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailerEditorComponent implements OnInit {

    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private mailerService = inject(MailerService);
    private modalService = inject(NgbModal);
    private location = inject(PlatformLocation);
    private router = inject(Router);
    private appService = inject(AppService);
    private formService = inject(FormService);
    private toastService = inject(ToastService);
    private utilityService = inject(UtilityService);
    private cdr = inject(ChangeDetectorRef);  
    private destroyRef = inject(DestroyRef);
    private commService = inject(CommService);
    private assistantContext = inject(AssistantLocalContextService).createRegistration();
    private editMailerDialog = inject(MailerEditDialogService);

    offline = false;
    app: any;
    baseApi = baseApi;

    loading: boolean;
    mailer: any;
    appId: number;
    
    constructor() {
        this.destroyRef.onDestroy(() => this.assistantContext.clear());
        this.commService.changeEmitted$
            .pipe(takeUntilDestroyed())
            .subscribe(data => {
                if (!this.appId || !this.mailerId) return;
                if (data.key === 'assistant-mailer'
                    || (data.key === 'mailer-saved' && String(data.appId) === String(this.appId)
                        && String(data.id) === String(this.mailerId))) {
                    this.loadMailer(Number(this.mailerId));
                }
            });
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
                }
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
    editMailer(mailer) {
        this.editMailerDialog.open(mailer, this.formList)
            .then(data => {
                this.mailerService.save(this.user.email, this.appId, data)
                    .pipe(takeUntilDestroyed(this.destroyRef))  
                    .subscribe(res => {
                        this.commService.emitChange({ key: 'mailer-list-changed', appId: this.appId });
                        this.commService.emitChange({ key: 'editor-search-refresh', category: 'mailer' });
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

    removeMailerData: any;
    removeMailer(content, mailer) {
        this.removeMailerData = mailer;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.mailerService.deleteMailer(mailer.id, data)
                    .subscribe(res => {
                        this.commService.emitChange({ key: 'mailer-list-changed', appId: this.appId, page: 1 });
                        this.commService.emitChange({ key: 'editor-search-refresh', category: 'mailer' });
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
                    this.assistantContext.set({
                      type: 'email-template',
                      id: Number(mailer.id),
                      label: mailer.name,
                    });
                    this.viewType = 'mailer';
                    this.cdr.markForCheck();
                },
                error: err => {
                    console.error("Failed to load mailer", err);
                    this.cdr.markForCheck();
                }
            });
    }

    tplId:number=null;
    openHistory(content, mailId) {
        this.tplId = mailId;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(data => {
            }, res => { })
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

    nl2br = nl2br; 

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