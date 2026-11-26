import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, of } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { EndpointService } from '../../../service/endpoint.service';
import { LambdaService } from '../../../service/lambda.service';
import { EndpointEditDialogComponent } from './endpoint-edit-dialog.component';
import { EndpointEditDialogService } from './endpoint-edit-dialog.service';
import { EndpointSidebarComponent } from './endpoint-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('Endpoint sidebar', () => {
  let endpoints: jasmine.SpyObj<EndpointService>;
  let router: Router;

  beforeEach(async () => {
    endpoints = jasmine.createSpyObj<EndpointService>('EndpointService', ['getEndpointList', 'save']);
    endpoints.getEndpointList.and.returnValue(of({
      content: [{ id: 2, name: 'First', code: 'first' }, { id: 3, name: 'Second', code: 'second' }],
      page: { totalElements: 30 }
    }));
    await TestBed.configureTestingModule({
      imports: [EndpointSidebarComponent],
      providers: [
        provideRouter([
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent },
          { path: 'design/:appId/endpoint', component: WorkspaceStubComponent }
        ]),
        { provide: EndpointService, useValue: endpoints },
        { provide: LambdaService, useValue: { getSecretList: () => of([{ key: 'secret' }]) } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lookup?id=3');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(EndpointSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('user', { email: 'creator@example.test' });
    fixture.detectChanges();
    return fixture;
  }

  it('filters and paginates without navigation, and highlights the selected endpoint', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'first';
    search.dispatchEvent(new Event('input'));
    search.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();
    expect(endpoints.getEndpointList).toHaveBeenCalledWith({ appId: 1, page: 0, size: 15, searchText: 'first' });
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!.click();
    await fixture.whenStable();
    expect(endpoints.getEndpointList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    expect(router.url).toBe('/design/1/lookup?id=3');
    await router.navigateByUrl('/design/1/endpoint?id=3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('a[routerlinkactive]'));
    expect(links[0].classList.contains('active')).toBeFalse();
    expect(links[1].classList.contains('active')).toBeTrue();
  });

  it('cancels without navigating and navigates to a successfully created endpoint', async () => {
    const fixture = createSidebar();
    const dialog = spyOn(TestBed.inject(EndpointEditDialogService), 'open').and.returnValues(
      Promise.reject('cancel'), Promise.resolve({ name: 'New', email: 'creator@example.test' })
    );
    endpoints.save.and.returnValue(of({ id: 7 }));
    const changes = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    fixture.componentInstance.createEndpoint();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lookup?id=3');
    expect(endpoints.save).not.toHaveBeenCalled();
    fixture.componentInstance.createEndpoint();
    await fixture.whenStable();
    expect(dialog).toHaveBeenCalledWith(1, { method: 'GET', responseType: 'json', enabled: 1, email: 'creator@example.test' }, jasmine.any(Array));
    expect(endpoints.save).toHaveBeenCalledWith('creator@example.test', 1, { name: 'New', email: 'creator@example.test' });
    expect(changes).toHaveBeenCalledWith({ key: 'endpoint-list-changed' });
    expect(router.url).toBe('/design/1/endpoint?id=7');
  });

  it('opens the actual edit form with secrets and duplicate-code warning', async () => {
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    spyOn(history, 'pushState');
    const result = TestBed.inject(EndpointEditDialogService).open(1, {
      code: 'first', auth: true, authFlow: 'client_credential', content: 'a<br/>b'
    }, [{ id: 2, code: 'first' }]);
    const reference = open.calls.mostRecent().returnValue;
    const dialog: EndpointEditDialogComponent = reference.componentInstance;
    const hidden = firstValueFrom(reference.hidden);
    const rejection = expectAsync(result).toBeRejected();
    TestBed.inject(ApplicationRef).tick();
    const windowElement = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(dialog.editEndpointData.content).toBe('a\nb');
    expect(windowElement.textContent).toContain('already used');
    expect(windowElement.querySelector('datalist')?.textContent).toContain('Secret: secret');
    windowElement.querySelector<HTMLButtonElement>('.modal-footer .btn-round')!.click();
    await rejection;
    await hidden;
    expect(router.url).toBe('/design/1/lookup?id=3');
  });
});
