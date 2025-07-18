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
import { NgClass, KeyValuePipe, JsonPipe } from '@angular/common';
import { ToastService } from '../../_shared/service/toast-service';
import { ServerDate, br2nl, btoaUTF, compileTpl, createProxy, deepEqual, deepMerge, hashObject, loadScript, nl2br, splitAsList } from '../../_shared/utils';
import { NgbUnixTimestampTimeAdapter } from '../../_shared/service/time-adapter';
import { LogService } from '../../_shared/service/log.service';
import { combineLatest, first, lastValueFrom, map, Observable, share, tap } from 'rxjs';
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
    SafePipe, KeyValuePipe]
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
  app = computed(() => this.runService.$app());
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
      if (!deepEqual(this._param, this.param())) {
        this._param = this.param();
        // console.log("param changed", this._param);
        if (this._param['$prev$.$id']) {
          this.prevId = this._param['$prev$.$id'];
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

  getEntryList(pageNumber, sort?) {
    if (this.dataset()){
      this.sort.set(sort);
      this.itemLoading.set(true);
      let filtersAll: any = {};
      
      filtersAll = Object.assign(filtersAll, this.filtersData(), this._param);
      
      let params = {
        email: this.user()?.email,
        // status: this.statusEncoded,
        searchText: this.searchText(),
        filters: JSON.stringify(filtersAll),
        page: pageNumber - 1,
        size: this.pageSize()
      }

      // utk handle $conf$, if ada $conf$, override dengan value dari frontend
      if (this.dataset().presetFilters) {
        Object.keys(this.dataset().presetFilters)
          .filter(k => (this.dataset().presetFilters[k] + "").includes("$conf$"))
          .forEach(k => {
            params[k] = compileTpl(this.dataset().presetFilters[k] ?? '', {}, this.scopeId())
          })
      }

      params = Object.assign(params, this._pre({}, this.dataset().x?.initParam, false));

      if (this.sort()) {
        params['sorts'] = this.sort();
      }
      params['@cond'] = this.filtersCond;

      if (this.dataset()?.id) {
        this.entryService.getListByDataset(this.dataset().id, params)
          .subscribe({
            next: res => {
              if (this.destroyed) return;

              this.entryList.set(res.content);
              this.entryTotal.set(res.page?.totalElements);
              this.itemLoading.set(false);
              this.numberOfElements.set(res.content?.length);
              this.entryPages.set(res.page?.totalPages);

              try {
                this.changed.emit(res);
              } catch (e) { }

              this.entryList().forEach((e, index) => {
                this.entryIndex[e.id] = index;
                this.rowClass[e.id] = compileTpl(this.dataset()?.x?.rowClass ?? '', {$: e?.data, $_: e, $prev$: e?.prev}, this.scopeId())
              })

            }, error: err => {
              if (this.destroyed) return;
              this.itemLoading.set(false)
            }
          });
      }
    }

  }

  insertTextAtCursor(text) {
    this.insertText("{{" + text + "}}")
  }
  insertText(text) {
    var sel, range;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      }
    } else if ((document as any).selection && (document as any).selection.createRange) {
      (document as any).selection.createRange().text = text;
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
                          <tr><td>Total Entry</td><td>: ${res.totalCount}</td></tr>
                          <tr><td>Total Sent</td><td>: ${res.totalSent}</td></tr>
                          <tr><td>Success</td><td>: ${res.success ? 'Yes' : 'No'}</td></tr>
                        </table>`;
          this.toastService.show("Blast successful <br/>" + result, { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show("Email blast failed: " + err.error.message, { classname: 'bg-danger text-light' });
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
        .subscribe({
          next: res => {
            this.pageNumber.set((this.numberOfElements() == 1 && this.pageNumber() == this.entryPages()) ? this.pageNumber() - 1 : this.pageNumber());
            this.getEntryList(this.pageNumber());
            this.toastService.show("Entry removed successfully", { classname: 'bg-success text-light' });
          }, error: err => {
            this.toastService.show("Entry removal failed", { classname: 'bg-danger text-light' });
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
    if (confirm("Cancel this entry submission?")) {
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
        delete entry.approval[tierId];
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
          tap({ next: cb, error: err }), first(), share()
        )
    } else {
      // param = Object.assign(param || {}, { sort: 'id,asc' });
      param = Object.assign(param || {}, {});
      this.lookupDataObs[cacheId] = this.lookupService.getByKey(this.lookupKey[code].ds, param ? param : null)
        .pipe(
          tap({ next: cb, error: err }), first(),
          map((res: any) => res.content), share()
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
        console.log("res", res);
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
    if (confirm("Remove all " + this.selectedEntries().size + " entries?")) {
      this.entryService.bulkDelete(Array.from(this.selectedEntries().keys()), this.user().email)
        .subscribe({
          next: res => {
            this.selectedEntries().clear();
            this.checkAllInput.set(false);
            this.pageNumber.set((this.numberOfElements() == 1 && this.pageNumber() == this.entryPages()) ? this.pageNumber() - 1 : this.pageNumber());
            // this.pageNumber = (this.numberOfElements == 1 && !this.first) ? this.pageNumber - 1 : this.pageNumber;
            this.getEntryList(this.pageNumber());
            this.toastService.show("Entries removed successfully", { classname: 'bg-success text-light' });
          }, error: err => {
            this.toastService.show("Entries removal failed", { classname: 'bg-danger text-light' });
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
    if (confirm("Are you sure you want to resynchronize data using this dataset?")) {
      this.runService.resyncDataset(this.dataset()?.id)
        .subscribe(res => {
          this.toastService.show("Dataset successfully resynchronized", { classname: 'bg-success text-light' });
        })
    }
  }

  bulkEvalRun(f) {
    this.selectedEntries().forEach(e => {
      this._evalRun(e, f, true);
    })
  }

  bulkCancelEntry() {
    if (confirm("Cancel selected entry submission?")) {
      const list: Observable<any>[] = [];
      this.selectedEntries().forEach(e => {
        if (e.currentStatus != 'drafted') {
          list.push(this.entryService.cancel(e.id, this.user().email));
        }
      });
      if (list.length === 0) {
        this.toastService.show('No entries to cancel.', { classname: 'bg-warning text-dark' });
        return;
      }
      combineLatest(list)
        .subscribe(res => {
          this.toastService.show(`${res.length} entries successfully retracted`, { classname: 'bg-success text-light' });
          this.getEntryList(this.pageNumber());
        });
    }
  }


  getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  _eval = (data, entry, v) => this._evalRun(entry, v, false);// new Function('$_', '$', '$prev$', `return ${v}`)(entry, data, entry && entry.prev);

  _evalRun = (entry, f, bulk) => new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$', '$endpoint$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$toast$', '$update$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$live$', '$token$', '$merge$', '$web$', '$bulk$',
    `return ${f}`)(this.runService.$app(), entry, entry?.data, entry && entry?.prev, this.user(), this.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.submit, this.form() && this.form().items, this.form(), this._this, this.loadScript, this.$digest$, this._param, this.log, this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.runService?.$live$(this.liveSubscription, this.$digest$), this.accessToken, deepMerge, this.http, bulk);
  _pre = (entry, f, bulk) => !f || new Function('$app$', '$_', '$', '$prev$', '$user$', '$conf$', '$this$', '$param$', '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$',
    `return ${f}`)(this.runService.$app(), entry, entry?.data, entry && entry?.prev, this.user(), this.appConfig, this._this, this._param, this.log, this.base, this.baseUrl, this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk);

  preCheck(entry, f, bulk) {
    let res = undefined;
    try {
      res = this._pre(entry, f, bulk);
    } catch (e) { this.logService.log(`{list}-${e}`) }
    return !f || res;
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
          this.toastService.show("Entry submitted successfully", { classname: 'bg-success text-light' });
        }, error: err => {
          this.toastService.show("Entry submission failed", { classname: 'bg-danger text-light' });
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
    Object.keys(this.liveSubscription).forEach(key => this.liveSubscription[key].unsubscribe());//.forEach(sub => sub.unsubscribe());
  }

  fclose(){
    console.log("## FCLOSE");
  }

}
