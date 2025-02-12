import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink } from '@angular/router';
import { BucketService } from '../../../service/bucket.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgStyle, DecimalPipe, DatePipe, NgClass } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { baseApi } from '../../../_shared/constant.service';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { RunService } from '../../../run/_service/run.service';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-bucket-manager',
    templateUrl: './bucket-manager.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './bucket-manager.component.scss'],
    imports: [SplitPaneComponent, FormsModule, NgClass, RouterLinkActive, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgStyle, FilterPipe, DecimalPipe, DatePipe]
})
export class BucketManagerComponent implements OnInit {

  offline = false;
  app: any;

  bucketTotal: any;
  loading: boolean;
  bucketList: any;
  // groupEntryTotal: any;
  // groupEntryList: any;
  totalItems: any;
  bucket: any;
  itemLoading: boolean;
  appId: number;
  rand: number;
  baseApi = baseApi;
  constructor(private userService: UserService, private route: ActivatedRoute, private bucketService: BucketService,
    private modalService: NgbModal,
    private location: PlatformLocation,
    private runService: RunService,
    private appService: AppService,
    private toastService: ToastService,
    private utilityService: UtilityService) {
    location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  ngOnInit() {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;

        this.rand = Math.random();

        this.route.parent.params
          // NOTE: I do not use switchMap here, but subscribe directly
          .subscribe((params: Params) => {
            this.appId = params['appId'];


            if (this.appId) {
              let params = { email: user.email }

              this.appService.getApp(this.appId, params)
                .subscribe(res => {
                  this.app = res;
                });
            }

            this.loadBucketList(1);
          });



        this.route.queryParams
          .subscribe((params: Params) => {
            const id = params['id'];
            if (id) {
              this.loadBucket(id);
            }
          })

          this.bucketServerInfo();
      });
  }

  user: any;
  bucketId = '';
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

  // this.loadBucketList = loadBucketList;
  loadBucketList(pageNumber) {
    this.pageNumber = pageNumber;
    this.itemLoading = true;

    let params = {
      searchText: this.searchText,
      appId: this.appId,
      page: pageNumber - 1,
      size: this.itemsPerPage
    }

    this.bucketService.getBucketList(params)
      .subscribe({
        next: (res) => {
          this.bucketList = res.content;
          this.bucketTotal = res.page?.totalElements;
          this.itemLoading = false;
        }, error: (err) => {
          this.itemLoading = false
        }
      })

  }

  editBucketData: any;
  editBucket(content, group, isNew) {
    this.editBucketData = group;
    if (!this.editBucketData.x){
      this.editBucketData.x = {}
    }

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.bucketService.save(this.appId, data)
          .subscribe(res => {
            this.loadBucketList(this.pageNumber);
            this.loadBucket(res.id);
            this.toastService.show("Bucket successfully saved", { classname: 'bg-success text-light' });
          }, res => {
            this.toastService.show("Bucket saving failed", { classname: 'bg-danger text-light' });
          });
      }, res => { })
  }

  removeBucketData: any;
  removeBucket(content, group) {
    this.removeBucketData = group;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.bucketService.deleteBucket(group.id, data)
          .subscribe(res => {
            this.loadBucketList(1);
            delete this.bucket;
            this.toastService.show("Bucket successfully removed", { classname: 'bg-success text-light' });
          }, res => {
            this.toastService.show("Bucket removal failed", { classname: 'bg-danger text-light' });
          });
      }, res => { });
  }


  loadBucket(id) {
    this.sStatus = null;
    this.bucketId = id;
    this.bucketService.getBucket(id)
      .subscribe(bucket => {
        this.bucket = bucket;
        this.getFileList(1, {
          bucket: this.bucketId
        })
        this.loadAvLogList(id);        
      })
  }

  loadAvLogList(bucketId){
    this.runService.avLogList(bucketId)
    .subscribe(res=>{
      this.avLogList = res;
    })
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

  params: any;
  bucketFileTotal: any;
  bucketFileList: any;
  searchTextFile: string = "";
  getFileList(pageNumber, params) {
    Object.assign(params, {
      page: pageNumber - 1,
      size: this.pageSize,
      searchText: this.searchTextFile,
      bucketCode: this.bucket.code,
      sort: 'id,asc'
    })
    this.pageNumber = pageNumber;
    // this.lookupId = id;
    this.params = params;
    this.bucketService.getFileList(this.bucket.id, params)
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
        this.bucketService.removeBucketFile(data.id, this.user.email)
          .subscribe(res => {
            this.toastService.show("File successfully removed", { classname: 'bg-success text-light' });
            this.getFileList(this.pageNumber, this.params);
          })
      }, res => { });
  }

  openAvLogs(content, obj) {
    // this.removeBucketFileData = obj;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        // DO NOTHING
      }, res => { });
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

  getUrl(pre, path) {
    return this.baseApi + pre + encodeURIComponent(path);
  }

  importLoading: boolean = false;
  uploadFile($event) {
    if ($event.target.files && $event.target.files.length) {
      this.importLoading = true;
      this.bucketService.uploadFile(this.bucket.id, this.app.id, $event.target.files[0], this.user.email)
      .subscribe({
        next:res=>{          
          if (res.success){
            // this.importExcelData = res;
            this.importLoading = false;
            this.toastService.show("File successfully uploaded", { classname: 'bg-success text-light' });
            this.getFileList(this.pageNumber, this.params);
          }else{
            this.toastService.show(res.message, { classname: 'bg-danger text-light' });
          }
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
      this.bucketService.initZip(bucketId)
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
    this.bucketService.downloadZip(filename)
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
    // this.http.get(baseUrl + route,{headers, responseType: 'blob' as 'json'}).subscribe(
    //     (response: any) =>{
    //         let dataType = response.type;
    //         let binaryData = [];
    //         binaryData.push(response);
    //         let downloadLink = document.createElement('a');
    //         downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, {type: dataType}));
    //         if (filename)
    //             downloadLink.setAttribute('download', filename);
    //         document.body.appendChild(downloadLink);
    //         downloadLink.click();
    //     }
    // )
  }

  bucketStatData: any = {}
  bucketStat(tpl) {
    this.bucketService.bucketStat(this.bucket.id)
      .subscribe(res => {
        this.bucketStatData = res;
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl)
          .result.then(res => { }, dis => { })
      })

  }

  reorganize(id: number) {
    if (confirm("This action will reorganize files uploaded from field linked with this bucket into the bucket folder. Proceed?")) {
      this.bucketService.reorganize(id)
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

  serverInfo:any={}
  bucketServerInfo(){
    this.runService.bucketServerInfo()
    .subscribe(res=>this.serverInfo = res)
  }

  selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},50%,75%)`;
  }

  keepMinute00 = (object) => {
    if (object['clock'].length >= 4) {
      object['clock'] = object['clock'].slice(0, -1) + '0';
    }
  }

  dayOfWeekList = [
    { name: "Sunday", value: 1 },
    { name: "Monday", value: 2 },
    { name: "Tuesday", value: 3 },
    { name: "Wednesday", value: 4 },
    { name: "Thursday", value: 5 },
    { name: "Friday", value: 6 },
    { name: "Saturday", value: 7 }
  ]
  monthOfYearList = [
    { name: "January", value: 0 },
    { name: "February", value: 1 },
    { name: "March", value: 2 },
    { name: "April", value: 3 },
    { name: "May", value: 4 },
    { name: "June", value: 5 },
    { name: "July", value: 6 },
    { name: "August", value: 7 },
    { name: "September", value: 8 },
    { name: "October", value: 9 },
    { name: "November", value: 10 },
    { name: "Disember", value: 11 }
  ]

  dayOfMonthList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];


}
