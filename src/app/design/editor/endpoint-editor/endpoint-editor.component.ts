import { ChangeDetectionStrategy, Component, inject, OnInit, viewChild } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { EndpointService } from '../../../service/endpoint.service';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, JsonPipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { JsonViewerComponent } from '../../../_shared/component/json-viewer/json-viewer.component';
import { ChangeDetectorRef } from '@angular/core';
import { EditorIdChipComponent } from '../ui-editor/editor-id-chip.component';
import { CommService } from '../../../_shared/service/comm.service';
import { EndpointEditDialogService } from './endpoint-edit-dialog.service';

@Component({
    selector: 'app-endpoint-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './endpoint-editor.component.html',
    styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css', './endpoint-editor.component.scss'],
    imports: [FormsModule, FaIconComponent, JsonPipe, JsonViewerComponent, EditorIdChipComponent,
        NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem]
})
export class EndpointEditorComponent implements OnInit {

    offline = false;
    app: any;

    loading: boolean;
    endpointEntryTotal: any;
    endpointEntryList: any;
    // sharedList: any;
    // sharedTotal: any;
    // sharedLoading: any;
    totalItems: any;
    endpoint: any;
    appId: number;
    resultType:string = 'text';

    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private endpointService = inject(EndpointService);
    private modalService = inject(NgbModal);
    private location = inject(PlatformLocation);
    private router = inject(Router);
    private appService = inject(AppService);
    private editDialog = inject(EndpointEditDialogService);
    private commService = inject(CommService);
    private toastService = inject(ToastService);
    private utilityService = inject(UtilityService);
    private cdr = inject(ChangeDetectorRef);

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
                            // new HttpParams()
                            //     .set("email", user.email);

                            this.appService.getApp(this.appId, params)
                                .subscribe(res => {
                                    this.app = res;
                                    this.cdr.detectChanges();
                                });
                        }

                        // this.loadSharedList(1);
                    });



                this.route.queryParams
                    .subscribe((params: Params) => {
                        const id = params['id'];
                        if (id) {
                            this.loadEndpoint(id);
                        }
                    })
            });
    }

    user: any;
    endpointId = '';
    data = { 'list': [] };
    pageSize = 45;
    currentPage = 1;
    maxSize = 5;
    startAt = 0;
    entryPageNumber: number = 1;

    editEndpoint(endpoint) {
        this.editDialog.open(this.appId, endpoint, [])
            .then(data => {
                this.endpointService.save(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.commService.emitChange({ key: 'endpoint-list-changed' });
                        this.loadEndpoint(res.id);
                        this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
                        this.toastService.show("Template successfully saved", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Template saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { })
    }

    removeEndpointData: any;
    removeEndpoint(content, endpoint) {
        this.removeEndpointData = endpoint;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.endpointService.deleteEndpoint(endpoint.id, data)
                    .subscribe(res => {
                        this.commService.emitChange({ key: 'endpoint-list-changed', page: 1 });
                        delete this.endpoint;
                        this.toastService.show("Template successfully removed", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Template removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { });
    }

    // loadEndpoint(id) {
    //     this.endpointId = id;
    //     this.endpointService.getEndpoint(id)
    //         .subscribe(endpoint => {
    //             this.requestParams = {};
    //             this.endpoint = endpoint;
    //             let g = endpoint.url.match(/\{(.[^{]+)\}/ig);
    //             this.params = [];
    //             g?.forEach(element => {
    //                 if (!element.includes('_secret')){
    //                     this.params.push(element.replace(/([{}\s]+)/ig, ''));
    //                 }
    //             });
    //             this.cdr.detectChanges();
    //         })

    // }
    params: string[];
    loadEndpoint(id) {
        this.endpointId = id;
        this.endpointService.getEndpoint(id)
            .subscribe(endpoint => {
                this.requestParams = {};
                this.endpoint = endpoint;
                
                // 1. Updated Regex to accurately capture both {param} and {{param}}
                let g = endpoint.url.match(/\{\{?[^{}]+\}\}?/ig);
                
                this.params = [];
                g?.forEach(element => {
                    // 2. Filter out elements that start with double braces
                    if (!element.startsWith('{{') && !element.includes('_secret')) {
                        this.params.push(element.replace(/([{}\s]+)/ig, ''));
                    }
                });
                
                this.cdr.detectChanges();
            })
    }

    requestParams: any = {}
    result:any;
    resultStatus = '';
    error:any;

    endpointPromptTpl = viewChild('endpointPromptTpl');
    runEndpoint() {        
        this.result = null;
        this.error = null;

        const run = (p) => {
            this.endpointService.runEndpoint(this.endpointId, p)
            .subscribe({
                next:(res)=>{
                    this.result = res.body;
                    this.resultStatus = `${res.status} ${res.statusText || 'OK'}`;
                    this.cdr.detectChanges();
                },
                error: (error)=>{
                    this.error = error;
                    console.log(this.error);
                    this.cdr.detectChanges();
                }
            })            
        }

        if (this.params.length > 0){
          // IF THERE ARE PROMPTS
          this.modalService.open(this.endpointPromptTpl(), { backdrop: 'static' })
          .result.then(data => {
            run(data);
          }, res=>{});
        }else{
            run({});
        }
    }

    copyText(value: string, label: string) {
        navigator.clipboard.writeText(value).then(() => {
            this.toastService.show(`${label} copied to clipboard`, { classname: 'bg-success text-light' });
        }).catch(() => {
            this.toastService.show(`Failed to copy ${label}`, { classname: 'bg-danger text-light' });
        });
    }

    copySnippet() {
        if (!this.endpoint) return;
        
        let snippet = `$endpoint$('${this.endpoint.code}', {\n`;
        
        // Add parameters if they exist
        if (this.params && this.params.length > 0) {
            this.params.forEach((p, index) => {
                const isLast = index === this.params.length - 1;
                snippet += `  ${p}: 'value'${isLast ? '' : ','}\n`;
            });
        }
        
        snippet += `}, data => {\n  // data handling\n}, error => {\n  // error handling\n});`;

        this.copyText(snippet, 'Snippet');
    }


}
