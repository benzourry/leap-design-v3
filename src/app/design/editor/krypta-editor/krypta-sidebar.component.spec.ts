import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, of, Subject } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { KryptaService } from '../../../service/krypta.service';
import { LambdaService } from '../../../service/lambda.service';
import { KryptaEditDialogService } from './krypta-edit-dialog.service';
import { KryptaSidebarComponent } from './krypta-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('Krypta sidebar', () => {
  let krypta: jasmine.SpyObj<KryptaService>;
  let router: Router;

  beforeEach(async () => {
    krypta = jasmine.createSpyObj<KryptaService>('KryptaService',
      ['getWalletList', 'getContractList', 'saveWallet', 'saveContract']);
    krypta.getWalletList.and.returnValue(of({
      content: [{ id: 2, name: 'Wallet one' }, { id: 3, name: 'Wallet two' }],
      page: { totalElements: 30 }
    }));
    krypta.getContractList.and.returnValue(of({
      content: [{ id: 2, name: 'Contract one' }, { id: 4, name: 'Contract two' }]
    }));
    await TestBed.configureTestingModule({
      imports: [KryptaSidebarComponent],
      providers: [
        provideRouter([
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent },
          { path: 'design/:appId/krypta', component: WorkspaceStubComponent }
        ]),
        { provide: KryptaService, useValue: krypta },
        { provide: LambdaService, useValue: { getSecretList: () => of([{ key: 'secret' }]) } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lookup?id=3');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(KryptaSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('user', { email: 'creator@example.test' });
    fixture.detectChanges();
    return fixture;
  }

  it('filters and paginates without navigating, and highlights the actual wallet or contract route', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'Wallet one';
    search.dispatchEvent(new Event('input'));
    search.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Wallet two');
    expect(krypta.getWalletList).toHaveBeenCalledWith({ appId: 1, page: 0, size: 15, searchText: 'Wallet one' });
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!.click();
    await fixture.whenStable();
    expect(krypta.getWalletList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    expect(router.url).toBe('/design/1/lookup?id=3');
    await router.navigateByUrl('/design/1/krypta?contractId=2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('a[routerlinkactive]'));
    expect(links[0].classList.contains('active')).toBeFalse();
    expect(links[2].classList.contains('active')).toBeTrue();
    links[1].click();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/krypta?id=3');
  });

  it('cancels wallet creation without navigation and completes a save after the sidebar is destroyed', async () => {
    const fixture = createSidebar();
    const saveResult = new Subject<{ id: number }>();
    krypta.saveWallet.and.returnValue(saveResult);
    spyOn(TestBed.inject(KryptaEditDialogService), 'openWallet').and.returnValues(
      Promise.reject('cancel'), Promise.resolve({ name: 'New wallet' })
    );
    fixture.componentInstance.createWallet();
    await fixture.whenStable();
    expect(krypta.saveWallet).not.toHaveBeenCalled();
    expect(router.url).toBe('/design/1/lookup?id=3');
    fixture.componentInstance.createWallet();
    await fixture.whenStable();
    expect(krypta.saveWallet).toHaveBeenCalledWith('creator@example.test', 1, { name: 'New wallet' });
    fixture.destroy();
    saveResult.next({ id: 7 });
    saveResult.complete();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/krypta?id=7');
  });

  it('creates a contract and refreshes the list without navigating', async () => {
    const fixture = createSidebar();
    const changes = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    spyOn(TestBed.inject(KryptaEditDialogService), 'openContract').and.returnValues(
      Promise.reject('cancel'), Promise.resolve({ name: 'New contract' })
    );
    krypta.saveContract.and.returnValue(of({ id: 8, name: 'New contract' }));
    fixture.componentInstance.createContract();
    await fixture.whenStable();
    expect(krypta.saveContract).not.toHaveBeenCalled();
    fixture.componentInstance.createContract();
    await fixture.whenStable();
    expect(krypta.saveContract).toHaveBeenCalledWith('creator@example.test', 1, { name: 'New contract' });
    expect(changes).toHaveBeenCalledWith({ key: 'krypta-contract-created', appId: 1, contract: { id: 8, name: 'New contract' } });
    expect(krypta.getContractList).toHaveBeenCalledTimes(2);
    expect(router.url).toBe('/design/1/lookup?id=3');
  });

  it('opens the original wallet form with contracts and secrets and cancels without navigation', async () => {
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    spyOn(history, 'pushState');
    const result = TestBed.inject(KryptaEditDialogService).openWallet({
      wallet: {}, contracts: [{ id: 4, name: 'Contract two' }], secrets: [{ key: 'secret' }]
    });
    const reference = open.calls.mostRecent().returnValue;
    const hidden = firstValueFrom(reference.hidden);
    const rejection = expectAsync(result).toBeRejected();
    TestBed.inject(ApplicationRef).tick();
    const modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(modal.textContent).toContain('Wallet Info');
    expect(modal.textContent).toContain('Contract two');
    expect(modal.querySelector('datalist#pkSecretList')?.textContent).toContain('Secret: secret');
    modal.querySelector<HTMLButtonElement>('.modal-footer .btn-round')!.click();
    await rejection;
    await hidden;
    expect(router.url).toBe('/design/1/lookup?id=3');
  });
});
