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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, input, output, signal, DestroyRef, forwardRef, viewChild, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbDateAdapter, NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
// import * as dayjs from 'dayjs';
import dayjs from 'dayjs';
import { base, baseApi } from '../../_shared/constant.service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { ServerDate, compileTpl, deepMerge, tblToExcel, btoaUTF, hashObject } from '../../_shared/utils';
// import { UserEntryFilterComponent } from '../../_shared/component/user-entry-filter/user-entry-filter.component';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { DecimalPipe, JsonPipe, NgClass, NgStyle, SlicePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';
import { Observable } from 'rxjs';
import { first, map, shareReplay } from 'rxjs/operators';
import { FieldViewComponent } from '../_component/field-view.component';
import { ViewComponent } from '../view/view.component';

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./chart.component.scss', '../../../assets/css/flip.css'],
    providers: [
        { provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
        provideEcharts(),
        // provideEchartsCore({ echarts })
    ],
    imports: [FaIconComponent, NgClass, NgStyle, NgxEchartsDirective, UserEntryFilterComponent, SlicePipe,
       NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast,
       DecimalPipe, FieldViewComponent, ViewComponent
    ]
})
export class ChartComponent implements OnInit {

  private entryService = inject(EntryService);
  private lookupService = inject(LookupService);
  private runService = inject(RunService);
  private modalService = inject(NgbModal);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef); // <-- Added for subscription cleanup


  chart = input<any>();
  maxState = input<any>();
  onEnterMaxState = output<number>();
  onExitMaxState = output<boolean>();
  chartOption = signal<any>({});
  chartDataset = signal<any>(null);
  flipped = signal<boolean>(false);
  app = computed<any>(() => this.runService.$app());
  user = computed<any>(() => this.runService.$user());
  param = input<any>({});
  baseUrl = computed<any>(() => this.runService.$baseUrl());
  form = signal<any>({});  
  _this = {};
  lang = computed(() => this.app().x?.lang);
  scopeId = input<any>();

  drillTpl = viewChild<TemplateRef<any>>('drillTpl');

  inPopParams: any = {};
  drillDatasetId: any;

  base: string = base;
  baseApi: string = baseApi;

  typeMapping = {
    pie: "pie",
    doughnut: "pie",
    rose: "pie",
    bar: "bar",
    line: "line",
    area: "line",
    hbar: "bar",
    hline: "line",
    gauge: "gauge",
    radar: "radar"
  }

  constructor() {}

  builtInItems = {
    $id: { label: "System ID", code: '$id', type: 'number', subType: 'number' },
    $code: { label: "System Code", code: '$code', type: 'text', subType: 'input' },
    $counter: { label: "System Counter", code: '$counter', type: 'number', subType: 'number' },
    $statusText: { label: "Current Status Text", code: '$statusText', type: 'text', subType: 'input' }
  }

  ngOnInit() {
    if (this.chart().formId) {
      this.runService.getRunForm(this.chart().formId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            // this.form.set({
            //   data: res,
            //   prev: res.prev || null
            // });

            this.form.set({
              data: {
                ...res,
                items: deepMerge(this.builtInItems, res.items),
              },
              prev: res.prev || null
            });

            
            this.getLookupInFilter();
          },
          error: (err) => {
            console.error(`Error fetching form data: ${err.message}`);
          },
      })
    }
    this.loadChartData();
  }

  loadChartData() {
    const params = { filters: JSON.stringify(this.filtersData), email: this.user()?.email };
    
    // utk handle $conf$, if ada $conf$, override dengan value dari frontend
    if (this.chart().presetFilters) {
      Object.keys(this.chart().presetFilters)
        .filter(k => (this.chart().presetFilters[k] + "").includes("$conf$"))
        .forEach(k => {
          params[k] = compileTpl(this.chart().presetFilters[k] ?? '', {}, this.scopeId())
        })
    }

    this.entryService.getChartData(this.chart().id, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.chartDataset.set(res);
        let rv = res.data;
        if (this.chart().f) {
          try {
            rv = this._eval(this.chart(), res.data, this.chart().f);
          } catch (e) { console.log(`{chart-${this.chart().title}-transformFn}-${e.message}`) }
          // this.chartDataset.data = rv;
          this.chartDataset.set({...res, data: rv});
        }
        this.plotChart(this.chart(), this.chartDataset())
      })
  }


  hideZero = () => {
    return (param) => {
      return param.data[param.seriesIndex + 1] == 0 ? '' : param.data[param.seriesIndex + 1];
    }
  }

  plotChart(c, cd) {
    this.flipped.set(c.x && c.x.flipped);
    
    let ecOption: any = {
      tooltip: c.x && c.x.tooltip ? { trigger: 'axis', showContent: true, axisPointer: { type: 'shadow' } } : {},
      legend: { type: 'scroll' },
      grid: { containLabel: true },
      dataset: { source: cd.data },
      series: [
        {
          type: this.typeMapping[c.type],
          label: { bleedMargin: 0, show: true }
        }
      ]
    };

    // --- MERGED CARTESIAN LOGIC (Bar, Line, Area, HBar, HLine) ---
    const cartesianTypes = ['line', 'bar', 'area', 'hline', 'hbar'];
    
    if (cartesianTypes.includes(c.type)) {
      const isHorizontal = ['hline', 'hbar'].includes(c.type);

      // 1. Swap Axes Dynamically based on orientation
      const categoryAxis = { type: 'category', axisLabel: { interval: 0, rotate: 45 } };
      ecOption.xAxis = isHorizontal ? {} : categoryAxis;
      ecOption.yAxis = isHorizontal ? categoryAxis : {};

      if (cd.series) {
        ecOption.tooltip = { trigger: 'axis', axisPointer: { type: 'shadow' } };

        let series = [];
        let isSingleSeries = cd.data.length === 2;

        // 2. Loop through the total ROWS, not the columns
        for (let i = 1; i < cd.data.length; i++) {
          let stack = c.x && c.x.stack;

          let seriesItem: any = {
            type: this.typeMapping[c.type],
            seriesLayoutBy: 'row', 
            stack: stack ? 'Stack 1' : undefined,
            smooth: c.x && c.x.smooth,
            label: {
              show: false,
              position: stack ? 'inside' : 'top',
              formatter: stack ? this.hideZero() : undefined
            }
          };

          // Apply colorful bars if it's a bar/hbar chart and only has one series
          if (['bar', 'hbar'].includes(c.type) && isSingleSeries) {
            seriesItem.colorBy = 'data';
          }
          
          series.push(seriesItem);
        }
        ecOption.series = series;
        
      } else {
        // --- FALLBACK FOR "series": false ---
        if (['bar', 'hbar'].includes(c.type)) {
          ecOption.series[0].colorBy = 'data';
        }
        // Add tooltip for single series too
        ecOption.tooltip = { trigger: 'axis', axisPointer: { type: 'shadow' } };
        ecOption.legend.show = false; // Hide legend if no series defined
      }
    }

    // --- Multiple Pie / Doughnut / Rose Logic ---
    if (['pie', 'doughnut', 'rose'].includes(c.type)) {
      if (cd.series && cd.data.length > 2) {
        // MULTIPLE PIES: Auto-Arranging Grid Layout
        var series = [];
        var titles = []; 
        
        // FIX 1: Loop through the ROWS (Series), not the columns!
        var numberOfSeries = cd.data.length - 1; 
        
        var cols = Math.ceil(Math.sqrt(numberOfSeries)); 
        var rows = Math.ceil(numberOfSeries / cols); 

        var containerHeight = c.height || 450;
        var fixedLegendHeightPx = 35; 
        
        var topLegendOffset = (fixedLegendHeightPx / containerHeight) * 100; 
        var usableGridHeight = 100 - topLegendOffset;

        var cellWidth = 100 / cols;
        var cellHeight = usableGridHeight / rows;
        var maxRadius = (100 / Math.max(cols, rows)) * 0.80; 

        for (var i = 1; i <= numberOfSeries; i++) {
          var layoutIdx = i - 1; 
          var colIdx = layoutIdx % cols; 
          var rowIdx = Math.floor(layoutIdx / cols); 

          var centerX = (colIdx + 0.5) * cellWidth + '%'; 
          var centerY = (rowIdx + 0.5) * cellHeight + topLegendOffset + 3 + '%'; 

          var pieSeries: any = {
            type: 'pie',
            center: [centerX, centerY], 
            
            // FIX 2: Map the name to the Row Header (e.g., "Lelaki")
            name: cd.data[i][0], 
            
            // FIX 3: Tell ECharts to read this pie across the row!
            seriesLayoutBy: 'row',
            
            encode: {
              itemName: 0, // Slice Labels come from the Column Headers ("Johor", "Kedah")
              value: i     // Slice Values come from the current Row (38, 12)
            },
            label: {
              show: true,
              position: 'inside',
              formatter: '{d}%',
              fontSize: 13, 
              fontWeight: 'bold',
              color: '#fff' 
            },
            labelLine: { show: false }
          };

          if (c.type === 'rose') {
            pieSeries.radius = [15, `${maxRadius}%`]; 
            pieSeries.roseType = 'radius';
          } else if (c.type === 'doughnut') {
            pieSeries.radius = [`${maxRadius * 0.4}%`, `${maxRadius}%`];
          } else {
            pieSeries.radius = `${maxRadius}%`; 
          }

          series.push(pieSeries);

          titles.push({
            // FIX 4: Update title to match the Row Header
            text: cd.data[i][0], 
            left: centerX,
            top: (rowIdx * cellHeight) + topLegendOffset + 2 + '%', 
            textAlign: 'center',
            textStyle: { 
              fontSize: 13, fontWeight: 'bold', width: 180, overflow: 'break', lineHeight: 16 
            } 
          });
        }
        
        ecOption.series = series;
        ecOption.title = titles; 
        
        if (!ecOption.legend) ecOption.legend = {};
        ecOption.legend.top = '0%';
        ecOption.legend.type = 'scroll';

      } else {
        // SINGLE PIE: Original fallback logic
        if (c.type == 'rose') {
          ecOption.series[0].radius = [20, 110];
          ecOption.series[0].roseType = 'radius';
        }
        if (c.type == 'doughnut') {
          ecOption.series[0].radius = ['50%', '70%'];
        }
        
        ecOption.series[0].label.formatter = function(params) {
           let val = Array.isArray(params.value) ? params.value[1] : params.value.value;
           let name = Array.isArray(params.value) ? params.value[0] : params.value.name;
           return `${name}: ${val} (${params.percent}%)`;
        };
      }
    }

    if (['gauge'].includes(c.type)) {
      ecOption.series[0].label.formatter = function(params){
        return `${params.value.name}: ${params.value.value} (${params.percent}%)`
      };
    }

    if (c.type == 'area') {
      // Loop safely over the generated series array
      for (var i = 0; i < ecOption.series.length; i++) {
        ecOption.series[i].areaStyle = {};
      }
    }

    if (c.type == 'gauge') {
      ecOption.series[0].data = ecOption.dataset.source;
      ecOption.series[0].title = { show: false };
    }

    if (c.type == 'radar') {
      ecOption.series[0].title = { show: false };
      ecOption.series[0].areaStyle = {opacity:0.3};

      var rdata = [];
      var indicator = [];
      var overallMax = 0;

      if (cd.series) {
        for (var i = 1; i < cd.data.length; i++) {
          var obj = {
            name: cd.data[i][0],
            value: []
          }
          for (var a1 = 1; a1 < cd.data[i].length; a1++) {
            obj.value.push(cd.data[i][a1]);
            if (cd.data[i][a1] > overallMax) {
              overallMax = cd.data[i][a1];
            }
          }
          rdata.push(obj);
        }
        for (var i = 1; i < cd.data[0].length; i++) {
          var stack = c.x && c.x.stack;
          indicator.push({
            name: cd.data[0][i]
          })
        }
      } else {
        var obj = {
          name: c.title,
          value: []
        }
        for (var i = 0; i < cd.data.length; i++) {
          indicator.push({ name: cd.data[i].name })
          obj.value.push(cd.data[i].value);
          if (cd.data[i].value > overallMax) {
            overallMax = cd.data[i].value;
          }
        }
        rdata.push(obj);
      }

      ecOption.radar = { indicator: indicator.map(i=>{i.max=overallMax;return i}) };
      ecOption.series[0].data = rdata;
    }

    if (c.x?.ecOpt) {
      this.chartOption.set(deepMerge(ecOption, this._eval(c, cd.data, c.x?.ecOpt)));
    } else {
      this.chartOption.set(ecOption);
    }
  }


  exportExcel() {
    tblToExcel(this.chart().title, document.querySelector("#chart_" + this.chart().id).outerHTML)
  }

  filtersData: any = {};
  filtersCond: string = "AND";
  editFilterItems: any;
  editFilter(content, data) {
    this.filtersData = Object.assign({}, data);
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        this.filtersData = res; // re-assign sbb mungkin da Reset ({})
        localStorage.setItem("filter-" + this.chart().id, JSON.stringify(this.filtersData));
        this.loadChartData();
      }, res => { });
  }

  checkFilter = () => Object.keys(this.filtersData).length === 0 && this.filtersData.constructor === Object

  // --- DRY Caching Engine for _eval ---
  private evalCache = new Map<string, Function>();

  _eval = (chart, dataset, v) => {
    const bindings = {
      $app$: this.app(),
      $chart$: chart,
      $dataset$: dataset,
      $eachValue$: (fn) => this.eachValue(chart, dataset, fn),
      $eachName$: (fn) => this.eachName(chart, dataset, fn),
      $user$: this.user(),
      $conf$: this.runService?.appConfig,
      $this$: this._this,
      $param$: this.param(),
      $base$: this.base,
      $baseUrl$: this.baseUrl(),
      $baseApi$: this.baseApi,
      dayjs,
      ServerDate
    };

    const argNames = Object.keys(bindings);
    const cacheKey = `${argNames.join(',')}_${v}`;
    
    let fn = this.evalCache.get(cacheKey);
    if (!fn) {
      fn = new Function(...argNames, `return ${v}`);
      this.evalCache.set(cacheKey, fn);
    }
    
    return fn(...Object.values(bindings));
  }

  eachValue = ($chart$, $dataset$, fn) => { // $eachValue$($chart$,$dataset$, function(res){})
    if ($chart$.series) {
      let data = $dataset$.splice(1);
      return $dataset$.concat(data.map(val => {
        let s = val.splice(1);
        return val.concat(s.map(e => fn(e)));
      }));
    } else {
      return $dataset$.map(val => { val.value = fn(val.value); return val; })
    }
  }
  eachName = ($chart$, $dataset$, fn) => {
    if ($chart$.series) {
      $dataset$[0].map(e => fn(e));
      return $dataset$;
    } else {
      return $dataset$.map(val => { val.name = fn(val.name); return val; })
    }
  }

  lookupIds: any;
  lookupKey = {};
  lookup = {};
  // Problem if prev form not yet loaded
  getLookupInFilter() {
      // console.log("getLookupInFilter")
    this.chart().filters.forEach(f => {
      // console.log("getLookupInFilter-foreach",f)
      let ds = this.form()[f.root]?.items[f.code]?.dataSource;
      let dsInit = this.form()[f.root]?.items[f.code]?.dataSourceInit;
      let type = this.form()[f.root]?.items[f.code]?.type;
      // console.log("daaaa", ds, dsInit, type)
      if (ds) { // only load filter with ds, which is lookup
        this.lookupKey[f.code] = {
          ds: ds,
          type: type
        }
        var param = null;
        try {
          param = new Function('$user$', 'return ' + dsInit)(this.user())
        } catch (e) { console.log(`{list-${f.code}-dataSourceInit}-${e.message}`) }
        this.getLookup(f.code, dsInit ? param : null);
      }
    })
  }

  // Use shareReplay caching for duplicate lookup requests
  private lookupDataObs: { [key: string]: Observable<any> } = {};

  getLookup = (code, dsInit?: any) => {
    // console.log("#######getLookup");
    if (!code) return;

    let param = dsInit;
    const type = this.lookupKey[code].type;
    const ds = this.lookupKey[code].ds;

    if (type === 'modelPicker') {
      param = dsInit || { email: this.user()?.email };
    } else {
      param = param ? { ...param } : {}; // Safely clone or initialize
    }

    const cacheId = 'key_' + btoaUTF(ds + hashObject(param), null);

    if (!this.lookupDataObs[cacheId]) {
      if (type === 'modelPicker') {
        this.lookupDataObs[cacheId] = this.entryService.getListByDatasetData(ds, param)
          .pipe(first(), shareReplay(1));
      } else {
        this.lookupDataObs[cacheId] = this.lookupService.getByKey(ds, param)
          .pipe(first(), map(res => res.content), shareReplay(1));
      }
    }

    this.lookupDataObs[cacheId]
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        // Because map() already unrolls .content for non-modelPickers above, we can just assign the raw result
        this.lookup[code] = res;
        this.cdr.detectChanges();
      });
  }

  enterMaxState() {
    this.onEnterMaxState.emit(this.chart().id);
  }

  exitMaxState() {
    this.onExitMaxState.emit(false);
  }

  entryList = signal<any[]>([]);
  entryTotal: number = 0;
  entryPages:number = 0;
  entryElements:number = 0;
  entryPageNumber:number = 1;
  pageSize: number = 25;

  entryLoading = signal<boolean>(false)

  onChartClick(event: any) {
    this.entryPageNumber = 1;
    if (!this.chart().x?.drill) {
      return; 
    }

    // --- MISSING FIX 1: ZERO-VALUE GUARD FOR ECHARTS CANVAS CLICKS ---
    let clickedValue = event.value;

    // A. Matrix Array format (Bar/Line Series)
    if (Array.isArray(event.value)) {
        clickedValue = event.value[event.dataIndex + 1];
    } 
    // B. Table mock click or standard Pie chart
    else if (event.value !== undefined) {
        clickedValue = event.value;
    } else if (event.data && event.data.value !== undefined) {
        clickedValue = event.data.value;
    }

    // Guard Clause: Stop execution immediately if the value is 0
    if (clickedValue === 0 || 
        clickedValue === '0' || 
        clickedValue === null || 
        clickedValue === '' || 
        clickedValue === '-') {
        console.log("Drill-down aborted: Value is 0");
        return; 
    }

    // 1. Determine which form fields to filter
    let drillCodeField = this.chart().fieldCode;
    let drillSeriesField = this.chart().fieldSeries;

    if (this.chart().x?.swap) {
        const temp = drillCodeField;
        drillCodeField = drillSeriesField;
        drillSeriesField = temp;
    }

    // 2. Keep any existing global filters (Date ranges, User Dropdowns, etc.)
    this.inPopParams = { ...this.filtersData };

    // 3. Extract the clicked data from the ECharts event
    let xCategory = event.name;         // e.g., "Pengesahan: Lulus" or "Johor" (X-Axis)
    let legendSeries = event.seriesName; // e.g., "Lelaki" (Legend)

    // 4. Recover the raw values using the dictionary from the backend (if translated)
    // Optional chaining (?.) prevents errors if _dict is missing on normal charts
    let dict = this.chartDataset()?._dict || {}; 
    
    // If the category/series exists in the dict, map it back to the raw string (e.g. "0_##_approved")
    // Otherwise, keep the original string.
    let rawCategoryCode = dict[xCategory] || xCategory;
    let rawSeriesCode = dict[legendSeries] || legendSeries;

    // --- NEW: Handle 'n/a' null translations ---
    if (rawCategoryCode === 'n/a') {
        rawCategoryCode = '~null';
    }
    if (rawSeriesCode === 'n/a') {
        rawSeriesCode = '~null';
    }

    // 5. Helper function to properly assign filters, specifically handling virtual fields
    const applyDrillFilter = (field: string, rawValue: string) => {
      if (field && field.includes(',')) {
          console.warn(`Drill-down ignored for Cartesian field [${field}]. Please define 'drillCodeField' or 'drillSeriesField' in chart settings.`);
          return;
      }
      // If it's our virtual status text, split it into ACTUAL database columns!
      if (field === '$.$statusText' && typeof rawValue === 'string' && rawValue.includes('_##_')) {
          let parts = rawValue.split('_##_');
          let tier = parts[0];
          let status = parts[1];

          // Drop the tier filter completely for drafted/submitted to prevent NULL vs 0 database mismatches
          if (['drafted', 'submitted'].includes(status.toLowerCase())) {
              this.inPopParams['$_.currentStatus'] = status;
          } else {
              this.inPopParams['$_.currentTier'] = tier;
              this.inPopParams['$_.currentStatus'] = status;
          }
      } else {
          // Standard fields proceed normally
          this.inPopParams[field] = rawValue;
      }
    };

    // 6. Apply Category (X-Axis) filter
    if (drillCodeField && xCategory) {
      applyDrillFilter(drillCodeField, rawCategoryCode);
    }

    // 7. Apply Series (Legend / Stacked segment) filter
    if (drillSeriesField && legendSeries) {
      applyDrillFilter(drillSeriesField, rawSeriesCode);
    }

    // 8. Open the modal!
    const tpl = this.drillTpl(); 
    
    if (tpl) {      
      this.getEntryList(1); // Load the first page of entries

      history.pushState(null, null, window.location.href);
      this.modalService.open(tpl, { backdrop: 'static', size: 'lg' });
    }
  }

  inPopEntryId = signal<number>(null);
  openDrillView(content, entry: any) {
    if (!this.chart().x?.drill) {
      return; 
    }

    this.inPopEntryId.set(entry.id);


    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' });
  }

  getEntryList(pageNumber: number) {

    this.entryLoading.set(true);
    this.entryList.set([]);
    this.entryTotal = 0; // <-- Add this
    this.entryPages = 0; // <-- Add this
    this.cdr.detectChanges();


    this.entryService.getListByChart(this.chart().id, { filters: JSON.stringify(this.inPopParams), email: this.user()?.email, page: pageNumber-1, size: this.pageSize  })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res=>{
          this.entryLoading.set(false);
        
          this.entryPages = res.page?.totalPages;
          this.entryElements = res.content?.length;

          this.entryTotal = res.page?.totalElements;

          this.entryList.set(res.content);
          this.cdr.detectChanges();
        },
        error: err=>{
          this.entryLoading.set(false);
        }
      });
  }

  closeAll(){
    this.modalService.dismissAll();
  }

}