import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { LookupService } from '../../../run/_service/lookup.service';
import { GroupService } from '../../../service/group.service';
import { GroupSidebarComponent } from './group-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('GroupSidebarComponent', () => {
  let groups: jasmine.SpyObj<GroupService>;
  let lookups: jasmine.SpyObj<LookupService>;
  let router: Router;

  beforeEach(async () => {
    groups = jasmine.createSpyObj<GroupService>('GroupService', ['getGroupList', 'save']);
    groups.getGroupList.and.returnValue(of({
      content: [{ id: 2, appId: 1, name: 'Local' }, { id: 3, appId: 9, name: 'Shared' }],
      page: { totalElements: 30 }
    }));
    lookups = jasmine.createSpyObj<LookupService>('LookupService', ['getFullLookupList']);
    lookups.getFullLookupList.and.returnValue(of({ content: [{ id: 6, name: 'Lookup' }] }));
    await TestBed.configureTestingModule({
      imports: [GroupSidebarComponent],
      providers: [
        provideRouter([
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent },
          { path: 'design/:appId/user', component: WorkspaceStubComponent }
        ]),
        { provide: GroupService, useValue: groups },
        { provide: LookupService, useValue: lookups },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lookup?id=3');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(GroupSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('app', { x: { userFromApp: true } });
    fixture.detectChanges();
    return fixture;
  }

  it('retains the shared-user warning, all-users link, filtering and pagination', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('using user database from other app');
    expect(host.textContent).toContain('All Users');
    expect(lookups.getFullLookupList).toHaveBeenCalledWith({ appId: 1 });
    Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!.click();
    await fixture.whenStable();
    expect(groups.getGroupList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    const filter = host.querySelector<HTMLInputElement>('input[type=search]')!;
    filter.value = 'Local';
    filter.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Shared');
    expect(router.url).toBe('/design/1/lookup?id=3');
    Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.includes('All Users'))!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/user?id=all');
  });

  it('keeps cancellation in place and navigates to a created group', async () => {
    const fixture = createSidebar();
    spyOn(TestBed.inject(NgbModal), 'open').and.returnValues(
      { result: Promise.reject('cancel') } as ReturnType<NgbModal['open']>,
      { result: Promise.resolve({ name: 'New' }) } as ReturnType<NgbModal['open']>
    );
    groups.save.and.returnValue(of({ id: 7 }));
    const changes = spyOn(TestBed.inject(CommService), 'emitChange').and.callThrough();
    const create = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.includes('Create Group'))!;
    create.click();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lookup?id=3');
    expect(groups.save).not.toHaveBeenCalled();
    create.click();
    await fixture.whenStable();
    expect(groups.save).toHaveBeenCalledWith(1, { name: 'New' });
    expect(changes).toHaveBeenCalledWith({ key: 'group-list-changed' });
    expect(router.url).toBe('/design/1/user?id=7');
  });
});
