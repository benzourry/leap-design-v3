import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { NgbDateAdapter, NgbModal } from '@ng-bootstrap/ng-bootstrap';
// import * as dayjs from 'dayjs';
import dayjs from 'dayjs';
import { base, baseApi } from '../../_shared/constant.service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { ServerDate, deepMerge, tblToExcel } from '../../_shared/utils';
// import { UserEntryFilterComponent } from '../../_shared/component/user-entry-filter/user-entry-filter.component';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { JsonPipe, NgClass, NgStyle, SlicePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';


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
    imports: [FaIconComponent, NgClass, NgStyle, NgxEchartsDirective, UserEntryFilterComponent, SlicePipe]
})
export class ChartComponent implements OnInit {


  private entryService = inject(EntryService);
  private lookupService = inject(LookupService);
  private runService = inject(RunService);
  private modalService = inject(NgbModal);


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
        .subscribe({
          next: (res) => {
            this.form.set({
              data: res,
              prev: res.prev || null
            });
            this.getLookupInFilter();
          },
          error: (err) => {
            console.error(`Error fetching form data: ${err}`);
          },
      })
    }
    this.loadChartData();
  }

  loadChartData() {
    const params = { filters: JSON.stringify(this.filtersData), email: this.user()?.email };
    
    this.entryService.getChartData(this.chart().id, params)
      .subscribe(res => {
        this.chartDataset.set(res);
        let rv = res.data;
        if (this.chart().f) {
          try {
            rv = this._eval(this.chart(), res.data, this.chart().f);
          } catch (e) { console.log(`{chart-${this.chart().title}-transformFn}-${e}`) }
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

  _eval = (chart, dataset, v) => new Function('$app$', '$chart$', '$dataset$', '$eachValue$', '$eachName$', '$user$', '$conf$', '$this$', '$param$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', `return ${v}`)
    (this.app(), chart, dataset, (fn) => this.eachValue(chart, dataset, fn), (fn) => this.eachName(chart, dataset, fn), this.user(), this.runService?.appConfig, this._this, this.param(), this.base, this.baseUrl(), this.baseApi, dayjs, ServerDate);

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
    this.chart().filters.forEach(f => {
      let ds = this.form[f.root]?.items[f.code]?.dataSource;
      let dsInit = this.form[f.root]?.items[f.code]?.dataSourceInit;
      let type = this.form[f.root]?.items[f.code]?.type;
      if (ds) { // only load filter with ds, which is lookup
        this.lookupKey[f.code] = {
          ds: ds,
          type: type
        }
        var param = null;
        try {
          param = new Function('$user$', 'return ' + dsInit)(this.user())
        } catch (e) { console.log(`{list-${f.code}-dataSourceInit}-${e}`) }
        this.getLookup(f.code, dsInit ? param : null);
      }
    })
  }

  getLookup = (code, dsInit?: any) => {
    var param = null;
    if (code) {
      if (this.lookupKey[code].type == 'modelPicker') {
        param = { email: this.user()?.email }
        this.entryService.getListByDatasetData(this.lookupKey[code].ds, dsInit || param)
          .subscribe(res => {
            this.lookup[code] = res;
          })
      } else {
        // param = Object.assign(param || {}, { sort: 'id,asc' });
        param = Object.assign(param || {}, {}); // <- this is weird
        this.lookupService.getByKey(this.lookupKey[code].ds, dsInit || param)
          .subscribe(res => {
            this.lookup[code] = res.content;
          });
      }
    }
  }

  enterMaxState() {
    this.onEnterMaxState.emit(this.chart().id);
  }

  exitMaxState() {
    this.onExitMaxState.emit(false);
  }

}
