import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
// import { SignaService } from '../../../service/signa.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { nl2br } from '../../../_shared/utils';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { SignaService } from '../../../service/signa.service';
import { baseApi } from '../../../_shared/constant.service';
import { CommService } from '../../../_shared/service/comm.service';
import { SignaEditDialogService } from './signa-edit-dialog.service';

@Component({
    selector: 'app-signa-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './signa-editor.component.html',
    styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css', './signa-editor.component.scss'],
    imports: [FormsModule, FaIconComponent]
})
export class SignaEditorComponent implements OnInit {

    offline = false;
    app: any;

    loading: boolean;
    signaEntryTotal: any;
    signaEntryList: any;
    // sharedList: any;
    // sharedTotal: any;
    // sharedLoading: any;
    totalItems: any;
    signa: any;
    appId: number;
    resultType:string = 'text';
    baseApi=baseApi;

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
    private commService = inject(CommService);
    private editDialog = inject(SignaEditDialogService);

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
    maxSize = 5;
    startAt = 0;
    entryPageNumber: number = 1;

    editCode: boolean;
    editSigna(signa) {
        this.editDialog.open(signa)
            .then(data => {
                data.content = nl2br(data.content);
                this.signaService.saveSigna(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.commService.emitChange({ key: 'signa-list-changed' });
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
                        this.commService.emitChange({ key: 'signa-list-changed', page: 1 });
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
    

}
