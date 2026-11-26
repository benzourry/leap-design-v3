import { Clipboard } from '@angular/cdk/clipboard';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, of, Subject } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { AppService } from '../../../service/app.service';
import { DatasetService } from '../../../service/dataset.service';
import { FormService } from '../../../service/form.service';
import { LambdaService } from '../../../service/lambda.service';
import { MailerService } from '../../../service/mailer.service';
import { SchedService } from '../../../service/sched.service';
import { MailerEditDialogService } from './mailer-edit-dialog.service';
import { MailerSidebarComponent } from './mailer-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('Mailer sidebar', () => {
  let mailers: jasmine.SpyObj<MailerService>;
  let schedules: jasmine.SpyObj<SchedService>;
  let clipboard: jasmine.SpyObj<Clipboard>;
  let router: Router;

  beforeEach(async () => {
    mailers = jasmine.createSpyObj<MailerService>('MailerService', ['getMailerList', 'getMailer', 'save']);
    mailers.getMailerList.and.returnValue(of({
      content: [{ id: 2, name: 'First', enabled: 1 }, { id: 3, name: 'Second', enabled: 0 }],
      page: { totalElements: 30 }
    }));
    mailers.getMailer.and.returnValue(of({ id: 2, name: 'First' }));
    schedules = jasmine.createSpyObj<SchedService>('SchedService', ['getSchedList', 'save', 'deleteSched']);
    schedules.getSchedList.and.returnValue(of([{ id: 5, name: 'Schedule', enabled: 1 }]));
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    clipboard.copy.and.returnValue(true);
    await TestBed.configureTestingModule({
      imports: [MailerSidebarComponent],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent },
          { path: 'design/:appId/mailer', component: WorkspaceStubComponent }
        ]),
        { provide: MailerService, useValue: mailers },
        { provide: SchedService, useValue: schedules },
        { provide: Clipboard, useValue: clipboard },
        { provide: AppService, useValue: { getSmtpConfig: () => of(null) } },
        { provide: FormService, useValue: { getListBasic: () => of({ content: [{ id: 8, title: 'Form' }] }) } },
        { provide: DatasetService, useValue: { getDatasetList: () => of([{ id: 9, title: 'Dataset' }]) } },
        { provide: LambdaService, useValue: { getSecretList: () => of([{ key: 'secret' }]) } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lookup?id=3');
    spyOn(history, 'pushState');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(MailerSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('app', { id: 1 });
    fixture.componentRef.setInput('user', { email: 'creator@example.test' });
    fixture.detectChanges();
    return fixture;
  }

  it('filters, paginates, copies and highlights according to the actual route', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'First';
    search.dispatchEvent(new Event('input'));
    search.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Second');
    expect(mailers.getMailerList).toHaveBeenCalledWith({ appId: 1, page: 0, size: 15, searchText: 'First' });
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!.click();
    await fixture.whenStable();
    expect(mailers.getMailerList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    host.querySelector<HTMLElement>('.ui-item-id')!.click();
    expect(clipboard.copy).toHaveBeenCalledWith('2');
    expect(router.url).toBe('/design/1/lookup?id=3');
    await router.navigateByUrl('/design/1/mailer?id=3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('a[routerlinkactive]'));
    expect(links[0].classList.contains('active')).toBeFalse();
    expect(links[1].classList.contains('active')).toBeTrue();
  });

  it('cancels without navigating and completes creation after the sidebar is destroyed', async () => {
    const fixture = createSidebar();
    const result = new Subject<{ id: number }>();
    mailers.save.and.returnValue(result);
    spyOn(TestBed.inject(MailerEditDialogService), 'open').and.returnValues(
      Promise.reject('cancel'), Promise.resolve({ name: 'New' })
    );
    const changes = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    fixture.componentInstance.editMailer({ enabled: 1 });
    await fixture.whenStable();
    expect(mailers.save).not.toHaveBeenCalled();
    expect(router.url).toBe('/design/1/lookup?id=3');
    fixture.componentInstance.editMailer({ enabled: 1 });
    await fixture.whenStable();
    fixture.destroy();
    result.next({ id: 7 });
    result.complete();
    await fixture.whenStable();
    expect(mailers.save).toHaveBeenCalledWith('creator@example.test', 1, { name: 'New' });
    expect(changes).toHaveBeenCalledWith({ key: 'mailer-saved', appId: 1, id: 7 });
    expect(router.url).toBe('/design/1/mailer?id=7');
  });

  it('opens and cancels scheduler and SMTP dialogs without navigation or saves', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    const modalService = TestBed.inject(NgbModal);
    const open = spyOn(modalService, 'open').and.callThrough();
    const createSchedule = Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.includes('Create Schedule'))!;
    createSchedule.click();
    let ref = open.calls.mostRecent().returnValue;
    let hidden = firstValueFrom(ref.hidden);
    TestBed.inject(ApplicationRef).tick();
    let modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(modal.textContent).toContain('Add Scheduler');
    expect(modal.textContent).toContain('Dataset');
    expect(modal.textContent).toContain('First');
    modal.querySelector<HTMLButtonElement>('.modal-footer button:first-child')!.click();
    await hidden;
    expect(schedules.save).not.toHaveBeenCalled();
    const smtp = Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.includes('Custom SMTP Config'))!;
    smtp.click();
    ref = open.calls.mostRecent().returnValue;
    hidden = firstValueFrom(ref.hidden);
    TestBed.inject(ApplicationRef).tick();
    modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(modal.textContent).toContain('App SMTP Configuration');
    expect(modal.querySelector('datalist')?.textContent).toContain('secret');
    modal.querySelector<HTMLButtonElement>('.modal-footer .btn-secondary')!.click();
    await hidden;
    expect(router.url).toBe('/design/1/lookup?id=3');
  });
});
