import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink, Router } from '@angular/router';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, DatePipe, KeyValuePipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { GroupService } from '../../../service/group.service';
import { baseApi, base } from '../../../_shared/constant.service';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { EditLookupComponent } from '../../../_shared/modal/edit-lookup/edit-lookup.component';
import { LookupService } from '../../../run/_service/lookup.service';
import { RunService } from '../../../run/_service/run.service';
import { EditLookupEntryComponent } from '../../../_shared/modal/edit-lookup-entry/edit-lookup-entry.component';

@Component({
    selector: 'app-lookup-editor',
    templateUrl: './lookup-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css',
        './lookup-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLinkActive, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem,
        NgbDropdownItem, NgClass, FilterPipe, DatePipe, KeyValuePipe, EditLookupComponent, EditLookupEntryComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupEditorComponent implements OnInit {

    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private lookupService = inject(LookupService);
    private modalService = inject(NgbModal);
    private groupService = inject(GroupService);
    private appService = inject(AppService);
    private runService = inject(RunService);
    private toastService = inject(ToastService);
    private router = inject(Router);
    private location = inject(PlatformLocation);
    private utilityService = inject(UtilityService);
    private cdr = inject(ChangeDetectorRef);

    offline = false;
    app: any;
    lookupTotal: any;
    loading: boolean;
    lookupList: any;
    lookupEntryTotal: any;
    lookupEntryList: any;
    lookupEntryPages: any;
    lookupEntryElements: any;
    totalItems: any;
    lookup: any;
    itemLoading: boolean;
    baseApi = baseApi;
    base = base;

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
                            let params = { email: user.email }

                            this.appService.getApp(this.appId, params)
                                .subscribe(res => {
                                    this.app = res;
                                    this.getAccessList();
                                    this.cdr.detectChanges();
                                });
                        }
                        this.loadLookupList(1);
                    });

                this.route.queryParams
                    .subscribe((params: Params) => {
                        const id = params['id'];
                        if (id) {
                            this.loadLookup(id);
                        }
                    })
            });
    }

    appId: number;
    user: any;
    lookupId:number;
    data = { 'list': [] };
    pageSize = 45; // lookup entry list
    // currentPage = 1;
    itemsPerPage = 15; //lookup list
    // maxSize = 5;
    // startAt = 0;
    searchText: string = "";
    searchTextEntry: string = "";

    pageNumber: number = 1;
    entryPageNumber: number = 1;

    accessList: any[] = [];
    getAccessList() {
        this.groupService.getGroupList({ appId: this.app.id, size: 999 })
            .subscribe(res => {
                this.accessList = res.content;
                this.cdr.detectChanges();
            });
    }

    // this.loadLookupList = loadLookupList;
    loadLookupList(pageNumber) {
        this.itemLoading = true;
        this.pageNumber = pageNumber;

        let params = {
            searchText: this.searchText,
            appId: this.appId,
            page: pageNumber - 1,
            size: this.itemsPerPage
        }
        this.lookupService.getLookupList(params)
            .subscribe({
                next: (res) => {
                    this.lookupList = res.content;
                    this.lookupTotal = res.page?.totalElements;
                    this.itemLoading = false;
                    this.cdr.detectChanges();
                }, error: (err) => {
                    this.itemLoading = false;
                    this.cdr.detectChanges();
                }
            })
    }

    editLookupData: any;
    editLookup(content, lookup, isNew) {
        this.editLookupData = lookup;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.save(this.user.email, this.appId, data)
                    .subscribe({
                        next: (res) => {
                            this.loadLookupList(this.pageNumber);
                            this.loadLookup(res.id);
                            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
                            this.toastService.show("Lookup successfully saved", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges();
                        }, error: (err) => {
                            this.toastService.show("Lookup saving failed", { classname: 'bg-danger text-light' });
                            this.cdr.detectChanges();
                        }
                    })
            }, res => { })
    }

    removeLookupData: any;
    removeLookup(content, lookup) {
        this.removeLookupData = lookup;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.deleteLookup(lookup.id, data)
                    .subscribe({
                        next: (res) => {
                            this.loadLookupList(1);
                            delete this.lookup;
                            this.toastService.show("Lookup successfully removed", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges();
                        }, error: (err) => {
                            this.toastService.show("Lookup removal failed", { classname: 'bg-danger text-light' });
                            this.cdr.detectChanges();
                        }
                    })
            }, res => { });
    }

    editLookupEntryData: any;
    editLookupEntry(content, lookupEntry, isNew) {
        
        this.editLookupEntryData = lookupEntry;

        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                // if (data.data){
                //     data.data = JSON.parse(data.data);
                // }
                if (this.lookup.x?.codeHidden){
                    data.code = data.name
                }
                this.lookupService.saveEntry(this.lookupId, data)
                    .subscribe({
                        next: (res) => {
                            if (isNew) {
                                this.lookupEntryList.push(res);
                            } else {
                                Object.assign(lookupEntry, res);
                            }
                            this.toastService.show("Entry successfully saved", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges();
                        }, error: (err) => {
                            this.toastService.show("Entry saving failed", { classname: 'bg-danger text-light' });
                            this.cdr.detectChanges();
                        }
                    })
            }, res => { })
    }
    // isNumber = (val) => typeof val === 'number';
    // fieldsAsList = (str: string) => {
    //     var rval = [];
    //     var arr = str ? str.split(',') : [];
    //     arr.forEach(r => {
    //         var h = r.split("@");
    //         let g = h[0].split(":");
    //         rval.push({
    //             key: g[0].trim(),
    //             type: g.length > 1 ? g[1].trim() : 'text',
    //             opts: g.length > 2 && g[1].trim() == 'options' ? g[2].split('|') : []
    //         });
    //     })
    //     return rval;
    // }
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
    // fieldsExistOrphan = (data) => {
    //     var hhh = Object.assign({}, data);
    //     this.editLookupEntryDataFields.forEach(el => {
    //         delete hhh[el.key];
    //     });
    //     return hhh;
    // }
    // changeKey(obj,prevKey, newKey) {
    //     const value = obj[prevKey];
    //     delete obj[prevKey];
    //     obj[newKey] = value;
    //   }
    // addDataRow=(obj)=>obj?obj[""]="":obj=[{'':''}];
    // deleteDataRow = (obj, key) => delete obj[key];
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
                        next: res => {
                            this.loadLookup(this.lookupId);
                            this.toastService.show("Entry successfully removed", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges();
                        }, error: err => {
                            this.toastService.show("Entry removal failed", { classname: 'bg-danger text-light' });
                            this.cdr.detectChanges();
                        }
                    })
            }, res => { });
    }

    clearEntries() {
        if (prompt("Are you sure you want to permanently delete entries of this lookup?\n Type 'clear lookup entries' and press OK to proceed") == 'clear lookup entries') {
            this.lookupService.clearEntries(this.lookup.id)
                .subscribe({
                    next: res => {
                        this.loadLookup(this.lookupId);
                        this.toastService.show("Lookup entry cleared", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, error: err => {
                        this.toastService.show("Entry removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges();
                    }
                });
        }
    }

    request: any = {}
    showPrompt(script) {
        this.request = {};
        const array = [...script.matchAll(/{(.+?)}/ig)];
        array.forEach(e => {
            if (!this.request[e[1]]) {
                this.request[e[1]] = prompt("Enter value for parameter '" + e[1] + "'");
            }
        })
    }

    hasLoadList: boolean = false;

    lookupDataFields = [];
    mapDataFields = {};
    loadLookup(id) {
        this.lookupId = id;
        this.lookupService.getLookup(id)
            .subscribe(lookup => {
                this.lookup = lookup;

                if (this.lookup.dataEnabled) {
                //     this.lookupDataFields = this.fieldsAsList(this.lookup.dataFields);
                    this.mapDataFields = this.fieldsAsMap(this.lookup.dataFields);
                }
                // this.lookupEntryTotal = 0;
                // this.lookupEntryList = [];
                this.hasLoadList = false;
                if (lookup.sourceType == 'db') {
                    this.getLookupEntryList(this.entryPageNumber);
                }
                this.cdr.detectChanges();
            })

    }

    getLookupEntryList(pageNumber) {
        this.loading = true;
        this.entryPageNumber = pageNumber;
        let params: any = {
            page: pageNumber - 1,
            size: this.pageSize,
            searchText: this.searchTextEntry
            // sort: 'id,asc'
        }

        if (this.lookup?.sourceType == 'db') {
            params.sort = 'ordering,asc';
        }
        // new HttpParams()
        //     .append('page', (pageNumber - 1).toString())
        //     .append('size', this.pageSize.toString())
        //     .append('searchText', this.searchText)
        //     .append('docFlag', '2')

        if (this.lookup?.sourceType == 'rest') {
            this.showPrompt(this.lookup.endpoint);
            params = Object.assign(params, this.request);
        }

        this.lookupService.getEntryListFull(this.lookupId, params)
            .subscribe(response => {
                this.loading = false;
                this.lookupEntryPages = response.page?.totalPages;
                this.lookupEntryElements = response.content?.length;

                this.lookupEntryTotal = response.page?.totalElements;
                this.lookupEntryList = response.content;
                this.hasLoadList = true;
                this.cdr.detectChanges();
            });
    }


    importExcelData: any;
    importExcel(content) {
        this.importExcelData = null;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {

            }, res => { })
    }

    file: any;
    importLoading: boolean = false;
    uploadExcel($event) {
        if ($event.target.files && $event.target.files.length) {
            this.importLoading = true;
            this.lookupService.uploadExcel(this.lookup.id, $event.target.files[0])
                .subscribe({
                    next: (res) => {
                        this.importExcelData = res;
                        this.importLoading = false;
                        this.loadLookup(this.lookup.id);
                        this.toastService.show("Excel successfully imported", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges();
                    }, error: (error) => {
                        this.importExcelData = {
                            success: false,
                            message: error.message
                        }
                        this.importLoading = false;
                        this.cdr.detectChanges();
                    }
                })
        }

    }

    // uploadFile($event, data, key) {
    //     if ($event.target.files && $event.target.files.length) {
    //         this.lookupService.uploadFile(this.lookup.id, $event.target.files[0])
    //             .subscribe({
    //                 next: (res) => {
    //                     data[key]= res.fileUrl;
    //                     this.toastService.show("File uploaded", { classname: 'bg-success text-light' });
    //                 }, error: (error) => {}
    //             })
    //     }
    // }

    // compareByIdFn(a, b): boolean {
    //     return (a && a.id) === (b && b.id);
    // }

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
                            this.cdr.detectChanges();
                        },
                        error: (err) => {
                            this.toastService.show("Lookup sync failed.\n "+ err.error?.message, { classname: 'bg-danger text-light' });
                            this.cdr.detectChanges();
                        }
                    })
            }).catch(err => { });

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
            this.cdr.detectChanges();
        }, 500);
    }

    getUrl(pre, path) {
        return this.baseApi + pre + encodeURIComponent(path); // encoded slash is not permitted py apache noSlash error.
      }


}
