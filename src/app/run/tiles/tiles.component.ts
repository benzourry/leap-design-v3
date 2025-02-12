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

import { ChangeDetectorRef, Component, OnInit, effect, input } from '@angular/core';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, Params, Router, RouterLinkActive, RouterLink } from '@angular/router';
import { UtilityService } from '../../_shared/service/utility.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgStyle, DatePipe } from '@angular/common';
// import { domainRegex } from '../../_shared/constant.service';
// import { RunService } from '../../service/run.service';
import { ServerDate, compileTpl, loadScript } from '../../_shared/utils';
import { LogService } from '../../_shared/service/log.service';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
import { base, baseApi } from '../../_shared/constant.service';
// import * as dayjs from 'dayjs';
import dayjs from 'dayjs';
import { FilterPipe } from '../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
// import { PageTitleComponent } from '../../_shared/component/page-title.component';
import { lastValueFrom, tap } from 'rxjs';
import { PageTitleComponent } from '../_component/page-title.component';
import { RunService } from '../_service/run.service';
// declare const qrcode: any;
// declare const zdecoder: any;

@Component({
    selector: 'app-tiles',
    templateUrl: './tiles.component.html',
    styleUrls: ['../../../assets/css/start.css', './tiles.component.scss'],
    imports: [PageTitleComponent, FormsModule, NgStyle, RouterLinkActive, RouterLink, FaIconComponent, FilterPipe, DatePipe]
})
export class TilesComponent implements OnInit {

  // formList: any;
  badge: any;
  app: any;
  searchText: string = "";
  constructor(private userService: UserService,
    public runService: RunService, private route: ActivatedRoute, private router: Router, private utilityService: UtilityService, private modalService:NgbModal,
    private location: PlatformLocation, private logService: LogService,
    private http: HttpClient, 
    private cdr: ChangeDetectorRef, private toastService: ToastService) {
      location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);

    effect(()=>{
      // console.log("effect")
      this.runService.$startTimestamp();
      this.init();
    //   this.naviData = this.runService.$naviData();
    //   this.navis = this.runService.$navis();
    //   this.app = this.runService.$app();
    //   this.baseUrl = this.runService.$baseUrl();
    })
  }

  baseApi:string=baseApi;
  base:string=base;


  offline = false;
  naviData:any={};
  navis:any[]=[];
  preurl: string = '';

  // appId:number;

  appLoading:boolean=false;

  user: any;
  $param$={};

  init(){
    this.naviData = this.runService.$naviData();
    this.navis = this.runService.$navis();
    this.app = this.runService.$app();
    this.baseUrl = this.runService.$baseUrl();
    this.preurl = this.runService.$preurl();
    this.runPre();
  }

  ngOnInit() {

    this.init();
    this.userService.getUser()
      .subscribe((user) => {
        this.user = user;
        console.log("user",user)

        this.getStart(this.app?.id); 
        this.route.queryParams
        .subscribe((params: Params) => {
          this.$param$ = params;
        });

        // need to rerun. Sometimes oninit trigger quite late. 
        this.runPre();


      });

      // this.navis = this.runService.$navis.
      // this.naviData = this.runService.$naviData.getValue();

  }

  // getPath() {
  //   return window.location.host.match(domainRegex)[1];
  //   // return "https://research.ia.unimas.my/run".match(/(?:http:\/\/)?(?:([^.]+)\.)?ia\.unimas\.my/);
  //   // return "https://ia.unimas.my/run".match(/(?:http[s]*\:\/\/)*(.*?)\.(?=[^\/]*\..{2,5})/i)[1];
  // }

  // getAppByPath(path) {
  //   this.appLoading = true;
  //   this.runService.getAppByPath(path)
  //     .subscribe(res => {
  //       this.app = res;
  //       this.appLoading = false;
  //       this.getNavis(res.id);
  //       this.getNaviData(res.id);
  //       this.getStart(res.id);
  //     }, res => this.appLoading = false)
  // }

  // getApp(id) {
  //   this.runService.getApp(id)
  //     .subscribe(res => {
  //       this.app = res;
  //     })
  // }
  getIcon=(str)=>str?str.split(":"):['far','file'];

  // getNavis(id){
  //   // this.navis = this.runService.$navis();
  //   this.runService.getNavis(id, this.user.email)
  //   .subscribe(res => {
  //     this.navis = res;
  //     this.runPre();
  //     this.initScreen(this.app.f);
  //   })
  // }

  // loadingNaviData = false;
  // getNaviData(id){
  //   // this.loadingNaviData = true;
  //   // this.naviData = this.runService.$naviData();
  //   this.runService.getNaviData(id, this.user.email)
  //   .subscribe(res=>{
  //     this.naviData = res;
  //     this.runPre();
  //     this.loadingNaviData = false;      
  //   })
  // }

  getStart(id) {
    if (id){
      this.runService.getStartBadge(id, this.user.email)
        .subscribe(res => {
          this.badge = res;
        })
    }
  }


  baseUrl: string = '';
  $this$ = {};
  accessToken:string="";

  compileTpl = compileTpl;

  // initScreen(js) {
  //   let res = undefined;
  //   try {
  //     res = this._eval(js);// new Function('$', '$prev$', '$user$', '$http$', 'return ' + f)(this.entry.data, this.entry && this.entry.prev, this.user, this.httpGet);
  //   } catch (e) { this.logService.log(`{tiles-${this.app.title}-initNavi}-${e}`) }
  //   this.runPre();
  //   return res;
  // }

  loadScript = loadScript;

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  log = (log) => this.logService.log(JSON.stringify(log));
  
  preCheck(f) {
    let res = undefined;
    try {
      // if (!dataV) {
      //   dataV = this.entry.data;
      // }
      if (f.pre){
        let pre = f.pre.trim();
        res = this._eval(pre);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this.user);
      }
    } catch (e) { this.logService.log(`{tiles-${f.code}-precheck}-${e}`) }
    return !f.pre || res;
  }

  preGroup:any={}
  preItem:any={}
  runPre(){
    // console.log(this.navis)
    this.navis?.forEach(group=>{
      this.preGroup[group.id]=this.preCheck(group);
      group.items?.forEach(item=>{
        this.preItem[item.id]=this.preCheck(item);
        
        console.log(item.id,this.preCheck(item))
      })
    })
  }

  $digest$ = () => {
    this.runPre();
    this.cdr.detectChanges()
  }


  _eval = (v) => new Function('$app$','$navi$', '$badge$', '$user$','$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$', '$param$', 'ServerDate','$log$','$toast$','$base$','$baseUrl$','$baseApi$','dayjs','ServerDate','$token$', `return ${v}`)
  (this.app, this.naviData, this.badge, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.$this$, this.loadScript, this.$param$, ServerDate, this.log, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, this.accessToken);
  
  // httpGet = this.runService.httpGet;
  // httpPost = this.runService.httpPost;
  // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.app?.id, params, callback, error)
  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(()=>this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(()=>this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.app?.id, params, callback, error).pipe(tap(()=>this.$digest$())));



}
