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
import { ServerDate, compileTpl, loadScript } from '../../_shared/utils';
import { LogService } from '../../_shared/service/log.service';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../_shared/service/toast-service';
import { base, baseApi } from '../../_shared/constant.service';
import dayjs from 'dayjs';
import { FilterPipe } from '../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { lastValueFrom, tap } from 'rxjs';
import { PageTitleComponent } from '../_component/page-title.component';
import { RunService } from '../_service/run.service';

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
        // console.log("user",user)

        this.getStart(this.app?.id); 
        this.route.queryParams
        .subscribe((params: Params) => {
          this.$param$ = params;
        });

        // need to rerun. Sometimes oninit trigger quite late. 
        this.runPre();

      });

  }

  getIcon=(str)=>str?str.split(":"):['far','file'];

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

  loadScript = loadScript;

  $toast$ = (content, opt) => this.toastService.show(content, opt);

  log = (log) => this.logService.log(JSON.stringify(log));
  
  preCheck(f) {
    let res = undefined;
    try {
      if (f.pre){
        let pre = f.pre.trim();
        res = this._eval(pre);
      }
    } catch (e) { this.logService.log(`{tiles-${f.code}-precheck}-${e}`) }
    return !f.pre || res;
  }

  preGroup:any={}
  preItem:any={}
  runPre(){
    this.navis?.forEach(group=>{
      this.preGroup[group.id]=this.preCheck(group);
      group.items?.forEach(item=>{
        this.preItem[item.id]=this.preCheck(item);
        
        // console.log(item.id,this.preCheck(item))
      })
    })
  }

  $digest$ = () => {
    this.runPre();
    this.cdr.detectChanges()
  }


  _eval = (v) => new Function('$app$','$navi$', '$badge$', '$user$','$conf$', '$http$', '$post$', '$endpoint$', '$this$', '$loadjs$', '$param$', 'ServerDate','$log$','$toast$','$base$','$baseUrl$','$baseApi$','dayjs','ServerDate','$token$', `return ${v}`)
  (this.app, this.naviData, this.badge, this.user, this.runService?.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.$this$, this.loadScript, this.$param$, ServerDate, this.log, this.$toast$, this.base, this.baseUrl, this.baseApi, dayjs, ServerDate, this.accessToken);
  
  httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(()=>this.$digest$())));
  httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(()=>this.$digest$())));
  endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.app?.id, params, callback, error).pipe(tap(()=>this.$digest$())));



}
