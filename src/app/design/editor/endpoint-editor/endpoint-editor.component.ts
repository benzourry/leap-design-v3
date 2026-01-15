import { ChangeDetectionStrategy, Component, inject, OnInit, viewChild } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink, Router } from '@angular/router';
import { EndpointService } from '../../../service/endpoint.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, JsonPipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { br2nl, nl2br, toSnakeCase, toSpaceCase } from '../../../_shared/utils';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { JsonViewerComponent } from '../../../_shared/component/json-viewer/json-viewer.component';
import { ChangeDetectorRef } from '@angular/core';
import { LambdaService } from '../../../service/lambda.service';

@Component({
    selector: 'app-endpoint-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './endpoint-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './endpoint-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLinkActive, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, 
        NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FilterPipe, JsonPipe, JsonViewerComponent]
})
export class EndpointEditorComponent implements OnInit {

    offline = false;
    app: any;

    endpointTotal: any;
    loading: boolean;
    endpointList: any;
    endpointEntryTotal: any;
    endpointEntryList: any;
    // sharedList: any;
    // sharedTotal: any;
    // sharedLoading: any;
    totalItems: any;
    endpoint: any;
    itemLoading: boolean;
    appId: number;
    resultType:string = 'text';

    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private endpointService = inject(EndpointService);
    private modalService = inject(NgbModal);
    private location = inject(PlatformLocation);
    private router = inject(Router);
    private appService = inject(AppService);
    private lambdaService = inject(LambdaService); 
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
                            // new HttpParams()
                            //     .set("email", user.email);

                            this.appService.getApp(this.appId, params)
                                .subscribe(res => {
                                    this.app = res;
                                    this.cdr.detectChanges();
                                    this.loadSecretList();
                                });
                        }

                        this.loadEndpointList(1);
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
    itemsPerPage = 15;
    maxSize = 5;
    startAt = 0;
    searchText: string = "";

    pageNumber: number = 1;
    entryPageNumber: number = 1;

    
    secretList: any[] = [];
    loadSecretList() {
        this.lambdaService.getSecretList(this.appId)
        .subscribe(res => {
            this.secretList = res;
            this.cdr.detectChanges();
        })
    }


    // this.loadEndpointList = loadEndpointList;
    loadEndpointList(pageNumber) {
        this.pageNumber = pageNumber;
        this.itemLoading = true;

        let params = {
            searchText: this.searchText,
            appId: this.appId,
            page: pageNumber - 1,
            size: this.itemsPerPage
        }
        this.endpointService.getEndpointList(params)
            .subscribe(res => {
                this.endpointList = res.content;
                this.endpointTotal = res.page?.totalElements;
                this.itemLoading = false;
                this.cdr.detectChanges();
            }, res => {
                this.itemLoading = false;
                this.cdr.detectChanges();
            })
    }

    // loadSharedList(pageNumber) {
    //     this.pageNumber = pageNumber;
    //     this.sharedLoading = true;

    //     let params = {
    //         searchText: this.searchText,
    //         page: pageNumber - 1,
    //         size: this.itemsPerPage
    //     }
    //     this.endpointService.getSharedEndpointList(params)
    //         .subscribe(res => {
    //             this.sharedList = res.content;
    //             this.sharedTotal = res.page?.totalElements;
    //             this.sharedLoading = false;
    //         }, res => this.sharedLoading = false)
    // }

    editCode: boolean;
    editEndpointData: any;
    editEndpoint(content, endpoint, isNew) {
        // console.log(endpoint);
        endpoint.content = this.br2nl(endpoint.content);
        this.editEndpointData = endpoint;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                data.content = this.nl2br(data.content);
                this.endpointService.save(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.loadEndpointList(this.pageNumber);
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
                        this.loadEndpointList(1);
                        delete this.endpoint;
                        this.toastService.show("Template successfully removed", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Template removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { });
    }

    params: string[];
    loadEndpoint(id) {
        this.endpointId = id;
        this.endpointService.getEndpoint(id)
            .subscribe(endpoint => {
                this.endpoint = endpoint;
                let g = endpoint.url.match(/\{(.[^{]+)\}/ig);
                this.params = [];
                g?.forEach(element => {
                    this.params.push(element.replace(/([{}\s]+)/ig, ''));
                });
                this.cdr.detectChanges();
            })

    }

    // showPrompt(url) {
    //     this.request = {};
    //     this.result = undefined;
    //     //const array = [...url.matchAll(/{(.+?)}\s*\)/ig)];
    //     // console.log(this.params);
    //     // this.params.forEach(e => {
    //     //     if (!this.request[e]) {
    //     //         this.request[e] = prompt("Enter value for parameter '" + e + "'");
    //     //     }
    //     // })
    // }

    request: any = {}
    result:any;
    error:any;

    endpointPromptTpl = viewChild('endpointPromptTpl');
    runEndpoint() {
        
        this.result = null;
        this.error = null;
        this.request = {};

        const run = (data) => {
            this.endpointService.runEndpoint(this.endpointId, this.request)
            .subscribe({
                next:(res)=>{
                    this.result = res;
                    this.cdr.detectChanges();
                },
                error: (error)=>{
                    this.error = error;
                    this.cdr.detectChanges();
                }
            })            
        }

        // this.showPrompt(this.endpoint.url);

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

    nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
    br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

    toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

    toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';
    itemExist = (f) => this.endpointList.filter(e => e.code == f.code).length > 0 && !f.id;

}
