import { ChangeDetectionStrategy, Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink, Router } from '@angular/router';
// import { KryptaService } from '../../../service/krypta.service';
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
import { KryptaService } from '../../../service/krypta.service';
import { NgCmComponent } from '../../../_shared/component/ng-cm/ng-cm.component';
import { LambdaService } from '../../../service/lambda.service';

@Component({
    selector: 'app-krypta-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './krypta-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './krypta-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLinkActive, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, NgCmComponent,
        NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FilterPipe, JsonPipe, JsonViewerComponent]
})
export class KryptaEditorComponent implements OnInit {

    offline = false;
    app: any;

    kryptaTotal: any;
    loading: boolean;
    kryptaList: any;
    kryptaEntryTotal: any;
    kryptaEntryList: any;
    // sharedList: any;
    // sharedTotal: any;
    // sharedLoading: any;
    totalItems: any;
    krypta: any;
    itemLoading = signal<boolean>(false);
    appId: number;
    resultType:string = 'text';

    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private kryptaService = inject(KryptaService);
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
                            this.appService.getApp(this.appId, params)
                                .subscribe(res => {
                                    this.app = res;
                                    this.cdr.detectChanges();
                                });
                        }

                        this.loadWalletList(1);
                        this.loadContractList(1);
                        this.loadSecretList();
                        // this.loadSharedList(1);
                    });



                this.route.queryParams
                    .subscribe((params: Params) => {
                        const id = params['id'];
                        if (id) {
                            this.loadWallet(id);
                        }
                        const contractId = params['contractId'];
                        if (contractId){
                            this.loadContract(contractId);
                        }
                    })
            });
    }

    user: any;
    kryptaId = '';
    // data = { 'list': [] };
    pageSize = 45;
    currentPage = 1;
    itemsPerPage = 15;
    maxSize = 5;
    startAt = 0;
    searchText: string = "";

    pageNumber: number = 1;
    entryPageNumber: number = 1;


    // this.loadWalletList = loadWalletList;
    loadWalletList(pageNumber) {
        this.pageNumber = pageNumber;
        this.itemLoading.set(true);

        let params = {
            searchText: this.searchText,
            appId: this.appId,
            page: pageNumber - 1,
            size: this.itemsPerPage
        }
        this.kryptaService.getWalletList(params)
            .subscribe(res => {
                this.kryptaList = res.content;
                this.kryptaTotal = res.page?.totalElements;
                this.itemLoading.set(false);
                this.cdr.detectChanges();
            }, res => {
                this.itemLoading.set(false);
                this.cdr.detectChanges();
            })
    }

    
    secretList: any[] = [];
    loadSecretList() {
        this.lambdaService.getSecretList(this.appId)
        .subscribe(res => {
            this.secretList = res;
            this.cdr.detectChanges();
        })
    }


    contractTotal: number;
    contractLoading = signal<boolean>(false);
    contractList: any[];

   loadContractList(pageNumber) {
        this.pageNumber = pageNumber;
        this.contractLoading.set(true);

        let params = {
            searchText: this.searchText,
            appId: this.appId,
            page: pageNumber - 1,
            size: this.itemsPerPage
        }
        this.kryptaService.getContractList(params)
            .subscribe(res => {
                this.contractList = res.content;
                this.contractTotal = res.page?.totalElements;
                this.contractLoading.set(false);
                this.cdr.detectChanges();
            }, res => {
                this.contractLoading.set(false);
                this.cdr.detectChanges();
            })
    }

    editCode: boolean;
    editWalletData: any;
    editWallet(content, krypta, isNew) {

        this.editWalletData = krypta;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                data.content = this.nl2br(data.content);
                this.kryptaService.saveWallet(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.loadWalletList(this.pageNumber);
                        this.loadWallet(res.id);
                        this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
                        this.toastService.show("Wallet successfully saved", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Wallet saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { })
    }

    removeWalletData: any;
    removeWallet(content, krypta) {
        this.removeWalletData = krypta;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.kryptaService.deleteWallet(krypta.id, data)
                    .subscribe(res => {
                        this.loadWalletList(1);
                        delete this.krypta;
                        this.toastService.show("Template successfully removed", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Template removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { });
    }

    params: string[];
    loadWallet(id) {
        this.contract = null;
        this.kryptaId = id;
        // this.cdr.markForCheck();
        // this.cdr.detectChanges();
        this.kryptaService.getWallet(id)
            .subscribe(krypta => {
                this.krypta = krypta;
                this.contract = krypta.contract;
                this.cdr.markForCheck();
            })

    }

    
    contract:any;
    loadContract(id) {
        this.krypta=null;
        this.cdr.markForCheck(); 
        console.log("Loading contract", id);
        this.kryptaService.getContract(id)
            .subscribe(contract => {
                console.log("Contract loaded", id);
                this.contract = contract;
                this.cdr.markForCheck();
                // setTimeout(()=>{    
                //     this.cdr.detectChanges();
                // });
            })
    }



    editContractData: any;
    editContract(content, contract, isNew) {
        this.editContractData = contract;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(data => {
                this.kryptaService.saveContract(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.loadContractList(this.pageNumber);
                        this.contract = res;
                        this.toastService.show("Contract successfully saved", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Contract saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { })
    }

    removeContractData: any;
    removeContract(content, contract) {
        this.removeContractData = contract;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.kryptaService.deleteContract(contract.id, data)
                    .subscribe(res => {
                        this.loadContractList(1);
                        this.contract = null;
                        this.toastService.show("Contract successfully removed", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, res => {
                        this.toastService.show("Contract removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    });
            }, res => { });
    }

    compileError = new Map<number, string>();
    compileLoading = new Map<number, boolean>();
    compileContract(contractId:number){
        if (confirm("Are you sure to compile the smart contract? Previous ABI and Bytecode will be overwritten.")){
            this.compileLoading.set(contractId,true);
            this.cdr.detectChanges();
            this.kryptaService.compileContract(contractId)
            .subscribe({
                next:(res)=>{
                    this.toastService.show("Contract compiled successfully", { classname: 'bg-success text-light' });
                    this.editContractData = res;
                    this.contract = res;
                    this.compileError.delete(contractId);
                    this.compileLoading.set(contractId, false);
                    this.cdr.detectChanges();
                },
                error: (error)=>{
                    // console.log("Compilation error", error);
                    this.compileError.set(contractId,error.error);
                    this.toastService.show("Contract compilation failed", { classname: 'bg-danger text-light' });
                    this.compileLoading.set(contractId, false);
                    this.cdr.detectChanges();
                }
            })
        }
    }
    

    request: any = {}
    result:any={};
    error:any={};
    resultLoading=signal<boolean>(false);
    rcfData:any;
    runContractFn(tpl, fn) {
        this.resultLoading.set(true);
        this.cdr.detectChanges();
        
        // this.result = null;
        // this.error = null;
        this.request[this.kryptaId] = {};

        this.rcfData = fn;

        this.modalService.open(tpl, { backdrop: 'static' })
        .result.then(data => {
            this.cdr.detectChanges();
            this.kryptaService.runFn(+this.kryptaId, fn.name, data)
            .subscribe({
                next:(res)=>{
                    this.resultLoading.set(false);
                    this.result[this.kryptaId] = res;
                    this.cdr.detectChanges();
                },
                error: (error)=>{
                    this.resultLoading.set(false);
                    this.error[this.kryptaId] = error;
                    this.cdr.detectChanges();
                }
            })  
        }, res=>{});
    }

    logsEvent(eventName) {
        this.resultLoading.set(true);
        this.kryptaService.logs(+this.kryptaId, eventName)
        .subscribe({
            next:(res)=>{
                this.resultLoading.set(false);
                this.result[this.kryptaId] = res;
                this.cdr.detectChanges();
            },
            error: (error)=>{
                this.resultLoading.set(false);
                this.error[this.kryptaId] = error;
                this.cdr.detectChanges();
            }
        })
    }

    compareByIdFn(a, b): boolean {
        return (a && a.id) === (b && b.id);
    }


    verifyHash() {
        let txHash = prompt("Enter transaction hash");    
        if (txHash){            
            this.resultLoading.set(true);

            this.result[this.kryptaId] = null;
            this.error[this.kryptaId] = null;
            
            this.kryptaService.verifyHash(this.kryptaId, {txHash: txHash})
            .subscribe({
                next:(res)=>{
                    this.resultLoading.set(false);
                    this.result[this.kryptaId] = res;
                    this.cdr.detectChanges();
                },
                error: (error)=>{
                    this.resultLoading.set(false);
                    this.error[this.kryptaId] = error;
                    this.cdr.detectChanges();
                }
            })  
        }    
    }


    deployError = new Map<number, string>();
    deployLoading = new Map<number, boolean>();
    deployContract(){
        this.deployLoading.set(+this.kryptaId,true);
        this.cdr.detectChanges();
        this.kryptaService.deployContract(+this.kryptaId)
        .subscribe({
            next:(res)=>{
                this.krypta = res;
                this.contract = res.contract;
                this.toastService.show("Contract initialized successfully", { classname: 'bg-success text-light' });
                this.deployLoading.set(+this.kryptaId, false);
                this.deployError.delete(+this.kryptaId);
                this.cdr.detectChanges();
            },
            error: (error)=>{
                this.toastService.show("Contract initialization failed", { classname: 'bg-danger text-light' });
                this.deployLoading.set(+this.kryptaId, false);
                this.deployError.set(+this.kryptaId,error.error);
                this.cdr.detectChanges();
            }
        })
    }
    nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
    br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

    toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

    toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';
    itemExist = (f) => this.kryptaList.filter(e => e.code == f.code).length > 0 && !f.id;

}
