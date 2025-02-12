import { DatePipe, DecimalPipe, NgClass, PlatformLocation } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import dayjs from 'dayjs';
import { base, baseApi } from '../../../_shared/constant.service';
// import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { ToastService } from '../../../_shared/service/toast-service';
import { UserService } from '../../../_shared/service/user.service';
import { UtilityService } from '../../../_shared/service/utility.service';
import { ServerDate } from '../../../_shared/utils';
import { RunService } from '../../_service/run.service';
import { map } from 'rxjs/operators';
// import { RunService } from '../../../service/run.service';

@Component({
    selector: 'app-bucket',
    imports: [FormsModule, FaIconComponent, NgClass, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, 
      NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, 
      DecimalPipe, DatePipe],
    templateUrl: './bucket.component.html',
    styleUrl: './bucket.component.scss'
})
export class BucketComponent {

  offline = false;
  app: any;

  bucketTotal: any;
  loading: boolean;
  bucketList: any;
  // groupEntryTotal: any;
  // groupEntryList: any;
  totalItems: any;
  bucketId = input<number>();
  screen = input<any>();
  
  bucket: any;
  itemLoading: boolean;
  appId: number;
  rand: number;
  baseApi = baseApi;
  constructor(private userService: UserService, private route: ActivatedRoute,
    private modalService: NgbModal,
    private location: PlatformLocation,
    private runService: RunService,
    private toastService: ToastService,
    private utilityService: UtilityService) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  ngOnInit() {
    this.userService.getUser()
      .subscribe((user) => {
        this.user = user;

        this.rand = Math.random();

        this.route.queryParams.subscribe(queryParam=>{
          this.$param$ = queryParam;
        })

        this.loadBucket(this.screen().bucket.id);

        this.bucketServerInfo();
        
      });
  }

  user: any;
  data = { 'list': [] };
  pageSize = 45;
  currentPage = 1;
  itemsPerPage = 15;
  maxSize = 5;
  startAt = 0;
  searchText: string = "";

  pageNumber: number = 1;
  entryPageNumber: number = 1;

  avLogList:any[]=[];


  loadBucket(id) {
    this.bucketId = id;
    this.runService.getBucket(id)
      .subscribe(bucket => {
        this.bucket = bucket;
        this.getFileList(1, {
          bucket: this.bucketId
        })
        this.loadAvLogList(id);
      })
  }

  params: any;
  bucketFileTotal: any;
  bucketFileList: any;
  searchTextFile: string = "";
  getFileList(pageNumber, params) {
    Object.assign(params, {
      page: pageNumber - 1,
      size: this.pageSize,
      searchText: this.searchTextFile,
      sort: 'id,asc'
    })

    if (this.screen().data?.bucketType=='user'){
      params.email = this.user.email;
    }
    if (this.screen().data?.bucketType=='custom'){
      params = Object.assign(params, this._pre({}, this.screen().data?.bucketParam))
    }

    this.pageNumber = pageNumber;
    // this.lookupId = id;
    this.params = params;
    this.runService.getFileList(this.bucket.id, params)
      .subscribe(res => {
        this.bucketFileList = res.content;
        this.bucketFileTotal = res.page?.totalElements;
        // this.getbucketFileList(this.entryPageNumber);
      })

  }

  removeBucketFileData: any;
  removeBucketFile(content, obj) {
    this.removeBucketFileData = obj;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.runService.removeBucketFile(data.id, this.user.email)
          .subscribe(res => {
            this.toastService.show("File successfully removed", { classname: 'bg-success text-light' });
            this.getFileList(this.pageNumber, this.params);
          })
      }, res => { });
  }

  getUrl(pre, path) {
    return this.baseApi + pre + encodeURIComponent(path);
  }

  importLoading: boolean = false;
  uploadFile($event) {
    if ($event.target.files && $event.target.files.length) {
      this.importLoading = true;
      this.runService.uploadFile(this.bucket.id, this.app.id, $event.target.files[0], this.user.email)
      .subscribe({
        next:res=>{          
          // this.importExcelData = res;
          this.importLoading = false;
          this.toastService.show("File successfully uploaded", { classname: 'bg-success text-light' });
          this.getFileList(this.pageNumber, this.params);
        },
        error:error=>{
          this.importLoading = false;
          this.toastService.show("File upload failed", { classname: 'bg-danger text-light' });
        }
      })
        // .subscribe(res => {
        // }, error => {
        //   this.importLoading = false;
        //   this.toastService.show("File upload failed", { classname: 'bg-danger text-light' });
        // });

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

    // const baseUrl = 'http://myserver/index.php/api';
    // const token = 'my JWT';
    // const headers = new HttpHeaders().set('authorization','Bearer '+token);
    this.runService.downloadZip(filename)
      .subscribe(response => {
        let dataType = response.type;
        let binaryData = [];
        binaryData.push(response);
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, { type: dataType }));
        // if (filename)
        downloadLink.setAttribute('download', filename);
        document.body.appendChild(downloadLink);
        downloadLink.click();
      });
  }

  bucketStatData: any = {}
  bucketStat(tpl) {
    this.runService.bucketStat(this.bucket.id)
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

  _pre = (data, v) => new Function('$app$', '$user$', '$conf$', '$param$', '$baseApi$', 'dayjs', 'ServerDate', 
  `return ${v}`)(this.app, this.user, this.runService?.appConfig, this.$param$, this.baseApi, dayjs, ServerDate);


  selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},50%,75%)`;
  }

  
  openAvLogs(content, obj) {
    // this.removeBucketFileData = obj;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        // this.bucketService.removeBucketFile(data.id, this.user.email)
        //   .subscribe(res => {
        //     this.toastService.show("File successfully removed", { classname: 'bg-success text-light' });
        //     this.getFileList(this.pageNumber, this.params);
        //   })
      }, res => { });
  }

  loadAvLogList(bucketId){
    this.runService.avLogList(bucketId)
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
    .subscribe(res => {
      // this.scanLoading[bucket.id]=false;
      // this.loadAvLogList(bucket.id);
    }, err => {
      this.scanLoading[bucket.id]=false;
      this.toastService.show("Bucket sccan failed", { classname: 'bg-danger text-light' });
      this.scanProgress[bucket.id] = { message: JSON.stringify(err.error), success: false };
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
    .subscribe(res=>{
      this.getFileList(1, {
        bucket: this.bucketId
      })
    })
  }

  serverInfo:any={}
  bucketServerInfo(){
    this.runService.bucketServerInfo()
    .subscribe(res=>this.serverInfo = res)
  }

}
