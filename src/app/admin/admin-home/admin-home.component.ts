import { JsonPipe, NgClass, PlatformLocation } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { domainBase } from '../../_shared/constant.service';
import { ToastService } from '../../_shared/service/toast-service';
import { UserService } from '../../_shared/service/user.service';
import { PlatformService } from '../../service/platform.service';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { FormsModule } from '@angular/forms';
import { deepMerge } from '../../_shared/utils';

@Component({
  selector: 'app-admin-home',
  imports: [RouterLink, RouterLinkActive, NgClass, FaIconComponent, NgxEchartsDirective, FormsModule, JsonPipe],
  templateUrl: './admin-home.component.html',
  providers:[provideEcharts()],
  styleUrl: './admin-home.component.scss'
})
export class AdminHomeComponent {

    bgClassName: string = domainBase.replace(/\./g,'-');

    user:any;

    constructor(
      // private modalService: NgbModal,
      private location: PlatformLocation,
      private toastService: ToastService,
      private userService: UserService,
      private platformService: PlatformService) {
  
      // location.onPopState(() => this.modalService.dismissAll(''));
    }

    ngOnInit(): void {
      // throw new Error('Method not implemented.');
      this.userService.getCreator()
        .subscribe((user) => {
          this.user = user;

          this.loadPlatformStat();
  
          // this.loadPlatformProps();
          // this.loadAppProps();
        });
      
    }

    
  platformStat:any = {};

  commonOpt:any = {
    legend: {
      type: 'scroll'
    },
    tooltip:{
      trigger: 'axis'
    },
    grid: {containLabel: true},
    xAxis: {
      type: 'category', axisLabel: {interval:0, rotate:45}
    },
    yAxis: {},
    series: [{type:'line',label:{position:'outer',normal:{show:true}}}],
    // dataZoom: [ { type: 'inside'},{ show: true, type: 'slider'}]
  }
  commonOptDual:any = {
    tooltip: {},
    legend: {
      type: 'scroll',
    },
    grid: {
      containLabel: true,
    },
    series: [
      {
        type: 'pie',
        label: {
          bleedMargin: 0,
          show: true,
          formatter: function(params){
            return `${params.name}: ${params.value} (${params.percent}%)`
          }
        }
      }
    ]
  }


  entryStatByYearMonthOpt:any = {};
  entryStatByYearMonthCumulativeOpt:any = {};
  entryStatByAppOpt:any = {};
  appStatByLiveOpt:any = {};
  userStatByAppOpt:any = {};
  userStatByYearMonthOpt:any = {};
  userStatByYearMonthCumulativeOpt:any = {};

  attachmentStatByAppOpt:any = {};
  attachmentStatByYearMonthOpt:any = {};
  attachmentStatByYearMonthCumulativeOpt:any = {};

  userStatIsCumulative:boolean = true;
  entryStatIsCumulative:boolean = true;
  attachmentStatIsCumulative:boolean = true;
  updatedOn:string;

  loadPlatformStat(){
    this.platformService.stat()
      .subscribe((res) => {
        this.platformStat = res;

        this.updatedOn = res.updatedOn;

        // deepMerge(Object.assign({},data)) because deepMerge is mutable because it might used as mutable in user
        this.entryStatByYearMonthOpt = deepMerge({},this.commonOpt,{series:[{name:'Entry count'}], dataset: { source: res?.entryStatByYearMonth }});// Object.assign({}, this.commonOpt, {dataset: { source: res?.entryStatByYearMonth }});
        // console.log('entryStatByYearMonthOpt', this.entryStatByYearMonthOpt);
        this.entryStatByYearMonthCumulativeOpt = deepMerge({},this.commonOpt, {series:[{name:'Entry count'}], dataset: { source: res?.entryStatByYearMonthCumulative }});
        // console.log('entryStatByYearMonthCumulativeOpt', this.entryStatByYearMonthCumulativeOpt);
        this.entryStatByAppOpt = deepMerge({},this.commonOpt,{series:[{name:'Entry count', type:'bar'}], dataset: { source: res?.entryStatByApp }}); // Object.assign({}, this.commonOpt, {dataset: { source: res?.entryStatByApp },series: [{type:'bar'}]});
        // console.log('entryStatByAppOpt', this.entryStatByAppOpt);
        this.appStatByLiveOpt = deepMerge({},this.commonOptDual,{series: [{data:res?.appStatByLive}]});
        this.userStatByAppOpt = deepMerge({},this.commonOptDual,{series: [{data:res?.userStatByApp}]}); // Object.assign({}, this.commonOptDual, {series: [{data:res?.userStatByApp}]});

        this.userStatByYearMonthOpt = deepMerge({},this.commonOpt, {series:[{name:'Unique user count'}], dataset: { source: res?.userStatByYearMonth }});
        this.userStatByYearMonthCumulativeOpt = deepMerge({},this.commonOpt, {series:[{name:'Unique user count'}], dataset: { source: res?.userStatByYearMonthCumulative }});

        this.attachmentStatByAppOpt = deepMerge({},this.commonOptDual,{series: [{name:'Size (GiB)',data:res?.attachmentStatByApp.map(kv=>{
          kv.value = Math.floor(kv.value/(1024*1024*1024));
          return kv;
        })}]}); // Object.assign({}, this.commonOptDual, {series: [{data:res?.userStatByApp}]});
        this.attachmentStatByYearMonthOpt = deepMerge({},this.commonOpt, {series:[{name:'Size (GiB)'}], dataset: { source: res?.attachmentStatByYearMonth.map(kv=>{
          kv.value = Math.floor(kv.value/(1024*1024*1024));
          return kv;
        }) }});
        this.attachmentStatByYearMonthCumulativeOpt = deepMerge({},this.commonOpt, {series:[{name:'Size (GiB)'}], dataset: { source: res?.attachmentStatByYearMonthCumulative.map(kv=>{
          kv.value = Math.floor(kv.value/(1024*1024*1024));
          return kv;
        })
       }});

      });
  }

}
