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

import { DatePipe, DecimalPipe, NgClass, NgStyle, PlatformLocation } from '@angular/common';
import { Component, computed, inject, input, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import dayjs from 'dayjs';
import { base, baseApi } from '../../../_shared/constant.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { UtilityService } from '../../../_shared/service/utility.service';
import { ServerDate } from '../../../_shared/utils';
import { RunService } from '../../_service/run.service';
import { map, tap } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';

@Component({
    selector: 'app-bucket',
    imports: [FormsModule, FaIconComponent, NgClass, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, 
      NgbPaginationLast, NgbDropdown, NgStyle, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, 
      DecimalPipe, DatePipe],
    templateUrl: './bucket.component.html',
    styleUrl: './bucket.component.scss'
})
export class BucketComponent {

  offline = signal<boolean>(false);
  app = computed(()=>this.runService.$app());
  lang = computed(() => this.app().x?.lang);

  loading = signal<boolean>(false);
  bucketList = signal<any[]>([]);
  bucketId:number;
  screen = input<any>();
  
  bucket = signal<any>(null);
  itemLoading = signal<boolean>(false);
  appId: number;
  rand: number;
  baseApi = baseApi;

  private route = inject(ActivatedRoute)
  private modalService = inject(NgbModal)
  private location = inject(PlatformLocation)
  private runService = inject(RunService)
  private toastService = inject(ToastService)
  private utilityService = inject(UtilityService)
  private destroyRef = inject(DestroyRef); // Injected for subscription cleanup

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    
    this.utilityService.testOnline$()
      .pipe(takeUntilDestroyed())
      .subscribe(online => this.offline.set(!online));
  }

  ngOnInit() {
    this.rand = Math.random();

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(queryParam=>{
        this.$param$ = queryParam;
      });

    this.loadBucket(this.screen().bucket.id);

    this.bucketServerInfo();        
  }

  user = computed(()=>this.runService.$user());
  pageSize = 45;

  pageNumber = signal<number>(1);

  avLogList:any[]=[];


  loadBucket(id) {
    this.loading.set(true);
    this.bucketId = id;
    this.runService.getBucket(id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: bucket => {
        this.bucket.set(bucket);
        this.getFileList(1, {
          bucket: this.bucketId
        })
        this.loadAvLogList(id);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.toastService.show(this.lang()=='ms'?'Bucket tidak berjaya dimuatkan':"Failed to load bucket", { classname: 'bg-danger text-light' });
      }
    });
  }

  params: any;
  bucketFileTotal = signal<number>(0);
  bucketFileList = signal<any[]>([]);
  searchTextFile: string = "";
  
  getFileList(pageNumber, params) {
    this.itemLoading.set(true);
    
    // Fix: Avoid mutating the original 'params' object to prevent parameter pollution on subsequent calls
    let fetchParams = {
      ...params,
      page: pageNumber - 1,
      size: this.pageSize,
      searchText: this.searchTextFile,
      sort: 'id,asc'
    };

    if (this.screen().data?.bucketType=='user'){
      fetchParams.email = this.user().email;
    }
    if (this.screen().data?.bucketType=='custom'){
      fetchParams = { ...fetchParams, ...this._pre({}, this.screen().data?.bucketParam) };
    }

    this.pageNumber.set(pageNumber);
    this.params = { ...params }; // Store clean params for reuse
    
    this.runService.getFileList(this.bucket().id, fetchParams)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next:res => {
        this.itemLoading.set(false);
        this.bucketFileList.set(res.content);
        this.bucketFileTotal.set(res.page?.totalElements);
      },
      error: error => {
        this.itemLoading.set(false);
        this.toastService.show(this.lang()=='ms'?"Fail bucket tidak berjaya dimuatkan":"Failed to load bucket files", { classname: 'bg-danger text-light' });
      }
    })
  }

  removeBucketFileData: any;
  removeBucketFile(content, obj) {
    this.removeBucketFileData = obj;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.removeBucketFile(data.id, this.user().email)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            this.toastService.show(this.lang()=='ms'?"Fail berjaya dibuang":"File successfully removed", { classname: 'bg-success text-light' });
            this.getFileList(this.pageNumber(), this.params);
          })
      }, res => { });
  }

  getUrl(pre, path) {
    return this.baseApi + pre + encodeURIComponent(path);
  }

  importLoading = signal<boolean>(false);
  uploadFile($event) {
    if ($event.target.files && $event.target.files.length) {
      this.importLoading.set(true);
      this.runService.uploadFile(this.bucket().id, this.app().id, $event.target.files[0], this.user().email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:res=>{          
          this.importLoading.set(false);
          this.toastService.show(this.lang()=='ms'?"Fail berjaya dimuatnaik":"File successfully uploaded", { classname: 'bg-success text-light' });
          this.getFileList(this.pageNumber(), this.params);
        },
        error:error=>{
          this.importLoading.set(false);
          this.toastService.show(this.lang()=='ms'?"Fail tidak berjaya dimuatnaik":"File upload failed", { classname: 'bg-danger text-light' });
        }
      })
    }
  }

  bucketZipMap: any = {};
  initZipData: any = {};

  initZip(tpl, bucketId: number): void {

    if (this.bucketZipMap[bucketId]) {
      this.initZipData = this.bucketZipMap[bucketId];
      history.pushState(null, null, window.location.href);
      this.modalService.open(tpl)
        .result.then(res => {

        });
    } else {
      this.runService.initZip(bucketId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(response => {
          this.initZipData = response;
          this.bucketZipMap[bucketId] = response;
          this.modalService.open(tpl)
            .result.then(res => {

            });
        });
    }
  }

  downloadZip(filename: string): void {

    this.runService.downloadZip(filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(response => {
        let dataType = response.type;
        let binaryData = [];
        binaryData.push(response);
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, { type: dataType }));
        downloadLink.setAttribute('download', filename);
        document.body.appendChild(downloadLink);
        downloadLink.click();
      });
  }

  bucketStatData: any = {}
  bucketStat(tpl) {
    this.runService.bucketStat(this.bucket().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.bucketStatData = res;
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl)
          .result.then(res => { }, dis => { })
      })

  }

  reorganize(id: number) {
    if (confirm("This action will reorganize files uploaded from field linked with this bucket into the bucket folder. Proceed?")) {
      this.runService.reorganize(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            let result = `<table width="100%">
        <tr><td>Success</td><td>: ${res.success}</td></tr>
        <tr><td>Failed</td><td>: ${res.failure}</td></tr>
      </table>`;

            this.toastService.show("Bucket successfully organized " + result + " ", { classname: 'bg-success text-light' });
            this.loadBucket(id);
          }
        })
    }
  }

  base = base;
  $param$:any;
  $this$:any;

  // --- DRY Caching Engine for _pre ---
  private preCache = new Map<string, Function>();

  _pre = (data, v) => {
    if (!v) return undefined;
    
    const bindings = {
      $app$: this.app(),
      $user$: this.user(),
      $conf$: this.runService?.appConfig,
      $param$: this.$param$,
      $baseApi$: this.baseApi,
      dayjs,
      ServerDate
    };

    const argNames = Object.keys(bindings);
    const cacheKey = `${argNames.join(',')}_${v}`;
    
    let fn = this.preCache.get(cacheKey);
    if (!fn) {
      fn = new Function(...argNames, `return ${v}`);
      this.preCache.set(cacheKey, fn);
    }
    
    return fn(...Object.values(bindings));
  }


  selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},50%,75%)`;
  }

  
  openAvLogs(content, obj) {
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
      }, res => { });
  }

  loadAvLogList(bucketId){
    this.runService.avLogList(bucketId)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(res=>{
      this.avLogList = res;
    })
  }

  scanProgress:any={}
  scanLoading:any={}

  startScan(bucket){
    this.scanLoading[bucket.id]=true;
    this.runService.scanBucket(bucket.id)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      map(res => {  
        if (res['type'] == 4) {
          this.scanProgress[bucket.id] = { print: res['body'], success: true, out: {} };
          this.scanLoading[bucket.id]=false;
          this.loadAvLogList(bucket.id);
          this.getFileList(1, {
            bucket: this.bucketId
          })
        } else {
          this.scanProgress[bucket.id] = { print: res['partialText'], success: true, out: {} };
        }
      })
    )
    .subscribe({
      next: res => {
        // this.scanLoading[bucket.id]=false;
        // this.loadAvLogList(bucket.id);
      }, 
      error: err => {
        this.scanLoading[bucket.id]=false;
        this.toastService.show("Bucket sccan failed", { classname: 'bg-danger text-light' });
        this.scanProgress[bucket.id] = { message: JSON.stringify(err.error), success: false };
      }
    });
  }

  
  sStatus;
  bySStatus(sStatus){
    this.sStatus = sStatus;
    let param:any = {
      bucket: this.bucketId
    }
    if (sStatus){
      param.sStatus = sStatus;
    }
    this.getFileList(1, param)
  }

  quarantine(eaId){
    this.runService.quarantine(eaId)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(res=>{
      this.getFileList(1, {
        bucket: this.bucketId
      })
    })
  }

  serverInfo:any={}
  bucketServerInfo(){
    this.runService.bucketServerInfo()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(res=>this.serverInfo = res)
  }

}