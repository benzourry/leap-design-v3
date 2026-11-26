import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { BucketService } from '../../../service/bucket.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgStyle, DecimalPipe, DatePipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { baseApi } from '../../../_shared/constant.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { RunService } from '../../../run/_service/run.service';
import { map } from 'rxjs/operators';
import { catchError, concatMap, EMPTY, finalize, from } from 'rxjs';
import { FileDropPasteDirective } from '../../../_shared/directive/file-drop-paste.directive';
import { EditorIdChipComponent } from '../ui-editor/editor-id-chip.component';
import { CommService } from '../../../_shared/service/comm.service';
import { BucketEditDialogService } from './bucket-edit-dialog.service';

@Component({
  selector: 'app-bucket-manager',
  templateUrl: './bucket-manager.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css', './bucket-manager.component.scss'],
  imports: [FormsModule, FaIconComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgStyle, DecimalPipe, DatePipe, FileDropPasteDirective, EditorIdChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BucketManagerComponent implements OnInit {

  offline = false;
  app: any;

  bucket: any;
  appId: number;
  baseApi = baseApi;

  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private bucketService = inject(BucketService);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private router = inject(Router);
  private runService = inject(RunService);
  private appService = inject(AppService);
  private toastService = inject(ToastService);
  private utilityService = inject(UtilityService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private commService = inject(CommService);
  private editDialog = inject(BucketEditDialogService);

  constructor() {
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if (change?.key === 'bucket-reload-current' && String(change.appId) === String(this.appId)) {
        this.loadBucket(change.id);
      }
    });
    this.location.onPopState(() => {
        if (document.querySelector('.cm-fullscreen-mode')) {
            return;
        }
        this.modalService.dismissAll('')
    });
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  ngOnInit() {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        this.cdr.detectChanges();

        this.route.parent.params
          .subscribe((params: Params) => {
            this.appId = params['appId'];
            this.cdr.detectChanges();


            if (this.appId) {
              let params = { email: user.email }

              this.appService.getApp(this.appId, params)
                .subscribe(res => {
                  this.app = res;
                  this.cdr.detectChanges();
                });
            }
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
  pageSize = 45;
  pageNumber: number = 1;

  avLogList: any[] = [];

  editBucket(bucket) {
    this.editDialog.open(this.appId, bucket)
      .then(data => {
        this.bucketService.save(this.appId, data)
          .subscribe(res => {
            this.commService.emitChange({ key: 'bucket-list-changed', appId: this.appId });
            this.commService.emitChange({ key: 'editor-search-refresh', category: 'bucket' });
            this.loadBucket(res.id);
            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
            this.toastService.show("Bucket successfully saved", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, res => {
            this.toastService.show("Bucket saving failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
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
            this.commService.emitChange({ key: 'bucket-list-changed', appId: this.appId, page: 1 });
            this.commService.emitChange({ key: 'editor-search-refresh', category: 'bucket' });
            delete this.bucket;
            this.toastService.show("Bucket successfully removed", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, res => {
            this.toastService.show("Bucket removal failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { });
  }


  loadBucket(id) {
    this.sStatus = null;
    this.bucketId = id;
    this.pendingUploads = [];
    this.bucketService.getBucket(id)
      .subscribe(bucket => {
        this.bucket = bucket;
        this.getFileList(1, {
          bucket: this.bucketId
        })
        this.loadAvLogList(id);
        this.cdr.detectChanges();
      })
  }

  loadAvLogList(bucketId) {
    this.runService.avLogList(bucketId)
      .subscribe(res => {
        this.avLogList = res;
        this.cdr.detectChanges();
      })
  }

  sStatus;
  bySStatus(sStatus) {
    this.sStatus = sStatus;
    let param: any = {
      bucket: this.bucketId
    }
    if (sStatus) {
      param.sStatus = sStatus;
    }
    this.getFileList(1, param)
  }

  quarantine(eaId) {
    this.runService.quarantine(eaId)
      .subscribe(res => {
        this.getFileList(1, {
          bucket: this.bucketId
        })
      })
  }

  params: any;
  bucketFileTotal: any;
  bucketFileList: any;
  searchTextFile: string = "";
  private pendingUploads: any[] = [];
  getFileList(pageNumber, params) {
    const fetchParams = {
      ...params,
      page: pageNumber - 1,
      size: this.pageSize,
      searchText: this.searchTextFile,
      bucketCode: this.bucket.code,
      sort: 'id,asc'
    }
    this.pageNumber = pageNumber;
    this.params = { ...params };
    this.bucketService.getFileList(this.bucket.id, fetchParams)
      .subscribe(res => {
        const content = res.content ?? [];
        const known = new Set(content.map((file: any) => file.id));
        const pending = this.pendingUploads.filter((file: any) => !known.has(file.id));
        this.pendingUploads = [];
        this.bucketFileList = [...pending.reverse(), ...content];
        this.bucketFileTotal = res.page?.totalElements;
        this.cdr.detectChanges();
      })

  }

  // Insert uploaded rows right away: the list is sorted by id, so a new file can land on a
  // later page and the refreshed current page would look unchanged.
  private showUploadedEntries(entries: any[]) {
    if (!entries.length) return;
    const current = this.bucketFileList ?? [];
    const known = new Set(current.map((file: any) => file.id));
    const added = entries.filter((entry: any) => !known.has(entry.id));
    if (!added.length) return;
    this.pendingUploads = [...added, ...this.pendingUploads];
    this.bucketFileList = [...added.slice().reverse(), ...current];
    this.bucketFileTotal = (this.bucketFileTotal ?? 0) + added.length;
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
            this.cdr.detectChanges();
          })
      }, res => { });
  }

  openAvLogs(content) {
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(() => { }, () => { });
  }

  scanProgress: any = {}
  scanLoading: any = {}
  startScan(bucket) {
    this.scanLoading[bucket.id] = true;
    this.cdr.detectChanges();
    this.runService.scanBucket(bucket.id)
      .pipe(
        map(res => {
          if (res['type'] == 4) {
            this.scanProgress[bucket.id] = { print: res['body'], success: true, out: {} };
            this.scanLoading[bucket.id] = false;
            this.loadAvLogList(bucket.id);
            this.getFileList(1, {
              bucket: this.bucketId
            })
            this.cdr.detectChanges();
          } else {
            this.scanProgress[bucket.id] = { print: res['partialText'], success: true, out: {} };
            this.cdr.detectChanges();
          }
        })
      )
      .subscribe({
        error: err => {
          this.scanLoading[bucket.id] = false;
          this.toastService.show("Bucket sccan failed", { classname: 'bg-danger text-light' });
          this.scanProgress[bucket.id] = { message: JSON.stringify(err.error), success: false };
          this.cdr.detectChanges();
        }
      });
  }

  getUrl(pre, path) {
    return this.baseApi + pre + encodeURIComponent(path);
  }

  importLoading: boolean = false;
  uploadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.uploadFiles(files);
  }

  uploadFiles(files: File[]) {
    if (!files.length || this.importLoading) return;
    if (!this.bucket?.id || !this.app?.id) {
      this.toastService.show('Bucket or app is not ready for upload.', { classname: 'bg-danger text-light' });
      return;
    }
    const bucketId = this.bucket.id;
    const appId = this.app.id;
    const email = this.user?.email;
    const uploadedEntries: any[] = [];
    let uploaded = false;
    this.importLoading = true;
    this.cdr.markForCheck();
    from(files).pipe(
      concatMap(file => this.bucketService.uploadFile(bucketId, appId, file, email).pipe(
        map(res => ({ file, res })),
        catchError(error => {
          console.error(`Unable to upload ${file.name}`, error);
          this.toastService.show(`File upload failed: ${file.name}`, { classname: 'bg-danger text-light' });
          return EMPTY;
        })
      )),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.importLoading = false;
        if (this.destroyRef.destroyed) return;
        if (uploaded && this.bucket?.id === bucketId) {
          this.showUploadedEntries(this.sStatus
            ? uploadedEntries.filter((entry: any) => entry.sstatus === this.sStatus)
            : uploadedEntries);
          this.getFileList(this.pageNumber, this.params);
        }
        this.cdr.markForCheck();
      })
    ).subscribe(({ file, res }) => {
      if (res.success) {
        uploaded = true;
        if (res.id) uploadedEntries.push(res);
        this.toastService.show(`File successfully uploaded: ${file.name}`, { classname: 'bg-success text-light' });
      } else {
        this.toastService.show(`${file.name}: ${res.message || 'File upload failed'}`, { classname: 'bg-danger text-light' });
      }
    });
  }

  onUnreadableDrop() {
    this.toastService.show('No files could be read. Drop files rather than folders.', { classname: 'bg-danger text-light' });
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
    this.bucketService.downloadZip(filename)
      .subscribe(response => {
        const binaryData = [response];
        const downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, { type: response.type }));
        downloadLink.setAttribute('download', filename);
        document.body.appendChild(downloadLink);
        downloadLink.click();
      });
  }

  bucketStatData: any = {}
  bucketStat(tpl) {
    this.bucketService.bucketStat(this.bucket.id)
      .subscribe(res => {
        this.bucketStatData = res;
        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl)
          .result.then(res => { }, dis => { })
        this.cdr.detectChanges();
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
            this.cdr.detectChanges();
          }
        })
    }
  }

  serverInfo: any = {}
  bucketServerInfo() {
    this.runService.bucketServerInfo()
      .subscribe(res => {
        this.serverInfo = res;
        this.cdr.detectChanges();
      })
  }

  selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},50%,75%)`;
  }


}