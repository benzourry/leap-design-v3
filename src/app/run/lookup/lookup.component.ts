import { Component, OnInit, input, model } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, Params } from '@angular/router';
// import { LookupService } from '../../service/lookup.service';
import { NgbDateAdapter, NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbInputDatepicker, NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, DatePipe, KeyValuePipe } from '@angular/common';
import { UtilityService } from '../../_shared/service/utility.service';
import { base, baseApi } from '../../_shared/constant.service';
import { ToastService } from '../../_shared/service/toast-service';
// import { RunService } from '../../service/run.service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../_component/page-title.component';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
// import { PageTitleComponent } from '../../_shared/component/page-title.component';
// import { HttpParams } from '@angular/common/http';

@Component({
    selector: 'app-lookup',
    templateUrl: './lookup.component.html',
    styleUrls: ['./lookup.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter }],
    imports: [PageTitleComponent, FaIconComponent, NgClass, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, FormsModule,
        NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem,
        NgbDropdownItem, NgbInputDatepicker, DatePipe, KeyValuePipe]
})
export class LookupComponent implements OnInit {

    offline = false;

    loading: boolean;
    lookupEntryTotal: any;
    lookupEntryList: any;
    totalItems: any;
    lookup: any;
    itemLoading: boolean;

    appId: number;
    user: any;
    // lookupId:number;
    lookupId = model<number>();
    data = { 'list': [] };
    pageSize = 45;
    currentPage = 1;
    itemsPerPage = 15;
    maxSize = 5;
    startAt = 0;
    searchText: string = "";
    base = base;

    // asComp = input<boolean>(false);
    hideTitle = input<boolean>(false);
  

    // searchTextEntry: string = "";

    pageNumber: number = 1;
    entryPageNumber: number = 1;
    lookupEntryPages: number = 1;
    lookupEntryElements:number = 0;

    constructor(private userService: UserService, private route: ActivatedRoute, private lookupService: LookupService,
        public runService: RunService,
        private modalService: NgbModal, private toastService: ToastService,
        private location: PlatformLocation, private utilityService: UtilityService) {
        location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);
    }

    ngOnInit() {
        this.userService.getUser()
        .subscribe((user) => {
            this.user = user;

            if (this.lookupId()) {
                this.loadLookup(this.lookupId());        
            } else {
                this.route.params
                .subscribe((params: Params) => {
                    const id = +params['lookupId'];
                    this.lookupId.set(id)
                    if (id) {
                        this.loadLookup(id);
                    }
                })
            }
        });
    }


    editLookupEntryData: any;
    editLookupEntryDataFields: any[];
    editLookupEntryDataFieldsOrphan: any;
    editLookupEntry(content, lookupEntry, isNew) {
        if (this.lookup.dataEnabled) {
            if (!lookupEntry.data) {
                lookupEntry.data = {}
            }
            this.editLookupEntryDataFields = this.fieldsAsList(this.lookup.dataFields);
            this.editLookupEntryDataFieldsOrphan = this.fieldsExistOrphan(lookupEntry.data);
        }
        this.editLookupEntryData = lookupEntry;
        // if (lookup.data){
        //     this.editLookupEntryData.data = JSON.stringify(lookup.data);
        // }

        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                // if (data.data){
                //     data.data = JSON.parse(data.data);
                // }
                this.lookupService.saveEntry(this.lookupId(), data)
                    .subscribe({
                        next: (res) => {
                            if (isNew) {
                                this.lookupEntryList.push(res);
                            } else {
                                Object.assign(lookupEntry, res);
                            }
                            this.toastService.show("Lookup entry successfully saved", { classname: 'bg-success text-light' });
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

    fieldsAsList = (str: string) => {
        var rval = [];
        var arr = str ? str.split(',') : [];
        arr.forEach(r => {
            var h = r.split("@");
            let g = h[0].split(":");
            rval.push({
                key: g[0].trim(),
                type: g.length > 1 ? g[1].trim() : 'text',
                opts: g.length > 2 && g[1].trim() == 'options' ? g[2].split('|') : []
            });
        })
        return rval;
    }

    fieldsExistOrphan = (data) => {
        var hhh = Object.assign({}, data);
        this.editLookupEntryDataFields.forEach(el => {
            delete hhh[el.key];
        });
        return hhh;
    }
    
    deleteDataRow = (obj, key) => delete obj[key];
    // asls=()=>0;
    // trackByFn=(item)=>item;

    removeLookupEntryData: any;
    removeLookupEntry(content, obj) {
        this.removeLookupEntryData = obj;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.removeEntry(obj.id, data)
                    .subscribe({
                        next: (res) => {
                            this.loadLookup(this.lookupId());
                        }, error: (err) => {
                            this.toastService.show("Lookup entry removal failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { });
    }

    hasLoadList:boolean=false;

    userUnauthorized:boolean=false;
    lookupDataFields = [];
    mapDataFields = {};
    loadLookup(id:number) {
        // this.lookupId = id;
        this.lookupService.getLookup(id)
            .subscribe(lookup => {
                this.lookup = lookup;

                // check permission
                let intercept = this.lookup.accessList?.filter(v => Object.keys(this.user.groups).includes(v + ""));
                // console.log('accessList:'+ this.lookup.accessList);
                // console.log('user groups:'+ Object.keys(this.user.groups));
                if (this.lookup.accessList?.length > 0 && intercept.length == 0) {
                  // && !this.app?.id, removed this condition because it always has value. Previously from route :appId to force authorize when run in designer
                  this.userUnauthorized = true;
                }                
                
                if (this.lookup.dataEnabled) {
                    this.lookupDataFields = this.fieldsAsList(this.lookup.dataFields);
                    this.mapDataFields = this.fieldsAsMap(this.lookup.dataFields);
                }
                this.hasLoadList = false;
                if (lookup.sourceType=='db'){
                    this.getLookupEntryList(this.entryPageNumber);
                }  


      
      
            })

    }

    getLookupEntryList(pageNumber) {
        this.loading = true;
        this.entryPageNumber = pageNumber;
        let params:any = {
            page: pageNumber - 1,
            size: this.pageSize,
            searchText: this.searchText
        }
        if (this.lookup?.sourceType=='db'){
            params.sort='ordering,asc';
        }

        this.lookupService.getEntryListFull(this.lookupId(), params)
            .subscribe(response => {
                this.loading = false;
                this.lookupEntryTotal = response.page?.totalElements;
                this.lookupEntryPages = response.page?.totalPages;
                this.lookupEntryElements = response.content?.length;
                this.lookupEntryList = response.content;
                this.hasLoadList=true;
            });
    }

    reorderItem(index, op) {
        this.reorder(this.lookupEntryList, index, op);
        this.saveItemOrder();
    }

    saveItemOrder() {
        var list = this.lookupEntryList
            .map((val, $index) => {
                return { id: val.id, sortOrder: $index + ((this.entryPageNumber - 1) * this.pageSize) }
            });
        return this.runService.saveLookupOrder(list)
            .subscribe(res => {
                return res;
            });
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
        setTimeout(() => {
            items[index + op].altClass = 'swapEnd';
            items[index].altClass = 'swapEnd';
        }, 500);
    }

    uploadFile($event, data, key) {
        if ($event.target.files && $event.target.files.length) {
            this.lookupService.uploadFile(this.lookup.id, $event.target.files[0])
                .subscribe({
                    next: (res) => {
                        data[key]= res.fileUrl;
                        this.toastService.show("File uploaded", { classname: 'bg-success text-light' });
                    }, error: (error) => {}
                })
        }
    }

    syncLookupData:any = {}
    resyncLookup(content, lookupId) {
        // this.syncLookupData = this.lookup;
        if (this.lookup.sourceType=='db'){
            this.syncLookupData.refCol = 'id';
        }else{
            this.syncLookupData.refCol = 'code';
        }
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.updateLookupData(lookupId,this.syncLookupData.refCol)
                    .subscribe({
                        next: (res) => {
                            this.toastService.show("Lookup successfully sync", { classname: 'bg-success text-light' });
                        },
                        error: (err) => {
                            this.toastService.show("Lookup sync failed", { classname: 'bg-danger text-light' });
                        }
                    })
            })

    }

    getUrl(pre, path) {
        return baseApi + pre + encodeURIComponent(path); // encoded slash is not permitted py apache noSlash error.
      }

}
