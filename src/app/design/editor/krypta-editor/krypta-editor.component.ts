import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
// import { KryptaService } from '../../../service/krypta.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, JsonPipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { br2nl, toSnakeCase, toSpaceCase } from '../../../_shared/utils';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { JsonViewerComponent } from '../../../_shared/component/json-viewer/json-viewer.component';
import { ChangeDetectorRef } from '@angular/core';
import { KryptaService } from '../../../service/krypta.service';
import { LambdaService } from '../../../service/lambda.service';
import { CommService } from '../../../_shared/service/comm.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KryptaEditDialogService } from './krypta-edit-dialog.service';

@Component({
    selector: 'app-krypta-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './krypta-editor.component.html',
    styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css', './krypta-editor.component.scss'],
    imports: [FormsModule, FaIconComponent, JsonPipe, JsonViewerComponent]
})
export class KryptaEditorComponent implements OnInit {

    offline = false;
    app: any;

    loading: boolean;
    kryptaEntryTotal: any;
    kryptaEntryList: any;
    // sharedList: any;
    // sharedTotal: any;
    // sharedLoading: any;
    totalItems: any;
    krypta: any;
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
    private commService = inject(CommService);
    private editDialog = inject(KryptaEditDialogService);

    constructor() {
        this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
            if (change?.key === 'krypta-contract-created' && String(change.appId) === String(this.appId)) {
                this.contract = change.contract;
                this.loadContractList(this.pageNumber);
                this.cdr.markForCheck();
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
    contractList: any[] = [];

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
    editWallet(krypta) {
        this.editDialog.openWallet({ wallet: krypta, contracts: this.contractList, secrets: this.secretList })
            .then(data => {
                this.kryptaService.saveWallet(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.commService.emitChange({ key: 'krypta-wallet-list-changed', appId: this.appId });
                        this.commService.emitChange({ key: 'editor-search-refresh', category: 'kryptaWallet' });
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
                        this.commService.emitChange({ key: 'krypta-wallet-list-changed', appId: this.appId, page: 1 });
                        this.commService.emitChange({ key: 'editor-search-refresh', category: 'kryptaWallet' });
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
        this.kryptaService.getContract(id)
            .subscribe(contract => {
                this.contract = contract;
                this.cdr.markForCheck();
            })
    }



    editContract(contract) {
        this.editDialog.openContract(contract)
            .then(data => {
                this.kryptaService.saveContract(this.user.email, this.appId, data)
                    .subscribe(res => {
                        this.loadContractList(this.pageNumber);
                        this.commService.emitChange({ key: 'krypta-contract-list-changed', appId: this.appId });
                        this.commService.emitChange({ key: 'editor-search-refresh', category: 'kryptaContract' });
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
                        this.commService.emitChange({ key: 'krypta-contract-list-changed', appId: this.appId, page: 1 });
                        this.commService.emitChange({ key: 'editor-search-refresh', category: 'kryptaContract' });
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
        
        // this.result = null;
        // this.error = null;
        this.request[this.kryptaId] = {};

        this.rcfData = fn;

        this.modalService.open(tpl, { backdrop: 'static' })
        .result.then(data => {
            this.resultLoading.set(true);
            this.cdr.detectChanges();
            // this.cdr.detectChanges();
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
    br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

    toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

    toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';

}
