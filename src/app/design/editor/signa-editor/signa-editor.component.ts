import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink, Router } from '@angular/router';
// import { SignaService } from '../../../service/signa.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { br2nl, nl2br, toSnakeCase, toSpaceCase } from '../../../_shared/utils';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { ChangeDetectorRef } from '@angular/core';
import { SignaService } from '../../../service/signa.service';
import { baseApi } from '../../../_shared/constant.service';

@Component({
    selector: 'app-signa-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './signa-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './signa-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLinkActive, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst,
    NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FilterPipe]
})
export class SignaEditorComponent implements OnInit {

    offline = false;
    app: any;

    signaTotal: any;
    loading: boolean;
    signaList: any;
    signaEntryTotal: any;
    signaEntryList: any;
    // sharedList: any;
    // sharedTotal: any;
    // sharedLoading: any;
    totalItems: any;
    signa: any;
    itemLoading = signal<boolean>(false);
    appId: number;
    resultType:string = 'text';
    baseApi=baseApi;

    hashAlgList = ['SHA256','SHA384','SHA512'];
    keyAlgList = ['RSA','ECDSA'];

    ksTypeList = ['JKS', 'PKCS12', 'BKS'];

    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private signaService = inject(SignaService);
    private modalService = inject(NgbModal);
    private location = inject(PlatformLocation);
    private router = inject(Router);
    private appService = inject(AppService);
    private toastService = inject(ToastService);
    private utilityService = inject(UtilityService);
    private cdr = inject(ChangeDetectorRef);

    constructor() {
        this.location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    }

    ngOnInit() {
        this.userService.getCreator()
            .subscribe((user) => {
                this.user = user;
                this.cdr.detectChanges();

                this.route.parent.params
                    // NOTE: I do not use switchMap here, but subscribe directly
                    .subscribe((params: Params) => {
                        this.appId = params['appId'];


                        if (this.appId) {
                            let params = {
                                email: user.email
                            }
                            this.appService.getApp(this.appId, params)
                                .subscribe(res => {
                                    this.app = res;
                                    this.cdr.detectChanges();
                                });
                        }

                        this.loadSignaList(1);
                    });



                this.route.queryParams
                    .subscribe((params: Params) => {
                        const id = params['id'];
                        if (id) {
                            this.loadSigna(id);
                        }
                    })
            });
    }

    user: any;
    signaId:number;
    // data = { 'list': [] };
    pageSize = 45;
    currentPage = 1;
    itemsPerPage = 15;
    maxSize = 5;
    startAt = 0;
    searchText: string = "";

    pageNumber: number = 1;
    entryPageNumber: number = 1;


    // this.loadSignaList = loadSignaList;
    loadSignaList(pageNumber) {
        this.pageNumber = pageNumber;
        this.itemLoading.set(true);

        let params = {
            searchText: this.searchText,
            appId: this.appId,
            page: pageNumber - 1,
            size: this.itemsPerPage
        }
        this.signaService.getSignaList(params)
            .subscribe(res => {
                this.signaList = res.content;
                this.signaTotal = res.page?.totalElements;
                this.itemLoading.set(false);
                this.cdr.detectChanges();
            }, res => {
                this.itemLoading.set(false);
                this.cdr.detectChanges();
            })
    }

    editCode: boolean;
    editSignaData: any;
    editSigna(content, signa, isNew) {

        this.editSignaData = signa;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                data.content = this.nl2br(data.content);
                this.signaService.saveSigna(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.loadSignaList(this.pageNumber);
                        this.loadSigna(res.id);
                        this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
                        this.toastService.show("Signa successfully saved", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Signa saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { })
    }

    removeSignaData: any;
    removeSigna(content, signa) {
        this.removeSignaData = signa;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.signaService.deleteSigna(signa.id, data)
                    .subscribe(res => {
                        this.loadSignaList(1);
                        delete this.signa;
                        this.toastService.show("Template successfully removed", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Template removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { });
    }

    params: string[];
    loadSigna(id) {
        this.signaId = id;
        // this.cdr.markForCheck();
        // this.cdr.detectChanges();
        this.signaService.getSigna(id)
            .subscribe(signa => {
                this.signa = signa;
                this.cdr.markForCheck();
            })

    }

    generateKey(id) {
        this.signaService.generateKey(this.signaId, this.user.email)
            .subscribe(signa => {
                this.signa = signa;
                this.cdr.detectChanges();
            })

    }

    downloadCsr(id) {
        this.signaService.downloadCsr(this.signaId, this.user.email)
            .subscribe(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `signa-${this.signaId}.csr`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            })

    }

    clearFile(type) {
        if(!confirm(`Are you sure to clear the existing ${type}?`)) {
            return;
        }
        this.signaService.clearFile(this.signaId, type,this.user.email)
            .subscribe(signa => {
                this.signa = signa;
                this.cdr.detectChanges();
            })

    }
    // clearImg(id) {
    //     if(!confirm("Are you sure to clear the existing key?")) {
    //         return;
    //     }
    //     this.signaService.clearFile(this.signaId, 'img',this.user.email)
    //         .subscribe(signa => {
    //             this.signa = signa;
    //             this.cdr.detectChanges();
    //         })

    // }


    
    // fileKey: any;
    uploadKeyLoading: boolean = false;
    uploadKeyData: any;
    uploadKey($event) {
        if ($event.target.files && $event.target.files.length) {
            this.uploadKeyLoading = true;
            this.signaService.uploadKey(this.signa.id, $event.target.files[0])
                .subscribe({
                    next: (res) => {
                        this.uploadKeyData = res;
                        // this.editSignaData.keyPath = res.filePath;
                        this.signa.keyPath = res.filePath;
                        this.cdr.detectChanges();
                        this.uploadKeyLoading = false;
                        this.toastService.show("Private Key successfully uploaded", { classname: 'bg-success text-light' });
                        this.loadSigna(this.signa.id);
                    }, error: (error) => {
                        this.uploadKeyData = {
                            success: false,
                            message: error.message
                        }
                        this.uploadKeyLoading = false;
                        this.cdr.detectChanges();
                    }
                })
        }

    }
    
    // file: any;
    uploadImageLoading: boolean = false;
    uploadImageData: any;
    uploadImage($event) {
        if ($event.target.files && $event.target.files.length) {
            this.uploadImageLoading = true;
            this.signaService.uploadImg(this.signa.id, $event.target.files[0])
                .subscribe({
                    next: (res) => {
                        this.uploadImageData = res;
                        this.signa.imagePath = res.filePath;
                        // this.editSignaData.imagePath = res.filePath;
                        this.cdr.detectChanges();
                        this.uploadImageLoading = false;
                        this.toastService.show("Signature Image successfully uploaded", { classname: 'bg-success text-light' });                        
                        this.loadSigna(this.signa.id);
                    }, error: (error) => {
                        this.uploadImageData = {
                            success: false,
                            message: error.message
                        }
                        this.uploadImageLoading = false;
                        this.cdr.detectChanges();
                    }
                })
        }

    }
    
    nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
    br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

    toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

    toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';
    itemExist = (f) => this.signaList.filter(e => e.code == f.code).length > 0 && !f.id;

}
