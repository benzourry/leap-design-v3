import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { RunService } from '../../../run/_service/run.service';
import { BucketService } from '../../../service/bucket.service';
import { LambdaService } from '../../../service/lambda.service';
import { BucketEditDialogComponent } from './bucket-edit-dialog.component';
import { BucketEditDialogService } from './bucket-edit-dialog.service';
import { BucketSidebarComponent } from './bucket-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('Bucket sidebar', () => {
  let buckets: jasmine.SpyObj<BucketService>;
  let router: Router;

  beforeEach(async () => {
    buckets = jasmine.createSpyObj<BucketService>('BucketService',
      ['getBucketList', 'save', 'getBucket', 'testS3Connection']);
    buckets.getBucketList.and.returnValue(of({
      content: [{ id: 2, name: 'First bucket' }, { id: 3, name: 'Second bucket' }],
      page: { totalElements: 30 }
    }));
    await TestBed.configureTestingModule({
      imports: [BucketSidebarComponent],
      providers: [
        provideRouter([
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent },
          { path: 'design/:appId/bucket', component: WorkspaceStubComponent }
        ]),
        { provide: BucketService, useValue: buckets },
        { provide: LambdaService, useValue: { getSecretList: () => of([{ key: 'secret' }]) } },
        { provide: RunService, useValue: { bucketServerInfo: () => of({ avEnabled: true }) } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lookup?id=3');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(BucketSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.detectChanges();
    return fixture;
  }

  it('copies the ID without navigating or reloading, and reports copy failures', async () => {
    const copy = spyOn(TestBed.inject(Clipboard), 'copy').and.returnValues(true, false);
    const show = TestBed.inject(ToastService).show as jasmine.Spy;
    await router.navigateByUrl('/design/1/bucket?id=2');
    const emit = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    const fixture = createSidebar();
    const id = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.ui-item-id')!;
    id.click();
    await fixture.whenStable();
    expect(copy).toHaveBeenCalledWith('2');
    expect(show).toHaveBeenCalledWith('Copied ID #2 to clipboard', { classname: 'bg-dark text-light', delay: 2000 });
    expect(emit).not.toHaveBeenCalledWith({ key: 'bucket-reload-current', appId: 1, id: 2 });
    expect(router.url).toBe('/design/1/bucket?id=2');
    id.click();
    expect(show).toHaveBeenCalledWith('Unable to copy ID', { classname: 'bg-danger text-light' });
  });

  it('filters and paginates without navigating, and highlights and opens the actual bucket', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'First';
    search.dispatchEvent(new Event('input'));
    search.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Second bucket');
    expect(buckets.getBucketList).toHaveBeenCalledWith({ appId: 1, page: 0, size: 15, searchText: 'First' });
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!.click();
    await fixture.whenStable();
    expect(buckets.getBucketList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    expect(router.url).toBe('/design/1/lookup?id=3');
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('a[routerlinkactive]'));
    links[1].click();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/design/1/bucket?id=3');
    expect(links[0].classList.contains('active')).toBeFalse();
    expect(links[1].classList.contains('active')).toBeTrue();
    const emit = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    links[1].click();
    expect(emit).toHaveBeenCalledWith({ key: 'bucket-reload-current', appId: 1, id: 3 });
  });

  it('cancels without navigating and completes creation after the sidebar is destroyed', async () => {
    const fixture = createSidebar();
    const saveResult = new Subject<{ id: number }>();
    buckets.save.and.returnValue(saveResult);
    spyOn(TestBed.inject(BucketEditDialogService), 'open').and.returnValues(
      Promise.reject('cancel'), Promise.resolve({ name: 'New bucket', type: 'local', x: {} })
    );
    fixture.componentInstance.createBucket();
    await fixture.whenStable();
    expect(buckets.save).not.toHaveBeenCalled();
    expect(router.url).toBe('/design/1/lookup?id=3');
    fixture.componentInstance.createBucket();
    await fixture.whenStable();
    expect(buckets.save).toHaveBeenCalledWith(1, { name: 'New bucket', type: 'local', x: {} });
    fixture.destroy();
    saveResult.next({ id: 7 });
    saveResult.complete();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/bucket?id=7');
  });

  it('retains the original form, S3 test and cloud authorization actions', async () => {
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    spyOn(history, 'pushState');
    const popup = spyOn(window, 'open').and.returnValue(null);
    const changes = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    const result = TestBed.inject(BucketEditDialogService).open(1, {});
    const reference = open.calls.mostRecent().returnValue;
    const dialog: BucketEditDialogComponent = reference.componentInstance;
    const hidden = firstValueFrom(reference.hidden);
    const rejection = expectAsync(result).toBeRejected();
    TestBed.inject(ApplicationRef).tick();
    const modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(modal.textContent).toContain('Add Bucket');
    expect(modal.querySelector('datalist#bucketSecretList')?.textContent).toContain('Secret: secret');
    expect(dialog.serverInfo.avEnabled).toBeTrue();
    expect(dialog.editBucketData.type).toBe('local');

    buckets.testS3Connection.and.returnValues(
      throwError(() => new HttpErrorResponse({ error: { message: 'Connection failed' } })),
      of({ success: true, message: 'Connected' })
    );
    dialog.testS3Connection(dialog.editBucketData);
    expect(dialog.s3TestResult).toEqual({ success: false, message: 'Connection failed' });
    dialog.testS3Connection(dialog.editBucketData);
    expect(dialog.s3TestResult).toEqual({ success: true, message: 'Connected' });
    expect(buckets.testS3Connection).toHaveBeenCalledWith(jasmine.objectContaining({ appId: 1 }));

    dialog.editBucketData.x.clientId = 'client';
    dialog.editBucketData.x.clientSecret = 'secret';
    buckets.save.and.returnValue(of({ id: 7 }));
    dialog.connectGoogleDrive(dialog.editBucketData);
    dialog.connectOneDrive(dialog.editBucketData);
    expect(dialog.editBucketData.id).toBe(7);
    expect(popup.calls.argsFor(0)[0]).toContain('accounts.google.com');
    expect(popup.calls.argsFor(1)[0]).toContain('login.microsoftonline.com');
    expect(changes).toHaveBeenCalledWith({ key: 'bucket-list-changed', appId: 1 });
    buckets.getBucket.and.returnValue(of({ id: 7, type: 'gdrive', x: { refreshToken: 'connected' } }));
    dialog.onMessage(new MessageEvent('message', { data: 'gdrive_connected' }));
    expect(dialog.editBucketData.x.refreshToken).toBe('connected');
    modal.querySelector<HTMLButtonElement>('.modal-footer .btn-round')!.click();
    await rejection;
    await hidden;
    expect(router.url).toBe('/design/1/lookup?id=3');
  });
});
