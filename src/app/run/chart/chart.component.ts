import { Component, OnInit, input, output } from '@angular/core';
import { NgbDateAdapter, NgbModal } from '@ng-bootstrap/ng-bootstrap';
// import * as dayjs from 'dayjs';
import dayjs from 'dayjs';
// import { EntryService } from '../../service/entry.service';
// import { LookupService } from '../../service/lookup.service';
// import { RunService } from '../../service/run.service';
import { base, baseApi } from '../../_shared/constant.service';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { ServerDate, deepMerge, tblToExcel } from '../../_shared/utils';
// import { UserEntryFilterComponent } from '../../_shared/component/user-entry-filter/user-entry-filter.component';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
// import * as echarts from 'echarts/core';
// import { BarChart, LineChart, PieChart, GaugeChart } from 'echarts/charts';
// import {
//   TooltipComponent,
//   TransformComponent
// } from 'echarts/components';
// import { LabelLayout, UniversalTransition } from 'echarts/features';
// import { CanvasRenderer } from 'echarts/renderers';
import { JsonPipe, NgClass, NgStyle, SlicePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { UserEntryFilterComponent } from '../_component/user-entry-filter/user-entry-filter.component';
import { EntryService } from '../_service/entry.service';
import { LookupService } from '../_service/lookup.service';
import { RunService } from '../_service/run.service';

// echarts.use([
//   BarChart,
//   LineChart,
//   PieChart,
//   GaugeChart,
//   TooltipComponent,
//   TransformComponent,
//   LabelLayout,
//   UniversalTransition,
//   CanvasRenderer
// ]);


@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss', '../../../assets/css/flip.css'],
    providers: [
        { provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
        provideEcharts(),
        // provideEchartsCore({ echarts })
    ],
    imports: [FaIconComponent, NgClass, NgStyle, NgxEchartsDirective, UserEntryFilterComponent, SlicePipe]
})
export class ChartComponent implements OnInit {

  filters = input<any>({})

  chart = input<any>();

  maxState = input<any>();

  onEnterMaxState = output<number>()

  onExitMaxState = output<boolean>()

  chartOption: any = {};

  chartDataset: any;

  flipped: boolean;

  app = input<any>();

  user = input<any>();

  $param$ = input<any>({});

  $baseUrl$ = input<string>();

  form: any = {};
  // form = input.required<any>({});

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

  constructor(private entryService: EntryService, public runService: RunService,
    private lookupService: LookupService,
    private modalService: NgbModal) {
  }

  ngOnInit() {
    if (this.chart().formId) {
      this.runService.getForm(this.chart().formId)
        .subscribe(res => {
          this.form['data'] = res;
          this.form['prev'] = res.prev;
          // this.getLookupList();
          if (res.prev) {
          } else {
            this.form['prev'] = null;
          }
          this.getLookupInFilter();
        })
    }
    this.loadChartData();
  }


  loadChartData() {
    this.entryService.getChartData(this.chart().id, { filters: JSON.stringify(this.filtersData), email: this.user().email })
      .subscribe(res => {
        this.chartDataset = res;
        let rv = this.chartDataset.data;
        if (this.chart().f) {
          try {
            rv = this._eval(this.chart(), this.chartDataset.data, this.chart().f);
          } catch (e) { console.log(`{chart-${this.chart().title}-transformFn}-${e}`) }
          this.chartDataset.data = rv;
        }
        this.plotChart(this.chart(), this.chartDataset)
      })
  }


  hideZero = () => {
    return (param) => {
      return param.data[param.seriesIndex + 1] == 0 ? '' : param.data[param.seriesIndex + 1];
    }
  }

  plotChart(c, cd) {
    // this.chartDataset[c.id] = cd;
    this.flipped = (c.x && c.x.flipped);
    this.chartOption = {
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
          // avoidLabelOverlap: false,
          label: {
            // position: 'inside',
            // alignTo: 'none',
            bleedMargin: 0,
            // normal: { http://localhost:4200/#/run/1115/form/3092/edit?entryId=169507
              show: true
            // }
          },
          // labelLine: {
          //   normal: {
          //     show: true
          //   }
          // }
        }
      ]
    };
    if (['line', 'bar', 'area'].indexOf(c.type) > -1) {
      this.chartOption.xAxis = { type: 'category', axisLabel: { interval: 0, rotate: 45 } };
      this.chartOption.yAxis = {};

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
        this.chartOption.series = series;
      }
    }
    if (['hline', 'hbar'].indexOf(c.type) > -1) {
      this.chartOption.xAxis = {};
      this.chartOption.yAxis = { type: 'category', axisLabel: { interval: 0, rotate: 45 } };

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
        this.chartOption.series = series;
      }
    }
    // if (c.type == 'pie') {
    //   this.chartOption[c.id].series[0].label = {
    //     position: 'inner',
    //     formatter: function (params) {
    //       return params.value + '%\n'
    //     }

    //   }
    // }
    if (c.type == 'rose') {
      this.chartOption.series[0].radius = [20, 110];
      this.chartOption.series[0].roseType = 'radius';
      this.chartOption.series[0].label.formatter = function(params){
          return `${params.value.name}: ${params.value.value} (${params.percent}%)`
      };
    }
    if (['pie', 'gauge'].includes(c.type)) {
      this.chartOption.series[0].label.formatter = function(params){
        return `${params.value.name}: ${params.value.value} (${params.percent}%)`
      };
    }
    if (c.type == 'doughnut') {
      this.chartOption.series[0].radius = ['50%', '70%'];
    }

    if (c.type == 'area') {
      // var series = []
      for (var i = 1; i < cd.data[0].length; i++) {
        this.chartOption.series[i - 1].areaStyle = {};
        // series.push({ type: this.typeMapping[c.type], label: { normal: { show: true, position: 'top' } } })
      }
      // this.chartOption[c.id].series = series;
      // this.chartOption[c.id].series[0].areaStyle = {};
    }
    if (c.type == 'gauge') {
      this.chartOption.series[0].data = this.chartOption.dataset.source;
      this.chartOption.series[0].title = { show: false };
      // this.chartOption[c.id].series[0].max = 280;
    }
    if (c.type == 'radar') {

      this.chartOption.series[0].title = { show: false };
      this.chartOption.series[0].areaStyle = {opacity:0.3};

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

      // indicator = indicator.map(i=>{i.max=overallMax;return i});

      this.chartOption.radar = { indicator: indicator.map(i=>{i.max=overallMax;return i}) };
      this.chartOption.series[0].data = rdata;
    }
    if (c.x && c.x.stacked) {

    }

    if (c.x?.ecOpt) {
      deepMerge(this.chartOption, this._eval(c, cd.data, c.x?.ecOpt));
    }
  }


  exportExcel() {
    tblToExcel(this.chart().title, document.querySelector("#chart_" + this.chart().id).outerHTML)
  }

  filtersData: any = {};
  filtersCond: string = "AND";
  // statusFilterForm:any={}; 
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

  $this$ = {};
  _eval = (chart, dataset, v) => new Function('$app$', '$chart$', '$dataset$', '$eachValue$', '$eachName$', '$user$', '$conf$', '$this$', '$param$', '$base$', '$baseUrl$', '$baseApi$', 'dayjs', 'ServerDate', `return ${v}`)
    (this.app(), chart, dataset, (fn) => this.eachValue(chart, dataset, fn), (fn) => this.eachName(chart, dataset, fn), this.user(), this.runService?.appConfig, this.$this$, this.$param$(), this.base, this.$baseUrl$(), this.baseApi, dayjs, ServerDate);

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
        param = { email: this.user().email }
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
