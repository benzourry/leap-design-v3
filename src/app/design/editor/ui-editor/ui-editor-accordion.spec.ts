import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { filter, firstValueFrom, NEVER, of, Subject } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { UserService } from '../../../_shared/service/user.service';
import { CommService } from '../../../_shared/service/comm.service';
import { FormService } from '../../../service/form.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { MailerService } from '../../../service/mailer.service';
import { AppService } from '../../../service/app.service';
import { GroupService } from '../../../service/group.service';
import { BucketService } from '../../../service/bucket.service';
import { CognaService } from '../../../service/cogna.service';
import { LambdaService } from '../../../service/lambda.service';
import { KryptaService } from '../../../service/krypta.service';
import { LookupService } from '../../../run/_service/lookup.service';
import { UiEditorComponent } from './ui-editor.component';
import { UiSidebarComponent } from './ui-sidebar.component';
import { UiSidebarDialogService } from './ui-sidebar-dialog.service';

@Component({ template: '' })
class WorkspaceStubComponent {}

@Component({
  imports: [UiSidebarComponent, RouterOutlet],
  template: '@if (showSidebar()) { <app-ui-sidebar></app-ui-sidebar> }<router-outlet></router-outlet>'
})
class EditorHostComponent {
  readonly showSidebar = signal(true);
}

describe('UI editor accordion', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          {
            path: 'design/:appId',
            component: EditorHostComponent,
            children: [
              {
                path: 'ui', component: UiEditorComponent,
                children: [
                  { path: 'form', component: WorkspaceStubComponent },
                  { path: 'dataset', component: WorkspaceStubComponent },
                  { path: 'dashboard', component: WorkspaceStubComponent },
                  { path: 'screen', component: WorkspaceStubComponent },
                  { path: 'navi', component: WorkspaceStubComponent }
                ]
              },
              { path: 'lookup', component: WorkspaceStubComponent }
            ]
          }
        ]),
        { provide: UserService, useValue: { getCreator: () => NEVER } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
  });

  it('loads dialog dependencies without fetching unrelated search lists', async () => {
    spyOn(TestBed.inject(UserService), 'getCreator').and.returnValue(of({ email: 'creator@example.test' }));
    const appService = TestBed.inject(AppService);
    spyOn(appService, 'getApp').and.returnValue(of({ id: 1 }));
    spyOn(appService, 'getAppMyList').and.returnValue(of({ content: [] }));
    spyOn(appService, 'getCount').and.returnValue(of({}));
    spyOn(TestBed.inject(FormService), 'getListBasic').and.returnValue(of({ content: [], page: { totalElements: 0 } }));
    spyOn(TestBed.inject(DatasetService), 'getDatasetList').and.returnValue(of([]));
    spyOn(TestBed.inject(DashboardService), 'getDashboardList').and.returnValue(of([]));
    spyOn(TestBed.inject(ScreenService), 'getScreenList').and.returnValue(of([]));
    spyOn(TestBed.inject(GroupService), 'getGroupList').and.returnValue(of({ content: [{ id: 1 }] }));
    spyOn(TestBed.inject(BucketService), 'getBucketList').and.returnValue(of({ content: [{ id: 2 }] }));
    spyOn(TestBed.inject(CognaService), 'getCognaList').and.returnValue(of({ content: [{ id: 3 }] }));
    const mailers = spyOn(TestBed.inject(MailerService), 'getMailerList');
    const lookups = spyOn(TestBed.inject(LookupService), 'getLookupList');
    const lambdas = spyOn(TestBed.inject(LambdaService), 'getLambdaList');
    const krypta = TestBed.inject(KryptaService);
    const wallets = spyOn(krypta, 'getWalletList');
    const contracts = spyOn(krypta, 'getContractList');
    const openEdit = spyOn(TestBed.inject(UiSidebarDialogService), 'openEdit')
      .and.returnValue(new Promise(() => {}));

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/design/1/ui/form', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.editForm({});

    expect(openEdit.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
      accessList: [{ id: 1 }], bucketList: [{ id: 2 }], cognaList: [{ id: 3 }], walletList: []
    }));
    expect(mailers).not.toHaveBeenCalled();
    expect(lookups).not.toHaveBeenCalled();
    expect(lambdas).not.toHaveBeenCalled();
    expect(wallets).not.toHaveBeenCalled();
    expect(contracts).not.toHaveBeenCalled();
  });

  it('only changes expansion on header clicks and follows subsequent workspace navigation', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/ui/form?id=1', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    sidebar.user = { email: 'creator@example.test' };
    sidebar.editableDatasets = [{ id: 42, title: 'Dataset' }];
    harness.detectChanges();

    const router = TestBed.inject(Router);
    const host = harness.routeNativeElement as HTMLElement;
    const datasetButton = host.querySelector<HTMLButtonElement>('#ui-dataset .accordion-button')!;
    datasetButton.click();
    harness.detectChanges();

    expect(router.url).toBe('/design/1/ui/form?id=1');
    expect(datasetButton.getAttribute('aria-expanded')).toBe('true');

    host.querySelector<HTMLAnchorElement>('#ui-dataset a[title="Dataset - 42"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/design/1/ui/dataset?id=42');
    expect(harness.routeDebugElement?.componentInstance).toBe(editor);

    await router.navigateByUrl('/design/1/ui/form?id=1');
    harness.detectChanges();
    const formButton = host.querySelector<HTMLButtonElement>('#ui-form .accordion-button')!;
    expect(formButton.getAttribute('aria-expanded')).toBe('true');

    datasetButton.click();
    harness.detectChanges();
    await router.navigateByUrl('/design/1/ui/form?id=2');
    harness.detectChanges();
    expect(formButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('highlights only the item selected by the route query', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/design/1/ui/form?id=1', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    sidebar.user = { email: 'creator@example.test' };
    sidebar.editableForms = [{ id: 1, title: 'First' }, { id: 2, title: 'Second' }];
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();

    const host = harness.routeNativeElement as HTMLElement;
    const first = host.querySelector<HTMLAnchorElement>('a[title="First - 1"]')!;
    const second = host.querySelector<HTMLAnchorElement>('a[title="Second - 2"]')!;
    expect(first.classList.contains('active')).toBeTrue();
    expect(second.classList.contains('active')).toBeFalse();

    await TestBed.inject(Router).navigateByUrl('/design/1/ui/form?id=2');
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(first.classList.contains('active')).toBeFalse();
    expect(second.classList.contains('active')).toBeTrue();
  });

  it('keeps dialog cancellation in place and retains clone-then-edit navigation', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/design/1/ui/form?id=1', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    sidebar.user = { email: 'creator@example.test' };
    harness.detectChanges();

    const router = TestBed.inject(Router);
    const formService = TestBed.inject(FormService);
    const clone = spyOn(formService, 'cloneForm').and.returnValue(of({ id: 77, title: 'Source' }));
    const save = spyOn(formService, 'saveForm').and.returnValue(of({ id: 77 }));
    spyOn(formService, 'getListBasic').and.returnValue(of({ content: [], page: { totalElements: 0 } }));
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.returnValues(
      { result: Promise.reject('cancel') } as ReturnType<NgbModal['open']>,
      { result: Promise.resolve({ formId: 12 }) } as ReturnType<NgbModal['open']>,
      { result: Promise.resolve({ title: 'Source (cloned)' }) } as ReturnType<NgbModal['open']>
    );
    const host = harness.routeNativeElement as HTMLElement;
    const cloneLink = Array.from(host.querySelectorAll<HTMLAnchorElement>('#ui-form .section-action'))
      .find(link => link.textContent?.includes('Clone'))!;

    cloneLink.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/design/1/ui/form?id=1');
    expect(clone).not.toHaveBeenCalled();

    cloneLink.click();
    await harness.fixture.whenStable();
    expect(open).toHaveBeenCalledTimes(3);
    expect(clone).toHaveBeenCalledWith(12, 1);
    expect(save).toHaveBeenCalledWith(1, { title: 'Source (cloned)' });
    expect(router.url).toBe('/design/1/ui/form?id=77');
  });

  it('retains the Structure workspace link', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/design/1/ui/form', EditorHostComponent);
    const host = harness.routeNativeElement as HTMLElement;
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    harness.detectChanges();
    const link = Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(element => element.textContent?.includes('Structure'))!;
    link.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/design/1/ui/navi');
  });

  it('finishes saving and navigating after its sidebar is closed', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/ui/form?id=1', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    sidebar.user = { email: 'creator@example.test' };
    harness.detectChanges();
    const saveResult = new Subject<{ id: number }>();
    spyOn(TestBed.inject(FormService), 'saveForm').and.returnValue(saveResult);
    spyOn(TestBed.inject(NgbModal), 'open').and.returnValue(
      { result: Promise.resolve({ title: 'Saved' }) } as ReturnType<NgbModal['open']>
    );
    sidebar.editForm({});
    await harness.fixture.whenStable();
    editor.showSidebar.set(false);
    harness.detectChanges();
    saveResult.next({ id: 77 });
    saveResult.complete();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/design/1/ui/form?id=77');
  });

  it('opens the cloned item for editing after the sidebar is destroyed and navigates after saving', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/ui/form?id=1', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    sidebar.user = { email: 'creator@example.test' };
    harness.detectChanges();

    const cloneResult = new Subject<{ id: number; title: string }>();
    const formService = TestBed.inject(FormService);
    spyOn(formService, 'cloneForm').and.returnValue(cloneResult);
    const save = spyOn(formService, 'saveForm').and.returnValue(of({ id: 77 }));
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.returnValues(
      { result: Promise.resolve({ formId: 12 }) } as ReturnType<NgbModal['open']>,
      { result: Promise.resolve({ title: 'Source (cloned)' }) } as ReturnType<NgbModal['open']>
    );
    sidebar.cloneForm();
    await harness.fixture.whenStable();
    editor.showSidebar.set(false);
    harness.detectChanges();
    const navigation = firstValueFrom(TestBed.inject(Router).events.pipe(filter(event => event instanceof NavigationEnd)));
    cloneResult.next({ id: 77, title: 'Source' });
    cloneResult.complete();
    await navigation;

    expect(open).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith(1, { title: 'Source (cloned)' });
    expect(TestBed.inject(Router).url).toBe('/design/1/ui/form?id=77');
  });

  it('renders the real cloned-form edit dialog after the sidebar is destroyed', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/ui/form?id=1', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    sidebar.user = { email: 'creator@example.test' };
    harness.detectChanges();

    const cloneResult = new Subject<{ id: number; title: string; x: object; sections: unknown[] }>();
    const formService = TestBed.inject(FormService);
    spyOn(formService, 'cloneForm').and.returnValue(cloneResult);
    spyOn(formService, 'getListBasic').and.returnValue(of({ content: [] }));
    spyOn(TestBed.inject(MailerService), 'getMailerList').and.returnValue(of({ content: [] }));
    spyOn(history, 'pushState');
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    sidebar.cloneForm();
    TestBed.inject(ApplicationRef).tick();
    const cloneModal = open.calls.mostRecent().returnValue;
    const cloneHidden = firstValueFrom(cloneModal.hidden);
    cloneModal.close({ formId: 12 });
    await cloneHidden;

    editor.showSidebar.set(false);
    harness.detectChanges();
    cloneResult.next({ id: 77, title: 'Source', x: {}, sections: [] });
    cloneResult.complete();
    TestBed.inject(ApplicationRef).tick();
    await harness.fixture.whenStable();
    TestBed.inject(ApplicationRef).tick();
    expect(open).toHaveBeenCalledTimes(2);
    const editModal = open.calls.mostRecent().returnValue;
    const editHidden = firstValueFrom(editModal.hidden);
    const window = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(window.querySelector('.modal-title')?.textContent).toContain('Edit Form');
    expect(window.querySelector<HTMLInputElement>('input[name="title"]')?.value).toBe('Source (cloned)');
    window.querySelector<HTMLButtonElement>('.modal-footer button')!.click();
    await editHidden;
    expect(TestBed.inject(Router).url).toBe('/design/1/ui/form?id=1');
  });

  for (const kind of ['dataset', 'dashboard', 'screen'] as const) {
    it(`finishes a ${kind} clone after the sidebar is closed`, async () => {
      const harness = await RouterTestingHarness.create();
      const editor = await harness.navigateByUrl('/design/1/ui/form?id=1', EditorHostComponent);
      const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
      sidebar.app = { id: 1 };
      sidebar.user = { email: 'creator@example.test' };
      harness.detectChanges();

      const cloneResult = new Subject<{ id: number; title: string }>();
      let save: jasmine.Spy;
      if (kind === 'dataset') {
        const service = TestBed.inject(DatasetService);
        spyOn(service, 'cloneDataset').and.returnValue(cloneResult);
        save = spyOn(service, 'saveDataset').and.returnValue(of({ id: 77 }));
      } else if (kind === 'dashboard') {
        const service = TestBed.inject(DashboardService);
        spyOn(service, 'cloneDashboard').and.returnValue(cloneResult);
        save = spyOn(service, 'saveDashboard').and.returnValue(of({ id: 77 }));
      } else {
        const service = TestBed.inject(ScreenService);
        spyOn(service, 'cloneScreen').and.returnValue(cloneResult);
        save = spyOn(service, 'saveScreen').and.returnValue(of({ id: 77 }));
      }
      spyOn(TestBed.inject(NgbModal), 'open').and.returnValues(
        { result: Promise.resolve({ [`${kind}Id`]: 12 }) } as ReturnType<NgbModal['open']>,
        { result: Promise.resolve({ title: 'Source (cloned)' }) } as ReturnType<NgbModal['open']>
      );
      if (kind === 'dataset') sidebar.cloneDataset();
      else if (kind === 'dashboard') sidebar.cloneDashboard();
      else sidebar.cloneScreen();
      await harness.fixture.whenStable();
      editor.showSidebar.set(false);
      harness.detectChanges();
      const navigation = firstValueFrom(TestBed.inject(Router).events.pipe(filter(event => event instanceof NavigationEnd)));
      cloneResult.next({ id: 77, title: 'Source' });
      cloneResult.complete();
      await navigation;
      expect(save).toHaveBeenCalledWith(1, { title: 'Source (cloned)' });
      expect(TestBed.inject(Router).url).toBe(`/design/1/ui/${kind}?id=77`);
    });
  }

  it('stops refreshing after the sidebar is destroyed', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/ui/form', EditorHostComponent);
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    const refresh = spyOn(sidebar, 'getFormList');
    const changes = TestBed.inject(CommService);
    changes.emitChange({ key: 'form', value: 1 });
    expect(refresh).toHaveBeenCalledTimes(1);

    editor.showSidebar.set(false);
    harness.detectChanges();
    changes.emitChange({ key: 'form', value: 2 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
