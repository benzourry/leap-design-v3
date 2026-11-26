import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, HostListener, inject, InjectionToken, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { baseApi } from '../../../_shared/constant.service';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { RunService } from '../../../run/_service/run.service';
import { BucketService } from '../../../service/bucket.service';
import { LambdaService } from '../../../service/lambda.service';

export interface BucketEditData {
  id?: number;
  name?: string;
  description?: string;
  type?: string;
  x?: BucketConfig;
  scheduled?: boolean;
  freq?: string;
  req?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  clock?: string;
}

interface BucketConfig {
  folderId?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string | null;
  bucketName?: string;
  region?: string;
  endpoint?: string;
  prefix?: string;
  accessKey?: string;
  secretKey?: string;
  scanUpload?: boolean;
}

type EditableBucket = BucketEditData & { x: BucketConfig };
export interface BucketDialogData {
  appId: number;
  bucket: BucketEditData;
}
export const BUCKET_DIALOG_DATA = new InjectionToken<BucketDialogData>('BUCKET_DIALOG_DATA');

@Component({
  selector: 'app-bucket-edit-dialog',
  templateUrl: './bucket-edit-dialog.component.html',
  imports: [FormsModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BucketEditDialogComponent implements OnInit {
  private readonly data = inject(BUCKET_DIALOG_DATA);
  readonly activeModal = inject(NgbActiveModal);
  private readonly bucketService = inject(BucketService);
  private readonly lambdaService = inject(LambdaService);
  private readonly runService = inject(RunService);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  editBucketData: EditableBucket = Object.assign(this.data.bucket, {
    type: this.data.bucket.type || 'local',
    x: this.data.bucket.x || {}
  });
  secretList: { key: string }[] = [];
  serverInfo: { avEnabled?: boolean } = {};
  s3Testing = false;
  s3TestResult: { success: boolean; message: string } | null = null;
  readonly dayOfWeekList = [
    { name: 'Sunday', value: 1 }, { name: 'Monday', value: 2 }, { name: 'Tuesday', value: 3 },
    { name: 'Wednesday', value: 4 }, { name: 'Thursday', value: 5 }, { name: 'Friday', value: 6 },
    { name: 'Saturday', value: 7 }
  ];
  readonly monthOfYearList = [
    { name: 'January', value: 0 }, { name: 'February', value: 1 }, { name: 'March', value: 2 },
    { name: 'April', value: 3 }, { name: 'May', value: 4 }, { name: 'June', value: 5 },
    { name: 'July', value: 6 }, { name: 'August', value: 7 }, { name: 'September', value: 8 },
    { name: 'October', value: 9 }, { name: 'November', value: 10 }, { name: 'Disember', value: 11 }
  ];
  readonly dayOfMonthList = Array.from({ length: 30 }, (_, index) => index + 1);

  ngOnInit() {
    this.lambdaService.getSecretList(this.data.appId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (secrets: { key: string }[]) => { this.secretList = secrets; this.cdr.markForCheck(); },
      error: () => this.toastService.show('Unable to load secrets', { classname: 'bg-danger text-light' })
    });
    this.runService.bucketServerInfo().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (info: { avEnabled?: boolean }) => { this.serverInfo = info; this.cdr.markForCheck(); },
      error: () => this.toastService.show('Unable to load bucket server information', { classname: 'bg-danger text-light' })
    });
  }

  keepMinute00(bucket: EditableBucket) {
    if (bucket.clock && bucket.clock.length >= 4) {
      bucket.clock = bucket.clock.slice(0, -1) + '0';
    }
  }

  getGdriveRedirectUri(): string {
    return this.redirectUri('gdrive');
  }

  getOnedriveRedirectUri(): string {
    return this.redirectUri('onedrive');
  }

  private redirectUri(provider: string): string {
    const uri = baseApi + '/bucket/oauth/' + provider + '-callback';
    return uri.startsWith('http') ? uri : window.location.origin + uri;
  }

  connectGoogleDrive(bucket: EditableBucket) {
    this.connect(bucket, 'gdrive');
  }

  connectOneDrive(bucket: EditableBucket) {
    this.connect(bucket, 'onedrive');
  }

  private connect(bucket: EditableBucket, provider: 'gdrive' | 'onedrive') {
    const { clientId, clientSecret } = bucket.x;
    if (!clientId || !clientSecret) {
      this.toastService.show('Client ID and secret are required', { classname: 'bg-danger text-light' });
      return;
    }
    this.bucketService.save(this.data.appId, bucket).subscribe({
      next: (result: { id: number }) => {
        bucket.id = result.id;
        this.commService.emitChange({ key: 'bucket-list-changed', appId: this.data.appId });
        this.commService.emitChange({ key: 'editor-search-refresh', category: 'bucket' });
        const redirect = encodeURIComponent(this.redirectUri(provider));
        const client = encodeURIComponent(clientId);
        const state = encodeURIComponent(result.id);
        const url = provider === 'gdrive'
          ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client}&redirect_uri=${redirect}&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent&state=${state}`
          : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${client}&response_type=code&redirect_uri=${redirect}&response_mode=query&scope=${encodeURIComponent('offline_access Files.ReadWrite')}&state=${state}`;
        window.open(url, provider === 'gdrive' ? 'GoogleAuth' : 'OneDriveAuth', 'width=500,height=600,left=200,top=200');
        if (!this.destroyRef.destroyed) this.cdr.markForCheck();
      },
      error: () => this.toastService.show('Bucket saving failed', { classname: 'bg-danger text-light' })
    });
  }

  testS3Connection(bucket: EditableBucket) {
    this.s3Testing = true;
    this.s3TestResult = null;
    this.bucketService.testS3Connection({ ...bucket, appId: this.data.appId })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result: { success: boolean; message: string }) => {
          this.s3Testing = false;
          this.s3TestResult = result;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.s3Testing = false;
          this.s3TestResult = { success: false, message: error.error?.message || error.message || 'Connection test failed.' };
          this.cdr.markForCheck();
        }
      });
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    if (event.data !== 'gdrive_connected' && event.data !== 'onedrive_connected') return;
    this.toastService.show('Cloud Storage connected successfully!', { classname: 'bg-success text-light' });
    if (this.editBucketData.id) {
      this.bucketService.getBucket(this.editBucketData.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (bucket: BucketEditData) => {
          this.editBucketData = { ...bucket, x: bucket.x || {} };
          this.cdr.markForCheck();
        },
        error: () => this.toastService.show('Unable to reload bucket', { classname: 'bg-danger text-light' })
      });
    }
  }
}
