import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';
import { ToastService } from '../../../_shared/service/toast-service';
import { UserService } from '../../../_shared/service/user.service';
import { UtilityService } from '../../../_shared/service/utility.service';
import { AppService } from '../../../service/app.service';
import { BucketService } from '../../../service/bucket.service';
import { LambdaService } from '../../../service/lambda.service';
import { RunService } from '../../../run/_service/run.service';
import { BucketComponent } from '../../../run/screen/bucket/bucket.component';
import { BucketManagerComponent } from './bucket-manager.component';

describe('Bucket file uploads', () => {
  let upload: jasmine.Spy;
  let toast: jasmine.Spy;
  const first = new File(['one'], 'first.png', { type: 'image/png' });
  const second = new File(['two'], 'second.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    upload = jasmine.createSpy('uploadFile');
    toast = jasmine.createSpy('show');
    TestBed.configureTestingModule({
      providers: [
        { provide: BucketService, useValue: { uploadFile: upload } },
        { provide: RunService, useValue: { uploadFile: upload, $app: signal({ id: 2 }), $user: signal({ email: 'creator' }) } },
        { provide: UserService, useValue: {} },
        { provide: AppService, useValue: {} },
        { provide: LambdaService, useValue: {} },
        { provide: ToastService, useValue: { show: toast } },
        { provide: UtilityService, useValue: { testOnline$: () => of(true) } },
        { provide: PlatformLocation, useValue: { onPopState: () => {} } },
        { provide: NgbModal, useValue: {} },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: {} },
      ],
    });
  });

  it('uploads design bucket files sequentially and reports failures without losing later files', () => {
    const pending = new Subject<{ success: boolean; message?: string }>();
    upload.and.returnValues(pending, of({ success: true }));
    const fixture = TestBed.createComponent(BucketManagerComponent);
    const component = fixture.componentInstance;
    component.bucket = { id: 1 };
    component.app = { id: 2 };
    component.user = { email: 'creator' };
    component.params = { bucket: 1 };
    spyOn(component, 'getFileList');

    component.uploadFiles([first, second]);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(component.importLoading).toBeTrue();
    pending.next({ success: false, message: 'Rejected' });
    pending.complete();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.calls.argsFor(1)).toEqual([1, 2, second, 'creator']);
    expect(toast).toHaveBeenCalledWith('first.png: Rejected', jasmine.any(Object));
    expect(component.importLoading).toBeFalse();
    expect(component.getFileList).toHaveBeenCalledTimes(1);
  });

  it('respects runtime upload permissions and refreshes after a batch', () => {
    upload.and.returnValue(of({ success: true }));
    const fixture = TestBed.createComponent(BucketComponent);
    const component = fixture.componentInstance;
    component.bucket.set({ id: 1 });
    component.params = { bucket: 1 };
    spyOn(component, 'getFileList');

    fixture.componentRef.setInput('screen', { data: { enableUpload: false } });
    component.uploadFiles([first]);
    expect(upload).not.toHaveBeenCalled();

    fixture.componentRef.setInput('screen', { data: { enableUpload: true } });
    component.uploadFiles([first, second]);
    expect(upload.calls.allArgs()).toEqual([[1, 2, first, 'creator'], [1, 2, second, 'creator']]);
    expect(component.importLoading()).toBeFalse();
    expect(component.getFileList).toHaveBeenCalledTimes(1);
  });

  it('keeps uploading to the original bucket without refreshing a newly selected bucket', () => {
    const pending = new Subject<{ success: boolean }>();
    upload.and.returnValues(pending, of({ success: true }));
    const fixture = TestBed.createComponent(BucketManagerComponent);
    const component = fixture.componentInstance;
    component.bucket = { id: 1 };
    component.app = { id: 2 };
    component.user = { email: 'creator' };
    spyOn(component, 'getFileList');

    component.uploadFiles([first, second]);
    component.bucket = { id: 3 };
    pending.next({ success: true });
    pending.complete();
    expect(upload.calls.argsFor(1)).toEqual([1, 2, second, 'creator']);
    expect(component.getFileList).not.toHaveBeenCalled();
  });

  it('shows an uploaded file even when the refreshed page does not contain it', () => {
    const oldFile = { id: 1, fileName: 'old.png', sstatus: 'OK' };
    const list = jasmine.createSpy('getFileList').and.returnValue(of({ content: [oldFile], page: { totalElements: 1 } }));
    TestBed.overrideProvider(BucketService, { useValue: { uploadFile: upload, getFileList: list } });
    upload.and.returnValue(of({ success: true, id: 2, fileName: 'new.png', sstatus: 'OK' }));

    const fixture = TestBed.createComponent(BucketManagerComponent);
    const component = fixture.componentInstance;
    (component as any).cdr = { detectChanges: () => { }, markForCheck: () => { } };
    component.bucket = { id: 1, code: 'code' };
    component.app = { id: 2 };
    component.user = { email: 'creator' };
    component.bucketFileList = [oldFile];
    component.bucketFileTotal = 1;
    component.params = { bucket: 1 };

    component.uploadFiles([second]);

    expect(list).toHaveBeenCalled();
    expect(component.bucketFileList.map((file: any) => file.fileName)).toEqual(['new.png', 'old.png']);
  });

  it('does not duplicate an uploaded file already returned by the refreshed page', () => {
    const oldFile = { id: 1, fileName: 'old.png', sstatus: 'OK' };
    const newFile = { id: 2, fileName: 'new.png', sstatus: 'OK', success: true };
    const list = jasmine.createSpy('getFileList').and.returnValue(of({ content: [oldFile, newFile], page: { totalElements: 2 } }));
    TestBed.overrideProvider(BucketService, { useValue: { uploadFile: upload, getFileList: list } });
    upload.and.returnValue(of(newFile));

    const fixture = TestBed.createComponent(BucketManagerComponent);
    const component = fixture.componentInstance;
    (component as any).cdr = { detectChanges: () => { }, markForCheck: () => { } };
    component.bucket = { id: 1, code: 'code' };
    component.app = { id: 2 };
    component.user = { email: 'creator' };
    component.bucketFileList = [oldFile];
    component.bucketFileTotal = 1;
    component.params = { bucket: 1 };

    component.uploadFiles([second]);

    expect(component.bucketFileList.map((file: any) => file.fileName)).toEqual(['old.png', 'new.png']);
    expect(component.bucketFileTotal).toBe(2);
  });
});
