import { Clipboard } from '@angular/cdk/clipboard';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { filter, firstValueFrom, of } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { LambdaService } from '../../../service/lambda.service';
import { LambdaSidebarComponent } from './lambda-sidebar.component';
import { LambdaEditDialogService } from './lambda-edit-dialog.service';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('LambdaSidebarComponent', () => {
  let lambdas: jasmine.SpyObj<LambdaService>;
  let clipboard: jasmine.SpyObj<Clipboard>;
  let editDialog: jasmine.SpyObj<LambdaEditDialogService>;
  let router: Router;

  beforeEach(async () => {
    lambdas = jasmine.createSpyObj<LambdaService>('LambdaService', ['getLambdaList', 'save']);
    lambdas.getLambdaList.and.returnValue(of({
      content: [
        { id: 11, name: 'Editable', email: 'creator@example.test' },
        { id: 12, name: 'Restricted', email: 'other@example.test' }
      ],
      page: { totalElements: 30 }
    }));
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    clipboard.copy.and.returnValue(true);
    editDialog = jasmine.createSpyObj<LambdaEditDialogService>('LambdaEditDialogService', ['open']);
    await TestBed.configureTestingModule({
      imports: [LambdaSidebarComponent],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'design/:appId/ui/form', component: WorkspaceStubComponent },
          { path: 'design/:appId/lambda', component: WorkspaceStubComponent }
        ]),
        { provide: LambdaService, useValue: lambdas },
        { provide: Clipboard, useValue: clipboard },
        { provide: LambdaEditDialogService, useValue: editDialog },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/ui/form?id=7');
  });

  function createSidebar(manager = false) {
    const fixture = TestBed.createComponent(LambdaSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('user', { email: 'creator@example.test', manager });
    fixture.detectChanges();
    return fixture;
  }

  it('keeps restricted expansion, copy, filtering and pagination in the current workspace', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Editable');
    expect(host.textContent).toContain('Restricted Lambdas (1)');
    host.querySelector<HTMLButtonElement>('.sidebar-section-toggle')!.click();
    fixture.detectChanges();
    const restricted = host.querySelector<HTMLAnchorElement>('a[title^="Access Restricted"]')!;
    expect(restricted.getAttribute('href')).toBeNull();
    restricted.querySelector<HTMLElement>('.ui-item-id')!.click();
    expect(clipboard.copy).toHaveBeenCalledWith('12');
    expect(router.url).toBe('/design/1/ui/form?id=7');

    const pageTwo = Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!;
    pageTwo.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(lambdas.getLambdaList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    TestBed.inject(CommService).emitChange({ key: 'assistant-lambda' });
    expect(lambdas.getLambdaList).toHaveBeenCalledTimes(3);

    const filter = host.querySelector<HTMLInputElement>('input[type=search]')!;
    filter.value = 'Editable';
    filter.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Restricted Lambdas');
    expect(router.url).toBe('/design/1/ui/form?id=7');
  });

  it('copies editable and manager-accessible restricted IDs without navigating', async () => {
    const fixture = createSidebar(true);
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLElement>('.ui-item-id')!.click();
    host.querySelector<HTMLButtonElement>('.sidebar-section-toggle')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLElement>('a[title^="Manager Override"] .ui-item-id')!.click();
    await fixture.whenStable();
    expect(clipboard.copy.calls.allArgs()).toEqual([['11'], ['12']]);
    expect(router.url).toBe('/design/1/ui/form?id=7');
  });

  it('allows managers to navigate to restricted lambdas and keeps the secrets link', async () => {
    const fixture = createSidebar(true);
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.sidebar-section-toggle')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLAnchorElement>('a[title^="Manager Override"]')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lambda?id=12');
    Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.includes('Manage Secrets'))!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/lambda?key=true');
  });

  it('cancels without navigating and navigates to a successfully created lambda', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    editDialog.open.and.returnValues(
      Promise.reject('cancel'),
      Promise.resolve({ name: 'New lambda', email: 'creator@example.test', data: {} })
    );
    lambdas.save.and.returnValue(of({ id: 44 }));
    const create = Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.includes('Create Lambda'))!;

    create.click();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/ui/form?id=7');
    expect(lambdas.save).not.toHaveBeenCalled();

    create.click();
    await fixture.whenStable();
    expect(lambdas.save).toHaveBeenCalledWith('creator@example.test', 1,
      { name: 'New lambda', email: 'creator@example.test', data: {} });
    expect(router.url).toBe('/design/1/lambda?id=44');
    expect(lambdas.getLambdaList).toHaveBeenCalledTimes(2);
  });

  it('finishes creation if the sidebar is closed while the dialog is open', async () => {
    const fixture = createSidebar();
    let closeDialog!: (data: { name: string; email: string; data: {} }) => void;
    editDialog.open.and.returnValue(new Promise(resolve => closeDialog = resolve));
    lambdas.save.and.returnValue(of({ id: 44 }));
    fixture.componentInstance.createLambda();
    fixture.destroy();

    const navigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    closeDialog({ name: 'New lambda', email: 'creator@example.test', data: {} });
    await navigation;
    expect(lambdas.save).toHaveBeenCalled();
    expect(router.url).toBe('/design/1/lambda?id=44');
  });

});
