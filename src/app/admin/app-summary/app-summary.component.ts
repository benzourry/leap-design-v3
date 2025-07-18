import { DecimalPipe, NgStyle, PlatformLocation, SlicePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../_shared/service/user.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppService } from '../../service/app.service';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { base, baseApi, domainBase } from '../../_shared/constant.service';
import { deepMerge, splitAsList } from '../../_shared/utils';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-app-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, NgStyle, NgxEchartsDirective, SlicePipe, FaIconComponent, RouterLink, FormsModule],
  templateUrl: './app-summary.component.html',
  providers:[provideEcharts()],
  styleUrl: './app-summary.component.scss'
})
export class AppSummaryComponent implements OnInit {

  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  // private bucketService = inject(BucketService);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  // private router = inject(Router);
  // private runService = inject(RunService);
  private appService = inject(AppService);
  // private toastService = inject(ToastService);
  private utilityService = inject(UtilityService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  baseApi = baseApi;
  base = base;

  offline: boolean = false;
  user: any;
  appId: any;

  summary:any = {}
  app:any = {}

  userMonthlyOpt:any;
  userMonthlyCumulativeOpt:any;

  entryMonthlyOpt:any;
  entryMonthlyCumulativeOpt:any;

  attachmentMonthlyOpt:any;
  attachmentMonthlyCumulativeOpt:any;
  attachmentSizeMonthlyOpt:any;
  attachmentSizeMonthlyCumulativeOpt:any;

  entryMonthIsCumulative:boolean = true;
  userMonthIsCumulative:boolean = true;
  attachmentMonthIsCumulative:boolean = true;
  attachmentSizeMonthIsCumulative:boolean = true;

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
    dataZoom: [ { type: 'inside'},{ show: true, type: 'slider'}]
  }

  platformView:boolean = false;

  ngOnInit() {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        this.cdr.detectChanges();

        this.route.data
        .subscribe(v => {
          this.platformView = v.platform;
          this.cdr.detectChanges();
        });

        this.route.parent.params
        // NOTE: I do not use switchMap here, but subscribe directly
        .subscribe((params: Params) => {
          this.appId = params['appId'];
          this.cdr.detectChanges();


          if (this.appId) {
            // let params = { email: user.email }

            this.appService.getApp(this.appId).subscribe((app) => {
              this.app = app;
              this.cdr.detectChanges();
            });

            this.appService.getSummary(this.appId).subscribe((data) => { 
              this.summary = data;
              this.summary.appId = this.appId;

              // deepMerge(Object.assign({},data)) because deepMerge is mutable because it might used as mutable in user script
              this.userMonthlyOpt = deepMerge({},this.commonOpt, {series:[{name:'Unique user count'}], dataset: { source: this.summary.users?.monthlyCount }});
              this.userMonthlyCumulativeOpt = deepMerge({},this.commonOpt, {series:[{name:'Unique user count'}], dataset: { source: this.summary.users?.monthlyCountCumulative }});
              this.entryMonthlyOpt = deepMerge({},this.commonOpt, {series:[{name:'Entry count'}],dataset: { source: this.summary.entry?.monthlyCount }});
              this.entryMonthlyCumulativeOpt = deepMerge({},this.commonOpt, {series:[{name:'Entry count'}], dataset: { source: this.summary.entry?.monthlyCountCumulative }});
              // this.attachmentMonthlyOpt = Object.assign({}, this.commonOpt, {dataset: { source: this.summary.attachment?.monthlyCount }});
              this.attachmentMonthlyOpt = deepMerge({},this.commonOpt, {series:[{name:'File count'}], dataset: { source: this.summary.attachment?.monthlyCount.map(kv=>{
                // kv.value = Math.floor(kv.value/1000);
                return kv;
              }) }});
              this.attachmentMonthlyCumulativeOpt = deepMerge({},this.commonOpt, {series:[{name:'File count'}], dataset: { source: this.summary.attachment?.monthlyCountCumulative.map(kv=>{
                // kv.value = Math.floor(kv.value/1000);
                return kv;
              }) }});
              this.attachmentSizeMonthlyOpt = deepMerge({},this.commonOpt, {series:[{name:'Size (MiB)'}], dataset: { source: this.summary.attachment?.monthlySize.map(kv=>{
                kv.value = Math.floor(kv.value/(1024*1024));
                return kv;
              }) }});
              this.attachmentSizeMonthlyCumulativeOpt = deepMerge({},this.commonOpt, {series:[{name:'Size (MiB)'}], dataset: { source: this.summary.attachment?.monthlySizeCumulative.map(kv=>{
                kv.value = Math.floor(kv.value/(1024*1024));
                return kv;
              }) }});

              this.cdr.detectChanges();
            });
          }
        });

      });
  }

  bucketTypeSizeLimit:number=5;

  entryFormCountLimit:number=5;

  
  selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},50%,75%)`;
  }
  
  getUrl(app) {
    let separator = app?.live?'.':'--dev.';
    // let note = app?.live?'':'* Please note that this app is currently in DEV mode';
    let url = app.appPath ? app.appPath + separator + domainBase : domainBase + "/#/run/" + app.id;
    return 'https://'+url;
  }


  
  splitAsList = splitAsList

  checkLogin(app, prop){
    return app[prop];
  }
  

}
