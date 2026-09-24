// Copyright (C) 2018 Razif Baital
// Part of LEAP - GNU GPL v3

import { 
  ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, 
  computed, effect, forwardRef, inject, input, output, signal, untracked 
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationExtras, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgClass, KeyValuePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  NgbDateAdapter, NgbModal, NgbTimeAdapter, NgbTooltip, NgbDropdown, 
  NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, 
  NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious 
} from '@ng-bootstrap/ng-bootstrap';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { forkJoin, lastValueFrom, Observable, of, Subscription, tap, map, catchError } from 'rxjs';
import dayjs from 'dayjs';

import { base, baseApi } from '../../_shared/constant.service';
import { UserService } from '../../_shared/service/user.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { ToastService } from '../../_shared/service/toast-service';
import { LogService } from '../../_shared/service/log.service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { NgbUnixTimestampTimeAdapter } from '../../_shared/service/time-adapter';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
import { IconSplitPipe } from '../../_shared/pipe/icon-split.pipe';
import { ServerDate, br2nl, btoaUTF, compileTpl, createProxy, deepEqual, deepMerge, hashObject, loadScript, nl2br, splitAsList } from '../../_shared/utils';

import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';

import { ScreenComponent } from '../screen/screen.component';
import { ViewComponent } from '../view/view.component';
import { FormComponent } from '../form/form.component';
import { FieldViewComponent } from '../_component/field-view.component';
import { PageTitleComponent } from '../_component/page-title.component';
import { StepWizardComponent } from '../_component/step-wizard.component';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { ViewportService } from '../../_shared/service/viewport.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
    { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }
  ],
  imports: [
    PageTitleComponent, NgbTooltip, FaIconComponent, FormsModule, NgbDropdown, NgbDropdownToggle,
    NgbDropdownMenu, NgbDropdownItem, NgbDropdownButtonItem, NgClass, FieldViewComponent, StepWizardComponent,
    NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, 
    UserEntryFilterComponent, AngularEditorModule, forwardRef(() => FormComponent), 
    forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent), SafePipe, KeyValuePipe, IconSplitPipe, DecimalPipe
  ]
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
  private destroyRef = inject(DestroyRef);
  private viewport = inject(ViewportService);

  groupByPipe = new GroupByPipe();

  datasetId = input<number>();
  user = computed<any>(() => this.runService.$user());
  param = input<any>({});
  asComp = input<boolean>(false);
  hideTitle = input<boolean>(false);
  timestamp = input<number>();
  changed = output<any>();
  datasetLoaded = output<any>();

  dataset = signal<any>(null);
  
  entryList = signal<any[]>([]);
  groupedEntryList = computed(() =>
    this.groupByPipe.transform(this.entryList(), this.getPathForGrouping(this.groupFieldCode()))
  );
  entryTotal = signal<number>(0);
  pageNumber = signal<number>(1);
  preCount = computed(() => this.pageSize() * Math.max(0, this.pageNumber() - 1));
  itemLoading = signal<boolean>(false);
  offline = signal<boolean>(false);

  filtersEncoded = computed(() => encodeURIComponent(JSON.stringify({ ...this.filtersData(), ...this._param })));
  confValueEncoded = computed(() => {
    const filters = this.dataset()?.presetFilters;
    if (!filters) return '';

    const scopeId = this.scopeId();
    const params: Record<string, string> = {};

    for (const [k, v] of Object.entries(filters)) {
      if (typeof v === 'string' && v.includes('$conf$')) {
        params[k] = compileTpl(v, {}, scopeId);
      }
    }
    return new URLSearchParams(params).toString();
  });

  searchText = signal<string>('');
  searchTextEncoded = computed(() => encodeURIComponent(this.searchText()));
  sort = signal<string | null>(null);

  statusFilterForm: any = {};
  statusFilterFormActual: any = {};

  entryIndex: Record<number, number> = {};
  rowClass: Record<number, string> = {};
  numberOfElements = signal<number>(0);

  baseApi: string = baseApi;
  base: string = base;
  formId: any;
  entryPages = signal<number>(0);
  form = signal<any>({});
  pageSize = signal<number>(25);
  lookupKey: Record<string, any> = {};
  lookup: Record<string, any> = {};
  preurl: string = '';
  baseUrl: string = '';
  _param: any = {};
  _startTimestamp: number = 0;
  prevId!: number;

  app = computed(() => this.runService.$app());
  lang = computed(() => this.app().x?.lang || 'en');
  angularLocale = computed(() => (this.lang() === 'ms' ? 'ms-MY' : 'en-US'));
  accessToken: string = '';
  scopeId = computed<string>(() => 'list_' + this.datasetId());

  tiersMap: Record<string, any> = {};
  actionsInline: any[] = [];
  actionsDropdown: any[] = [];
  actionsBulk: any[] = [];
  hideGroup: Record<string, boolean> = {};

  aggColumnTotalField: Record<string, any> = {};
  aggColumnTotalValue: Record<string, number> = {};
  aggColumnAvgField: Record<string, any> = {};
  aggColumnAvgValue: Record<string, number> = {};
  hasAggColumn: boolean = false;

  statusMap: Record<string, { ms: string; en: string }> = {
    drafted: { ms: 'Didraf', en: 'Drafted' },
    submitted: { ms: 'Dihantar', en: 'Submitted' },
    resubmitted: { ms: 'Dihantar semula', en: 'Resubmitted' }
  };

  loading = signal<boolean>(false);
  mailerList = signal<any[]>([]);
  totalColumn: number = 0;
  columnVisible: Record<string, boolean> = {};

  editorConfig: AngularEditorConfig = {
    editable: true, spellcheck: true, height: 'auto', minHeight: '0', maxHeight: 'auto',
    width: 'auto', minWidth: '0', translate: 'yes', enableToolbar: true, showToolbar: true,
    placeholder: 'Enter text here...', defaultParagraphSeparator: '', defaultFontName: '', defaultFontSize: '',
    fonts: [
      { class: 'arial', name: 'Arial' }, { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' }, { class: 'comic-sans-ms', name: 'Comic Sans MS' }
    ],
    uploadWithCredentials: false, sanitize: false, toolbarPosition: 'bottom',
    toolbarHiddenButtons: [['fontName'], ['customClasses', 'insertVideo', 'insertImage', 'removeFormat', 'toggleEditorMode']]
  };

  builtInItems = {
    $id: { label: 'System ID', code: '$id', type: 'number', subType: 'number' },
    $code: { label: 'System Code', code: '$code', type: 'text', subType: 'input' },
    $counter: { label: 'System Counter', code: '$counter', type: 'number', subType: 'number' },
    $statusText: { label: 'Current Status Text', code: '$statusText', type: 'text', subType: 'input' }
  };

  _this = createProxy({}, () => this.cdr.markForCheck());
  get appConfig(): any { return this.runService.appConfig; }

  dayjs = dayjs;
  ServerDate = ServerDate;

  private activeDatasetReq?: Subscription;
  private activeListReq?: Subscription;
  private registeredScopeId: string | null = null;
  private lastResStr: string = '';

  isMobile = this.viewport.isMobile;

  private readonly EVAL_PARAMS = [
    '$app$', '$_', '$', '$prev$', '$$_', '$$', '$selected$', '$user$', '$conf$', '$http$', '$post$', 
    '$endpoint$', '$submit$', '$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', 
    '$toast$', '$update$', '$updateLookup$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 
    'dayjs', 'ServerDate', '$live$', '$token$', '$merge$', '$web$', '$bulk$'
  ];

  private readonly PRE_PARAMS = [
    '$app$', '$_', '$', '$prev$', '$$_', '$$', '$selected$', '$user$', '$conf$', '$this$', '$param$', 
    '$log$', '$base$', '$baseUrl$', '$baseApi$', '$lookupList$', 'dayjs', 'ServerDate', '$token$', '$bulk$'
  ];

  constructor() {
    this.utilityService.testOnline$().pipe(takeUntilDestroyed()).subscribe(online => this.offline.set(!online));

    effect(() => {
        const id = this.datasetId();
        if (id) untracked(() => this.getDataset(id));
    });

    effect(() => {
      const startTimestamp = this.runService.$startTimestamp();
      const param = this.param();

      if (!deepEqual(this._param, param) || (this._startTimestamp !== startTimestamp && this.hasConfPresetFilters())) {
        this._param = param;
        this._startTimestamp = startTimestamp;

        if (this._param?.['$prev$.$id']) this.prevId = this._param['$prev$.$id'];
        untracked(() => this.getEntryList(this.pageNumber(), this.sort()));
      }
    });
  }

  ngOnInit() {
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();
    this.accessToken = this.userService.getToken();
  }

  convertStatusToDisplay(status: any, form: any, root: string) {
    const statusFilterForm: any = { '-1': {} };
    (status?.['-1']?.split(",") || []).forEach((el: string) => statusFilterForm['-1'][el] = true);
    
    form[root]?.tiers?.forEach((t: any) => {
      statusFilterForm[t.id] = {};
      (status?.[t.id]?.split(",") || []).forEach((el: string) => {
        if (t.actions[el] || el === 'resubmitted' || (t.alwaysApprove && el === 'always_approve')) {
          statusFilterForm[t.id][el] = true;
        }
      });
    });
    return statusFilterForm;
  }

  convertDisplayToStatus(statusFilterList: any) {
    return Object.entries(statusFilterList || {}).reduce((acc: any, [tierId, actions]) => {
      acc[tierId] = Object.entries(actions as object).filter(([, val]) => val).map(([key]) => key).join(",");
      return acc;
    }, {});
  }

  userUnauthorized = computed(() => {
    const dataset = this.dataset();
    const user = this.user();
    if (!dataset || !user) return false;

    const intercept = dataset.accessList?.filter((v: any) => Object.keys(user.groups || {}).includes(v + ''));
    return dataset.accessList?.length > 0 && intercept.length === 0;
  });

  getDataset(id: number) {
    if (this.activeDatasetReq) this.activeDatasetReq.unsubscribe();

    this.loading.set(true);
    this.itemLoading.set(true);
    this.dataset.set(null);
    this.entryTotal.set(0);
    this.numberOfElements.set(0);
    this.entryPages.set(0);
    this.lastResStr = '';

    this.entryList.set([]);
    this.selectedEntries.set({});
    this.searchText.set('');
    this.filtersData.set({});
    this.pageNumber.set(1);
    this.groupFilter.set(null);
    this.sort.set(null);
    this.checkAllInput.set(false);

    if (this._this) Object.keys(this._this).forEach(key => delete this._this[key]);
    
    if (this.registeredScopeId) {
      const oldKey = '_this_' + this.registeredScopeId;
      if (!Reflect.deleteProperty(window, oldKey)) (window as any)[oldKey] = undefined;
    }

    this.registeredScopeId = this.scopeId();
    Reflect.defineProperty(window, '_this_' + this.scopeId(), { get: () => this._this, configurable: true }); 
        
    this.activeDatasetReq = this.runService.getRunDataset(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.dataset.set(res);
          this.totalColumn = res.items.length + (res?.x?.bulkAction ? 1 : 0) + (res?.showIndex ? 1 : 0) + 
                             (res?.showStatus ? 1 : 0) + (res?.showAction ? 1 : 0);
          this.groupFieldCode.set(res.x?.defGroupField);
          this.pageSize.set(res.x?.defPageSize || 25);
          
          this.actionsInline = res.actions.filter((f: any) => f.type === 'inline');
          this.actionsDropdown = res.actions.filter((f: any) => f.type === 'dropdown');
          this.actionsBulk = res.actions.filter((f: any) => f.type === 'bulk');

          this.columnVisible = {};
          res.items?.forEach((item: any) => this.columnVisible[item.id] = this.preCheck({}, item.pre, false));

          this.form.set({ data: { ...res.form, items: deepMerge(this.builtInItems, res.form.items) }, prev: res.form.prev || null });

          if (res.x?.enableStatusFilter){
            this.statusFilterFormActual = this.convertStatusToDisplay(res.statusFilter, this.form(), 'data');
            this.statusFilterForm = this.convertStatusToDisplay(res.statusFilter, this.form(), 'data');
          }

          this.getLookupInFilter();

          if (res.canBlast) {
            this.runService.getMailerList({ appId: res?.appId })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(mRes => this.mailerList.set(mRes.content));
          }

          this.tiersMap = {};
          res.form.tiers.forEach((t: any) => (this.tiersMap[t.id] = t));

          this.loading.set(false); 
          this.getEntryList(1);
        },
        error: () => { this.loading.set(false); this.itemLoading.set(false); }
      });
  }

  readonly hasConfPresetFilters = computed(() => {
    const dataset = this.dataset();
    return dataset?.presetFilters && Object.keys(dataset.presetFilters).some(k => String(dataset.presetFilters[k]).includes('$conf$'));
  });

  rawList = signal<any[]>([]);

  getEntryList(pageNumber: number, sort?: any) {
    const dataset = this.dataset();
    if (!dataset?.id) return;

    if (this.activeListReq) this.activeListReq.unsubscribe();
    this.sort.set(sort);
    this.itemLoading.set(true);

    const filtersAll = { ...this.filtersData(), ...this._param };
    const params: any = {
      email: this.user()?.email, searchText: this.searchText(), filters: JSON.stringify(filtersAll),
      page: pageNumber - 1, size: this.pageSize(), '@cond': this.filtersCond,
      ...this._pre({}, dataset.x?.initParam, false)
    };

    if (this.sort()) params['sorts'] = this.sort();
    if (dataset?.x?.enableStatusFilter) params.status = JSON.stringify(this.convertDisplayToStatus(this.statusFilterForm));

    if (dataset.presetFilters) {
      const scopeId = this.scopeId();
      for (const [k, v] of Object.entries(dataset.presetFilters)) {
        if (String(v).includes('$conf$')) params[k] = compileTpl((v as string) ?? '', {}, scopeId);
      }
    }

    this.activeListReq = this.entryService.getListByDataset(dataset.id, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const currentResStr = JSON.stringify(res);
          if (this.lastResStr === currentResStr) {
            this.itemLoading.set(false);
            return;
          }
          this.lastResStr = currentResStr;

          const content = res.content || [];
          this.rawList.set(res);
          this.entryTotal.set(res.page?.totalElements);
          this.pageSize.set(res.page?.size || this.pageSize());
          this.itemLoading.set(false);
          this.numberOfElements.set(content.length);
          this.entryPages.set(res.page?.totalPages);

          try { this.changed.emit(res); } catch (e) {}

          const totalField: Record<string, any> = {};
          const avgField: Record<string, any> = {};

          dataset.items?.forEach((i: any) => {
            const key = `${i.root}.${i.code}`;
            if (i.x?.showTotal) totalField[key] = i;
            if (i.x?.showAvg) avgField[key] = i;
          });

          this.aggColumnTotalField = totalField;
          this.aggColumnAvgField = avgField;
          this.hasAggColumn = Object.keys(totalField).length > 0 || Object.keys(avgField).length > 0;

          content.forEach((e: any, index: number) => {
            this.entryIndex[e.id] = index;
            this.calculateRowMetadata(e);
          });

          this.entryList.set(content);
          this.calculateAggregations();
          this.cdr.detectChanges();
        },
        error: () => this.itemLoading.set(false)
      });
  }

  calculateRowMetadata(e: any) {
    const dataset = this.dataset();
    if (!dataset) return;

    e._isVisible = e._isVisible || {};
    e._computedValues = e._computedValues || {};
    e._actionVisible = e._actionVisible || {};
    e._actionUrls = e._actionUrls || {}; 

    this.rowClass[e.id] = compileTpl(dataset.x?.rowClass ?? '', { $: e?.data, $_: e, $prev$: e?.prev }, this.scopeId());

    const checkAction = (ac: any) => !this.isActionOfflineDisabled(ac.action) && this.preCheck(e, ac.pre, false);

    const processAction = (ac: any) => {
      e._actionVisible[ac.id] = checkAction(ac);
      if (ac.action === 'url') {
        e._actionUrls[ac.id] = this.compileTpl(ac.url, {$:e.data, $_:e, $prev$:e?.prev});
      }
    };
    this.actionsInline.forEach(processAction);
    this.actionsDropdown.forEach(processAction);

    // [...this.actionsInline, ...this.actionsDropdown].forEach(ac => {
    //   e._actionVisible[ac.id] = checkAction(ac);
    //   if (ac.action === 'url') e._actionUrls[ac.id] = this.compileTpl(ac.url, {$:e.data, $_:e, $prev$:e?.prev});
    // });

    dataset.items?.forEach((item: any) => {
      const uniqueKey = `${item.root}.${item.code}`;
      e._isVisible[uniqueKey] = this.preCheck(e, item.pre, false);

      const isBaseRoot = item.root === 'data' || item.root === 'prev';
      const fField = isBaseRoot ? this.form()[item.root]?.items[item.code] : this.form().data?.items[item.code];
      const rootData = isBaseRoot ? e[item.root] : e.approval?.[item.root]?.data;

      e._computedValues[uniqueKey] = this.getVal(fField, e, rootData);

      if (item.type === 'list' && e[item.root]?.[item.code]) {
        e[item.root][item.code].forEach((ch: any) => {
          ch._computedValues = ch._computedValues || {};
          item.subs?.forEach((fq: any) => {
            ch._computedValues[`${item.root}.${fq.code}`] = this.getVal(this.form()[item.root]?.items[fq.code], e, ch);
          });
        });
      }
    });
  }

  calculateAggregations() {
    const list = this.entryList();
    if (!list?.length || !this.hasAggColumn) return;

    this.aggColumnTotalValue = {};
    this.aggColumnAvgValue = {};

    const mathFields = Object.values({ ...this.aggColumnTotalField, ...this.aggColumnAvgField });
    if (mathFields.length === 0) return;

    list.forEach(e => {
      mathFields.forEach((element: any) => {
        const key = `${element.root}.${element.code}`;
        const rootData = (element.root === 'data' || element.root === 'prev') ? e[element.root] : e.approval?.[element.root]?.data;
        this.aggColumnTotalValue[key] = (this.aggColumnTotalValue[key] || 0) + (Number(rootData?.[element.code]) || 0);
      });
    });

    for (const code in this.aggColumnAvgField) {
      const element = this.aggColumnAvgField[code];
      const key = `${element.root}.${element.code}`;
      this.aggColumnAvgValue[key] = this.aggColumnTotalValue[key] / list.length;
    }
  }

  insertTextAtCursor(text: string) {
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(`{{${text}}}`));
      }
    }
  }

  blastList(data: any, ids?: number[]) {
    const params: any = {
      email: this.user().email, searchText: this.searchText(), filters: JSON.stringify({ ...this.filtersData(), ...this._param })
    };

    if (this.dataset()?.x?.enableStatusFilter) params.status = JSON.stringify(this.convertDisplayToStatus(this.statusFilterForm));
    if (ids) params.ids = ids;

    this.entryService.blastByDataset(this.dataset().id, data, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const result = `<table width="100%">
            <tr><td>${this.lang() === 'ms' ? 'Keseluruhan' : 'Total Entry'}</td><td>: ${res.totalCount}</td></tr>
            <tr><td>${this.lang() === 'ms' ? 'Dihantar' : 'Total Sent'}</td><td>: ${res.totalSent}</td></tr>
            <tr><td>${this.lang() === 'ms' ? 'Berjaya' : 'Success'}</td><td>: ${res.success ? 'Yes' : 'No'}</td></tr>
          </table>`;
          this.toastService.show(this.lang() === 'ms' ? 'Blast berjaya <br/>' + result : 'Blast successful <br/>' + result, { classname: 'bg-success text-light' });
        },
        error: err => {
          this.toastService.show(this.lang() === 'ms' ? 'Blast tidak berjaya' : 'Email blast failed: ' + err.error.message, { classname: 'bg-danger text-light' });
        }
      });
  }

  showHint = signal<boolean>(false);
  blastData = signal<any>({});

  blastEmail(tpl: any, data: any) {
    this.blastData.set(data);
    history.pushState(null, '', window.location.href);
    this.modalService.open(tpl, { backdrop: 'static', size: 'lg' }).result.then(res => this.blastList(res, undefined), () => {});
  }

  loadTemplate(template: any) {
    this.blastData.set(template);
  }

  deleteEntry(id: number) {
    if (confirm('Remove this entry?')) {
      this.entryService.delete(id, this.user().email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            const newPage = (this.numberOfElements() === 1 && this.pageNumber() === this.entryPages()) ? this.pageNumber() - 1 : this.pageNumber();
            this.pageNumber.set(Math.max(1, newPage));
            this.getEntryList(this.pageNumber());
            this.toastService.show(this.lang() === 'ms' ? 'Entri berjaya dibuang' : 'Entry removed successfully', { classname: 'bg-success text-light' });
          },
          error: () => {
            this.toastService.show(this.lang() === 'ms' ? 'Entri tidak berjaya dibuang' : 'Entry removal failed', { classname: 'bg-danger text-light' });
          }
        });
    }
  }

  inPopEntryId = signal<number | null>(null);
  inPopType = signal<string | null>(null);
  inPopFacet = signal<string | null>(null);
  inPopFormId = signal<number | null>(null);
  inPopParams = signal<any>({});

  inPop(content: any, entryId: any, formId: any, type: any, facet: any, params: any) {
    this.inPopEntryId.set(entryId);
    this.inPopType.set(type);
    this.inPopFacet.set(facet);
    this.inPopFormId.set(formId);
    if (params) { params.entryId = entryId; this.inPopParams.set(params); }

    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(() => this.getEntryList(this.pageNumber(), this.sort()), () => {});
  }

  runAction(url: string, inpop: boolean, content: any, entryId: any, formId: any, type: string, facet: string, params: any) {
    if (inpop) {
      this.inPop(content, entryId, formId, type, facet, params);
    } else {
      this.router.navigate([this.preurl + url], { queryParams: deepMerge({ entryId: entryId }, params) });
      this.modalService.dismissAll();
    }
  }

  actionUrl = signal<string>('');
  actionTitle = signal<string>('');
  deepMerge = deepMerge;

  openUrl(content: any, url: string, title: string) {
    this.actionUrl.set(url);
    this.actionTitle.set(title);
    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg', windowClass: 'browser-window' }).result.then(() => {}, () => {});
  }

  cancelEntry(id: number) {
    if (confirm(this.lang() === 'ms' ? 'Batalkan penghantaran entri ini?' : 'Cancel this entry submission?')) {
      this.entryService.cancel(id, this.user().email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.getEntryList(this.pageNumber()));
    }
  }

  removeApproval(entry: any, tierId: number) {
    this.entryService.removeApproval(entry.id, tierId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.getEntryList(this.pageNumber());
        delete entry.approval?.[tierId];
      });
  }

  getLookupInFilter() {
    this.dataset()?.filters?.forEach((f: any) => {
      const fieldData = this.form()[f.root]?.items[f.code];
      if (fieldData?.dataSource) {
        this.lookupKey[f.code] = { ds: fieldData.dataSource, type: fieldData.type };
        let param = null;
        try {
          param = fieldData.dataSourceInit ? new Function('$user$', 'return ' + fieldData.dataSourceInit)(this.user()) : null;
        } catch (e) {
          this.logService.log(`{list-${f.code}-dataSourceInit}-${e}`);
        }
        this._getLookup(f.code, param);
      }
    });
  }

  _getLookup = (code: string, param: any, cb?: any, err?: any) => {
    if (code) {
      this._getLookupObs(code, param, cb, err)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: res => { this.lookup[code] = res; this.cdr.detectChanges(); } });
    }
  };

  lookupDataObs: Record<string, Observable<any>> = {};

  _getLookupObs(code: string, param: any, cb?: any, err?: any): Observable<any> {
    const cacheId = 'key_' + btoaUTF(this.lookupKey[code].ds + hashObject(param ?? {}), null);
    if (this.lookupDataObs[cacheId]) return this.lookupDataObs[cacheId];

    if (this.lookupKey[code].type === 'modelPicker') {
      param = { ...param, email: this.user().email };
      this.lookupDataObs[cacheId] = this.entryService.getListByDatasetData(this.lookupKey[code].ds, param)
        .pipe(tap({ next: cb, error: err }));
    } else {
      this.lookupDataObs[cacheId] = this.lookupService.getByKey(this.lookupKey[code].ds, param)
        .pipe(tap({ next: cb, error: err }), map((res: any) => res.content));
    }
    return this.lookupDataObs[cacheId];
  }

  getVal(field: any, entry: any, data: any) {
    let value = field && data ? data[field.code] : null;
    if (field?.type === 'eval' && value == null && field.f) {
      try { value = this._eval(entry, data, field.f); } 
      catch (e) { this.logService.log(`{list-${field.code}-f}-${e}`); }
    }
    return value || '';
  }

  filtersData = signal<any>({});
  filtersCond: string = 'AND';

  editFilter(content: any, data: any) {
    this.filtersData.set({ ...data });
    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => { this.filtersData.set({ ...res }); this.getEntryList(1); }, () => {});
  }

  filterIsEmpty = computed(() => {
    return Object.keys(this.filtersData()).length === 0 && !this.hasActiveStatusFilter();
  });

  filterSize = computed(() => Object.keys(this.filtersData()).length + (this.hasActiveStatusFilter() ? 1 : 0));

  getAsList = splitAsList;

  hasActiveStatusFilter(): boolean {
    if (!this.dataset()?.x?.enableStatusFilter || !this.statusFilterForm) return false;
    return Object.values(this.statusFilterForm).some((tier: any) => Object.values(tier).includes(false));
  }

  compileTpl(html: string, data?: any) {
    let f = '';
    const obj = {
      $user$: this.user(),
      $conf$: this.appConfig,
      $: {}, $_: {},$prev$: {},
      $base$: this.base, 
      $baseUrl$: this.baseUrl, 
      $baseApi$: this.baseApi, 
      $this$: this._this,
      $param$: this._param,
      $token$: this.accessToken,
       ...data
    };      
    
    obj.$$_ = obj.$_?.approval || {};
    obj.$$ = {};     
    Object.keys(obj.$$_).forEach(k => {
       obj.$$[k] = obj.$$_[k]?.data || {}; 
    });

    try { f = compileTpl(html, obj, this.scopeId()); } 
    catch (e) { this.logService.log(`{list}-${e}`); }
    return f;
  }

  sortDir: Record<number, boolean> = {};
  sortField = signal<number | null>(null);
  sortFieldName = signal<string | null>(null);

  sortByField(id: number, name: string, field: string, dir: boolean) {
    this.sortField.set(id);
    this.sortFieldName.set(name);
    this.getEntryList(this.pageNumber(), field + '~' + (dir ? 'asc' : 'desc'));
  }

  groupFieldName = signal<string | null>(null);
  groupFieldCode = signal<string | null>(null);
  groupFieldId = signal<number | null>(null);
  groupFilter = signal<string | null>(null);

  groupByField(id: number | null, name: string | null, field: string | null) {
    this.groupFieldId.set(id);
    this.groupFieldCode.set(field);
    this.groupFieldName.set(name);
    this.groupFilter.set(null);
  }

  getPathForGrouping(rootDotCode: string | null) {
    let fieldPath = rootDotCode;
    if (!rootDotCode) return fieldPath;
    if (rootDotCode === 'currentStatus') return rootDotCode;
    if (rootDotCode === 'submissionDate') return (rootDotCode += '|date:yyyy-MM-dd');

    const split = rootDotCode.split('.');
    const field = this.form()[split[0]]?.items?.[split[1]];

    if (['select', 'radio'].includes(field?.type)) fieldPath += '.name';
    else if (field?.type === 'modelPicker') fieldPath += '.' + field?.bindLabel;
    else if (field?.type === 'date') fieldPath += `|date:${field.format || 'yyyy-MM-dd'}:'':${this.angularLocale()}`;
    
    return fieldPath;
  }

  nl2br = nl2br;
  br2nl = br2nl;
  selectedEntries = signal<Record<number, any>>({});

  checkAllEntry(checked: boolean) {
    this.selectedEntries.update(current => {
      const newSelection = { ...current };
      this.entryList().forEach(e => checked ? newSelection[e.id] = e : delete newSelection[e.id]);
      return newSelection;
    });
  }

  toggleSelect(i: any) {
    this.selectedEntries.update(current => {
      const newSelection = { ...current };
      newSelection[i.id] ? delete newSelection[i.id] : newSelection[i.id] = i;
      return newSelection;
    });
  }

  checkAllInput = signal<boolean>(false);
  checkSelect = (i: any) => !!this.selectedEntries()[i.id];

  bulkRemoveEntries() {
    const selectedKeys = Object.keys(this.selectedEntries()).map(Number);
    const isMs = this.lang() === 'ms';

    if (confirm(isMs ? 'Anda pasti untuk membuang semua entri ini?' : 'Remove all ' + selectedKeys.length + ' entries?')) {
      this.entryService.bulkDelete(selectedKeys, this.user().email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.selectedEntries.set({});
            this.checkAllInput.set(false);
            const newPage = (this.numberOfElements() === selectedKeys.length && this.pageNumber() === this.entryPages()) ? this.pageNumber() - 1 : this.pageNumber();
            this.pageNumber.set(Math.max(1, newPage));
            this.getEntryList(this.pageNumber());
            this.toastService.show(isMs ? 'Entri berjaya dibuang' : 'Entries removed successfully', { classname: 'bg-success text-light' });
          },
          error: (err) =>{
            this.toastService.show(isMs?'Entry tidak berjaya dibuang': 'Entries removal failed', {classname:'bg-danger text-light'})
          }
        });
    }
  }

  bulkEmail(content: any, data: any) {
    this.blastData.set({ ...data, bulk: true });
    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(res => this.blastList(res, Object.keys(this.selectedEntries()).map(Number)), () => {});
  }

  resyncDataset(dsId: number) {
    const isMs = this.lang() === 'ms';
    if (confirm(isMs ? 'Anda pasti untuk menyelaraskan data menggunakan dataset ini?' : 'Are you sure you want to resynchronize data using this dataset?')) {
      this.runService.resyncDataset(this.dataset()?.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.toastService.show(isMs ? 'Dataset berhasil diselaraskan' : 'Dataset successfully resynchronized', { classname: 'bg-success text-light' });
        });
    }
  }

  bulkEvalRun(f: string) { this._evalRun({}, f, true); }

  bulkCancelEntry() {
    const isMs = this.lang() === 'ms';
    if (!confirm(isMs ? 'Batalkan semua entri?' : 'Cancel selected entry submission?')) return;

    const entriesToCancel = Object.values(this.selectedEntries()).filter((e: any) => e.currentStatus !== 'drafted');
    
    if (!entriesToCancel.length) {
      this.toastService.show(isMs ? 'Tiada entri untuk dibatalkan' : 'No entries to cancel.', { classname: 'bg-warning text-dark' });
      return;
    }

    const requests = entriesToCancel.map((e: any) => this.entryService.cancel(e.id, this.user().email).pipe(catchError(() => of(null))));

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: results => {
          const successCount = results.filter(r => r !== null).length;
          const failCount = results.length - successCount;

          if (successCount > 0) {
            this.toastService.show(
              isMs ? `${successCount} entri berjaya dibatalkan` : `${successCount} entries successfully retracted`,
              { classname: 'bg-success text-light' }
            );
          }

          if (failCount > 0) {
            this.toastService.show(
              isMs ? `${failCount} entri gagal dibatalkan` : `Failed to retract ${failCount} entries`,
              { classname: 'bg-danger text-light' }
            );
          }
          
          this.selectedEntries.set({});
          this.getEntryList(this.pageNumber());
        },
        error: () => {
          this.toastService.show(isMs ? 'Ralat pelayan berlaku.' : 'A server error occurred.', { classname: 'bg-danger text-light' });
        }
      });
  }

  private evalCache = new Map<string, Function>();
  
  _evalRun = (entry: any, f: string, bulk: boolean) => {
    if (!f) return undefined;
    let fn = this.evalCache.get(f);
    if (!fn) {
      fn = new Function(...this.EVAL_PARAMS, `return ${f}`);
      this.evalCache.set(f, fn);
    }
    
    const $$_ = entry?.approval || {};
    const $$: any = {};     Object.keys($$_).forEach(k => { $$[k] =$$_[k]?.data || {}; });

    return fn(
      this.runService.$app(), entry, entry?.data, entry?.prev, $$_,$$, this.selectedEntries(), 
      this.user(), this.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.submit, 
      this.form()?.items, this.form(), this._this, this.loadScript, this.$digest$, this._param, 
      this.log, this.$toast$, this.updateField, this.updateLookup, this.base, this.baseUrl, 
      this.baseApi, this.lookup, dayjs, ServerDate, this.runService?.$live$(this.liveSubscription, this.$digest$), 
      this.accessToken, deepMerge, this.runService.web, bulk
    );
  };

  private preCache = new Map<string, Function>();
  _pre = (entry: any, f: string, bulk: boolean) => {
    if (!f) return true;
    let fn = this.preCache.get(f);
    if (!fn) {
      fn = new Function(...this.PRE_PARAMS, `return ${f}`);
      this.preCache.set(f, fn);
    }

    const $$_ = entry?.approval || {};
    const $$: any = {};     Object.keys($$_).forEach(k => { $$[k] =$$_[k]?.data || {}; });

    return fn(
      this.runService.$app(), entry, entry?.data, entry?.prev, $$_,$$, this.selectedEntries(), 
      this.user(), this.appConfig, this._this, this._param, this.log, this.base, this.baseUrl, 
      this.baseApi, this.lookup, dayjs, ServerDate, this.accessToken, bulk
    );
  };

  _eval = (data: any, entry: any, v: string) => this._evalRun(entry, v, false);

  preCheck(entry: any, f: string, bulk: boolean) {
    try { return !f || this._pre(entry, f, bulk); } 
    catch (e) { this.logService.log(`{list}-${e}`); return true; }
  }

  hasVisibleActions = computed(() => {
    if (!this.dataset()?.showAction) return false;
    return (this.entryList() || []).some(entry => 
      this.actionsInline.some(ac => entry._actionVisible?.[ac.id]) ||
      this.actionsDropdown.some(ac => entry._actionVisible?.[ac.id])
    );
  });

  isActionOfflineDisabled(actionType: string): boolean {
    return this.offline() && ['approve', 'screen', 'prev-screen', 'prev', 'extend', 'facet', 'prev-facet', 'prev-prev', 'url', 'function', 'retract', 'delete'].includes(actionType);
  }

  executeRowAction(ac: any, i: any, inPopTpl: any, openUrlTpl: any) {
    if (this.isActionOfflineDisabled(ac.action)) return;

    const fData = this.form()?.data;
    const fPrev = this.form()?.prev;
    const evalParams = this._eval(i.data, i, ac.params);

    const actionMap: Record<string, any> = {
      'view': [fData?.id, 'view', ac.action, fData?.id],
      'view-single': [ac.next, 'view', ac.action, ac.next],
      'prev-view': [fPrev?.id, 'view', 'view', fPrev?.id, i.prev?.$id],
      'edit': [fData?.id, 'form', ac.action, fData?.id],
      'edit-single': [ac.next, 'form', ac.action, ac.next],
      'prev-edit': [fPrev?.id, 'form', 'edit', fPrev?.id, i.prev?.$id],
      'approve': [fData?.id, 'approve', 'view', fData?.id],
      'screen': [ac.next, 'screen', 'screen', ac.next],
      'prev-screen': [ac.next, 'screen', 'screen', ac.next, i.prev?.$id],
      'prev': [ac.next, 'form', 'prev', ac.next],
      'extend': [ac.next, 'form', 'edit', ac.next],
      'facet': [fData?.id, 'form', ac.next, fData?.id],
      'prev-facet': [fPrev?.id, 'form', ac.next, fPrev?.id, i.prev?.$id],
      'prev-prev': [ac.next, 'form', 'prev', ac.next, i.prev?.$id]
    };

    if (actionMap[ac.action]) {
      const [pathId, type, facet, formId, overrideEntryId] = actionMap[ac.action];
      this.runAction(`/form/${pathId}/${facet}`, ac.inpop, inPopTpl, overrideEntryId || i.id, formId, type, facet, evalParams);
    } else if (ac.action === 'url') {
      this.openUrl(openUrlTpl, this.compileTpl(ac.url, { $: i.data, $_: i, $prev$: i?.prev }), ac.label);
    } else if (ac.action === 'function') {
      this._evalRun(i, ac.f, false);
    } else if (ac.action === 'retract' && i.currentStatus !== 'drafted') {
      this.cancelEntry(i.id);
    } else if (ac.action === 'delete') {
      this.deleteEntry(i.id);
    }
  }

  $digest$ = () => {
    const list = this.entryList();
    if (list?.length) {
      list.forEach(e => this.calculateRowMetadata(e));
      this.calculateAggregations();
    }
    this.cdr.detectChanges();
  };

  liveSubscription: Record<string, any> = {};
  loadScript = loadScript;
  log = (logContent: any) => this.logService.log(JSON.stringify(logContent));
  $toast$ = (content: any, opt: any) => this.toastService.show(content, opt);

  updateField = (entryId: number, value: any, callback?: any, error?: any) => {
    return lastValueFrom(this.entryService.updateField(entryId, value, this.dataset()?.appId).pipe(
      tap({ next: callback, error }), tap(() => this.getEntryList(this.pageNumber()))
    ));
  };

  httpGet = (url: string, callback?: any, error?: any) => lastValueFrom(this.runService.httpGet(url, callback, error));
  httpPost = (url: string, body: any, callback?: any, error?: any) => lastValueFrom(this.runService.httpPost(url, body, callback, error));
  endpointGet = (code: string, params: any, callback?: any, error?: any) => lastValueFrom(this.runService.endpointGet(code, this.dataset().appId, params, callback, error));

  updateLookup = (entryId: number, value: any, callback?: any, error?: any) => {
    return lastValueFrom(this.entryService.updateLookup(entryId, value, this.dataset()?.appId).pipe(tap({ next: callback, error })));
  };

  submit = (entry: any, resubmit: boolean) => {
    this.entryService.submit(entry.id, this.user().email, resubmit)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (this.form().onSubmit) {
            try { this._evalRun(entry.data, this.form()['data'].onSubmit, false); } 
            catch (e) { this.logService.log(`{form-${this.form().title}-onSubmit}-${e}`); }
          }
          entry = deepMerge(entry, res);
          this.toastService.show(this.lang() === 'ms' ? 'Entri telah dihantar' : 'Entry submitted successfully', { classname: 'bg-success text-light' });
        },
        error: () => {
          this.toastService.show(this.lang() === 'ms' ? 'Entri gagal dihantar' : 'Entry submission failed', { classname: 'bg-danger text-light' });
        }
      });
  };

  inPopTitle = signal<string>('');
  formLoaded(form: any) { this.inPopTitle.set(form?.title || 'Form'); }
  screenLoaded(screen: any) { this.inPopTitle.set(screen?.title); }

  fclose() {}

  ngOnDestroy() {
    Object.keys(this.liveSubscription).forEach(key => this.liveSubscription[key]?.unsubscribe());

    if (this.registeredScopeId) {
      const key = '_this_' + this.registeredScopeId;
      if (!Reflect.deleteProperty(window, key)) (window as any)[key] = undefined;
    }

    if (this._this) Object.keys(this._this).forEach(key => delete this._this[key]);
  }
}