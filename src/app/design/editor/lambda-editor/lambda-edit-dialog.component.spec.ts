import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, of } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { ToastService } from '../../../_shared/service/toast-service';
import { LookupService } from '../../../run/_service/lookup.service';
import { DashboardService } from '../../../service/dashboard.service';
import { DatasetService } from '../../../service/dataset.service';
import { LambdaService } from '../../../service/lambda.service';
import { SignaService } from '../../../service/signa.service';
import { LambdaEditDialogComponent } from './lambda-edit-dialog.component';
import { LambdaEditDialogService } from './lambda-edit-dialog.service';

@Component({ template: '' })
class HostComponent {}

describe('LambdaEditDialogService', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideHttpClient(),
        { provide: DatasetService, useValue: { getDatasetList: () => of([{ id: 1, title: 'Dataset' }]) } },
        { provide: DashboardService, useValue: { getDashboardList: () => of([{ id: 2, title: 'Dashboard' }]) } },
        { provide: LookupService, useValue: { getLookupList: () => of({ content: [{ id: 3, name: 'Lookup' }] }) } },
        { provide: SignaService, useValue: { getSignaList: () => of({ content: [{ id: 4, name: 'Signature' }] }) } },
        { provide: LambdaService, useValue: { isCodeTaken: () => of(false) } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(history, 'pushState');
  });

  it('opens the actual dialog with bindings, signatures and validation, and closes without navigation', async () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const modal = TestBed.inject(NgbModal);
    const open = spyOn(modal, 'open').and.callThrough();
    const result = TestBed.inject(LambdaEditDialogService).open(1, 'creator@example.test', {
      data: { digisign: true }, content: 'first<br/>second'
    });
    const reference = open.calls.mostRecent().returnValue;
    const dialog: LambdaEditDialogComponent = reference.componentInstance;
    TestBed.inject(ApplicationRef).tick();
    await host.whenStable();
    TestBed.inject(ApplicationRef).tick();

    expect(dialog.appId()).toBe(1);
    expect(dialog.editLambdaData().content).toBe('first\nsecond');
    expect(dialog.editLambdaData().email).toBe('creator@example.test');
    expect(dialog.bindingSrcs).toEqual(jasmine.arrayContaining([
      { name: 'Dataset', type: 'dataset', srcId: 1 },
      { name: 'Dashboard', type: 'dashboard', srcId: 2 },
      { name: 'Lookup', type: 'lookup', srcId: 3 }
    ]));
    const windowElement = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(windowElement.querySelector('select[name=signa]')?.textContent).toContain('Signature');
    expect(windowElement.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')!.disabled).toBeTrue();
    const previousUrl = window.location.href;
    const rejection = expectAsync(result).toBeRejected();
    const hidden = firstValueFrom(reference.hidden);
    windowElement.querySelector<HTMLButtonElement>('.modal-footer .btn-round')!.click();
    await rejection;
    await hidden;
    expect(window.location.href).toBe(previousUrl);
  });

  it('converts edited content back when the dialog is saved', async () => {
    const modal = TestBed.inject(NgbModal);
    const open = spyOn(modal, 'open').and.callThrough();
    const result = TestBed.inject(LambdaEditDialogService).open(1, 'creator@example.test', {
      id: 5, name: 'Existing', lang: 'js', code: 'existing', content: 'first<br/>second', data: {}
    });
    const reference = open.calls.mostRecent().returnValue;
    const dialog: LambdaEditDialogComponent = reference.componentInstance;
    TestBed.inject(ApplicationRef).tick();
    const hidden = firstValueFrom(reference.hidden);
    dialog.activeModal.close(dialog.editLambdaData());
    expect((await result).content).toBe('first<br/>second');
    await hidden;
  });
});
