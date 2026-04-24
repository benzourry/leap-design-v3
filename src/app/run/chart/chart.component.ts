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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, input, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbDateAdapter, NgbModal } from '@ng-bootstrap/ng-bootstrap';
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
    imports: [FaIconComponent, NgClass, NgStyle, NgxEchartsDirective, UserEntryFilterComponent, SlicePipe, DecimalPipe]
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

  ngOnInit() {
    if (this.chart().formId) {
      this.runService.getRunForm(this.chart().formId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.form.set({
              data: res,
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
    // this.chartDataset[c.id] = cd;
    this.flipped.set(c.x && c.x.flipped);
    let ecOption:any = {
      tooltip: c.x && c.x.tooltip ? { trigger: 'axis', showContent: true, axisPointer: { type: 'shadow' } } : {},
      legend: {
        type: 'scroll',
      },
      grid: {
        containLabel: true,
      },
      dataset: {
        source: cd.data
      },
      series: [
        {
          type: this.typeMapping[c.type],
          label: { bleedMargin: 0, show: true }
        }
      ]
    };
    if (['line', 'bar', 'area'].indexOf(c.type) > -1) {
      ecOption.xAxis = { type: 'category', axisLabel: { interval: 0, rotate: 45 } };
      ecOption.yAxis = {};

      if (c.series) {
        var series = []
        for (var i = 1; i < cd.data[0].length; i++) {
          var stack = c.x && c.x.stack;
          series.push({
            type: this.typeMapping[c.type],
            stack: stack ? 'Stack 1' : undefined,
            smooth: c.x && c.x.smooth,
            label: { 
              // normal: { http://localhost:4200/#/run/1115/form/3092/edit?entryId=169507
                show: true, 
                position: stack ? 'inside' : 'top', 
                formatter: stack ? this.hideZero() : undefined 
              // } 
            }
          })
        }
        ecOption.series = series;
      }
    }
    if (['hline', 'hbar'].indexOf(c.type) > -1) {
      ecOption.xAxis = {};
      ecOption.yAxis = { type: 'category', axisLabel: { interval: 0, rotate: 45 } };

      if (c.series) {
        var series = [];
        var stack = c.x && c.x.stack;
        for (var i = 1; i < cd.data[0].length; i++) {
          series.push({
            type: this.typeMapping[c.type],
            stack: stack ? 'Stack 1' : undefined,
            smooth: c.x && c.x.smooth,
            label: { 
              // normal: { http://localhost:4200/#/run/1115/form/3092/edit?entryId=169507
                show: true, 
                position: c.x && c.x.stack ? 'inside' : 'right', 
                formatter: stack ? this.hideZero() : undefined 
              // } 
            }
          })
        }
        ecOption.series = series;
      }
    }
    
    if (c.type == 'rose') {
      ecOption.series[0].radius = [20, 110];
      ecOption.series[0].roseType = 'radius';
      ecOption.series[0].label.formatter = function(params){
          return `${params.value.name}: ${params.value.value} (${params.percent}%)`
      };
    }
    if (['pie', 'gauge'].includes(c.type)) {
      ecOption.series[0].label.formatter = function(params){
        return `${params.value.name}: ${params.value.value} (${params.percent}%)`
      };
    }
    if (c.type == 'doughnut') {
      ecOption.series[0].radius = ['50%', '70%'];
    }

    if (c.type == 'area') {
      // var series = []
      for (var i = 1; i < cd.data[0].length; i++) {
        ecOption.series[i - 1].areaStyle = {};
        // series.push({ type: this.typeMapping[c.type], label: { normal: { show: true, position: 'top' } } })
      }
      // this.ecOption[c.id].series = series;
      // this.ecOption[c.id].series[0].areaStyle = {};
    }
    if (c.type == 'gauge') {
      ecOption.series[0].data = ecOption.dataset.source;
      ecOption.series[0].title = { show: false };
      // this.ecOption[c.id].series[0].max = 280;
    }
    if (c.type == 'radar') {

      ecOption.series[0].title = { show: false };
      ecOption.series[0].areaStyle = {opacity:0.3};

      // radar require special data format/structure
      // create data:[] for radar, refer https://echarts.apache.org/examples/en/editor.html?c=radar
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
        // create indicator
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
    if (c.x && c.x.stacked) {

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

}