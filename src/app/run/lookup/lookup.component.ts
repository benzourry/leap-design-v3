// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { ChangeDetectorRef, Component, OnInit, computed, inject, input, model, signal, viewChild, DestroyRef, effect } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbDateAdapter, NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbInputDatepicker, NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, DatePipe, KeyValuePipe } from '@angular/common';
import { UtilityService } from '../../_shared/service/utility.service';
import { base, baseApi } from '../../_shared/constant.service';
import { ToastService } from '../../_shared/service/toast-service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../_component/page-title.component';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { NgSelectComponent } from '@ng-select/ng-select';

@Component({
    selector: 'app-lookup',
    templateUrl: './lookup.component.html',
    styleUrls: ['./lookup.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter }],
    imports: [PageTitleComponent, FaIconComponent, NgClass, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FormsModule,
        NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgSelectComponent,
        NgbDropdownItem, NgbInputDatepicker, DatePipe, KeyValuePipe]
})
export class LookupComponent implements OnInit {

    offline = signal<boolean>(false);

    loading = signal<boolean>(false);
    lookupEntryTotal = signal<number>(0);
    lookupEntryList = signal<any[]>([]);
    lookup = signal<any>({});
    entryPageNumber = signal<number>(1);
    lookupEntryPages = signal<number>(0);
    lookupEntryElements = signal<number>(0);

    appId: number;
    user = computed<any>(() => this.runService.$user());

    app = computed(() => this.runService.$app());

    lang = computed(() => this.app().x?.lang);
    
    lookupId = model<number>();
    
    pageSize = 45;
    
    searchText: string = "";
    base = base;

    hideTitle = input<boolean>(false);
  

    private route = inject(ActivatedRoute)
    private lookupService = inject(LookupService)
    public runService = inject(RunService)
    private modalService = inject(NgbModal)
    private toastService = inject(ToastService)
    private location = inject(PlatformLocation)
    private utilityService = inject(UtilityService)
    private cdr = inject(ChangeDetectorRef);
    private destroyRef = inject(DestroyRef); // Inject for subscription cleanup

    constructor() {
        this.location.onPopState(() => this.modalService.dismissAll(''));
        
        this.utilityService.testOnline$()
            .pipe(takeUntilDestroyed())
            .subscribe(online => this.offline.set(!online));
            
        // Use effect to reactively watch the lookupId model input if it changes
        effect(() => {
            const currentId = this.lookupId();
            if (currentId) {
                this.loadLookup(currentId);
            }
        });
    }

    ngOnInit() {
        // Fallback to listening for route parameters if lookupId is not provided
        this.route.params
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params: Params) => {
                const id = +params['lookupId'];
                if (id && this.lookupId() !== id) {
                    this.lookupId.set(id);
                }
            });
    }


    _lookupEntry:any = {};
    lookupEntryFields: any[];
    lookupEntryFieldsOrphan: any;
    // editLookupEntryDataFieldsOrphan = signal<any>({});
    editLookupEntry(content, lookupEntry, isNew) {
        if (this.lookup().dataEnabled) {
            if (!lookupEntry.data) {
                lookupEntry.data = {}
            }
            this.lookupEntryFields = this.fieldsAsList(this.lookup().dataFields);
            // this.editLookupEntryDataFields = this.fieldsAsList(this.lookup().dataFields));
            this.lookupEntryFieldsOrphan = this.fieldsExistOrphan(lookupEntry.data);
            // this.editLookupEntryDataFieldsOrphan.set(this.fieldsExistOrphan(lookupEntry.data));
        }
        this._lookupEntry = lookupEntry;

        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.saveEntry(this.lookupId(), data)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            if (isNew) {
                                this.lookupEntryList.update(curr=>[...curr,res]);
                            } else {
                                Object.assign(lookupEntry, res);
                            }
                            this.toastService.show("Lookup entry successfully saved", { classname: 'bg-success text-light' });
                            this.findDuplicateCode();
                        }, error: (err) => {
                            this.toastService.show("Lookup entry saving failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { })
    }
    isNumber = (val) => typeof val === 'number';
    
    fieldsAsMap = (str: string) => {
        var rval = {};
        var arr = str ? str.split(',') : [];
        
        arr.forEach(r => {
            var h = r.split("@");
            let g = h[0].split(":");
            rval[g[0].trim()]=g.length > 1 ? g[1].trim() : 'text';
        })
        return rval;
    }

    lookupListMap = signal<any>({});

    fieldsAsList = (str: string) => {
        var rval = [];
        var arr = str ? str.split(',') : [];

        let lookupListMap = {}
        arr.forEach(r => {
            var h = r.split("@");
            let g = h[0].split(":");

            const type = g[1]?.trim();
            const isLookupType = ['lookup', 'multiplelookup'].includes(type);

            if (g.length > 2 && isLookupType){
                let lookupId = +g[2].trim();
                this.lookupService.getEntryList(lookupId, {size:9999})
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: (res) => {            
                        this.lookupListMap[lookupId] = res.content;
                        this.cdr.detectChanges();
                    }, error: (error) => {}
                })
            }
              
            rval.push({
                key: g[0].trim(),
                type: g.length > 1 ? type: 'text',
                opts: g.length > 2 && type == 'options' ? g[2].split('|') :
                      g.length > 2 && isLookupType ? +g[2].trim() : []
            });
        })
        this.lookupListMap.set(lookupListMap);
        return rval;
    }

    fieldsExistOrphan = (data) => {
        var hhh = Object.assign({}, data);
        this.lookupEntryFields.forEach(el => {
            delete hhh[el.key];
        });
        return hhh;
    }
    
    deleteDataRow = (obj, key) => delete obj[key];

    removeLookupEntryData: any;
    removeLookupEntry(content, obj) {
        this.removeLookupEntryData = obj;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.removeEntry(obj.id, data)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.loadLookup(this.lookupId());
                            this.toastService.show("Lookup entry successfully removed", { classname: 'bg-success text-light' });
                            this.findDuplicateCode();
                        }, error: (err) => {
                            this.toastService.show("Lookup entry removal failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { });
    }

    hasLoadList = signal<boolean>(false);

    // userUnauthorized = signal<boolean>(false);
    userUnauthorized = computed(() => {
        const accessList = this.lookup().accessList;
        const userGroups = Object.keys(this.user()?.groups||{});
        
        if (accessList?.length > 0) {
          const intercept = accessList.filter((v) => userGroups.includes(v + ""));
          return intercept.length === 0; // Unauthorized if no matching groups
        }      
        return false; // Default to false if accessList is empty or undefined
    });

    // lookupDataFields = [];
    lookupDataFields = computed(()=>this.lookup().dataEnabled ? this.fieldsAsList(this.lookup().dataFields) : []);
    // mapDataFields = {};
    mapDataFields = computed(()=>this.lookup().dataEnabled ? this.fieldsAsMap(this.lookup().dataFields) : {});
    
    requestParams = signal<any>({});
    params = signal<string[]>([]);
    
    loadLookup(id:number) {
        // this.lookupId = id;
        this.lookupService.getLookup(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(lookup => {
                this.requestParams.set({});
                this.lookup.set(lookup);

                if (lookup.sourceType == 'rest') {
                    let g = lookup.endpoint?.match(/\{(.[^{]+)\}/ig);
                    const paramsList: string[] = [];
                    g?.forEach(element => {
                        if (!element.includes('_secret')){
                            paramsList.push(element.replace(/([{}\s]+)/ig, ''));
                        }
                    });
                    this.params.set(paramsList);
                    this.hasLoadList.set(false);
                }

                this.hasLoadList.set(false);
                if (lookup.sourceType=='db'){
                    this.getLookupEntryList(this.entryPageNumber());
                }       
        
            })

    }

    endpointPromptTpl = viewChild('endpointPromptTpl');
    
    getLookupEntryList(pageNumber) {
        this.loading.set(true);
        this.entryPageNumber.set(pageNumber);
        let params:any = {
            page: pageNumber - 1,
            size: this.pageSize,
            searchText: this.searchText
        }

        const run = (p)=>{
            this.lookupService.getEntryListFull(this.lookupId(), p)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.loading.set(false);
                    this.lookupEntryTotal.set(response.page?.totalElements);
                    this.lookupEntryPages.set(response.page?.totalPages);
                    this.lookupEntryElements.set(response.content?.length);
                    this.lookupEntryList.set(response.content);
                    this.hasLoadList.set(true);
                    this.findDuplicateCode();
                }, error: (err) => {
                    this.loading.set(false);
                    this.hasLoadList.set(true);
                }
            });
        }
        if (this.lookup()?.sourceType=='db'){
            params.sort='ordering,asc';
            run(params);
        }else if(this.lookup()?.sourceType == 'rest') {
            if (this.params()?.length > 0){
                this.modalService.open(this.endpointPromptTpl(), { backdrop: 'static' })
                .result.then(data => {
                    run(data);
                }).catch(err => {
                    this.loading.set(false);
                });
            }else{
                run({});
            }
        }


    }

    duplicatedCodes: string[] = [];
    findDuplicateCode(){
        const contentArray = this.lookupEntryList();
        const seenCodes = new Set();
        const duplicateEntries = contentArray.filter(item => {
            // If the Set already has the code, it's a duplicate
            if (seenCodes.has(item.code)) {
                return true; 
            }
            // Otherwise, add it to our tracking Set
            seenCodes.add(item.code);
            return false;
        });
        this.duplicatedCodes = duplicateEntries;
        this.cdr.markForCheck();
    }

    reorderItem(index, op) {
        this.lookupEntryList.set(this.reorder(this.lookupEntryList(), index, op));

        // Trigger the swapEnd class change after a delay
        setTimeout(() => {
            this.lookupEntryList.update((currentList) => {
            const updatedList = [...currentList];
            updatedList[index + op].altClass = 'swapEnd';
            updatedList[index].altClass = 'swapEnd';
            return updatedList;
            });
        }, 500);
        this.saveItemOrder();
    }

    reorder(items, index, op) {
        items[index + op].altClass = 'swapStart';
        items[index].altClass = 'swapStart';

        items.forEach((i, $index) => {
            i.sortOrder = $index;
        }); // ensure current sortorder using index, to prevent jumping ordering

        var temp = items[index + op];
        var tempSortOrder = items[index + op].sortOrder;
        items[index + op].sortOrder = items[index].sortOrder;
        items[index + op] = items[index];

        items[index].sortOrder = tempSortOrder;
        items[index] = temp;
        return items;
    }

    saveItemOrder() {
        var list = this.lookupEntryList()
            .map((val, $index) => {
                return { id: val.id, sortOrder: $index + ((this.entryPageNumber() - 1) * this.pageSize) }
            });
            
        this.runService.saveLookupOrder(list)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }



    uploadFile($event, data, key) {
        if ($event.target.files && $event.target.files.length) {
            this.lookupService.uploadFile(this.lookup().id, $event.target.files[0])
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (res) => {
                        data[key]= res.fileUrl;
                        this.toastService.show("File uploaded", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, error: (error) => {}
                })
        }
    }

    syncLookupData:any = {}
    resyncLookup(content, lookupId) {
        if (this.lookup().sourceType=='db'){
            this.syncLookupData.refCol = 'id';
        }else{
            this.syncLookupData.refCol = 'code';
        }
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.updateLookupData(lookupId,this.syncLookupData.refCol, this.requestParams())
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.toastService.show("Lookup successfully sync", { classname: 'bg-success text-light' });
                            this.cdr.markForCheck();
                        },
                        error: (err) => {
                            this.toastService.show("Lookup sync failed", { classname: 'bg-danger text-light' });
                            this.cdr.markForCheck();
                        }
                    })
            })

    }

    getUrl(pre, path) {
        return baseApi + pre + encodeURIComponent(path); // encoded slash is not permitted py apache noSlash error.
    }

    compareByCodeFn = (a, b): boolean => (a && a.code) === (b && b.code);

}