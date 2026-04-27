// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// 
// LEAP is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
// 
// LEAP is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LEAP.  If not, see <http://www.gnu.org/licenses/>.

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, computed, effect, forwardRef, inject, input, output, signal } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { NavigationExtras, Router } from '@angular/router';
import { base, baseApi } from '../../_shared/constant.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbDateAdapter, NgbModal, NgbTimeAdapter, NgbTooltip, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { NgClass, KeyValuePipe, JsonPipe, DecimalPipe } from '@angular/common';
import { ToastService } from '../../_shared/service/toast-service';
import { ServerDate, br2nl, btoaUTF, compileTpl, createProxy, deepEqual, deepMerge, hashObject, loadScript, nl2br, splitAsList } from '../../_shared/utils';
import { NgbUnixTimestampTimeAdapter } from '../../_shared/service/time-adapter';
import { LogService } from '../../_shared/service/log.service';
import { combineLatest, first, lastValueFrom, map, Observable, share, shareReplay, Subject, takeUntil, tap } from 'rxjs';
import dayjs from 'dayjs';
import { HttpClient } from '@angular/common/http';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { ScreenComponent } from '../screen/screen.component';
import { ViewComponent } from '../view/view.component';
import { FormComponent } from '../form/form.component';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FieldViewComponent } from '../_component/field-view.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { StepWizardComponent } from '../_component/step-wizard.component';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
import { IconSplitPipe } from '../../_shared/pipe/icon-split.pipe';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
  { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
  imports: [PageTitleComponent, NgbTooltip, FaIconComponent, FormsModule, NgbDropdown, NgbDropdownToggle,
    NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, NgClass, FieldViewComponent, StepWizardComponent,
    NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, UserEntryFilterComponent, AngularEditorModule,
    forwardRef(() => FormComponent), forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent),
    SafePipe, KeyValuePipe, IconSplitPipe, DecimalPipe]
})
export class ListComponent implements OnInit, OnDestroy {

  private userService = inject(UserService);
  private runService = inject(RunService);
  private entryService = inject(EntryService);
  private lookupService = inject(LookupService);
  private router = inject(Router);
  private utilityService = inject(UtilityService);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>(); // Add this


  groupByPipe = new GroupByPipe();

  datasetId = input<number>();
  user = computed<any>(() => this.runService.$user());
  param = input<any>({}); // utk kegunaan dari queryparam (utk asComp=false)
  asComp = input<boolean>(false);
  hideTitle = input<boolean>(false);
  timestamp = input<number>();
  changed = output<any>();

  dataset = signal<any>(null);
  _datasetId: number;
  entryList = signal<any[]>([]);
  groupedEntryList = computed(() =>
    this.groupByPipe.transform(this.entryList(), this.getPathForGrouping(this.groupFieldCode()))
  );
  entryTotal = signal<number>(0);
  pageNumber = signal<number>(1);
  preCount = computed(() => this.pageSize() * (this.pageNumber() - 1));
  itemLoading = signal<boolean>(false);
  offline = signal<boolean>(false);
  filtersEncoded = computed(() => encodeURIComponent(JSON.stringify({...this.filtersData(), ...this._param})));
  searchText = signal<string>('');
  searchTextEncoded = computed(() => encodeURIComponent(this.searchText()));
  sort = signal<string | null>(null);
  datasetLoaded = output<any>();


  entryIndex: any = {};
  rowClass: any = {};
  numberOfElements = signal<number>(0);


  baseApi: string = baseApi;
  base: string = base;
  formId: any;
  entryPages = signal<number>(0);
  form = signal<any>({});
  pageSize = signal<number>(25);
  lookupKey = {};
  lookup = {};
  preurl: string = '';
  baseUrl: string = '';
  _param: any = {};
  _startTimestamp: number = 0;
  app = computed(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang);
  accessToken: string = '';
  scopeId = computed<string>(() => "list_"+this.datasetId());

  tiersMap: any = {};

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '0',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' }
    ],
    uploadWithCredentials: false,
    sanitize: false,
    toolbarPosition: 'bottom',
    toolbarHiddenButtons: [
      [
        'fontName'
      ],
      [
        'customClasses',
        'insertVideo',
        'insertImage',
        'removeFormat',
        'toggleEditorMode'
      ]
    ]
  };

  builtInItems = {
    $id: { label: "System ID", code: '$id', type: 'number', subType: 'number' },
    $code: { label: "System Code", code: '$code', type: 'text', subType: 'input' },
    $counter: { label: "System Counter", code: '$counter', type: 'number', subType: 'number' }
  }

  _this = createProxy({},()=>this.cdr.markForCheck());

  appConfig:any = this.runService.appConfig;

  private destroyed = false;

  constructor() {
    this.utilityService.testOnline$().subscribe((online) => this.offline.set(!online));

    effect(() => {
      const currentDatasetId = this.datasetId();
      if (this._datasetId !== currentDatasetId && currentDatasetId) {
        this._datasetId = currentDatasetId;
        this.getDataset(currentDatasetId);
      }
    });

    effect(() => {
      const startTimestamp = this.runService.$startTimestamp();
      const param = this.param();
      if (!deepEqual(this._param, param) || 
          (this._startTimestamp !== startTimestamp && this.hasConfPresetFilters())) {
        this._param = param;
        this._startTimestamp = startTimestamp;
        if (this._param){
          if (this._param['$prev$.$id']) {
            this.prevId = this._param['$prev$.$id'];
          }
        }
        this.getEntryList(this.pageNumber(), this.sort());
      }
    })

    // effect(() => {
    //   if (this.filtersData()) {
    //     console.log("filtersData changed", this.filtersEncoded());
    //   }
    // })
  }

  prevId: number;

  ngOnInit() {
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();
    this.accessToken = this.userService.getToken();
    this.appConfig = this.runService.appConfig;
  }

  actionsInline: any[] = [];
  actionsDropdown: any[] = [];

  hideGroup: any = {}

  userUnauthorized = computed(() => {
    const dataset = this.dataset();
    const user = this.user();

    if (!dataset || !user) {
      return false; // Default to false if dataset or user is not available
    }

    const intercept = dataset.accessList?.filter((v) =>
      Object.keys(user.groups || {}).includes(v + '')
    );

    return dataset.accessList?.length > 0 && intercept.length === 0;
  });

  aggColumnTotalField:any = {};
  aggColumnTotalValue:any = {};

  aggColumnAvgField:any = {};
  aggColumnAvgValue:any = {};


  loading = signal<boolean>(false);
  mailerList = signal<any[]>([]);
  totalColumn: number = 0;
  getDataset(id) {
    this.loading.set(true);
    this.runService.getRunDataset(id)
      .subscribe({
        next: res => {
          Object.defineProperty(window, '_this_'+this.scopeId(), {
            get: () => this._this,
            configurable: true,   // so you can delete it later 
            // writable: true,
          });  

          this.dataset.set(res);
          this.totalColumn = res.items.length
            + (res?.x?.bulkAction ? 1 : 0)
            + (res?.showIndex ? 1 : 0)
            + (res?.showStatus ? 1 : 0)
            + (res?.showAction ? 1 : 0);

          this.groupFieldCode.set(res.x?.defGroupField);
          this.pageSize.set(res.x?.defPageSize || 25);
          this.actionsInline = res.actions.filter(f => f.type == 'inline');
          this.actionsDropdown = res.actions.filter(f => f.type == 'dropdown');
          this.loading.set(false); 


          this.form.set({
            data: {
              ...res.form,
              items: deepMerge(this.builtInItems, res.form.items),
            },
            prev: res.form.prev || null,
          });

          this.getLookupInFilter()
          if (res.canBlast) {
            this.runService.getMailerList({ appId: res?.appId })
              .subscribe(res => {
                this.mailerList.set(res.content);
              })
          }

          res.form.tiers.forEach(t => this.tiersMap[t.id] = t);
          this.getEntryList(this.pageNumber());
        }, error: err => {
          this.loading.set(false);
        }
      })
  }

  loadTemplate(template) {
    this.blastData.set(template);
    this.cdr.detectChanges();
  }

  // Computed signal for processed preset filters
  // readonly processedPresetFilters = computed<Record<string, string>>(() => {
  //   const dataset = this.dataset();
  //   const scopeId = this.scopeId();
  //   if (!dataset?.presetFilters) return {};

  //   return Object.keys(dataset.presetFilters)
  //     .filter(k => String(dataset.presetFilters[k]).includes('$conf$'))
  //     .reduce((acc, k) => {
  //       acc[k] = compileTpl(dataset.presetFilters[k] ?? '', {}, scopeId);
  //       return acc;
  //     }, {} as Record<string, string>);
  // });

  readonly hasConfPresetFilters = computed(() =>{
    const dataset = this.dataset();
    return dataset?.presetFilters && Object.keys(dataset.presetFilters).some(k => String(dataset.presetFilters[k]).includes('$conf$'));
  });

  rawList = signal<any[]>([]);

  hasAggColumn:boolean = false;

  getEntryList(pageNumber: number, sort?: any) {
    const dataset = this.dataset();
    
    // Guard clauses for early exit
    if (!dataset) return;
    if (!dataset.id) return; 

    this.sort.set(sort);
    this.itemLoading.set(true);

    // Use spread syntax for cleaner merging
    const filtersAll = { ...this.filtersData(), ...this._param };

    const params: any = {
      email: this.user()?.email,
      searchText: this.searchText(),
      filters: JSON.stringify(filtersAll),
      page: pageNumber - 1,
      size: this.pageSize(),
      ...this._pre({}, dataset.x?.initParam, false),
      '@cond': this.filtersCond
    };

    if (this.sort()) {
      params['sorts'] = this.sort();
    }

    // Handle $conf$ via single pass loop over entries
    if (dataset.presetFilters) {
      const scopeId = this.scopeId();
      for (const [k, v] of Object.entries(dataset.presetFilters)) {
        if (String(v).includes("$conf$")) {
          params[k] = compileTpl((v as string) ?? '', {}, scopeId);
        }
      }
    }

    this.entryService.getListByDataset(dataset.id, params).subscribe({
      next: res => {
        if (this.destroyed) return;

        const content = res.content || [];
        const contentLength = content.length;

        // Batch set signals
        this.rawList.set(res);
        this.entryList.set(content);
        this.entryTotal.set(res.page?.totalElements);
        this.itemLoading.set(false);
        this.numberOfElements.set(contentLength);
        this.entryPages.set(res.page?.totalPages);

        try {
          this.changed.emit(res);
        } catch (e) {}

        const totalField = {};
        const avgField = {};
        const uniqueMap = {};

        // Process dataset items
        dataset.items?.forEach(i => {
          const key = `${i.root}.${i.code}`;
          const isTotal = !!i.x?.showTotal;
          const isAvg = !!i.x?.showAvg;

          if (isTotal) totalField[key]= i;
          if (isAvg) avgField[key] = i;

          if (isTotal || isAvg) uniqueMap[key] = i;
        });

        this.aggColumnTotalField = totalField;
        this.aggColumnAvgField = avgField;
        // Inside getEntryList after you populate the objects:
        this.hasAggColumn = Object.keys(totalField).length > 0 || Object.keys(avgField).length > 0;
        const mathField:any = Object.values(uniqueMap);

        this.aggColumnTotalValue = {};
        this.aggColumnAvgValue = {};

        // Hoist static values outside the loop for performance
        const scopeId = this.scopeId();
        const rowClassTemplate = dataset.x?.rowClass ?? '';

        // Process entry rows
        content.forEach((e, index) => {
          this.entryIndex[e.id] = index;
          
          this.rowClass[e.id] = compileTpl(rowClassTemplate, { $: e?.data, $_: e, $prev$: e?.prev }, scopeId);

          // Process math fields dynamically (O(1) branchless access)
          mathField.forEach(element => {
            const key = `${element.root}.${element.code}`;
            
            // 1. Determine where the data lives (branchless-style conditional)
            const isBaseRoot = element.root === 'data' || element.root === 'prev';
            const rootData = isBaseRoot ? e[element.root] : e.approval?.[element.root]?.data;
            
            // 2. Perform the math operation once
            const value = rootData ? Number(rootData[element.code] || 0) : 0;
            this.aggColumnTotalValue[key] = (this.aggColumnTotalValue[key] || 0) + value;
          });

        });

        // Calculate averages only if we have rows
        if (contentLength > 0) {
          for (const code in this.aggColumnAvgField) {
            const element = this.aggColumnAvgField[code];
            const key = `${element.root}.${element.code}`; // Or `${element.root}.${code}`            
            this.aggColumnAvgValue[key] = this.aggColumnTotalValue[key] / contentLength;
          }
        }

      }, 
      error: err => {
        if (this.destroyed) return;
        this.itemLoading.set(false);
      }
    });
  }

  insertTextAtCursor(text) {
    this.insertText("{{" + text + "}}")
  }

  insertText(text) {
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      }
    }
  }

  blastList(data: any, ids: number[]) {
    let filtersAll: any = {};
    Object.assign(filtersAll, this.filtersData(), this._param);
    // this.filtersEncoded.set(encodeURIComponent(JSON.stringify(filtersAll)));
    let params: any = {
      email: this.user().email,
      status: this.dataset().status,
      searchText: this.searchText(),
      filters: JSON.stringify(filtersAll) //this.filtersEncoded
    }
    if (ids) {
      params.ids = ids;
    }
    // console.log("params", params);
    this.entryService.blastByDataset(this.dataset().id, data, params)
      .subscribe({
        next: res => {
          let result = `<table width="100%">
                          <tr><td>${this.lang()=='ms'?'Keseluruhan':'Total Entry'}</td><td>: ${res.totalCount}</td></tr>
                          <tr><td>${this.lang()=='ms'?'Dihantar':'Total Sent'}</td><td>: ${res.totalSent}</td></tr>
                          <tr><td>${this.lang()=='ms'?'Berjaya':'Success'}</td><td>: ${res.success ? 'Yes' : 'No'}</td></tr>
                        </table>`;
          this.toastService.show(this.lang()=='ms'?"Blast berjaya":"Blast successful <br/>" + result, { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show(this.lang()=='ms'?"Blast tidak berjaya":"Email blast failed: " + err.error.message, { classname: 'bg-danger text-light' });
        }
      })
  }

  showHint = signal<boolean>(false);
  blastData = signal<any>({});
  blastEmail(tpl, data) {
    this.blastData.set(data);

    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static', size: 'lg' })
      .result.then(res => {
        this.blastList(res, undefined);
      }, res => { });
  }

  deleteEntry(id) {
    if (confirm("Remove this entry?")) {
      this.entryService.delete(id, this.user().email)
        .pipe(takeUntil(this.destroy$)) // PREVENTS LEAK
        .subscribe({
          next: res => {
            this.pageNumber.set((this.numberOfElements() == 1 && this.pageNumber() == this.entryPages()) ? this.pageNumber() - 1 : this.pageNumber());
            this.getEntryList(this.pageNumber());
            this.toastService.show(this.lang()=='ms'?"Entri berjaya dibuang":"Entry removed successfully", { classname: 'bg-success text-light' });
          }, error: err => {
            this.toastService.show(this.lang()=='ms'?"Entri tidak berjaya dibuang":"Entry removal failed", { classname: 'bg-danger text-light' });
          }
        })
    }
  }

  inPopEntryId = signal<number>(null);
  inPopType = signal<string>(null);
  inPopFacet = signal<string>(null);
  inPopFormId = signal<number>(null);
  inPopParams = signal<any>({});
  // tpl, entryId, formId, 'form','prev'
  inPop(content, entryId, formId, type, facet, params) {
    this.inPopEntryId.set(entryId);
    this.inPopType.set(type);
    this.inPopFacet.set(facet);
    this.inPopFormId.set(formId);
    if (params) {
      params.entryId = entryId;
      this.inPopParams.set(params);
    }

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(res => {
        this.getEntryList(this.pageNumber(), this.sort());
      }, err => { });

  }
  // #### ATTEMPT TO UNIFY POPUP AND NAVIGATE
  runAction(url, inpop, content, entryId, formId, type, facet, params) {
    // console.log(params)
    if (inpop) {
      // console.log("content",content,"entryId",entryId)
      this.inPop(content, entryId, formId, type, facet, params)
    } else {
      let navigationExtras: NavigationExtras = {
        queryParams: deepMerge({ entryId: entryId }, params),
      };
      this.router.navigate([this.preurl + url], navigationExtras);
    }
  }

  deepMerge = deepMerge;

  actionUrl = signal<string>('');
  actionTitle = signal<string>('');
  openUrl(content, url, title) {
    this.actionUrl.set(url);
    this.actionTitle.set(title);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg', windowClass: 'browser-window' })
      .result.then(res => { }, err => { });
  }

  cancelEntry(id) {
    if (confirm(this.lang()=='ms'?"Batalkan penghantaran entri ini?":"Cancel this entry submission?")) {
      this.entryService.cancel(id, this.user().email)
        .subscribe(res => {
          this.getEntryList(this.pageNumber());
        })
    }
  }

  editTier: any;

  removeApproval(entry, tierId) {
    this.entryService.removeApproval(entry.id, tierId)
      .subscribe(res => {
        this.getEntryList(this.pageNumber());
        delete entry.approval?.[tierId];
      })
  }

  // Problem if prev form not yet loaded
  getLookupInFilter() {
    this.dataset().filters.forEach(f => {
      let ds = this.form()[f.root]?.items[f.code]?.dataSource;
      let dsInit = this.form()[f.root]?.items[f.code]?.dataSourceInit;
      let type = this.form()[f.root]?.items[f.code]?.type;
      if (ds) { // only load filter with ds, which is lookup
        this.lookupKey[f.code] = {
          ds: ds,
          type: type
        }
        var param = null;
        try {
          param = new Function('$user$', 'return ' + dsInit)(this.user())
        } catch (e) { this.logService.log(`{list-${f.code}-dataSourceInit}-${e}`) }
        this._getLookup(f.code, dsInit ? param : null);
      }
    })
  }

  _getLookup = (code, param, cb?, err?) => {
    if (code) {
      this._getLookupObs(code, param, cb, err)
        .subscribe({
          next: res => {
            this.lookup[code] = res;
          }, error: err => {
          }
        })
    }
  }

  lookupDataObs: any = {}
  _getLookupObs(code, param, cb?, err?): Observable<any> {

    var cacheId = 'key_' + btoaUTF(this.lookupKey[code].ds + hashObject(param ?? {}), null);
    // masalah nya loading ialah async... so, mun simultaneous load, cache blom diset
    // bleh consider cache observable instead of result.
    // tp bila pake observable.. request dipolah on subscribe();
    // settle with share()
    if (this.lookupDataObs[cacheId]) {
      return this.lookupDataObs[cacheId]
    }
    // start loading
    if (this.lookupKey[code].type == 'modelPicker') {
      param = Object.assign(param || {}, { email: this.user().email });
      this.lookupDataObs[cacheId] = this.entryService.getListByDatasetData(this.lookupKey[code].ds, param ? param : null)
        .pipe(
          tap({ next: cb, error: err }), first(), 
          shareReplay(1)
          // share()
        )
    } else {
      // param = Object.assign(param || {}, { sort: 'id,asc' });
      param = Object.assign(param || {}, {});
      this.lookupDataObs[cacheId] = this.lookupService.getByKey(this.lookupKey[code].ds, param ? param : null)
        .pipe(
          tap({ next: cb, error: err }), first(),
          map((res: any) => res.content), 
          shareReplay(1)
          // share()
        )
    }
    return this.lookupDataObs[cacheId];
  }



  getVal(field, entry, data) {
    var value = "";
    if (field) {
      value = data ? data[field.code] : null;
      if (field.type == 'eval' && value == null) {
        if (field.f) {
          try {
            value = this._eval(entry, data, field.f);
          } catch (e) { this.logService.log(`{list-${field.code}-f}-${e}`) }
        }
      }
    }
    return value;
  }


  filtersData = signal<any>({});
  filtersCond: string = "AND";
  editFilterItems: any;
  editFilter(content, data) {
    this.filtersData.set({...data});
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        // console.log("res", res);
        this.filtersData.set({...res}); // re-assign sbb mungkin da Reset ({}), must use {...} to avoid reference issue and force signal update
        this.getEntryList(1);
      }, res => { });
  }

  filterIsEmpty = computed(() => Object.keys(this.filtersData()).length === 0 && this.filtersData().constructor === Object)
  filterSize = computed(() => Object.keys(this.filtersData()).length);

  getAsList = splitAsList;

  compileTpl(html, data) {
    var f = "";                               
    let obj = Object.assign({$user$:this.user(), $conf$:this.appConfig, $:{}, $_:{}, $prev$:{}, $base$:this.base, $baseUrl$:this.baseUrl, $baseApi$:this.baseApi, $this$:this._this, $param$:this._param, $token$:this.accessToken},
      data);
    try {
      f = compileTpl(html, obj, this.scopeId());
    } catch (e) {
      this.logService.log(`{list-${this.dataset()?.title}-compiletpl}-${e}`)
    }
    return f;
  }

  sortDir = {};
  sortField = signal<number>(null);
  sortFieldName = signal<string>(null);
  sortByField(id, name, field: string, dir: boolean) {
    this.sortField.set(id);
    this.sortFieldName.set(name);
    this.getEntryList(this.pageNumber(), field + '~' + (dir ? 'asc' : 'desc'));
  }

  groupFieldName = signal<string>(null);
  groupFieldCode = signal<string>(null);
  groupFieldId = signal<number>(null);
  groupFilter = signal<string>(null);
  groupByField(id, name, field: string) {
    this.groupFieldId.set(id);
    this.groupFieldCode.set(field);
    this.groupFieldName.set(name);
    // this.groupedEntryList = this.groupByPipe.transform(this.entryList, this.getPathForGrouping(this.groupFieldCode));
    this.groupFilter.set(null);
  }

  getPathForGrouping(rootDotCode) {
    let fieldPath = rootDotCode;
    if (rootDotCode == 'currentStatus') return rootDotCode;
    if (rootDotCode == 'submissionDate') return rootDotCode += '|date:' + ('yyyy-MM-dd');
    if (rootDotCode) {
      let split = rootDotCode.split(".");
      let field = this.form()[split[0]].items[split[1]];
      if (['select', 'radio'].indexOf(field?.type) > -1) {
        fieldPath += '.name';
      } else if (['modelPicker'].indexOf(field?.type) > -1) {
        fieldPath += '.' + field?.bindLabel;
      } else if (['date'].indexOf(field?.type) > -1) {
        fieldPath += '|date:' + (field.format ?? 'yyyy-MM-dd');
      }
    }
    return fieldPath;
  }

  nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
  br2nl = br2nl;// (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

  selectedEntries = signal<Map<number, any>>(new Map());

  checkAllEntry(checked) {
    if (checked) {
      this.entryList()
        .forEach(e => this.selectedEntries().set(e.id, e));
    } else {
      this.entryList()
        .forEach(e => this.selectedEntries().delete(e.id));
    }
  }

  toggleSelect(i) {
    if (this.selectedEntries().has(i.id)) {
      this.selectedEntries().delete(i.id);
    } else {
      this.selectedEntries().set(i.id, i);
    }
  }

  checkAllInput = signal<boolean>(false);
  bulkRemoveEntries() {
    if (confirm(this.lang()=='ms'?"Anda pasti untuk membuang semua entri ini?":"Remove all " + this.selectedEntries().size + " entries?")) {
      this.entryService.bulkDelete(Array.from(this.selectedEntries().keys()), this.user().email)
        .subscribe({
          next: res => {
            this.selectedEntries().clear();
            this.checkAllInput.set(false);
            this.pageNumber.set((this.numberOfElements() == 1 && this.pageNumber() == this.entryPages()) ? this.pageNumber() - 1 : this.pageNumber());
            // this.pageNumber = (this.numberOfElements == 1 && !this.first) ? this.pageNumber - 1 : this.pageNumber;
            this.getEntryList(this.pageNumber());
            this.toastService.show(this.lang()=='ms'?"Entri berjaya dibuang":"Entries removed successfully", { classname: 'bg-success text-light' });
          }, error: err => {
            this.toastService.show(this.lang()=='ms'?"Entri tidak berjaya dibuang":"Entries removal failed", { classname: 'bg-danger text-light' });
            this.selectedEntries().clear();
            this.checkAllInput.set(false);
          }
        });
    }
  }

  checkSelect(i) {
    return this.selectedEntries().has(i.id);
  }

  bulkEmail(content, data) {
    this.blastData.set({ ...data, bulk: true });

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(res => {
        this.blastList(res, Array.from(this.selectedEntries().keys()));
      }, res => { });
  }

  resyncDataset(dsId) {
    if (confirm(this.lang()=='ms'?"Anda pasti untuk menyelaraskan data menggunakan dataset ini?":"Are you sure you want to resynchronize data using this dataset?")) {
      this.runService.resyncDataset(this.dataset()?.id)
        .subscribe(res => {
          this.toastService.show(this.lang()=='ms'?"Dataset berhasil diselaraskan":"Dataset successfully resynchronized", { classname: 'bg-success text-light' });
        })
    }
  }

  bulkEvalRun(f) {
    this.selectedEntries().forEach(e => {
      this._evalRun(e, f, true);
    })
  }

  bulkCancelEntry() {
    if (confirm(this.lang()=='ms'?"Batalkan semua entri?":"Cancel selected entry submission?")) {
      const list: Observable<any>[] = [];
      this.selectedEntries().forEach(e => {
        if (e.currentStatus != 'drafted') {
          list.push(this.entryService.cancel(e.id, this.user().email));
        }
      });
      if (list.length === 0) {
        this.toastService.show(this.lang()=='ms'?'Tiada entri untuk dibatalkan':'No entries to cancel.', { classname: 'bg-warning text-dark' });
        return;
      }
      combineLatest(list)
        .subscribe(res => {
          this.toastService.show(this.lang()=='ms'?`${res.length} entri berjaya dibatalkan`:`${res.length} entries successfully retracted`, { classname: 'bg-success text-light' });
          this.getEntryList(this.pageNumber());
        });
    }
  }

  _eval = (data, entry, v) => this._evalRun(entry, v, false);// new Function('$_', '$', '$prev$', `return ${v}`)(entry, data, entry && entry.prev);

  // _evalRun = (entry, f, bulk) => new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$toast$', '$update$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$live$', '$token$', '$merge$', '$web$', '$bulk$',
  //   `return ${f}`)(this.runService.$app(), entry, entry?.data, entry && entry?.prev, this.user(), this.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.submit, this.form() && this.form().items, this.form(), this._this, this.loadScript, this.$digest$, this._param, this.log, this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, bulk);
  // _pre = (entry, f, bulk) => !f || new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$this$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$',
  //   `return ${f}`)(this.runService.$app(), entry, entry?.data, entry && entry?.prev, this.user(), this.appConfig, this._this, this._param, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk);


  private evalCache = new Map<string, Function>();
  _evalRun = (entry: any, f: string, bulk: boolean) => {
    if (!f) return undefined;
    
    let fn = this.evalCache.get(f);
    if (!fn) {
      // Compile ONLY once per unique script string
      fn = new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$toast$', '$update$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$live$', '$token$', '$merge$', '$web$', '$bulk$', `return ${f}`);
      this.evalCache.set(f, fn);
    }
    
    // Execute at native speed
    return fn(this.runService.$app(), entry, entry?.data, entry && entry?.prev, this.user(), this.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.submit, this.form() && this.form().items, this.form(), this._this, this.loadScript, this.$digest$, this._param, this.log, this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, bulk);
  };

  private preCache = new Map<string, Function>();
  _pre = (entry: any, f: string, bulk: boolean) => {
    if (!f) return true; // Pre-check defaults to true if empty

    let fn = this.preCache.get(f);
    if (!fn) {
      fn = new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$this$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$', `return ${f}`);
      this.preCache.set(f, fn);
    }
    
    return fn(this.runService.$app(), entry, entry?.data, entry && entry?.prev, this.user(), this.appConfig, this._this, this._param, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk);
  };


  preCheck(entry, f, bulk) {
    let res = undefined;
    try {
      res = this._pre(entry, f, bulk);
    } catch (e) { this.logService.log(`{list}-${e}`) }
    return !f || res;
  }

  hasVisibleActions = computed(() => {
    // 1. If actions are globally disabled for the dataset, hide the column immediately
    if (!this.dataset()?.showAction) return false;

    // 2. Safely grab the current page's entries and actions
    const entries = this.entryList() || [];
    const inline = this.actionsInline || [];
    const dropdown = this.actionsDropdown || [];

    // 3. Scan the current page's rows
    for (const entry of entries) {
      
      // Check if any inline action is visible for this row
      for (const ac of inline) {
        if (this.preCheck(entry, ac.pre, false)) {
          return true; // Found a visible action, show the column!
        }
      }
      
      // Check if any dropdown action is visible for this row
      if (dropdown.length > 0) {
        for (const ac of dropdown) {
          if (this.preCheck(entry, ac.pre, false)) {
            return true; // Found a visible action, show the column!
          }
        }
      }
    }

    // 4. If the loop finishes without returning true, no actions are visible
    return false; 
  });


// 1. Helper to determine if an action should be disabled while offline
  isActionOfflineDisabled(actionType: string): boolean {
    if (!this.offline()) return false;
    // Added 'prev-prev' to perfectly match your original HTML rules
    const offlineRestricted = [
      'approve', 'screen', 'prev-screen', 'prev', 'extend', 
      'facet', 'prev-facet', 'prev-prev', 'url', 'function', 'retract', 'delete'
    ];
    return offlineRestricted.includes(actionType);
  }

  // 2. Centralized Action Router (Safely handles undefined properties)
  executeRowAction(ac: any, i: any, inPopTpl: any, openUrlTpl: any) {
    // Better than the original: Actively prevents the click execution if forced via DevTools
    if (this.isActionOfflineDisabled(ac.action)) return;

    // Safely fetch form data
    const fData = this.form()?.data;
    const fPrev = this.form()?.prev;
    const evalParams = this._eval(i.data, i, ac.params);

    switch (ac.action) {
      case 'view':
        this.runAction('/form/' + fData?.id + '/' + ac.action, ac.inpop, inPopTpl, i.id, fData?.id, 'view', ac.action, evalParams);
        break;
      case 'view-single':
        this.runAction('/form/' + ac.next + '/' + ac.action, ac.inpop, inPopTpl, i.id, ac.next, 'view', ac.action, evalParams);
        break;
      case 'prev-view':
        this.runAction('/form/' + fPrev?.id + '/view', ac.inpop, inPopTpl, i.prev?.$id, fPrev?.id, 'view', 'view', evalParams);
        break;
      case 'edit':
        this.runAction('/form/' + fData?.id + '/edit', ac.inpop, inPopTpl, i.id, fData?.id, 'form', ac.action, evalParams);
        break;
      case 'edit-single':
        this.runAction('/form/' + ac.next + '/edit-single', ac.inpop, inPopTpl, i.id, ac.next, 'form', ac.action, evalParams);
        break;
      case 'prev-edit':
        this.runAction('/form/' + fPrev?.id + '/edit', ac.inpop, inPopTpl, i.prev?.$id, fPrev?.id, 'form', 'edit', evalParams);
        break;
      case 'approve':
        this.runAction('/form/' + fData?.id + '/view', ac.inpop, inPopTpl, i.id, fData?.id, 'approve', 'view', evalParams);
        break;
      case 'screen':
        this.runAction('/screen/' + ac.next, ac.inpop, inPopTpl, i.id, ac.next, 'screen', 'screen', evalParams);
        break;
      case 'prev-screen':
        this.runAction('/screen/' + ac.next, ac.inpop, inPopTpl, i.prev?.$id, ac.next, 'screen', 'screen', evalParams);
        break;
      case 'prev':
        this.runAction('/form/' + ac.next + '/prev', ac.inpop, inPopTpl, i.id, ac.next, 'form', 'prev', evalParams);
        break;
      case 'extend':
        this.runAction('/form/' + ac.next + '/edit', ac.inpop, inPopTpl, i.id, ac.next, 'form', 'edit', evalParams);
        break;
      case 'facet':
        this.runAction('/form/' + fData?.id + '/' + ac.next, ac.inpop, inPopTpl, i.id, fData?.id, 'form', ac.next, evalParams);
        break;
      case 'prev-facet':
        this.runAction('/form/' + fPrev?.id + '/' + ac.next, ac.inpop, inPopTpl, i.prev?.$id, fPrev?.id, 'form', ac.next, evalParams);
        break;
      case 'prev-prev':
        this.runAction('/form/' + ac.next + '/prev', ac.inpop, inPopTpl, i.prev?.$id, ac.next, 'form', 'prev', evalParams);
        break;
      case 'url':
        const url = this.compileTpl(ac.url, { $: i.data, $_: i, $prev$: i?.prev });
        this.openUrl(openUrlTpl, url, ac.label);
        break;
      case 'function':
        this._evalRun(i, ac.f, false);
        break;
      case 'retract':
        if (i.currentStatus !== 'drafted') this.cancelEntry(i.id);
        break;
      case 'delete':
        this.deleteEntry(i.id);
        break;
    }
  }

  $digest$ = () => {
    this.cdr.detectChanges()
  }

  liveSubscription: any = {};

  loadScript = loadScript;

  log = (log) => this.logService.log(JSON.stringify(log));

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  /** Need to study either to implement deepMerge when updated entry: refer view-component */
  updateField = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.dataset()?.appId)
      .pipe(
        tap({ next: callback, error: error }),
        tap(() => {
          this.getEntryList(this.pageNumber());
        }), first()
      ));
  }

  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.dataset().appId, params, callback, error))

  updateLookup = (entryId, value, callback, error) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.dataset()?.appId)
      .pipe(
        tap({ next: callback, error: error }), first()
      ));
  }

  // REASON we use entry instead of entry.id is because we need to deepMerge it later with the response
  submit = (entry, resubmit: boolean) => {
    this.entryService.submit(entry.id, this.user().email, resubmit)
      .subscribe({
        next: res => {
          if (this.form().onSubmit) {
            try {
              this._evalRun(entry.data, this.form()['data'].onSubmit, false);
            } catch (e) { this.logService.log(`{form-${this.form().title}-onSubmit}-${e}`) }
          }
          entry = deepMerge(entry, res);
          this.toastService.show(this.lang()=='ms'?"Entri telah dihantar":"Entry submitted successfully", { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show(this.lang()=='ms'?"Entri gagal dihantar":"Entry submission failed", { classname: 'bg-danger text-light' });
        }
      })
  }

  inPopTitle = signal<string>('');
  formLoaded(form) {
    this.inPopTitle.set(form?.title || 'Form');
  }
  screenLoaded(screen) {
    this.inPopTitle.set(screen?.title);
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.destroy$.next(); // Clean up
    this.destroy$.complete();
    Object.keys(this.liveSubscription).forEach(key => this.liveSubscription[key].unsubscribe());//.forEach(sub => sub.unsubscribe());
    delete window['_this_' + this.scopeId()];
  }

  fclose(){
    // console.log("## FCLOSE");
  }

}
