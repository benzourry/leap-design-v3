import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { MailerService } from '../../../service/mailer.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
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

@Component({
    selector: 'app-mailer-editor',
    templateUrl: './mailer-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './mailer-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast,
        NgClass, FilterPipe, EditMailerComponent, EditDatasetComponent,
        NotiListComponent],
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

    offline = false;
    app: any;

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
        this.location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    }

    ngOnInit() {
        this.userService.getCreator()
            .subscribe((user) => {
                this.user = user;
                this.cdr.detectChanges();


                // this.populateAutoComplete();

                this.route.parent.params
                    // NOTE: I do not use switchMap here, but subscribe directly
                    .subscribe((params: Params) => {
                        this.appId = params['appId'];


                        if (this.appId) {
                            let params = { email: user.email }
                            // new HttpParams()
                            //     .set("email", user.email);

                            this.appService.getApp(this.appId, params)
                                .subscribe(res => {
                                    this.app = res;
                                    this.cdr.detectChanges();
                                });
                            this.getFormList(this.appId);
                        }

                        this.loadMailerList(1);
                        this.loadAllMailerList();
                        this.loadSchedList(1);
                        this.getDatasetList();
                    });



                this.route.queryParams
                    .subscribe((params: Params) => {
                        const id = params['id'];
                        if (id) {
                            this.loadMailer(id);
                        }
                    })
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

    // this.loadMailerList = loadMailerList;
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

    // this.loadMailerList = loadMailerList;
    loadAllMailerList() {

        let params = {
            appId: this.appId,
            page: 0,
            size: 9999
        }
        this.mailerService.getMailerList(params)
            .subscribe(res => {
                this.allMailerList = res.content;
                this.cdr.detectChanges();
            }, res => { })
    }

    editMailerData: any;
    editMailer(content, mailer, isNew) {
        // console.log(mailer);
        // mailer.content = this.br2nl(mailer.content);
        if (!mailer.content) mailer.content = '';
        this.editMailerData = mailer;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(data => {
                // data.content = this.nl2br(data.content);
                this.mailerService.save(this.user.email, this.appId, data)
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
            // this.mailer = mailer;
            // this.viewType = 'mailer';
            this.cdr.detectChanges();
        })
    }

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
        this.mailerService.getMailer(id)
            .subscribe(mailer => {
                this.mailer = mailer;
                this.viewType = 'mailer';
                this.cdr.detectChanges();
            })

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
                // this.maiTotal = res.page?.totalElements;
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

    // schedId:number;
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
        // console.log(mailer);
        // mailer.content = this.br2nl(mailer.content);
        this.editSchedData = sched;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                // data.content = this.nl2br(data.content);
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
        // console.log(mailer);
        // mailer.content = this.br2nl(mailer.content);
        // this.editSchedData = sched;
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
        // const editor = cm.codeMirror;
        // const doc = editor.getDoc();
        // var cursor = doc.getCursor(); // gets the line number in the cursor position
        // // var line = doc.getLine(cursor.line); // get the line contents
        // // var pos = {
        // //   line: cursor.line
        // // };
        // doc.replaceRange("{{" + text + "}}", cursor);
        // }
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

    // hint: any = null;
    // editHolderForm: any = {}
    // loadForm(id, holder) {
    //     this.formService.getForm(id)
    //         .subscribe(res => {

    //             holder['data'] = res;
    //             holder['prev'] = res.prev;

    //             this.populateAutoComplete();

    //         });
    // }

    formList: any[];
    getFormList(appId) {
        let params = { appId: appId }
        // new HttpParams()
        //     .set("appId", this.app.id)

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

    // extraAutoCompleteHtml: any[] = [];
    // populateAutoComplete() {

    //     this.extraAutoCompleteHtml = [];
    //     if (this.editHolderForm?.data?.items) {
    //         Object.keys(this.editHolderForm?.data?.items).forEach(key => {
    //             var value = this.editHolderForm?.data?.items[key];
    //             if (value.type != 'static') {
    //                 if (['select', 'radio'].indexOf(value?.type) > -1){
    //                     this.extraAutoCompleteHtml.push({ detail: `{{$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, type: "text", apply: `{{$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, label: value.label })
    //                 }else if (['date'].indexOf(value?.type) > -1){
    //                     this.extraAutoCompleteHtml.push({ detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key};format="date:dd/MM/yyyy HH:mm"}}`, label: value.label })
    //                 }else if (['file'].indexOf(value?.type) > -1){
    //                     this.extraAutoCompleteHtml.push({ detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key};format="src"}}`, label: value.label })
    //                 }else{
    //                     this.extraAutoCompleteHtml.push({ detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}}}`, label: value.label })
    //                 }
                    
    //                 //   this.extraAutoCompleteJs.push({ detail: `$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, type: "text", apply: `$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, label: value.label })
    //             }
    //         });
    //         if (this.editHolderForm?.prev) {
    //             Object.keys(this.editHolderForm?.prev?.items).forEach(key => {
    //                 var value = this.editHolderForm?.prev?.items[key];
    //                 if (this.editHolderForm?.prev?.items[key].type != 'static') {
    //                     if (['select', 'radio'].indexOf(value?.type) > -1){
    //                         this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, type: "text", apply: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, label: value.label })
    //                     }else if (['date'].indexOf(value?.type) > -1){
    //                         this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}}}`, type: "text", apply: `{{$prev$.${key};format="date:dd/MM/yyyy HH:mm"}}`, label: value.label })
    //                     }else if (['file'].indexOf(value?.type) > -1){
    //                         this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}}}`, type: "text", apply: `{{$prev$.${key};format="src"}}`, label: value.label })
    //                     }else{
    //                         this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}}}`, type: "text", apply: `{{$prev$.${key}}}`, label: value.label })
    //                     }                    }
    //             });
    //         }

    //         if (this.editHolderForm?.data) {
    //             this.editHolderForm?.data?.sections?.forEach(section => {
    //                 // console.log(section)
    //                 if (section.type == 'list') {
    //                     this.extraAutoCompleteHtml.push({ label: '(child) $.' + section.code, type: "text", apply: this.getLoopCode(section), detail: '' + section.title })
    //                 }
    //             })
    //         }
    //     }

    //     this.extraAutoCompleteHtml.push({ label: 'If-condition', type: "text", apply: "{{if ($.#{condition})}}\n\t<!--show if true-->\n{{else}}\n\t<!--show if false-->\n{{endif}}", detail: 'Conditional text' })
    //     this.extraAutoCompleteHtml.push({ label: '$$_.status', type: "text", apply: "$$_.status", detail: 'Approval status' });
    //     this.extraAutoCompleteHtml.push({ label: '$$_.remark', type: "text", apply: "$$_.remark", detail: 'Approval remark' });
    //     this.extraAutoCompleteHtml.push({ label: '$viewUri$', type: "text", apply: "{{$viewUri$}}", detail: 'URL to view entry' });
    //     this.extraAutoCompleteHtml.push({ label: '$editUri$', type: "text", apply: "{{$editUri$}}", detail: 'URL to edit entry' });
    //     this.extraAutoCompleteHtml.push({ label: '$uiUri$', type: "text", apply: "{{$uiUri$}}", detail: 'Base URL for UI/frontend up to .../#' });


    // }

    // getLoopCode = (section) => "{{$." + section.code + ":{i|" + "\n\t" + this.getItems(section) + "\n}}}"
    // getItems(section) {
    //     return section.items
    //         .filter(i => this.editHolderForm.data?.items[i.code].type != 'static')
    //         .map(i => {
    //             var type = this.editHolderForm.data?.items[i.code].type;
    //             var pipe = ''
    //             if (type == 'date') {
    //                 pipe = ';format="date:dd/MM/yyyy HH:mm"';
    //             } else if (['select', 'radio'].indexOf(type) > -1) {
    //                 pipe = '.name';
    //             } else if (type == 'qr') {
    //                 pipe = ';format="qr"';
    //             } else if (type == 'file') {
    //                 pipe = ';format="src"';
    //             }
    //             return '\t{{i.' + i.code + pipe + '}}';
    //         })
    //         .join("<br/>\n");
    // }

    nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
    br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

}
