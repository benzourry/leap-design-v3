import { Clipboard } from '@angular/cdk/clipboard';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { filter, firstValueFrom, of, Subject } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { LookupService } from '../../../run/_service/lookup.service';
import { GroupService } from '../../../service/group.service';
import { LookupSidebarComponent } from './lookup-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('LookupSidebarComponent', () => {
  const items = [
    { id: 11, name: 'Countries', description: 'Country list' },
    { id: 12, name: 'Cities' }
  ];
  let lookups: jasmine.SpyObj<LookupService>;
  let modal: jasmine.SpyObj<NgbModal>;
  let clipboard: jasmine.SpyObj<Clipboard>;
  let router: Router;

  beforeEach(async () => {
    lookups = jasmine.createSpyObj<LookupService>('LookupService', ['getLookupList', 'save']);
    lookups.getLookupList.and.returnValue(of({ content: items, page: { totalElements: 30 } }));
    modal = jasmine.createSpyObj<NgbModal>('NgbModal', ['open']);
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    clipboard.copy.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [LookupSidebarComponent],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'design/:appId/lambda', component: WorkspaceStubComponent },
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent }
        ]),
        { provide: LookupService, useValue: lookups },
        { provide: GroupService, useValue: { getGroupList: () => of({ content: [] }) } },
        { provide: NgbModal, useValue: modal },
        { provide: Clipboard, useValue: clipboard },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lambda?id=7');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(LookupSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('user', { email: 'creator@example.test' });
    fixture.detectChanges();
    return fixture;
  }

  it('filters, paginates, copies IDs and refreshes without changing the workspace', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    expect(lookups.getLookupList).toHaveBeenCalledWith({ appId: 1, page: 0, size: 15, searchText: '' });

    const input = host.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'Countries';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.textContent).toContain('Countries');
    expect(host.textContent).not.toContain('Cities');
    expect(lookups.getLookupList).toHaveBeenCalledTimes(1);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();
    expect(lookups.getLookupList).toHaveBeenCalledWith({ appId: 1, page: 0, size: 15, searchText: 'Countries' });
    const pageTwo = Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!;
    pageTwo.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(lookups.getLookupList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: 'Countries' });
    TestBed.inject(CommService).emitChange({ key: 'assistant-lookup' });
    expect(lookups.getLookupList).toHaveBeenCalledTimes(4);
    fixture.detectChanges();

    host.querySelector<HTMLElement>('.ui-item-id')!.click();
    expect(clipboard.copy).toHaveBeenCalledWith('11');
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lambda?id=7');

    host.querySelector<HTMLAnchorElement>('.group-list a.element')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lookup?id=11');
  });

  it('keeps the route on cancel and navigates to a successfully created lookup', async () => {
    const fixture = createSidebar();
    const payload = { name: 'New lookup' };
    modal.open.and.returnValues(
      { result: Promise.reject('cancel') } as ReturnType<NgbModal['open']>,
      { result: Promise.resolve(payload) } as ReturnType<NgbModal['open']>
    );
    lookups.save.and.returnValue(of({ id: 44 }));
    const create = () => {
      const link = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
        .find(element => element.textContent?.includes('Create Lookup'))!;
      link.click();
    };

    create();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lambda?id=7');
    expect(lookups.save).not.toHaveBeenCalled();

    create();
    await fixture.whenStable();
    expect(lookups.save).toHaveBeenCalledWith('creator@example.test', 1, payload);
    expect(router.url).toBe('/design/1/lookup?id=44');
    expect(lookups.getLookupList).toHaveBeenCalledTimes(2);
  });

  it('finishes saving and navigates after the sidebar is destroyed', async () => {
    const fixture = createSidebar();
    const saveResult = new Subject<{ id: number }>();
    modal.open.and.returnValue({ result: Promise.resolve({ name: 'New lookup' }) } as ReturnType<NgbModal['open']>);
    lookups.save.and.returnValue(saveResult);

    const create = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .find(element => element.textContent?.includes('Create Lookup'))!;
    create.click();
    await fixture.whenStable();
    expect(lookups.save).toHaveBeenCalled();

    fixture.destroy();
    const navigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    saveResult.next({ id: 44 });
    saveResult.complete();
    await navigation;
    expect(router.url).toBe('/design/1/lookup?id=44');
  });

});
