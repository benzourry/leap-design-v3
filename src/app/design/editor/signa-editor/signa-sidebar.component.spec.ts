import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, of } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { SignaService } from '../../../service/signa.service';
import { SignaEditDialogService } from './signa-edit-dialog.service';
import { SignaSidebarComponent } from './signa-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('Signa sidebar', () => {
  let signaService: jasmine.SpyObj<SignaService>;
  let router: Router;

  beforeEach(async () => {
    signaService = jasmine.createSpyObj<SignaService>('SignaService', ['getSignaList', 'saveSigna']);
    signaService.getSignaList.and.returnValue(of({
      content: [{ id: 1, name: 'First' }, { id: 2, name: 'Second' }],
      page: { totalElements: 30 }
    }));
    await TestBed.configureTestingModule({
      imports: [SignaSidebarComponent],
      providers: [
        provideRouter([
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent },
          { path: 'design/:appId/signa', component: WorkspaceStubComponent }
        ]),
        { provide: SignaService, useValue: signaService },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lookup?id=3');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(SignaSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('user', { email: 'creator@example.test' });
    fixture.detectChanges();
    return fixture;
  }

  it('filters and paginates without navigating, and highlights the actual route', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'First';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Second');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!.click();
    await fixture.whenStable();
    expect(signaService.getSignaList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    expect(router.url).toBe('/design/1/lookup?id=3');
    await router.navigateByUrl('/design/1/signa?id=2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('a[routerlinkactive]'));
    expect(links[0].classList.contains('active')).toBeFalse();
    expect(links[1].classList.contains('active')).toBeTrue();
  });

  it('keeps cancellation in place and saves and navigates after creation', async () => {
    const fixture = createSidebar();
    const dialog = spyOn(TestBed.inject(SignaEditDialogService), 'open').and.returnValues(
      Promise.reject('cancel'),
      Promise.resolve({ name: 'New', email: 'creator@example.test', content: 'a\nb' })
    );
    signaService.saveSigna.and.returnValue(of({ id: 7 }));
    const changes = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    fixture.componentInstance.createSigna();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lookup?id=3');
    expect(signaService.saveSigna).not.toHaveBeenCalled();
    fixture.componentInstance.createSigna();
    await fixture.whenStable();
    expect(dialog).toHaveBeenCalledWith({ hashAlg: 'SHA256', keyAlg: 'RSA', keystoreType: 'PKCS12', email: 'creator@example.test' });
    expect(signaService.saveSigna).toHaveBeenCalledWith('creator@example.test', 1,
      { name: 'New', email: 'creator@example.test', content: 'a<br/>b' });
    expect(changes).toHaveBeenCalledWith({ key: 'signa-list-changed' });
    expect(router.url).toBe('/design/1/signa?id=7');
  });

  it('opens the original edit form and cancels without navigation', async () => {
    const modal = TestBed.inject(NgbModal);
    const open = spyOn(modal, 'open').and.callThrough();
    spyOn(history, 'pushState');
    const result = TestBed.inject(SignaEditDialogService).open({ hashAlg: 'SHA256', keyAlg: 'RSA', keystoreType: 'PKCS12' });
    const reference = open.calls.mostRecent().returnValue;
    const hidden = firstValueFrom(reference.hidden);
    const rejection = expectAsync(result).toBeRejected();
    TestBed.inject(ApplicationRef).tick();
    const windowElement = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(windowElement.textContent).toContain('Digital Signature');
    windowElement.querySelector<HTMLButtonElement>('.modal-footer .btn-round')!.click();
    await rejection;
    await hidden;
    expect(router.url).toBe('/design/1/lookup?id=3');
  });
});
